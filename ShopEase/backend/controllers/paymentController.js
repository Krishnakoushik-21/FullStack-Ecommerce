'use strict';

/**
 * paymentController.js
 *
 * Handles all Razorpay payment lifecycle:
 *   1. createRazorpayOrder  — backend creates a Razorpay order, stores pending checkout data
 *   2. verifyPayment        — backend verifies HMAC-SHA256 signature, creates the actual order
 *   3. handleFailure        — client reports a payment failure or cancellation; logs the event
 *   4. getKeyId             — safely exposes only the public key_id to the frontend
 *
 * Environment variables required:
 *   RAZORPAY_KEY_ID     — rzp_test_xxx  (test) or rzp_live_xxx  (live)
 *   RAZORPAY_KEY_SECRET — shared secret for HMAC signature verification
 *
 * To switch from Test → Live, replace only the two env vars above. No code changes needed.
 */

const Razorpay = require('razorpay');
const crypto   = require('crypto');
const { sendEmail }                                = require('../services/emailService');
const { orderConfirmationEmail }                   = require('../services/emailTemplates');

// ─── Razorpay client (lazy-initialised so missing keys don't crash startup) ───
let razorpay = null;
function getRazorpay() {
    if (!razorpay) {
        const keyId     = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret ||
            keyId === 'rzp_test_YOUR_KEY_ID' ||
            keySecret === 'YOUR_KEY_SECRET') {
            throw new Error(
                'Razorpay credentials are not configured. ' +
                'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.'
            );
        }

        razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return razorpay;
}

// ─── Logger helper ────────────────────────────────────────────────────────────
function logPayment(event, data) {
    const ts = new Date().toISOString();
    console.log(`[PAYMENT] [${ts}] ${event}`, JSON.stringify(data, null, 2));
}

// ─── 1. GET /api/payment/key ──────────────────────────────────────────────────
/**
 * Returns only the public key_id to the frontend.
 * The key_secret is NEVER sent to the client.
 */
exports.getKeyId = (req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId || keyId === 'rzp_test_YOUR_KEY_ID') {
        return res.status(503).json({ error: 'Payment gateway is not configured.' });
    }
    res.json({ key_id: keyId });
};

// ─── 2. POST /api/payment/create-order ───────────────────────────────────────
/**
 * Creates a Razorpay order on the backend and stores the checkout metadata
 * in razorpay_pending_orders so the verify step can reconstruct the DB order
 * without trusting any client-sent amounts.
 *
 * Body: { totalAmount, paymentMethod, shippingAddress, items, subtotal, discount, deliveryFee }
 */
exports.createRazorpayOrder = async (req, res) => {
    const db     = req.app.get('db');
    const userId = req.user.id;

    const {
        totalAmount,
        paymentMethod,
        shippingAddress,
        items,
        subtotal,
        discount,
        deliveryFee,
    } = req.body;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!items || items.length === 0 || !shippingAddress || !paymentMethod || !totalAmount) {
        return res.status(400).json({
            error: 'Required fields: totalAmount, paymentMethod, shippingAddress, items',
        });
    }

    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
        return res.status(400).json({ error: 'Invalid totalAmount' });
    }

    // ── Create Razorpay order ─────────────────────────────────────────────────
    const amountPaise = Math.round(totalAmount * 100); // Razorpay works in smallest currency unit
    const receiptId   = `rcpt_${userId}_${Date.now()}`;

    let rzpOrder;
    try {
        rzpOrder = await getRazorpay().orders.create({
            amount:   amountPaise,
            currency: 'INR',
            receipt:  receiptId,
            notes: {
                user_id:        String(userId),
                payment_method: paymentMethod,
            },
        });
    } catch (err) {
        logPayment('CREATE_ORDER_FAILED', { userId, error: err.message });
        return res.status(502).json({ error: 'Failed to create payment order. Please try again.' });
    }

    logPayment('ORDER_CREATED', { userId, razorpay_order_id: rzpOrder.id, amount: totalAmount });

    // ── Persist pending checkout data (server-side truth) ────────────────────
    const checkoutData = JSON.stringify({
        totalAmount, paymentMethod, shippingAddress, items,
        subtotal:    subtotal    ?? totalAmount,
        discount:    discount    ?? 0,
        deliveryFee: deliveryFee ?? 0,
    });

    db.run(
        `INSERT INTO razorpay_pending_orders
            (razorpay_order_id, user_id, amount_paise, currency, checkout_data, status)
         VALUES (?, ?, ?, 'INR', ?, 'created')`,
        [rzpOrder.id, userId, amountPaise, checkoutData],
        (err) => {
            if (err) {
                logPayment('PENDING_ORDER_SAVE_FAILED', { userId, error: err.message });
                return res.status(500).json({ error: 'Internal error saving order state.' });
            }

            res.json({
                razorpay_order_id: rzpOrder.id,
                amount:            amountPaise,
                currency:          'INR',
                key_id:            process.env.RAZORPAY_KEY_ID,
            });
        }
    );
};

// ─── 3. POST /api/payment/verify ─────────────────────────────────────────────
/**
 * Verifies the Razorpay payment signature using HMAC-SHA256.
 * Only on successful verification does it create the order in the database.
 *
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
exports.verifyPayment = (req, res) => {
    const db     = req.app.get('db');
    const userId = req.user.id;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment verification fields.' });
    }

    // ── HMAC-SHA256 signature verification ───────────────────────────────────
    const keySecret    = process.env.RAZORPAY_KEY_SECRET;
    const generatedSig = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    if (generatedSig !== razorpay_signature) {
        logPayment('SIGNATURE_MISMATCH', { userId, razorpay_order_id, razorpay_payment_id });
        return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    logPayment('SIGNATURE_VERIFIED', { userId, razorpay_order_id, razorpay_payment_id });

    // ── Fetch the pending checkout data stored during create-order ────────────
    db.get(
        `SELECT * FROM razorpay_pending_orders
         WHERE razorpay_order_id = ? AND user_id = ? AND status = 'created'`,
        [razorpay_order_id, userId],
        (err, pending) => {
            if (err)    return res.status(500).json({ error: err.message });
            if (!pending) {
                logPayment('PENDING_ORDER_NOT_FOUND', { userId, razorpay_order_id });
                return res.status(404).json({ error: 'Pending order not found or already processed.' });
            }

            let checkout;
            try {
                checkout = JSON.parse(pending.checkout_data);
            } catch (e) {
                return res.status(500).json({ error: 'Corrupted checkout data.' });
            }

            const {
                totalAmount,
                paymentMethod,
                shippingAddress,
                items,
                subtotal,
                discount,
                deliveryFee,
            } = checkout;

            // ── Begin transaction: create order + items + payment + clear cart ─
            db.serialize(() => {
                const trackingNumber   = `SE${Math.floor(100_000_000 + Math.random() * 900_000_000)}`;
                const invoiceNumber    = `INV-2026-${Math.floor(10_000 + Math.random() * 90_000)}`;
                const expectedDelivery = 'Within 2-3 Days';

                db.run('BEGIN TRANSACTION', (txErr) => {
                    if (txErr) return res.status(500).json({ error: txErr.message });

                    // ── Insert order ──────────────────────────────────────────
                    db.run(
                        `INSERT INTO orders
                            (user_id, total_amount, status, payment_method,
                             shipping_address, expected_delivery, tracking_number, invoice_number)
                         VALUES (?, ?, 'Processing', ?, ?, ?, ?, ?)`,
                        [userId, totalAmount, paymentMethod, shippingAddress,
                         expectedDelivery, trackingNumber, invoiceNumber],
                        function (err) {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: err.message });
                            }

                            const orderId = this.lastID;

                            // ── Insert order items + decrement stock ──────────
                            let itemError = null;
                            const itemStmt  = db.prepare(
                                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)'
                            );
                            const stockStmt = db.prepare(
                                'UPDATE products SET stock = stock - ? WHERE id = ?'
                            );

                            items.forEach(item => {
                                itemStmt.run(orderId, item.product_id, item.quantity, item.price,
                                    (e) => { if (e) itemError = e; });
                                stockStmt.run(item.quantity, item.product_id,
                                    (e) => { if (e) itemError = e; });
                            });

                            itemStmt.finalize();
                            stockStmt.finalize();

                            if (itemError) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: itemError.message });
                            }

                            // ── Insert payment record ─────────────────────────
                            db.run(
                                `INSERT INTO payments
                                    (order_id, payment_method, payment_status,
                                     transaction_id, razorpay_order_id, razorpay_payment_id)
                                 VALUES (?, ?, 'Success', ?, ?, ?)`,
                                [orderId, paymentMethod, razorpay_payment_id,
                                 razorpay_order_id, razorpay_payment_id],
                                (err) => {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: err.message });
                                    }

                                    // ── Clear user cart ───────────────────────
                                    db.run(
                                        'DELETE FROM cart WHERE user_id = ?',
                                        [userId],
                                        (err) => {
                                            if (err) {
                                                db.run('ROLLBACK');
                                                return res.status(500).json({ error: err.message });
                                            }

                                            // ── Mark pending order as paid ────
                                            db.run(
                                                `UPDATE razorpay_pending_orders
                                                 SET status = 'paid'
                                                 WHERE razorpay_order_id = ?`,
                                                [razorpay_order_id],
                                                (err) => {
                                                    if (err) {
                                                        db.run('ROLLBACK');
                                                        return res.status(500).json({ error: err.message });
                                                    }

                                                    // ── COMMIT ───────────────
                                                    db.run('COMMIT', (err) => {
                                                        if (err) return res.status(500).json({ error: err.message });

                                                        logPayment('ORDER_CREATED_AFTER_VERIFY', {
                                                            userId, orderId, razorpay_order_id,
                                                            razorpay_payment_id, totalAmount,
                                                        });

                                                        // Respond immediately
                                                        res.status(201).json({
                                                            message:        'Payment verified. Order placed successfully.',
                                                            orderId,
                                                            trackingNumber,
                                                            invoiceNumber,
                                                        });

                                                        // Fire-and-forget confirmation email
                                                        sendOrderConfirmationEmail(db, userId, {
                                                            orderId, invoiceNumber, trackingNumber,
                                                            items, totalAmount, subtotal,
                                                            discount, deliveryFee, paymentMethod,
                                                            shippingAddress, expectedDelivery,
                                                        });
                                                    });
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                });
            });
        }
    );
};

// ─── 4. POST /api/payment/failure ────────────────────────────────────────────
/**
 * Called by the frontend when the Razorpay modal is dismissed (cancelled)
 * or when payment fails. Updates the pending order status and logs the event.
 * No order is created.
 *
 * Body: { razorpay_order_id, error_code, error_description, error_reason }
 */
exports.handleFailure = (req, res) => {
    const db     = req.app.get('db');
    const userId = req.user.id;

    const {
        razorpay_order_id,
        error_code,
        error_description,
        error_reason,
    } = req.body;

    logPayment('PAYMENT_FAILED_OR_CANCELLED', {
        userId,
        razorpay_order_id,
        error_code,
        error_description,
        error_reason,
    });

    if (razorpay_order_id) {
        db.run(
            `UPDATE razorpay_pending_orders
             SET status = 'failed'
             WHERE razorpay_order_id = ? AND user_id = ?`,
            [razorpay_order_id, userId],
            () => {} // best-effort, ignore errors
        );
    }

    res.json({ message: 'Failure recorded.' });
};

// ─── Internal: fire-and-forget email after successful payment ─────────────────
function sendOrderConfirmationEmail(db, userId, orderData) {
    db.get('SELECT name, email FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) {
            console.error('[PAYMENT] Could not fetch user for confirmation email:', err?.message);
            return;
        }

        const tmpl = orderConfirmationEmail({
            name:             user.name,
            email:            user.email,
            orderId:          orderData.orderId,
            invoiceNumber:    orderData.invoiceNumber,
            trackingNumber:   orderData.trackingNumber,
            items:            orderData.items,
            subtotal:         orderData.subtotal,
            discount:         orderData.discount,
            deliveryFee:      orderData.deliveryFee,
            totalAmount:      orderData.totalAmount,
            paymentMethod:    orderData.paymentMethod,
            shippingAddress:  orderData.shippingAddress,
            expectedDelivery: orderData.expectedDelivery,
        });

        sendEmail({ to: user.email, ...tmpl });
    });
}

'use strict';

const { sendEmail }                                   = require('../services/emailService');
const { orderConfirmationEmail, orderStatusEmail }    = require('../services/emailTemplates');

// ─── Get Orders ───────────────────────────────────────────────────────────────
exports.getOrders = (req, res) => {
    const db     = req.app.get('db');
    const userId = req.user.id;

    db.all(
        "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
};

// ─── Get Order Details ────────────────────────────────────────────────────────
exports.getOrderDetails = (req, res) => {
    const db     = req.app.get('db');
    const userId = req.user.id;
    const { id } = req.params;

    db.get("SELECT * FROM orders WHERE id = ? AND user_id = ?", [id, userId], (err, order) => {
        if (err)    return res.status(500).json({ error: err.message });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        db.all(
            `SELECT order_items.*, products.name, products.brand, products.image_url
             FROM order_items
             JOIN products ON order_items.product_id = products.id
             WHERE order_items.order_id = ?`,
            [id],
            (err, items) => {
                if (err) return res.status(500).json({ error: err.message });

                db.get("SELECT * FROM payments WHERE order_id = ?", [id], (err, payment) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ ...order, items, payment });
                });
            }
        );
    });
};

// ─── Create Order ─────────────────────────────────────────────────────────────
exports.createOrder = (req, res) => {
    const db     = req.app.get('db');
    const userId = req.user.id;
    const { totalAmount, paymentMethod, shippingAddress, items,
            subtotal, discount, deliveryFee } = req.body;

    if (!items || items.length === 0 || !shippingAddress || !paymentMethod || !totalAmount) {
        return res.status(400).json({
            error: 'All fields (totalAmount, paymentMethod, shippingAddress, items) are required',
        });
    }

    db.serialize(() => {
        const trackingNumber    = `SE${Math.floor(100_000_000 + Math.random() * 900_000_000)}`;
        const invoiceNumber     = `INV-2026-${Math.floor(10_000 + Math.random() * 90_000)}`;
        const expectedDelivery  = 'Within 2-3 Days';

        // ── Begin manual transaction ──────────────────────────────────────────
        db.run('BEGIN TRANSACTION', (txErr) => {
            if (txErr) return res.status(500).json({ error: txErr.message });

            db.run(
                `INSERT INTO orders
                    (user_id, total_amount, status, payment_method,
                     shipping_address, expected_delivery, tracking_number, invoice_number)
                 VALUES (?, ?, 'Processing', ?, ?, ?, ?, ?)`,
                [userId, totalAmount, paymentMethod, shippingAddress,
                 expectedDelivery, trackingNumber, invoiceNumber],
                function (err) {
                    if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }

                    const orderId = this.lastID;

                    // Insert order items + decrement stock
                    let itemError = null;
                    const itemStmt  = db.prepare(
                        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)"
                    );
                    const stockStmt = db.prepare(
                        "UPDATE products SET stock = stock - ? WHERE id = ?"
                    );

                    items.forEach(item => {
                        itemStmt.run(orderId, item.product_id, item.quantity, item.price, (e) => { if (e) itemError = e; });
                        stockStmt.run(item.quantity, item.product_id, (e) => { if (e) itemError = e; });
                    });

                    itemStmt.finalize();
                    stockStmt.finalize();

                    if (itemError) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: itemError.message });
                    }

                    // Insert payment record
                    const paymentStatus = paymentMethod === 'Cash On Delivery' ? 'Pending' : 'Success';
                    const transactionId = `TXN${Math.floor(9_000_000_000 + Math.random() * 900_000_000)}`;

                    db.run(
                        `INSERT INTO payments (order_id, payment_method, payment_status, transaction_id)
                         VALUES (?, ?, ?, ?)`,
                        [orderId, paymentMethod, paymentStatus, transactionId],
                        (err) => {
                            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }

                            // Clear user's cart
                            db.run("DELETE FROM cart WHERE user_id = ?", [userId], (err) => {
                                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }

                                // ── COMMIT ──────────────────────────────────
                                db.run('COMMIT', (err) => {
                                    if (err) return res.status(500).json({ error: err.message });

                                    // ── Respond immediately ──────────────────
                                    res.status(201).json({
                                        message: 'Order created successfully',
                                        orderId,
                                        trackingNumber,
                                        invoiceNumber,
                                    });

                                    // ── Fire-and-forget confirmation email ───
                                    sendOrderConfirmationEmail(db, userId, {
                                        orderId, invoiceNumber, trackingNumber,
                                        items, totalAmount,
                                        subtotal:        subtotal        || totalAmount,
                                        discount:        discount        || 0,
                                        deliveryFee:     deliveryFee     || 0,
                                        paymentMethod, shippingAddress, expectedDelivery,
                                    });
                                });
                            });
                        }
                    );
                }
            );
        });
    });
};

// ─── Update Order Status ──────────────────────────────────────────────────────
exports.updateOrderStatus = (req, res) => {
    const db            = req.app.get('db');
    const { id }        = req.params;
    const { status }    = req.body;

    const allowed = ['Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
    if (!status || !allowed.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }

    db.get("SELECT * FROM orders WHERE id = ?", [id], (err, order) => {
        if (err)    return res.status(500).json({ error: err.message });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        db.run(
            "UPDATE orders SET status = ? WHERE id = ?",
            [status, id],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });

                res.json({ message: 'Order status updated successfully', orderId: id, status });

                // ── Fire-and-forget status email ─────────────────────────────
                sendOrderStatusEmail(db, order.user_id, {
                    orderId:         order.id,
                    trackingNumber:  order.tracking_number,
                    newStatus:       status,
                    expectedDelivery: order.expected_delivery,
                });
            }
        );
    });
};

// ─── Address Management ───────────────────────────────────────────────────────
exports.getAddresses = (req, res) => {
    const db     = req.app.get('db');
    const userId = req.user.id;

    db.all(
        "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
};

exports.addAddress = (req, res) => {
    const db     = req.app.get('db');
    const userId = req.user.id;
    const { full_name, phone, house_no, apartment, street, area,
            landmark, city, district, state, country, pincode, is_default = 0 } = req.body;

    if (!full_name || !phone || !city || !state || !pincode) {
        return res.status(400).json({ error: 'Name, phone, city, state and pincode are required' });
    }

    db.serialize(() => {
        if (is_default === 1 || is_default === '1') {
            db.run("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId]);
        }

        db.run(
            `INSERT INTO addresses
                (user_id, full_name, phone, house_no, apartment, street, area,
                 landmark, city, district, state, country, pincode, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, full_name, phone, house_no, apartment, street, area,
             landmark, city, district, state, country, pincode, is_default],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Address added successfully', addressId: this.lastID });
            }
        );
    });
};

exports.deleteAddress = (req, res) => {
    const db     = req.app.get('db');
    const userId = req.user.id;
    const { id } = req.params;

    db.run("DELETE FROM addresses WHERE id = ? AND user_id = ?", [id, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Address deleted successfully' });
    });
};

// ─── Internal email helpers ───────────────────────────────────────────────────

/** Fetch user email, build and dispatch order confirmation email */
function sendOrderConfirmationEmail(db, userId, orderData) {
    db.get("SELECT name, email FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) {
            console.error('[ORDER] Could not fetch user for confirmation email:', err?.message);
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

/** Fetch user email + order items, then dispatch status update email */
function sendOrderStatusEmail(db, userId, { orderId, trackingNumber, newStatus, expectedDelivery }) {
    db.get("SELECT name, email FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) {
            console.error('[ORDER] Could not fetch user for status email:', err?.message);
            return;
        }

        // Fetch items to include in status email
        db.all(
            `SELECT oi.quantity, oi.price, p.name, p.brand, p.image_url
             FROM order_items oi JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?`,
            [orderId],
            (err, items) => {
                const tmpl = orderStatusEmail({
                    name:             user.name,
                    orderId,
                    trackingNumber,
                    newStatus,
                    expectedDelivery,
                    items:            items || [],
                });
                sendEmail({ to: user.email, ...tmpl });
            }
        );
    });
}

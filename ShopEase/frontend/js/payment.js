/**
 * payment.js — Razorpay Checkout Flow
 *
 * Responsibilities:
 *  - Renders payment method options (UPI, Card, Net Banking, COD)
 *  - For online methods: creates a Razorpay order via the backend, opens the
 *    Razorpay checkout modal, then verifies the payment signature server-side
 *    before navigating to order-success.
 *  - For COD: calls the existing /api/orders/create directly (unchanged flow).
 *  - Handles failures and cancellations gracefully.
 *
 * UI: Zero changes to the existing payment page design.
 */

'use strict';

// ─── Module-level state ───────────────────────────────────────────────────────
let activePaymentMethod = 'UPI';

// ─── Page Init ────────────────────────────────────────────────────────────────
window.initPayment = () => {
    if (!window.checkoutState || window.checkoutState.items.length === 0) {
        app.navigate('cart');
        return;
    }

    const state = window.checkoutState;
    document.getElementById('payment-payable-amount').textContent =
        `₹${state.totalAmount.toLocaleString('en-IN')}`;
    document.getElementById('payment-bottom-total').textContent =
        `₹${state.totalAmount.toLocaleString('en-IN')}`;

    // Default selected method
    activePaymentMethod = 'UPI';
    selectPaymentMethod('UPI');
};

// ─── UI: Payment Method Selection ─────────────────────────────────────────────
function selectPaymentMethod(method) {
    activePaymentMethod = method;

    // Toggle credit card input fields
    const cardFields = document.getElementById('card-fields-wrapper');
    if (cardFields) {
        cardFields.style.display = (method === 'Credit Card') ? 'flex' : 'none';
    }

    // Update card border / background highlights
    const methods = [
        { key: 'UPI',             id: 'pay-opt-UPI'  },
        { key: 'Credit Card',     id: 'pay-opt-Card' },
        { key: 'Net Banking',     id: 'pay-opt-Net'  },
        { key: 'Cash On Delivery', id: 'pay-opt-COD' },
    ];

    methods.forEach(({ key, id }) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (key === method) {
            el.style.borderColor      = 'var(--md-sys-color-primary)';
            el.style.backgroundColor  = 'rgba(37, 99, 235, 0.05)';
        } else {
            el.style.borderColor      = 'rgba(0, 0, 0, 0.05)';
            el.style.backgroundColor  = 'var(--md-sys-color-surface)';
        }
    });

    // Sync radio buttons
    document.getElementsByName('payment_mode').forEach(radio => {
        radio.checked = (radio.value === method);
    });
}

// ─── UI: Button helpers ────────────────────────────────────────────────────────
function setPayBtn(disabled, label) {
    const btn = document.getElementById('pay-place-order-btn');
    if (!btn) return;
    btn.disabled    = disabled;
    btn.textContent = label;
}

function resetPayBtn() {
    setPayBtn(false, 'Pay & Place Order');
    // Re-attach icon (textContent strips it)
    const btn = document.getElementById('pay-place-order-btn');
    if (btn) {
        btn.innerHTML = 'Pay & Place Order <i class="material-icons" style="font-size:18px;">check_circle</i>';
    }
}

// ─── Main: Place Order handler ────────────────────────────────────────────────
async function handlePlaceOrder() {
    const state = window.checkoutState;
    if (!state) return;

    // Validate card fields when card method is selected
    if (activePaymentMethod === 'Credit Card') {
        const cardNo     = document.getElementById('card-no')?.value || '';
        const cardExpiry = document.getElementById('card-expiry')?.value || '';
        const cardCvv    = document.getElementById('card-cvv')?.value || '';
        if (cardNo.replace(/\s/g, '').length < 16 || !cardExpiry || cardCvv.length < 3) {
            alert('Please fill in valid Card Details to proceed!');
            return;
        }
    }

    setPayBtn(true, 'Processing…');

    // ── Route: Cash On Delivery (unchanged existing flow) ─────────────────────
    if (activePaymentMethod === 'Cash On Delivery') {
        await placeCODOrder(state);
        return;
    }

    // ── Route: Online payment via Razorpay ────────────────────────────────────
    await initiateRazorpayPayment(state);
}

// ─── COD: direct order creation (existing flow, untouched) ────────────────────
async function placeCODOrder(state) {
    try {
        const result = await ApiService.post('/orders/create', {
            totalAmount:     state.totalAmount,
            paymentMethod:   'Cash On Delivery',
            shippingAddress: state.selectedAddress,
            items:           state.items,
            subtotal:        state.subtotal,
            discount:        state.discount,
            deliveryFee:     state.deliveryFee,
        });

        navigateToSuccess({
            orderId:        result.orderId,
            trackingNumber: result.trackingNumber,
            invoiceNumber:  result.invoiceNumber,
            totalAmount:    state.totalAmount,
            address:        state.selectedAddress,
        });
    } catch (err) {
        alert('Failed to place order: ' + err.message);
        resetPayBtn();
    }
}

// ─── Razorpay online payment flow ─────────────────────────────────────────────
async function initiateRazorpayPayment(state) {
    // Guard: Razorpay SDK must be loaded
    if (typeof Razorpay === 'undefined') {
        alert('Payment gateway failed to load. Please check your internet connection and try again.');
        resetPayBtn();
        return;
    }

    let razorpayOrderId;

    // Step 1: Create Razorpay order on the backend
    try {
        const orderRes = await ApiService.post('/payment/create-order', {
            totalAmount:     state.totalAmount,
            paymentMethod:   activePaymentMethod,
            shippingAddress: state.selectedAddress,
            items:           state.items,
            subtotal:        state.subtotal,
            discount:        state.discount,
            deliveryFee:     state.deliveryFee,
        });
        razorpayOrderId = orderRes.razorpay_order_id;
    } catch (err) {
        alert('Could not initiate payment: ' + err.message);
        resetPayBtn();
        return;
    }

    // Step 2: Fetch the public key_id from the backend (never hardcode)
    let keyId;
    try {
        const keyRes = await ApiService.get('/payment/key');
        keyId = keyRes.key_id;
    } catch (err) {
        alert('Payment gateway not configured. Please contact support.');
        resetPayBtn();
        return;
    }

    // Step 3: Fetch user info from local storage for prefill
    let prefill = {};
    try {
        const userStr = localStorage.getItem('shopease_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            prefill = {
                name:    user.name  || '',
                email:   user.email || '',
                contact: user.phone || '',
            };
        }
    } catch (_) {}

    // Step 4: Map ShopEase payment method to Razorpay method hint
    const methodMap = {
        'UPI':         'upi',
        'Credit Card': 'card',
        'Net Banking': 'netbanking',
    };
    const rzpMethod = methodMap[activePaymentMethod] || 'upi';

    // Step 5: Open Razorpay Checkout modal
    const rzpOptions = {
        key:         keyId,
        amount:      Math.round(state.totalAmount * 100), // paise
        currency:    'INR',
        name:        'ShopEase',
        description: `Order Payment — ₹${state.totalAmount.toLocaleString('en-IN')}`,
        order_id:    razorpayOrderId,
        prefill,
        theme:       { color: '#2563EB' },
        modal: {
            // Called when user closes the modal without completing payment
            ondismiss: async () => {
                await reportFailure(razorpayOrderId, null, 'User cancelled the payment.');
                resetPayBtn();
            },
        },
        // Step 6: On successful payment, verify signature server-side
        handler: async (response) => {
            setPayBtn(true, 'Verifying Payment…');
            try {
                const verifyResult = await ApiService.post('/payment/verify', {
                    razorpay_order_id:   response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature:  response.razorpay_signature,
                });

                navigateToSuccess({
                    orderId:        verifyResult.orderId,
                    trackingNumber: verifyResult.trackingNumber,
                    invoiceNumber:  verifyResult.invoiceNumber,
                    totalAmount:    state.totalAmount,
                    address:        state.selectedAddress,
                });
            } catch (err) {
                alert(
                    'Payment was captured but verification failed.\n' +
                    'Your money is safe. Please contact support with Payment ID: ' +
                    response.razorpay_payment_id
                );
                resetPayBtn();
            }
        },
    };

    // Open the modal
    const rzp = new Razorpay(rzpOptions);

    // Step 7: Handle payment errors thrown by Razorpay (e.g. insufficient funds)
    rzp.on('payment.failed', async (response) => {
        const errCode   = response.error?.code        || 'UNKNOWN';
        const errDesc   = response.error?.description || 'Payment failed.';
        const errReason = response.error?.reason      || '';

        await reportFailure(razorpayOrderId, errCode, errDesc, errReason);

        alert(`Payment failed: ${errDesc}\nPlease try again or choose a different payment method.`);
        resetPayBtn();
    });

    rzp.open();
}

// ─── Helper: report failure/cancellation to backend ──────────────────────────
async function reportFailure(razorpayOrderId, errorCode, errorDescription, errorReason) {
    try {
        await ApiService.post('/payment/failure', {
            razorpay_order_id:  razorpayOrderId,
            error_code:         errorCode,
            error_description:  errorDescription,
            error_reason:       errorReason,
        });
    } catch (_) {
        // best-effort — do not surface network errors on failure reporting
    }
}

// ─── Helper: navigate to order-success ───────────────────────────────────────
function navigateToSuccess({ orderId, trackingNumber, invoiceNumber, totalAmount, address }) {
    window.placedOrderInfo = {
        orderId,
        trackingNumber,
        invoiceNumber,
        totalAmount,
        address,
        deliveryTime: 'Within 2-3 Days',
    };

    // Clear checkout state so back-navigation can't re-trigger payment
    window.checkoutState = null;

    app.navigate('order-success');
}

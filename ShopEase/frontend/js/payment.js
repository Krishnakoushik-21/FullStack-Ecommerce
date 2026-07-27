// Payment Controller
let activePaymentMethod = 'UPI';

window.initPayment = () => {
    if (!window.checkoutState || window.checkoutState.items.length === 0) {
        app.navigate('cart');
        return;
    }

    const state = window.checkoutState;
    document.getElementById('payment-payable-amount').textContent = `₹${state.totalAmount.toLocaleString('en-IN')}`;
    document.getElementById('payment-bottom-total').textContent = `₹${state.totalAmount.toLocaleString('en-IN')}`;

    // Select default radio
    activePaymentMethod = 'UPI';
    selectPaymentMethod('UPI');
};

function selectPaymentMethod(method) {
    activePaymentMethod = method;

    // Toggle credit card fields
    const cardFields = document.getElementById('card-fields-wrapper');
    if (cardFields) {
        if (method === 'Credit Card') {
            cardFields.style.display = 'flex';
        } else {
            cardFields.style.display = 'none';
        }
    }

    // Update active visual borders
    const methods = [
        { key: 'UPI', id: 'pay-opt-UPI' },
        { key: 'Credit Card', id: 'pay-opt-Card' },
        { key: 'Net Banking', id: 'pay-opt-Net' },
        { key: 'Cash On Delivery', id: 'pay-opt-COD' }
    ];

    methods.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            if (item.key === method) {
                el.style.borderColor = 'var(--md-sys-color-primary)';
                el.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
            } else {
                el.style.borderColor = 'rgba(0, 0, 0, 0.05)';
                el.style.backgroundColor = 'var(--md-sys-color-surface)';
            }
        }
    });

    // Check radio buttons
    const radios = document.getElementsByName('payment_mode');
    radios.forEach(radio => {
        if (radio.value === method) {
            radio.checked = true;
        } else {
            radio.checked = false;
        }
    });
}

async function handlePlaceOrder() {
    const state = window.checkoutState;
    if (!state) return;

    if (activePaymentMethod === 'Credit Card') {
        const cardNo = document.getElementById('card-no')?.value || '';
        const cardExpiry = document.getElementById('card-expiry')?.value || '';
        const cardCvv = document.getElementById('card-cvv')?.value || '';

        if (cardNo.length < 16 || !cardExpiry || cardCvv.length < 3) {
            alert("Please fill in valid Card Details to proceed!");
            return;
        }
    }

    // Disable place order button to prevent double-clicks
    const payBtn = document.getElementById('pay-place-order-btn');
    if (payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = 'Processing Payment...';
    }

    try {
        const payload = {
            totalAmount: state.totalAmount,
            paymentMethod: activePaymentMethod,
            shippingAddress: state.selectedAddress,
            items: state.items
        };

        const result = await ApiService.post('/orders/create', payload);

        // Store result for success screen
        window.placedOrderInfo = {
            orderId: result.orderId,
            trackingNumber: result.trackingNumber,
            invoiceNumber: result.invoiceNumber,
            totalAmount: state.totalAmount,
            address: state.selectedAddress,
            deliveryTime: 'Within 2-3 Days'
        };

        // Clear checkout state
        window.checkoutState = null;

        // Navigate to success view
        app.navigate('order-success');
    } catch (e) {
        alert("Failed to place order: " + e.message);
        if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = 'Pay & Place Order';
        }
    }
}

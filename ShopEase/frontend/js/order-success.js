// Order Success Controller
window.initOrderSuccess = () => {
    const info = window.placedOrderInfo;
    if (!info) {
        app.navigate('home');
        return;
    }

    document.getElementById('success-order-id').textContent = `#${info.orderId}`;
    document.getElementById('success-tracking-id').textContent = info.trackingNumber;
    document.getElementById('success-invoice-no').textContent = info.invoiceNumber;
    document.getElementById('success-total').textContent = `₹${info.totalAmount.toLocaleString('en-IN')}`;
    document.getElementById('success-address').textContent = info.address;

    // Consume the info
    window.placedOrderInfo = null;
};

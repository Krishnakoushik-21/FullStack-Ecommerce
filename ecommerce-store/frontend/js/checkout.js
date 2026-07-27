document.addEventListener('DOMContentLoaded', () => {
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please login to checkout', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    const cart = getCart();
    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalEl = document.getElementById('checkout-total');
    if (totalEl) {
        totalEl.textContent = '$' + total.toFixed(2);
    }

    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('fullName').value;
            const address = document.getElementById('address').value;
            const phone = document.getElementById('phone').value;
            const paymentMethod = document.getElementById('paymentMethod').value;

            const orderData = {
                orderItems: cart,
                shippingAddress: {
                    fullName,
                    address,
                    phone
                },
                paymentMethod,
                totalPrice: total
            };

            try {
                await apiFetch('/orders', {
                    method: 'POST',
                    body: JSON.stringify(orderData)
                });

                showToast('Order placed successfully!', 'success');
                saveCart([]); // Clear cart
                
                setTimeout(() => {
                    window.location.href = 'orders.html';
                }, 2000);

            } catch (error) {
                // apiFetch handles toast
            }
        });
    }

});

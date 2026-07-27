// Cart Controller
let cartItems = [];
let appliedCoupon = null;

window.initCart = async () => {
    const token = localStorage.getItem('shopease_token');
    if (!token) {
        app.navigate('login');
        return;
    }

    try {
        cartItems = await ApiService.get('/cart');
        renderCart();
    } catch (error) {
        console.error("Error loading cart:", error);
    }
};

function renderCart() {
    const emptyState = document.getElementById('cart-empty-state');
    const contentWrapper = document.getElementById('cart-content-wrapper');
    const bottomBar = document.getElementById('cart-bottom-bar');
    const itemsList = document.getElementById('cart-items-list');

    if (!emptyState || !contentWrapper || !bottomBar || !itemsList) return;

    if (cartItems.length === 0) {
        emptyState.style.display = 'flex';
        contentWrapper.style.display = 'none';
        bottomBar.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    contentWrapper.style.display = 'block';
    bottomBar.style.display = 'flex';

    itemsList.innerHTML = cartItems.map(item => `
        <div style="display: flex; gap: 16px; padding: 16px; border-radius: var(--card-radius-lg); border: 1px solid var(--md-sys-color-outline-variant); background-color: var(--md-sys-color-surface); align-items: center; position: relative;">
            <img src="${item.image_url}" alt="${item.name}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 18px; background-color: var(--md-sys-color-surface-variant); cursor: pointer;" onclick="viewProductDetails(${item.product_id})">
            
            <div style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--md-sys-color-on-surface-variant); letter-spacing: 0.5px;">${item.brand}</span>
                <span style="font-size: 14px; font-weight: 700; color: var(--md-sys-color-on-surface); margin: 4px 0 6px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; cursor: pointer;" onclick="viewProductDetails(${item.product_id})">${item.name}</span>
                
                <div style="display: flex; align-items: baseline; gap: 8px;">
                    <span style="font-size: 16px; font-weight: 800; color: var(--md-sys-color-on-surface);">₹${item.price.toLocaleString('en-IN')}</span>
                    <span style="font-size: 12px; text-decoration: line-through; color: var(--md-sys-color-on-surface-variant);">₹${item.old_price.toLocaleString('en-IN')}</span>
                </div>
            </div>

            <!-- Qty Selectors -->
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 12px; min-width: 90px;">
                <button class="icon-btn" onclick="removeCartItem(${item.product_id})" style="color: var(--md-sys-color-error);"><i class="material-icons" style="font-size: 20px;">delete</i></button>
                <div style="display: flex; align-items: center; gap: 10px; background-color: var(--md-sys-color-surface-variant); border-radius: 18px; padding: 4px 12px;">
                    <button onclick="updateQty(${item.product_id}, ${item.quantity - 1})" style="border: none; background: transparent; font-size: 18px; font-weight: bold; cursor: pointer; color: var(--md-sys-color-on-surface);">-</button>
                    <span style="font-size: 13px; font-weight: 700; min-width: 16px; text-align: center;">${item.quantity}</span>
                    <button onclick="updateQty(${item.product_id}, ${item.quantity + 1})" style="border: none; background: transparent; font-size: 16px; font-weight: bold; cursor: pointer; color: var(--md-sys-color-on-surface);">+</button>
                </div>
            </div>
        </div>
    `).join('');

    calculateTotals();
}

async function updateQty(productId, newQty) {
    try {
        await ApiService.post('/cart/update', { productId, quantity: newQty });
        initCart();
    } catch (e) {
        alert(e.message);
    }
}

async function removeCartItem(productId) {
    try {
        await ApiService.post('/cart/remove', { productId });
        initCart();
    } catch (e) {
        console.error(e);
    }
}

function calculateTotals() {
    let subtotal = 0;
    cartItems.forEach(item => {
        subtotal += item.price * item.quantity;
    });

    let discount = 0;
    if (appliedCoupon) {
        discount = Math.round(subtotal * (appliedCoupon.discount_percent / 100));
    }

    const deliveryFee = subtotal >= 999 ? 0 : 49;
    const finalTotal = subtotal - discount + deliveryFee;

    document.getElementById('summary-subtotal').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    document.getElementById('summary-discount').textContent = `-₹${discount.toLocaleString('en-IN')}`;
    document.getElementById('summary-delivery').textContent = deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`;
    document.getElementById('summary-total').textContent = `₹${finalTotal.toLocaleString('en-IN')}`;

    document.getElementById('bottom-payable-total').textContent = `₹${finalTotal.toLocaleString('en-IN')}`;

    // Cache computed state for checkout screen
    window.checkoutState = {
        subtotal,
        discount,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        deliveryFee,
        totalAmount: finalTotal,
        items: cartItems.map(item => ({
            product_id: item.product_id,
            name: item.name,
            brand: item.brand,
            price: item.price,
            quantity: item.quantity,
            image_url: item.image_url
        }))
    };
}

async function applyCartCoupon() {
    const input = document.getElementById('coupon-input');
    const msgEl = document.getElementById('coupon-status-msg');
    if (!input || !msgEl) return;

    const code = input.value.trim();
    if (!code) {
        msgEl.style.display = 'block';
        msgEl.style.color = 'var(--md-sys-color-error)';
        msgEl.textContent = 'Please enter a coupon code';
        return;
    }

    try {
        const coupon = await ApiService.post('/cart/coupon', { code });
        appliedCoupon = coupon;
        msgEl.style.display = 'block';
        msgEl.style.color = 'green';
        msgEl.textContent = `Coupon applied! ${coupon.discount_percent}% Off success.`;
        calculateTotals();
    } catch (err) {
        appliedCoupon = null;
        msgEl.style.display = 'block';
        msgEl.style.color = 'var(--md-sys-color-error)';
        msgEl.textContent = err.message;
        calculateTotals();
    }
}

function navigateToCheckout() {
    if (!window.checkoutState || window.checkoutState.items.length === 0) {
        alert("Cart is empty");
        return;
    }
    app.navigate('checkout');
}

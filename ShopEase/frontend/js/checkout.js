// Checkout Controller
let selectedAddressId = null;
let savedAddresses = [];

window.initCheckout = async () => {
    // If no active checkout state, go to cart
    if (!window.checkoutState || window.checkoutState.items.length === 0) {
        app.navigate('cart');
        return;
    }

    try {
        // Fetch addresses
        savedAddresses = await ApiService.get('/orders/addresses/all');
        renderCheckoutAddresses();

        // Render Checkout details
        const state = window.checkoutState;
        document.getElementById('checkout-summary-subtotal').textContent = `₹${state.subtotal.toLocaleString('en-IN')}`;
        document.getElementById('checkout-summary-discount').textContent = `-₹${state.discount.toLocaleString('en-IN')}`;
        document.getElementById('checkout-summary-delivery').textContent = state.deliveryFee === 0 ? 'FREE' : `₹${state.deliveryFee}`;
        document.getElementById('checkout-summary-total').textContent = `₹${state.totalAmount.toLocaleString('en-IN')}`;
        document.getElementById('checkout-bottom-total').textContent = `₹${state.totalAmount.toLocaleString('en-IN')}`;

        // Render items breakdown
        const itemsList = document.getElementById('checkout-items-list');
        if (itemsList) {
            itemsList.innerHTML = state.items.map(item => `
                <div class="glass-card" style="display: flex; gap: 16px; align-items: center; justify-content: space-between; padding: 16px; border-radius: var(--card-radius-lg);">
                    <div style="display: flex; gap: 12px; align-items: center; min-width: 0; flex: 1;">
                        <img src="${item.image_url}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 12px; background-color: var(--md-sys-color-surface-variant);">
                        <div style="min-width: 0; flex: 1;">
                            <h4 style="font-size: 14px; font-weight: 700; color: var(--md-sys-color-on-surface); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</h4>
                            <span style="font-size: 12px; font-weight: 600; color: var(--md-sys-color-on-surface-variant);">Qty: ${item.quantity}</span>
                        </div>
                    </div>
                    <span style="font-weight: 800; font-size: 15px; color: var(--md-sys-color-on-surface); min-width: fit-content; margin-left: 8px;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error("Error loading checkout details:", error);
    }
};

function renderCheckoutAddresses() {
    const list = document.getElementById('checkout-address-list');
    if (!list) return;

    if (savedAddresses.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 24px; border: 2px dashed var(--md-sys-color-outline); border-radius: 20px;">
                <p style="font-size: 13px; color: var(--md-sys-color-on-surface-variant); font-weight: 600;">No saved addresses found. Add one to continue.</p>
            </div>
        `;
        selectedAddressId = null;
        return;
    }

    // Default select the first/default address
    const defaultAddr = savedAddresses.find(a => a.is_default === 1) || savedAddresses[0];
    if (!selectedAddressId) {
        selectedAddressId = defaultAddr.id;
    }

    list.innerHTML = savedAddresses.map(a => `
        <div class="card-lift" style="display: flex; gap: 16px; border: 2px solid ${a.id === selectedAddressId ? 'var(--md-sys-color-primary)' : 'rgba(0, 0, 0, 0.05)'}; background-color: ${a.id === selectedAddressId ? 'rgba(37, 99, 235, 0.05)' : 'var(--md-sys-color-surface)'}; padding: 18px; border-radius: var(--card-radius-lg); align-items: flex-start; cursor: pointer;" onclick="selectCheckoutAddress(${a.id})">
            <input type="radio" name="checkout_addr" value="${a.id}" ${a.id === selectedAddressId ? 'checked' : ''} style="margin-top: 4px; pointer-events: none; accent-color: var(--md-sys-color-primary);">
            <div style="flex: 1; font-size: 13px;">
                <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
                    <span style="font-weight: 750; font-size: 14px; color: var(--md-sys-color-on-surface);">${a.full_name}</span>
                    ${a.is_default === 1 ? '<span style="font-size: 9px; background-color: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); padding: 2px 6px; border-radius: 6px; font-weight: 800;">Default</span>' : ''}
                </div>
                <div style="color: var(--md-sys-color-on-surface-variant); font-size: 13px; line-height: 1.45; font-weight: 500;">
                    ${a.house_no ? a.house_no + ', ' : ''}${a.apartment ? a.apartment + ', ' : ''}${a.street ? a.street + ', ' : ''}${a.area ? a.area + ', ' : ''}${a.city}, ${a.state} - ${a.pincode}
                </div>
                <div style="font-weight: 600; margin-top: 6px; color: var(--md-sys-color-on-surface-variant); font-size: 12px;">Phone: ${a.phone}</div>
            </div>
        </div>
    `).join('');
}

function selectCheckoutAddress(addressId) {
    selectedAddressId = addressId;
    renderCheckoutAddresses();
}

function openNewAddressModal() {
    const modal = document.getElementById('address-modal');
    if (modal) modal.style.display = 'flex';
}

function closeNewAddressModal() {
    const modal = document.getElementById('address-modal');
    if (modal) modal.style.display = 'none';
}

async function handleSaveAddress(event) {
    event.preventDefault();
    const data = {
        full_name: document.getElementById('addr-name').value,
        phone: document.getElementById('addr-phone').value,
        house_no: document.getElementById('addr-house').value,
        apartment: document.getElementById('addr-apartment').value,
        street: document.getElementById('addr-street').value,
        city: document.getElementById('addr-city').value,
        state: document.getElementById('addr-state').value,
        pincode: document.getElementById('addr-pincode').value,
        is_default: document.getElementById('addr-default').checked ? 1 : 0
    };

    try {
        await ApiService.post('/orders/addresses/add', data);
        closeNewAddressModal();
        document.getElementById('address-form').reset();
        
        // Reload addresses list
        savedAddresses = await ApiService.get('/orders/addresses/all');
        renderCheckoutAddresses();
    } catch (e) {
        alert(e.message);
    }
}

function proceedToPayment() {
    if (!selectedAddressId) {
        alert("Please select or add a delivery address");
        return;
    }

    const addr = savedAddresses.find(a => a.id === selectedAddressId);
    const addrString = `${addr.full_name}, ${addr.house_no ? addr.house_no + ', ' : ''}${addr.apartment ? addr.apartment + ', ' : ''}${addr.street ? addr.street + ', ' : ''}${addr.city}, ${addr.state} - ${addr.pincode}. Phone: ${addr.phone}`;

    // Cache selected address inside checkoutState
    window.checkoutState.selectedAddress = addrString;
    app.navigate('payment');
}

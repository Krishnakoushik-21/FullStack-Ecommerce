// Orders Controller
let userOrders = [];

window.initOrders = async () => {
    const token = localStorage.getItem('shopease_token');
    if (!token) {
        app.navigate('login');
        return;
    }

    try {
        userOrders = await ApiService.get('/orders');
        renderOrdersList();
    } catch (error) {
        console.error("Error fetching orders:", error);
    }
};

function renderOrdersList() {
    const emptyState = document.getElementById('orders-empty-state');
    const container = document.getElementById('orders-list-container');
    if (!emptyState || !container) return;

    if (userOrders.length === 0) {
        emptyState.style.display = 'flex';
        container.innerHTML = '';
        return;
    }

    emptyState.style.display = 'none';

    container.innerHTML = userOrders.map(o => {
        const statusDetails = getStatusDetails(o.status);
        const formattedDate = o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric'
        }) : 'Recent';

        return `
            <div class="card-lift" style="border: 1px solid rgba(0,0,0,0.05); border-radius: var(--card-radius-lg); padding: 18px; background-color: var(--md-sys-color-surface); cursor: pointer; display: flex; flex-direction: column; gap: 10px;" onclick="viewOrderDetails(${o.id})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; font-size: 14px; color: var(--md-sys-color-on-surface); letter-spacing: -0.2px;">Order #${o.id}</span>
                    <span style="font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 12px; background-color: ${statusDetails.bg}; color: ${statusDetails.fg}; text-transform: uppercase;">${o.status}</span>
                </div>
                <div style="font-size: 12px; color: var(--md-sys-color-on-surface-variant); font-weight: 500;">
                    Ordered on: <strong style="color: var(--md-sys-color-on-surface);">${formattedDate}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; border-top: 1px dashed var(--md-sys-color-outline-variant); padding-top: 10px; margin-top: 4px;">
                    <span style="font-size: 13px; color: var(--md-sys-color-on-surface-variant); font-weight: 600;">Total Amount:</span>
                    <span style="font-size: 16px; font-weight: 850; color: var(--md-sys-color-primary);">₹${o.total_amount.toLocaleString('en-IN')}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getStatusDetails(status) {
    switch (status) {
        case 'Delivered':
            return { bg: '#E2FBE7', fg: '#1E824C' };
        case 'Shipped':
            return { bg: '#FFF3CD', fg: '#856404' };
        case 'Processing':
            return { bg: '#D1ECF1', fg: '#0C5460' };
        case 'Cancelled':
            return { bg: '#F8D7DA', fg: '#721C24' };
        case 'Returned':
            return { bg: '#E2E3E5', fg: '#383D41' };
        default:
            return { bg: 'var(--md-sys-color-surface-variant)', fg: 'var(--md-sys-color-on-surface-variant)' };
    }
}

async function viewOrderDetails(orderId) {
    try {
        const details = await ApiService.get(`/orders/${orderId}`);
        
        document.getElementById('modal-order-title').textContent = `Order Details #${details.id}`;
        
        const content = document.getElementById('modal-order-content');
        if (!content) return;

        const formattedDate = details.created_at ? new Date(details.created_at).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'Recent';

        const statusDetails = getStatusDetails(details.status);

        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; background-color: var(--md-sys-color-surface-variant); padding: 14px 18px; border-radius: var(--card-radius-sm); border: 1px solid var(--md-sys-color-outline-variant);">
                <span style="font-weight: 700; color: var(--md-sys-color-on-surface);">Status: <strong style="color: ${statusDetails.fg};">${details.status}</strong></span>
                <span style="font-weight: 500;">Expected: <strong>${details.expected_delivery || 'N/A'}</strong></span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 6px;">
                <span style="font-weight: 800; color: var(--md-sys-color-on-surface); font-size: 14px; letter-spacing: -0.2px;">Items Purchased</span>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${details.items.map(item => `
                        <div class="glass-card" style="display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 12px; border-radius: 16px;">
                            <div style="display: flex; gap: 12px; align-items: center; min-width: 0; flex: 1;">
                                <img src="${item.image_url}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 10px; background-color: var(--md-sys-color-surface-variant); cursor: pointer;" onclick="closeOrderDetailsModal(); viewProductDetails(${item.product_id});">
                                <div style="min-width: 0; flex: 1;">
                                    <div style="font-weight: 750; color: var(--md-sys-color-on-surface); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
                                    <div style="font-size: 11px; color: var(--md-sys-color-on-surface-variant); font-weight: 500;">${item.brand}</div>
                                </div>
                            </div>
                            <span style="font-weight: 800; color: var(--md-sys-color-on-surface); font-size: 13px; margin-left: 8px; min-width: fit-content;">${item.quantity} x ₹${item.price.toLocaleString('en-IN')}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="border-top: 1px solid var(--md-sys-color-outline-variant); padding-top: 12px; margin-top: 6px; display: flex; flex-direction: column; gap: 6px;">
                <span style="font-weight: 800; color: var(--md-sys-color-on-surface); font-size: 14px; letter-spacing: -0.2px;">Delivery Address</span>
                <span style="color: var(--md-sys-color-on-surface-variant); font-size: 13px; line-height: 1.5; font-weight: 500;">${details.shipping_address}</span>
            </div>

            <div style="border-top: 1px solid var(--md-sys-color-outline-variant); padding-top: 12px; margin-top: 6px; display: flex; flex-direction: column; gap: 6px;">
                <span style="font-weight: 800; color: var(--md-sys-color-on-surface); font-size: 14px; letter-spacing: -0.2px;">Invoice Details</span>
                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                    <span style="color: var(--md-sys-color-on-surface-variant); font-weight: 500;">Invoice Number:</span>
                    <strong style="color: var(--md-sys-color-on-surface);">${details.invoice_number}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                    <span style="color: var(--md-sys-color-on-surface-variant); font-weight: 500;">Tracking ID:</span>
                    <strong style="color: var(--md-sys-color-on-surface);">${details.tracking_number}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                    <span style="color: var(--md-sys-color-on-surface-variant); font-weight: 500;">Payment Method:</span>
                    <strong style="color: var(--md-sys-color-on-surface);">${details.payment_method} (${details.payment ? details.payment.payment_status : 'Success'})</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                    <span style="color: var(--md-sys-color-on-surface-variant); font-weight: 500;">Transaction ID:</span>
                    <strong style="color: var(--md-sys-color-on-surface); font-family: monospace;">${details.payment ? details.payment.transaction_id : 'N/A'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                    <span style="color: var(--md-sys-color-on-surface-variant); font-weight: 500;">Order Date:</span>
                    <strong style="color: var(--md-sys-color-on-surface);">${formattedDate}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; margin-top: 8px; border-top: 1px dashed var(--md-sys-color-outline-variant); padding-top: 8px; color: var(--md-sys-color-primary);">
                    <span>Amount Paid:</span>
                    <span>₹${details.total_amount.toLocaleString('en-IN')}</span>
                </div>
            </div>
        `;

        const modal = document.getElementById('order-details-modal');
        if (modal) modal.style.display = 'flex';

    } catch (e) {
        alert(e.message);
    }
}

function closeOrderDetailsModal() {
    const modal = document.getElementById('order-details-modal');
    if (modal) modal.style.display = 'none';
}

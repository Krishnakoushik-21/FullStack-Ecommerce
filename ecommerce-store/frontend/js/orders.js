document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('orders-container');
    if (!container) return;

    try {
        const orders = await apiFetch('/orders/myorders');
        
        if (orders.length === 0) {
            container.innerHTML = '<p>You have no orders yet.</p>';
            return;
        }

        container.innerHTML = '';

        orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString();
            
            const itemsHtml = order.items.map(item => `
                <div class="order-item">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <img src="${item.image_url || 'https://via.placeholder.com/60'}" alt="${item.product_name}">
                        <div>
                            <div style="font-weight: 600;">${item.product_name || 'Product ' + item.product_id}</div>
                            <div style="color: var(--text-muted); font-size: 0.875rem;">Qty: ${item.quantity} x $${item.price.toFixed(2)}</div>
                        </div>
                    </div>
                    <div style="font-weight: 600;">$${(item.quantity * item.price).toFixed(2)}</div>
                </div>
            `).join('');

            const orderCard = document.createElement('div');
            orderCard.className = 'order-card';
            orderCard.innerHTML = `
                <div class="order-header">
                    <div>
                        <div style="font-weight: 700; margin-bottom: 0.25rem;">Order #${order.id}</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted);">Placed on ${date}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary);">$${order.total_price.toFixed(2)}</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted);">${order.payment_method}</div>
                    </div>
                </div>
                <div class="order-item-list">
                    ${itemsHtml}
                </div>
            `;
            
            container.appendChild(orderCard);
        });

    } catch (error) {
        container.innerHTML = '<p>Error loading orders.</p>';
    }
});

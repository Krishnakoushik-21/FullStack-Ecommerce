document.addEventListener('DOMContentLoaded', () => {
    
    function renderCart() {
        const cart = getCart();
        const tbody = document.getElementById('cart-body');
        const clearBtn = document.getElementById('clear-cart');
        const checkoutBtn = document.getElementById('checkout-btn');
        const summaryItems = document.getElementById('summary-items');
        const summaryTotal = document.getElementById('summary-total');
        
        if (!tbody) return;
        tbody.innerHTML = '';

        if (cart.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 2rem;">Your cart is empty. <a href="index.html" style="color: var(--primary);">Shop now</a></td></tr>';
            clearBtn.classList.add('d-none');
            checkoutBtn.classList.add('d-none');
            summaryItems.textContent = '0';
            summaryTotal.textContent = '$0.00';
            return;
        }

        clearBtn.classList.remove('d-none');
        checkoutBtn.classList.remove('d-none');

        let totalItems = 0;
        let totalPrice = 0;

        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            totalItems += item.quantity;
            totalPrice += itemTotal;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <img src="${item.image_url || 'https://via.placeholder.com/50'}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                        <span style="font-weight: 500;">${item.name}</span>
                    </div>
                </td>
                <td>$${item.price.toFixed(2)}</td>
                <td>
                    <div class="quantity-control">
                        <button class="quantity-btn dec" data-index="${index}">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn inc" data-index="${index}">+</button>
                    </div>
                </td>
                <td style="font-weight: 600;">$${itemTotal.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger remove-item" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" data-index="${index}">Remove</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        summaryItems.textContent = totalItems;
        summaryTotal.textContent = '$' + totalPrice.toFixed(2);

        // Bind events
        document.querySelectorAll('.inc').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                changeQuantity(idx, 1);
            });
        });

        document.querySelectorAll('.dec').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                changeQuantity(idx, -1);
            });
        });

        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                removeItem(idx);
            });
        });
    }

    function changeQuantity(index, delta) {
        const cart = getCart();
        const item = cart[index];
        
        const newQty = item.quantity + delta;
        
        if (newQty <= 0) {
            cart.splice(index, 1);
        } else if (newQty > item.stock) {
            showToast('Cannot add more than available stock', 'error');
            return;
        } else {
            item.quantity = newQty;
        }
        
        saveCart(cart);
        renderCart();
    }

    function removeItem(index) {
        const cart = getCart();
        cart.splice(index, 1);
        saveCart(cart);
        renderCart();
        showToast('Item removed from cart');
    }

    const clearCartBtn = document.getElementById('clear-cart');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
            saveCart([]);
            renderCart();
            showToast('Cart cleared');
        });
    }

    // Init
    if (document.getElementById('cart-table')) {
        renderCart();
    }
});

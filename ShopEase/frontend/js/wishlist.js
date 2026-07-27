// Wishlist Controller
window.initWishlist = async () => {
    const token = localStorage.getItem('shopease_token');
    if (!token) {
        app.navigate('login');
        return;
    }

    try {
        const wishlistItems = await ApiService.get('/wishlist');
        renderWishlist(wishlistItems);
    } catch (error) {
        console.error("Error loading wishlist:", error);
    }
};

function renderWishlist(items) {
    const emptyState = document.getElementById('wishlist-empty-state');
    const container = document.getElementById('wishlist-items-container');

    if (!emptyState || !container) return;

    if (items.length === 0) {
        emptyState.style.display = 'flex';
        container.innerHTML = '';
        return;
    }

    emptyState.style.display = 'none';

    container.innerHTML = items.map(item => `
        <div style="display: flex; gap: 12px; padding: 12px; border-radius: 16px; border: 1px solid var(--md-sys-color-outline-variant); background-color: var(--md-sys-color-surface); align-items: center; position: relative;">
            <img src="${item.image_url}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 12px; background-color: var(--md-sys-color-surface-variant);" onclick="viewProductDetails(${item.product_id})">
            
            <div style="flex: 1; display: flex; flex-direction: column;">
                <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--md-sys-color-on-surface-variant);">${item.brand}</span>
                <span style="font-size: 13px; font-weight: 700; color: var(--md-sys-color-on-surface); margin: 2px 0 4px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" onclick="viewProductDetails(${item.product_id})">${item.name}</span>
                
                <div style="display: flex; align-items: baseline; gap: 6px;">
                    <span style="font-size: 14px; font-weight: bold; color: var(--md-sys-color-on-surface);">₹${item.price.toLocaleString('en-IN')}</span>
                    <span style="font-size: 11px; text-decoration: line-through; color: var(--md-sys-color-on-surface-variant);">₹${item.old_price.toLocaleString('en-IN')}</span>
                </div>

                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button class="btn btn-filled" onclick="moveWishlistItemToCart(${item.product_id})" style="padding: 6px 12px; font-size: 11px; border-radius: 12px;">Move to Cart</button>
                    <button class="btn btn-outlined" onclick="removeWishlistItem(${item.product_id})" style="padding: 6px 12px; font-size: 11px; border-radius: 12px; border-color: var(--md-sys-color-error); color: var(--md-sys-color-error);">Remove</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function removeWishlistItem(productId) {
    try {
        await ApiService.post('/wishlist/remove', { productId });
        initWishlist(); // reload list
    } catch (e) {
        console.error(e);
    }
}

async function moveWishlistItemToCart(productId) {
    try {
        // Add to cart
        await ApiService.post('/cart/add', { productId, quantity: 1 });
        // Remove from wishlist
        await ApiService.post('/wishlist/remove', { productId });
        alert("Item moved to cart successfully!");
        initWishlist(); // reload list
    } catch (e) {
        console.error(e);
    }
}

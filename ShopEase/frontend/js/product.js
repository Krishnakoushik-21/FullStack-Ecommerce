// Product Details Controller
let currentProduct = null;

window.initProductDetails = async () => {
    const prodId = window.selectedProductId;
    if (!prodId) {
        console.error("No product ID selected!");
        app.navigate('home');
        return;
    }

    try {
        // Fetch detailed product info (includes reviews in backend!)
        const p = await ApiService.get(`/products/${prodId}`);
        currentProduct = p;

        // Render fields
        document.getElementById('product-header-title').textContent = p.name;
        document.getElementById('detail-image').src = p.image_url;
        document.getElementById('detail-image').alt = p.name;
        document.getElementById('detail-brand').textContent = p.brand;
        document.getElementById('detail-name').textContent = p.name;
        document.getElementById('detail-rating-val').textContent = p.rating;
        document.getElementById('detail-review-count').textContent = `${p.review_count} reviews`;
        document.getElementById('detail-price').textContent = `₹${p.price.toLocaleString('en-IN')}`;
        document.getElementById('detail-old-price').textContent = `₹${p.old_price.toLocaleString('en-IN')}`;
        document.getElementById('detail-discount').textContent = `${p.discount}% Off`;
        document.getElementById('detail-delivery').textContent = p.delivery_time;
        document.getElementById('detail-return').textContent = p.return_policy;
        document.getElementById('detail-warranty').textContent = p.warranty;

        // Stock status
        const stockEl = document.getElementById('detail-stock');
        if (p.stock > 0) {
            stockEl.textContent = `In Stock (Only ${p.stock} left)`;
            stockEl.style.color = 'var(--md-sys-color-primary)';
        } else {
            stockEl.textContent = 'Out of Stock';
            stockEl.style.color = 'var(--md-sys-color-error)';
        }

        document.getElementById('detail-description').textContent = p.description;

        // Wishlist heart active check
        checkIfWished(prodId);

        // Render Specs table
        let specs = {};
        try {
            specs = JSON.parse(p.specifications || '{}');
        } catch (e) {
            console.error("Specs parsing failed:", e);
        }
        renderSpecsTable(specs);

        // Render Bundle
        document.getElementById('bundle-img-1').src = p.image_url;
        // Combo accessory price is static / calculated
        const accessoryPrice = 999; 
        document.getElementById('bundle-combo-price').textContent = `₹${(p.price + accessoryPrice).toLocaleString('en-IN')}`;

        // Render Reviews
        renderReviewsList(p.reviews || []);
        updateReviewsBreakdown(p.rating, p.reviews || []);

        // Load and Render Related Products
        loadRelatedProducts(p.category, p.id);

    } catch (error) {
        console.error("Error loading product details:", error);
    }
};

function renderSpecsTable(specs) {
    const table = document.getElementById('detail-specs-table');
    if (!table) return;

    const keys = Object.keys(specs);
    if (keys.length === 0) {
        table.innerHTML = '<tr><td style="padding: 12px 16px; color: var(--md-sys-color-on-surface-variant);">No technical specifications available.</td></tr>';
        return;
    }

    table.className = "spec-table";
    table.innerHTML = keys.map(key => `
        <tr>
            <td>${key}</td>
            <td>${specs[key]}</td>
        </tr>
    `).join('');
}

function renderReviewsList(reviews) {
    const container = document.getElementById('reviews-list-container');
    if (!container) return;

    if (reviews.length === 0) {
        container.innerHTML = '<p style="color: var(--md-sys-color-on-surface-variant); font-size: 13px;">No reviews yet. Be the first to review!</p>';
        return;
    }

    container.innerHTML = reviews.map(r => {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= r.rating) {
                stars += '<i class="material-icons" style="font-size: 14px; color: #D97706;">star</i>';
            } else {
                stars += '<i class="material-icons" style="font-size: 14px; color: var(--md-sys-color-outline-variant);">star_border</i>';
            }
        }

        return `
            <div style="border-bottom: 1px solid var(--md-sys-color-outline-variant); padding-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 700; font-size: 13px; color: var(--md-sys-color-on-surface);">${r.reviewer_name}</span>
                    <span style="font-size: 11px; color: var(--md-sys-color-on-surface-variant);">${r.date || 'Recent'}</span>
                </div>
                <div style="margin: 4px 0;">${stars}</div>
                <p style="font-size: 12px; color: var(--md-sys-color-on-surface-variant); line-height: 1.4; margin: 4px 0 6px 0;">${r.review_text}</p>
                <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--md-sys-color-on-surface-variant); cursor: pointer;" onclick="voteHelpful(event, ${r.id})">
                    <i class="material-icons" style="font-size: 14px;">thumb_up_off_alt</i>
                    <span>Helpful (${r.helpful_count || 0})</span>
                </div>
            </div>
        `;
    }).join('');
}

function updateReviewsBreakdown(avgRating, reviews) {
    const avgEl = document.getElementById('breakdown-avg');
    const countEl = document.getElementById('breakdown-count');
    if (avgEl) avgEl.textContent = avgRating;
    if (countEl) countEl.textContent = `${reviews.length} reviews`;
}

async function loadRelatedProducts(category, currentProductId) {
    try {
        const products = await ApiService.get(`/products?category=${encodeURIComponent(category)}`);
        const filtered = products.filter(p => p.id !== currentProductId).slice(0, 8); // top 8 related

        const container = document.getElementById('related-products-container');
        if (!container) return;

        if (filtered.length === 0) {
            container.innerHTML = '<p style="font-size: 12px; color: var(--md-sys-color-on-surface-variant);">No related products found.</p>';
            return;
        }

        container.innerHTML = filtered.map(p => `
            <div class="product-card" style="min-width: 130px; width: 130px;" onclick="viewProductDetails(${p.id})">
                <div class="product-card-img-wrapper">
                    <img src="${p.image_url}" alt="${p.name}">
                </div>
                <div class="product-card-info" style="padding: 6px;">
                    <span class="product-card-brand" style="font-size: 9px;">${p.brand}</span>
                    <span class="product-card-name" style="height: 28px; font-size: 10px; margin-bottom: 2px;">${p.name}</span>
                    <span class="product-card-price" style="font-size: 12px;">₹${p.price.toLocaleString('en-IN')}</span>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error("Error loading related products:", e);
    }
}

async function checkIfWished(productId) {
    const token = localStorage.getItem('shopease_token');
    if (!token) return;

    try {
        const wishlist = await ApiService.get('/wishlist');
        const isWished = wishlist.some(item => item.product_id === productId);
        const heartIcon = document.querySelector('#product-heart-btn i');
        if (heartIcon) {
            if (isWished) {
                heartIcon.textContent = 'favorite';
                heartIcon.parentElement.classList.add('wished');
            } else {
                heartIcon.textContent = 'favorite_border';
                heartIcon.parentElement.classList.remove('wished');
            }
        }
    } catch (e) {
        console.error("Error checking wishlist state:", e);
    }
}

async function toggleDetailWishlist() {
    if (!currentProduct) return;
    const token = localStorage.getItem('shopease_token');
    if (!token) {
        alert("Please login to add items to wishlist");
        app.navigate('login');
        return;
    }

    try {
        const btn = document.getElementById('product-heart-btn');
        const heartIcon = btn.querySelector('i');
        const isWished = heartIcon.textContent === 'favorite';
        
        if (isWished) {
            await ApiService.post('/wishlist/remove', { productId: currentProduct.id });
            heartIcon.textContent = 'favorite_border';
            btn.classList.remove('wished');
        } else {
            await ApiService.post('/wishlist/add', { productId: currentProduct.id });
            heartIcon.textContent = 'favorite';
            btn.classList.add('wished');
        }
    } catch (error) {
        console.error("Error toggling detail wishlist:", error);
    }
}

function shareProduct() {
    if (navigator.share && currentProduct) {
        navigator.share({
            title: currentProduct.name,
            text: `Check out the ${currentProduct.name} on ShopEase!`,
            url: window.location.href
        }).catch(err => console.log(err));
    } else {
        alert("Product link copied to clipboard!");
    }
}

async function addSingleToCart() {
    if (!currentProduct) return;
    const token = localStorage.getItem('shopease_token');
    if (!token) {
        alert("Please login to add items to cart");
        app.navigate('login');
        return;
    }

    try {
        await ApiService.post('/cart/add', { productId: currentProduct.id, quantity: 1 });
        alert(`${currentProduct.name} added to cart!`);
    } catch (error) {
        console.error("Error adding to cart:", error);
    }
}

async function addBundleToCart() {
    if (!currentProduct) return;
    const token = localStorage.getItem('shopease_token');
    if (!token) {
        alert("Please login to add items to cart");
        app.navigate('login');
        return;
    }

    try {
        // Add current product
        await ApiService.post('/cart/add', { productId: currentProduct.id, quantity: 1 });
        // Add Accessory (we'll just use Product ID 21 as a generic accessory / SanDisk SD card)
        await ApiService.post('/cart/add', { productId: 25, quantity: 1 });
        alert(`Frequently bought together combo added to cart!`);
        app.navigate('cart');
    } catch (error) {
        console.error("Error adding bundle to cart:", error);
    }
}

async function buyNow() {
    if (!currentProduct) return;
    const token = localStorage.getItem('shopease_token');
    if (!token) {
        alert("Please login to checkout");
        app.navigate('login');
        return;
    }

    try {
        // Add to cart first, then navigate to checkout
        await ApiService.post('/cart/add', { productId: currentProduct.id, quantity: 1 });
        app.navigate('cart');
    } catch (e) {
        console.error(e);
    }
}

async function voteHelpful(event, reviewId) {
    event.stopPropagation();
    // Simulate helpful increment locally for realistic feedback
    const textEl = event.currentTarget.querySelector('span');
    const match = textEl.textContent.match(/\d+/);
    if (match) {
        const count = parseInt(match[0]) + 1;
        textEl.textContent = `Helpful (${count})`;
        event.currentTarget.style.pointerEvents = 'none';
        event.currentTarget.style.opacity = '0.7';
    }
}

// Home page logic and controller
let carouselInterval = null;

window.loadHomeData = async () => {
    try {
        // Show email verification banner if user is not verified
        checkEmailVerificationBanner();

        initCarousel();

        // Fetch products from backend
        const products = await ApiService.get('/products');
        
        // 1. Deals of the Day (high discounts)
        const deals = products.filter(p => p.discount > 15).slice(0, 10);
        renderDeals(deals);

        // 2. Continue Shopping (index offset to simulate user history)
        const continueShopping = products.slice(10, 18);
        renderContinueShopping(continueShopping);

        // 3. Trending Now (highly rated)
        const trending = products.filter(p => p.rating >= 4.6).slice(0, 6);
        renderTrending(trending);

        // 4. Recommended (random slice)
        const recommended = products.slice(22, 28);
        renderRecommended(recommended);

        // 5. Featured Products
        const featured = products.slice(0, 16); 
        renderProductsGrid(featured);
        
    } catch (error) {
        console.error("Error loading home page content:", error);
    }
};

function initCarousel() {
    const track = document.getElementById('banner-track');
    const dots = document.querySelectorAll('.carousel-dot');
    if (!track || dots.length === 0) return;

    let currentSlide = 0;
    
    // Clear any previous interval to prevent memory leaks or speed-ups
    if (carouselInterval) clearInterval(carouselInterval);

    carouselInterval = setInterval(() => {
        currentSlide = (currentSlide + 1) % 4;
        track.style.transform = `translateX(-${currentSlide * 25}%)`;
        
        dots.forEach((dot, idx) => {
            if (idx === currentSlide) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }, 5000);
}

function renderDeals(deals) {
    const container = document.getElementById('deals-container');
    if (!container) return;

    if (deals.length === 0) {
        container.innerHTML = '<p style="padding: 16px; font-size: 14px; color: var(--md-sys-color-on-surface-variant);">No deals currently active</p>';
        return;
    }

    container.innerHTML = deals.map(p => `
        <div class="product-card" style="min-width: 156px; width: 156px;" onclick="viewProductDetails(${p.id})">
            <div class="product-card-img-wrapper">
                <img src="${p.image_url}" alt="${p.name}">
                <div class="wishlist-overlay-btn" onclick="toggleWishlist(event, ${p.id})">
                    <i class="material-icons" style="font-size: 18px;">favorite_border</i>
                </div>
            </div>
            <div class="product-card-info" style="padding: 12px;">
                <span class="product-card-brand">${p.brand}</span>
                <span class="product-card-name" style="height: 38px; font-size: 13px; font-weight: 600;">${p.name}</span>
                <div class="product-card-price-row">
                    <span class="product-card-price" style="font-size: 15px;">₹${p.price.toLocaleString('en-IN')}</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
                    <span class="product-card-discount" style="font-size: 11px;">${p.discount}% OFF</span>
                    <span class="product-card-rating" style="margin: 0; font-size: 10px; padding: 2px 6px;"><i class="material-icons" style="font-size: 10px; vertical-align: middle;">star</i> ${p.rating}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderContinueShopping(products) {
    const container = document.getElementById('continue-shopping-container');
    if (!container) return;

    container.innerHTML = products.map(p => `
        <div class="glass-card" style="display: flex; align-items: center; gap: 12px; min-width: 240px; padding: 12px; cursor: pointer; border-radius: 20px;" onclick="viewProductDetails(${p.id})">
            <img src="${p.image_url}" alt="${p.name}" style="width: 56px; height: 56px; border-radius: 12px; object-fit: cover;">
            <div style="flex: 1; min-width: 0;">
                <span style="font-size: 10px; text-transform: uppercase; font-weight: 750; color: var(--md-sys-color-on-surface-variant);">${p.brand}</span>
                <h4 style="font-size: 13px; font-weight: 650; color: var(--md-sys-color-on-surface); margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</h4>
                <span style="font-size: 13px; font-weight: 800; color: var(--md-sys-color-primary);">₹${p.price.toLocaleString('en-IN')}</span>
            </div>
        </div>
    `).join('');
}

function renderTrending(products) {
    const container = document.getElementById('trending-grid');
    if (!container) return;
    renderGridItems(container, products);
}

function renderRecommended(products) {
    const container = document.getElementById('recommended-grid');
    if (!container) return;
    renderGridItems(container, products);
}

function renderProductsGrid(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    renderGridItems(grid, products);
}

// Reusable card template generator
function renderGridItems(container, products) {
    if (products.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 32px; color: var(--md-sys-color-on-surface-variant);">No products found</p>';
        return;
    }

    container.innerHTML = products.map(p => `
        <div class="product-card" onclick="viewProductDetails(${p.id})">
            <div class="product-card-img-wrapper">
                <img src="${p.image_url}" alt="${p.name}">
                <div class="wishlist-overlay-btn" onclick="toggleWishlist(event, ${p.id})">
                    <i class="material-icons" style="font-size: 18px;">favorite_border</i>
                </div>
            </div>
            <div class="product-card-info">
                <span class="product-card-brand">${p.brand}</span>
                <span class="product-card-name">${p.name}</span>
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                    <span class="product-card-rating" style="margin: 0;"><i class="material-icons" style="font-size: 11px; vertical-align: middle;">star</i> ${p.rating}</span>
                    <span style="font-size: 11px; font-weight: 500; color: var(--md-sys-color-on-surface-variant);">(${p.review_count})</span>
                </div>
                <div class="product-card-price-row">
                    <span class="product-card-price">₹${p.price.toLocaleString('en-IN')}</span>
                    <span class="product-card-old-price">₹${p.old_price.toLocaleString('en-IN')}</span>
                    <span class="product-card-discount">${p.discount}% Off</span>
                </div>
            </div>
        </div>
    `).join('');
}

function filterCategory(categoryName) {
    console.log("Filtering category:", categoryName);
    window.selectedCategory = categoryName;
    app.navigate('categories');
}

function handleSearch(searchQuery) {
    if (!searchQuery.trim()) return;
    console.log("Searching for:", searchQuery);
    window.searchQuery = searchQuery;
    app.navigate('categories');
}

function filterBrand(brandName) {
    window.selectedBrand = brandName;
    app.navigate('categories');
}

function viewProductDetails(productId) {
    window.selectedProductId = productId;
    app.navigate('product');
}

async function toggleWishlist(event, productId) {
    event.stopPropagation();
    const token = localStorage.getItem('shopease_token');
    if (!token) {
        alert("Please login to add items to wishlist");
        app.navigate('login');
        return;
    }

    try {
        const heartIcon = event.currentTarget.querySelector('i');
        const isWished = heartIcon.textContent === 'favorite';
        
        if (isWished) {
            await ApiService.post('/wishlist/remove', { productId });
            heartIcon.textContent = 'favorite_border';
            heartIcon.parentElement.classList.remove('wished');
        } else {
            await ApiService.post('/wishlist/add', { productId });
            heartIcon.textContent = 'favorite';
            heartIcon.parentElement.classList.add('wished');
        }
    } catch (error) {
        console.error("Error toggling wishlist:", error);
    }
}

// ─── Email Verification Banner ────────────────────────────────────────────────

function checkEmailVerificationBanner() {
    try {
        const user   = JSON.parse(localStorage.getItem('shopease_user') || 'null');
        const banner = document.getElementById('email-verify-banner');
        if (!banner) return;
        // Show banner only for logged-in, unverified users
        if (user && user.email_verified === 0) {
            banner.style.display = 'block';
        } else {
            banner.style.display = 'none';
        }
    } catch (e) {
        // Ignore parse errors
    }
}

async function resendVerificationEmail(btn) {
    const original = btn.textContent;
    btn.disabled   = true;
    btn.textContent = 'Sending…';

    try {
        await ApiService.post('/auth/resend-verification', {});
        btn.textContent = '✅ Sent!';
        setTimeout(() => {
            btn.disabled    = false;
            btn.textContent = original;
        }, 4000);
    } catch (err) {
        btn.textContent = err.message || 'Failed';
        setTimeout(() => {
            btn.disabled    = false;
            btn.textContent = original;
        }, 3000);
    }
}

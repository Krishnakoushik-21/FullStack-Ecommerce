// Categories Page controller
let allFetchedProducts = [];
let currentCategory = 'All';

window.initCategories = async () => {
    // Check if redirect parameters were set by home screen
    if (window.selectedCategory) {
        currentCategory = window.selectedCategory;
        window.selectedCategory = null; // Consume
    } else {
        currentCategory = 'All';
    }

    const searchInput = document.getElementById('category-search-input');
    if (window.searchQuery) {
        if (searchInput) searchInput.value = window.searchQuery;
        currentCategory = 'All'; // search is global across categories
    } else {
        if (searchInput) searchInput.value = '';
    }

    // Update active tab UI styling
    updateActiveTabUI();

    await loadCategoryProducts();
};

function updateActiveTabUI() {
    const tabs = document.querySelectorAll('#category-tabs .tab-btn');
    tabs.forEach(tab => {
        if (tab.textContent.trim() === currentCategory || (currentCategory === 'All' && tab.textContent.trim() === 'All')) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

async function loadCategoryProducts() {
    try {
        const searchVal = document.getElementById('category-search-input')?.value || '';
        window.searchQuery = null; // Consume global search state

        let url = '/products';
        const params = [];
        if (currentCategory !== 'All') {
            params.push(`category=${encodeURIComponent(currentCategory)}`);
        }
        if (searchVal.trim()) {
            params.push(`search=${encodeURIComponent(searchVal)}`);
        }
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }

        allFetchedProducts = await ApiService.get(url);
        applySorting();
    } catch (error) {
        console.error("Error loading category products:", error);
    }
}

function selectCategoryTab(category) {
    currentCategory = category;
    
    // Clear search input on tab change to feel natural
    const searchInput = document.getElementById('category-search-input');
    if (searchInput) searchInput.value = '';

    updateActiveTabUI();
    loadCategoryProducts();
}

function triggerCategorySearch(query) {
    loadCategoryProducts();
}

function applySorting() {
    const sortVal = document.getElementById('sort-select')?.value || 'relevance';
    let sorted = [...allFetchedProducts];

    if (sortVal === 'low-high') {
        sorted.sort((a, b) => a.price - b.price);
    } else if (sortVal === 'high-low') {
        sorted.sort((a, b) => b.price - a.price);
    } else if (sortVal === 'rating') {
        sorted.sort((a, b) => b.rating - a.rating);
    }

    // Render results
    renderCategoryGrid(sorted);
    
    const countEl = document.getElementById('results-count');
    if (countEl) {
        countEl.textContent = `${sorted.length} Products Found`;
    }
}

function renderCategoryGrid(products) {
    const grid = document.getElementById('category-products-grid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px 16px;">
                <i class="material-icons" style="font-size: 64px; color: var(--md-sys-color-outline); margin-bottom: 12px;">search_off</i>
                <h4 style="font-size: 16px; font-weight: 700; color: var(--md-sys-color-on-surface);">No items found</h4>
                <p style="font-size: 13px; color: var(--md-sys-color-on-surface-variant); margin-top: 4px;">Try checking spelling or adjusting filters</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map(p => `
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
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                    <span class="product-card-rating" style="margin: 0;"><i class="material-icons" style="font-size: 12px; vertical-align: middle;">star</i> ${p.rating}</span>
                    <span style="font-size: 10px; color: var(--md-sys-color-on-surface-variant);">(${p.review_count})</span>
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

// Global hook in app.js
window.initCategoriesController = () => {
    window.initCategories();
};

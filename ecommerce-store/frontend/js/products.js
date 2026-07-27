document.addEventListener('DOMContentLoaded', () => {
    
    let allProducts = [];

    // Fetch and render products
    async function loadProducts() {
        try {
            // Check if server is running by attempting to fetch, else use mock data for UI demo
            try {
                allProducts = await apiFetch('/products');
                
                // If the db is empty, inject some mock data so the UI looks like the screenshot
                if (allProducts.length === 0) {
                    allProducts = [
                        { id: 1, name: 'SonicPro Wireless', price: 299.00, category: 'Audio & Sound', stock: 10, image_url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=400&q=80', badge: 'NEW', badgeType: 'badge-new' },
                        { id: 2, name: 'Halo Ceramic Lamp', price: 85.00, category: 'Lighting', stock: 5, image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=400&q=80' },
                        { id: 3, name: 'Horizon GT Smartwatch', price: 450.00, category: 'Wearables', stock: 12, image_url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=400&q=80' },
                        { id: 4, name: 'Essence Glass Brewer', price: 88.00, category: 'Kitchen', stock: 8, image_url: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?auto=format&fit=crop&w=400&q=80', badge: '20% OFF', badgeType: 'badge-sale' }
                    ];
                }
            } catch (err) {
                console.log("Backend not reachable, using mock data for UI demonstration.");
                allProducts = [
                    { id: 1, name: 'SonicPro Wireless', price: 299.00, category: 'Audio & Sound', stock: 10, image_url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=400&q=80', badge: 'NEW', badgeType: 'badge-new' },
                    { id: 2, name: 'Halo Ceramic Lamp', price: 85.00, category: 'Lighting', stock: 5, image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=400&q=80' },
                    { id: 3, name: 'Horizon GT Smartwatch', price: 450.00, category: 'Wearables', stock: 12, image_url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=400&q=80' },
                    { id: 4, name: 'Essence Glass Brewer', price: 88.00, category: 'Kitchen', stock: 8, image_url: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?auto=format&fit=crop&w=400&q=80', badge: '20% OFF', badgeType: 'badge-sale' }
                ];
            }

            renderProducts(allProducts);
            populateCategories(allProducts);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    function renderProducts(products) {
        const grid = document.getElementById('products-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (products.length === 0) {
            grid.innerHTML = '<p class="text-center" style="grid-column: 1 / -1; padding: 3rem;">No products found.</p>';
            return;
        }

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            let badgeHtml = '';
            if (product.badge) {
                badgeHtml = `<div class="badge ${product.badgeType}">${product.badge}</div>`;
            }

            card.innerHTML = `
                <a href="product.html?id=${product.id}" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; flex: 1;">
                    <div class="product-img-wrapper">
                        ${badgeHtml}
                        <button class="favorite-btn" onclick="event.preventDefault(); this.style.color = '#EF4444';">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </button>
                        <img src="${product.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${product.name}" class="product-img">
                    </div>
                    <div class="product-category">${product.category || 'Product'}</div>
                    <div class="product-title">${product.name}</div>
                </a>
                <div class="product-bottom">
                    <div class="product-price">$${product.price.toFixed(2)}</div>
                    <button class="add-btn-circular add-to-cart-btn" data-id="${product.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="pointer-events: none;">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        // Attach event listeners for Add to Cart
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const product = allProducts.find(p => p.id === id);
                addToCart(product);
            });
        });
    }

    function populateCategories(products) {
        const tabsContainer = document.getElementById('category-filter-tabs');
        if (!tabsContainer) return;
        
        const categories = [...new Set(products.map(p => p.category))].filter(Boolean);
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn';
            btn.setAttribute('data-category', cat);
            btn.textContent = cat;
            tabsContainer.appendChild(btn);
        });

        // Add filter events
        tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const category = e.target.getAttribute('data-category');
                const search = document.getElementById('search-bar')?.value.toLowerCase() || '';
                
                applyFilters(search, category);
            });
        });
    }

    // Search filter
    const searchBar = document.getElementById('search-bar');

    function applyFilters(search, category) {
        const filtered = allProducts.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(search);
            const matchCategory = category ? p.category === category : true;
            return matchSearch && matchCategory;
        });
        renderProducts(filtered);
    }

    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            const search = e.target.value.toLowerCase();
            const activeTab = document.querySelector('.tab-btn.active');
            const category = activeTab ? activeTab.getAttribute('data-category') : '';
            applyFilters(search, category);
        });
    }

    function addToCart(product) {
        if(product.stock <= 0) {
            showToast('Product is out of stock', 'error');
            return;
        }

        const cart = getCart();
        const existing = cart.find(item => item.product_id === product.id);

        if (existing) {
            if(existing.quantity < product.stock) {
                existing.quantity += 1;
                showToast('Quantity increased in cart', 'success');
            } else {
                showToast('Not enough stock available', 'error');
                return;
            }
        } else {
            cart.push({
                product_id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                stock: product.stock,
                quantity: 1
            });
            showToast('Added to cart', 'success');
        }

        saveCart(cart);
    }

    // Initialization
    if (document.getElementById('products-grid')) {
        loadProducts();
    }
});

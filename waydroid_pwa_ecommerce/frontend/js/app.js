class App {
    constructor() {
        this.currentView = 'splash';
        this.history = [];
        this.cart = [];
        this.favorites = [];
        this.products = [];
        this.currentProduct = null;

        this.init();
    }

    async init() {
        // Load local storage data
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        this.updateCartBadge();

        // Bind events
        this.bindEvents();

        // Splash screen delay
        setTimeout(async () => {
            if (AuthService.isAuthenticated()) {
                await this.loadHomeData();
                this.navigate('home', 'fade');
            } else {
                this.navigate('login', 'fade');
            }
        }, 1500);
    }

    bindEvents() {
        // Auth
        document.getElementById('btn-login').addEventListener('click', async () => {
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            if(email && pass) {
                try {
                    await AuthService.login(email, pass);
                    await this.loadHomeData();
                    this.navigate('home');
                } catch(e){}
            }
        });

        document.getElementById('btn-register').addEventListener('click', async () => {
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;
            if(name && email && pass) {
                try {
                    await AuthService.register(name, email, pass);
                    await this.loadHomeData();
                    this.navigate('home');
                } catch(e){}
            }
        });

        // Add to cart
        document.getElementById('btn-add-to-cart').addEventListener('click', () => {
            if(this.currentProduct) {
                this.addToCart(this.currentProduct);
                alert('Added to cart!');
            }
        });

        // Checkout
        document.getElementById('btn-place-order').addEventListener('click', () => this.placeOrder());
    }

    navigate(viewId, transition = 'slide-left') {
        if(viewId === this.currentView) return;

        const currentEl = document.getElementById(`view-${this.currentView}`);
        const nextEl = document.getElementById(`view-${viewId}`);

        if(!nextEl) return;

        this.history.push(this.currentView);
        
        // Prepare Next View
        nextEl.style.display = nextEl.classList.contains('flex-view') ? 'flex' : 'block';
        nextEl.style.animationName = 'none'; // reset
        void nextEl.offsetWidth; // trigger reflow

        if (transition === 'fade') {
            nextEl.style.animationName = 'fadeIn';
            if(currentEl) currentEl.style.animationName = 'fadeOut';
        } else {
            nextEl.style.animationName = 'slideInRight';
            if(currentEl) currentEl.style.animationName = 'slideOutLeft';
        }

        setTimeout(() => {
            if(currentEl) currentEl.style.display = 'none';
            nextEl.className = 'view active';
            if(currentEl) currentEl.className = 'view';
        }, 300); // match CSS duration

        this.currentView = viewId;
        this.updateNav(viewId);
        this.onViewEnter(viewId);
    }

    goBack() {
        if(this.history.length === 0) return;
        const prevView = this.history.pop();
        
        const currentEl = document.getElementById(`view-${this.currentView}`);
        const prevEl = document.getElementById(`view-${prevView}`);

        prevEl.style.display = prevEl.classList.contains('flex-view') ? 'flex' : 'block';
        prevEl.style.animationName = 'none';
        void prevEl.offsetWidth;

        prevEl.style.animationName = 'slideInLeft';
        currentEl.style.animationName = 'slideOutRight';

        setTimeout(() => {
            currentEl.style.display = 'none';
            prevEl.className = 'view active';
            currentEl.className = 'view';
        }, 300);

        this.currentView = prevView;
        this.updateNav(prevView);
        this.onViewEnter(prevView);
    }

    updateNav(viewId) {
        const noNavViews = ['splash', 'login', 'register', 'product', 'checkout', 'success'];
        const nav = document.getElementById('main-nav');
        if (noNavViews.includes(viewId)) {
            nav.style.display = 'none';
        } else {
            nav.style.display = 'flex';
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            const activeNav = document.querySelector(`.nav-item[onclick*="'${viewId}'"]`);
            if(activeNav) activeNav.classList.add('active');
        }
    }

    onViewEnter(viewId) {
        // Route Guard
        const protectedViews = ['profile', 'orders', 'checkout'];
        if (protectedViews.includes(viewId) && !AuthService.isAuthenticated()) {
            this.navigate('login');
            return;
        }

        switch(viewId) {
            case 'cart': this.renderCart(); break;
            case 'favorites': this.renderFavorites(); break;
            case 'profile': this.renderProfile(); break;
            case 'orders': this.loadOrders(); break;
            case 'search': 
                document.getElementById('search-input').value = '';
                document.getElementById('search-results').innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--md-sys-color-on-surface-variant);">Type to search for products</div>';
                break;
        }
    }

    handleSearch(query) {
        const resultsContainer = document.getElementById('search-results');
        if (!query.trim()) {
            resultsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--md-sys-color-on-surface-variant);">Type to search for products</div>';
            return;
        }
        
        const q = query.toLowerCase();
        const results = this.products.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--md-sys-color-on-surface-variant);">No products found.</div>';
        } else {
            this.renderProducts(results, 'search-results');
        }
    }

    async loadHomeData() {
        try {
            this.products = await ApiService.get('/products');
            const categories = await ApiService.get('/products/categories/all');
            
            this.renderCategories(categories);
            this.renderProducts(this.products, 'home-products');
        } catch(e) {
            console.error("Error loading home data", e);
        }
    }

    renderCategories(cats) {
        const container = document.getElementById('home-categories');
        container.innerHTML = cats.map(c => 
            `<div class="card p-4" style="min-width: 120px; text-align: center; margin: 0; background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); font-weight: bold;">
                ${c}
            </div>`
        ).join('');
    }

    renderProducts(prods, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = prods.map(p => `
            <div class="card product-card" onclick="app.showProduct(${p.id})">
                <img src="${p.image_url}" class="product-image" loading="lazy">
                <div class="product-info">
                    <div class="product-title">${p.name}</div>
                    <div class="product-price">₹${p.price}</div>
                </div>
            </div>
        `).join('');
    }

    showProduct(id) {
        this.currentProduct = this.products.find(p => p.id === id);
        if(!this.currentProduct) return;

        document.getElementById('detail-image').src = this.currentProduct.image_url;
        document.getElementById('detail-title').innerText = this.currentProduct.name;
        document.getElementById('detail-price').innerText = `₹${this.currentProduct.price}`;
        document.getElementById('detail-desc').innerText = this.currentProduct.description;

        this.updateFavIcon();
        this.navigate('product');
    }

    // Cart Logic
    addToCart(product) {
        const item = this.cart.find(i => i.product_id === product.id);
        if(item) {
            item.quantity++;
        } else {
            this.cart.push({
                product_id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                quantity: 1
            });
        }
        this.saveCart();
    }

    removeFromCart(id) {
        this.cart = this.cart.filter(i => i.product_id !== id);
        this.saveCart();
        this.renderCart();
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.updateCartBadge();
    }

    updateCartBadge() {
        const badge = document.getElementById('cart-badge');
        const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        if (count > 0) {
            badge.innerText = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    renderCart() {
        const container = document.getElementById('cart-items');
        if(this.cart.length === 0) {
            container.innerHTML = '<div class="p-4 text-center">Your cart is empty.</div>';
            document.getElementById('cart-summary').style.display = 'none';
            return;
        }

        document.getElementById('cart-summary').style.display = 'block';
        
        container.innerHTML = this.cart.map(item => `
            <div class="card p-4" style="display:flex; gap: 12px; align-items:center;">
                <img src="${item.image_url}" style="width:60px; height:60px; border-radius:8px;">
                <div style="flex:1;">
                    <div style="font-weight:500;">${item.name}</div>
                    <div style="color: var(--md-sys-color-primary);">₹${item.price}</div>
                    <div style="font-size:12px; color:#666;">Qty: ${item.quantity}</div>
                </div>
                <button class="icon-btn" onclick="app.removeFromCart(${item.product_id})" style="color: var(--md-sys-color-error);"><i class="material-icons">delete</i></button>
            </div>
        `).join('');

        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        document.getElementById('cart-subtotal').innerText = `₹${subtotal}`;
        document.getElementById('cart-total').innerText = `₹${subtotal + 50}`;
    }

    // Checkout Logic
    async getCurrentLocation() {
        try {
            const loc = await GeolocationService.getCurrentLocation();
            document.getElementById('chk-address').value = loc.address;
            document.getElementById('chk-city').value = loc.city;
            document.getElementById('chk-pincode').value = loc.pincode;
        } catch(e) {
            alert("Could not get location");
        }
    }

    async placeOrder() {
        const address = document.getElementById('chk-address').value;
        const method = document.getElementById('chk-payment').value;
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        try {
            await ApiService.post('/orders', {
                items: this.cart,
                total_amount: subtotal + 50,
                payment_method: method,
                shipping_address: { address }
            });
            
            this.cart = [];
            this.saveCart();
            this.navigate('success', 'fade');
        } catch(e) {
            alert("Failed to place order.");
        }
    }

    // Profile & Orders
    renderProfile() {
        const user = AuthService.getUser();
        if(user) {
            document.getElementById('prof-name').innerText = user.name;
            document.getElementById('prof-email').innerText = user.email;
        }
    }

    async loadOrders() {
        try {
            const orders = await ApiService.get('/orders');
            const container = document.getElementById('orders-list');
            if(orders.length === 0) {
                container.innerHTML = 'No orders found.';
                return;
            }
            container.innerHTML = orders.map(o => `
                <div class="card p-4">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <strong>Order #${o.id}</strong>
                        <span style="color: var(--md-sys-color-primary);">${o.status}</span>
                    </div>
                    <div>Amount: ₹${o.total_amount}</div>
                    <div style="font-size:12px; color:#666; margin-top:4px;">${new Date(o.created_at).toLocaleDateString()}</div>
                </div>
            `).join('');
        } catch(e) {}
    }

    // Favorites
    toggleFavorite() {
        if(!this.currentProduct) return;
        const idx = this.favorites.findIndex(p => p.id === this.currentProduct.id);
        if(idx >= 0) {
            this.favorites.splice(idx, 1);
        } else {
            this.favorites.push(this.currentProduct);
        }
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.updateFavIcon();
    }

    updateFavIcon() {
        if(!this.currentProduct) return;
        const isFav = this.favorites.some(p => p.id === this.currentProduct.id);
        const btn = document.getElementById('btn-fav-toggle');
        btn.innerHTML = `<i class="material-icons" style="color: ${isFav ? 'var(--md-sys-color-error)' : 'inherit'}">${isFav ? 'favorite' : 'favorite_border'}</i>`;
        btn.onclick = () => this.toggleFavorite();
    }

    renderFavorites() {
        this.renderProducts(this.favorites, 'fav-products');
        if(this.favorites.length === 0) {
            document.getElementById('fav-products').innerHTML = '<div class="p-4" style="grid-column: 1/-1; text-align:center;">No favorites yet.</div>';
        }
    }

    logout() {
        AuthService.logout();
        this.navigate('login', 'fade');
    }
}

// Initialize App
const app = new App();

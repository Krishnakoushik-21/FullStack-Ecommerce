class App {
    constructor() {
        this.currentView = 'splash';
        this.history = [];
        this.views = {
            splash: 'pages/splash.html',
            login: 'pages/login.html',
            register: 'pages/register.html',
            home: 'pages/home.html',
            categories: 'pages/categories.html',
            product: 'pages/product.html',
            wishlist: 'pages/wishlist.html',
            cart: 'pages/cart.html',
            checkout: 'pages/checkout.html',
            payment: 'pages/payment.html',
            'order-success': 'pages/order-success.html',
            orders: 'pages/orders.html',
            profile: 'pages/profile.html',
            settings: 'pages/settings.html'
        };

        // Cache loaded HTML elements to prevent re-fetching
        this.loadedViews = {};

        this.init();
    }

    async init() {
        // Setup initial history
        window.history.replaceState({ view: 'splash' }, '');

        // Handle Android back button
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.view) {
                this.navigate(event.state.view, 'slide-right', false);
            }
        });

        // Initialize Splash View immediately
        await this.loadViewContent('splash');
        const splashEl = document.getElementById('view-splash');
        if (splashEl) splashEl.classList.add('active');

        // Delay to load home data and auto-route
        setTimeout(() => {
            const token = localStorage.getItem('shopease_token');
            if (token) {
                this.navigate('home', 'fade');
            } else {
                this.navigate('login', 'fade');
            }
        }, 3000);
    }

    async loadViewContent(viewId) {
        if (this.loadedViews[viewId]) return;

        const container = document.getElementById(`view-${viewId}`);
        if (!container) return;

        try {
            const response = await fetch(this.views[viewId]);
            if (!response.ok) throw new Error(`Failed to load ${viewId} page`);
            const html = await response.getReader ? await response.text() : await response.text();
            container.innerHTML = html;
            this.loadedViews[viewId] = true;
            this.initializeViewController(viewId);
        } catch (error) {
            console.error('Error loading template:', error);
            container.innerHTML = `<div class="p-4 text-center">Error loading view. Please try again.</div>`;
        }
    }

    async navigate(viewId, transition = 'slide-left', pushState = true) {
        if (viewId === this.currentView) return;

        const currentEl = document.getElementById(`view-${this.currentView}`);
        
        // Ensure new template is loaded before transitioning
        await this.loadViewContent(viewId);
        const nextEl = document.getElementById(`view-${viewId}`);
        if (!nextEl) return;

        if (pushState) {
            window.history.pushState({ view: viewId }, '', `#${viewId}`);
        }

        // Apply transition animations
        nextEl.style.display = nextEl.classList.contains('flex-view') ? 'flex' : 'block';
        nextEl.classList.add('transitioning');
        if (currentEl) currentEl.classList.add('transitioning');

        if (transition === 'fade') {
            nextEl.style.animationName = 'fadeIn';
            if (currentEl) currentEl.style.animationName = 'fadeOut';
        } else if (transition === 'slide-right') {
            nextEl.style.animationName = 'slideInLeft';
            if (currentEl) currentEl.style.animationName = 'slideOutRight';
        } else {
            nextEl.style.animationName = 'slideInRight';
            if (currentEl) currentEl.style.animationName = 'slideOutLeft';
        }

        setTimeout(() => {
            if (currentEl) {
                currentEl.style.display = 'none';
                currentEl.classList.remove('active', 'transitioning');
            }
            nextEl.classList.add('active');
            nextEl.classList.remove('transitioning');
        }, 300);

        this.currentView = viewId;
        this.updateBottomNav(viewId);
        this.onViewEnter(viewId);
    }

    goBack() {
        window.history.back();
    }

    updateBottomNav(viewId) {
        // Hide desktop nav on auth/splash screens
        const noNavViews = ['splash', 'login', 'register'];
        const desktopNav = document.getElementById('desktop-nav');
        if (desktopNav) {
            desktopNav.style.display = noNavViews.includes(viewId) ? 'none' : '';
        }

        // Update active nav link
        const navMap = {
            'home': 'nav-home',
            'categories': 'nav-categories',
            'wishlist': 'nav-wishlist',
            'cart': 'nav-cart',
            'orders': 'nav-orders',
            'profile': 'nav-profile'
        };

        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        if (navMap[viewId]) {
            const activeEl = document.getElementById(navMap[viewId]);
            if (activeEl) activeEl.classList.add('active');
        }

        // Update cart badge
        this.updateCartBadge();
    }

    async updateCartBadge() {
        const token = localStorage.getItem('shopease_token');
        const badge = document.getElementById('nav-cart-badge');
        if (!badge) return;
        if (!token) { badge.style.display = 'none'; return; }
        try {
            const cart = await ApiService.get('/cart');
            const total = cart.reduce((s, i) => s + i.quantity, 0);
            if (total > 0) {
                badge.textContent = total > 9 ? '9+' : total;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        } catch(e) {
            badge.style.display = 'none';
        }
    }

    // Call individual controllers based on view
    initializeViewController(viewId) {
        if (viewId === 'login' && window.initLogin) window.initLogin();
        if (viewId === 'register' && window.initRegister) window.initRegister();
    }

    onViewEnter(viewId) {
        // Trigger hooks when views enter active state
        if (viewId === 'home' && window.loadHomeData) window.loadHomeData();
        if (viewId === 'categories' && window.initCategories) window.initCategories();
        if (viewId === 'product' && window.initProductDetails) window.initProductDetails();
        if (viewId === 'wishlist' && window.initWishlist) window.initWishlist();
        if (viewId === 'cart' && window.initCart) window.initCart();
        if (viewId === 'checkout' && window.initCheckout) window.initCheckout();
        if (viewId === 'payment' && window.initPayment) window.initPayment();
        if (viewId === 'order-success' && window.initOrderSuccess) window.initOrderSuccess();
        if (viewId === 'orders' && window.initOrders) window.initOrders();
        if (viewId === 'profile' && window.initProfile) window.initProfile();
        if (viewId === 'settings' && window.initSettings) window.initSettings();
    }
}

// Global App instance
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();

    // Register PWA Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => console.log('Service Worker registered successfully:', reg.scope))
                .catch(err => console.log('Service Worker registration failed:', err));
        });
    }
});

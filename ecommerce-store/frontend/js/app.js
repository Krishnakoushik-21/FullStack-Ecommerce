const API_URL = 'http://localhost:5000/api';

// Utility: Show Toast Notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Utility: Show/Hide Loading Spinner
function toggleSpinner(show) {
    const spinner = document.getElementById('global-spinner');
    if (spinner) {
        if (show) {
            spinner.classList.remove('d-none');
        } else {
            spinner.classList.add('d-none');
        }
    }
}

// Utility: API Fetcher
async function apiFetch(endpoint, options = {}) {
    toggleSpinner(true);
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }
        
        toggleSpinner(false);
        return data;
    } catch (error) {
        toggleSpinner(false);
        showToast(error.message, 'error');
        throw error;
    }
}

// Auth State Management
function checkAuthState() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    const guestLinks = document.querySelectorAll('.guest-only');
    const authLinks = document.querySelectorAll('.auth-only');
    const adminLinks = document.querySelectorAll('.admin-only');

    if (token && user) {
        guestLinks.forEach(el => el.classList.add('d-none'));
        authLinks.forEach(el => el.classList.remove('d-none'));
        
        if (user.role === 'admin') {
            adminLinks.forEach(el => el.classList.remove('d-none'));
        } else {
            adminLinks.forEach(el => el.classList.add('d-none'));
        }
    } else {
        guestLinks.forEach(el => el.classList.remove('d-none'));
        authLinks.forEach(el => el.classList.add('d-none'));
        adminLinks.forEach(el => el.classList.add('d-none'));
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logged out successfully');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Add global elements on load
document.addEventListener('DOMContentLoaded', () => {
    // Add Toast Container
    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Add Spinner
    if (!document.getElementById('global-spinner')) {
        const spinner = document.createElement('div');
        spinner.id = 'global-spinner';
        spinner.className = 'spinner-overlay d-none';
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
    }

    // Bind logout buttons
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });

    // Splash Screen Logic
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('hide');
        }, 800); // Show splash for 800ms
    }

    // Page Transition Logic
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            // Only intercept internal links that don't open in new tabs and don't just trigger JS
            const target = link.getAttribute('href');
            if (target && !target.startsWith('http') && target !== '#' && !link.getAttribute('target')) {
                e.preventDefault();
                const main = document.querySelector('main');
                if (main) {
                    main.classList.remove('page-transition-enter');
                    main.classList.add('page-transition-exit');
                }
                
                // Wait for exit animation to finish before navigating
                setTimeout(() => {
                    window.location.href = target;
                }, 300);
            }
        });
    });

    checkAuthState();
    updateCartCount();
});

// Cart Utility
function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCounts = document.querySelectorAll('.cart-count');
    cartCounts.forEach(el => el.textContent = count);
}

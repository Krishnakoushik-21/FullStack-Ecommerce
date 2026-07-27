document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    const container = document.getElementById('product-content');

    if (!productId || !container) return;

    let product = null;

    try {
        product = await apiFetch(`/products/${productId}`);
        
        // Mock fallback if db has no product matching
        if(!product) throw new Error("Not found");
    } catch (error) {
        // Use mock data to display the UI properly if backend fails or doesn't have the item
        console.log("Using mock data for product detail view.");
        product = {
            id: 1, 
            name: 'Acoustix Pro Max Wireless', 
            price: 399.00, 
            category: 'AUDIO EXCELLENCE SERIES', 
            stock: 10, 
            image_url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=600&q=80',
            description: 'Experience sound like never before. The Acoustix Pro Max combines bespoke acoustic design with advanced computational audio to deliver high-fidelity sound. Featuring Active Noise Cancellation, Transparency mode, and personalized spatial audio for a theater-like experience that surrounds you.'
        };
    }

    renderProduct(product);

    function renderProduct(product) {
        const inStock = product.stock > 0;

        container.innerHTML = `
            <!-- Gallery -->
            <div class="product-gallery">
                <div class="gallery-badge">New Arrival</div>
                <img src="${product.image_url || 'https://via.placeholder.com/500x500'}" alt="${product.name}" class="gallery-main-img">
            </div>
            
            <div class="thumbnail-list">
                <div class="thumbnail active"><img src="${product.image_url}" alt="thumb 1"></div>
                <div class="thumbnail"><img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=150" alt="thumb 2"></div>
                <div class="thumbnail"><img src="https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=150" alt="thumb 3"></div>
                <div class="thumbnail"><img src="https://images.unsplash.com/photo-1546435770-a3e426fa4731?auto=format&fit=crop&w=150" alt="thumb 4"></div>
            </div>

            <!-- Details -->
            <div class="detail-category">${product.category || 'Product'}</div>
            <h1 class="detail-title">${product.name}</h1>
            
            <div class="detail-price-row">
                <div class="detail-price">$${product.price.toFixed(2)}</div>
                ${inStock ? '<div class="status-badge"><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10B981; margin-right:4px;"></span>In Stock</div>' : '<div class="status-badge" style="background:#FEE2E2; color:#991B1B;">Out of Stock</div>'}
            </div>

            <p class="detail-desc">${product.description || 'Premium quality product designed for the modern lifestyle.'}</p>

            <!-- Controls -->
            <div class="control-row">
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; font-weight: 600;">Color: Midnight Slate</div>
                    <div class="color-selector">
                        <div class="color-dot active" style="background-color: #1a1a2e;"></div>
                        <div class="color-dot" style="background-color: #f1f5f9;"></div>
                        <div class="color-dot" style="background-color: #3b28cc;"></div>
                    </div>
                </div>

                <div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; font-weight: 600;">Quantity</div>
                    <div class="quantity-pill">
                        <button class="qty-btn" id="qty-dec">-</button>
                        <input type="number" id="qty-val" class="qty-input" value="1" min="1" max="${product.stock}" readonly>
                        <button class="qty-btn" id="qty-inc">+</button>
                    </div>
                </div>
            </div>

            <!-- Feature Grid -->
            <div class="features-grid">
                <div class="feature-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24" class="feature-icon">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                        <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    </svg>
                    <div>
                        <div class="feature-title">40h Battery</div>
                        <div class="feature-sub">Fast charge</div>
                    </div>
                </div>
                <div class="feature-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24" class="feature-icon">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <div>
                        <div class="feature-title">Active ANC</div>
                        <div class="feature-sub">Crystal clear</div>
                    </div>
                </div>
            </div>

            <!-- Rich Info -->
            <div class="info-card">
                <h3>The Technical Edge</h3>
                <p>Our proprietary driver architecture minimizes distortion across the audible range. Each part of our custom-built driver works to produce sound with ultra-low distortion, so you'll hear every note with a new level of clarity. Deep, rich bass, accurate mid-range, and crisp, clean highs—it's all balanced to perfection.</p>
                <div class="flex justify-between mt-4">
                    <div>
                        <div style="color: var(--primary); font-weight: 700;">0.1%</div>
                        <div style="font-size: 0.65rem; color: var(--text-muted);">Total Harmonic<br>Distortion</div>
                    </div>
                    <div>
                        <div style="color: var(--primary); font-weight: 700;">10Hz</div>
                        <div style="font-size: 0.65rem; color: var(--text-muted);">Low Frequency<br>Response</div>
                    </div>
                </div>
            </div>

            <div class="info-card dark">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32" style="margin-bottom: 1rem;">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <h3>Premium Build</h3>
                <p>Crafted with lightweight magnesium alloy and genuine leather for ultimate comfort during long sessions.</p>
            </div>

            <!-- Related -->
            <div class="section-title mt-4">
                <h2 style="font-size: 1.25rem;">Complete the Set</h2>
                <a href="#" class="view-all">View All &rarr;</a>
            </div>
            
            <div class="products-grid">
                <div class="product-card">
                    <div class="product-img-wrapper" style="height: 100px;">
                        <img src="https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=200" class="product-img">
                    </div>
                    <div class="product-title" style="font-size: 0.75rem;">Walnut Headset Stand</div>
                    <div class="product-price" style="font-size: 0.875rem;">$89.00</div>
                </div>
                <div class="product-card">
                    <div class="product-img-wrapper" style="height: 100px;">
                        <img src="https://images.unsplash.com/photo-1491933382434-500287f9b54b?auto=format&fit=crop&w=200" class="product-img">
                    </div>
                    <div class="product-title" style="font-size: 0.75rem;">Pro Travel Case</div>
                    <div class="product-price" style="font-size: 0.875rem;">$45.00</div>
                </div>
            </div>

            <!-- Sticky Footer -->
            <div class="sticky-footer">
                <div>
                    <div class="sticky-label">Total Price</div>
                    <div class="sticky-price" id="sticky-price-display">$${product.price.toFixed(2)}</div>
                </div>
                <button class="btn-primary-large" id="add-to-cart-action">Add to Cart</button>
            </div>
        `;

        // Interactive logic
        let currentQty = 1;
        const qtyVal = document.getElementById('qty-val');
        const priceDisplay = document.getElementById('sticky-price-display');

        document.getElementById('qty-dec').addEventListener('click', () => {
            if (currentQty > 1) {
                currentQty--;
                updatePrice();
            }
        });

        document.getElementById('qty-inc').addEventListener('click', () => {
            if (currentQty < product.stock) {
                currentQty++;
                updatePrice();
            }
        });

        function updatePrice() {
            qtyVal.value = currentQty;
            priceDisplay.textContent = '$' + (product.price * currentQty).toFixed(2);
        }

        document.getElementById('add-to-cart-action').addEventListener('click', () => {
            addToCart(product, currentQty);
        });
        
        // Color selector
        const colorDots = document.querySelectorAll('.color-dot');
        colorDots.forEach(dot => {
            dot.addEventListener('click', () => {
                colorDots.forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
            });
        });
    }

    function addToCart(product, quantity) {
        if(quantity > product.stock) {
            showToast('Requested quantity exceeds available stock', 'error');
            return;
        }

        const cart = getCart();
        const existing = cart.find(item => item.product_id === product.id);

        if (existing) {
            if(existing.quantity + quantity <= product.stock) {
                existing.quantity += quantity;
                showToast('Cart updated', 'success');
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
                quantity: quantity
            });
            showToast('Added to cart', 'success');
        }

        saveCart(cart);
    }
});

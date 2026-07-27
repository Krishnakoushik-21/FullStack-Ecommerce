document.addEventListener('DOMContentLoaded', () => {
    
    // Check admin
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    const tbody = document.getElementById('admin-products-body');
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    
    async function loadAdminProducts() {
        try {
            const products = await apiFetch('/products');
            renderAdminProducts(products);
        } catch (error) {
            console.error(error);
        }
    }

    function renderAdminProducts(products) {
        tbody.innerHTML = '';
        products.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td>${p.stock}</td>
                <td>
                    <button class="btn edit-btn" style="background: var(--primary); color: white; padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-right: 0.5rem;" data-id="${p.id}">Edit</button>
                    <button class="btn delete-btn" style="background: var(--danger); color: white; padding: 0.25rem 0.5rem; font-size: 0.75rem;" data-id="${p.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const product = products.find(p => p.id == id);
                openModal(product);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('Are you sure you want to delete this product?')) {
                    const id = e.target.getAttribute('data-id');
                    try {
                        await apiFetch(`/products/${id}`, { method: 'DELETE' });
                        showToast('Product deleted');
                        loadAdminProducts();
                    } catch(err) {}
                }
            });
        });
    }

    // Modal Logic
    document.getElementById('add-product-btn').addEventListener('click', () => {
        openModal();
    });

    document.getElementById('close-modal').addEventListener('click', () => {
        modal.classList.add('d-none');
    });

    function openModal(product = null) {
        if (product) {
            document.getElementById('modal-title').textContent = 'Edit Product';
            document.getElementById('prod-id').value = product.id;
            document.getElementById('prod-name').value = product.name;
            document.getElementById('prod-desc').value = product.description || '';
            document.getElementById('prod-price').value = product.price;
            document.getElementById('prod-stock').value = product.stock;
            document.getElementById('prod-category').value = product.category || '';
            document.getElementById('prod-image').value = product.image_url || '';
        } else {
            document.getElementById('modal-title').textContent = 'Add Product';
            form.reset();
            document.getElementById('prod-id').value = '';
        }
        modal.classList.remove('d-none');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('prod-id').value;
        const payload = {
            name: document.getElementById('prod-name').value,
            description: document.getElementById('prod-desc').value,
            price: parseFloat(document.getElementById('prod-price').value),
            stock: parseInt(document.getElementById('prod-stock').value),
            category: document.getElementById('prod-category').value,
            image_url: document.getElementById('prod-image').value
        };

        try {
            if (id) {
                // Update
                await apiFetch(`/products/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                showToast('Product updated');
            } else {
                // Create
                await apiFetch('/products', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showToast('Product created');
            }
            modal.classList.add('d-none');
            loadAdminProducts();
        } catch (error) {}
    });

    loadAdminProducts();
});

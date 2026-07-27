// Cart Controller
exports.getCart = (req, res) => {
    const db = req.app.get('db');
    const userId = req.user.id;

    db.all(`
        SELECT cart.id as cart_item_id, cart.quantity, products.id as product_id, products.name, products.brand, products.price, products.old_price, products.discount, products.image_url, products.stock
        FROM cart
        JOIN products ON cart.product_id = products.id
        WHERE cart.user_id = ?
    `, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.addToCart = (req, res) => {
    const db = req.app.get('db');
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if product exists and check stock
    db.get("SELECT id, stock FROM products WHERE id = ?", [productId], (err, product) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        if (product.stock < quantity) {
            return res.status(400).json({ error: 'Requested quantity exceeds available stock' });
        }

        // Check if already in cart
        db.get("SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId], (err, cartItem) => {
            if (err) return res.status(500).json({ error: err.message });

            if (cartItem) {
                const newQty = cartItem.quantity + quantity;
                if (product.stock < newQty) {
                    return res.status(400).json({ error: 'Exceeds stock limit' });
                }
                db.run("UPDATE cart SET quantity = ? WHERE id = ?", [newQty, cartItem.id], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Cart updated successfully', quantity: newQty });
                });
            } else {
                db.run("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)", [userId, productId, quantity], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.status(201).json({ message: 'Added to cart successfully' });
                });
            }
        });
    });
};

exports.updateCart = (req, res) => {
    const db = req.app.get('db');
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
        return res.status(400).json({ error: 'Product ID and quantity are required' });
    }

    if (quantity <= 0) {
        // If qty is 0 or less, remove item
        db.run("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            return res.json({ message: 'Item removed from cart' });
        });
        return;
    }

    // Verify stock
    db.get("SELECT stock FROM products WHERE id = ?", [productId], (err, product) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        if (product.stock < quantity) {
            return res.status(400).json({ error: 'Requested quantity exceeds stock limit' });
        }

        db.run("UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?", [quantity, userId, productId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Cart item quantity updated' });
        });
    });
};

exports.removeFromCart = (req, res) => {
    const db = req.app.get('db');
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
    }

    db.run("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Product removed from cart' });
    });
};

exports.clearCart = (req, res) => {
    const db = req.app.get('db');
    const userId = req.user.id;

    db.run("DELETE FROM cart WHERE user_id = ?", [userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Cart cleared successfully' });
    });
};

exports.validateCoupon = (req, res) => {
    const db = req.app.get('db');
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Coupon code is required' });
    }

    db.get("SELECT * FROM coupons WHERE code = ? AND active = 1", [code.toUpperCase()], (err, coupon) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!coupon) return res.status(404).json({ error: 'Invalid or expired coupon code' });
        res.json(coupon);
    });
};

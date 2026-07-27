// Wishlist Controller
exports.getWishlist = (req, res) => {
    const db = req.app.get('db');
    const userId = req.user.id;

    db.all(`
        SELECT wishlist.id as wishlist_item_id, products.id as product_id, products.name, products.brand, products.price, products.old_price, products.image_url
        FROM wishlist
        JOIN products ON wishlist.product_id = products.id
        WHERE wishlist.user_id = ?
    `, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.addToWishlist = (req, res) => {
    const db = req.app.get('db');
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
    }

    db.get("SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?", [userId, productId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(400).json({ error: 'Product already in wishlist' });

        db.run("INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)", [userId, productId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Added to wishlist successfully' });
        });
    });
};

exports.removeFromWishlist = (req, res) => {
    const db = req.app.get('db');
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
    }

    db.run("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", [userId, productId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Product removed from wishlist' });
    });
};

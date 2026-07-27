const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

// Create order
router.post('/', authenticateToken, (req, res) => {
    const { items, total_amount, payment_method, shipping_address } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Order items are required' });
    }

    db.run("BEGIN TRANSACTION");

    db.run(
        `INSERT INTO orders (user_id, total_amount, payment_method, shipping_address) VALUES (?, ?, ?, ?)`,
        [userId, total_amount, payment_method, JSON.stringify(shipping_address)],
        function(err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: 'Error creating order' });
            }

            const orderId = this.lastID;
            const stmt = db.prepare(`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`);

            let hasError = false;
            for (const item of items) {
                stmt.run([orderId, item.product_id, item.quantity, item.price], (itemErr) => {
                    if (itemErr) hasError = true;
                });
            }

            stmt.finalize();

            if (hasError) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: 'Error saving order items' });
            } else {
                db.run("COMMIT");
                res.status(201).json({ message: 'Order placed successfully', orderId });
            }
        }
    );
});

// Get user orders
router.get('/', authenticateToken, (req, res) => {
    db.all("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Get order details
router.get('/:id', authenticateToken, (req, res) => {
    db.get("SELECT * FROM orders WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], (err, order) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        db.all(`SELECT oi.*, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`, 
        [order.id], (err, items) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            order.items = items;
            res.json(order);
        });
    });
});

module.exports = router;

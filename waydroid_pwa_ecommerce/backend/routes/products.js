const express = require('express');
const db = require('../database');
const router = express.Router();

// Get all products
router.get('/', (req, res) => {
    const { category, search } = req.query;
    let query = "SELECT * FROM products";
    const params = [];

    if (category) {
        query += " WHERE category = ?";
        params.push(category);
    } else if (search) {
        query += " WHERE name LIKE ?";
        params.push(`%${search}%`);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Get single product
router.get('/:id', (req, res) => {
    db.get("SELECT * FROM products WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Product not found' });
        res.json(row);
    });
});

// Get categories
router.get('/categories/all', (req, res) => {
    db.all("SELECT DISTINCT category FROM products", (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows.map(r => r.category));
    });
});

module.exports = router;

exports.getAllProducts = (req, res) => {
    const db = req.app.get('db');
    const { category, search } = req.query;

    let query = "SELECT * FROM products WHERE 1=1";
    const params = [];

    if (category) {
        query += " AND category = ?";
        params.push(category);
    }

    if (search) {
        query += " AND (name LIKE ? OR description LIKE ? OR brand LIKE ?)";
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.getProductById = (req, res) => {
    const db = req.app.get('db');
    const id = req.params.id;

    db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Product not found' });
        res.json(row);
    });
};

exports.getCategories = (req, res) => {
    const db = req.app.get('db');
    db.all("SELECT DISTINCT category FROM products", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const categories = rows.map(r => r.category);
        res.json(categories);
    });
};

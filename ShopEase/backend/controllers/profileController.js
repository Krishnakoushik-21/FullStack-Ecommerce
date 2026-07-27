// Profile Controller
exports.getProfile = (req, res) => {
    const db = req.app.get('db');
    const userId = req.user.id;

    db.get("SELECT id, name, email, phone, gender, dob, avatar_url, role, created_at FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json(row);
    });
};

exports.updateProfile = (req, res) => {
    const db = req.app.get('db');
    const userId = req.user.id;
    const { name, phone, gender, dob } = req.body;
    const avatar_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    let updateQuery = "UPDATE users SET name = ?, phone = ?, gender = ?, dob = ?";
    const params = [name, phone, gender, dob];

    if (avatar_url) {
        updateQuery += ", avatar_url = ?";
        params.push(avatar_url);
    }

    updateQuery += " WHERE id = ?";
    params.push(userId);

    db.run(updateQuery, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Fetch updated user
        db.get("SELECT id, name, email, phone, gender, dob, avatar_url, role FROM users WHERE id = ?", [userId], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                message: 'Profile updated successfully',
                user: row
            });
        });
    });
};

const db = require('../database/db');

class Product {
    static async findAll() {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM Products`, [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    }

    static async findById(id) {
        return new Promise((resolve, reject) => {
            db.get(`SELECT * FROM Products WHERE id = ?`, [id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }

    static async create(name, description, price, category, stock, image_url) {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO Products (name, description, price, category, stock, image_url) VALUES (?, ?, ?, ?, ?, ?)`,
                [name, description, price, category, stock, image_url],
                function (err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    static async update(id, name, description, price, category, stock, image_url) {
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE Products SET name = ?, description = ?, price = ?, category = ?, stock = ?, image_url = ? WHERE id = ?`,
                [name, description, price, category, stock, image_url, id],
                function (err) {
                    if (err) reject(err);
                    resolve(this.changes);
                }
            );
        });
    }

    static async delete(id) {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM Products WHERE id = ?`, [id], function (err) {
                if (err) reject(err);
                resolve(this.changes);
            });
        });
    }

    static async reduceStock(id, quantity) {
        return new Promise((resolve, reject) => {
            db.run(`UPDATE Products SET stock = stock - ? WHERE id = ? AND stock >= ?`, [quantity, id, quantity], function (err) {
                if (err) reject(err);
                resolve(this.changes);
            });
        });
    }
}

module.exports = Product;

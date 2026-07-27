const db = require('../database/db');

class User {
    static async findByEmail(email) {
        return new Promise((resolve, reject) => {
            db.get(`SELECT * FROM Users WHERE email = ?`, [email], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }

    static async create(name, email, password) {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`,
                [name, email, password],
                function (err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    static async findById(id) {
        return new Promise((resolve, reject) => {
            db.get(`SELECT id, name, email, role, created_at FROM Users WHERE id = ?`, [id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }
}

module.exports = User;

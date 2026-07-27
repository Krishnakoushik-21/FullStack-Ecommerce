const db = require('../database/db');

class Order {
    static async create(userId, fullName, address, phone, paymentMethod, totalPrice, cartItems) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                db.run(
                    `INSERT INTO Orders (user_id, full_name, address, phone, payment_method, total_price) VALUES (?, ?, ?, ?, ?, ?)`,
                    [userId, fullName, address, phone, paymentMethod, totalPrice],
                    function (err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return reject(err);
                        }
                        
                        const orderId = this.lastID;
                        const stmt = db.prepare(`INSERT INTO OrderItems (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`);
                        
                        cartItems.forEach(item => {
                            stmt.run([orderId, item.product_id, item.quantity, item.price], (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return reject(err);
                                }
                            });
                        });
                        
                        stmt.finalize((err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return reject(err);
                            }
                            db.run('COMMIT');
                            resolve(orderId);
                        });
                    }
                );
            });
        });
    }

    static async findByUserId(userId) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM Orders WHERE user_id = ? ORDER BY created_at DESC`, [userId], async (err, orders) => {
                if (err) return reject(err);
                
                // Fetch items for each order
                const ordersWithItems = [];
                for (let order of orders) {
                    const items = await Order.findItemsByOrderId(order.id);
                    ordersWithItems.push({ ...order, items });
                }
                resolve(ordersWithItems);
            });
        });
    }

    static async findItemsByOrderId(orderId) {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT OrderItems.*, Products.name as product_name, Products.image_url 
                 FROM OrderItems 
                 LEFT JOIN Products ON OrderItems.product_id = Products.id 
                 WHERE order_id = ?`, 
                [orderId], 
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });
    }
}

module.exports = Order;

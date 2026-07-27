const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            image_url TEXT,
            stock INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (!err) {
                seedProducts();
            }
        });

        // Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'Pending',
            payment_method TEXT NOT NULL,
            shipping_address TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Order Items Table
        db.run(`CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )`);
    });
}

function seedProducts() {
    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
        if (row && row.count === 0) {
            console.log("Seeding initial products...");
            const stmt = db.prepare("INSERT INTO products (name, description, price, category, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)");
            
            const products = [
                ["Wireless Headphones", "High quality noise-cancelling wireless headphones.", 2999, "Electronics", "https://via.placeholder.com/300x300.png?text=Headphones", 50],
                ["Smart Watch", "Fitness tracker and smartwatch with heart rate monitor.", 1999, "Electronics", "https://via.placeholder.com/300x300.png?text=Smart+Watch", 100],
                ["Running Shoes", "Comfortable lightweight running shoes for daily use.", 1499, "Fashion", "https://via.placeholder.com/300x300.png?text=Shoes", 200],
                ["Cotton T-Shirt", "100% pure cotton classic t-shirt.", 499, "Fashion", "https://via.placeholder.com/300x300.png?text=T-Shirt", 500],
                ["Organic Coffee", "Premium roasted organic coffee beans (500g).", 799, "Groceries", "https://via.placeholder.com/300x300.png?text=Coffee", 150],
                ["Yoga Mat", "Non-slip eco-friendly yoga mat.", 899, "Fitness", "https://via.placeholder.com/300x300.png?text=Yoga+Mat", 80],
                ["Bluetooth Speaker", "Portable waterproof bluetooth speaker.", 1599, "Electronics", "https://via.placeholder.com/300x300.png?text=Speaker", 120],
                ["Backpack", "Water-resistant travel backpack.", 1299, "Fashion", "https://via.placeholder.com/300x300.png?text=Backpack", 90]
            ];

            for (const p of products) {
                stmt.run(p);
            }
            stmt.finalize();
        }
    });
}

module.exports = db;

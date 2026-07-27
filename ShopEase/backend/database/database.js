const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'shopease.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Enable foreign keys
    db.run("PRAGMA foreign_keys = ON;");

    // Create tables IF NOT EXISTS
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        gender TEXT,
        dob TEXT,
        avatar_url TEXT,
        role TEXT DEFAULT 'user',
        email_verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Migrate: add email_verified to existing databases that were created before this column
    db.run(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`, () => {});

    // Products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brand TEXT,
        category TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        old_price REAL,
        discount INTEGER DEFAULT 0,
        rating REAL DEFAULT 5.0,
        review_count INTEGER DEFAULT 0,
        stock INTEGER DEFAULT 10,
        warranty TEXT DEFAULT '1 Year Warranty',
        delivery_time TEXT DEFAULT '2-3 Days',
        return_policy TEXT DEFAULT '7 Days Replacement',
        specifications TEXT, -- JSON string
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Reviews table
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        user_id INTEGER,
        reviewer_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        review_text TEXT,
        helpful_count INTEGER DEFAULT 0,
        date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    // Wishlist table
    db.run(`CREATE TABLE IF NOT EXISTS wishlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    // Cart table
    db.run(`CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'Pending',
        payment_method TEXT,
        shipping_address TEXT,
        expected_delivery TEXT,
        tracking_number TEXT,
        invoice_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // OrderItems table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    // Addresses table
    db.run(`CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        house_no TEXT,
        apartment TEXT,
        street TEXT,
        area TEXT,
        landmark TEXT,
        city TEXT,
        district TEXT,
        state TEXT,
        country TEXT,
        pincode TEXT,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Payments table
    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        payment_method TEXT,
        payment_status TEXT,
        transaction_id TEXT,
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`);

    // Migrate existing payments table: add razorpay columns if they don't exist
    db.run(`ALTER TABLE payments ADD COLUMN razorpay_order_id TEXT`, () => {});
    db.run(`ALTER TABLE payments ADD COLUMN razorpay_payment_id TEXT`, () => {});

    // Razorpay pending orders: temporary store for checkout data between
    // "create razorpay order" and "verify payment" steps.
    // This prevents the client from tampering with order amounts.
    db.run(`CREATE TABLE IF NOT EXISTS razorpay_pending_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        razorpay_order_id TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        amount_paise INTEGER NOT NULL,
        currency TEXT DEFAULT 'INR',
        checkout_data TEXT NOT NULL,
        status TEXT DEFAULT 'created',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Coupons table
    db.run(`CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        discount_percent INTEGER NOT NULL,
        active INTEGER DEFAULT 1
    )`);

    // Email verification tokens
    db.run(`CREATE TABLE IF NOT EXISTS email_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Password reset tokens
    db.run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Check if database needs seeding
    db.get("SELECT COUNT(*) as count FROM users", [], async (err, row) => {
        if (err) {
            console.error("Error checking users count:", err);
            return;
        }

        if (row.count > 0) {
            console.log("Database already populated. Skipping seeding.");
            return;
        }

        console.log("Database empty. Seeding starting...");
        await seedDatabase();
    });
});

async function seedDatabase() {
    const userNames = [
        'Aarav Mehta', 'Ananya Iyer', 'Rahul Sharma', 'Priya Patel', 'Amit Verma',
        'Sneha Reddy', 'Vikram Singh', 'Neha Gupta', 'Rohan Das', 'Kriti Sen',
        'Siddharth Rao', 'Aditi Nair', 'Manish Pandey', 'Divya Joshi', 'Arjun Kapoor',
        'Riya Malhotra', 'Varun Dhawan', 'Shruti Hassan', 'Karan Johar', 'Alia Bhatt'
    ];

    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Add admin user
    db.run(`INSERT INTO users (name, email, password, phone, gender, dob, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['Admin ShopEase', 'admin@shopease.com', passwordHash, '9999999999', 'Male', '1990-01-01', 'admin']
    );

    // Add 20 normal users
    userNames.forEach((name, index) => {
        const email = `${name.toLowerCase().replace(' ', '')}@gmail.com`;
        const phone = `98765432${index.toString().padStart(2, '0')}`;
        const gender = index % 2 === 0 ? 'Male' : 'Female';
        const dob = `199${index % 10}-0${(index % 9) + 1}-15`;
        db.run(`INSERT INTO users (name, email, password, phone, gender, dob, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, email, passwordHash, phone, gender, dob, 'user']
        );
    });
    console.log("Seeded 20 Users + 1 Admin.");

    // Seed Coupons
    db.run("INSERT INTO coupons (code, discount_percent) VALUES ('SHOPEASE10', 10)");
    db.run("INSERT INTO coupons (code, discount_percent) VALUES ('FESTIVE20', 20)");
    db.run("INSERT INTO coupons (code, discount_percent) VALUES ('WELCOME50', 50)");

    // Seed 100 Products across 10 Categories
    const categoriesData = {
        "Mobiles": [
            { name: "iPhone 15 Pro Max", brand: "Apple", price: 159900, old_price: 169900, image_url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500" },
            { name: "Galaxy S24 Ultra", brand: "Samsung", price: 129999, old_price: 139999, image_url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500" },
            { name: "OnePlus 12 5G", brand: "OnePlus", price: 64999, old_price: 69999, image_url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500" },
            { name: "Pixel 8 Pro", brand: "Google", price: 106999, old_price: 109999, image_url: "https://images.unsplash.com/photo-1598327106026-d9521da673d1?w=500" },
            { name: "Redmi Note 13 Pro+", brand: "Xiaomi", price: 31999, old_price: 33999, image_url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500" },
            { name: "Realme 12 Pro+", brand: "Realme", price: 29999, old_price: 31999, image_url: "https://images.unsplash.com/photo-1565849906461-09a234027953?w=500" },
            { name: "Nothing Phone 2", brand: "Nothing", price: 44999, old_price: 49999, image_url: "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=500" },
            { name: "Motorola Edge 50 Pro", brand: "Motorola", price: 35999, old_price: 39999, image_url: "https://images.unsplash.com/photo-1551645121-d1034da75057?w=500" },
            { name: "iPhone 14", brand: "Apple", price: 69900, old_price: 79900, image_url: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=500" },
            { name: "Galaxy A55 5G", brand: "Samsung", price: 39999, old_price: 44999, image_url: "https://images.unsplash.com/photo-1573148195900-7845dcb9b127?w=500" }
        ],
        "Laptops": [
            { name: "MacBook Pro M3 Max", brand: "Apple", price: 249900, old_price: 269900, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500" },
            { name: "Dell XPS 13", brand: "Dell", price: 139990, old_price: 154990, image_url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500" },
            { name: "HP Spectre x360", brand: "HP", price: 149990, old_price: 169990, image_url: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500" },
            { name: "Lenovo ThinkPad X1 Carbon", brand: "Lenovo", price: 189990, old_price: 209990, image_url: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500" },
            { name: "ASUS Zenbook 14", brand: "ASUS", price: 94990, old_price: 104990, image_url: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500" },
            { name: "Acer Swift Go 14", brand: "Acer", price: 62990, old_price: 69990, image_url: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=500" },
            { name: "MSI Cyborg 15", brand: "MSI", price: 79990, old_price: 89990, image_url: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500" },
            { name: "LG Gram 16", brand: "LG", price: 114990, old_price: 129990, image_url: "https://images.unsplash.com/photo-1496181130204-7552cc14AC1a?w=500" },
            { name: "Gigabyte Aero 16", brand: "Gigabyte", price: 154990, old_price: 174990, image_url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=500" },
            { name: "Razer Blade 16", brand: "Razer", price: 289990, old_price: 319990, image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500" }
        ],
        "Accessories": [
            { name: "Sony WH-1000XM5 ANC", brand: "Sony", price: 29990, old_price: 34990, image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500" },
            { name: "AirPods Pro 2", brand: "Apple", price: 24900, old_price: 26900, image_url: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500" },
            { name: "Bose QuietComfort Ultra", brand: "Bose", price: 35900, old_price: 39900, image_url: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500" },
            { name: "Galaxy Buds 2 Pro", brand: "Samsung", price: 15999, old_price: 19999, image_url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500" },
            { name: "Anker PowerCore 20K", brand: "Anker", price: 3499, old_price: 4999, image_url: "https://images.unsplash.com/photo-1624996379697-f01d168b1a52?w=500" },
            { name: "SanDisk 128GB MicroSD", brand: "SanDisk", price: 999, old_price: 1999, image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500" },
            { name: "Logitech MX Master 3S", brand: "Logitech", price: 9495, old_price: 10995, image_url: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500" },
            { name: "Apple Pencil 2nd Gen", brand: "Apple", price: 11900, old_price: 12900, image_url: "https://images.unsplash.com/photo-1628149455678-16f37bc392f4?w=500" },
            { name: "Belkin BoostCharge 3-in-1", brand: "Belkin", price: 12999, old_price: 14999, image_url: "https://images.unsplash.com/photo-1622445262465-2481c4574875?w=500" },
            { name: "JBL Go 4 Bluetooth Speaker", brand: "JBL", price: 3999, old_price: 4999, image_url: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500" }
        ],
        "Fashion": [
            { name: "501 Original Fit Jeans", brand: "Levis", price: 3999, old_price: 4999, image_url: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500" },
            { name: "Air Max 90 Sneakers", brand: "Nike", price: 9995, old_price: 11995, image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500" },
            { name: "Trefoil Pullover Hoodie", brand: "Adidas", price: 3499, old_price: 4999, image_url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500" },
            { name: "Double-Breasted Trench Coat", brand: "Zara", price: 7999, old_price: 9999, image_url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500" },
            { name: "Smash V2 Leather Sneakers", brand: "Puma", price: 2999, old_price: 4499, image_url: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500" },
            { name: "Slim Fit Oxford Shirt", brand: "H&M", price: 1499, old_price: 1999, image_url: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500" },
            { name: "Stainless Steel Chrono Watch", brand: "Tommy Hilfiger", price: 12499, old_price: 14999, image_url: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500" },
            { name: "Classic Wayfarer Sunglasses", brand: "Ray-Ban", price: 8590, old_price: 9990, image_url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500" },
            { name: "Derrick Leather Bifold Wallet", brand: "Fossil", price: 2999, old_price: 3999, image_url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500" },
            { name: "Faux Leather Moto Jacket", brand: "Calvin Klein", price: 9999, old_price: 14999, image_url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500" }
        ],
        "Groceries": [
            { name: "Raw California Almonds 500g", brand: "Happilo", price: 449, old_price: 599, image_url: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=500" },
            { name: "Extra Virgin Olive Oil 1L", brand: "Borges", price: 849, old_price: 1199, image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500" },
            { name: "Rozana Basmati Rice 5kg", brand: "India Gate", price: 475, old_price: 550, image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500" },
            { name: "Nescafé Gold Coffee 100g", brand: "Nescafe", price: 349, old_price: 399, image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500" },
            { name: "Rolled Oats 1kg", brand: "Kellogg's", price: 245, old_price: 299, image_url: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=500" },
            { name: "Pure Cocoa Powder 150g", brand: "Hershey's", price: 199, old_price: 225, image_url: "https://images.unsplash.com/photo-1600431521340-491eca880813?w=500" },
            { name: "Tomato Ketchup 950g", brand: "Heinz", price: 165, old_price: 185, image_url: "https://images.unsplash.com/photo-1607305387299-a3d9611cd46f?w=500" },
            { name: "Pure Green Tea 100 Tea Bags", brand: "Lipton", price: 299, old_price: 350, image_url: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=500" },
            { name: "Digestive Biscuits", brand: "Britannia", price: 99, old_price: 120, image_url: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500" },
            { name: "Hazelnut Cocoa Spread 350g", brand: "Nutella", price: 320, old_price: 360, image_url: "https://images.unsplash.com/photo-1553456558-aff63285bdd1?w=500" }
        ],
        "Beauty": [
            { name: "Total Repair 5 Shampoo 1L", brand: "L'Oreal", price: 649, old_price: 799, image_url: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500" },
            { name: "Hydrating Facial Cleanser 473ml", brand: "CeraVe", price: 1249, old_price: 1399, image_url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500" },
            { name: "Sensational Mascara Waterproof", brand: "Maybelline", price: 449, old_price: 499, image_url: "https://images.unsplash.com/photo-1631730359575-38e4755d772b?w=500" },
            { name: "Niacinamide 10% + Zinc 1%", brand: "The Ordinary", price: 599, old_price: 699, image_url: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500" },
            { name: "Ultra Sheer Sunscreen SPF 50+", brand: "Neutrogena", price: 549, old_price: 650, image_url: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=500" },
            { name: "Retro Matte Lipstick Ruby Woo", brand: "MAC", price: 1950, old_price: 2200, image_url: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500" },
            { name: "Hair Dryer HP8100/46", brand: "Philips", price: 849, old_price: 999, image_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500" },
            { name: "Cocoa Nourish Body Milk 400ml", brand: "Nivea", price: 349, old_price: 449, image_url: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500" },
            { name: "Advanced Night Repair Serum", brand: "Estee Lauder", price: 5900, old_price: 6500, image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500" },
            { name: "Dyson Airwrap Multi-Styler", brand: "Dyson", price: 45900, old_price: 49900, image_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500" }
        ],
        "Sports": [
            { name: "Evolution Game Basketball", brand: "Wilson", price: 4499, old_price: 5499, image_url: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500" },
            { name: "Street Football Size 5", brand: "Spalding", price: 1499, old_price: 1999, image_url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500" },
            { name: "Nanoflare 100 Badminton Racket", brand: "Yonex", price: 2999, old_price: 3999, image_url: "https://images.unsplash.com/photo-1613531415875-112f65243acd?w=500" },
            { name: "Premium TPE 6mm Yoga Mat", brand: "Decathlon", price: 1299, old_price: 1799, image_url: "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=500" },
            { name: "Charge 6 Fitness Tracker", brand: "Fitbit", price: 14999, old_price: 16999, image_url: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500" },
            { name: "Forerunner 55 GPS Watch", brand: "Garmin", price: 18990, old_price: 22990, image_url: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=500" },
            { name: "Academy Team Gym Bag", brand: "Nike", price: 1895, old_price: 2295, image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500" },
            { name: "Chute Mag Water Bottle 1L", brand: "Camelbak", price: 1199, old_price: 1499, image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500" },
            { name: "SelectTech Adjustable Dumbbells", brand: "Bowflex", price: 34999, old_price: 39999, image_url: "https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=500" },
            { name: "Supernova Cushioned Running Socks", brand: "Adidas", price: 499, old_price: 799, image_url: "https://images.unsplash.com/photo-1582966772680-860e372bb558?w=500" }
        ],
        "Furniture": [
            { name: "Solid Wood Study Desk", brand: "DeckUp", price: 4599, old_price: 6999, image_url: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=500" },
            { name: "High-Back Ergonomic Office Chair", brand: "Green Soul", price: 8999, old_price: 12999, image_url: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=500" },
            { name: "Milano 3-Seater Fabric Sofa", brand: "Sleepyhead", price: 18999, old_price: 24999, image_url: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=500" },
            { name: "Queen Size Engineered Wood Bed", brand: "Wakefit", price: 12499, old_price: 16999, image_url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500" },
            { name: "4-Tier Wooden Bookshelf Cabinet", brand: "Bluewud", price: 3299, old_price: 4999, image_url: "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=500" },
            { name: "Minimalist Metal Coffee Table", brand: "Home Centre", price: 2499, old_price: 3999, image_url: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500" },
            { name: "4-Seater Solid Wood Dining Set", brand: "Sheesham", price: 16999, old_price: 22999, image_url: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=500" },
            { name: "Fabric Recliner Armchair", brand: "Amazon Brand", price: 11999, old_price: 15999, image_url: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=500" },
            { name: "3-Door Wardrobe with Mirror", brand: "Godrej Interio", price: 15499, old_price: 19999, image_url: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=500" },
            { name: "8-Tier Shoe Rack Cabinet Organizer", brand: "Cello", price: 1999, old_price: 2999, image_url: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500" }
        ],
        "Books": [
            { name: "Atomic Habits", brand: "James Clear", price: 450, old_price: 650, image_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500" },
            { name: "The Alchemist", brand: "Paulo Coelho", price: 299, old_price: 350, image_url: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500" },
            { name: "Sapiens: A Brief History", brand: "Yuval Noah Harari", price: 499, old_price: 599, image_url: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500" },
            { name: "Thinking, Fast and Slow", brand: "Daniel Kahneman", price: 420, old_price: 499, image_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500" },
            { name: "The Silent Patient", brand: "Alex Michaelides", price: 320, old_price: 399, image_url: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500" },
            { name: "Educated: A Memoir", brand: "Tara Westover", price: 380, old_price: 450, image_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500" },
            { name: "Rich Dad Poor Dad", brand: "Robert Kiyosaki", price: 399, old_price: 499, image_url: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500" },
            { name: "Deep Work", brand: "Cal Newport", price: 349, old_price: 450, image_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500" },
            { name: "Zero to One", brand: "Peter Thiel", price: 399, old_price: 499, image_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500" },
            { name: "Shoe Dog: A Memoir", brand: "Phil Knight", price: 450, old_price: 599, image_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500" }
        ],
        "Home & Kitchen": [
            { name: "Digital Air Fryer 4.2L", brand: "Philips", price: 6999, old_price: 9999, image_url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500" },
            { name: "Mixer Grinder 750W 3 Jars", brand: "Prestige", price: 3299, old_price: 4599, image_url: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=500" },
            { name: "Induction Cooktop 1800W", brand: "Pigeon", price: 1899, old_price: 2999, image_url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500" },
            { name: "Mineral RO Water Purifier", brand: "Kent", price: 14500, old_price: 16500, image_url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500" },
            { name: "Non-Stick 3-Piece Cookware Pan", brand: "Wonderchef", price: 2199, old_price: 3499, image_url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500" },
            { name: "V8 Absolute Cordless Vacuum", brand: "Dyson", price: 34900, old_price: 39900, image_url: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=500" },
            { name: "Svachh Pressure Cooker 5L", brand: "Prestige", price: 2499, old_price: 2999, image_url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500" },
            { name: "Glass Storage Containers Set", brand: "Borosil", price: 999, old_price: 1299, image_url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500" },
            { name: "Oven Toaster Griller 20L", brand: "Bajaj", price: 4499, old_price: 5999, image_url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500" },
            { name: "1200mm Speed Ceiling Fan", brand: "Havells", price: 2599, old_price: 3299, image_url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500" }
        ]
    };

    console.log("Preparing to insert 100 Products...");

    const insertedProductIds = [];
    
    // Convert object to flat array of products to insert sequentially
    const productsToInsert = [];
    Object.keys(categoriesData).forEach(cat => {
        categoriesData[cat].forEach((p, idx) => {
            const discount = Math.round(((p.old_price - p.price) / p.old_price) * 100);
            const rating = +(4.0 + Math.random() * 1.0).toFixed(1);
            const review_count = 20 + Math.floor(Math.random() * 15);
            const stock = 5 + Math.floor(Math.random() * 45);
            const description = `${p.name} by ${p.brand} is a premium device in the ${cat} category, designed to deliver exceptional value, reliable performance, and standard industry specs. Enjoy modern design features, long-term durability, and a highly responsive user experience.`;
            
            const specifications = JSON.stringify({
                "Brand": p.brand,
                "Model": p.name,
                "Category": cat,
                "Color": ["Midnight Black", "Platinum Silver", "Space Gray"][idx % 3],
                "Item Dimensions": "15.4 x 7.2 x 0.8 cm",
                "Weight": "180 Grams",
                "Warranty": idx % 2 === 0 ? "1 Year Manufacturer Warranty" : "2 Years Domestic Warranty"
            });

            const warranty = idx % 2 === 0 ? "1 Year Manufacturer Warranty" : "2 Years Domestic Warranty";
            const delivery_time = idx % 3 === 0 ? "Tomorrow morning" : "2-3 Days";
            const return_policy = idx % 2 === 0 ? "7 Days Easy Replacement" : "10 Days Returnable";

            productsToInsert.push({
                name: p.name,
                brand: p.brand,
                category: cat,
                description,
                price: p.price,
                old_price: p.old_price,
                discount,
                rating,
                review_count,
                stock,
                warranty,
                delivery_time,
                return_policy,
                specifications,
                image_url: p.image_url
            });
        });
    });

    // Helper function to insert sequentially
    let pIdx = 0;
    function insertNextProduct() {
        if (pIdx >= productsToInsert.length) {
            console.log("Seeding Addresses, Reviews and Orders sequentially...");
            seedOtherData();
            return;
        }

        const p = productsToInsert[pIdx];
        db.run(`
            INSERT INTO products (name, brand, category, description, price, old_price, discount, rating, review_count, stock, warranty, delivery_time, return_policy, specifications, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [p.name, p.brand, p.category, p.description, p.price, p.old_price, p.discount, p.rating, p.review_count, p.stock, p.warranty, p.delivery_time, p.return_policy, p.specifications, p.image_url], function(err) {
            if (err) {
                console.error("Error inserting product:", err);
            } else {
                insertedProductIds.push(this.lastID);
            }
            pIdx++;
            insertNextProduct();
        });
    }

    // Start product insertions
    insertNextProduct();

    function seedOtherData() {
        // 1. Seed Addresses: 5 addresses for each of the 20 normal users (User IDs 2 to 21)
        for (let userId = 2; userId <= 21; userId++) {
            const userName = userNames[userId - 2];
            // Use plain db.run to avoid prepared statement finalized issues
            db.run(`INSERT INTO addresses (user_id, full_name, phone, house_no, apartment, street, area, landmark, city, district, state, country, pincode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, `${userName} (Home)`, '9876543210', '12-4-210', 'Apt 4B', 'Temple Road', 'Kompally', 'Near Bus Stop', 'Hyderabad', 'Medchal', 'Telangana', 'India', '500014', 1]);
            db.run(`INSERT INTO addresses (user_id, full_name, phone, house_no, apartment, street, area, landmark, city, district, state, country, pincode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, `${userName} (Office)`, '9876543211', 'Block-C, Tech Park', 'Floor 5', 'Hitech City Road', 'Madhapur', 'Opp Cyber Towers', 'Hyderabad', 'Rangareddy', 'Telangana', 'India', '500081', 0]);
            db.run(`INSERT INTO addresses (user_id, full_name, phone, house_no, apartment, street, area, landmark, city, district, state, country, pincode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, `${userName} (Parents)`, '9876543212', 'Plot 45', 'Anurag Nivas', 'Station Road', 'Alwal', 'Near Shiva Temple', 'Hyderabad', 'Medchal', 'Telangana', 'India', '500010', 0]);
            db.run(`INSERT INTO addresses (user_id, full_name, phone, house_no, apartment, street, area, landmark, city, district, state, country, pincode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, `${userName} (Vacation)`, '9876543213', 'Villa 9', 'Palm Meadows', 'Beach Road', 'Gachibowli', 'Near ISB', 'Hyderabad', 'Rangareddy', 'Telangana', 'India', '500032', 0]);
            db.run(`INSERT INTO addresses (user_id, full_name, phone, house_no, apartment, street, area, landmark, city, district, state, country, pincode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, `${userName} (Alternate)`, '9876543214', 'H.No 4-89/1', 'Green View', 'Pipeline Road', 'Jeedimetla', 'Near Police Station', 'Hyderabad', 'Medchal', 'Telangana', 'India', '500055', 0]);
        }
        console.log("Seeded 100 Addresses (5 per User).");

        // 2. Seed Reviews: 20 reviews for each of the 100 products
        const reviewTexts = [
            "Superb build quality! Works flawlessly and feels premium.",
            "Average product, does the job but packaging was slightly damaged.",
            "Best purchase ever! Totally worth the price.",
            "Not what I expected. The features are average and battery drops fast.",
            "Really great value for money. Highly recommended!",
            "Excellent design and fits nicely into my daily setup.",
            "Decent quality, although support could be slightly better.",
            "Highly durable! I have been using it for a month now and no issues.",
            "Stunning performance! Exceeded all my expectations.",
            "Satisfactory experience. Neither too great nor too bad.",
            "Nice, but there is room for minor design improvements.",
            "Absolutely love it. Buy without hesitating!",
            "Outstanding brand reliability. Extremely satisfied.",
            "Very simple to use, clean UI/UX feel.",
            "The product arrived early, completely authentic and working.",
            "Amazing battery and excellent durability. Solid product.",
            "Great customer service, they replaced the item quickly.",
            "Very practical and sleek looking.",
            "Expensive but holds a premium status. Love it.",
            "Exactly as described in description. Satisfied customer!"
        ];

        insertedProductIds.forEach(prodId => {
            for (let rIdx = 0; rIdx < 20; rIdx++) {
                const uName = userNames[rIdx % userNames.length];
                const rating = rIdx % 5 === 0 ? 3 : (rIdx % 4 === 0 ? 4 : 5);
                const reviewText = reviewTexts[rIdx];
                const helpful = Math.floor(Math.random() * 30);
                const date = `July ${Math.floor(Math.random() * 15) + 1}, 2026`;
                
                db.run(`INSERT INTO reviews (product_id, user_id, reviewer_name, rating, review_text, helpful_count, date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [prodId, (rIdx % 20) + 2, uName, rating, reviewText, helpful, date]);
            }
        });
        console.log("Seeded 2000 Reviews (20 reviews per Product).");

        // 3. Seed 50 Orders with tracking, status, payment records
        const statuses = ['Delivered', 'Processing', 'Shipped', 'Cancelled', 'Returned'];

        for (let oIdx = 1; oIdx <= 50; oIdx++) {
            const uId = 2 + (oIdx % 20); 
            const total = 500 + Math.floor(Math.random() * 5000);
            const status = statuses[oIdx % statuses.length];
            const payMethod = ['UPI', 'Credit Card', 'Cash On Delivery', 'Net Banking'][oIdx % 4];
            const address = `Krishna K, 12-4-210, Temple Road, Kompally, Hyderabad, Telangana, 500014`;
            const delivery = `July ${Math.floor(Math.random() * 10) + 20}, 2026`;
            const tracking = `SE${100000000 + oIdx}`;
            const invoice = `INV-2026-${10000 + oIdx}`;

            db.run(`
                INSERT INTO orders (user_id, total_amount, status, payment_method, shipping_address, expected_delivery, tracking_number, invoice_number)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [uId, total, status, payMethod, address, delivery, tracking, invoice], function(err) {
                if (err) {
                    console.error("Error creating order:", err);
                    return;
                }
                const newOrderId = this.lastID;
                
                // Add 1 random order item
                const prod1 = insertedProductIds[Math.floor(Math.random() * insertedProductIds.length)];
                db.run(`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
                    [newOrderId, prod1, 1, total]);

                // Add payment record
                const payStatus = status === 'Cancelled' ? 'Refunded' : (payMethod === 'Cash On Delivery' ? 'Pending' : 'Success');
                const txId = `TXN${9000000000 + oIdx}`;
                db.run(`INSERT INTO payments (order_id, payment_method, payment_status, transaction_id) VALUES (?, ?, ?, ?)`,
                    [newOrderId, payMethod, payStatus, txId]);
            });
        }
        console.log("Seeded 50 Orders, Order Items, and Payment records successfully.");
    }
}

module.exports = db;

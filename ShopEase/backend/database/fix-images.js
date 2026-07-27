const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'shopease.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`UPDATE products SET image_url = 'https://placehold.co/500x500/2563eb/ffffff/png?text=' || REPLACE(name, ' ', '+') WHERE image_url LIKE '%unsplash%'`, function(err) {
        if (err) {
            console.error(err);
        } else {
            console.log(`Updated ${this.changes} product images.`);
        }
    });
});

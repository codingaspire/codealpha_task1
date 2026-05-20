const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ecommerce.db');
const db = new sqlite3.Database(dbPath);

const initDatabase = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip_code TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      stock INTEGER NOT NULL DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_percent REAL NOT NULL,
      is_active INTEGER DEFAULT 1,
      max_uses INTEGER DEFAULT 10,
      used_count INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      address_id INTEGER,
      coupon_code TEXT,
      discount_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      final_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (address_id) REFERENCES addresses(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`);

    const sampleCoupons = [
      { code: 'CODEALPHA', discount_percent: 15, max_uses: 100 }
    ];

    const checkCoupons = db.prepare('SELECT COUNT(*) as count FROM coupons');
    checkCoupons.get((err, row) => {
      if (err) {
        console.error('Error checking coupons:', err);
        return;
      }
      
      if (row.count === 0) {
        const insertCoupon = db.prepare('INSERT INTO coupons (code, discount_percent, max_uses) VALUES (?, ?, ?)');
        sampleCoupons.forEach(coupon => {
          insertCoupon.run(coupon.code, coupon.discount_percent, coupon.max_uses);
        });
        insertCoupon.finalize();
        console.log('Sample coupons inserted successfully');
      }
    });
    checkCoupons.finalize();

    const sampleProducts = [
      {
        name: 'Wireless Headphones',
        description: 'Premium noise-cancelling wireless headphones with 30-hour battery life.',
        price: 199.99,
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
        stock: 50
      },
      {
        name: 'Smart Watch',
        description: 'Advanced smartwatch with heart rate monitor and GPS.',
        price: 299.99,
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
        stock: 30
      },
      {
        name: 'Leather Jacket',
        description: 'Genuine leather jacket, perfect for all seasons.',
        price: 149.99,
        image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=300&fit=crop',
        stock: 25
      },
      {
        name: 'Bluetooth Speaker',
        description: 'Portable Bluetooth speaker with 20W output and waterproof design.',
        price: 79.99,
        image_url: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&h=300&fit=crop',
        stock: 100
      },
      {
        name: 'Running Shoes',
        description: 'Comfortable running shoes with excellent cushioning.',
        price: 119.99,
        image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop',
        stock: 40
      },
      {
        name: 'Mechanical Keyboard',
        description: 'RGB mechanical keyboard with tactile switches.',
        price: 89.99,
        image_url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400&h=300&fit=crop',
        stock: 60
      }
    ];

    const checkProducts = db.prepare('SELECT COUNT(*) as count FROM products');
    checkProducts.get((err, row) => {
      if (err) {
        console.error('Error checking products:', err);
        return;
      }
      
      if (row.count === 0) {
        const insertProduct = db.prepare('INSERT INTO products (name, description, price, image_url, stock) VALUES (?, ?, ?, ?, ?)');
        sampleProducts.forEach(product => {
          insertProduct.run(product.name, product.description, product.price, product.image_url, product.stock);
        });
        insertProduct.finalize();
        console.log('Sample products inserted successfully');
      }
    });
    checkProducts.finalize();
  });
};

module.exports = { db, initDatabase };

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { db, initDatabase } = require('./database');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'your-secret-key-here-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

initDatabase();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/product.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'product.html'));
});

app.get('/cart.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'cart.html'));
});

app.get('/auth.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'auth.html'));
});

app.get('/checkout.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
});

app.get('/checkout-final.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'checkout-final.html'));
});

app.get('/orders.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'orders.html'));
});

app.get('/order-success.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'order-success.html'));
});

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  
  db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', 
    [name, email, hashedPassword], 
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      req.session.userId = this.lastID;
      req.session.name = name;
      res.json({ success: true, user: { id: this.lastID, name, email } });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user.id;
    req.session.name = user.name;
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

app.get('/api/user', (req, res) => {
  if (!req.session.userId) {
    return res.json({ loggedIn: false });
  }
  res.json({ 
    loggedIn: true, 
    user: { 
      id: req.session.userId, 
      name: req.session.name 
    } 
  });
});

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
    res.json(products);
  });
});

app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  
  db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch product' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  });
});

app.post('/api/addresses', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const { fullName, addressLine1, addressLine2, city, state, zipCode, phone } = req.body;
  
  if (!fullName || !addressLine1 || !city || !state || !zipCode || !phone) {
    return res.status(400).json({ error: 'All required fields are missing' });
  }

  db.run('INSERT INTO addresses (user_id, full_name, address_line1, address_line2, city, state, zip_code, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    [req.session.userId, fullName, addressLine1, addressLine2 || null, city, state, zipCode, phone], 
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save address' });
      }
      res.json({ success: true, addressId: this.lastID });
    }
  );
});

app.get('/api/addresses', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  db.all('SELECT * FROM addresses WHERE user_id = ? ORDER BY created_at DESC', [req.session.userId], (err, addresses) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch addresses' });
    }
    res.json(addresses);
  });
});

app.post('/api/coupons/validate', (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Coupon code is required' });
  }

  db.get('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code.toUpperCase()], (err, coupon) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to validate coupon' });
    }
    
    if (!coupon) {
      return res.status(400).json({ error: 'Invalid coupon code' });
    }
    
    if (coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }
    
    res.json({ 
      valid: true, 
      discountPercent: coupon.discount_percent,
      code: coupon.code 
    });
  });
});

app.post('/api/orders', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const { cartItems, addressId, couponCode } = req.body;
  
  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  if (!addressId) {
    return res.status(400).json({ error: 'Address is required' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    let totalAmount = 0;
    let discountAmount = 0;
    const productUpdates = [];
    const orderItems = [];
    
    const checkProducts = cartItems.map(item => {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM products WHERE id = ?', [item.productId], (err, product) => {
          if (err) return reject(err);
          if (!product) return reject(new Error('Product not found'));
          if (product.stock < item.quantity) return reject(new Error(`Insufficient stock for ${product.name}`));
          
          totalAmount += product.price * item.quantity;
          productUpdates.push({ id: product.id, stock: product.stock - item.quantity });
          orderItems.push({ productId: product.id, quantity: item.quantity, price: product.price });
          resolve();
        });
      });
    });
    
    Promise.all(checkProducts)
      .then(() => {
        return new Promise((resolve, reject) => {
          if (couponCode) {
            db.get('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [couponCode.toUpperCase()], (err, coupon) => {
              if (err) return reject(err);
              if (coupon && coupon.used_count < coupon.max_uses) {
                discountAmount = (totalAmount * coupon.discount_percent) / 100;
                db.run('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id], (err) => {
                  if (err) return reject(err);
                  resolve();
                });
              } else {
                resolve();
              }
            });
          } else {
            resolve();
          }
        });
      })
      .then(() => {
        const finalAmount = totalAmount - discountAmount;
        
        db.run('INSERT INTO orders (user_id, address_id, coupon_code, discount_amount, total_amount, final_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)', 
          [req.session.userId, addressId, couponCode || null, discountAmount, totalAmount, finalAmount, 'processing'], 
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to create order' });
            }
            
            const orderId = this.lastID;
            
            const insertOrderItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
            const updateProduct = db.prepare('UPDATE products SET stock = ? WHERE id = ?');
            
            orderItems.forEach(item => {
              insertOrderItem.run(orderId, item.productId, item.quantity, item.price);
            });
            
            productUpdates.forEach(update => {
              updateProduct.run(update.stock, update.id);
            });
            
            insertOrderItem.finalize();
            updateProduct.finalize();
            
            db.run('COMMIT', (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to complete order' });
              }
              res.json({ success: true, orderId, totalAmount, discountAmount, finalAmount });
            });
          }
        );
      })
      .catch(err => {
        db.run('ROLLBACK');
        res.status(400).json({ error: err.message });
      });
  });
});

app.get('/api/orders', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const query = `
    SELECT o.*, a.full_name, a.address_line1, a.address_line2, a.city, a.state, a.zip_code, a.phone
    FROM orders o
    LEFT JOIN addresses a ON o.address_id = a.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `;
  
  db.all(query, [req.session.userId], (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }
    
    const orderIds = orders.map(o => o.id);
    if (orderIds.length === 0) {
      return res.json(orders);
    }
    
    const placeholders = orderIds.map(() => '?').join(',');
    db.all(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`, orderIds, (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch order items' });
      }
      
      const ordersWithItems = orders.map(order => ({
        ...order,
        items: items.filter(item => item.order_id === order.id)
      }));
      
      res.json(ordersWithItems);
    });
  });
});

app.post('/api/orders/:id/cancel', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const orderId = req.params.id;
  
  db.get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, req.session.userId], (err, order) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch order' });
    }
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.status !== 'processing' && order.status !== 'pending') {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId], (err, items) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to fetch order items' });
        }
        
        const updateStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
        
        items.forEach(item => {
          updateStock.run(item.quantity, item.product_id);
        });
        
        updateStock.finalize();
        
        db.run('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', orderId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to cancel order' });
          }
          
          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to cancel order' });
            }
            res.json({ success: true });
          });
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

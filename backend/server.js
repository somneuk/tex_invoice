require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { db, dbRun, dbGet, dbAll } = require('./database');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_billing_app_jwt_key_2026';

// Enable CORS and parsing of JSON/URL-encoded bodies
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Multer storage configuration for bill images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'bill-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpeg, png, gif, webp) or PDFs are allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper to get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
};

// ==========================================
// 1. AUTHENTICATION & LOGIN LOGS ENDPOINTS
// ==========================================

// Register a new user
app.post('/api/auth/register', async (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingUser = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const result = await dbRun(
      'INSERT INTO users (username, password_hash, name) VALUES (?, ?, ?)',
      [username, passwordHash, name]
    );

    res.status(201).json({ message: 'User registered successfully', userId: result.id });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// Login and record log
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      // Record failed login
      await dbRun(
        'INSERT INTO login_logs (username, ip_address, user_agent, status) VALUES (?, ?, ?, ?)',
        [username, ipAddress, userAgent, 'FAILED']
      );
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      // Record failed login
      await dbRun(
        'INSERT INTO login_logs (user_id, username, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?)',
        [user.id, username, ipAddress, userAgent, 'FAILED']
      );
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Record successful login
    await dbRun(
      'INSERT INTO login_logs (user_id, username, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?)',
      [user.id, username, ipAddress, userAgent, 'SUCCESS']
    );

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// Get current user profile
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, username, name, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user access logs
app.get('/api/auth/logs', authMiddleware, async (req, res) => {
  try {
    const logs = await dbAll('SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT 200');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving logs', error: error.message });
  }
});

// ==========================================
// 2. CUSTOMERS ENDPOINTS (CRUD)
// ==========================================

// Get all customers
app.get('/api/customers', authMiddleware, async (req, res) => {
  try {
    const customers = await dbAll('SELECT * FROM customers ORDER BY name ASC');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving customers', error: error.message });
  }
});

// Add a new customer
app.post('/api/customers', authMiddleware, async (req, res) => {
  const { name, tax_id, phone, email, address } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Customer name is required' });
  }

  try {
    const result = await dbRun(
      'INSERT INTO customers (name, tax_id, phone, email, address) VALUES (?, ?, ?, ?, ?)',
      [name, tax_id, phone, email, address]
    );
    const newCustomer = await dbGet('SELECT * FROM customers WHERE id = ?', [result.id]);
    res.status(201).json(newCustomer);
  } catch (error) {
    res.status(500).json({ message: 'Server error adding customer', error: error.message });
  }
});

// Update customer details
app.put('/api/customers/:id', authMiddleware, async (req, res) => {
  const { name, tax_id, phone, email, address } = req.body;
  const { id } = req.params;
  if (!name) {
    return res.status(400).json({ message: 'Customer name is required' });
  }

  try {
    const existing = await dbGet('SELECT id FROM customers WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await dbRun(
      'UPDATE customers SET name = ?, tax_id = ?, phone = ?, email = ?, address = ? WHERE id = ?',
      [name, tax_id, phone, email, address, id]
    );

    const updated = await dbGet('SELECT * FROM customers WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating customer', error: error.message });
  }
});

// Delete customer
app.delete('/api/customers/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await dbGet('SELECT id FROM customers WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check if customer is used in any invoice
    const usedInInvoice = await dbGet('SELECT id FROM invoices WHERE customer_id = ? LIMIT 1', [id]);
    if (usedInInvoice) {
      return res.status(400).json({
        message: 'Cannot delete customer: they are linked to existing bills. Please delete those bills first.'
      });
    }

    await dbRun('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting customer', error: error.message });
  }
});

// ==========================================
// 3. INVOICES / BILLS ENDPOINTS (CRUD)
// ==========================================

// Get all invoices with filter options
app.get('/api/invoices', authMiddleware, async (req, res) => {
  const { type, startDate, endDate } = req.query;
  let sql = `
    SELECT i.*, c.name as customer_name_db, c.tax_id as customer_tax_id
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (type) {
    sql += ' AND i.type = ?';
    params.push(type);
  }

  if (startDate) {
    sql += ' AND i.date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    sql += ' AND i.date <= ?';
    params.push(endDate);
  }

  sql += ' ORDER BY i.date DESC, i.id DESC';

  try {
    const invoices = await dbAll(sql, params);
    // Format response to fallback customer_name if customer_id wasn't set
    const formatted = invoices.map(inv => ({
      ...inv,
      customer_name: inv.customer_name_db || inv.customer_name || 'N/A'
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving invoices', error: error.message });
  }
});

// Add an invoice (with optional file upload)
app.post('/api/invoices', authMiddleware, upload.single('image'), async (req, res) => {
  const {
    invoice_number,
    type,
    date,
    customer_id,
    customer_name,
    amount,
    vat,
    grand_total,
    notes
  } = req.body;

  if (!invoice_number || !type || !date || amount === undefined) {
    // If a file was uploaded but validation failed, clean it up
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ message: 'Required fields: invoice_number, type, date, amount' });
  }

  // File URL
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const parsedAmount = parseFloat(amount);
  const parsedVat = parseFloat(vat) || 0;
  const parsedGrandTotal = parseFloat(grand_total) || (parsedAmount + parsedVat);
  const custId = customer_id ? parseInt(customer_id) : null;

  try {
    const result = await dbRun(
      `INSERT INTO invoices (
        invoice_number, type, date, customer_id, customer_name,
        amount, vat, grand_total, image_url, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_number,
        type,
        date,
        custId,
        customer_name || null,
        parsedAmount,
        parsedVat,
        parsedGrandTotal,
        image_url,
        notes || '',
        req.user.id
      ]
    );

    const newInvoice = await dbGet('SELECT * FROM invoices WHERE id = ?', [result.id]);
    res.status(201).json(newInvoice);
  } catch (error) {
    // Clean up uploaded image on database error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error creating invoice', error: error.message });
  }
});

// Update invoice
app.put('/api/invoices/:id', authMiddleware, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const {
    invoice_number,
    type,
    date,
    customer_id,
    customer_name,
    amount,
    vat,
    grand_total,
    notes,
    keep_existing_image
  } = req.body;

  if (!invoice_number || !type || !date || amount === undefined) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ message: 'Required fields missing' });
  }

  try {
    const existing = await dbGet('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Invoice not found' });
    }

    let image_url = existing.image_url;

    if (req.file) {
      // Delete old file if it exists
      if (existing.image_url) {
        const oldPath = path.join(__dirname, existing.image_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      image_url = `/uploads/${req.file.filename}`;
    } else if (keep_existing_image === 'false' || keep_existing_image === false) {
      // Delete old file if requested to remove image
      if (existing.image_url) {
        const oldPath = path.join(__dirname, existing.image_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      image_url = null;
    }

    const parsedAmount = parseFloat(amount);
    const parsedVat = parseFloat(vat) || 0;
    const parsedGrandTotal = parseFloat(grand_total) || (parsedAmount + parsedVat);
    const custId = customer_id ? parseInt(customer_id) : null;

    await dbRun(
      `UPDATE invoices SET
        invoice_number = ?, type = ?, date = ?, customer_id = ?, customer_name = ?,
        amount = ?, vat = ?, grand_total = ?, image_url = ?, notes = ?
      WHERE id = ?`,
      [
        invoice_number,
        type,
        date,
        custId,
        customer_name || null,
        parsedAmount,
        parsedVat,
        parsedGrandTotal,
        image_url,
        notes || '',
        id
      ]
    );

    const updated = await dbGet('SELECT * FROM invoices WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Server error updating invoice', error: error.message });
  }
});

// Delete invoice
app.delete('/api/invoices/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await dbGet('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Delete associated image file
    if (existing.image_url) {
      const oldPath = path.join(__dirname, existing.image_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await dbRun('DELETE FROM invoices WHERE id = ?', [id]);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting invoice', error: error.message });
  }
});

// ==========================================
// 4. DASHBOARD ENDPOINTS
// ==========================================

app.get('/api/dashboard', authMiddleware, async (req, res) => {
  const { period } = req.query; // 'daily', 'monthly', 'yearly' (default: 'monthly')
  const selectPeriod = period || 'monthly';

  try {
    // 1. Total summary stats
    const summary = await dbGet(`
      SELECT 
        SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as sales_amount,
        SUM(CASE WHEN type = 'sale' THEN vat ELSE 0 END) as sales_vat,
        SUM(CASE WHEN type = 'sale' THEN grand_total ELSE 0 END) as sales_total,
        SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) as purchases_amount,
        SUM(CASE WHEN type = 'purchase' THEN vat ELSE 0 END) as purchases_vat,
        SUM(CASE WHEN type = 'purchase' THEN grand_total ELSE 0 END) as purchases_total
      FROM invoices
    `);

    const stats = {
      sales: {
        amount: summary.sales_amount || 0,
        vat: summary.sales_vat || 0,
        total: summary.sales_total || 0
      },
      purchases: {
        amount: summary.purchases_amount || 0,
        vat: summary.purchases_vat || 0,
        total: summary.purchases_total || 0
      },
      netAmount: (summary.sales_amount || 0) - (summary.purchases_amount || 0),
      netTotal: (summary.sales_total || 0) - (summary.purchases_total || 0)
    };

    // 2. Periodic chart details
    let chartQuery = '';
    let chartParams = [];

    if (selectPeriod === 'daily') {
      // Last 30 days of transactions
      chartQuery = `
        SELECT 
          date as label,
          SUM(CASE WHEN type = 'sale' THEN grand_total ELSE 0 END) as sales,
          SUM(CASE WHEN type = 'purchase' THEN grand_total ELSE 0 END) as purchases
        FROM invoices
        WHERE date >= date('now', '-30 days')
        GROUP BY date
        ORDER BY date ASC
      `;
    } else if (selectPeriod === 'yearly') {
      // Multi-year breakdown
      chartQuery = `
        SELECT 
          strftime('%Y', date) as label,
          SUM(CASE WHEN type = 'sale' THEN grand_total ELSE 0 END) as sales,
          SUM(CASE WHEN type = 'purchase' THEN grand_total ELSE 0 END) as purchases
        FROM invoices
        GROUP BY label
        ORDER BY label ASC
      `;
    } else {
      // 'monthly' default - Current calendar year, broken by month
      chartQuery = `
        SELECT 
          strftime('%Y-%m', date) as label,
          SUM(CASE WHEN type = 'sale' THEN grand_total ELSE 0 END) as sales,
          SUM(CASE WHEN type = 'purchase' THEN grand_total ELSE 0 END) as purchases
        FROM invoices
        WHERE strftime('%Y', date) = strftime('%Y', 'now')
        GROUP BY label
        ORDER BY label ASC
      `;
    }

    const chartData = await dbAll(chartQuery, chartParams);

    res.json({
      stats,
      chartData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error generating dashboard data', error: error.message });
  }
});

const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

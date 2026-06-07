const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Ensure db directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // 1. Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Login Logs Table
    db.run(`CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT, -- 'SUCCESS', 'FAILED'
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. Customers Table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tax_id TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 4. Invoices Table
    db.run(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL,
      type TEXT NOT NULL, -- 'purchase' or 'sale'
      date TEXT NOT NULL, -- 'YYYY-MM-DD'
      customer_id INTEGER,
      customer_name TEXT, -- Fallback / Display name
      amount REAL NOT NULL,
      vat REAL NOT NULL,
      grand_total REAL NOT NULL,
      image_url TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    )`);

    // Seed initial admin user if not exists
    db.get("SELECT id FROM users WHERE username = ?", ['admin'], (err, row) => {
      if (err) {
        console.error('Error checking user table', err.message);
        return;
      }
      if (!row) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync('admin123', salt);
        db.run(
          "INSERT INTO users (username, password_hash, name) VALUES (?, ?, ?)",
          ['admin', hash, 'Administrator'],
          (err2) => {
            if (err2) {
              console.error('Error seeding admin user', err2.message);
            } else {
              console.log('Seeded initial admin user (username: admin, password: admin123)');
            }
          }
        );
      }
    });
  });
}

// Wrapper utility functions for database queries (Promise-based)
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll
};

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Seed helper functions
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
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

async function seedData() {
  console.log('Seeding mock data for testing...');

  try {
    // 1. Check if database is initialized (admin user should be there)
    const admin = await dbGet('SELECT id FROM users WHERE username = ?', ['admin']);
    if (!admin) {
      console.log('Database not fully initialized. Running setup first...');
      return;
    }
    const adminId = admin.id;

    // Clear existing tables to prevent duplicate seed running (optional, but good for clean seed)
    await dbRun('DELETE FROM invoices');
    await dbRun('DELETE FROM customers');
    await dbRun('DELETE FROM login_logs');

    // 2. Insert mock customers
    const cust1 = await dbRun(
      'INSERT INTO customers (name, tax_id, phone, email, address) VALUES (?, ?, ?, ?, ?)',
      ['บริษัท เจริญโภคภัณฑ์ พัฒนา จำกัด', '0105560123456', '02-123-4567', 'contact@cp-dev.co.th', '313 อาคาร ซี.พี. ทาวเวอร์ ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพมหานคร']
    );

    const cust2 = await dbRun(
      'INSERT INTO customers (name, tax_id, phone, email, address) VALUES (?, ?, ?, ?, ?)',
      ['ห้างหุ้นส่วนจำกัด สมศักดิ์ การค้า', '0303561009876', '035-241-999', 'somsak.trade@gmail.com', '99 หมู่ 4 ตำบลคลองสวนพลู อำเภอพระนครศรีอยุธยา จังหวัดพระนครศรีอยุธยา']
    );

    const cust3 = await dbRun(
      'INSERT INTO customers (name, tax_id, phone, email, address) VALUES (?, ?, ?, ?, ?)',
      ['บริษัท สยาม โกลบอล เทรดดิ้ง จำกัด', '0105559098765', '02-987-6543', 'info@siamglobal.com', '123/45 ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพมหานคร']
    );

    const cust4 = await dbRun(
      'INSERT INTO customers (name, tax_id, phone, email, address) VALUES (?, ?, ?, ?, ?)',
      ['บริษัท ทีโอที เทเลคอมมูนิเคชั่น จำกัด', '0105545009999', '02-500-1111', 'billing@tot.co.th', '89/2 ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร']
    );

    console.log('Seeded customers successfully.');

    // 3. Insert mock login logs
    await dbRun(
      'INSERT INTO login_logs (user_id, username, ip_address, user_agent, status, timestamp) VALUES (?, ?, ?, ?, ?, datetime("now", "-1 hours"))',
      [adminId, 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0', 'SUCCESS']
    );
    await dbRun(
      'INSERT INTO login_logs (username, ip_address, user_agent, status, timestamp) VALUES (?, ?, ?, ?, datetime("now", "-2 hours"))',
      ['admin_failed', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0', 'FAILED']
    );

    // 4. Insert mock invoices (Sales and Purchases)
    // We will seed monthly data for 2026 (Jan - Jun)
    const monthlyData = [
      { month: '01', sales: 45000, purchases: 20000 },
      { month: '02', sales: 52000, purchases: 25000 },
      { month: '03', sales: 38000, purchases: 18000 },
      { month: '04', sales: 61000, purchases: 28000 },
      { month: '05', sales: 74000, purchases: 32000 },
      { month: '06', sales: 88000, purchases: 41000 }
    ];

    for (const data of monthlyData) {
      const year = '2026';
      const dateSales = `${year}-${data.month}-12`;
      const datePurchases = `${year}-${data.month}-18`;

      // Sales Invoice
      const sAmount = data.sales;
      const sVat = Math.round(sAmount * 0.07 * 100) / 100;
      const sTotal = sAmount + sVat;
      await dbRun(
        `INSERT INTO invoices (
          invoice_number, type, date, customer_id, customer_name,
          amount, vat, grand_total, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(?, "+12 hours"))`,
        [
          `INV-2026${data.month}01`, 'sale', dateSales, cust1, 'บริษัท เจริญโภคภัณฑ์ พัฒนา จำกัด',
          sAmount, sVat, sTotal, `บิลขายสำหรับประจำเดือน ${data.month}`, adminId, dateSales
        ]
      );

      // Purchase Invoice
      const pAmount = data.purchases;
      const pVat = Math.round(pAmount * 0.07 * 100) / 100;
      const pTotal = pAmount + pVat;
      await dbRun(
        `INSERT INTO invoices (
          invoice_number, type, date, customer_id, customer_name,
          amount, vat, grand_total, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(?, "+15 hours"))`,
        [
          `PUR-2026${data.month}01`, 'purchase', datePurchases, cust3, 'บริษัท สยาม โกลบอล เทรดดิ้ง จำกัด',
          pAmount, pVat, pTotal, `บิลซื้อวัตถุดิบและอุปกรณ์เดือน ${data.month}`, adminId, datePurchases
        ]
      );
    }

    // 5. Seed Daily data for the last 15 days of the current date (assume current date is June 7, 2026)
    // We will generate daily sales and purchases
    for (let i = 15; i >= 0; i--) {
      // Calculate date
      const date = new Date('2026-06-07');
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Add a sale (on even days)
      if (i % 2 === 0) {
        const amount = 3000 + (i * 250);
        const vat = Math.round(amount * 0.07 * 100) / 100;
        const total = amount + vat;
        await dbRun(
          `INSERT INTO invoices (
            invoice_number, type, date, customer_id, customer_name,
            amount, vat, grand_total, notes, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(?, "+10 hours"))`,
          [
            `INV-202606-${100 - i}`, 'sale', dateStr, cust2, 'ห้างหุ้นส่วนจำกัด สมศักดิ์ การค้า',
            amount, vat, total, `บิลขายประจำวัน ${dateStr}`, adminId, dateStr
          ]
        );
      }

      // Add a purchase (every 3 days)
      if (i % 3 === 0) {
        const amount = 1500 + (i * 180);
        const vat = Math.round(amount * 0.07 * 100) / 100;
        const total = amount + vat;
        await dbRun(
          `INSERT INTO invoices (
            invoice_number, type, date, customer_id, customer_name,
            amount, vat, grand_total, notes, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(?, "+16 hours"))`,
          [
            `PUR-202606-${200 - i}`, 'purchase', dateStr, cust4, 'บริษัท ทีโอที เทเลคอมมูนิเคชั่น จำกัด',
            amount, vat, total, `ใบเสร็จค่าใช้จ่ายอินเทอร์เน็ตและสาธารณูปโภคประจำวัน ${dateStr}`, adminId, dateStr
          ]
        );
      }
    }

    console.log('Seeded invoices successfully.');
    console.log('Finished seeding database.');
  } catch (err) {
    console.error('Error seeding data:', err.message);
  } finally {
    db.close();
  }
}

seedData();

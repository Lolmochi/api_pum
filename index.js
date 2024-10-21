const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// การเชื่อมต่อฐานข้อมูล MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gas_station_loyalty'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database');
});

// Setup for multer
const uploadPath = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Function to generate a random 10-character alphanumeric reward ID
function generateRewardId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let rewardId = '';
  for (let i = 0; i < 10; i++) {
    rewardId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rewardId;
}

// Create a new reward
app.post('/rewards', upload.single('image'), (req, res) => {
  const { reward_name, points_required, quantity, description } = req.body;
  const image = req.file ? req.file.filename : null;
  const reward_id = generateRewardId();  // Generate reward_id

  console.log('Request Body:', req.body);
  console.log('Uploaded File:', req.file);

  // Validate required fields
  if (!reward_name || !points_required || !quantity) {
    return res.status(400).json({ error: 'Please provide reward_name, points_required, and quantity' });
  }

  // Validate that points_required and quantity are numbers
  if (isNaN(points_required) || isNaN(quantity)) {
    return res.status(400).json({ error: 'Points required and quantity must be numbers' });
  }

  const query = 'INSERT INTO rewards (reward_id, reward_name, points_required, quantity, description, image) VALUES (?, ?, ?, ?, ?, ?)';
  const values = [reward_id, reward_name, points_required, quantity, description, image];

  console.log('Executing Query:', query, values);

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.status(201).json({
      message: 'Reward added successfully',
      reward_id,  // Include the generated reward_id
      reward_name,
      points_required,
      quantity,  // Include quantity in the response
      description,
      image
    });
  });
});

// Get all rewards
app.get('/rewards', (req, res) => {
  const query = 'SELECT * FROM rewards';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(200).json(results);
  });
});

// Delete a reward by reward_id
app.delete('/rewards/:id', (req, res) => {
  const rewardId = req.params.id;
  const query = 'DELETE FROM rewards WHERE reward_id = ?';

  db.query(query, [rewardId], (err, result) => {
    if (err) {
      console.error('Error deleting reward:', err);
      return res.status(500).json({ error: 'Error deleting reward' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }
    res.json({ message: 'Reward deleted successfully' });
  });
});

// Update a reward by reward_id
app.put('/rewards/:id', upload.single('image'), (req, res) => {
  const rewardId = req.params.id;
  const { reward_name, points_required, description, quantity } = req.body;
  const image = req.file ? req.file.filename : null;

  // Log request for debugging
  console.log('Request Body:', req.body);
  console.log('Uploaded File:', req.file);

  let query = 'UPDATE rewards SET reward_name = ?, points_required = ?, description = ?, quantity = ?';
  const values = [reward_name, points_required, description, quantity];

  if (image) {
    query += ', image = ?';
    values.push(image);
  }

  query += ' WHERE reward_id = ?';
  values.push(rewardId);

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Error updating reward' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }
    res.json({
      message: 'Reward updated successfully',
      reward_id: rewardId,
      reward_name,
      points_required,
      description,
      quantity,
      image
    });
  });
});


// Serve static images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/officers/login', (req, res) => {
  const { officer_id, password } = req.body;
  
  const query = `
    SELECT * FROM officers
    WHERE officer_id = ? AND password = ?
  `;
  
  db.query(query, [officer_id, password], (err, results) => {
    if (err) {
      console.error('Error during login:', err);  // Log ข้อผิดพลาดที่เกิดขึ้น
      res.status(500).json({ error: 'An error occurred during login' });
      return;
    }
    
    if (results.length === 0) {
      res.status(404).json({ error: 'Invalid officer ID or password' });
      return;
    }
    
    res.json({
      message: 'Login successful',
      employeeId: officer_id
    });
  });
});

app.post('/staff/login', (req, res) => {
  const { staff_id, password } = req.body;
  
  const query = `
    SELECT * FROM staff
    WHERE staff_id = ? AND password = ?
  `;
  
  db.query(query, [staff_id, password], (err, results) => {
    if (err) {
      console.error('Error during login:', err);  // Log ข้อผิดพลาดที่เกิดขึ้น
      res.status(500).json({ error: 'An error occurred during login' });
      return;
    }
    
    if (results.length === 0) {
      res.status(404).json({ error: 'Invalid staff ID or password' });
      return;
    }
    
    res.json({
      message: 'Login successful',
      employeeId: staff_id
    });
  });
});

// API สำหรับการ login ลูกค้า
app.post('/customer/login', (req, res) => { // แก้ไข URL ให้เป็น '/customer/login'
  const { customer_id, password } = req.body; // แก้ไขเป็น customer_id
  
  const query = `
    SELECT * FROM customers
    WHERE customer_id = ? AND password = ?
  `;
  
  db.query(query, [customer_id, password], (err, results) => {
    if (err) {
      console.error('Error during login:', err);  // Log ข้อผิดพลาดที่เกิดขึ้น
      res.status(500).json({ error: 'An error occurred during login' });
      return;
    }
    
    if (results.length === 0) {
      res.status(404).json({ error: 'Invalid customer ID or password' });
      return;
    }
    
    // คืนค่าข้อมูลลูกค้าที่เข้าสู่ระบบสำเร็จ
    res.json({
      message: 'Login successful',
      customerId: customer_id, // แก้ไขเป็น customerId
      customer: results[0] // คืนค่าข้อมูลลูกค้า (ถ้าต้องการ)
    });
  });
});

// API สำหรับดึงข้อมูลธุรกรรม
app.get('/transactions/:customer_id', (req, res) => {
  const customerId = parseInt(req.params.customer_id, 10); // แปลงเป็น int

  const query = `
    SELECT t.transaction_id, t.transaction_date, t.points_earned, f.fuel_type_name
    FROM transactions t
    JOIN fuel_types f ON t.fuel_type_id = f.fuel_type_id
    WHERE t.customer_id = ?
    ORDER BY t.transaction_date DESC
  `;

  db.query(query, [customerId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Database query error' });
    }

    res.json(results);
  });
});

// API สำหรับดึงข้อมูลลูกค้าตาม customer_id
app.get('/customer/:customer_id', (req, res) => {
  const { customer_id } = req.params;

  const query = `SELECT customer_id, points_balance, dividend FROM customers WHERE customer_id = ?`;
  db.query(query, [customer_id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'มีข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' });
    }

    if (results.length > 0) {
      res.json({ customer: results[0] });
    } else {
      res.status(404).json({ message: 'ไม่พบข้อมูลลูกค้า' });
    }
  });
});

// ฟังก์ชันสำหรับสร้างรหัสแบบสุ่ม
function generateRandomId(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// ฟังก์ชันสำหรับตรวจสอบความไม่ซ้ำของ redemption_id
function isRedemptionIdUnique(redemptionId) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT COUNT(*) AS count FROM redemptions WHERE redemption_id = ?';
    db.query(query, [redemptionId], (err, results) => {
      if (err) return reject(err);
      resolve(results[0].count === 0);
    });
  });
}

// Endpoint สำหรับแลกของรางวัล
app.post('/api/redeem', async (req, res) => {
  const { customer_id, reward_id, points_used } = req.body;

  // Log ข้อมูลที่ได้รับ
  console.log('Redeeming reward for customer:', customer_id);
  console.log('Reward ID:', reward_id);
  console.log('Points used:', points_used);

  // ตรวจสอบคะแนนของลูกค้า
  const checkPoints = 'SELECT points_balance FROM customers WHERE customer_id = ?';
  db.query(checkPoints, [customer_id], async (err, results) => {
    if (err) {
      console.error('Error checking points:', err);
      return res.status(500).json({ message: 'มีข้อผิดพลาดในการตรวจสอบคะแนน' });
    }
    console.log('Customer points:', results);

  // ตรวจสอบว่าข้อมูลที่จำเป็นถูกส่งมาหรือไม่
  if (!customer_id || !reward_id || !points_used || !quantity) {
    return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
  }

  // ตรวจสอบว่า quantity มากกว่า 0 หรือไม่
  const redeemQuantity = parseInt(quantity, 10);
  if (isNaN(redeemQuantity) || redeemQuantity <= 0) {
    return res.status(400).json({ message: 'จำนวนรางวัลไม่ถูกต้อง' });
  }

  // สร้าง redemption_id แบบสุ่มและตรวจสอบความไม่ซ้ำ
  let redemption_id;
  let isUnique = false;
  try {
    while (!isUnique) {
      redemption_id = generateRandomId(10);
      isUnique = await isRedemptionIdUnique(redemption_id);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างรหัสการแลก' });
  }

  const pointsUsedInt = parseInt(points_used, 10);
  if (isNaN(pointsUsedInt) || pointsUsedInt <= 0) {
    return res.status(400).json({ message: 'ค่าจำนวนแต้มไม่ถูกต้อง' });
  }

  // ตรวจสอบคะแนนของลูกค้า
  const checkPoints = 'SELECT points_balance FROM customers WHERE customer_id = ?';
  db.query(checkPoints, [customer_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'มีข้อผิดพลาดในการตรวจสอบคะแนน' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'ไม่พบลูกค้าดังกล่าว' });
    }

    const pointsBalance = parseInt(results[0].points_balance, 10);
    const totalPointsRequired = pointsUsedInt * redeemQuantity; // คะแนนที่ต้องใช้ทั้งหมด

    if (pointsBalance < totalPointsRequired) {
      return res.status(400).json({ message: 'คะแนนไม่เพียงพอ' });
    }

    // ตรวจสอบจำนวนสินค้าคงเหลือ
    const checkQuantity = 'SELECT quantity FROM rewards WHERE reward_id = ?';
    db.query(checkQuantity, [reward_id], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'มีข้อผิดพลาดในการตรวจสอบจำนวนสินค้า' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'ไม่พบรางวัลดังกล่าว' });
      }

      const availableQuantity = results[0].quantity;
      if (availableQuantity < redeemQuantity) {
        return res.status(400).json({ message: 'สินค้าคงเหลือไม่เพียงพอ' });
      }

      // อัปเดตจำนวนสินค้าคงเหลือ
      const updateQuantity = 'UPDATE rewards SET quantity = quantity - ? WHERE reward_id = ?';
      db.query(updateQuantity, [redeemQuantity, reward_id], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'ไม่สามารถอัปเดตจำนวนสินค้าได้' });
        }

        // อัปเดตคะแนนของลูกค้า
        const updateCustomerPoints = 'UPDATE customers SET points_balance = points_balance - ? WHERE customer_id = ?';
        db.query(updateCustomerPoints, [totalPointsRequired, customer_id], (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: 'ไม่สามารถอัพเดตคะแนนได้' });
          }

          // คำนวณและอัปเดตเงินปันผล
          const updatedDividend = (pointsBalance - totalPointsRequired) * 0.01; 
          const updateDividendQuery = 'UPDATE customers SET dividend = ? WHERE customer_id = ?';
          db.query(updateDividendQuery, [updatedDividend, customer_id], (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: 'ไม่สามารถอัปเดตเงินปันผลได้' });
            }

            // แทรกข้อมูลการแลกคะแนนเข้าสู่ตาราง redemptions
            const insertRedemption = `
              INSERT INTO redemptions (redemption_id, customer_id, reward_id, redemption_date, points_used, status, quantity)
              VALUES (?, ?, ?, NOW(), ?, 'pending', ?)
            `;
            db.query(insertRedemption, [redemption_id, customer_id, reward_id, totalPointsRequired, redeemQuantity], (err) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ message: 'ไม่สามารถบันทึกการแลกของรางวัลได้' });
              }
              res.status(200).json({ message: 'แลกของรางวัลสำเร็จ', redemption_id });
            });
            });
            });
          });
        });
      });
    });
  });

// API สำหรับดึงข้อมูลรางวัลที่ลูกค้าแลก
app.get('/redeemed/:customer_id', (req, res) => {
  const { customer_id } = req.params;

  const query = `
    SELECT 
      rd.redemption_id, 
      r.reward_id, 
      r.reward_name, 
      r.description, 
      rd.redemption_date, 
      rd.points_used,
      rd.quantity,  
      rd.status
    FROM redemptions rd
    JOIN rewards r ON rd.reward_id = r.reward_id
    WHERE rd.customer_id = ?
  `;

  db.query(query, [customer_id], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'มีข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' });
    }

    if (results.length > 0) {
      res.json(results);
    } else {
      res.status(404).json({ message: 'ไม่พบข้อมูลรางวัลที่แลก' });
    }
  });
});


// API สำหรับค้นหาธุรกรรม
app.get('/transactions', (req, res) => {
  const { query, customer_id, staff_id, officer_id, start_date, end_date } = req.query; 

  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const values = [];

  if (query) {
    sql += ' AND (transaction_id LIKE ? OR customer_id LIKE ?)';
    values.push(`%${query}%`, `%${query}%`);
  }

  if (customer_id) {
    sql += ' AND customer_id = ?';
    values.push(customer_id);
  }

  if (staff_id) {
    sql += ' AND staff_id = ?';
    values.push(staff_id);
  }

  if (officer_id) { 
    sql += ' AND officer_id = ?';
    values.push(officer_id);
  }

  if (start_date && end_date) {
    sql += ' AND transaction_date BETWEEN ? AND ?';
    values.push(start_date, end_date);
  }

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Database query error' });
    }
    res.json(results);
  });
});

// API สำหรับค้นหาธุรกรรม+แก้ไข
app.get('/search_transactions', (req, res) => {
  const { query, search_type, customer_id, staff_id, officer_id, start_date, end_date } = req.query; 

  // เริ่มต้นการสร้าง SQL query โดยทำการ JOIN กับตาราง customers
  let sql = `
    SELECT t.*, c.phone_number
    FROM transactions t
    LEFT JOIN customers c ON t.customer_id = c.customer_id
    WHERE 1=1
  `;
  const values = [];

  // การจัดการการค้นหาตาม search_type
  if (query) {
    if (search_type === 'transaction_id') {
      sql += ' AND t.transaction_id LIKE ?';
      values.push(`%${query}%`);
    } else if (search_type === 'customer_id') {
      sql += ' AND t.customer_id = ?'; // เปลี่ยนจาก LIKE เป็น =
      values.push(parseInt(query)); // แปลงเป็น integer หากจำเป็น
    } else if (search_type === 'phone_number') {
      sql += ' AND c.phone_number LIKE ?';
      values.push(`%${query}%`);
    } else {
      // หาก search_type ไม่ถูกต้อง ให้ค้นหาทั่วไป
      sql += ' AND (t.transaction_id LIKE ? OR t.customer_id = ?)';
      values.push(`%${query}%`, parseInt(query));
    }
  }

  // การเพิ่มเงื่อนไขเพิ่มเติมตามที่มีอยู่
  if (customer_id) {
    sql += ' AND t.customer_id = ?';
    values.push(parseInt(customer_id)); // แปลงเป็น integer หากจำเป็น
  }

  if (staff_id) {
    sql += ' AND t.staff_id = ?';
    values.push(parseInt(staff_id)); // แปลงเป็น integer หากจำเป็น
  }

  if (officer_id) { 
    sql += ' AND t.officer_id = ?';
    values.push(parseInt(officer_id)); // แปลงเป็น integer หากจำเป็น
  }

  if (start_date && end_date) {
    sql += ' AND t.transaction_date BETWEEN ? AND ?';
    values.push(start_date, end_date);
  }

  // รันคำสั่ง SQL
  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Database query error' });
    }
    res.json(results);
  });
});

// API for updating (editing) fuel_type and points_balance of a transaction, including officer_id
app.put('/transactions/:transaction_id', (req, res) => {
  const transactionId = req.params.transaction_id;
  const { fuel_type_id, points_earned, officer_id } = req.body;

  // SQL query for updating the transaction details
  const updateTransactionSql = `
    UPDATE transactions
    SET fuel_type_id = ?, points_earned = ?, modified_at = NOW(), officer_id = ?
    WHERE transaction_id = ?
  `;
  const updateTransactionValues = [fuel_type_id, points_earned, officer_id, transactionId];

  // Update transaction first
  db.query(updateTransactionSql, updateTransactionValues, (err, result) => {
    if (err) {
      console.error('Error executing transaction update query:', err);
      return res.status(500).json({ error: 'Database update error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Now calculate total points for the customer based on all their transactions
    const getCustomerIdSql = `
      SELECT customer_id FROM transactions WHERE transaction_id = ?
    `;

    db.query(getCustomerIdSql, [transactionId], (err, customerResult) => {
      if (err) {
        console.error('Error fetching customer_id:', err);
        return res.status(500).json({ error: 'Failed to fetch customer_id' });
      }

      const customer_id = customerResult[0]?.customer_id;

      const totalPointsSql = `
        SELECT SUM(points_earned) AS total_points FROM transactions WHERE customer_id = ?
      `;

      db.query(totalPointsSql, [customer_id], (err, pointsResult) => {
        if (err) {
          console.error('Error calculating total points:', err);
          return res.status(500).json({ error: 'Failed to calculate total points' });
        }

        const total_points = pointsResult[0]?.total_points || 0; // ใช้ 0 ถ้าไม่มีธุรกรรม

        const updatePointsSql = `
          UPDATE customers
          SET points_balance = ? -- Update points_balance directly
          WHERE customer_id = ?
        `;

        // คำนวณ dividend เป็น 1% ของ points_balance
        const dividend = total_points * 0.01;

        // Update points_balance และ dividend ในคำสั่งเดียว
        db.query(updatePointsSql, [total_points, customer_id], (err, updateResult) => {
          if (err) {
            console.error('Error updating points_balance:', err);
            return res.status(500).json({ error: 'Failed to update points_balance' });
          }

          // อัปเดต dividend ใน customers
          const updateDividendSql = `
            UPDATE customers
            SET dividend = ? -- Update dividend
            WHERE customer_id = ?
          `;

          db.query(updateDividendSql, [dividend, customer_id], (err, dividendResult) => {
            if (err) {
              console.error('Error updating dividend:', err);
              return res.status(500).json({ error: 'Failed to update dividend' });
            }

            res.json({ message: 'Transaction, points_balance, and dividend updated successfully', total_points: total_points, dividend: dividend });
          });
        });
      });
    });
  });
});


// API to get all fuel types
app.get('/fuel_types', (req, res) => {
  const sql = 'SELECT fuel_type_id, fuel_type_name FROM fuel_types';
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching fuel types:', err);
      return res.status(500).json({ error: 'Database query error' });
    }
    
    res.json(results);
  });
});

// API สำหรับลบรายการการแลกสินค้า
app.post('/redemptions/delete_redemption', (req, res) => {
  const { redemption_id } = req.body;

  const query = `
    DELETE FROM redemptions
    WHERE redemption_id = ?
  `;

  db.query(query, [redemption_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database connection error' });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Redemption not found' });
    }

    res.json({ message: 'Redemption deleted successfully!' });
  });
});



// API สำหรับดึงรายการการแลกสินค้าตามสถานะและค้นหาชื่อรางวัล
app.post('/redemptions/search_redemptions', (req, res) => {
  const { status, reward_name } = req.body; // รับสถานะและชื่อรางวัลสำหรับการค้นหา

  let query = `
    SELECT 
      redemptions.redemption_id, 
      redemptions.customer_id, 
      redemptions.reward_id, 
      redemptions.redemption_date, 
      redemptions.points_used, 
      redemptions.status, 
      rewards.reward_name
    FROM 
      redemptions
    JOIN 
      rewards ON redemptions.reward_id = rewards.reward_id
    WHERE 1=1
  `;

  const queryParams = [];

  // เพิ่มเงื่อนไขตามสถานะ (pending/completed) ถ้ามี
  if (status) {
    query += ' AND redemptions.status = ?';
    queryParams.push(status);
  }

  // เพิ่มเงื่อนไขการค้นหาด้วยชื่อรางวัลถ้ามี
  if (reward_name) {
    query += ' AND rewards.reward_name LIKE ?';
    queryParams.push(`%${reward_name}%`);
  }

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database connection error' });
    }

    res.json({ redemptions: results });
  });
});


// API สำหรับดึงข้อมูลการแลกสินค้าที่สถานะเป็น 'pending'
app.post('/redemptions/get_redemptions', (req, res) => {
  const { staff_id } = req.body;

  const query = `
    SELECT redemption_id, customer_id, reward_id, quantity, redemption_date, points_used, status
    FROM redemptions
    WHERE status = 'pending'
  `;

  db.query(query, [staff_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database connection error' });
    }

    res.json({ redemptions: results });
  });
});

// API สำหรับอัปเดตสถานะการแลกสินค้าเป็น 'completed'
app.post('/redemptions/update_redemption_status', (req, res) => {
  const { redemption_id, staff_id } = req.body;

  const query = `
    UPDATE redemptions
    SET status = 'completed', staff_id = ?
    WHERE redemption_id = ?
  `;

  db.query(query, [staff_id, redemption_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database connection error' });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Redemption not found' });
    }

    res.json({ message: 'Redemption status updated successfully!' });
  });
});

// ใช้ body-parser เพื่อให้ Express สามารถอ่าน body ของ request
app.use(bodyParser.json());

// ฟังก์ชันสำหรับสร้าง transaction_id
function generateTransactionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomString = Array.from({ length: 10 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  return `${randomString}`;
}

// 1.1.1 API สำหรับการบันทึกข้อมูลธุรกรรม
app.post('/transactions', (req, res) => {
  const { phone_number, fuel_type, points_earned, staff_id } = req.body;

  console.log('Request Body:', req.body);

  if (!phone_number || !fuel_type || isNaN(points_earned)) {
    return res.status(400).json({ error: 'ข้อมูลที่รับมาไม่ถูกต้อง' });
  }

  // สร้างหมายเลขประจำตัวธุรกรรมโดยใช้ฟังก์ชัน generateTransactionId
  const transaction_id = generateTransactionId();

  // ค้นหาข้อมูลลูกค้า
  const customer_query = 'SELECT customer_id, points_balance FROM customers WHERE phone_number = ?';
  db.query(customer_query, [phone_number], (err, customer_result) => {
    if (err) {
      console.error('ข้อผิดพลาดในการค้นหาลูกค้า:', err.message);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหาลูกค้า', details: err.message });
    }
    if (customer_result.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลลูกค้า' });
    }

    const customer_id = customer_result[0].customer_id;
    const current_points_balance = customer_result[0].points_balance || 0;

    console.log('Customer Query Result:', customer_result);

    // ค้นหาข้อมูลประเภทน้ำมัน
    const fuel_query = 'SELECT fuel_type_id FROM fuel_types WHERE fuel_type_name = ?';
    db.query(fuel_query, [fuel_type], (err, fuel_result) => {
      if (err) {
        console.error('ข้อผิดพลาดในการค้นหาประเภทน้ำมัน:', err.message);
        return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหาประเภทน้ำมัน', details: err.message });
      }
      if (fuel_result.length === 0) {
        return res.status(400).json({ error: 'ประเภทน้ำมันไม่ถูกต้อง' });
      }

      const fuel_type_id = fuel_result[0].fuel_type_id;

      console.log('Fuel Query Result:', fuel_result);

      // บันทึกข้อมูลธุรกรรม
      const insert_query = `
        INSERT INTO transactions 
        (transaction_id, customer_id, transaction_date, fuel_type_id, points_earned, staff_id) 
        VALUES (?, ?, NOW(), ?, ?, ?)
      `;
      db.query(insert_query, [transaction_id, customer_id, fuel_type_id, points_earned, staff_id], (err, result) => {
        if (err) {
          console.error('ข้อผิดพลาดในการเพิ่มข้อมูลธุรกรรม:', err.message);
          return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูลธุรกรรม', details: err.message });
        }

        // อัปเดตคะแนนและปันผลของลูกค้า
        const updated_points_balance = current_points_balance + points_earned;
        const new_dividend = (updated_points_balance * 1) / 100; // คำนวณปันผล 1%

        const update_customer_query = `
          UPDATE customers 
          SET points_balance = ?, dividend = ?
          WHERE customer_id = ?
        `;

        db.query(update_customer_query, [updated_points_balance, new_dividend, customer_id], (err, update_result) => {
          if (err) {
            console.error('ข้อผิดพลาดในการอัปเดตข้อมูลลูกค้า:', err.message);
            return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลลูกค้า', details: err.message });
          }

          res.status(200).json({ 
            message: 'เพิ่มข้อมูลธุรกรรมสำเร็จ', 
            transactionId: transaction_id,  // ส่ง transaction_id กลับไปด้วย
            pointsEarned: points_earned, 
            newPointsBalance: updated_points_balance,
            newDividend: new_dividend
          });
        });
      });
    });
  });
});
  

// 1.1.2 API สำหรับการดึงข้อมูลธุรกรรมทั้งหมด
app.get('/transactions', (req, res) => {
  const query = 'SELECT * FROM transactions';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching transactions:', err);
      res.status(500).json({ error: 'Failed to fetch transactions', details: err.message });
      return;
    }
    res.json(results);
  });
});

// 1.1.3 API สำหรับการดึงข้อมูลธุรกรรมตาม ID
app.get('/transactions/:transaction_id', (req, res) => {
  const { transaction_id } = req.params;
  const query = 'SELECT * FROM transactions WHERE transaction_id = ?';
  db.query(query, [transaction_id], (err, result) => {
    if (err) {
      console.error('Error fetching transaction:', err);
      res.status(500).json({ error: 'Failed to fetch transaction', details: err.message });
      return;
    }
    if (result.length === 0) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    res.json(result[0]);
  });
});

// API สำหรับการค้นหา transactions
app.get('/transactions/search', (req, res) => {
  const { term } = req.query;

  const searchQuery = `
    SELECT t.*, c.customer_name, c.phone_number, f.fuel_type_name
    FROM transactions t
    JOIN customers c ON t.customer_id = c.customer_id
    JOIN fuel_types f ON t.fuel_type_id = f.fuel_type_id
    WHERE t.transaction_id LIKE ? OR c.customer_id LIKE ? OR c.customer_name LIKE ? OR c.phone_number LIKE ?
  `;

  db.query(searchQuery, [`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`], (err, results) => {
    if (err) {
      console.error('Error searching transactions:', err);
      return res.status(500).json({ error: 'Error searching transactions' });
    }

    res.json(results);
  });
});

// API สำหรับการแก้ไข transaction
app.put('/transactions/:transaction_id', (req, res) => {
  const { transaction_id } = req.params;
  const { fuel_type, points_balance, officer_id } = req.body;

  // หา fuel_type_id จากชื่อ fuel_type
  const fuelTypeQuery = 'SELECT fuel_type_id FROM fuel_types WHERE fuel_type_name = ?';
  db.query(fuelTypeQuery, [fuel_type], (err, fuelResults) => {
    if (err) {
      console.error('Error fetching fuel type:', err);
      return res.status(500).json({ error: 'Error fetching fuel type' });
    }
    
    if (fuelResults.length === 0) {
      return res.status(400).json({ error: 'Invalid fuel type' });
    }

    const fuel_type_id = fuelResults[0].fuel_type_id;

    // อัปเดต transaction
    const updateQuery = `
      UPDATE transactions 
      SET fuel_type_id = ?, points_balance = ?, officer_id = ?
      WHERE transaction_id = ?
    `;

    db.query(updateQuery, [fuel_type_id, points_balance, officer_id, transaction_id], (err, result) => {
      if (err) {
        console.error('Error updating transaction:', err);
        return res.status(500).json({ error: 'Error updating transaction' });
      }

      res.json({ message: 'Transaction updated successfully' });
    });
  });
});

// API สำหรับการลบ transaction
app.delete('/transactions/:transaction_id', (req, res) => {
  const { transaction_id } = req.params;

  const deleteQuery = 'DELETE FROM transactions WHERE transaction_id = ?';
  db.query(deleteQuery, [transaction_id], (err, result) => {
    if (err) {
      console.error('Error deleting transaction:', err);
      return res.status(500).json({ error: 'Error deleting transaction' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  });
});

// 1.1.6 API สำหรับการดึงข้อมูลสมาชิก
app.get('/customers/:phone_number', (req, res) => {
  const { phone_number } = req.params;
  const query = 'SELECT * FROM customers WHERE phone_number = ?';
  db.query(query, [phone_number], (err, result) => {
    if (err) {
      console.error('Error fetching customer data:', err);
      res.status(500).json({ error: 'Failed to fetch customer data', details: err.message });
      return;
    }
    if (result.length === 0) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json(result[0]);
  });
});

// 1.1.7 API สำหรับการดึงข้อมูลพนักงาน
app.get('/staff/:staff_id', (req, res) => {
  const { staff_id } = req.params;
  const query = 'SELECT * FROM staff WHERE staff_id = ?';
  db.query(query, [staff_id], (err, result) => {
    if (err) {
      console.error('Error fetching staff data:', err);
      res.status(500).json({ error: 'Failed to fetch staff data', details: err.message });
      return;
    }
    if (result.length === 0) {
      res.status(404).json({ error: 'Staff not found' });
      return;
    }
    res.json(result[0]);
  });
});

app.get('/transactions/latest', async (req, res) => {
  try {
    const transactions = await db.query(
      'SELECT transaction_id, customer_id, transaction_date, fuel_type_id, points_balance FROM transactions ORDER BY transaction_date DESC LIMIT 10'
    );
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load latest transactions' });
  }
});

// Endpoint สำหรับดึงรายการปีที่มีในตาราง annual_dividends
app.get('/annual_dividends/years', (req, res) => {
  const query = 'SELECT DISTINCT year FROM annual_dividends ORDER BY year DESC';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching years:', err);
      return res.status(500).json({ error: 'Failed to fetch years' });
    }

    const years = results.map(row => row.year.toString());
    res.json(years);
  });
});


// Endpoint สำหรับดึงรายชื่อลูกค้า
app.get('/customers', (req, res) => {
  const query = 'SELECT customer_id, first_name, last_name FROM customers';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching customers:', err);
      return res.status(500).json({ error: 'Failed to fetch customers' });
    }

    res.json(results);
  });
});


// Endpoint สำหรับดึงข้อมูลปันผลรายปี พร้อมการกรองตามปีและลูกค้า
app.get('/annual_dividends', (req, res) => {
  const { year, customer_id } = req.query;

  let query = 'SELECT * FROM annual_dividends WHERE 1=1';
  const params = [];

  if (year) {
    query += ' AND year = ?';
    params.push(year);
  }

  if (customer_id) {
    query += ' AND customer_id = ?';
    params.push(customer_id);
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching annual dividends:', err);
      return res.status(500).json({ error: 'Failed to fetch annual dividends' });
    }

    res.json(results);
  });
});

// ดึงข้อมูลสถิติการเติมน้ำมันตามประเภทและช่วงเวลา
app.get('/fuel_type_stats', (req, res) => {
  const { fuel_type, filter, year, month, day } = req.query;
  let dateCondition = '';
  
  // สร้างเงื่อนไขการกรองตามช่วงเวลา
  if (filter === 'day' && year && month && day) {
    dateCondition = `AND YEAR(t.transaction_date) = ${db.escape(year)} 
                     AND MONTH(t.transaction_date) = ${db.escape(month)} 
                     AND DAY(t.transaction_date) = ${db.escape(day)}`;
  } else if (filter === 'month' && year && month) {
    dateCondition = `AND YEAR(t.transaction_date) = ${db.escape(year)} 
                     AND MONTH(t.transaction_date) = ${db.escape(month)}`;
  } else if (filter === 'year' && year) {
    dateCondition = `AND YEAR(t.transaction_date) = ${db.escape(year)}`;
  }

  // Query สำหรับดึงข้อมูลจำนวนคนและจำนวนครั้งที่เติมน้ำมัน
  const query = `
    SELECT c.customer_id, c.first_name, c.last_name, COUNT(t.transaction_id) AS refuelCount
    FROM transactions t
    JOIN customers c ON t.customer_id = c.customer_id
    JOIN fuel_types f ON t.fuel_type_id = f.fuel_type_id
    WHERE f.fuel_type_name = ${db.escape(fuel_type)} 
    ${dateCondition}
    GROUP BY c.customer_id
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching fuel type stats:', error);
      res.status(500).json({ error: 'Failed to fetch fuel type stats' });
      return;
    }

    const peopleCount = results.length; // จำนวนคนที่เติมน้ำมัน
    const refuelCount = results.reduce((acc, person) => acc + person.refuelCount, 0); // จำนวนครั้งที่เติมทั้งหมด

    res.json({
      peopleCount,
      refuelCount,
      peopleList: results,
    });
  });
});

app.get('/customers/:customerId/dividends', (req, res) => {
  const customerId = req.params.customerId;
  db.query(
    'SELECT * FROM annual_dividends WHERE customer_id = ?',
    [customerId],
    (error, results) => {
      if (error) return res.status(500).send(error);
      res.json(results);
    }
  );
});

// แก้ไขข้อมูลลูกค้า
app.put('/customers/:customerId', (req, res) => {
  const customerId = req.params.customerId;
  const { first_name, last_name, phone_number, points_balance } = req.body;
  db.query(
    'UPDATE customers SET first_name = ?, last_name = ?, phone_number = ?, points_balance = ? WHERE customer_id = ?',
    [first_name, last_name, phone_number, points_balance, customerId],
    (error, results) => {
      if (error) return res.status(500).send(error);
      if (results.affectedRows === 0) return res.status(404).send('Customer not found');
      res.send('Customer updated successfully');
    }
  );
});

app.listen(port, () => {
  console.log(`Server is running on http://127.0.0.1:${port}`);
});
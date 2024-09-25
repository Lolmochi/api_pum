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
  const { reward_name, points_required, description } = req.body;
  const image = req.file ? req.file.filename : null;
  const reward_id = generateRewardId();  // Generate reward_id

  console.log('Request Body:', req.body);
  console.log('Uploaded File:', req.file);

  if (!reward_name || !points_required) {
    return res.status(400).json({ error: 'Please provide reward_name and points_required' });
  }

  // Validate that points_required is a number
  if (isNaN(points_required)) {
    return res.status(400).json({ error: 'Points required must be a number' });
  }

  const query = 'INSERT INTO rewards (reward_id, reward_name, points_required, description, image) VALUES (?, ?, ?, ?, ?)';
  const values = [reward_id, reward_name, points_required, description, image];

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
  const { reward_name, points_required, description } = req.body;
  const image = req.file ? req.file.filename : null;

  // แสดงผลข้อมูลที่ส่งมาเพื่อการตรวจสอบ
  console.log('Request Body:', req.body);
  console.log('Uploaded File:', req.file);

  let query = 'UPDATE rewards SET reward_name = ?, points_required = ?, description = ?';
  const values = [reward_name, points_required, description];

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
      image
    });
  });
});


// Serve static images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/officers/login', (req, res) => {
  const { officer_id, phone_number } = req.body;
  
  const query = `
    SELECT * FROM officers
    WHERE officer_id = ? AND phone_number = ?
  `;
  
  db.query(query, [officer_id, phone_number], (err, results) => {
    if (err) {
      console.error('Error during login:', err);  // Log ข้อผิดพลาดที่เกิดขึ้น
      res.status(500).json({ error: 'An error occurred during login' });
      return;
    }
    
    if (results.length === 0) {
      res.status(404).json({ error: 'Invalid officer ID or phone number' });
      return;
    }
    
    res.json({
      message: 'Login successful',
      employeeId: officer_id
    });
  });
});

app.post('/staff/login', (req, res) => {
  const { staff_id, phone_number } = req.body;
  
  const query = `
    SELECT * FROM staff
    WHERE staff_id = ? AND phone_number = ?
  `;
  
  db.query(query, [staff_id, phone_number], (err, results) => {
    if (err) {
      console.error('Error during login:', err);  // Log ข้อผิดพลาดที่เกิดขึ้น
      res.status(500).json({ error: 'An error occurred during login' });
      return;
    }
    
    if (results.length === 0) {
      res.status(404).json({ error: 'Invalid staff ID or phone number' });
      return;
    }
    
    res.json({
      message: 'Login successful',
      employeeId: staff_id
    });
  });
});

// API สำหรับค้นหาธุรกรรม
app.get('/transactions', (req, res) => {
  const { query, customer_id, staff_id, start_date, end_date } = req.query;

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

// API for editing (updating) fuel_type and amount of a transaction
app.put('/transactions/:transaction_id', (req, res) => {
  const transactionId = req.params.transaction_id;
  const { fuel_type_id, amount } = req.body;

  const sql = 'UPDATE transactions SET fuel_type_id = ?, amount = ?, modified_at = NOW() WHERE transaction_id = ?';
  const values = [fuel_type_id, amount, transactionId];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Database update error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction updated successfully' });
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



const { v4: uuidv4 } = require('uuid');

// 1.1.1 API สำหรับการบันทึกข้อมูลธุรกรรม
app.post('/transactions', (req, res) => {
  const { phone_number, fuel_type, amount, staff_id } = req.body;

  console.log('Request Body:', req.body);

  if (!phone_number || !fuel_type || isNaN(amount)) {
    return res.status(400).json({ error: 'ข้อมูลที่รับมาไม่ถูกต้อง' });
  }

  const transaction_id = uuidv4();
  const points_earned = Math.floor(amount / 1);
  const transaction_date = new Date();

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
        (transaction_id, customer_id, transaction_date, fuel_type_id, amount, points_earned, staff_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(insert_query, [transaction_id, customer_id, transaction_date, fuel_type_id, amount, points_earned, staff_id], (err, result) => {
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
  const { fuel_type, amount, officer_id } = req.body;

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
      SET fuel_type_id = ?, amount = ?, officer_id = ?
      WHERE transaction_id = ?
    `;

    db.query(updateQuery, [fuel_type_id, amount, officer_id, transaction_id], (err, result) => {
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
      'SELECT transaction_id, customer_id, transaction_date, fuel_type_id, amount FROM transactions ORDER BY transaction_date DESC LIMIT 10'
    );
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load latest transactions' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://127.0.0.1:${port}`);
});
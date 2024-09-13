const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');

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


const { v4: uuidv4 } = require('uuid');

// 1.1.1 API สำหรับการบันทึกข้อมูลธุรกรรม
app.post('/transactions', (req, res) => {
  const { phone_number, fuel_type, amount, staff_id } = req.body;

  console.log('Request Body:', req.body);

  if (!phone_number || !fuel_type || isNaN(amount)) {
    return res.status(400).json({ error: 'ข้อมูลที่รับมาไม่ถูกต้อง' });
  }

  const transaction_id = uuidv4();
  const points_earned = Math.floor(amount / 10);
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

// 1.1.4 API สำหรับการแก้ไขข้อมูลธุรกรรม
app.put('/transactions/:transaction_id', (req, res) => {
  const { transaction_id } = req.params;
  const { phone_number, fuel_type, price, employee_id } = req.body;
  const points = Math.floor(price / 100);

  const query = `
    UPDATE transactions
    SET customer_id = (SELECT customer_id FROM customers WHERE phone_number = ?),
        fuel_type_id = (SELECT fuel_type_id FROM fuel_types WHERE fuel_type_name = ?),
        amount = ?, points_earned = ?, staff_id = ?
    WHERE transaction_id = ?
  `;

  db.query(query, [phone_number, fuel_type, price, points, employee_id, transaction_id], (err, result) => {
    if (err) {
      console.error('Error updating transaction:', err);
      res.status(500).json({ error: 'Failed to update transaction', details: err.message });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    res.json({ message: 'Transaction updated successfully' });
  });
});

// 1.1.5 API สำหรับการลบข้อมูลธุรกรรม
app.delete('/transactions/:transaction_id', (req, res) => {
  const { transaction_id } = req.params;

  const query = 'DELETE FROM transactions WHERE transaction_id = ?';
  db.query(query, [transaction_id], (err, result) => {
    if (err) {
      console.error('Error deleting transaction:', err);
      res.status(500).json({ error: 'Failed to delete transaction', details: err.message });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
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


app.listen(port, () => {
  console.log(`Server is running on http://127.0.0.1:${port}`);
});

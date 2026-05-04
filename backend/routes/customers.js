const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const { generateSequence, getMonthPrefix } = require('../utils/sequence');

// 1. Get all customers
router.get('/', async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request().query(`
            SELECT 
                c.CustomerID, c.CustomerCode, c.CustomerName, c.Phone, c.Email, c.Address, c.TaxID, c.CreatedDate,
                t.CustomerTypeID, t.CustomerTypeName,
                s.CustomerStatusID, s.StatusName
            FROM Customer c
            LEFT JOIN CustomerType t ON c.CustomerTypeID = t.CustomerTypeID
            LEFT JOIN CustomerStatus s ON c.CustomerStatusID = s.CustomerStatusID
            ORDER BY c.CustomerID DESC
        `);
        res.json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch customers', error: err.message });
    }
});

// 2. Get customer types
router.get('/types', async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request().query('SELECT * FROM CustomerType ORDER BY CustomerTypeID');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch types' });
    }
});

// 3. Get customer statuses
router.get('/statuses', async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request().query('SELECT * FROM CustomerStatus ORDER BY CustomerStatusID');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch statuses' });
    }
});

// 4. Create new customer
router.post('/', async (req, res) => {
    const { typeId, statusId, code, name, phone, email, address, taxId } = req.body;
    try {
        if (!name || !typeId) {
            return res.status(400).json({ success: false, message: 'Missing required fields (name, typeId)' });
        }

        const pool = await poolPromise;
        const finalCode = code || await generateSequence(pool, 'Customer', 'CustomerCode', `CUST-${getMonthPrefix()}`, 3);

        const result = await pool.request()
            .input('tid', sql.Int, typeId)
            .input('sid', sql.Int, statusId || 1) // default 1 (ใช้งาน)
            .input('code', sql.NVarChar, finalCode)
            .input('name', sql.NVarChar, name)
            .input('phone', sql.NVarChar, phone)
            .input('email', sql.NVarChar, email)
            .input('address', sql.NVarChar, address)
            .input('tax', sql.NVarChar, taxId)
            .query(`
                INSERT INTO Customer (CustomerTypeID, CustomerStatusID, CustomerCode, CustomerName, Phone, Email, Address, TaxID)
                OUTPUT INSERTED.*
                VALUES (@tid, @sid, @code, @name, @phone, @email, @address, @tax)
            `);
        
        res.status(201).json({ success: true, message: 'Customer created successfully', data: result.recordset[0] });
    } catch (err) {
        console.error('Error creating customer:', err);
        res.status(500).json({ success: false, message: 'Failed to create customer', error: err.message });
    }
});

module.exports = router;

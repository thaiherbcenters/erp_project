const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const { generateSequence, getMonthPrefix } = require('../utils/sequence');

// 1. Get all customers
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                c.CustomerID, c.CustomerCode, c.CustomerName, c.ContactPerson, c.Phone, c.Email, c.Address, c.TaxID, c.Source, c.CreatedDate,
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
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM CustomerType ORDER BY CustomerTypeID');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch types' });
    }
});

// 3. Get customer statuses
router.get('/statuses', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM CustomerStatus ORDER BY CustomerStatusID');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch statuses' });
    }
});

// 4. Get single customer by ID
router.get('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    c.*, t.CustomerTypeName, s.StatusName
                FROM Customer c
                LEFT JOIN CustomerType t ON c.CustomerTypeID = t.CustomerTypeID
                LEFT JOIN CustomerStatus s ON c.CustomerStatusID = s.CustomerStatusID
                WHERE c.CustomerID = @id
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        // Get related sales orders
        let orders = [];
        try {
            const oRes = await pool.request()
                .input('custName', sql.NVarChar, result.recordset[0].CustomerName)
                .query(`SELECT SalesOrderID, SalesOrderNo, QuotationNo, GrandTotal, Status, CreatedDate FROM SalesOrder WHERE CustomerName = @custName ORDER BY CreatedDate DESC`);
            orders = oRes.recordset;
        } catch (e) { /* SalesOrder table may not exist yet */ }

        res.json({ success: true, data: result.recordset[0], orders });
    } catch (err) {
        console.error('Error fetching customer:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch customer', error: err.message });
    }
});

// 5. Create new customer
router.post('/', async (req, res) => {
    const { typeId, statusId, code, name, contactPerson, phone, email, address, taxId, source } = req.body;
    try {
        if (!name || !typeId) {
            return res.status(400).json({ success: false, message: 'Missing required fields (name, typeId)' });
        }

        const pool = await poolPromise;
        const prefix = parseInt(typeId) === 2 ? 'OEM' : 'CUST';
        const finalCode = code || await generateSequence(pool, 'Customer', 'CustomerCode', `${prefix}-${getMonthPrefix()}`, 3);

        const result = await pool.request()
            .input('tid', sql.Int, typeId)
            .input('sid', sql.Int, statusId || 1)
            .input('code', sql.NVarChar, finalCode)
            .input('name', sql.NVarChar, name)
            .input('contact', sql.NVarChar, contactPerson || null)
            .input('phone', sql.NVarChar, phone || null)
            .input('email', sql.NVarChar, email || null)
            .input('address', sql.NVarChar, address || null)
            .input('tax', sql.NVarChar, taxId || null)
            .input('source', sql.NVarChar, source || 'manual')
            .query(`
                INSERT INTO Customer (CustomerTypeID, CustomerStatusID, CustomerCode, CustomerName, ContactPerson, Phone, Email, Address, TaxID, Source)
                OUTPUT INSERTED.*
                VALUES (@tid, @sid, @code, @name, @contact, @phone, @email, @address, @tax, @source)
            `);
        
        res.status(201).json({ success: true, message: 'Customer created successfully', data: result.recordset[0] });
    } catch (err) {
        console.error('Error creating customer:', err);
        res.status(500).json({ success: false, message: 'Failed to create customer', error: err.message });
    }
});

// 6. Update customer
router.put('/:id', async (req, res) => {
    const { typeId, statusId, name, contactPerson, phone, email, address, taxId } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('tid', sql.Int, typeId)
            .input('sid', sql.Int, statusId)
            .input('name', sql.NVarChar, name)
            .input('contact', sql.NVarChar, contactPerson || null)
            .input('phone', sql.NVarChar, phone || null)
            .input('email', sql.NVarChar, email || null)
            .input('address', sql.NVarChar, address || null)
            .input('tax', sql.NVarChar, taxId || null)
            .query(`
                UPDATE Customer 
                SET CustomerTypeID = @tid, CustomerStatusID = @sid, CustomerName = @name, 
                    ContactPerson = @contact, Phone = @phone, Email = @email, Address = @address, TaxID = @tax
                OUTPUT INSERTED.*
                WHERE CustomerID = @id
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        res.json({ success: true, message: 'Customer updated', data: result.recordset[0] });
    } catch (err) {
        console.error('Error updating customer:', err);
        res.status(500).json({ success: false, message: 'Failed to update customer', error: err.message });
    }
});

// 7. Delete customer
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM Customer WHERE CustomerID = @id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        res.json({ success: true, message: 'Customer deleted' });
    } catch (err) {
        console.error('Error deleting customer:', err);
        res.status(500).json({ success: false, message: 'Failed to delete customer', error: err.message });
    }
});

module.exports = router;


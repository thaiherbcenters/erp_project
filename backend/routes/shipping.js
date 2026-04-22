const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// ==========================================
// SHIPPING MODULE
// ==========================================

// Get all shipping orders
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM Shipping_Orders 
            ORDER BY 
                CASE Status 
                    WHEN N'รอจัดส่ง' THEN 1 
                    WHEN N'กำลังจัดส่ง' THEN 2 
                    WHEN N'ส่งมอบแล้ว' THEN 3 
                END,
                CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching shipping orders:', err);
        res.status(500).json({ message: 'Error fetching shipping orders' });
    }
});

// Get shipping order detail
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ShipmentID', sql.VarChar, req.params.id)
            .query('SELECT * FROM Shipping_Orders WHERE ShipmentID = @ShipmentID');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Shipment not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching shipment:', err);
        res.status(500).json({ message: 'Error fetching shipment' });
    }
});

// Update shipping status
router.put('/:id/status', async (req, res) => {
    try {
        const { status, shippedBy, notes } = req.body;
        const pool = await poolPromise;
        
        const updates = [`Status = @Status`, `UpdatedAt = GETDATE()`];
        const request = pool.request()
            .input('ShipmentID', sql.VarChar, req.params.id)
            .input('Status', sql.NVarChar, status);

        if (status === 'ส่งมอบแล้ว') {
            updates.push('ShippedAt = GETDATE()');
        }
        if (shippedBy) {
            updates.push('ShippedBy = @ShippedBy');
            request.input('ShippedBy', sql.VarChar, shippedBy);
        }
        if (notes) {
            updates.push('Notes = @Notes');
            request.input('Notes', sql.NVarChar, notes);
        }

        const result = await request.query(`
            UPDATE Shipping_Orders 
            SET ${updates.join(', ')}
            OUTPUT INSERTED.*
            WHERE ShipmentID = @ShipmentID
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Shipment not found' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error updating shipment:', err);
        res.status(500).json({ message: 'Error updating shipment' });
    }
});

// Get shipping stats
router.get('/stats/summary', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                COUNT(CASE WHEN Status = N'รอจัดส่ง' THEN 1 END) as pending,
                COUNT(CASE WHEN Status = N'กำลังจัดส่ง' THEN 1 END) as inTransit,
                COUNT(CASE WHEN Status = N'ส่งมอบแล้ว' THEN 1 END) as delivered,
                COUNT(*) as total
            FROM Shipping_Orders
        `);
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching shipping stats:', err);
        res.status(500).json({ message: 'Error fetching shipping stats' });
    }
});

module.exports = router;

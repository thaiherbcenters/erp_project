const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { authorizeRoles } = require('../middleware/authorize');
const { generateSequence, getDatePrefix } = require('../utils/sequence');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/shipping');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Safe filename with timestamp
        const ext = path.extname(file.originalname);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, `slip-${Date.now()}-${safeName}`);
    }
});
const upload = multer({ storage });

// ==========================================
// SHIPPING MODULE
// ==========================================

// Auto-migrate: add new columns if missing
(async () => {
    try {
        const pool = await poolPromise;
        const columns = [
            { name: 'Courier', type: 'NVARCHAR(100)' },
            { name: 'TrackingNo', type: 'NVARCHAR(100)' },
            { name: 'SlipImage', type: 'NVARCHAR(MAX)' }
        ];
        for (const col of columns) {
            await pool.request().query(`
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Shipping_Orders' AND COLUMN_NAME='${col.name}')
                ALTER TABLE Shipping_Orders ADD ${col.name} ${col.type} NULL
            `);
        }
    } catch (err) {
        console.error('Failed to auto-migrate Shipping_Orders columns:', err);
    }
})();

// Get all shipping orders
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM Shipping_Orders 
            ORDER BY 
                CASE Status 
                    WHEN N'รอแพ็ค' THEN 1
                    WHEN N'กำลังแพ็ค' THEN 2
                    WHEN N'รอจัดส่ง' THEN 3 
                    WHEN N'กำลังจัดส่ง' THEN 4 
                    WHEN N'ส่งมอบแล้ว' THEN 5 
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
router.put('/:id/status', authorizeRoles('admin', 'executive', 'shipping', 'stock', 'packaging'), async (req, res) => {
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

        const updatedRow = result.recordset[0];

        // หากสถานะเปลี่ยนเป็นจัดส่ง (กำลังจัดส่ง) ให้บันทึกตัดสต็อก (OUT) ถ้ายังไม่เคยตัด
        if (status === 'กำลังจัดส่ง') {
            const checkLog = await pool.request()
                .input('RefNoCheck', sql.VarChar, updatedRow.ShipmentID)
                .query("SELECT 1 FROM Stock_Logs WHERE RefNo = @RefNoCheck AND Type = 'OUT' AND RefType = 'shipping'");
            
            if (checkLog.recordset.length === 0) {
                await pool.request()
                    .input('ItemID', sql.VarChar, 'OEM-DIRECT')
                    .input('Type', sql.VarChar, 'OUT')
                    .input('Quantity', sql.Int, updatedRow.Quantity || 0)
                    .input('RefNo', sql.VarChar, updatedRow.ShipmentID)
                    .input('RefType', sql.VarChar, 'shipping')
                    .input('ProductName', sql.NVarChar, updatedRow.ProductName || '')
                    .input('Notes', sql.NVarChar, `ดำเนินการจัดส่งสินค้าให้ลูกค้า — อ้างอิงใบสั่งผลิต: ${updatedRow.JobOrderID || '-'}`)
                    .input('CreatedBy', sql.VarChar, shippedBy || 'system')
                    .query(`INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, ProductName, Notes, CreatedBy)
                            VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @ProductName, @Notes, @CreatedBy)`);
            }
        }

        res.json(updatedRow);
    } catch (err) {
        console.error('Error updating shipment:', err);
        res.status(500).json({ message: 'Error updating shipment' });
    }
});

// Submit requisition for shipping
router.put('/:id/requisition', authorizeRoles('admin', 'executive', 'shipping', 'packaging'), async (req, res) => {
    try {
        const { requisitionItems, requesterName } = req.body;
        const shipmentId = req.params.id;
        
        if (!requisitionItems || requisitionItems.length === 0) {
            return res.status(400).json({ message: 'No requisition items provided' });
        }

        const pool = await poolPromise;
        const currentRes = await pool.request()
            .input('ShipmentIDCheck', sql.VarChar, shipmentId)
            .query('SELECT RequisitionJSON FROM Shipping_Orders WHERE ShipmentID = @ShipmentIDCheck');
            
        let history = [];
        if (currentRes.recordset.length > 0 && currentRes.recordset[0].RequisitionJSON) {
            let parsed = JSON.parse(currentRes.recordset[0].RequisitionJSON);
            if (Array.isArray(parsed)) {
                if (parsed.length > 0 && parsed[0].id && !parsed[0].items) {
                    history = [ { items: parsed, requesterName: 'ไม่ระบุ' } ];
                } else {
                    history = parsed;
                }
            } else if (parsed && parsed.items) {
                history = [ parsed ];
            }
        }
        
        history.push({ items: requisitionItems, requesterName: requesterName || 'ไม่ระบุ', requestedAt: new Date().toISOString() });
        const reqJsonStr = JSON.stringify(history);

        const result = await pool.request()
            .input('ShipmentID', sql.VarChar, shipmentId)
            .input('RequisitionJSON', sql.NVarChar, reqJsonStr)
            .input('Status', sql.NVarChar, 'รอคลังอนุมัติ')
            .query(`
                UPDATE Shipping_Orders 
                SET RequisitionJSON = @RequisitionJSON, Status = @Status, UpdatedAt = GETDATE()
                OUTPUT INSERTED.* 
                WHERE ShipmentID = @ShipmentID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Shipment not found' });
        }

        res.json({ message: 'ส่งใบเบิกสำเร็จ', task: result.recordset[0] });
    } catch (err) {
        console.error('Error submitting shipping requisition:', err);
        res.status(500).json({ message: 'Error submitting requisition' });
    }
});

// Get shipping stats
router.get('/stats/summary', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                COUNT(CASE WHEN Status = N'รอแพ็ค' THEN 1 END) as pendingPack,
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

// Submit shipping proof
router.patch('/:id/ship', authorizeRoles('admin', 'executive', 'shipping'), upload.single('slipImage'), async (req, res) => {
    try {
        const { courier, trackingNo, shippedBy } = req.body;
        const slipImage = req.file ? `/api/uploads/shipping/${req.file.filename}` : null;
        
        const pool = await poolPromise;
        const updates = [`Status = N'กำลังจัดส่ง'`, `UpdatedAt = GETDATE()`];
        const request = pool.request().input('ShipmentID', sql.VarChar, req.params.id);

        if (courier) {
            updates.push('Courier = @Courier');
            request.input('Courier', sql.NVarChar, courier);
        }
        if (trackingNo) {
            updates.push('TrackingNo = @TrackingNo');
            request.input('TrackingNo', sql.NVarChar, trackingNo);
        }
        if (slipImage) {
            updates.push('SlipImage = @SlipImage');
            request.input('SlipImage', sql.NVarChar, slipImage);
        }
        if (shippedBy) {
            updates.push('ShippedBy = @ShippedBy');
            request.input('ShippedBy', sql.VarChar, shippedBy);
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

        const updatedRow = result.recordset[0];

        // บันทึกตัดสต็อก (OUT) เมื่อกดยืนยันการจัดส่ง
        const checkLog = await pool.request()
            .input('RefNoCheck', sql.VarChar, updatedRow.ShipmentID)
            .query("SELECT 1 FROM Stock_Logs WHERE RefNo = @RefNoCheck AND Type = 'OUT' AND RefType = 'shipping'");
        
        if (checkLog.recordset.length === 0) {
            await pool.request()
                .input('ItemID', sql.VarChar, 'OEM-DIRECT')
                .input('Type', sql.VarChar, 'OUT')
                .input('Quantity', sql.Int, updatedRow.Quantity || 0)
                .input('RefNo', sql.VarChar, updatedRow.ShipmentID)
                .input('RefType', sql.VarChar, 'shipping')
                .input('ProductName', sql.NVarChar, updatedRow.ProductName || '')
                .input('Notes', sql.NVarChar, `ดำเนินการจัดส่งสินค้าให้ลูกค้า — อ้างอิงใบสั่งผลิต: ${updatedRow.JobOrderID || '-'}`)
                .input('CreatedBy', sql.VarChar, shippedBy || 'system')
                .query(`INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, ProductName, Notes, CreatedBy)
                        VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @ProductName, @Notes, @CreatedBy)`);
        }

        res.json(updatedRow);
    } catch (err) {
        console.error('Error submitting shipment proof:', err);
        res.status(500).json({ message: 'Error submitting shipment proof' });
    }
});
// Update shipping customer info
router.put('/:id/customer-info', authorizeRoles('admin', 'executive', 'shipping'), async (req, res) => {
    try {
        const { CustomerName, CustomerPO, CustomerPhone, ShippingAddress } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ShipmentID', sql.VarChar, req.params.id)
            .input('CustomerName', sql.NVarChar, CustomerName || '')
            .input('CustomerPO', sql.NVarChar, CustomerPO || '')
            .input('CustomerPhone', sql.NVarChar, CustomerPhone || '')
            .input('ShippingAddress', sql.NVarChar, ShippingAddress || '')
            .query(`
                UPDATE Shipping_Orders 
                SET CustomerName = @CustomerName, 
                    CustomerPO = @CustomerPO, 
                    CustomerPhone = @CustomerPhone, 
                    ShippingAddress = @ShippingAddress,
                    UpdatedAt = GETDATE()
                OUTPUT INSERTED.*
                WHERE ShipmentID = @ShipmentID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Shipment not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error updating customer info:', err);
        res.status(500).json({ message: 'Error updating customer info' });
    }
});

module.exports = router;

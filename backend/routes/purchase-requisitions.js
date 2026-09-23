const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const { generateSequence, peekNextSequence, getDatePrefix } = require('../utils/sequence');
const { authorizeRoles } = require('../middleware/authorize');

// =============================================================================
// PURCHASE REQUISITIONS (PR) MODULE
// =============================================================================

// 1. GET /api/purchase-requisitions — รายการ PR ทั้งหมด
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { search, status } = req.query;

        let query = `
            SELECT 
                PRID, PRNumber, TaskID, BatchNo, FormulaName, 
                Department, Requestor, RequestorSignature, RequestDate, Status, Notes, 
                ItemsJSON, EstimatedTotal, PONumber, CreatedAt, UpdatedAt,
                Purchaser, PurchaserSignature, PurchasedAt
            FROM Purchase_Requisitions
            WHERE 1=1
        `;

        const request = pool.request();

        if (status && status !== 'ทั้งหมด' && status !== 'all') {
            query += ` AND Status = @status`;
            request.input('status', sql.NVarChar, status);
        }

        if (search) {
            query += ` AND (PRNumber LIKE @search OR TaskID LIKE @search OR FormulaName LIKE @search OR Requestor LIKE @search OR Notes LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        query += ` ORDER BY CreatedAt DESC`;

        const result = await request.query(query);

        const data = result.recordset.map(row => {
            let items = [];
            try {
                items = row.ItemsJSON ? JSON.parse(row.ItemsJSON) : [];
            } catch (e) {
                items = [];
            }
            return {
                id: row.PRID,
                prNumber: row.PRNumber,
                taskId: row.TaskID,
                batchNo: row.BatchNo,
                formulaName: row.FormulaName,
                department: row.Department || 'ฝ่ายผลิต/คลังสินค้า',
                requestor: row.Requestor || 'ไม่ระบุ',
                requestorSignature: row.RequestorSignature || null,
                requestDate: row.RequestDate,
                date: row.RequestDate ? new Date(row.RequestDate).toLocaleDateString('th-TH') : '',
                status: row.Status || 'รอจัดซื้อ',
                notes: row.Notes || '',
                items: items,
                itemsCount: items.length,
                estimatedPrice: row.EstimatedTotal || 0,
                poNumber: row.PONumber || null,
                purchaser: row.Purchaser || null,
                purchaserSignature: row.PurchaserSignature || null,
                purchasedAt: row.PurchasedAt || null,
                createdAt: row.CreatedAt
            };
        });

        res.json({ success: true, data });
    } catch (err) {
        console.error('Error fetching purchase requisitions:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch purchase requisitions', error: err.message });
    }
});

// 1.1 GET /api/purchase-requisitions/next-number — ดูเลขที่ PR ลำดับถัดไปล่วงหน้า (Peek next PR Number)
router.get('/next-number', async (req, res) => {
    try {
        const pool = await poolPromise;
        const datePrefix = getDatePrefix();
        const nextNo = await peekNextSequence(pool, 'Purchase_Requisitions', 'PRNumber', `PR${datePrefix}`, 3, '-');
        res.json({ success: true, nextNumber: nextNo });
    } catch (err) {
        console.error('Error peeking next PR number:', err);
        res.status(500).json({ success: false, message: 'Failed to peek next PR number', error: err.message });
    }
});

// 2. GET /api/purchase-requisitions/:id — รายละเอียด PR รายใบ
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;

        const result = await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
                SELECT * FROM Purchase_Requisitions 
                WHERE PRID = TRY_CAST(@id AS INT) OR PRNumber = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Purchase requisition not found' });
        }

        const row = result.recordset[0];
        let items = [];
        try {
            items = row.ItemsJSON ? JSON.parse(row.ItemsJSON) : [];
        } catch (e) {
            items = [];
        }

        res.json({
            success: true,
            data: {
                id: row.PRID,
                prNumber: row.PRNumber,
                taskId: row.TaskID,
                batchNo: row.BatchNo,
                formulaName: row.FormulaName,
                department: row.Department,
                requestor: row.Requestor,
                requestorSignature: row.RequestorSignature || null,
                requestDate: row.RequestDate,
                status: row.Status,
                notes: row.Notes,
                items,
                estimatedTotal: row.EstimatedTotal,
                poNumber: row.PONumber,
                purchaser: row.Purchaser || null,
                purchaserSignature: row.PurchaserSignature || null,
                purchasedAt: row.PurchasedAt || null,
                createdAt: row.CreatedAt
            }
        });
    } catch (err) {
        console.error('Error fetching PR detail:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch PR detail', error: err.message });
    }
});

// 3. POST /api/purchase-requisitions — สร้าง PR ใหม่ (จากหน้ารอเบิกจ่ายคลังสินค้า หรือฝ่ายจัดซื้อ)
router.post('/', async (req, res) => {
    try {
        const { taskId, batchNo, formulaName, department, requestor, notes, items, estimatedTotal } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุรายการวัตถุดิบที่ต้องการขอซื้อ' });
        }

        const pool = await poolPromise;

        // Generate PR Number: PRYYYYMMDD-001
        const datePrefix = getDatePrefix();
        const prNumber = await generateSequence(pool, 'Purchase_Requisitions', 'PRNumber', `PR${datePrefix}`, 3);

        let currentUsername = requestor;
        let currentRequestorSig = null;

        if (req.headers.authorization) {
            try {
                const token = req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null;
                if (token) {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'THAIHERB_SECRET_KEY_2026_ERP');
                    if (decoded && decoded.id) {
                        const sigRes = await pool.request()
                            .input('uid', sql.Int, decoded.id)
                            .query('SELECT TOP 1 FullName, ImagePath FROM Signatures WHERE user_id = @uid AND IsActive = 1 ORDER BY SignatureID DESC');
                        if (sigRes.recordset.length > 0) {
                            currentUsername = sigRes.recordset[0].FullName || decoded.name || decoded.username;
                            currentRequestorSig = sigRes.recordset[0].ImagePath;
                        } else {
                            currentUsername = decoded.name || decoded.username;
                        }
                    } else if (decoded) {
                        currentUsername = decoded.name || decoded.username;
                    }
                }
            } catch (e) {
                // ignore
            }
        }
        if (!currentUsername) currentUsername = requestor || 'เจ้าหน้าที่คลังสินค้า';

        await pool.request()
            .input('PRNumber', sql.VarChar, prNumber)
            .input('TaskID', sql.VarChar, taskId || null)
            .input('BatchNo', sql.VarChar, batchNo || null)
            .input('FormulaName', sql.NVarChar, formulaName || null)
            .input('Department', sql.NVarChar, department || 'ฝ่ายผลิต/คลังสินค้า')
            .input('Requestor', sql.NVarChar, currentUsername)
            .input('RequestorSignature', sql.NVarChar, currentRequestorSig)
            .input('Status', sql.NVarChar, 'รอจัดซื้อ')
            .input('Notes', sql.NVarChar, notes || (taskId ? `ขอซื้อวัตถุดิบเนื่องจากสต็อกไม่พอสำหรับงานผลิต ${taskId}` : ''))
            .input('ItemsJSON', sql.NVarChar, JSON.stringify(items))
            .input('EstimatedTotal', sql.Float, estimatedTotal || 0)
            .query(`
                INSERT INTO Purchase_Requisitions 
                (PRNumber, TaskID, BatchNo, FormulaName, Department, Requestor, RequestorSignature, Status, Notes, ItemsJSON, EstimatedTotal)
                VALUES 
                (@PRNumber, @TaskID, @BatchNo, @FormulaName, @Department, @Requestor, @RequestorSignature, @Status, @Notes, @ItemsJSON, @EstimatedTotal)
            `);

        res.status(201).json({
            success: true,
            message: `สร้างใบขอซื้อ ${prNumber} สำเร็จ`,
            prNumber,
            data: { prNumber, taskId, itemsCount: items.length }
        });
    } catch (err) {
        console.error('Error creating purchase requisition:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างใบขอซื้อ: ' + err.message });
    }
});

// 4. PATCH /api/purchase-requisitions/:id/status — ปรับสถานะ PR (เช่น อนุมัติแล้ว, สั่งซื้อแล้ว, ยกเลิก)
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, poNumber, purchaser, purchaserSignature } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุสถานะ' });
        }

        const pool = await poolPromise;
        const request = pool.request()
            .input('id', sql.VarChar, id)
            .input('status', sql.NVarChar, status);

        let finalPurchaser = purchaser || null;
        let finalPurchaserSignature = purchaserSignature || null;

        // If purchaser was not provided in body, attempt extracting from auth token
        if (!finalPurchaser && (status === 'อนุมัติแล้ว' || status === 'สั่งซื้อแล้ว') && req.headers.authorization) {
            try {
                const token = req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null;
                if (token) {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'THAIHERB_SECRET_KEY_2026_ERP');
                    if (decoded && decoded.id) {
                        const sigRes = await pool.request()
                            .input('uid', sql.Int, decoded.id)
                            .query('SELECT TOP 1 FullName, ImagePath FROM Signatures WHERE user_id = @uid AND IsActive = 1 ORDER BY SignatureID DESC');
                        if (sigRes.recordset.length > 0) {
                            finalPurchaser = sigRes.recordset[0].FullName || decoded.name || decoded.username;
                            finalPurchaserSignature = sigRes.recordset[0].ImagePath;
                        } else {
                            finalPurchaser = decoded.name || decoded.username;
                        }
                    } else if (decoded) {
                        finalPurchaser = decoded.name || decoded.username;
                    }
                }
            } catch (authErr) {
                // Ignore
            }
        }

        let query = `
            UPDATE Purchase_Requisitions 
            SET Status = @status, UpdatedAt = GETDATE()
        `;

        if (status === 'รอจัดซื้อ') {
            query += `, Purchaser = NULL, PurchaserSignature = NULL, PurchasedAt = NULL`;
        } else if (status === 'อนุมัติแล้ว' || status === 'สั่งซื้อแล้ว') {
            if (finalPurchaser) {
                request.input('purchaser', sql.NVarChar, finalPurchaser);
                query += `, Purchaser = @purchaser`;
            }
            if (finalPurchaserSignature) {
                request.input('purchaserSignature', sql.NVarChar, finalPurchaserSignature);
                query += `, PurchaserSignature = @purchaserSignature`;
            }
            query += `, PurchasedAt = CASE WHEN PurchasedAt IS NULL THEN GETDATE() ELSE PurchasedAt END`;
        }

        if (poNumber) {
            request.input('poNumber', sql.VarChar, poNumber);
            query += `, PONumber = @poNumber`;
        }

        query += ` WHERE PRID = TRY_CAST(@id AS INT) OR PRNumber = @id`;

        await request.query(query);

        res.json({ 
            success: true, 
            message: `อัปเดตสถานะเป็น ${status} สำเร็จ`,
            purchaser: finalPurchaser,
            purchaserSignature: finalPurchaserSignature
        });
    } catch (err) {
        console.error('Error updating PR status:', err);
        res.status(500).json({ success: false, message: 'Failed to update PR status: ' + err.message });
    }
});

// 5. DELETE /api/purchase-requisitions/:id — ยกเลิก PR
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
                UPDATE Purchase_Requisitions 
                SET Status = N'ยกเลิก', UpdatedAt = GETDATE()
                WHERE PRID = TRY_CAST(@id AS INT) OR PRNumber = @id
            `);

        res.json({ success: true, message: 'ยกเลิกใบขอซื้อสำเร็จ' });
    } catch (err) {
        console.error('Error deleting PR:', err);
        res.status(500).json({ success: false, message: 'Failed to delete PR: ' + err.message });
    }
});

module.exports = router;

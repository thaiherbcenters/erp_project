/**
 * labeling.js — Routes for Labeling Tasks (ติดฉลาก)
 */
const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { generateSequence, getDatePrefix } = require('../utils/sequence');
const { authorizeRoles } = require('../middleware/authorize');

// ==========================================
// GET /tasks — ดึงรายการงานติดฉลากทั้งหมด
// ==========================================
router.get('/tasks', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM Labeling_Tasks ORDER BY CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching labeling tasks:', err);
        res.status(500).json({ message: 'Error fetching labeling tasks' });
    }
});

// ==========================================
// PUT /tasks/:id/start — เริ่มติดฉลาก
// ==========================================
router.put('/tasks/:id/start', authorizeRoles('admin','executive','planner','operator'), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('TaskID', sql.VarChar, id)
            .query(`
                UPDATE Labeling_Tasks 
                SET Status = N'กำลังติดฉลาก', StartedAt = GETDATE(), UpdatedAt = GETDATE()
                OUTPUT INSERTED.*
                WHERE TaskID = @TaskID AND Status IN (N'พร้อมติดฉลาก', N'รับแล้ว-พร้อมติด')
            `);
        if (result.rowsAffected[0] === 0) return res.status(400).json({ message: 'ไม่สามารถเริ่มติดฉลากได้ (สถานะไม่ถูกต้อง)' });
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error starting labeling:', err);
        res.status(500).json({ message: 'Error starting labeling' });
    }
});

// ==========================================
// PUT /tasks/:id/progress — อัปเดตจำนวนที่ติดแล้ว
// ==========================================
router.put('/tasks/:id/progress', authorizeRoles('admin','executive','planner','operator'), async (req, res) => {
    try {
        const { id } = req.params;
        const { labeledQty } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('TaskID', sql.VarChar, id)
            .input('LabeledQty', sql.Int, labeledQty || 0)
            .query(`
                UPDATE Labeling_Tasks 
                SET LabeledQty = @LabeledQty, UpdatedAt = GETDATE()
                OUTPUT INSERTED.*
                WHERE TaskID = @TaskID
            `);
        if (result.rowsAffected[0] === 0) return res.status(404).json({ message: 'Task not found' });
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error updating labeling progress:', err);
        res.status(500).json({ message: 'Error updating progress' });
    }
});

// ==========================================
// PUT /tasks/:id/complete — ติดฉลากเสร็จ → สร้าง QC Final อัตโนมัติ + ตัดสต็อก
// ==========================================
router.put('/tasks/:id/complete', authorizeRoles('admin','executive','planner','operator'), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        // 1. Get task info
        const taskRes = await pool.request()
            .input('TaskID', sql.VarChar, id)
            .query('SELECT * FROM Labeling_Tasks WHERE TaskID = @TaskID');
        if (taskRes.recordset.length === 0) return res.status(404).json({ message: 'Task not found' });
        const task = taskRes.recordset[0];

        // 2. ตัดสต็อกสติ๊กเกอร์ (กรณี MTS เท่านั้น)
        if (task.LabelType === 'stock' && task.LabelConfigJSON) {
            try {
                const configs = JSON.parse(task.LabelConfigJSON);
                for (const cfg of configs) {
                    if (cfg.stickerItemId) {
                        const deductQty = (cfg.qtyPerUnit || 1) * task.Qty;
                        // Deduct stock
                        await pool.request()
                            .input('ItemID', sql.VarChar, cfg.stickerItemId)
                            .input('DeductQty', sql.Float, deductQty)
                            .query('UPDATE Stock_Items SET Quantity = Quantity - @DeductQty, UpdatedAt = GETDATE() WHERE ItemID = @ItemID');
                        // Log
                        await pool.request()
                            .input('ItemID', sql.VarChar, cfg.stickerItemId)
                            .input('ProductName', sql.NVarChar, cfg.stickerName || '')
                            .input('Type', sql.VarChar, 'out')
                            .input('Quantity', sql.Float, deductQty)
                            .input('RefNo', sql.VarChar, id)
                            .input('RefType', sql.VarChar, 'labeling')
                            .input('Notes', sql.NVarChar, `ตัดสต็อกสติ๊กเกอร์ งานติดฉลาก ${id}`)
                            .input('CreatedBy', sql.NVarChar, req.user ? req.user.username : 'system')
                            .query('INSERT INTO Stock_Logs (ItemID, ProductName, Type, Quantity, RefNo, RefType, Notes, CreatedBy) VALUES (@ItemID, @ProductName, @Type, @Quantity, @RefNo, @RefType, @Notes, @CreatedBy)');
                        console.log(`✅ Deducted ${deductQty} of ${cfg.stickerName} for ${id}`);
                    }
                }
            } catch (deductErr) {
                console.error('Error deducting sticker stock:', deductErr);
            }
        }

        // 3. Update labeling task status
        await pool.request()
            .input('TaskID', sql.VarChar, id)
            .query(`UPDATE Labeling_Tasks SET Status = N'ติดฉลากเสร็จ', LabeledQty = Qty, CompletedAt = GETDATE(), UpdatedAt = GETDATE() WHERE TaskID = @TaskID`);

        // 4. Update Packaging_Tasks status
        if (task.PackagingTaskID) {
            await pool.request()
                .input('PkgTaskID', sql.VarChar, task.PackagingTaskID)
                .query(`UPDATE Packaging_Tasks SET Status = N'รอ QC Final', UpdatedAt = GETDATE() WHERE TaskID = @PkgTaskID`);
        }

        // 5. Auto-create QC Final
        const qcRequestId = await generateSequence(pool, 'QC_Production', 'RequestID', `QCF-${getDatePrefix()}`, 3);
        try {
            await pool.request()
                .input('RequestID', sql.VarChar, qcRequestId)
                .input('TaskID', sql.VarChar, task.ProductionTaskID || task.PackagingTaskID || id)
                .input('JobOrderID', sql.VarChar, task.JobOrderID || task.BatchNo)
                .input('BatchNo', sql.VarChar, task.BatchNo)
                .input('FormulaName', sql.NVarChar, task.ProductName)
                .input('Line', sql.VarChar, task.Line || 'Line A')
                .input('Type', sql.VarChar, 'qc_final')
                .input('Status', sql.NVarChar, 'รอตรวจ')
                .query(`
                    INSERT INTO QC_Production (RequestID, TaskID, JobOrderID, BatchNo, FormulaName, Line, Type, Status, RequestedAt)
                    VALUES (@RequestID, @TaskID, @JobOrderID, @BatchNo, @FormulaName, @Line, @Type, @Status, GETDATE())
                `);
            console.log(`✅ Auto QC Final: ${qcRequestId} for labeling ${id}`);
        } catch (qcErr) {
            console.error('Error auto-creating QC:', qcErr);
        }

        // 6. Sync Production stepper to qc_final
        if (task.ProductionTaskID) {
            try {
                const prodResult = await pool.request()
                    .input('ProdTaskID', sql.VarChar, task.ProductionTaskID)
                    .query('SELECT StepTimesJSON FROM Production_Tasks WHERE TaskID = @ProdTaskID');
                let stepTimes = {};
                if (prodResult.recordset.length > 0 && prodResult.recordset[0].StepTimesJSON) {
                    try { stepTimes = JSON.parse(prodResult.recordset[0].StepTimesJSON); } catch(e) {}
                }
                stepTimes['labeling'] = task.StartedAt || new Date().toISOString();
                stepTimes['qc_final'] = new Date().toISOString();
                await pool.request()
                    .input('ProdTaskID', sql.VarChar, task.ProductionTaskID)
                    .input('StepTimesJSON', sql.NVarChar, JSON.stringify(stepTimes))
                    .query(`UPDATE Production_Tasks SET CurrentStep = 'qc_final', StepTimesJSON = @StepTimesJSON WHERE TaskID = @ProdTaskID`);
                console.log(`✅ Synced Production ${task.ProductionTaskID} → qc_final`);
            } catch (syncErr) {
                console.error('Error syncing production:', syncErr);
            }
        }

        res.json({ message: 'ติดฉลากเสร็จสมบูรณ์ ส่ง QC Final อัตโนมัติแล้ว', qcRequestId });
    } catch (err) {
        console.error('Error completing labeling:', err);
        res.status(500).json({ message: 'Error completing labeling' });
    }
});

// ==========================================
// PUT /tasks/:id/sticker-ordered — OEM: สั่งสติ๊กเกอร์แล้ว
// ==========================================
router.put('/tasks/:id/sticker-ordered', authorizeRoles('admin','executive','planner','operator'), async (req, res) => {
    try {
        const { id } = req.params;
        const { supplier, note } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('TaskID', sql.VarChar, id)
            .input('Supplier', sql.NVarChar, supplier || '')
            .input('Note', sql.NVarChar, note || '')
            .query(`
                UPDATE Labeling_Tasks 
                SET Status = N'สั่งแล้ว-รอรับ', StickerOrderedAt = GETDATE(), StickerSupplier = @Supplier, StickerNote = @Note, UpdatedAt = GETDATE()
                OUTPUT INSERTED.*
                WHERE TaskID = @TaskID
            `);
        if (result.rowsAffected[0] === 0) return res.status(404).json({ message: 'Task not found' });
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error updating sticker order:', err);
        res.status(500).json({ message: 'Error updating sticker order' });
    }
});

// ==========================================
// PUT /tasks/:id/sticker-received — OEM: สติ๊กเกอร์มาแล้ว
// ==========================================
router.put('/tasks/:id/sticker-received', authorizeRoles('admin','executive','planner','operator'), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('TaskID', sql.VarChar, id)
            .query(`
                UPDATE Labeling_Tasks 
                SET Status = N'รับแล้ว-พร้อมติด', StickerReceivedAt = GETDATE(), UpdatedAt = GETDATE()
                OUTPUT INSERTED.*
                WHERE TaskID = @TaskID
            `);
        if (result.rowsAffected[0] === 0) return res.status(404).json({ message: 'Task not found' });
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error updating sticker received:', err);
        res.status(500).json({ message: 'Error updating sticker received' });
    }
});

// ==========================================
// LABEL CONFIGURATIONS (ตั้งค่าสติ๊กเกอร์ผูกกับ FG)
// ==========================================

// GET /configurations
router.get('/configurations', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Label_Configurations ORDER BY FGProductName, ApplyTo');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching label configs:', err);
        res.status(500).json({ message: 'Error fetching configurations' });
    }
});

// POST /configurations
router.post('/configurations', authorizeRoles('admin','executive','planner'), async (req, res) => {
    try {
        const { fgItemId, fgProductName, stickerItemId, stickerName, applyTo, qtyPerUnit } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('FGItemID', sql.VarChar, fgItemId)
            .input('FGProductName', sql.NVarChar, fgProductName)
            .input('StickerItemID', sql.VarChar, stickerItemId)
            .input('StickerName', sql.NVarChar, stickerName)
            .input('ApplyTo', sql.NVarChar, applyTo || 'ขวด')
            .input('QtyPerUnit', sql.Int, qtyPerUnit || 1)
            .query(`
                INSERT INTO Label_Configurations (FGItemID, FGProductName, StickerItemID, StickerName, ApplyTo, QtyPerUnit)
                VALUES (@FGItemID, @FGProductName, @StickerItemID, @StickerName, @ApplyTo, @QtyPerUnit)
            `);
        res.status(201).json({ message: 'เพิ่มการตั้งค่าสติ๊กเกอร์สำเร็จ' });
    } catch (err) {
        console.error('Error creating label config:', err);
        res.status(500).json({ message: 'Error creating configuration' });
    }
});

// DELETE /configurations/:id
router.delete('/configurations/:id', authorizeRoles('admin','executive','planner'), async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ConfigID', sql.Int, req.params.id)
            .query('DELETE FROM Label_Configurations WHERE ConfigID = @ConfigID');
        res.json({ message: 'ลบการตั้งค่าสำเร็จ' });
    } catch (err) {
        console.error('Error deleting label config:', err);
        res.status(500).json({ message: 'Error deleting configuration' });
    }
});

module.exports = router;

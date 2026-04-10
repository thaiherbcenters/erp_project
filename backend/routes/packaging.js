const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// ==========================================
// PACKAGING TASKS MODULE
// ==========================================

// Get all packaging tasks
router.get('/tasks', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM Packaging_Tasks 
            ORDER BY 
                CASE Status 
                    WHEN N'กำลังบรรจุ' THEN 1 
                    WHEN N'รอบรรจุ' THEN 2 
                    WHEN N'บรรจุเสร็จ' THEN 3 
                    WHEN N'รอ QC Final' THEN 4
                    WHEN N'QC ผ่าน' THEN 5
                    ELSE 6 
                END ASC, 
                CreatedAt DESC
        `);

        // Format data to match frontend expectations
        const formattedTasks = result.recordset.map(row => ({
            id: row.TaskID, // Use TaskID as the key for frontend id
            code: row.TaskID,
            product: row.Product,
            batch: row.BatchNo,
            packType: row.PackType,
            line: row.Line,
            qty: row.Qty,
            packed: row.PackedQty,
            assignee: row.Assignee,
            dueDate: row.DueDate ? new Date(row.DueDate).toISOString().split('T')[0] : null,
            status: row.Status,
            destination: row.Destination,
            customer: row.Customer,
            note: row.Note,
            createdAt: row.CreatedAt,
            updatedAt: row.UpdatedAt
        }));

        res.json(formattedTasks);
    } catch (err) {
        console.error('Error fetching packaging tasks:', err);
        res.status(500).json({ message: 'Error fetching packaging tasks' });
    }
});

// Update task status (e.g. ส่งไป QC, หรือ ส่งเข้าคลัง)
router.put('/tasks/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const taskId = req.params.id;

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('TaskID', sql.VarChar, taskId)
            .input('Status', sql.NVarChar, status)
            .query(`
                UPDATE Packaging_Tasks 
                SET Status = @Status, UpdatedAt = GETDATE()
                OUTPUT INSERTED.*
                WHERE TaskID = @TaskID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        const updatedTask = result.recordset[0];
        
        // --- Integration: Auto-advance Production Task if Packaging is fully completed ---
        if (status === 'QC ผ่าน' || status === 'ส่งมอบแล้ว') {
            try {
                // If packaging passed QC or delivered, advance Production Task to 'qc_final' (since QC Final is already passed on the PKG task, or we can jump it straight to 'stock')
                // For simplicity, let's just advance the Production Task to 'stock' (เสร็จสิ้น) and complete it!
                await pool.request()
                    .input('BatchNo', sql.VarChar, updatedTask.BatchNo)
                    .query(`
                        UPDATE Production_Tasks 
                        SET CurrentStep = 'stock', Status = N'เสร็จสิ้น', EndTime = GETDATE()
                        WHERE BatchNo = @BatchNo AND CurrentStep IN ('packaging', 'qc_final')
                    `);
            } catch (syncErr) {
                console.error('Error syncing production task:', syncErr);
            }
        }
        
        res.json(updatedTask);
    } catch (err) {
        console.error('Error updating task status:', err);
        res.status(500).json({ message: 'Error updating task status' });
    }
});

module.exports = router;

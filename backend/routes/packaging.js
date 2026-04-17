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

        // Format data to match frontend expectations (null-safe)
        const formattedTasks = result.recordset.map(row => ({
            id: row.TaskID,
            code: row.TaskID,
            product: row.Product || '',
            batch: row.BatchNo || '',
            packType: row.PackType || '-',
            line: row.Line || '-',
            qty: row.Qty || 0,
            packed: row.PackedQty || 0,
            defectQty: row.DefectQty || 0,
            assignee: row.Assignee || '-',
            dueDate: row.DueDate ? new Date(row.DueDate).toISOString().split('T')[0] : null,
            status: row.Status || 'รอบรรจุ',
            destination: row.Destination || 'คลัง',
            customer: row.Customer || null,
            note: row.Note || null,
            productionTaskId: row.ProductionTaskID || null,
            jobOrderId: row.JobOrderID || null,
            createdAt: row.CreatedAt,
            updatedAt: row.UpdatedAt
        }));

        res.json(formattedTasks);
    } catch (err) {
        console.error('Error fetching packaging tasks:', err);
        res.status(500).json({ message: 'Error fetching packaging tasks' });
    }
});

// Update task progress (PackedQty and DefectQty)
router.put('/tasks/:id/progress', async (req, res) => {
    try {
        const { addedQty, defectQty } = req.body;
        const taskId = req.params.id;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('TaskID', sql.VarChar, taskId)
            .input('AddedQty', sql.Int, addedQty || 0)
            .input('DefectQty', sql.Int, defectQty || 0)
            .query(`
                UPDATE Packaging_Tasks 
                SET PackedQty = ISNULL(PackedQty, 0) + @AddedQty,
                    DefectQty = ISNULL(DefectQty, 0) + @DefectQty,
                    Status = CASE WHEN Status IN ('รอบรรจุ') THEN N'กำลังบรรจุ' ELSE Status END,
                    UpdatedAt = GETDATE()
                OUTPUT INSERTED.*
                WHERE TaskID = @TaskID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error updating packaging progress:', err);
        res.status(500).json({ message: 'Error updating packaging progress' });
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
        
        // --- Integration: Sync Production Task stepper based on Packaging status ---
        // Map packaging status → production step
        const syncProductionStep = async (productionStep, productionStatus, isFinished = false) => {
            try {
                const prodTaskId = updatedTask.ProductionTaskID;
                const batchNo = updatedTask.BatchNo;
                const now = new Date().toISOString();

                if (prodTaskId) {
                    // First get current stepTimes to merge
                    const prodResult = await pool.request()
                        .input('ProdTaskID', sql.VarChar, prodTaskId)
                        .query('SELECT StepTimesJSON FROM Production_Tasks WHERE TaskID = @ProdTaskID');
                    
                    let stepTimes = {};
                    if (prodResult.recordset.length > 0 && prodResult.recordset[0].StepTimesJSON) {
                        try { stepTimes = JSON.parse(prodResult.recordset[0].StepTimesJSON); } catch(e) {}
                    }
                    stepTimes[productionStep] = now;

                    const updateReq = pool.request()
                        .input('ProdTaskID', sql.VarChar, prodTaskId)
                        .input('CurrentStep', sql.VarChar, productionStep)
                        .input('Status', sql.NVarChar, productionStatus)
                        .input('StepTimesJSON', sql.NVarChar, JSON.stringify(stepTimes));
                    
                    let q = `
                        UPDATE Production_Tasks 
                        SET CurrentStep = @CurrentStep, Status = @Status, StepTimesJSON = @StepTimesJSON
                    `;
                    if (isFinished) {
                        updateReq.input('EndTime', sql.DateTime, new Date());
                        q += `, EndTime = @EndTime`;
                    }
                    q += ` WHERE TaskID = @ProdTaskID`;
                    
                    await updateReq.query(q);
                    console.log(`✅ Synced Production ${prodTaskId} → ${productionStep} (${productionStatus})`);
                } else if (batchNo) {
                    // Fallback: use BatchNo
                    await pool.request()
                        .input('BatchNo', sql.VarChar, batchNo)
                        .input('CurrentStep', sql.VarChar, productionStep)
                        .input('Status', sql.NVarChar, productionStatus)
                        .query(`
                            UPDATE Production_Tasks 
                            SET CurrentStep = @CurrentStep, Status = @Status
                            ${isFinished ? ', EndTime = GETDATE()' : ''}
                            WHERE BatchNo = @BatchNo AND CurrentStep IN ('packaging', 'qc_final')
                        `);
                    console.log(`✅ Synced Production (Batch: ${batchNo}) → ${productionStep} (${productionStatus})`);
                }
            } catch (syncErr) {
                console.error('❌ Error syncing production task:', syncErr);
            }
        };

        // Packaging → QC Final: advance production stepper to qc_final
        if (status === 'รอ QC Final') {
            await syncProductionStep('qc_final', 'กำลังทำ', false);
        }
        // QC ผ่าน or ส่งมอบ: advance production stepper to stock (เสร็จสิ้น)
        if (status === 'QC ผ่าน' || status === 'ส่งมอบแล้ว') {
            await syncProductionStep('stock', 'เสร็จสิ้น', true);
        }
        
        res.json(updatedTask);
    } catch (err) {
        console.error('Error updating task status:', err);
        res.status(500).json({ message: 'Error updating task status' });
    }
});

module.exports = router;

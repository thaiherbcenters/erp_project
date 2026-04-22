const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// ==========================================
// PRODUCTION TASKS MODULE
// ==========================================

// Get all production tasks
router.get('/tasks', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM Production_Tasks 
            ORDER BY StartTime DESC, CreatedAt DESC
        `);

        // Format data to match frontend expectations
        const formattedTasks = result.recordset.map(row => {
            let stepTimes = {};
            try {
                if (row.StepTimesJSON) {
                    stepTimes = JSON.parse(row.StepTimesJSON);
                }
            } catch (e) {
                console.error("Failed to parse StepTimesJSON for TaskID", row.TaskID);
            }

            return {
                id: row.TaskID,
                jobOrderId: row.JobOrderID,
                formulaName: row.FormulaName,
                process: row.ProcessName,
                batchNo: row.BatchNo,
                line: row.Line,
                expectedQty: row.ExpectedQty,
                producedQty: row.ProducedQty,
                defectQty: row.DefectQty,
                status: row.Status,
                currentStep: row.CurrentStep,
                stepTimes: stepTimes,
                operator: row.WorkerID,
                startTime: row.StartTime ? new Date(row.StartTime).toISOString().slice(0, 16).replace('T', ' ') : null,
                endTime: row.EndTime ? new Date(row.EndTime).toISOString().slice(0, 16).replace('T', ' ') : null,
                createdAt: row.CreatedAt
            };
        });

        res.json(formattedTasks);
    } catch (err) {
        console.error('Error fetching production tasks:', err);
        res.status(500).json({ message: 'Error fetching production tasks' });
    }
});

// Update advance task step
router.put('/tasks/:id/advance', async (req, res) => {
    try {
        const { currentStep, stepTimes, status, endTime } = req.body;
        const taskId = req.params.id;

        const pool = await poolPromise;
        
        let query = `
            UPDATE Production_Tasks 
            SET 
                CurrentStep = @CurrentStep, 
                Status = @Status,
                StepTimesJSON = @StepTimesJSON
        `;

        if (endTime) {
            query += `, EndTime = @EndTime `;
        }
        query += ` OUTPUT INSERTED.* WHERE TaskID = @TaskID`;

        const request = pool.request()
            .input('TaskID', sql.VarChar, taskId)
            .input('CurrentStep', sql.VarChar, currentStep)
            .input('Status', sql.NVarChar, status)
            .input('StepTimesJSON', sql.NVarChar, JSON.stringify(stepTimes));

        if (endTime) {
            request.input('EndTime', sql.DateTime, new Date(endTime));
        }

        const result = await request.query(query);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // --- Integration: Auto-create Packaging Task if entering 'packaging' step ---
        if (currentStep === 'packaging') {
            try {
                const taskResult2 = await pool.request()
                    .input('ProdTaskID', sql.VarChar, taskId)
                    .query('SELECT TaskID, JobOrderID, BatchNo, FormulaName, Line, ExpectedQty, ProducedQty FROM Production_Tasks WHERE TaskID = @ProdTaskID');
                
                if (taskResult2.recordset.length > 0) {
                    const taskData = taskResult2.recordset[0];
                    const pkgId = `PKG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
                    
                    // Check if already exists by BatchNo OR ProductionTaskID to prevent duplicate
                    const checkPkg = await pool.request()
                        .input('BatchNo', sql.VarChar, taskData.BatchNo)
                        .input('ProdTaskID', sql.VarChar, taskId)
                        .query(`
                            SELECT COUNT(*) as cnt FROM Packaging_Tasks 
                            WHERE BatchNo = @BatchNo OR ProductionTaskID = @ProdTaskID
                        `);
                        
                    if (checkPkg.recordset[0].cnt === 0) {
                        await pool.request()
                            .input('TaskID', sql.VarChar, pkgId)
                            .input('BatchNo', sql.VarChar, taskData.BatchNo)
                            .input('Product', sql.NVarChar, taskData.FormulaName)
                            .input('Line', sql.VarChar, taskData.Line)
                            .input('Qty', sql.Int, taskData.ExpectedQty || taskData.ProducedQty || 0)
                            .input('PackedQty', sql.Int, 0)
                            .input('Status', sql.NVarChar, 'รอบรรจุ')
                            .input('Destination', sql.NVarChar, 'คลัง')
                            .input('ProductionTaskID', sql.VarChar, taskId)
                            .input('JobOrderID', sql.VarChar, taskData.JobOrderID)
                            .query(`
                                INSERT INTO Packaging_Tasks 
                                (TaskID, BatchNo, Product, Line, Qty, PackedQty, Status, Destination, ProductionTaskID, JobOrderID)
                                VALUES (@TaskID, @BatchNo, @Product, @Line, @Qty, @PackedQty, @Status, @Destination, @ProductionTaskID, @JobOrderID)
                            `);
                        console.log(`✅ Auto-created Packaging Task ${pkgId} for Production ${taskId} (Batch: ${taskData.BatchNo})`);
                    } else {
                        console.log(`ℹ️ Packaging task already exists for Batch ${taskData.BatchNo} or Production ${taskId}`);
                    }
                }
            } catch (pkgErr) {
                console.error('❌ Error auto-creating packaging task:', pkgErr);
                // We don't fail the advance response because of this, but it should be logged.
            }
        }
        // -----------------------------------------------------------------------------

        // --- Integration: Auto-receive into Stock when reaching 'stock' step ---
        if (currentStep === 'stock') {
            try {
                const taskResult3 = await pool.request()
                    .input('ProdTaskID', sql.VarChar, taskId)
                    .query('SELECT TaskID, JobOrderID, BatchNo, FormulaName, ProducedQty, DefectQty FROM Production_Tasks WHERE TaskID = @ProdTaskID');

                if (taskResult3.recordset.length > 0) {
                    const taskData = taskResult3.recordset[0];
                    const goodQty = (taskData.ProducedQty || 0) - (taskData.DefectQty || 0);

                    // Check production type from Planner notes (OEM = ผลิตตามออเดอร์)
                    let isOEM = false;
                    if (taskData.JobOrderID) {
                        const plannerRes = await pool.request()
                            .input('PlannerID', sql.VarChar, taskData.JobOrderID)
                            .query('SELECT Notes FROM Planner WHERE PlannerID = @PlannerID');
                        if (plannerRes.recordset.length > 0) {
                            const notes = plannerRes.recordset[0].Notes || '';
                            isOEM = notes.includes('ผลิตตามออเดอร์');
                        }
                    }

                    if (isOEM) {
                        // OEM → ไม่เข้าคลังเรา บันทึก log ว่า "ส่งออกตรง (OEM)"
                        console.log(`📦 OEM Order: Batch ${taskData.BatchNo} → ส่งตรงให้ลูกค้า (ไม่เข้าคลัง)`);
                        // สร้าง Stock Log เพื่อเป็นประวัติ (แต่ไม่เพิ่มยอดในคลัง)
                        await pool.request()
                            .input('ItemID', sql.VarChar, 'OEM-DIRECT')
                            .input('Type', sql.VarChar, 'OUT')
                            .input('Quantity', sql.Int, goodQty)
                            .input('RefNo', sql.VarChar, taskData.BatchNo)
                            .input('RefType', sql.VarChar, 'oem_direct')
                            .input('ProductName', sql.NVarChar, taskData.FormulaName)
                            .input('Notes', sql.NVarChar, `OEM ส่งตรงให้ลูกค้า — Batch: ${taskData.BatchNo} (${goodQty} ชิ้น)`)
                            .input('CreatedBy', sql.VarChar, 'system')
                            .query(`
                                INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, ProductName, Notes, CreatedBy)
                                VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @ProductName, @Notes, @CreatedBy)
                            `);
                    } else {
                        // MTS (ผลิตตามแผน) → เข้าคลังจริง
                        // Check if product already exists
                        const existingCheck = await pool.request()
                            .input('ProductName', sql.NVarChar, taskData.FormulaName)
                            .query('SELECT ItemID FROM Stock_Items WHERE ProductName = @ProductName');

                        let stockItemId;
                        if (existingCheck.recordset.length > 0) {
                            stockItemId = existingCheck.recordset[0].ItemID;
                            await pool.request()
                                .input('ItemID', sql.VarChar, stockItemId)
                                .input('AddQty', sql.Int, goodQty)
                                .query('UPDATE Stock_Items SET Quantity = Quantity + @AddQty, UpdatedAt = GETDATE() WHERE ItemID = @ItemID');
                        } else {
                            stockItemId = `STK-${Date.now().toString().slice(-6)}`;
                            await pool.request()
                                .input('ItemID', sql.VarChar, stockItemId)
                                .input('ProductName', sql.NVarChar, taskData.FormulaName)
                                .input('Quantity', sql.Int, goodQty)
                                .query(`
                                    INSERT INTO Stock_Items (ItemID, ProductName, Quantity)
                                    VALUES (@ItemID, @ProductName, @Quantity)
                                `);
                        }

                        // Create stock log
                        await pool.request()
                            .input('ItemID', sql.VarChar, stockItemId)
                            .input('Type', sql.VarChar, 'IN')
                            .input('Quantity', sql.Int, goodQty)
                            .input('RefNo', sql.VarChar, taskData.BatchNo)
                            .input('RefType', sql.VarChar, 'production')
                            .input('ProductName', sql.NVarChar, taskData.FormulaName)
                            .input('Notes', sql.NVarChar, `รับเข้าจากการผลิต Batch: ${taskData.BatchNo} (ผลิตได้ ${taskData.ProducedQty}, ของเสีย ${taskData.DefectQty}, เข้าคลัง ${goodQty})`)
                            .input('CreatedBy', sql.VarChar, 'system')
                            .query(`
                                INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, ProductName, Notes, CreatedBy)
                                VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @ProductName, @Notes, @CreatedBy)
                            `);

                        console.log(`✅ Stock received: ${taskData.FormulaName} x${goodQty} from Batch ${taskData.BatchNo}`);
                    }
                }
            } catch (stockErr) {
                console.error('❌ Error auto-receiving stock:', stockErr);
            }
        }
        // -----------------------------------------------------------------------------

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error advancing task step:', err);
        res.status(500).json({ message: 'Error advancing task step' });
    }
});

// Start a pending task
router.put('/tasks/:id/start', async (req, res) => {
    try {
        const { currentStep, stepTimes, status, startTime } = req.body;
        const taskId = req.params.id;

        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('TaskID', sql.VarChar, taskId)
            .input('CurrentStep', sql.VarChar, currentStep)
            .input('Status', sql.NVarChar, status)
            .input('StepTimesJSON', sql.NVarChar, JSON.stringify(stepTimes))
            .input('StartTime', sql.DateTime, new Date(startTime))
            .query(`
                UPDATE Production_Tasks 
                SET 
                    CurrentStep = @CurrentStep, 
                    Status = @Status,
                    StepTimesJSON = @StepTimesJSON,
                    StartTime = @StartTime
                OUTPUT INSERTED.*
                WHERE TaskID = @TaskID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error starting task:', err);
        res.status(500).json({ message: 'Error starting task' });
    }
});

// ==========================================
// PRODUCTION LOGS
// ==========================================

// Get all logs for a specific task
router.get('/tasks/:id/logs', async (req, res) => {
    try {
        const taskId = req.params.id;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('TaskID', sql.VarChar, taskId)
            .query(`
                SELECT * FROM Production_Logs 
                WHERE TaskID = @TaskID 
                ORDER BY LogDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching production logs:', err);
        res.status(500).json({ message: 'Error fetching production logs' });
    }
});

// Add a new log and update the task's quantities
router.post('/tasks/:id/log', async (req, res) => {
    try {
        const taskId = req.params.id;
        const { producedQty, defectQty, operatorId, notes } = req.body;
        
        const pool = await poolPromise;
        
        // Use a transaction since we are inserting a log AND updating the parent task
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // 1. Insert Log
            const requestLog = new sql.Request(transaction);
            const logResult = await requestLog
                .input('TaskID', sql.VarChar, taskId)
                .input('ProducedQty', sql.Int, producedQty || 0)
                .input('DefectQty', sql.Int, defectQty || 0)
                .input('OperatorID', sql.VarChar, operatorId || 'system')
                .input('Notes', sql.NVarChar, notes || '')
                .query(`
                    INSERT INTO Production_Logs (TaskID, ProducedQty, DefectQty, OperatorID, Notes)
                    OUTPUT INSERTED.*
                    VALUES (@TaskID, @ProducedQty, @DefectQty, @OperatorID, @Notes)
                `);

            // 2. Update Task accumulator
            const requestUpdate = new sql.Request(transaction);
            const taskResult = await requestUpdate
                .input('TaskID', sql.VarChar, taskId)
                .input('AddProduced', sql.Int, producedQty || 0)
                .input('AddDefect', sql.Int, defectQty || 0)
                .query(`
                    UPDATE Production_Tasks
                    SET 
                        ProducedQty = ProducedQty + @AddProduced,
                        DefectQty = DefectQty + @AddDefect
                    OUTPUT INSERTED.*
                    WHERE TaskID = @TaskID
                `);

            await transaction.commit();
            
            res.status(201).json({
                message: 'บันทึกยอดสำเร็จ',
                log: logResult.recordset[0],
                task: taskResult.recordset[0]
            });

        } catch (txnErr) {
            await transaction.rollback();
            throw txnErr;
        }

    } catch (err) {
        console.error('Error adding production log:', err);
        res.status(500).json({ message: 'Error adding production log' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { generateSequence, getDatePrefix, getShortDatePrefix } = require('../utils/sequence');
const { authorizeRoles } = require('../middleware/authorize');
const { autoDeductStock, autoReceiveWIP } = require('../utils/stockDeduction');

// Helper to format date in local timezone to prevent UTC timezone shifts
const formatDateLocal = (dateObj) => {
    if (!dateObj) return null;
    // If it's a string, parse it first
    if (typeof dateObj === 'string') dateObj = new Date(dateObj);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


// ==========================================
// PRODUCTION TASKS MODULE
// ==========================================

// Get all production tasks
router.get('/tasks', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT pt.*, p.Unit as JobUnit 
            FROM Production_Tasks pt
            LEFT JOIN Planner p ON pt.JobOrderID = p.PlannerID
            ORDER BY pt.StartTime DESC, pt.CreatedAt DESC
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
                createdAt: row.CreatedAt,
                jobUnit: row.JobUnit
            };
        });

        res.json(formattedTasks);
    } catch (err) {
        console.error('Error fetching production tasks:', err);
        res.status(500).json({ message: 'Error fetching production tasks' });
    }
});

// Create an ad-hoc WIP production task
router.post('/tasks/wip', authorizeRoles('admin', 'executive', 'planner', 'operator'), async (req, res) => {
    try {
        const { formulaName, expectedQty, unit, tankNo } = req.body;
        const pool = await poolPromise;
        
        // Generate IDs
        const datePrefix = getDatePrefix();
        const joId = await generateSequence(pool, 'Job_Orders', 'JobOrderID', `JO-${datePrefix}-`, 3);
        const taskId = await generateSequence(pool, 'Production_Tasks', 'TaskID', `PT-${datePrefix}-`, 3);
        const batchNo = `B${datePrefix.replace(/-/g, '')}-WIP`;

        await pool.request()
            .input('TaskID', sql.VarChar, taskId)
            .input('JobOrderID', sql.VarChar, joId)
            .input('BatchNo', sql.VarChar, batchNo)
            .input('FormulaName', sql.NVarChar, formulaName)
            .input('Line', sql.VarChar, tankNo || 'WIP Line')
            .input('ExpectedQty', sql.Float, expectedQty)
            .input('JobUnit', sql.NVarChar, unit || 'กรัม')
            .input('CurrentStep', sql.VarChar, 'wait')
            .input('Status', sql.NVarChar, 'รอเริ่มงาน')
            .query(`
                INSERT INTO Production_Tasks (
                    TaskID, JobOrderID, BatchNo, FormulaName, Line, 
                    ExpectedQty, JobUnit, CurrentStep, Status, CreatedAt
                ) VALUES (
                    @TaskID, @JobOrderID, @BatchNo, @FormulaName, @Line,
                    @ExpectedQty, @JobUnit, @CurrentStep, @Status, GETDATE()
                )
            `);
            
        res.status(201).json({ message: 'สร้างใบสั่งผลิต WIP สำเร็จ', taskId });
    } catch (err) {
        console.error('Error creating WIP task:', err);
        res.status(500).json({ message: 'Error creating WIP task' });
    }
});

// Update advance task step
router.put('/tasks/:id/advance', authorizeRoles('admin', 'executive', 'planner', 'operator', 'qc'), async (req, res) => {
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

        // --- Integration: Deduct WIP Stock when advancing to 'production_1' ---
        if (currentStep === 'production_1' && req.body.usedWip && req.body.usedWip.id) {
            try {
                const { id, requiredQty, name } = req.body.usedWip;
                
                // Deduct from Stock_Items
                await pool.request()
                    .input('WipID', sql.VarChar, id)
                    .input('DeductQty', sql.Float, requiredQty)
                    .query(`
                        UPDATE Stock_Items 
                        SET Quantity = Quantity - @DeductQty,
                            UpdatedAt = GETDATE()
                        WHERE ItemID = @WipID
                    `);
                    
                // Add Stock_Logs
                const logId = await generateSequence(pool, 'Stock_Logs', 'LogID', 'LOG-', 6);
                await pool.request()
                    .input('LogID', sql.VarChar, logId)
                    .input('ItemID', sql.VarChar, id)
                    .input('ProductName', sql.NVarChar, name)
                    .input('Type', sql.VarChar, 'out')
                    .input('Quantity', sql.Float, requiredQty)
                    .input('RefNo', sql.VarChar, taskId)
                    .input('RefType', sql.VarChar, 'production')
                    .input('Notes', sql.NVarChar, `เบิกใช้ในกระบวนการผลิตงาน ${taskId}`)
                    .input('CreatedBy', sql.NVarChar, req.user ? req.user.username : 'system')
                    .query(`
                        INSERT INTO Stock_Logs (LogID, ItemID, ProductName, Type, Quantity, RefNo, RefType, Notes, CreatedBy, CreatedAt)
                        VALUES (@LogID, @ItemID, @ProductName, @Type, @Quantity, @RefNo, @RefType, @Notes, @CreatedBy, GETDATE())
                    `);
            } catch (err) {
                console.error('Error deducting WIP stock:', err);
                // We don't fail the advance step if stock deduction fails, but log it
            }
        }

        // --- Integration: Auto-create Packaging Task if entering 'packaging' step ---
        if (currentStep === 'packaging') {
            try {
                const taskResult2 = await pool.request()
                    .input('ProdTaskID', sql.VarChar, taskId)
                    .query('SELECT TaskID, JobOrderID, BatchNo, FormulaName, Line, ExpectedQty, ProducedQty FROM Production_Tasks WHERE TaskID = @ProdTaskID');
                
                if (taskResult2.recordset.length > 0) {
                    const taskData = taskResult2.recordset[0];
                    const pkgId = await generateSequence(pool, 'Packaging_Tasks', 'TaskID', `PKG-${getDatePrefix()}`, 3);
                    
                    // Check if already exists by BatchNo OR ProductionTaskID to prevent duplicate
                    const checkPkg = await pool.request()
                        .input('BatchNo', sql.VarChar, taskData.BatchNo)
                        .input('ProdTaskID', sql.VarChar, taskId)
                        .query(`
                            SELECT COUNT(*) as cnt FROM Packaging_Tasks 
                            WHERE BatchNo = @BatchNo OR ProductionTaskID = @ProdTaskID
                        `);
                        
                    if (checkPkg.recordset[0].cnt === 0) {
                        // Check if this is an OEM order
                        let pkgDestination = 'คลัง';
                        if (taskData.JobOrderID) {
                            try {
                                const plannerCheck = await pool.request()
                                    .input('PlannerIDCheck', sql.VarChar, taskData.JobOrderID)
                                    .query('SELECT Notes FROM Planner WHERE PlannerID = @PlannerIDCheck');
                                if (plannerCheck.recordset.length > 0) {
                                    const pNotes = plannerCheck.recordset[0].Notes || '';
                                    if (pNotes.includes('OEM') || pNotes.includes('ผลิตตามออร์เดอร์') || pNotes.includes('ผลิตตามออเดอร์') || pNotes.includes('ผลิตตามคำสั่งซื้อ')) {
                                        pkgDestination = 'ส่งลูกค้า';
                                    }
                                }
                            } catch(pe) { console.error('Error checking planner for OEM:', pe); }
                        }

                        await pool.request()
                            .input('TaskID', sql.VarChar, pkgId)
                            .input('BatchNo', sql.VarChar, taskData.BatchNo)
                            .input('Product', sql.NVarChar, taskData.FormulaName)
                            .input('Line', sql.VarChar, taskData.Line)
                            .input('Qty', sql.Int, taskData.ExpectedQty || taskData.ProducedQty || 0)
                            .input('PackedQty', sql.Int, 0)
                            .input('Status', sql.NVarChar, 'รอบรรจุ')
                            .input('Destination', sql.NVarChar, pkgDestination)
                            .input('ProductionTaskID', sql.VarChar, taskId)
                            .input('JobOrderID', sql.VarChar, taskData.JobOrderID)
                            .query(`
                                INSERT INTO Packaging_Tasks 
                                (TaskID, BatchNo, Product, Line, Qty, PackedQty, Status, Destination, ProductionTaskID, JobOrderID)
                                VALUES (@TaskID, @BatchNo, @Product, @Line, @Qty, @PackedQty, @Status, @Destination, @ProductionTaskID, @JobOrderID)
                            `);
                        console.log(`✅ Auto-created Packaging Task ${pkgId} for Production ${taskId} (Batch: ${taskData.BatchNo}, Destination: ${pkgDestination})`);
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

        // --- WIP Lot Auto Receive ---
        if (status === 'เสร็จสิ้น') {
            const reqUser = req.user?.username || req.user?.name || req.user?.displayName || 'operator';
            autoReceiveWIP(taskId, reqUser).catch(e => console.error("Auto receive WIP error:", e));
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error advancing task step:', err);
        res.status(500).json({ message: 'Error advancing task step' });
    }
});

// Start a pending task
router.put('/tasks/:id/start', authorizeRoles('admin', 'executive', 'planner', 'operator'), async (req, res) => {
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
        
        // Auto deduct stock on start
        if (currentStep && currentStep !== 'เตรียมความพร้อม') {
            const reqUser = req.user?.username || req.user?.name || req.user?.displayName || 'operator';
            autoDeductStock(taskId, reqUser).catch(e => console.error("Auto deduct error:", e));
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
router.post('/tasks/:id/log', authorizeRoles('admin', 'executive', 'operator'), async (req, res) => {
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

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
                const taskResult = await pool.request()
                    .input('TaskID', sql.VarChar, taskId)
                    .query('SELECT BatchNo, FormulaName, Line, ExpectedQty FROM Production_Tasks WHERE TaskID = @TaskID');
                
                if (taskResult.recordset.length > 0) {
                    const taskData = taskResult.recordset[0];
                    const pkgId = `PKG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
                    
                    // Check if already exists to prevent duplicate
                    const checkPkg = await pool.request()
                        .input('BatchNo', sql.VarChar, taskData.BatchNo)
                        .query('SELECT COUNT(*) as cnt FROM Packaging_Tasks WHERE BatchNo = @BatchNo');
                        
                    if (checkPkg.recordset[0].cnt === 0) {
                        await pool.request()
                            .input('TaskID', sql.VarChar, pkgId)
                            .input('BatchNo', sql.VarChar, taskData.BatchNo)
                            .input('Product', sql.NVarChar, taskData.FormulaName)
                            .input('Line', sql.VarChar, taskData.Line)
                            .input('Qty', sql.Int, taskData.ExpectedQty)
                            .input('Status', sql.NVarChar, 'รอบรรจุ')
                            .input('Destination', sql.NVarChar, 'คลัง')
                            .query(`
                                INSERT INTO Packaging_Tasks (TaskID, BatchNo, Product, Line, Qty, Status, Destination)
                                VALUES (@TaskID, @BatchNo, @Product, @Line, @Qty, @Status, @Destination)
                            `);
                    }
                }
            } catch (pkgErr) {
                console.error('Error auto-creating packaging task:', pkgErr);
                // We don't fail the advance response because of this, but it should be logged.
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

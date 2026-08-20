const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { getDatePrefix, getShortDatePrefix, generateSequence } = require('../utils/sequence');
const { authorizeRoles } = require('../middleware/authorize');

// ── Auto-migrate: add signature columns if missing ──
(async () => {
    try {
        const pool = await poolPromise;
        const cols = ['RequestedBy', 'CheckedBy', 'ApprovedBy', 'ResponsibleBy'];
        for (const col of cols) {
            await pool.request().query(`
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Planner' AND COLUMN_NAME='${col}')
                ALTER TABLE Planner ADD ${col} NVARCHAR(200) NULL
            `);
        }
        console.log('[Planner] Signature columns ensured.');
    } catch (e) {
        console.error('[Planner] Migration error:', e.message);
    }
})();

// Get all planner jobs
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Planner ORDER BY CreatedAt DESC');
        
        // We will compute progress dynamically for each job by summing up ProducedQty from Production_Tasks
        const jobs = result.recordset;
        
        // In a highly optimized system, we would JOIN Production_Tasks. 
        // For simplicity and to avoid too many moving parts during migration, we'll map them here.
        // Wait, since we are doing it robustly, let's fetch progress via an aggregate query!
        
        const jobsWithProgressParams = await pool.request().query(`
            SELECT 
                p.*,
                ISNULL((
                    SELECT SUM(pt.ProducedQty) 
                    FROM Production_Tasks pt 
                    WHERE pt.JobOrderID = p.PlannerID
                ), 0) AS TotalProduced,
                ISNULL((
                    SELECT TOP 1 1 
                    FROM Production_Tasks pt 
                    WHERE pt.JobOrderID = p.PlannerID AND pt.CurrentStep != 'pending'
                ), 0) AS HasStarted
            FROM Planner p
            ORDER BY p.CreatedAt DESC
        `);

        // Format to UI expected structure (camelCase)
        const formattedJobs = jobsWithProgressParams.recordset.map(job => {
            // progress = (produced / total) * 100
            let progress = 0;
            if (job.TotalQty > 0) {
                progress = Math.round((job.TotalProduced / job.TotalQty) * 100);
            }
            if (progress > 100) progress = 100;

            let finalStatus = job.Status;
            if (finalStatus === 'กำลังผลิต' && job.HasStarted === 0) {
                finalStatus = 'รอเริ่มงาน';
            }

            // Helper to format date in local timezone to prevent UTC timezone shifts
            const formatDateLocal = (dateObj) => {
                if (!dateObj) return null;
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            return {
                id: job.PlannerID,
                formulaId: job.FormulaID,
                formulaName: job.FormulaName,
                productName: job.ProductName,
                batchQty: job.BatchQty,
                batchSize: job.BatchSize,
                totalQty: job.TotalQty,
                unit: job.Unit,
                status: finalStatus,
                priority: job.Priority,
                planDate: formatDateLocal(job.PlanDate),
                dueDate: formatDateLocal(job.DueDate),
                assignedLine: job.AssignedLine,
                notes: job.Notes,
                createdBy: job.CreatedBy,
                progress: progress,
                requestedBy: job.RequestedBy || '',
                checkedBy: job.CheckedBy || '',
                approvedBy: job.ApprovedBy || '',
                responsibleBy: job.ResponsibleBy || '',
            };
        });

        res.json(formattedJobs);
    } catch (err) {
        console.error('Error fetching planner jobs:', err);
        res.status(500).json({ message: 'Error fetching planner jobs' });
    }
});

// Update planner job status
router.put('/:id/status', authorizeRoles('admin', 'executive', 'planner'), async (req, res) => {
    try {
        const id = req.params.id;
        const { status } = req.body;
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('PlannerID', sql.VarChar, id)
            .input('Status', sql.NVarChar, status)
            .query(`
                UPDATE Planner 
                SET Status = @Status 
                OUTPUT INSERTED.*
                WHERE PlannerID = @PlannerID
            `);
            
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Planner Job not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error updating planner job status:', err);
        res.status(500).json({ message: 'Error updating planner job status' });
    }
});

// Create new planner job
router.post('/', authorizeRoles('admin', 'executive', 'planner'), async (req, res) => {
    try {
        const { 
            formulaId, formulaName, productName, batchQty, batchSize, totalQty, unit, 
            priority, planDate, dueDate, assignedLine, notes, createdBy,
            customerName, customerPO, productionType,
            requestedBy, checkedBy, approvedBy, responsibleBy
        } = req.body;
        
        // Build enriched notes
        let fullNotes = notes || '';
        if (productionType) fullNotes = `[${productionType}] ${fullNotes}`;
        if (productName && !fullNotes.includes('สินค้า:')) fullNotes += ` | สินค้า: ${productName}`;
        if (customerName && !fullNotes.includes('ลูกค้า:')) fullNotes += ` | ลูกค้า: ${customerName}`;
        if (customerPO && !fullNotes.includes(customerPO)) fullNotes += ` (${customerPO})`;
        
        const pool = await poolPromise;
        
        // Generate new ID (JO-YYYYMMDD-XXX) using Sequences table
        const dateStr = getDatePrefix();
        const newId = await generateSequence(pool, 'Planner', 'PlannerID', `JO-${dateStr}`, 3);
        
        const result = await pool.request()
            .input('PlannerID', sql.VarChar, newId)
            .input('FormulaID', sql.VarChar, formulaId)
            .input('FormulaName', sql.NVarChar, formulaName)
            .input('ProductName', sql.NVarChar, productName || formulaName)
            .input('BatchQty', sql.Int, batchQty)
            .input('BatchSize', sql.Int, batchSize)
            .input('TotalQty', sql.Int, totalQty)
            .input('Unit', sql.NVarChar, unit || 'ชิ้น')
            .input('Status', sql.NVarChar, 'รอผลิต')
            .input('Priority', sql.NVarChar, priority || 'ปกติ')
            .input('PlanDate', sql.Date, planDate)
            .input('DueDate', sql.Date, dueDate)
            .input('AssignedLine', sql.NVarChar, assignedLine || 'Line A')
            .input('Notes', sql.NVarChar, fullNotes)
            .input('CreatedBy', sql.VarChar, createdBy || 'system')
            .input('RequestedBy', sql.NVarChar, requestedBy || '')
            .input('CheckedBy', sql.NVarChar, checkedBy || '')
            .input('ApprovedBy', sql.NVarChar, approvedBy || '')
            .input('ResponsibleBy', sql.NVarChar, responsibleBy || '')
            .query(`
                INSERT INTO Planner (
                    PlannerID, FormulaID, FormulaName, ProductName, BatchQty, BatchSize, TotalQty, Unit, 
                    Status, Priority, PlanDate, DueDate, AssignedLine, Notes, CreatedBy,
                    RequestedBy, CheckedBy, ApprovedBy, ResponsibleBy
                )
                OUTPUT INSERTED.*
                VALUES (
                    @PlannerID, @FormulaID, @FormulaName, @ProductName, @BatchQty, @BatchSize, @TotalQty, @Unit, 
                    @Status, @Priority, @PlanDate, @DueDate, @AssignedLine, @Notes, @CreatedBy,
                    @RequestedBy, @CheckedBy, @ApprovedBy, @ResponsibleBy
                )
            `);
            
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating planner job:', err);
        res.status(500).json({ message: 'Error creating planner job' });
    }
});

// Release job order to production
router.post('/:id/release', authorizeRoles('admin', 'executive', 'planner'), async (req, res) => {
    try {
        const id = req.params.id;
        const pool = await poolPromise;
        
        // 1. Get Job Order details
        const jobRes = await pool.request()
            .input('PlannerID', sql.VarChar, id)
            .query('SELECT * FROM Planner WHERE PlannerID = @PlannerID');
            
        if (jobRes.recordset.length === 0) {
            return res.status(404).json({ message: 'Planner Job not found' });
        }
        
        const job = jobRes.recordset[0];
        
        if (job.Status !== 'รอผลิต') {
            return res.status(400).json({ message: 'Job Order is not in pending status' });
        }
        
        // 2. Generate Production_Tasks
        const batchQty = job.BatchQty;
        const formulaCode = job.FormulaID ? job.FormulaID.replace(/[^A-Za-z0-9]/g, '') : 'UNK';
        const shortDate = getShortDatePrefix();
        const fullDate = getDatePrefix();
        
        const bPrefix = `B${shortDate}-${formulaCode}`;
        const ptPrefix = `PT-${fullDate}`;
        
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            for (let i = 0; i < batchQty; i++) {
                const taskId = await generateSequence(pool, 'Production_Tasks', 'TaskID', ptPrefix, 3);
                const batchNo = await generateSequence(pool, 'Production_Tasks', 'BatchNo', bPrefix, 2);
                
                await new sql.Request(transaction)
                    .input('TaskID', sql.VarChar, taskId)
                    .input('JobOrderID', sql.VarChar, id)
                    .input('FormulaName', sql.NVarChar, job.FormulaName)
                    .input('ProductName', sql.NVarChar, job.ProductName || job.FormulaName)
                    .input('ProcessName', sql.NVarChar, 'เตรียมวัตถุดิบ + ผสม')
                    .input('BatchNo', sql.VarChar, batchNo)
                    .input('Line', sql.VarChar, job.AssignedLine || 'Line A')
                    .input('ExpectedQty', sql.Int, Math.ceil((job.TotalQty || 0) / (job.BatchQty || 1)))
                    .input('ProducedQty', sql.Int, 0)
                    .input('DefectQty', sql.Int, 0)
                    .input('Status', sql.NVarChar, 'รอเริ่มงาน')
                    .input('CurrentStep', sql.VarChar, 'pending')
                    .input('StepTimesJSON', sql.NVarChar, JSON.stringify({ 'pending': new Date().toISOString().split('T')[0] + ' 08:00' }))
                    .input('WorkerID', sql.VarChar, 'system')
                    .query(`
                        INSERT INTO Production_Tasks (
                            TaskID, JobOrderID, FormulaName, ProductName, ProcessName, BatchNo, Line, 
                            ExpectedQty, ProducedQty, DefectQty, Status, CurrentStep, StepTimesJSON, WorkerID
                        )
                        VALUES (
                            @TaskID, @JobOrderID, @FormulaName, @ProductName, @ProcessName, @BatchNo, @Line,
                            @ExpectedQty, @ProducedQty, @DefectQty, @Status, @CurrentStep, @StepTimesJSON, @WorkerID
                        )
                    `);
            }
            
            // 3. Update Planner status
            await new sql.Request(transaction)
                .input('PlannerID', sql.VarChar, id)
                .input('Status', sql.NVarChar, 'กำลังผลิต')
                .query(`
                    UPDATE Planner 
                    SET Status = @Status 
                    WHERE PlannerID = @PlannerID
                `);
                
            await transaction.commit();
            res.json({ success: true, message: 'Job Order released successfully' });
            
        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
        
    } catch (err) {
        console.error('Error releasing planner job:', err);
        res.status(500).json({ message: 'Error releasing planner job' });
    }
});

module.exports = router;

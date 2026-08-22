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

// GET /tasks/:id/timeline
router.get('/tasks/:id/timeline', async (req, res) => {
    try {
        const taskId = req.params.id;
        const pool = await poolPromise;
        const events = [];

        // 1. Get Production Task
        const prodRes = await pool.request()
            .input('TaskID', sql.VarChar, taskId)
            .query(`SELECT * FROM Production_Tasks WHERE TaskID = @TaskID`);
        
        if (prodRes.recordset.length > 0) {
            const task = prodRes.recordset[0];
            const jo = task.JobOrderID;

            // Start Event
            if (task.CreatedAt) {
                events.push({
                    type: 'start',
                    title: 'เริ่มงาน / สร้างใบสั่งผลิต',
                    time: task.CreatedAt,
                    by: 'ฝ่ายวางแผน',
                    status: 'เสร็จสิ้น',
                    docType: null
                });
            }

            // Material Requisition
            let reqTime = task.CreatedAt;
            let steps = {};
            if (task.StepTimesJSON) {
                try {
                    steps = JSON.parse(task.StepTimesJSON);
                    if (steps.prepare) reqTime = steps.prepare;
                } catch(e){}
            }

            if (task.RequisitionJSON) {
                let reqBy = 'ฝ่ายผลิต';
                try {
                    const rData = JSON.parse(task.RequisitionJSON);
                    if (rData.requesterName) reqBy = rData.requesterName;
                } catch(e) {}
                events.push({
                    type: 'requisition',
                    title: 'เบิกวัตถุดิบ (Raw Materials)',
                    time: reqTime,
                    by: reqBy,
                    status: 'อนุมัติจ่ายของแล้ว',
                    docType: 'rm_req',
                    taskId: task.TaskID
                });
            }

            // Steps
            if (steps.prepare) {
                events.push({ type: 'step', title: 'กระบวนการ: เตรียมการ', time: steps.prepare, by: 'ฝ่ายผลิต', status: 'เสร็จสิ้น' });
            }
            if (steps.production_1) {
                events.push({ type: 'step', title: 'กระบวนการ: เตรียมวัตถุดิบ + ผสม', time: steps.production_1, by: 'ฝ่ายผลิต', status: 'เสร็จสิ้น' });
            }
            if (steps.production_2) {
                events.push({ type: 'step', title: 'กระบวนการ: บรรจุลงภาชนะ / พักรอ', time: steps.production_2, by: 'ฝ่ายผลิต', status: 'เสร็จสิ้น' });
            }
            if (steps.packaging) {
                events.push({ type: 'step', title: 'ส่งงานไปฝ่ายบรรจุภัณฑ์', time: steps.packaging, by: 'ระบบ', status: 'เสร็จสิ้น' });
            }

            // Finished
            if (task.Status === 'เสร็จสิ้น') {
                events.push({
                    type: 'finish',
                    title: 'จบงาน / นำของเข้าคลัง',
                    time: steps.stock || task.EndTime || task.UpdatedAt,
                    by: 'ระบบ',
                    status: 'เสร็จสิ้น'
                });
            }

            // 2. Get QC Requests
            const qcRes = await pool.request()
                .input('JobOrderID', sql.VarChar, jo)
                .input('BatchNo', sql.VarChar, task.BatchNo)
                .query(`SELECT * FROM QC_Production WHERE JobOrderID = @JobOrderID AND BatchNo = @BatchNo`);
            
            qcRes.recordset.forEach(qc => {
                const isCompleted = qc.Status !== 'รอตรวจ';
                const label = qc.Type === 'qc_inprocess' ? 'QC In-Process (ระหว่างผลิต)' : 'QC Final (ขั้นสุดท้าย)';
                events.push({
                    type: 'qc',
                    title: isCompleted ? `ส่งตรวจและประเมินผล ${label}` : `ส่งตรวจ ${label}`,
                    time: (isCompleted ? qc.InspectedAt : qc.RequestedAt) || qc.RequestedAt,
                    by: (isCompleted ? qc.Inspector : qc.RequesterName) || 'QC',
                    status: qc.Status,
                    docType: isCompleted ? 'qc_pdf' : null,
                    taskId: qc.RequestID,
                    notes: qc.Notes
                });
            });

            // 3. Get Packaging Tasks
            const pkgRes = await pool.request()
                .input('ProdTaskID', sql.VarChar, task.TaskID)
                .input('JobOrderID', sql.VarChar, jo)
                .query(`SELECT * FROM Packaging_Tasks WHERE ProductionTaskID = @ProdTaskID OR JobOrderID = @JobOrderID`);
            
            pkgRes.recordset.forEach(pkg => {
                // Packaging Requisition
                if (pkg.RequisitionJSON) {
                    let reqBy = 'ฝ่ายบรรจุภัณฑ์';
                    try {
                        const pData = JSON.parse(pkg.RequisitionJSON);
                        if (pData.requesterName) reqBy = pData.requesterName;
                    } catch(e){}
                    events.push({
                        type: 'requisition',
                        title: 'เบิกบรรจุภัณฑ์ (Packaging Materials)',
                        time: pkg.CreatedAt,
                        by: reqBy,
                        status: 'อนุมัติจ่ายของแล้ว',
                        docType: 'pkg_req',
                        taskId: pkg.TaskID
                    });
                }
            });

            // 4. Get WIP Tasks (Sub-tasks for this JobOrder)
            const wipRes = await pool.request()
                .input('JobOrderID', sql.VarChar, jo)
                .input('TaskID', sql.VarChar, task.TaskID)
                .query(`SELECT * FROM Production_Tasks WHERE JobOrderID = @JobOrderID AND TaskID != @TaskID AND (Line = 'WIP Line' OR BatchNo LIKE '%-WIP%')`);
            
            for (let wip of wipRes.recordset) {
                // WIP Created
                events.push({
                    type: 'wip',
                    title: `ส่งคำสั่งผลิต WIP (${wip.FormulaName})`,
                    time: wip.CreatedAt,
                    by: 'ฝ่ายผลิต',
                    status: wip.Status,
                    docType: null
                });
                
                // WIP QC Requests
                const wipQcRes = await pool.request()
                    .input('JobOrderID', sql.VarChar, jo)
                    .input('BatchNo', sql.VarChar, wip.BatchNo)
                    .query(`SELECT * FROM QC_Production WHERE JobOrderID = @JobOrderID AND BatchNo = @BatchNo`);
                
                wipQcRes.recordset.forEach(qc => {
                    const isCompleted = qc.Status !== 'รอตรวจ';
                    const label = qc.Type === 'qc_inprocess' ? 'QC In-Process (WIP)' : 'QC Final (WIP)';
                    events.push({
                        type: 'qc',
                        title: isCompleted ? `ส่งตรวจและประเมินผล ${label} - ${wip.FormulaName}` : `ส่งตรวจ ${label} - ${wip.FormulaName}`,
                        time: (isCompleted ? qc.InspectedAt : qc.RequestedAt) || qc.RequestedAt,
                        by: (isCompleted ? qc.Inspector : qc.RequesterName) || 'QC',
                        status: qc.Status,
                        docType: isCompleted ? 'qc_pdf' : null,
                        taskId: qc.RequestID,
                        notes: qc.Notes
                    });
                });
            }
        }

        // Sort chronologically
        events.sort((a, b) => new Date(a.time) - new Date(b.time));
        res.json(events);
    } catch (err) {
        console.error('Error fetching timeline:', err);
        res.status(500).json({ message: 'Error fetching timeline' });
    }
});

// Get all production tasks
router.get('/tasks', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT pt.*, p.Unit as PlannerUnit 
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
                productName: row.ProductName || row.FormulaName,
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
                jobUnit: row.JobUnit || row.PlannerUnit,
                RequisitionJSON: row.RequisitionJSON
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
        const { formulaName, expectedQty, unit, tankNo, sourceJobOrderId, requisitionItems, requesterName } = req.body;
        const pool = await poolPromise;
        
        // Generate IDs
        const datePrefix = getDatePrefix();
        // Use parent planner's JO ID if provided, otherwise generate a new one
        const joId = sourceJobOrderId || await generateSequence(pool, 'Production_Tasks', 'JobOrderID', `JO-${datePrefix}`, 3);
        const taskId = await generateSequence(pool, 'Production_Tasks', 'TaskID', `WIP-${datePrefix}`, 3);
        const batchNo = await generateSequence(pool, 'Production_Tasks', 'BatchNo', `B${datePrefix}-WIP`, 2, '-');

        let productName = null;
        if (joId) {
            const pRes = await pool.request()
                .input('PlannerID', sql.VarChar, joId)
                .query('SELECT ProductName FROM Planner WHERE PlannerID = @PlannerID');
            if (pRes.recordset.length > 0) {
                productName = pRes.recordset[0].ProductName;
            }
        }

        let reqJsonStr = null;
        if (requisitionItems) {
            reqJsonStr = JSON.stringify([{ items: requisitionItems, requesterName: requesterName || 'ไม่ระบุ', requestedAt: new Date().toISOString() }]);
        }

        await pool.request()
            .input('TaskID', sql.VarChar, taskId)
            .input('JobOrderID', sql.VarChar, joId)
            .input('BatchNo', sql.VarChar, batchNo)
            .input('FormulaName', sql.NVarChar, formulaName)
            .input('ProductName', sql.NVarChar, productName)
            .input('Line', sql.VarChar, tankNo || 'WIP Line')
            .input('ExpectedQty', sql.Float, expectedQty)
            .input('JobUnit', sql.NVarChar, unit || 'กรัม')
            .input('CurrentStep', sql.VarChar, requisitionItems ? 'requisition' : 'wait')
            .input('Status', sql.NVarChar, requisitionItems ? 'รอเบิกวัตถุดิบ' : 'รอเริ่มงาน')
            .input('RequisitionJSON', sql.NVarChar, reqJsonStr)
            .query(`
                INSERT INTO Production_Tasks (
                    TaskID, JobOrderID, BatchNo, FormulaName, ProductName, Line, 
                    ExpectedQty, JobUnit, CurrentStep, Status, CreatedAt, RequisitionJSON
                ) VALUES (
                    @TaskID, @JobOrderID, @BatchNo, @FormulaName, @ProductName, @Line,
                    @ExpectedQty, @JobUnit, @CurrentStep, @Status, GETDATE(), @RequisitionJSON
                )
            `);
            
        res.status(201).json({ message: 'สร้างใบสั่งผลิต WIP สำเร็จ', taskId, jobOrderId: joId, batchNo });
    } catch (err) {
        console.error('Error creating WIP task:', err);
        res.status(500).json({ message: 'Error creating WIP task', error: err.message, stack: err.stack });
    }
});

// Submit requisition for existing task
router.put('/tasks/:id/requisition', authorizeRoles('admin', 'executive', 'planner', 'operator'), async (req, res) => {
    try {
        const { requisitionItems, requesterName } = req.body;
        const taskId = req.params.id;
        
        if (!requisitionItems || requisitionItems.length === 0) {
            return res.status(400).json({ message: 'No requisition items provided' });
        }

        const pool = await poolPromise;
        const reqJsonStr = JSON.stringify({ items: requisitionItems, requesterName: requesterName || 'ไม่ระบุ' });

        const result = await pool.request()
            .input('TaskID', sql.VarChar, taskId)
            .input('RequisitionJSON', sql.NVarChar, reqJsonStr)
            .input('CurrentStep', sql.VarChar, 'requisition')
            .input('Status', sql.NVarChar, 'รอเบิกวัตถุดิบ')
            .query(`
                UPDATE Production_Tasks 
                SET RequisitionJSON = @RequisitionJSON, CurrentStep = @CurrentStep, Status = @Status 
                OUTPUT INSERTED.* 
                WHERE TaskID = @TaskID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json({ message: 'ส่งใบเบิกสำเร็จ', task: result.recordset[0] });
    } catch (err) {
        console.error('Error submitting requisition:', err);
        res.status(500).json({ message: 'Error submitting requisition' });
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

        // --- Integration: Deduct WIP Stock when advancing to 'packaging' (or legacy 'production_1') ---
        if ((currentStep === 'production_1' || currentStep === 'packaging') && req.body.usedWip && req.body.usedWip.id) {
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
                await pool.request()
                    .input('ItemID', sql.VarChar, id)
                    .input('ProductName', sql.NVarChar, name)
                    .input('Type', sql.VarChar, 'out')
                    .input('Quantity', sql.Float, requiredQty)
                    .input('RefNo', sql.VarChar, taskId)
                    .input('RefType', sql.VarChar, 'production')
                    .input('Notes', sql.NVarChar, `เบิกใช้ในกระบวนการผลิตงาน ${taskId}`)
                    .input('CreatedBy', sql.NVarChar, req.user ? req.user.username : 'system')
                    .query(`
                        INSERT INTO Stock_Logs (ItemID, ProductName, Type, Quantity, RefNo, RefType, Notes, CreatedBy)
                        VALUES (@ItemID, @ProductName, @Type, @Quantity, @RefNo, @RefType, @Notes, @CreatedBy)
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
                    .query('SELECT TaskID, JobOrderID, BatchNo, FormulaName, ProductName, Line, ExpectedQty, ProducedQty FROM Production_Tasks WHERE TaskID = @ProdTaskID');
                
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
                            .input('Product', sql.NVarChar, taskData.ProductName || taskData.FormulaName)
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

// Route a WIP Task (Send to Packaging OR send to WIP Stock)
router.put('/tasks/:id/route-wip', authorizeRoles('admin', 'executive', 'planner', 'operator'), async (req, res) => {
    try {
        const { action } = req.body;
        const taskId = req.params.id;
        const pool = await poolPromise;
        
        const taskRes = await pool.request()
            .input('TaskID', sql.VarChar, taskId)
            .query('SELECT * FROM Production_Tasks WHERE TaskID = @TaskID');
            
        if (taskRes.recordset.length === 0) return res.status(404).json({ message: 'Task not found' });
        const task = taskRes.recordset[0];
        
        let stepTimes = {};
        try { stepTimes = JSON.parse(task.StepTimesJSON || '{}'); } catch(e) {}
        
        if (action === 'packaging') {
            stepTimes['production_2'] = new Date().toISOString();
            await pool.request()
                .input('TaskID', sql.VarChar, taskId)
                .input('StepTimesJSON', sql.NVarChar, JSON.stringify(stepTimes))
                .query(`
                    UPDATE Production_Tasks 
                    SET CurrentStep = 'production_2', Status = N'กำลังทำ', StepTimesJSON = @StepTimesJSON
                    WHERE TaskID = @TaskID
                `);
            
            // Auto-create packaging task immediately to replicate advance step logic
            try {
                const pkgId = await generateSequence(pool, 'Packaging_Tasks', 'TaskID', `PKG-${getDatePrefix()}`, 3);
                let pkgDestination = 'คลัง';
                if (task.JobOrderID) {
                    try {
                        const plannerCheck = await pool.request()
                            .input('PlannerIDCheck', sql.VarChar, task.JobOrderID)
                            .query('SELECT Notes FROM Planner WHERE PlannerID = @PlannerIDCheck');
                        if (plannerCheck.recordset.length > 0) {
                            const pNotes = plannerCheck.recordset[0].Notes || '';
                            if (pNotes.includes('OEM') || pNotes.includes('ผลิตตาม')) pkgDestination = 'ส่งลูกค้า';
                        }
                    } catch(pe) {}
                }
                await pool.request()
                    .input('TaskID', sql.VarChar, pkgId)
                    .input('BatchNo', sql.VarChar, task.BatchNo)
                    .input('Product', sql.NVarChar, task.ProductName || task.FormulaName)
                    .input('Line', sql.VarChar, task.Line)
                    .input('Qty', sql.Float, task.ExpectedQty || task.ProducedQty || 0)
                    .input('PackedQty', sql.Float, 0)
                    .input('Status', sql.NVarChar, 'รอบรรจุ')
                    .input('Destination', sql.NVarChar, pkgDestination)
                    .input('ProductionTaskID', sql.VarChar, taskId)
                    .input('JobOrderID', sql.VarChar, task.JobOrderID)
                    .query(`
                        INSERT INTO Packaging_Tasks 
                        (TaskID, BatchNo, Product, Line, Qty, PackedQty, Status, Destination, ProductionTaskID, JobOrderID)
                        VALUES (@TaskID, @BatchNo, @Product, @Line, @Qty, @PackedQty, @Status, @Destination, @ProductionTaskID, @JobOrderID)
                    `);
            } catch(e) { console.error('Error auto-creating packaging task:', e); }

            return res.json({ message: 'Routed to packaging' });
            
        } else if (action === 'wip_stock') {
            stepTimes['stock'] = new Date().toISOString();
            await pool.request()
                .input('TaskID', sql.VarChar, taskId)
                .input('StepTimesJSON', sql.NVarChar, JSON.stringify(stepTimes))
                .query(`
                    UPDATE Production_Tasks 
                    SET CurrentStep = 'stock', Status = N'เสร็จสิ้น', EndTime = GETDATE(), StepTimesJSON = @StepTimesJSON
                    WHERE TaskID = @TaskID
                `);
                
            const productName = (task.ProductName || task.FormulaName) + ' (WIP)';
            
            // Check if WIP item already exists
            const existingItem = await pool.request()
                .input('ProductName', sql.NVarChar, productName)
                .input('Category', sql.NVarChar, 'สินค้ากึ่งสำเร็จรูป')
                .query(`SELECT ItemID, Quantity FROM Stock_Items WHERE ProductName = @ProductName AND Category = @Category`);
            
            let itemId;
            let currentQty = 0;
            const addedQty = task.ProducedQty > 0 ? task.ProducedQty : task.ExpectedQty;

            if (existingItem.recordset.length > 0) {
                // Update existing
                itemId = existingItem.recordset[0].ItemID;
                currentQty = existingItem.recordset[0].Quantity || 0;
                await pool.request()
                    .input('ItemID', sql.VarChar, itemId)
                    .input('Quantity', sql.Float, currentQty + addedQty)
                    .query(`UPDATE Stock_Items SET Quantity = @Quantity, UpdatedAt = GETDATE() WHERE ItemID = @ItemID`);
            } else {
                // Create new
                itemId = await generateSequence(pool, 'Stock_Items', 'ItemID', 'WIP', 4);
                await pool.request()
                    .input('ItemID', sql.VarChar, itemId)
                    .input('FormulaID', sql.VarChar, task.FormulaID || null)
                    .input('ProductName', sql.NVarChar, productName)
                    .input('Category', sql.NVarChar, 'สินค้ากึ่งสำเร็จรูป')
                    .input('Quantity', sql.Float, addedQty)
                    .input('Unit', sql.NVarChar, task.JobUnit || 'กรัม')
                    .query(`
                        INSERT INTO Stock_Items (ItemID, FormulaID, ProductName, Category, Quantity, Unit)
                        VALUES (@ItemID, @FormulaID, @ProductName, @Category, @Quantity, @Unit)
                    `);
            }
                
            await pool.request()
                .input('ItemID', sql.VarChar, itemId)
                .input('Type', sql.VarChar, 'IN')
                .input('Quantity', sql.Float, addedQty)
                .input('RefNo', sql.VarChar, task.BatchNo)
                .input('RefType', sql.VarChar, 'production_wip')
                .input('ProductName', sql.NVarChar, productName)
                .input('Notes', sql.NVarChar, 'รับเข้าคลังสินค้ากึ่งสำเร็จรูป (WIP)')
                .input('CreatedBy', sql.VarChar, req.user ? (req.user.username || req.user.name || 'operator') : 'operator')
                .query(`
                    INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, ProductName, Notes, CreatedBy)
                    VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @ProductName, @Notes, @CreatedBy)
                `);
                
            return res.json({ message: 'Routed to WIP Stock' });
        }
        
        return res.status(400).json({ message: 'Invalid action' });
    } catch (err) {
        console.error('Route WIP error:', err);
        res.status(500).json({ message: err.message || 'Internal server error', error: err.message, stack: err.stack });
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

const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { generateSequence, getDatePrefix } = require('../utils/sequence');
const { authorizeRoles } = require('../middleware/authorize');
const { autoDeductPackaging } = require('../utils/stockDeduction');

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
// PACKAGING TASKS MODULE
// ==========================================

// Get all packaging tasks
router.get('/tasks', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                pt.*, 
                p.FormulaName,
                pl.Notes as PlannerNotes
            FROM Packaging_Tasks pt
            LEFT JOIN Production_Tasks p ON pt.ProductionTaskID = p.TaskID
            LEFT JOIN Planner pl ON pt.JobOrderID = pl.PlannerID
            ORDER BY 
                CASE pt.Status 
                    WHEN N'กำลังบรรจุ' THEN 1 
                    WHEN N'รอบรรจุ' THEN 2 
                    WHEN N'บรรจุเสร็จ' THEN 3 
                    WHEN N'รอ QC Final' THEN 4
                    WHEN N'QC ผ่าน' THEN 5
                    ELSE 6 
                END ASC, 
                pt.CreatedAt DESC
        `);

        // Format data to match frontend expectations (null-safe)
        const formattedTasks = result.recordset.map(row => {
            // Determine productionType from PlannerNotes
            let pType = 'ผลิตตามแผน (MTS)';
            if (row.PlannerNotes) {
                const notesStr = row.PlannerNotes.toLowerCase();
                if (notesStr.includes('oem') || notesStr.includes('ผลิตตามออร์เดอร์') || notesStr.includes('ผลิตตามออเดอร์') || notesStr.includes('ผลิตตามคำสั่งซื้อ')) {
                    pType = 'ผลิตตามคำสั่งซื้อ (OEM)';
                }
            }

            return {
                id: row.TaskID,
                code: row.TaskID,
                product: row.Product || '',
                formulaName: row.FormulaName || row.Product || '',
                batch: row.BatchNo || '',
                packType: row.PackType || '-',
                line: row.Line || '-',
                qty: row.Qty || 0,
                packed: row.PackedQty || 0,
                defectQty: row.DefectQty || 0,
                assignee: row.Assignee || '-',
                dueDate: row.DueDate ? formatDateLocal(row.DueDate) : null,
                status: row.Status || 'รอบรรจุ',
                destination: row.Destination || 'คลัง',
                customer: row.Customer || null,
                note: row.Note || null,
                productionTaskId: row.ProductionTaskID || null,
                jobOrderId: row.JobOrderID || null,
                productionType: pType,
            requisitionJSON: row.RequisitionJSON || null,
            createdAt: row.CreatedAt,
            updatedAt: row.UpdatedAt
        };
        });

        res.json(formattedTasks);
    } catch (err) {
        console.error('Error fetching packaging tasks:', err);
        res.status(500).json({ message: 'Error fetching packaging tasks' });
    }
});

// Update task progress (PackedQty and DefectQty)
router.put('/tasks/:id/progress', authorizeRoles('admin', 'executive', 'packaging', 'operator'), async (req, res) => {
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
                    Status = CASE 
                        WHEN (ISNULL(PackedQty, 0) + @AddedQty + ISNULL(DefectQty, 0) + @DefectQty) >= Qty THEN N'บรรจุเสร็จ'
                        WHEN (ISNULL(PackedQty, 0) + @AddedQty + ISNULL(DefectQty, 0) + @DefectQty) > 0 THEN N'กำลังบรรจุ'
                        ELSE Status 
                    END,
                    UpdatedAt = GETDATE()
                OUTPUT INSERTED.*
                WHERE TaskID = @TaskID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const updatedTask = result.recordset[0];

        // --- Auto Labeling: เมื่อยอดรวม (ดี+เสีย) >= Qty → สร้างงานติดฉลากอัตโนมัติ ---
        if ((updatedTask.PackedQty + updatedTask.DefectQty) >= updatedTask.Qty && updatedTask.Status !== 'รอ QC Final' && updatedTask.Status !== 'QC ผ่าน') {
            // 1. Update packaging status to 'บรรจุเสร็จ-รอติดฉลาก'
            await pool.request()
                .input('TaskID', sql.VarChar, taskId)
                .query(`UPDATE Packaging_Tasks SET Status = N'บรรจุเสร็จ-รอติดฉลาก', UpdatedAt = GETDATE() WHERE TaskID = @TaskID`);

            // 2. Determine label type (MTS vs OEM)
            let labelType = 'stock';
            let customerName = null;
            if (updatedTask.JobOrderID) {
                try {
                    const plannerRes = await pool.request()
                        .input('PlannerID', sql.VarChar, updatedTask.JobOrderID)
                        .query('SELECT Notes, CustomerName FROM Planner WHERE PlannerID = @PlannerID');
                    if (plannerRes.recordset.length > 0) {
                        const pNotes = plannerRes.recordset[0].Notes || '';
                        if (pNotes.includes('OEM') || pNotes.includes('ผลิตตามออร์เดอร์')) {
                            labelType = 'custom';
                            customerName = plannerRes.recordset[0].CustomerName || null;
                        }
                    }
                } catch (e) { /* ignore */ }
            }
            if (updatedTask.Destination === 'ส่งลูกค้า') {
                labelType = 'custom';
                customerName = customerName || updatedTask.Customer || null;
            }

            // 3. Get label configurations for this product (MTS only)
            let labelConfigJSON = null;
            let initialStatus = labelType === 'custom' ? 'รอสั่งสติ๊กเกอร์' : 'รอสติ๊กเกอร์';
            if (labelType === 'stock') {
                try {
                    // Find FG item by product name
                    const fgRes = await pool.request()
                        .input('ProductName', sql.NVarChar, updatedTask.Product)
                        .query(`SELECT ItemID FROM Stock_Items WHERE ProductName = @ProductName AND Category = N'สินค้าสำเร็จรูป'`);
                    
                    if (fgRes.recordset.length > 0) {
                        const fgItemId = fgRes.recordset[0].ItemID;
                        const configRes = await pool.request()
                            .input('FGItemID', sql.VarChar, fgItemId)
                            .query('SELECT * FROM Label_Configurations WHERE FGItemID = @FGItemID');
                        
                        if (configRes.recordset.length > 0) {
                            const configs = [];
                            let allSufficient = true;
                            for (const cfg of configRes.recordset) {
                                const stockRes = await pool.request()
                                    .input('StickerID', sql.VarChar, cfg.StickerItemID)
                                    .query('SELECT Quantity FROM Stock_Items WHERE ItemID = @StickerID');
                                const stockQty = stockRes.recordset.length > 0 ? stockRes.recordset[0].Quantity : 0;
                                const needed = (cfg.QtyPerUnit || 1) * updatedTask.Qty;
                                if (stockQty < needed) allSufficient = false;
                                configs.push({
                                    stickerItemId: cfg.StickerItemID,
                                    stickerName: cfg.StickerName,
                                    applyTo: cfg.ApplyTo,
                                    qtyPerUnit: cfg.QtyPerUnit,
                                    stockAvailable: stockQty,
                                    needed: needed
                                });
                            }
                            labelConfigJSON = JSON.stringify(configs);
                            initialStatus = allSufficient ? 'พร้อมติดฉลาก' : 'รอสติ๊กเกอร์';
                        } else {
                            // No label config = skip labeling, go directly to QC Final
                            initialStatus = null;
                        }
                    } else {
                        // FG not found in stock, skip labeling
                        initialStatus = null;
                    }
                } catch (cfgErr) {
                    console.error('Error checking label config:', cfgErr);
                    initialStatus = null;
                }
            }

            // 4. Create Labeling Task (or skip to QC Final if no config)
            if (initialStatus) {
                try {
                    const lblId = await generateSequence(pool, 'Labeling_Tasks', 'TaskID', `LBL-${getDatePrefix()}`, 3);
                    await pool.request()
                        .input('TaskID', sql.VarChar, lblId)
                        .input('PackagingTaskID', sql.VarChar, taskId)
                        .input('ProductionTaskID', sql.VarChar, updatedTask.ProductionTaskID || null)
                        .input('JobOrderID', sql.VarChar, updatedTask.JobOrderID || null)
                        .input('ProductName', sql.NVarChar, updatedTask.Product)
                        .input('BatchNo', sql.VarChar, updatedTask.BatchNo)
                        .input('Qty', sql.Int, updatedTask.PackedQty || updatedTask.Qty)
                        .input('LabelType', sql.VarChar, labelType)
                        .input('CustomerName', sql.NVarChar, customerName)
                        .input('Status', sql.NVarChar, initialStatus)
                        .input('Line', sql.VarChar, updatedTask.Line || 'Line A')
                        .input('LabelConfigJSON', sql.NVarChar, labelConfigJSON)
                        .query(`
                            INSERT INTO Labeling_Tasks (TaskID, PackagingTaskID, ProductionTaskID, JobOrderID, ProductName, BatchNo, Qty, LabelType, CustomerName, Status, Line, LabelConfigJSON)
                            VALUES (@TaskID, @PackagingTaskID, @ProductionTaskID, @JobOrderID, @ProductName, @BatchNo, @Qty, @LabelType, @CustomerName, @Status, @Line, @LabelConfigJSON)
                        `);
                    console.log(`✅ Auto Labeling Task: ${lblId} (${labelType}) for Batch ${updatedTask.BatchNo}`);

                    // Sync Production stepper to labeling
                    if (updatedTask.ProductionTaskID) {
                        const prodResult = await pool.request()
                            .input('ProdTaskID', sql.VarChar, updatedTask.ProductionTaskID)
                            .query('SELECT StepTimesJSON FROM Production_Tasks WHERE TaskID = @ProdTaskID');
                        let stepTimes = {};
                        if (prodResult.recordset.length > 0 && prodResult.recordset[0].StepTimesJSON) {
                            try { stepTimes = JSON.parse(prodResult.recordset[0].StepTimesJSON); } catch(e) {}
                        }
                        stepTimes['labeling'] = new Date().toISOString();
                        await pool.request()
                            .input('ProdTaskID', sql.VarChar, updatedTask.ProductionTaskID)
                            .input('StepTimesJSON', sql.NVarChar, JSON.stringify(stepTimes))
                            .query(`UPDATE Production_Tasks SET CurrentStep = 'labeling', StepTimesJSON = @StepTimesJSON WHERE TaskID = @ProdTaskID`);
                    }
                } catch (lblErr) {
                    console.error('Error creating labeling task:', lblErr);
                }
            } else {
                // No label configuration → fallback to original QC Final flow
                await pool.request()
                    .input('TaskID', sql.VarChar, taskId)
                    .query(`UPDATE Packaging_Tasks SET Status = N'รอ QC Final', UpdatedAt = GETDATE() WHERE TaskID = @TaskID`);

                const qcRequestId = await generateSequence(pool, 'QC_Production', 'RequestID', `QCF-${getDatePrefix()}`, 3);
                try {
                    await pool.request()
                        .input('RequestID', sql.VarChar, qcRequestId)
                        .input('TaskID', sql.VarChar, updatedTask.ProductionTaskID || taskId)
                        .input('JobOrderID', sql.VarChar, updatedTask.JobOrderID || updatedTask.BatchNo)
                        .input('BatchNo', sql.VarChar, updatedTask.BatchNo)
                        .input('FormulaName', sql.NVarChar, updatedTask.Product)
                        .input('Line', sql.VarChar, updatedTask.Line || 'Line A')
                        .input('Type', sql.VarChar, 'qc_final')
                        .input('Status', sql.NVarChar, 'รอตรวจ')
                        .query(`
                            INSERT INTO QC_Production (RequestID, TaskID, JobOrderID, BatchNo, FormulaName, Line, Type, Status, RequestedAt)
                            VALUES (@RequestID, @TaskID, @JobOrderID, @BatchNo, @FormulaName, @Line, @Type, @Status, GETDATE())
                        `);
                    console.log(`✅ Auto QC Final (no label config): ${qcRequestId}`);
                } catch (qcErr) {
                    console.error('Error auto-creating QC:', qcErr);
                }

                if (updatedTask.ProductionTaskID) {
                    const prodResult = await pool.request()
                        .input('ProdTaskID', sql.VarChar, updatedTask.ProductionTaskID)
                        .query('SELECT StepTimesJSON FROM Production_Tasks WHERE TaskID = @ProdTaskID');
                    let stepTimes = {};
                    if (prodResult.recordset.length > 0 && prodResult.recordset[0].StepTimesJSON) {
                        try { stepTimes = JSON.parse(prodResult.recordset[0].StepTimesJSON); } catch(e) {}
                    }
                    stepTimes['qc_final'] = new Date().toISOString();
                    await pool.request()
                        .input('ProdTaskID', sql.VarChar, updatedTask.ProductionTaskID)
                        .input('StepTimesJSON', sql.NVarChar, JSON.stringify(stepTimes))
                        .query(`UPDATE Production_Tasks SET CurrentStep = 'qc_final', StepTimesJSON = @StepTimesJSON WHERE TaskID = @ProdTaskID`);
                }
            }
        }

        res.json(updatedTask);
    } catch (err) {
        console.error('Error updating packaging progress:', err);
        res.status(500).json({ message: 'Error updating packaging progress' });
    }
});

// Submit requisition for existing task
router.put('/tasks/:id/requisition', authorizeRoles('admin', 'executive', 'packaging', 'operator'), async (req, res) => {
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
            .input('Status', sql.NVarChar, 'รอเบิกบรรจุภัณฑ์')
            .query(`
                UPDATE Packaging_Tasks 
                SET RequisitionJSON = @RequisitionJSON, Status = @Status, UpdatedAt = GETDATE()
                OUTPUT INSERTED.* 
                WHERE TaskID = @TaskID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json({ message: 'ส่งใบเบิกสำเร็จ', task: result.recordset[0] });
    } catch (err) {
        console.error('Error submitting packaging requisition:', err);
        res.status(500).json({ message: 'Error submitting requisition', error: err.message });
    }
});

// Update task status (e.g. ส่งไป QC, หรือ ส่งเข้าคลัง)
router.put('/tasks/:id/status', authorizeRoles('admin', 'executive', 'packaging', 'operator'), async (req, res) => {
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

        // --- Auto Deduct Packaging Materials ---
        // REMOVED: Stock deduction is now handled by the warehouse when approving the requisition.
        // if (status === 'กำลังบรรจุ') {
        //     const reqUser = req.user ? req.user.username : 'system';
        //     autoDeductPackaging(taskId, reqUser).catch(e => console.error("Auto deduct packaging error:", e));
        // }

        if (status === 'กำลังบรรจุ') {
            await syncProductionStep('packaging', 'กำลังทำ', false);
        }

        // บรรจุเสร็จ → Auto-send QC Final + sync production
        if (status === 'บรรจุเสร็จ') {
            // Auto-create QC Final request
            const qcRequestId = await generateSequence(pool, 'QC_Production', 'RequestID', `QCF-${getDatePrefix()}`, 3);
            try {
                await pool.request()
                    .input('RequestID', sql.VarChar, qcRequestId)
                    .input('QCTaskID', sql.VarChar, updatedTask.ProductionTaskID || taskId)
                    .input('QCJobOrderID', sql.VarChar, updatedTask.JobOrderID || updatedTask.BatchNo)
                    .input('QCBatchNo', sql.VarChar, updatedTask.BatchNo)
                    .input('QCFormulaName', sql.NVarChar, updatedTask.Product)
                    .input('QCLine', sql.VarChar, updatedTask.Line || 'Line A')
                    .input('QCType', sql.VarChar, 'qc_final')
                    .input('QCStatus', sql.NVarChar, 'รอตรวจ')
                    .query(`
                        INSERT INTO QC_Production (RequestID, TaskID, JobOrderID, BatchNo, FormulaName, Line, Type, Status, RequestedAt)
                        VALUES (@RequestID, @QCTaskID, @QCJobOrderID, @QCBatchNo, @QCFormulaName, @QCLine, @QCType, @QCStatus, GETDATE())
                    `);
                console.log(`✅ Auto QC Final (from status): ${qcRequestId} for Batch ${updatedTask.BatchNo}`);
            } catch (qcErr) {
                console.error('❌ Error auto-creating QC request:', qcErr);
            }

            // Update status to 'รอ QC Final'
            await pool.request()
                .input('TaskID2', sql.VarChar, taskId)
                .query(`UPDATE Packaging_Tasks SET Status = N'รอ QC Final', UpdatedAt = GETDATE() WHERE TaskID = @TaskID2`);
            updatedTask.Status = 'รอ QC Final';

            // Sync production to qc_final
            await syncProductionStep('qc_final', 'กำลังทำ', false);
        }

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

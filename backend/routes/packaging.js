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
                    Status = CASE 
                        WHEN (ISNULL(PackedQty, 0) + @AddedQty) >= Qty THEN N'บรรจุเสร็จ'
                        WHEN (ISNULL(PackedQty, 0) + @AddedQty) > 0 THEN N'กำลังบรรจุ'
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

        // --- Auto QC Final: เมื่อ PackedQty >= Qty → ส่ง QC Final อัตโนมัติ ---
        if (updatedTask.PackedQty >= updatedTask.Qty && updatedTask.Status !== 'รอ QC Final' && updatedTask.Status !== 'QC ผ่าน') {
            // 1. Update status to 'รอ QC Final'
            await pool.request()
                .input('TaskID', sql.VarChar, taskId)
                .query(`UPDATE Packaging_Tasks SET Status = N'รอ QC Final', UpdatedAt = GETDATE() WHERE TaskID = @TaskID`);

            // 2. Auto-create QC Request
            const qcRequestId = `QCR-${Date.now()}`;
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
                console.log(`✅ Auto QC Final: ${qcRequestId} for Batch ${updatedTask.BatchNo} (PackedQty: ${updatedTask.PackedQty}/${updatedTask.Qty})`);
            } catch (qcErr) {
                console.error('❌ Error auto-creating QC request:', qcErr);
            }

            // 3. Sync Production stepper to qc_final
            if (updatedTask.ProductionTaskID) {
                try {
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
                    console.log(`✅ Synced Production ${updatedTask.ProductionTaskID} → qc_final`);
                } catch (syncErr) {
                    console.error('❌ Error syncing production:', syncErr);
                }
            }
        }

        res.json(updatedTask);
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

        // บรรจุเสร็จ → Auto-send QC Final + sync production
        if (status === 'บรรจุเสร็จ') {
            // Auto-create QC Final request
            const qcRequestId = `QCR-${Date.now()}`;
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

            // --- Auto-receive into Stock (คลังสินค้า) ---
            try {
                const prodTaskId = updatedTask.ProductionTaskID;
                const batchNo = updatedTask.BatchNo;
                const productName = updatedTask.Product;

                // Get produced qty from Production_Tasks
                let goodQty = updatedTask.PackedQty || 0;
                let defectQty = 0;
                if (prodTaskId) {
                    const prodData = await pool.request()
                        .input('ProdTaskID', sql.VarChar, prodTaskId)
                        .query('SELECT ProducedQty, DefectQty, JobOrderID FROM Production_Tasks WHERE TaskID = @ProdTaskID');
                    if (prodData.recordset.length > 0) {
                        const pd = prodData.recordset[0];
                        goodQty = (pd.ProducedQty || 0) - (pd.DefectQty || 0);
                        // Fallback: ถ้า ProducedQty = 0 ใช้ PackedQty จาก Packaging
                        if (goodQty <= 0 && updatedTask.PackedQty > 0) {
                            goodQty = updatedTask.PackedQty;
                        }
                        defectQty = pd.DefectQty || 0;

                        // Check if OEM (ผลิตตามออเดอร์) → ไม่เข้าคลัง
                        let isOEM = false;
                        if (pd.JobOrderID) {
                            const plannerRes = await pool.request()
                                .input('PlannerID', sql.VarChar, pd.JobOrderID)
                                .query('SELECT Notes FROM Planner WHERE PlannerID = @PlannerID');
                            if (plannerRes.recordset.length > 0) {
                                isOEM = (plannerRes.recordset[0].Notes || '').includes('ผลิตตามออเดอร์');
                            }
                        }

                        if (isOEM) {
                            // OEM → บันทึก log เป็น "ส่งตรง" แต่ไม่เพิ่มยอดคลัง
                            await pool.request()
                                .input('ItemID', sql.VarChar, 'OEM-DIRECT')
                                .input('Type', sql.VarChar, 'OUT')
                                .input('Quantity', sql.Int, goodQty)
                                .input('RefNo', sql.VarChar, batchNo)
                                .input('RefType', sql.VarChar, 'oem_direct')
                                .input('ProductName', sql.NVarChar, productName)
                                .input('Notes', sql.NVarChar, `OEM ส่งตรงให้ลูกค้า — Batch: ${batchNo} (${goodQty} ชิ้น)`)
                                .input('CreatedBy', sql.VarChar, 'system')
                                .query(`INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, ProductName, Notes, CreatedBy)
                                        VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @ProductName, @Notes, @CreatedBy)`);

                            // --- Auto-create Shipping Order for OEM ---
                            const shipId = `SHP-${Date.now().toString().slice(-6)}`;
                            const plannerNotes = plannerRes.recordset[0]?.Notes || '';
                            const custMatch = plannerNotes.match(/ลูกค้า:\s*(.+?)(?:\s*\||$)/);
                            const poMatch = plannerNotes.match(/PO:\s*(.+?)(?:\s*\||$)/);

                            // Get priority & dueDate from Planner
                            const plannerDetail = await pool.request()
                                .input('PlannerID2', sql.VarChar, pd.JobOrderID)
                                .query('SELECT Priority, DueDate FROM Planner WHERE PlannerID = @PlannerID2');
                            const planInfo = plannerDetail.recordset[0] || {};

                            await pool.request()
                                .input('ShipmentID', sql.VarChar, shipId)
                                .input('ShipBatchNo', sql.VarChar, batchNo)
                                .input('ShipJobOrderID', sql.VarChar, pd.JobOrderID)
                                .input('ShipProdTaskID', sql.VarChar, prodTaskId)
                                .input('ShipProductName', sql.NVarChar, productName)
                                .input('ShipQty', sql.Int, goodQty)
                                .input('ShipCustomerName', sql.NVarChar, custMatch ? custMatch[1].trim() : '')
                                .input('ShipCustomerPO', sql.NVarChar, poMatch ? poMatch[1].trim() : '')
                                .input('ShipPriority', sql.NVarChar, planInfo.Priority || 'ปกติ')
                                .input('ShipDueDate', sql.Date, planInfo.DueDate || null)
                                .input('ShipNotes', sql.NVarChar, `OEM จากการผลิต Batch: ${batchNo}`)
                                .query(`INSERT INTO Shipping_Orders (ShipmentID, BatchNo, JobOrderID, ProductionTaskID, ProductName, Quantity, CustomerName, CustomerPO, Status, Type, Priority, DueDate, Notes)
                                        VALUES (@ShipmentID, @ShipBatchNo, @ShipJobOrderID, @ShipProdTaskID, @ShipProductName, @ShipQty, @ShipCustomerName, @ShipCustomerPO, N'รอจัดส่ง', 'oem', @ShipPriority, @ShipDueDate, @ShipNotes)`);

                            console.log(`🚚 Shipping created: ${shipId} for OEM Batch ${batchNo}`);
                        } else {
                            // MTS → เข้าคลังจริง
                            const existingCheck = await pool.request()
                                .input('ProductName', sql.NVarChar, productName)
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
                                    .input('ProductName', sql.NVarChar, productName)
                                    .input('Quantity', sql.Int, goodQty)
                                    .query('INSERT INTO Stock_Items (ItemID, ProductName, Quantity) VALUES (@ItemID, @ProductName, @Quantity)');
                            }

                            await pool.request()
                                .input('ItemID', sql.VarChar, stockItemId)
                                .input('Type', sql.VarChar, 'IN')
                                .input('Quantity', sql.Int, goodQty)
                                .input('RefNo', sql.VarChar, batchNo)
                                .input('RefType', sql.VarChar, 'production')
                                .input('ProductName', sql.NVarChar, productName)
                                .input('Notes', sql.NVarChar, `รับเข้าจากการผลิต Batch: ${batchNo} (ผลิตได้ ${goodQty + defectQty}, ของเสีย ${defectQty}, เข้าคลัง ${goodQty})`)
                                .input('CreatedBy', sql.VarChar, 'system')
                                .query(`INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, ProductName, Notes, CreatedBy)
                                        VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @ProductName, @Notes, @CreatedBy)`);

                            console.log(`✅ Stock received: ${productName} x${goodQty} from Batch ${batchNo}`);
                        }
                    }
                }
            } catch (stockErr) {
                console.error('❌ Error auto-receiving stock:', stockErr);
            }

            // --- Auto-update Planner status to 'เสร็จสิ้น' ---
            try {
                const prodTaskId = updatedTask.ProductionTaskID;
                if (prodTaskId) {
                    const prodRes = await pool.request()
                        .input('ProdTaskID', sql.VarChar, prodTaskId)
                        .query('SELECT JobOrderID FROM Production_Tasks WHERE TaskID = @ProdTaskID');
                    if (prodRes.recordset.length > 0 && prodRes.recordset[0].JobOrderID) {
                        const jobId = prodRes.recordset[0].JobOrderID;
                        await pool.request()
                            .input('PlannerID', sql.VarChar, jobId)
                            .query(`UPDATE Planner SET Status = N'เสร็จสิ้น' WHERE PlannerID = @PlannerID`);
                        console.log(`✅ Planner ${jobId} → เสร็จสิ้น`);
                    }
                }
            } catch (planErr) {
                console.error('❌ Error updating planner status:', planErr);
            }
        }
        
        res.json(updatedTask);
    } catch (err) {
        console.error('Error updating task status:', err);
        res.status(500).json({ message: 'Error updating task status' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

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
// QC INCOMING MODULE
// ==========================================
// Get all incoming qc items
router.get('/incoming', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM QC_Incoming 
            ORDER BY CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching qc incoming:', err);
        res.status(500).json({ message: 'Error fetching qc incoming' });
    }
});

// Create new incoming qc
router.post('/incoming', async (req, res) => {
    try {
        const { lotNumber, itemName, supplierName, inspectorId, result_status, notes } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('LotNumber', sql.VarChar, lotNumber)
            .input('ItemName', sql.NVarChar, itemName)
            .input('SupplierName', sql.NVarChar, supplierName)
            .input('InspectorID', sql.VarChar, inspectorId)
            .input('Result', sql.VARCHAR, result_status)
            .input('Notes', sql.NVarChar, notes)
            .query(`
                INSERT INTO QC_Incoming (LotNumber, ItemName, SupplierName, InspectorID, Result, Notes)
                OUTPUT INSERTED.*
                VALUES (@LotNumber, @ItemName, @SupplierName, @InspectorID, @Result, @Notes)
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating incoming qc:', err);
        res.status(500).json({ message: 'Error creating incoming qc' });
    }
});


// ==========================================
// QC PRODUCTION MODULE (In-Process / Final)
// ==========================================
// Get all production qc requests
router.get('/requests', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM QC_Production 
            ORDER BY RequestedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching qc requests:', err);
        res.status(500).json({ message: 'Error fetching qc requests' });
    }
});

// Create a new production QC Request
router.post('/requests', async (req, res) => {
    try {
        const { requestID, taskID, jobOrderID, batchNo, formulaName, line, type, requestedAt, status } = req.body;
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('RequestID', sql.VarChar, requestID)
            .input('TaskID', sql.VarChar, taskID)
            .input('JobOrderID', sql.VarChar, jobOrderID)
            .input('BatchNo', sql.VarChar, batchNo)
            .input('FormulaName', sql.NVarChar, formulaName)
            .input('Line', sql.VarChar, line)
            .input('Type', sql.VarChar, type)
            .input('RequestedAt', sql.DateTime, new Date(requestedAt))
            .input('Status', sql.VarChar, status || 'รอตรวจ')
            .query(`
                INSERT INTO QC_Production (RequestID, TaskID, JobOrderID, BatchNo, FormulaName, Line, Type, RequestedAt, Status)
                OUTPUT INSERTED.*
                VALUES (@RequestID, @TaskID, @JobOrderID, @BatchNo, @FormulaName, @Line, @Type, @RequestedAt, @Status)
            `);
        
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating qc request:', err);
        res.status(500).json({ message: 'Error creating qc request' });
    }
});

// Update a production QC Request (QC performing the inspection)
router.put('/requests/:id', async (req, res) => {
    try {
        const { result_status, inspector, inspectedAt, notes, checklist } = req.body;
        const requestID = req.params.id;
        
        const pool = await poolPromise;
        const result = await pool.request()
            .input('RequestID', sql.VarChar, requestID)
            .input('Status', sql.VarChar, result_status)
            .input('Inspector', sql.VarChar, inspector)
            .input('InspectedAt', sql.DateTime, new Date(inspectedAt))
            .input('Notes', sql.NVarChar, notes)
            .query(`
                UPDATE QC_Production 
                SET Status = @Status, 
                    Inspector = @Inspector, 
                    InspectedAt = @InspectedAt, 
                    Notes = @Notes
                OUTPUT INSERTED.*
                WHERE RequestID = @RequestID
            `);
            
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'QC Request not found' });
        }

        // --- Save checklist results if provided ---
        if (checklist && Array.isArray(checklist) && checklist.length > 0) {
            for (const item of checklist) {
                // Ignore if missing CriteriaID
                if (!item.CriteriaID) continue;
                await pool.request()
                    .input('ReferenceID', sql.VarChar, requestID)
                    .input('CriteriaID', sql.Int, item.CriteriaID)
                    .input('IsPass', sql.Bit, item.IsPass ? 1 : 0)
                    .input('ActualValue', sql.NVarChar, item.ActualValue || '')
                    .query(`
                        INSERT INTO QC_Results (ReferenceID, CriteriaID, IsPass, ActualValue)
                        VALUES (@ReferenceID, @CriteriaID, @IsPass, @ActualValue)
                    `);
            }
        }

        // --- Auto-advance Production Task when QC passes ---
        const updatedQC = result.recordset[0];
        if (result_status === 'ผ่าน') {
            try {
                const taskId = updatedQC.TaskID;
                const qcType = updatedQC.Type; // 'qc_inprocess' or 'qc_final'

                if (taskId && qcType === 'qc_inprocess') {
                    // QC In-Process ผ่าน → advance ไป production_2
                    const prodRes = await pool.request()
                        .input('TaskID', sql.VarChar, taskId)
                        .query('SELECT StepTimesJSON, CurrentStep FROM Production_Tasks WHERE TaskID = @TaskID');

                    if (prodRes.recordset.length > 0) {
                        let stepTimes = {};
                        try { stepTimes = JSON.parse(prodRes.recordset[0].StepTimesJSON || '{}'); } catch(e) {}
                        stepTimes['production_2'] = new Date().toISOString();

                        await pool.request()
                            .input('TaskID', sql.VarChar, taskId)
                            .input('StepTimesJSON', sql.NVarChar, JSON.stringify(stepTimes))
                            .query(`
                                UPDATE Production_Tasks 
                                SET CurrentStep = 'production_2', StepTimesJSON = @StepTimesJSON
                                WHERE TaskID = @TaskID
                            `);
                        console.log(`✅ QC In-Process passed → Production ${taskId} advanced to production_2`);
                    }
                }

                if (taskId && qcType === 'qc_final') {
                    // QC Final ผ่าน → Auto-update Packaging status เป็น 'QC ผ่าน'
                    // ซึ่งจะ trigger chain: stock + shipping ใน packaging.js
                    const batchNo = updatedQC.BatchNo;
                    const pkgUpdate = await pool.request()
                        .input('BatchNo', sql.VarChar, batchNo)
                        .query(`
                            UPDATE Packaging_Tasks 
                            SET Status = N'QC ผ่าน', UpdatedAt = GETDATE()
                            OUTPUT INSERTED.*
                            WHERE BatchNo = @BatchNo AND Status = N'รอ QC Final'
                        `);
                    
                    if (pkgUpdate.recordset.length > 0) {
                        console.log(`✅ QC Final passed → Packaging ${batchNo} → 'QC ผ่าน'`);
                        
                        // Now trigger the full stock + shipping chain
                        const pkgTask = pkgUpdate.recordset[0];
                        const prodTaskId = pkgTask.ProductionTaskID;
                        const productName = pkgTask.Product;
                        
                        // Sync Production to stock + เสร็จสิ้น
                        if (prodTaskId) {
                            const prodResult = await pool.request()
                                .input('ProdTaskID', sql.VarChar, prodTaskId)
                                .query('SELECT StepTimesJSON FROM Production_Tasks WHERE TaskID = @ProdTaskID');
                            let stepTimes = {};
                            if (prodResult.recordset.length > 0 && prodResult.recordset[0].StepTimesJSON) {
                                try { stepTimes = JSON.parse(prodResult.recordset[0].StepTimesJSON); } catch(e) {}
                            }
                            stepTimes['stock'] = new Date().toISOString();
                            await pool.request()
                                .input('ProdTaskID', sql.VarChar, prodTaskId)
                                .input('StepTimesJSON', sql.NVarChar, JSON.stringify(stepTimes))
                                .query(`UPDATE Production_Tasks SET CurrentStep = 'stock', Status = N'เสร็จสิ้น', EndTime = GETDATE(), StepTimesJSON = @StepTimesJSON WHERE TaskID = @ProdTaskID`);
                            console.log(`✅ Production ${prodTaskId} → stock (เสร็จสิ้น)`);
                        }
                        
                        // Update Planner status
                        if (prodTaskId) {
                            const joRes = await pool.request()
                                .input('ProdTaskID', sql.VarChar, prodTaskId)
                                .query('SELECT JobOrderID FROM Production_Tasks WHERE TaskID = @ProdTaskID');
                            if (joRes.recordset.length > 0 && joRes.recordset[0].JobOrderID) {
                                await pool.request()
                                    .input('PlannerID', sql.VarChar, joRes.recordset[0].JobOrderID)
                                    .query(`UPDATE Planner SET Status = N'เสร็จสิ้น' WHERE PlannerID = @PlannerID`);
                                console.log(`✅ Planner ${joRes.recordset[0].JobOrderID} → เสร็จสิ้น`);
                            }
                        }
                        
                        // Get produced qty
                        let goodQty = pkgTask.PackedQty || 0;
                        let defectQty = 0;
                        let jobOrderID = '';
                        if (prodTaskId) {
                            const pdRes = await pool.request()
                                .input('ProdTaskID', sql.VarChar, prodTaskId)
                                .query('SELECT ProducedQty, DefectQty, JobOrderID FROM Production_Tasks WHERE TaskID = @ProdTaskID');
                            if (pdRes.recordset.length > 0) {
                                const pd = pdRes.recordset[0];
                                // Use PackedQty if available and valid, otherwise fallback to ProducedQty (which is already the good quantity)
                                if (goodQty <= 0 && pd.ProducedQty > 0) {
                                    goodQty = pd.ProducedQty;
                                }
                                defectQty = pd.DefectQty || 0;
                                jobOrderID = pd.JobOrderID || '';
                            }
                        }
                        
                        // Check OEM
                        let isOEM = false;
                        let plannerNotes = '';
                        if (jobOrderID) {
                            const plannerRes = await pool.request()
                                .input('PlannerID', sql.VarChar, jobOrderID)
                                .query('SELECT Notes FROM Planner WHERE PlannerID = @PlannerID');
                            if (plannerRes.recordset.length > 0) {
                                plannerNotes = plannerRes.recordset[0].Notes || '';
                                isOEM = plannerNotes.includes('ผลิตตามออเดอร์');
                            }
                        }
                        
                        if (isOEM) {
                            // OEM → Stock log + Shipping
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
                            
                            // Create Shipping Order
                            const shipId = `SHP-${Date.now().toString().slice(-6)}`;
                            const custMatch = plannerNotes.match(/ลูกค้า:\s*(.+?)(?:\s*\||$)/);
                            const poMatch = plannerNotes.match(/PO:\s*(.+?)(?:\s*\||$)/);
                            const plannerDetail = await pool.request()
                                .input('PlannerID2', sql.VarChar, jobOrderID)
                                .query('SELECT Priority, DueDate FROM Planner WHERE PlannerID = @PlannerID2');
                            const planInfo = plannerDetail.recordset[0] || {};
                            
                            await pool.request()
                                .input('ShipmentID', sql.VarChar, shipId)
                                .input('ShipBatchNo', sql.VarChar, batchNo)
                                .input('ShipJobOrderID', sql.VarChar, jobOrderID)
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
                            let itemId = '';
                            const existingCheck = await pool.request()
                                .input('ProductName', sql.NVarChar, productName)
                                .query('SELECT ItemID FROM Stock_Items WHERE ProductName = @ProductName');
                            if (existingCheck.recordset.length > 0) {
                                itemId = existingCheck.recordset[0].ItemID;
                                await pool.request()
                                    .input('ItemID', sql.VarChar, itemId)
                                    .input('Qty', sql.Int, goodQty)
                                    .query('UPDATE Stock_Items SET Quantity = Quantity + @Qty, UpdatedAt = GETDATE() WHERE ItemID = @ItemID');
                            } else {
                                itemId = `STK-${Date.now().toString().slice(-8)}`;
                                await pool.request()
                                    .input('ItemID', sql.VarChar, itemId)
                                    .input('ProductName', sql.NVarChar, productName)
                                    .input('Qty', sql.Int, goodQty)
                                    .query(`INSERT INTO Stock_Items (ItemID, ProductName, Quantity, Unit, Category)
                                            VALUES (@ItemID, @ProductName, @Qty, N'ชิ้น', N'สินค้าสำเร็จรูป')`);
                            }
                            // Log it
                            await pool.request()
                                .input('ItemID', sql.VarChar, itemId)
                                .input('Type', sql.VarChar, 'IN')
                                .input('Quantity', sql.Int, goodQty)
                                .input('RefNo', sql.VarChar, batchNo)
                                .input('RefType', sql.VarChar, 'production')
                                .input('ProductName', sql.NVarChar, productName)
                                .input('Notes', sql.NVarChar, `รับจากการผลิต Batch: ${batchNo}`)
                                .input('CreatedBy', sql.VarChar, 'system')
                                .query(`INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, ProductName, Notes, CreatedBy)
                                        VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @ProductName, @Notes, @CreatedBy)`);
                            console.log(`📦 MTS: Batch ${batchNo} → Stock (${goodQty} ชิ้น)`);
                        }
                    }
                }
            } catch (advErr) {
                console.error('❌ Error advancing production after QC:', advErr);
            }
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error updating qc request:', err);
        res.status(500).json({ message: 'Error updating qc request' });
    }
});


// ==========================================
// QC DEFECT / NCR MODULE
// ==========================================
// Get QC Criteria based on category and stage
router.get('/criteria', async (req, res) => {
    try {
        const { category, stage } = req.query;
        let productCat = category || 'All';
        const qcStage = stage || 'Incoming';

        // Simplify category matching based on keyword
        if (productCat.includes('ยาดม')) productCat = 'ยาดม';
        else if (productCat.includes('ครีม') || productCat.includes('ยาหม่อง')) productCat = 'ครีม';
        else if (productCat.includes('น้ำมัน')) productCat = 'น้ำมันนวด';

        const pool = await poolPromise;
        const result = await pool.request()
            .input('Category', sql.NVarChar, productCat)
            .input('QCStage', sql.VarChar, qcStage)
            .query(`
                SELECT * FROM QC_Criteria 
                WHERE (ProductCategory = @Category OR ProductCategory = 'All')
                  AND QCStage = @QCStage
                ORDER BY CriteriaID ASC
            `);
        
        // If no specific criteria, return 'All' category for this stage
        if (result.recordset.length === 0) {
             const fallback = await pool.request()
                .input('QCStage', sql.VarChar, qcStage)
                .query(`
                    SELECT * FROM QC_Criteria 
                    WHERE ProductCategory = 'All' AND QCStage = @QCStage
                    ORDER BY CriteriaID ASC
                `);
             return res.json(fallback.recordset);
        }

        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching qc criteria:', err);
        res.status(500).json({ message: 'Error fetching qc criteria' });
    }
});

router.get('/defect', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM QC_Defect_NCR 
            ORDER BY CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching qc defect:', err);
        res.status(500).json({ message: 'Error fetching qc defect' });
    }
});

module.exports = router;

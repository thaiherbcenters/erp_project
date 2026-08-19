const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { generateSequence, getDatePrefix } = require('../utils/sequence');
const { authorizeRoles } = require('../middleware/authorize');

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
router.post('/incoming', authorizeRoles('admin', 'executive', 'qc'), async (req, res) => {
    try {
        const { lotNumber, itemName, supplierName, inspectorId, result_status, notes } = req.body;
        const pool = await poolPromise;
        
        const finalRequestID = await generateSequence(pool, 'QC_Incoming', 'RequestID', `QCIC-${getDatePrefix()}`, 3);

        const result = await pool.request()
            .input('RequestID', sql.VarChar, finalRequestID)
            .input('LotNumber', sql.VarChar, lotNumber)
            .input('ItemName', sql.NVarChar, itemName)
            .input('SupplierName', sql.NVarChar, supplierName)
            .input('InspectorID', sql.VarChar, inspectorId)
            .input('Result', sql.VARCHAR, result_status)
            .input('Notes', sql.NVarChar, notes)
            .query(`
                INSERT INTO QC_Incoming (RequestID, LotNumber, ItemName, SupplierName, InspectorID, Result, Notes)
                OUTPUT INSERTED.*
                VALUES (@RequestID, @LotNumber, @ItemName, @SupplierName, @InspectorID, @Result, @Notes)
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
router.post('/requests', authorizeRoles('admin', 'executive', 'qc', 'operator', 'planner'), async (req, res) => {
    try {
        const { requestID, taskID, jobOrderID, batchNo, formulaName, line, type, requestedAt, status } = req.body;
        const pool = await poolPromise;
        
        let finalRequestID = requestID;
        // Auto-generate proper QC ID if frontend sent a timestamp or none
        if (!finalRequestID || finalRequestID.includes(Date.now().toString().substring(0,5)) || finalRequestID.startsWith('QCR-')) {
            const prefix = type === 'qc_inprocess' ? 'QCIP' : 'QCF';
            finalRequestID = await generateSequence(pool, 'QC_Production', 'RequestID', `${prefix}-${getDatePrefix()}`, 3);
        }
        
        const result = await pool.request()
            .input('RequestID', sql.VarChar, finalRequestID)
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
router.put('/requests/:id', authorizeRoles('admin', 'executive', 'qc'), async (req, res) => {
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
                        // Do not auto-advance to production_2 yet. Let WIP Operator decide.
                        
                        await pool.request()
                            .input('TaskID', sql.VarChar, taskId)
                            .query(`
                                UPDATE Production_Tasks 
                                SET Status = N'QC ผ่าน'
                                WHERE TaskID = @TaskID
                            `);
                        console.log(`✅ QC In-Process passed → Production ${taskId} status changed to 'QC ผ่าน'`);
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
                        
                        // 1. Get produced qty and sync Production_Tasks
                        let goodQty = pkgTask.PackedQty || 0;
                        let defectQty = 0;
                        let jobOrderID = '';
                        
                        if (prodTaskId) {
                            const pdRes = await pool.request()
                                .input('ProdTaskID', sql.VarChar, prodTaskId)
                                .query('SELECT ProducedQty, DefectQty, JobOrderID, StepTimesJSON FROM Production_Tasks WHERE TaskID = @ProdTaskID');
                            
                            if (pdRes.recordset.length > 0) {
                                const pd = pdRes.recordset[0];
                                // Use PackedQty if available and valid, otherwise fallback to ProducedQty
                                if (goodQty <= 0 && pd.ProducedQty > 0) {
                                    goodQty = pd.ProducedQty;
                                }
                                defectQty = pd.DefectQty || 0;
                                jobOrderID = pd.JobOrderID || '';
                                
                                // Sync Production to stock + เสร็จสิ้น + Update ProducedQty
                                let stepTimes = {};
                                if (pd.StepTimesJSON) {
                                    try { stepTimes = JSON.parse(pd.StepTimesJSON); } catch(e) {}
                                }
                                stepTimes['stock'] = new Date().toISOString();
                                
                                await pool.request()
                                    .input('ProdTaskID', sql.VarChar, prodTaskId)
                                    .input('StepTimesJSON', sql.NVarChar, JSON.stringify(stepTimes))
                                    .input('GoodQty', sql.Float, goodQty)
                                    .query(`
                                        UPDATE Production_Tasks 
                                        SET CurrentStep = 'stock', 
                                            Status = N'เสร็จสิ้น', 
                                            EndTime = GETDATE(), 
                                            StepTimesJSON = @StepTimesJSON,
                                            ProducedQty = CASE WHEN ProducedQty <= 0 THEN @GoodQty ELSE ProducedQty END
                                        WHERE TaskID = @ProdTaskID
                                    `);
                                console.log(`✅ Production ${prodTaskId} → stock (เสร็จสิ้น) updated with Qty ${goodQty}`);
                            }
                        }
                        
                        // Update Planner status
                        if (jobOrderID) {
                            await pool.request()
                                .input('PlannerID', sql.VarChar, jobOrderID)
                                .query(`UPDATE Planner SET Status = N'เสร็จสิ้น' WHERE PlannerID = @PlannerID`);
                            console.log(`✅ Planner ${jobOrderID} → เสร็จสิ้น`);
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
                                isOEM = plannerNotes.includes('OEM') || plannerNotes.includes('ผลิตตามออร์เดอร์') || plannerNotes.includes('ผลิตตามออเดอร์') || plannerNotes.includes('ผลิตตามคำสั่งซื้อ');
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
                            const shipId = await generateSequence(pool, 'Shipping_Orders', 'ShipmentID', `SHP-${getDatePrefix()}`, 3);
                            const custMatch = plannerNotes.match(/ลูกค้า:\s*(.+?)(?:\s*\||$)/);
                            const poMatch = plannerNotes.match(/PO:\s*(.+?)(?:\s*\||$)/);
                            const plannerDetail = await pool.request()
                                .input('PlannerID2', sql.VarChar, jobOrderID)
                                .query('SELECT Priority, DueDate FROM Planner WHERE PlannerID = @PlannerID2');
                            const planInfo = plannerDetail.recordset[0] || {};
                            
                            // Lookup shipping address + phone from the original SalesOrder
                            let shipAddress = '';
                            let shipPhone = '';
                            const custName = custMatch ? custMatch[1].trim() : '';
                            // Extract SO number from planner notes (format: "OEM — อ้างอิงจาก SO: SO-XXXX | ...")
                            const soMatch = plannerNotes.match(/SO:\s*(SO-[\w-]+)/);
                            if (soMatch) {
                                try {
                                    const soLookup = await pool.request()
                                        .input('SONo', sql.NVarChar, soMatch[1])
                                        .query('SELECT Address, Phone FROM SalesOrder WHERE SalesOrderNo = @SONo');
                                    if (soLookup.recordset.length > 0) {
                                        shipAddress = soLookup.recordset[0].Address || '';
                                        shipPhone = soLookup.recordset[0].Phone || '';
                                    }
                                } catch(ce) { console.error('Error looking up SO address:', ce); }
                            }

                            await pool.request()
                                .input('ShipmentID', sql.VarChar, shipId)
                                .input('ShipBatchNo', sql.VarChar, batchNo)
                                .input('ShipJobOrderID', sql.VarChar, jobOrderID)
                                .input('ShipProdTaskID', sql.VarChar, prodTaskId)
                                .input('ShipProductName', sql.NVarChar, productName)
                                .input('ShipQty', sql.Int, goodQty)
                                .input('ShipCustomerName', sql.NVarChar, custName || '')
                                .input('ShipCustomerPO', sql.NVarChar, poMatch ? poMatch[1].trim() : '')
                                .input('ShipPriority', sql.NVarChar, planInfo.Priority || 'ปกติ')
                                .input('ShipDueDate', sql.Date, planInfo.DueDate || null)
                                .input('ShipNotes', sql.NVarChar, `OEM จากการผลิต Batch: ${batchNo}`)
                                .input('ShipAddress', sql.NVarChar, shipAddress)
                                .input('ShipPhone', sql.NVarChar, shipPhone)
                                .query(`INSERT INTO Shipping_Orders (ShipmentID, BatchNo, JobOrderID, ProductionTaskID, ProductName, Quantity, CustomerName, CustomerPO, Status, Type, Priority, DueDate, Notes, ShippingAddress, CustomerPhone)
                                        VALUES (@ShipmentID, @ShipBatchNo, @ShipJobOrderID, @ShipProdTaskID, @ShipProductName, @ShipQty, @ShipCustomerName, @ShipCustomerPO, N'รอจัดส่ง', 'oem', @ShipPriority, @ShipDueDate, @ShipNotes, @ShipAddress, @ShipPhone)`);
                            console.log(`🚚 Shipping created: ${shipId} for OEM Batch ${batchNo} (Address: ${shipAddress ? 'Yes' : 'N/A'})`);
                        } else {
                            // MTS or WIP → เข้าคลัง
                            let isWIP = batchNo.includes('-WIP');
                            let finalProductName = productName;
                            let itemId = '';
                            let category = 'สินค้าสำเร็จรูป';
                            let unit = 'ชิ้น';

                            if (isWIP) {
                                // For WIP, create a UNIQUE stock item row for Lot tracking
                                try {
                                    const pt = await pool.request().input('b', sql.VarChar, batchNo).query('SELECT Line, JobUnit FROM Production_Tasks WHERE BatchNo = @b');
                                    const tankNo = pt.recordset[0]?.Line || 'WIP Line';
                                    unit = pt.recordset[0]?.JobUnit || 'กรัม';
                                    finalProductName = `${productName} [Lot: ${batchNo}] [${tankNo !== 'WIP Line' ? tankNo : 'ไม่ระบุถัง'}]`;
                                    category = 'สินค้ากึ่งสำเร็จรูป';
                                } catch (e) {
                                    console.error('Error fetching WIP task details:', e);
                                    finalProductName = `${productName} [Lot: ${batchNo}]`;
                                    category = 'สินค้ากึ่งสำเร็จรูป';
                                    unit = 'กรัม';
                                }

                                itemId = await generateSequence(pool, 'Stock_Items', 'ItemID', `STK-${getDatePrefix()}`, 3);
                                await pool.request()
                                    .input('ItemID', sql.VarChar, itemId)
                                    .input('ProductName', sql.NVarChar, finalProductName)
                                    .input('Qty', sql.Int, goodQty)
                                    .input('Unit', sql.NVarChar, unit)
                                    .input('Category', sql.NVarChar, category)
                                    .query(`INSERT INTO Stock_Items (ItemID, ProductName, Quantity, Unit, Category)
                                            VALUES (@ItemID, @ProductName, @Qty, @Unit, @Category)`);
                            } else {
                                // Regular MTS: Merge into generic Stock_Items row
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
                                    itemId = await generateSequence(pool, 'Stock_Items', 'ItemID', `STK-${getDatePrefix()}`, 3);
                                    await pool.request()
                                        .input('ItemID', sql.VarChar, itemId)
                                        .input('ProductName', sql.NVarChar, productName)
                                        .input('Qty', sql.Int, goodQty)
                                        .query(`INSERT INTO Stock_Items (ItemID, ProductName, Quantity, Unit, Category)
                                                VALUES (@ItemID, @ProductName, @Qty, N'ชิ้น', N'สินค้าสำเร็จรูป')`);
                                }
                            }
                            // Log it
                            await pool.request()
                                .input('ItemID', sql.VarChar, itemId)
                                .input('Type', sql.VarChar, 'IN')
                                .input('Quantity', sql.Int, goodQty)
                                .input('RefNo', sql.VarChar, batchNo)
                                .input('RefType', sql.VarChar, 'production')
                                .input('ProductName', sql.NVarChar, finalProductName)
                                .input('Notes', sql.NVarChar, `รับจากการผลิต Batch: ${batchNo}`)
                                .input('CreatedBy', sql.VarChar, 'system')
                                .query(`INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, ProductName, Notes, CreatedBy)
                                        VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @ProductName, @Notes, @CreatedBy)`);
                            console.log(`📦 MTS/WIP: Batch ${batchNo} → Stock (${goodQty} ${unit})`);
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

// Add new QC Criteria
router.post('/criteria', authorizeRoles('admin', 'executive', 'qc'), async (req, res) => {
    try {
        const { checkItem, standardRequirement, category, stage } = req.body;
        let productCat = category || 'All';
        const qcStage = stage || 'Incoming';

        if (productCat.includes('ยาดม')) productCat = 'ยาดม';
        else if (productCat.includes('ครีม') || productCat.includes('ยาหม่อง')) productCat = 'ครีม';
        else if (productCat.includes('น้ำมัน')) productCat = 'น้ำมันนวด';

        const pool = await poolPromise;
        const result = await pool.request()
            .input('QCStage', sql.VarChar, qcStage)
            .input('CheckItem', sql.NVarChar, checkItem)
            .input('StandardRequirement', sql.NVarChar, standardRequirement)
            .input('ProductCategory', sql.NVarChar, productCat)
            .query(`
                INSERT INTO QC_Criteria (QCStage, CheckItem, StandardRequirement, ProductCategory)
                OUTPUT INSERTED.*
                VALUES (@QCStage, @CheckItem, @StandardRequirement, @ProductCategory)
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error adding qc criteria:', err);
        res.status(500).json({ message: 'Error adding qc criteria' });
    }
});

// Delete QC Criteria
router.delete('/criteria/:id', authorizeRoles('admin', 'executive', 'qc'), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        await pool.request()
            .input('CriteriaID', sql.Int, id)
            .query('DELETE FROM QC_Criteria WHERE CriteriaID = @CriteriaID');
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting qc criteria:', err);
        res.status(500).json({ message: 'Error deleting qc criteria' });
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

// Create new NCR (auto-created when QC rejects)
router.post('/defect', authorizeRoles('admin', 'executive', 'qc'), async (req, res) => {
    try {
        const { ncrNumber, refLot, itemName, issueDescription, actionTaken, status } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('NcrNumber', sql.VarChar, ncrNumber)
            .input('RefLot', sql.VarChar, refLot)
            .input('ItemName', sql.NVarChar, itemName)
            .input('IssueDescription', sql.NVarChar, issueDescription)
            .input('ActionTaken', sql.NVarChar, actionTaken)
            .input('Status', sql.NVarChar, status || 'รอดำเนินการ')
            .query(`
                INSERT INTO QC_Defect_NCR (NcrNumber, RefLot, ItemName, IssueDescription, ActionTaken, Status)
                OUTPUT INSERTED.*
                VALUES (@NcrNumber, @RefLot, @ItemName, @IssueDescription, @ActionTaken, @Status)
            `);
        console.log(`📋 NCR created: ${ncrNumber} — ${refLot} — ${actionTaken}`);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating NCR:', err);
        res.status(500).json({ message: 'Error creating NCR' });
    }
});

module.exports = router;

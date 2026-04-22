const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// ==========================================
// STOCK (INVENTORY) MODULE
// ==========================================

// Get all stock items
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM Stock_Items 
            ORDER BY UpdatedAt DESC
        `);

        const items = result.recordset.map(row => ({
            id: row.ItemID,
            formulaId: row.FormulaID,
            name: row.ProductName,
            category: row.Category,
            qty: row.Quantity,
            unit: row.Unit,
            minStock: row.MinStock,
            status: row.Quantity <= 0 ? 'สินค้าหมด' : row.Quantity <= row.MinStock ? 'สินค้าเหลือน้อย' : 'มีสินค้า',
            updatedAt: row.UpdatedAt
        }));

        res.json(items);
    } catch (err) {
        console.error('Error fetching stock:', err);
        res.status(500).json({ message: 'Error fetching stock' });
    }
});

// Get stock logs (history)
router.get('/logs', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM Stock_Logs 
            ORDER BY CreatedAt DESC
        `);

        const logs = result.recordset.map(row => ({
            id: row.LogID,
            itemId: row.ItemID,
            type: row.Type,
            item: row.ProductName || row.ItemID,
            qty: row.Quantity,
            ref: row.RefNo,
            refType: row.RefType,
            user: row.CreatedBy,
            note: row.Notes,
            date: row.CreatedAt ? new Date(row.CreatedAt).toLocaleString('th-TH') : ''
        }));

        res.json(logs);
    } catch (err) {
        console.error('Error fetching stock logs:', err);
        res.status(500).json({ message: 'Error fetching stock logs' });
    }
});

// Receive stock from production (called automatically when task reaches "stock" step)
router.post('/receive', async (req, res) => {
    try {
        const { formulaId, productName, quantity, unit, batchNo, notes, createdBy } = req.body;

        if (!productName || !quantity) {
            return res.status(400).json({ message: 'productName and quantity are required' });
        }

        const pool = await poolPromise;

        // Check if product already exists in stock (by formulaId or productName)
        let existingItem = null;
        if (formulaId) {
            const check = await pool.request()
                .input('FormulaID', sql.VarChar, formulaId)
                .query('SELECT * FROM Stock_Items WHERE FormulaID = @FormulaID');
            if (check.recordset.length > 0) {
                existingItem = check.recordset[0];
            }
        }

        if (existingItem) {
            // Update existing stock: add quantity
            await pool.request()
                .input('ItemID', sql.VarChar, existingItem.ItemID)
                .input('AddQty', sql.Int, quantity)
                .query(`
                    UPDATE Stock_Items 
                    SET Quantity = Quantity + @AddQty, UpdatedAt = GETDATE()
                    WHERE ItemID = @ItemID
                `);
        } else {
            // Create new stock item
            const itemId = `STK-${Date.now().toString().slice(-6)}`;
            await pool.request()
                .input('ItemID', sql.VarChar, itemId)
                .input('FormulaID', sql.VarChar, formulaId || null)
                .input('ProductName', sql.NVarChar, productName)
                .input('Quantity', sql.Int, quantity)
                .input('Unit', sql.NVarChar, unit || 'ชิ้น')
                .query(`
                    INSERT INTO Stock_Items (ItemID, FormulaID, ProductName, Quantity, Unit)
                    VALUES (@ItemID, @FormulaID, @ProductName, @Quantity, @Unit)
                `);
        }

        // Always create a stock log entry
        await pool.request()
            .input('ItemID', sql.VarChar, existingItem ? existingItem.ItemID : `STK-${Date.now().toString().slice(-6)}`)
            .input('Type', sql.VarChar, 'IN')
            .input('Quantity', sql.Int, quantity)
            .input('RefNo', sql.VarChar, batchNo || null)
            .input('RefType', sql.VarChar, 'production')
            .input('ProductName', sql.NVarChar, productName)
            .input('Notes', sql.NVarChar, notes || `รับเข้าจากการผลิต Batch: ${batchNo}`)
            .input('CreatedBy', sql.VarChar, createdBy || 'system')
            .query(`
                INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, ProductName, Notes, CreatedBy)
                VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @ProductName, @Notes, @CreatedBy)
            `);

        res.status(201).json({ message: 'รับสินค้าเข้าคลังสำเร็จ' });
    } catch (err) {
        console.error('Error receiving stock:', err);
        res.status(500).json({ message: 'Error receiving stock' });
    }
});

// Get stock item detail (with related logs + production info)
router.get('/:id/detail', async (req, res) => {
    try {
        const itemId = req.params.id;
        const pool = await poolPromise;

        // 1. Get item info
        const itemRes = await pool.request()
            .input('ItemID', sql.VarChar, itemId)
            .query('SELECT * FROM Stock_Items WHERE ItemID = @ItemID');

        if (itemRes.recordset.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        const item = itemRes.recordset[0];

        // 2. Get all stock logs for this item
        const logsRes = await pool.request()
            .input('ItemID', sql.VarChar, itemId)
            .query('SELECT * FROM Stock_Logs WHERE ItemID = @ItemID ORDER BY CreatedAt DESC');

        // 3. Get related production tasks by matching BatchNo from logs
        const batchNos = [...new Set(logsRes.recordset.map(l => l.RefNo).filter(Boolean))];
        let productionTasks = [];
        if (batchNos.length > 0) {
            const batchList = batchNos.map((b, i) => `@B${i}`).join(',');
            const req2 = pool.request();
            batchNos.forEach((b, i) => req2.input(`B${i}`, sql.VarChar, b));
            const prodRes = await req2.query(`
                SELECT pt.TaskID, pt.JobOrderID, pt.BatchNo, pt.FormulaName, pt.Line, 
                       pt.ExpectedQty, pt.ProducedQty, pt.DefectQty, pt.Status, pt.CurrentStep,
                       pt.StartTime, pt.EndTime,
                       p.Notes as PlannerNotes, p.Priority
                FROM Production_Tasks pt
                LEFT JOIN Planner p ON pt.JobOrderID = p.PlannerID
                WHERE pt.BatchNo IN (${batchList})
                ORDER BY pt.StartTime DESC
            `);
            productionTasks = prodRes.recordset;
        }

        res.json({
            item: {
                id: item.ItemID,
                formulaId: item.FormulaID,
                name: item.ProductName,
                category: item.Category,
                qty: item.Quantity,
                unit: item.Unit,
                minStock: item.MinStock,
                createdAt: item.CreatedAt,
                updatedAt: item.UpdatedAt
            },
            logs: logsRes.recordset.map(l => ({
                id: l.LogID,
                type: l.Type,
                qty: l.Quantity,
                ref: l.RefNo,
                refType: l.RefType,
                productName: l.ProductName,
                notes: l.Notes,
                createdBy: l.CreatedBy,
                date: l.CreatedAt
            })),
            productionTasks: productionTasks.map(t => ({
                taskId: t.TaskID,
                jobOrderId: t.JobOrderID,
                batchNo: t.BatchNo,
                formulaName: t.FormulaName,
                line: t.Line,
                expectedQty: t.ExpectedQty,
                producedQty: t.ProducedQty,
                defectQty: t.DefectQty,
                status: t.Status,
                currentStep: t.CurrentStep,
                startTime: t.StartTime,
                endTime: t.EndTime,
                plannerNotes: t.PlannerNotes,
                priority: t.Priority
            }))
        });
    } catch (err) {
        console.error('Error fetching stock detail:', err);
        res.status(500).json({ message: 'Error fetching stock detail' });
    }
});

// Get log detail by batch number (production + planner + packaging info)
router.get('/logs/:batchNo/detail', async (req, res) => {
    try {
        const batchNo = req.params.batchNo;
        const pool = await poolPromise;

        // 1. Production Task
        const prodRes = await pool.request()
            .input('BatchNo', sql.VarChar, batchNo)
            .query(`
                SELECT pt.*, p.Notes as PlannerNotes, p.Priority, p.PlanDate, p.DueDate,
                       p.FormulaID, p.FormulaName as PlannerFormulaName
                FROM Production_Tasks pt
                LEFT JOIN Planner p ON pt.JobOrderID = p.PlannerID
                WHERE pt.BatchNo = @BatchNo
            `);

        // 2. Packaging Task
        const pkgRes = await pool.request()
            .input('BatchNo', sql.VarChar, batchNo)
            .query('SELECT * FROM Packaging_Tasks WHERE BatchNo = @BatchNo');

        // 3. QC Results
        const qcRes = await pool.request()
            .input('BatchNo', sql.VarChar, batchNo)
            .query('SELECT * FROM QC_Production WHERE BatchNo = @BatchNo ORDER BY RequestedAt DESC');

        // 4. Stock Logs for this batch
        const logsRes = await pool.request()
            .input('BatchNo', sql.VarChar, batchNo)
            .query('SELECT * FROM Stock_Logs WHERE RefNo = @BatchNo ORDER BY CreatedAt DESC');

        const prod = prodRes.recordset[0] || null;
        const pkg = pkgRes.recordset[0] || null;

        res.json({
            batch: batchNo,
            production: prod ? (() => {
                // Extract customer info from Notes
                const notes = prod.PlannerNotes || '';
                const custMatch = notes.match(/ลูกค้า:\s*(.+?)(?:\s*\||$)/);
                const poMatch = notes.match(/PO:\s*(.+?)(?:\s*\||$)/);
                const isOEM = notes.includes('ผลิตตามออเดอร์');
                return {
                    taskId: prod.TaskID,
                    jobOrderId: prod.JobOrderID,
                    batchNo: prod.BatchNo,
                    formulaName: prod.FormulaName,
                    line: prod.Line,
                    process: prod.Process,
                    expectedQty: prod.ExpectedQty,
                    producedQty: prod.ProducedQty,
                    defectQty: prod.DefectQty,
                    status: prod.Status,
                    currentStep: prod.CurrentStep,
                    startTime: prod.StartTime,
                    endTime: prod.EndTime,
                    plannerNotes: notes,
                    priority: prod.Priority,
                    planDate: prod.PlanDate,
                    dueDate: prod.DueDate,
                    formulaId: prod.FormulaID,
                    isOEM,
                    customerName: custMatch ? custMatch[1].trim() : null,
                    customerPO: poMatch ? poMatch[1].trim() : null
                };
            })() : null,
            packaging: pkg ? {
                taskId: pkg.TaskID,
                product: pkg.Product,
                qty: pkg.Qty,
                packedQty: pkg.PackedQty,
                defectQty: pkg.DefectQty,
                status: pkg.Status,
                destination: pkg.Destination,
                line: pkg.Line
            } : null,
            qcResults: qcRes.recordset.map(q => ({
                requestId: q.RequestID,
                type: q.Type,
                status: q.Status,
                inspector: q.Inspector,
                requestedAt: q.RequestedAt,
                inspectedAt: q.InspectedAt,
                notes: q.Notes
            })),
            stockLogs: logsRes.recordset.map(l => ({
                id: l.LogID,
                type: l.Type,
                qty: l.Quantity,
                refType: l.RefType,
                productName: l.ProductName,
                notes: l.Notes,
                createdBy: l.CreatedBy,
                date: l.CreatedAt
            }))
        });
    } catch (err) {
        console.error('Error fetching log detail:', err);
        res.status(500).json({ message: 'Error fetching log detail' });
    }
});

module.exports = router;

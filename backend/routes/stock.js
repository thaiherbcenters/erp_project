const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { generateSequence, getDatePrefix } = require('../utils/sequence');
const { authorizeRoles } = require('../middleware/authorize');

// ==========================================
// STOCK (INVENTORY) MODULE
// ==========================================

// Get all stock items
router.get('/', async (req, res) => {
    try {
        const { search, category, page, limit } = req.query;
        const pool = await poolPromise;
        
        let queryStr = `SELECT * FROM Stock_Items WHERE (IsHidden = 0 OR IsHidden IS NULL)`;
        
        if (category && category !== 'all' && category !== 'ทั้งหมด') {
            queryStr += ` AND Category = @Category`;
        }
        
        if (search) {
            queryStr += ` AND (ProductName LIKE @Search OR ItemID LIKE @Search OR Category LIKE @Search)`;
        }
        
        queryStr += ` ORDER BY UpdatedAt DESC`;

        const request = pool.request();
        if (category && category !== 'all' && category !== 'ทั้งหมด') {
            request.input('Category', sql.NVarChar, category);
        }
        if (search) {
            request.input('Search', sql.NVarChar, `%${search}%`);
        }

        const result = await request.query(queryStr);

        let p = parseInt(page) || 1;
        let l = parseInt(limit) || 50;
        let totalItems = result.recordset.length;
        let totalPages = Math.ceil(totalItems / l);

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
        
        const pagedItems = items.slice((p - 1) * l, p * l);

        res.json({
            data: pagedItems,
            pagination: { page: p, limit: l, totalPages, totalItems }
        });
    } catch (err) {
        console.error('Error fetching stock:', err);
        res.status(500).json({ message: 'Error fetching stock' });
    }
});

// Get stock logs (history)
router.get('/logs', async (req, res) => {
    try {
        const { search, page, limit } = req.query;
        const pool = await poolPromise;
        
        let queryStr = `SELECT * FROM Stock_Logs WHERE 1=1`;
        if (search) {
            queryStr += ` AND (ProductName LIKE @Search OR RefNo LIKE @Search OR Notes LIKE @Search)`;
        }
        queryStr += ` ORDER BY CreatedAt DESC`;

        const request = pool.request();
        if (search) request.input('Search', sql.NVarChar, `%${search}%`);
        
        const result = await request.query(queryStr);
        
        let p = parseInt(page) || 1;
        let l = parseInt(limit) || 50;
        let totalItems = result.recordset.length;
        let totalPages = Math.ceil(totalItems / l);

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

        const pagedLogs = logs.slice((p - 1) * l, p * l);

        res.json({
            data: pagedLogs,
            pagination: { page: p, limit: l, totalPages, totalItems }
        });
    } catch (err) {
        console.error('Error fetching stock logs:', err);
        res.status(500).json({ message: 'Error fetching stock logs' });
    }
});

// Receive stock from production (called automatically when task reaches "stock" step)
router.post('/receive', authorizeRoles('admin', 'executive', 'stock', 'planner'), async (req, res) => {
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

        let itemId = null;
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
            // Create new stock item (usually from production = FG)
            itemId = await generateSequence(pool, 'Stock_Items', 'ItemID', 'FG', 3);
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

        // Note: the itemId for log generation uses the original itemId variable if created new
        const logItemId = existingItem ? existingItem.ItemID : itemId;
        
        // Always create a stock log entry
        await pool.request()
            .input('ItemID', sql.VarChar, logItemId)
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

// Get Dashboard Summary
router.get('/dashboard', async (req, res) => {
    try {
        const pool = await poolPromise;
        
        // 1. KPIs
        const kpiRes = await pool.request().query(`
            SELECT 
                COUNT(*) as totalItems,
                ISNULL(SUM(Quantity), 0) as totalQty,
                SUM(CASE WHEN Quantity < MinStock AND Quantity > 0 THEN 1 ELSE 0 END) as lowStockCount,
                SUM(CASE WHEN Quantity <= 0 THEN 1 ELSE 0 END) as outOfStockCount
            FROM Stock_Items
        `);

        // 2. Category Distribution
        const catRes = await pool.request().query(`
            SELECT Category as name, COUNT(*) as value, ISNULL(SUM(Quantity), 0) as totalQty
            FROM Stock_Items
            GROUP BY Category
        `);

        // 3. Top 5 Items
        const topRes = await pool.request().query(`
            SELECT TOP 5 ProductName, Quantity
            FROM Stock_Items
            ORDER BY Quantity DESC
        `);

        // 4. Low Stock List
        const lowRes = await pool.request().query(`
            SELECT ItemID, ProductName, Quantity, MinStock, Category
            FROM Stock_Items
            WHERE Quantity < MinStock
            ORDER BY (Quantity - MinStock) ASC
        `);

        // 5. Recent Movements
        const moveRes = await pool.request().query(`
            SELECT TOP 5 LogID, ItemID, ProductName, Type, Quantity, RefNo, RefType, CreatedAt
            FROM Stock_Logs
            ORDER BY CreatedAt DESC
        `);

        res.json({
            kpi: kpiRes.recordset[0],
            categoryDistribution: catRes.recordset,
            topItems: topRes.recordset,
            lowStockItems: lowRes.recordset,
            recentMovements: moveRes.recordset
        });
    } catch (err) {
        console.error('Error fetching stock dashboard:', err);
        res.status(500).json({ message: 'Error fetching dashboard data' });
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

// Update stock item (and optional adjust qty)
router.put('/:id', authorizeRoles('admin', 'executive', 'stock'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, unit, adjustQty, adjustReason } = req.body;
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        
        await transaction.begin();

        try {
            // Update stock item
            await transaction.request()
                .input('ItemID', sql.VarChar, id)
                .input('ProductName', sql.NVarChar, name)
                .input('Category', sql.NVarChar, category)
                .input('Unit', sql.NVarChar, unit)
                .query(`
                    UPDATE Stock_Items 
                    SET ProductName = @ProductName, 
                        Category = @Category, 
                        Unit = @Unit,
                        UpdatedAt = GETDATE()
                    WHERE ItemID = @ItemID
                `);

            // Handle adjustment if provided
            const qty = Number(adjustQty);
            if (qty !== 0 && adjustReason) {
                // Adjust quantity
                await transaction.request()
                    .input('ItemID', sql.VarChar, id)
                    .input('AdjustQty', sql.Int, qty)
                    .query(`
                        UPDATE Stock_Items
                        SET Quantity = Quantity + @AdjustQty
                        WHERE ItemID = @ItemID
                    `);
                
                // Add log
                await transaction.request()
                    .input('ItemID', sql.VarChar, id)
                    .input('Type', sql.VarChar, qty > 0 ? 'ADJ_IN' : 'ADJ_OUT')
                    .input('Quantity', sql.Int, Math.abs(qty))
                    .input('ProductName', sql.NVarChar, name)
                    .input('Notes', sql.NVarChar, adjustReason)
                    .input('CreatedBy', sql.VarChar, req.user?.username || 'system')
                    .query(`
                        INSERT INTO Stock_Logs (ItemID, Type, Quantity, ProductName, Notes, CreatedBy)
                        VALUES (@ItemID, @Type, @Quantity, @ProductName, @Notes, @CreatedBy)
                    `);
            }

            await transaction.commit();
            res.json({ message: 'อัปเดตข้อมูลสินค้าสำเร็จ' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Error updating stock item:', err);
        res.status(500).json({ message: 'Error updating stock item' });
    }
});

// Soft delete stock item
router.delete('/:id', authorizeRoles('admin', 'executive', 'stock'), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        
        await pool.request()
            .input('ItemID', sql.VarChar, id)
            .query(`
                UPDATE Stock_Items 
                SET IsHidden = 1, UpdatedAt = GETDATE()
                WHERE ItemID = @ItemID
            `);
            
        res.json({ message: 'ซ่อนสินค้าสำเร็จ' });
    } catch (err) {
        console.error('Error soft deleting stock item:', err);
        res.status(500).json({ message: 'Error soft deleting stock item' });
    }
});

// Add new stock item
router.post('/', authorizeRoles('admin', 'executive', 'stock'), async (req, res) => {
    try {
        const { name, category, unit, initialQty, adjustReason } = req.body;
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        
        await transaction.begin();

        try {
            // Generate ItemID based on category
            let prefix = 'STK';
            if (category === 'สินค้าสำเร็จรูป') prefix = 'FG';
            else if (category === 'วัตถุดิบ') prefix = 'RM';
            else if (category === 'บรรจุภัณฑ์') prefix = 'PM';
            else if (category === 'วัสดุสิ้นเปลือง') prefix = 'SP';
            
            const itemId = await generateSequence(pool, 'Stock_Items', 'ItemID', prefix, 3);
            
            // Insert item
            await transaction.request()
                .input('ItemID', sql.VarChar, itemId)
                .input('ProductName', sql.NVarChar, name)
                .input('Category', sql.NVarChar, category)
                .input('Quantity', sql.Int, Number(initialQty) || 0)
                .input('Unit', sql.NVarChar, unit)
                .query(`
                    INSERT INTO Stock_Items (ItemID, ProductName, Category, Quantity, Unit, IsHidden)
                    VALUES (@ItemID, @ProductName, @Category, @Quantity, @Unit, 0)
                `);

            // Add log if initial qty > 0
            const qty = Number(initialQty) || 0;
            if (qty > 0) {
                await transaction.request()
                    .input('ItemID', sql.VarChar, itemId)
                    .input('Type', sql.VarChar, 'ADJ_IN')
                    .input('Quantity', sql.Int, qty)
                    .input('ProductName', sql.NVarChar, name)
                    .input('Notes', sql.NVarChar, adjustReason || 'เพิ่มสินค้ารายการใหม่')
                    .input('CreatedBy', sql.VarChar, req.user?.username || 'system')
                    .query(`
                        INSERT INTO Stock_Logs (ItemID, Type, Quantity, ProductName, Notes, CreatedBy)
                        VALUES (@ItemID, @Type, @Quantity, @ProductName, @Notes, @CreatedBy)
                    `);
            }

            await transaction.commit();
            res.status(201).json({ message: 'เพิ่มรายการสินค้าสำเร็จ', itemId });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Error adding stock item:', err);
        res.status(500).json({ message: 'Error adding stock item' });
    }
});

module.exports = router;

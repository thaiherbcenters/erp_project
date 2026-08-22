const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { generateSequence, getDatePrefix } = require('../utils/sequence');
const { authorizeRoles } = require('../middleware/authorize');

// ==========================================
// STOCK (INVENTORY) MODULE
// ==========================================

// Get next ID preview based on category
router.get('/next-id', async (req, res) => {
    try {
        const { category } = req.query;
        let prefix = 'STK';
        if (category === 'สินค้าสำเร็จรูป') prefix = 'FG';
        else if (category === 'สินค้ากึ่งสำเร็จรูป') prefix = 'WIP';
        else if (category === 'วัตถุดิบ') prefix = 'RM';
        else if (category === 'บรรจุภัณฑ์') prefix = 'PM';
        else if (category === 'ฉลาก/สิ่งพิมพ์') prefix = 'LB';
        else if (category === 'วัสดุสิ้นเปลือง') prefix = 'SP';

        const pool = await poolPromise;
        const result = await pool.request()
            .input('Prefix', sql.VarChar, `${prefix}-%`)
            .query(`
                SELECT MAX(CAST(SUBSTRING(ItemID, LEN(@Prefix), LEN(ItemID)) AS INT)) as maxVal 
                FROM Stock_Items 
                WHERE ItemID LIKE @Prefix AND ISNUMERIC(SUBSTRING(ItemID, LEN(@Prefix), LEN(ItemID))) = 1
            `);
        
        let maxVal = result.recordset[0].maxVal || 0;
        const nextId = `${prefix}-${String(maxVal + 1).padStart(3, '0')}`;
        res.json({ nextId });
    } catch (err) {
        console.error('Error fetching next ID:', err);
        res.status(500).json({ message: 'Error fetching next ID' });
    }
});

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
            nameEN: row.ProductNameEN,
            category: row.Category,
            qty: row.Quantity,
            unit: row.Unit,
            location: row.Location,
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

        // 4. Get WIP Lots if applicable
        const wipLotsRes = await pool.request()
            .input('ItemID', sql.VarChar, itemId)
            .query('SELECT * FROM WIP_Lots WHERE ItemID = @ItemID ORDER BY CreatedAt DESC');

        // 5. Get Label Configs if applicable
        let labelConfigs = [];
        if (item.Category === 'ฉลาก/สิ่งพิมพ์') {
            const lcRes = await pool.request()
                .input('StickerItemID', sql.VarChar, itemId)
                .query('SELECT * FROM Label_Configurations WHERE StickerItemID = @StickerItemID');
            labelConfigs = lcRes.recordset.map(lc => ({
                fgItemId: lc.FGItemID,
                fgProductName: lc.FGProductName,
                applyTo: lc.ApplyTo,
                qtyPerUnit: lc.QtyPerUnit
            }));
        }

        res.json({
            item: {
                id: item.ItemID,
                formulaId: item.FormulaID,
                name: item.ProductName,
                nameEN: item.ProductNameEN,
                category: item.Category,
                qty: item.Quantity,
                unit: item.Unit,
                location: item.Location,
                minStock: item.MinStock,
                createdAt: item.CreatedAt,
                updatedAt: item.UpdatedAt,
                labelConfigs
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
            wipLots: wipLotsRes.recordset,
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
        const { name, nameEN, category, unit, location, minStock, status, adjustQty, adjustReason, labelConfigs } = req.body;
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        
        await transaction.begin();

        try {
            // Update stock item
            await transaction.request()
                .input('ItemID', sql.VarChar, id)
                .input('ProductName', sql.NVarChar, name)
                .input('ProductNameEN', sql.NVarChar, nameEN || null)
                .input('Category', sql.NVarChar, category)
                .input('Unit', sql.NVarChar, unit)
                .input('Location', sql.NVarChar, location)
                .input('MinStock', sql.Float, minStock)
                .input('Status', sql.NVarChar, status)
                .query(`
                    UPDATE Stock_Items 
                    SET ProductName = @ProductName, 
                        ProductNameEN = @ProductNameEN,
                        Category = @Category, 
                        Unit = @Unit,
                        Location = @Location,
                        MinStock = @MinStock,
                        Status = @Status,
                        UpdatedAt = GETDATE()
                    WHERE ItemID = @ItemID
                `);

            // If category is label, update label configs
            if (category === 'ฉลาก/สิ่งพิมพ์' && Array.isArray(labelConfigs)) {
                // Delete existing configs for this sticker
                await transaction.request()
                    .input('StickerItemID', sql.VarChar, id)
                    .query('DELETE FROM Label_Configurations WHERE StickerItemID = @StickerItemID');
                
                // Insert new ones
                for (const cfg of labelConfigs) {
                    await transaction.request()
                        .input('FGItemID', sql.VarChar, cfg.fgItemId)
                        .input('FGProductName', sql.NVarChar, cfg.fgProductName)
                        .input('StickerItemID', sql.VarChar, id)
                        .input('StickerName', sql.NVarChar, name)
                        .input('ApplyTo', sql.NVarChar, cfg.applyTo || 'ขวด')
                        .input('QtyPerUnit', sql.Int, cfg.qtyPerUnit || 1)
                        .query(`
                            INSERT INTO Label_Configurations (FGItemID, FGProductName, StickerItemID, StickerName, ApplyTo, QtyPerUnit)
                            VALUES (@FGItemID, @FGProductName, @StickerItemID, @StickerName, @ApplyTo, @QtyPerUnit)
                        `);
                }
            }

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
        const { name, nameEN, category, unit, location, minStock, status, initialQty, adjustReason, labelConfigs } = req.body;
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        
        await transaction.begin();

        try {
            // Generate ItemID based on category
            let prefix = 'STK';
            if (category === 'สินค้าสำเร็จรูป') prefix = 'FG';
            else if (category === 'สินค้ากึ่งสำเร็จรูป') prefix = 'WIP';
            else if (category === 'วัตถุดิบ') prefix = 'RM';
            else if (category === 'บรรจุภัณฑ์') prefix = 'PM';
            else if (category === 'ฉลาก/สิ่งพิมพ์') prefix = 'LB';
            else if (category === 'วัสดุสิ้นเปลือง') prefix = 'SP';
            
            const itemId = await generateSequence(pool, 'Stock_Items', 'ItemID', prefix, 3);
            
            // Insert item
            await transaction.request()
                .input('ItemID', sql.VarChar, itemId)
                .input('ProductName', sql.NVarChar, name)
                .input('ProductNameEN', sql.NVarChar, nameEN || null)
                .input('Category', sql.NVarChar, category)
                .input('Quantity', sql.Int, Number(initialQty) || 0)
                .input('Unit', sql.NVarChar, unit)
                .input('Location', sql.NVarChar, location)
                .input('MinStock', sql.Float, minStock || 0)
                .input('Status', sql.NVarChar, status || 'มีสินค้า')
                .query(`
                    INSERT INTO Stock_Items (ItemID, ProductName, ProductNameEN, Category, Quantity, Unit, Location, MinStock, Status, IsHidden)
                    VALUES (@ItemID, @ProductName, @ProductNameEN, @Category, @Quantity, @Unit, @Location, @MinStock, @Status, 0)
                `);

            // If category is label, insert label configs
            if (category === 'ฉลาก/สิ่งพิมพ์' && Array.isArray(labelConfigs)) {
                for (const cfg of labelConfigs) {
                    await transaction.request()
                        .input('FGItemID', sql.VarChar, cfg.fgItemId)
                        .input('FGProductName', sql.NVarChar, cfg.fgProductName)
                        .input('StickerItemID', sql.VarChar, itemId)
                        .input('StickerName', sql.NVarChar, name)
                        .input('ApplyTo', sql.NVarChar, cfg.applyTo || 'ขวด')
                        .input('QtyPerUnit', sql.Int, cfg.qtyPerUnit || 1)
                        .query(`
                            INSERT INTO Label_Configurations (FGItemID, FGProductName, StickerItemID, StickerName, ApplyTo, QtyPerUnit)
                            VALUES (@FGItemID, @FGProductName, @StickerItemID, @StickerName, @ApplyTo, @QtyPerUnit)
                        `);
                }
            }

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

// ==========================================
// WIP LOTS MODULE
// ==========================================
router.get('/wip-lots', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM WIP_Lots ORDER BY CreatedAt DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching WIP lots:', err);
        res.status(500).json({ message: 'Error fetching WIP lots' });
    }
});

// ==========================================
// MATERIAL REQUISITIONS
// ==========================================

// Get pending requisitions (for Stock module)
router.get('/requisitions', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT TaskID, JobOrderID, BatchNo, FormulaName, ExpectedQty, JobUnit, Status, CreatedAt, RequisitionJSON 
            FROM Production_Tasks 
            WHERE CurrentStep = 'requisition' OR Status = 'รอเบิกวัตถุดิบ'
            UNION ALL
            SELECT TaskID, JobOrderID, BatchNo, Product AS FormulaName, Qty AS ExpectedQty, 'ชิ้น' AS JobUnit, Status, CreatedAt, RequisitionJSON 
            FROM Packaging_Tasks 
            WHERE Status = N'รอเบิกบรรจุภัณฑ์'
            UNION ALL
            SELECT ShipmentID AS TaskID, ShipmentID AS JobOrderID, BatchNo, ProductName AS FormulaName, Quantity AS ExpectedQty, 'ชิ้น' AS JobUnit, Status, CreatedAt, RequisitionJSON 
            FROM Shipping_Orders 
            WHERE Status = N'รอคลังอนุมัติ'
            ORDER BY CreatedAt ASC
        `);
        
        const stockRes = await pool.request().query('SELECT ItemID, Quantity FROM Stock_Items');
        const stockDict = {};
        stockRes.recordset.forEach(s => {
            stockDict[String(s.ItemID).trim()] = s.Quantity;
        });

        const requisitions = result.recordset.map(row => {
            const parsed = row.RequisitionJSON ? JSON.parse(row.RequisitionJSON) : [];
            let history = [];
            if (Array.isArray(parsed)) {
                if (parsed.length > 0 && parsed[0].id && !parsed[0].items) history = [{ items: parsed }];
                else history = parsed;
            } else if (parsed && parsed.items) {
                history = [parsed];
            }
            let pendingReq = history.length > 0 ? history[history.length - 1] : { items: [] };
            let items = pendingReq.items || [];
            
            items = items.map(it => {
                const currentQty = stockDict[String(it.id).trim()] || 0;
                return {
                    ...it,
                    currentStock: currentQty,
                    isSufficient: currentQty >= (it.deductQty || 0)
                };
            });

            return {
                id: row.TaskID,
                jobOrderId: row.JobOrderID,
                batchNo: row.BatchNo,
                formulaName: row.FormulaName,
                expectedQty: row.ExpectedQty,
                unit: row.JobUnit,
                status: row.Status,
                createdAt: row.CreatedAt,
                items: items,
                requesterName: parsed.requesterName || 'ไม่ระบุ'
            };
        });
        
        res.json({ data: requisitions });
    } catch (err) {
        console.error('Error fetching requisitions:', err);
        res.status(500).json({ message: 'Error fetching requisitions' });
    }
});

// Get recent issued requisitions (for History Table)
router.get('/requisitions/history', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT TOP 50 * FROM (
                SELECT TaskID, JobOrderID, BatchNo, FormulaName, ExpectedQty, JobUnit, Status, CreatedAt, RequisitionJSON 
                FROM Production_Tasks 
                WHERE RequisitionJSON IS NOT NULL AND (CurrentStep != 'requisition' AND Status != 'รอเบิกวัตถุดิบ')
                UNION ALL
                SELECT TaskID, JobOrderID, BatchNo, Product AS FormulaName, Qty AS ExpectedQty, 'ชิ้น' AS JobUnit, Status, CreatedAt, RequisitionJSON 
                FROM Packaging_Tasks 
                WHERE RequisitionJSON IS NOT NULL AND Status != N'รอเบิกบรรจุภัณฑ์'
                UNION ALL
                SELECT ShipmentID AS TaskID, ShipmentID AS JobOrderID, BatchNo, ProductName AS FormulaName, Quantity AS ExpectedQty, 'ชิ้น' AS JobUnit, Status, CreatedAt, RequisitionJSON 
                FROM Shipping_Orders 
                WHERE RequisitionJSON IS NOT NULL AND Status != N'รอคลังอนุมัติ' AND Status != N'รอเบิกวัสดุแพ็ค'
            ) AS CombinedTasks
            ORDER BY CreatedAt DESC
        `);
        
        const requisitions = result.recordset.map(row => {
            const parsed = row.RequisitionJSON ? JSON.parse(row.RequisitionJSON) : [];
            let history = [];
            if (Array.isArray(parsed)) {
                if (parsed.length > 0 && parsed[0].id && !parsed[0].items) history = [{ items: parsed }];
                else history = parsed;
            } else if (parsed && parsed.items) {
                history = [parsed];
            }
            let targetReq = history.length > 0 ? history[history.length - 1] : { items: [] };
            const items = targetReq.items || [];
            return {
                id: row.TaskID,
                jobOrderId: row.JobOrderID,
                batchNo: row.BatchNo,
                formulaName: row.FormulaName,
                expectedQty: row.ExpectedQty,
                unit: row.JobUnit,
                status: row.Status,
                createdAt: row.CreatedAt,
                items: items,
                requesterName: targetReq.requesterName || 'ไม่ระบุ'
            };
        });
        
        res.json({ data: requisitions });
    } catch (err) {
        console.error('Error fetching requisition history:', err);
        res.status(500).json({ message: 'Error fetching requisition history' });
    }
});

// Issue materials (Approve Requisition)
router.post('/requisitions/:taskId/issue', authorizeRoles('admin', 'executive', 'warehouse'), async (req, res) => {
    try {
        const { taskId } = req.params;
        const pool = await poolPromise;
        
        // 1. Get Task
        let taskRes;
        let isPackaging = taskId.startsWith('PKG');
        let isShipping = taskId.startsWith('SHP');
        
        if (isPackaging) {
            taskRes = await pool.request()
                .input('TaskID', sql.VarChar, taskId)
                .query('SELECT RequisitionJSON, Status AS CurrentStep FROM Packaging_Tasks WHERE TaskID = @TaskID');
        } else if (isShipping) {
            taskRes = await pool.request()
                .input('TaskID', sql.VarChar, taskId)
                .query('SELECT RequisitionJSON, Status AS CurrentStep FROM Shipping_Orders WHERE ShipmentID = @TaskID');
        } else {
            taskRes = await pool.request()
                .input('TaskID', sql.VarChar, taskId)
                .query('SELECT RequisitionJSON, CurrentStep, BatchNo, ProductName, FormulaName, Line, ExpectedQty, ProducedQty, JobOrderID FROM Production_Tasks WHERE TaskID = @TaskID');
        }
            
        if (taskRes.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบงานนี้' });
        }
        
        const task = taskRes.recordset[0];
        const stepStatus = task.CurrentStep;
        if (isShipping && stepStatus !== 'รอคลังอนุมัติ') {
            return res.status(400).json({ message: 'งานจัดส่งนี้ไม่ได้อยู่ในสถานะรอคลังอนุมัติ' });
        } else if (isPackaging && stepStatus !== 'รอเบิกบรรจุภัณฑ์') {
            return res.status(400).json({ message: 'งานบรรจุนี้ไม่ได้อยู่ในสถานะรอเบิกบรรจุภัณฑ์' });
        } else if (!isPackaging && !isShipping && stepStatus !== 'requisition') {
            return res.status(400).json({ message: 'งานผลิตนี้ถูกเบิกจ่ายไปแล้ว หรือไม่ได้อยู่ในสถานะรอเบิก' });
        }
        
        let parsedData = task.RequisitionJSON ? JSON.parse(task.RequisitionJSON) : [];
        let history = [];
        if (Array.isArray(parsedData)) {
            if (parsedData.length > 0 && parsedData[0].id && !parsedData[0].items) history = [{ items: parsedData }];
            else history = parsedData;
        } else if (parsedData && parsedData.items) {
            history = [parsedData];
        }
        let pendingReq = history.length > 0 ? history[history.length - 1] : { items: [] };
        const items = pendingReq.items || [];
        if (items.length === 0) {
            return res.status(400).json({ message: 'ไม่มีรายการวัตถุดิบให้เบิก' });
        }
        
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // 2. Pre-check Stock Sufficiency
            for (const item of items) {
                if (!item.id || !item.deductQty) continue;
                const checkRes = await transaction.request()
                    .input('ItemID', sql.VarChar, item.id)
                    .query('SELECT Quantity, ProductName FROM Stock_Items WHERE ItemID = @ItemID');
                
                if (checkRes.recordset.length === 0) {
                    throw new Error(`ไม่พบสินค้า ${item.name} (${item.id}) ในระบบสต็อก`);
                }
                
                const currentQty = checkRes.recordset[0].Quantity;
                if (currentQty < item.deductQty) {
                    throw new Error(`สินค้า ${checkRes.recordset[0].ProductName} มีสต็อกไม่เพียงพอ (ต้องการ ${item.deductQty}, มี ${currentQty})`);
                }
            }

            // 3. Loop & Deduct Stock
            for (const item of items) {
                if (!item.id || !item.deductQty) continue;
                
                await transaction.request()
                    .input('ItemID', sql.VarChar, item.id)
                    .input('DeductQty', sql.Float, item.deductQty)
                    .query(`
                        UPDATE Stock_Items 
                        SET Quantity = Quantity - @DeductQty, UpdatedAt = GETDATE()
                        WHERE ItemID = @ItemID
                    `);
                    
                // 3. Insert Logs
                await transaction.request()
                    .input('ItemID', sql.VarChar, item.id)
                    .input('ProductName', sql.NVarChar, item.name || '')
                    .input('Type', sql.VarChar, 'out')
                    .input('Quantity', sql.Float, item.deductQty)
                    .input('RefNo', sql.VarChar, taskId)
                    .input('RefType', sql.VarChar, isShipping ? 'shipping' : 'production')
                    .input('Notes', sql.NVarChar, isShipping ? `เบิกบรรจุภัณฑ์สำหรับงานจัดส่ง ${taskId}` : `เบิกจ่ายวัตถุดิบเข้างานผลิต ${taskId}`)
                    .input('CreatedBy', sql.NVarChar, req.user ? req.user.username : 'warehouse')
                    .query(`
                        INSERT INTO Stock_Logs (ItemID, ProductName, Type, Quantity, RefNo, RefType, Notes, CreatedBy)
                        VALUES (@ItemID, @ProductName, @Type, @Quantity, @RefNo, @RefType, @Notes, @CreatedBy)
                    `);
            }
            
            // 4. Update Task Status
            pendingReq.issuerName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username : 'เจ้าหน้าที่คลังสินค้า';
            pendingReq.issueDate = new Date().toLocaleDateString('th-TH');
            parsedData = history;
            
            if (isShipping) {
                await transaction.request()
                    .input('TaskID', sql.VarChar, taskId)
                    .input('Status', sql.NVarChar, 'รอแพ็ค')
                    .input('RequisitionJSON', sql.NVarChar, JSON.stringify(parsedData))
                    .query(`
                        UPDATE Shipping_Orders 
                        SET Status = @Status, RequisitionJSON = @RequisitionJSON, UpdatedAt = GETDATE()
                        WHERE ShipmentID = @TaskID
                    `);
            } else if (isPackaging) {
                await transaction.request()
                    .input('TaskID', sql.VarChar, taskId)
                    .input('Status', sql.NVarChar, 'รอบรรจุ')
                    .input('RequisitionJSON', sql.NVarChar, JSON.stringify(parsedData))
                    .query(`
                        UPDATE Packaging_Tasks 
                        SET Status = @Status, RequisitionJSON = @RequisitionJSON, UpdatedAt = GETDATE()
                        WHERE TaskID = @TaskID
                    `);
            } else {
                const isWipTask = task.Line === 'WIP Line' || (task.BatchNo && task.BatchNo.includes('-WIP'));
                let nextStep = isWipTask ? 'wait' : 'packaging';
                let nextStatus = isWipTask ? 'รอเริ่มงาน' : 'รอบรรจุ';

                if (!isWipTask) {
                    // Auto-create Packaging task like in production.js advance logic
                    const checkPkg = await pool.request()
                        .input('BatchNoCheck', sql.VarChar, task.BatchNo || '')
                        .input('ProdTaskIDCheck', sql.VarChar, taskId)
                        .query(`
                            SELECT COUNT(*) as cnt FROM Packaging_Tasks 
                            WHERE BatchNo = @BatchNoCheck OR ProductionTaskID = @ProdTaskIDCheck
                        `);
                    if (checkPkg.recordset[0].cnt === 0) {
                        const pkgId = await generateSequence(pool, 'Packaging_Tasks', 'TaskID', `PKG-${getDatePrefix()}`, 3);
                        let pkgDestination = 'คลัง';
                        if (task.JobOrderID) {
                            try {
                                const plannerCheck = await pool.request()
                                    .input('PlannerIDCheck', sql.VarChar, task.JobOrderID)
                                    .query('SELECT Notes FROM Planner WHERE PlannerID = @PlannerIDCheck');
                                if (plannerCheck.recordset.length > 0) {
                                    const pNotes = plannerCheck.recordset[0].Notes || '';
                                    if (pNotes.includes('OEM') || pNotes.includes('ผลิตตามออร์เดอร์') || pNotes.includes('ผลิตตามออเดอร์') || pNotes.includes('ผลิตตามคำสั่งซื้อ')) {
                                        pkgDestination = 'ส่งลูกค้า';
                                    }
                                }
                            } catch(pe) { console.error(pe); }
                        }

                        await transaction.request()
                            .input('PkgTaskID', sql.VarChar, pkgId)
                            .input('BatchNoPkg', sql.VarChar, task.BatchNo)
                            .input('ProductPkg', sql.NVarChar, task.ProductName || task.FormulaName || '')
                            .input('LinePkg', sql.VarChar, task.Line || '')
                            .input('QtyPkg', sql.Int, task.ExpectedQty || task.ProducedQty || 0)
                            .input('StatusPkg', sql.NVarChar, 'รอบรรจุ')
                            .input('DestinationPkg', sql.NVarChar, pkgDestination)
                            .input('ProductionTaskIDPkg', sql.VarChar, taskId)
                            .input('JobOrderIDPkg', sql.VarChar, task.JobOrderID || null)
                            .query(`
                                INSERT INTO Packaging_Tasks 
                                (TaskID, BatchNo, Product, Line, Qty, PackedQty, Status, Destination, ProductionTaskID, JobOrderID)
                                VALUES (@PkgTaskID, @BatchNoPkg, @ProductPkg, @LinePkg, @QtyPkg, 0, @StatusPkg, @DestinationPkg, @ProductionTaskIDPkg, @JobOrderIDPkg)
                            `);
                    }
                }

                await transaction.request()
                    .input('TaskID', sql.VarChar, taskId)
                    .input('CurrentStep', sql.VarChar, nextStep)
                    .input('Status', sql.NVarChar, nextStatus)
                    .input('RequisitionJSON', sql.NVarChar, JSON.stringify(parsedData))
                    .query(`
                        UPDATE Production_Tasks 
                        SET CurrentStep = @CurrentStep, Status = @Status, RequisitionJSON = @RequisitionJSON
                        WHERE TaskID = @TaskID
                    `);
            }
                
            await transaction.commit();
            res.json({ message: 'อนุมัติเบิกจ่ายและหักสต็อกสำเร็จ' });
        } catch (txnErr) {
            await transaction.rollback();
            throw txnErr;
        }
        
    } catch (err) {
        console.error('Error issuing materials:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการจ่ายของ: ' + err.message });
    }
});

module.exports = router;

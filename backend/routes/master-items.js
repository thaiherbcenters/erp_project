const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { generateSequence } = require('../utils/sequence');
const { authorizeRoles } = require('../middleware/authorize');

// ==========================================
// MASTER ITEMS MODULE
// ==========================================

// GET /api/master-items/categories
// Returns distinct SubCategory values grouped by ItemType
router.get('/categories', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT DISTINCT ItemType, SubCategory 
            FROM MasterItems 
            WHERE IsActive = 1 AND SubCategory IS NOT NULL
        `);

        const categories = {};
        result.recordset.forEach(row => {
            if (!categories[row.ItemType]) {
                categories[row.ItemType] = [];
            }
            if (!categories[row.ItemType].includes(row.SubCategory)) {
                categories[row.ItemType].push(row.SubCategory);
            }
        });

        res.json(categories);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ message: 'Error fetching categories' });
    }
});

// GET /api/master-items/summary
// Returns count by type, total items, low stock count, out of stock count
router.get('/summary', async (req, res) => {
    try {
        const pool = await poolPromise;
        
        const typeRes = await pool.request().query(`
            SELECT ItemType, COUNT(*) as Count 
            FROM MasterItems 
            WHERE IsActive = 1 
            GROUP BY ItemType
        `);

        const stockRes = await pool.request().query(`
            SELECT 
                COUNT(*) as Total,
                SUM(CASE WHEN CurrentStock <= 0 THEN 1 ELSE 0 END) as OutOfStock,
                SUM(CASE WHEN CurrentStock > 0 AND CurrentStock <= MinStock THEN 1 ELSE 0 END) as LowStock
            FROM MasterItems 
            WHERE IsActive = 1
        `);

        const summary = {
            total: stockRes.recordset[0].Total || 0,
            outOfStock: stockRes.recordset[0].OutOfStock || 0,
            lowStock: stockRes.recordset[0].LowStock || 0,
            byType: {}
        };

        typeRes.recordset.forEach(row => {
            summary.byType[row.ItemType] = row.Count;
        });

        res.json(summary);
    } catch (err) {
        console.error('Error fetching summary:', err);
        res.status(500).json({ message: 'Error fetching summary' });
    }
});

// GET /api/master-items/for-quotation
// Special endpoint for quotation dropdown
router.get('/for-quotation', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT ItemName as name, SellingPrice as price, PromoJSON as promo 
            FROM MasterItems 
            WHERE ItemType = 'finished_goods' AND IsActive = 1
            ORDER BY ItemName ASC
        `);

        const items = result.recordset.map(row => ({
            name: row.name,
            price: Number(row.price),
            promo: row.promo ? JSON.parse(row.promo) : undefined
        }));

        res.json(items);
    } catch (err) {
        console.error('Error fetching items for quotation:', err);
        res.status(500).json({ message: 'Error fetching items for quotation' });
    }
});

// GET /api/master-items
// Query params: type, search, subCategory, page, limit
router.get('/', async (req, res) => {
    try {
        const { type, search, subCategory, page = 1, limit = 50 } = req.query;
        const pool = await poolPromise;
        
        let query = 'FROM MasterItems WHERE IsActive = 1';
        const request = pool.request();

        if (type) {
            query += ' AND ItemType = @Type';
            request.input('Type', sql.NVarChar, type);
        }
        
        if (subCategory) {
            query += ' AND SubCategory = @SubCategory';
            request.input('SubCategory', sql.NVarChar, subCategory);
        }

        if (search) {
            query += ' AND (ItemCode LIKE @Search OR ItemName LIKE @Search OR ItemNameEN LIKE @Search)';
            request.input('Search', sql.NVarChar, \`%\${search}%\`);
        }

        const countRes = await request.query(\`SELECT COUNT(*) as Total \${query}\`);
        const total = countRes.recordset[0].Total;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;

        const dataRes = await request.query(\`
            SELECT * \${query} 
            ORDER BY ItemID DESC 
            OFFSET \${offset} ROWS 
            FETCH NEXT \${limit} ROWS ONLY
        \`);

        const items = dataRes.recordset.map(row => ({
            itemId: row.ItemID,
            itemCode: row.ItemCode,
            itemName: row.ItemName,
            itemNameEN: row.ItemNameEN,
            itemType: row.ItemType,
            subCategory: row.SubCategory,
            unit: row.Unit,
            sellingPrice: row.SellingPrice,
            costPerUnit: row.CostPerUnit,
            currentStock: row.CurrentStock,
            minStock: row.MinStock,
            netWeight: row.NetWeight,
            formulaId: row.FormulaID,
            fdaNumber: row.FDA_Number,
            supplierId: row.SupplierID,
            isActive: row.IsActive,
            notes: row.Notes,
            promoJSON: row.PromoJSON ? JSON.parse(row.PromoJSON) : null,
            createdAt: row.CreatedAt,
            updatedAt: row.UpdatedAt
        }));

        res.json({
            data: items,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages
            }
        });
    } catch (err) {
        console.error('Error fetching master items:', err);
        res.status(500).json({ message: 'Error fetching master items' });
    }
});

// GET /api/master-items/:id
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ItemID', sql.Int, req.params.id)
            .query('SELECT * FROM MasterItems WHERE ItemID = @ItemID AND IsActive = 1');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }

        const row = result.recordset[0];
        const item = {
            itemId: row.ItemID,
            itemCode: row.ItemCode,
            itemName: row.ItemName,
            itemNameEN: row.ItemNameEN,
            itemType: row.ItemType,
            subCategory: row.SubCategory,
            unit: row.Unit,
            sellingPrice: row.SellingPrice,
            costPerUnit: row.CostPerUnit,
            currentStock: row.CurrentStock,
            minStock: row.MinStock,
            netWeight: row.NetWeight,
            formulaId: row.FormulaID,
            fdaNumber: row.FDA_Number,
            supplierId: row.SupplierID,
            isActive: row.IsActive,
            notes: row.Notes,
            promoJSON: row.PromoJSON ? JSON.parse(row.PromoJSON) : null,
            createdAt: row.CreatedAt,
            updatedAt: row.UpdatedAt
        };

        res.json(item);
    } catch (err) {
        console.error('Error fetching master item:', err);
        res.status(500).json({ message: 'Error fetching master item' });
    }
});

// POST /api/master-items
router.post('/', authorizeRoles('admin', 'executive', 'planner', 'stock'), async (req, res) => {
    try {
        const data = req.body;
        const pool = await poolPromise;

        // Auto-generate ItemCode based on type
        let prefix = 'XX';
        if (data.itemType === 'finished_goods') prefix = 'FG';
        else if (data.itemType === 'raw_material') prefix = 'RM';
        else if (data.itemType === 'packaging') prefix = 'PK';
        else if (data.itemType === 'label') prefix = 'LB';
        else if (data.itemType === 'consumable') prefix = 'CS';

        // using generateSequence from utils/sequence.js
        const itemCode = await generateSequence(pool, 'MasterItems', 'ItemCode', prefix, 3, '-');

        const promoJSON = data.promoJSON ? JSON.stringify(data.promoJSON) : null;

        const result = await pool.request()
            .input('ItemCode', sql.NVarChar, itemCode)
            .input('ItemName', sql.NVarChar, data.itemName)
            .input('ItemNameEN', sql.NVarChar, data.itemNameEN || null)
            .input('ItemType', sql.NVarChar, data.itemType)
            .input('SubCategory', sql.NVarChar, data.subCategory || null)
            .input('Unit', sql.NVarChar, data.unit || 'ชิ้น')
            .input('SellingPrice', sql.Decimal(12,2), data.sellingPrice || 0)
            .input('CostPerUnit', sql.Decimal(12,2), data.costPerUnit || 0)
            .input('CurrentStock', sql.Decimal(12,2), data.currentStock || 0)
            .input('MinStock', sql.Decimal(12,2), data.minStock || 0)
            .input('NetWeight', sql.Decimal(12,4), data.netWeight || null)
            .input('FormulaID', sql.VarChar, data.formulaId || null)
            .input('FDA_Number', sql.NVarChar, data.fdaNumber || null)
            .input('SupplierID', sql.Int, data.supplierId || null)
            .input('Notes', sql.NVarChar, data.notes || null)
            .input('PromoJSON', sql.NVarChar, promoJSON)
            .query(`
                INSERT INTO MasterItems (
                    ItemCode, ItemName, ItemNameEN, ItemType, SubCategory, Unit, 
                    SellingPrice, CostPerUnit, CurrentStock, MinStock, NetWeight, 
                    FormulaID, FDA_Number, SupplierID, Notes, PromoJSON
                ) 
                OUTPUT INSERTED.ItemID, INSERTED.ItemCode
                VALUES (
                    @ItemCode, @ItemName, @ItemNameEN, @ItemType, @SubCategory, @Unit,
                    @SellingPrice, @CostPerUnit, @CurrentStock, @MinStock, @NetWeight,
                    @FormulaID, @FDA_Number, @SupplierID, @Notes, @PromoJSON
                )
            `);

        res.status(201).json({ 
            message: 'Master item created successfully', 
            itemId: result.recordset[0].ItemID,
            itemCode: result.recordset[0].ItemCode
        });
    } catch (err) {
        console.error('Error creating master item:', err);
        res.status(500).json({ message: 'Error creating master item' });
    }
});

// PUT /api/master-items/:id
router.put('/:id', authorizeRoles('admin', 'executive', 'planner', 'stock'), async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const pool = await poolPromise;

        const promoJSON = data.promoJSON ? JSON.stringify(data.promoJSON) : null;

        await pool.request()
            .input('ItemID', sql.Int, id)
            .input('ItemName', sql.NVarChar, data.itemName)
            .input('ItemNameEN', sql.NVarChar, data.itemNameEN || null)
            .input('ItemType', sql.NVarChar, data.itemType)
            .input('SubCategory', sql.NVarChar, data.subCategory || null)
            .input('Unit', sql.NVarChar, data.unit)
            .input('SellingPrice', sql.Decimal(12,2), data.sellingPrice || 0)
            .input('CostPerUnit', sql.Decimal(12,2), data.costPerUnit || 0)
            .input('CurrentStock', sql.Decimal(12,2), data.currentStock || 0)
            .input('MinStock', sql.Decimal(12,2), data.minStock || 0)
            .input('NetWeight', sql.Decimal(12,4), data.netWeight || null)
            .input('FormulaID', sql.VarChar, data.formulaId || null)
            .input('FDA_Number', sql.NVarChar, data.fdaNumber || null)
            .input('SupplierID', sql.Int, data.supplierId || null)
            .input('Notes', sql.NVarChar, data.notes || null)
            .input('PromoJSON', sql.NVarChar, promoJSON)
            .query(`
                UPDATE MasterItems SET
                    ItemName = @ItemName,
                    ItemNameEN = @ItemNameEN,
                    ItemType = @ItemType,
                    SubCategory = @SubCategory,
                    Unit = @Unit,
                    SellingPrice = @SellingPrice,
                    CostPerUnit = @CostPerUnit,
                    CurrentStock = @CurrentStock,
                    MinStock = @MinStock,
                    NetWeight = @NetWeight,
                    FormulaID = @FormulaID,
                    FDA_Number = @FDA_Number,
                    SupplierID = @SupplierID,
                    Notes = @Notes,
                    PromoJSON = @PromoJSON,
                    UpdatedAt = GETDATE()
                WHERE ItemID = @ItemID
            `);

        res.json({ message: 'Master item updated successfully' });
    } catch (err) {
        console.error('Error updating master item:', err);
        res.status(500).json({ message: 'Error updating master item' });
    }
});

// DELETE /api/master-items/:id
router.delete('/:id', authorizeRoles('admin', 'executive'), async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ItemID', sql.Int, req.params.id)
            .query(`
                UPDATE MasterItems 
                SET IsActive = 0, UpdatedAt = GETDATE() 
                WHERE ItemID = @ItemID
            `);

        res.json({ message: 'Master item deleted successfully' });
    } catch (err) {
        console.error('Error deleting master item:', err);
        res.status(500).json({ message: 'Error deleting master item' });
    }
});

module.exports = router;

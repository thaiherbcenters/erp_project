/**
 * =============================================================================
 * purchase-orders.js — Purchase Order (PO) API Routes
 * =============================================================================
 * จัดการคำสั่งซื้อสินค้า / วัตถุดิบ (Procurement Purchase Order):
 *   - GET    /next-number    : ดึงเลขที่ PO ถัดไป
 *   - GET    /suppliers      : ดึงรายชื่อซัพพลายเออร์สำหรับ Autocomplete
 *   - GET    /               : รายการ PO ทั้งหมด (รองรับค้นหา / กรองสถานะ)
 *   - GET    /:id            : รายละเอียด PO พร้อม Items
 *   - POST   /               : สร้าง PO ใหม่พร้อม Items
 *   - PUT    /:id            : แก้ไข PO พร้อม Items
 *   - DELETE /:id            : ลบ PO
 *   - PATCH  /:id/status     : อัปเดตสถานะ PO
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const { peekNextSequence } = require('../utils/sequence');

// ── Helper: Generate PO Number (PO-YYYYMMDD-001) ──
const generatePONumber = async (pool) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const prefix = `PO-${yyyy}${mm}${dd}`;
    return await peekNextSequence(pool, 'PurchaseOrder', 'PONumber', prefix, 3, '-');
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /next-number — ดึงเลข PO ลำดับถัดไป
// ─────────────────────────────────────────────────────────────────────────────
router.get('/next-number', async (req, res) => {
    try {
        const pool = await poolPromise;
        const nextNo = await generatePONumber(pool);
        res.json({ success: true, nextNumber: nextNo });
    } catch (err) {
        console.error('Error generating next PO number:', err);
        res.status(500).json({ success: false, message: 'Failed to generate next PO number', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /suppliers — รายชื่อซัพพลายเออร์จากตาราง Supplier
// ─────────────────────────────────────────────────────────────────────────────
router.get('/suppliers', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                SupplierID, SupplierName, Phone, TaxID, Address, 
                Email, Contact_Person AS ContactPerson, Payment_Terms AS PaymentTerms,
                Supplier_Code AS SupplierCode, Active_Status AS ActiveStatus
            FROM Supplier
            WHERE Active_Status IS NULL OR Active_Status = 'Active'
            ORDER BY SupplierName ASC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching suppliers:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch suppliers', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET / — รายการ PO ทั้งหมด
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { search, status, startDate, endDate, dateFrom, dateTo, createdBy, supplierId } = req.query;

        let whereConditions = [];
        const request = pool.request();

        if (search) {
            whereConditions.push(`(
                po.PONumber LIKE @search OR 
                po.SupplierName LIKE @search OR 
                po.RefNumber LIKE @search OR
                po.PRNumber LIKE @search OR
                EXISTS (SELECT 1 FROM PurchaseOrderItem WHERE PurchaseOrderID = po.PurchaseOrderID AND ItemName LIKE @search)
            )`);
            request.input('search', sql.NVarChar, `%${search.trim()}%`);
        }

        if (status && status !== 'ทั้งหมด' && status !== 'all' && status.trim() !== '') {
            whereConditions.push(`po.Status = @status`);
            request.input('status', sql.NVarChar, status.trim());
        }

        const effectiveStartDate = startDate || dateFrom;
        if (effectiveStartDate) {
            whereConditions.push(`po.PODate >= @startDate`);
            request.input('startDate', sql.Date, effectiveStartDate);
        }

        const effectiveEndDate = endDate || dateTo;
        if (effectiveEndDate) {
            whereConditions.push(`po.PODate <= @endDate`);
            request.input('endDate', sql.Date, effectiveEndDate);
        }

        if (createdBy) {
            whereConditions.push(`po.CreatedBy = @createdBy`);
            request.input('createdBy', sql.Int, parseInt(createdBy));
        }

        if (supplierId) {
            whereConditions.push(`po.SupplierID = @supplierId`);
            request.input('supplierId', sql.Int, parseInt(supplierId));
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT 
                po.PurchaseOrderID, po.PONumber, COALESCE(po.Revision, 0) AS Revision, po.PODate, po.RefNumber, po.PRNumber, po.DocType,
                po.BuyerName, po.SupplierID, po.SupplierName, po.SupplierPhone,
                po.SubTotal, po.VatRate, po.VatAmount, po.GrandTotal, po.WithholdingTaxAmount, po.TotalPayable,
                po.Status, po.CreatedAt, po.UpdatedAt,
                u.display_name AS CreatedByName,
                (SELECT COUNT(*) FROM PurchaseOrderItem WHERE PurchaseOrderID = po.PurchaseOrderID) AS ItemCount,
                (SELECT TOP 1 ItemName FROM PurchaseOrderItem WHERE PurchaseOrderID = po.PurchaseOrderID ORDER BY ItemOrder ASC) AS PrimaryItemName,
                (SELECT SUM(Qty) FROM PurchaseOrderItem WHERE PurchaseOrderID = po.PurchaseOrderID) AS TotalQty
            FROM PurchaseOrder po
            LEFT JOIN Users u ON po.CreatedBy = u.user_id
            ${whereClause}
            ORDER BY po.PurchaseOrderID DESC
        `;

        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching purchase orders:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch purchase orders', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /:id — รายละเอียด PO ตาม ID
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;

        const headerResult = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    po.*,
                    u.display_name AS CreatedByName
                FROM PurchaseOrder po
                LEFT JOIN Users u ON po.CreatedBy = u.user_id
                WHERE po.PurchaseOrderID = @id
            `);

        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Purchase Order not found' });
        }

        const po = headerResult.recordset[0];

        const itemsResult = await pool.request()
            .input('poId', sql.Int, id)
            .query(`
                SELECT * 
                FROM PurchaseOrderItem 
                WHERE PurchaseOrderID = @poId 
                ORDER BY ItemOrder ASC, ItemID ASC
            `);

        po.items = itemsResult.recordset;

        res.json({ success: true, data: po });
    } catch (err) {
        console.error('Error fetching PO detail:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch PO detail', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. POST / — สร้าง PO ใหม่พร้อม Items
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const {
        poNumber, poDate, refNumber, prNumber, docType,
        buyerName, buyerAddress, buyerPhone, buyerEmail, buyerTaxId,
        supplierId, supplierName, supplierAddress, supplierPhone, supplierEmail, supplierTaxId,
        subTotal, discountPercent, discountAmount, vatRate, vatAmount, grandTotal,
        withholdingTaxRate, withholdingTaxAmount, totalPayable,
        notes, preparedBy, approvedBy, supplierRecipient,
        items
    } = req.body;

    if (!supplierName || !supplierName.trim()) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อผู้ขาย / ซัพพลายเออร์' });
    }

    let transaction;
    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Check or generate PO number
        let finalPONumber = poNumber;
        if (!finalPONumber || !finalPONumber.trim()) {
            finalPONumber = await generatePONumber(pool);
        }

        // Auto-resolve or auto-create supplier in Supplier table
        let finalSupplierId = supplierId ? parseInt(supplierId, 10) : null;
        const cleanTaxId = supplierTaxId ? supplierTaxId.trim() : null;
        const cleanSupName = supplierName ? supplierName.trim() : '';

        if (!finalSupplierId && cleanSupName) {
            const checkSupReq = new sql.Request(transaction);
            checkSupReq.input('supName', sql.NVarChar, cleanSupName);
            checkSupReq.input('supTax', sql.NVarChar, cleanTaxId);
            const existSup = await checkSupReq.query(`
                SELECT TOP 1 SupplierID 
                FROM Supplier 
                WHERE (@supTax IS NOT NULL AND @supTax <> '' AND TaxID = @supTax)
                   OR SupplierName = @supName
            `);
            if (existSup.recordset.length > 0) {
                finalSupplierId = existSup.recordset[0].SupplierID;
            } else {
                try {
                    const insertSupReq = new sql.Request(transaction);
                    insertSupReq.input('sName', sql.NVarChar, cleanSupName);
                    insertSupReq.input('sAddr', sql.NVarChar, supplierAddress || null);
                    insertSupReq.input('sPhone', sql.NVarChar, supplierPhone ? supplierPhone.trim() : null);
                    insertSupReq.input('sEmail', sql.VarChar, supplierEmail ? supplierEmail.trim() : null);
                    insertSupReq.input('sTax', sql.NVarChar, cleanTaxId);
                    const newSupRes = await insertSupReq.query(`
                        INSERT INTO Supplier (SupplierName, Address, Phone, Email, TaxID, Active_Status)
                        OUTPUT INSERTED.SupplierID
                        VALUES (@sName, @sAddr, @sPhone, @sEmail, @sTax, 'Active')
                    `);
                    if (newSupRes.recordset.length > 0) {
                        finalSupplierId = newSupRes.recordset[0].SupplierID;
                    }
                } catch (insErr) {
                    console.warn('Could not auto-insert supplier (checking existing by TaxID or Name):', insErr.message);
                    const fallbackReq = new sql.Request(transaction);
                    fallbackReq.input('supTax', sql.NVarChar, cleanTaxId);
                    fallbackReq.input('supName', sql.NVarChar, cleanSupName);
                    const fallbackSup = await fallbackReq.query(`
                        SELECT TOP 1 SupplierID 
                        FROM Supplier 
                        WHERE (@supTax IS NOT NULL AND @supTax <> '' AND TaxID = @supTax)
                           OR SupplierName = @supName
                    `);
                    if (fallbackSup.recordset.length > 0) {
                        finalSupplierId = fallbackSup.recordset[0].SupplierID;
                    }
                }
            }
        }

        let resolvedPoDate = poDate;
        if (poDate && typeof poDate === 'object') {
            resolvedPoDate = poDate.target?.value || poDate.value || null;
        }
        if (!resolvedPoDate || (typeof resolvedPoDate !== 'string' && !(resolvedPoDate instanceof Date))) {
            resolvedPoDate = new Date();
        }

        const headerReq = new sql.Request(transaction);
        headerReq.input('poNumber', sql.NVarChar, finalPONumber.trim());
        headerReq.input('poDate', sql.Date, resolvedPoDate);
        headerReq.input('refNumber', sql.NVarChar, refNumber || null);
        headerReq.input('prNumber', sql.NVarChar, prNumber || null);
        headerReq.input('docType', sql.NVarChar, docType || 'po_thc');

        headerReq.input('buyerName', sql.NVarChar, buyerName || 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์');
        headerReq.input('buyerAddress', sql.NVarChar, buyerAddress || '');
        headerReq.input('buyerPhone', sql.NVarChar, buyerPhone || '');
        headerReq.input('buyerEmail', sql.NVarChar, buyerEmail || '');
        headerReq.input('buyerTaxId', sql.NVarChar, buyerTaxId || '');

        headerReq.input('supplierId', sql.Int, finalSupplierId);
        headerReq.input('supplierName', sql.NVarChar, supplierName.trim());
        headerReq.input('supplierAddress', sql.NVarChar, supplierAddress || '');
        headerReq.input('supplierPhone', sql.NVarChar, supplierPhone || '');
        headerReq.input('supplierEmail', sql.NVarChar, supplierEmail || '');
        headerReq.input('supplierTaxId', sql.NVarChar, supplierTaxId || '');

        headerReq.input('subTotal', sql.Decimal(18, 2), parseFloat(subTotal) || 0);
        headerReq.input('discountPercent', sql.Decimal(5, 2), parseFloat(discountPercent) || 0);
        headerReq.input('discountAmount', sql.Decimal(18, 2), parseFloat(discountAmount) || 0);
        headerReq.input('vatRate', sql.Decimal(5, 2), parseFloat(vatRate) || 7);
        headerReq.input('vatAmount', sql.Decimal(18, 2), parseFloat(vatAmount) || 0);
        headerReq.input('grandTotal', sql.Decimal(18, 2), parseFloat(grandTotal) || 0);
        headerReq.input('withholdingTaxRate', sql.Decimal(5, 2), parseFloat(withholdingTaxRate) || 0);
        headerReq.input('withholdingTaxAmount', sql.Decimal(18, 2), parseFloat(withholdingTaxAmount) || 0);
        headerReq.input('totalPayable', sql.Decimal(18, 2), parseFloat(totalPayable) || 0);

        headerReq.input('notes', sql.NVarChar, notes || '');
        headerReq.input('preparedBy', sql.NVarChar, preparedBy || null);
        headerReq.input('approvedBy', sql.NVarChar, approvedBy || null);
        headerReq.input('supplierRecipient', sql.NVarChar, supplierRecipient || null);
        headerReq.input('createdBy', sql.Int, req.user ? req.user.id : null);

        const headerResult = await headerReq.query(`
            INSERT INTO PurchaseOrder (
                PONumber, PODate, RefNumber, PRNumber, DocType,
                BuyerName, BuyerAddress, BuyerPhone, BuyerEmail, BuyerTaxID,
                SupplierID, SupplierName, SupplierAddress, SupplierPhone, SupplierEmail, SupplierTaxID,
                SubTotal, DiscountPercent, DiscountAmount, VatRate, VatAmount, GrandTotal,
                WithholdingTaxRate, WithholdingTaxAmount, TotalPayable,
                Notes, PreparedBy, ApprovedBy, SupplierRecipient,
                Status, CreatedBy, CreatedAt, UpdatedAt
            )
            OUTPUT INSERTED.PurchaseOrderID, INSERTED.PONumber
            VALUES (
                @poNumber, @poDate, @refNumber, @prNumber, @docType,
                @buyerName, @buyerAddress, @buyerPhone, @buyerEmail, @buyerTaxId,
                @supplierId, @supplierName, @supplierAddress, @supplierPhone, @supplierEmail, @supplierTaxId,
                @subTotal, @discountPercent, @discountAmount, @vatRate, @vatAmount, @grandTotal,
                @withholdingTaxRate, @withholdingTaxAmount, @totalPayable,
                @notes, @preparedBy, @approvedBy, @supplierRecipient,
                N'รออนุมัติ', @createdBy, GETDATE(), GETDATE()
            )
        `);

        const newPoId = headerResult.recordset[0].PurchaseOrderID;

        // Insert items
        if (items && Array.isArray(items) && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                if (!it.name && !it.ItemName) continue;

                const itemReq = new sql.Request(transaction);
                itemReq.input('poId', sql.Int, newPoId);
                itemReq.input('itemOrder', sql.Int, i + 1);
                itemReq.input('itemName', sql.NVarChar, it.name || it.ItemName || '');
                itemReq.input('itemCode', sql.NVarChar, it.code || it.ItemCode || null);
                itemReq.input('qty', sql.Decimal(18, 4), parseFloat(it.qty) || 1);
                itemReq.input('unit', sql.NVarChar, it.unit || 'ชิ้น');
                itemReq.input('unitPrice', sql.Decimal(18, 2), parseFloat(it.price || it.unitPrice) || 0);
                itemReq.input('vatRate', sql.Decimal(5, 2), it.vatRate !== undefined ? parseFloat(it.vatRate) : 7);
                itemReq.input('vatAmount', sql.Decimal(18, 2), parseFloat(it.vatAmount) || 0);
                itemReq.input('lineTotal', sql.Decimal(18, 2), parseFloat(it.lineTotal || it.amount) || 0);
                itemReq.input('whtRate', sql.Decimal(5, 2), parseFloat(it.whtRate) || 0);
                itemReq.input('whtAmount', sql.Decimal(18, 2), parseFloat(it.whtAmount) || 0);

                await itemReq.query(`
                    INSERT INTO PurchaseOrderItem (
                        PurchaseOrderID, ItemOrder, ItemName, ItemCode,
                        Qty, Unit, UnitPrice, VatRate, VatAmount,
                        LineTotal, WhtRate, WhtAmount
                    )
                    VALUES (
                        @poId, @itemOrder, @itemName, @itemCode,
                        @qty, @unit, @unitPrice, @vatRate, @vatAmount,
                        @lineTotal, @whtRate, @whtAmount
                    )
                `);
            }
        }

        await transaction.commit();
        res.status(201).json({
            success: true,
            message: 'สร้างใบสั่งซื้อ (PO) เรียบร้อยแล้ว',
            data: { purchaseOrderId: newPoId, poNumber: finalPONumber }
        });
    } catch (err) {
        if (transaction) await transaction.rollback().catch(() => {});
        console.error('Error creating purchase order:', err);
        res.status(500).json({ success: false, message: 'Failed to create purchase order', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. PUT /:id — แก้ไข PO และ Items
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        poDate, refNumber, prNumber, docType,
        buyerName, buyerAddress, buyerPhone, buyerEmail, buyerTaxId,
        supplierId, supplierName, supplierAddress, supplierPhone, supplierEmail, supplierTaxId,
        subTotal, discountPercent, discountAmount, vatRate, vatAmount, grandTotal,
        withholdingTaxRate, withholdingTaxAmount, totalPayable,
        notes, preparedBy, approvedBy, supplierRecipient, status,
        items
    } = req.body;

    if (!supplierName || !supplierName.trim()) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อผู้ขาย / ซัพพลายเออร์' });
    }

    let transaction;
    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Auto-resolve or auto-create supplier in Supplier table
        let finalSupplierId = supplierId ? parseInt(supplierId, 10) : null;
        const cleanTaxId = supplierTaxId ? supplierTaxId.trim() : null;
        const cleanSupName = supplierName ? supplierName.trim() : '';

        if (!finalSupplierId && cleanSupName) {
            const checkSupReq = new sql.Request(transaction);
            checkSupReq.input('supName', sql.NVarChar, cleanSupName);
            checkSupReq.input('supTax', sql.NVarChar, cleanTaxId);
            const existSup = await checkSupReq.query(`
                SELECT TOP 1 SupplierID 
                FROM Supplier 
                WHERE (@supTax IS NOT NULL AND @supTax <> '' AND TaxID = @supTax)
                   OR SupplierName = @supName
            `);
            if (existSup.recordset.length > 0) {
                finalSupplierId = existSup.recordset[0].SupplierID;
            } else {
                try {
                    const insertSupReq = new sql.Request(transaction);
                    insertSupReq.input('sName', sql.NVarChar, cleanSupName);
                    insertSupReq.input('sAddr', sql.NVarChar, supplierAddress || null);
                    insertSupReq.input('sPhone', sql.NVarChar, supplierPhone ? supplierPhone.trim() : null);
                    insertSupReq.input('sEmail', sql.VarChar, supplierEmail ? supplierEmail.trim() : null);
                    insertSupReq.input('sTax', sql.NVarChar, cleanTaxId);
                    const newSupRes = await insertSupReq.query(`
                        INSERT INTO Supplier (SupplierName, Address, Phone, Email, TaxID, Active_Status)
                        OUTPUT INSERTED.SupplierID
                        VALUES (@sName, @sAddr, @sPhone, @sEmail, @sTax, 'Active')
                    `);
                    if (newSupRes.recordset.length > 0) {
                        finalSupplierId = newSupRes.recordset[0].SupplierID;
                    }
                } catch (insErr) {
                    console.warn('Could not auto-insert supplier (checking existing by TaxID or Name):', insErr.message);
                    const fallbackReq = new sql.Request(transaction);
                    fallbackReq.input('supTax', sql.NVarChar, cleanTaxId);
                    fallbackReq.input('supName', sql.NVarChar, cleanSupName);
                    const fallbackSup = await fallbackReq.query(`
                        SELECT TOP 1 SupplierID 
                        FROM Supplier 
                        WHERE (@supTax IS NOT NULL AND @supTax <> '' AND TaxID = @supTax)
                           OR SupplierName = @supName
                    `);
                    if (fallbackSup.recordset.length > 0) {
                        finalSupplierId = fallbackSup.recordset[0].SupplierID;
                    }
                }
            }
        }

        // 1. Backup current version to PurchaseOrderHistory before modifying
        try {
            const backupReq = new sql.Request(transaction);
            backupReq.input('id', sql.Int, id);
            const backupResult = await backupReq.query(`
                INSERT INTO PurchaseOrderHistory (
                    PurchaseOrderID, Revision, PONumber, PODate, RefNumber, PRNumber, DocType,
                    BuyerName, BuyerAddress, BuyerPhone, BuyerEmail, BuyerTaxID,
                    SupplierID, SupplierName, SupplierAddress, SupplierPhone, SupplierEmail, SupplierTaxID,
                    SubTotal, DiscountPercent, DiscountAmount, VatRate, VatAmount, GrandTotal,
                    WithholdingTaxRate, WithholdingTaxAmount, TotalPayable,
                    Notes, PreparedBy, ApprovedBy, SupplierRecipient, Status, CreatedBy
                )
                OUTPUT INSERTED.HistoryID
                SELECT 
                    PurchaseOrderID, COALESCE(Revision, 0), PONumber, PODate, RefNumber, PRNumber, DocType,
                    BuyerName, BuyerAddress, BuyerPhone, BuyerEmail, BuyerTaxID,
                    SupplierID, SupplierName, SupplierAddress, SupplierPhone, SupplierEmail, SupplierTaxID,
                    SubTotal, DiscountPercent, DiscountAmount, VatRate, VatAmount, GrandTotal,
                    WithholdingTaxRate, WithholdingTaxAmount, TotalPayable,
                    Notes, PreparedBy, ApprovedBy, SupplierRecipient, Status, CreatedBy
                FROM PurchaseOrder
                WHERE PurchaseOrderID = @id
            `);

            if (backupResult.recordset && backupResult.recordset.length > 0) {
                const historyId = backupResult.recordset[0].HistoryID;
                const backupItemsReq = new sql.Request(transaction);
                backupItemsReq.input('historyId', sql.Int, historyId);
                backupItemsReq.input('poId', sql.Int, id);
                await backupItemsReq.query(`
                    INSERT INTO PurchaseOrderItemHistory (
                        HistoryID, ItemOrder, ItemName, ItemCode,
                        Qty, Unit, UnitPrice, VatRate, VatAmount,
                        LineTotal, WhtRate, WhtAmount
                    )
                    SELECT 
                        @historyId, ItemOrder, ItemName, ItemCode,
                        Qty, Unit, UnitPrice, VatRate, VatAmount,
                        LineTotal, WhtRate, WhtAmount
                    FROM PurchaseOrderItem
                    WHERE PurchaseOrderID = @poId
                `);
            }
        } catch (bkErr) {
            console.error('Warning: Failed to backup PO history:', bkErr.message);
        }

        let resolvedPoDate = poDate;
        if (poDate && typeof poDate === 'object') {
            resolvedPoDate = poDate.target?.value || poDate.value || null;
        }
        if (!resolvedPoDate || (typeof resolvedPoDate !== 'string' && !(resolvedPoDate instanceof Date))) {
            resolvedPoDate = new Date();
        }

        const headerReq = new sql.Request(transaction);
        headerReq.input('id', sql.Int, id);
        headerReq.input('poDate', sql.Date, resolvedPoDate);
        headerReq.input('refNumber', sql.NVarChar, refNumber || null);
        headerReq.input('prNumber', sql.NVarChar, prNumber || null);
        headerReq.input('docType', sql.NVarChar, docType || 'po_thc');

        headerReq.input('buyerName', sql.NVarChar, buyerName || 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์');
        headerReq.input('buyerAddress', sql.NVarChar, buyerAddress || '');
        headerReq.input('buyerPhone', sql.NVarChar, buyerPhone || '');
        headerReq.input('buyerEmail', sql.NVarChar, buyerEmail || '');
        headerReq.input('buyerTaxId', sql.NVarChar, buyerTaxId || '');

        headerReq.input('supplierId', sql.Int, finalSupplierId);
        headerReq.input('supplierName', sql.NVarChar, supplierName.trim());
        headerReq.input('supplierAddress', sql.NVarChar, supplierAddress || '');
        headerReq.input('supplierPhone', sql.NVarChar, supplierPhone || '');
        headerReq.input('supplierEmail', sql.NVarChar, supplierEmail || '');
        headerReq.input('supplierTaxId', sql.NVarChar, supplierTaxId || '');

        headerReq.input('subTotal', sql.Decimal(18, 2), parseFloat(subTotal) || 0);
        headerReq.input('discountPercent', sql.Decimal(5, 2), parseFloat(discountPercent) || 0);
        headerReq.input('discountAmount', sql.Decimal(18, 2), parseFloat(discountAmount) || 0);
        headerReq.input('vatRate', sql.Decimal(5, 2), parseFloat(vatRate) || 7);
        headerReq.input('vatAmount', sql.Decimal(18, 2), parseFloat(vatAmount) || 0);
        headerReq.input('grandTotal', sql.Decimal(18, 2), parseFloat(grandTotal) || 0);
        headerReq.input('withholdingTaxRate', sql.Decimal(5, 2), parseFloat(withholdingTaxRate) || 0);
        headerReq.input('withholdingTaxAmount', sql.Decimal(18, 2), parseFloat(withholdingTaxAmount) || 0);
        headerReq.input('totalPayable', sql.Decimal(18, 2), parseFloat(totalPayable) || 0);

        headerReq.input('notes', sql.NVarChar, notes || '');
        headerReq.input('preparedBy', sql.NVarChar, preparedBy || null);
        headerReq.input('approvedBy', sql.NVarChar, approvedBy || null);
        headerReq.input('supplierRecipient', sql.NVarChar, supplierRecipient || null);
        headerReq.input('status', sql.NVarChar, status || null);

        await headerReq.query(`
            UPDATE PurchaseOrder SET
                PODate = @poDate,
                RefNumber = @refNumber,
                PRNumber = @prNumber,
                DocType = @docType,
                BuyerName = @buyerName,
                BuyerAddress = @buyerAddress,
                BuyerPhone = @buyerPhone,
                BuyerEmail = @buyerEmail,
                BuyerTaxID = @buyerTaxId,
                SupplierID = @supplierId,
                SupplierName = @supplierName,
                SupplierAddress = @supplierAddress,
                SupplierPhone = @supplierPhone,
                SupplierEmail = @supplierEmail,
                SupplierTaxID = @supplierTaxId,
                SubTotal = @subTotal,
                DiscountPercent = @discountPercent,
                DiscountAmount = @discountAmount,
                VatRate = @vatRate,
                VatAmount = @vatAmount,
                GrandTotal = @grandTotal,
                WithholdingTaxRate = @withholdingTaxRate,
                WithholdingTaxAmount = @withholdingTaxAmount,
                TotalPayable = @totalPayable,
                Notes = @notes,
                PreparedBy = @preparedBy,
                ApprovedBy = @approvedBy,
                SupplierRecipient = @supplierRecipient,
                Status = COALESCE(@status, Status),
                Revision = COALESCE(Revision, 0) + 1,
                UpdatedAt = GETDATE()
            WHERE PurchaseOrderID = @id
        `);

        // Refresh items: delete old and insert new
        const delReq = new sql.Request(transaction);
        delReq.input('poId', sql.Int, id);
        await delReq.query(`DELETE FROM PurchaseOrderItem WHERE PurchaseOrderID = @poId`);

        if (items && Array.isArray(items) && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                if (!it.name && !it.ItemName) continue;

                const itemReq = new sql.Request(transaction);
                itemReq.input('poId', sql.Int, id);
                itemReq.input('itemOrder', sql.Int, i + 1);
                itemReq.input('itemName', sql.NVarChar, it.name || it.ItemName || '');
                itemReq.input('itemCode', sql.NVarChar, it.code || it.ItemCode || null);
                itemReq.input('qty', sql.Decimal(18, 4), parseFloat(it.qty) || 1);
                itemReq.input('unit', sql.NVarChar, it.unit || 'ชิ้น');
                itemReq.input('unitPrice', sql.Decimal(18, 2), parseFloat(it.price || it.unitPrice) || 0);
                itemReq.input('vatRate', sql.Decimal(5, 2), it.vatRate !== undefined ? parseFloat(it.vatRate) : 7);
                itemReq.input('vatAmount', sql.Decimal(18, 2), parseFloat(it.vatAmount) || 0);
                itemReq.input('lineTotal', sql.Decimal(18, 2), parseFloat(it.lineTotal || it.amount) || 0);
                itemReq.input('whtRate', sql.Decimal(5, 2), parseFloat(it.whtRate) || 0);
                itemReq.input('whtAmount', sql.Decimal(18, 2), parseFloat(it.whtAmount) || 0);

                await itemReq.query(`
                    INSERT INTO PurchaseOrderItem (
                        PurchaseOrderID, ItemOrder, ItemName, ItemCode,
                        Qty, Unit, UnitPrice, VatRate, VatAmount,
                        LineTotal, WhtRate, WhtAmount
                    )
                    VALUES (
                        @poId, @itemOrder, @itemName, @itemCode,
                        @qty, @unit, @unitPrice, @vatRate, @vatAmount,
                        @lineTotal, @whtRate, @whtAmount
                    )
                `);
            }
        }

        await transaction.commit();
        res.json({ success: true, message: 'บันทึกการแก้ไขใบสั่งซื้อ (PO) เรียบร้อยแล้ว' });
    } catch (err) {
        if (transaction) await transaction.rollback().catch(() => {});
        console.error('Error updating purchase order:', err);
        res.status(500).json({ success: false, message: 'Failed to update purchase order', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. DELETE /:id — ลบ PO
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM PurchaseOrder WHERE PurchaseOrderID = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Purchase Order not found' });
        }

        res.json({ success: true, message: 'ลบใบสั่งซื้อ (PO) เรียบร้อยแล้ว' });
    } catch (err) {
        console.error('Error deleting purchase order:', err);
        res.status(500).json({ success: false, message: 'Failed to delete purchase order', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. PATCH /:id/status — อัปเดตสถานะ PO
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุสถานะ' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.NVarChar, status)
            .query(`UPDATE PurchaseOrder SET Status = @status, UpdatedAt = GETDATE() WHERE PurchaseOrderID = @id`);

        res.json({ success: true, message: 'อัปเดตสถานะเรียบร้อยแล้ว' });
    } catch (err) {
        console.error('Error updating PO status:', err);
        res.status(500).json({ success: false, message: 'Failed to update status', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. GET /:id/history — ประวัติเวอร์ชั่นของ PO
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/history', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    h.HistoryID, h.PurchaseOrderID, h.Revision, h.PONumber, h.PODate,
                    h.SupplierName, h.GrandTotal, h.TotalPayable, h.Status, h.ArchivedAt,
                    u.display_name AS CreatedByName
                FROM PurchaseOrderHistory h
                LEFT JOIN Users u ON h.CreatedBy = u.user_id
                WHERE h.PurchaseOrderID = @id
                ORDER BY h.Revision DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching PO history:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch PO history', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. GET /history/:historyId and /:id/history/:historyId — รายละเอียด PO ย้อนหลังเฉพาะเวอร์ชั่น
// ─────────────────────────────────────────────────────────────────────────────
const handleGetPOHistoryDetail = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { historyId } = req.params;
        const headerRes = await pool.request()
            .input('historyId', sql.Int, historyId)
            .query(`
                SELECT 
                    h.*,
                    u.display_name AS CreatedByName
                FROM PurchaseOrderHistory h
                LEFT JOIN Users u ON h.CreatedBy = u.user_id
                WHERE h.HistoryID = @historyId
            `);

        if (headerRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'PO History record not found' });
        }

        const po = headerRes.recordset[0];
        const itemsRes = await pool.request()
            .input('historyId', sql.Int, historyId)
            .query(`
                SELECT * 
                FROM PurchaseOrderItemHistory 
                WHERE HistoryID = @historyId 
                ORDER BY ItemOrder ASC, ItemHistoryID ASC
            `);
        po.items = itemsRes.recordset;

        res.json({ success: true, data: po });
    } catch (err) {
        console.error('Error fetching PO history detail:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch PO history detail', error: err.message });
    }
};

router.get('/history/:historyId', handleGetPOHistoryDetail);
router.get('/:id/history/:historyId', handleGetPOHistoryDetail);

module.exports = router;

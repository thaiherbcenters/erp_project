const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { peekNextSequence, getShortDatePrefix } = require('../utils/sequence');

// Helper to compute BookNo (YYYY_BE/MM)
function computeBookNo(dateInput) {
    const d = dateInput ? new Date(dateInput) : new Date();
    const yearBE = d.getFullYear() + 543;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yearBE}/${mm}`;
}

// GET /api/elite-receipts - List with pagination and search
router.get('/', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const pageNum = parseInt(req.query.page) || 1;
        const pageLimit = parseInt(req.query.limit) || 10;
        const offset = (pageNum - 1) * pageLimit;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const createdBy = req.query.createdBy || '';
        const paymentMethod = req.query.paymentMethod || '';
        const dateFrom = req.query.dateFrom || '';
        const dateTo = req.query.dateTo || '';

        const countRequest = pool.request();
        const dataRequest = pool.request();

        let whereClauses = [];

        if (search && search.trim()) {
            countRequest.input('search', sql.NVarChar, `%${search.trim()}%`);
            dataRequest.input('search', sql.NVarChar, `%${search.trim()}%`);
            whereClauses.push(`(r.DocNo LIKE @search OR r.CustomerName LIKE @search OR r.BookNo LIKE @search)`);
        }

        if (status && status !== 'all') {
            countRequest.input('status', sql.NVarChar, status);
            dataRequest.input('status', sql.NVarChar, status);
            whereClauses.push(`r.Status = @status`);
        }

        if (createdBy && createdBy !== 'all' && createdBy !== '') {
            const uid = parseInt(createdBy);
            if (!isNaN(uid)) {
                countRequest.input('createdBy', sql.Int, uid);
                dataRequest.input('createdBy', sql.Int, uid);
                whereClauses.push(`r.CreatedBy = @createdBy`);
            }
        }

        if (paymentMethod && paymentMethod !== 'all' && paymentMethod !== '') {
            countRequest.input('paymentMethod', sql.NVarChar, paymentMethod);
            dataRequest.input('paymentMethod', sql.NVarChar, paymentMethod);
            whereClauses.push(`r.PaymentMethod = @paymentMethod`);
        }

        if (dateFrom) {
            countRequest.input('dateFrom', sql.Date, dateFrom);
            dataRequest.input('dateFrom', sql.Date, dateFrom);
            whereClauses.push(`CAST(r.DocDate AS DATE) >= @dateFrom`);
        }

        if (dateTo) {
            countRequest.input('dateTo', sql.Date, dateTo);
            dataRequest.input('dateTo', sql.Date, dateTo);
            whereClauses.push(`CAST(r.DocDate AS DATE) <= @dateTo`);
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Count total
        const countRes = await countRequest.query(`SELECT COUNT(*) as total FROM EliteReceipts r ${whereSQL}`);
        const total = countRes.recordset[0].total;

        dataRequest.input('offset', sql.Int, offset);
        dataRequest.input('limit', sql.Int, pageLimit);

        const result = await dataRequest.query(`
            SELECT 
                r.id, r.DocNo, r.BookNo, r.DocDate, r.DocType, r.CustomerName, r.CustomerAddress,
                r.CustomerPhone, r.CustomerTaxId, r.ItemsJSON, r.ItemsDesc, r.Subtotal,
                r.Discount, r.DiscountPercent, r.Vat, r.GrandTotal, r.IncludeVat,
                r.PaymentMethod, r.BankName, r.BankBranch, r.CheckNo, r.CheckDate,
                r.Remarks, r.Signer, r.Status, r.Revision, r.InvoiceID,
                r.created_at, r.updated_at,
                u.display_name AS CreatedByName
            FROM EliteReceipts r
            LEFT JOIN Users u ON r.CreatedBy = u.user_id
            ${whereSQL}
            ORDER BY r.id DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        res.json({
            success: true,
            data: result.recordset,
            pagination: {
                page: pageNum,
                limit: pageLimit,
                total,
                totalPages: Math.ceil(total / pageLimit) || 1
            }
        });
    } catch (err) {
        console.error('Error fetching elite receipts:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET /api/elite-receipts/next-number
router.get('/next-number', async (req, res) => {
    try {
        const pool = await poolPromise;
        const targetDate = req.query.date ? new Date(req.query.date) : new Date();
        const datePrefix = getShortDatePrefix(targetDate);
        const fullPrefix = `RE${datePrefix}`;
        const nextNo = await peekNextSequence(pool, 'EliteReceipts', 'DocNo', fullPrefix, 3, '-');
        const bookNo = computeBookNo(targetDate);
        res.json({ success: true, nextNumber: nextNo, bookNo });
    } catch (err) {
        console.error('Error getting next receipt number:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET /api/elite-receipts/:id - Get single
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT r.*, u.display_name AS CreatedByName
                FROM EliteReceipts r
                LEFT JOIN Users u ON r.CreatedBy = u.user_id
                WHERE r.id = @id
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error('Error getting receipt:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/elite-receipts - Create
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            docDate, docType, customerName, customerAddress, customerPhone, customerTaxId,
            items, itemsDesc, subtotal, discount, discountPercent, vat, grandTotal,
            includeVat, paymentMethod, bankName, bankBranch, checkNo, checkDate,
            remarks, signer, invoiceId
        } = req.body;
        const pool = await poolPromise;

        const datePrefix = getShortDatePrefix(docDate);
        const fullPrefix = `RE${datePrefix}`;
        const docNo = await peekNextSequence(pool, 'EliteReceipts', 'DocNo', fullPrefix, 3, '-');
        const bookNo = computeBookNo(docDate);

        const userId = req.user ? req.user.id : null;

        const insertRes = await pool.request()
            .input('DocNo', sql.VarChar, docNo)
            .input('BookNo', sql.VarChar, bookNo)
            .input('DocDate', sql.Date, docDate || new Date())
            .input('DocType', sql.VarChar, docType || 'receipt')
            .input('CustomerName', sql.NVarChar, customerName)
            .input('CustomerAddress', sql.NVarChar, customerAddress || '')
            .input('CustomerPhone', sql.VarChar, customerPhone || '')
            .input('CustomerTaxId', sql.VarChar, customerTaxId || '')
            .input('ItemsJSON', sql.NVarChar, JSON.stringify(items || []))
            .input('ItemsDesc', sql.NVarChar, itemsDesc || '')
            .input('Subtotal', sql.Decimal(18,2), subtotal || 0)
            .input('Discount', sql.Decimal(18,2), discount || 0)
            .input('DiscountPercent', sql.Decimal(18,2), discountPercent || 0)
            .input('Vat', sql.Decimal(18,2), vat || 0)
            .input('GrandTotal', sql.Decimal(18,2), grandTotal || 0)
            .input('IncludeVat', sql.Bit, includeVat ? 1 : 0)
            .input('PaymentMethod', sql.VarChar, paymentMethod || 'transfer')
            .input('BankName', sql.NVarChar, bankName || '')
            .input('BankBranch', sql.NVarChar, bankBranch || '')
            .input('CheckNo', sql.VarChar, checkNo || '')
            .input('CheckDate', sql.Date, checkDate || null)
            .input('Remarks', sql.NVarChar, remarks || '')
            .input('Signer', sql.VarChar, signer || '')
            .input('Status', sql.NVarChar, 'พร้อมใช้')
            .input('InvoiceID', sql.Int, invoiceId || null)
            .input('CreatedBy', sql.Int, userId)
            .query(`
                INSERT INTO EliteReceipts 
                (DocNo, BookNo, DocDate, DocType, CustomerName, CustomerAddress, CustomerPhone, CustomerTaxId, ItemsJSON, ItemsDesc, Subtotal, Discount, DiscountPercent, Vat, GrandTotal, IncludeVat, PaymentMethod, BankName, BankBranch, CheckNo, CheckDate, Remarks, Signer, Status, InvoiceID, CreatedBy)
                OUTPUT INSERTED.id, INSERTED.DocNo
                VALUES 
                (@DocNo, @BookNo, @DocDate, @DocType, @CustomerName, @CustomerAddress, @CustomerPhone, @CustomerTaxId, @ItemsJSON, @ItemsDesc, @Subtotal, @Discount, @DiscountPercent, @Vat, @GrandTotal, @IncludeVat, @PaymentMethod, @BankName, @BankBranch, @CheckNo, @CheckDate, @Remarks, @Signer, @Status, @InvoiceID, @CreatedBy)
            `);

        res.json({ success: true, data: insertRes.recordset[0] });
    } catch (err) {
        console.error('Error creating elite receipt:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// PUT /api/elite-receipts/:id - Update with automatic revision increment & history archive
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const {
            docDate, docType, customerName, customerAddress, customerPhone, customerTaxId,
            items, itemsDesc, subtotal, discount, discountPercent, vat, grandTotal,
            includeVat, paymentMethod, bankName, bankBranch, checkNo, checkDate,
            remarks, signer, status, invoiceId
        } = req.body;
        const pool = await poolPromise;
        const userId = req.user ? req.user.id : null;

        // 1. Backup current version to EliteReceiptHistory before modifying
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('UserId', sql.Int, userId)
            .query(`
                INSERT INTO EliteReceiptHistory (
                    ReceiptID, DocNo, BookNo, DocDate, DocType, CustomerName, CustomerAddress, CustomerPhone, CustomerTaxId,
                    ItemsJSON, ItemsDesc, Subtotal, Discount, DiscountPercent, Vat, GrandTotal, IncludeVat,
                    PaymentMethod, BankName, BankBranch, CheckNo, CheckDate, Remarks, Signer, Status, Revision,
                    ArchivedAt, ArchivedBy
                )
                SELECT 
                    id, DocNo, BookNo, DocDate, DocType, CustomerName, CustomerAddress, CustomerPhone, CustomerTaxId,
                    ItemsJSON, ItemsDesc, Subtotal, Discount, DiscountPercent, Vat, GrandTotal, IncludeVat,
                    PaymentMethod, BankName, BankBranch, CheckNo, CheckDate, Remarks, Signer, Status, ISNULL(Revision, 0),
                    GETDATE(), @UserId
                FROM EliteReceipts
                WHERE id = @id
            `);

        // 2. Update and increment Revision
        const updateResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('DocDate', sql.Date, docDate || new Date())
            .input('DocType', sql.VarChar, docType || 'receipt')
            .input('CustomerName', sql.NVarChar, customerName)
            .input('CustomerAddress', sql.NVarChar, customerAddress || '')
            .input('CustomerPhone', sql.VarChar, customerPhone || '')
            .input('CustomerTaxId', sql.VarChar, customerTaxId || '')
            .input('ItemsJSON', sql.NVarChar, JSON.stringify(items || []))
            .input('ItemsDesc', sql.NVarChar, itemsDesc || '')
            .input('Subtotal', sql.Decimal(18,2), subtotal || 0)
            .input('Discount', sql.Decimal(18,2), discount || 0)
            .input('DiscountPercent', sql.Decimal(18,2), discountPercent || 0)
            .input('Vat', sql.Decimal(18,2), vat || 0)
            .input('GrandTotal', sql.Decimal(18,2), grandTotal || 0)
            .input('IncludeVat', sql.Bit, includeVat ? 1 : 0)
            .input('PaymentMethod', sql.VarChar, paymentMethod || 'transfer')
            .input('BankName', sql.NVarChar, bankName || '')
            .input('BankBranch', sql.NVarChar, bankBranch || '')
            .input('CheckNo', sql.VarChar, checkNo || '')
            .input('CheckDate', sql.Date, checkDate || null)
            .input('Remarks', sql.NVarChar, remarks || '')
            .input('Signer', sql.VarChar, signer || '')
            .input('Status', sql.NVarChar, status || 'พร้อมใช้')
            .input('InvoiceID', sql.Int, invoiceId || null)
            .query(`
                UPDATE EliteReceipts 
                SET DocDate = @DocDate, DocType = @DocType, CustomerName = @CustomerName,
                    CustomerAddress = @CustomerAddress, CustomerPhone = @CustomerPhone,
                    CustomerTaxId = @CustomerTaxId, ItemsJSON = @ItemsJSON, ItemsDesc = @ItemsDesc,
                    Subtotal = @Subtotal, Discount = @Discount, DiscountPercent = @DiscountPercent,
                    Vat = @Vat, GrandTotal = @GrandTotal, IncludeVat = @IncludeVat,
                    PaymentMethod = @PaymentMethod, BankName = @BankName, BankBranch = @BankBranch,
                    CheckNo = @CheckNo, CheckDate = @CheckDate, Remarks = @Remarks, Signer = @Signer,
                    Status = @Status, InvoiceID = @InvoiceID,
                    Revision = ISNULL(Revision, 0) + 1,
                    updated_at = GETDATE()
                OUTPUT INSERTED.Revision
                WHERE id = @id
            `);

        const newRevision = updateResult.recordset.length > 0 ? updateResult.recordset[0].Revision : 1;
        res.json({ success: true, message: 'Updated successfully', revision: newRevision });
    } catch (err) {
        console.error('Error updating elite receipt:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET /api/elite-receipts/:id/history - Past revisions list
router.get('/:id/history', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    h.HistoryID, h.ReceiptID, h.Revision, h.DocNo, h.CustomerName, 
                    h.GrandTotal, h.ArchivedAt, h.Status,
                    u.display_name AS ArchivedByName
                FROM EliteReceiptHistory h
                LEFT JOIN Users u ON h.ArchivedBy = u.user_id
                WHERE h.ReceiptID = @id
                ORDER BY h.Revision DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching receipt history:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET /api/elite-receipts/history/:historyId - Specific revision snapshot detail
router.get('/history/:historyId', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('hid', sql.Int, req.params.historyId)
            .query(`
                SELECT h.*, u.display_name AS ArchivedByName
                FROM EliteReceiptHistory h
                LEFT JOIN Users u ON h.ArchivedBy = u.user_id
                WHERE h.HistoryID = @hid
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'History record not found' });
        }
        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error('Error fetching history detail:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// PATCH /api/elite-receipts/:id/status - Update Status
router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('Status', sql.NVarChar, status)
            .query('UPDATE EliteReceipts SET Status = @Status, updated_at = GETDATE() WHERE id = @id');
        res.json({ success: true, message: 'Status updated successfully' });
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// DELETE /api/elite-receipts/:id - Delete
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                DELETE FROM EliteReceiptHistory WHERE ReceiptID = @id;
                DELETE FROM EliteReceipts WHERE id = @id;
            `);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting receipt:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

module.exports = router;

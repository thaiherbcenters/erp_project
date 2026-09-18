const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { peekNextSequence, getShortDatePrefix } = require('../utils/sequence');

// GET /api/elite-tax-invoices - List with search and pagination
router.get('/', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const { search, status, createdBy, dateFrom, dateTo, page = 1, limit = 10 } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const pageLimit = Math.max(1, parseInt(limit) || 10);
        const offset = (pageNum - 1) * pageLimit;

        let whereClauses = [];
        const countRequest = pool.request();
        const dataRequest = pool.request();

        if (search && search.trim()) {
            countRequest.input('search', sql.NVarChar, `%${search.trim()}%`);
            dataRequest.input('search', sql.NVarChar, `%${search.trim()}%`);
            whereClauses.push(`(ti.DocNo LIKE @search OR ti.CustomerName LIKE @search OR ti.Reference LIKE @search)`);
        }

        if (status && status !== 'all') {
            countRequest.input('status', sql.NVarChar, status);
            dataRequest.input('status', sql.NVarChar, status);
            whereClauses.push(`ti.Status = @status`);
        }

        if (createdBy && createdBy !== 'all' && createdBy !== '') {
            const uid = parseInt(createdBy);
            if (!isNaN(uid)) {
                countRequest.input('createdBy', sql.Int, uid);
                dataRequest.input('createdBy', sql.Int, uid);
                whereClauses.push(`ti.CreatedBy = @createdBy`);
            }
        }

        if (dateFrom) {
            countRequest.input('dateFrom', sql.Date, dateFrom);
            dataRequest.input('dateFrom', sql.Date, dateFrom);
            whereClauses.push(`CAST(ti.DocDate AS DATE) >= @dateFrom`);
        }

        if (dateTo) {
            countRequest.input('dateTo', sql.Date, dateTo);
            dataRequest.input('dateTo', sql.Date, dateTo);
            whereClauses.push(`CAST(ti.DocDate AS DATE) <= @dateTo`);
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Count total
        const countRes = await countRequest.query(`SELECT COUNT(*) as total FROM EliteTaxInvoices ti ${whereSQL}`);
        const total = countRes.recordset[0].total;

        dataRequest.input('offset', sql.Int, offset);
        dataRequest.input('limit', sql.Int, pageLimit);

        const result = await dataRequest.query(`
            SELECT 
                ti.id, ti.DocNo, ti.DocDate, ti.CustomerName, ti.CustomerAddress,
                ti.CustomerPhone, ti.CustomerTaxId, ti.ItemsJSON, ti.Subtotal,
                ti.Discount, ti.DiscountPercent, ti.Vat, ti.GrandTotal,
                ti.DepositPercent, ti.DepositAmount, ti.RemainingBalance,
                ti.Status, ti.Revision,
                ti.Remarks, ti.Signer, ti.BankAccount, ti.IncludeVat,
                ti.PaymentTerm, ti.ContactPerson, ti.Reference,
                ti.created_at, ti.updated_at,
                u.display_name AS CreatedByName
            FROM EliteTaxInvoices ti
            LEFT JOIN Users u ON ti.CreatedBy = u.user_id
            ${whereSQL}
            ORDER BY ti.id DESC
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
        console.error('Error fetching elite tax invoices:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET /api/elite-tax-invoices/next-number
router.get('/next-number', async (req, res) => {
    try {
        const pool = await poolPromise;
        const datePrefix = getShortDatePrefix(req.query.date);
        const fullPrefix = `INV${datePrefix}`;
        const nextNo = await peekNextSequence(pool, 'EliteTaxInvoices', 'DocNo', fullPrefix, 3, '-');
        res.json({ success: true, nextNumber: nextNo });
    } catch (err) {
        console.error('Error getting next number:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET /api/elite-tax-invoices/:id - Get single
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT ti.*, u.display_name AS CreatedByName
                FROM EliteTaxInvoices ti
                LEFT JOIN Users u ON ti.CreatedBy = u.user_id
                WHERE ti.id = @id
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error('Error getting invoice:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/elite-tax-invoices - Create
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            docDate, customerName, customerAddress, customerPhone, customerTaxId,
            items, subtotal, discount, discountPercent, vat, grandTotal,
            depositPercent, depositAmount, remainingBalance,
            remarks, signer, bankAccount, includeVat,
            paymentTerm, contactPerson, reference
        } = req.body;
        const pool = await poolPromise;

        const datePrefix = getShortDatePrefix(docDate);
        const fullPrefix = `INV${datePrefix}`;
        const docNo = await peekNextSequence(pool, 'EliteTaxInvoices', 'DocNo', fullPrefix, 3, '-');

        const userId = req.user ? req.user.id : null;

        const insertRes = await pool.request()
            .input('DocNo', sql.VarChar, docNo)
            .input('DocDate', sql.Date, docDate || new Date())
            .input('CustomerName', sql.NVarChar, customerName)
            .input('CustomerAddress', sql.NVarChar, customerAddress || '')
            .input('CustomerPhone', sql.VarChar, customerPhone || '')
            .input('CustomerTaxId', sql.VarChar, customerTaxId || '')
            .input('ItemsJSON', sql.NVarChar, JSON.stringify(items || []))
            .input('Subtotal', sql.Decimal(18,2), subtotal || 0)
            .input('Discount', sql.Decimal(18,2), discount || 0)
            .input('DiscountPercent', sql.Decimal(18,2), discountPercent || 0)
            .input('Vat', sql.Decimal(18,2), vat || 0)
            .input('GrandTotal', sql.Decimal(18,2), grandTotal || 0)
            .input('DepositPercent', sql.Decimal(18,2), depositPercent || 0)
            .input('DepositAmount', sql.Decimal(18,2), depositAmount || 0)
            .input('RemainingBalance', sql.Decimal(18,2), remainingBalance || 0)
            .input('Status', sql.NVarChar, 'พร้อมใช้')
            .input('Remarks', sql.NVarChar, remarks || '')
            .input('Signer', sql.VarChar, signer || '')
            .input('BankAccount', sql.VarChar, bankAccount || '')
            .input('IncludeVat', sql.Bit, includeVat ? 1 : 0)
            .input('PaymentTerm', sql.NVarChar, paymentTerm || '')
            .input('ContactPerson', sql.NVarChar, contactPerson || '')
            .input('Reference', sql.NVarChar, reference || '')
            .input('CreatedBy', sql.Int, userId)
            .query(`
                INSERT INTO EliteTaxInvoices 
                (DocNo, DocDate, CustomerName, CustomerAddress, CustomerPhone, CustomerTaxId, ItemsJSON, Subtotal, Discount, DiscountPercent, Vat, GrandTotal, DepositPercent, DepositAmount, RemainingBalance, Status, Remarks, Signer, BankAccount, IncludeVat, PaymentTerm, ContactPerson, Reference, CreatedBy)
                OUTPUT INSERTED.id, INSERTED.DocNo
                VALUES 
                (@DocNo, @DocDate, @CustomerName, @CustomerAddress, @CustomerPhone, @CustomerTaxId, @ItemsJSON, @Subtotal, @Discount, @DiscountPercent, @Vat, @GrandTotal, @DepositPercent, @DepositAmount, @RemainingBalance, @Status, @Remarks, @Signer, @BankAccount, @IncludeVat, @PaymentTerm, @ContactPerson, @Reference, @CreatedBy)
            `);

        res.json({ success: true, data: insertRes.recordset[0] });
    } catch (err) {
        console.error('Error creating elite tax invoice:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// PUT /api/elite-tax-invoices/:id - Update
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const {
            docDate, customerName, customerAddress, customerPhone, customerTaxId,
            items, subtotal, discount, discountPercent, vat, grandTotal,
            depositPercent, depositAmount, remainingBalance,
            remarks, signer, bankAccount, includeVat, status,
            paymentTerm, contactPerson, reference
        } = req.body;
        const pool = await poolPromise;
        const userId = req.user ? req.user.id : null;

        // 1. Backup current version to EliteTaxInvoiceHistory before modifying
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('UserId', sql.Int, userId)
            .query(`
                INSERT INTO EliteTaxInvoiceHistory (
                    InvoiceID, DocNo, DocDate, CustomerName, CustomerAddress, CustomerPhone, CustomerTaxId,
                    ItemsJSON, Subtotal, Discount, DiscountPercent, Vat, GrandTotal, DepositPercent, DepositAmount,
                    RemainingBalance, Status, Revision, Remarks, Signer, BankAccount, IncludeVat,
                    PaymentTerm, ContactPerson, Reference, ArchivedAt, ArchivedBy
                )
                SELECT 
                    id, DocNo, DocDate, CustomerName, CustomerAddress, CustomerPhone, CustomerTaxId,
                    ItemsJSON, Subtotal, Discount, DiscountPercent, Vat, GrandTotal, DepositPercent, DepositAmount,
                    RemainingBalance, Status, ISNULL(Revision, 0), Remarks, Signer, BankAccount, IncludeVat,
                    PaymentTerm, ContactPerson, Reference, GETDATE(), @UserId
                FROM EliteTaxInvoices
                WHERE id = @id
            `);

        // 2. Update and increment Revision
        const updateResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('DocDate', sql.Date, docDate || new Date())
            .input('CustomerName', sql.NVarChar, customerName)
            .input('CustomerAddress', sql.NVarChar, customerAddress || '')
            .input('CustomerPhone', sql.VarChar, customerPhone || '')
            .input('CustomerTaxId', sql.VarChar, customerTaxId || '')
            .input('ItemsJSON', sql.NVarChar, JSON.stringify(items || []))
            .input('Subtotal', sql.Decimal(18,2), subtotal || 0)
            .input('Discount', sql.Decimal(18,2), discount || 0)
            .input('DiscountPercent', sql.Decimal(18,2), discountPercent || 0)
            .input('Vat', sql.Decimal(18,2), vat || 0)
            .input('GrandTotal', sql.Decimal(18,2), grandTotal || 0)
            .input('DepositPercent', sql.Decimal(18,2), depositPercent || 0)
            .input('DepositAmount', sql.Decimal(18,2), depositAmount || 0)
            .input('RemainingBalance', sql.Decimal(18,2), remainingBalance || 0)
            .input('Status', sql.NVarChar, status || 'พร้อมใช้')
            .input('Remarks', sql.NVarChar, remarks || '')
            .input('Signer', sql.VarChar, signer || '')
            .input('BankAccount', sql.VarChar, bankAccount || '')
            .input('IncludeVat', sql.Bit, includeVat ? 1 : 0)
            .input('PaymentTerm', sql.NVarChar, paymentTerm || '')
            .input('ContactPerson', sql.NVarChar, contactPerson || '')
            .input('Reference', sql.NVarChar, reference || '')
            .query(`
                UPDATE EliteTaxInvoices 
                SET DocDate = @DocDate, CustomerName = @CustomerName, CustomerAddress = @CustomerAddress,
                    CustomerPhone = @CustomerPhone, CustomerTaxId = @CustomerTaxId, ItemsJSON = @ItemsJSON,
                    Subtotal = @Subtotal, Discount = @Discount, DiscountPercent = @DiscountPercent, Vat = @Vat, GrandTotal = @GrandTotal,
                    DepositPercent = @DepositPercent, DepositAmount = @DepositAmount, RemainingBalance = @RemainingBalance,
                    Status = @Status, Remarks = @Remarks, Signer = @Signer, BankAccount = @BankAccount,
                    IncludeVat = @IncludeVat, PaymentTerm = @PaymentTerm, ContactPerson = @ContactPerson, Reference = @Reference,
                    Revision = ISNULL(Revision, 0) + 1,
                    updated_at = GETDATE()
                OUTPUT INSERTED.Revision
                WHERE id = @id
            `);

        const newRevision = updateResult.recordset.length > 0 ? updateResult.recordset[0].Revision : 1;
        res.json({ success: true, message: 'Updated successfully', revision: newRevision });
    } catch (err) {
        console.error('Error updating elite tax invoice:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET /api/elite-tax-invoices/:id/history - Get list of past revisions
router.get('/:id/history', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    h.HistoryID, h.InvoiceID, h.Revision, h.DocNo, h.CustomerName, 
                    h.GrandTotal, h.ArchivedAt, h.Status,
                    u.display_name AS ArchivedByName
                FROM EliteTaxInvoiceHistory h
                LEFT JOIN Users u ON h.ArchivedBy = u.user_id
                WHERE h.InvoiceID = @id
                ORDER BY h.Revision DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching invoice history:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET /api/elite-tax-invoices/history/:historyId - Get specific revision detail
router.get('/history/:historyId', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('hid', sql.Int, req.params.historyId)
            .query(`
                SELECT h.*, u.display_name AS ArchivedByName
                FROM EliteTaxInvoiceHistory h
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

// PATCH /api/elite-tax-invoices/:id/status - Update Status
router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('Status', sql.NVarChar, status)
            .query('UPDATE EliteTaxInvoices SET Status = @Status, updated_at = GETDATE() WHERE id = @id');
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/elite-tax-invoices/:id - Delete
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM EliteTaxInvoices WHERE id = @id');
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting elite tax invoice:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { peekNextSequence, getShortDatePrefix } = require('../utils/sequence');

// GET /api/elite-booking-orders - List with search and pagination
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
            whereClauses.push(`(bo.DocNo LIKE @search OR bo.CustomerName LIKE @search OR bo.Reference LIKE @search OR bo.DeliverTo LIKE @search)`);
        }

        if (status && status !== 'all') {
            countRequest.input('status', sql.NVarChar, status);
            dataRequest.input('status', sql.NVarChar, status);
            whereClauses.push(`bo.Status = @status`);
        }

        if (createdBy && createdBy !== 'all' && createdBy !== '') {
            const uid = parseInt(createdBy);
            if (!isNaN(uid)) {
                countRequest.input('createdBy', sql.Int, uid);
                dataRequest.input('createdBy', sql.Int, uid);
                whereClauses.push(`bo.CreatedBy = @createdBy`);
            }
        }

        if (dateFrom) {
            countRequest.input('dateFrom', sql.Date, dateFrom);
            dataRequest.input('dateFrom', sql.Date, dateFrom);
            whereClauses.push(`CAST(bo.DocDate AS DATE) >= @dateFrom`);
        }

        if (dateTo) {
            countRequest.input('dateTo', sql.Date, dateTo);
            dataRequest.input('dateTo', sql.Date, dateTo);
            whereClauses.push(`CAST(bo.DocDate AS DATE) <= @dateTo`);
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Count total
        const countRes = await countRequest.query(`SELECT COUNT(*) as total FROM EliteBookingOrders bo ${whereSQL}`);
        const total = countRes.recordset[0].total;

        dataRequest.input('offset', sql.Int, offset);
        dataRequest.input('limit', sql.Int, pageLimit);

        const result = await dataRequest.query(`
            SELECT 
                bo.id, bo.DocNo, bo.DocDate, bo.CustomerName, bo.CustomerAddress,
                bo.CustomerPhone, bo.CustomerTaxId, bo.DeliverTo, bo.ContactPerson, bo.Reference,
                bo.ItemsJSON, bo.Subtotal, bo.Discount, bo.DiscountPercent, bo.Vat, bo.GrandTotal,
                bo.DepositPercent, bo.DepositAmount, bo.RemainingBalance,
                bo.Status, bo.Revision,
                bo.Remarks, bo.Signer, bo.BankAccount, bo.IncludeVat,
                bo.created_at, bo.updated_at,
                u.display_name AS CreatedByName
            FROM EliteBookingOrders bo
            LEFT JOIN Users u ON bo.CreatedBy = u.user_id
            ${whereSQL}
            ORDER BY bo.id DESC
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
        console.error('Error fetching elite booking orders:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET /api/elite-booking-orders/next-number
router.get('/next-number', async (req, res) => {
    try {
        const pool = await poolPromise;
        const datePrefix = getShortDatePrefix(req.query.date);
        const fullPrefix = `BO${datePrefix}`;
        const nextNo = await peekNextSequence(pool, 'EliteBookingOrders', 'DocNo', fullPrefix, 3, '-');
        res.json({ success: true, nextNumber: nextNo });
    } catch (err) {
        console.error('Error getting next booking number:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET /api/elite-booking-orders/:id - Get single
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT bo.*, u.display_name AS CreatedByName
                FROM EliteBookingOrders bo
                LEFT JOIN Users u ON bo.CreatedBy = u.user_id
                WHERE bo.id = @id
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error('Error getting booking order:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/elite-booking-orders - Create
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            docDate, customerName, customerAddress, customerPhone, customerTaxId,
            deliverTo, contactPerson, reference,
            items, subtotal, discount, discountPercent, vat, grandTotal,
            depositPercent, depositAmount, remainingBalance,
            remarks, signer, bankAccount, includeVat, status
        } = req.body;

        if (!customerName) {
            return res.status(400).json({ success: false, message: 'Customer name is required' });
        }

        const pool = await poolPromise;
        const userId = req.user ? req.user.id : null;

        // Auto-generate DocNo
        const datePrefix = getShortDatePrefix(docDate);
        const fullPrefix = `BO${datePrefix}`;
        const docNo = await peekNextSequence(pool, 'EliteBookingOrders', 'DocNo', fullPrefix, 3, '-');

        const insertResult = await pool.request()
            .input('DocNo', sql.VarChar, docNo)
            .input('DocDate', sql.Date, docDate || new Date())
            .input('CustomerName', sql.NVarChar, customerName)
            .input('CustomerAddress', sql.NVarChar, customerAddress || '')
            .input('CustomerPhone', sql.VarChar, customerPhone || '')
            .input('CustomerTaxId', sql.VarChar, customerTaxId || '')
            .input('DeliverTo', sql.NVarChar, deliverTo || '')
            .input('ContactPerson', sql.NVarChar, contactPerson || '')
            .input('Reference', sql.NVarChar, reference || '')
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
            .input('Signer', sql.VarChar, signer || 'none')
            .input('BankAccount', sql.VarChar, bankAccount || 'kbank_elite_2020')
            .input('IncludeVat', sql.Bit, includeVat ? 1 : 0)
            .input('CreatedBy', sql.Int, userId)
            .query(`
                INSERT INTO EliteBookingOrders (
                    DocNo, DocDate, CustomerName, CustomerAddress, CustomerPhone, CustomerTaxId,
                    DeliverTo, ContactPerson, Reference,
                    ItemsJSON, Subtotal, Discount, DiscountPercent, Vat, GrandTotal,
                    DepositPercent, DepositAmount, RemainingBalance,
                    Status, Remarks, Signer, BankAccount, IncludeVat, CreatedBy, Revision
                )
                OUTPUT INSERTED.id, INSERTED.DocNo
                VALUES (
                    @DocNo, @DocDate, @CustomerName, @CustomerAddress, @CustomerPhone, @CustomerTaxId,
                    @DeliverTo, @ContactPerson, @Reference,
                    @ItemsJSON, @Subtotal, @Discount, @DiscountPercent, @Vat, @GrandTotal,
                    @DepositPercent, @DepositAmount, @RemainingBalance,
                    @Status, @Remarks, @Signer, @BankAccount, @IncludeVat, @CreatedBy, 0
                )
            `);

        res.json({
            success: true,
            message: 'Created successfully',
            data: insertResult.recordset[0]
        });
    } catch (err) {
        console.error('Error creating elite booking order:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// PUT /api/elite-booking-orders/:id - Update
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const {
            docDate, customerName, customerAddress, customerPhone, customerTaxId,
            deliverTo, contactPerson, reference,
            items, subtotal, discount, discountPercent, vat, grandTotal,
            depositPercent, depositAmount, remainingBalance,
            remarks, signer, bankAccount, includeVat, status
        } = req.body;

        const pool = await poolPromise;
        const userId = req.user ? req.user.id : null;

        // 1. Backup current version to EliteBookingOrderHistory before modifying
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('UserId', sql.Int, userId)
            .query(`
                INSERT INTO EliteBookingOrderHistory (
                    BookingOrderId, Revision, DocNo, DocDate, CustomerName, CustomerAddress, CustomerPhone, CustomerTaxId,
                    DeliverTo, ContactPerson, Reference,
                    ItemsJSON, Subtotal, Discount, DiscountPercent, IncludeVat, Vat, GrandTotal,
                    DepositPercent, DepositAmount, RemainingBalance,
                    BankAccount, Remarks, Signer, Status, CreatedBy, created_at
                )
                SELECT 
                    id, ISNULL(Revision, 0), DocNo, DocDate, CustomerName, CustomerAddress, CustomerPhone, CustomerTaxId,
                    DeliverTo, ContactPerson, Reference,
                    ItemsJSON, Subtotal, Discount, DiscountPercent, IncludeVat, Vat, GrandTotal,
                    DepositPercent, DepositAmount, RemainingBalance,
                    BankAccount, Remarks, Signer, Status, @UserId, GETDATE()
                FROM EliteBookingOrders
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
            .input('DeliverTo', sql.NVarChar, deliverTo || '')
            .input('ContactPerson', sql.NVarChar, contactPerson || '')
            .input('Reference', sql.NVarChar, reference || '')
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
            .input('Signer', sql.VarChar, signer || 'none')
            .input('BankAccount', sql.VarChar, bankAccount || 'kbank_elite_2020')
            .input('IncludeVat', sql.Bit, includeVat ? 1 : 0)
            .query(`
                UPDATE EliteBookingOrders 
                SET DocDate = @DocDate, CustomerName = @CustomerName, CustomerAddress = @CustomerAddress,
                    CustomerPhone = @CustomerPhone, CustomerTaxId = @CustomerTaxId,
                    DeliverTo = @DeliverTo, ContactPerson = @ContactPerson, Reference = @Reference,
                    ItemsJSON = @ItemsJSON,
                    Subtotal = @Subtotal, Discount = @Discount, DiscountPercent = @DiscountPercent, Vat = @Vat, GrandTotal = @GrandTotal,
                    DepositPercent = @DepositPercent, DepositAmount = @DepositAmount, RemainingBalance = @RemainingBalance,
                    Status = @Status, Remarks = @Remarks, Signer = @Signer, BankAccount = @BankAccount,
                    IncludeVat = @IncludeVat,
                    Revision = ISNULL(Revision, 0) + 1,
                    updated_at = GETDATE()
                OUTPUT INSERTED.Revision
                WHERE id = @id
            `);

        const newRevision = updateResult.recordset.length > 0 ? updateResult.recordset[0].Revision : 1;
        res.json({ success: true, message: 'Updated successfully', revision: newRevision });
    } catch (err) {
        console.error('Error updating elite booking order:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET /api/elite-booking-orders/:id/history - Get list of past revisions
router.get('/:id/history', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    h.id AS HistoryID, h.BookingOrderId, h.Revision, h.DocNo, h.CustomerName, 
                    h.GrandTotal, h.created_at AS ArchivedAt, h.Status,
                    u.display_name AS ArchivedByName
                FROM EliteBookingOrderHistory h
                LEFT JOIN Users u ON h.CreatedBy = u.user_id
                WHERE h.BookingOrderId = @id
                ORDER BY h.Revision DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching booking history:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET /api/elite-booking-orders/history/:historyId - Get specific revision detail
router.get('/history/:historyId', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('hid', sql.Int, req.params.historyId)
            .query(`
                SELECT h.*, u.display_name AS ArchivedByName
                FROM EliteBookingOrderHistory h
                LEFT JOIN Users u ON h.CreatedBy = u.user_id
                WHERE h.id = @hid
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

// POST /api/elite-booking-orders/:id/restore/:historyId - Restore previous revision
router.post('/:id/restore/:historyId', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const userId = req.user ? req.user.id : null;

        // 1. Get history record
        const histRes = await pool.request()
            .input('hid', sql.Int, req.params.historyId)
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM EliteBookingOrderHistory WHERE id = @hid AND BookingOrderId = @id');

        if (histRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'History record not found' });
        }

        const h = histRes.recordset[0];

        // 2. Backup current state to history first
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('UserId', sql.Int, userId)
            .query(`
                INSERT INTO EliteBookingOrderHistory (
                    BookingOrderId, Revision, DocNo, DocDate, CustomerName, CustomerAddress, CustomerPhone, CustomerTaxId,
                    DeliverTo, ContactPerson, Reference,
                    ItemsJSON, Subtotal, Discount, DiscountPercent, IncludeVat, Vat, GrandTotal,
                    DepositPercent, DepositAmount, RemainingBalance,
                    BankAccount, Remarks, Signer, Status, CreatedBy, created_at
                )
                SELECT 
                    id, ISNULL(Revision, 0), DocNo, DocDate, CustomerName, CustomerAddress, CustomerPhone, CustomerTaxId,
                    DeliverTo, ContactPerson, Reference,
                    ItemsJSON, Subtotal, Discount, DiscountPercent, IncludeVat, Vat, GrandTotal,
                    DepositPercent, DepositAmount, RemainingBalance,
                    BankAccount, Remarks, Signer, Status, @UserId, GETDATE()
                FROM EliteBookingOrders
                WHERE id = @id
            `);

        // 3. Restore data from history
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('DocDate', sql.Date, h.DocDate)
            .input('CustomerName', sql.NVarChar, h.CustomerName)
            .input('CustomerAddress', sql.NVarChar, h.CustomerAddress || '')
            .input('CustomerPhone', sql.VarChar, h.CustomerPhone || '')
            .input('CustomerTaxId', sql.VarChar, h.CustomerTaxId || '')
            .input('DeliverTo', sql.NVarChar, h.DeliverTo || '')
            .input('ContactPerson', sql.NVarChar, h.ContactPerson || '')
            .input('Reference', sql.NVarChar, h.Reference || '')
            .input('ItemsJSON', sql.NVarChar, h.ItemsJSON || '[]')
            .input('Subtotal', sql.Decimal(18,2), h.Subtotal || 0)
            .input('Discount', sql.Decimal(18,2), h.Discount || 0)
            .input('DiscountPercent', sql.Decimal(18,2), h.DiscountPercent || 0)
            .input('IncludeVat', sql.Bit, h.IncludeVat ? 1 : 0)
            .input('Vat', sql.Decimal(18,2), h.Vat || 0)
            .input('GrandTotal', sql.Decimal(18,2), h.GrandTotal || 0)
            .input('DepositPercent', sql.Decimal(18,2), h.DepositPercent || 0)
            .input('DepositAmount', sql.Decimal(18,2), h.DepositAmount || 0)
            .input('RemainingBalance', sql.Decimal(18,2), h.RemainingBalance || 0)
            .input('BankAccount', sql.VarChar, h.BankAccount || 'kbank_elite_2020')
            .input('Remarks', sql.NVarChar, h.Remarks || '')
            .input('Signer', sql.VarChar, h.Signer || 'none')
            .input('Status', sql.NVarChar, h.Status || 'พร้อมใช้')
            .query(`
                UPDATE EliteBookingOrders
                SET DocDate = @DocDate, CustomerName = @CustomerName, CustomerAddress = @CustomerAddress,
                    CustomerPhone = @CustomerPhone, CustomerTaxId = @CustomerTaxId,
                    DeliverTo = @DeliverTo, ContactPerson = @ContactPerson, Reference = @Reference,
                    ItemsJSON = @ItemsJSON, Subtotal = @Subtotal, Discount = @Discount, DiscountPercent = @DiscountPercent,
                    IncludeVat = @IncludeVat, Vat = @Vat, GrandTotal = @GrandTotal,
                    DepositPercent = @DepositPercent, DepositAmount = @DepositAmount, RemainingBalance = @RemainingBalance,
                    BankAccount = @BankAccount, Remarks = @Remarks, Signer = @Signer, Status = @Status,
                    Revision = ISNULL(Revision, 0) + 1,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

        res.json({ success: true, message: `Restored to Revision ${h.Revision}` });
    } catch (err) {
        console.error('Error restoring booking history:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// PATCH /api/elite-booking-orders/:id/status - Update Status
router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('Status', sql.NVarChar, status)
            .query('UPDATE EliteBookingOrders SET Status = @Status, updated_at = GETDATE() WHERE id = @id');
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/elite-booking-orders/:id - Delete
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        // Delete history records first
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM EliteBookingOrderHistory WHERE BookingOrderId = @id');

        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM EliteBookingOrders WHERE id = @id');
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting elite booking order:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;

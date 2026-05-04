const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const { generateSequence, getDatePrefix } = require('../utils/sequence');

// 1. Get all quotations (for table listing)
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                QuotationID, QuotationNo, CustomerName, BillDate, ValidUntil, 
                GrandTotal, Status, CreatedAt, Revision
            FROM Quotation
            ORDER BY QuotationID DESC
        `);
        res.json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (err) {
        console.error('Error fetching quotations:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch quotations', error: err.message });
    }
});

// 1b. Get quotations available for SO creation (exclude already-linked ones)
router.get('/status/approved', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                QuotationID, QuotationNo, CustomerName, BillDate, 
                GrandTotal, Status
            FROM Quotation
            WHERE Status != N'สร้าง SO แล้ว'
            ORDER BY QuotationID DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching quotations for SO:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch quotations', error: err.message });
    }
});

// 2. Get single quotation by ID (with items)
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        
        // Get Header
        const headerResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`SELECT * FROM Quotation WHERE QuotationID = @id`);
            
        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }
        
        // Get Items
        const itemsResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`SELECT * FROM QuotationItem WHERE QuotationID = @id ORDER BY ItemOrder ASC`);
            
        res.json({ 
            success: true, 
            data: {
                ...headerResult.recordset[0],
                items: itemsResult.recordset
            } 
        });
    } catch (err) {
        console.error('Error fetching quotation details:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch quotation details', error: err.message });
    }
});

// 3. Create new quotation
router.post('/', async (req, res) => {
    const { 
        quotationNo, docType, bankAccount, customerName, address, phone, taxId, 
        billDate, validUntil, subTotal, discountPercent, discountAmount, 
        afterDiscount, vatRate, vatAmount, shippingCost, grandTotal, 
        depositPercent, depositAmount, remainingAmount, signer, notes, 
        showDiscountInPrint, showVatInPrint, showDepositInPrint, showShippingInPrint, 
        status, items 
    } = req.body;

    let transaction;
    
    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // Generate Quotation Number
        const finalQuotationNo = quotationNo || await generateSequence(pool, 'Quotation', 'QuotationNo', `QT-${getDatePrefix()}`, 3);

        // 1. Insert Header
        request.input('quotationNo', sql.NVarChar, finalQuotationNo);
        request.input('docType', sql.NVarChar, docType);
        request.input('bankAccount', sql.NVarChar, bankAccount);
        request.input('customerName', sql.NVarChar, customerName);
        request.input('address', sql.NVarChar, address);
        request.input('phone', sql.NVarChar, phone);
        request.input('taxId', sql.NVarChar, taxId);
        request.input('billDate', sql.Date, billDate);
        request.input('validUntil', sql.Date, validUntil);
        request.input('subTotal', sql.Decimal(18,2), subTotal);
        request.input('discountPercent', sql.Int, discountPercent);
        request.input('discountAmount', sql.Decimal(18,2), discountAmount);
        request.input('afterDiscount', sql.Decimal(18,2), afterDiscount);
        request.input('vatRate', sql.Int, vatRate);
        request.input('vatAmount', sql.Decimal(18,2), vatAmount);
        request.input('shippingCost', sql.Decimal(18,2), shippingCost);
        request.input('grandTotal', sql.Decimal(18,2), grandTotal);
        request.input('depositPercent', sql.NVarChar, depositPercent);
        request.input('depositAmount', sql.Decimal(18,2), depositAmount);
        request.input('remainingAmount', sql.Decimal(18,2), remainingAmount);
        request.input('signer', sql.NVarChar, signer);
        request.input('notes', sql.NVarChar, notes);
        request.input('showDiscount', sql.Bit, showDiscountInPrint ? 1 : 0);
        request.input('showVat', sql.Bit, showVatInPrint ? 1 : 0);
        request.input('showDeposit', sql.Bit, showDepositInPrint ? 1 : 0);
        request.input('showShipping', sql.Bit, showShippingInPrint ? 1 : 0);
        request.input('status', sql.NVarChar, status || 'ร่าง');

        const headerResult = await request.query(`
            INSERT INTO Quotation (
                QuotationNo, DocType, BankAccount, CustomerName, Address, Phone, TaxID,
                BillDate, ValidUntil, SubTotal, DiscountPercent, DiscountAmount, AfterDiscount,
                VatRate, VatAmount, ShippingCost, GrandTotal, DepositPercent, DepositAmount,
                RemainingAmount, Signer, Notes, ShowDiscountInPrint, ShowVatInPrint, ShowDepositInPrint, ShowShippingInPrint, Status
            )
            OUTPUT INSERTED.QuotationID
            VALUES (
                @quotationNo, @docType, @bankAccount, @customerName, @address, @phone, @taxId,
                @billDate, @validUntil, @subTotal, @discountPercent, @discountAmount, @afterDiscount,
                @vatRate, @vatAmount, @shippingCost, @grandTotal, @depositPercent, @depositAmount,
                @remainingAmount, @signer, @notes, @showDiscount, @showVat, @showDeposit, @showShipping, @status
            )
        `);

        const quotationId = headerResult.recordset[0].QuotationID;

        // 2. Insert Items
        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const itemReq = new sql.Request(transaction);
                itemReq.input('qid', sql.Int, quotationId);
                itemReq.input('order', sql.Int, i + 1);
                itemReq.input('name', sql.NVarChar, item.name);
                itemReq.input('qty', sql.Decimal(18,2), item.qty);
                itemReq.input('price', sql.Decimal(18,2), item.price);
                itemReq.input('amount', sql.Decimal(18,2), item.amount);
                itemReq.input('isPromo', sql.Bit, item.isPromo ? 1 : 0);
                itemReq.input('promoMultiplier', sql.Int, item.promoMultiplier || 1);
                itemReq.input('imageURL', sql.NVarChar(sql.MAX), item.imageURL);

                await itemReq.query(`
                    INSERT INTO QuotationItem (QuotationID, ItemOrder, ItemName, Qty, Price, Amount, IsPromo, PromoMultiplier, ImageURL)
                    VALUES (@qid, @order, @name, @qty, @price, @amount, @isPromo, @promoMultiplier, @imageURL)
                `);
            }
        }

        await transaction.commit();
        res.status(201).json({ success: true, message: 'Quotation created successfully', quotationId });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error creating quotation:', err);
        res.status(500).json({ success: false, message: 'Failed to create quotation', error: err.message });
    }
});

// 4. Update existing quotation
router.put('/:id', async (req, res) => {
    const qid = req.params.id;
    const { 
        quotationNo, docType, bankAccount, customerName, address, phone, taxId, 
        billDate, validUntil, subTotal, discountPercent, discountAmount, 
        afterDiscount, vatRate, vatAmount, shippingCost, grandTotal, 
        depositPercent, depositAmount, remainingAmount, signer, notes, 
        showDiscountInPrint, showVatInPrint, showDepositInPrint, showShippingInPrint, 
        status, items 
    } = req.body;

    let transaction;
    
    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // 1. Update Header
        request.input('id', sql.Int, qid);
        request.input('quotationNo', sql.NVarChar, quotationNo);
        request.input('docType', sql.NVarChar, docType);
        request.input('bankAccount', sql.NVarChar, bankAccount);
        request.input('customerName', sql.NVarChar, customerName);
        request.input('address', sql.NVarChar, address);
        request.input('phone', sql.NVarChar, phone);
        request.input('taxId', sql.NVarChar, taxId);
        request.input('billDate', sql.Date, billDate);
        request.input('validUntil', sql.Date, validUntil);
        request.input('subTotal', sql.Decimal(18,2), subTotal);
        request.input('discountPercent', sql.Int, discountPercent);
        request.input('discountAmount', sql.Decimal(18,2), discountAmount);
        request.input('afterDiscount', sql.Decimal(18,2), afterDiscount);
        request.input('vatRate', sql.Int, vatRate);
        request.input('vatAmount', sql.Decimal(18,2), vatAmount);
        request.input('shippingCost', sql.Decimal(18,2), shippingCost);
        request.input('grandTotal', sql.Decimal(18,2), grandTotal);
        request.input('depositPercent', sql.NVarChar, depositPercent);
        request.input('depositAmount', sql.Decimal(18,2), depositAmount);
        request.input('remainingAmount', sql.Decimal(18,2), remainingAmount);
        request.input('signer', sql.NVarChar, signer);
        request.input('notes', sql.NVarChar, notes);
        request.input('showDiscount', sql.Bit, showDiscountInPrint ? 1 : 0);
        request.input('showVat', sql.Bit, showVatInPrint ? 1 : 0);
        request.input('showDeposit', sql.Bit, showDepositInPrint ? 1 : 0);
        request.input('showShipping', sql.Bit, showShippingInPrint ? 1 : 0);
        request.input('status', sql.NVarChar, status || 'ร่าง');

        // 1. Backup Current Version to History Table before modifying
        const backupReq = new sql.Request(transaction);
        backupReq.input('id', sql.Int, qid);
        const backupResult = await backupReq.query(`
            INSERT INTO QuotationHistory (
                QuotationID, Revision, QuotationNo, DocType, BankAccount, CustomerName, Address, Phone, TaxID,
                BillDate, ValidUntil, SubTotal, DiscountPercent, DiscountAmount, AfterDiscount,
                VatRate, VatAmount, ShippingCost, GrandTotal, DepositPercent, DepositAmount,
                RemainingAmount, Signer, Notes, ShowDiscountInPrint, ShowVatInPrint, ShowDepositInPrint, ShowShippingInPrint, Status, CreatedAt
            )
            OUTPUT INSERTED.HistoryID
            SELECT 
                QuotationID, Revision, QuotationNo, DocType, BankAccount, CustomerName, Address, Phone, TaxID,
                BillDate, ValidUntil, SubTotal, DiscountPercent, DiscountAmount, AfterDiscount,
                VatRate, VatAmount, ShippingCost, GrandTotal, DepositPercent, DepositAmount,
                RemainingAmount, Signer, Notes, ShowDiscountInPrint, ShowVatInPrint, ShowDepositInPrint, ShowShippingInPrint, Status, CreatedAt
            FROM Quotation
            WHERE QuotationID = @id
        `);
        
        const historyId = backupResult.recordset[0].HistoryID;
        
        // Backup Items to History
        const backupItemsReq = new sql.Request(transaction);
        backupItemsReq.input('historyId', sql.Int, historyId);
        backupItemsReq.input('id', sql.Int, qid);
        await backupItemsReq.query(`
            INSERT INTO QuotationItemHistory (HistoryID, ItemOrder, ItemName, Qty, Price, Amount, IsPromo, PromoMultiplier, ImageURL)
            SELECT @historyId, ItemOrder, ItemName, Qty, Price, Amount, IsPromo, PromoMultiplier, ImageURL
            FROM QuotationItem
            WHERE QuotationID = @id
        `);

        // 2. Update Header (increment Revision)
        await request.query(`
            UPDATE Quotation SET
                QuotationNo = @quotationNo, DocType = @docType, BankAccount = @bankAccount,
                CustomerName = @customerName, Address = @address, Phone = @phone, TaxID = @taxId,
                BillDate = @billDate, ValidUntil = @validUntil, SubTotal = @subTotal,
                DiscountPercent = @discountPercent, DiscountAmount = @discountAmount, AfterDiscount = @afterDiscount,
                VatRate = @vatRate, VatAmount = @vatAmount, ShippingCost = @shippingCost, GrandTotal = @grandTotal,
                DepositPercent = @depositPercent, DepositAmount = @depositAmount, RemainingAmount = @remainingAmount,
                Signer = @signer, Notes = @notes, ShowDiscountInPrint = @showDiscount, ShowVatInPrint = @showVat,
                ShowDepositInPrint = @showDeposit, ShowShippingInPrint = @showShipping, Status = @status,
                Revision = Revision + 1,
                UpdatedAt = GETDATE()
            WHERE QuotationID = @id
        `);

        // 2. Delete Old Items
        const delReq = new sql.Request(transaction);
        delReq.input('id', sql.Int, qid);
        await delReq.query(`DELETE FROM QuotationItem WHERE QuotationID = @id`);

        // 3. Insert New Items
        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const itemReq = new sql.Request(transaction);
                itemReq.input('qid', sql.Int, qid);
                itemReq.input('order', sql.Int, i + 1);
                itemReq.input('name', sql.NVarChar, item.name);
                itemReq.input('qty', sql.Decimal(18,2), item.qty);
                itemReq.input('price', sql.Decimal(18,2), item.price);
                itemReq.input('amount', sql.Decimal(18,2), item.amount);
                itemReq.input('isPromo', sql.Bit, item.isPromo ? 1 : 0);
                itemReq.input('promoMultiplier', sql.Int, item.promoMultiplier || 1);
                itemReq.input('imageURL', sql.NVarChar(sql.MAX), item.imageURL);

                await itemReq.query(`
                    INSERT INTO QuotationItem (QuotationID, ItemOrder, ItemName, Qty, Price, Amount, IsPromo, PromoMultiplier, ImageURL)
                    VALUES (@qid, @order, @name, @qty, @price, @amount, @isPromo, @promoMultiplier, @imageURL)
                `);
            }
        }

        await transaction.commit();
        res.json({ success: true, message: 'Quotation updated successfully' });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error updating quotation:', err);
        res.status(500).json({ success: false, message: 'Failed to update quotation', error: err.message });
    }
});

// 5. Update Status
router.patch('/:id/status', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('status', sql.NVarChar, req.body.status)
            .query(`UPDATE Quotation SET Status = @status, UpdatedAt = GETDATE() WHERE QuotationID = @id`);
        
        res.json({ success: true, message: 'Status updated successfully' });
    } catch (err) {
        console.error('Error updating quotation status:', err);
        res.status(500).json({ success: false, message: 'Failed to update status', error: err.message });
    }
});

// 6. Delete Quotation
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`DELETE FROM Quotation WHERE QuotationID = @id`);
        // Note: QuotationItem will be deleted automatically due to ON DELETE CASCADE
        res.json({ success: true, message: 'Quotation deleted successfully' });
    } catch (err) {
        console.error('Error deleting quotation:', err);
        res.status(500).json({ success: false, message: 'Failed to delete quotation', error: err.message });
    }
});

// 7. Get History List for a Quotation
router.get('/:id/history', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT HistoryID, Revision, Status, ArchivedAt, GrandTotal
                FROM QuotationHistory
                WHERE QuotationID = @id
                ORDER BY Revision DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching quotation history:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch history', error: err.message });
    }
});

// 8. Get Specific History Detail
router.get('/history/:historyId', async (req, res) => {
    try {
        const pool = await poolPromise;
        const headerResult = await pool.request()
            .input('hid', sql.Int, req.params.historyId)
            .query(`SELECT * FROM QuotationHistory WHERE HistoryID = @hid`);
            
        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'History not found' });
        }
        
        const itemsResult = await pool.request()
            .input('hid', sql.Int, req.params.historyId)
            .query(`SELECT * FROM QuotationItemHistory WHERE HistoryID = @hid ORDER BY ItemOrder ASC`);
            
        res.json({ 
            success: true, 
            data: {
                ...headerResult.recordset[0],
                items: itemsResult.recordset
            } 
        });
    } catch (err) {
        console.error('Error fetching history details:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch history details', error: err.message });
    }
});

module.exports = router;

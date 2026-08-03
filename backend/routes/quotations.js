const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const { generateSequence, getDatePrefix, getMonthPrefix } = require('../utils/sequence');
const validate = require('../middleware/validate');
const { createQuotationSchema, updateStatusSchema } = require('../validators/quotations');
const { logAction } = require('../services/auditLog');
const { authorizeRoles } = require('../middleware/authorize');

// 1. Get all quotations (for table listing)
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 50);
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        const category = req.query.category || '';

        let whereClauses = [];
        const request = pool.request();
        if (search) {
            whereClauses.push('(QuotationNo LIKE @search OR CustomerName LIKE @search OR Status LIKE @search)');
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        
        if (category === 'quotation') {
            whereClauses.push("DocType LIKE 'quotation_%'");
        } else if (category === 'billing') {
            whereClauses.push("DocType NOT LIKE 'quotation_%'");
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countResult = await request.query(`SELECT COUNT(*) as total FROM Quotation ${whereClause}`);
        const total = countResult.recordset[0].total;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, limit);

        const result = await request.query(`
            SELECT 
                QuotationID, QuotationNo, ContractID, CustomerName, BillDate, ValidUntil, 
                GrandTotal, Status, CreatedAt, Revision
            FROM Quotation
            ${whereClause}
            ORDER BY QuotationID DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);
        res.json({ 
            success: true, 
            data: result.recordset,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching quotations:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch quotations', error: err.message });
    }
});
// 1c. Get next available quotation number
router.get('/next-number', async (req, res) => {
    try {
        const pool = await poolPromise;
        const docType = req.query.docType || 'quotation_thc';
        
        // Quotation always uses QT prefix, but we can keep it dynamic if needed
        const prefix = 'QT';
        const datePrefix = getDatePrefix();
        const fullPrefix = `${prefix}${datePrefix}`;
        
        // Generate sequence (e.g. QT20260727-001 or QT-2026... if separator is '-')
        // Note: The POST route uses `QT-${getDatePrefix()}`, so we must match it
        // Wait, the POST route says: `QT-${getDatePrefix()}`
        const fullPrefixForNext = `QT-${getDatePrefix()}`;
        
        const nextNo = await generateSequence(pool, 'Quotation', 'QuotationNo', fullPrefixForNext, 3);
        
        res.json({ success: true, nextNumber: nextNo });
    } catch (err) {
        console.error('Error generating next number:', err);
        res.status(500).json({ success: false, message: 'Failed to generate next number', error: err.message });
    }
});

// 1b. Get quotations available for SO creation (exclude already-linked ones)
router.get('/status/approved', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                q.QuotationID, q.QuotationNo, q.ContractID, q.CustomerName, q.BillDate, 
                q.GrandTotal, q.Status,
                CASE 
                    WHEN q.Status = N'สร้าง SO แล้ว' THEN 1
                    WHEN EXISTS (SELECT 1 FROM SalesOrder so WHERE so.QuotationID = q.QuotationID OR so.QuotationNo = q.QuotationNo) THEN 1
                    ELSE 0 
                END AS IsUsed
            FROM Quotation q
            ORDER BY q.QuotationID DESC
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
router.post('/', authorizeRoles('admin', 'sales'), validate(createQuotationSchema), async (req, res) => {
    const { 
        customerId, quotationNo, docType, bankAccount, customerTypeId, customerName, contactPerson, email, address, phone, taxId, 
        billDate, validUntil, subTotal, discountPercent, discountAmount, 
        afterDiscount, vatRate, vatAmount, shippingCost, grandTotal, 
        depositPercent, depositAmount, remainingAmount, signer, notes, 
        showDiscountInPrint, showVatInPrint, showDepositInPrint, showShippingInPrint, 
        designFee, showDesignFeeInPrint,
        fdaCustomerCode, fdaEmail, fdaProjectName, fdaCreditTerms, 
        fdaServiceRegister, fdaServiceRegisterPrice, fdaServiceTrademark, fdaServiceTrademarkPrice,
        status, contractId, items 
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
        request.input('customerId', sql.Int, customerId || null);
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
        request.input('designFee', sql.Decimal(18,2), designFee || 0);
        request.input('showDesignFee', sql.Bit, showDesignFeeInPrint ? 1 : 0);
        request.input('status', sql.NVarChar, status || 'ร่าง');
        request.input('contractId', sql.Int, contractId || null);
        request.input('fdaCustomerCode', sql.NVarChar, fdaCustomerCode || null);
        request.input('fdaEmail', sql.NVarChar, fdaEmail || null);
        request.input('fdaProjectName', sql.NVarChar, fdaProjectName || null);
        request.input('fdaCreditTerms', sql.NVarChar, fdaCreditTerms || null);
        request.input('fdaServiceRegister', sql.Bit, fdaServiceRegister ? 1 : 0);
        request.input('fdaServiceRegisterPrice', sql.Decimal(18,2), fdaServiceRegisterPrice || 0);
        request.input('fdaServiceTrademark', sql.Bit, fdaServiceTrademark ? 1 : 0);
        request.input('fdaServiceTrademarkPrice', sql.Decimal(18,2), fdaServiceTrademarkPrice || 0);

        const headerResult = await request.query(`
            INSERT INTO Quotation (
                CustomerID, QuotationNo, ContractID, DocType, BankAccount, CustomerName, Address, Phone, TaxID,
                BillDate, ValidUntil, SubTotal, DiscountPercent, DiscountAmount, AfterDiscount,
                VatRate, VatAmount, ShippingCost, GrandTotal, DepositPercent, DepositAmount,
                RemainingAmount, Signer, Notes, ShowDiscountInPrint, ShowVatInPrint, ShowDepositInPrint, ShowShippingInPrint, DesignFee, ShowDesignFeeInPrint, Status,
                FdaCustomerCode, FdaEmail, FdaProjectName, FdaCreditTerms, FdaServiceRegister, FdaServiceRegisterPrice, FdaServiceTrademark, FdaServiceTrademarkPrice
            )
            OUTPUT INSERTED.QuotationID
            VALUES (
                @customerId, @quotationNo, @contractId, @docType, @bankAccount, @customerName, @address, @phone, @taxId,
                @billDate, @validUntil, @subTotal, @discountPercent, @discountAmount, @afterDiscount,
                @vatRate, @vatAmount, @shippingCost, @grandTotal, @depositPercent, @depositAmount,
                @remainingAmount, @signer, @notes, @showDiscount, @showVat, @showDeposit, @showShipping, @designFee, @showDesignFee, @status,
                @fdaCustomerCode, @fdaEmail, @fdaProjectName, @fdaCreditTerms, @fdaServiceRegister, @fdaServiceRegisterPrice, @fdaServiceTrademark, @fdaServiceTrademarkPrice
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

        // ── Auto-Create Customer (Prospect) ──
        // หลังจาก commit QT สำเร็จแล้ว ค่อยสร้างลูกค้า (ไม่ใช่ส่วนของ transaction เพราะถ้า customer ซ้ำไม่ควรทำให้ QT fail)
        if (customerName && customerName.trim()) {
            try {
                const custCheck = await pool.request()
                    .input('custName', sql.NVarChar, customerName.trim())
                    .query(`SELECT CustomerID FROM Customer WHERE CustomerName = @custName`);

                if (custCheck.recordset.length === 0) {
                    // ลูกค้ายังไม่มีในระบบ → สร้างใหม่เป็น Prospect
                    const typeId = customerTypeId ? parseInt(customerTypeId) : 1;
                    const prefix = typeId === 2 ? 'OEM' : 'CUST';
                    const custCode = await generateSequence(pool, 'Customer', 'CustomerCode', `${prefix}-${getMonthPrefix()}`, 3);

                    await pool.request()
                        .input('tid', sql.Int, typeId)           // จาก dropdown หรือ 1 = Retail (default)
                        .input('sid', sql.Int, 3)           // 3 = Prospect
                        .input('code', sql.NVarChar, custCode)
                        .input('name', sql.NVarChar, customerName.trim())
                        .input('contact', sql.NVarChar, contactPerson || null)
                        .input('email', sql.NVarChar, email || null)
                        .input('phone', sql.NVarChar, phone || null)
                        .input('address', sql.NVarChar, address || null)
                        .input('tax', sql.NVarChar, taxId || null)
                        .input('source', sql.NVarChar, 'quotation')
                        .query(`
                            INSERT INTO Customer (CustomerTypeID, CustomerStatusID, CustomerCode, CustomerName, ContactPerson, Email, Phone, Address, TaxID, Source)
                            VALUES (@tid, @sid, @code, @name, @contact, @email, @phone, @address, @tax, @source)
                        `);
                    console.log(`✅ Auto-created customer "${customerName}" as Prospect from QT`);
                }
            } catch (custErr) {
                // ไม่ให้ customer error กระทบ QT response (QT บันทึกสำเร็จแล้ว)
                console.error('⚠️ Auto-create customer warning:', custErr.message);
            }
        }

        // ✅ Audit Log: สร้างใบเสนอราคา
        await logAction(req, 'CREATE', 'quotations', quotationId, 
            `สร้างใบเสนอราคา ${finalQuotationNo} — ลูกค้า: ${customerName} — ยอดรวม: ${grandTotal}`);

        res.status(201).json({ success: true, message: 'Quotation created successfully', quotationId });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error creating quotation:', err);
        res.status(500).json({ success: false, message: 'Failed to create quotation: ' + err.message, error: err.message });
    }
});

// 4. Update existing quotation
router.put('/:id', authorizeRoles('admin', 'sales'), validate(createQuotationSchema), async (req, res) => {
    const qid = req.params.id;
    const { 
        customerId, quotationNo, docType, bankAccount, customerName, address, phone, taxId, 
        billDate, validUntil, subTotal, discountPercent, discountAmount, 
        afterDiscount, vatRate, vatAmount, shippingCost, grandTotal, 
        depositPercent, depositAmount, remainingAmount, signer, notes, 
        showDiscountInPrint, showVatInPrint, showDepositInPrint, showShippingInPrint, 
        designFee, showDesignFeeInPrint,
        fdaCustomerCode, fdaEmail, fdaProjectName, fdaCreditTerms, 
        fdaServiceRegister, fdaServiceRegisterPrice, fdaServiceTrademark, fdaServiceTrademarkPrice,
        status, contractId, items 
    } = req.body;

    let transaction;
    
    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // 1. Update Header
        request.input('id', sql.Int, qid);
        request.input('customerId', sql.Int, customerId || null);
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
        request.input('designFee', sql.Decimal(18,2), designFee || 0);
        request.input('showDesignFee', sql.Bit, showDesignFeeInPrint ? 1 : 0);
        request.input('status', sql.NVarChar, status || null);
        request.input('contractId', sql.Int, contractId || null);
        request.input('fdaCustomerCode', sql.NVarChar, fdaCustomerCode || null);
        request.input('fdaEmail', sql.NVarChar, fdaEmail || null);
        request.input('fdaProjectName', sql.NVarChar, fdaProjectName || null);
        request.input('fdaCreditTerms', sql.NVarChar, fdaCreditTerms || null);
        request.input('fdaServiceRegister', sql.Bit, fdaServiceRegister ? 1 : 0);
        request.input('fdaServiceRegisterPrice', sql.Decimal(18,2), fdaServiceRegisterPrice || 0);
        request.input('fdaServiceTrademark', sql.Bit, fdaServiceTrademark ? 1 : 0);
        request.input('fdaServiceTrademarkPrice', sql.Decimal(18,2), fdaServiceTrademarkPrice || 0);

        // 1. Backup Current Version to History Table before modifying
        const backupReq = new sql.Request(transaction);
        backupReq.input('id', sql.Int, qid);
        const backupResult = await backupReq.query(`
            INSERT INTO QuotationHistory (
                CustomerID, QuotationID, Revision, QuotationNo, DocType, BankAccount, CustomerName, Address, Phone, TaxID,
                BillDate, ValidUntil, SubTotal, DiscountPercent, DiscountAmount, AfterDiscount,
                VatRate, VatAmount, ShippingCost, GrandTotal, DepositPercent, DepositAmount,
                RemainingAmount, Signer, Notes, ShowDiscountInPrint, ShowVatInPrint, ShowDepositInPrint, ShowShippingInPrint, DesignFee, ShowDesignFeeInPrint, Status, CreatedAt,
                FdaCustomerCode, FdaEmail, FdaProjectName, FdaCreditTerms, FdaServiceRegister, FdaServiceRegisterPrice, FdaServiceTrademark, FdaServiceTrademarkPrice
            )
            OUTPUT INSERTED.HistoryID
            SELECT 
                CustomerID, QuotationID, Revision, QuotationNo, DocType, BankAccount, CustomerName, Address, Phone, TaxID,
                BillDate, ValidUntil, SubTotal, DiscountPercent, DiscountAmount, AfterDiscount,
                VatRate, VatAmount, ShippingCost, GrandTotal, DepositPercent, DepositAmount,
                RemainingAmount, Signer, Notes, ShowDiscountInPrint, ShowVatInPrint, ShowDepositInPrint, ShowShippingInPrint, DesignFee, ShowDesignFeeInPrint, Status, CreatedAt,
                FdaCustomerCode, FdaEmail, FdaProjectName, FdaCreditTerms, FdaServiceRegister, FdaServiceRegisterPrice, FdaServiceTrademark, FdaServiceTrademarkPrice
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
                CustomerID = @customerId, QuotationNo = @quotationNo, ContractID = @contractId, DocType = @docType, BankAccount = @bankAccount,
                CustomerName = @customerName, Address = @address, Phone = @phone, TaxID = @taxId,
                BillDate = @billDate, ValidUntil = @validUntil, SubTotal = @subTotal,
                DiscountPercent = @discountPercent, DiscountAmount = @discountAmount, AfterDiscount = @afterDiscount,
                VatRate = @vatRate, VatAmount = @vatAmount, ShippingCost = @shippingCost, GrandTotal = @grandTotal,
                DepositPercent = @depositPercent, DepositAmount = @depositAmount, RemainingAmount = @remainingAmount,
                Signer = @signer, Notes = @notes, ShowDiscountInPrint = @showDiscount, ShowVatInPrint = @showVat,
                ShowDepositInPrint = @showDeposit, ShowShippingInPrint = @showShipping, DesignFee = @designFee, ShowDesignFeeInPrint = @showDesignFee, Status = ISNULL(@status, Status),
                FdaCustomerCode = @fdaCustomerCode, FdaEmail = @fdaEmail, FdaProjectName = @fdaProjectName, FdaCreditTerms = @fdaCreditTerms,
                FdaServiceRegister = @fdaServiceRegister, FdaServiceRegisterPrice = @fdaServiceRegisterPrice,
                FdaServiceTrademark = @fdaServiceTrademark, FdaServiceTrademarkPrice = @fdaServiceTrademarkPrice,
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

        // ✅ Audit Log: แก้ไขใบเสนอราคา
        await logAction(req, 'UPDATE', 'quotations', qid, 
            `แก้ไขใบเสนอราคา ${quotationNo || qid} — ลูกค้า: ${customerName} — ยอดรวม: ${grandTotal}`);

        res.json({ success: true, message: 'Quotation updated successfully' });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error updating quotation:', err);
        res.status(500).json({ success: false, message: 'Failed to update quotation: ' + err.message, error: err.message });
    }
});

// 5. Update Status
router.patch('/:id/status', authorizeRoles('admin', 'sales'), validate(updateStatusSchema), async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('status', sql.NVarChar, req.body.status)
            .query(`UPDATE Quotation SET Status = @status, UpdatedAt = GETDATE() WHERE QuotationID = @id`);
        
        // ✅ Audit Log: เปลี่ยนสถานะ
        await logAction(req, 'UPDATE', 'quotations', req.params.id, 
            `เปลี่ยนสถานะใบเสนอราคา #${req.params.id} → "${req.body.status}"`);

        res.json({ success: true, message: 'Status updated successfully' });
    } catch (err) {
        console.error('Error updating quotation status:', err);
        res.status(500).json({ success: false, message: 'Failed to update status', error: err.message });
    }
});

// 6. Delete Quotation
router.delete('/:id', authorizeRoles('admin', 'sales'), async (req, res) => {
    try {
        const pool = await poolPromise;

        // ดึงข้อมูลเดิมก่อนลบ (เก็บหลักฐานใน Log)
        const existing = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT QuotationNo, CustomerName, GrandTotal FROM Quotation WHERE QuotationID = @id');
        const deleted = existing.recordset[0];

        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM Quotation WHERE QuotationID = @id');

        // ✅ Audit Log: ลบใบเสนอราคา (เก็บข้อมูลที่ถูกลบไว้ด้วย)
        await logAction(req, 'DELETE', 'quotations', req.params.id, 
            `ลบใบเสนอราคา ${deleted?.QuotationNo || req.params.id} — ลูกค้า: ${deleted?.CustomerName}`,
            deleted, null);

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

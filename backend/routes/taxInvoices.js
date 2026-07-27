const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const { generateSequence, getDatePrefix, getMonthPrefix } = require('../utils/sequence');
const validate = require('../middleware/validate');
const { createTaxInvoiceSchema, updateStatusSchema } = require('../validators/taxInvoices');
const { logAction } = require('../services/auditLog');
const { authorizeRoles } = require('../middleware/authorize');

// 1. Get all billing-invoices (for table listing)
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
            whereClauses.push('(TaxInvoiceNo LIKE @search OR CustomerName LIKE @search OR Status LIKE @search)');
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        // No category filter needed for billing invoice specific table

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countResult = await request.query(`SELECT COUNT(*) as total FROM TaxInvoice ${whereClause}`);
        const total = countResult.recordset[0].total;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, limit);

        const result = await request.query(`
            SELECT 
                CustomerID, TaxInvoiceID, TaxInvoiceNo, ContractID, CustomerName, BillDate, ValidUntil, 
                GrandTotal, Status, CreatedAt, Revision
            FROM TaxInvoice
            ${whereClause}
            ORDER BY TaxInvoiceID DESC
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
        console.error('Error fetching billing-invoices:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch billing-invoices', error: err.message });
    }
});

// 1c. Get next available invoice number for a given docType
router.get('/next-number', async (req, res) => {
    try {
        const pool = await poolPromise;
        const docType = req.query.docType || 'tax_invoice_thc';
        
        // Determine prefix based on docType
        let prefix = 'IV';
        if (docType.includes('psf')) prefix = 'IV-PSF';
        else if (docType.includes('elt')) prefix = 'IV-ELT';
        
        const datePrefix = getDatePrefix();
        const fullPrefix = `${prefix}${datePrefix}`;
        
        const nextNo = await generateSequence(pool, 'TaxInvoice', 'TaxInvoiceNo', fullPrefix, 3);
        
        res.json({ success: true, nextNumber: nextNo });
    } catch (err) {
        console.error('Error generating next number:', err);
        res.status(500).json({ success: false, message: 'Failed to generate next number', error: err.message });
    }
});

// 1b. Get billing-invoices available for SO creation (exclude already-linked ones)
router.get('/status/approved', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                CustomerID, TaxInvoiceID, TaxInvoiceNo, ContractID, CustomerName, BillDate, 
                GrandTotal, Status
            FROM TaxInvoice
            WHERE Status != N'สร้าง SO แล้ว'
            ORDER BY TaxInvoiceID DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching billing-invoices for SO:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch billing-invoices', error: err.message });
    }
});

// 2. Get single taxInvoice by ID (with items)
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        
        // Get Header
        const headerResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`SELECT * FROM TaxInvoice WHERE TaxInvoiceID = @id`);
            
        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'TaxInvoice not found' });
        }
        
        // Get Items
        const itemsResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`SELECT * FROM TaxInvoiceItem WHERE TaxInvoiceID = @id ORDER BY ItemOrder ASC`);
            
        res.json({ 
            success: true, 
            data: {
                ...headerResult.recordset[0],
                items: itemsResult.recordset
            } 
        });
    } catch (err) {
        console.error('Error fetching taxInvoice details:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch taxInvoice details', error: err.message });
    }
});

// 3. Create new taxInvoice
router.post('/', authorizeRoles('admin', 'sales'), validate(createTaxInvoiceSchema), async (req, res) => {
    const { 
        customerId, taxInvoiceNo, docType, bankAccount, customerTypeId, customerName, contactPerson, email, address, phone, taxId, 
        billDate, validUntil, subTotal, discountPercent, discountAmount, 
        afterDiscount, vatRate, vatAmount, shippingCost, grandTotal, 
        depositPercent, depositAmount, remainingAmount, signer, 
        customerOrder, purchaseNo, salesperson, termOfPayment, notes, 
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

        // Generate TaxInvoice Number
        const finalTaxInvoiceNo = taxInvoiceNo || await generateSequence(pool, 'TaxInvoice', 'TaxInvoiceNo', `BI-${getDatePrefix()}`, 3);

        // 1. Insert Header
        request.input('taxInvoiceNo', sql.NVarChar, finalTaxInvoiceNo);
        request.input('customerId', sql.Int, customerId || null);
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
        request.input('customerOrder', sql.NVarChar, customerOrder);
        request.input('purchaseNo', sql.NVarChar, purchaseNo);
        request.input('salesperson', sql.NVarChar, salesperson);
        request.input('termOfPayment', sql.NVarChar, termOfPayment);
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
            INSERT INTO TaxInvoice (
                CustomerID, TaxInvoiceNo, ContractID, DocType, BankAccount, CustomerName, Address, Phone, TaxID,
                BillDate, ValidUntil, SubTotal, DiscountPercent, DiscountAmount, AfterDiscount,
                VatRate, VatAmount, ShippingCost, GrandTotal, DepositPercent, DepositAmount,
                RemainingAmount, Signer, CustomerOrder, PurchaseNo, Salesperson, TermOfPayment, Notes, ShowDiscountInPrint, ShowVatInPrint, ShowDepositInPrint, ShowShippingInPrint, DesignFee, ShowDesignFeeInPrint, Status,
                FdaCustomerCode, FdaEmail, FdaProjectName, FdaCreditTerms, FdaServiceRegister, FdaServiceRegisterPrice, FdaServiceTrademark, FdaServiceTrademarkPrice
            )
            OUTPUT INSERTED.TaxInvoiceID
            VALUES (
                @customerId, @taxInvoiceNo, @contractId, @docType, @bankAccount, @customerName, @address, @phone, @taxId,
                @billDate, @validUntil, @subTotal, @discountPercent, @discountAmount, @afterDiscount,
                @vatRate, @vatAmount, @shippingCost, @grandTotal, @depositPercent, @depositAmount,
                @remainingAmount, @signer, @customerOrder, @purchaseNo, @salesperson, @termOfPayment, @notes, @showDiscount, @showVat, @showDeposit, @showShipping, @designFee, @showDesignFee, @status,
                @fdaCustomerCode, @fdaEmail, @fdaProjectName, @fdaCreditTerms, @fdaServiceRegister, @fdaServiceRegisterPrice, @fdaServiceTrademark, @fdaServiceTrademarkPrice
            )
        `);

        const taxInvoiceId = headerResult.recordset[0].TaxInvoiceID;

        // 2. Insert Items
        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const itemReq = new sql.Request(transaction);
                itemReq.input('qid', sql.Int, taxInvoiceId);
                itemReq.input('order', sql.Int, i + 1);
                itemReq.input('name', sql.NVarChar, item.name);
                itemReq.input('qty', sql.Decimal(18,2), item.qty);
                itemReq.input('price', sql.Decimal(18,2), item.price);
                itemReq.input('amount', sql.Decimal(18,2), item.amount);
                itemReq.input('isPromo', sql.Bit, item.isPromo ? 1 : 0);
                itemReq.input('promoMultiplier', sql.Int, item.promoMultiplier || 1);
                itemReq.input('imageURL', sql.NVarChar(sql.MAX), item.imageURL);

                await itemReq.query(`
                    INSERT INTO TaxInvoiceItem (TaxInvoiceID, ItemOrder, ItemName, Qty, Price, Amount, IsPromo, PromoMultiplier, ImageURL)
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
                        .input('source', sql.NVarChar, 'taxInvoice')
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
        await logAction(req, 'CREATE', 'billing-invoices', taxInvoiceId, 
            `สร้างใบเสนอราคา ${finalTaxInvoiceNo} — ลูกค้า: ${customerName} — ยอดรวม: ${grandTotal}`);

        res.status(201).json({ success: true, message: 'TaxInvoice created successfully', taxInvoiceId });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error creating taxInvoice:', err);
        res.status(500).json({ success: false, message: 'Failed to create taxInvoice: ' + err.message, error: err.message });
    }
});

// 4. Update existing taxInvoice
router.put('/:id', authorizeRoles('admin', 'sales'), validate(createTaxInvoiceSchema), async (req, res) => {
    const qid = req.params.id;
    const { 
        customerId, taxInvoiceNo, docType, bankAccount, customerName, address, phone, taxId, 
        billDate, validUntil, subTotal, discountPercent, discountAmount, 
        afterDiscount, vatRate, vatAmount, shippingCost, grandTotal, 
        depositPercent, depositAmount, remainingAmount, signer, 
        customerOrder, purchaseNo, salesperson, termOfPayment, notes, 
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
        request.input('taxInvoiceNo', sql.NVarChar, taxInvoiceNo);
        request.input('customerId', sql.Int, customerId || null);
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
        request.input('customerOrder', sql.NVarChar, customerOrder || null);
        request.input('purchaseNo', sql.NVarChar, purchaseNo || null);
        request.input('salesperson', sql.NVarChar, salesperson || null);
        request.input('termOfPayment', sql.NVarChar, termOfPayment || null);
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
            INSERT INTO TaxInvoiceHistory (
                CustomerID, TaxInvoiceID, Revision, TaxInvoiceNo, DocType, BankAccount, CustomerName, Address, Phone, TaxID,
                BillDate, ValidUntil, SubTotal, DiscountPercent, DiscountAmount, AfterDiscount,
                VatRate, VatAmount, ShippingCost, GrandTotal, DepositPercent, DepositAmount,
                RemainingAmount, Signer, CustomerOrder, PurchaseNo, Salesperson, TermOfPayment, Notes, ShowDiscountInPrint, ShowVatInPrint, ShowDepositInPrint, ShowShippingInPrint, DesignFee, ShowDesignFeeInPrint, Status, CreatedAt,
                FdaCustomerCode, FdaEmail, FdaProjectName, FdaCreditTerms, FdaServiceRegister, FdaServiceRegisterPrice, FdaServiceTrademark, FdaServiceTrademarkPrice
            )
            OUTPUT INSERTED.HistoryID
            SELECT 
                CustomerID, TaxInvoiceID, Revision, TaxInvoiceNo, DocType, BankAccount, CustomerName, Address, Phone, TaxID,
                BillDate, ValidUntil, SubTotal, DiscountPercent, DiscountAmount, AfterDiscount,
                VatRate, VatAmount, ShippingCost, GrandTotal, DepositPercent, DepositAmount,
                RemainingAmount, Signer, CustomerOrder, PurchaseNo, Salesperson, TermOfPayment, Notes, ShowDiscountInPrint, ShowVatInPrint, ShowDepositInPrint, ShowShippingInPrint, DesignFee, ShowDesignFeeInPrint, Status, CreatedAt,
                FdaCustomerCode, FdaEmail, FdaProjectName, FdaCreditTerms, FdaServiceRegister, FdaServiceRegisterPrice, FdaServiceTrademark, FdaServiceTrademarkPrice
            FROM TaxInvoice
            WHERE TaxInvoiceID = @id
        `);
        
        const historyId = backupResult.recordset[0].HistoryID;
        
        // Backup Items to History
        const backupItemsReq = new sql.Request(transaction);
        backupItemsReq.input('historyId', sql.Int, historyId);
        backupItemsReq.input('id', sql.Int, qid);
        await backupItemsReq.query(`
            INSERT INTO TaxInvoiceItemHistory (HistoryID, ItemOrder, ItemName, Qty, Price, Amount, IsPromo, PromoMultiplier, ImageURL)
            SELECT @historyId, ItemOrder, ItemName, Qty, Price, Amount, IsPromo, PromoMultiplier, ImageURL
            FROM TaxInvoiceItem
            WHERE TaxInvoiceID = @id
        `);

        // 2. Update Header (increment Revision)
        await request.query(`
            UPDATE TaxInvoice SET
                CustomerID = @customerId, TaxInvoiceNo = @taxInvoiceNo, ContractID = @contractId, DocType = @docType, BankAccount = @bankAccount,
                CustomerName = @customerName, Address = @address, Phone = @phone, TaxID = @taxId,
                BillDate = @billDate, ValidUntil = @validUntil, SubTotal = @subTotal,
                DiscountPercent = @discountPercent, DiscountAmount = @discountAmount, AfterDiscount = @afterDiscount,
                VatRate = @vatRate, VatAmount = @vatAmount, ShippingCost = @shippingCost, GrandTotal = @grandTotal,
                DepositPercent = @depositPercent, DepositAmount = @depositAmount, RemainingAmount = @remainingAmount,
                Signer = @signer, CustomerOrder = @customerOrder, PurchaseNo = @purchaseNo, Salesperson = @salesperson, TermOfPayment = @termOfPayment, Notes = @notes, ShowDiscountInPrint = @showDiscount, ShowVatInPrint = @showVat,
                ShowDepositInPrint = @showDeposit, ShowShippingInPrint = @showShipping, DesignFee = @designFee, ShowDesignFeeInPrint = @showDesignFee, Status = ISNULL(@status, Status),
                FdaCustomerCode = @fdaCustomerCode, FdaEmail = @fdaEmail, FdaProjectName = @fdaProjectName, FdaCreditTerms = @fdaCreditTerms,
                FdaServiceRegister = @fdaServiceRegister, FdaServiceRegisterPrice = @fdaServiceRegisterPrice,
                FdaServiceTrademark = @fdaServiceTrademark, FdaServiceTrademarkPrice = @fdaServiceTrademarkPrice,
                Revision = Revision + 1,
                UpdatedAt = GETDATE()
            WHERE TaxInvoiceID = @id
        `);

        // 2. Delete Old Items
        const delReq = new sql.Request(transaction);
        delReq.input('id', sql.Int, qid);
        await delReq.query(`DELETE FROM TaxInvoiceItem WHERE TaxInvoiceID = @id`);

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
                    INSERT INTO TaxInvoiceItem (TaxInvoiceID, ItemOrder, ItemName, Qty, Price, Amount, IsPromo, PromoMultiplier, ImageURL)
                    VALUES (@qid, @order, @name, @qty, @price, @amount, @isPromo, @promoMultiplier, @imageURL)
                `);
            }
        }

        await transaction.commit();

        // ✅ Audit Log: แก้ไขใบเสนอราคา
        await logAction(req, 'UPDATE', 'billing-invoices', qid, 
            `แก้ไขใบเสนอราคา ${taxInvoiceNo || qid} — ลูกค้า: ${customerName} — ยอดรวม: ${grandTotal}`);

        res.json({ success: true, message: 'TaxInvoice updated successfully' });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error updating taxInvoice:', err);
        res.status(500).json({ success: false, message: 'Failed to update taxInvoice: ' + err.message, error: err.message });
    }
});

// 5. Update Status
router.patch('/:id/status', authorizeRoles('admin', 'sales'), validate(updateStatusSchema), async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('status', sql.NVarChar, req.body.status)
            .query(`UPDATE TaxInvoice SET Status = @status, UpdatedAt = GETDATE() WHERE TaxInvoiceID = @id`);
        
        // ✅ Audit Log: เปลี่ยนสถานะ
        await logAction(req, 'UPDATE', 'billing-invoices', req.params.id, 
            `เปลี่ยนสถานะใบเสนอราคา #${req.params.id} → "${req.body.status}"`);

        res.json({ success: true, message: 'Status updated successfully' });
    } catch (err) {
        console.error('Error updating taxInvoice status:', err);
        res.status(500).json({ success: false, message: 'Failed to update status', error: err.message });
    }
});

// 6. Delete TaxInvoice
router.delete('/:id', authorizeRoles('admin', 'sales'), async (req, res) => {
    try {
        const pool = await poolPromise;

        // ดึงข้อมูลเดิมก่อนลบ (เก็บหลักฐานใน Log)
        const existing = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT TaxInvoiceNo, CustomerName, GrandTotal FROM TaxInvoice WHERE TaxInvoiceID = @id');
        const deleted = existing.recordset[0];

        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM TaxInvoice WHERE TaxInvoiceID = @id');

        // ✅ Audit Log: ลบใบเสนอราคา (เก็บข้อมูลที่ถูกลบไว้ด้วย)
        await logAction(req, 'DELETE', 'billing-invoices', req.params.id, 
            `ลบใบเสนอราคา ${deleted?.TaxInvoiceNo || req.params.id} — ลูกค้า: ${deleted?.CustomerName}`,
            deleted, null);

        res.json({ success: true, message: 'TaxInvoice deleted successfully' });
    } catch (err) {
        console.error('Error deleting taxInvoice:', err);
        res.status(500).json({ success: false, message: 'Failed to delete taxInvoice', error: err.message });
    }
});

// 7. Get History List for a TaxInvoice
router.get('/:id/history', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT HistoryID, Revision, Status, ArchivedAt, GrandTotal
                FROM TaxInvoiceHistory
                WHERE TaxInvoiceID = @id
                ORDER BY Revision DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching taxInvoice history:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch history', error: err.message });
    }
});

// 8. Get Specific History Detail
router.get('/history/:historyId', async (req, res) => {
    try {
        const pool = await poolPromise;
        const headerResult = await pool.request()
            .input('hid', sql.Int, req.params.historyId)
            .query(`SELECT * FROM TaxInvoiceHistory WHERE HistoryID = @hid`);
            
        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'History not found' });
        }
        
        const itemsResult = await pool.request()
            .input('hid', sql.Int, req.params.historyId)
            .query(`SELECT * FROM TaxInvoiceItemHistory WHERE HistoryID = @hid ORDER BY ItemOrder ASC`);
            
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

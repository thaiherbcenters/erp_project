/**
 * =============================================================================
 * sales-orders.js — Sales Order API Routes
 * =============================================================================
 * CRUD สำหรับ Sales Order (SO)
 * - สร้าง SO จาก Quotation (Auto-fill) หรือ Manual
 * - เมื่อสร้าง SO จาก QT จะอัปเดตสถานะ QT เป็น "สร้าง SO แล้ว"
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const { authorizeRoles } = require('../middleware/authorize');

// ── Helper: Generate SO Number ──
const generateSONumber = async (pool) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const prefix = `SO-${yyyy}${mm}${dd}`;

    const result = await pool.request()
        .input('prefix', sql.NVarChar, `${prefix}%`)
        .query(`SELECT COUNT(*) AS cnt FROM SalesOrder WHERE SalesOrderNo LIKE @prefix`);

    const seq = String((result.recordset[0].cnt || 0) + 1).padStart(3, '0');
    return `${prefix}-${seq}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// 0. GET /next-number — ดึงเลข Sales Order ถัดไป
// ─────────────────────────────────────────────────────────────────────────────
router.get('/next-number', async (req, res) => {
    try {
        const pool = await poolPromise;
        const nextNo = await generateSONumber(pool);
        res.json({ success: true, nextNumber: nextNo });
    } catch (err) {
        console.error('Error generating next SO number:', err);
        res.status(500).json({ success: false, message: 'Failed to generate next number', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 0b. GET /from-quotation/:qtId  — ดึงข้อมูล Quotation สำหรับ Auto-fill SO
// ─────────────────────────────────────────────────────────────────────────────
router.get('/from-quotation/:qtId', async (req, res) => {
    try {
        const pool = await poolPromise;
        const rawQtId = req.params.qtId;

        let headerResult;
        const isNumeric = !isNaN(rawQtId) && !isNaN(parseInt(rawQtId, 10));

        if (isNumeric) {
            headerResult = await pool.request()
                .input('id', sql.Int, parseInt(rawQtId, 10))
                .input('qtNo', sql.NVarChar, rawQtId)
                .query(`SELECT * FROM Quotation WHERE QuotationID = @id OR QuotationNo = @qtNo`);
        } else {
            headerResult = await pool.request()
                .input('qtNo', sql.NVarChar, rawQtId)
                .query(`SELECT * FROM Quotation WHERE QuotationNo = @qtNo`);
        }

        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        const actualQT = headerResult.recordset[0];

        const itemsResult = await pool.request()
            .input('qtId', sql.Int, actualQT.QuotationID)
            .query(`SELECT * FROM QuotationItem WHERE QuotationID = @qtId ORDER BY ItemOrder ASC`);

        res.json({
            success: true,
            data: {
                ...actualQT,
                items: itemsResult.recordset
            }
        });
    } catch (err) {
        console.error('Error fetching quotation for SO:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch quotation', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 0c. GET /history-detail/:historyId  — ดึงข้อมูล SO History ตาม HistoryID
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history-detail/:historyId', async (req, res) => {
    try {
        const pool = await poolPromise;
        const headerResult = await pool.request()
            .input('historyId', sql.Int, req.params.historyId)
            .query(`SELECT * FROM SalesOrderHistory WHERE HistoryID = @historyId`);

        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'History record not found' });
        }

        const itemsResult = await pool.request()
            .input('historyId', sql.Int, req.params.historyId)
            .query(`SELECT * FROM SalesOrderItemHistory WHERE HistoryID = @historyId ORDER BY ItemOrder ASC`);

        res.json({
            success: true,
            data: {
                ...headerResult.recordset[0],
                items: itemsResult.recordset
            }
        });
    } catch (err) {
        console.error('Error fetching SO history detail:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch history detail', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 0d. GET /:id/history  — ดึงประวัติการแก้ไขทั้งหมดของ SO
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/history', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT HistoryID, SalesOrderID, Revision, SalesOrderNo, GrandTotal, Status, ArchivedAt
                FROM SalesOrderHistory
                WHERE SalesOrderID = @id
                ORDER BY HistoryID DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching SO history list:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch history list', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /  — ดึงรายการ SO ทั้งหมด
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                SalesOrderID, SalesOrderNo, QuotationNo, ContractID, CustomerName, 
                OrderDate, DeliveryDate, GrandTotal, CustomerPONumber,
                Status, CreatedBy, CreatedAt, Revision
            FROM SalesOrder
            ORDER BY SalesOrderID DESC
        `);
        res.json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (err) {
        console.error('Error fetching sales orders:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch sales orders', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /:id  — ดึง SO + Items ตาม ID
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const rawId = req.params.id;

        let headerResult;
        const isNumeric = !isNaN(rawId) && !isNaN(parseInt(rawId, 10));

        if (isNumeric) {
            headerResult = await pool.request()
                .input('id', sql.Int, parseInt(rawId, 10))
                .input('soNo', sql.NVarChar, rawId)
                .query(`SELECT * FROM SalesOrder WHERE SalesOrderID = @id OR SalesOrderNo = @soNo`);
        } else {
            headerResult = await pool.request()
                .input('soNo', sql.NVarChar, rawId)
                .query(`SELECT * FROM SalesOrder WHERE SalesOrderNo = @soNo`);
        }

        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Sales Order not found' });
        }

        const actualSO = headerResult.recordset[0];

        const itemsResult = await pool.request()
            .input('soId', sql.Int, actualSO.SalesOrderID)
            .query(`SELECT * FROM SalesOrderItem WHERE SalesOrderID = @soId ORDER BY ItemOrder ASC`);

        res.json({
            success: true,
            data: {
                ...actualSO,
                items: itemsResult.recordset
            }
        });
    } catch (err) {
        console.error('Error fetching sales order details:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch sales order details', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /  — สร้าง SO ใหม่
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authorizeRoles('admin', 'executive', 'sales'), async (req, res) => {
    const {
        quotationId, quotationNo, docType,
        customerName, address, phone, taxId,
        orderDate, deliveryDate,
        subTotal, discountPercent, discountAmount, afterDiscount,
        vatRate, vatAmount, shippingCost, grandTotal,
        customerPONumber, notes, createdBy, contractId, items,
        showDiscountInPrint, showVatInPrint, showShippingInPrint,
        designFee, showDesignFeeInPrint,
        depositPercent, depositAmount, showDepositInPrint,
        preparedBy, salesManager, productionManager
    } = req.body;

    let transaction;

    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Generate SO Number
        const soNumber = await generateSONumber(pool);

        const request = new sql.Request(transaction);
        request.input('soNo', sql.NVarChar, soNumber);
        request.input('quotationId', sql.Int, quotationId || null);
        request.input('quotationNo', sql.NVarChar, quotationNo || null);
        request.input('docType', sql.NVarChar, docType || null);
        request.input('customerName', sql.NVarChar, customerName);
        request.input('address', sql.NVarChar, address || '');
        request.input('phone', sql.NVarChar, phone || '');
        request.input('taxId', sql.NVarChar, taxId || '');
        request.input('orderDate', sql.Date, orderDate || new Date());
        request.input('deliveryDate', sql.Date, deliveryDate || null);
        request.input('subTotal', sql.Decimal(18, 2), subTotal || 0);
        request.input('discountPercent', sql.Int, discountPercent || 0);
        request.input('discountAmount', sql.Decimal(18, 2), discountAmount || 0);
        request.input('afterDiscount', sql.Decimal(18, 2), afterDiscount || 0);
        request.input('vatRate', sql.Int, vatRate || 0);
        request.input('vatAmount', sql.Decimal(18, 2), vatAmount || 0);
        request.input('shippingCost', sql.Decimal(18, 2), shippingCost || 0);
        request.input('grandTotal', sql.Decimal(18, 2), grandTotal || 0);
        request.input('customerPO', sql.NVarChar, customerPONumber || null);
        request.input('notes', sql.NVarChar, notes || '');
        request.input('createdBy', sql.NVarChar, createdBy || '');
        request.input('contractId', sql.Int, contractId || null);

        request.input('showDiscountInPrint', sql.Bit, showDiscountInPrint ? 1 : 0);
        request.input('showVatInPrint', sql.Bit, showVatInPrint ? 1 : 0);
        request.input('showShippingInPrint', sql.Bit, showShippingInPrint ? 1 : 0);
        request.input('designFee', sql.Decimal(18, 2), designFee || 0);
        request.input('showDesignFeeInPrint', sql.Bit, showDesignFeeInPrint ? 1 : 0);
        request.input('depositPercent', sql.NVarChar, depositPercent ? String(depositPercent) : '0');
        request.input('depositAmount', sql.Decimal(18, 2), depositAmount || 0);
        request.input('showDepositInPrint', sql.Bit, showDepositInPrint ? 1 : 0);
        request.input('preparedBy', sql.NVarChar, preparedBy || null);
        request.input('salesManager', sql.NVarChar, salesManager || null);
        request.input('productionManager', sql.NVarChar, productionManager || null);

        const headerResult = await request.query(`
            INSERT INTO SalesOrder (
                SalesOrderNo, QuotationID, QuotationNo, ContractID, DocType,
                CustomerName, Address, Phone, TaxID,
                OrderDate, DeliveryDate,
                SubTotal, DiscountPercent, DiscountAmount, AfterDiscount,
                VatRate, VatAmount, ShippingCost, GrandTotal,
                CustomerPONumber, Notes, Status, CreatedBy,
                ShowDiscountInPrint, ShowVatInPrint, ShowShippingInPrint,
                DesignFee, ShowDesignFeeInPrint, DepositPercent, DepositAmount, ShowDepositInPrint,
                PreparedBy, SalesManager, ProductionManager
            )
            OUTPUT INSERTED.SalesOrderID
            VALUES (
                @soNo, @quotationId, @quotationNo, @contractId, @docType,
                @customerName, @address, @phone, @taxId,
                @orderDate, @deliveryDate,
                @subTotal, @discountPercent, @discountAmount, @afterDiscount,
                @vatRate, @vatAmount, @shippingCost, @grandTotal,
                @customerPO, @notes, N'ร่าง', @createdBy,
                @showDiscountInPrint, @showVatInPrint, @showShippingInPrint,
                @designFee, @showDesignFeeInPrint, @depositPercent, @depositAmount, @showDepositInPrint,
                @preparedBy, @salesManager, @productionManager
            )
        `);

        const salesOrderId = headerResult.recordset[0].SalesOrderID;

        // Insert Items
        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const itemReq = new sql.Request(transaction);
                itemReq.input('soId', sql.Int, salesOrderId);
                itemReq.input('order', sql.Int, i + 1);
                itemReq.input('name', sql.NVarChar, item.name);
                itemReq.input('qty', sql.Decimal(18, 2), item.qty || 0);
                itemReq.input('unit', sql.NVarChar, item.unit || 'ชิ้น');
                itemReq.input('price', sql.Decimal(18, 2), item.price || 0);
                itemReq.input('amount', sql.Decimal(18, 2), item.amount || 0);
                itemReq.input('isPromo', sql.Bit, item.isPromo ? 1 : 0);
                itemReq.input('promoType', sql.NVarChar, item.promoType || null);
                itemReq.input('promoMultiplier', sql.Int, item.promoMultiplier || 1);
                itemReq.input('basePromoName', sql.NVarChar, item.basePromoName || null);

                await itemReq.query(`
                    INSERT INTO SalesOrderItem (SalesOrderID, ItemOrder, ItemName, Qty, Unit, Price, Amount, IsPromo, PromoType, PromoMultiplier, BasePromoName)
                    VALUES (@soId, @order, @name, @qty, @unit, @price, @amount, @isPromo, @promoType, @promoMultiplier, @basePromoName)
                `);
            }
        }

        // Update Quotation status if created from QT
        if (quotationId) {
            const updateQT = new sql.Request(transaction);
            updateQT.input('qtId', sql.Int, quotationId);
            await updateQT.query(`
                UPDATE Quotation SET Status = N'สร้าง SO แล้ว' WHERE QuotationID = @qtId
            `);
        }

        await transaction.commit();

        // ── Auto-Upgrade Customer Status (Prospect → Active) ──
        if (customerName && customerName.trim()) {
            try {
                const custCheck = await pool.request()
                    .input('custName', sql.NVarChar, customerName.trim())
                    .query(`SELECT CustomerID, CustomerStatusID FROM Customer WHERE CustomerName = @custName`);

                if (custCheck.recordset.length > 0) {
                    const cust = custCheck.recordset[0];
                    if (cust.CustomerStatusID === 3) {
                        await pool.request()
                            .input('custId', sql.Int, cust.CustomerID)
                            .query(`UPDATE Customer SET CustomerStatusID = 1 WHERE CustomerID = @custId`);
                        console.log(`✅ Customer "${customerName}" upgraded from Prospect → Active (SO created)`);
                    }
                } else {
                    const { generateSequence, getMonthPrefix } = require('../utils/sequence');
                    const custCode = await generateSequence(pool, 'Customer', 'CustomerCode', `CUST-${getMonthPrefix()}`, 3);

                    await pool.request()
                        .input('tid', sql.Int, 1)           // 1 = Retail (default)
                        .input('sid', sql.Int, 1)           // 1 = Active (ซื้อแล้ว)
                        .input('code', sql.NVarChar, custCode)
                        .input('name', sql.NVarChar, customerName.trim())
                        .input('phone', sql.NVarChar, phone || null)
                        .input('address', sql.NVarChar, address || null)
                        .input('tax', sql.NVarChar, taxId || null)
                        .input('source', sql.NVarChar, 'sales_order')
                        .query(`
                            INSERT INTO Customer (CustomerTypeID, CustomerStatusID, CustomerCode, CustomerName, Phone, Address, TaxID, Source)
                            VALUES (@tid, @sid, @code, @name, @phone, @address, @tax, @source)
                        `);
                    console.log(`✅ Auto-created customer "${customerName}" as Active from SO (manual)`);
                }
            } catch (custErr) {
                console.error('⚠️ Auto-manage customer warning:', custErr.message);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Sales Order created successfully',
            salesOrderId,
            salesOrderNo: soNumber
        });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error creating sales order:', err);
        res.status(500).json({ success: false, message: 'Failed to create sales order: ' + err.message, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PUT /:id  — แก้ไข SO
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', authorizeRoles('admin', 'executive', 'sales'), async (req, res) => {
    const soId = req.params.id;
    const {
        customerName, address, phone, taxId,
        orderDate, deliveryDate,
        subTotal, discountPercent, discountAmount, afterDiscount,
        vatRate, vatAmount, shippingCost, grandTotal,
        customerPONumber, notes, status, contractId, items,
        showDiscountInPrint, showVatInPrint, showShippingInPrint,
        designFee, showDesignFeeInPrint,
        depositPercent, depositAmount, showDepositInPrint,
        preparedBy, salesManager, productionManager
    } = req.body;

    let transaction;

    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);
        request.input('id', sql.Int, soId);

        // 1. Backup Current Version to History Table before modifying
        const backupReq = new sql.Request(transaction);
        backupReq.input('id', sql.Int, soId);
        const backupResult = await backupReq.query(`
            INSERT INTO SalesOrderHistory (
                SalesOrderID, Revision, SalesOrderNo, QuotationID, QuotationNo, ContractID, DocType,
                CustomerName, Address, Phone, TaxID, OrderDate, DeliveryDate, SubTotal, DiscountPercent,
                DiscountAmount, AfterDiscount, VatRate, VatAmount, ShippingCost, GrandTotal, DepositPercent,
                DepositAmount, DesignFee, ShowDiscountInPrint, ShowVatInPrint, ShowShippingInPrint,
                ShowDesignFeeInPrint, ShowDepositInPrint, CustomerPONumber, Notes, Status, PreparedBy,
                SalesManager, ProductionManager, ArchivedAt
            )
            OUTPUT INSERTED.HistoryID
            SELECT 
                SalesOrderID, ISNULL(Revision, 0), SalesOrderNo, QuotationID, QuotationNo, ContractID, DocType,
                CustomerName, Address, Phone, TaxID, OrderDate, DeliveryDate, SubTotal, DiscountPercent,
                DiscountAmount, AfterDiscount, VatRate, VatAmount, ShippingCost, GrandTotal, DepositPercent,
                DepositAmount, DesignFee, ShowDiscountInPrint, ShowVatInPrint, ShowShippingInPrint,
                ShowDesignFeeInPrint, ShowDepositInPrint, CustomerPONumber, Notes, Status, PreparedBy,
                SalesManager, ProductionManager, GETDATE()
            FROM SalesOrder
            WHERE SalesOrderID = @id
        `);

        if (backupResult.recordset.length > 0) {
            const historyId = backupResult.recordset[0].HistoryID;
            const backupItemsReq = new sql.Request(transaction);
            backupItemsReq.input('historyId', sql.Int, historyId);
            backupItemsReq.input('id', sql.Int, soId);
            await backupItemsReq.query(`
                INSERT INTO SalesOrderItemHistory (
                    HistoryID, ItemOrder, ItemName, Qty, Unit, Price, Amount, IsPromo, PromoType, PromoMultiplier, BasePromoName
                )
                SELECT @historyId, ItemOrder, ItemName, Qty, Unit, Price, Amount, IsPromo, PromoType, PromoMultiplier, BasePromoName
                FROM SalesOrderItem
                WHERE SalesOrderID = @id
            `);
        }

        request.input('customerName', sql.NVarChar, customerName);
        request.input('address', sql.NVarChar, address || '');
        request.input('phone', sql.NVarChar, phone || '');
        request.input('taxId', sql.NVarChar, taxId || '');
        request.input('orderDate', sql.Date, orderDate || new Date());
        request.input('deliveryDate', sql.Date, deliveryDate || null);
        request.input('subTotal', sql.Decimal(18, 2), subTotal || 0);
        request.input('discountPercent', sql.Int, discountPercent || 0);
        request.input('discountAmount', sql.Decimal(18, 2), discountAmount || 0);
        request.input('afterDiscount', sql.Decimal(18, 2), afterDiscount || 0);
        request.input('vatRate', sql.Int, vatRate || 0);
        request.input('vatAmount', sql.Decimal(18, 2), vatAmount || 0);
        request.input('shippingCost', sql.Decimal(18, 2), shippingCost || 0);
        request.input('grandTotal', sql.Decimal(18, 2), grandTotal || 0);
        request.input('customerPO', sql.NVarChar, customerPONumber || null);
        request.input('notes', sql.NVarChar, notes || '');
        request.input('status', sql.NVarChar, status || 'ร่าง');
        request.input('contractId', sql.Int, contractId || null);

        request.input('showDiscountInPrint', sql.Bit, showDiscountInPrint ? 1 : 0);
        request.input('showVatInPrint', sql.Bit, showVatInPrint ? 1 : 0);
        request.input('showShippingInPrint', sql.Bit, showShippingInPrint ? 1 : 0);
        request.input('designFee', sql.Decimal(18, 2), designFee || 0);
        request.input('showDesignFeeInPrint', sql.Bit, showDesignFeeInPrint ? 1 : 0);
        request.input('depositPercent', sql.NVarChar, depositPercent ? String(depositPercent) : '0');
        request.input('depositAmount', sql.Decimal(18, 2), depositAmount || 0);
        request.input('showDepositInPrint', sql.Bit, showDepositInPrint ? 1 : 0);
        request.input('preparedBy', sql.NVarChar, preparedBy || null);
        request.input('salesManager', sql.NVarChar, salesManager || null);
        request.input('productionManager', sql.NVarChar, productionManager || null);

        await request.query(`
            UPDATE SalesOrder SET
                Revision = ISNULL(Revision, 0) + 1,
                CustomerName = @customerName, Address = @address, Phone = @phone, TaxID = @taxId,
                OrderDate = @orderDate, DeliveryDate = @deliveryDate,
                SubTotal = @subTotal, DiscountPercent = @discountPercent,
                DiscountAmount = @discountAmount, AfterDiscount = @afterDiscount,
                VatRate = @vatRate, VatAmount = @vatAmount,
                ShippingCost = @shippingCost, GrandTotal = @grandTotal,
                CustomerPONumber = @customerPO, Notes = @notes, Status = @status,
                ContractID = @contractId,
                ShowDiscountInPrint = @showDiscountInPrint, ShowVatInPrint = @showVatInPrint, ShowShippingInPrint = @showShippingInPrint,
                DesignFee = @designFee, ShowDesignFeeInPrint = @showDesignFeeInPrint,
                DepositPercent = @depositPercent, DepositAmount = @depositAmount, ShowDepositInPrint = @showDepositInPrint,
                PreparedBy = @preparedBy, SalesManager = @salesManager, ProductionManager = @productionManager
            WHERE SalesOrderID = @id
        `);

        // Delete old items & re-insert
        const deleteReq = new sql.Request(transaction);
        deleteReq.input('id', sql.Int, soId);
        await deleteReq.query(`DELETE FROM SalesOrderItem WHERE SalesOrderID = @id`);

        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const itemReq = new sql.Request(transaction);
                itemReq.input('soId', sql.Int, soId);
                itemReq.input('order', sql.Int, i + 1);
                itemReq.input('name', sql.NVarChar, item.name);
                itemReq.input('qty', sql.Decimal(18, 2), item.qty || 0);
                itemReq.input('unit', sql.NVarChar, item.unit || 'ชิ้น');
                itemReq.input('price', sql.Decimal(18, 2), item.price || 0);
                itemReq.input('amount', sql.Decimal(18, 2), item.amount || 0);
                itemReq.input('isPromo', sql.Bit, item.isPromo ? 1 : 0);
                itemReq.input('promoType', sql.NVarChar, item.promoType || null);
                itemReq.input('promoMultiplier', sql.Int, item.promoMultiplier || 1);
                itemReq.input('basePromoName', sql.NVarChar, item.basePromoName || null);

                await itemReq.query(`
                    INSERT INTO SalesOrderItem (SalesOrderID, ItemOrder, ItemName, Qty, Unit, Price, Amount, IsPromo, PromoType, PromoMultiplier, BasePromoName)
                    VALUES (@soId, @order, @name, @qty, @unit, @price, @amount, @isPromo, @promoType, @promoMultiplier, @basePromoName)
                `);
            }
        }

        await transaction.commit();
        res.json({ success: true, message: 'Sales Order updated successfully' });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error updating sales order:', err);
        res.status(500).json({ success: false, message: 'Failed to update sales order: ' + err.message, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4.5 PATCH /:id/status  — อัปเดตสถานะ SO อย่างเดียว (มีระบบป้องกันถ้าออก Job ผลิตแล้ว)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', authorizeRoles('admin', 'executive', 'sales'), async (req, res) => {
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required' });
    }
    try {
        const pool = await poolPromise;

        // 1. Fetch current SO details
        const soCheck = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`SELECT SalesOrderID, SalesOrderNo, Status FROM SalesOrder WHERE SalesOrderID = @id`);

        if (soCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Sales Order not found' });
        }

        const currentSO = soCheck.recordset[0];

        // 2. Safety Control: If attempting to revert to 'ร่าง' (Draft)
        if (status === 'ร่าง') {
            // Check if status is already in advanced production states
            if (['วางแผนแล้ว', 'กำลังผลิต', 'เสร็จสิ้น', 'จัดส่งแล้ว'].includes(currentSO.Status)) {
                return res.status(400).json({
                    success: false,
                    message: `ไม่สามารถดึงกลับเป็นร่างได้ เนื่องจากรายการนี้อยู่ในสถานะ "${currentSO.Status}" (เข้าสู่กระบวนการผลิตแล้ว)`
                });
            }

            // Check if there are active production jobs in Planner linked to this SO
            const jobCheck = await pool.request()
                .input('soNo', sql.NVarChar, `%${currentSO.SalesOrderNo}%`)
                .query(`
                    SELECT TOP 1 PlannerID, Status 
                    FROM Planner 
                    WHERE (Notes LIKE @soNo OR PlannerID LIKE @soNo) AND Status != N'ยกเลิก'
                `);

            if (jobCheck.recordset.length > 0) {
                const activeJob = jobCheck.recordset[0];
                return res.status(400).json({
                    success: false,
                    message: `ไม่สามารถดึงกลับเป็นร่างได้ เนื่องจากรายการนี้ถูกออกใบสั่งผลิต (Job Order: ${activeJob.PlannerID}) แล้ว กรุณาติดต่อฝ่าย Planner เพื่อยกเลิก Job ผลิตก่อน`
                });
            }
        }

        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('status', sql.NVarChar, status)
            .query(`UPDATE SalesOrder SET Status = @status WHERE SalesOrderID = @id`);

        res.json({ success: true, message: 'Status updated successfully' });
    } catch (err) {
        console.error('Error updating SO status:', err);
        res.status(500).json({ success: false, message: 'Failed to update status', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DELETE /:id  — ลบ SO
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authorizeRoles('admin', 'executive', 'sales'), async (req, res) => {
    try {
        const pool = await poolPromise;

        // Get QuotationID before deleting (to revert QT status)
        const soResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`SELECT QuotationID FROM SalesOrder WHERE SalesOrderID = @id`);

        if (soResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Sales Order not found' });
        }

        const quotationId = soResult.recordset[0].QuotationID;

        // Delete SO (CASCADE will delete items)
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`DELETE FROM SalesOrder WHERE SalesOrderID = @id`);

        // Revert Quotation status if was linked
        if (quotationId) {
            await pool.request()
                .input('qtId', sql.Int, quotationId)
                .query(`UPDATE Quotation SET Status = N'อนุมัติ' WHERE QuotationID = @qtId`);
        }

        res.json({ success: true, message: 'Sales Order deleted successfully' });

    } catch (err) {
        console.error('Error deleting sales order:', err);
        res.status(500).json({ success: false, message: 'Failed to delete sales order', error: err.message });
    }
});

module.exports = router;

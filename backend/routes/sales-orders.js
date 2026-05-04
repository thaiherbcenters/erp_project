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
// 1. GET /  — ดึงรายการ SO ทั้งหมด
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                SalesOrderID, SalesOrderNo, QuotationNo, CustomerName, 
                OrderDate, DeliveryDate, GrandTotal, CustomerPONumber,
                Status, CreatedBy, CreatedAt
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

        const headerResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`SELECT * FROM SalesOrder WHERE SalesOrderID = @id`);

        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Sales Order not found' });
        }

        const itemsResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`SELECT * FROM SalesOrderItem WHERE SalesOrderID = @id ORDER BY ItemOrder ASC`);

        res.json({
            success: true,
            data: {
                ...headerResult.recordset[0],
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
router.post('/', async (req, res) => {
    const {
        quotationId, quotationNo, docType,
        customerName, address, phone, taxId,
        orderDate, deliveryDate,
        subTotal, discountPercent, discountAmount, afterDiscount,
        vatRate, vatAmount, shippingCost, grandTotal,
        customerPONumber, notes, createdBy, items
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

        const headerResult = await request.query(`
            INSERT INTO SalesOrder (
                SalesOrderNo, QuotationID, QuotationNo, DocType,
                CustomerName, Address, Phone, TaxID,
                OrderDate, DeliveryDate,
                SubTotal, DiscountPercent, DiscountAmount, AfterDiscount,
                VatRate, VatAmount, ShippingCost, GrandTotal,
                CustomerPONumber, Notes, Status, CreatedBy
            )
            OUTPUT INSERTED.SalesOrderID
            VALUES (
                @soNo, @quotationId, @quotationNo, @docType,
                @customerName, @address, @phone, @taxId,
                @orderDate, @deliveryDate,
                @subTotal, @discountPercent, @discountAmount, @afterDiscount,
                @vatRate, @vatAmount, @shippingCost, @grandTotal,
                @customerPO, @notes, N'ร่าง', @createdBy
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

                await itemReq.query(`
                    INSERT INTO SalesOrderItem (SalesOrderID, ItemOrder, ItemName, Qty, Unit, Price, Amount)
                    VALUES (@soId, @order, @name, @qty, @unit, @price, @amount)
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
        res.status(201).json({
            success: true,
            message: 'Sales Order created successfully',
            salesOrderId,
            salesOrderNo: soNumber
        });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error creating sales order:', err);
        res.status(500).json({ success: false, message: 'Failed to create sales order', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PUT /:id  — แก้ไข SO
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    const soId = req.params.id;
    const {
        customerName, address, phone, taxId,
        orderDate, deliveryDate,
        subTotal, discountPercent, discountAmount, afterDiscount,
        vatRate, vatAmount, shippingCost, grandTotal,
        customerPONumber, notes, status, items
    } = req.body;

    let transaction;

    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);
        request.input('id', sql.Int, soId);
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

        await request.query(`
            UPDATE SalesOrder SET
                CustomerName = @customerName, Address = @address, Phone = @phone, TaxID = @taxId,
                OrderDate = @orderDate, DeliveryDate = @deliveryDate,
                SubTotal = @subTotal, DiscountPercent = @discountPercent,
                DiscountAmount = @discountAmount, AfterDiscount = @afterDiscount,
                VatRate = @vatRate, VatAmount = @vatAmount,
                ShippingCost = @shippingCost, GrandTotal = @grandTotal,
                CustomerPONumber = @customerPO, Notes = @notes, Status = @status
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

                await itemReq.query(`
                    INSERT INTO SalesOrderItem (SalesOrderID, ItemOrder, ItemName, Qty, Unit, Price, Amount)
                    VALUES (@soId, @order, @name, @qty, @unit, @price, @amount)
                `);
            }
        }

        await transaction.commit();
        res.json({ success: true, message: 'Sales Order updated successfully' });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error updating sales order:', err);
        res.status(500).json({ success: false, message: 'Failed to update sales order', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4.5 PATCH /:id/status  — อัปเดตสถานะ SO อย่างเดียว
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required' });
    }
    try {
        const pool = await poolPromise;
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
router.delete('/:id', async (req, res) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET /from-quotation/:qtId  — ดึงข้อมูล Quotation สำหรับ Auto-fill SO
// ─────────────────────────────────────────────────────────────────────────────
router.get('/from-quotation/:qtId', async (req, res) => {
    try {
        const pool = await poolPromise;

        const headerResult = await pool.request()
            .input('id', sql.Int, req.params.qtId)
            .query(`SELECT * FROM Quotation WHERE QuotationID = @id`);

        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        const itemsResult = await pool.request()
            .input('id', sql.Int, req.params.qtId)
            .query(`SELECT * FROM QuotationItem WHERE QuotationID = @id ORDER BY ItemOrder ASC`);

        res.json({
            success: true,
            data: {
                ...headerResult.recordset[0],
                items: itemsResult.recordset
            }
        });
    } catch (err) {
        console.error('Error fetching quotation for SO:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch quotation', error: err.message });
    }
});

module.exports = router;

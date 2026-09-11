/**
 * =============================================================================
 * accounts.js — Accounts & Deposit Tracking API Routes
 * =============================================================================
 * จัดการข้อมูลบัญชีและการติดตามเงินมัดจำ / ลูกหนี้การค้า (AR):
 *   - GET    /deposits                 : รายการมัดจำจากใบเสนอราคา (Quotation Deposits)
 *   - PATCH  /deposits/:id/status      : อัปเดตสถานะการรับชำระมัดจำ
 *   - GET    /quotation-for-billing/:id: ดึงข้อมูลใบเสนอราคาเพื่อนำไปเปิดฟอร์มสร้างใบวางบิล
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /deposits — รายการมัดจำจากใบเสนอราคา
// ─────────────────────────────────────────────────────────────────────────────
router.get('/deposits', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { search, status, dateFrom, dateTo, createdBy, subType, billingStatus, receiptStatus } = req.query;

        let whereClauses = [
            `((q.DepositAmount IS NOT NULL AND q.DepositAmount > 0) OR (q.DepositPercent IS NOT NULL AND q.DepositPercent <> '0' AND q.DepositPercent <> ''))`
        ];
        const request = pool.request();

        if (search && search.trim()) {
            whereClauses.push(`(
                q.QuotationNo LIKE @search OR
                q.CustomerName LIKE @search OR
                q.Phone LIKE @search OR
                q.TaxID LIKE @search
            )`);
            request.input('search', sql.NVarChar, `%${search.trim()}%`);
        }

        if (status && status !== 'ทั้งหมด' && status !== 'all' && status.trim() !== '') {
            whereClauses.push(`COALESCE(q.DepositStatus, N'รอมัดจำ') = @status`);
            request.input('status', sql.NVarChar, status.trim());
        }

        if (dateFrom) {
            whereClauses.push(`q.BillDate >= @dateFrom`);
            request.input('dateFrom', sql.Date, dateFrom);
        }

        if (dateTo) {
            whereClauses.push(`q.BillDate <= @dateTo`);
            request.input('dateTo', sql.Date, dateTo);
        }

        if (createdBy) {
            whereClauses.push(`q.CreatedBy = @createdBy`);
            request.input('createdBy', sql.Int, parseInt(createdBy));
        }

        if (billingStatus) {
            if (billingStatus === 'pending') {
                whereClauses.push(`bi.BillingInvoiceID IS NULL`);
            } else if (billingStatus === 'completed') {
                whereClauses.push(`bi.BillingInvoiceID IS NOT NULL`);
            }
        }

        if (receiptStatus) {
            if (receiptStatus === 'pending') {
                whereClauses.push(`re_dep.ReceiptID IS NULL AND re_fin.ReceiptID IS NULL`);
            } else if (receiptStatus === 'deposit_paid') {
                whereClauses.push(`re_dep.ReceiptID IS NOT NULL`);
            } else if (receiptStatus === 'fully_paid') {
                whereClauses.push(`re_fin.ReceiptID IS NOT NULL`);
            }
        }

        if (subType) {
            if (subType === 'normal') {
                whereClauses.push(`(q.DocType IS NULL OR q.DocType NOT LIKE '%fda%')`);
            } else if (subType === 'fda') {
                whereClauses.push(`q.DocType LIKE '%fda%'`);
            } else {
                whereClauses.push(`q.DocType = @subType`);
                request.input('subType', sql.NVarChar, subType);
            }
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

        const query = `
            SELECT 
                q.QuotationID,
                q.QuotationNo,
                q.DocType,
                q.CustomerID,
                q.CustomerName,
                q.Address,
                q.Phone,
                q.TaxID,
                q.BillDate,
                q.ValidUntil,
                q.SubTotal,
                q.DiscountPercent,
                q.DiscountAmount,
                q.GrandTotal,
                q.DepositPercent,
                q.DepositAmount,
                q.RemainingAmount,
                COALESCE(q.DepositStatus, N'รอมัดจำ') AS DepositStatus,
                COALESCE(q.PaidDepositAmount, 0) AS PaidDepositAmount,
                q.Status AS QuotationStatus,
                q.CreatedAt,
                q.CreatedBy,
                u.display_name AS CreatedByName,
                bi.BillingInvoiceID,
                bi.BillingInvoiceNo,
                bi.Status AS BillingInvoiceStatus,
                bi.GrandTotal AS BillingInvoiceGrandTotal,
                bi.RemainingAmount AS BillingInvoiceRemaining,
                re_dep.ReceiptID AS DepositReceiptID,
                re_dep.ReceiptNo AS DepositReceiptNo,
                re_dep.Status AS DepositReceiptStatus,
                re_dep.GrandTotal AS DepositReceiptGrandTotal,
                re_fin.ReceiptID AS FinalReceiptID,
                re_fin.ReceiptNo AS FinalReceiptNo,
                re_fin.Status AS FinalReceiptStatus,
                re_fin.GrandTotal AS FinalReceiptGrandTotal,
                COALESCE(re_fin.ReceiptID, re_dep.ReceiptID) AS ReceiptID,
                COALESCE(re_fin.ReceiptNo, re_dep.ReceiptNo) AS ReceiptNo,
                COALESCE(re_fin.Status, re_dep.Status) AS ReceiptStatus,
                COALESCE(re_fin.GrandTotal, re_dep.GrandTotal) AS ReceiptGrandTotal
            FROM Quotation q
            LEFT JOIN Users u ON q.CreatedBy = u.user_id
            OUTER APPLY (
                SELECT TOP 1 
                    b.BillingInvoiceID, 
                    b.BillingInvoiceNo, 
                    b.Status,
                    b.GrandTotal,
                    b.RemainingAmount
                FROM BillingInvoice b
                WHERE b.Notes LIKE '%' + q.QuotationNo + '%'
                   OR (q.ContractID IS NOT NULL AND b.ContractID = q.ContractID)
                ORDER BY b.BillingInvoiceID DESC
            ) bi
            OUTER APPLY (
                SELECT TOP 1 
                    r.ReceiptID, 
                    r.ReceiptNo, 
                    r.Status, 
                    r.GrandTotal
                FROM Receipt r
                WHERE (
                    r.CustomerOrder LIKE '%' + q.QuotationNo + '%' 
                    OR r.Notes LIKE '%' + q.QuotationNo + '%' 
                    OR (q.ContractID IS NOT NULL AND r.ContractID = q.ContractID)
                )
                  AND (
                      r.Notes LIKE '%มัดจำ%' 
                      OR EXISTS (SELECT 1 FROM ReceiptItem ri WHERE ri.ReceiptID = r.ReceiptID AND ri.ItemName LIKE '%มัดจำ%')
                      OR (bi.BillingInvoiceNo IS NOT NULL AND r.Notes NOT LIKE '%' + bi.BillingInvoiceNo + '%' AND (r.CustomerOrder IS NULL OR r.CustomerOrder NOT LIKE '%' + bi.BillingInvoiceNo + '%')) 
                      OR bi.BillingInvoiceNo IS NULL
                  )
                ORDER BY r.ReceiptID ASC
            ) re_dep
            OUTER APPLY (
                SELECT TOP 1 
                    r.ReceiptID, 
                    r.ReceiptNo, 
                    r.Status, 
                    r.GrandTotal
                FROM Receipt r
                WHERE (
                    (bi.BillingInvoiceNo IS NOT NULL AND (r.Notes LIKE '%' + bi.BillingInvoiceNo + '%' OR r.CustomerOrder LIKE '%' + bi.BillingInvoiceNo + '%')) 
                    OR (
                        (r.CustomerOrder LIKE '%' + q.QuotationNo + '%' OR r.Notes LIKE '%' + q.QuotationNo + '%' OR (q.ContractID IS NOT NULL AND r.ContractID = q.ContractID))
                        AND r.ReceiptID <> ISNULL(re_dep.ReceiptID, 0)
                        AND (
                            r.ShowDepositInPrint = 1
                            OR r.Notes LIKE '%ส่วนที่เหลือ%' 
                            OR r.Notes LIKE '%ปิดยอด%' 
                            OR NOT EXISTS (SELECT 1 FROM ReceiptItem ri WHERE ri.ReceiptID = r.ReceiptID AND ri.ItemName LIKE '%มัดจำ%')
                        )
                    )
                )
                ORDER BY r.ReceiptID DESC
            ) re_fin
            ${whereSql}
            ORDER BY q.QuotationID DESC
        `;

        const result = await request.query(query);
        const rows = result.recordset || [];

        // คำนวณสรุปภาพรวม (Summary Stats)
        let totalGrandTotal = 0;
        let totalDepositRequired = 0;
        let totalPaid = 0;
        let totalRemaining = 0;
        let countPending = 0;
        let countPaid = 0;
        let countCompleted = 0;

        const data = rows.map(row => {
            const grandTotal = Number(row.GrandTotal || 0);
            const depositAmount = Number(row.DepositAmount || 0);
            const paid = Number(row.PaidDepositAmount || 0);
            const remaining = Math.max(0, grandTotal - paid);
            const depStatus = row.DepositStatus || 'รอมัดจำ';

            totalGrandTotal += grandTotal;
            totalDepositRequired += depositAmount;
            totalPaid += paid;
            totalRemaining += remaining;

            if (depStatus === 'ชำระครบถ้วน') countCompleted++;
            else if (depStatus === 'ชำระมัดจำแล้ว') countPaid++;
            else countPending++;

            return {
                ...row,
                GrandTotal: grandTotal,
                DepositAmount: depositAmount,
                PaidDepositAmount: paid,
                RemainingAmount: remaining,
                DepositStatus: depStatus,
                BillingInvoiceID: row.BillingInvoiceID || null,
                BillingInvoiceNo: row.BillingInvoiceNo || null,
                DepositReceiptID: row.DepositReceiptID || null,
                DepositReceiptNo: row.DepositReceiptNo || null,
                FinalReceiptID: row.FinalReceiptID || null,
                FinalReceiptNo: row.FinalReceiptNo || null
            };
        });

        res.json({
            success: true,
            data,
            summary: {
                totalGrandTotal,
                totalDepositRequired,
                totalPaid,
                totalRemaining,
                countPending,
                countPaid,
                countCompleted,
                totalRecords: rows.length
            }
        });
    } catch (err) {
        console.error('Error fetching deposits:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch deposits', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PATCH /deposits/:id/status — อัปเดตสถานะเงินมัดจำ
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/deposits/:id/status', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const depositStatus = req.body.depositStatus || req.body.status;
        const paidDepositAmount = req.body.paidDepositAmount !== undefined ? req.body.paidDepositAmount : req.body.paidAmount;

        if (!depositStatus) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุสถานะมัดจำ' });
        }

        const request = pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.NVarChar, depositStatus);

        let updateSql = `UPDATE Quotation SET DepositStatus = @status, UpdatedAt = GETDATE()`;

        if (paidDepositAmount !== undefined && paidDepositAmount !== null) {
            request.input('paidAmount', sql.Decimal(18, 2), parseFloat(paidDepositAmount) || 0);
            updateSql += `, PaidDepositAmount = @paidAmount`;
        }

        updateSql += ` WHERE QuotationID = @id`;

        await request.query(updateSql);

        res.json({ success: true, message: 'อัปเดตสถานะมัดจำเรียบร้อยแล้ว' });
    } catch (err) {
        console.error('Error updating deposit status:', err);
        res.status(500).json({ success: false, message: 'Failed to update deposit status', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /quotation-for-billing/:id — ดึงข้อมูลใบเสนอราคาเพื่อนำไปสร้างใบวางบิล
// ─────────────────────────────────────────────────────────────────────────────
router.get('/quotation-for-billing/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;

        // Get Quotation Header
        const headerRes = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT * FROM Quotation WHERE QuotationID = @id`);

        if (headerRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        const q = headerRes.recordset[0];

        // Get Quotation Items
        const itemsRes = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT * FROM QuotationItem WHERE QuotationID = @id ORDER BY ItemOrder ASC`);

        const items = (itemsRes.recordset || []).map((it, idx) => ({
            id: idx + 1,
            name: it.ItemName || '',
            qty: parseFloat(it.Qty) || 1,
            unit: it.Unit || 'ชิ้น',
            price: parseFloat(it.Price) || 0,
            amount: parseFloat(it.Amount) || 0,
            image: it.ImageURL || null,
            isPromo: !!it.IsPromo,
            promoMultiplier: it.PromoMultiplier || 1
        }));

        res.json({
            success: true,
            data: {
                quotationId: q.QuotationID,
                quotationNo: q.QuotationNo,
                docType: q.DocType ? q.DocType.replace('quotation_', 'billing_invoice_') : 'billing_invoice_thc',
                customerId: q.CustomerID,
                customerName: q.CustomerName,
                address: q.Address,
                phone: q.Phone,
                taxId: q.TaxID,
                contractId: q.ContractID,
                bankAccount: q.BankAccount,
                subTotal: Number(q.SubTotal || 0),
                discountPercent: q.DiscountPercent || 0,
                discountAmount: Number(q.DiscountAmount || 0),
                showDiscountInPrint: q.ShowDiscountInPrint !== undefined ? !!q.ShowDiscountInPrint : false,
                vatRate: q.VatRate !== undefined ? q.VatRate : 7,
                vatAmount: Number(q.VatAmount || 0),
                showVatInPrint: q.ShowVatInPrint !== undefined ? !!q.ShowVatInPrint : true,
                shippingCost: Number(q.ShippingCost || 0),
                showShippingInPrint: q.ShowShippingInPrint !== undefined ? !!q.ShowShippingInPrint : false,
                designFee: Number(q.DesignFee || 0),
                showDesignFeeInPrint: q.ShowDesignFeeInPrint !== undefined ? !!q.ShowDesignFeeInPrint : false,
                grandTotal: Number(q.GrandTotal || 0),
                depositPercent: q.DepositPercent || '0',
                depositAmount: Number(q.DepositAmount || 0),
                remainingAmount: Number(q.RemainingAmount || (q.GrandTotal - (q.PaidDepositAmount || q.DepositAmount || 0))),
                paidDepositAmount: Number(q.PaidDepositAmount || 0),
                showDepositInPrint: true,
                depositStatus: q.DepositStatus || 'รอมัดจำ',
                notes: `<p><strong>อ้างอิงใบเสนอราคาเลขที่ :</strong> ${q.QuotationNo}</p><p>เรียกเก็บยอดคงเหลือส่วนที่เหลือจากการชำระมัดจำ</p>`,
                items
            }
        });
    } catch (err) {
        console.error('Error fetching quotation for billing:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch quotation for billing', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /quotation-for-receipt/:id — ดึงข้อมูลใบเสนอราคา/ใบวางบิลเพื่อนำไปสร้างใบเสร็จรับเงิน
// ─────────────────────────────────────────────────────────────────────────────
router.get('/quotation-for-receipt/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;

        const headerRes = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    q.*,
                    bi.BillingInvoiceID,
                    bi.BillingInvoiceNo,
                    bi.RemainingAmount AS BiRemainingAmount
                FROM Quotation q
                OUTER APPLY (
                    SELECT TOP 1 b.BillingInvoiceID, b.BillingInvoiceNo, b.RemainingAmount
                    FROM BillingInvoice b
                    WHERE b.Notes LIKE '%' + q.QuotationNo + '%'
                       OR (q.ContractID IS NOT NULL AND b.ContractID = q.ContractID)
                    ORDER BY b.BillingInvoiceID DESC
                ) bi
                WHERE q.QuotationID = @id
            `);

        if (headerRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        const q = headerRes.recordset[0];
        const type = req.query.type || 'deposit'; // 'deposit' | 'final'

        const itemsRes = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT * FROM QuotationItem WHERE QuotationID = @id ORDER BY ItemOrder ASC`);

        const grandTotal = Number(q.GrandTotal || 0);
        const depositPercentNum = parseFloat(q.DepositPercent) || 0;
        const depositAmount = Number(q.DepositAmount || 0) || (depositPercentNum > 0 ? (grandTotal * depositPercentNum / 100) : 0);
        const paidDepositAmount = Number(q.PaidDepositAmount || 0) || (q.DepositStatus === 'ชำระมัดจำแล้ว' ? depositAmount : 0);
        const remainingAmount = Math.max(0, grandTotal - paidDepositAmount);

        let items = [];
        let subTotal = 0;
        let vatAmount = 0;
        let receiptGrandTotal = 0;
        let notes = '';

        const vatRate = q.VatRate !== undefined ? Number(q.VatRate) : 7;
        const hasVat = (q.ShowVatInPrint || vatRate > 0) && vatRate > 0;

        const defaultReceiptNotes = `<p><span style="font-size: 12px;"><strong>หมายเหตุ:</strong> ใบเสร็จรับเงินฉบับนี้จะถือว่าถูกต้องและสมบูรณ์ต่อเมื่อมีลายเซ็นของผู้มีอำนาจและเมื่อเรียกเก็บเงินตามบิลได้เรียบร้อย</span></p>`;

        if (type === 'deposit' && depositAmount > 0) {
            // ── 1. กรณีสร้างใบเสร็จรับเงินมัดจำ (Deposit Receipt: RE มัดจำ) ──
            receiptGrandTotal = depositAmount;
            subTotal = depositAmount;
            vatAmount = 0;

            items = [
                {
                    id: 1,
                    name: 'เงินมัดจำสินค้า',
                    qty: '',
                    unit: '',
                    price: '',
                    discount: '',
                    amount: depositAmount,
                    manualTotal: depositAmount,
                    isPromo: false
                }
            ];

            notes = defaultReceiptNotes;
        } else if (type === 'final' && depositAmount > 0) {
            // ── 2. กรณีสร้างใบเสร็จรับเงินส่วนที่เหลือ/ปิดยอด (Final Receipt: RE ปิดยอด) ──
            items = (itemsRes.recordset || []).map((it, idx) => ({
                id: idx + 1,
                name: it.ItemName || '',
                qty: (it.Qty !== null && it.Qty !== undefined && it.Qty !== '') ? parseFloat(it.Qty) : '',
                unit: it.Unit || 'ชิ้น',
                price: (it.Price !== null && it.Price !== undefined && it.Price !== '') ? parseFloat(it.Price) : '',
                discount: it.Discount || '',
                amount: (it.Amount !== null && it.Amount !== undefined) ? parseFloat(it.Amount) : 0,
                image: it.ImageURL || null,
                isPromo: !!it.IsPromo,
                promoMultiplier: it.PromoMultiplier || 1
            }));

            subTotal = Number(q.SubTotal || 0);
            vatAmount = Number(q.VatAmount || 0);
            receiptGrandTotal = grandTotal;
            notes = defaultReceiptNotes;
        } else {
            // ── 3. กรณีทั่วไป หรือไม่มีมัดจำ (Full Payment) ──
            items = (itemsRes.recordset || []).map((it, idx) => ({
                id: idx + 1,
                name: it.ItemName || '',
                qty: (it.Qty !== null && it.Qty !== undefined && it.Qty !== '') ? parseFloat(it.Qty) : '',
                unit: it.Unit || 'ชิ้น',
                price: (it.Price !== null && it.Price !== undefined && it.Price !== '') ? parseFloat(it.Price) : '',
                discount: it.Discount || '',
                amount: (it.Amount !== null && it.Amount !== undefined) ? parseFloat(it.Amount) : 0,
                image: it.ImageURL || null,
                isPromo: !!it.IsPromo,
                promoMultiplier: it.PromoMultiplier || 1
            }));

            subTotal = Number(q.SubTotal || 0);
            vatAmount = Number(q.VatAmount || 0);
            receiptGrandTotal = grandTotal;
            notes = defaultReceiptNotes;
        }

        res.json({
            success: true,
            data: {
                receiptType: type,
                quotationId: q.QuotationID,
                quotationNo: q.QuotationNo,
                billingInvoiceId: q.BillingInvoiceID,
                billingInvoiceNo: q.BillingInvoiceNo,
                docType: q.DocType ? q.DocType.replace('quotation_', 'delivery_order_') : 'delivery_order_thc',
                customerId: q.CustomerID,
                customerName: q.CustomerName,
                address: q.Address,
                phone: q.Phone,
                taxId: q.TaxID,
                contractId: q.ContractID,
                bankAccount: q.BankAccount,
                subTotal: Number(subTotal || 0),
                discountPercent: type === 'deposit' ? 0 : Number(q.DiscountPercent || 0),
                discountAmount: type === 'deposit' ? 0 : Number(q.DiscountAmount || 0),
                showDiscountInPrint: type === 'deposit' ? false : !!q.ShowDiscountInPrint,
                vatRate: vatRate,
                vatAmount: type === 'deposit' ? 0 : Number(vatAmount || 0),
                showVatInPrint: type === 'deposit' ? false : hasVat,
                shippingCost: type === 'deposit' ? 0 : Number(q.ShippingCost || 0),
                showShippingInPrint: type === 'deposit' ? false : !!q.ShowShippingInPrint,
                designFee: type === 'deposit' ? 0 : Number(q.DesignFee || 0),
                showDesignFeeInPrint: type === 'deposit' ? false : !!q.ShowDesignFeeInPrint,
                grandTotal: Number(receiptGrandTotal || 0),
                depositPercent: type === 'deposit' ? '0' : 'custom',
                depositAmount: type === 'deposit' ? 0 : (paidDepositAmount > 0 ? paidDepositAmount : depositAmount),
                remainingAmount: type === 'deposit' ? 0 : remainingAmount,
                showDepositInPrint: type === 'deposit' ? false : (depositAmount > 0),
                notes,
                items
            }
        });
    } catch (err) {
        console.error('Error fetching quotation for receipt:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch quotation for receipt', error: err.message });
    }
});

module.exports = router;

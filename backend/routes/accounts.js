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

        // ดึงเฉพาะใบเสร็จรับเงินมัดจำตั้งต้น (ไม่ดึงใบเสร็จปิดยอดซ้ำซ้อน)
        let whereClauses = [
            `r.IsDeposit = 1`,
            `NOT EXISTS (
                SELECT 1 FROM Receipt rf_prev
                WHERE rf_prev.ReceiptID <> r.ReceiptID
                  AND (
                      (r.QuotationID IS NOT NULL AND rf_prev.QuotationID = r.QuotationID)
                      OR (r.CustomerOrder IS NOT NULL AND rf_prev.CustomerOrder = r.CustomerOrder)
                  )
                  AND rf_prev.ReceiptID < r.ReceiptID
                  AND rf_prev.IsDeposit = 1
                  AND (r.ShowDepositInPrint = 1 OR r.Notes LIKE '%ส่วนที่เหลือ%' OR r.Notes LIKE '%ปิดยอด%')
            )`
        ];
        const request = pool.request();

        if (search && search.trim()) {
            whereClauses.push(`(
                r.ReceiptNo LIKE @search OR
                q.QuotationNo LIKE @search OR
                r.CustomerOrder LIKE @search OR
                r.CustomerName LIKE @search OR
                r.Phone LIKE @search OR
                r.TaxID LIKE @search
            )`);
            request.input('search', sql.NVarChar, `%${search.trim()}%`);
        }

        if (status && status !== 'ทั้งหมด' && status !== 'all' && status.trim() !== '') {
            whereClauses.push(`COALESCE(r.DepositStatus, N'ชำระมัดจำแล้ว') = @status`);
            request.input('status', sql.NVarChar, status.trim());
        }

        if (dateFrom) {
            whereClauses.push(`r.BillDate >= @dateFrom`);
            request.input('dateFrom', sql.Date, dateFrom);
        }

        if (dateTo) {
            whereClauses.push(`r.BillDate <= @dateTo`);
            request.input('dateTo', sql.Date, dateTo);
        }

        if (createdBy) {
            whereClauses.push(`r.CreatedBy = @createdBy`);
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
                whereClauses.push(`re_fin.ReceiptID IS NULL`);
            } else if (receiptStatus === 'deposit_paid') {
                whereClauses.push(`r.ReceiptID IS NOT NULL`);
            } else if (receiptStatus === 'fully_paid') {
                whereClauses.push(`re_fin.ReceiptID IS NOT NULL OR COALESCE(r.DepositStatus, '') = N'ชำระครบถ้วน'`);
            }
        }

        if (subType) {
            if (subType === 'normal') {
                whereClauses.push(`(r.DocType IS NULL OR r.DocType NOT LIKE '%fda%')`);
            } else if (subType === 'fda') {
                whereClauses.push(`r.DocType LIKE '%fda%'`);
            } else {
                whereClauses.push(`r.DocType = @subType`);
                request.input('subType', sql.NVarChar, subType);
            }
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

        const query = `
            SELECT 
                r.ReceiptID,
                r.ReceiptNo,
                r.DocType,
                r.CustomerID,
                r.CustomerName,
                r.Address,
                r.Phone,
                r.TaxID,
                r.BillDate,
                r.GrandTotal AS ReceiptGrandTotal,
                r.IsDeposit,
                COALESCE(r.DepositStatus, N'ชำระมัดจำแล้ว') AS DepositStatus,
                r.PaidDepositAmount,
                r.QuotationID,
                r.QuotationGrandTotal,
                r.CustomerOrder,
                r.CreatedAt,
                r.CreatedBy,
                r.ContractID,
                u.display_name AS CreatedByName,
                
                -- Quotation details
                q.QuotationNo,
                q.GrandTotal AS QuotationBaseGrandTotal,
                q.SubTotal AS QuotationSubTotal,
                q.BillDate AS QuotationBillDate,
                
                -- BillingInvoice (if any)
                bi.BillingInvoiceID,
                bi.BillingInvoiceNo,
                bi.Status AS BillingInvoiceStatus,
                bi.GrandTotal AS BillingInvoiceGrandTotal,
                bi.RemainingAmount AS BillingInvoiceRemaining,
                
                -- Final Receipt (if any)
                re_fin.ReceiptID AS FinalReceiptID,
                re_fin.ReceiptNo AS FinalReceiptNo,
                re_fin.Status AS FinalReceiptStatus,
                re_fin.GrandTotal AS FinalReceiptGrandTotal
            FROM Receipt r
            LEFT JOIN Quotation q ON (r.QuotationID IS NOT NULL AND r.QuotationID = q.QuotationID) OR (r.QuotationID IS NULL AND r.CustomerOrder IS NOT NULL AND (q.QuotationNo = r.CustomerOrder OR r.CustomerOrder LIKE '%' + q.QuotationNo + '%'))
            LEFT JOIN Users u ON r.CreatedBy = u.user_id
            OUTER APPLY (
                SELECT TOP 1 
                    b.BillingInvoiceID, 
                    b.BillingInvoiceNo, 
                    b.Status,
                    b.GrandTotal,
                    b.RemainingAmount
                FROM BillingInvoice b
                WHERE (q.QuotationNo IS NOT NULL AND b.Notes LIKE '%' + q.QuotationNo + '%')
                   OR (r.CustomerOrder IS NOT NULL AND b.Notes LIKE '%' + r.CustomerOrder + '%')
                   OR (r.ReceiptNo IS NOT NULL AND b.Notes LIKE '%' + r.ReceiptNo + '%')
                   OR (r.ContractID IS NOT NULL AND b.ContractID = r.ContractID)
                ORDER BY b.BillingInvoiceID DESC
            ) bi
            OUTER APPLY (
                SELECT TOP 1 
                    rf.ReceiptID, 
                    rf.ReceiptNo, 
                    rf.Status, 
                    rf.GrandTotal
                FROM Receipt rf
                WHERE rf.ReceiptID <> r.ReceiptID
                  AND (
                      (q.QuotationNo IS NOT NULL AND (rf.CustomerOrder LIKE '%' + q.QuotationNo + '%' OR rf.Notes LIKE '%' + q.QuotationNo + '%'))
                      OR (r.CustomerOrder IS NOT NULL AND (rf.CustomerOrder LIKE '%' + r.CustomerOrder + '%' OR rf.Notes LIKE '%' + r.CustomerOrder + '%'))
                      OR rf.Notes LIKE '%' + r.ReceiptNo + '%'
                      OR (r.ContractID IS NOT NULL AND rf.ContractID = r.ContractID)
                  )
                  AND (
                      rf.ShowDepositInPrint = 1
                      OR rf.Notes LIKE '%ส่วนที่เหลือ%'
                      OR rf.Notes LIKE '%ปิดยอด%'
                      OR rf.IsDeposit = 0
                  )
                ORDER BY rf.ReceiptID DESC
            ) re_fin
            ${whereSql}
            ORDER BY r.ReceiptID DESC
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
            // ยอดรวมทั้งสิ้น = ราคาเต็มจากใบเสนอราคาที่เลือกในหน้าใบเสร็จ
            const grandTotal = Number(row.QuotationGrandTotal || row.QuotationBaseGrandTotal || row.ReceiptGrandTotal || 0);
            // ยอดมัดจำ = ตามจำนวนที่กรอกหน้าใบเสร็จรับเงิน (ยอดเงินมัดจำ)
            const depositAmount = Number(row.ReceiptGrandTotal || 0);
            // ตรวจสอบว่ามีการออกใบเสร็จรับเงินส่วนที่เหลือ (RE ปิดยอด) แล้วหรือไม่
            const hasFinalReceipt = Boolean(row.FinalReceiptID);

            // ชำระแล้ว = หากมีใบเสร็จปิดยอดแล้ว ยอดชำระคือยอดเต็ม (grandTotal) หากยังไม่มีคือยอดมัดจำที่ชำระ
            const paid = hasFinalReceipt
                ? grandTotal
                : Number(row.PaidDepositAmount !== null && row.PaidDepositAmount !== undefined ? row.PaidDepositAmount : depositAmount);
            // คงเหลือเรียกเก็บ = หากมีใบเสร็จปิดยอดแล้วคือ 0 มิฉะนั้นคือ grandTotal - paid
            const remaining = hasFinalReceipt ? 0 : Math.max(0, grandTotal - paid);
            const depStatus = hasFinalReceipt ? 'ชำระครบถ้วน' : (row.DepositStatus || (remaining <= 0 ? 'ชำระครบถ้วน' : 'ชำระมัดจำแล้ว'));

            totalGrandTotal += grandTotal;
            totalDepositRequired += depositAmount;
            totalPaid += paid;
            totalRemaining += remaining;

            if (depStatus === 'ชำระครบถ้วน') countCompleted++;
            else if (depStatus === 'ชำระมัดจำแล้ว') countPaid++;
            else countPending++;

            return {
                ...row,
                QuotationID: row.QuotationID || null,
                QuotationNo: row.QuotationNo || row.CustomerOrder || row.ReceiptNo,
                ReceiptNo: row.ReceiptNo,
                GrandTotal: grandTotal,
                DepositAmount: depositAmount,
                PaidDepositAmount: paid,
                RemainingAmount: remaining,
                DepositStatus: depStatus,
                DepositReceiptID: row.ReceiptID,
                DepositReceiptNo: row.ReceiptNo,
                BillingInvoiceID: row.BillingInvoiceID || null,
                BillingInvoiceNo: row.BillingInvoiceNo || null,
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

        let updateSql = `
            UPDATE Receipt 
            SET DepositStatus = @status
            ${paidDepositAmount !== undefined && paidDepositAmount !== null ? ', PaidDepositAmount = @paidAmount' : ''}
            WHERE ReceiptID = @id;

            UPDATE Quotation 
            SET DepositStatus = @status, UpdatedAt = GETDATE()
            ${paidDepositAmount !== undefined && paidDepositAmount !== null ? ', PaidDepositAmount = @paidAmount' : ''}
            WHERE QuotationID = @id OR QuotationID = (SELECT TOP 1 QuotationID FROM Receipt WHERE ReceiptID = @id);
        `;

        if (paidDepositAmount !== undefined && paidDepositAmount !== null) {
            request.input('paidAmount', sql.Decimal(18, 2), parseFloat(paidDepositAmount) || 0);
        }

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
        const { receiptId } = req.query;

        // 1. ลองค้นหา Quotation จาก QuotationID
        let headerRes = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT * FROM Quotation WHERE QuotationID = @id`);

        let q = headerRes.recordset[0];
        let depReceipt = null;

        // หากมี receiptId ส่งมา ให้ดึงใบเสร็จมัดจำก่อน
        if (receiptId) {
            const depRes = await pool.request()
                .input('rid', sql.Int, receiptId)
                .query(`SELECT TOP 1 * FROM Receipt WHERE ReceiptID = @rid`);
            if (depRes.recordset.length > 0) {
                depReceipt = depRes.recordset[0];
            }
        }

        // หากไม่พบจาก QuotationID ให้ตรวจสอบว่า id ที่ส่งมาเป็น ReceiptID หรือไม่
        if (!q) {
            const receiptCheck = await pool.request()
                .input('id', sql.Int, id)
                .query(`SELECT TOP 1 * FROM Receipt WHERE ReceiptID = @id`);
            if (receiptCheck.recordset.length > 0) {
                const rec = receiptCheck.recordset[0];
                if (!depReceipt) depReceipt = rec;
                if (rec.QuotationID) {
                    const qRes = await pool.request()
                        .input('qid', sql.Int, rec.QuotationID)
                        .query(`SELECT * FROM Quotation WHERE QuotationID = @qid`);
                    if (qRes.recordset.length > 0) {
                        q = qRes.recordset[0];
                    }
                }
            }
        }

        // หากยังไม่พบ Quotation แต่มี depReceipt ที่มี CustomerOrder ระบุเลข Quotation
        if (!q && depReceipt && depReceipt.CustomerOrder) {
            const qRes = await pool.request()
                .input('qno', sql.NVarChar, depReceipt.CustomerOrder)
                .query(`SELECT TOP 1 * FROM Quotation WHERE QuotationNo = @qno`);
            if (qRes.recordset.length > 0) {
                q = qRes.recordset[0];
            }
        }

        if (!q && !depReceipt) {
            return res.status(404).json({ success: false, message: 'Quotation or Receipt not found' });
        }

        // หากมี Quotation แต่ยังไม่ได้ depReceipt ให้ค้นหาใบเสร็จมัดจำที่เกี่ยวข้อง
        if (!depReceipt && q) {
            const depRes = await pool.request()
                .input('qid', sql.Int, q.QuotationID)
                .input('qno', sql.NVarChar, q.QuotationNo || '')
                .query(`
                    SELECT TOP 1 * 
                    FROM Receipt 
                    WHERE (QuotationID = @qid OR CustomerOrder = @qno OR Notes LIKE '%' + @qno + '%')
                      AND (IsDeposit = 1 OR PaidDepositAmount > 0)
                    ORDER BY ReceiptID DESC
                `);
            if (depRes.recordset.length > 0) {
                depReceipt = depRes.recordset[0];
            }
        }

        // คำนวณยอดเงินมัดจำที่ชำระไปแล้วจริง (Actual Paid Deposit)
        // ลำดับความสำคัญ:
        // 1. จากใบเสร็จมัดจำ: PaidDepositAmount หรือ GrandTotal
        // 2. จากใบเสนอราคา: PaidDepositAmount หรือ DepositAmount
        let actualPaidDeposit = 0;
        if (depReceipt) {
            actualPaidDeposit = Number(
                depReceipt.PaidDepositAmount !== null && depReceipt.PaidDepositAmount !== undefined && Number(depReceipt.PaidDepositAmount) > 0
                    ? depReceipt.PaidDepositAmount
                    : (depReceipt.GrandTotal || 0)
            );
        } else if (q) {
            actualPaidDeposit = Number(q.PaidDepositAmount || q.DepositAmount || 0);
        }

        // ดึงรายการสินค้า (QuotationItem หรือ ReceiptItem)
        let items = [];
        if (q) {
            const itemsRes = await pool.request()
                .input('id', sql.Int, q.QuotationID)
                .query(`SELECT * FROM QuotationItem WHERE QuotationID = @id ORDER BY ItemOrder ASC`);

            items = (itemsRes.recordset || []).map((it, idx) => ({
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
        } else if (depReceipt) {
            const itemsRes = await pool.request()
                .input('id', sql.Int, depReceipt.ReceiptID)
                .query(`SELECT * FROM ReceiptItem WHERE ReceiptID = @id ORDER BY ItemOrder ASC`);

            items = (itemsRes.recordset || []).map((it, idx) => ({
                id: idx + 1,
                name: it.ItemName || '',
                qty: parseFloat(it.Qty) || 1,
                unit: it.Unit || 'ชิ้น',
                price: parseFloat(it.Price) || 0,
                amount: parseFloat(it.Amount) || 0,
                image: it.ImageURL || null,
                isPromo: false,
                promoMultiplier: 1
            }));
        }

        const qGrandTotal = Number(q ? q.GrandTotal : (depReceipt ? (depReceipt.QuotationGrandTotal || depReceipt.GrandTotal) : 0));
        const remainingToBill = Math.max(0, qGrandTotal - actualPaidDeposit);

        res.json({
            success: true,
            data: {
                quotationId: q ? q.QuotationID : null,
                quotationNo: q ? q.QuotationNo : (depReceipt ? (depReceipt.CustomerOrder || depReceipt.ReceiptNo) : ''),
                docType: q && q.DocType ? q.DocType.replace('quotation_', 'billing_invoice_') : 'billing_invoice_thc',
                customerId: q ? q.CustomerID : (depReceipt ? depReceipt.CustomerID : null),
                customerName: q ? q.CustomerName : (depReceipt ? depReceipt.CustomerName : ''),
                address: q ? q.Address : (depReceipt ? depReceipt.Address : ''),
                phone: q ? q.Phone : (depReceipt ? depReceipt.Phone : ''),
                taxId: q ? q.TaxID : (depReceipt ? depReceipt.TaxID : ''),
                contractId: q ? q.ContractID : (depReceipt ? depReceipt.ContractID : ''),
                bankAccount: q ? q.BankAccount : '',
                subTotal: Number(q ? q.SubTotal : (depReceipt ? depReceipt.SubTotal : 0)),
                discountPercent: q ? (q.DiscountPercent || 0) : 0,
                discountAmount: Number(q ? (q.DiscountAmount || 0) : 0),
                showDiscountInPrint: q ? (q.ShowDiscountInPrint !== undefined ? !!q.ShowDiscountInPrint : false) : false,
                vatRate: q && q.VatRate !== undefined ? q.VatRate : 7,
                vatAmount: Number(q ? (q.VatAmount || 0) : (depReceipt ? depReceipt.VatAmount : 0)),
                showVatInPrint: q ? (q.ShowVatInPrint !== undefined ? !!q.ShowVatInPrint : true) : true,
                shippingCost: Number(q ? (q.ShippingCost || 0) : 0),
                showShippingInPrint: q ? (q.ShowShippingInPrint !== undefined ? !!q.ShowShippingInPrint : false) : false,
                designFee: Number(q ? (q.DesignFee || 0) : 0),
                showDesignFeeInPrint: q ? (q.ShowDesignFeeInPrint !== undefined ? !!q.ShowDesignFeeInPrint : false) : false,
                grandTotal: qGrandTotal,
                // หากมียอดมัดจำที่จ่ายไปแล้ว ให้ตั้งเป็น custom และระบุยอดจริงที่จ่าย (เช่น 500 บาท)
                // เพื่อไม่ให้หน้า BI คำนวณซ้ำ 50% ของยอดรวม (1,070 * 50% = 535) แต่จะหัก 500 บาท ทำให้ยอดคงเหลือคือ 570 บาทถูกต้อง
                depositPercent: actualPaidDeposit > 0 ? 'custom' : (q ? (q.DepositPercent || '0') : '0'),
                depositAmount: actualPaidDeposit,
                customDepositAmount: actualPaidDeposit,
                remainingAmount: remainingToBill,
                paidDepositAmount: actualPaidDeposit,
                showDepositInPrint: actualPaidDeposit > 0,
                depositStatus: q ? (q.DepositStatus || 'รอมัดจำ') : 'ชำระมัดจำแล้ว',
                notes: `<p><strong>อ้างอิงใบเสนอราคาเลขที่ :</strong> ${q ? q.QuotationNo : (depReceipt ? (depReceipt.CustomerOrder || '') : '')}</p><p>เรียกเก็บยอดคงเหลือส่วนที่เหลือจากการชำระมัดจำ</p>`,
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
        const { receiptId } = req.query;

        let headerRes = await pool.request()
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

        let q = headerRes.recordset[0];
        let depReceipt = null;

        // หากมี receiptId ส่งมา
        if (receiptId) {
            const depRes = await pool.request()
                .input('rid', sql.Int, receiptId)
                .query(`SELECT TOP 1 * FROM Receipt WHERE ReceiptID = @rid`);
            if (depRes.recordset.length > 0) {
                depReceipt = depRes.recordset[0];
            }
        }

        // หากไม่พบจาก QuotationID ให้ตรวจสอบจาก ReceiptID
        if (!q) {
            const receiptCheck = await pool.request()
                .input('id', sql.Int, id)
                .query(`SELECT TOP 1 * FROM Receipt WHERE ReceiptID = @id`);
            if (receiptCheck.recordset.length > 0) {
                const rec = receiptCheck.recordset[0];
                if (!depReceipt) depReceipt = rec;
                if (rec.QuotationID) {
                    const qRes = await pool.request()
                        .input('qid', sql.Int, rec.QuotationID)
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
                            WHERE q.QuotationID = @qid
                        `);
                    if (qRes.recordset.length > 0) {
                        q = qRes.recordset[0];
                    }
                }
            }
        }

        if (!q && !depReceipt) {
            return res.status(404).json({ success: false, message: 'Quotation or Receipt not found' });
        }

        // หากมี Quotation แต่ยังไม่ได้ depReceipt ให้ค้นหาใบเสร็จมัดจำที่เกี่ยวข้อง
        if (!depReceipt && q) {
            const depRes = await pool.request()
                .input('qid', sql.Int, q.QuotationID)
                .input('qno', sql.NVarChar, q.QuotationNo || '')
                .query(`
                    SELECT TOP 1 * 
                    FROM Receipt 
                    WHERE (QuotationID = @qid OR CustomerOrder = @qno OR Notes LIKE '%' + @qno + '%')
                      AND (IsDeposit = 1 OR PaidDepositAmount > 0)
                    ORDER BY ReceiptID DESC
                `);
            if (depRes.recordset.length > 0) {
                depReceipt = depRes.recordset[0];
            }
        }

        const type = req.query.type || 'deposit'; // 'deposit' | 'final'

        let itemsRes = { recordset: [] };
        if (q) {
            itemsRes = await pool.request()
                .input('id', sql.Int, q.QuotationID)
                .query(`SELECT * FROM QuotationItem WHERE QuotationID = @id ORDER BY ItemOrder ASC`);
        } else if (depReceipt) {
            itemsRes = await pool.request()
                .input('id', sql.Int, depReceipt.ReceiptID)
                .query(`SELECT * FROM ReceiptItem WHERE ReceiptID = @id ORDER BY ItemOrder ASC`);
        }

        const grandTotal = Number(q ? q.GrandTotal : (depReceipt ? (depReceipt.QuotationGrandTotal || depReceipt.GrandTotal) : 0));
        const depositPercentNum = parseFloat(q ? q.DepositPercent : 0) || 0;
        
        let actualPaidDeposit = 0;
        if (depReceipt) {
            actualPaidDeposit = Number(
                depReceipt.PaidDepositAmount !== null && depReceipt.PaidDepositAmount !== undefined && Number(depReceipt.PaidDepositAmount) > 0
                    ? depReceipt.PaidDepositAmount
                    : (depReceipt.GrandTotal || 0)
            );
        } else if (q) {
            actualPaidDeposit = Number(q.PaidDepositAmount || q.DepositAmount || 0);
        }

        const depositAmount = actualPaidDeposit > 0 
            ? actualPaidDeposit 
            : (Number(q?.DepositAmount || 0) || (depositPercentNum > 0 ? (grandTotal * depositPercentNum / 100) : 0));
        const paidDepositAmount = actualPaidDeposit > 0 ? actualPaidDeposit : depositAmount;
        const remainingAmount = Math.max(0, grandTotal - paidDepositAmount);

        let items = [];
        let subTotal = 0;
        let vatAmount = 0;
        let receiptGrandTotal = 0;
        let notes = '';

        const vatRate = q && q.VatRate !== undefined ? Number(q.VatRate) : 7;
        const hasVat = q ? ((q.ShowVatInPrint || vatRate > 0) && vatRate > 0) : true;

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
                quotationId: q ? q.QuotationID : null,
                quotationNo: q ? q.QuotationNo : (depReceipt ? (depReceipt.CustomerOrder || depReceipt.ReceiptNo) : ''),
                billingInvoiceId: q ? q.BillingInvoiceID : null,
                billingInvoiceNo: q ? q.BillingInvoiceNo : null,
                docType: q && q.DocType ? q.DocType.replace('quotation_', 'delivery_order_') : 'delivery_order_thc',
                customerId: q ? q.CustomerID : (depReceipt ? depReceipt.CustomerID : null),
                customerName: q ? q.CustomerName : (depReceipt ? depReceipt.CustomerName : ''),
                address: q ? q.Address : (depReceipt ? depReceipt.Address : ''),
                phone: q ? q.Phone : (depReceipt ? depReceipt.Phone : ''),
                taxId: q ? q.TaxID : (depReceipt ? depReceipt.TaxID : ''),
                contractId: q ? q.ContractID : (depReceipt ? depReceipt.ContractID : ''),
                bankAccount: q ? q.BankAccount : '',
                subTotal: Number(subTotal || 0),
                discountPercent: type === 'deposit' ? 0 : Number(q ? (q.DiscountPercent || 0) : 0),
                discountAmount: type === 'deposit' ? 0 : Number(q ? (q.DiscountAmount || 0) : 0),
                showDiscountInPrint: type === 'deposit' ? false : !!(q ? q.ShowDiscountInPrint : false),
                vatRate: vatRate,
                vatAmount: type === 'deposit' ? 0 : Number(vatAmount || 0),
                showVatInPrint: type === 'deposit' ? false : hasVat,
                shippingCost: type === 'deposit' ? 0 : Number(q ? (q.ShippingCost || 0) : 0),
                showShippingInPrint: type === 'deposit' ? false : !!(q ? q.ShowShippingInPrint : false),
                designFee: type === 'deposit' ? 0 : Number(q ? (q.DesignFee || 0) : 0),
                showDesignFeeInPrint: type === 'deposit' ? false : !!(q ? q.ShowDesignFeeInPrint : false),
                grandTotal: Number(receiptGrandTotal || 0),
                depositPercent: type === 'deposit' ? '0' : 'custom',
                depositAmount: type === 'deposit' ? 0 : (paidDepositAmount > 0 ? paidDepositAmount : depositAmount),
                customDepositAmount: type === 'deposit' ? 0 : (paidDepositAmount > 0 ? paidDepositAmount : depositAmount),
                paidDepositAmount: type === 'deposit' ? 0 : (paidDepositAmount > 0 ? paidDepositAmount : depositAmount),
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

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /dashboard-stats — ภาพรวมการเงินสำหรับ Accounts Dashboard
// ─────────────────────────────────────────────────────────────────────────────
router.get('/dashboard-stats', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { timeRange = 'all', dateFrom, dateTo, year: selectedYearParam, month: selectedMonthParam } = req.query;
        const companyId = req.headers['x-company-id'] || req.query.companyId;

        // 1. Where clauses สำหรับ Receipts
        let whereClauses = ['1=1'];
        const request = pool.request();

        if (companyId && companyId !== 'all' && companyId !== '0') {
            whereClauses.push('(r.CompanyID = @companyId OR r.CompanyID IS NULL)');
            request.input('companyId', sql.Int, parseInt(companyId, 10));
        }

        const receiptSql = `
            SELECT 
                r.ReceiptID,
                r.ReceiptNo,
                r.DocType,
                r.CustomerName,
                CONVERT(VARCHAR(10), r.BillDate, 120) AS BillDateStr,
                r.BillDate,
                r.CreatedAt,
                r.GrandTotal,
                r.DepositAmount,
                r.RemainingAmount,
                r.IsDeposit,
                r.DepositStatus,
                r.PaidDepositAmount,
                r.PaymentMethod,
                r.Status,
                r.CompanyID,
                CASE 
                    WHEN r.IsDeposit = 1 THEN r.GrandTotal
                    WHEN r.DepositAmount > 0 THEN r.RemainingAmount
                    ELSE r.GrandTotal
                END AS CashInflow,
                CASE 
                    WHEN r.IsDeposit = 1 THEN 'deposit'
                    WHEN r.DepositAmount > 0 THEN 'final'
                    ELSE 'full'
                END AS PaymentType
            FROM Receipt r
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY r.ReceiptID DESC
        `;

        const receiptsRes = await request.query(receiptSql);
        const allReceipts = receiptsRes.recordset || [];

        // Time helper (Thai GMT+7)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const thaiNow = new Date(utc + (7 * 3600000));
        const pad = (n) => String(n).padStart(2, '0');
        const todayStr = `${thaiNow.getFullYear()}-${pad(thaiNow.getMonth() + 1)}-${pad(thaiNow.getDate())}`;

        const currentYear = thaiNow.getFullYear();
        const currentMonth = pad(thaiNow.getMonth() + 1);
        const targetYear = parseInt(selectedYearParam || currentYear, 10);
        const thisMonthPrefix = `${currentYear}-${currentMonth}`;

        const lastMonthDate = new Date(thaiNow.getFullYear(), thaiNow.getMonth() - 1, 1);
        const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${pad(lastMonthDate.getMonth() + 1)}`;

        // Calculate available years from database
        const yearSet = new Set([currentYear]);
        allReceipts.forEach(r => {
            if (r.BillDateStr) {
                const y = parseInt(r.BillDateStr.substring(0, 4), 10);
                if (!isNaN(y)) yearSet.add(y);
            }
        });
        const availableYears = Array.from(yearSet).sort((a, b) => b - a);

        // Calculate filter start/end dates
        let filterStart = null;
        let filterEnd = null;

        if (dateFrom && dateTo) {
            filterStart = dateFrom;
            filterEnd = dateTo;
        } else if (dateFrom && !dateTo) {
            filterStart = dateFrom;
            filterEnd = dateFrom;
        } else if (selectedMonthParam && selectedMonthParam !== 'all' && selectedMonthParam !== '') {
            const mNum = parseInt(selectedMonthParam, 10);
            const mStr = pad(mNum);
            const yNum = targetYear;
            filterStart = `${yNum}-${mStr}-01`;
            const lastDayOfMonth = new Date(yNum, mNum, 0).getDate();
            filterEnd = `${yNum}-${mStr}-${pad(lastDayOfMonth)}`;
        } else if (timeRange === 'today') {
            filterStart = todayStr;
            filterEnd = todayStr;
        } else if (timeRange === '7days') {
            const d7 = new Date(thaiNow);
            d7.setDate(d7.getDate() - 6);
            filterStart = `${d7.getFullYear()}-${pad(d7.getMonth() + 1)}-${pad(d7.getDate())}`;
            filterEnd = todayStr;
        } else if (timeRange === '30days') {
            const d30 = new Date(thaiNow);
            d30.setDate(d30.getDate() - 29);
            filterStart = `${d30.getFullYear()}-${pad(d30.getMonth() + 1)}-${pad(d30.getDate())}`;
            filterEnd = todayStr;
        } else if (timeRange === 'thisMonth') {
            filterStart = `${thisMonthPrefix}-01`;
            const endOfMonth = new Date(thaiNow.getFullYear(), thaiNow.getMonth() + 1, 0);
            filterEnd = `${thisMonthPrefix}-${pad(endOfMonth.getDate())}`;
        } else if (timeRange === 'lastMonth') {
            filterStart = `${lastMonthPrefix}-01`;
            const endOfLastMonth = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0);
            filterEnd = `${lastMonthPrefix}-${pad(endOfLastMonth.getDate())}`;
        } else if (timeRange === 'thisYear' || timeRange === 'year' || timeRange === 'selectedYear') {
            filterStart = `${targetYear}-01-01`;
            filterEnd = `${targetYear}-12-31`;
        }

        // กรองใบเสร็จตามช่วงเวลาที่เลือก
        const filteredReceipts = allReceipts.filter(r => {
            const bDate = r.BillDateStr;
            if (filterStart || filterEnd) {
                if (!bDate) return false;
                if (filterStart && bDate < filterStart) return false;
                if (filterEnd && bDate > filterEnd) return false;
                return true;
            }
            return true;
        });

        // 2. คำนวณ KPI Metrics
        let totalCashInflow = 0;
        let totalDepositInflow = 0;
        let totalFinalInflow = 0;
        let totalFullInflow = 0;

        filteredReceipts.forEach(r => {
            const amount = Number(r.CashInflow || 0);
            totalCashInflow += amount;
            if (r.PaymentType === 'deposit') totalDepositInflow += amount;
            else if (r.PaymentType === 'final') totalFinalInflow += amount;
            else totalFullInflow += amount;
        });

        // Today & Month inflow จาก allReceipts
        let todayInflow = 0;
        let thisMonthInflow = 0;
        let lastMonthInflow = 0;

        allReceipts.forEach(r => {
            const amount = Number(r.CashInflow || 0);
            const bDate = r.BillDateStr;
            if (bDate === todayStr) todayInflow += amount;
            if (bDate && bDate.startsWith(thisMonthPrefix)) thisMonthInflow += amount;
            if (bDate && bDate.startsWith(lastMonthPrefix)) lastMonthInflow += amount;
        });

        const momGrowth = lastMonthInflow > 0 
            ? ((thisMonthInflow - lastMonthInflow) / lastMonthInflow) * 100 
            : (thisMonthInflow > 0 ? 100 : 0);

        // 3. ลูกหนี้การค้าคงค้าง (Outstanding AR)
        const arQuery = `
            SELECT 
                r.ReceiptID,
                r.ReceiptNo,
                r.GrandTotal AS ReceiptGrandTotal,
                r.PaidDepositAmount,
                r.QuotationID,
                r.QuotationGrandTotal,
                q.GrandTotal AS QuotationBaseGrandTotal,
                re_fin.ReceiptID AS FinalReceiptID
            FROM Receipt r
            LEFT JOIN Quotation q ON (r.QuotationID IS NOT NULL AND r.QuotationID = q.QuotationID) OR (r.QuotationID IS NULL AND r.CustomerOrder IS NOT NULL AND (q.QuotationNo = r.CustomerOrder OR r.CustomerOrder LIKE '%' + q.QuotationNo + '%'))
            OUTER APPLY (
                SELECT TOP 1 rf.ReceiptID
                FROM Receipt rf
                WHERE rf.ReceiptID <> r.ReceiptID
                  AND (
                      (q.QuotationNo IS NOT NULL AND (rf.CustomerOrder LIKE '%' + q.QuotationNo + '%' OR rf.Notes LIKE '%' + q.QuotationNo + '%'))
                      OR (r.CustomerOrder IS NOT NULL AND (rf.CustomerOrder LIKE '%' + r.CustomerOrder + '%' OR rf.Notes LIKE '%' + r.CustomerOrder + '%'))
                      OR rf.Notes LIKE '%' + r.ReceiptNo + '%'
                  )
                  AND (rf.ShowDepositInPrint = 1 OR rf.Notes LIKE '%ส่วนที่เหลือ%' OR rf.Notes LIKE '%ปิดยอด%' OR rf.IsDeposit = 0)
                ORDER BY rf.ReceiptID DESC
            ) re_fin
            WHERE r.IsDeposit = 1
              AND NOT EXISTS (
                    SELECT 1 FROM Receipt rf_prev
                    WHERE rf_prev.ReceiptID <> r.ReceiptID
                      AND (
                          (r.QuotationID IS NOT NULL AND rf_prev.QuotationID = r.QuotationID)
                          OR (r.CustomerOrder IS NOT NULL AND rf_prev.CustomerOrder = r.CustomerOrder)
                      )
                      AND rf_prev.ReceiptID < r.ReceiptID
                      AND rf_prev.IsDeposit = 1
                      AND (r.ShowDepositInPrint = 1 OR r.Notes LIKE '%ส่วนที่เหลือ%' OR r.Notes LIKE '%ปิดยอด%')
              )
        `;
        const arRes = await pool.request().query(arQuery);
        let totalOutstandingAR = 0;
        let pendingARCount = 0;

        arRes.recordset.forEach(row => {
            const grandTotal = Number(row.QuotationGrandTotal || row.QuotationBaseGrandTotal || row.ReceiptGrandTotal || 0);
            const hasFinalReceipt = Boolean(row.FinalReceiptID);
            const paid = hasFinalReceipt ? grandTotal : Number(row.PaidDepositAmount || row.ReceiptGrandTotal || 0);
            const remaining = hasFinalReceipt ? 0 : Math.max(0, grandTotal - paid);
            totalOutstandingAR += remaining;
            if (remaining > 0) pendingARCount++;
        });

        // 4. เจ้าหนี้การค้า (AP จาก PurchaseOrder)
        const apRes = await pool.request().query(`
            SELECT 
                COUNT(*) AS totalPOCount,
                COALESCE(SUM(TotalPayable), 0) AS totalAP
            FROM PurchaseOrder
            WHERE Status <> N'ยกเลิก'
        `);
        const apData = apRes.recordset[0] || {};
        const totalAP = Number(apData.totalAP || 0);

        // 5. Daily Trend
        const dailyMap = {};
        filteredReceipts.forEach(r => {
            const d = r.BillDateStr || 'Unknown';
            if (!dailyMap[d]) {
                dailyMap[d] = { date: d, amount: 0, deposit: 0, final: 0, full: 0, count: 0 };
            }
            const amt = Number(r.CashInflow || 0);
            dailyMap[d].amount += amt;
            dailyMap[d].count += 1;
            if (r.PaymentType === 'deposit') dailyMap[d].deposit += amt;
            else if (r.PaymentType === 'final') dailyMap[d].final += amt;
            else dailyMap[d].full += amt;
        });

        const thaiMonthShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const dailyTrend = Object.keys(dailyMap).sort().map(d => {
            const parts = d.split('-');
            const label = parts.length === 3 ? `${parseInt(parts[2], 10)} ${thaiMonthShort[parseInt(parts[1], 10) - 1]}` : d;
            return {
                ...dailyMap[d],
                label
            };
        });

        // 6. Monthly Trend (12 เดือนของ targetYear)
        const monthlyTrend = [];
        for (let m = 1; m <= 12; m++) {
            const mStr = `${targetYear}-${pad(m)}`;
            const mLabel = thaiMonthShort[m - 1];
            let mTotal = 0;
            let mDeposit = 0;
            let mFinal = 0;
            let mFull = 0;
            let mCount = 0;

            allReceipts.forEach(r => {
                if (r.BillDateStr && r.BillDateStr.startsWith(mStr)) {
                    const amt = Number(r.CashInflow || 0);
                    mTotal += amt;
                    mCount++;
                    if (r.PaymentType === 'deposit') mDeposit += amt;
                    else if (r.PaymentType === 'final') mFinal += amt;
                    else mFull += amt;
                }
            });

            monthlyTrend.push({
                month: mStr,
                label: mLabel,
                amount: mTotal,
                deposit: mDeposit,
                final: mFinal,
                full: mFull,
                count: mCount
            });
        }

        // 7. Yearly Trend (เปรียบเทียบข้ามปี)
        const yearlyMap = {};
        availableYears.forEach(y => {
            yearlyMap[y] = { year: y, label: `พ.ศ. ${y + 543} (${y})`, amount: 0, deposit: 0, final: 0, full: 0, count: 0 };
        });
        allReceipts.forEach(r => {
            const y = r.BillDateStr ? parseInt(r.BillDateStr.substring(0, 4), 10) : null;
            if (y) {
                if (!yearlyMap[y]) {
                    yearlyMap[y] = { year: y, label: `พ.ศ. ${y + 543} (${y})`, amount: 0, deposit: 0, final: 0, full: 0, count: 0 };
                }
                const amt = Number(r.CashInflow || 0);
                yearlyMap[y].amount += amt;
                yearlyMap[y].count += 1;
                if (r.PaymentType === 'deposit') yearlyMap[y].deposit += amt;
                else if (r.PaymentType === 'final') yearlyMap[y].final += amt;
                else yearlyMap[y].full += amt;
            }
        });
        const yearlyTrend = Object.keys(yearlyMap).sort().map(y => yearlyMap[y]);

        // 8. Payment Type Breakdown
        const paymentTypeBreakdown = [
            { name: 'เงินมัดจำ', value: totalDepositInflow, color: '#f59e0b' },
            { name: 'เงินปิดยอด/คงเหลือ', value: totalFinalInflow, color: '#10b981' },
            { name: 'ชำระเต็มจำนวน', value: totalFullInflow, color: '#3b82f6' }
        ].filter(item => item.value > 0);

        // 9. Payment Method Breakdown
        const methodMap = {};
        filteredReceipts.forEach(r => {
            let m = r.PaymentMethod || 'transfer';
            if (m.toLowerCase().includes('cash') || m.includes('สด')) m = 'เงินสด';
            else if (m.toLowerCase().includes('cheque') || m.includes('เช็ค')) m = 'เช็ค';
            else m = 'โอนเงิน';

            methodMap[m] = (methodMap[m] || 0) + Number(r.CashInflow || 0);
        });

        const paymentMethodBreakdown = Object.keys(methodMap).map(name => ({
            name,
            value: methodMap[name]
        }));

        // 10. Recent Collections Feed (top 8)
        const recentReceipts = filteredReceipts.slice(0, 8).map(r => ({
            receiptId: r.ReceiptID,
            receiptNo: r.ReceiptNo,
            customerName: r.CustomerName,
            billDate: r.BillDateStr,
            cashInflow: Number(r.CashInflow || 0),
            paymentType: r.PaymentType,
            paymentTypeLabel: r.PaymentType === 'deposit' ? 'เงินมัดจำ' : (r.PaymentType === 'final' ? 'เงินปิดยอด' : 'จ่ายเต็ม'),
            paymentMethod: r.PaymentMethod || 'โอนเงิน',
            depositStatus: r.DepositStatus || 'ชำระแล้ว',
            docType: r.DocType
        }));

        // 11. รายการบิลทั้งหมดสำหรับ Export Report
        const allReceiptsForExport = filteredReceipts.map(r => ({
            receiptId: r.ReceiptID,
            receiptNo: r.ReceiptNo,
            customerName: r.CustomerName,
            billDate: r.BillDateStr,
            grandTotal: Number(r.GrandTotal || 0),
            depositAmount: Number(r.DepositAmount || 0),
            remainingAmount: Number(r.RemainingAmount || 0),
            cashInflow: Number(r.CashInflow || 0),
            paymentType: r.PaymentType,
            paymentTypeLabel: r.PaymentType === 'deposit' ? 'เงินมัดจำ' : (r.PaymentType === 'final' ? 'เงินปิดยอด' : 'จ่ายเต็ม'),
            paymentMethod: r.PaymentMethod || 'โอนเงิน',
            depositStatus: r.DepositStatus || 'ชำระแล้ว'
        }));

        res.json({
            success: true,
            data: {
                kpi: {
                    totalCashInflow,
                    todayInflow,
                    thisMonthInflow,
                    lastMonthInflow,
                    momGrowth: Number(momGrowth.toFixed(1)),
                    totalOutstandingAR,
                    pendingARCount,
                    totalAP,
                    totalDepositInflow,
                    totalFinalInflow,
                    totalFullInflow,
                    totalReceiptsCount: filteredReceipts.length,
                    allReceiptsCount: allReceipts.length
                },
                selectedYear: targetYear,
                availableYears,
                dailyTrend,
                monthlyTrend,
                yearlyTrend,
                paymentTypeBreakdown,
                paymentMethodBreakdown,
                recentReceipts,
                allReceiptsForExport,
                filter: {
                    timeRange,
                    selectedYear: targetYear,
                    selectedMonth: selectedMonthParam || '',
                    dateFrom: filterStart,
                    dateTo: filterEnd
                }
            }
        });
    } catch (err) {
        console.error('Error in /dashboard-stats:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats', error: err.message });
    }
});

module.exports = router;

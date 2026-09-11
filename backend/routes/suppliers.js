/**
 * =============================================================================
 * suppliers.js — Supplier / Vendor Management API Routes
 * =============================================================================
 * จัดการข้อมูลทะเบียนผู้ขาย / ซัพพลายเออร์ (Procurement Supplier):
 *   - GET    /       : รายชื่อผู้ขายทั้งหมด (รองรับ ค้นหา & กรองสถานะ)
 *   - GET    /:id    : รายละเอียดผู้ขายตาม ID
 *   - POST   /       : เพิ่มผู้ขายรายใหม่
 *   - PUT    /:id    : แก้ไขข้อมูลผู้ขาย
 *   - DELETE /:id    : ลบข้อมูลผู้ขาย
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET / — รายชื่อผู้ขายทั้งหมด
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { search, status } = req.query;

        let whereConditions = [];
        const request = pool.request();

        if (search && search.trim()) {
            whereConditions.push(`(
                SupplierName LIKE @search OR 
                Supplier_Code LIKE @search OR 
                Phone LIKE @search OR 
                TaxID LIKE @search OR 
                Contact_Person LIKE @search OR 
                Email LIKE @search
            )`);
            request.input('search', sql.NVarChar, `%${search.trim()}%`);
        }

        if (status && status !== 'ทั้งหมด') {
            whereConditions.push(`Active_Status = @status`);
            request.input('status', sql.VarChar, status.trim());
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';

        const result = await request.query(`
            SELECT 
                SupplierID,
                SupplierName,
                Supplier_Code AS SupplierCode,
                Supplier_Name_TH AS SupplierNameTH,
                Supplier_Name_EN AS SupplierNameEN,
                Supplier_Type AS SupplierType,
                TaxID,
                Address,
                Phone,
                Email,
                Contact_Person AS ContactPerson,
                Payment_Terms AS PaymentTerms,
                Credit_Limit_THB AS CreditLimit,
                Certification,
                Lead_Time_Days AS LeadTimeDays,
                Active_Status AS ActiveStatus,
                LicenseNo,
                GMPNo
            FROM Supplier
            ${whereClause}
            ORDER BY SupplierID DESC
        `);

        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching suppliers:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ขาย', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /:id — รายละเอียดผู้ขายตาม ID
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    SupplierID,
                    SupplierName,
                    Supplier_Code AS SupplierCode,
                    Supplier_Name_TH AS SupplierNameTH,
                    Supplier_Name_EN AS SupplierNameEN,
                    Supplier_Type AS SupplierType,
                    TaxID,
                    Address,
                    Phone,
                    Email,
                    Contact_Person AS ContactPerson,
                    Payment_Terms AS PaymentTerms,
                    Credit_Limit_THB AS CreditLimit,
                    Certification,
                    Lead_Time_Days AS LeadTimeDays,
                    Active_Status AS ActiveStatus,
                    LicenseNo,
                    GMPNo
                FROM Supplier
                WHERE SupplierID = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ขายที่ระบุ' });
        }

        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error('Error fetching supplier detail:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ขาย', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST / — เพิ่มผู้ขายรายใหม่
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const {
        supplierName,
        supplierCode,
        taxId,
        address,
        phone,
        email,
        contactPerson,
        paymentTerms,
        creditLimit,
        certification,
        leadTimeDays,
        activeStatus = 'Active'
    } = req.body;

    if (!supplierName || !supplierName.trim()) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อผู้ขาย / ซัพพลายเออร์' });
    }

    try {
        const pool = await poolPromise;

        // Check if supplier name already exists
        const checkReq = pool.request();
        checkReq.input('name', sql.NVarChar, supplierName.trim());
        const existing = await checkReq.query(`SELECT SupplierID FROM Supplier WHERE SupplierName = @name`);
        if (existing.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'มีชื่อผู้ขายรายนี้อยู่ในระบบแล้ว' });
        }

        const insertReq = pool.request();
        insertReq.input('supplierName', sql.NVarChar, supplierName.trim());
        insertReq.input('supplierCode', sql.VarChar, supplierCode ? supplierCode.trim() : null);
        insertReq.input('taxId', sql.NVarChar, taxId ? taxId.trim() : null);
        insertReq.input('address', sql.NVarChar, address || null);
        insertReq.input('phone', sql.NVarChar, phone ? phone.trim() : null);
        insertReq.input('email', sql.VarChar, email ? email.trim() : null);
        insertReq.input('contactPerson', sql.NVarChar, contactPerson ? contactPerson.trim() : null);
        insertReq.input('paymentTerms', sql.NVarChar, paymentTerms || 'Net 30');
        insertReq.input('creditLimit', sql.Decimal(18, 2), creditLimit ? parseFloat(creditLimit) : null);
        insertReq.input('certification', sql.NVarChar, certification || null);
        insertReq.input('leadTimeDays', sql.Int, leadTimeDays ? parseInt(leadTimeDays, 10) : null);
        insertReq.input('activeStatus', sql.VarChar, activeStatus || 'Active');

        const result = await insertReq.query(`
            INSERT INTO Supplier (
                SupplierName, Supplier_Code, TaxID, Address, Phone, Email,
                Contact_Person, Payment_Terms, Credit_Limit_THB, Certification,
                Lead_Time_Days, Active_Status
            )
            OUTPUT INSERTED.SupplierID
            VALUES (
                @supplierName, @supplierCode, @taxId, @address, @phone, @email,
                @contactPerson, @paymentTerms, @creditLimit, @certification,
                @leadTimeDays, @activeStatus
            )
        `);

        const newId = result.recordset[0].SupplierID;
        res.status(201).json({
            success: true,
            message: 'เพิ่มข้อมูลผู้ขายเรียบร้อยแล้ว',
            data: { supplierId: newId, supplierName }
        });
    } catch (err) {
        console.error('Error creating supplier:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มผู้ขาย', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PUT /:id — แก้ไขข้อมูลผู้ขาย
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        supplierName,
        supplierCode,
        taxId,
        address,
        phone,
        email,
        contactPerson,
        paymentTerms,
        creditLimit,
        certification,
        leadTimeDays,
        activeStatus
    } = req.body;

    if (!supplierName || !supplierName.trim()) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อผู้ขาย / ซัพพลายเออร์' });
    }

    try {
        const pool = await poolPromise;

        // Check if supplier name exists on other record
        const checkReq = pool.request();
        checkReq.input('id', sql.Int, id);
        checkReq.input('name', sql.NVarChar, supplierName.trim());
        const existing = await checkReq.query(`
            SELECT SupplierID FROM Supplier 
            WHERE SupplierName = @name AND SupplierID != @id
        `);
        if (existing.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'มีชื่อผู้ขายรายนี้อยู่ในระบบแล้ว' });
        }

        const updateReq = pool.request();
        updateReq.input('id', sql.Int, id);
        updateReq.input('supplierName', sql.NVarChar, supplierName.trim());
        updateReq.input('supplierCode', sql.VarChar, supplierCode ? supplierCode.trim() : null);
        updateReq.input('taxId', sql.NVarChar, taxId ? taxId.trim() : null);
        updateReq.input('address', sql.NVarChar, address || null);
        updateReq.input('phone', sql.NVarChar, phone ? phone.trim() : null);
        updateReq.input('email', sql.VarChar, email ? email.trim() : null);
        updateReq.input('contactPerson', sql.NVarChar, contactPerson ? contactPerson.trim() : null);
        updateReq.input('paymentTerms', sql.NVarChar, paymentTerms || 'Net 30');
        updateReq.input('creditLimit', sql.Decimal(18, 2), creditLimit !== undefined && creditLimit !== '' ? parseFloat(creditLimit) : null);
        updateReq.input('certification', sql.NVarChar, certification || null);
        updateReq.input('leadTimeDays', sql.Int, leadTimeDays !== undefined && leadTimeDays !== '' ? parseInt(leadTimeDays, 10) : null);
        updateReq.input('activeStatus', sql.VarChar, activeStatus || 'Active');

        await updateReq.query(`
            UPDATE Supplier
            SET 
                SupplierName = @supplierName,
                Supplier_Code = @supplierCode,
                TaxID = @taxId,
                Address = @address,
                Phone = @phone,
                Email = @email,
                Contact_Person = @contactPerson,
                Payment_Terms = @paymentTerms,
                Credit_Limit_THB = @creditLimit,
                Certification = @certification,
                Lead_Time_Days = @leadTimeDays,
                Active_Status = @activeStatus
            WHERE SupplierID = @id
        `);

        res.json({ success: true, message: 'อัปเดตข้อมูลผู้ขายเรียบร้อยแล้ว' });
    } catch (err) {
        console.error('Error updating supplier:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ขาย', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DELETE /:id — ลบผู้ขาย
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;

        // Check if supplier is referenced in PO
        const checkReq = pool.request();
        checkReq.input('id', sql.Int, id);
        const poRef = await checkReq.query(`
            SELECT TOP 1 PurchaseOrderID, PONumber 
            FROM PurchaseOrder 
            WHERE SupplierID = @id
        `);

        if (poRef.recordset.length > 0) {
            // If referenced, soft-delete instead of hard delete
            await pool.request()
                .input('id', sql.Int, id)
                .query(`UPDATE Supplier SET Active_Status = 'Inactive' WHERE SupplierID = @id`);

            return res.json({
                success: true,
                message: `ผู้ขายนี้มีประวัติใบสั่งซื้อ (${poRef.recordset[0].PONumber}) จึงปรับสถานะเป็นไม่ใช้งาน (Inactive) แทนการลบถาวร`
            });
        }

        // Hard delete if not referenced
        await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM Supplier WHERE SupplierID = @id`);

        res.json({ success: true, message: 'ลบข้อมูลผู้ขายเรียบร้อยแล้ว' });
    } catch (err) {
        console.error('Error deleting supplier:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูลผู้ขาย', error: err.message });
    }
});

module.exports = router;

/**
 * =============================================================================
 * chequeForms.js — API สำหรับบันทึกและจัดการแบบฟอร์มสั่งจ่ายเช็ค (Cheque Writing Form)
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const authMiddleware = require('../middleware/auth');

// ── GET /api/cheque-forms: ดึงรายการเช็คที่เคยสั่งจ่าย ──
router.get('/', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const companyId = req.query.companyId || req.user.activeCompanyId || 2;
        const search = req.query.search || '';

        let query = `
            SELECT 
                c.ChequeID, c.ChequeNo, c.ChequeType, c.BankName, c.BankBranch,
                c.AccountNo, c.PayeeOrPayer, c.Amount, c.IssueDate, c.DueDate,
                c.DepositDate, c.ClearedDate, c.Status, c.RefDocNo, c.Notes,
                c.CompanyID, c.CreatedAt, c.UpdatedAt,
                u.display_name AS CreatedByName
            FROM Cheques c
            LEFT JOIN Users u ON c.CreatedBy = u.user_id
            WHERE c.CompanyID = @companyId
        `;

        if (search) {
            query += ` AND (c.ChequeNo LIKE @search OR c.PayeeOrPayer LIKE @search OR c.BankName LIKE @search)`;
        }

        query += ` ORDER BY c.ChequeID DESC`;

        const request = pool.request()
            .input('companyId', sql.Int, companyId);

        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        const result = await request.query(query);
        res.json(result.recordset || []);
    } catch (err) {
        console.error('Error fetching cheque forms:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเช็ค: ' + err.message });
    }
});

// ── POST /api/cheque-forms: บันทึกข้อมูลการสั่งจ่ายเช็คใหม่ ──
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            chequeNo,
            chequeType = 'issued',
            bankName = 'ธนาคารกสิกรไทย',
            bankBranch = '',
            accountNo = '',
            payeeOrPayer,
            amount,
            issueDate,
            dueDate,
            refDocNo = '',
            notes = '',
            companyId = 2
        } = req.body;

        if (!payeeOrPayer || !amount || !issueDate) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลสำคัญ (ชื่อผู้รับเงิน, จำนวนเงิน, วันที่สั่งจ่าย) ให้ครบถ้วน' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('chequeNo', sql.NVarChar, chequeNo || '')
            .input('chequeType', sql.NVarChar, chequeType)
            .input('bankName', sql.NVarChar, bankName)
            .input('bankBranch', sql.NVarChar, bankBranch)
            .input('accountNo', sql.NVarChar, accountNo)
            .input('payeeOrPayer', sql.NVarChar, payeeOrPayer)
            .input('amount', sql.Decimal(18, 2), parseFloat(amount) || 0)
            .input('issueDate', sql.Date, issueDate)
            .input('dueDate', sql.Date, dueDate || issueDate)
            .input('status', sql.NVarChar, 'pending')
            .input('refDocNo', sql.NVarChar, refDocNo)
            .input('notes', sql.NVarChar, notes)
            .input('companyId', sql.Int, companyId)
            .input('createdBy', sql.Int, req.user?.id || null)
            .query(`
                INSERT INTO Cheques (
                    ChequeNo, ChequeType, BankName, BankBranch, AccountNo,
                    PayeeOrPayer, Amount, IssueDate, DueDate, Status,
                    RefDocNo, Notes, CompanyID, CreatedBy, CreatedAt, UpdatedAt
                )
                OUTPUT INSERTED.ChequeID
                VALUES (
                    @chequeNo, @chequeType, @bankName, @bankBranch, @accountNo,
                    @payeeOrPayer, @amount, @issueDate, @dueDate, @status,
                    @refDocNo, @notes, @companyId, @createdBy, GETDATE(), GETDATE()
                )
            `);

        const insertedId = result.recordset[0]?.ChequeID;
        res.status(201).json({ success: true, message: 'บันทึกข้อมูลเช็คเรียบร้อยแล้ว', chequeId: insertedId });
    } catch (err) {
        console.error('Error creating cheque form:', err);
        res.status(500).json({ message: 'ไม่สามารถบันทึกข้อมูลเช็คได้: ' + err.message });
    }
});

// ── PUT /api/cheque-forms/:id: แก้ไขข้อมูลเช็ค ──
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const {
            chequeNo,
            payeeOrPayer,
            amount,
            issueDate,
            dueDate,
            refDocNo = '',
            notes = ''
        } = req.body;

        if (!payeeOrPayer || !amount || !issueDate) {
            return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน (ชื่อผู้รับเงิน, จำนวนเงิน, วันที่สั่งจ่าย ต้องมีค่า)' });
        }

        const pool = await poolPromise;
        
        // Backup to History first
        const backupReq = pool.request();
        backupReq.input('id', sql.Int, req.params.id);
        await backupReq.query(`
            INSERT INTO ChequesHistory (
                ChequeID, Revision, ChequeNo, ChequeType, BankName, BankBranch, AccountNo,
                PayeeOrPayer, Amount, IssueDate, DueDate, DepositDate, ClearedDate, Status,
                RefDocNo, Notes, CompanyID, CreatedBy, CreatedAt, UpdatedAt
            )
            SELECT 
                ChequeID, ISNULL(Revision, 1), ChequeNo, ChequeType, BankName, BankBranch, AccountNo,
                PayeeOrPayer, Amount, IssueDate, DueDate, DepositDate, ClearedDate, Status,
                RefDocNo, Notes, CompanyID, CreatedBy, CreatedAt, UpdatedAt
            FROM Cheques
            WHERE ChequeID = @id
        `);

        // Then update the main record
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('chequeNo', sql.NVarChar, chequeNo || '')
            .input('payeeOrPayer', sql.NVarChar, payeeOrPayer)
            .input('amount', sql.Decimal(18, 2), parseFloat(amount) || 0)
            .input('issueDate', sql.Date, issueDate)
            .input('dueDate', sql.Date, dueDate || issueDate)
            .input('refDocNo', sql.NVarChar, refDocNo)
            .input('notes', sql.NVarChar, notes)
            .query(`
                UPDATE Cheques 
                SET ChequeNo = @chequeNo,
                    PayeeOrPayer = @payeeOrPayer,
                    Amount = @amount,
                    IssueDate = @issueDate,
                    DueDate = @dueDate,
                    RefDocNo = @refDocNo,
                    Notes = @notes,
                    Revision = ISNULL(Revision, 1) + 1,
                    UpdatedAt = GETDATE()
                WHERE ChequeID = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'ไม่พบเช็คที่ต้องการแก้ไข' });
        }
        res.json({ success: true, message: 'อัปเดตข้อมูลเช็คเรียบร้อยแล้ว' });
    } catch (err) {
        console.error('Error updating cheque:', err);
        res.status(500).json({ message: 'ไม่สามารถอัปเดตข้อมูลเช็คได้: ' + err.message });
    }
});

// ── GET /api/cheque-forms/:id/history: ดึงประวัติการแก้ไขข้อมูลเช็ค ──
router.get('/:id/history', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT HistoryID, Revision, Status, ArchivedAt, Amount, PayeeOrPayer
                FROM ChequesHistory
                WHERE ChequeID = @id
                ORDER BY Revision DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching cheque history:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch history', error: err.message });
    }
});

// ── GET /api/cheque-forms/history/:historyId: ดึงข้อมูลเช็คแบบเจาะจงเวอร์ชัน (Revision) ──
router.get('/history/:historyId', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('hid', sql.Int, req.params.historyId)
            .query(`SELECT * FROM ChequesHistory WHERE HistoryID = @hid`);
            
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'History not found' });
        }
        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error('Error fetching specific cheque history:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch history detail', error: err.message });
    }
});

// ── DELETE /api/cheque-forms/:id: ลบข้อมูลเช็ค ──
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`DELETE FROM Cheques WHERE ChequeID = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'ไม่พบรายการเช็คที่ต้องการลบ' });
        }
        res.json({ success: true, message: 'ลบรายการเช็คเรียบร้อยแล้ว' });
    } catch (err) {
        console.error('Error deleting cheque:', err);
        res.status(500).json({ message: 'ไม่สามารถลบรายการเช็คได้: ' + err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// Helper to resolve CompanyID
function getCompanyId(req) {
    const headerVal = req.headers['x-company-id'];
    if (headerVal && !isNaN(parseInt(headerVal, 10))) {
        return parseInt(headerVal, 10);
    }
    if (req.user && req.user.activeCompanyId) {
        return parseInt(req.user.activeCompanyId, 10);
    }
    if (req.query.companyId && !isNaN(parseInt(req.query.companyId, 10))) {
        return parseInt(req.query.companyId, 10);
    }
    return 2; // Default to ELITE
}

// =============================================================================
// GET /api/cheques/summary — สรุปภาพรวมเช็ค (KPI Cards)
// =============================================================================
router.get('/summary', async (req, res) => {
    try {
        const pool = await poolPromise;
        const companyId = getCompanyId(req);

        const result = await pool.request()
            .input('companyId', sql.Int, companyId)
            .query(`
                SELECT 
                    COUNT(*) AS totalCheques,
                    SUM(CASE WHEN Status = 'pending' THEN Amount ELSE 0 END) AS pendingAmount,
                    SUM(CASE WHEN Status = 'pending' THEN 1 ELSE 0 END) AS pendingCount,
                    SUM(CASE WHEN Status = 'deposited' THEN Amount ELSE 0 END) AS depositedAmount,
                    SUM(CASE WHEN Status = 'deposited' THEN 1 ELSE 0 END) AS depositedCount,
                    SUM(CASE WHEN Status = 'cleared' THEN Amount ELSE 0 END) AS clearedAmount,
                    SUM(CASE WHEN Status = 'cleared' THEN 1 ELSE 0 END) AS clearedCount,
                    SUM(CASE WHEN Status = 'bounced' THEN Amount ELSE 0 END) AS bouncedAmount,
                    SUM(CASE WHEN Status = 'bounced' THEN 1 ELSE 0 END) AS bouncedCount,
                    
                    -- เช็ครับ
                    SUM(CASE WHEN ChequeType = 'received' AND Status = 'pending' THEN Amount ELSE 0 END) AS receivedPendingAmount,
                    SUM(CASE WHEN ChequeType = 'received' AND Status = 'pending' THEN 1 ELSE 0 END) AS receivedPendingCount,
                    SUM(CASE WHEN ChequeType = 'received' AND Status = 'cleared' THEN Amount ELSE 0 END) AS receivedClearedAmount,
                    
                    -- เช็คจ่าย
                    SUM(CASE WHEN ChequeType = 'issued' AND Status = 'pending' THEN Amount ELSE 0 END) AS issuedPendingAmount,
                    SUM(CASE WHEN ChequeType = 'issued' AND Status = 'pending' THEN 1 ELSE 0 END) AS issuedPendingCount,
                    SUM(CASE WHEN ChequeType = 'issued' AND Status = 'cleared' THEN Amount ELSE 0 END) AS issuedClearedAmount,

                    -- เช็คใกล้ครบกำหนดภายใน 7 วัน (สถานะ pending)
                    SUM(CASE 
                        WHEN Status = 'pending' AND DueDate BETWEEN CAST(GETDATE() AS DATE) AND DATEADD(day, 7, CAST(GETDATE() AS DATE))
                        THEN 1 ELSE 0 
                    END) AS dueSoonCount,
                    SUM(CASE 
                        WHEN Status = 'pending' AND DueDate BETWEEN CAST(GETDATE() AS DATE) AND DATEADD(day, 7, CAST(GETDATE() AS DATE))
                        THEN Amount ELSE 0 
                    END) AS dueSoonAmount
                FROM Cheques
                WHERE CompanyID = @companyId AND Status != 'cancelled'
            `);

        res.json(result.recordset[0] || {});
    } catch (err) {
        console.error('Error fetching cheques summary:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุปเช็ค: ' + err.message });
    }
});

// =============================================================================
// GET /api/cheques — รายการเช็คทั้งหมด (พร้อม filter & search)
// =============================================================================
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const companyId = getCompanyId(req);
        const { chequeType, status, search, startDate, endDate } = req.query;

        let query = `
            SELECT 
                c.ChequeID, c.ChequeNo, c.ChequeType, c.BankName, c.BankBranch, c.AccountNo,
                c.PayeeOrPayer, c.Amount, c.IssueDate, c.DueDate, c.DepositDate, c.ClearedDate,
                c.Status, c.RefDocNo, c.Notes, c.CompanyID, c.CreatedAt, c.UpdatedAt,
                u.display_name AS CreatedByName
            FROM Cheques c
            LEFT JOIN Users u ON c.CreatedBy = u.user_id
            WHERE c.CompanyID = @companyId
        `;

        const request = pool.request().input('companyId', sql.Int, companyId);

        if (chequeType && chequeType !== 'all') {
            query += ` AND c.ChequeType = @chequeType`;
            request.input('chequeType', sql.NVarChar(20), chequeType);
        }

        if (status && status !== 'all') {
            query += ` AND c.Status = @status`;
            request.input('status', sql.NVarChar(30), status);
        }

        if (search && search.trim()) {
            query += ` AND (c.ChequeNo LIKE @search OR c.PayeeOrPayer LIKE @search OR c.BankName LIKE @search OR c.RefDocNo LIKE @search)`;
            request.input('search', sql.NVarChar(100), `%${search.trim()}%`);
        }

        if (startDate) {
            query += ` AND c.DueDate >= @startDate`;
            request.input('startDate', sql.Date, startDate);
        }

        if (endDate) {
            query += ` AND c.DueDate <= @endDate`;
            request.input('endDate', sql.Date, endDate);
        }

        query += ` ORDER BY c.DueDate ASC, c.ChequeID DESC`;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching cheques:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการเช็ค: ' + err.message });
    }
});

// =============================================================================
// GET /api/cheques/:id — รายละเอียดเช็คตาม ID
// =============================================================================
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    c.ChequeID, c.ChequeNo, c.ChequeType, c.BankName, c.BankBranch, c.AccountNo,
                    c.PayeeOrPayer, c.Amount, c.IssueDate, c.DueDate, c.DepositDate, c.ClearedDate,
                    c.Status, c.RefDocNo, c.Notes, c.CompanyID, c.CreatedAt, c.UpdatedAt,
                    u.display_name AS CreatedByName
                FROM Cheques c
                LEFT JOIN Users u ON c.CreatedBy = u.user_id
                WHERE c.ChequeID = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลเช็ค' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching cheque by ID:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาด: ' + err.message });
    }
});

// =============================================================================
// POST /api/cheques — สร้างเช็คใหม่
// =============================================================================
router.post('/', async (req, res) => {
    try {
        const {
            chequeNo,
            chequeType, // 'received' | 'issued'
            bankName,
            bankBranch,
            accountNo,
            payeeOrPayer,
            amount,
            issueDate,
            dueDate,
            depositDate,
            clearedDate,
            status = 'pending',
            refDocNo,
            notes
        } = req.body;

        if (!chequeNo || !chequeType || !bankName || !payeeOrPayer || !amount || !dueDate) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (เลขที่เช็ค, ประเภทเช็ค, ธนาคาร, ผู้รับ/สั่งจ่าย, จำนวนเงิน, วันที่ครบกำหนด)' });
        }

        const pool = await poolPromise;
        const companyId = getCompanyId(req);
        const createdBy = req.user ? req.user.id : null;

        const result = await pool.request()
            .input('chequeNo', sql.NVarChar(50), chequeNo.trim())
            .input('chequeType', sql.NVarChar(20), chequeType)
            .input('bankName', sql.NVarChar(100), bankName.trim())
            .input('bankBranch', sql.NVarChar(100), bankBranch ? bankBranch.trim() : null)
            .input('accountNo', sql.NVarChar(50), accountNo ? accountNo.trim() : null)
            .input('payeeOrPayer', sql.NVarChar(255), payeeOrPayer.trim())
            .input('amount', sql.Decimal(18, 2), parseFloat(amount))
            .input('issueDate', sql.Date, issueDate || null)
            .input('dueDate', sql.Date, dueDate)
            .input('depositDate', sql.Date, depositDate || null)
            .input('clearedDate', sql.Date, clearedDate || null)
            .input('status', sql.NVarChar(30), status)
            .input('refDocNo', sql.NVarChar(100), refDocNo ? refDocNo.trim() : null)
            .input('notes', sql.NVarChar(sql.MAX), notes ? notes.trim() : null)
            .input('companyId', sql.Int, companyId)
            .input('createdBy', sql.Int, createdBy)
            .query(`
                INSERT INTO Cheques 
                    (ChequeNo, ChequeType, BankName, BankBranch, AccountNo, PayeeOrPayer, 
                     Amount, IssueDate, DueDate, DepositDate, ClearedDate, Status, RefDocNo, Notes, CompanyID, CreatedBy)
                OUTPUT INSERTED.ChequeID
                VALUES 
                    (@chequeNo, @chequeType, @bankName, @bankBranch, @accountNo, @payeeOrPayer, 
                     @amount, @issueDate, @dueDate, @depositDate, @clearedDate, @status, @refDocNo, @notes, @companyId, @createdBy)
            `);

        const newId = result.recordset[0].ChequeID;
        res.status(201).json({ message: 'บันทึกเช็คเรียบร้อยแล้ว', chequeId: newId });
    } catch (err) {
        console.error('Error creating cheque:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกเช็ค: ' + err.message });
    }
});

// =============================================================================
// PUT /api/cheques/:id — อัปเดตข้อมูลเช็ค
// =============================================================================
router.put('/:id', async (req, res) => {
    try {
        const chequeId = req.params.id;
        const {
            chequeNo,
            chequeType,
            bankName,
            bankBranch,
            accountNo,
            payeeOrPayer,
            amount,
            issueDate,
            dueDate,
            depositDate,
            clearedDate,
            status,
            refDocNo,
            notes
        } = req.body;

        const pool = await poolPromise;

        await pool.request()
            .input('id', sql.Int, chequeId)
            .input('chequeNo', sql.NVarChar(50), chequeNo.trim())
            .input('chequeType', sql.NVarChar(20), chequeType)
            .input('bankName', sql.NVarChar(100), bankName.trim())
            .input('bankBranch', sql.NVarChar(100), bankBranch ? bankBranch.trim() : null)
            .input('accountNo', sql.NVarChar(50), accountNo ? accountNo.trim() : null)
            .input('payeeOrPayer', sql.NVarChar(255), payeeOrPayer.trim())
            .input('amount', sql.Decimal(18, 2), parseFloat(amount))
            .input('issueDate', sql.Date, issueDate || null)
            .input('dueDate', sql.Date, dueDate)
            .input('depositDate', sql.Date, depositDate || null)
            .input('clearedDate', sql.Date, clearedDate || null)
            .input('status', sql.NVarChar(30), status)
            .input('refDocNo', sql.NVarChar(100), refDocNo ? refDocNo.trim() : null)
            .input('notes', sql.NVarChar(sql.MAX), notes ? notes.trim() : null)
            .query(`
                UPDATE Cheques SET
                    ChequeNo = @chequeNo,
                    ChequeType = @chequeType,
                    BankName = @bankName,
                    BankBranch = @bankBranch,
                    AccountNo = @accountNo,
                    PayeeOrPayer = @payeeOrPayer,
                    Amount = @amount,
                    IssueDate = @issueDate,
                    DueDate = @dueDate,
                    DepositDate = @depositDate,
                    ClearedDate = @clearedDate,
                    Status = @status,
                    RefDocNo = @refDocNo,
                    Notes = @notes,
                    UpdatedAt = GETDATE()
                WHERE ChequeID = @id
            `);

        res.json({ message: 'อัปเดตข้อมูลเช็คสำเร็จ' });
    } catch (err) {
        console.error('Error updating cheque:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลเช็ค: ' + err.message });
    }
});

// =============================================================================
// PATCH /api/cheques/:id/status — เปลี่ยนสถานะเช็คด่วน
// =============================================================================
router.patch('/:id/status', async (req, res) => {
    try {
        const chequeId = req.params.id;
        const { status, clearedDate, depositDate, notes } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'กรุณาระบุสถานะ' });
        }

        const pool = await poolPromise;
        const request = pool.request()
            .input('id', sql.Int, chequeId)
            .input('status', sql.NVarChar(30), status);

        let updateClause = 'Status = @status, UpdatedAt = GETDATE()';

        if (status === 'cleared') {
            updateClause += ', ClearedDate = COALESCE(@clearedDate, CAST(GETDATE() AS DATE))';
            request.input('clearedDate', sql.Date, clearedDate || null);
        } else if (status === 'deposited') {
            updateClause += ', DepositDate = COALESCE(@depositDate, CAST(GETDATE() AS DATE))';
            request.input('depositDate', sql.Date, depositDate || null);
        }

        if (notes !== undefined) {
            updateClause += ', Notes = @notes';
            request.input('notes', sql.NVarChar(sql.MAX), notes);
        }

        await request.query(`UPDATE Cheques SET ${updateClause} WHERE ChequeID = @id`);

        res.json({ message: `เปลี่ยนสถานะเป็น ${status} สำเร็จ` });
    } catch (err) {
        console.error('Error updating cheque status:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ' + err.message });
    }
});

// =============================================================================
// DELETE /api/cheques/:id — ลบเช็ค
// =============================================================================
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM Cheques WHERE ChequeID = @id');

        res.json({ message: 'ลบเช็คเรียบร้อยแล้ว' });
    } catch (err) {
        console.error('Error deleting cheque:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบเช็ค: ' + err.message });
    }
});

module.exports = router;

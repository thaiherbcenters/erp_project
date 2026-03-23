const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { poolPromise } = require('../config/db');

// ── Config: กำหนด user_id ของ approvers (ดึงจาก DB ตอนรัน) ──
let APPROVER_STEP1_ID = null; // ณัฐกิตติ์ — ตัวแทนฝ่ายบริหาร
let APPROVER_STEP2_ID = null; // ธวัช — ประธานวิสาหกิจชุมชน

async function loadApproverIds() {
    try {
        const pool = await poolPromise;
        const r1 = await pool.request()
            .input('u', sql.NVarChar, 'natthakit')
            .query('SELECT user_id FROM Users WHERE username = @u');
        if (r1.recordset.length) APPROVER_STEP1_ID = r1.recordset[0].user_id;

        const r2 = await pool.request()
            .input('u', sql.NVarChar, 'thawat')
            .query('SELECT user_id FROM Users WHERE username = @u');
        if (r2.recordset.length) APPROVER_STEP2_ID = r2.recordset[0].user_id;

        console.log(`📋 Approvers loaded — Step1: ${APPROVER_STEP1_ID}, Step2: ${APPROVER_STEP2_ID}`);
    } catch (err) {
        console.error('Error loading approver IDs:', err);
    }
}
loadApproverIds();

// ═══════════════════════════════════════════════════════════════
// POST /api/submissions — ส่งฟอร์ม (สร้าง submission ใหม่ หรือ resubmit)
// ═══════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
    try {
        const { formCode, formName, formData, submittedBy, submittedByName, parentSubmissionId } = req.body;

        if (!formCode || !formData || !submittedBy) {
            return res.status(400).json({ message: 'ข้อมูลไม่ครบ (formCode, formData, submittedBy)' });
        }

        const pool = await poolPromise;

        let revisionNumber = 0;
        let parentId = null;

        // ถ้าเป็น resubmit (แก้ไขจากฉบับเดิม)
        if (parentSubmissionId) {
            parentId = parseInt(parentSubmissionId);

            // หา original root submission id
            const parentSub = await pool.request()
                .input('pid', sql.Int, parentId)
                .query('SELECT submission_id, revision_number, parent_submission_id FROM FormSubmissions WHERE submission_id = @pid');

            if (parentSub.recordset.length === 0) {
                return res.status(404).json({ message: 'ไม่พบเอกสารต้นฉบับ' });
            }

            // คำนวณ revision number: หา max revision ใน chain
            const rootId = parentSub.recordset[0].parent_submission_id || parentId;
            const maxRev = await pool.request()
                .input('rootId', sql.Int, rootId)
                .input('parentId', sql.Int, parentId)
                .query(`
                    SELECT ISNULL(MAX(revision_number), 0) as max_rev
                    FROM FormSubmissions
                    WHERE parent_submission_id = @rootId
                       OR parent_submission_id = @parentId
                       OR submission_id = @rootId
                `);
            revisionNumber = (maxRev.recordset[0].max_rev || 0) + 1;

            // Update parent status เป็น "ถูกแทนที่"
            await pool.request()
                .input('pid', sql.Int, parentId)
                .input('status', sql.NVarChar, `ถูกแทนที่ (Rev.${revisionNumber})`)
                .query(`UPDATE FormSubmissions SET overall_status = @status WHERE submission_id = @pid`);
        }

        const result = await pool.request()
            .input('form_code', sql.NVarChar, formCode)
            .input('form_name', sql.NVarChar, formName || '')
            .input('form_data', sql.NVarChar, JSON.stringify(formData))
            .input('submitted_by', sql.Int, submittedBy)
            .input('submitted_by_name', sql.NVarChar, submittedByName || '')
            .input('revision_number', sql.Int, revisionNumber)
            .input('parent_submission_id', sql.Int, parentId)
            .query(`
                INSERT INTO FormSubmissions (form_code, form_name, form_data, submitted_by, submitted_by_name, revision_number, parent_submission_id)
                OUTPUT INSERTED.submission_id, INSERTED.form_code, INSERTED.overall_status, INSERTED.submitted_at, INSERTED.revision_number
                VALUES (@form_code, @form_name, @form_data, @submitted_by, @submitted_by_name, @revision_number, @parent_submission_id)
            `);

        const newSub = result.recordset[0];
        res.status(201).json({
            message: parentId ? `ส่งเอกสารฉบับแก้ไข (Rev.${revisionNumber}) เรียบร้อยแล้ว` : 'ส่งเอกสารเรียบร้อยแล้ว',
            submission: newSub,
        });
    } catch (err) {
        console.error('Error creating submission:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาด: ' + err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/submissions — ดึงรายการ submissions ทั้งหมด (DAR)
// ═══════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT f.submission_id, f.form_code, f.form_name, f.form_data, f.submitted_by, f.submitted_by_name,
                   u.username as submitted_by_username,
                   f.submitted_at, f.step1_status, f.step1_comment, f.step1_approved_at, f.step1_approved_by,
                   u1.username as step1_approved_by_username,
                   f.step2_status, f.step2_comment, f.step2_approved_at, f.step2_approved_by,
                   u2.username as step2_approved_by_username,
                   f.overall_status,
                   f.revision_number, f.parent_submission_id,
                   f.revision_comment, f.revision_requested_by, f.revision_requested_at,
                   u3.username as revision_requested_by_username
            FROM FormSubmissions f
            LEFT JOIN Users u ON f.submitted_by = u.user_id
            LEFT JOIN Users u1 ON f.step1_approved_by = u1.user_id
            LEFT JOIN Users u2 ON f.step2_approved_by = u2.user_id
            LEFT JOIN Users u3 ON f.revision_requested_by = u3.user_id
            ORDER BY f.submitted_at DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching submissions:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/submissions/pending/:userId — ดึงรายการรออนุมัติ
// ═══════════════════════════════════════════════════════════════
router.get('/pending/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const pool = await poolPromise;

        let query = '';
        const selectFields = `f.*, u.username as submitted_by_username, u1.username as step1_approved_by_username, u2.username as step2_approved_by_username`;
        const joinClauses = `LEFT JOIN Users u ON f.submitted_by = u.user_id LEFT JOIN Users u1 ON f.step1_approved_by = u1.user_id LEFT JOIN Users u2 ON f.step2_approved_by = u2.user_id`;

        if (userId === APPROVER_STEP1_ID) {
            query = `SELECT ${selectFields} FROM FormSubmissions f ${joinClauses} WHERE f.step1_status = 'pending' ORDER BY f.submitted_at DESC`;
        } else if (userId === APPROVER_STEP2_ID) {
            query = `SELECT ${selectFields} FROM FormSubmissions f ${joinClauses} WHERE f.step1_status = 'approved' AND f.step2_status = 'pending' ORDER BY f.submitted_at DESC`;
        } else {
            query = `SELECT ${selectFields} FROM FormSubmissions f ${joinClauses} WHERE f.submitted_by = ${userId} ORDER BY f.submitted_at DESC`;
        }

        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching pending:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ═══════════════════════════════════════════════════════════════
// PUT /api/submissions/:id/approve — อนุมัติ
// ═══════════════════════════════════════════════════════════════
router.put('/:id/approve', async (req, res) => {
    try {
        const submissionId = parseInt(req.params.id);
        const { userId, comment } = req.body;

        const pool = await poolPromise;

        const sub = await pool.request()
            .input('id', sql.Int, submissionId)
            .query('SELECT * FROM FormSubmissions WHERE submission_id = @id');

        if (sub.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบเอกสาร' });
        }

        const doc = sub.recordset[0];

        if (userId === APPROVER_STEP1_ID && doc.step1_status === 'pending') {
            await pool.request()
                .input('id', sql.Int, submissionId)
                .input('approved_by', sql.Int, userId)
                .input('comment', sql.NVarChar, comment || '')
                .query(`
                    UPDATE FormSubmissions
                    SET step1_status = 'approved',
                        step1_approved_by = @approved_by,
                        step1_approved_at = GETDATE(),
                        step1_comment = @comment,
                        overall_status = N'รอประธานวิสาหกิจชุมชน'
                    WHERE submission_id = @id
                `);
            res.json({ message: 'อนุมัติขั้นที่ 1 สำเร็จ (ส่งต่อให้ประธานแล้ว)', newStatus: 'รอประธานวิสาหกิจชุมชน' });

        } else if (userId === APPROVER_STEP2_ID && doc.step1_status === 'approved' && doc.step2_status === 'pending') {
            await pool.request()
                .input('id', sql.Int, submissionId)
                .input('approved_by', sql.Int, userId)
                .input('comment', sql.NVarChar, comment || '')
                .query(`
                    UPDATE FormSubmissions
                    SET step2_status = 'approved',
                        step2_approved_by = @approved_by,
                        step2_approved_at = GETDATE(),
                        step2_comment = @comment,
                        overall_status = N'อนุมัติแล้ว'
                    WHERE submission_id = @id
                `);
            res.json({ message: 'อนุมัติขั้นสุดท้ายสำเร็จ', newStatus: 'อนุมัติแล้ว' });

        } else {
            res.status(400).json({ message: 'ไม่สามารถอนุมัติได้ (ไม่ใช่ขั้นตอนของคุณหรืออนุมัติไปแล้ว)' });
        }
    } catch (err) {
        console.error('Error approving:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาด: ' + err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// PUT /api/submissions/:id/reject — ไม่อนุมัติ
// ═══════════════════════════════════════════════════════════════
router.put('/:id/reject', async (req, res) => {
    try {
        const submissionId = parseInt(req.params.id);
        const { userId, comment } = req.body;

        const pool = await poolPromise;

        const sub = await pool.request()
            .input('id', sql.Int, submissionId)
            .query('SELECT * FROM FormSubmissions WHERE submission_id = @id');

        if (sub.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบเอกสาร' });
        }

        const doc = sub.recordset[0];

        if (userId === APPROVER_STEP1_ID && doc.step1_status === 'pending') {
            await pool.request()
                .input('id', sql.Int, submissionId)
                .input('approved_by', sql.Int, userId)
                .input('comment', sql.NVarChar, comment || '')
                .query(`
                    UPDATE FormSubmissions
                    SET step1_status = 'rejected',
                        step1_approved_by = @approved_by,
                        step1_approved_at = GETDATE(),
                        step1_comment = @comment,
                        overall_status = N'ไม่อนุมัติ'
                    WHERE submission_id = @id
                `);
            res.json({ message: 'ไม่อนุมัติ (ขั้นที่ 1)', newStatus: 'ไม่อนุมัติ' });

        } else if (userId === APPROVER_STEP2_ID && doc.step1_status === 'approved' && doc.step2_status === 'pending') {
            await pool.request()
                .input('id', sql.Int, submissionId)
                .input('approved_by', sql.Int, userId)
                .input('comment', sql.NVarChar, comment || '')
                .query(`
                    UPDATE FormSubmissions
                    SET step2_status = 'rejected',
                        step2_approved_by = @approved_by,
                        step2_approved_at = GETDATE(),
                        step2_comment = @comment,
                        overall_status = N'ไม่อนุมัติ'
                    WHERE submission_id = @id
                `);
            res.json({ message: 'ไม่อนุมัติ (ขั้นสุดท้าย)', newStatus: 'ไม่อนุมัติ' });

        } else {
            res.status(400).json({ message: 'ไม่สามารถดำเนินการได้ (ไม่ใช่ขั้นตอนของคุณ)' });
        }
    } catch (err) {
        console.error('Error rejecting:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาด: ' + err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// PUT /api/submissions/:id/request-revision — ส่งกลับแก้ไข
// ═══════════════════════════════════════════════════════════════
router.put('/:id/request-revision', async (req, res) => {
    try {
        const submissionId = parseInt(req.params.id);
        const { userId, comment } = req.body;

        if (!comment || comment.trim() === '') {
            return res.status(400).json({ message: 'กรุณาระบุเหตุผลที่ต้องแก้ไข' });
        }

        const pool = await poolPromise;

        const sub = await pool.request()
            .input('id', sql.Int, submissionId)
            .query('SELECT * FROM FormSubmissions WHERE submission_id = @id');

        if (sub.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบเอกสาร' });
        }

        const doc = sub.recordset[0];

        // Step 1 approver ส่งกลับแก้ไข
        if (userId === APPROVER_STEP1_ID && doc.step1_status === 'pending') {
            await pool.request()
                .input('id', sql.Int, submissionId)
                .input('revision_comment', sql.NVarChar, comment)
                .input('revision_requested_by', sql.Int, userId)
                .query(`
                    UPDATE FormSubmissions
                    SET step1_status = 'revision_requested',
                        step1_approved_by = @revision_requested_by,
                        step1_approved_at = GETDATE(),
                        step1_comment = @revision_comment,
                        revision_comment = @revision_comment,
                        revision_requested_by = @revision_requested_by,
                        revision_requested_at = GETDATE(),
                        overall_status = N'ส่งกลับแก้ไข'
                    WHERE submission_id = @id
                `);
            res.json({ message: 'ส่งกลับแก้ไขเรียบร้อย (ขั้นที่ 1)', newStatus: 'ส่งกลับแก้ไข' });

        // Step 2 approver ส่งกลับแก้ไข
        } else if (userId === APPROVER_STEP2_ID && doc.step1_status === 'approved' && doc.step2_status === 'pending') {
            await pool.request()
                .input('id', sql.Int, submissionId)
                .input('revision_comment', sql.NVarChar, comment)
                .input('revision_requested_by', sql.Int, userId)
                .query(`
                    UPDATE FormSubmissions
                    SET step2_status = 'revision_requested',
                        step2_approved_by = @revision_requested_by,
                        step2_approved_at = GETDATE(),
                        step2_comment = @revision_comment,
                        revision_comment = @revision_comment,
                        revision_requested_by = @revision_requested_by,
                        revision_requested_at = GETDATE(),
                        overall_status = N'ส่งกลับแก้ไข'
                    WHERE submission_id = @id
                `);
            res.json({ message: 'ส่งกลับแก้ไขเรียบร้อย (ขั้นที่ 2)', newStatus: 'ส่งกลับแก้ไข' });

        } else {
            res.status(400).json({ message: 'ไม่สามารถดำเนินการได้ (ไม่ใช่ขั้นตอนของคุณ)' });
        }
    } catch (err) {
        console.error('Error requesting revision:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาด: ' + err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/submissions/:id/history — ดึงประวัติ revision chain
// ═══════════════════════════════════════════════════════════════
router.get('/:id/history', async (req, res) => {
    try {
        const submissionId = parseInt(req.params.id);
        const pool = await poolPromise;

        // หา root submission id
        const current = await pool.request()
            .input('id', sql.Int, submissionId)
            .query('SELECT submission_id, parent_submission_id FROM FormSubmissions WHERE submission_id = @id');

        if (current.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบเอกสาร' });
        }

        const rootId = current.recordset[0].parent_submission_id || submissionId;

        // ดึงทุก revision ใน chain (root + children)
        const result = await pool.request()
            .input('rootId', sql.Int, rootId)
            .query(`
                SELECT f.submission_id, f.form_code, f.form_name, f.submitted_by_name,
                       f.submitted_at, f.overall_status, f.revision_number,
                       f.parent_submission_id, f.revision_comment,
                       u.username as revision_requested_by_username,
                       f.revision_requested_at
                FROM FormSubmissions f
                LEFT JOIN Users u ON f.revision_requested_by = u.user_id
                WHERE f.submission_id = @rootId
                   OR f.parent_submission_id = @rootId
                ORDER BY f.revision_number ASC
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/submissions/approver-ids — ดึง user_id ของ approvers
// ═══════════════════════════════════════════════════════════════
router.get('/approver-ids', async (req, res) => {
    res.json({
        step1: APPROVER_STEP1_ID,
        step2: APPROVER_STEP2_ID,
    });
});

module.exports = router;

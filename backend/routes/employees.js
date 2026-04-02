/**
 * =============================================================================
 * employees.js — API สำหรับจัดการข้อมูลพนักงาน (HR Module)
 * =============================================================================
 *
 * Endpoints:
 *   GET    /api/employees          — ดึงรายชื่อพนักงานทั้งหมด
 *   GET    /api/employees/:id      — ดึงข้อมูลพนักงานรายบุคคล
 *   POST   /api/employees          — เพิ่มพนักงานใหม่
 *   PUT    /api/employees/:id      — แก้ไขข้อมูลพนักงาน
 *   DELETE /api/employees/:id      — ลบพนักงาน (soft delete)
 *
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { poolPromise, sql } = require('../config/db');

// ============================================================
// Setup multer for avatar uploads
// ============================================================
const uploadDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// ============================================================
// Helper: Generate next employee code (THC-001, THC-002, ...)
// ============================================================
async function generateEmployeeCode(pool) {
    const result = await pool.request().query(`
        SELECT TOP 1 employee_code 
        FROM Employees 
        WHERE employee_code LIKE 'THC-%'
        ORDER BY employee_id DESC
    `);

    if (result.recordset.length === 0) {
        return 'THC-001';
    }

    const lastCode = result.recordset[0].employee_code; // e.g. "THC-005"
    const num = parseInt(lastCode.split('-')[1]) + 1;
    return `THC-${String(num).padStart(3, '0')}`;
}

// ============================================================
// 1. GET /api/employees — ดึงรายชื่อพนักงานทั้งหมด
// ============================================================
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const showAll = req.query.all === 'true';
        const condition = showAll ? '' : 'WHERE e.is_active = 1';

        const result = await pool.request().query(`
            SELECT 
                e.employee_id,
                e.employee_code,
                e.prefix,
                e.first_name,
                e.last_name,
                e.nickname,
                e.gender,
                e.date_of_birth,
                e.national_id,
                e.phone,
                e.email,
                e.address,
                e.profile_image_url,
                e.department_code,
                d.dept_name AS department_name,
                e.position,
                e.employment_type,
                e.start_date,
                e.end_date,
                e.probation_end_date,
                e.salary,
                e.education_level,
                e.education_institute,
                e.education_major,
                e.bank_name,
                e.bank_account_number,
                e.bank_account_name,
                e.social_security_id,
                e.tax_id,
                e.emergency_contact_name,
                e.emergency_contact_phone,
                e.emergency_contact_relation,
                e.status,
                e.is_active,
                e.created_at,
                e.updated_at
            FROM Employees e
            LEFT JOIN Departments d ON e.department_code = d.dept_code
            ${condition}
            ORDER BY e.employee_id ASC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching employees:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน' });
    }
});

// ============================================================
// 2. GET /api/employees/:id — ดึงข้อมูลพนักงานรายบุคคล
// ============================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    e.*,
                    d.dept_name AS department_name
                FROM Employees e
                LEFT JOIN Departments d ON e.department_code = d.dept_code
                WHERE e.employee_id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลพนักงาน' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching employee:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน' });
    }
});

// ============================================================
// 3. POST /api/employees — เพิ่มพนักงานใหม่
// ============================================================
router.post('/', async (req, res) => {
    try {
        const {
            prefix, first_name, last_name, nickname, gender,
            date_of_birth, national_id, phone, email, address,
            department_code, position, employment_type,
            start_date, end_date, probation_end_date, salary,
            education_level, education_institute, education_major,
            bank_name, bank_account_number, bank_account_name,
            social_security_id, tax_id,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
            status
        } = req.body;

        if (!first_name || !last_name) {
            return res.status(400).json({ message: 'กรุณากรอกชื่อและนามสกุล' });
        }

        const pool = await poolPromise;

        // Auto-generate employee code
        const employee_code = await generateEmployeeCode(pool);

        const result = await pool.request()
            .input('employee_code', sql.NVarChar, employee_code)
            .input('prefix', sql.NVarChar, prefix || null)
            .input('first_name', sql.NVarChar, first_name)
            .input('last_name', sql.NVarChar, last_name)
            .input('nickname', sql.NVarChar, nickname || null)
            .input('gender', sql.NVarChar, gender || null)
            .input('date_of_birth', sql.Date, date_of_birth || null)
            .input('national_id', sql.NVarChar, national_id || null)
            .input('phone', sql.NVarChar, phone || null)
            .input('email', sql.NVarChar, email || null)
            .input('address', sql.NVarChar, address || null)
            .input('department_code', sql.NVarChar, department_code || null)
            .input('position', sql.NVarChar, position || null)
            .input('employment_type', sql.NVarChar, employment_type || 'พนักงานประจำ')
            .input('start_date', sql.Date, start_date || null)
            .input('end_date', sql.Date, end_date || null)
            .input('probation_end_date', sql.Date, probation_end_date || null)
            .input('salary', sql.Decimal(12, 2), salary || null)
            .input('education_level', sql.NVarChar, education_level || null)
            .input('education_institute', sql.NVarChar, education_institute || null)
            .input('education_major', sql.NVarChar, education_major || null)
            .input('bank_name', sql.NVarChar, bank_name || null)
            .input('bank_account_number', sql.NVarChar, bank_account_number || null)
            .input('bank_account_name', sql.NVarChar, bank_account_name || null)
            .input('social_security_id', sql.NVarChar, social_security_id || null)
            .input('tax_id', sql.NVarChar, tax_id || null)
            .input('emergency_contact_name', sql.NVarChar, emergency_contact_name || null)
            .input('emergency_contact_phone', sql.NVarChar, emergency_contact_phone || null)
            .input('emergency_contact_relation', sql.NVarChar, emergency_contact_relation || null)
            .input('status', sql.NVarChar, status || 'ปฏิบัติงาน')
            .query(`
                INSERT INTO Employees (
                    employee_code, prefix, first_name, last_name, nickname, gender,
                    date_of_birth, national_id, phone, email, address,
                    department_code, position, employment_type,
                    start_date, end_date, probation_end_date, salary,
                    education_level, education_institute, education_major,
                    bank_name, bank_account_number, bank_account_name,
                    social_security_id, tax_id,
                    emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                    status
                )
                OUTPUT INSERTED.employee_id, INSERTED.employee_code
                VALUES (
                    @employee_code, @prefix, @first_name, @last_name, @nickname, @gender,
                    @date_of_birth, @national_id, @phone, @email, @address,
                    @department_code, @position, @employment_type,
                    @start_date, @end_date, @probation_end_date, @salary,
                    @education_level, @education_institute, @education_major,
                    @bank_name, @bank_account_number, @bank_account_name,
                    @social_security_id, @tax_id,
                    @emergency_contact_name, @emergency_contact_phone, @emergency_contact_relation,
                    @status
                )
            `);

        res.status(201).json({
            message: 'เพิ่มพนักงานสำเร็จ',
            employee: result.recordset[0]
        });
    } catch (err) {
        console.error('Error creating employee:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มพนักงาน' });
    }
});

// ============================================================
// 4. PUT /api/employees/:id — แก้ไขข้อมูลพนักงาน
// ============================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const request = pool.request().input('id', sql.Int, id);

        // รายชื่อ field ที่ยอมรับการ update
        const allowedFields = {
            prefix: sql.NVarChar,
            first_name: sql.NVarChar,
            last_name: sql.NVarChar,
            nickname: sql.NVarChar,
            gender: sql.NVarChar,
            date_of_birth: sql.Date,
            national_id: sql.NVarChar,
            phone: sql.NVarChar,
            email: sql.NVarChar,
            address: sql.NVarChar,
            profile_image_url: sql.NVarChar,
            department_code: sql.NVarChar,
            position: sql.NVarChar,
            employment_type: sql.NVarChar,
            start_date: sql.Date,
            end_date: sql.Date,
            probation_end_date: sql.Date,
            salary: sql.Decimal(12, 2),
            education_level: sql.NVarChar,
            education_institute: sql.NVarChar,
            education_major: sql.NVarChar,
            bank_name: sql.NVarChar,
            bank_account_number: sql.NVarChar,
            bank_account_name: sql.NVarChar,
            social_security_id: sql.NVarChar,
            tax_id: sql.NVarChar,
            emergency_contact_name: sql.NVarChar,
            emergency_contact_phone: sql.NVarChar,
            emergency_contact_relation: sql.NVarChar,
            status: sql.NVarChar,
            is_active: sql.Bit,
        };

        const sets = [];
        for (const [field, sqlType] of Object.entries(allowedFields)) {
            if (req.body[field] !== undefined) {
                sets.push(`${field} = @${field}`);
                request.input(field, sqlType, req.body[field]);
            }
        }

        if (sets.length === 0) {
            return res.status(400).json({ message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' });
        }

        // Always update updated_at
        sets.push('updated_at = GETDATE()');

        const result = await request.query(`
            UPDATE Employees SET ${sets.join(', ')} WHERE employee_id = @id
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'ไม่พบพนักงานที่ต้องการแก้ไข' });
        }

        res.json({ message: 'แก้ไขข้อมูลพนักงานสำเร็จ' });
    } catch (err) {
        console.error('Error updating employee:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลพนักงาน' });
    }
});

// ============================================================
// 5. DELETE /api/employees/:id — Soft delete พนักงาน
// ============================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE Employees 
                SET is_active = 0, status = N'ลาออก', updated_at = GETDATE()
                WHERE employee_id = @id AND is_active = 1
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'ไม่พบพนักงานที่ต้องการลบ' });
        }

        res.json({ message: 'ลบข้อมูลพนักงานสำเร็จ' });
    } catch (err) {
        console.error('Error deleting employee:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบข้อมูลพนักงาน' });
    }
});

// ============================================================
// 6. POST /api/employees/:id/avatar — อัพโหลดรูปประจำตัว
// ============================================================
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'กรุณาเลือกไฟล์รูปภาพ' });
        }

        const { id } = req.params;
        const pool = await poolPromise;

        // Path ที่จะเซฟลง DB (relative เพื่อให้ frontend เรียกผ่าน static route ได้)
        // เพราะเรา route /uploads ให้ serve static แล้ว
        // ดังนั้น path จะเป็น /uploads/avatars/filename.ext
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        // Get old avatar to delete it if exists
        const oldEmp = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT profile_image_url FROM Employees WHERE employee_id = @id');

        if (oldEmp.recordset.length === 0) {
            fs.unlinkSync(req.file.path); // delete uploaded if no employee found
            return res.status(404).json({ message: 'ไม่พบพนักงาน' });
        }

        // Update DB
        await pool.request()
            .input('profile_image_url', sql.NVarChar, avatarUrl)
            .input('id', sql.Int, id)
            .query(`
                UPDATE Employees 
                SET profile_image_url = @profile_image_url, updated_at = GETDATE()
                WHERE employee_id = @id
            `);

        // Try to delete old file if it sits in our upload dir
        const oldUrl = oldEmp.recordset[0].profile_image_url;
        if (oldUrl && oldUrl.startsWith('/uploads/avatars/')) {
            const oldPath = path.join(__dirname, '../', oldUrl);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        res.json({ 
            message: 'อัพโหลดรูปภาพสำเร็จ',
            profile_image_url: avatarUrl 
        });

    } catch (err) {
        console.error('Error uploading avatar:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ' });
    }
});

module.exports = router;

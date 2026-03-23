const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// ============================================================
// GET /api/departments — ดึงรายชื่อแผนกทั้งหมด
// ============================================================
router.get('/', async (req, res) => {
    try {
        const showAll = req.query.all === 'true'; // ?all=true → แสดงรวมที่ปิดแล้ว
        const pool = await poolPromise;
        const condition = showAll ? '' : 'WHERE d.is_active = 1';
        const result = await pool.request().query(`
            SELECT 
                d.dept_id, d.dept_code, d.dept_name, d.is_active, d.created_at,
                (SELECT COUNT(*) FROM Users u WHERE u.department = d.dept_code) AS user_count
            FROM Departments d
            ${condition}
            ORDER BY d.dept_id ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching departments:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ============================================================
// POST /api/departments — สร้างแผนกใหม่
// ============================================================
router.post('/', async (req, res) => {
    try {
        const { dept_code, dept_name } = req.body;

        if (!dept_code || !dept_name) {
            return res.status(400).json({ message: 'กรุณากรอกรหัสและชื่อแผนก' });
        }

        const pool = await poolPromise;

        // ตรวจสอบว่ารหัสซ้ำหรือไม่
        const check = await pool.request()
            .input('dept_code', sql.NVarChar, dept_code.toUpperCase())
            .query('SELECT dept_id FROM Departments WHERE dept_code = @dept_code');

        if (check.recordset.length > 0) {
            return res.status(400).json({ message: 'รหัสแผนกนี้ถูกใช้งานไปแล้ว' });
        }

        const result = await pool.request()
            .input('dept_code', sql.NVarChar, dept_code.toUpperCase())
            .input('dept_name', sql.NVarChar, dept_name)
            .query(`
                INSERT INTO Departments (dept_code, dept_name, is_active)
                OUTPUT INSERTED.dept_id, INSERTED.dept_code, INSERTED.dept_name, INSERTED.is_active, INSERTED.created_at
                VALUES (@dept_code, @dept_name, 1)
            `);

        res.status(201).json({ message: 'สร้างแผนกสำเร็จ', department: result.recordset[0] });
    } catch (err) {
        console.error('Error creating department:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างแผนก' });
    }
});

// ============================================================
// PUT /api/departments/:id — แก้ไขแผนก
// ============================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { dept_name, is_active } = req.body;
        const pool = await poolPromise;

        const request = pool.request().input('id', sql.Int, id);

        // Build dynamic SET clause
        const sets = [];
        if (dept_name !== undefined) {
            sets.push('dept_name = @dept_name');
            request.input('dept_name', sql.NVarChar, dept_name);
        }
        if (is_active !== undefined) {
            sets.push('is_active = @is_active');
            request.input('is_active', sql.Bit, is_active);
        }

        if (sets.length === 0) {
            return res.status(400).json({ message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' });
        }

        const result = await request.query(`
            UPDATE Departments SET ${sets.join(', ')} WHERE dept_id = @id
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'ไม่พบแผนกที่ต้องการแก้ไข' });
        }

        res.json({ message: 'แก้ไขแผนกสำเร็จ' });
    } catch (err) {
        console.error('Error updating department:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขแผนก' });
    }
});

// ============================================================
// DELETE /api/departments/:id — ลบแผนก (soft delete)
// ============================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        // Check if any users still belong to this department
        const dept = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT dept_code FROM Departments WHERE dept_id = @id');

        if (dept.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบแผนกนี้' });
        }

        const userCount = await pool.request()
            .input('dept_code', sql.NVarChar, dept.recordset[0].dept_code)
            .query('SELECT COUNT(*) as cnt FROM Users WHERE department = @dept_code');

        if (userCount.recordset[0].cnt > 0) {
            return res.status(400).json({ 
                message: `ไม่สามารถลบได้ เนื่องจากยังมีผู้ใช้ ${userCount.recordset[0].cnt} คนอยู่ในแผนกนี้` 
            });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Departments WHERE dept_id = @id');

        res.json({ message: 'ลบแผนกสำเร็จ' });
    } catch (err) {
        console.error('Error deleting department:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบแผนก' });
    }
});

module.exports = router;

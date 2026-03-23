const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// ============================================================
// GET /api/roles — ดึงตำแหน่งทั้งหมด (พร้อมแผนกที่ผูก)
// ============================================================
router.get('/', async (req, res) => {
    try {
        const deptFilter = req.query.dept; // ?dept=QC → filter by dept
        const showAll = req.query.all === 'true';
        const pool = await poolPromise;

        let query = `
            SELECT r.role_id, r.role_code, r.role_name, r.is_active,
                   STRING_AGG(rd.dept_code, ',') as dept_codes
            FROM Roles r
            LEFT JOIN RoleDepartments rd ON r.role_code = rd.role_code
        `;

        const conditions = [];
        const request = pool.request();

        if (!showAll) conditions.push('r.is_active = 1');
        if (deptFilter) {
            conditions.push('rd.dept_code = @dept');
            request.input('dept', sql.NVarChar, deptFilter);
        }

        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' GROUP BY r.role_id, r.role_code, r.role_name, r.is_active ORDER BY r.role_id ASC';

        const result = await request.query(query);

        // Parse dept_codes string into array
        const roles = result.recordset.map(r => ({
            ...r,
            dept_codes: r.dept_codes ? r.dept_codes.split(',') : []
        }));

        res.json(roles);
    } catch (err) {
        console.error('Error fetching roles:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ============================================================
// POST /api/roles — สร้างตำแหน่งใหม่
// ============================================================
router.post('/', async (req, res) => {
    try {
        const { role_code, role_name, dept_codes } = req.body;

        if (!role_code || !role_name) {
            return res.status(400).json({ message: 'กรุณากรอกรหัสและชื่อตำแหน่ง' });
        }

        const pool = await poolPromise;

        // Check duplicate
        const check = await pool.request()
            .input('code', sql.NVarChar, role_code.toLowerCase())
            .query('SELECT role_id FROM Roles WHERE role_code = @code');

        if (check.recordset.length > 0) {
            return res.status(400).json({ message: 'รหัสตำแหน่งนี้ถูกใช้งานไปแล้ว' });
        }

        // Insert role
        const result = await pool.request()
            .input('code', sql.NVarChar, role_code.toLowerCase())
            .input('name', sql.NVarChar, role_name)
            .query(`
                INSERT INTO Roles (role_code, role_name)
                OUTPUT INSERTED.role_id, INSERTED.role_code, INSERTED.role_name
                VALUES (@code, @name)
            `);

        // Insert dept mappings
        if (dept_codes && dept_codes.length > 0) {
            for (const dc of dept_codes) {
                await pool.request()
                    .input('role_code', sql.NVarChar, role_code.toLowerCase())
                    .input('dept_code', sql.NVarChar, dc)
                    .query('INSERT INTO RoleDepartments (role_code, dept_code) VALUES (@role_code, @dept_code)');
            }
        }

        res.status(201).json({ message: 'สร้างตำแหน่งสำเร็จ', role: result.recordset[0] });
    } catch (err) {
        console.error('Error creating role:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างตำแหน่ง' });
    }
});

// ============================================================
// PUT /api/roles/:id — แก้ไขตำแหน่ง
// ============================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { role_name, is_active, dept_codes } = req.body;
        const pool = await poolPromise;

        // Update role info
        const sets = [];
        const request = pool.request().input('id', sql.Int, id);

        if (role_name !== undefined) {
            sets.push('role_name = @role_name');
            request.input('role_name', sql.NVarChar, role_name);
        }
        if (is_active !== undefined) {
            sets.push('is_active = @is_active');
            request.input('is_active', sql.Bit, is_active);
        }

        if (sets.length > 0) {
            const result = await request.query(`UPDATE Roles SET ${sets.join(', ')} WHERE role_id = @id`);
            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ message: 'ไม่พบตำแหน่ง' });
            }
        }

        // Update dept mappings if provided
        if (dept_codes !== undefined) {
            // Get role_code
            const roleRow = await pool.request()
                .input('id', sql.Int, id)
                .query('SELECT role_code FROM Roles WHERE role_id = @id');

            if (roleRow.recordset.length > 0) {
                const roleCode = roleRow.recordset[0].role_code;

                // Delete existing mappings
                await pool.request()
                    .input('role_code', sql.NVarChar, roleCode)
                    .query('DELETE FROM RoleDepartments WHERE role_code = @role_code');

                // Insert new mappings
                for (const dc of dept_codes) {
                    await pool.request()
                        .input('role_code', sql.NVarChar, roleCode)
                        .input('dept_code', sql.NVarChar, dc)
                        .query('INSERT INTO RoleDepartments (role_code, dept_code) VALUES (@role_code, @dept_code)');
                }
            }
        }

        res.json({ message: 'แก้ไขตำแหน่งสำเร็จ' });
    } catch (err) {
        console.error('Error updating role:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขตำแหน่ง' });
    }
});

// ============================================================
// DELETE /api/roles/:id — ลบตำแหน่ง
// ============================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        // Get role_code to check users
        const roleRow = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT role_code FROM Roles WHERE role_id = @id');

        if (roleRow.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบตำแหน่ง' });
        }

        const roleCode = roleRow.recordset[0].role_code;

        // Check if users use this role
        const userCount = await pool.request()
            .input('role', sql.NVarChar, roleCode)
            .query('SELECT COUNT(*) as cnt FROM Users WHERE role = @role');

        if (userCount.recordset[0].cnt > 0) {
            return res.status(400).json({
                message: `ไม่สามารถลบได้ เนื่องจากยังมีผู้ใช้ ${userCount.recordset[0].cnt} คนใช้ตำแหน่งนี้`
            });
        }

        // Delete dept mappings
        await pool.request()
            .input('role_code', sql.NVarChar, roleCode)
            .query('DELETE FROM RoleDepartments WHERE role_code = @role_code');

        // Delete role
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Roles WHERE role_id = @id');

        res.json({ message: 'ลบตำแหน่งสำเร็จ' });
    } catch (err) {
        console.error('Error deleting role:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบตำแหน่ง' });
    }
});

module.exports = router;

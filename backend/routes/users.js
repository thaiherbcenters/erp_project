const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const bcrypt = require('bcryptjs');

// ============================================================
// 1. GET /api/users — Fetch all users
// ============================================================
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT user_id as id, username, display_name as displayName, role, department, avatar, is_active
            FROM Users 
            ORDER BY created_at ASC
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Error fetching users list' });
    }
});

// ============================================================
// 2. POST /api/users — Create a new user
// ============================================================
router.post('/', async (req, res) => {
    try {
        const { username, password, displayName, role, department, avatar } = req.body;

        if (!username || !password || !displayName || !role) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน(username, password, name, role)' });
        }

        const pool = await poolPromise;

        // ตรวจสอบว่ามี username นี้อยู่แล้วหรือยัง?
        const checkUser = await pool.request()
            .input('username', username)
            .query('SELECT user_id FROM Users WHERE username = @username');

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ message: 'Username นี้ถูกใช้งานไปแล้ว' });
        }

        // Hash รหัสผ่าน
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // หาอักษรย่อสำหรับ Avatar ถ้าไม่ได้ใส่มา
        let finalAvatar = avatar;
        if (!finalAvatar) {
            const words = displayName.trim().split(' ');
            if (words.length > 1) {
                finalAvatar = (words[0][0] + words[1][0]).toUpperCase().substring(0, 2);
            } else {
                finalAvatar = displayName.substring(0, 2).toUpperCase();
            }
        }

        // บันทึกลงฐานข้อมูล
        const result = await pool.request()
            .input('username', username)
            .input('password_hash', hashedPassword)
            .input('display_name', displayName)
            .input('role', role)
            .input('department', department || null)
            .input('avatar', finalAvatar)
            .query(`
                INSERT INTO Users (username, password_hash, display_name, role, department, avatar)
                OUTPUT INSERTED.user_id, INSERTED.username, INSERTED.display_name, INSERTED.role, INSERTED.department, INSERTED.avatar
                VALUES (@username, @password_hash, @display_name, @role, @department, @avatar)
            `);

        const newUser = result.recordset[0];

        res.status(201).json({ 
            message: 'สร้างผู้ใช้งานสำเร็จ', 
            user: {
                id: newUser.user_id,
                username: newUser.username,
                displayName: newUser.display_name,
                role: newUser.role,
                department: newUser.department,
                avatar: newUser.avatar
            }
        });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน' });
    }
});

// ============================================================
// 3. PUT /api/users/:id — แก้ไขข้อมูล user
// ============================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { displayName, role, department, avatar } = req.body;
        const pool = await poolPromise;

        const request = pool.request().input('id', sql.Int, id);
        const sets = [];

        if (displayName !== undefined) {
            sets.push('display_name = @display_name');
            request.input('display_name', sql.NVarChar, displayName);
        }
        if (role !== undefined) {
            sets.push('role = @role');
            request.input('role', sql.NVarChar, role);
        }
        if (department !== undefined) {
            sets.push('department = @department');
            request.input('department', sql.NVarChar, department);
        }
        if (avatar !== undefined) {
            sets.push('avatar = @avatar');
            request.input('avatar', sql.NVarChar, avatar);
        }

        if (sets.length === 0) {
            return res.status(400).json({ message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' });
        }

        const result = await request.query(`
            UPDATE Users SET ${sets.join(', ')} WHERE user_id = @id
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งานที่ต้องการแก้ไข' });
        }

        res.json({ message: 'แก้ไขข้อมูลสำเร็จ' });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' });
    }
});

// ============================================================
// 4. PUT /api/users/:id/password — Reset รหัสผ่าน
// ============================================================
router.put('/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 4) {
            return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('password_hash', sql.NVarChar, hashedPassword)
            .query('UPDATE Users SET password_hash = @password_hash WHERE user_id = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' });
    }
});

// ============================================================
// 5. PUT /api/users/:id/toggle — เปิด/ปิดสถานะ user
// ============================================================
router.put('/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE Users 
                SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END 
                OUTPUT INSERTED.is_active
                WHERE user_id = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        const newStatus = result.recordset[0].is_active;
        res.json({ 
            message: newStatus ? 'เปิดใช้งานสำเร็จ' : 'ปิดใช้งานสำเร็จ',
            is_active: newStatus
        });
    } catch (err) {
        console.error('Error toggling user:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
});

// ============================================================
// 6. DELETE /api/users/:id — Delete a user
// ============================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', id)
            .query('DELETE FROM Users WHERE user_id = @id');
            
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งานที่ต้องการลบ' });
        }
        res.status(200).json({ message: 'ลบผู้ใช้งานสำเร็จ' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน' });
    }
});

module.exports = router;

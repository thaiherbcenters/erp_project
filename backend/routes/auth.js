const express = require('express');
const router = express.Router();
const { poolPromise } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logAction } = require('../services/auditLog');

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'กรุณากรอกผู้ใช้งานและรหัสผ่าน' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', username)
            .query('SELECT * FROM Users WHERE username = @username');

        const user = result.recordset[0];

        if (!user) {
            await logAction(req, 'LOGIN_FAILED', 'auth', null, `Login ล้มเหลว: ไม่พบ username "${username}"`);
            return res.status(401).json({ message: 'ผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
        }

        if (!user.is_active) {
            await logAction(req, 'LOGIN_BLOCKED', 'auth', user.user_id, `บัญชี "${username}" ถูกระงับ — พยายาม Login`);
            return res.status(403).json({ message: 'บัญชีนี้ถูกระงับการใช้งาน' });
        }

        // Check password (รองรับทั้งแบบเข้ารหัส bcrypt และรหัสผ่านเดิมที่เป็น plain text)
        let isMatch = false;
        if (user.password_hash && (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$'))) {
            isMatch = await bcrypt.compare(password, user.password_hash);
        } else {
             // For plain text backward compatibility
            isMatch = password === user.password_hash;
        }

        if (!isMatch) {
            await logAction(req, 'LOGIN_FAILED', 'auth', user.user_id, `Login ล้มเหลว: รหัสผ่านไม่ถูกต้อง (${username})`);
            return res.status(401).json({ message: 'ผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
        }

        // Fetch permissions with data_scope
        const permResult = await pool.request()
             .input('user_id', user.user_id)
             .query('SELECT page_id, data_scope FROM UserPermissions WHERE user_id = @user_id AND is_granted = 1');

        const userData = {
            id: user.user_id,
            username: user.username,
            name: user.display_name,
            role: user.role,
            avatar: user.avatar,
            department: user.department || '',
            permissions: permResult.recordset.map(p => ({ page_id: p.page_id, data_scope: p.data_scope || 'all' }))
        };

        const token = jwt.sign(
            userData,
            process.env.JWT_SECRET || 'THAIHERB_SECRET_KEY_2026_ERP',
            { expiresIn: '8h' }
        );

        // Log การ Login สำเร็จ
        await logAction(req, 'LOGIN', 'auth', user.user_id, `${username} เข้าสู่ระบบสำเร็จ`);

        res.json({
            message: 'เข้าสู่ระบบสำเร็จ',
            user: userData,
            token
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
    }
});

module.exports = router;

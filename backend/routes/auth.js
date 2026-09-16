const express = require('express');
const router = express.Router();
const { poolPromise } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logAction } = require('../services/auditLog');
const authMiddleware = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorize');

// ============================================================
// Ping Route for Online Tracking
// ============================================================
router.post('/ping', authMiddleware, (req, res) => {
    // authMiddleware already calls touchUser
    res.json({ success: true, message: 'pong' });
});

// ============================================================
// Logout Route
// ============================================================
router.post('/logout', authMiddleware, (req, res) => {
    try {
        const { removeUser } = require('../services/onlineTracker');
        if (req.user && req.user.id) {
            removeUser(req.user.id);
        }
    } catch (e) {
        // ignore
    }
    res.json({ success: true, message: 'Logged out' });
});

// ============================================================
// 1. POST /api/auth/login — User Login
// ============================================================
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

        // Fetch permissions with data_scope + CRUD flags
        let permResult;
        let hasCrudColumns = true;
        try {
            permResult = await pool.request()
                 .input('user_id', user.user_id)
                 .query('SELECT page_id, data_scope, can_create, can_read, can_update, can_delete FROM UserPermissions WHERE user_id = @user_id AND is_granted = 1');
        } catch (dbErr) {
            console.log('Falling back to old permissions query (CRUD columns missing)', dbErr.message);
            hasCrudColumns = false;
            try {
                permResult = await pool.request()
                     .input('user_id', user.user_id)
                     .query('SELECT page_id, data_scope FROM UserPermissions WHERE user_id = @user_id AND is_granted = 1');
            } catch (dbErr2) {
                console.log('Falling back to oldest permissions query (data_scope missing)', dbErr2.message);
                try {
                    permResult = await pool.request()
                         .input('user_id', user.user_id)
                         .query('SELECT page_id FROM UserPermissions WHERE user_id = @user_id AND is_granted = 1');
                } catch (dbErr3) {
                    console.log('Permission query completely failed (table might be missing)', dbErr3.message);
                    permResult = { recordset: [] };
                }
            }
        }

        const userData = {
            id: user.user_id,
            username: user.username,
            name: user.display_name,
            role: user.role,
            avatar: user.avatar,
            departmentId: user.department_id
        };

        const token = jwt.sign(
            userData,
            process.env.JWT_SECRET || 'THAIHERB_SECRET_KEY_2026_ERP',
            { expiresIn: '10h' }
        );

        // เราจะส่ง permissions กลับไปให้ frontend ใน response แบบปกติ (ไม่ใช่ใน token)
        userData.permissions = permResult.recordset.map(p => ({
            page_id: p.page_id, 
            data_scope: p.data_scope || 'all',
            can_create: hasCrudColumns ? (p.can_create != null ? p.can_create : true) : true,
            can_read: hasCrudColumns ? (p.can_read != null ? p.can_read : true) : true,
            can_update: hasCrudColumns ? (p.can_update != null ? p.can_update : true) : true,
            can_delete: hasCrudColumns ? (p.can_delete != null ? p.can_delete : true) : true
        }));

        // Fetch company access
        let companies = [];
        try {
            const companyResult = await pool.request()
                .input('userId', user.user_id)
                .query(`
                    SELECT uca.CompanyID, uca.is_default, uca.role_override,
                           c.CompanyName, c.ShortName, c.CompanyNameTH, c.CompanyNameEN,
                           c.CompanyColor, c.CompanyIcon, c.CompanyLogo
                    FROM UserCompanyAccess uca
                    JOIN Company c ON uca.CompanyID = c.CompanyID
                    WHERE uca.user_id = @userId AND c.IsActive = 1
                    ORDER BY uca.is_default DESC, c.CompanyID
                `);
            companies = companyResult.recordset;
            console.log(`[Login] User ${user.username} has ${companies.length} company access`);
        } catch (companyErr) {
            console.error('[Login] Company query failed:', companyErr.message);
        }

        // Log การ Login สำเร็จ
        await logAction(req, 'LOGIN', 'auth', user.user_id, `${username} เข้าสู่ระบบสำเร็จ`);

        res.json({
            message: 'เข้าสู่ระบบสำเร็จ',
            user: userData,
            token,
            companies
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            message: 'เกิดข้อผิดพลาด: ' + err.message, 
            error: err.stack 
        });
    }
});

router.post('/select-company', authMiddleware, async (req, res) => {
    try {
        const { companyId } = req.body;
        const userId = req.user.id;

        if (!companyId) {
            return res.status(400).json({ message: 'กรุณาเลือกบริษัท' });
        }

        const pool = await poolPromise;

        // Verify user has access to this company
        const accessResult = await pool.request()
            .input('userId', userId)
            .input('companyId', companyId)
            .query(`
                SELECT uca.CompanyID, uca.role_override,
                       c.CompanyName, c.ShortName, c.CompanyNameTH, c.CompanyNameEN,
                       c.CompanyColor, c.CompanyIcon, c.CompanyLogo
                FROM UserCompanyAccess uca
                JOIN Company c ON uca.CompanyID = c.CompanyID
                WHERE uca.user_id = @userId AND uca.CompanyID = @companyId AND c.IsActive = 1
            `);

        if (accessResult.recordset.length === 0) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงบริษัทนี้' });
        }

        const company = accessResult.recordset[0];

        // Issue new JWT with activeCompanyId
        const newToken = jwt.sign(
            {
                id: req.user.id,
                username: req.user.username,
                name: req.user.name,
                role: company.role_override || req.user.role,
                avatar: req.user.avatar,
                departmentId: req.user.departmentId,
                activeCompanyId: company.CompanyID
            },
            process.env.JWT_SECRET || 'THAIHERB_SECRET_KEY_2026_ERP',
            { expiresIn: '10h' }
        );

        res.json({
            message: 'เลือกบริษัทสำเร็จ',
            token: newToken,
            company
        });
    } catch (err) {
        console.error('Select company error:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาด: ' + err.message });
    }
});

module.exports = router;

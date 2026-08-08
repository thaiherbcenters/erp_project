/**
 * middleware/authorize.js — Role-Based Access Control (RBAC)
 * 
 * หน้าที่: ตรวจสอบว่าผู้ใช้ (ที่ผ่าน authMiddleware มาแล้ว) มี Role ที่ได้รับอนุญาตหรือไม่
 * วิธีใช้:
 *   const { authorizeRoles } = require('../middleware/authorize');
 *   router.delete('/:id', authorizeRoles('admin', 'sales'), deleteController);
 */

const { logAction } = require('../services/auditLog');
const { poolPromise } = require('../config/db');

/**
 * อนุญาตเฉพาะ Role ที่กำหนดเท่านั้น
 * @param  {...string} allowedRoles รายชื่อ Role ที่มีสิทธิ์ (เช่น 'admin', 'sales')
 */
const authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        }

        if (allowedRoles.includes(req.user.role)) {
            return next();
        }

        console.warn(`🚨 [Security] ผู้ใช้ ${req.user.username} (Role: ${req.user.role}) พยายามเข้าถึง API ที่ไม่มีสิทธิ์: ${req.method} ${req.originalUrl}`);
        
        await logAction(
            req, 
            'UNAUTHORIZED_ACCESS', 
            'security', 
            null, 
            `พยายามเข้าถึง ${req.method} ${req.originalUrl} (ต้องการสิทธิ์: ${allowedRoles.join(',')})`
        );

        return res.status(403).json({ 
            success: false, 
            message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (Forbidden)' 
        });
    };
};

/**
 * อนุญาตเฉพาะผู้ที่มีสิทธิ์ CRUD (สร้าง/ดู/แก้ไข/ลบ) ใน Page ที่กำหนด
 * @param {string} pageId รหัสหน้าที่ต้องการตรวจสอบ (เช่น 'stock_data')
 * @param {string} action การกระทำที่ต้องการตรวจสอบ ('read' | 'create' | 'update' | 'delete')
 */
const authorizeAction = (pageId, action = 'read') => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        }

        // Admin ทำได้ทุกอย่างเสมอ
        if (req.user.role === 'admin') {
            return next();
        }

        let userPerms = req.user.permissions || [];
        
        // ถ้าไม่มี permissions ใน token (หรือตั้งใจไม่ใส่มาเพื่อลดขนาด token) ให้ดึงจาก DB
        if (userPerms.length === 0 && req.user.id) {
            try {
                const pool = await poolPromise;
                const permResult = await pool.request()
                    .input('user_id', req.user.id)
                    .query('SELECT page_id, can_create, can_read, can_update, can_delete FROM UserPermissions WHERE user_id = @user_id AND is_granted = 1');
                userPerms = permResult.recordset;
                req.user.permissions = userPerms; // cache it for this request
            } catch (err) {
                console.error('Error fetching permissions for authorizeAction:', err);
            }
        }

        const pagePerm = userPerms.find(p => p.page_id === pageId);

        let hasAccess = false;
        if (pagePerm) {
            switch (action) {
                case 'create': hasAccess = pagePerm.can_create; break;
                case 'read':   hasAccess = pagePerm.can_read; break;
                case 'update': hasAccess = pagePerm.can_update; break;
                case 'delete': hasAccess = pagePerm.can_delete; break;
                default:       hasAccess = false;
            }
        }

        if (hasAccess) {
            return next();
        }

        // ไม่มีสิทธิ์
        console.warn(`🚨 [Security] ผู้ใช้ ${req.user.username} พยายามเข้าถึง API แบบ ${action} ในหน้า ${pageId} แต่ไม่มีสิทธิ์`);
        
        await logAction(
            req, 
            'UNAUTHORIZED_ACTION', 
            'security', 
            null, 
            `พยายาม ${action} ข้อมูลในหน้า ${pageId} แต่ไม่มีสิทธิ์`
        );

        return res.status(403).json({ 
            success: false, 
            message: `คุณไม่มีสิทธิ์ ${action} ในหน้านี้ (Forbidden)` 
        });
    };
};

module.exports = { authorizeRoles, authorizeAction };


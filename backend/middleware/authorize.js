/**
 * middleware/authorize.js — Role-Based Access Control (RBAC)
 * 
 * หน้าที่: ตรวจสอบว่าผู้ใช้ (ที่ผ่าน authMiddleware มาแล้ว) มี Role ที่ได้รับอนุญาตหรือไม่
 * วิธีใช้:
 *   const { authorizeRoles } = require('../middleware/authorize');
 *   router.delete('/:id', authorizeRoles('admin', 'sales'), deleteController);
 */

const { logAction } = require('../services/auditLog');

/**
 * อนุญาตเฉพาะ Role ที่กำหนดเท่านั้น
 * @param  {...string} allowedRoles รายชื่อ Role ที่มีสิทธิ์ (เช่น 'admin', 'sales')
 */
const authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        // 1. ตรวจสอบว่าผ่าน authMiddleware มาหรือยัง
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        }

        // 2. ถ้าผู้ใช้มี role ที่อยู่ใน allowedRoles ถือว่าผ่าน
        if (allowedRoles.includes(req.user.role)) {
            return next();
        }

        // 3. ถ้าไม่มีสิทธิ์: บันทึก Log ว่ามีความพยายามลักลอบเข้าถึง แล้วเตะออก
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

module.exports = { authorizeRoles };

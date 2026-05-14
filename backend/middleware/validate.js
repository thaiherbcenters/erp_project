/**
 * validate.js — Middleware สำหรับ validate request body ด้วย Zod schema
 * 
 * วิธีใช้:
 *   const { loginSchema } = require('../validators/auth');
 *   router.post('/login', validate(loginSchema), async (req, res) => { ... });
 */
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        const errors = result.error.issues.map(e => e.message);
        return res.status(400).json({
            success: false,
            message: errors[0], // แสดง error แรกเป็น message หลัก
            errors               // ส่ง error ทั้งหมดไปด้วย (สำหรับ debug)
        });
    }

    // แทนที่ req.body ด้วย data ที่ผ่าน validation แล้ว (strip unknown fields)
    req.body = result.data;
    next();
};

module.exports = validate;

/**
 * validators/auth.js — Zod schemas สำหรับ authentication routes
 */
const { z } = require('zod');

const loginSchema = z.object({
    username: z.string({ message: 'กรุณากรอกชื่อผู้ใช้งาน' })
        .min(1, 'กรุณากรอกชื่อผู้ใช้งาน')
        .max(100, 'ชื่อผู้ใช้งานยาวเกินไป'),
    password: z.string({ message: 'กรุณากรอกรหัสผ่าน' })
        .min(1, 'กรุณากรอกรหัสผ่าน')
        .max(200, 'รหัสผ่านยาวเกินไป'),
});

module.exports = { loginSchema };

/**
 * services/auditLog.js — บริการเก็บ Log ประวัติการใช้งานระบบ
 * 
 * วิธีใช้:
 *   const { logAction } = require('../services/auditLog');
 *   await logAction(req, 'CREATE', 'quotations', newId, 'สร้างใบเสนอราคาใหม่');
 *   await logAction(req, 'UPDATE', 'stock', itemId, 'แก้ไขจำนวนสินค้า', oldData, newData);
 *   await logAction(req, 'DELETE', 'users', userId, 'ลบผู้ใช้งาน', deletedData);
 */
const { sql, poolPromise } = require('../config/db');

/**
 * บันทึก Audit Log ลงฐานข้อมูล
 * @param {Object} req - Express request object (ใช้ดึง user info + IP)
 * @param {string} action - ประเภท action: LOGIN, LOGOUT, CREATE, UPDATE, DELETE
 * @param {string} module - ชื่อโมดูล เช่น auth, quotations, stock, users
 * @param {string|number|null} targetId - ID ของข้อมูลที่ถูกกระทำ
 * @param {string|null} description - คำอธิบายสั้นๆ
 * @param {Object|null} oldValue - ค่าเดิมก่อนแก้ไข (สำหรับ UPDATE/DELETE)
 * @param {Object|null} newValue - ค่าใหม่หลังแก้ไข (สำหรับ CREATE/UPDATE)
 */
async function logAction(req, action, module, targetId = null, description = null, oldValue = null, newValue = null) {
    try {
        const pool = await poolPromise;

        // ดึงข้อมูล user จาก JWT token ที่ auth middleware แนบไว้ใน req.user
        const userId = req.user?.id || req.user?.user_id || null;
        const username = req.user?.username || req.body?.username || 'unknown';

        // ดึง IP address (รองรับ proxy เช่น nginx)
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.connection?.remoteAddress
            || req.ip
            || 'unknown';

        // ดึง user agent (browser/device info)
        const userAgent = req.headers['user-agent'] || 'unknown';

        await pool.request()
            .input('userId', sql.Int, userId)
            .input('username', sql.NVarChar(100), username)
            .input('action', sql.NVarChar(20), action)
            .input('module', sql.NVarChar(100), module)
            .input('targetId', sql.NVarChar(100), targetId ? String(targetId) : null)
            .input('description', sql.NVarChar(500), description)
            .input('oldValue', sql.NVarChar(sql.MAX), oldValue ? JSON.stringify(oldValue) : null)
            .input('newValue', sql.NVarChar(sql.MAX), newValue ? JSON.stringify(newValue) : null)
            .input('ip', sql.NVarChar(45), ip)
            .input('userAgent', sql.NVarChar(500), userAgent?.substring(0, 500))
            .query(`
                INSERT INTO Audit_Logs (user_id, username, action, module, target_id, description, old_value, new_value, ip_address, user_agent)
                VALUES (@userId, @username, @action, @module, @targetId, @description, @oldValue, @newValue, @ip, @userAgent)
            `);
    } catch (err) {
        // ⚠️ Log error แต่ไม่ throw — การเก็บ log ไม่ควรทำให้ระบบหลักพัง
        console.error('⚠️ Audit Log Error:', err.message);
    }
}

module.exports = { logAction };

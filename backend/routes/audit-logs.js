/**
 * routes/audit-logs.js — API สำหรับดูประวัติการใช้งานระบบ (เฉพาะ Admin)
 */
const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const { authorizeRoles } = require('../middleware/authorize');

// ล็อกทุก Route ในไฟล์นี้ให้เฉพาะ admin เข้าได้
router.use(authorizeRoles('admin'));

/**
 * GET /api/audit-logs
 * Query params:
 *   ?page=1&limit=50           — pagination
 *   ?user_id=5                 — กรองตาม user
 *   ?username=sales1           — กรองตาม username
 *   ?action=DELETE             — กรองตาม action (LOGIN, CREATE, UPDATE, DELETE)
 *   ?module=quotations         — กรองตาม module
 *   ?from=2026-05-01&to=2026-05-12  — กรองตามช่วงวันที่
 */
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const offset = (page - 1) * limit;

        // สร้าง WHERE clause แบบ dynamic
        let conditions = [];
        const request = pool.request();

        if (req.query.user_id) {
            conditions.push('user_id = @filterUserId');
            request.input('filterUserId', sql.Int, parseInt(req.query.user_id));
        }
        if (req.query.username) {
            conditions.push('username LIKE @filterUsername');
            request.input('filterUsername', sql.NVarChar, `%${req.query.username}%`);
        }
        if (req.query.action) {
            conditions.push('action = @filterAction');
            request.input('filterAction', sql.NVarChar, req.query.action);
        }
        if (req.query.module) {
            conditions.push('module = @filterModule');
            request.input('filterModule', sql.NVarChar, req.query.module);
        }
        if (req.query.from) {
            conditions.push('created_at >= @filterFrom');
            request.input('filterFrom', sql.NVarChar, req.query.from);
        }
        if (req.query.to) {
            conditions.push('created_at <= @filterTo');
            request.input('filterTo', sql.NVarChar, req.query.to + ' 23:59:59');
        }

        const whereClause = conditions.length > 0 
            ? 'WHERE ' + conditions.join(' AND ') 
            : '';

        // นับจำนวนทั้งหมด
        const countResult = await request.query(
            `SELECT COUNT(*) as total FROM Audit_Logs ${whereClause}`
        );
        const total = countResult.recordset[0].total;

        // ดึงข้อมูลพร้อม pagination
        const request2 = pool.request();
        // ใส่ input ซ้ำสำหรับ request ใหม่
        if (req.query.user_id) request2.input('filterUserId', sql.Int, parseInt(req.query.user_id));
        if (req.query.username) request2.input('filterUsername', sql.NVarChar, `%${req.query.username}%`);
        if (req.query.action) request2.input('filterAction', sql.NVarChar, req.query.action);
        if (req.query.module) request2.input('filterModule', sql.NVarChar, req.query.module);
        if (req.query.from) request2.input('filterFrom', sql.NVarChar, req.query.from);
        if (req.query.to) request2.input('filterTo', sql.NVarChar, req.query.to + ' 23:59:59');
        request2.input('offset', sql.Int, offset);
        request2.input('limit', sql.Int, limit);

        const result = await request2.query(`
            SELECT log_id, user_id, username, action, module, target_id,
                   description, ip_address, user_agent, created_at
            FROM Audit_Logs
            ${whereClause}
            ORDER BY created_at DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        res.json({
            success: true,
            data: result.recordset,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            }
        });

    } catch (err) {
        console.error('Audit Logs Error:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึง Audit Logs' });
    }
});

/**
 * GET /api/audit-logs/:logId — ดูรายละเอียด Log เดี่ยว (รวม old_value, new_value)
 */
router.get('/:logId', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('logId', sql.Int, parseInt(req.params.logId))
            .query('SELECT * FROM Audit_Logs WHERE log_id = @logId');

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบ Log นี้' });
        }

        const log = result.recordset[0];
        // Parse JSON fields กลับเป็น Object
        if (log.old_value) try { log.old_value = JSON.parse(log.old_value); } catch {}
        if (log.new_value) try { log.new_value = JSON.parse(log.new_value); } catch {}

        res.json({ success: true, data: log });

    } catch (err) {
        console.error('Audit Log Detail Error:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

module.exports = router;

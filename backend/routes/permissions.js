const express = require('express');
const router = express.Router();
const { poolPromise } = require('../config/db');

// 1. GET /api/permissions/:userId — ดึงสิทธิ์ทั้งหมดของ user
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', userId)
            .query('SELECT page_id, data_scope FROM UserPermissions WHERE user_id = @user_id AND is_granted = 1');

        const permissions = result.recordset.map(r => ({
            page_id: r.page_id,
            data_scope: r.data_scope
        }));
        res.json({ permissions });
    } catch (err) {
        console.error('Error fetching permissions:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสิทธิ์' });
    }
});

// 2. PUT /api/permissions/:userId — อัปเดตสิทธิ์ทั้งหมดของ user (แทนที่ทั้งชุด)
router.put('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissions } = req.body; // array of { page_id, data_scope }

        if (!Array.isArray(permissions)) {
            return res.status(400).json({ message: 'permissions ต้องเป็น array' });
        }

        const pool = await poolPromise;
        const trans = pool.transaction();
        await trans.begin();

        try {
            // ลบสิทธิ์เดิมทั้งหมดของ user
            await trans.request()
                .input('user_id', userId)
                .query('DELETE FROM UserPermissions WHERE user_id = @user_id');

            // INSERT สิทธิ์ใหม่ทั้งชุด
            for (const perm of permissions) {
                // รองรับ format เก่าที่เป็นแค่ string page_id
                const pageId = typeof perm === 'string' ? perm : perm.page_id;
                const dataScope = typeof perm === 'string' ? 'all' : (perm.data_scope || 'all');
                
                await trans.request()
                    .input('user_id', userId)
                    .input('page_id', pageId)
                    .input('data_scope', dataScope)
                    .query('INSERT INTO UserPermissions (user_id, page_id, data_scope, is_granted) VALUES (@user_id, @page_id, @data_scope, 1)');
            }

            await trans.commit();
            res.json({ message: 'อัปเดตสิทธิ์สำเร็จ', count: permissions.length });
        } catch (innerErr) {
            await trans.rollback();
            throw innerErr;
        }
    } catch (err) {
        console.error('Error updating permissions:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสิทธิ์' });
    }
});

module.exports = router;

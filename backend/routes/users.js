const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { authorizeRoles } = require('../middleware/authorize');

// ============================================================
// 1. GET /api/users — Fetch all users
// ============================================================
router.get('/', async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Error fetching users list' });
    }
});

// ============================================================
// 2. POST /api/users — Create a new user (Admin Only)
// ============================================================
router.post('/', authorizeRoles('admin'), async (req, res) => {
    try {
        const newUser = await userService.createUser(req.body);
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
        const status = err.statusCode || 500;
        const message = err.statusCode ? err.message : 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน';
        res.status(status).json({ message });
    }
});

// ============================================================
// 3. PUT /api/users/:id — แก้ไขข้อมูล user (Admin Only)
// ============================================================
router.put('/:id', authorizeRoles('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        await userService.updateUser(id, req.body);
        res.json({ message: 'แก้ไขข้อมูลสำเร็จ' });
    } catch (err) {
        console.error('Error updating user:', err);
        const status = err.statusCode || 500;
        const message = err.statusCode ? err.message : 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล';
        res.status(status).json({ message });
    }
});

// ============================================================
// 4. PUT /api/users/:id/password — Reset รหัสผ่าน (Admin Only)
// ============================================================
router.put('/:id/password', authorizeRoles('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        await userService.resetPassword(id, newPassword);
        res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (err) {
        console.error('Error resetting password:', err);
        const status = err.statusCode || 500;
        const message = err.statusCode ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน';
        res.status(status).json({ message });
    }
});

// ============================================================
// 5. PUT /api/users/:id/toggle — เปิด/ปิดสถานะ user (Admin Only)
// ============================================================
router.put('/:id/toggle', authorizeRoles('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const newStatus = await userService.toggleUserStatus(id);
        res.json({ 
            message: newStatus ? 'เปิดใช้งานสำเร็จ' : 'ปิดใช้งานสำเร็จ',
            is_active: newStatus
        });
    } catch (err) {
        console.error('Error toggling user:', err);
        const status = err.statusCode || 500;
        const message = err.statusCode ? err.message : 'เกิดข้อผิดพลาด';
        res.status(status).json({ message });
    }
});

// ============================================================
// 6. DELETE /api/users/:id — Delete a user (Admin Only)
// ============================================================
router.delete('/:id', authorizeRoles('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        await userService.deleteUser(id);
        res.status(200).json({ message: 'ลบผู้ใช้งานสำเร็จ' });
    } catch (err) {
        console.error('Error deleting user:', err);
        const status = err.statusCode || 500;
        const message = err.statusCode ? err.message : 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน';
        res.status(status).json({ message });
    }
});

module.exports = router;

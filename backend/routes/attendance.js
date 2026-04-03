/**
 * =============================================================================
 * attendance.js — API สำหรับจัดการเวลาเข้า-ออกงาน (Attendance)
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// ============================================================
// 1. GET /api/attendance/summary — สรุปสถิติวันนี้
// ============================================================
router.get('/summary', async (req, res) => {
    try {
        const pool = await poolPromise;
        const targetDate = req.query.date || new Date().toISOString().split('T')[0];

        const result = await pool.request()
            .input('date', sql.Date, targetDate)
            .query(`
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN a.status = N'ปกติ' THEN 1 ELSE 0 END) AS normal,
                    SUM(CASE WHEN a.status = N'สาย' THEN 1 ELSE 0 END) AS late,
                    SUM(CASE WHEN a.status = N'ขาด' THEN 1 ELSE 0 END) AS absent,
                    SUM(CASE WHEN a.status = N'ลา' THEN 1 ELSE 0 END) AS leave,
                    SUM(CASE WHEN a.status = N'OT' THEN 1 ELSE 0 END) AS ot
                FROM Attendance a
                WHERE a.date = @date
            `);

        const totalEmployees = await pool.request().query(
            `SELECT COUNT(*) AS cnt FROM Employees WHERE is_active = 1`
        );

        const stats = result.recordset[0];
        const totalEmp = totalEmployees.recordset[0].cnt;
        const present = (stats.normal || 0) + (stats.late || 0) + (stats.ot || 0);

        res.json({
            date: targetDate,
            totalEmployees: totalEmp,
            present,
            presentPercent: totalEmp > 0 ? Math.round((present / totalEmp) * 100) : 0,
            normal: stats.normal || 0,
            late: stats.late || 0,
            absent: stats.absent || 0,
            leave: stats.leave || 0,
            ot: stats.ot || 0,
        });
    } catch (err) {
        console.error('Error fetching attendance summary:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงสรุปข้อมูล' });
    }
});

// ============================================================
// 2. GET /api/attendance — ดึงข้อมูลเวลาทำงาน (with filters)
// ============================================================
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { startDate, endDate, employee_id, department, status, search } = req.query;

        let conditions = [];
        const request = pool.request();

        if (startDate) {
            conditions.push('a.date >= @startDate');
            request.input('startDate', sql.Date, startDate);
        }
        if (endDate) {
            conditions.push('a.date <= @endDate');
            request.input('endDate', sql.Date, endDate);
        }
        if (employee_id) {
            conditions.push('a.employee_id = @employee_id');
            request.input('employee_id', sql.Int, employee_id);
        }
        if (department) {
            conditions.push('e.department_code = @department');
            request.input('department', sql.NVarChar, department);
        }
        if (status) {
            conditions.push('a.status = @status');
            request.input('status', sql.NVarChar, status);
        }
        if (search) {
            conditions.push(`(e.first_name LIKE @search OR e.last_name LIKE @search OR e.employee_code LIKE @search OR e.nickname LIKE @search)`);
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const result = await request.query(`
            SELECT
                a.attendance_id,
                a.employee_id,
                a.date,
                CONVERT(VARCHAR(5), a.check_in, 108) AS check_in,
                CONVERT(VARCHAR(5), a.check_out, 108) AS check_out,
                a.status,
                a.late_minutes,
                a.ot_hours,
                a.note,
                a.recorded_by,
                a.created_at,
                e.employee_code,
                e.prefix,
                e.first_name,
                e.last_name,
                e.nickname,
                e.department_code,
                d.dept_name AS department_name
            FROM Attendance a
            INNER JOIN Employees e ON a.employee_id = e.employee_id
            LEFT JOIN Departments d ON e.department_code = d.dept_code
            ${where}
            ORDER BY a.date DESC, e.employee_code ASC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching attendance:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเวลาทำงาน' });
    }
});

// ============================================================
// 3. POST /api/attendance — บันทึกเวลาเข้า-ออกงาน
// ============================================================
router.post('/', async (req, res) => {
    try {
        const { employee_id, date, check_in, check_out, status, ot_hours, note } = req.body;

        if (!employee_id || !date) {
            return res.status(400).json({ message: 'กรุณาระบุพนักงานและวันที่' });
        }

        // คำนวณสาย (ถ้าเข้าหลัง 09:00)
        let lateMinutes = 0;
        let finalStatus = status || 'ปกติ';

        if (check_in && finalStatus !== 'ลา' && finalStatus !== 'ขาด') {
            const [h, m] = check_in.split(':').map(Number);
            const totalMin = h * 60 + m;
            if (totalMin > 540) { // 09:00 = 540 min
                lateMinutes = totalMin - 540;
                if (finalStatus === 'ปกติ') finalStatus = 'สาย';
            }
        }

        const pool = await poolPromise;

        // Check duplicate
        const exists = await pool.request()
            .input('emp_id', sql.Int, employee_id)
            .input('date', sql.Date, date)
            .query('SELECT attendance_id FROM Attendance WHERE employee_id = @emp_id AND date = @date');

        if (exists.recordset.length > 0) {
            return res.status(409).json({ message: 'มีข้อมูลวันนี้ของพนักงานนี้อยู่แล้ว กรุณาแก้ไขแทน' });
        }

        const result = await pool.request()
            .input('employee_id', sql.Int, employee_id)
            .input('date', sql.Date, date)
            .input('check_in', sql.VarChar, check_in || null)
            .input('check_out', sql.VarChar, check_out || null)
            .input('status', sql.NVarChar, finalStatus)
            .input('late_minutes', sql.Int, lateMinutes)
            .input('ot_hours', sql.Decimal(4, 2), ot_hours || 0)
            .input('note', sql.NVarChar, note || null)
            .query(`
                INSERT INTO Attendance (employee_id, date, check_in, check_out, status, late_minutes, ot_hours, note)
                OUTPUT INSERTED.attendance_id
                VALUES (@employee_id, @date, @check_in, @check_out, @status, @late_minutes, @ot_hours, @note)
            `);

        res.status(201).json({
            message: 'บันทึกเวลาสำเร็จ',
            attendance_id: result.recordset[0].attendance_id
        });
    } catch (err) {
        console.error('Error creating attendance:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกเวลา' });
    }
});

// ============================================================
// 4. PUT /api/attendance/:id — แก้ไขข้อมูลเวลาทำงาน
// ============================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { check_in, check_out, status, ot_hours, note } = req.body;
        const pool = await poolPromise;

        // Recalculate late
        let lateMinutes = 0;
        let finalStatus = status || 'ปกติ';

        if (check_in && finalStatus !== 'ลา' && finalStatus !== 'ขาด') {
            const [h, m] = check_in.split(':').map(Number);
            const totalMin = h * 60 + m;
            if (totalMin > 540) {
                lateMinutes = totalMin - 540;
                if (finalStatus === 'ปกติ') finalStatus = 'สาย';
            }
        }

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('check_in', sql.VarChar, check_in || null)
            .input('check_out', sql.VarChar, check_out || null)
            .input('status', sql.NVarChar, finalStatus)
            .input('late_minutes', sql.Int, lateMinutes)
            .input('ot_hours', sql.Decimal(4, 2), ot_hours || 0)
            .input('note', sql.NVarChar, note || null)
            .query(`
                UPDATE Attendance
                SET check_in = @check_in, check_out = @check_out, status = @status,
                    late_minutes = @late_minutes, ot_hours = @ot_hours, note = @note,
                    updated_at = GETDATE()
                WHERE attendance_id = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลที่ต้องการแก้ไข' });
        }

        res.json({ message: 'แก้ไขข้อมูลสำเร็จ' });
    } catch (err) {
        console.error('Error updating attendance:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไข' });
    }
});

// ============================================================
// 5. DELETE /api/attendance/:id — ลบข้อมูล
// ============================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Attendance WHERE attendance_id = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลที่ต้องการลบ' });
        }

        res.json({ message: 'ลบข้อมูลสำเร็จ' });
    } catch (err) {
        console.error('Error deleting attendance:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบ' });
    }
});

module.exports = router;

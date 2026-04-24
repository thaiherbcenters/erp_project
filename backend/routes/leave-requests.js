/**
 * =============================================================================
 * leave-requests.js — API สำหรับจัดการใบลา & วันลาคงเหลือ
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// Helper to format date in local timezone to prevent UTC timezone shifts
const formatDateLocal = (dateObj) => {
    if (!dateObj) return null;
    // If it's a string, parse it first
    if (typeof dateObj === 'string') dateObj = new Date(dateObj);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


// ============================================================
// 1. GET /api/leave-requests — ดึงข้อมูลใบลา
// ============================================================
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { employee_id, status, startDate, endDate } = req.query;

        let conditions = [];
        const request = pool.request();

        if (employee_id) {
            conditions.push('lr.employee_id = @employee_id');
            request.input('employee_id', sql.Int, employee_id);
        }
        if (status) {
            conditions.push('lr.status = @status');
            request.input('status', sql.NVarChar, status);
        }
        if (startDate) {
            conditions.push('lr.start_date >= @startDate');
            request.input('startDate', sql.Date, startDate);
        }
        if (endDate) {
            conditions.push('lr.end_date <= @endDate');
            request.input('endDate', sql.Date, endDate);
        }

        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const result = await request.query(`
            SELECT
                lr.*,
                e.employee_code,
                e.prefix,
                e.first_name,
                e.last_name,
                e.nickname,
                e.department_code,
                d.dept_name AS department_name
            FROM LeaveRequests lr
            INNER JOIN Employees e ON lr.employee_id = e.employee_id
            LEFT JOIN Departments d ON e.department_code = d.dept_code
            ${where}
            ORDER BY lr.created_at DESC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching leave requests:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบลา' });
    }
});

// ============================================================
// 2. GET /api/leave-requests/balance/:employeeId — วันลาคงเหลือ
// ============================================================
router.get('/balance/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const year = req.query.year || new Date().getFullYear();
        const pool = await poolPromise;

        const result = await pool.request()
            .input('emp_id', sql.Int, employeeId)
            .input('year', sql.Int, year)
            .query(`
                SELECT
                    lb.leave_type,
                    lb.total_days,
                    lb.used_days,
                    (lb.total_days - lb.used_days) AS remaining_days
                FROM LeaveBalances lb
                WHERE lb.employee_id = @emp_id AND lb.year = @year
                ORDER BY lb.leave_type
            `);

        res.json({
            employee_id: parseInt(employeeId),
            year: parseInt(year),
            balances: result.recordset
        });
    } catch (err) {
        console.error('Error fetching leave balance:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงวันลาคงเหลือ' });
    }
});

// ============================================================
// 3. POST /api/leave-requests — สร้างใบลา
// ============================================================
router.post('/', async (req, res) => {
    try {
        const { employee_id, leave_type, start_date, end_date, total_days, reason } = req.body;

        if (!employee_id || !leave_type || !start_date || !end_date) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        const pool = await poolPromise;
        const currentYear = new Date(start_date).getFullYear();

        // Check remaining balance
        const balance = await pool.request()
            .input('emp_id', sql.Int, employee_id)
            .input('year', sql.Int, currentYear)
            .input('leave_type', sql.NVarChar, leave_type)
            .query(`
                SELECT total_days, used_days, (total_days - used_days) AS remaining
                FROM LeaveBalances
                WHERE employee_id = @emp_id AND year = @year AND leave_type = @leave_type
            `);

        if (balance.recordset.length > 0) {
            const remaining = balance.recordset[0].remaining;
            const daysRequested = total_days || 1;
            if (daysRequested > remaining) {
                return res.status(400).json({
                    message: `วันลา${leave_type}คงเหลือไม่เพียงพอ (เหลือ ${remaining} วัน, ขอลา ${daysRequested} วัน)`
                });
            }
        }

        const result = await pool.request()
            .input('employee_id', sql.Int, employee_id)
            .input('leave_type', sql.NVarChar, leave_type)
            .input('start_date', sql.Date, start_date)
            .input('end_date', sql.Date, end_date)
            .input('total_days', sql.Decimal(4, 1), total_days || 1)
            .input('reason', sql.NVarChar, reason || null)
            .query(`
                INSERT INTO LeaveRequests (employee_id, leave_type, start_date, end_date, total_days, reason)
                OUTPUT INSERTED.leave_id
                VALUES (@employee_id, @leave_type, @start_date, @end_date, @total_days, @reason)
            `);

        res.status(201).json({
            message: 'สร้างใบลาสำเร็จ',
            leave_id: result.recordset[0].leave_id
        });
    } catch (err) {
        console.error('Error creating leave request:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างใบลา' });
    }
});

// ============================================================
// 4. PUT /api/leave-requests/:id — อนุมัติ/ไม่อนุมัติใบลา
// ============================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approved_by } = req.body;
        const pool = await poolPromise;

        // Get leave info first
        const leaveInfo = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM LeaveRequests WHERE leave_id = @id');

        if (leaveInfo.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบใบลา' });
        }

        const leave = leaveInfo.recordset[0];

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.NVarChar, status)
            .input('approved_by', sql.NVarChar, approved_by || null)
            .query(`
                UPDATE LeaveRequests
                SET status = @status, approved_by = @approved_by, approved_at = GETDATE(), updated_at = GETDATE()
                WHERE leave_id = @id
            `);

        // If approved, update LeaveBalances used_days
        if (status === 'อนุมัติ' && leave.status !== 'อนุมัติ') {
            const leaveYear = new Date(leave.start_date).getFullYear();
            await pool.request()
                .input('emp_id', sql.Int, leave.employee_id)
                .input('year', sql.Int, leaveYear)
                .input('leave_type', sql.NVarChar, leave.leave_type)
                .input('days', sql.Decimal(4, 1), leave.total_days)
                .query(`
                    UPDATE LeaveBalances
                    SET used_days = used_days + @days
                    WHERE employee_id = @emp_id AND year = @year AND leave_type = @leave_type
                `);

            // Also insert attendance records as "ลา" for the date range
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dow = d.getDay();
                if (dow === 0 || dow === 6) continue; // skip weekends
                const dateStr = d.toISOString().split('T')[0];
                try {
                    await pool.request()
                        .input('emp_id', sql.Int, leave.employee_id)
                        .input('date', sql.Date, dateStr)
                        .input('note', sql.NVarChar, `${leave.leave_type}: ${leave.reason || '-'}`)
                        .query(`
                            IF NOT EXISTS (SELECT 1 FROM Attendance WHERE employee_id = @emp_id AND date = @date)
                                INSERT INTO Attendance (employee_id, date, status, note) VALUES (@emp_id, @date, N'ลา', @note)
                            ELSE
                                UPDATE Attendance SET status = N'ลา', note = @note, updated_at = GETDATE() WHERE employee_id = @emp_id AND date = @date
                        `);
                } catch (e) {
                    // ignore duplicate errors
                }
            }
        }

        // If "ไม่อนุมัติ" and was previously "อนุมัติ", reverse the used_days
        if (status === 'ไม่อนุมัติ' && leave.status === 'อนุมัติ') {
            const leaveYear = new Date(leave.start_date).getFullYear();
            await pool.request()
                .input('emp_id', sql.Int, leave.employee_id)
                .input('year', sql.Int, leaveYear)
                .input('leave_type', sql.NVarChar, leave.leave_type)
                .input('days', sql.Decimal(4, 1), leave.total_days)
                .query(`
                    UPDATE LeaveBalances
                    SET used_days = CASE WHEN used_days - @days < 0 THEN 0 ELSE used_days - @days END
                    WHERE employee_id = @emp_id AND year = @year AND leave_type = @leave_type
                `);
        }

        res.json({ message: `${status === 'อนุมัติ' ? 'อนุมัติ' : 'ปฏิเสธ'}ใบลาสำเร็จ` });
    } catch (err) {
        console.error('Error updating leave request:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตใบลา' });
    }
});

module.exports = router;

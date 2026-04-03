/**
 * =============================================================================
 * create-attendance-tables.mjs — สร้างตาราง Attendance, LeaveRequests, LeaveBalances
 * =============================================================================
 * รัน: node backend/create-attendance-tables.mjs
 */

import sql from 'mssql';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: { trustServerCertificate: true, encrypt: true },
};

async function createTables() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database\n');

        // ════════════════════════════════════════════════
        // 1. ตาราง Attendance — บันทึกเวลาเข้า-ออกงาน
        // ════════════════════════════════════════════════
        console.log('═══════════════════════════════════════');
        console.log(' STEP 1: สร้างตาราง Attendance');
        console.log('═══════════════════════════════════════');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Attendance' AND xtype='U')
            CREATE TABLE Attendance (
                attendance_id       INT IDENTITY(1,1) PRIMARY KEY,
                employee_id         INT            NOT NULL,
                date                DATE           NOT NULL,
                check_in            TIME           NULL,
                check_out           TIME           NULL,
                status              NVARCHAR(20)   NOT NULL DEFAULT N'ปกติ',   -- ปกติ/สาย/ขาด/ลา/OT
                late_minutes        INT            NULL DEFAULT 0,
                ot_hours            DECIMAL(4,2)   NULL DEFAULT 0,
                note                NVARCHAR(500)  NULL,
                recorded_by         NVARCHAR(50)   NULL,
                created_at          DATETIME       NOT NULL DEFAULT GETDATE(),
                updated_at          DATETIME       NOT NULL DEFAULT GETDATE(),
                
                CONSTRAINT FK_Attendance_Employee FOREIGN KEY (employee_id) REFERENCES Employees(employee_id),
                CONSTRAINT UQ_Attendance_EmpDate UNIQUE (employee_id, date)
            );
        `);
        console.log('✅ Table "Attendance" created (or already exists)');

        // Indexes
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Attendance_date')
                CREATE INDEX IX_Attendance_date ON Attendance(date);
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Attendance_employee')
                CREATE INDEX IX_Attendance_employee ON Attendance(employee_id);
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Attendance_status')
                CREATE INDEX IX_Attendance_status ON Attendance(status);
        `);
        console.log('✅ Attendance indexes created');

        // ════════════════════════════════════════════════
        // 2. ตาราง LeaveRequests — ใบลา
        // ════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════');
        console.log(' STEP 2: สร้างตาราง LeaveRequests');
        console.log('═══════════════════════════════════════');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LeaveRequests' AND xtype='U')
            CREATE TABLE LeaveRequests (
                leave_id            INT IDENTITY(1,1) PRIMARY KEY,
                employee_id         INT            NOT NULL,
                leave_type          NVARCHAR(30)   NOT NULL,  -- ลาป่วย/ลากิจ/ลาพักร้อน/ลาคลอด/อื่นๆ
                start_date          DATE           NOT NULL,
                end_date            DATE           NOT NULL,
                total_days          DECIMAL(4,1)   NOT NULL DEFAULT 1,
                reason              NVARCHAR(500)  NULL,
                status              NVARCHAR(20)   NOT NULL DEFAULT N'รออนุมัติ',  -- รออนุมัติ/อนุมัติ/ไม่อนุมัติ
                approved_by         NVARCHAR(50)   NULL,
                approved_at         DATETIME       NULL,
                created_at          DATETIME       NOT NULL DEFAULT GETDATE(),
                updated_at          DATETIME       NOT NULL DEFAULT GETDATE(),

                CONSTRAINT FK_Leave_Employee FOREIGN KEY (employee_id) REFERENCES Employees(employee_id)
            );
        `);
        console.log('✅ Table "LeaveRequests" created (or already exists)');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Leave_employee')
                CREATE INDEX IX_Leave_employee ON LeaveRequests(employee_id);
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Leave_dates')
                CREATE INDEX IX_Leave_dates ON LeaveRequests(start_date, end_date);
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Leave_status')
                CREATE INDEX IX_Leave_status ON LeaveRequests(status);
        `);
        console.log('✅ LeaveRequests indexes created');

        // ════════════════════════════════════════════════
        // 3. ตาราง LeaveBalances — สิทธิ์วันลาประจำปี
        // ════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════');
        console.log(' STEP 3: สร้างตาราง LeaveBalances');
        console.log('═══════════════════════════════════════');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LeaveBalances' AND xtype='U')
            CREATE TABLE LeaveBalances (
                balance_id          INT IDENTITY(1,1) PRIMARY KEY,
                employee_id         INT            NOT NULL,
                year                INT            NOT NULL,
                leave_type          NVARCHAR(30)   NOT NULL,
                total_days          DECIMAL(4,1)   NOT NULL DEFAULT 0,  -- สิทธิ์ทั้งหมด
                used_days           DECIMAL(4,1)   NOT NULL DEFAULT 0,  -- ใช้ไปแล้ว
                remaining_days      AS (total_days - used_days),         -- คงเหลือ (computed)
                created_at          DATETIME       NOT NULL DEFAULT GETDATE(),

                CONSTRAINT FK_Balance_Employee FOREIGN KEY (employee_id) REFERENCES Employees(employee_id),
                CONSTRAINT UQ_Balance UNIQUE (employee_id, year, leave_type)
            );
        `);
        console.log('✅ Table "LeaveBalances" created (or already exists)');

        // ════════════════════════════════════════════════
        // 4. Seed ข้อมูลตัวอย่าง
        // ════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════');
        console.log(' STEP 4: Seed ข้อมูลตัวอย่าง');
        console.log('═══════════════════════════════════════');

        // Check if attendance already has data
        const attCount = await pool.request().query('SELECT COUNT(*) AS cnt FROM Attendance');
        if (attCount.recordset[0].cnt === 0) {
            // Get all active employees
            const employees = await pool.request().query(
                `SELECT employee_id FROM Employees WHERE is_active = 1`
            );

            if (employees.recordset.length > 0) {
                // Generate 20 working days of attendance data
                const today = new Date();
                let seedCount = 0;

                for (let dayOffset = 1; dayOffset <= 28; dayOffset++) {
                    const d = new Date(today);
                    d.setDate(d.getDate() - dayOffset);
                    
                    // Skip weekends
                    const dow = d.getDay();
                    if (dow === 0 || dow === 6) continue;

                    const dateStr = d.toISOString().split('T')[0];

                    for (const emp of employees.recordset) {
                        // Random scenario
                        const rand = Math.random();
                        let checkIn, checkOut, status, lateMin, otHours, note;

                        if (rand < 0.65) {
                            // ปกติ (65%)
                            const inMin = 480 + Math.floor(Math.random() * 20); // 08:00-08:20
                            const outMin = 1020 + Math.floor(Math.random() * 30); // 17:00-17:30
                            checkIn = `${String(Math.floor(inMin/60)).padStart(2,'0')}:${String(inMin%60).padStart(2,'0')}`;
                            checkOut = `${String(Math.floor(outMin/60)).padStart(2,'0')}:${String(outMin%60).padStart(2,'0')}`;
                            status = 'ปกติ'; lateMin = 0; otHours = 0; note = '';
                        } else if (rand < 0.82) {
                            // สาย (17%)
                            const inMin = 545 + Math.floor(Math.random() * 30); // 09:05-09:35
                            const outMin = 1020 + Math.floor(Math.random() * 30);
                            checkIn = `${String(Math.floor(inMin/60)).padStart(2,'0')}:${String(inMin%60).padStart(2,'0')}`;
                            checkOut = `${String(Math.floor(outMin/60)).padStart(2,'0')}:${String(outMin%60).padStart(2,'0')}`;
                            status = 'สาย'; lateMin = inMin - 540; otHours = 0; note = '';
                        } else if (rand < 0.90) {
                            // ลา (8%)
                            checkIn = null; checkOut = null;
                            status = 'ลา'; lateMin = 0; otHours = 0; note = 'ลากิจส่วนตัว';
                        } else if (rand < 0.95) {
                            // OT (5%)
                            const inMin = 480 + Math.floor(Math.random() * 15);
                            const outMin = 1080 + Math.floor(Math.random() * 120); // 18:00-20:00
                            checkIn = `${String(Math.floor(inMin/60)).padStart(2,'0')}:${String(inMin%60).padStart(2,'0')}`;
                            checkOut = `${String(Math.floor(outMin/60)).padStart(2,'0')}:${String(outMin%60).padStart(2,'0')}`;
                            const otMins = outMin - 1020;
                            status = 'OT'; lateMin = 0; otHours = Math.round(otMins / 60 * 100) / 100; note = 'ทำงานล่วงเวลา';
                        } else {
                            // ขาด (5%)
                            checkIn = null; checkOut = null;
                            status = 'ขาด'; lateMin = 0; otHours = 0; note = 'ไม่มาโดยไม่แจ้ง';
                        }

                        const req = pool.request()
                            .input('emp_id', sql.Int, emp.employee_id)
                            .input('date', sql.Date, dateStr)
                            .input('status', sql.NVarChar, status)
                            .input('late_min', sql.Int, lateMin)
                            .input('ot_hours', sql.Decimal(4, 2), otHours)
                            .input('note', sql.NVarChar, note || null);

                        if (checkIn) req.input('check_in', sql.VarChar, checkIn);
                        if (checkOut) req.input('check_out', sql.VarChar, checkOut);

                        await req.query(`
                            INSERT INTO Attendance (employee_id, date, check_in, check_out, status, late_minutes, ot_hours, note)
                            VALUES (@emp_id, @date, ${checkIn ? '@check_in' : 'NULL'}, ${checkOut ? '@check_out' : 'NULL'}, @status, @late_min, @ot_hours, @note)
                        `);
                        seedCount++;
                    }
                }
                console.log(`✅ Seeded ${seedCount} attendance records`);
            }
        } else {
            console.log(`ℹ️  Attendance table already has ${attCount.recordset[0].cnt} records, skipping seed`);
        }

        // Seed LeaveBalances for current year
        const balCount = await pool.request().query('SELECT COUNT(*) AS cnt FROM LeaveBalances');
        if (balCount.recordset[0].cnt === 0) {
            const currentYear = new Date().getFullYear();
            const employees = await pool.request().query(
                `SELECT employee_id FROM Employees WHERE is_active = 1`
            );

            const leaveTypes = [
                { type: 'ลาป่วย',      total: 30 },
                { type: 'ลากิจ',       total: 7 },
                { type: 'ลาพักร้อน',   total: 6 },
            ];

            for (const emp of employees.recordset) {
                for (const lt of leaveTypes) {
                    const used = Math.floor(Math.random() * Math.min(lt.total, 5));
                    await pool.request()
                        .input('emp_id', sql.Int, emp.employee_id)
                        .input('year', sql.Int, currentYear)
                        .input('leave_type', sql.NVarChar, lt.type)
                        .input('total_days', sql.Decimal(4, 1), lt.total)
                        .input('used_days', sql.Decimal(4, 1), used)
                        .query(`
                            INSERT INTO LeaveBalances (employee_id, year, leave_type, total_days, used_days)
                            VALUES (@emp_id, @year, @leave_type, @total_days, @used_days)
                        `);
                }
            }
            console.log(`✅ Seeded LeaveBalances for ${employees.recordset.length} employees (${currentYear})`);
        } else {
            console.log(`ℹ️  LeaveBalances already has ${balCount.recordset[0].cnt} records, skipping seed`);
        }

        console.log('\n🎉 Done! All attendance tables are ready.');
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        if (pool) await pool.close();
    }
}

createTables();

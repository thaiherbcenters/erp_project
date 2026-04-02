/**
 * =============================================================================
 * create-employees-table.mjs — สร้างตาราง Employees สำหรับ HR Module
 * =============================================================================
 * รัน: node backend/create-employees-table.mjs
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

async function createTable() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database');

        // ── สร้างตาราง Employees ──
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Employees' AND xtype='U')
            CREATE TABLE Employees (
                -- Primary Key
                employee_id         INT IDENTITY(1,1) PRIMARY KEY,
                employee_code       NVARCHAR(20) NOT NULL UNIQUE,

                -- ข้อมูลส่วนตัว
                prefix              NVARCHAR(20)   NULL,       -- นาย/นาง/นางสาว
                first_name          NVARCHAR(100)  NOT NULL,
                last_name           NVARCHAR(100)  NOT NULL,
                nickname            NVARCHAR(50)   NULL,       -- ชื่อเล่น
                gender              NVARCHAR(10)   NULL,       -- ชาย/หญิง/อื่นๆ
                date_of_birth       DATE           NULL,
                national_id         NVARCHAR(13)   NULL,       -- เลขบัตรประชาชน
                phone               NVARCHAR(20)   NULL,
                email               NVARCHAR(100)  NULL,
                address             NVARCHAR(500)  NULL,
                profile_image_url   NVARCHAR(500)  NULL,

                -- ข้อมูลการจ้างงาน
                department_code     NVARCHAR(20)   NULL,       -- FK อ้าง Departments.dept_code
                position            NVARCHAR(100)  NULL,
                employment_type     NVARCHAR(30)   NULL DEFAULT N'พนักงานประจำ',  -- ประจำ/สัญญาจ้าง/ทดลองงาน/Part-time
                start_date          DATE           NULL,       -- วันเริ่มงาน
                end_date            DATE           NULL,       -- วันสิ้นสุดสัญญา
                probation_end_date  DATE           NULL,       -- วันสิ้นสุดทดลองงาน
                salary              DECIMAL(12,2)  NULL,       -- เงินเดือน

                -- วุฒิการศึกษา
                education_level     NVARCHAR(50)   NULL,       -- ปริญญาตรี/ปริญญาโท/ปวส./ม.6 ฯลฯ
                education_institute NVARCHAR(200)  NULL,       -- สถาบันการศึกษา
                education_major     NVARCHAR(200)  NULL,       -- สาขาวิชา

                -- บัญชีธนาคาร
                bank_name           NVARCHAR(100)  NULL,       -- ชื่อธนาคาร
                bank_account_number NVARCHAR(20)   NULL,       -- เลขบัญชี
                bank_account_name   NVARCHAR(100)  NULL,       -- ชื่อบัญชี

                -- ประกันสังคม / ภาษี
                social_security_id  NVARCHAR(20)   NULL,       -- เลขประกันสังคม
                tax_id              NVARCHAR(20)   NULL,       -- เลขประจำตัวผู้เสียภาษี

                -- ผู้ติดต่อฉุกเฉิน
                emergency_contact_name     NVARCHAR(100) NULL,
                emergency_contact_phone    NVARCHAR(20)  NULL,
                emergency_contact_relation NVARCHAR(50)  NULL,  -- ความสัมพันธ์

                -- สถานะ
                status              NVARCHAR(20)   NOT NULL DEFAULT N'ปฏิบัติงาน',  -- ปฏิบัติงาน/ลาออก/พักงาน/ให้ออก
                is_active           BIT            NOT NULL DEFAULT 1,

                -- Meta
                created_at          DATETIME       NOT NULL DEFAULT GETDATE(),
                updated_at          DATETIME       NOT NULL DEFAULT GETDATE()
            );
        `);
        console.log('✅ Table "Employees" created (or already exists)');

        // ── สร้าง Index ──
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Employees_code')
                CREATE UNIQUE INDEX IX_Employees_code ON Employees(employee_code);

            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Employees_department')
                CREATE INDEX IX_Employees_department ON Employees(department_code);

            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Employees_status')
                CREATE INDEX IX_Employees_status ON Employees(status);
        `);
        console.log('✅ Indexes created');

        // ── Insert ข้อมูลตัวอย่าง ──
        const count = await pool.request().query('SELECT COUNT(*) AS cnt FROM Employees');
        if (count.recordset[0].cnt === 0) {
            await pool.request().query(`
                INSERT INTO Employees 
                    (employee_code, prefix, first_name, last_name, nickname, gender, date_of_birth, national_id, phone, email, department_code, position, employment_type, start_date, salary, status)
                VALUES
                    (N'THC-001', N'นาย',    N'สมชาย',   N'ใจดี',     N'ชาย',   N'ชาย',   '1990-05-15', N'1100500123456', N'081-234-5678', N'somchai@thc.co.th',  N'IT',    N'วิศวกรซอฟต์แวร์',       N'พนักงานประจำ', '2023-01-15', 55000, N'ปฏิบัติงาน'),
                    (N'THC-002', N'นางสาว', N'สมหญิง',  N'รักเรียน',  N'หญิง',  N'หญิง',  '1988-11-22', N'1100500234567', N'082-345-6789', N'somying@thc.co.th',  N'MKT',   N'ผู้จัดการฝ่ายการตลาด',   N'พนักงานประจำ', '2022-06-01', 65000, N'ปฏิบัติงาน'),
                    (N'THC-003', N'นาย',    N'สมศักดิ์', N'มั่นคง',    N'เอก',   N'ชาย',   '1995-03-10', N'1100500345678', N'083-456-7890', N'somsak@thc.co.th',   N'FIN',   N'นักบัญชี',             N'พนักงานประจำ', '2024-03-10', 45000, N'ปฏิบัติงาน'),
                    (N'THC-004', N'นางสาว', N'สมใจ',    N'สุขใจ',     N'ใจ',    N'หญิง',  '1992-08-20', N'1100500456789', N'084-567-8901', N'somjai@thc.co.th',   N'HR',    N'เจ้าหน้าที่ทรัพยากรบุคคล', N'พนักงานประจำ', '2023-08-20', 42000, N'ปฏิบัติงาน'),
                    (N'THC-005', N'นาย',    N'สมบูรณ์',  N'ศรีสุข',    N'บูม',   N'ชาย',   '1998-01-05', N'1100500567890', N'085-678-9012', N'somboon@thc.co.th',  N'SALES', N'เจ้าหน้าที่ฝ่ายขาย',    N'ทดลองงาน',   '2025-01-05', 38000, N'ปฏิบัติงาน')
            `);
            console.log('✅ Inserted 5 sample employees');
        } else {
            console.log(`ℹ️  Table already has ${count.recordset[0].cnt} records, skipping seed`);
        }

        console.log('\n🎉 Done! Employees table is ready.');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

createTable();

/**
 * create-audit-logs.cjs — สร้างตาราง Audit_Logs สำหรับเก็บประวัติการใช้งานระบบ
 * 
 * ใช้ครั้งเดียว: node migrations/create-audit-logs.cjs
 */
const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: { trustServerCertificate: true, encrypt: true },
};

async function createAuditLogsTable() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database');

        // ตรวจว่ามีตารางอยู่แล้วหรือยัง
        const tableCheck = await pool.request().query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'Audit_Logs'
        `);

        if (tableCheck.recordset.length > 0) {
            console.log('⏭️  ตาราง Audit_Logs มีอยู่แล้ว — ข้าม');
            return;
        }

        await pool.request().query(`
            CREATE TABLE Audit_Logs (
                log_id         INT IDENTITY(1,1) PRIMARY KEY,
                user_id        INT NULL,
                username       NVARCHAR(100) NULL,
                action         NVARCHAR(20) NOT NULL,       -- LOGIN, CREATE, UPDATE, DELETE, LOGOUT
                module         NVARCHAR(100) NOT NULL,       -- quotations, stock, users, auth
                target_id      NVARCHAR(100) NULL,           -- ID ของข้อมูลที่ถูกกระทำ
                description    NVARCHAR(500) NULL,           -- คำอธิบายสั้นๆ
                old_value      NVARCHAR(MAX) NULL,           -- ค่าเดิม (JSON)
                new_value      NVARCHAR(MAX) NULL,           -- ค่าใหม่ (JSON)
                ip_address     NVARCHAR(45) NULL,            -- IP ผู้ใช้
                user_agent     NVARCHAR(500) NULL,           -- Browser/Device info
                created_at     DATETIME2 DEFAULT GETDATE()   -- เวลาที่เกิด event
            );

            -- Index สำหรับค้นหาเร็ว
            CREATE INDEX IX_AuditLogs_UserId ON Audit_Logs (user_id);
            CREATE INDEX IX_AuditLogs_Action ON Audit_Logs (action);
            CREATE INDEX IX_AuditLogs_Module ON Audit_Logs (module);
            CREATE INDEX IX_AuditLogs_CreatedAt ON Audit_Logs (created_at DESC);
        `);

        console.log('✅ สร้างตาราง Audit_Logs สำเร็จ!');
        console.log('   Columns: log_id, user_id, username, action, module, target_id,');
        console.log('            description, old_value, new_value, ip_address, user_agent, created_at');
        console.log('   Indexes: user_id, action, module, created_at');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
        process.exit(0);
    }
}

createAuditLogsTable();

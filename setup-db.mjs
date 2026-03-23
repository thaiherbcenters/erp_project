/**
 * สร้าง Tables สำหรับระบบ Users ใน ERP_THAIHERB
 * - Users: ข้อมูลผู้ใช้งาน + login
 * - UserPermissions: สิทธิ์การเข้าถึงหน้าต่างๆ
 */

import sql from 'mssql';

const config = {
    server: 'localhost',
    database: 'ERP_THAIHERB',
    user: 'erp_admin',
    password: 'Erp@2026!',
    options: { trustServerCertificate: true, encrypt: false },
};

async function createTables() {
    console.log('===========================================');
    console.log(' Creating Users Tables...');
    console.log('===========================================\n');

    const pool = await sql.connect(config);

    // ========================================
    // 1. สร้างตาราง Users
    // ========================================
    console.log('[1/3] Creating Users table...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
        BEGIN
            CREATE TABLE Users (
                user_id         INT IDENTITY(1,1) PRIMARY KEY,
                username        NVARCHAR(50)  NOT NULL UNIQUE,
                password_hash   NVARCHAR(255) NOT NULL,
                display_name    NVARCHAR(100) NOT NULL,
                role            NVARCHAR(50)  NOT NULL DEFAULT 'user',
                avatar          NVARCHAR(10)  NULL,
                is_active       BIT           NOT NULL DEFAULT 1,
                created_at      DATETIME2     NOT NULL DEFAULT GETDATE(),
                updated_at      DATETIME2     NOT NULL DEFAULT GETDATE()
            );
            PRINT 'Users table created.';
        END
        ELSE PRINT 'Users table already exists.';
    `);
    console.log('   ✅ Users table ready');

    // ========================================
    // 2. สร้างตาราง UserPermissions
    // ========================================
    console.log('[2/3] Creating UserPermissions table...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserPermissions')
        BEGIN
            CREATE TABLE UserPermissions (
                permission_id   INT IDENTITY(1,1) PRIMARY KEY,
                user_id         INT           NOT NULL,
                page_id         NVARCHAR(100) NOT NULL,
                is_granted      BIT           NOT NULL DEFAULT 1,
                CONSTRAINT FK_UserPermissions_Users 
                    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
                CONSTRAINT UQ_User_Page 
                    UNIQUE (user_id, page_id)
            );
            PRINT 'UserPermissions table created.';
        END
        ELSE PRINT 'UserPermissions table already exists.';
    `);
    console.log('   ✅ UserPermissions table ready');

    // ========================================
    // 3. ใส่ข้อมูลเริ่มต้น (Seed Data)
    // ========================================
    console.log('[3/3] Inserting seed data...');

    const users = [
        { username: 'it_admin', password: 'admin123', displayName: 'ผู้ดูแลระบบ', role: 'admin', avatar: 'IT' },
        { username: 'exec', password: 'password', displayName: 'ผู้บริหาร', role: 'executive', avatar: 'EX' },
        { username: 'qc1', password: 'qc123', displayName: 'เจ้าหน้าที่ QC', role: 'qc', avatar: 'QC' },
        { username: 'sales1', password: 'sales123', displayName: 'พนักงานขาย', role: 'sales', avatar: 'SL' },
        { username: 'acc1', password: 'acc123', displayName: 'พนักงานบัญชี', role: 'accountant', avatar: 'AC' },
        { username: 'proc1', password: 'proc123', displayName: 'พนักงานจัดซื้อ', role: 'procurement', avatar: 'PR' },
        { username: 'hr1', password: 'hr123', displayName: 'พนักงานบุคคล', role: 'hr', avatar: 'HR' },
        { username: 'stock1', password: 'stock123', displayName: 'พนักงานคลังสินค้า', role: 'stock', avatar: 'ST' },
        { username: 'plan1', password: 'plan123', displayName: 'ผู้วางแผนการผลิต', role: 'planner', avatar: 'PL' },
        { username: 'op1', password: 'op123', displayName: 'พนักงานฝ่ายผลิต', role: 'operator', avatar: 'OP' },
        { username: 'rnd1', password: 'rnd123', displayName: 'นักวิจัยและพัฒนา', role: 'rnd', avatar: 'RD' },
        { username: 'pkg1', password: 'pkg123', displayName: 'พนักงานบรรจุภัณฑ์', role: 'packaging', avatar: 'PK' },
        { username: 'doc1', password: 'doc123', displayName: 'เจ้าหน้าที่ควบคุมเอกสาร', role: 'document_control', avatar: 'DC' },
    ];

    let insertedCount = 0;
    for (const u of users) {
        try {
            await pool.request()
                .input('username', sql.NVarChar, u.username)
                .input('password_hash', sql.NVarChar, u.password) // ใน production ต้อง hash ด้วย bcrypt
                .input('display_name', sql.NVarChar, u.displayName)
                .input('role', sql.NVarChar, u.role)
                .input('avatar', sql.NVarChar, u.avatar)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM Users WHERE username = @username)
                    BEGIN
                        INSERT INTO Users (username, password_hash, display_name, role, avatar)
                        VALUES (@username, @password_hash, @display_name, @role, @avatar);
                    END
                `);
            insertedCount++;
        } catch (e) {
            console.log(`   ⚠️  ${u.username}: ${e.message}`);
        }
    }
    console.log(`   ✅ ${insertedCount} users processed`);

    // ── ตรวจสอบผลลัพธ์ ──
    console.log('\n-------------------------------------------');
    console.log('📋 ข้อมูลใน Users table:');
    const result = await pool.request().query(
        'SELECT user_id, username, display_name, role, avatar, is_active FROM Users ORDER BY user_id'
    );
    console.table(result.recordset);

    const countPerms = await pool.request().query('SELECT COUNT(*) AS total FROM UserPermissions');
    console.log(`\n📋 UserPermissions: ${countPerms.recordset[0].total} records`);

    await pool.close();
    console.log('\n✅ All done!');
    console.log('===========================================');
}

createTables().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});

/**
 * Setup script — สร้างตาราง FormSubmissions + สร้าง user approvers
 * รัน: node setup-approval-db.cjs
 */
const sql = require('mssql');
const bcrypt = require('bcryptjs');

const config = {
    server: 'localhost',
    database: 'ERP_THAIHERB',
    user: 'erp_admin',
    password: 'Erp@2026!',
    options: { trustServerCertificate: true, encrypt: false },
};

async function setup() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database');

        // ──────────────────────────────────────────────
        // 1. สร้างตาราง FormSubmissions
        // ──────────────────────────────────────────────
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FormSubmissions' AND xtype='U')
            CREATE TABLE FormSubmissions (
                submission_id INT IDENTITY(1,1) PRIMARY KEY,
                form_code NVARCHAR(50) NOT NULL,
                form_name NVARCHAR(200),
                form_data NVARCHAR(MAX),
                submitted_by INT NOT NULL,
                submitted_by_name NVARCHAR(100),
                submitted_at DATETIME DEFAULT GETDATE(),

                -- Step 1: ตัวแทนฝ่ายบริหาร
                step1_status NVARCHAR(20) DEFAULT 'pending',
                step1_approved_by INT NULL,
                step1_approved_at DATETIME NULL,
                step1_comment NVARCHAR(500) NULL,

                -- Step 2: ประธานวิสาหกิจชุมชน
                step2_status NVARCHAR(20) DEFAULT 'pending',
                step2_approved_by INT NULL,
                step2_approved_at DATETIME NULL,
                step2_comment NVARCHAR(500) NULL,

                -- Overall status
                overall_status NVARCHAR(50) DEFAULT N'รอตัวแทนฝ่ายบริหาร'
            )
        `);
        console.log('✅ Table FormSubmissions created (or already exists)');

        // ──────────────────────────────────────────────
        // 2. สร้าง Approver Users
        // ──────────────────────────────────────────────
        const approvers = [
            {
                username: 'natthakit',
                password: 'Approve@2026',
                display_name: 'นายณัฐกิตติ์ จรุงพิรวงศ์',
                role: 'approver',
                avatar: 'ณจ',
            },
            {
                username: 'thawat',
                password: 'Approve@2026',
                display_name: 'นายธวัช จรุงพิรวงศ์',
                role: 'approver',
                avatar: 'ธจ',
            },
        ];

        for (const user of approvers) {
            // Check if user already exists
            const check = await pool.request()
                .input('username', sql.NVarChar, user.username)
                .query('SELECT user_id FROM Users WHERE username = @username');

            if (check.recordset.length > 0) {
                console.log(`⚠️  User "${user.username}" already exists (ID: ${check.recordset[0].user_id}), skipping.`);
                continue;
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(user.password, salt);

            const result = await pool.request()
                .input('username', sql.NVarChar, user.username)
                .input('password_hash', sql.NVarChar, hashedPassword)
                .input('display_name', sql.NVarChar, user.display_name)
                .input('role', sql.NVarChar, user.role)
                .input('avatar', sql.NVarChar, user.avatar)
                .query(`
                    INSERT INTO Users (username, password_hash, display_name, role, avatar)
                    OUTPUT INSERTED.user_id, INSERTED.username, INSERTED.display_name
                    VALUES (@username, @password_hash, @display_name, @role, @avatar)
                `);

            const newUser = result.recordset[0];
            console.log(`✅ Created user "${newUser.username}" (ID: ${newUser.user_id}) — ${newUser.display_name}`);

            // ──────────────────────────────────────────────
            // 3. ให้สิทธิ์ approver เข้าหน้า document_control + DAR
            // ──────────────────────────────────────────────
            const permPages = [
                'document_control',
                'document_dashboard', 'dashboard_chart', 'dashboard_stats',
                'document_request', 'document_request_search', 'document_request_table', 'document_request_action',
                'document_forms', 'document_forms_table',
            ];

            for (const pageId of permPages) {
                await pool.request()
                    .input('user_id', sql.Int, newUser.user_id)
                    .input('page_id', sql.NVarChar, pageId)
                    .query(`
                        IF NOT EXISTS (SELECT 1 FROM UserPermissions WHERE user_id = @user_id AND page_id = @page_id)
                        INSERT INTO UserPermissions (user_id, page_id, is_granted) VALUES (@user_id, @page_id, 1)
                    `);
            }
            console.log(`   → ให้สิทธิ์เข้าถึงหน้า Document Control + DAR แล้ว`);
        }

        console.log('\n🎉 Setup complete!');
        console.log('────────────────────────────────────────');
        console.log('Approver Credentials:');
        console.log('  natthakit / Approve@2026 (ตัวแทนฝ่ายบริหาร)');
        console.log('  thawat    / Approve@2026 (ประธานวิสาหกิจชุมชน)');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (pool) await pool.close();
    }
}

setup();

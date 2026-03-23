/**
 * แก้สิทธิ์ approver users — รัน: node fix-approver-perms.cjs
 */
const sql = require('mssql');

const config = {
    server: 'localhost',
    database: 'ERP_THAIHERB',
    user: 'erp_admin',
    password: 'Erp@2026!',
    options: { trustServerCertificate: true, encrypt: false },
};

async function fix() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected');

        // ดึง user_id ของ approvers
        const users = await pool.request().query(`
            SELECT user_id, username, display_name FROM Users
            WHERE username IN ('natthakit', 'thawat')
        `);
        console.log('Approver users found:', users.recordset);

        const permPages = [
            'document_control',
            'document_dashboard', 'dashboard_chart', 'dashboard_stats',
            'document_request', 'document_request_search', 'document_request_table', 'document_request_action',
            'document_forms', 'document_forms_table', 'document_forms_action',
        ];

        for (const user of users.recordset) {
            console.log(`\n🔧 Fixing permissions for ${user.username} (ID: ${user.user_id})`);

            for (const pageId of permPages) {
                await pool.request()
                    .input('user_id', sql.Int, user.user_id)
                    .input('page_id', sql.NVarChar, pageId)
                    .query(`
                        IF NOT EXISTS (SELECT 1 FROM UserPermissions WHERE user_id = @user_id AND page_id = @page_id)
                        INSERT INTO UserPermissions (user_id, page_id, is_granted) VALUES (@user_id, @page_id, 1)
                    `);
            }
            console.log(`   ✅ Granted ${permPages.length} permissions`);
        }

        // ตรวจสอบผลลัพธ์
        for (const user of users.recordset) {
            const perms = await pool.request()
                .input('uid', sql.Int, user.user_id)
                .query('SELECT page_id FROM UserPermissions WHERE user_id = @uid AND is_granted = 1');
            console.log(`\n${user.username} permissions:`, perms.recordset.map(p => p.page_id));
        }

        console.log('\n🎉 Done!');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (pool) await pool.close();
    }
}

fix();

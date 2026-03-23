/**
 * Migration script — เพิ่มคอลัมน์ revision ให้ตาราง FormSubmissions
 * รัน: node add-revision-columns.cjs
 */
const sql = require('mssql');

const config = {
    server: 'localhost',
    database: 'ERP_THAIHERB',
    user: 'erp_admin',
    password: 'Erp@2026!',
    options: { trustServerCertificate: true, encrypt: false },
};

async function migrate() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database');

        // เพิ่มคอลัมน์ revision_number
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FormSubmissions') AND name = 'revision_number')
            ALTER TABLE FormSubmissions ADD revision_number INT DEFAULT 0
        `);
        console.log('✅ Added column: revision_number');

        // เพิ่มคอลัมน์ parent_submission_id
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FormSubmissions') AND name = 'parent_submission_id')
            ALTER TABLE FormSubmissions ADD parent_submission_id INT NULL
        `);
        console.log('✅ Added column: parent_submission_id');

        // เพิ่มคอลัมน์ revision_comment
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FormSubmissions') AND name = 'revision_comment')
            ALTER TABLE FormSubmissions ADD revision_comment NVARCHAR(500) NULL
        `);
        console.log('✅ Added column: revision_comment');

        // เพิ่มคอลัมน์ revision_requested_by
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FormSubmissions') AND name = 'revision_requested_by')
            ALTER TABLE FormSubmissions ADD revision_requested_by INT NULL
        `);
        console.log('✅ Added column: revision_requested_by');

        // เพิ่มคอลัมน์ revision_requested_at
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FormSubmissions') AND name = 'revision_requested_at')
            ALTER TABLE FormSubmissions ADD revision_requested_at DATETIME NULL
        `);
        console.log('✅ Added column: revision_requested_at');

        // Update existing rows: set revision_number = 0 where NULL
        await pool.request().query(`
            UPDATE FormSubmissions SET revision_number = 0 WHERE revision_number IS NULL
        `);
        console.log('✅ Updated existing rows: revision_number = 0');

        console.log('\n🎉 Migration complete! FormSubmissions table now supports revisions.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (pool) await pool.close();
    }
}

migrate();

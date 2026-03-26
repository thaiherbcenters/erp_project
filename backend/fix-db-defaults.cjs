/**
 * =============================================================================
 * fix-db-defaults.cjs — ซ่อม DEFAULT GETDATE() ที่หายไปตอนย้ายฐานข้อมูล
 * =============================================================================
 * ตอนที่ย้าย Database จากเครื่องหนึ่งไปอีกเครื่อง DEFAULT constraints หายไป
 * สคริปต์นี้จะเพิ่ม DEFAULT GETDATE() กลับมาให้ครบทุกตาราง ทุกคอลัมน์
 * รัน: cd backend && node fix-db-defaults.cjs
 * =============================================================================
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

// ทุกตาราง + ทุกคอลัมน์ที่ต้องมี DEFAULT GETDATE()
const FIXES = [
    // Users table
    { table: 'Users', column: 'created_at', type: 'DATETIME2' },
    { table: 'Users', column: 'updated_at', type: 'DATETIME2' },

    // Documents table
    { table: 'Documents', column: 'created_at', type: 'DATETIME2' },
    { table: 'Documents', column: 'updated_at', type: 'DATETIME2' },

    // DocumentLibraryFolders table
    { table: 'DocumentLibraryFolders', column: 'created_date', type: 'DATETIME' },

    // DocumentLibrary table
    { table: 'DocumentLibrary', column: 'upload_date', type: 'DATETIME' },

    // DocumentLibraryLogs table
    { table: 'DocumentLibraryLogs', column: 'action_date', type: 'DATETIME' },

    // FormSubmissions table
    { table: 'FormSubmissions', column: 'submitted_at', type: 'DATETIME' },

    // Roles table
    { table: 'Roles', column: 'created_at', type: 'DATETIME' },

    // Departments table
    { table: 'Departments', column: 'created_at', type: 'DATETIME' },
];

async function fix() {
    try {
        const pool = await sql.connect(config);
        console.log(`✅ Connected to ${config.server} / ${config.database}\n`);

        let fixed = 0;
        let skipped = 0;
        let errors = 0;

        for (const { table, column, type } of FIXES) {
            const constraintName = `DF_${table}_${column}`;
            process.stdout.write(`  ${table}.${column} ... `);

            // Check if table exists
            const tableCheck = await pool.request()
                .input('tbl', sql.NVarChar, table)
                .query(`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tbl`);

            if (tableCheck.recordset.length === 0) {
                console.log('⏭️  table not found, skipping');
                skipped++;
                continue;
            }

            // Check if column exists
            const colCheck = await pool.request()
                .input('tbl', sql.NVarChar, table)
                .input('col', sql.NVarChar, column)
                .query(`SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tbl AND COLUMN_NAME = @col`);

            if (colCheck.recordset.length === 0) {
                console.log('⏭️  column not found, skipping');
                skipped++;
                continue;
            }

            // Check if DEFAULT already exists
            const defCheck = await pool.request()
                .input('tbl', sql.NVarChar, table)
                .input('col', sql.NVarChar, column)
                .query(`
                    SELECT dc.name 
                    FROM sys.default_constraints dc
                    JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
                    WHERE OBJECT_NAME(dc.parent_object_id) = @tbl AND c.name = @col
                `);

            if (defCheck.recordset.length > 0) {
                console.log(`✅ already has DEFAULT (${defCheck.recordset[0].name})`);
                skipped++;
                continue;
            }

            // Add DEFAULT GETDATE()
            try {
                await pool.request().query(`
                    ALTER TABLE [${table}] ADD CONSTRAINT [${constraintName}] DEFAULT GETDATE() FOR [${column}];
                `);
                console.log('🔧 FIXED! Added DEFAULT GETDATE()');
                fixed++;
            } catch (e) {
                // If constraint name conflict, try with random suffix
                try {
                    const altName = `${constraintName}_${Date.now()}`;
                    await pool.request().query(`
                        ALTER TABLE [${table}] ADD CONSTRAINT [${altName}] DEFAULT GETDATE() FOR [${column}];
                    `);
                    console.log('🔧 FIXED! Added DEFAULT GETDATE()');
                    fixed++;
                } catch (e2) {
                    console.log(`❌ ERROR: ${e2.message}`);
                    errors++;
                }
            }
        }

        console.log('\n═══════════════════════════════════════════');
        console.log(`  🔧 Fixed:   ${fixed}`);
        console.log(`  ⏭️  Skipped: ${skipped} (already OK or not found)`);
        console.log(`  ❌ Errors:  ${errors}`);
        console.log('═══════════════════════════════════════════');
        console.log('\n✅ Done! Restart your backend (node server.js) and try again.\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Connection Error:', err.message);
        process.exit(1);
    }
}

fix();

const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        trustServerCertificate: true,
        encrypt: true,
    },
    connectionTimeout: 10000,
};

async function test() {
    try {
        console.log('Connecting to:', config.server, '/', config.database);
        const pool = await sql.connect(config);
        console.log('✅ Connected!');

        // Test 1: Check if table exists
        console.log('\n--- Test 1: Check tables ---');
        const tables = await pool.request().query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME LIKE 'DocumentLibrary%'
        `);
        console.log('Tables found:', tables.recordset.map(r => r.TABLE_NAME));

        // Test 2: Try SELECT from DocumentLibraryFolders
        console.log('\n--- Test 2: SELECT folders ---');
        try {
            const folders = await pool.request().query(`
                SELECT TOP 5 * FROM DocumentLibraryFolders
            `);
            console.log('✅ Folders query OK, rows:', folders.recordset.length);
        } catch (err) {
            console.error('❌ Folders query FAILED:', err.message);
        }

        // Test 3: Try SELECT from DocumentLibrary  
        console.log('\n--- Test 3: SELECT files ---');
        try {
            const files = await pool.request().query(`
                SELECT TOP 5 * FROM DocumentLibrary
            `);
            console.log('✅ Files query OK, rows:', files.recordset.length);
        } catch (err) {
            console.error('❌ Files query FAILED:', err.message);
        }

        // Test 4: Try INSERT into DocumentLibraryFolders
        console.log('\n--- Test 4: INSERT folder ---');
        try {
            const result = await pool.request()
                .input('folder_name', sql.NVarChar, 'test_folder_' + Date.now())
                .input('parent_id', sql.Int, null)
                .input('created_by', sql.NVarChar, 'test')
                .query(`
                    INSERT INTO DocumentLibraryFolders (folder_name, parent_id, created_by)
                    VALUES (@folder_name, @parent_id, @created_by);
                    SELECT SCOPE_IDENTITY() AS id;
                `);
            console.log('✅ INSERT OK, new id:', result.recordset[0]?.id);
            
            // Clean up
            const newId = result.recordset[0]?.id;
            if (newId) {
                await pool.request().input('id', sql.Int, newId)
                    .query('DELETE FROM DocumentLibraryFolders WHERE id = @id');
                console.log('   (cleaned up test folder)');
            }
        } catch (err) {
            console.error('❌ INSERT FAILED:', err.message);
        }

        // Test 5: Check the full query used by GET /folders endpoint
        console.log('\n--- Test 5: Full GET /folders query ---');
        try {
            const result = await pool.request().query(`
                SELECT f.id, f.folder_name, f.parent_id, f.created_by, f.created_date,
                    (SELECT COUNT(*) FROM DocumentLibraryFolders sub WHERE sub.parent_id = f.id) AS sub_folder_count,
                    (SELECT COUNT(*) FROM DocumentLibrary d WHERE d.folder_id = f.id) AS file_count
                FROM DocumentLibraryFolders f
                WHERE f.parent_id IS NULL
                ORDER BY f.folder_name ASC;
            `);
            console.log('✅ Full query OK, rows:', result.recordset.length);
            result.recordset.forEach(r => console.log('  -', r.folder_name, `(${r.file_count} files)`));
        } catch (err) {
            console.error('❌ Full query FAILED:', err.message);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Connection FAILED:', err.message);
        process.exit(1);
    }
}

test();

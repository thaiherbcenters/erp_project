// Test script to debug the documents query
const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        trustServerCertificate: true,
        encrypt: false,
    },
    connectionTimeout: 10000,
};

async function test() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        console.log('Connected!\n');

        // Test 1: Check if Documents table exists
        console.log('--- Test 1: Check Documents table ---');
        try {
            const r1 = await pool.request().query('SELECT TOP 3 * FROM dbo.Documents');
            console.log('Documents table OK. Row count:', r1.recordset.length);
            if (r1.recordset.length > 0) {
                console.log('Columns:', Object.keys(r1.recordset[0]).join(', '));
                console.log('Sample row:', JSON.stringify(r1.recordset[0], null, 2));
            }
        } catch (err) {
            console.log('ERROR:', err.message);
        }

        // Test 2: Check if DocumentStandards table exists
        console.log('\n--- Test 2: Check DocumentStandards table ---');
        try {
            const r2 = await pool.request().query('SELECT TOP 3 * FROM dbo.DocumentStandards');
            console.log('DocumentStandards table OK. Row count:', r2.recordset.length);
        } catch (err) {
            console.log('ERROR:', err.message);
        }

        // Test 3: Check if Standards table exists
        console.log('\n--- Test 3: Check Standards table ---');
        try {
            const r3 = await pool.request().query('SELECT TOP 3 * FROM dbo.Standards');
            console.log('Standards table OK. Row count:', r3.recordset.length);
        } catch (err) {
            console.log('ERROR:', err.message);
        }

        // Test 4: Run the exact query from documents route
        console.log('\n--- Test 4: Full documents query ---');
        try {
            const r4 = await pool.request().query(`
                SELECT
                    d.doc_id,
                    d.doc_code           AS id,
                    d.doc_name           AS name,
                    d.category,
                    d.type_tag           AS typeTag,
                    d.revision,
                    d.effective_date     AS date,
                    d.status,
                    d.file_path,
                    STRING_AGG(s.standard_code, ' / ') AS standard
                FROM dbo.Documents d
                LEFT JOIN dbo.DocumentStandards ds ON d.doc_id      = ds.doc_id
                LEFT JOIN dbo.Standards          s ON ds.standard_id = s.standard_id
                GROUP BY
                    d.doc_id,
                    d.doc_code,
                    d.doc_name,
                    d.category,
                    d.type_tag,
                    d.revision,
                    d.effective_date,
                    d.status
                ORDER BY d.doc_id ASC;
            `);
            console.log('Query OK! Rows:', r4.recordset.length);
        } catch (err) {
            console.log('ERROR:', err.message);
        }

        await pool.close();
        console.log('\nDone.');
    } catch (err) {
        console.error('Connection error:', err.message);
    }
    process.exit(0);
}

test();

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

async function fix() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server');

        await pool.request().query(`
            ALTER TABLE QuotationItem 
            ALTER COLUMN ImageURL NVARCHAR(MAX) NULL;
        `);

        console.log('✅ Fixed QuotationItem.ImageURL to NVARCHAR(MAX)');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

fix();

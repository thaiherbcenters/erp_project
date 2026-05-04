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
        await pool.request().query('ALTER TABLE QuotationItem ALTER COLUMN ImageURL NVARCHAR(MAX)');
        console.log("Column updated successfully");
    } catch (e) {
        console.error(e);
    } finally {
        if (pool) pool.close();
    }
}
fix();

const sql = require('mssql');
require('dotenv').config({ path: './backend/.env' });

const config = {
    server: process.env.DB_SERVER || '10.0.0.10',
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: 1433,
    options: { trustServerCertificate: true, encrypt: false },
};

async function test() {
    try {
        let pool = await sql.connect(config);
        let q1 = await pool.request().query('SELECT * FROM CustomerType');
        console.log('CustomerType:', q1.recordset);
        let q2 = await pool.request().query('SELECT * FROM CustomerStatus');
        console.log('CustomerStatus:', q2.recordset);
        let q3 = await pool.request().query('SELECT CustomerID, CustomerName, CompanyID FROM Customer');
        console.log('Customer:', q3.recordset);
        
        let q4 = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, is_identity 
            FROM sys.columns c
            JOIN sys.tables t ON c.object_id = t.object_id
            JOIN INFORMATION_SCHEMA.COLUMNS isc ON isc.TABLE_NAME = t.name AND isc.COLUMN_NAME = c.name
            WHERE t.name = 'CustomerType'
        `);
        console.log('CustomerType Schema:', q4.recordset);
        await pool.close();
    } catch(e) { console.error('Error:', e.message); }
}
test();

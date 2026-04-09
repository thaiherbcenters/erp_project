const sql = require('mssql');
require('dotenv').config({ path: './backend/.env' });

const config10 = {
    server: process.env.DB_SERVER || '10.0.0.10',
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: 1433,
    options: { trustServerCertificate: true, encrypt: false },
};

async function testQuery() {
    try {
        console.log('\nTesting 10.0.0.10:');
        let pool = await sql.connect(config10);
        let result = await pool.request().query('SELECT * FROM Company');
        console.log('10.0.0.10 Company:', result.recordset);
        let cResult = await pool.request().query('SELECT CustomerCode, CustomerName FROM Customer');
        console.log('10.0.0.10 Customers:', cResult.recordset);
        await pool.close();
    } catch(e) { console.log('10.0.0.10 error:', e.message); }
}
testQuery();

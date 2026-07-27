const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function check() {
    try {
        const pool = await sql.connect(config);
        
        const q1 = await pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TaxInvoice'`);
        console.log("TaxInvoice columns:", q1.recordset.map(r => r.COLUMN_NAME).join(', '));
        
        const q2 = await pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'BillingInvoice'`);
        console.log("BillingInvoice columns:", q2.recordset.map(r => r.COLUMN_NAME).join(', '));
        
        const q3 = await pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Quotation'`);
        console.log("Quotation columns:", q3.recordset.map(r => r.COLUMN_NAME).join(', '));

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();

const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function main() {
    try {
        let pool = await sql.connect(config);
        const res1 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'BillingInvoice'");
        console.log("BillingInvoice:", res1.recordset.map(r => r.COLUMN_NAME).join(', '));
        
        const res2 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'BillingInvoiceHistory'");
        console.log("BillingInvoiceHistory:", res2.recordset.map(r => r.COLUMN_NAME).join(', '));

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();

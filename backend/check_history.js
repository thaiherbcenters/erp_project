const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: { encrypt: true, trustServerCertificate: true }
};

sql.connect(config).then(async pool => {
    let r = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TaxInvoiceHistory' AND COLUMN_NAME = 'CustomerID'");
    console.log('TaxInvoiceHistory:', r.recordset);
    
    r = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'BillingInvoiceHistory' AND COLUMN_NAME = 'CustomerID'");
    console.log('BillingInvoiceHistory:', r.recordset);
    
    r = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'QuotationHistory' AND COLUMN_NAME = 'CustomerID'");
    console.log('QuotationHistory:', r.recordset);
    process.exit(0);
});

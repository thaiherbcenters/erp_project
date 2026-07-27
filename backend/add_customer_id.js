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

async function addCols() {
    try {
        const pool = await sql.connect(config);
        
        const tables = [
            'TaxInvoice', 'TaxInvoiceHistory',
            'BillingInvoice', 'BillingInvoiceHistory',
            'Quotation', 'QuotationHistory'
        ];
        
        for (const t of tables) {
            try {
                await pool.request().query(`ALTER TABLE ${t} ADD CustomerID INT NULL`);
                console.log(`Added CustomerID to ${t}`);
            } catch (err) {
                console.log(`Could not add CustomerID to ${t}: ${err.message}`);
            }
        }

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
addCols();

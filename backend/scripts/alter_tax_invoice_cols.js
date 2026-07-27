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

async function migrate() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server');

        await pool.request().query(`
            IF COL_LENGTH('TaxInvoice', 'CustomerOrder') IS NULL
            BEGIN
                ALTER TABLE TaxInvoice ADD CustomerOrder NVARCHAR(100) NULL;
                PRINT 'Added CustomerOrder to TaxInvoice';
            END

            IF COL_LENGTH('TaxInvoice', 'PurchaseNo') IS NULL
            BEGIN
                ALTER TABLE TaxInvoice ADD PurchaseNo NVARCHAR(100) NULL;
                PRINT 'Added PurchaseNo to TaxInvoice';
            END

            IF COL_LENGTH('TaxInvoice', 'Salesperson') IS NULL
            BEGIN
                ALTER TABLE TaxInvoice ADD Salesperson NVARCHAR(100) NULL;
                PRINT 'Added Salesperson to TaxInvoice';
            END

            IF COL_LENGTH('TaxInvoice', 'TermOfPayment') IS NULL
            BEGIN
                ALTER TABLE TaxInvoice ADD TermOfPayment NVARCHAR(100) NULL;
                PRINT 'Added TermOfPayment to TaxInvoice';
            END

            IF COL_LENGTH('TaxInvoiceHistory', 'CustomerOrder') IS NULL
            BEGIN
                ALTER TABLE TaxInvoiceHistory ADD CustomerOrder NVARCHAR(100) NULL;
                PRINT 'Added CustomerOrder to TaxInvoiceHistory';
            END

            IF COL_LENGTH('TaxInvoiceHistory', 'PurchaseNo') IS NULL
            BEGIN
                ALTER TABLE TaxInvoiceHistory ADD PurchaseNo NVARCHAR(100) NULL;
                PRINT 'Added PurchaseNo to TaxInvoiceHistory';
            END

            IF COL_LENGTH('TaxInvoiceHistory', 'Salesperson') IS NULL
            BEGIN
                ALTER TABLE TaxInvoiceHistory ADD Salesperson NVARCHAR(100) NULL;
                PRINT 'Added Salesperson to TaxInvoiceHistory';
            END

            IF COL_LENGTH('TaxInvoiceHistory', 'TermOfPayment') IS NULL
            BEGIN
                ALTER TABLE TaxInvoiceHistory ADD TermOfPayment NVARCHAR(100) NULL;
                PRINT 'Added TermOfPayment to TaxInvoiceHistory';
            END
        `);
        console.log('✅ Columns added successfully.');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) pool.close();
    }
}
migrate();

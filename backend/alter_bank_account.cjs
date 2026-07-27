require('dotenv').config();
const sql = require('mssql');

const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: { trustServerCertificate: true, encrypt: true },
};

async function run() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database');

        // Drop constraint for Quotation
        let result = await pool.request().query(`
            SELECT default_constraints.name 
            FROM sys.all_columns 
            INNER JOIN sys.tables ON all_columns.object_id = tables.object_id 
            INNER JOIN sys.default_constraints ON all_columns.default_object_id = default_constraints.object_id 
            WHERE tables.name = 'Quotation' AND all_columns.name = 'BankAccount'
        `);
        for (let row of result.recordset) {
            await pool.request().query(`ALTER TABLE Quotation DROP CONSTRAINT ${row.name}`);
            console.log('Dropped constraint', row.name, 'from Quotation');
        }

        // Alter Quotation
        await pool.request().query(`ALTER TABLE Quotation ALTER COLUMN BankAccount NVARCHAR(MAX) NOT NULL`);
        console.log('✅ Altered Quotation.BankAccount to NVARCHAR(MAX)');

        // Drop constraint for QuotationHistory
        result = await pool.request().query(`
            SELECT default_constraints.name 
            FROM sys.all_columns 
            INNER JOIN sys.tables ON all_columns.object_id = tables.object_id 
            INNER JOIN sys.default_constraints ON all_columns.default_object_id = default_constraints.object_id 
            WHERE tables.name = 'QuotationHistory' AND all_columns.name = 'BankAccount'
        `);
        for (let row of result.recordset) {
            await pool.request().query(`ALTER TABLE QuotationHistory DROP CONSTRAINT ${row.name}`);
            console.log('Dropped constraint', row.name, 'from QuotationHistory');
        }

        // Alter QuotationHistory
        await pool.request().query(`ALTER TABLE QuotationHistory ALTER COLUMN BankAccount NVARCHAR(MAX) NOT NULL`);
        console.log('✅ Altered QuotationHistory.BankAccount to NVARCHAR(MAX)');

        console.log('🎉 Done altering bank account columns.');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

run();

const { poolPromise } = require('../config/db');

async function run() {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('EliteTaxInvoices') AND name = 'PaymentTerm')
                ALTER TABLE EliteTaxInvoices ADD PaymentTerm NVARCHAR(100) NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('EliteTaxInvoices') AND name = 'ContactPerson')
                ALTER TABLE EliteTaxInvoices ADD ContactPerson NVARCHAR(100) NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('EliteTaxInvoices') AND name = 'Reference')
                ALTER TABLE EliteTaxInvoices ADD Reference NVARCHAR(100) NULL;
        `);
        console.log('Columns PaymentTerm, ContactPerson, Reference added successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

run();

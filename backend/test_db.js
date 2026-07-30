const { poolPromise } = require('./config/db');
async function test() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT TOP 5 TaxInvoiceID, TaxInvoiceNo, ContractID FROM TaxInvoice ORDER BY TaxInvoiceID DESC');
        console.log(result.recordset);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
test();

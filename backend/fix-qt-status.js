require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    const pool = await poolPromise;
    // Update all "ร่าง" quotations to "พร้อมใช้"
    await pool.request().query(`UPDATE Quotation SET Status = N'พร้อมใช้' WHERE Status = N'ร่าง'`);
    const r = await pool.request().query('SELECT QuotationID, QuotationNo, Status FROM Quotation');
    console.log('Updated:', JSON.stringify(r.recordset, null, 2));
    process.exit(0);
})();

const { poolPromise } = require('./config/db');

(async () => {
    const p = await poolPromise;
    const r = await p.request().query(`SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Customer' ORDER BY ORDINAL_POSITION`);
    console.log('Customer Schema:', JSON.stringify(r.recordset, null, 2));
    const r2 = await p.request().query(`SELECT * FROM CustomerType`);
    console.log('Types:', JSON.stringify(r2.recordset));
    const r3 = await p.request().query(`SELECT * FROM CustomerStatus`);
    console.log('Statuses:', JSON.stringify(r3.recordset));
    const r4 = await p.request().query(`SELECT TOP 3 * FROM Customer`);
    console.log('Sample:', JSON.stringify(r4.recordset, null, 2));
    process.exit(0);
})();

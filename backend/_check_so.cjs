const { poolPromise } = require('./config/db');
(async () => {
    const p = await poolPromise;
    const r = await p.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SalesOrder' ORDER BY ORDINAL_POSITION");
    console.log('=== SalesOrder Columns ===');
    r.recordset.forEach(c => console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
    process.exit(0);
})();

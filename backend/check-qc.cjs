require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`SELECT TOP 5 RequestID, TaskID, BatchNo, Type, Status FROM QC_Production ORDER BY RequestedAt DESC`);
        console.table(result.recordset);
        process.exit(0);
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
})();

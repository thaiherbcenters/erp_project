const { poolPromise, sql } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const res = await pool.request()
            .input('testDate', sql.Date, '2026-04-26')
            .query("SELECT @testDate AS testDate");
        console.log("Returned:", res.recordset[0].testDate);
        console.log("ISO:", res.recordset[0].testDate.toISOString());
        process.exit(0);
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
})();

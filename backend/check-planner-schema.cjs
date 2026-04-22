require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("EXEC sp_columns 'Planner'");
        console.table(result.recordset.map(c => c.COLUMN_NAME));
        process.exit(0);
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
})();

require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT TOP 5 JobOrderID, CustomerName FROM Planner");
        console.table(result.recordset);
        process.exit(0);
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
})();

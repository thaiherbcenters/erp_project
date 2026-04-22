require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE'");
        console.table(result.recordset);
        process.exit(0);
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
})();

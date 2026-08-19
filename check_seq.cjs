require('dotenv').config({ path: './backend/.env' });
const sql = require('mssql');
const { poolPromise } = require('./backend/config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const res = await pool.request().query("SELECT * FROM Sequences");
        console.table(res.recordset);
        process.exit(0);
    } catch(e) { console.error(e); process.exit(1); }
})();

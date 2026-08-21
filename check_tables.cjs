require('dotenv').config({path: './backend/.env'});
const { poolPromise } = require('./backend/config/db.js');

async function run() {
    const pool = await poolPromise;
    const res = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
    console.log(res.recordset.map(r => r.TABLE_NAME));
    process.exit(0);
}
run();

const sql = require('mssql');
const config = require('./config/db');

async function run() {
    try {
        const pool = await sql.connect(config);
        const res = await pool.request().query("SELECT * FROM Stock_Logs WHERE ItemID = 'WIP-0001'");
        console.table(res.recordset);
    } catch(err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();

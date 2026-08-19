require('dotenv').config();
const { poolPromise, sql } = require('./config/db');

async function run() {
    try {
        const pool = await poolPromise;
        const res = await pool.request().query("SELECT * FROM Production_Tasks WHERE BatchNo = 'B20260817-WIP'");
        console.log("Tasks:");
        console.table(res.recordset);
        
        // Delete the one with status 'กำลังทำ'
        const delRes = await pool.request().query("DELETE FROM Production_Tasks WHERE BatchNo = 'B20260817-WIP' AND Status = N'กำลังทำ'");
        console.log("Deleted count:", delRes.rowsAffected);
        
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
run();

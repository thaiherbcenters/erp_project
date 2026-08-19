const { poolPromise, sql } = require('./config/db'); 
async function check() { 
    try { 
        const pool = await poolPromise; 
        const res = await pool.request().query("SELECT TaskID, BatchNo, JobOrderID, Status, CurrentStep FROM Production_Tasks WHERE JobOrderID = 'JO-20260819-002'");
        console.log(res.recordset);
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
check();

const { poolPromise, sql } = require('./config/db'); 
async function check() { 
    try { 
        const pool = await poolPromise; 
        const res = await pool.request().query("SELECT TaskID, JobOrderID, Product FROM Packaging_Tasks WHERE TaskID IN ('PKG-20260819-004', 'PKG-20260817-002')");
        console.log(res.recordset);
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
check();

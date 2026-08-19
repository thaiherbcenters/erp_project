const { poolPromise, sql } = require('./config/db'); 
async function test() { 
    try { 
        const pool = await poolPromise; 
        const res = await pool.request().query("SELECT * FROM Packaging_Tasks WHERE TaskID = 'PKG-20260819-001'"); 
        console.log(res.recordset); 
        
        const qcRes = await pool.request().query("SELECT * FROM QC_Production WHERE TaskID = 'PKG-20260819-001'");
        console.log(qcRes.recordset);
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
test();

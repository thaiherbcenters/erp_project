const { poolPromise, sql } = require('./config/db'); 
async function check() { 
    try { 
        const pool = await poolPromise; 
        const res = await pool.request().query("SELECT TaskID, SlipImage FROM Shipping_Orders WHERE TaskID = 'SHP-20260819-001'");
        console.log(res.recordset);
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
check();

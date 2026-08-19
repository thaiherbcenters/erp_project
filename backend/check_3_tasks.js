const { poolPromise, sql } = require('./config/db'); 
async function check() { 
    try { 
        const pool = await poolPromise; 
        const pt = await pool.request().query("SELECT TaskID, BatchNo, FormulaName, ProductName, Line FROM Production_Tasks WHERE JobOrderID = 'JO-20260819-003'");
        console.log("Production_Tasks:", pt.recordset);
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
check();

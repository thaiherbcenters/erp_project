const { poolPromise, sql } = require('./config/db'); 
async function check() { 
    try { 
        const pool = await poolPromise; 
        const res = await pool.request().query("SELECT PlannerID, FormulaName, ProductName, Notes FROM Planner WHERE PlannerID IN ('JO-20260819-001', 'JO-20260819-002')");
        console.log(res.recordset);
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
check();

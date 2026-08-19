const { poolPromise, sql } = require('./config/db'); 
async function check() { 
    try { 
        const pool = await poolPromise; 
        const res = await pool.request().query("SELECT PlannerID, FormulaName, ProductName, Notes FROM Planner WHERE PlannerID = 'JO-20260819-003'");
        console.log("Planner:", res.recordset);
        
        const pt = await pool.request().query("SELECT TaskID, FormulaName, ProductName FROM Production_Tasks WHERE JobOrderID = 'JO-20260819-003'");
        console.log("Production_Tasks:", pt.recordset);
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
check();

const { poolPromise, sql } = require('./config/db'); 
async function check() { 
    try { 
        const pool = await poolPromise; 
        const res = await pool.request().query("SELECT FormulaID, BatchSize, Unit FROM Formulas WHERE FormulaID = 'FM-014'");
        console.log(res.recordset);
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
check();

const { poolPromise, sql } = require('./config/db'); 
async function revert() { 
    try { 
        const pool = await poolPromise; 
        await pool.request().query("UPDATE Production_Tasks SET CurrentStep = 'requisition', Status = N'รอเบิกวัตถุดิบ', StepTimesJSON = NULL WHERE JobOrderID = 'JO-20260819-002'");
        await pool.request().query("DELETE FROM Packaging_Tasks WHERE JobOrderID = 'JO-20260819-002'");
        console.log("Reverted successfully!");
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
revert();

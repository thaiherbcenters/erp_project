const { poolPromise, sql } = require('./config/db'); 
async function fix() { 
    try { 
        const pool = await poolPromise; 
        await pool.request().query("UPDATE Production_Tasks SET ProductName = 'ยาน้ำมันสมุนไพร สูตรร้อน' WHERE JobOrderID = 'JO-20260819-003'");
        console.log("Fixed RQ task");
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
fix();

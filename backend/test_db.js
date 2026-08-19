const { poolPromise, sql } = require('./config/db'); 
async function test() { 
    try { 
        const pool = await poolPromise; 
        await pool.request().query(`UPDATE Packaging_Tasks SET RequisitionJSON = REPLACE(CAST(RequisitionJSON AS NVARCHAR(MAX)), 'ไม่ระบุ', 'ผู้ใช้ระบบ') WHERE TaskID = 'PKG-20260819-001'`); 
        console.log('Updated'); 
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
test();

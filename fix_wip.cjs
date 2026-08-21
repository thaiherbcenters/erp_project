require('dotenv').config({path: 'backend/.env'}); 
const { poolPromise } = require('./backend/config/db'); 
async function run() { 
    const pool = await poolPromise; 
    
    // 1. Revert Production_Tasks back to 'รอเริ่มงาน'
    const res1 = await pool.request().query("UPDATE Production_Tasks SET CurrentStep = 'wait', Status = N'รอเริ่มงาน' WHERE BatchNo = 'B20260821-WIP'"); 
    console.log('Reverted PT:', res1.rowsAffected);
    
    // 2. Delete the phantom Packaging_Tasks
    const res2 = await pool.request().query("DELETE FROM Packaging_Tasks WHERE BatchNo = 'B20260821-WIP'");
    console.log('Deleted Phantom PKG:', res2.rowsAffected);

    process.exit(0); 
} 
run();

require('dotenv').config({path: './backend/.env'});
const { poolPromise, sql } = require('./backend/config/db.js');

async function run() {
    const pool = await poolPromise;
    // The task that got skipped is for BatchNo: B20260821-WIP-02
    // Which means ProductionTask with BatchNo = B20260821-WIP-02
    
    // 1. Revert Production_Tasks state
    await pool.request().query(`
        UPDATE Production_Tasks 
        SET CurrentStep = 'wait', Status = N'รอเริ่มงาน'
        WHERE BatchNo = 'B20260821-WIP-02' AND Status = N'รอบรรจุ'
    `);
    
    // 2. Delete the erroneous Packaging_Tasks
    await pool.request().query(`
        DELETE FROM Packaging_Tasks WHERE BatchNo = 'B20260821-WIP-02'
    `);
    
    console.log('Fixed task flow');
    process.exit(0);
}
run();

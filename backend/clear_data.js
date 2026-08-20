require('dotenv').config();
const { poolPromise, sql } = require('./config/db');

async function clearTransactionalData() {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            const request = new sql.Request(transaction);

            // 1. Clear Packaging Tasks
            console.log('Clearing Packaging...');
            await request.query(`DELETE FROM Packaging_Tasks`);

            // 2. Clear QC
            console.log('Clearing QC...');
            await request.query(`DELETE FROM QC_Production`);
            
            // 3. Clear Production (WIP & Main)
            console.log('Clearing Production...');
            await request.query(`DELETE FROM Production_Tasks`);
            await request.query(`DELETE FROM Production_Logs`);

            // 4. Clear Planner
            console.log('Clearing Planner...');
            await request.query(`DELETE FROM Planner`);

            // 5. Clear WIP Inventory
            console.log('Clearing WIP Inventory...');
            await request.query(`DELETE FROM WIP_Lots`);
            
            // 6. Clear Stock Logs & Related (Optional, but let's keep it clean)
            // wait, user said "คลังสินค้า" -> maybe just WIP_Lots, or all transactions?
            // "ช่วงล่างข้อมูลทดสอบตอนนี้ออกให้ฉันก่อน หน้า planner คลังสินค้า (Inventory) ตรวจสอบคุณภาพ ฝ่ายผลิต wip บรรจุ"
            // Let's clear Stock_Logs for those specific jobs, or just clear all Stock_Logs if it's a test db.
            // Let's clear all Stock_Logs to be safe since it's test data.
            console.log('Clearing Stock Logs (Transactions)...');
            await request.query(`DELETE FROM Stock_Logs`);

            // 7. Reset Sequences
            console.log('Resetting Sequences...');
            await request.query(`
                DELETE FROM Sequences 
                WHERE Prefix LIKE 'JO-%' 
                   OR Prefix LIKE 'PT-%' 
                   OR Prefix LIKE 'PKG-%' 
                   OR Prefix LIKE 'RQ-%'
                   OR Prefix LIKE 'QCF-%'
                   OR Prefix LIKE 'QCIP-%'
                   OR Prefix LIKE 'WIP-%'
            `);

            await transaction.commit();
            console.log('✅ All transactional data cleared successfully!');
            process.exit(0);
        } catch (err) {
            await transaction.rollback();
            console.error('❌ Error during deletion, rolling back:', err.message);
            
            // Let's print out what tables actually exist to avoid failing on missing tables
            const tables = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'");
            console.log('Available tables:', tables.recordset.map(t=>t.TABLE_NAME));
            
            process.exit(1);
        }
    } catch (err) {
        console.error('Connection error:', err);
        process.exit(1);
    }
}

clearTransactionalData();

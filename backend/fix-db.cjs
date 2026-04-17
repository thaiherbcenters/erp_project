require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        // 1. Packaging -> QC Final
        await pool.request().query(`
            UPDATE pt
            SET pt.CurrentStep = 'qc_final', pt.Status = N'กำลังทำ'
            FROM Production_Tasks pt
            JOIN Packaging_Tasks pkg ON pkg.BatchNo = pt.BatchNo
            WHERE pkg.Status = N'รอ QC Final' AND pt.CurrentStep = 'packaging'
        `);
        console.log('Fixed packaging -> qc_final tasks');

        // 2. QC Pass -> Stock
        await pool.request().query(`
            UPDATE pt
            SET pt.CurrentStep = 'stock', pt.Status = N'เสร็จสิ้น', pt.EndTime = GETDATE()
            FROM Production_Tasks pt
            JOIN Packaging_Tasks pkg ON pkg.BatchNo = pt.BatchNo
            WHERE pkg.Status IN (N'QC ผ่าน', N'ส่งมอบแล้ว') AND pt.CurrentStep IN ('packaging', 'qc_final')
        `);
        console.log('Fixed qc_final -> stock tasks');
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();

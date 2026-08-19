require('dotenv').config({ path: './backend/.env' });
const { sql, poolPromise } = require('./backend/config/db');

(async () => {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            INSERT INTO QC_Criteria (QCStage, CheckItem, StandardRequirement, ProductCategory) VALUES
            ('qc_final', N'การรั่วซึมของบรรจุภัณฑ์', N'ไม่มีการรั่วซึม 100%', N'ยาดม'),
            ('qc_final', N'ความแน่นของฝาปิด', N'ฝาปิดสนิท ไม่หลวม', N'ยาดม'),
            ('qc_final', N'ความถูกต้องของฉลาก', N'ฉลากตรงกับสูตร วันหมดอายุถูกต้อง', 'All'),
            ('qc_final', N'ปริมาณบรรจุ', N'ตรงตาม Spec +- 5%', 'All');
        `);
        console.log('Inserted successfully!');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();

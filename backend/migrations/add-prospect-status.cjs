/**
 * Migration: เพิ่มสถานะ "Prospect" ลงใน CustomerStatus table
 * Prospect = ลูกค้าเป้าหมาย (เคยได้ใบเสนอราคาแต่ยังไม่ได้สั่งซื้อ)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { poolPromise, sql } = require('../config/db');

(async () => {
    try {
        const pool = await poolPromise;

        // เพิ่มสถานะ Prospect (ID=4) ถ้ายังไม่มี
        await pool.request()
            .input('id', sql.Int, 4)
            .input('name', sql.NVarChar, 'Prospect')
            .query(`
                IF NOT EXISTS (SELECT 1 FROM CustomerStatus WHERE StatusName = 'Prospect')
                BEGIN
                    INSERT INTO CustomerStatus (CustomerStatusID, StatusName) VALUES (@id, @name);
                    PRINT 'Added Prospect status (ID=4)';
                END
                ELSE PRINT 'Prospect status already exists.';
            `);

        console.log('✅ Migration complete: Prospect status added.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration error:', e.message);
        process.exit(1);
    }
})();

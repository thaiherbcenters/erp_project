require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        // Delete logs for STK-%
        await pool.request().query(`DELETE FROM Stock_Logs WHERE ItemID LIKE 'STK-%'`);
        // Delete items for STK-%
        const res = await pool.request().query(`DELETE FROM Stock_Items WHERE ItemID LIKE 'STK-%'`);
        console.log(`✅ Deleted ${res.rowsAffected[0]} wrong items (STK-xxx) from database`);
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
})();

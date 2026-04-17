require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            DELETE FROM Production_Tasks 
            WHERE JobOrderID = 'JO-2026-010' 
            AND BatchNo != 'B26-094406-1'
        `);
        console.log(`Deleted ${result.rowsAffected[0]} duplicate task cards.`);
        process.exit(0);
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
})();

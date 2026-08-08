require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const transaction = pool.transaction();
        await transaction.begin();

        try {
            // Get max SP ID
            const maxRes = await transaction.request().query(`
                SELECT MAX(ItemID) as maxId FROM Stock_Items WHERE ItemID LIKE 'SP-%' AND ItemID NOT LIKE 'SP--%'
            `);
            const maxId = maxRes.recordset[0].maxId || 'SP-000';
            const num = parseInt(maxId.split('-')[1]) + 1;
            const newId = `SP-${String(num).padStart(3, '0')}`;

            // Check if SP--001 exists
            const check = await transaction.request().query(`SELECT ItemID FROM Stock_Items WHERE ItemID = 'SP--001'`);
            if (check.recordset.length > 0) {
                // Update logs first because of foreign key or just reference
                await transaction.request().query(`UPDATE Stock_Logs SET ItemID = '${newId}' WHERE ItemID = 'SP--001'`);
                await transaction.request().query(`UPDATE Stock_Items SET ItemID = '${newId}' WHERE ItemID = 'SP--001'`);
                console.log(`✅ Updated SP--001 to ${newId}`);
            } else {
                console.log('SP--001 not found.');
            }
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
})();

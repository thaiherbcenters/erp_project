require('dotenv').config({ path: './backend/.env' });
const sql = require('mssql');
const { poolPromise } = require('./backend/config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await transaction.request().query("DELETE FROM Stock_Logs WHERE RefType = 'production'");
            await transaction.request().query("DELETE FROM Production_Tasks");
            await transaction.request().query("DELETE FROM Planner");
            await transaction.commit();
            console.log('Successfully cleared all production test data.');
        } catch(e) {
            await transaction.rollback();
            throw e;
        }
        process.exit(0);
    } catch(e) { console.error(e); process.exit(1); }
})();

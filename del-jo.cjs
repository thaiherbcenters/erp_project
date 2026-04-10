const { poolPromise } = require('./backend/config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const res1 = await pool.request().query("DELETE FROM Production_Tasks WHERE JobOrderID = 'JO-2026-007'");
        const res2 = await pool.request().query("DELETE FROM Planner WHERE PlannerID = 'JO-2026-007'");
        console.log('Deleted Tasks:', res1.rowsAffected);
        console.log('Deleted Planner:', res2.rowsAffected);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
})();

const { poolPromise } = require('./config/db');
(async () => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT pt.*, p.Unit as JobUnit 
            FROM Production_Tasks pt
            LEFT JOIN Planner p ON pt.JobOrderID = p.PlannerID
            WHERE pt.BatchNo LIKE '%WIP%'
        `);
        console.log('Result JobUnit:', result.recordset[0].JobUnit);
        console.log('Is Array?', Array.isArray(result.recordset[0].JobUnit));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();

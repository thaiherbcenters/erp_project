require('dotenv').config({ path: './backend/.env' });
const { sql, poolPromise } = require('./backend/config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const res = await pool.request().query(`
            UPDATE pt
            SET pt.ProducedQty = pk.PackedQty
            FROM Production_Tasks pt
            INNER JOIN Packaging_Tasks pk ON pt.TaskID = pk.ProductionTaskID
            WHERE pt.JobOrderID = 'JO-20260815-001' AND pt.ProducedQty = 0 AND pk.PackedQty > 0
        `);
        console.log('Rows affected:', res.rowsAffected);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();

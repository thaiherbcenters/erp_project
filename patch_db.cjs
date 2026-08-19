require('dotenv').config({ path: './backend/.env' });
const sql = require('mssql');
const { poolPromise } = require('./backend/config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const res = await pool.request().query("SELECT TaskID, RequisitionJSON FROM Production_Tasks WHERE TaskID = 'PT-20260818-002'");
        const tasks = res.recordset;
        if (tasks.length > 0) {
            let jsonStr = tasks[0].RequisitionJSON;
            let data = JSON.parse(jsonStr);
            data.requesterName = 'test_operator';
            data.issuerName = 'test_stock';
            data.issueDate = new Date().toLocaleDateString('th-TH');
            
            const newJson = JSON.stringify(data).replace(/'/g, "''");
            await pool.request().query(`UPDATE Production_Tasks SET RequisitionJSON = '${newJson}' WHERE TaskID = 'PT-20260818-002'`);
            console.log('Patched PT-20260818-002');
        }
        process.exit(0);
    } catch(e) { console.error(e); process.exit(1); }
})();

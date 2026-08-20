const sql = require('mssql');
const { config } = require('../backend/db');

async function check() {
    try {
        let pool = await sql.connect(config);
        let res = await pool.request().query("SELECT PlannerID, FormulaName, ProductName FROM Planner WHERE PlannerID = 'JO-20260820-001'");
        console.log(res.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
check();

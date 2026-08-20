const sql = require('mssql');
const { config } = require('../backend/db');

async function check() {
    try {
        let pool = await sql.connect(config);
        let res = await pool.request().query("SELECT TaskID, RequisitionJSON FROM Production_Tasks WHERE TaskID = 'PT-20260820-002'");
        console.log(res.recordset[0]);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
check();

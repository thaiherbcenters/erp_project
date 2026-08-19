require('dotenv').config();
const { poolPromise } = require('./config/db');

async function run() {
    try {
        const pool = await poolPromise;
        const res = await pool.request().query("SELECT * FROM RnD_Formula_Ingredients WHERE FormulaID = 'FM-014'");
        console.dir(res.recordset, { depth: null });
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
run();

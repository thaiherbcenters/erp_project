const { sql, poolPromise } = require('./config/db');

async function fixFM006Data() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("UPDATE RnD_Formulas SET BatchSize = 39996, Unit = 'กรัม', CreatedBy = 'มานพ' WHERE FormulaID = 'FM-006'");
        console.log(`Updated ${result.rowsAffected[0]} row(s).`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}
fixFM006Data();

require('dotenv').config();
const { poolPromise } = require('./config/db');

async function run() {
    try {
        const pool = await poolPromise;
        const formulaRes = await pool.request().query(
            "SELECT FormulaID, Name, BatchSize, Unit, UnitSize FROM RnD_Formulas WHERE Name LIKE N'%ยาสเปรย์%'"
        );
        console.dir(formulaRes.recordset, { depth: null });

        if (formulaRes.recordset.length > 0) {
            const formulaId = formulaRes.recordset[0].FormulaID;
            const ingRes = await pool.request().query(
                `SELECT * FROM RnD_Formula_Ingredients WHERE FormulaID = '${formulaId}'`
            );
            console.dir(ingRes.recordset, { depth: null });
        }
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
run();

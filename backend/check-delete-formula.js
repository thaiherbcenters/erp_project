const sql = require('mssql');
const { poolPromise } = require('./config/db');

async function testDelete() {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const reqParam = new sql.Request(transaction).input('FormulaID', sql.VarChar, 'FM-006');
            
            await reqParam.query('DELETE FROM RnD_Formula_Ingredients WHERE FormulaID=@FormulaID');
            await reqParam.query('DELETE FROM RnD_Formula_Tests WHERE FormulaID=@FormulaID');
            await reqParam.query('DELETE FROM RnD_Formulas WHERE FormulaID=@FormulaID');
            
            // ROLLBACK after test so we don't actually delete it permanently if it succeeds
            await transaction.rollback();
            console.log("Success! Deletion would have worked.");
        } catch (txErr) { 
            await transaction.rollback(); 
            throw txErr; 
        }
    } catch (err) {
        console.error('Detailed Error:', err);
    }
    process.exit(0);
}
testDelete();

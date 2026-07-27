const { poolPromise } = require('./config/db');

async function checkFormulas() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT FormulaID, Name FROM RnD_Formulas WHERE Name LIKE N'%ยาดมสมุนไพร ตรา เอส ที เฮิร์บ เฮมพ์%'");
        console.log(result.recordset);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkFormulas();

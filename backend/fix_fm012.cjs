const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME, // Fixed from DB_DATABASE
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        let pool = await sql.connect(config);
        
        let result = await pool.request()
            .query("SELECT * FROM RnD_Formulas WHERE FormulaId IN ('FM-011', 'FM-012')");
        
        console.log(JSON.stringify(result.recordset, null, 2));

        // Let's also update it directly!
        await pool.request()
            .query(`
                UPDATE RnD_Formulas 
                SET Status = N'อนุมัติ' 
                WHERE FormulaId = 'FM-012' AND Status = 'Approved'
            `);
            
        console.log("Updated Status to อนุมัติ");

    } catch (err) {
        console.error(err);
    } finally {
        sql.close();
    }
}
run();

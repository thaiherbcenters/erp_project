require('dotenv').config({ path: 'backend/.env' });
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        let pool = await sql.connect(config);
        
        let res = await pool.request().query("SELECT TaskID, CurrentStep, Status, StepTimesJSON FROM Production_Tasks WHERE JobOrderID = 'JO-20260820-001' AND BatchNo = 'B260820-FM014-03'");
        console.log("Current:", res.recordset);

        // Update back to prepare
        await pool.request().query("UPDATE Production_Tasks SET CurrentStep = 'prepare', Status = 'เตรียมการ' WHERE JobOrderID = 'JO-20260820-001' AND BatchNo = 'B260820-FM014-03'");
        
        console.log("Rolled back to prepare.");
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
run();

require('dotenv').config();
const sql = require('mssql');
const config = {
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { trustServerCertificate: true, encrypt: false },
};
async function checkData() {
    try {
        const pool = await sql.connect(config);
        const res = await pool.request().query("SELECT TaskID, Status, CurrentStep FROM Production_Tasks WHERE TaskID = 'PT-20260519-002'");
        console.log('Task:', res.recordset);
        
        const qRes = await pool.request().query("SELECT RequestID, Status, Type FROM QC_Production WHERE TaskID = 'PT-20260519-002'");
        console.log('QC:', qRes.recordset);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
checkData();

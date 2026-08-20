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

async function check() {
    try {
        let pool = await sql.connect(config);
        let res = await pool.request().query("SELECT RequisitionJSON FROM Production_Tasks WHERE TaskID = 'PT-20260820-002'");
        const data = JSON.parse(res.recordset[0].RequisitionJSON);
        console.log("Requester Name in DB:", data.requesterName);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
check();

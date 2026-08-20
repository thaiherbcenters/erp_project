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

async function fix() {
    try {
        let pool = await sql.connect(config);
        
        let res = await pool.request().query("SELECT RequisitionJSON FROM Production_Tasks WHERE TaskID = 'PT-20260820-002'");
        if(res.recordset.length > 0) {
            let data = JSON.parse(res.recordset[0].RequisitionJSON);
            data.requesterName = 'ผู้ดูแลระบบ';
            await pool.request()
                .input('json', sql.NVarChar, JSON.stringify(data))
                .query("UPDATE Production_Tasks SET RequisitionJSON = @json WHERE TaskID = 'PT-20260820-002'");
            console.log('Fixed PT-20260820-002 requester name in DB!');
        }
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
fix();

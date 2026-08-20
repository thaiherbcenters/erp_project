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
        const st = JSON.stringify({"pending":"2026-08-20 08:00","prepare":"2026-08-20 14:37"});
        await pool.request().query(\`UPDATE Production_Tasks SET StepTimesJSON = '\${st}' WHERE TaskID = 'PT-20260820-001'\`);
        console.log("Fixed StepTimesJSON.");
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
run();

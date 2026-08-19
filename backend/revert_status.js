require('dotenv').config();
const sql = require('mssql');

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        trustServerCertificate: true,
        encrypt: true
    }
};

async function run() {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`UPDATE Packaging_Tasks SET Status = N'รอบรรจุ' WHERE TaskID = 'PKG-20260817-001'`);
        console.log('Rows affected:', result.rowsAffected);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();

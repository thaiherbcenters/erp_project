import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function checkTypes() {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query('SELECT * FROM CustomerType');
        console.table(result.recordset);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTypes();

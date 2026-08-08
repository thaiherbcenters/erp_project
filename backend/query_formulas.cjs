const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true
    }
};

async function query() {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .query("SELECT * FROM RnD_Formulas WHERE formulaId IN ('FM-012', 'FM-011')");
        console.log(JSON.stringify(result.recordset, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        sql.close();
    }
}
query();

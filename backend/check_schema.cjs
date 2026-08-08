const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        let pool = await sql.connect(config);
        
        let result = await pool.request()
            .query(`
                SELECT COLUMN_NAME, DATA_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'RnD_Formula_Ingredients'
            `);
        
        console.log("RnD_Formula_Ingredients Columns:\n", JSON.stringify(result.recordset, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        sql.close();
    }
}
run();

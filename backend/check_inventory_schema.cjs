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
        
        let tables = ['Stock_Items', 'Warehouse', 'InventoryTransaction', 'Products', 'ProductCategory'];
        for (let table of tables) {
            let result = await pool.request()
                .query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}'`);
            console.log(`\n--- ${table} ---`);
            console.log(result.recordset.map(r => `${r.COLUMN_NAME} (${r.DATA_TYPE})`).join(', '));
        }

    } catch (err) {
        console.error(err);
    } finally {
        sql.close();
    }
}
run();

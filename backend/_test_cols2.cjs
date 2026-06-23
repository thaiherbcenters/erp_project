const sql = require('mssql');
require('dotenv').config();
const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: { trustServerCertificate: true, encrypt: true }
};
sql.connect(config).then(pool => {
    return pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'QuotationItem'")
        .then(res => {
            console.log("Columns:", res.recordset.map(r => r.COLUMN_NAME));
        });
}).catch(console.error).finally(() => process.exit());

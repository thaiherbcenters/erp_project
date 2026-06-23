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
    return pool.request().query("SELECT QuotationID, QuotationNo, ContractID, CreatedAt FROM Quotation ORDER BY CreatedAt DESC OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY")
        .then(res => {
            console.log("Recent Quotations:", res.recordset);
        });
}).catch(console.error).finally(() => process.exit());

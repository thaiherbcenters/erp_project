const sql = require('mssql');
require('dotenv').config({path: './.env'});
sql.connect({
    server: process.env.DB_SERVER, 
    database: process.env.DB_NAME, 
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    options: {trustServerCertificate: true}
}).then(pool => {
    pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
    .then(r => {
        console.log(r.recordset.map(t => t.TABLE_NAME));
        process.exit(0);
    }).catch(console.error);
}).catch(console.error);

const sql = require('mssql');
require('dotenv').config({path:'backend/.env'});
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    options: { encrypt: true, trustServerCertificate: true }
};
sql.connect(config).then(pool => 
    pool.request().query("SELECT TaskID, CurrentStep, Status FROM Production_Tasks WHERE TaskID = 'B260820-FM014-03'")
    .then(res => { console.log(res.recordset); process.exit(0); })
);

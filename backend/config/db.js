const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        trustServerCertificate: true, // Keep true if using self-signed cert on local network 10.0.0.x
        encrypt: true, // Security fix: encrypt traffic to true
        useUTC: false, // Fix timezone issue (+7 hrs double offset)
    },
    connectionTimeout: 10000,
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('✅ Connected to SQL Server successfully (Backend API)');
        return pool;
    })
    .catch(err => {
        console.error('❌ Database Connection Failed! Bad Config: ', err);
        throw err;
    });

module.exports = {
    sql, poolPromise
};

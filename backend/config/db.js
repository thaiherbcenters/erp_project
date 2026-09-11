const path = require('path');
const sql = require('mssql');

// โหลด backend/.env โดยตรงและ override ค่าแคชเก่าใน PM2 (เช่น 127.0.0.1)
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
require('dotenv').config();

const rawServer = process.env.DB_SERVER;
// ป้องกันกรณี PM2 มีแคช 127.0.0.1 หรือ localhost ค้างอยู่ ทำให้ต่อ SQL Server วงแลน 10.0.0.10 ไม่ติด
const dbServer = (!rawServer || rawServer === '127.0.0.1' || rawServer === 'localhost')
    ? '10.0.0.10'
    : rawServer;

const config = {
    server: dbServer,
    database: process.env.DB_NAME || 'ERP_THAIHERB',
    user: process.env.DB_USER || 'THAIHERB',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        trustServerCertificate: true, // Keep true if using self-signed cert on local network 10.0.0.x
        encrypt: false, // Fix: Reverted to false to prevent 500 error on production server
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

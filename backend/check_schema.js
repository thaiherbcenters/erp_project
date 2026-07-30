const sql = require('mssql');
const db = require('./config/db');
db.poolPromise.then(pool => {
    pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Receipt'").then(res => {
        console.log(res.recordset.map(r => r.COLUMN_NAME).join(', '));
        process.exit(0);
    });
}).catch(err => {
    console.error(err);
    process.exit(1);
});

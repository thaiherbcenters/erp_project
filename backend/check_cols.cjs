const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LegalDocuments' AND COLUMN_NAME LIKE 'Scope%'")
    .then(res => {
        console.log(res.recordset);
        process.exit(0);
    })
    .catch(console.error);
});

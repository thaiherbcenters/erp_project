const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LegalDocuments'")
    .then(res => {
        console.log(res.recordset.map(r => r.COLUMN_NAME).join(', '));
        process.exit(0);
    });
});

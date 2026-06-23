const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LegalDocuments' AND COLUMN_NAME LIKE 'ReqType%'")
    .then(res => {
        console.log("ReqType:", res.recordset);
        return pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LegalDocuments' AND COLUMN_NAME LIKE 'SubmitFormType%'");
    })
    .then(res => {
        console.log("SubmitFormType:", res.recordset);
        process.exit(0);
    })
    .catch(console.error);
});

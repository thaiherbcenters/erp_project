const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LegalDocuments' AND COLUMN_NAME IN ('SubmitterIsIn', 'SubmitterIsOr', 'HasRegNo', 'RegNo', 'HasRegDetail', 'RegDetailNo', 'HasNoticeNo', 'RegNoticeNo', 'ProductNameAlt')")
    .then(res => {
        console.log("Missing columns check:", res.recordset);
        process.exit(0);
    })
    .catch(console.error);
});

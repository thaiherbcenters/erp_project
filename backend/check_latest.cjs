const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    pool.request().query("SELECT TOP 1 * FROM LegalDocuments ORDER BY DocumentId DESC")
    .then(res => {
        console.log(res.recordset);
        process.exit(0);
    })
    .catch(console.error);
});

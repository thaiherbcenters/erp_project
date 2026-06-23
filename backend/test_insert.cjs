const { poolPromise } = require('./config/db');
const sql = require('mssql');
poolPromise.then(pool => {
    pool.request()
    .input('DocumentType', sql.NVarChar, 'poa')
    .query(`
        INSERT INTO LegalDocuments (
            DocumentType, ScopeOther
        ) OUTPUT INSERTED.DocumentID
        VALUES (
            @DocumentType, 'test'
        )
    `)
    .then(res => {
        console.log("Success:", res);
        process.exit(0);
    })
    .catch(err => {
        console.error("SQL Error:", err.message);
        process.exit(1);
    });
});

const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    pool.request().query(`
        ALTER TABLE LegalDocuments ADD ScopeStartDay NVARCHAR(20);
        ALTER TABLE LegalDocuments ADD ScopeStartMonth NVARCHAR(50);
        ALTER TABLE LegalDocuments ADD ScopeStartYear NVARCHAR(20);
    `)
    .then(() => {
        console.log('Columns added successfully');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
});

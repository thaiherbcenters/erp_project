const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    pool.request().query("ALTER TABLE LegalDocuments ADD LicenseNo NVARCHAR(255)")
    .then(() => {
        console.log('Column added');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
});

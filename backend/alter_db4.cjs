const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    pool.request().query(`
        ALTER TABLE LegalDocuments ADD GrantorCitizenIDExpiryDate DATE;
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

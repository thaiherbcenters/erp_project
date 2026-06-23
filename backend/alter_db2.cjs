const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    pool.request().query(`
        ALTER TABLE LegalDocuments ADD JuristicIDExpiryDate DATE;
        ALTER TABLE LegalDocuments ADD GrantorSignName NVARCHAR(255);
        ALTER TABLE LegalDocuments ADD GranteeSignName NVARCHAR(255);
        ALTER TABLE LegalDocuments ADD Witness1Name NVARCHAR(255);
        ALTER TABLE LegalDocuments ADD Witness2Name NVARCHAR(255);
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

const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    pool.request().query(`
        ALTER TABLE LegalDocuments ADD IsNaturalPerson BIT;
        ALTER TABLE LegalDocuments ADD IsJuristicPerson BIT;
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

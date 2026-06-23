const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    pool.request().query(`
        ALTER TABLE LegalDocuments ADD ProdTypeHerbalMedicine BIT;
    `)
    .then(() => {
        console.log('Column ProdTypeHerbalMedicine added successfully');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
});

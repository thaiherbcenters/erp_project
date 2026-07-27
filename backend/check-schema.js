const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    const q = "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RnD_RawMaterials' OR TABLE_NAME = 'Stock_Items'";
    pool.request().query(q)
        .then(res => {
            console.log(res.recordset);
            process.exit(0);
        })
        .catch(err => console.error(err));
});

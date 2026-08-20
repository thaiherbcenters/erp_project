require('dotenv').config();
const { sql, poolPromise } = require('./config/db');

poolPromise.then(pool => {
    return pool.request().query("SELECT Name FROM RnD_Formulas");
}).then(res => {
    console.log(res.recordset);
    process.exit(0);
}).catch(console.error);

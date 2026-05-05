const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().query("SELECT definition FROM sys.computed_columns WHERE object_id = OBJECT_ID('Customer') AND name = 'CustomerCode'");
        console.log(r.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();

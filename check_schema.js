const { poolPromise } = require('./backend/config/db'); 
async function run() { 
    const pool = await poolPromise; 
    const r = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Shipping_Orders'"); 
    console.log(r.recordset); 
    process.exit(); 
} 
run();

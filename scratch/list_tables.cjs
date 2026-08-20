require('dotenv').config({path:'backend/.env'}); 
require('./backend/config/db').poolPromise.then(async pool => { 
    const r = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'"); 
    console.log(r.recordset.map(t=>t.TABLE_NAME)); 
    process.exit(); 
});

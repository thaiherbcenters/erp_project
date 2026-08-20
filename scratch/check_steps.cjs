require('dotenv').config({path:'backend/.env'}); 
require('./backend/config/db').poolPromise.then(async pool => { 
    const r = await pool.request().query("SELECT TaskID, StepTimesJSON FROM Production_Tasks WHERE TaskID='PT-20260820-002'"); 
    console.log(r.recordset); 
    process.exit(); 
});

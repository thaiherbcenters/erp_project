require('dotenv').config({path:'backend/.env'}); 
const { poolPromise, sql } = require('../backend/config/db');

poolPromise.then(async pool => { 
    try {
        await pool.request().query("UPDATE Sequences SET LastNumber = 1 WHERE Prefix = 'PKG-20260820-'"); 
        console.log('Fixed sequence PKG-20260820- to 1'); 
    } catch(err) {
        console.error(err);
    }
    process.exit(); 
});

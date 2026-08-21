require('dotenv').config({path: 'backend/.env'}); 
const { poolPromise } = require('./backend/config/db'); 
async function run() { 
    const pool = await poolPromise; 
    const res = await pool.request().query("SELECT PlannerID, Notes FROM Planner"); 
    console.log(res.recordset); 
    process.exit(0); 
} 
run();

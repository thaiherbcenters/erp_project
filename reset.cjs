require('dotenv').config({path: './backend/.env'});
const { poolPromise } = require('./backend/config/db.js');
async function run() {
    const pool = await poolPromise;
    await pool.request().query("UPDATE Shipping_Orders SET Status = N'รอเบิกวัสดุแพ็ฃ', RequisitionJSON = NULL WHERE ShipmentID='SHP-20260821-001'");
    console.log('Reset complete');
    process.exit(0);
}
run();
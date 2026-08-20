const sql = require('mssql');
const { config } = require('../backend/db');

async function fixJobOrder() {
    try {
        let pool = await sql.connect(config);
        
        // Update to correct productName
        await pool.request()
            .query("UPDATE Planner SET ProductName = 'ยาน้ำมันสมุนไพร สูตรร้อน' WHERE PlannerID = 'JO-20260820-001'");

        // Also update Production Tasks
        await pool.request()
            .query("UPDATE Production_Tasks SET ProductName = 'ยาน้ำมันสมุนไพร สูตรร้อน' WHERE JobOrderID = 'JO-20260820-001'");
        
        console.log("Successfully updated JO-20260820-001");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fixJobOrder();

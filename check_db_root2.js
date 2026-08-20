import sql from 'mssql';
import { config } from './backend/db.js';

async function check() {
    try {
        let pool = await sql.connect(config);
        
        await pool.request().query("UPDATE Planner SET ProductName = 'ยาน้ำมันสมุนไพร สูตรร้อน' WHERE PlannerID = 'JO-20260820-001'");
        await pool.request().query("UPDATE Production_Tasks SET ProductName = 'ยาน้ำมันสมุนไพร สูตรร้อน' WHERE JobOrderID = 'JO-20260820-001'");

        let res = await pool.request().query("SELECT PlannerID, FormulaName, ProductName FROM Planner WHERE PlannerID = 'JO-20260820-001'");
        console.log(res.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
check();

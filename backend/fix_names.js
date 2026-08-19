const { poolPromise, sql } = require('./config/db'); 

async function fixNames() { 
    try { 
        const pool = await poolPromise; 
        const res = await pool.request().query("SELECT PlannerID, Notes FROM Planner WHERE Notes LIKE '%สินค้า:%'");
        
        for (let row of res.recordset) {
            const match = row.Notes.match(/สินค้า:\s*(.+?)(?:\s*\||$)/);
            if (match) {
                const productName = match[1].trim();
                console.log(`Updating ${row.PlannerID} to ProductName = ${productName}`);
                
                // Update Planner
                await pool.request()
                    .input('id', sql.VarChar, row.PlannerID)
                    .input('name', sql.NVarChar, productName)
                    .query("UPDATE Planner SET ProductName = @name WHERE PlannerID = @id");
                    
                // Update Production_Tasks
                await pool.request()
                    .input('id', sql.VarChar, row.PlannerID)
                    .input('name', sql.NVarChar, productName)
                    .query("UPDATE Production_Tasks SET ProductName = @name WHERE JobOrderID = @id");
                    
                // Update Packaging_Tasks
                await pool.request()
                    .input('id', sql.VarChar, row.PlannerID)
                    .input('name', sql.NVarChar, productName)
                    .query("UPDATE Packaging_Tasks SET Product = @name WHERE JobOrderID = @id");
                    
                // What about Stock_Items? 
                // STK-20260819-001 is "ยาสเปรย์ สูตรร้อน (พี่มัม)" -> "ยาน้ำมันสมุนไพร สูตรร้อน"
                // But it has [Lot: ...] attached if it's not generic MTS? Wait, MTS generic is just the ProductName.
                // In qc.js, MTS generic inserts Stock_Items with ProductName exactly.
            }
        }
        
        // Fix Stock_Items directly for the one created in the screenshot
        await pool.request()
            .input('wrongName', sql.NVarChar, 'ยาสเปรย์ สูตรร้อน (พี่มัม)')
            .input('rightName', sql.NVarChar, 'ยาน้ำมันสมุนไพร สูตรร้อน')
            .query("UPDATE Stock_Items SET ProductName = @rightName WHERE ProductName = @wrongName AND ItemID LIKE 'STK-%'");
            
        // Fix WIP items
        await pool.request()
            .input('wrongName', sql.NVarChar, 'ยาสเปรย์ สูตรร้อน (พี่มัม) (WIP)')
            .input('rightName', sql.NVarChar, 'ยาน้ำมันสมุนไพร สูตรร้อน (WIP)')
            .query("UPDATE Stock_Items SET ProductName = @rightName WHERE ProductName = @wrongName AND Category = N'สินค้ากึ่งสำเร็จรูป'");
            
        // Fix logs
        await pool.request()
            .input('wrongName', sql.NVarChar, 'ยาสเปรย์ สูตรร้อน (พี่มัม)%')
            .input('replaceName', sql.NVarChar, 'ยาน้ำมันสมุนไพร สูตรร้อน')
            .query("UPDATE Stock_Logs SET ProductName = REPLACE(ProductName, N'ยาสเปรย์ สูตรร้อน (พี่มัม)', @replaceName) WHERE ProductName LIKE @wrongName");

        console.log("Names fixed successfully!");
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
fixNames();

const { poolPromise, sql } = require('./config/db'); 
async function fixDuplicates() { 
    try { 
        const pool = await poolPromise; 
        const res = await pool.request().query("SELECT ItemID, Quantity FROM Stock_Items WHERE ProductName = N'ยาน้ำมันสมุนไพร สูตรร้อน' AND Category='สินค้าสำเร็จรูป' ORDER BY ItemID");
        const records = res.recordset;
        if (records.length > 1) {
            console.log("Found duplicates:", records);
            const primaryId = records[0].ItemID;
            const totalQty = records.reduce((sum, r) => sum + (r.Quantity || 0), 0);
            
            await pool.request()
                .input('id', sql.VarChar, primaryId)
                .input('qty', sql.Int, totalQty)
                .query("UPDATE Stock_Items SET Quantity = @qty WHERE ItemID = @id");
                
            const idsToDelete = records.slice(1).map(r => r.ItemID);
            for (let id of idsToDelete) {
                await pool.request().input('oldId', sql.VarChar, id).input('newId', sql.VarChar, primaryId).query("UPDATE Stock_Logs SET ItemID = @newId WHERE ItemID = @oldId");
                await pool.request().input('id', sql.VarChar, id).query("DELETE FROM Stock_Items WHERE ItemID = @id");
            }
            console.log("Consolidated into", primaryId);
        } else {
            console.log("No duplicates found for FG.");
        }
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
fixDuplicates();

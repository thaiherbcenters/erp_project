const { poolPromise, sql } = require('./config/db'); 
async function fixDuplicateWip() { 
    try { 
        const pool = await poolPromise; 
        const productName = 'ยาสเปรย์ สูตรร้อน (พี่มัม) (WIP)';
        
        // Find all duplicates
        const res = await pool.request()
            .input('ProductName', sql.NVarChar, productName)
            .query("SELECT ItemID, Quantity FROM Stock_Items WHERE ProductName = @ProductName AND Category = 'สินค้ากึ่งสำเร็จรูป' ORDER BY ItemID");
            
        const records = res.recordset;
        if (records.length <= 1) {
            console.log("No duplicates found to consolidate.");
            process.exit(0);
        }
        
        console.log("Found duplicates:", records);
        
        // Sum up the quantities
        const totalQty = records.reduce((sum, r) => sum + (r.Quantity || 0), 0);
        const primaryId = records[0].ItemID;
        
        console.log(`Consolidating into ${primaryId} with total qty: ${totalQty}`);
        
        // Update the primary record
        await pool.request()
            .input('ItemID', sql.VarChar, primaryId)
            .input('Quantity', sql.Float, totalQty)
            .query("UPDATE Stock_Items SET Quantity = @Quantity WHERE ItemID = @ItemID");
            
        // Get the IDs to delete
        const idsToDelete = records.slice(1).map(r => r.ItemID);
        
        console.log("Deleting IDs:", idsToDelete);
        
        // Update Stock_Logs to point to primary ID
        for (let id of idsToDelete) {
             await pool.request()
                .input('OldID', sql.VarChar, id)
                .input('NewID', sql.VarChar, primaryId)
                .query("UPDATE Stock_Logs SET ItemID = @NewID WHERE ItemID = @OldID");
        }
        
        // Delete the duplicate records
        for (let id of idsToDelete) {
            await pool.request()
                .input('ItemID', sql.VarChar, id)
                .query("DELETE FROM Stock_Items WHERE ItemID = @ItemID");
        }
        
        console.log("Consolidation successful.");
    } catch(e) { 
        console.error("Error:", e); 
    } 
    process.exit(0); 
} 
fixDuplicateWip();

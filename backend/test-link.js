require('dotenv').config();
const { poolPromise, sql } = require('./config/db');

async function run() {
    const pool = await poolPromise;

    console.log('--- Linking Formula Ingredients to Stock Items ---');

    // Fetch all ingredients that don't have a MaterialID
    const ingRes = await pool.request().query("SELECT ID, MaterialName, FormulaID FROM RnD_Formula_Ingredients WHERE MaterialID IS NULL OR MaterialID = ''");
    
    let updatedCount = 0;

    for (const ing of ingRes.recordset) {
        // Clean up the HTML tags from MaterialName to search in Stock_Items
        let cleanName = ing.MaterialName.replace(/<[^>]*>?/gm, '').trim();
        
        // Handle specific complex names like the Plai Oil one
        if (cleanName.includes('น้ำมันไพล')) cleanName = 'ไพร (Plai)'; // Close enough for our dummy data or we map to something else. Actually, let's map it based on keywords.
        else if (cleanName.includes('ระกำ')) cleanName = 'น้ำมันระกำ';
        else if (cleanName.includes('เมนทอล')) cleanName = 'เมนทอล';
        else if (cleanName.includes('พิมเสน')) cleanName = 'พิมเสน';
        else if (cleanName.includes('ยูคา')) cleanName = 'ยูคา';
        else if (cleanName.includes('เอทิล')) cleanName = 'เอทิล แอลกอฮอล์';
        else if (cleanName.includes('ไพร')) cleanName = 'ไพร';
        else if (cleanName.includes('กัญชา')) cleanName = 'น้ำมันกัญชา';
        else if (cleanName.includes('สีเหลือง')) cleanName = 'สีเหลือง';
        else if (cleanName.includes('สะระแหน่')) cleanName = 'น้ำมันสะระแหน่'; // Or เกล็ดสะระแหน่ depending on the exact string
        
        // Try to find a matching Stock_Item
        const stockRes = await pool.request()
            .input('SearchTerm', sql.NVarChar, `%${cleanName}%`)
            .query("SELECT ItemID, ProductName FROM Stock_Items WHERE ProductName LIKE @SearchTerm AND Category = 'วัตถุดิบ'");

        if (stockRes.recordset.length > 0) {
            const matchedItemId = stockRes.recordset[0].ItemID;
            
            // Update the ingredient
            await pool.request()
                .input('ID', sql.Int, ing.ID)
                .input('MaterialID', sql.VarChar, matchedItemId)
                .query("UPDATE RnD_Formula_Ingredients SET MaterialID = @MaterialID WHERE ID = @ID");
                
            console.log(`Linked [Formula ${ing.FormulaID}] ${cleanName} -> ${matchedItemId} (${stockRes.recordset[0].ProductName})`);
            updatedCount++;
        } else {
             console.log(`⚠️ Could not find match for: ${cleanName} (Original: ${ing.MaterialName})`);
        }
    }

    console.log(`\nFinished linking. Updated ${updatedCount} ingredients.`);
    process.exit(0);
}
run();

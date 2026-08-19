require('dotenv').config();
const { poolPromise } = require('./config/db.js');

async function migrate() {
    try {
        const pool = await poolPromise;
        
        // 1. Add Column if not exists
        console.log("Checking if ProductNameEN column exists...");
        const checkColResult = await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Stock_Items]') AND name = 'ProductNameEN')
            BEGIN
                ALTER TABLE [dbo].[Stock_Items] ADD ProductNameEN NVARCHAR(255) NULL
                SELECT 'ADDED' as status
            END
            ELSE
            BEGIN
                SELECT 'EXISTS' as status
            END
        `);
        console.log("Column status:", checkColResult.recordset[0].status);

        // 2. Fetch items to migrate
        const items = await pool.request().query("SELECT ItemID, ProductName FROM Stock_Items WHERE ProductName LIKE '%(%)%'");
        console.log(`Found ${items.recordset.length} items to migrate.`);

        // 3. Migrate each item
        for (const item of items.recordset) {
            const name = item.ProductName;
            // Match pattern: "ThaiName (EnglishName)"
            const match = name.match(/^(.*?)\s*\((.*?)\)$/);
            if (match) {
                const thaiName = match[1].trim();
                const engName = match[2].trim();
                
                await pool.request()
                    .input('ThaiName', thaiName)
                    .input('EngName', engName)
                    .input('ItemID', item.ItemID)
                    .query(`
                        UPDATE Stock_Items 
                        SET ProductName = @ThaiName, ProductNameEN = @EngName 
                        WHERE ItemID = @ItemID
                    `);
                console.log(`Migrated: ${item.ItemID} -> Thai: "${thaiName}", Eng: "${engName}"`);
            }
        }
        
        console.log("Migration completed successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}

migrate();

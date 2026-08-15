const { poolPromise, sql } = require('./config/db');

async function addWip() {
    try {
        const pool = await poolPromise;
        const item = { id: 'WIP-001', name: 'น้ำยาหม่องกึ่งสำเร็จรูป', category: 'สินค้ากึ่งสำเร็จรูป', qty: 50000, unit: 'กรัม', min: 10000 };
        
        const check = await pool.request().input('id', sql.VarChar, item.id).query('SELECT * FROM Stock_Items WHERE ItemID = @id');
        if (check.recordset.length === 0) {
            await pool.request()
                .input('ItemID', sql.VarChar, item.id)
                .input('ProductName', sql.NVarChar, item.name)
                .input('Category', sql.NVarChar, item.category)
                .input('Quantity', sql.Int, item.qty)
                .input('Unit', sql.NVarChar, item.unit)
                .input('MinStock', sql.Int, item.min)
                .query(`
                    INSERT INTO Stock_Items (ItemID, ProductName, Category, Quantity, Unit, MinStock, CreatedAt, UpdatedAt)
                    VALUES (@ItemID, @ProductName, @Category, @Quantity, @Unit, @MinStock, GETDATE(), GETDATE())
                `);
            console.log("Added WIP item!");
        } else {
            console.log("WIP item already exists.");
        }
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
addWip();

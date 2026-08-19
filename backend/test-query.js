require('dotenv').config();
const { poolPromise, sql } = require('./config/db');

async function run() {
    const pool = await poolPromise;

    // วัตถุดิบที่ต้องเพิ่มใหม่ (ยังไม่มีในสต็อก)
    const newItems = [
        { id: 'RM-007', name: 'น้ำมันระกำ (Chaulmoogra Oil)', category: 'วัตถุดิบ', qty: 100, unit: 'กิโลกรัม' },
        { id: 'RM-008', name: 'เอทิล แอลกอฮอล์ (Ethyl Alcohol)', category: 'วัตถุดิบ', qty: 100, unit: 'กิโลกรัม' },
        { id: 'RM-009', name: 'ไพร (Plai)', category: 'วัตถุดิบ', qty: 100, unit: 'กิโลกรัม' },
        { id: 'RM-010', name: 'น้ำมันกัญชา (Cannabis Oil)', category: 'วัตถุดิบ', qty: 100, unit: 'กิโลกรัม' },
        { id: 'RM-011', name: 'สีเหลือง (Yellow Dye)', category: 'วัตถุดิบ', qty: 100, unit: 'กิโลกรัม' },
        { id: 'RM-012', name: 'น้ำมันสะระแหน่ (Peppermint Oil)', category: 'วัตถุดิบ', qty: 100, unit: 'กิโลกรัม' },
        { id: 'RM-013', name: 'น้ำมันมะพร้าว (Coconut Oil)', category: 'วัตถุดิบ', qty: 100, unit: 'กิโลกรัม' },
        { id: 'RM-014', name: 'ดอกกานพลู (Clove)', category: 'วัตถุดิบ', qty: 100, unit: 'กิโลกรัม' },
        { id: 'RM-015', name: 'ยูคา (Eucalyptus)', category: 'วัตถุดิบ', qty: 100, unit: 'กิโลกรัม' },
        { id: 'RM-016', name: 'เมนทอล (Menthol Crystal)', category: 'วัตถุดิบ', qty: 100, unit: 'กิโลกรัม' },
    ];

    for (const item of newItems) {
        // Check if already exists
        const check = await pool.request()
            .input('ItemID', sql.VarChar, item.id)
            .query('SELECT ItemID FROM Stock_Items WHERE ItemID = @ItemID');
        
        if (check.recordset.length > 0) {
            console.log(`⏭️  ${item.id} already exists, skipping`);
            continue;
        }

        await pool.request()
            .input('ItemID', sql.VarChar, item.id)
            .input('ProductName', sql.NVarChar, item.name)
            .input('Category', sql.NVarChar, item.category)
            .input('Quantity', sql.Int, item.qty)
            .input('Unit', sql.NVarChar, item.unit)
            .query(`
                INSERT INTO Stock_Items (ItemID, ProductName, Category, Quantity, Unit)
                VALUES (@ItemID, @ProductName, @Category, @Quantity, @Unit)
            `);
        console.log(`✅ Added ${item.id}: ${item.name} (${item.qty} ${item.unit})`);
    }

    // Verify
    const allRM = await pool.request().query("SELECT ItemID, ProductName, Quantity, Unit FROM Stock_Items WHERE Category = 'วัตถุดิบ' ORDER BY ItemID");
    console.log('\n=== All RM Stock After Insert ===');
    for (const s of allRM.recordset) {
        console.log(`  ${s.ItemID}: ${s.ProductName} | ${s.Quantity} ${s.Unit}`);
    }

    process.exit(0);
}
run();

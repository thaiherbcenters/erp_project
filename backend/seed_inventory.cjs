const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const mockItems = [
    // สินค้าสำเร็จรูป (FG)
    { id: 'FG-001', name: 'ยาดมสมุนไพร จัมโบ้', category: 'สินค้าสำเร็จรูป', qty: 1500, unit: 'ชิ้น', min: 500 },
    { id: 'FG-002', name: 'ยาดมสมุนไพร ตรา เอส ที เฮิร์บ แชมพ์', category: 'สินค้าสำเร็จรูป', qty: 2000, unit: 'ชิ้น', min: 1000 },
    { id: 'FG-003', name: 'ยาหม่องสมุนไพร 50g', category: 'สินค้าสำเร็จรูป', qty: 850, unit: 'ชิ้น', min: 300 },
    { id: 'FG-004', name: 'ยาหม่องน้ำ 10ml', category: 'สินค้าสำเร็จรูป', qty: 3200, unit: 'ชิ้น', min: 1000 },

    // วัตถุดิบ (RM)
    { id: 'RM-001', name: 'ขมิ้นชัน (Turmeric)', category: 'วัตถุดิบ', qty: 150, unit: 'กิโลกรัม', min: 20 },
    { id: 'RM-002', name: 'พิมเสน (Borneol)', category: 'วัตถุดิบ', qty: 20, unit: 'กิโลกรัม', min: 5 },
    { id: 'RM-003', name: 'การบูร (Camphor)', category: 'วัตถุดิบ', qty: 25, unit: 'กิโลกรัม', min: 5 },
    { id: 'RM-004', name: 'เกล็ดสะระแหน่ (Menthol)', category: 'วัตถุดิบ', qty: 30, unit: 'กิโลกรัม', min: 10 },
    { id: 'RM-005', name: 'น้ำมันยูคาลิปตัส (Eucalyptus Oil)', category: 'วัตถุดิบ', qty: 50, unit: 'ลิตร', min: 15 },
    { id: 'RM-006', name: 'ปิโตรเลียมเจลลี่ (Petroleum Jelly)', category: 'วัตถุดิบ', qty: 100, unit: 'กิโลกรัม', min: 30 },

    // บรรจุภัณฑ์ (PM)
    { id: 'PM-001', name: 'ขวดแก้วยาดมจัมโบ้', category: 'บรรจุภัณฑ์', qty: 5000, unit: 'ชิ้น', min: 1000 },
    { id: 'PM-002', name: 'ฝาพลาสติกยาดม สีเขียว', category: 'บรรจุภัณฑ์', qty: 5000, unit: 'ชิ้น', min: 1000 },
    { id: 'PM-003', name: 'ขวดแก้วยาหม่อง 50g', category: 'บรรจุภัณฑ์', qty: 1200, unit: 'ชิ้น', min: 500 },
    { id: 'PM-004', name: 'ฝาเกลียวยาหม่อง สีทอง', category: 'บรรจุภัณฑ์', qty: 1500, unit: 'ชิ้น', min: 500 },
    { id: 'PM-005', name: 'ฉลากสติ๊กเกอร์ ยาดมจัมโบ้', category: 'บรรจุภัณฑ์', qty: 12000, unit: 'ดวง', min: 2000 },
    { id: 'PM-006', name: 'ลังกระดาษลูกฟูก ขนาด M', category: 'บรรจุภัณฑ์', qty: 850, unit: 'ใบ', min: 200 },

    // วัสดุสิ้นเปลือง
    { id: 'SP-001', name: 'ถุงมือยางไนไตร (Size M)', category: 'วัสดุสิ้นเปลือง', qty: 120, unit: 'กล่อง', min: 20 },
    { id: 'SP-002', name: 'หมวกคลุมผม (Hairnet)', category: 'วัสดุสิ้นเปลือง', qty: 50, unit: 'แพ็ค', min: 10 },
    { id: 'SP-003', name: 'แอลกอฮอล์ 70% ทำความสะอาด', category: 'วัสดุสิ้นเปลือง', qty: 25, unit: 'แกลลอน', min: 5 }
];

async function run() {
    try {
        let pool = await sql.connect(config);
        
        // Check what exists
        const existing = await pool.request().query('SELECT ItemID FROM Stock_Items');
        const existingIds = existing.recordset.map(r => r.ItemID);

        let insertedCount = 0;
        for (let item of mockItems) {
            if (!existingIds.includes(item.id)) {
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
                insertedCount++;
                console.log(`Inserted: ${item.id} - ${item.name}`);
            } else {
                console.log(`Skipped (already exists): ${item.id}`);
            }
        }
        
        console.log(`\nFinished inserting ${insertedCount} mock items.`);

    } catch (err) {
        console.error(err);
    } finally {
        sql.close();
    }
}
run();

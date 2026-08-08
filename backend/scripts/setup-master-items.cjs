const requireDotEnv = require('dotenv');
requireDotEnv.config({ path: '../.env' }); // Assuming standard path if run from scripts dir
const { sql } = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const products = [
    { name: 'ยาดมสมุนไพร', price: 79, promo: { newQty: 40, newPrice: 25, oldQty: 50, oldPrice: 20 } },
    { name: 'ยาดมสมุนไพร จัมโบ้', price: 490, promo: { newQty: 5, newPrice: 200 } },
    { name: 'ยาหม่อง', price: 59, promo: { newQty: 35, newPrice: 28.57, oldQty: 40, oldPrice: 25 } },
    { name: 'ยาน้ำมัน ขนาด 10 มล.', price: 129, promo: { newQty: 20, newPrice: 50, oldQty: 17, oldPrice: 59 } },
    { name: 'ยาน้ำมัน ขนาด 5 มล.', price: 69, promo: { newQty: 25, newPrice: 40 } },
    { name: 'ยาน้ำมันสมุนไพร สูตรเย็น', price: 199, promo: { newQty: 14, newPrice: 71 } },
    { name: 'ยาน้ำมันสมุนไพร สูตรร้อน', price: 199, promo: { newQty: 14, newPrice: 71 } },
    { name: 'ยาสเปรย์ผสมกระดูกไก่ดำ', price: 199, promo: { newQty: 14, newPrice: 71 } },
    { name: 'แคปซูลขมิ้นชัน', price: 129 },
    { name: 'แคปซูลฟ้าทะลายโจร', price: 159 },
    { name: 'แคปซูลขิง', price: 129 },
    { name: 'แคปซูลมะขามแขก', price: 129 },
    { name: 'แคปซูลรางจืด', price: 129 },
    { name: 'แคปซูลมะระขี้นก', price: 129 },
    { name: 'แคปซูลตรีผลา', price: 129 },
    { name: 'แคปซูลเพชรสังฆาต', price: 129 },
    { name: 'แคปซูลประสะเจตพังคี', price: 129 },
    { name: 'แคปซูลสหัศธารา', price: 129 },
    { name: 'แคปซูลประสะมะแว้ง', price: 129 },
    { name: 'แคปซูลปราบชมพูทวีป', price: 129 },
    { name: 'ลูกประคบ', price: 159 },
    { name: 'ชาอัสสัม กล่อง', price: 0 },
    { name: 'ชาอัสสัม ซอง', price: 95 },
    { name: 'ชากัญชาโสมขาว', price: 95 },
    { name: 'ชากัญชา', price: 95 },
    { name: 'น้ำผึ้ง', price: 0 },
    { name: 'เทียนหอม Aromatic กลิ่น Rose', price: 290 },
    { name: 'เทียนหอม Aromatic กลิ่น Morning', price: 290 },
    { name: 'เทียนหอม Aromatic กลิ่น Thai', price: 290 },
    { name: 'น้ำมันหอมระเหย กลิ่น Rose', price: 490 },
    { name: 'น้ำมันหอมระเหย กลิ่น Morning', price: 490 },
    { name: 'น้ำมันหอมระเหย กลิ่น Thai', price: 490 }
];

async function runSetup() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(dbConfig);
        console.log('Connected to DB successfully.');

        console.log('Creating MasterItems table if not exists...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MasterItems' and xtype='U')
            BEGIN
                CREATE TABLE MasterItems (
                    ItemID INT IDENTITY(1,1) PRIMARY KEY,
                    ItemCode NVARCHAR(50) NOT NULL UNIQUE,   -- e.g. FG-001, RM-001, PK-001, LB-001, CS-001
                    ItemName NVARCHAR(200) NOT NULL,
                    ItemNameEN NVARCHAR(200),
                    ItemType NVARCHAR(50) NOT NULL,           -- 'finished_goods', 'raw_material', 'packaging', 'label', 'consumable'
                    SubCategory NVARCHAR(100),               -- e.g. ยาดม, ยาหม่อง, ครีม, สารสกัด, ขวด, ฉลาก etc.
                    Unit NVARCHAR(50) DEFAULT N'ชิ้น',
                    SellingPrice DECIMAL(12,2) DEFAULT 0,
                    CostPerUnit DECIMAL(12,2) DEFAULT 0,
                    CurrentStock DECIMAL(12,2) DEFAULT 0,
                    MinStock DECIMAL(12,2) DEFAULT 0,
                    NetWeight DECIMAL(12,4),                 -- กรัม per piece (for finished goods, used in production scaling)
                    FormulaID VARCHAR(50),                   -- link to RnD_Formulas (for finished goods)
                    FDA_Number NVARCHAR(100),                -- เลข อย.
                    SupplierID INT,                          -- link to Supplier table
                    IsActive BIT DEFAULT 1,
                    Notes NVARCHAR(500),
                    PromoJSON NVARCHAR(MAX),                 -- JSON for promotional pricing rules
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    UpdatedAt DATETIME DEFAULT GETDATE()
                )
                PRINT 'Table MasterItems created.'
            END
            ELSE
            BEGIN
                PRINT 'Table MasterItems already exists.'
            END
        `);

        console.log('Migrating finished goods...');
        let fgCounter = 1;
        for (const prod of products) {
            const itemCode = \`FG-\${String(fgCounter).padStart(3, '0')}\`;
            let subCat = 'อื่นๆ';
            if (prod.name.startsWith('ยาดม')) subCat = 'ยาดม';
            else if (prod.name.startsWith('ยาหม่อง')) subCat = 'ยาหม่อง';
            else if (prod.name.startsWith('ยาน้ำมัน')) subCat = 'ยาน้ำมัน';
            else if (prod.name.startsWith('ยาสเปรย์')) subCat = 'ยาสเปรย์';
            else if (prod.name.startsWith('แคปซูล')) subCat = 'แคปซูล';
            else if (prod.name.startsWith('ลูกประคบ')) subCat = 'ลูกประคบ';
            else if (prod.name.startsWith('ชา') || prod.name === 'น้ำผึ้ง') subCat = 'ชา/เครื่องดื่ม';
            else if (prod.name.startsWith('เทียนหอม')) subCat = 'เทียนหอม';
            else if (prod.name.startsWith('น้ำมันหอมระเหย')) subCat = 'น้ำมันหอมระเหย';

            const promoJSON = prod.promo ? JSON.stringify(prod.promo) : null;

            await pool.request()
                .input('ItemCode', sql.NVarChar, itemCode)
                .input('ItemName', sql.NVarChar, prod.name)
                .input('ItemType', sql.NVarChar, 'finished_goods')
                .input('SubCategory', sql.NVarChar, subCat)
                .input('Unit', sql.NVarChar, 'ชิ้น')
                .input('SellingPrice', sql.Decimal(12,2), prod.price)
                .input('PromoJSON', sql.NVarChar, promoJSON)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM MasterItems WHERE ItemName = @ItemName)
                    BEGIN
                        INSERT INTO MasterItems (ItemCode, ItemName, ItemType, SubCategory, Unit, SellingPrice, PromoJSON)
                        VALUES (@ItemCode, @ItemName, @ItemType, @SubCategory, @Unit, @SellingPrice, @PromoJSON)
                    END
                `);
            fgCounter++;
        }
        console.log('Finished Goods migrated.');

        console.log('Migrating raw materials from RnD_RawMaterials...');
        try {
            const rmRes = await pool.request().query('SELECT * FROM RnD_RawMaterials');
            for (const rm of rmRes.recordset) {
                await pool.request()
                    .input('ItemCode', sql.NVarChar, rm.MaterialID || \`RM-\${Date.now()}\`)
                    .input('ItemName', sql.NVarChar, rm.NameThai || rm.NameEng || rm.MaterialID)
                    .input('ItemNameEN', sql.NVarChar, rm.NameEng || '')
                    .input('ItemType', sql.NVarChar, 'raw_material')
                    .input('Unit', sql.NVarChar, rm.Unit || 'kg')
                    .query(`
                        IF NOT EXISTS (SELECT 1 FROM MasterItems WHERE ItemCode = @ItemCode OR ItemName = @ItemName)
                        BEGIN
                            INSERT INTO MasterItems (ItemCode, ItemName, ItemNameEN, ItemType, Unit)
                            VALUES (@ItemCode, @ItemName, @ItemNameEN, @ItemType, @Unit)
                        END
                    `);
            }
            console.log('Raw Materials migrated.');
        } catch (rmErr) {
            console.log('Warning: Could not migrate RnD_RawMaterials, maybe the table does not exist yet?', rmErr.message);
        }

        console.log('Setup Master Items completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error during setup:', err);
        process.exit(1);
    }
}

runSetup();

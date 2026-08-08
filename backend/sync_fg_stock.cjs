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

const fgProducts = [
    "ยาดมสมุนไพร", "ยาดมสมุนไพร จัมโบ้", "ยาหม่อง", "ยาน้ำมัน ขนาด 10 มล.", "ยาน้ำมัน ขนาด 5 มล.",
    "ยาน้ำมันสมุนไพร สูตรเย็น", "ยาน้ำมันสมุนไพร สูตรร้อน", "ยาสเปรย์ผสมกระดูกไก่ดำ", "แคปซูลขมิ้นชัน",
    "แคปซูลฟ้าทะลายโจร", "แคปซูลขิง", "แคปซูลมะขามแขก", "แคปซูลรางจืด", "แคปซูลมะระขี้นก",
    "แคปซูลตรีผลา", "แคปซูลเพชรสังฆาต", "แคปซูลประสะเจตพังคี", "แคปซูลสหัศธารา", "แคปซูลประสะมะแว้ง",
    "แคปซูลปราบชมพูทวีป", "ลูกประคบ", "ชาอัสสัม กล่อง", "ชาอัสสัม ซอง", "ชากัญชาโสมขาว", "ชากัญชา",
    "น้ำผึ้ง เล็ก", "น้ำผึ้ง ใหญ่", "เทียนหอม Aromatic กลิ่น Rose", "เทียนหอม Aromatic กลิ่น Morning",
    "เทียนหอม Aromatic กลิ่น Thai", "น้ำมันหอมระเหย กลิ่น Rose", "น้ำมันหอมระเหย กลิ่น Morning",
    "น้ำมันหอมระเหย กลิ่น Thai"
];

async function run() {
    try {
        let pool = await sql.connect(config);
        
        // 1. Delete dependent logs first, then items
        await pool.request().query(`
            DELETE FROM Stock_Logs 
            WHERE ItemPK IN (SELECT ItemPK FROM Stock_Items WHERE Category = N'สินค้าสำเร็จรูป')
               OR ItemID IN (SELECT ItemID FROM Stock_Items WHERE Category = N'สินค้าสำเร็จรูป')
        `);
        await pool.request().query("DELETE FROM Stock_Items WHERE Category = N'สินค้าสำเร็จรูป'");
        console.log("Deleted old 'สินค้าสำเร็จรูป' entries and their logs.");

        // 2. Insert new FG products
        let insertedCount = 0;
        let idCounter = 1;

        for (let name of fgProducts) {
            let itemId = `FG-${String(idCounter).padStart(3, '0')}`;
            // give them a random initial qty between 100 and 2000
            let qty = Math.floor(Math.random() * 1900) + 100;
            
            await pool.request()
                .input('ItemID', sql.VarChar, itemId)
                .input('ProductName', sql.NVarChar, name)
                .input('Category', sql.NVarChar, 'สินค้าสำเร็จรูป')
                .input('Quantity', sql.Int, qty)
                .input('Unit', sql.NVarChar, 'ชิ้น')
                .input('MinStock', sql.Int, 200)
                .query(`
                    INSERT INTO Stock_Items (ItemID, ProductName, Category, Quantity, Unit, MinStock, CreatedAt, UpdatedAt)
                    VALUES (@ItemID, @ProductName, @Category, @Quantity, @Unit, @MinStock, GETDATE(), GETDATE())
                `);
            
            insertedCount++;
            idCounter++;
        }
        
        console.log(`\nFinished inserting ${insertedCount} new FG items matching Quotation dropdown.`);

    } catch (err) {
        console.error(err);
    } finally {
        sql.close();
    }
}
run();

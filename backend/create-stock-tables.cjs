require('dotenv').config();
const { poolPromise, sql } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;

        // 1. สร้างตาราง Stock_Items
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Stock_Items' AND xtype='U')
            CREATE TABLE Stock_Items (
                ItemID VARCHAR(50) PRIMARY KEY,
                FormulaID VARCHAR(50),
                ProductName NVARCHAR(200) NOT NULL,
                Category NVARCHAR(100) DEFAULT N'ผลิตภัณฑ์สำเร็จรูป',
                Quantity INT DEFAULT 0,
                Unit NVARCHAR(50) DEFAULT N'ชิ้น',
                MinStock INT DEFAULT 0,
                CreatedAt DATETIME DEFAULT GETDATE(),
                UpdatedAt DATETIME DEFAULT GETDATE()
            )
        `);
        console.log('✅ Created Stock_Items table');

        // 2. สร้างตาราง Stock_Logs
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Stock_Logs' AND xtype='U')
            CREATE TABLE Stock_Logs (
                LogID INT IDENTITY(1,1) PRIMARY KEY,
                ItemID VARCHAR(50),
                Type VARCHAR(10) NOT NULL,
                Quantity INT NOT NULL,
                RefNo VARCHAR(100),
                RefType VARCHAR(50),
                ProductName NVARCHAR(200),
                Notes NVARCHAR(500),
                CreatedBy VARCHAR(100),
                CreatedAt DATETIME DEFAULT GETDATE()
            )
        `);
        console.log('✅ Created Stock_Logs table');

        console.log('\n🎉 Stock tables created successfully!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
})();

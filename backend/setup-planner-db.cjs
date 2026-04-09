require('dotenv').config();
const { poolPromise, sql } = require('./config/db');

async function createPlannerTable() {
    try {
        const pool = await poolPromise;

        console.log('Creating Planner table...');
        
        // 1. Create Planner table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Planner' AND xtype='U')
            BEGIN
                CREATE TABLE Planner (
                    PlannerID VARCHAR(50) PRIMARY KEY,
                    FormulaID VARCHAR(50),
                    FormulaName NVARCHAR(200),
                    BatchQty INT,
                    BatchSize INT,
                    TotalQty INT,
                    Unit NVARCHAR(50),
                    Status NVARCHAR(50),
                    Priority NVARCHAR(50),
                    PlanDate DATE,
                    DueDate DATE,
                    AssignedLine NVARCHAR(100),
                    Notes NVARCHAR(MAX),
                    CreatedBy VARCHAR(50),
                    CreatedAt DATETIME DEFAULT GETDATE()
                )
                PRINT 'Table Planner created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table Planner already exists.';
            END
        `);

        // 2. Insert mock data
        console.log('Migrating Planner mock data...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM Planner WHERE PlannerID = 'JO-2026-001')
            BEGIN
                INSERT INTO Planner (
                    PlannerID, FormulaID, FormulaName, BatchQty, BatchSize, TotalQty, Unit, 
                    Status, Priority, PlanDate, DueDate, AssignedLine, Notes, CreatedBy
                )
                VALUES 
                ('JO-2026-001', 'FM-001', N'ยาดมสมุนไพร สูตรเย็น', 2, 1000, 2000, N'ชิ้น', N'กำลังผลิต', N'สูง', '2026-04-01', '2026-04-10', 'Line A', N'ออเดอร์เร่งด่วนจาก บจก.สมุนไพรไทย', 'plan1'),
                ('JO-2026-002', 'FM-002', N'ครีมสมุนไพรบำรุงผิว ขมิ้นชัน', 3, 500, 1500, N'กระปุก', N'รอผลิต', N'ปกติ', '2026-04-12', '2026-04-25', 'Line B', N'สต็อกใกล้หมด ต้องผลิตเพิ่ม', 'plan1'),
                ('JO-2026-003', 'FM-003', N'น้ำมันนวดสมุนไพร สูตรร้อน', 1, 800, 800, N'ขวด', N'เสร็จสิ้น', N'ปกติ', '2026-03-15', '2026-03-22', 'Line A', N'เตรียมส่งออก', 'plan2'),
                ('JO-2026-004', 'FM-001', N'ยาดมสมุนไพร สูตรเย็น', 5, 1000, 5000, N'ชิ้น', N'รอผลิต', N'ต่ำ', '2026-05-01', '2026-05-15', 'Line A', N'สต็อกล่วงหน้า', 'plan1'),
                ('JO-2026-005', 'FM-002', N'ครีมสมุนไพรบำรุงผิว ขมิ้นชัน', 2, 500, 1000, N'กระปุก', N'กำลังผลิต', N'ปกติ', '2026-03-25', '2026-04-05', 'Line B', N'', 'plan2');
            END
        `);

        console.log('✅ Planner database setup completed.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error setting up Planner database:', error);
        process.exit(1);
    }
}

createPlannerTable();

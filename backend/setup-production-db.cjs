require('dotenv').config();
const { poolPromise } = require('./config/db');

async function createProductionTables() {
    try {
        const pool = await poolPromise;

        // 1. Production_Tasks
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Production_Tasks' AND xtype='U')
            BEGIN
                CREATE TABLE Production_Tasks (
                    TaskID VARCHAR(50) PRIMARY KEY,
                    JobOrderID VARCHAR(50),
                    FormulaName NVARCHAR(255),
                    ProcessName NVARCHAR(255),
                    BatchNo VARCHAR(50),
                    Line VARCHAR(100),
                    ExpectedQty INT,
                    ProducedQty INT,
                    DefectQty INT,
                    Status NVARCHAR(50), -- 'กำลังทำ', 'เสร็จสิ้น'
                    CurrentStep VARCHAR(50),
                    StepTimesJSON NVARCHAR(MAX),
                    WorkerID VARCHAR(50),
                    StartTime DATETIME NULL,
                    EndTime DATETIME NULL,
                    CreatedAt DATETIME DEFAULT GETDATE()
                )
                PRINT 'Table Production_Tasks created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table Production_Tasks already exists.';
            END
        `);

        // 2. Migrate mock data to Database
        console.log('Inserting initial mock data for production tasks...');
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM Production_Tasks WHERE TaskID = 'PT-001')
            BEGIN
                INSERT INTO Production_Tasks 
                (TaskID, JobOrderID, FormulaName, ProcessName, BatchNo, Line, ExpectedQty, ProducedQty, DefectQty, Status, CurrentStep, StepTimesJSON, WorkerID, StartTime, EndTime)
                VALUES 
                ('PT-001', 'JO-2026-001', N'ยาดมสมุนไพร สูตรเย็น', N'ละลายแว็กซ์ + ผสมสาร', 'B2026-001-1', 'Line A', 1000, 900, 15, N'เสร็จสิ้น', 'stock', '{"production_1":"2026-04-01 08:00","qc_inprocess":"2026-04-01 10:30","production_2":"2026-04-01 11:00","completed":"2026-04-01 14:00","packaging":"2026-04-01 14:30","qc_final":"2026-04-01 15:30","stock":"2026-04-01 16:30"}', 'op1', '2026-04-01 08:00', '2026-04-01 16:30'),
                
                ('PT-002', 'JO-2026-001', N'ยาดมสมุนไพร สูตรเย็น', N'ละลายแว็กซ์ + ผสมสาร', 'B2026-001-2', 'Line A', 1000, 450, 5, N'กำลังทำ', 'production_2', '{"production_1":"2026-04-02 08:00","qc_inprocess":"2026-04-02 10:15","production_2":"2026-04-02 11:00"}', 'op1', '2026-04-02 08:00', NULL),
                
                ('PT-003', 'JO-2026-003', N'น้ำมันนวดสมุนไพร สูตรร้อน', N'ผสมน้ำมัน + บรรจุ', 'B2026-003-1', 'Line A', 800, 800, 3, N'เสร็จสิ้น', 'stock', '{"production_1":"2026-03-15 08:00","qc_inprocess":"2026-03-15 11:00","production_2":"2026-03-15 12:00","completed":"2026-03-16 10:00","packaging":"2026-03-16 13:00","qc_final":"2026-03-17 09:00","stock":"2026-03-17 15:00"}', 'op1', '2026-03-15 08:00', '2026-03-17 15:00'),
                
                ('PT-004', 'JO-2026-005', N'ครีมสมุนไพรบำรุงผิว ขมิ้นชัน', N'ผสมครีม + บรรจุ', 'B2026-005-1', 'Line B', 500, 500, 8, N'กำลังทำ', 'packaging', '{"production_1":"2026-03-01 08:00","qc_inprocess":"2026-03-01 12:00","production_2":"2026-03-01 14:00","completed":"2026-03-02 10:00","packaging":"2026-03-02 13:00"}', 'op1', '2026-03-01 08:00', NULL),
                
                ('PT-005', 'JO-2026-005', N'ครีมสมุนไพรบำรุงผิว ขมิ้นชัน', N'ผสมครีม + บรรจุ', 'B2026-005-2', 'Line B', 500, 500, 2, N'กำลังทำ', 'qc_inprocess', '{"production_1":"2026-03-04 08:00","qc_inprocess":"2026-03-04 11:00"}', 'op1', '2026-03-04 08:00', NULL);
            END
        `);

        console.log('✅ Production database setup completed.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error setting up Production database:', error);
        process.exit(1);
    }
}

createProductionTables();

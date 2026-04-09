require('dotenv').config();
const { poolPromise } = require('./config/db');

async function createQcTables() {
    try {
        const pool = await poolPromise;

        // 1. QC_Incoming
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QC_Incoming' AND xtype='U')
            BEGIN
                CREATE TABLE QC_Incoming (
                    IncomingID INT IDENTITY(1,1) PRIMARY KEY,
                    LotNumber VARCHAR(100),
                    ItemName NVARCHAR(255),
                    SupplierName NVARCHAR(255),
                    InspectorID VARCHAR(50),
                    Result VARCHAR(50), -- 'ผ่าน', 'ไม่ผ่าน', 'รอตรวจสอบ'
                    Notes NVARCHAR(MAX),
                    CreatedAt DATETIME DEFAULT GETDATE()
                )
                PRINT 'Table QC_Incoming created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table QC_Incoming already exists.';
            END
        `);

        // 2. QC_Production
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QC_Production' AND xtype='U')
            BEGIN
                CREATE TABLE QC_Production (
                    RequestID VARCHAR(50) PRIMARY KEY,
                    TaskID VARCHAR(50),
                    JobOrderID VARCHAR(50),
                    BatchNo VARCHAR(50),
                    FormulaName NVARCHAR(255),
                    Line VARCHAR(100),
                    Type VARCHAR(50), -- 'qc_inprocess' / 'qc_final'
                    RequestedAt DATETIME NULL,
                    InspectedAt DATETIME NULL,
                    Inspector VARCHAR(50) NULL,
                    Status VARCHAR(50) DEFAULT 'รอตรวจ', -- 'รอตรวจ', 'ผ่าน', 'ไม่ผ่าน'
                    Notes NVARCHAR(MAX),
                    CreatedAt DATETIME DEFAULT GETDATE()
                )
                PRINT 'Table QC_Production created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table QC_Production already exists.';
            END
        `);

        // 3. QC_Defect_NCR
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QC_Defect_NCR' AND xtype='U')
            BEGIN
                CREATE TABLE QC_Defect_NCR (
                    NcrID INT IDENTITY(1,1) PRIMARY KEY,
                    NcrNumber VARCHAR(50),
                    RefLot VARCHAR(100),
                    ItemName NVARCHAR(255),
                    IssueDescription NVARCHAR(MAX),
                    ActionTaken NVARCHAR(MAX),
                    Status VARCHAR(50) DEFAULT 'รอดำเนินการ', -- 'รอดำเนินการ', 'ดำเนินการแล้ว'
                    CreatedAt DATETIME DEFAULT GETDATE()
                )
                PRINT 'Table QC_Defect_NCR created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table QC_Defect_NCR already exists.';
            END
        `);

        // 4. Migrate initial mock data (optional but helpful)
        console.log('Inserting initial mock data...');
        // Insert sample QC_Incoming
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM QC_Incoming WHERE LotNumber = 'IN-2026-001')
            BEGIN
                INSERT INTO QC_Incoming (LotNumber, ItemName, SupplierName, InspectorID, Result, Notes)
                VALUES 
                ('IN-2026-001', N'จอภาพ 27 นิ้ว (ชิ้นส่วน)', 'IT Vendor', 'qc1', N'ผ่าน', N'สภาพสมบูรณ์'),
                ('IN-2026-002', N'อะไหล่คีย์บอร์ด', 'KB Parts Co.', 'qc1', N'ไม่ผ่าน', N'พบสนิมที่ขั้วเชื่อม 10%');
            END
        `);

        // Insert sample QC_Defect
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM QC_Defect_NCR WHERE NcrNumber = 'NCR-2026-001')
            BEGIN
                INSERT INTO QC_Defect_NCR (NcrNumber, RefLot, ItemName, IssueDescription, ActionTaken, Status)
                VALUES 
                ('NCR-2026-001', 'IN-2026-002', N'อะไหล่คีย์บอร์ด', N'สนิมที่ขั้วเชื่อม', N'ส่งคืน Supplier', N'ดำเนินการแล้ว'),
                ('NCR-2026-002', 'FIN-2026-002', N'โต๊ะทำงาน', N'รอยขีดข่วนหน้าโต๊ะ', N'ซ่อมแซม/ขัดสีใหม่', N'รอดำเนินการ');
            END
        `);

        // QC_Production initial pending
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM QC_Production WHERE RequestID = 'QCR-001')
            BEGIN
                INSERT INTO QC_Production (RequestID, TaskID, JobOrderID, BatchNo, FormulaName, Line, Type, RequestedAt, Status)
                VALUES 
                ('QCR-001', 'PT-005', 'JO-2026-005', 'B2026-005-2', N'ครีมสมุนไพรบำรุงผิว ขมิ้นชัน', 'Line B', 'qc_inprocess', '2026-03-04 11:00', N'รอตรวจ');
            END
        `);

        console.log('✅ QC database setup completed.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error setting up QC database:', error);
        process.exit(1);
    }
}

createQcTables();

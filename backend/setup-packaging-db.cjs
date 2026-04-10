require('dotenv').config();
const { poolPromise } = require('./config/db');

async function createPackagingTables() {
    try {
        const pool = await poolPromise;

        // 1. Create Packaging_Tasks Table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Packaging_Tasks' AND xtype='U')
            BEGIN
                CREATE TABLE Packaging_Tasks (
                    TaskID VARCHAR(50) PRIMARY KEY,
                    Product NVARCHAR(255),
                    BatchNo VARCHAR(50),
                    PackType NVARCHAR(100),
                    Line VARCHAR(100),
                    Qty INT,
                    PackedQty INT,
                    Assignee NVARCHAR(100),
                    DueDate DATE,
                    Status NVARCHAR(50), -- 'รอบรรจุ', 'กำลังบรรจุ', 'บรรจุเสร็จ', 'รอ QC Final', 'QC ผ่าน', 'ส่งมอบแล้ว'
                    Destination NVARCHAR(50), -- 'คลัง', 'จัดส่ง OEM'
                    Customer NVARCHAR(255),
                    Note NVARCHAR(MAX),
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    UpdatedAt DATETIME DEFAULT GETDATE()
                )
                PRINT 'Table Packaging_Tasks created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table Packaging_Tasks already exists.';
            END
        `);

        // 2. Insert initial mock data if empty
        console.log('Inserting initial mock data for Packaging Tasks (replacing hardcoded UI data)...');
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM Packaging_Tasks WHERE TaskID = 'PKG-2026-001')
            BEGIN
                INSERT INTO Packaging_Tasks 
                (TaskID, Product, BatchNo, PackType, Line, Qty, PackedQty, Assignee, DueDate, Status, Destination, Customer, Note)
                VALUES 
                ('PKG-2026-001', N'ครีมสมุนไพรบำรุงผิว 50g', 'B-2026-015', N'กล่อง + ซอง', 'Pack-01', 500, 500, N'สมชาย', '2026-03-10', N'บรรจุเสร็จ', N'คลัง', NULL, N'สินค้าแบรนด์เราเอง เก็บคลังรอขาย'),
                ('PKG-2026-002', N'น้ำมันหอมระเหย 30ml', 'B-2026-018', N'ขวด + กล่อง', 'Pack-02', 1000, 1000, N'สมหญิง', '2026-03-08', N'รอ QC Final', N'คลัง', NULL, N'รอ QC ตรวจล็อตก่อนเข้าคลัง'),
                ('PKG-2026-003', N'แชมพูสมุนไพร 250ml', 'B-2026-020', N'ขวด + ฉลาก', 'Pack-01', 300, 0, N'สมศักดิ์', '2026-03-12', N'รอบรรจุ', N'จัดส่ง OEM', N'บจก. สยามเฮิร์บ', N'ลูกค้า OEM รอรับของ'),
                ('PKG-2026-004', N'สบู่สมุนไพร 100g', 'B-2026-022', N'ซอง + กล่อง', 'Pack-03', 800, 450, N'สมชาย', '2026-03-11', N'กำลังบรรจุ', N'คลัง', NULL, NULL),
                ('PKG-2026-005', N'อาหารเสริมแคปซูล 60 เม็ด', 'B-2026-025', N'กระปุก + กล่อง + ซีล', 'Pack-02', 200, 200, N'สมหญิง', '2026-03-07', N'QC ผ่าน', N'จัดส่ง OEM', N'โรงพยาบาลภูมิรักษ์', N'QC ผ่านแล้ว พร้อมส่งต่อฝ่ายจัดส่ง'),
                ('PKG-2026-006', N'ยาดมสูตรเย็น', 'B-2026-028', N'กล่อง + แพ็ค 12', 'Pack-01', 5000, 5000, N'สมศักดิ์', '2026-03-15', N'ส่งมอบแล้ว', N'คลัง', NULL, N'เข้าคลังเรียบร้อย');
            END
        `);

        console.log('✅ Packaging database setup completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error setting up Packaging database:', error);
        process.exit(1);
    }
}

createPackagingTables();

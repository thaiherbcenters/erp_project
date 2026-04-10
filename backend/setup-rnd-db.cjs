require('dotenv').config();
const { poolPromise } = require('./config/db');

async function setupRnDDatabase() {
    try {
        const pool = await poolPromise;

        // =====================================================================
        // 1. RnD_RawMaterials
        // =====================================================================
        console.log('Creating RnD_RawMaterials...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RnD_RawMaterials' AND xtype='U')
            CREATE TABLE RnD_RawMaterials (
                MaterialID VARCHAR(50) PRIMARY KEY,
                Name NVARCHAR(200) NOT NULL,
                Unit NVARCHAR(50),
                Stock DECIMAL(10,2) DEFAULT 0,
                MinStock DECIMAL(10,2) DEFAULT 0,
                CostPerUnit DECIMAL(10,2) DEFAULT 0,
                Category NVARCHAR(100)
            )
        `);

        // =====================================================================
        // 2. RnD_Formulas
        // =====================================================================
        console.log('Creating RnD_Formulas...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RnD_Formulas' AND xtype='U')
            CREATE TABLE RnD_Formulas (
                FormulaID VARCHAR(50) PRIMARY KEY,
                Name NVARCHAR(200) NOT NULL,
                Category NVARCHAR(100),
                Version VARCHAR(20),
                Status NVARCHAR(50) DEFAULT N'ร่าง',
                BatchSize INT,
                Unit NVARCHAR(50),
                ShelfLife NVARCHAR(50),
                Description NVARCHAR(MAX),
                InstructionsJSON NVARCHAR(MAX),
                CreatedBy NVARCHAR(100),
                CreatedDate DATE,
                ApprovedBy NVARCHAR(100),
                ApprovedDate DATE,
                CreatedAt DATETIME DEFAULT GETDATE()
            )
        `);

        // =====================================================================
        // 3. RnD_Formula_Ingredients
        // =====================================================================
        console.log('Creating RnD_Formula_Ingredients...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RnD_Formula_Ingredients' AND xtype='U')
            CREATE TABLE RnD_Formula_Ingredients (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                FormulaID VARCHAR(50) NOT NULL,
                MaterialID VARCHAR(50),
                MaterialName NVARCHAR(200),
                Qty DECIMAL(10,2),
                Unit NVARCHAR(50)
            )
        `);

        // =====================================================================
        // 4. RnD_Projects
        // =====================================================================
        console.log('Creating RnD_Projects...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RnD_Projects' AND xtype='U')
            CREATE TABLE RnD_Projects (
                ProjectID INT IDENTITY(1,1) PRIMARY KEY,
                Code VARCHAR(50) UNIQUE,
                Name NVARCHAR(200),
                Category NVARCHAR(100),
                Researcher NVARCHAR(100),
                StartDate DATE,
                TargetDate DATE,
                Phase NVARCHAR(50),
                Progress INT DEFAULT 0,
                Status NVARCHAR(50) DEFAULT N'กำลังดำเนินการ',
                FormulaRef VARCHAR(50)
            )
        `);

        // =====================================================================
        // 5. RnD_Experiments
        // =====================================================================
        console.log('Creating RnD_Experiments...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RnD_Experiments' AND xtype='U')
            CREATE TABLE RnD_Experiments (
                ExperimentID INT IDENTITY(1,1) PRIMARY KEY,
                Code VARCHAR(50) UNIQUE,
                ProjectCode VARCHAR(50),
                Name NVARCHAR(200),
                ExperimentDate DATE,
                Result NVARCHAR(50),
                Note NVARCHAR(MAX)
            )
        `);

        // =====================================================================
        // SEED DATA
        // =====================================================================
        console.log('Inserting seed data...');

        // --- Raw Materials ---
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM RnD_RawMaterials WHERE MaterialID = 'RM-001')
            INSERT INTO RnD_RawMaterials (MaterialID, Name, Unit, Stock, MinStock, CostPerUnit, Category) VALUES
            ('RM-001', N'เมนทอล', 'kg', 120, 20, 850, N'สารสกัด'),
            ('RM-002', N'การบูร', 'kg', 80, 15, 420, N'สารสกัด'),
            ('RM-003', N'น้ำมันยูคาลิปตัส', 'L', 50, 10, 1200, N'น้ำมันหอมระเหย'),
            ('RM-004', N'พาราฟินแว็กซ์', 'kg', 200, 30, 180, N'ฐานผลิตภัณฑ์'),
            ('RM-005', N'สารสกัดขมิ้นชัน', 'kg', 45, 10, 2800, N'สารสกัด'),
            ('RM-006', N'น้ำมันมะพร้าวสกัดเย็น', 'L', 90, 20, 350, N'ฐานผลิตภัณฑ์'),
            ('RM-007', N'สารสกัดว่านหางจระเข้', 'kg', 60, 15, 950, N'สารสกัด'),
            ('RM-008', N'น้ำมันลาเวนเดอร์', 'L', 25, 5, 3500, N'น้ำมันหอมระเหย'),
            ('RM-009', N'แอลกอฮอล์ (เกรดอาหาร)', 'L', 150, 30, 120, N'ตัวทำละลาย'),
            ('RM-010', N'ครีมเบส', 'kg', 100, 25, 280, N'ฐานผลิตภัณฑ์'),
            ('RM-011', N'สารกันเสีย (Paraben-free)', 'kg', 30, 5, 4200, N'สารเคมี'),
            ('RM-012', N'น้ำมันตะไคร้หอม', 'L', 35, 8, 1800, N'น้ำมันหอมระเหย'),
            ('RM-013', N'ใบชาเขียว (อบแห้ง)', 'kg', 70, 15, 650, N'วัตถุดิบธรรมชาติ'),
            ('RM-014', N'ดอกคาโมมายล์', 'kg', 40, 10, 1500, N'วัตถุดิบธรรมชาติ'),
            ('RM-015', N'วิตามิน E (Tocopherol)', 'kg', 15, 3, 5200, N'สารเคมี')
        `);

        // --- Formulas ---
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM RnD_Formulas WHERE FormulaID = 'FM-001')
            INSERT INTO RnD_Formulas (FormulaID, Name, Category, Version, Status, BatchSize, Unit, ShelfLife, Description, InstructionsJSON, CreatedBy, CreatedDate, ApprovedBy, ApprovedDate) VALUES
            ('FM-001', N'ยาดมสมุนไพร สูตรเย็น', N'ยาดม', 'v2.1', N'อนุมัติ', 1000, N'ชิ้น', N'24 เดือน', N'สูตรยาดมสมุนไพรแบบเย็นสดชื่น ใช้เมนทอลและการบูรเป็นหลัก เหมาะสำหรับบรรเทาอาการวิงเวียนศีรษะ', N'["ละลายพาราฟินแว็กซ์ที่อุณหภูมิ 60°C","ผสมเมนทอลและการบูรลงในแว็กซ์ที่ละลาย","เติมน้ำมันยูคาลิปตัส คนให้เข้ากัน","เทลงแม่พิมพ์ รอให้แข็งตัว","ตรวจสอบคุณภาพและบรรจุ"]', N'ดร.สมศรี วิจัย', '2025-11-10', N'ดร.วิชัย สมุนไพร', '2026-01-15'),
            ('FM-002', N'ครีมสมุนไพรบำรุงผิว ขมิ้นชัน', N'Skincare', 'v1.3', N'อนุมัติ', 500, N'กระปุก (50g)', N'18 เดือน', N'ครีมบำรุงผิวสูตรขมิ้นชัน ช่วยลดรอยดำ ผิวกระจ่างใส', N'["ผสมครีมเบสกับน้ำมันมะพร้าวที่อุณหภูมิ 40°C","เติมสารสกัดขมิ้นชัน คนเบาๆ 15 นาที","เติมวิตามิน E และสารกันเสีย","ทดสอบ pH (ควรอยู่ที่ 5.5-6.5)","บรรจุลงกระปุกและติดฉลาก"]', N'ดร.สมศรี วิจัย', '2025-12-01', N'ดร.วิชัย สมุนไพร', '2026-02-20'),
            ('FM-003', N'น้ำมันนวดสมุนไพร สูตรร้อน', N'น้ำมันนวด', 'v3.0', N'อนุมัติ', 800, N'ขวด (100ml)', N'36 เดือน', N'น้ำมันนวดสูตรร้อน ผสมน้ำมันตะไคร้หอม ช่วยคลายกล้ามเนื้อ', N'["อุ่นน้ำมันมะพร้าวที่ 35°C","เติมน้ำมันยูคาลิปตัสและตะไคร้หอม","ผสมการบูร คนให้ละลาย","ทดสอบความหอมและความเข้มข้น","บรรจุขวดและปิดผนึก"]', N'คุณนภา พัฒนา', '2025-06-15', N'ดร.วิชัย สมุนไพร', '2025-12-20'),
            ('FM-004', N'ชาสมุนไพรผ่อนคลาย', N'เครื่องดื่ม', 'v1.0', N'ร่าง', 2000, N'ซอง', N'12 เดือน', N'ชาสมุนไพรช่วยผ่อนคลาย ผสมคาโมมายล์และชาเขียว', N'["เตรียมใบชาเขียวและดอกคาโมมายล์ตามสัดส่วน","ผสมให้เข้ากัน","แบ่งบรรจุซอง (5g/ซอง)","ตรวจสอบความสะอาดและคุณภาพ","ปิดผนึกและติดฉลาก"]', N'คุณนภา พัฒนา', '2026-01-20', NULL, NULL),
            ('FM-005', N'เจลล้างมือสมุนไพร', N'สุขอนามัย', 'v2.0', N'ทดสอบ', 1500, N'ขวด (250ml)', N'24 เดือน', N'เจลล้างมือสูตรสมุนไพร ผสมว่านหางจระเข้เพื่อความชุ่มชื้น', N'["ผสมแอลกอฮอล์กับน้ำกลั่น (อัตราส่วน 70:30)","เติมสารสกัดว่านหางจระเข้ คนให้เป็นเนื้อเจล","หยดน้ำมันลาเวนเดอร์สำหรับกลิ่น","เติมสารกันเสีย","บรรจุขวดและติดฉลาก"]', N'ดร.สมศรี วิจัย', '2026-02-15', NULL, NULL)
        `);

        // --- Formula Ingredients ---
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM RnD_Formula_Ingredients WHERE FormulaID = 'FM-001')
            BEGIN
                -- FM-001
                INSERT INTO RnD_Formula_Ingredients (FormulaID, MaterialID, MaterialName, Qty, Unit) VALUES
                ('FM-001', 'RM-001', N'เมนทอล', 5, 'kg'),
                ('FM-001', 'RM-002', N'การบูร', 3, 'kg'),
                ('FM-001', 'RM-003', N'น้ำมันยูคาลิปตัส', 2, 'L'),
                ('FM-001', 'RM-004', N'พาราฟินแว็กซ์', 10, 'kg');
                -- FM-002
                INSERT INTO RnD_Formula_Ingredients (FormulaID, MaterialID, MaterialName, Qty, Unit) VALUES
                ('FM-002', 'RM-005', N'สารสกัดขมิ้นชัน', 2, 'kg'),
                ('FM-002', 'RM-006', N'น้ำมันมะพร้าวสกัดเย็น', 5, 'L'),
                ('FM-002', 'RM-010', N'ครีมเบส', 20, 'kg'),
                ('FM-002', 'RM-011', N'สารกันเสีย (Paraben-free)', 0.5, 'kg'),
                ('FM-002', 'RM-015', N'วิตามิน E (Tocopherol)', 0.3, 'kg');
                -- FM-003
                INSERT INTO RnD_Formula_Ingredients (FormulaID, MaterialID, MaterialName, Qty, Unit) VALUES
                ('FM-003', 'RM-006', N'น้ำมันมะพร้าวสกัดเย็น', 8, 'L'),
                ('FM-003', 'RM-003', N'น้ำมันยูคาลิปตัส', 3, 'L'),
                ('FM-003', 'RM-012', N'น้ำมันตะไคร้หอม', 2, 'L'),
                ('FM-003', 'RM-002', N'การบูร', 1, 'kg');
                -- FM-004
                INSERT INTO RnD_Formula_Ingredients (FormulaID, MaterialID, MaterialName, Qty, Unit) VALUES
                ('FM-004', 'RM-013', N'ใบชาเขียว (อบแห้ง)', 5, 'kg'),
                ('FM-004', 'RM-014', N'ดอกคาโมมายล์', 3, 'kg');
                -- FM-005
                INSERT INTO RnD_Formula_Ingredients (FormulaID, MaterialID, MaterialName, Qty, Unit) VALUES
                ('FM-005', 'RM-009', N'แอลกอฮอล์ (เกรดอาหาร)', 30, 'L'),
                ('FM-005', 'RM-007', N'สารสกัดว่านหางจระเข้', 5, 'kg'),
                ('FM-005', 'RM-008', N'น้ำมันลาเวนเดอร์', 0.5, 'L'),
                ('FM-005', 'RM-011', N'สารกันเสีย (Paraben-free)', 0.2, 'kg');
            END
        `);

        // --- Projects ---
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM RnD_Projects WHERE Code = 'RD-2026-001')
            INSERT INTO RnD_Projects (Code, Name, Category, Researcher, StartDate, TargetDate, Phase, Progress, Status, FormulaRef) VALUES
            ('RD-2026-001', N'พัฒนาสูตรครีมบำรุงผิว ขมิ้นชัน V2', N'Skincare', N'ดร.สมศรี วิจัย', '2026-01-15', '2026-06-30', N'ทดสอบ', 65, N'กำลังดำเนินการ', 'FM-002'),
            ('RD-2026-002', N'น้ำมันหอมระเหยเกรดพรีเมียม', N'Essential Oil', N'ดร.วิชัย สมุนไพร', '2026-02-01', '2026-08-31', N'วิจัย', 30, N'กำลังดำเนินการ', NULL),
            ('RD-2026-003', N'สูตรชาสมุนไพรผ่อนคลาย', N'เครื่องดื่ม', N'คุณนภา พัฒนา', '2026-03-01', '2026-07-31', N'เริ่มต้น', 15, N'กำลังดำเนินการ', 'FM-004'),
            ('RD-2025-010', N'น้ำมันนวดสมุนไพร สูตรร้อน V3', N'น้ำมันนวด', N'คุณนภา พัฒนา', '2025-10-01', '2026-01-31', N'อนุมัติ', 100, N'เสร็จสิ้น', 'FM-003'),
            ('RD-2026-004', N'เจลล้างมือสมุนไพร V2', N'สุขอนามัย', N'ดร.สมศรี วิจัย', '2026-02-15', '2026-05-15', N'ทดสอบ', 50, N'กำลังดำเนินการ', 'FM-005')
        `);

        // --- Experiments ---
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM RnD_Experiments WHERE Code = 'EXP-001')
            INSERT INTO RnD_Experiments (Code, ProjectCode, Name, ExperimentDate, Result, Note) VALUES
            ('EXP-001', 'RD-2026-001', N'ทดสอบสารสกัดขมิ้นความเข้มข้น 5%', '2026-03-05', N'ผ่าน', N'ค่า pH อยู่ในเกณฑ์ (5.8)'),
            ('EXP-002', 'RD-2026-001', N'ทดสอบความคงตัว 3 เดือน (Stability Test)', '2026-03-06', N'รอผล', N'อยู่ระหว่างการทดสอบ อีก 60 วัน'),
            ('EXP-003', 'RD-2026-002', N'สกัดน้ำมันด้วยวิธี Cold Press', '2026-03-04', N'ผ่าน', N'ได้ผลผลิต 85% คุณภาพดี'),
            ('EXP-004', 'RD-2026-004', N'ทดสอบฤทธิ์ฆ่าเชื้อ (Antimicrobial Test)', '2026-03-10', N'ผ่าน', N'ฆ่าเชื้อได้ 99.9%'),
            ('EXP-005', 'RD-2026-004', N'ทดสอบอาการแพ้ผิวหนัง (Patch Test)', '2026-03-12', N'ไม่ผ่าน', N'ต้องลดปริมาณแอลกอฮอล์ลง 5%'),
            ('EXP-006', 'RD-2026-003', N'ชิมรสชาติเบื้องต้น (Taste Panel)', '2026-03-15', N'ผ่าน', N'รสชาตินุ่มนวล กลิ่นหอมดี')
        `);

        console.log('✅ R&D database setup completed (5 tables + seed data).');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

setupRnDDatabase();

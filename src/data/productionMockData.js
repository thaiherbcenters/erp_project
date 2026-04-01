/**
 * =============================================================================
 * productionMockData.js — ข้อมูลจำลองสำหรับสายการผลิต
 * =============================================================================
 * ไฟล์นี้เป็น "แหล่งข้อมูลกลาง" ที่ 3 โมดูลใช้ร่วมกัน:
 *   - R&D       → สูตร (Formulas / BOM) + วัตถุดิบ (Raw Materials)
 *   - Planner   → ใบสั่งผลิต (Job Orders) อ้างอิง formulaId จาก R&D
 *   - Production → งาน (Tasks) อ้างอิง jobOrderId จาก Planner
 *
 * Data Flow: R&D (สูตร) → Planner (ใบสั่งผลิต) → Production (งาน)
 * =============================================================================
 */

// =============================================================================
// 1. วัตถุดิบ (Raw Materials) — ใช้ทั้งใน R&D และ Planner
// =============================================================================
export const MOCK_RAW_MATERIALS = [
    { id: 'RM-001', name: 'เมนทอล', unit: 'kg', stock: 120, minStock: 20, costPerUnit: 850, category: 'สารสกัด' },
    { id: 'RM-002', name: 'การบูร', unit: 'kg', stock: 80, minStock: 15, costPerUnit: 420, category: 'สารสกัด' },
    { id: 'RM-003', name: 'น้ำมันยูคาลิปตัส', unit: 'L', stock: 50, minStock: 10, costPerUnit: 1200, category: 'น้ำมันหอมระเหย' },
    { id: 'RM-004', name: 'พาราฟินแว็กซ์', unit: 'kg', stock: 200, minStock: 30, costPerUnit: 180, category: 'ฐานผลิตภัณฑ์' },
    { id: 'RM-005', name: 'สารสกัดขมิ้นชัน', unit: 'kg', stock: 45, minStock: 10, costPerUnit: 2800, category: 'สารสกัด' },
    { id: 'RM-006', name: 'น้ำมันมะพร้าวสกัดเย็น', unit: 'L', stock: 90, minStock: 20, costPerUnit: 350, category: 'ฐานผลิตภัณฑ์' },
    { id: 'RM-007', name: 'สารสกัดว่านหางจระเข้', unit: 'kg', stock: 60, minStock: 15, costPerUnit: 950, category: 'สารสกัด' },
    { id: 'RM-008', name: 'น้ำมันลาเวนเดอร์', unit: 'L', stock: 25, minStock: 5, costPerUnit: 3500, category: 'น้ำมันหอมระเหย' },
    { id: 'RM-009', name: 'แอลกอฮอล์ (เกรดอาหาร)', unit: 'L', stock: 150, minStock: 30, costPerUnit: 120, category: 'ตัวทำละลาย' },
    { id: 'RM-010', name: 'ครีมเบส', unit: 'kg', stock: 100, minStock: 25, costPerUnit: 280, category: 'ฐานผลิตภัณฑ์' },
    { id: 'RM-011', name: 'สารกันเสีย (Paraben-free)', unit: 'kg', stock: 30, minStock: 5, costPerUnit: 4200, category: 'สารเคมี' },
    { id: 'RM-012', name: 'น้ำมันตะไคร้หอม', unit: 'L', stock: 35, minStock: 8, costPerUnit: 1800, category: 'น้ำมันหอมระเหย' },
    { id: 'RM-013', name: 'ใบชาเขียว (อบแห้ง)', unit: 'kg', stock: 70, minStock: 15, costPerUnit: 650, category: 'วัตถุดิบธรรมชาติ' },
    { id: 'RM-014', name: 'ดอกคาโมมายล์', unit: 'kg', stock: 40, minStock: 10, costPerUnit: 1500, category: 'วัตถุดิบธรรมชาติ' },
    { id: 'RM-015', name: 'วิตามิน E (Tocopherol)', unit: 'kg', stock: 15, minStock: 3, costPerUnit: 5200, category: 'สารเคมี' },
];

// =============================================================================
// 2. สูตรการผลิต (Formulas / BOM) — R&D สร้าง, Planner ดึงไปใช้
// =============================================================================
export const MOCK_FORMULAS = [
    {
        id: 'FM-001',
        name: 'ยาดมสมุนไพร สูตรเย็น',
        category: 'ยาดม',
        version: 'v2.1',
        status: 'อนุมัติ',
        createdBy: 'ดร.สมศรี วิจัย',
        createdDate: '2025-11-10',
        approvedDate: '2026-01-15',
        approvedBy: 'ดร.วิชัย สมุนไพร',
        batchSize: 1000,
        unit: 'ชิ้น',
        shelfLife: '24 เดือน',
        description: 'สูตรยาดมสมุนไพรแบบเย็นสดชื่น ใช้เมนทอลและการบูรเป็นหลัก เหมาะสำหรับบรรเทาอาการวิงเวียนศีรษะ',
        ingredients: [
            { materialId: 'RM-001', name: 'เมนทอล', qty: 5, unit: 'kg' },
            { materialId: 'RM-002', name: 'การบูร', qty: 3, unit: 'kg' },
            { materialId: 'RM-003', name: 'น้ำมันยูคาลิปตัส', qty: 2, unit: 'L' },
            { materialId: 'RM-004', name: 'พาราฟินแว็กซ์', qty: 10, unit: 'kg' },
        ],
        instructions: [
            'ละลายพาราฟินแว็กซ์ที่อุณหภูมิ 60°C',
            'ผสมเมนทอลและการบูรลงในแว็กซ์ที่ละลาย',
            'เติมน้ำมันยูคาลิปตัส คนให้เข้ากัน',
            'เทลงแม่พิมพ์ รอให้แข็งตัว',
            'ตรวจสอบคุณภาพและบรรจุ',
        ],
    },
    {
        id: 'FM-002',
        name: 'ครีมสมุนไพรบำรุงผิว ขมิ้นชัน',
        category: 'Skincare',
        version: 'v1.3',
        status: 'อนุมัติ',
        createdBy: 'ดร.สมศรี วิจัย',
        createdDate: '2025-12-01',
        approvedDate: '2026-02-20',
        approvedBy: 'ดร.วิชัย สมุนไพร',
        batchSize: 500,
        unit: 'กระปุก (50g)',
        shelfLife: '18 เดือน',
        description: 'ครีมบำรุงผิวสูตรขมิ้นชัน ช่วยลดรอยดำ ผิวกระจ่างใส',
        ingredients: [
            { materialId: 'RM-005', name: 'สารสกัดขมิ้นชัน', qty: 2, unit: 'kg' },
            { materialId: 'RM-006', name: 'น้ำมันมะพร้าวสกัดเย็น', qty: 5, unit: 'L' },
            { materialId: 'RM-010', name: 'ครีมเบส', qty: 20, unit: 'kg' },
            { materialId: 'RM-011', name: 'สารกันเสีย (Paraben-free)', qty: 0.5, unit: 'kg' },
            { materialId: 'RM-015', name: 'วิตามิน E (Tocopherol)', qty: 0.3, unit: 'kg' },
        ],
        instructions: [
            'ผสมครีมเบสกับน้ำมันมะพร้าวที่อุณหภูมิ 40°C',
            'เติมสารสกัดขมิ้นชัน คนเบาๆ 15 นาที',
            'เติมวิตามิน E และสารกันเสีย',
            'ทดสอบ pH (ควรอยู่ที่ 5.5-6.5)',
            'บรรจุลงกระปุกและติดฉลาก',
        ],
    },
    {
        id: 'FM-003',
        name: 'น้ำมันนวดสมุนไพร สูตรร้อน',
        category: 'น้ำมันนวด',
        version: 'v3.0',
        status: 'อนุมัติ',
        createdBy: 'คุณนภา พัฒนา',
        createdDate: '2025-10-15',
        approvedDate: '2026-01-05',
        approvedBy: 'ดร.สมศรี วิจัย',
        batchSize: 800,
        unit: 'ขวด (100ml)',
        shelfLife: '36 เดือน',
        description: 'น้ำมันนวดสูตรร้อน ผสมน้ำมันตะไคร้หอมและยูคาลิปตัส เหมาะสำหรับคลายกล้ามเนื้อ',
        ingredients: [
            { materialId: 'RM-006', name: 'น้ำมันมะพร้าวสกัดเย็น', qty: 15, unit: 'L' },
            { materialId: 'RM-003', name: 'น้ำมันยูคาลิปตัส', qty: 3, unit: 'L' },
            { materialId: 'RM-012', name: 'น้ำมันตะไคร้หอม', qty: 4, unit: 'L' },
            { materialId: 'RM-001', name: 'เมนทอล', qty: 1.5, unit: 'kg' },
            { materialId: 'RM-002', name: 'การบูร', qty: 2, unit: 'kg' },
        ],
        instructions: [
            'ผสมน้ำมันมะพร้าวเป็นฐาน',
            'เติมน้ำมันยูคาลิปตัสและตะไคร้หอม',
            'ละลายเมนทอลและการบูร เติมลงในน้ำมัน',
            'คนให้เข้ากัน ทดสอบกลิ่นและความเข้มข้น',
            'กรองและบรรจุขวด',
        ],
    },
    {
        id: 'FM-004',
        name: 'ชาสมุนไพร ผ่อนคลาย',
        category: 'เครื่องดื่ม',
        version: 'v1.0',
        status: 'ร่าง',
        createdBy: 'คุณนภา พัฒนา',
        createdDate: '2026-03-01',
        approvedDate: null,
        approvedBy: null,
        batchSize: 2000,
        unit: 'ซอง (2g)',
        shelfLife: '12 เดือน',
        description: 'ชาสมุนไพรผสมคาโมมายล์และใบชาเขียว ช่วยผ่อนคลายและช่วยนอนหลับ',
        ingredients: [
            { materialId: 'RM-013', name: 'ใบชาเขียว (อบแห้ง)', qty: 8, unit: 'kg' },
            { materialId: 'RM-014', name: 'ดอกคาโมมายล์', qty: 6, unit: 'kg' },
            { materialId: 'RM-008', name: 'น้ำมันลาเวนเดอร์', qty: 0.2, unit: 'L' },
        ],
        instructions: [
            'คัดเลือกและชั่งวัตถุดิบตามสูตร',
            'ผสมใบชาเขียวกับดอกคาโมมายล์ในเครื่องผสม',
            'หยดน้ำมันลาเวนเดอร์ลงบนสมุนไพรที่ผสม',
            'บรรจุลงซองชา (2g/ซอง)',
            'ตรวจสอบน้ำหนักและบรรจุกล่อง',
        ],
    },
    {
        id: 'FM-005',
        name: 'เจลล้างมือสมุนไพร',
        category: 'สุขอนามัย',
        version: 'v2.0',
        status: 'ทดสอบ',
        createdBy: 'ดร.สมศรี วิจัย',
        createdDate: '2026-02-15',
        approvedDate: null,
        approvedBy: null,
        batchSize: 1500,
        unit: 'ขวด (250ml)',
        shelfLife: '24 เดือน',
        description: 'เจลล้างมือสูตรสมุนไพร ผสมว่านหางจระเข้เพื่อความชุ่มชื้น',
        ingredients: [
            { materialId: 'RM-009', name: 'แอลกอฮอล์ (เกรดอาหาร)', qty: 30, unit: 'L' },
            { materialId: 'RM-007', name: 'สารสกัดว่านหางจระเข้', qty: 5, unit: 'kg' },
            { materialId: 'RM-008', name: 'น้ำมันลาเวนเดอร์', qty: 0.5, unit: 'L' },
            { materialId: 'RM-011', name: 'สารกันเสีย (Paraben-free)', qty: 0.2, unit: 'kg' },
        ],
        instructions: [
            'ผสมแอลกอฮอล์กับน้ำกลั่น (อัตราส่วน 70:30)',
            'เติมสารสกัดว่านหางจระเข้ คนให้เป็นเนื้อเจล',
            'หยดน้ำมันลาเวนเดอร์สำหรับกลิ่น',
            'เติมสารกันเสีย',
            'บรรจุขวดและติดฉลาก',
        ],
    },
];

// =============================================================================
// 3. โครงการวิจัย (R&D Projects) — เฉพาะ R&D ใช้ดูภาพรวม
// =============================================================================
export const MOCK_RND_PROJECTS = [
    { id: 1, code: 'RD-2026-001', name: 'พัฒนาสูตรครีมบำรุงผิว ขมิ้นชัน V2', category: 'Skincare', researcher: 'ดร.สมศรี วิจัย', startDate: '2026-01-15', targetDate: '2026-06-30', phase: 'ทดสอบ', progress: 65, status: 'กำลังดำเนินการ', formulaRef: 'FM-002' },
    { id: 2, code: 'RD-2026-002', name: 'น้ำมันหอมระเหยเกรดพรีเมียม', category: 'Essential Oil', researcher: 'ดร.วิชัย สมุนไพร', startDate: '2026-02-01', targetDate: '2026-08-31', phase: 'วิจัย', progress: 30, status: 'กำลังดำเนินการ', formulaRef: null },
    { id: 3, code: 'RD-2026-003', name: 'สูตรชาสมุนไพรผ่อนคลาย', category: 'เครื่องดื่ม', researcher: 'คุณนภา พัฒนา', startDate: '2026-03-01', targetDate: '2026-07-31', phase: 'เริ่มต้น', progress: 15, status: 'กำลังดำเนินการ', formulaRef: 'FM-004' },
    { id: 4, code: 'RD-2025-010', name: 'น้ำมันนวดสมุนไพร สูตรร้อน V3', category: 'น้ำมันนวด', researcher: 'คุณนภา พัฒนา', startDate: '2025-10-01', targetDate: '2026-01-31', phase: 'อนุมัติ', progress: 100, status: 'เสร็จสิ้น', formulaRef: 'FM-003' },
    { id: 5, code: 'RD-2026-004', name: 'เจลล้างมือสมุนไพร V2', category: 'สุขอนามัย', researcher: 'ดร.สมศรี วิจัย', startDate: '2026-02-15', targetDate: '2026-05-15', phase: 'ทดสอบ', progress: 50, status: 'กำลังดำเนินการ', formulaRef: 'FM-005' },
];

// =============================================================================
// 4. การทดลอง (Experiments) — R&D ใช้บันทึกผลทดลอง
// =============================================================================
export const MOCK_EXPERIMENTS = [
    { id: 1, code: 'EXP-001', projectCode: 'RD-2026-001', name: 'ทดสอบสารสกัดขมิ้นความเข้มข้น 5%', date: '2026-03-05', result: 'ผ่าน', note: 'ค่า pH อยู่ในเกณฑ์ (5.8)' },
    { id: 2, code: 'EXP-002', projectCode: 'RD-2026-001', name: 'ทดสอบความคงตัว 3 เดือน (Stability Test)', date: '2026-03-06', result: 'รอผล', note: 'อยู่ระหว่างการทดสอบ อีก 60 วัน' },
    { id: 3, code: 'EXP-003', projectCode: 'RD-2026-002', name: 'สกัดน้ำมันด้วยวิธี Cold Press', date: '2026-03-04', result: 'ผ่าน', note: 'ได้ผลผลิต 85% คุณภาพดี' },
    { id: 4, code: 'EXP-004', projectCode: 'RD-2026-004', name: 'ทดสอบฤทธิ์ฆ่าเชื้อ (Antimicrobial Test)', date: '2026-03-10', result: 'ผ่าน', note: 'ฆ่าเชื้อได้ 99.9%' },
    { id: 5, code: 'EXP-005', projectCode: 'RD-2026-004', name: 'ทดสอบอาการแพ้ผิวหนัง (Patch Test)', date: '2026-03-12', result: 'ไม่ผ่าน', note: 'ต้องลดปริมาณแอลกอฮอล์ลง 5%' },
    { id: 6, code: 'EXP-006', projectCode: 'RD-2026-003', name: 'ชิมรสชาติเบื้องต้น (Taste Panel)', date: '2026-03-15', result: 'ผ่าน', note: 'รสชาตินุ่มนวล กลิ่นหอมดี' },
];

// =============================================================================
// 5. ใบสั่งผลิต (Job Orders) — Planner สร้าง, อ้างอิง formulaId จาก R&D
// =============================================================================
export const MOCK_JOB_ORDERS = [
    {
        id: 'JO-2026-001',
        formulaId: 'FM-001',
        formulaName: 'ยาดมสมุนไพร สูตรเย็น',
        batchQty: 2,
        batchSize: 1000,
        totalQty: 2000,
        unit: 'ชิ้น',
        status: 'กำลังผลิต',
        priority: 'สูง',
        planDate: '2026-04-01',
        dueDate: '2026-04-10',
        assignedLine: 'Line A',
        createdBy: 'plan1',
        createdDate: '2026-03-28',
        progress: 45,
        notes: 'ออเดอร์เร่งด่วนจาก บจก.สมุนไพรไทย',
    },
    {
        id: 'JO-2026-002',
        formulaId: 'FM-002',
        formulaName: 'ครีมสมุนไพรบำรุงผิว ขมิ้นชัน',
        batchQty: 3,
        batchSize: 500,
        totalQty: 1500,
        unit: 'กระปุก',
        status: 'รอผลิต',
        priority: 'ปกติ',
        planDate: '2026-04-12',
        dueDate: '2026-04-25',
        assignedLine: 'Line B',
        createdBy: 'plan1',
        createdDate: '2026-03-30',
        progress: 0,
        notes: 'สต็อกใกล้หมด ต้องผลิตเพิ่ม',
    },
    {
        id: 'JO-2026-003',
        formulaId: 'FM-003',
        formulaName: 'น้ำมันนวดสมุนไพร สูตรร้อน',
        batchQty: 1,
        batchSize: 800,
        totalQty: 800,
        unit: 'ขวด',
        status: 'เสร็จสิ้น',
        priority: 'ปกติ',
        planDate: '2026-03-15',
        dueDate: '2026-03-22',
        assignedLine: 'Line A',
        createdBy: 'plan1',
        createdDate: '2026-03-10',
        progress: 100,
        notes: '',
    },
    {
        id: 'JO-2026-004',
        formulaId: 'FM-001',
        formulaName: 'ยาดมสมุนไพร สูตรเย็น',
        batchQty: 5,
        batchSize: 1000,
        totalQty: 5000,
        unit: 'ชิ้น',
        status: 'รอผลิต',
        priority: 'สูง',
        planDate: '2026-04-15',
        dueDate: '2026-04-30',
        assignedLine: 'Line A',
        createdBy: 'plan1',
        createdDate: '2026-04-01',
        progress: 0,
        notes: 'ออเดอร์ส่งออกต่างประเทศ (5000 ชิ้น)',
    },
    {
        id: 'JO-2026-005',
        formulaId: 'FM-002',
        formulaName: 'ครีมสมุนไพรบำรุงผิว ขมิ้นชัน',
        batchQty: 2,
        batchSize: 500,
        totalQty: 1000,
        unit: 'กระปุก',
        status: 'เสร็จสิ้น',
        priority: 'ปกติ',
        planDate: '2026-03-01',
        dueDate: '2026-03-10',
        assignedLine: 'Line B',
        createdBy: 'plan1',
        createdDate: '2026-02-25',
        progress: 100,
        notes: '',
    },
];

// =============================================================================
// 6. ขั้นตอนการผลิต (Production Steps) — ลำดับขั้นตอนมาตรฐาน
// =============================================================================
// ใช้ระบุว่างานแต่ละชิ้นอยู่ที่ขั้นตอนไหน
export const PRODUCTION_STEPS = [
    { key: 'production_1',   label: 'ผลิตขั้นตอนที่ 1',    shortLabel: 'In Progress 1',  icon: 'Play',        description: 'เตรียมวัตถุดิบ / ผสม / ขึ้นรูป' },
    { key: 'qc_inprocess',   label: 'QC In-Process',       shortLabel: 'QC ระหว่างผลิต', icon: 'SearchCheck', description: 'ตรวจสอบระหว่างการผลิต' },
    { key: 'production_2',   label: 'ผลิตขั้นตอนที่ 2',    shortLabel: 'In Progress 2',  icon: 'Repeat',      description: 'ดำเนินการผลิตต่อ / ปรับปรุง' },
    { key: 'completed',      label: 'ผลิตเสร็จ',           shortLabel: 'Completed',      icon: 'CheckCircle', description: 'กระบวนการผลิตเสร็จสมบูรณ์' },
    { key: 'packaging',      label: 'บรรจุภัณฑ์',          shortLabel: 'Packaging',      icon: 'Package',     description: 'บรรจุภัณฑ์ / ติดฉลาก / แพ็ค' },
    { key: 'qc_final',       label: 'QC Final',            shortLabel: 'QC ขั้นสุดท้าย', icon: 'ShieldCheck', description: 'ตรวจสอบคุณภาพขั้นสุดท้าย' },
    { key: 'stock',          label: 'เข้าคลัง',            shortLabel: 'Stock',          icon: 'Warehouse',   description: 'สินค้าเข้าคลัง พร้อมจำหน่าย' },
];

// =============================================================================
// 7. งานฝ่ายผลิต (Production Tasks) — อ้างอิง jobOrderId จาก Planner
// =============================================================================
export const MOCK_PRODUCTION_TASKS = [
    {
        id: 'PT-001',
        jobOrderId: 'JO-2026-001',
        formulaName: 'ยาดมสมุนไพร สูตรเย็น',
        process: 'ละลายแว็กซ์ + ผสมสาร',
        batchNo: 'B2026-001-1',
        line: 'Line A',
        expectedQty: 1000,
        producedQty: 900,
        defectQty: 15,
        status: 'เสร็จสิ้น',
        currentStep: 'stock',   // งานนี้เสร็จสิ้นจนเข้าคลังแล้ว
        stepTimes: {
            production_1: '2026-04-01 08:00',
            qc_inprocess: '2026-04-01 10:30',
            production_2: '2026-04-01 11:00',
            completed: '2026-04-01 14:00',
            packaging: '2026-04-01 14:30',
            qc_final: '2026-04-01 15:30',
            stock: '2026-04-01 16:30',
        },
        operator: 'op1',
        startTime: '2026-04-01 08:00',
        endTime: '2026-04-01 16:30',
    },
    {
        id: 'PT-002',
        jobOrderId: 'JO-2026-001',
        formulaName: 'ยาดมสมุนไพร สูตรเย็น',
        process: 'ละลายแว็กซ์ + ผสมสาร',
        batchNo: 'B2026-001-2',
        line: 'Line A',
        expectedQty: 1000,
        producedQty: 450,
        defectQty: 5,
        status: 'กำลังทำ',
        currentStep: 'production_2',   // กำลังอยู่ขั้นตอนผลิตที่ 2
        stepTimes: {
            production_1: '2026-04-02 08:00',
            qc_inprocess: '2026-04-02 10:15',
            production_2: '2026-04-02 11:00',
        },
        operator: 'op1',
        startTime: '2026-04-02 08:00',
        endTime: null,
    },
    {
        id: 'PT-003',
        jobOrderId: 'JO-2026-003',
        formulaName: 'น้ำมันนวดสมุนไพร สูตรร้อน',
        process: 'ผสมน้ำมัน + บรรจุ',
        batchNo: 'B2026-003-1',
        line: 'Line A',
        expectedQty: 800,
        producedQty: 800,
        defectQty: 3,
        status: 'เสร็จสิ้น',
        currentStep: 'stock',
        stepTimes: {
            production_1: '2026-03-15 08:00',
            qc_inprocess: '2026-03-15 11:00',
            production_2: '2026-03-15 12:00',
            completed: '2026-03-16 10:00',
            packaging: '2026-03-16 13:00',
            qc_final: '2026-03-17 09:00',
            stock: '2026-03-17 15:00',
        },
        operator: 'op1',
        startTime: '2026-03-15 08:00',
        endTime: '2026-03-17 15:00',
    },
    {
        id: 'PT-004',
        jobOrderId: 'JO-2026-005',
        formulaName: 'ครีมสมุนไพรบำรุงผิว ขมิ้นชัน',
        process: 'ผสมครีม + บรรจุ',
        batchNo: 'B2026-005-1',
        line: 'Line B',
        expectedQty: 500,
        producedQty: 500,
        defectQty: 8,
        status: 'กำลังทำ',
        currentStep: 'packaging',   // กำลังอยู่ขั้นตอนบรรจุ
        stepTimes: {
            production_1: '2026-03-01 08:00',
            qc_inprocess: '2026-03-01 12:00',
            production_2: '2026-03-01 14:00',
            completed: '2026-03-02 10:00',
            packaging: '2026-03-02 13:00',
        },
        operator: 'op1',
        startTime: '2026-03-01 08:00',
        endTime: null,
    },
    {
        id: 'PT-005',
        jobOrderId: 'JO-2026-005',
        formulaName: 'ครีมสมุนไพรบำรุงผิว ขมิ้นชัน',
        process: 'ผสมครีม + บรรจุ',
        batchNo: 'B2026-005-2',
        line: 'Line B',
        expectedQty: 500,
        producedQty: 500,
        defectQty: 2,
        status: 'กำลังทำ',
        currentStep: 'qc_inprocess',   // กำลังรอ QC ระหว่างผลิต
        stepTimes: {
            production_1: '2026-03-04 08:00',
            qc_inprocess: '2026-03-04 11:00',
        },
        operator: 'op1',
        startTime: '2026-03-04 08:00',
        endTime: null,
    },
];


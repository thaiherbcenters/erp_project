// =============================================================================
// ข้อมูลเอกสารจริงจากระบบ Smart IMS
// =============================================================================

export const DOCUMENT_PARTS = [
    { id: 'P1', name: 'ส่วนที่ 1: ระบบบริหารจัดการส่วนกลาง (Central Management System)' },
    { id: 'P2', name: 'ส่วนที่ 2: โรงงานผลิตยาสมุนไพร' },
    { id: 'P3', name: 'ส่วนที่ 3: โรงงานผลิตชาสมุนไพร' },
    { id: 'P4', name: 'ส่วนที่ 4: แปลงเกษตรและแหล่งวัตถุดิบ' },
];

export const DOCUMENT_CATEGORIES = [
    // ส่วนที่ 1
    { id: 'SMF_QM', partId: 'P1', name: 'Site Master File (SMF) & Quality Manual (QM)', shortName: 'SMF/QM' },
    { id: 'DC', partId: 'P1', name: 'Document Control (DC)', shortName: 'DC' },
    { id: 'QA', partId: 'P1', name: 'Quality Assurance (QA)', shortName: 'QA' },
    { id: 'HR', partId: 'P1', name: 'Human Resource (HR)', shortName: 'HR' },
    { id: 'QC', partId: 'P1', name: 'Quality Control (QC)', shortName: 'QC' },
    { id: 'EN_EM', partId: 'P1', name: 'Engineering (EN) & Environment (EM)', shortName: 'EN/EM' },
    { id: 'PU', partId: 'P1', name: 'Purchasing (PU)', shortName: 'PU' },
    { id: 'WH', partId: 'P1', name: 'Warehouse (WH) & Logistics', shortName: 'WH' },
    { id: 'IT', partId: 'P1', name: 'Information Technology (IT)', shortName: 'IT' },
    // ส่วนที่ 2
    { id: 'PR_PKG', partId: 'P2', name: 'Production (PR) & Packaging', shortName: 'PR/PKG' },
    { id: 'HYG', partId: 'P2', name: 'Hygiene & Cleaning', shortName: 'Hygiene' },
    { id: 'HM', partId: 'P2', name: 'Herbal Medicine (HM) Line', shortName: 'HM' },
    // ส่วนที่ 3
    { id: 'TEA', partId: 'P3', name: 'Tea Line', shortName: 'Tea' },
    // ส่วนที่ 4
    { id: 'ICS', partId: 'P4', name: 'Internal Control System (ICS)', shortName: 'ICS' },
    { id: 'PU_FA', partId: 'P4', name: 'Purchasing (PU) & Farm Audit (FA)', shortName: 'PU/FA' },
];

export const DOCUMENTS = [
    // --- SMF_QM ---
    { id: 'IMS-MN-01', name: 'คู่มือระบบบริหารบูรณาการ (12 มาตรฐาน)', type: 'คู่มือ', typeTag: 'Manual', category: 'SMF_QM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ทุกมาตรฐาน' },
    { id: 'IMS-SMF-01', name: 'ข้อมูลแม่บทสถานที่ผลิต (Site Master File)', type: 'คู่มือ', typeTag: 'Manual', category: 'SMF_QM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ASEAN GMP / GHP' },
    { id: 'IMS-ORG-01', name: 'ผังองค์กร (Organization Chart)', type: 'คู่มือ', typeTag: 'Manual', category: 'SMF_QM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001 / ทุกมาตรฐาน' },

    // --- DC ---
    { id: 'SOP-QA-01', name: 'วิธีปฏิบัติ: การควบคุมเอกสารและบันทึก', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'DC', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001 / ทุกมาตรฐาน' },
    { id: 'FM-DC-01-01', name: 'บัญชีรายชื่อเอกสารแม่บท (Master List)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'DC', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001 / ทุกมาตรฐาน' },
    { id: 'FM-DC-01-02', name: 'บันทึกการแจกจ่ายและเรียกคืนเอกสาร', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'DC', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'FM-DC-01-03', name: 'แบบฟอร์มขออนุมัติจัดทำ/แก้ไข/ยกเลิกเอกสาร (DAR)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'DC', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'FM-DC-01-04', name: 'บัญชีรายชื่อเอกสารภายนอก (External Document List)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'DC', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },

    // --- QA ---
    { id: 'IMS-QA-001', name: 'ประกาศแต่งตั้งผู้มีอำนาจตัดสินใจปล่อยผ่านผลิตภัณฑ์ (Authorized Person)', type: 'คู่มือ', typeTag: 'Manual', category: 'QA', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'SOP-QA-02', name: 'วิธีปฏิบัติ: การจัดการข้อร้องเรียนผลิตภัณฑ์ (Product Complaint)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'QA', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'FM-QA-02-01', name: 'แบบบันทึกข้อร้องเรียน (Customer Complaint Form)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'QA', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'SOP-QA-03', name: 'วิธีปฏิบัติ: การเรียกคืนผลิตภัณฑ์ (Product Recall)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'QA', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'FM-QA-03-01', name: 'แบบบันทึกการเรียกคืนผลิตภัณฑ์ (Product Recall Form)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'QA', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'SOP-QA-04', name: 'วิธีปฏิบัติ: การปฏิบัติการแก้ไขและป้องกัน (CAPA)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'QA', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'FM-QA-04-01', name: 'ใบแจ้งให้ดำเนินการแก้ไขและป้องกัน (CAPA Form)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'QA', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'FM-QA-04-02', name: 'ทะเบียนคุมการแก้ไขและป้องกัน (CAPA Log)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'QA', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'SOP-QA-05', name: 'วิธีปฏิบัติ: การตรวจติดตามภายใน (Internal Audit)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'QA', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'FM-QA-05-01', name: 'แผนการตรวจติดตามภายในประจำปี (Annual Audit Plan)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'QA', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'FM-QA-05-02', name: 'แบบบันทึกการตรวจประเมิน (Internal Audit Checklist)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'QA', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'FM-QA-05-03', name: 'รายงานผลการตรวจติดตามภายใน (Internal Audit Report)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'QA', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },

    // --- HR ---
    { id: 'SOP-HR-01', name: 'วิธีปฏิบัติ: การคัดเลือกและปฐมนิเทศพนักงาน', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'FM-HR-01-01', name: 'ประวัติพนักงานและบันทึกการอบรม', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'SOP-HR-03', name: 'วิธีปฏิบัติ: การประเมินผลและสวัสดิการ', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'SOP-HR-04', name: 'วิธีปฏิบัติ: การจัดการฝึกอบรม', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'FM-HR-04-01', name: 'แผนการฝึกอบรมประจำปี (Training Matrix)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'SOP-HR-05', name: 'วิธีปฏิบัติ: การประเมินความพึงพอใจพนักงาน', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'FM-HR-05-01', name: 'แบบสำรวจความพึงพอใจพนักงานประจำปี', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'SOP-AD-01', name: 'วิธีปฏิบัติ: การรักษาความปลอดภัยและการเข้าออก (Security)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'FM-AD-01-01', name: 'สมุดเยี่ยมและลงทะเบียนผู้มาติดต่อ (Visitor Logbook)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'SOP-AD-02', name: 'วิธีปฏิบัติ: การควบคุมกุญแจและการเข้าพื้นที่หวงห้าม', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'SOP-AD-03', name: 'วิธีปฏิบัติ: การจัดการข้อร้องเรียนจริยธรรม/แรงงาน', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'SOP-MK-01', name: 'วิธีปฏิบัติ: การใช้และรักษาภาพลักษณ์ตรา T Mark / MiT', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'SOP-MK-02', name: 'วิธีปฏิบัติ: การควบคุมมาตรฐาน OTOP', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'SOP-SS-01', name: 'วิธีปฏิบัติ: การดำเนินกิจกรรมเพื่อสังคม (CSR)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HR', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },

    // --- QC ---
    { id: 'SOP-QC-01', name: 'วิธีปฏิบัติ: การสุ่มตัวอย่างและทดสอบ', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'QC', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-QC-01-01', name: 'บันทึกการสุ่มตัวอย่างวัสดุ', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'QC', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-QC-01-02', name: 'ใบวิเคราะห์ผลการทดสอบ (COA)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'QC', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-QC-02', name: 'วิธีปฏิบัติ: การตรวจปล่อยสินค้า (Release)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'QC', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-QC-02-01', name: 'ใบอนุมัติปล่อยผ่านโดย AP', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'QC', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },

    // --- EN/EM ---
    { id: 'SOP-EN-01', name: 'วิธีปฏิบัติ: การบำรุงรักษาเชิงป้องกันและการซ่อมแซมเครื่องจักร (PM & Breakdown)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-EN-01-01', name: 'แผนและประวัติการบำรุงรักษาเชิงป้องกันประจำปี (PM Plan & History)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-EN-01-02', name: 'ใบแจ้งซ่อมเครื่องจักรและอุปกรณ์ (Work Request)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-EN-02', name: 'วิธีปฏิบัติ: การสอบเทียบเครื่องมือวัด (Calibration)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-EN-02-01', name: 'แผนและประวัติการสอบเทียบเครื่องมือวัด (Calibration Plan)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-EN-03', name: 'วิธีปฏิบัติ: การควบคุมระบบปรับอากาศและระบายอากาศ (HVAC)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-EN-03-01', name: 'บันทึกการตรวจสอบ ล้างแอร์ และเปลี่ยนแผ่นกรองอากาศ', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-EN-04', name: 'วิธีปฏิบัติ: การควบคุมระบบน้ำใช้และน้ำบริสุทธิ์ในการผลิต', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-EN-04-01', name: 'บันทึกการตรวจสอบ ล้างไส้กรอง และเปลี่ยนสารกรองน้ำ', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-EN-05', name: 'วิธีปฏิบัติ: การบำรุงรักษาระบบไฟฟ้าและแสงสว่าง', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'FM-EN-05-01', name: 'บันทึกการตรวจสอบระบบไฟสำรองและไฟฉุกเฉิน', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'SOP-EM-01', name: 'วิธีปฏิบัติ: การจัดการกากอุตสาหกรรมและขยะ (Waste Management)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'FM-EM-01-01', name: 'บันทึกการชั่งและกำจัดกากขยะ', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'SOP-EM-02', name: 'วิธีปฏิบัติ: การควบคุมสัตว์พาหะ (Pest Control)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-EM-02-01', name: 'รายงานการตรวจสอบจุดดักหนูและแมลง (Pest Control Log)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-EM-03', name: 'วิธีปฏิบัติ: การเตรียมความพร้อมและตอบโต้สภาวะฉุกเฉิน', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'FM-EM-03-01', name: 'บันทึกการซ้อมดับเพลิงและอพยพหนีไฟ', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'SOP-EM-04', name: 'วิธีปฏิบัติ: การจัดการสารเคมีและวัตถุดิบอันตราย', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-EM-04-01', name: 'ทะเบียนคุมสารเคมีและบันทึกการเบิกจ่าย (Chemical List)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'EN_EM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },

    // --- PU ---
    { id: 'SOP-PU-01', name: 'วิธีปฏิบัติ: การคัดเลือกและประเมินผู้ขาย (Supplier)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'PU', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'FM-PU-01-01', name: 'ทะเบียนผู้ขายที่ได้รับการอนุมัติ (AVL)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'PU', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'FM-PU-01-02', name: 'แบบฟอร์มประเมินผู้ขายรายใหม่', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'PU', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'FM-PU-01-03', name: 'แบบฟอร์มประเมินผู้ขายประจำปี', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'PU', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'SOP-PU-02', name: 'วิธีปฏิบัติ: การจัดซื้อวัตถุดิบและวัสดุบรรจุ', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'PU', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },
    { id: 'FM-PU-02-01', name: 'ใบสั่งซื้อ (Purchase Order - PO)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'PU', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'ISO 9001 / GMP' },

    // --- WH ---
    { id: 'SOP-WH-01', name: 'วิธีปฏิบัติ: การรับเข้า การจัดเก็บ และการคุมสภาพแวดล้อมคลังสินค้า', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'WH', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-WH-01-01', name: 'ใบรับเข้าวัตถุดิบและวัสดุบรรจุ (Goods Receipt Note)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'WH', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-WH-01-02', name: 'บัญชีคุมคลังสินค้า (Stock Card)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'WH', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-WH-01-03', name: 'บันทึกตรวจสอบอุณหภูมิและความชื้นคลังสินค้า', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'WH', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-WH-02', name: 'วิธีปฏิบัติ: การเบิกจ่ายวัตถุดิบและวัสดุบรรจุเข้าสู่กระบวนการผลิต', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'WH', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-WH-02-01', name: 'ใบเบิกวัตถุดิบและวัสดุบรรจุ (Material Requisition Form)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'WH', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-WH-03', name: 'วิธีปฏิบัติ: การจัดการสินค้าสำเร็จรูป (Finished Goods) และการจัดส่ง', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'WH', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-WH-03-01', name: 'บันทึกการจัดส่งสินค้า (Delivery Note)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'WH', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },

    // --- IT ---
    { id: 'SOP-IT-01', name: 'วิธีปฏิบัติ: การใช้งานและควบคุมระบบผู้ช่วยปัญญาประดิษฐ์ (AI-IMS Administration)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'IT', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'FM-IT-01-01', name: 'แบบฟอร์มขอสิทธิ์เข้าใช้งานระบบ ERP และระบบ AI', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'IT', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'SOP-IT-02', name: 'วิธีปฏิบัติ: การบริหารจัดการระบบสารสนเทศและการสำรองข้อมูล (IT Management & Data Backup)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'IT', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'FM-IT-02-01', name: 'บันทึกการตรวจสอบและสำรองข้อมูลระบบประจำเดือน (Backup Integrity Log)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'IT', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'SOP-IT-03', name: 'วิธีปฏิบัติ: การจัดการสิทธิ์ผู้ใช้งานและลายมือชื่ออิเล็กทรอนิกส์ (Access & E-Signature)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'IT', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001' },
    { id: 'FM-IT-03-01', name: 'แบบฟอร์มขออนุมัติจัดเก็บและใช้งานตัวอย่างลายมือชื่ออิเล็กทรอนิกส์ในระบบ ERP', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'IT', revision: '00', date: '2026-02-03', status: 'ใช้งาน', standard: 'ISO 9001' },

    // --- PR/PKG ---
    { id: 'SOP-PR-01', name: 'วิธีปฏิบัติ: การผลิตผลิตภัณฑ์ (Manufacturing Process)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'PR_PKG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-PR-01-01', name: 'บันทึกการผลิตรุ่น (BMR - Batch Manufacturing Record)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'PR_PKG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-PR-01-02', name: 'บันทึกการตรวจสอบระหว่างกระบวนการผลิต (In-Process Control)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'PR_PKG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-PR-02', name: 'วิธีปฏิบัติ: การบรรจุและการติดฉลาก (Packaging & Labeling)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'PR_PKG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-PR-02-01', name: 'บันทึกการบรรจุรุ่น (BPR - Batch Packaging Record)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'PR_PKG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-PR-02-02', name: 'บันทึกการเบิกจ่ายและรับคืนฉลาก (Label Control)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'PR_PKG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-PR-03', name: 'วิธีปฏิบัติ: การเตรียมความพร้อมพื้นที่และเครื่องจักร (Line Clearance)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'PR_PKG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-PR-03-01', name: 'แบบบันทึกการตรวจสอบความพร้อมพื้นที่ (Line Clearance)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'PR_PKG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-PR-04', name: 'วิธีปฏิบัติ: การจัดการผลิตภัณฑ์ที่ไม่เป็นไปตามข้อกำหนด (OOS / Reject)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'PR_PKG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },

    // --- Hygiene ---
    { id: 'SOP-PR-05', name: 'วิธีปฏิบัติ: การทำความสะอาดพื้นที่และเครื่องจักรผลิต', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HYG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-PR-05-01', name: 'บันทึกการทำความสะอาดประจำวัน (Daily Cleaning Record)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HYG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-PR-05-02', name: 'สมุดบันทึกการใช้และทำความสะอาดเครื่องจักร (Equipment Logbook)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HYG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-PR-05-03', name: 'บันทึกประเมินความสะอาดพื้นที่ (Housekeeping Checklist)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HYG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-HR-02', name: 'วิธีปฏิบัติ: สุขลักษณะส่วนบุคคลของพนักงาน (Personnel Hygiene)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HYG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-HR-02-01', name: 'บันทึกตรวจสุขภาพและสุขลักษณะพนักงานก่อนเข้างาน', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HYG', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },

    // --- HM ---
    { id: 'SOP-HM-01', name: 'วิธีปฏิบัติ: การแต่งกาย การเตรียมตัว และการเข้า-ออกพื้นที่ผลิตยา', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-HM-02', name: 'วิธีปฏิบัติ: การควบคุมสภาวะแวดล้อมห้องผลิตยา (อุณหภูมิ/ความชื้น/แรงดัน)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-HM-02-01', name: 'บันทึกการตรวจสอบสภาวะแวดล้อมห้องผลิตประจำวัน', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-HM-03', name: 'วิธีปฏิบัติ: กระบวนการผลิตยาสมุนไพร (แคปซูล/ยาน้ำ/ยาปั้นก้อน)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'HM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-HM-03-01', name: 'บันทึกการผลิตยารุ่น (BMR - Herbal Medicine)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-HM-03-02', name: 'บันทึกการบรรจุยารุ่น (BPR - Herbal Medicine)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-HM-03-03', name: 'บันทึกการทวนสอบเครื่องชั่งหน้างานประจำวัน', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-HM-03-04', name: 'รายงานสรุปยอดผลผลิตและการสูญเสีย (Yield Report)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-HM-03-05', name: 'บันทึกการล้างและตรวจสอบเครื่องตอกแคปซูล/เครื่องบรรจุ', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'HM', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },

    // --- Tea ---
    { id: 'SOP-TEA-01', name: 'วิธีปฏิบัติ: กระบวนการผลิตและบรรจุชาสมุนไพร', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'TEA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-TEA-01-01', name: 'บันทึกการผลิตชารุ่น (BMR - Tea)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'TEA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-TEA-01-02', name: 'บันทึกการตรวจสอบน้ำหนักบรรจุซองชา', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'TEA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-TEA-01-03', name: 'ทะเบียนคุมลอตและประวัติวัตถุดิบชา', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'TEA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-TEA-02', name: 'วิธีปฏิบัติ: การคัดแยกสิ่งแปลกปลอมและการล้างเครื่องบรรจุชา', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'TEA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'FM-TEA-02-01', name: 'บันทึกตรวจสอบสิ่งแปลกปลอมและทำความสะอาดเครื่องจักร', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'TEA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'GMP / GHP' },
    { id: 'SOP-HL-01', name: 'วิธีปฏิบัติ: การควบคุมจุดวิกฤตและสุขลักษณะตามมาตรฐานฮาลาล', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'TEA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Halal / GMP' },
    { id: 'FM-HL-01-01', name: 'บันทึกการตรวจสอบและควบคุมจุดวิกฤตฮาลาลประจำวัน', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'TEA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Halal / GMP' },
    { id: 'SOP-HL-02', name: 'วิธีปฏิบัติ: การป้องกันการปนเปื้อน Najis และการจัดส่งสินค้าฮาลาล', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'TEA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Halal / GMP' },
    { id: 'FM-HL-02-01', name: 'บันทึกตรวจสอบความสะอาดรถขนส่งและตู้คอนเทนเนอร์ (Halal)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'TEA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Halal / GMP' },

    // --- ICS ---
    { id: 'SOP-ICS-01', name: 'วิธีปฏิบัติ: การจัดการระบบควบคุมภายในกลุ่มเกษตรกร', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'ICS', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Organic / GMP' },
    { id: 'FM-ICS-01-01', name: 'ทะเบียนรายชื่อเกษตรกรและแผนที่แปลงปลูกสมาชิก', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'ICS', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Organic / GMP' },
    { id: 'SOP-ICS-02', name: 'วิธีปฏิบัติ: การตรวจติดตามภายในสำหรับแปลงสมาชิก (Internal Farm Inspection)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'ICS', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Organic / GMP' },
    { id: 'FM-ICS-02-01', name: 'บันทึกการตรวจติดตามภายในแปลงสมาชิก (Internal Farm Audit)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'ICS', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Organic / GMP' },

    // --- PU/FA ---
    { id: 'SOP-PU-03', name: 'วิธีปฏิบัติ: การตรวจประเมินผู้ส่งมอบ (Supplier Audit)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'PU_FA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Organic / GMP' },
    { id: 'FM-PU-03-01', name: 'แบบตรวจประเมินแปลงปลูกสมุนไพร (Audit Checklist)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'PU_FA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Organic / GMP' },
    { id: 'SOP-FA-01', name: 'วิธีปฏิบัติ: การตรวจประเมินแปลงปลูก (Farm Audit)', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'PU_FA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Organic / GMP' },
    { id: 'FM-FA-01-01', name: 'แบบตรวจประเมินแปลงปลูกสมุนไพร (Checklist)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'PU_FA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Organic / GMP' },
    { id: 'FM-FA-01-02', name: 'รายงานสรุปผลการเข้าตรวจแปลง (Audit Report)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'PU_FA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Organic / GMP' },
    { id: 'SOP-PU-04', name: 'วิธีปฏิบัติ: การคัดเลือกและตรวจรับวัตถุดิบอินทรีย์', type: 'ระเบียบปฏิบัติ', typeTag: 'SOP', category: 'PU_FA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Organic / GMP' },
    { id: 'FM-PU-04-01', name: 'ทะเบียนคุมใบรับรองมาตรฐานเกษตรอินทรีย์ (Organic Cert. Log)', type: 'แบบฟอร์ม', typeTag: 'Form', category: 'PU_FA', revision: '00', date: '2026-03-02', status: 'ใช้งาน', standard: 'Organic / GMP' },
];

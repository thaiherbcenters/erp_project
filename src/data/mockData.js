/**
 * =============================================================================
 * mockData.js — ข้อมูลจำลอง (Mock Data) สำหรับระบบ ERP
 * =============================================================================
 *
 * ไฟล์นี้เก็บข้อมูลจำลองทั้งหมดที่ใช้ในระบบ:
 *   - MOCK_USERS          : ข้อมูลผู้ใช้งาน (username, password, role)
 *   - ALL_PAGES           : โครงสร้างหน้า 3 ระดับ (page → subPage → section)
 *   - getDefaultPermissions: สิทธิ์เริ่มต้นของแต่ละ user
 *   - MOCK_STOCK          : ข้อมูลสินค้าในคลัง
 *   - MOCK_SALES          : ข้อมูลการขาย
 *   - MOCK_EMPLOYEES      : ข้อมูลพนักงาน
 *   - MOCK_QC_INSPECTIONS : ข้อมูลการตรวจสอบคุณภาพ
 *
 * หมายเหตุ: เมื่อเชื่อมต่อ Backend จริง ให้ย้ายข้อมูลเหล่านี้ไปที่ API
 *           และลบไฟล์นี้ออก
 * =============================================================================
 */

// =============================================================================
// 1. ผู้ใช้งาน (Users)
// =============================================================================
// role ที่ใช้ในระบบ:
//   - 'admin'     : ผู้ดูแลระบบ — เข้าถึงทุกหน้า + หน้าจัดการสิทธิ์
//   - 'executive' : ผู้บริหาร — เข้าถึงทุกหน้า (ไม่มีหน้าจัดการสิทธิ์)
//   - 'user'      : ผู้ใช้ทั่วไป — เข้าถึงตามสิทธิ์ที่กำหนด
//   - 'qc'        : เจ้าหน้าที่ตรวจสอบคุณภาพ — เข้าถึง home + qc
//   - 'sales'     : พนักงานขาย — เข้าถึง home, stock, sales
//   - 'accountant': พนักงานบัญชี — เข้าถึง home, stock, accounts
//   - 'procurement': พนักงานจัดซื้อ — เข้าถึง home, procurement
//   - 'hr'        : พนักงานบุคคล — เข้าถึง home, hr
//   - 'stock'     : พนักงานคลังสินค้า — เข้าถึง home, stock
//   - 'rnd'       : นักวิจัยและพัฒนา — เข้าถึง home, rnd
//   - 'packaging' : พนักงานบรรจุภัณฑ์ — เข้าถึง home, packaging
//   - 'document_control': เจ้าหน้าที่ควบคุมเอกสาร — เข้าถึง home, document

export const MOCK_USERS = [
  { id: 'it_admin', username: 'it_admin', password: 'admin123', displayName: 'ผู้ดูแลระบบ', role: 'admin', avatar: 'IT' },
  { id: 'exec', username: 'exec', password: 'password', displayName: 'ผู้บริหาร', role: 'executive', avatar: 'EX' },
  { id: 'qc1', username: 'qc1', password: 'qc123', displayName: 'เจ้าหน้าที่ QC', role: 'qc', avatar: 'QC' },
  { id: 'sales1', username: 'sales1', password: 'sales123', displayName: 'พนักงานขาย', role: 'sales', avatar: 'SL' },
  { id: 'acc1', username: 'acc1', password: 'acc123', displayName: 'พนักงานบัญชี', role: 'accountant', avatar: 'AC' },
  { id: 'proc1', username: 'proc1', password: 'proc123', displayName: 'พนักงานจัดซื้อ', role: 'procurement', avatar: 'PR' },
  { id: 'hr1', username: 'hr1', password: 'hr123', displayName: 'พนักงานบุคคล', role: 'hr', avatar: 'HR' },
  { id: 'stock1', username: 'stock1', password: 'stock123', displayName: 'พนักงานคลังสินค้า', role: 'stock', avatar: 'ST' },
  { id: 'plan1', username: 'plan1', password: 'plan123', displayName: 'ผู้วางแผนการผลิต', role: 'planner', avatar: 'PL' },
  { id: 'op1', username: 'op1', password: 'op123', displayName: 'พนักงานฝ่ายผลิต', role: 'operator', avatar: 'OP' },
  { id: 'rnd1', username: 'rnd1', password: 'rnd123', displayName: 'นักวิจัยและพัฒนา', role: 'rnd', avatar: 'RD' },
  { id: 'pkg1', username: 'pkg1', password: 'pkg123', displayName: 'พนักงานบรรจุภัณฑ์', role: 'packaging', avatar: 'PK' },
  { id: 'doc1', username: 'doc1', password: 'doc123', displayName: 'เจ้าหน้าที่ควบคุมเอกสาร', role: 'document_control', avatar: 'DC' },
];

// =============================================================================
// 2. โครงสร้างหน้าในระบบ ERP (Pages Structure)
// =============================================================================
// ระบบสิทธิ์แบ่งเป็น 3 ระดับ:
//   ระดับ 1 — page     : หน้าหลัก (เช่น หน้าหลัก, คลังสินค้า)
//   ระดับ 2 — subPage  : หน้าย่อย (เช่น สถิติภาพรวม, ตารางสินค้า)
//   ระดับ 3 — section  : หัวข้อย่อย (เช่น รายได้รวม, ช่องค้นหา)
//
// การตั้งชื่อ ID ใช้รูปแบบ: {page}_{subPage}_{section}
// เช่น: home_stats_revenue, stock_search_bar

export const ALL_PAGES = [
  // --- หน้าหลัก (Dashboard) ---
  {
    id: 'home', name: 'หน้าหลัก', path: '/home',
    subPages: [
      {
        id: 'home_stats', name: 'สถิติภาพรวม',
        sections: [
          { id: 'home_stats_revenue', name: 'รายได้รวม' },
          { id: 'home_stats_orders', name: 'คำสั่งซื้อ' },
          { id: 'home_stats_products', name: 'สินค้า' },
          { id: 'home_stats_customers', name: 'ลูกค้า' },
        ],
      },
      {
        id: 'home_activity', name: 'กิจกรรมล่าสุด',
        sections: [
          { id: 'home_activity_list', name: 'รายการกิจกรรม' },
        ],
      },
      {
        id: 'home_actions', name: 'ดำเนินการด่วน',
        sections: [
          { id: 'home_actions_buttons', name: 'ปุ่มดำเนินการ' },
        ],
      },
    ],
  },

  // --- ลูกค้า (Customers) ---
  {
    id: 'customer', name: 'ลูกค้า', path: '/customer',
    subPages: [
      {
        id: 'customer_list', name: 'จัดการลูกค้า',
        sections: [
          { id: 'customer_list_search', name: 'ค้นหา' },
          { id: 'customer_list_table', name: 'ตารางลูกค้า' },
        ],
      },
      {
        id: 'customer_history', name: 'ประวัติ',
        sections: [
          { id: 'customer_history_view', name: 'ดูประวัติ' },
        ],
      },
    ],
  },

  // --- คลังสินค้า (Inventory) ---
  {
    id: 'stock', name: 'คลังสินค้า', path: '/stock',
    subPages: [
      {
        id: 'stock_dashboard', name: 'Stock Dashboard',
        sections: [
          { id: 'stock_dashboard_stats', name: 'สถิติภาพรวมคลังสินค้า' },
        ],
      },
      {
        id: 'stock_data', name: 'Data STOCK',
        sections: [
          { id: 'stock_data_search', name: 'ค้นหาสินค้า' },
          { id: 'stock_data_table', name: 'ตารางยอดคงเหลือ' },
        ],
      },
      {
        id: 'stock_logs', name: 'รายการของเข้า-ออก',
        sections: [
          { id: 'stock_logs_search', name: 'ค้นหาประวัติ' },
          { id: 'stock_logs_table', name: 'ตารางประวัติเข้า-ออก' },
        ],
      },
    ],
  },

  // --- ฝ่ายขาย (Sales Department) ---
  {
    id: 'sales', name: 'ฝ่ายขาย', path: '/sales',
    subPages: [
      {
        id: 'sales_dashboard', name: 'Sales Dashboard',
        sections: [
          { id: 'sales_dashboard_revenue', name: 'ยอดขายรวม' },
          { id: 'sales_dashboard_orders', name: 'จำนวนคำสั่งซื้อ' },
          { id: 'sales_dashboard_customers', name: 'จำนวนลูกค้า' },
          { id: 'sales_dashboard_quotations', name: 'ใบเสนอราคา' },
        ],
      },
      {
        id: 'sales_quotation', name: 'Quotation',
        sections: [
          { id: 'sales_quotation_search', name: 'ค้นหาใบเสนอราคา' },
          { id: 'sales_quotation_table', name: 'ตารางใบเสนอราคา' },
        ],
      },
      {
        id: 'sales_orders', name: 'Sales Order',
        sections: [
          { id: 'sales_orders_search', name: 'ค้นหาคำสั่งซื้อ' },
          { id: 'sales_orders_table', name: 'ตารางคำสั่งซื้อ' },
        ],
      },
    ],
  },

  // --- บัญชี (Accounts) ---
  {
    id: 'accounts', name: 'บัญชี', path: '/accounts',
    subPages: [
      {
        id: 'accounts_dashboard', name: 'Accounts Dashboard',
        sections: [
          { id: 'accounts_dashboard_ar_total', name: 'ลูกหนี้การค้ารวม (AR)' },
          { id: 'accounts_dashboard_ap_total', name: 'เจ้าหนี้การค้ารวม (AP)' },
          { id: 'accounts_dashboard_profit', name: 'กำไร/ขาดทุน' },
        ],
      },
      {
        id: 'accounts_ar', name: 'Accounts Receivable (AR)',
        sections: [
          { id: 'accounts_ar_invoice', name: 'Invoice' },
          { id: 'accounts_ar_payment', name: 'Receive Payment' },
          { id: 'accounts_ar_credit', name: 'Credit Note' },
        ],
      },
      {
        id: 'accounts_ap', name: 'Accounts Payable (AP)',
        sections: [
          { id: 'accounts_ap_invoice', name: 'Invoice' },
          { id: 'accounts_ap_payment', name: 'Receive Payment' },
          { id: 'accounts_ap_credit', name: 'Credit Note' },
        ],
      },
      {
        id: 'accounts_reports', name: 'Reports',
        sections: [
          { id: 'accounts_reports_list', name: 'รายการรายงาน' },
        ],
      },
    ],
  },

  // --- รายงาน (Reports) ---
  {
    id: 'reports', name: 'รายงาน', path: '/reports',
    subPages: [
      {
        id: 'reports_create', name: 'สร้างรายงาน',
        sections: [
          { id: 'reports_create_btn', name: 'ปุ่มสร้างรายงาน' },
        ],
      },
      {
        id: 'reports_list', name: 'รายการรายงาน',
        sections: [
          { id: 'reports_list_cards', name: 'การ์ดรายงาน' },
        ],
      },
    ],
  },

  // --- จัดซื้อ (Procurement) ---
  {
    id: 'procurement', name: 'จัดซื้อ', path: '/procurement',
    subPages: [
      {
        id: 'procurement_dashboard', name: 'Dashboard',
        sections: [
          { id: 'procurement_dashboard_total', name: 'ยอดสั่งซื้อ' },
          { id: 'procurement_dashboard_orders', name: 'จำนวน PR/PO' },
          { id: 'procurement_dashboard_receiving', name: 'การรับสินค้า' },
        ],
      },
      {
        id: 'procurement_pr', name: 'Purchase Requisition (PR)',
        sections: [
          { id: 'procurement_pr_search', name: 'ค้นหาใบขอซื้อ' },
          { id: 'procurement_pr_table', name: 'ตาราง PR' },
        ],
      },
      {
        id: 'procurement_po', name: 'Purchase Order (PO)',
        sections: [
          { id: 'procurement_po_search', name: 'ค้นหาใบสั่งซื้อ' },
          { id: 'procurement_po_table', name: 'ตาราง PO' },
        ],
      },
      {
        id: 'procurement_recv', name: 'Receiving',
        sections: [
          { id: 'procurement_recv_search', name: 'ค้นหารายการรับสินค้า' },
          { id: 'procurement_recv_table', name: 'ตารางรับสินค้าเข้าคลัง' },
        ],
      },
    ],
  },

  // --- บุคลากร (Human Resources) ---
  {
    id: 'hr', name: 'บุคลากร', path: '/hr',
    subPages: [
      {
        id: 'hr_dashboard', name: 'HR Dashboard',
        sections: [
          { id: 'hr_dashboard_total', name: 'พนักงานทั้งหมด' },
          { id: 'hr_dashboard_attendance', name: 'การมาทำงาน' },
          { id: 'hr_dashboard_leave', name: 'ลาพักร้อน/ลาป่วย' },
        ],
      },
      {
        id: 'hr_attendance', name: 'Attendance & Work History',
        sections: [
          { id: 'hr_attendance_search', name: 'ค้นหาเวลาทำงาน' },
          { id: 'hr_attendance_table', name: 'ตารางเวลาทำงาน' },
        ],
      },
      {
        id: 'hr_profile', name: 'Employee Profile',
        sections: [
          { id: 'hr_profile_search', name: 'ค้นหาพนักงาน' },
          { id: 'hr_profile_table', name: 'ตารางประวัติพนักงาน' },
        ],
      },
    ],
  },

  // --- ตรวจสอบคุณภาพ (Quality Control) ---
  {
    id: 'qc', name: 'ตรวจสอบคุณภาพ', path: '/qc',
    subPages: [
      {
        id: 'qc_dashboard', name: 'QC Dashboard',
        sections: [
          { id: 'qc_dashboard_total', name: 'รายการตรวจทั้งหมด' },
          { id: 'qc_dashboard_passed', name: 'ผ่านการตรวจ' },
          { id: 'qc_dashboard_failed', name: 'ไม่ผ่านการตรวจ' },
          { id: 'qc_dashboard_pending', name: 'รอตรวจสอบ' },
        ],
      },
      {
        id: 'qc_incoming', name: 'QC Incoming (วัตถุดิบเข้า)',
        sections: [
          { id: 'qc_incoming_search', name: 'ค้นหา' },
          { id: 'qc_incoming_table', name: 'ตารางวัตถุดิบเข้า' },
        ],
      },
      {
        id: 'qc_inprocess', name: 'QC In-Process (ระหว่างผลิต)',
        sections: [
          { id: 'qc_inprocess_search', name: 'ค้นหา' },
          { id: 'qc_inprocess_table', name: 'ตารางระหว่างผลิต' },
        ],
      },
      {
        id: 'qc_final', name: 'QC Final (ก่อนบรรจุ)',
        sections: [
          { id: 'qc_final_search', name: 'ค้นหา' },
          { id: 'qc_final_table', name: 'ตารางก่อนบรรจุ' },
        ],
      },
      {
        id: 'qc_defect', name: 'Defect / NCR',
        sections: [
          { id: 'qc_defect_search', name: 'ค้นหา' },
          { id: 'qc_defect_table', name: 'ตารางของเสีย' },
        ],
      },
      {
        id: 'qc_formula_lab', name: 'QC/Lab ทดสอบสูตร',
        sections: [
          { id: 'qc_formula_lab_list', name: 'รายการทดสอบสูตร' },
        ],
      },
      {
        id: 'qc_reports', name: 'Reports',
        sections: [
          { id: 'qc_reports_list', name: 'รายงานคุณภาพ' },
        ],
      },
    ],
  },

  // --- ตั้งค่า (Settings) ---
  {
    id: 'settings', name: 'ตั้งค่า', path: '/settings',
    subPages: [
      {
        id: 'settings_user', name: 'ข้อมูลผู้ใช้',
        sections: [
          { id: 'settings_user_info', name: 'ข้อมูลส่วนตัว' },
        ],
      },
    ],
  },

  // --- วางแผนการผลิต (Planning) ---
  {
    id: 'planning', name: 'วางแผนการผลิต', path: '/planning',
    subPages: [
      {
        id: 'planning_overview', name: 'Planning Overview',
        sections: [
          { id: 'planning_overview_stats', name: 'สถิติแผนการผลิต' },
        ],
      },
      {
        id: 'planning_list', name: 'Production Plan List',
        sections: [
          { id: 'planning_list_search', name: 'ค้นหาและตัวกรอง' },
          { id: 'planning_list_table', name: 'ตารางแผนการผลิต' },
          { id: 'planning_list_action', name: 'จัดการแผนการผลิต (Create/Edit)' },
        ],
      },
      {
        id: 'planning_materials', name: 'Material Requirement',
        sections: [
          { id: 'planning_materials_summary', name: 'สรุปความต้องการวัตถุดิบ' },
        ],
      },
      {
        id: 'planning_gantt', name: 'Gantt / Timeline',
        sections: [
          { id: 'planning_gantt_chart', name: 'แผนภูมิการผลิต' },
        ],
      },
    ],
  },

  // --- ฝ่ายผลิต (Production Operator) ---
  {
    id: 'operator', name: 'ฝ่ายผลิต', path: '/operator',
    subPages: [
      {
        id: 'operator_dashboard', name: 'งานของฉัน',
        sections: [
          { id: 'operator_dashboard_tasks', name: 'งานที่ต้องรับผิดชอบ' },
          { id: 'operator_dashboard_status', name: 'อัปเดตสถานะการผลิต' },
        ],
      },
      {
        id: 'operator_history', name: 'ประวัติการผลิต',
        sections: [
          { id: 'operator_history_search', name: 'ค้นหาประวัติ' },
          { id: 'operator_history_table', name: 'ตารางประวัติการผลิต' },
        ],
      },
    ],
  },

  // --- วิจัยและพัฒนา (Research & Development) ---
  {
    id: 'rnd', name: 'วิจัยและพัฒนา', path: '/rnd',
    subPages: [
      {
        id: 'rnd_dashboard', name: 'R&D Dashboard',
        sections: [
          { id: 'rnd_dashboard_stats', name: 'สถิติโครงการวิจัย' },
          { id: 'rnd_dashboard_recent', name: 'การทดลองล่าสุด' },
        ],
      },
      {
        id: 'rnd_formulas', name: 'สูตรการผลิต (BOM)',
        sections: [
          { id: 'rnd_formulas_search', name: 'ค้นหาสูตร' },
          { id: 'rnd_formulas_table', name: 'ตารางสูตรการผลิต' },
          { id: 'rnd_formulas_action', name: 'จัดการสูตร (Create/Edit)' },
        ],
      },
      {
        id: 'rnd_projects', name: 'โครงการวิจัย',
        sections: [
          { id: 'rnd_projects_search', name: 'ค้นหาโครงการ' },
          { id: 'rnd_projects_table', name: 'ตารางโครงการวิจัย' },
        ],
      },
      {
        id: 'rnd_pharmacist', name: 'เภสัชกร',
        sections: [
          { id: 'rnd_pharmacist_approve', name: 'อนุมัติสูตรโดยเภสัชกร' },
        ],
      },
    ],
  },


  // --- ฝ่ายจัดส่งและกระจายสินค้า (Fulfillment & Shipping) ---
  {
    id: 'fulfillment', name: 'ฝ่ายจัดส่ง (Shipping)', path: '/fulfillment',
    subPages: [
      {
        id: 'fulfillment_dashboard', name: 'Shipping Dashboard',
        sections: [
          { id: 'fulfillment_dashboard_stats', name: 'สถิติการจัดส่ง' },
        ],
      },
      {
        id: 'fulfillment_orders', name: 'รายการแพ็คจัดส่ง',
        sections: [
          { id: 'fulfillment_orders_table', name: 'ตารางรอแพ็คและจัดส่ง' },
          { id: 'fulfillment_orders_action', name: 'จัดการแพ็คสินค้า / พิมพ์ปะหน้า' },
        ],
      },
    ],
  },

  // --- บรรจุภัณฑ์โรงงาน (Production Packaging) ---
  {
    id: 'packaging', name: 'บรรจุภัณฑ์', path: '/packaging',
    subPages: [
      {
        id: 'packaging_main', name: 'Packaging',
        sections: [
          { id: 'packaging_main_stats', name: 'สถิติการบรรจุ' },
          { id: 'packaging_main_orders', name: 'คำสั่งบรรจุ' },
        ],
      },
      {
        id: 'packaging_materials', name: 'วัสดุบรรจุภัณฑ์',
        sections: [
          { id: 'packaging_materials_table', name: 'ตารางวัสดุคงเหลือ' },
        ],
      },
    ],
  },

  // --- ควบคุมเอกสาร (Document Control) ---
  {
    id: 'document', name: 'ควบคุมเอกสาร', path: '/document',
    subPages: [
      {
        id: 'document_dashboard', name: 'Document Dashboard',
        sections: [
          { id: 'document_dashboard_stats', name: 'สถิติเอกสาร' },
          { id: 'document_dashboard_recent', name: 'เอกสารอัปเดตล่าสุด' },
        ],
      },
      {
        id: 'document_list', name: 'รายการเอกสาร (Master List)',
        sections: [
          { id: 'document_list_search', name: 'ค้นหาเอกสาร' },
          { id: 'document_list_table', name: 'ตารางรายชื่อเอกสาร' },
        ],
      },
      {
        id: 'document_forms', name: 'แบบฟอร์มเอกสาร (Form)',
        sections: [
          { id: 'document_forms_search', name: 'ค้นหาแบบฟอร์ม' },
          { id: 'document_forms_table', name: 'ตารางแบบฟอร์ม' },
        ],
      },
      {
        id: 'document_request', name: 'ใบคำร้องเอกสาร (DAR)',
        sections: [
          { id: 'document_request_search', name: 'ค้นหาใบคำร้อง' },
          { id: 'document_request_table', name: 'ตารางใบคำร้อง' },
          { id: 'document_request_action', name: 'สร้างใบคำร้องใหม่' },
        ],
      },
      {
        id: 'document_library', name: 'คลังเอกสาร (Document Library)',
        sections: [
          { id: 'document_library_upload', name: 'อัปโหลดเอกสาร' },
          { id: 'document_library_table', name: 'ตารางคลังเอกสาร' },
          { id: 'document_library_delete', name: 'ลบเอกสาร' },
        ],
      },
      {
        id: 'document_customers', name: 'เอกสารข้อมูลลูกค้า',
        sections: [
          { id: 'document_customers_form', name: 'ฟอร์มข้อมูลลูกค้า' },
        ],
      },
    ],
  },
];

// =============================================================================
// 3. ฟังก์ชันช่วยเหลือด้าน Permission (Permission Helpers)
// =============================================================================

/**
 * รวบรวม IDs ทั้งหมดจาก page ที่ระบุ (รวม subPages + sections)
 * ใช้ในการกำหนดสิทธิ์เริ่มต้นให้ user
 *
 * @param {Object} page - page object จาก ALL_PAGES
 * @returns {string[]} - array ของ IDs ทั้งหมด (page + subPages + sections)
 */
const collectAllIdsFromPage = (page) => {
  const ids = [page.id];
  page.subPages?.forEach((sub) => {
    ids.push(sub.id);
    sub.sections?.forEach((sec) => ids.push(sec.id));
  });
  return ids;
};

/**
 * ดึง ID ทุกตัวจากทุกหน้าในระบบ (pages + subPages + sections)
 * ใช้สำหรับกำหนดสิทธิ์ "เข้าถึงทุกอย่าง" ให้กับ admin / executive
 *
 * @returns {string[]} - array ของ IDs ทั้งหมดในระบบ
 */
export const getAllPermissionIds = () => {
  return ALL_PAGES.flatMap(collectAllIdsFromPage);
};

/**
 * สร้างสิทธิ์เริ่มต้นสำหรับผู้ใช้แต่ละคน
 *
 * กฎ:
 *   - admin, executive : เข้าถึงทุกหน้า
 *   - user ทั่วไป       : เข้าถึงเฉพาะ "หน้าหลัก"
 *   - qc               : เข้าถึง "หน้าหลัก" + "ตรวจสอบคุณภาพ"
 *   - sales            : เข้าถึง "หน้าหลัก" + "ฝ่ายขาย"
 *   - accountant       : เข้าถึง "หน้าหลัก" + "บัญชี"
 *   - procurement      : เข้าถึง "หน้าหลัก" + "จัดซื้อ"
 *   - hr               : เข้าถึง "หน้าหลัก" + "บุคลากร"
 *
 * @returns {Object} - { userId: [permissionIds...] }
 */
export const getDefaultPermissions = () => {
  const allIds = getAllPermissionIds();

  /** ดึง IDs ทั้งหมดของ page ที่ระบุ */
  const getPageIds = (pageId) => {
    const page = ALL_PAGES.find((p) => p.id === pageId);
    return page ? collectAllIdsFromPage(page) : [];
  };

  const homeIds = getPageIds('home');
  const customerIds = getPageIds('customer');
  const qcIds = getPageIds('qc');
  const salesIds = getPageIds('sales');
  const accountsIds = getPageIds('accounts');
  const procIds = getPageIds('procurement');
  const hrIds = getPageIds('hr');
  const stockIds = getPageIds('stock');
  const planningIds = getPageIds('planning');
  const operatorIds = getPageIds('operator');
  const rndIds = getPageIds('rnd');
  const packagingIds = getPageIds('packaging');
  const documentIds = getPageIds('document');
  const fulfillmentIds = getPageIds('fulfillment');

  return {
    it_admin: allIds,                           // admin — เข้าถึงทุกหน้า
    exec: allIds,                           // executive — เข้าถึงทุกหน้า
    qc1: [...homeIds, ...qcIds],           // qc — หน้าหลัก + QC
    sales1: [...homeIds, ...salesIds, ...customerIds, ...fulfillmentIds], // sales — หน้าหลัก + ฝ่ายขาย + จัดส่ง
    acc1: [...homeIds, ...accountsIds, ...customerIds],      // accountant — หน้าหลัก + บัญชี
    proc1: [...homeIds, ...procIds],          // procurement — หน้าหลัก + จัดซื้อ
    hr1: [...homeIds, ...hrIds],            // hr — หน้าหลัก + บุคลากร
    stock1: [...homeIds, ...stockIds, ...fulfillmentIds],     // stock — หน้าหลัก + คลังสินค้า + จัดส่ง
    plan1: [...homeIds, ...planningIds],         // planner - หน้าหลัก + วางแผนการผลิต
    op1: [...homeIds, ...operatorIds],          // operator - หน้าหลัก + ฝ่ายผลิต
    rnd1: [...homeIds, ...rndIds],              // rnd - หน้าหลัก + วิจัยและพัฒนา
    pkg1: [...homeIds, ...packagingIds],         // packaging - หน้าหลัก + บรรจุภัณฑ์
    doc1: [...homeIds, ...documentIds],          // document_control - หน้าหลัก + ควบคุมเอกสาร
  };
};

// =============================================================================
// 4. ข้อมูลจำลอง — คลังสินค้า (Stock)
// =============================================================================

export const MOCK_STOCK = [
  { id: 1, name: 'Laptop Dell XPS 15', category: 'อุปกรณ์อิเล็กทรอนิกส์', qty: 25, price: 45000, status: 'มีสินค้า' },
  { id: 2, name: 'iPhone 15 Pro', category: 'อุปกรณ์อิเล็กทรอนิกส์', qty: 50, price: 42900, status: 'มีสินค้า' },
  { id: 3, name: 'โต๊ะทำงาน', category: 'เฟอร์นิเจอร์', qty: 10, price: 8500, status: 'สินค้าเหลือน้อย' },
  { id: 4, name: 'เก้าอี้สำนักงาน', category: 'เฟอร์นิเจอร์', qty: 0, price: 12000, status: 'สินค้าหมด' },
  { id: 5, name: 'จอภาพ 27 นิ้ว', category: 'อุปกรณ์อิเล็กทรอนิกส์', qty: 30, price: 15000, status: 'มีสินค้า' },
  { id: 6, name: 'คีย์บอร์ด Mechanical', category: 'อุปกรณ์เสริม', qty: 100, price: 3500, status: 'มีสินค้า' },
  { id: 7, name: 'เมาส์ไร้สาย', category: 'อุปกรณ์เสริม', qty: 5, price: 1200, status: 'สินค้าเหลือน้อย' },
  { id: 8, name: 'เครื่องพิมพ์เลเซอร์', category: 'อุปกรณ์อิเล็กทรอนิกส์', qty: 8, price: 18000, status: 'มีสินค้า' },
];

// ประวัติเข้า-ออก คลังสินค้า (Stock Logs)
// type: 'IN' (รับเข้า), 'OUT' (เบิกจ่าย)
export const MOCK_STOCK_LOGS = [
  { id: 1, date: '2026-03-05 10:30', type: 'IN', item: 'Laptop Dell XPS 15', qty: 10, ref: 'REC-2026-001', user: 'stock1', note: 'รับเข้าจาก PO-2026-001' },
  { id: 2, date: '2026-03-05 14:15', type: 'OUT', item: 'โต๊ะทำงาน', qty: 2, ref: 'SO-2026-003', user: 'stock1', note: 'เบิกจ่ายให้ลูกค้า' },
  { id: 3, date: '2026-03-06 09:00', type: 'IN', item: 'กระดาษ A4', qty: 50, ref: 'REC-2026-002', user: 'stock1', note: 'รับเข้าบางส่วนขาด 10 กล่อง' },
  { id: 4, date: '2026-03-06 11:20', type: 'OUT', item: 'คีย์บอร์ด Mechanical', qty: 5, ref: 'REQ-IT-001', user: 'stock1', note: 'เบิกใช้ภายในแผนก' },
];

// =============================================================================
// 5. ข้อมูลจำลอง — ฝ่ายขาย (Sales Department)
// =============================================================================

// 5a. ลูกค้า (Customers)
export const MOCK_CUSTOMERS = [
  { id: 1, name: 'บริษัท ABC จำกัด', contact: 'คุณสมชาย', phone: '02-111-1111', email: 'abc@company.com', type: 'OEM', status: 'ใช้งาน' },
  { id: 2, name: 'ร้าน XYZ', contact: 'คุณสมหญิง', phone: '02-222-2222', email: 'xyz@shop.com', type: 'ตัวแทนจำหน่าย', status: 'ใช้งาน' },
  { id: 3, name: 'บริษัท DEF จำกัด', contact: 'คุณวิชัย', phone: '02-333-3333', email: 'def@company.com', type: 'OEM', status: 'ใช้งาน' },
  { id: 4, name: 'หน่วยงาน GHI', contact: 'คุณประยุทธ์', phone: '02-444-4444', email: 'ghi@org.com', type: 'หน่วยงานราชการ', status: 'ระงับ' },
  { id: 5, name: 'บริษัท JKL จำกัด', contact: 'คุณจิราพร', phone: '02-555-5555', email: 'jkl@company.com', type: 'ขายปลีก', status: 'ใช้งาน' },
  { id: 6, name: 'ร้าน MNO', contact: 'คุณมานะ', phone: '02-666-6666', email: 'mno@shop.com', type: 'ตัวแทนจำหน่าย', status: 'ใช้งาน' },
];

// 5b. ใบเสนอราคา (Quotations)
// status: 'ร่าง', 'ส่งแล้ว', 'อนุมัติ', 'ปฏิเสธ'
export const MOCK_QUOTATIONS = [
  { id: 1, number: 'QT-2026-001', customer: 'บริษัท ABC จำกัด', items: 3, total: 350000, date: '2026-03-01', validUntil: '2026-03-31', status: 'อนุมัติ' },
  { id: 2, number: 'QT-2026-002', customer: 'ร้าน XYZ', items: 5, total: 120000, date: '2026-03-02', validUntil: '2026-04-01', status: 'ส่งแล้ว' },
  { id: 3, number: 'QT-2026-003', customer: 'บริษัท DEF จำกัด', items: 2, total: 580000, date: '2026-03-03', validUntil: '2026-04-02', status: 'ร่าง' },
  { id: 4, number: 'QT-2026-004', customer: 'หน่วยงาน GHI', items: 8, total: 95000, date: '2026-02-15', validUntil: '2026-03-15', status: 'ปฏิเสธ' },
  { id: 5, number: 'QT-2026-005', customer: 'บริษัท JKL จำกัด', items: 1, total: 200000, date: '2026-03-04', validUntil: '2026-04-03', status: 'อนุมัติ' },
];

// 5c. คำสั่งซื้อ (Sales Orders)
// status: 'รอดำเนินการ', 'กำลังดำเนินการ', 'จัดส่งแล้ว', 'เสร็จสิ้น'
export const MOCK_SALES_ORDERS = [
  { id: 1, number: 'SO-2026-001', customer: 'บริษัท ABC จำกัด', product: 'Laptop Dell XPS 15', qty: 5, total: 225000, date: '2026-02-15', status: 'เสร็จสิ้น' },
  { id: 2, number: 'SO-2026-002', customer: 'ร้าน XYZ', product: 'iPhone 15 Pro', qty: 10, total: 429000, date: '2026-02-14', status: 'กำลังดำเนินการ' },
  { id: 3, number: 'SO-2026-003', customer: 'บริษัท DEF จำกัด', product: 'จอภาพ 27 นิ้ว', qty: 20, total: 300000, date: '2026-02-13', status: 'เสร็จสิ้น' },
  { id: 4, number: 'SO-2026-004', customer: 'หน่วยงาน GHI', product: 'โต๊ะทำงาน', qty: 15, total: 127500, date: '2026-02-12', status: 'จัดส่งแล้ว' },
  { id: 5, number: 'SO-2026-005', customer: 'บริษัท JKL จำกัด', product: 'เก้าอี้สำนักงาน', qty: 30, total: 360000, date: '2026-02-11', status: 'รอดำเนินการ' },
  { id: 6, number: 'SO-2026-006', customer: 'ร้าน MNO', product: 'คีย์บอร์ด Mechanical', qty: 50, total: 175000, date: '2026-02-10', status: 'เสร็จสิ้น' },
];

// =============================================================================
// 5d. ข้อมูลจำลอง — บัญชี (Accounts)
// =============================================================================

// ลูกหนี้การค้า — Accounts Receivable (AR)
// docType: 'invoice', 'payment', 'credit_note'
export const MOCK_AR = [
  { id: 1, number: 'INV-2026-001', customer: 'บริษัท ABC จำกัด', amount: 225000, date: '2026-02-15', dueDate: '2026-03-15', docType: 'invoice', status: 'ชำระแล้ว' },
  { id: 2, number: 'INV-2026-002', customer: 'ร้าน XYZ', amount: 429000, date: '2026-02-14', dueDate: '2026-03-14', docType: 'invoice', status: 'ค้างชำระ' },
  { id: 3, number: 'INV-2026-003', customer: 'บริษัท DEF จำกัด', amount: 300000, date: '2026-02-13', dueDate: '2026-03-13', docType: 'invoice', status: 'ชำระแล้ว' },
  { id: 4, number: 'RCV-2026-001', customer: 'บริษัท ABC จำกัด', amount: 225000, date: '2026-03-10', dueDate: null, docType: 'payment', status: 'สำเร็จ' },
  { id: 5, number: 'RCV-2026-002', customer: 'บริษัท DEF จำกัด', amount: 300000, date: '2026-03-12', dueDate: null, docType: 'payment', status: 'สำเร็จ' },
  { id: 6, number: 'CN-2026-001', customer: 'ร้าน XYZ', amount: -15000, date: '2026-03-05', dueDate: null, docType: 'credit_note', status: 'อนุมัติ' },
];

// เจ้าหนี้การค้า — Accounts Payable (AP)
export const MOCK_AP = [
  { id: 1, number: 'BILL-2026-001', supplier: 'บริษัท ซัพพลาย จำกัด', amount: 180000, date: '2026-02-10', dueDate: '2026-03-10', docType: 'invoice', status: 'ชำระแล้ว' },
  { id: 2, number: 'BILL-2026-002', supplier: 'ร้านวัตถุดิบ ABC', amount: 95000, date: '2026-02-18', dueDate: '2026-03-18', docType: 'invoice', status: 'ค้างชำระ' },
  { id: 3, number: 'BILL-2026-003', supplier: 'บริษัท บรรจุภัณฑ์ไทย จำกัด', amount: 42000, date: '2026-02-20', dueDate: '2026-03-20', docType: 'invoice', status: 'ค้างชำระ' },
  { id: 4, number: 'PAY-2026-001', supplier: 'บริษัท ซัพพลาย จำกัด', amount: 180000, date: '2026-03-08', dueDate: null, docType: 'payment', status: 'สำเร็จ' },
  { id: 5, number: 'DCN-2026-001', supplier: 'ร้านวัตถุดิบ ABC', amount: -5000, date: '2026-03-01', dueDate: null, docType: 'credit_note', status: 'อนุมัติ' },
];

// =============================================================================
// 6. ข้อมูลจำลอง — จัดซื้อ (Procurement)
// =============================================================================

// ใบขอซื้อ (Purchase Requisition - PR)
// status: 'รออนุมัติ', 'อนุมัติแล้ว', 'ไม่อนุมัติ', 'สั่งซื้อแล้ว'
export const MOCK_PR = [
  { id: 1, number: 'PR-2026-001', requestor: 'สมชาย ใจดี', department: 'ฝ่ายไอที', item: 'Server Rack', qty: 2, estimatedPrice: 150000, date: '2026-03-01', status: 'สั่งซื้อแล้ว' },
  { id: 2, number: 'PR-2026-002', requestor: 'สมหญิง รักเรียน', department: 'ฝ่ายการตลาด', item: 'ชุดของพรีเมี่ยม', qty: 500, estimatedPrice: 45000, date: '2026-03-03', status: 'อนุมัติแล้ว' },
  { id: 3, number: 'PR-2026-003', requestor: 'สมศักดิ์ มั่นคง', department: 'ฝ่ายบัญชี', item: 'เครื่องพิมพ์เอกสาร', qty: 1, estimatedPrice: 25000, date: '2026-03-05', status: 'รออนุมัติ' },
  { id: 4, number: 'PR-2026-004', requestor: 'สมใจ สุขใจ', department: 'ฝ่ายบุคคล', item: 'เก้าอี้สำนักงาน', qty: 5, estimatedPrice: 15000, date: '2026-03-06', status: 'รออนุมัติ' },
];

// ใบสั่งซื้อ (Purchase Order - PO)
// status: 'รอเตรียมจัดส่ง', 'กำลังจัดส่ง', 'รับสินค้าแล้ว', 'ยกเลิก'
export const MOCK_PO = [
  { id: 1, number: 'PO-2026-001', prNumber: 'PR-2026-001', supplier: 'IT Vendor Co.,Ltd', item: 'Server Rack', qty: 2, total: 148000, date: '2026-03-02', status: 'รับสินค้าแล้ว' },
  { id: 2, number: 'PO-2026-002', prNumber: 'PR-2026-002', supplier: 'Gift Maker', item: 'ชุดของพรีเมี่ยม', qty: 500, total: 42500, date: '2026-03-04', status: 'กำลังจัดส่ง' },
  { id: 3, number: 'PO-2026-003', prNumber: null, supplier: 'Office Supply', item: 'กระดาษ A4', qty: 100, total: 12000, date: '2026-02-28', status: 'รับสินค้าแล้ว' },
];

// รายการรับสินค้า (Receiving - RECV)
// status: 'ครบถ้วน', 'ไม่ครบ', 'ตีกลับ'
export const MOCK_RECV = [
  { id: 1, number: 'REC-2026-001', poNumber: 'PO-2026-001', supplier: 'IT Vendor Co.,Ltd', date: '2026-03-05', receivedBy: 'พนักงานจัดซื้อ', status: 'ครบถ้วน', note: '-' },
  { id: 2, number: 'REC-2026-002', poNumber: 'PO-2026-003', supplier: 'Office Supply', date: '2026-03-01', receivedBy: 'พนักงานจัดซื้อ', status: 'ไม่ครบ', note: 'ขาด 10 กล่อง' },
];

// =============================================================================
// 7. ข้อมูลจำลอง — บุคลากร (Employees)
// =============================================================================

export const MOCK_EMPLOYEES = [
  { id: 1, name: 'สมชาย ใจดี', position: 'วิศวกรซอฟต์แวร์', department: 'ฝ่ายไอที', salary: 55000, status: 'ปฏิบัติงาน', joinDate: '2023-01-15' },
  { id: 2, name: 'สมหญิง รักเรียน', position: 'ผู้จัดการฝ่ายการตลาด', department: 'ฝ่ายการตลาด', salary: 65000, status: 'ปฏิบัติงาน', joinDate: '2022-06-01' },
  { id: 3, name: 'สมศักดิ์ มั่นคง', position: 'นักบัญชี', department: 'ฝ่ายการเงิน', salary: 45000, status: 'ปฏิบัติงาน', joinDate: '2024-03-10' },
  { id: 4, name: 'สมใจ สุขใจ', position: 'เจ้าหน้าที่ทรัพยากรบุคคล', department: 'ฝ่ายบุคคล', salary: 42000, status: 'ลาพักร้อน', joinDate: '2023-08-20' },
  { id: 5, name: 'สมบูรณ์ ศรีสุข', position: 'เจ้าหน้าที่ฝ่ายขาย', department: 'ฝ่ายขาย', salary: 38000, status: 'ปฏิบัติงาน', joinDate: '2025-01-05' },
  { id: 6, name: 'สมปอง ดีใจ', position: 'วิศวกรระบบ', department: 'ฝ่ายไอที', salary: 60000, status: 'ปฏิบัติงาน', joinDate: '2022-11-15' },
];

// =============================================================================
// 7a. ข้อมูลจำลอง — เวลาทำงาน (Attendance)
// =============================================================================
// status: 'ปกติ', 'สาย', 'ขาด', 'ลา'
export const MOCK_ATTENDANCE = [
  { id: 1, empName: 'สมชาย ใจดี', date: '2026-03-06', checkIn: '08:45', checkOut: '17:30', status: 'ปกติ', note: '-' },
  { id: 2, empName: 'สมหญิง รักเรียน', date: '2026-03-06', checkIn: '09:15', checkOut: '18:00', status: 'สาย', note: '-' },
  { id: 3, empName: 'สมศักดิ์ มั่นคง', date: '2026-03-06', checkIn: '08:50', checkOut: '17:45', status: 'ปกติ', note: '-' },
  { id: 4, empName: 'สมใจ สุขใจ', date: '2026-03-06', checkIn: '-', checkOut: '-', status: 'ลา', note: 'ลาพักร้อน' },
  { id: 5, empName: 'สมบูรณ์ ศรีสุข', date: '2026-03-06', checkIn: '08:30', checkOut: '17:20', status: 'ปกติ', note: '-' },
];

// =============================================================================
// 8. ข้อมูลจำลอง — ตรวจสอบคุณภาพ (QC)
// =============================================================================
// result ที่ใช้: 'ผ่าน', 'ไม่ผ่าน', 'รอตรวจสอบ'

export const MOCK_QC_INCOMING = [
  { id: 1, lotNumber: 'IN-2026-001', item: 'จอภาพ 27 นิ้ว (ชิ้นส่วน)', supplier: 'IT Vendor', date: '2026-03-05', inspector: 'qc1', result: 'ผ่าน', notes: 'สภาพสมบูรณ์' },
  { id: 2, lotNumber: 'IN-2026-002', item: 'อะไหล่คีย์บอร์ด', supplier: 'KB Parts Co.', date: '2026-03-06', inspector: 'qc1', result: 'ไม่ผ่าน', notes: 'พบสนิมที่ขั้วเชื่อม 10%' },
];

export const MOCK_QC_INPROCESS = [
  { id: 1, lotNumber: 'PRC-2026-001', process: 'ประกอบจอภาพ', line: 'A1', date: '2026-03-05', inspector: 'qc1', result: 'ผ่าน', notes: 'ค่าความสว่างอยู่ในเกณฑ์' },
  { id: 2, lotNumber: 'PRC-2026-002', process: 'ทดสอบระบบไฟ', line: 'B2', date: '2026-03-06', inspector: 'qc1', result: 'รอตรวจสอบ', notes: 'รอผลเทสความร้อน' },
];

export const MOCK_QC_FINAL = [
  { id: 1, lotNumber: 'FIN-2026-001', product: 'Laptop Dell XPS 15', qty: 10, date: '2026-03-06', inspector: 'qc1', result: 'ผ่าน', notes: 'พร้อมส่งมอบ' },
  { id: 2, lotNumber: 'FIN-2026-002', product: 'โต๊ะทำงาน', qty: 5, date: '2026-03-06', inspector: 'qc1', result: 'ไม่ผ่าน', notes: 'มีรอยขีดข่วน 1 ตัว' },
];

export const MOCK_QC_DEFECT = [
  { id: 1, ncrNumber: 'NCR-2026-001', refLot: 'IN-2026-002', item: 'อะไหล่คีย์บอร์ด', issue: 'สนิมที่ขั้วเชื่อม', action: 'ส่งคืน Supplier', status: 'ดำเนินการแล้ว' },
  { id: 2, ncrNumber: 'NCR-2026-002', refLot: 'FIN-2026-002', item: 'โต๊ะทำงาน', issue: 'รอยขีดข่วนหน้าโต๊ะ', action: 'ซ่อมแซม/ขัดสีใหม่', status: 'รอดำเนินการ' },
];

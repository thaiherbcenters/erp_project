# Implementation of Planner and Operator Roles

## What Was Done

We successfully added two new user roles, pages, and mock data to the ERP application:

1.  **New Roles Added (mockData.js, Layout.jsx)**
    *   `planner` (ผู้วางแผนการผลิต)
    *   `operator` (พนักงานฝ่ายผลิต)
2.  **Navigation and Icons Updated (Layout.jsx)**
    *   Added a new "การผลิต" (Production) section to the side navigation.
    *   Mapped new icons: `CalendarDays` for Planning, and `Wrench` for Operator.
3.  **Pages Created (App.jsx, Planning.jsx, Operator.jsx)**
    *   Created `Planning.jsx` page with:
        *   Planning Overview (Mock stats and graphs)
        *   Production Plan List (Table with mock data, status indicators, and progress bars)
        *   Material Requirement (Placeholder)
        *   Gantt / Timeline (Placeholder)
        *   QC & Production Link (Placeholder)
    *   Created `Operator.jsx` page with:
        *   Dashboard for operators to view tasks assigned to them.
        *   Buttons to update task status ("เริ่ม", "ปิดจ็อบ") which update the UI state.
    *   Added Protected Routes for `/planning` and `/operator` in the `App.jsx` routing configuration.

## How to Test

You can now log in using the newly created test accounts to verify the functionality:

**Test 1: Login as Planner**
*   **Username:** `plan1`
*   **Password:** `plan123`
*   **Verification:** You should see the "วางแผนการผลิต" menu in the sidebar. Clicking it should open the Planning dashboard with its 5 sub-tabs.

**Test 2: Login as Production Operator**
*   **Username:** `op1`
*   **Password:** `op123`
*   **Verification:** You should see the "ฝ่ายผลิต" menu in the sidebar. Clicking it should show the Operator dashboard with a list of tasks. You can click the "เริ่ม" or "ปิดจ็อบ" buttons to test the state updates.

**Test 3: Login as Admin to check Permissions Manager**
*   **Username:** `it_admin`
*   **Password:** `admin123`
*   **Verification:** Go to "จัดการสิทธิ์" (Permissions Manager) and select any user. You should now see the `วางแผนการผลิต` and `ฝ่ายผลิต` options in the permissions tree.

## PO Data Cleanup & Delete Action Fix
1. **Cleared Database PO Records**:
   - Removed the 3 test purchase orders (`PO-20260308-003`, `PO-20260305-002`, `PO-20260302-001`) and their items from MSSQL database tables `PurchaseOrder` and `PurchaseOrderItem`.
   - Verified row counts are now 0.
2. **Fixed PO Delete Button (`Procurement.jsx`)**:
   - Updated `handleDeletePO` to properly `await showConfirm(...)` modal response before executing `DELETE /api/purchase-orders/:id`.

## Removed Redundant "ดึงเลขที่ใหม่" Button (`PurchaseOrderForm.jsx`)
- Removed the reload button next to "เลขที่เอกสาร (PO No.)" since the PO sequence number is automatically generated and populated on initial form load.

## PO Signature Defaults Configuration (`PurchaseOrderForm.jsx`)
- ผู้อนุมัติเอกสาร (ผู้ซื้อ): กำหนดให้เป็นคุณธวัช จรุงพิรวงศ์ เสมอ (`KeyName: 'thawat'`) ไม่ว่าจะล็อกอินด้วยบัญชีใด
- ผู้ออกเอกสาร (ผู้ซื้อ): ดึงลายเซ็นของผู้ใช้ที่ล็อกอินอยู่ตามปกติ (`defaultSignerKey`)

## PO Document Preview Modal & Version Tracking (`Procurement.jsx` & `PurchaseOrderForm.jsx`)
1. **PO Document Preview Sheet**:
   - เมื่อกดไอคอนดวงตา (`<Eye />`) ในตารางใบสั่งซื้อ (PO) ระบบจะเปิดหน้าต่างพรีวิวเอกสารแบบป๊อปอัป (`.pdf-preview-overlay`) แสดงเอกสารใบสั่งซื้อขนาด A4 เสมือนจริง พร้อมเงาและจัดกึ่งกลาง (เหมือนหน้าใบเสนอราคา Quotation ในหน้าฝ่ายขาย)
   - แถบด้านบนของพรีวิวมีปุ่ม `[🖨️ พิมพ์]` (สั่งพิมพ์ A4 ผ่านเบราว์เซอร์ทันที), `[✏️ แก้ไข]` (สลับไปหน้าฟอร์มแก้ไข), และ `[✕ ปิด]`
2. **Version / Revision Tracking**:
   - เพิ่มคอลัมน์ `เวอร์ชั่น` ในตาราง PO (เช่น `v.0`, `v.1`, `v.2`)
   - ในตัวเอกสาร A4 พรีวิว แสดงเลขที่เอกสารพร้อมระบุเวอร์ชั่น เช่น `PO-20260910-001 (v.0)`
   - เมื่อมีการแก้ไขใบสั่งซื้อ (`PUT /api/purchase-orders/:id`):
     - ระบบจะสำรองข้อมูลเวอร์ชั่นเดิมลงในตาราง `PurchaseOrderHistory` และ `PurchaseOrderItemHistory`
     - เพิ่มเลข `Revision = COALESCE(Revision, 0) + 1` อัตโนมัติ
   - หาก PO มีเวอร์ชั่นมากกว่า 0 (`Revision > 0`) จะมีไอคอนนาฬิกาประวัติ (`<Clock />`) ให้กดดูรายการย้อนหลังแต่ละเวอร์ชั่น พร้อมกดดูตัวอย่างเอกสารเวอร์ชั่นนั้นๆ ได้ทันที

# Implementation of Planner and Operator Roles

## What Was Done

We successfully added two new user roles, pages, and mock data to the ERP application:

1.  **New Roles Added (mockData.js, Layout.jsx)**
    *   `planner` (ผู้วางแผนการผลิต)
    *   `operator` (พนักงานฝ่ายผลิต)
2.  **Navigation and Icons Updated (Layout.jsx)**
    *   Added a new "การผลิต" (Production) section to the side navigation.
    *   Mapped new icons: `CalendarDays` for Planning, and `Wrench` for Operator.
3.  **Pages Created (App.jsx, Planning.jsx, Operator.jsx)**
    *   Created `Planning.jsx` page with:
        *   Planning Overview (Mock stats and graphs)
        *   Production Plan List (Table with mock data, status indicators, and progress bars)
        *   Material Requirement (Placeholder)
        *   Gantt / Timeline (Placeholder)
        *   QC & Production Link (Placeholder)
    *   Created `Operator.jsx` page with:
        *   Dashboard for operators to view tasks assigned to them.
        *   Buttons to update task status ("เริ่ม", "ปิดจ็อบ") which update the UI state.
    *   Added Protected Routes for `/planning` and `/operator` in the `App.jsx` routing configuration.

## How to Test

You can now log in using the newly created test accounts to verify the functionality:

**Test 1: Login as Planner**
*   **Username:** `plan1`
*   **Password:** `plan123`
*   **Verification:** You should see the "วางแผนการผลิต" menu in the sidebar. Clicking it should open the Planning dashboard with its 5 sub-tabs.

**Test 2: Login as Production Operator**
*   **Username:** `op1`
*   **Password:** `op123`
*   **Verification:** You should see the "ฝ่ายผลิต" menu in the sidebar. Clicking it should show the Operator dashboard with a list of tasks. You can click the "เริ่ม" or "ปิดจ็อบ" buttons to test the state updates.

**Test 3: Login as Admin to check Permissions Manager**
*   **Username:** `it_admin`
*   **Password:** `admin123`
*   **Verification:** Go to "จัดการสิทธิ์" (Permissions Manager) and select any user. You should now see the `วางแผนการผลิต` and `ฝ่ายผลิต` options in the permissions tree.

## PO Data Cleanup & Delete Action Fix
1. **Cleared Database PO Records**:
   - Removed the 3 test purchase orders (`PO-20260308-003`, `PO-20260305-002`, `PO-20260302-001`) and their items from MSSQL database tables `PurchaseOrder` and `PurchaseOrderItem`.
   - Verified row counts are now 0.
2. **Fixed PO Delete Button (`Procurement.jsx`)**:
   - Updated `handleDeletePO` to properly `await showConfirm(...)` modal response before executing `DELETE /api/purchase-orders/:id`.

## Removed Redundant "ดึงเลขที่ใหม่" Button (`PurchaseOrderForm.jsx`)
- Removed the reload button next to "เลขที่เอกสาร (PO No.)" since the PO sequence number is automatically generated and populated on initial form load.

## PO Signature Defaults Configuration (`PurchaseOrderForm.jsx`)
1. **ผู้อนุมัติเอกสาร (ผู้ซื้อ) (approvedBy)**:
   - Always preset and default to **คุณธวัช จรุงพิรวงศ์** (`thawat`) ไม่ว่าจะเข้าใช้งานด้วย user ใดก็ตาม
2. **ผู้ออกเอกสาร (ผู้ซื้อ) (preparedBy)**:
   - แสดงลายเซ็นและชื่อของผู้ใช้ที่ล็อกอินอยู่ในปัจจุบันโดยอัตโนมัติ (ผ่าน `defaultSignerKey` และ `userSignatures`) ตามปกติเหมือนฟอร์มฝ่ายขาย
   - รองรับการแสดงผลรูปภาพลายเซ็นพรีวิวใต้ดรอปดาวน์ทันที

## Fix: Print Preview Blank White on Quotation & Sales Documents
- **Root Cause**: In `PurchaseOrderForm.css`, the `@media print` style had a global un-scoped rule `body * { visibility: hidden !important; }`. When bundled by Vite, this rule applied to ALL pages including Quotation, which hid the quotation document during printing.
- **Solution**:
  1. Scoped `PurchaseOrderForm.css` to `body:has(.po-print-container) *` so it strictly and only affects printing when a PO container is present.
  2. Added `visibility: visible !important;` to `#q-print-container` in all sales forms (`QuotationForm.jsx`, `BillingInvoiceForm.jsx`, `DeliveryOrderForm.jsx`, `TaxInvoiceForm.jsx`, `ReceiptForm.jsx`).

## Quotation Deposit Tracking & Billing Invoice Generation in Accounts (AR)
1. **Database Migration (`Quotation` table)**:
   - Added columns `DepositStatus NVARCHAR(50) DEFAULT N'รอมัดจำ'` and `PaidDepositAmount DECIMAL(18,2) DEFAULT 0` to record deposit payment state directly on quotation records.
2. **Backend API (`backend/routes/accounts.js`)**:
   - `GET /api/accounts/deposits`: ดึงรายการใบเสนอราคาที่มีการตั้งมัดจำ (`DepositAmount > 0` หรือ `DepositPercent <> '0'`), พร้อมคำนวณยอดสรุป (Total Grand Total, Total Deposit Required, Total Paid, Total Remaining, และจำนวนรายการตามสถานะ).
   - `PATCH /api/accounts/deposits/:id/status`: อัปเดตสถานะมัดจำ (`รอมัดจำ`, `ชำระมัดจำแล้ว`, `ชำระครบถ้วน`) และยอดเงินมัดจำที่ชำระแล้ว (`PaidDepositAmount`).
   - `GET /api/accounts/quotation-for-billing/:id`: ดึงหัวเอกสารและรายการสินค้าจากใบเสนอราคาเพื่อนำไปเปิดฟอร์มสร้างใบวางบิล/ใบแจ้งหนี้ พร้อมแนบหมายเลขอ้างอิงใบเสนอราคาลงในหมายเหตุโดยอัตโนมัติ.
3. **Frontend: Preloading into Billing Invoice (`BillingInvoiceForm.jsx`)**:
   - รองรับ prop `initialFromQuotation` เพื่อดึงข้อมูลลูกค้า, รายการสินค้า (จำนวน, ราคา, หน่วย, รูปภาพ, โปรโมชัน), เลขที่สัญญา, และหมายเหตุอ้างอิงใบเสนอราคามาแสดงในฟอร์มทันที.
4. **Frontend: Accounts Page (`Accounts.jsx`)**:
   - ในแท็บ **ลูกหนี้การค้า (AR)** เพิ่มระบบสลับมุมมอง:
     - `[ 💰 ติดตามเงินมัดจำจากใบเสนอราคา ]` (มุมมองหลัก)
     - `[ 📋 รายการลูกหนี้การค้าทั่วไป (AR Invoices) ]`
   - การ์ดสรุปยอดเงิน 4 ด้าน: ยอดมัดจำที่ต้องชำระ, ชำระมัดจำแล้ว, ยอดคงเหลือที่ต้องเรียกเก็บ, และมูลค่าใบเสนอราคารวม.
   - ตารางรายการมัดจำพร้อมปุ่ม **[📄 สร้างใบวางบิล]** เพื่อเปิดฟอร์มสร้างใบวางบิล/ใบแจ้งหนี้เพื่อเรียกเก็บเงินส่วนที่เหลือได้ทันที.
   - ปุ่ม **[✏️]** เพื่อเปิด Modal บันทึกการชำระเงินมัดจำและปรับปรุงสถานะ (`รอมัดจำ` / `ชำระมัดจำแล้ว` / `ชำระครบถ้วน`).
   - ตรวจสอบสิทธิ์ด้วย `canCreate('sales_billing_invoice')`, `canCreate('accounts_ar')`, และ `canUpdate('accounts_ar')`.

## PO Document Print View: Vat Column 7% Display (`PurchaseOrderForm.jsx`)
- ปรับปรุงการแสดงผลคอลัมน์ `Vat 7%` ในตารางพิมพ์เอกสารใบสั่งซื้อ (PO Print Table):
  - **ไม่คำนวณเป็นยอดเงินต่อแถว** (เดิมคำนวณ เช่น `777.70`)
  - **เปลี่ยนเป็นแสดงอัตราภาษี `7%` โดยตรง** (หรือตาม `formData.vatRate%`)
  - คอลัมน์ **`รวม (บาท)`** ในแถวรายการสินค้าแสดงยอดตามมูลค่าสินค้าก่อนภาษี (`lineSub` = `จำนวน × ราคา`)
  - การคำนวณภาษีมูลค่าเพิ่ม (`777.70 บาท`) และยอดเงินที่ต้องชำระสุทธิ (`11,887.70 บาท`) จะไปแสดงและสรุปผลที่บล็อกด้านล่างเอกสารอย่างถูกต้องครบถ้วนตามมาตรฐาน

## PO Document Print Header Alignment (`PurchaseOrderForm.jsx`, `PurchaseOrderForm.css`)
- ปรับการจัดแนวกล่องข้อมูลเอกสารมุมขวาบน (เลขที่เอกสาร, วันที่ออก, อ้างอิง):
  - ยกเลิกการใช้ `justify-content: space-between` ที่ทำให้วันที่และเครื่องหมายลบ (`-`) ลอยชิดขอบขวา
  - เปลี่ยนมาใช้โครงสร้างตาราง `.po-print-doc-table` พร้อมกำหนด `td.doc-label` ชิดซ้ายและ `td.doc-val` เริ่มต้นที่แนวแกนเดียวกันทั้งหมด (ตรงแนวดิ่งตามเส้นสีแดงที่ผู้ใช้กำหนด)

## Workflow & Post-Billing Invoice Linking (`Accounts.jsx`, `backend/routes/accounts.js`)
1. **เชื่อมโยงใบเสนอราคา (Quotation) กับใบวางบิลที่สร้างแล้ว**:
   - ใน `backend/routes/accounts.js`: เพิ่ม `OUTER APPLY` ดึงข้อมูล `BillingInvoiceID`, `BillingInvoiceNo`, `BillingInvoiceRemaining`, และ `BillingInvoiceStatus` โดยจับคู่กับ `QuotationNo` ที่ถูกอ้างอิงในหมายเหตุ
   - ใน `Accounts.jsx`:
     - เมื่อใบเสนอราคานั้นได้สร้างใบวางบิลไปแล้ว (เช่น `BI-20260910-001`) ปุ่มการจัดการจะเปลี่ยนจากปุ่มสีน้ำเงิน `[📄 สร้างใบวางบิล]` เป็นปุ่มสีเขียว **`[👁️ ดูใบวางบิล: BI-20260910-001]`** ทันที
     - **พรีวิวเอกสารขนาด A4 (Document Preview Modal)**: เมื่อกดปุ่ม ระบบจะเปิดป๊อปอัปพรีวิวเอกสารขนาด A4 เสมือนจริงทันที (`viewOnly={true}`) ไม่เปิดเป็นหน้าแบบฟอร์มกรอกข้อมูล
     - มีปุ่ม **`[🖨️ พิมพ์ใบวางบิล/ใบแจ้งหนี้]`** เพื่อสั่งพิมพ์หรือบันทึกเป็น PDF ส่งให้ลูกค้าได้ทันที
     - มีปุ่ม **`[✏️ แก้ไขข้อมูล]`** ที่หัว Modal กรณีต้องการสลับไปแก้ไขข้อมูลในฟอร์ม
     - ป้องกันการกดสร้างใบวางบิลซ้ำซ้อน
2. **ขั้นตอนการทำงานต่อ (Workflow)**:
   - **ขั้นที่ 1: พิมพ์/ส่งใบวางบิล**: ส่ง `BI-20260910-001` (ยอดเรียกเก็บคงเหลือ 1,225.15 บาท) ให้ลูกค้า
   - **ขั้นที่ 2: เมื่อลูกค้าชำระเงินคงเหลือ**: ออกใบเสร็จรับเงิน (Receipt) หรือ ใบกำกับภาษี (Tax Invoice) ในเมนูขาย (Sales) และอัปเดตสถานะมัดจำเป็น "ชำระครบถ้วน"
   - **ขั้นที่ 3: ส่งมอบสินค้า**: ออกใบส่งของ (Delivery Order) เพื่อดำเนินกระบวนการจัดส่งสินค้า

## Accounts Receivable (AR) UI Streamlining & Clean-up (`Accounts.jsx`)
- **นำแท็บย่อย (Sub-tabs) ออก**: ลบแถบปุ่มสลับแท็บ `[ $ ติดตามเงินมัดจำจากใบเสนอราคา ]` และ `[ 📄 รายการลูกหนี้การค้าทั่วไป (AR Invoices) ]` ด้านบนออก ทำให้เข้าสู่หน้าตารางติดตามเงินมัดจำจากใบเสนอราคาโดยตรงทันที
- **นำปุ่มรีเฟรช (Refresh Button) ออก**: ลบปุ่ม `[ 🔄 รีเฟรช ]` ทางฝั่งขวาของทูลบาร์ออก คงเหลือเฉพาะช่องค้นหาและปุ่มเปิดตัวกรองขั้นสูง (`FilterToggleButton`)
- **Build Verified**: รัน `npm run build` ตรวจสอบโค้ดและ JSX syntax tree สมบูรณ์ ไม่พบ error

## Custom AR Filter for Quotation Deposits Tracking (`AccountsARFilterDrawer`)
- **ลบ "ประเภทเอกสาร" ออกโดยสิ้นเชิง**: นำ Dropdown `ประเภทเอกสาร` (THC / FDA / PSF / ELT) ออก เพราะตารางนี้เป็นการติดตามเงินมัดจำของลูกหนี้การค้า (Accounts AR) ไม่จำเป็นต้องกรองแยกชนิดเอกสารฝ่ายขาย
- **ปรับแต่งตัวกรองให้ตรงกับข้อมูลลูกหนี้การค้า (AR) จริง**:
  1. **สถานะมัดจำ**: `ทุกสถานะมัดจำ`, `รอมัดจำ`, `ชำระมัดจำแล้ว`, `ชำระครบถ้วน`
  2. **สถานะใบวางบิล**: `ทุกสถานะใบวางบิล`, `รอออกใบวางบิล`, `ออกใบวางบิลแล้ว`
  3. **สถานะใบเสร็จรับเงิน**: `ทุกสถานะใบเสร็จ`, `ยังไม่ออกใบเสร็จ`, `ออกใบเสร็จมัดจำแล้ว`, `ออกใบเสร็จปิดยอดแล้ว`
  4. **ฝ่ายขาย / ผู้สร้างเอกสาร**: ดึงรายชื่อพนักงานพร้อมระบุฝ่าย/แผนก เช่น `จุฑารัตน์ วงคำเหลา (SL)`
  5. **ช่วงวันที่ (จาก - ถึง)**: กรองตามวันที่ใบเสนอราคา พร้อมปุ่มลัด `วันนี้`, `7 วันล่าสุด`, `เดือนนี้`
- **เพิ่มคอลัมน์ "ผู้สร้าง" ในตารางติดตามเงินมัดจำ**: เพิ่มคอลัมน์ `<th>ผู้สร้าง</th>` ต่อจากคอลัมน์ลูกค้า เพื่อแสดงชื่อพนักงานขาย/ผู้เปิดใบเสนอราคา (`row.CreatedByName`) ให้ตรงกับตัวกรองผู้สร้างเอกสารด้านบนอย่างชัดเจน
## Custom Procurement PO Filter (`ProcurementPOFilterDrawer`, `Procurement.jsx`, `backend/routes/purchase-orders.js`)
- **เพิ่มปุ่มตัวกรองขั้นสูง (Filter Toggle Button)**: ในแท็บใบสั่งซื้อ (PO) เมนูจัดซื้อ (Procurement) ถัดจากช่องค้นหา พร้อมแสดง Badge จำนวนเงื่อนไขที่เลือกอยู่
- **แผงตัวกรองเฉพาะข้อมูลใบสั่งซื้อ (Procurement PO)**:
  1. **สถานะใบสั่งซื้อ**: `ทุกสถานะ`, `รออนุมัติ`, `อนุมัติแล้ว`, `สั่งซื้อแล้ว`, `รอเตรียมจัดส่ง`, `กำลังจัดส่ง`, `รับสินค้าแล้ว`, `ยกเลิก`
  2. **ซัพพลายเออร์**: `ซัพพลายเออร์ทั้งหมด` + ดึงรายชื่อจากทะเบียนผู้ขาย (Supplier) ในระบบอัตโนมัติ
  3. **ผู้สร้างเอกสาร**: `ผู้สร้างทั้งหมด` + ดึงรายชื่อผู้ใช้งานพร้อมแผนก (เช่น จัดซื้อ/ผู้ดูแลระบบ)
  4. **ช่วงวันที่สั่งซื้อ (จาก - ถึง)**: กรองตามวันที่ใบสั่งซื้อ พร้อมปุ่มลัด `วันนี้`, `7 วันล่าสุด`, `เดือนนี้`, และปุ่ม `ล้างวันที่`
  5. **ปุ่มล้างตัวกรองทั้งหมด**: รีเซ็ตเงื่อนไขตัวกรองและการค้นหากลับสู่ค่าเริ่มต้นทันที
- **Backend & Client-side Filtering**:
  - `backend/routes/purchase-orders.js`: รองรับ query parameters `status`, `supplierId`, `createdBy`, `startDate`/`dateFrom`, `endDate`/`dateTo`
## Searchable Dropdown for Suppliers & Creators (`CustomSelect.jsx`, `SalesDocFilter.jsx`)
- **อัปเกรด `CustomSelect` ให้รองรับ `searchable={true}`**:
  - ช่องเลือกซัพพลายเออร์และผู้สร้างเอกสารสามารถ **พิมพ์ค้นหาชื่อได้โดยตรงทันที** ในกล่องเลือก
  - กรองรายการแบบเรียลไทม์ตามตัวอักษรที่พิมพ์ รองรับทั้งภาษาไทยและอังกฤษ
  - รองรับการกดปุ่มลูกศรขึ้น/ลง (`ArrowUp` / `ArrowDown`) และ `Enter` เพื่อเลือกตัวเลือกที่ต้องการ หรือคลิกเลือกด้วยเมาส์
  - เมื่อเลือกแล้ว ระบบจะแสดงชื่อเต็มของซัพพลายเออร์ที่เลือก พร้อมปุ่ม `✕` สำหรับล้างค่าที่เลือกกลับสู่ "ซัพพลายเออร์ทั้งหมด" ได้ในคลิกเดียว
  - กรณีพิมพ์คำค้นหาที่ไม่ตรงกับรายการใด จะแสดงข้อความแจ้งเตือน "ไม่พบข้อมูล" อย่างชัดเจน
- **Build Verified**: ผ่านการทดสอบ `npm run build` สำเร็จ 100%


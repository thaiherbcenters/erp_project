# 📋 ERP Project Rules — กฎเหล็กสำหรับ AI (ต้องอ่านก่อนเขียนโค้ดทุกครั้ง)

> **ใครเขียนโค้ดให้โปรเจคนี้ ต้องปฏิบัติตามกฎทุกข้อ ห้ามละเว้น**

---

## 🏗️ Tech Stack (ห้ามเปลี่ยน)

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 |
| Routing | React Router v7 |
| State | React Context + useState |
| API calls | Native `fetch()` (มี global interceptor ที่ `config.js` แนบ JWT อัตโนมัติ) |
| Styling | Vanilla CSS (ห้ามใช้ Tailwind / CSS-in-JS) |
| Backend | Express 5 (CommonJS) |
| Database | MSSQL (via `mssql` package) |
| Auth | JWT + bcrypt |
| Icons | lucide-react |

---

## 🎨 1. CSS & Design System

### ห้ามทำ ❌
- ❌ สร้าง CSS class ใหม่สำหรับปุ่ม (ต้องใช้ที่มีอยู่ใน `PageCommon.css` / `Settings.css`)
- ❌ ใช้ inline style สำหรับ component ที่มี CSS class แล้ว
- ❌ ใช้สีตรงๆ (hardcode hex) — ต้องใช้ CSS Variables จาก `index.css`
- ❌ ใช้ font อื่นนอกจาก Inter
- ❌ ใช้ `window.alert()` / `window.confirm()` — ต้องใช้ `useAlert()`

### ต้องทำ ✅
- ✅ ใช้ CSS Variables: `var(--primary)`, `var(--text)`, `var(--border)` ฯลฯ
- ✅ ใช้ class ที่มีอยู่: `btn-primary`, `btn-secondary`, `btn-sm`, `btn-back`, `badge`, `data-table`, `card`
- ✅ ปุ่มใน Modal: `settings-btn-save` + `settings-btn-cancel`
- ✅ ปุ่มในตาราง: `doc-action-btn` (icon size=15)
- ✅ แจ้งเตือน: `import { useAlert } from '../components/CustomAlert'`
- ✅ import `PageCommon.css` ทุกหน้า

### CSS Files ที่ใช้
| ไฟล์ | ให้อะไร |
|------|---------|
| `index.css` | CSS Variables (สี, font) |
| `PageCommon.css` | btn-primary, btn-sm, data-table, card, badge, modal, toolbar, search-box |
| `Settings.css` | settings-add-btn, settings-btn-save/cancel, settings-modal |

---

## 🔒 2. Security

### Backend
- ✅ **Parameterized queries เท่านั้น** — ใช้ `.input('param', sql.Type, value)` ห้ามใช้ template literal ใน SQL query string
- ✅ **Validate input ทุก field** ก่อนใส่ DB (ตรวจ type, required, length)
- ✅ **Authorization**: ตรวจ `req.user.role` หรือ permissions ก่อนทำ CRUD
- ✅ **ห้าม expose internal error** ใน response — ใช้ generic message สำหรับ 500

### Frontend
- ✅ ห้ามใช้ `dangerouslySetInnerHTML` กับ user input
- ✅ ห้าม store sensitive data ใน localStorage แบบ plain text (ยกเว้น JWT token)
- ✅ Form validation ก่อน submit ทุกครั้ง

---

## 🗄️ 3. Backend API Patterns

### Route Structure
```
backend/routes/[module].js      ← route handlers
backend/config/db.js             ← database connection pool
backend/middleware/auth.js       ← JWT auth middleware
backend/utils/sequence.js        ← ID generation
```

### Response Format (ห้ามเปลี่ยน)
```javascript
// Success
res.json({ success: true, data: [...], count: 10 });
res.status(201).json({ success: true, message: 'Created successfully', id: 123 });

// Error
res.status(400).json({ success: false, message: 'Validation error description' });
res.status(500).json({ success: false, message: 'Failed to ...', error: err.message });
```

### Database Query Pattern
```javascript
const pool = await poolPromise;
const result = await pool.request()
    .input('id', sql.Int, req.params.id)
    .input('name', sql.NVarChar, req.body.name)
    .query('SELECT * FROM TableName WHERE ID = @id AND Name = @name');
```

### Transaction Pattern (ใช้สำหรับ multi-table writes)
```javascript
let transaction;
try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    // ... multiple operations ...
    await transaction.commit();
    res.json({ success: true });
} catch (err) {
    if (transaction) await transaction.rollback();
    res.status(500).json({ success: false, message: '...', error: err.message });
}
```

---

## ⚛️ 4. Frontend Patterns

### Page Structure
```jsx
import '../pages/PageCommon.css';
import './MyPage.css';
import { useAlert } from '../components/CustomAlert';

export default function MyPage() {
    const { showAlert, showConfirm } = useAlert();
    // state, effects, handlers...
    
    return (
        <div className="page-content">
            <div className="page-title">
                <h1>หัวข้อหน้า</h1>
                <p>คำอธิบาย</p>
            </div>
            <div className="toolbar">
                <div className="search-box">...</div>
                <button className="btn-primary">+ สร้างใหม่</button>
            </div>
            <div className="card table-card">
                <table className="data-table">...</table>
            </div>
        </div>
    );
}
```

### API Call Pattern
```javascript
// ใช้ fetch ธรรมดา — config.js จะแนบ JWT ให้อัตโนมัติ
const res = await fetch(`${API_BASE}/module`);
const data = await res.json();
if (!data.success) throw new Error(data.message);
```

### State Pattern
- ใช้ `useState` + `useEffect` สำหรับ local state
- ใช้ Context (AuthContext, ProductionContext, etc.) สำหรับ shared state
- ห้ามใช้ Redux / Zustand / Jotai (ไม่ได้ติดตั้ง)

---

## 📏 5. Code Quality Rules

### ขนาดไฟล์
- ✅ Component ไม่เกิน **500 บรรทัด** — ถ้าเกินให้แยก sub-components
- ✅ Route file ไม่เกิน **300 บรรทัด** — ถ้าเกินให้แยก controller/service

### Naming Convention
| สิ่ง | Convention | ตัวอย่าง |
|------|-----------|---------|
| Component | PascalCase | `QuotationForm.jsx` |
| CSS file | PascalCase ตามหน้า | `Planning.css` |
| Route file | kebab-case | `sales-orders.js` |
| DB Table | PascalCase | `Quotation`, `QuotationItem` |
| DB Column | PascalCase | `QuotationNo`, `GrandTotal` |
| API endpoint | kebab-case | `/api/sales-orders` |
| JS variable | camelCase | `grandTotal`, `itemList` |

### Error Handling
```jsx
// Frontend: ทุก fetch ต้องมี try-catch + แจ้ง user
try {
    const res = await fetch(...);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    showAlert('สำเร็จ', 'บันทึกเรียบร้อย', 'success');
} catch (err) {
    showAlert('เกิดข้อผิดพลาด', err.message, 'error');
}
```

### ห้ามทำ ❌
- ❌ `console.log` ที่ไม่จำเป็นใน production code
- ❌ Magic numbers / strings — ใช้ constants
- ❌ Commented-out code blocks — ลบทิ้ง
- ❌ ซ้ำ logic — แยกเป็น utility function

---

## 📁 6. File Organization

```
src/
├── components/         # Shared components (Layout, CustomAlert, etc.)
├── context/            # React Context providers
├── pages/              # Page components (1 file = 1 page)
│   ├── PageCommon.css  # ← shared CSS ทุกหน้า
│   ├── Sales.jsx
│   └── Sales.css       # ← page-specific CSS (ถ้าจำเป็น)
├── config.js           # API base URL + fetch interceptor
├── index.css           # CSS Variables + global reset
└── App.jsx             # Routes definition

backend/
├── routes/             # Express route handlers
├── middleware/          # Auth middleware
├── config/             # DB connection
├── services/           # Business logic (ถ้าแยกออกมา)
├── utils/              # Helpers (sequence generator, etc.)
└── server.js           # Entry point
```

---

## ✅ 7. Checklist ก่อนส่งงาน

ทุกครั้งที่เขียนโค้ดเสร็จ ต้อง self-check:

### Backend
- [ ] ใช้ parameterized queries? (ห้าม string concat ใน SQL)
- [ ] มี input validation?
- [ ] try-catch ทุก async function?
- [ ] Transaction สำหรับ multi-table writes?
- [ ] Response format ตรงตาม pattern? (`{ success, data/message }`)
- [ ] ไม่ expose internal error ให้ client?

### Frontend
- [ ] ใช้ CSS class ที่มีอยู่? (ไม่สร้างใหม่ถ้ามีแล้ว)
- [ ] ใช้ CSS Variables ไม่ใช่ hardcode สี?
- [ ] ใช้ `useAlert()` ไม่ใช่ `window.alert()`?
- [ ] มี Loading / Error / Empty state?
- [ ] Form validation ก่อน submit?
- [ ] Icon size ถูกต้อง? (ตาราง=15, ปุ่มทั่วไป=16-18)
- [ ] import `PageCommon.css`?

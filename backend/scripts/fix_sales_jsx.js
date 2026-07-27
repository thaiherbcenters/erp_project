const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../src/pages/Sales.jsx');
let content = fs.readFileSync(file, 'utf8');

// The messed up part is between:
// // ── Fetch ข้อมูล Billing Invoices (with Pagination) ──
// and
//             try {
//                 const res = await fetch(`${API_BASE}/billing-invoices...

const badBlockRegex = /\/\/ ── Fetch ข้อมูล Billing Invoices[\s\S]*?const fetchBillingInvoices = async \(\) => {[\s\S]*?useEffect\(\(\) => {[\s\S]*?}, \[activeTab, taxInvoiceSearch, taxInvoicePagination\.page, showTaxInvoiceForm\]\);/m;

const correctBlock = `// ── Fetch ข้อมูล Tax Invoices ──
    const fetchTaxInvoices = async () => {
        try {
            const res = await fetch(\`\${API_BASE}/tax-invoices?page=\${taxInvoicePagination.page}&limit=\${taxInvoicePagination.limit}&search=\${encodeURIComponent(taxInvoiceSearch)}\`);
            const json = await res.json();
            if (json.success) {
                setTaxInvoices(json.data || []);
                if (json.pagination) setTaxInvoicePagination(prev => ({ ...prev, totalPages: json.pagination.totalPages, total: json.pagination.total }));
            }
        } catch (err) {
            console.error('Error fetching tax invoices:', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'sales_tax_invoice' && hasSubPermission('sales_tax_invoice')) {
            if (!showTaxInvoiceForm) {
                fetchTaxInvoices();
            }
        }
    }, [activeTab, taxInvoiceSearch, taxInvoicePagination.page, showTaxInvoiceForm]);

    // ── Fetch ข้อมูล Billing Invoices (with Pagination) ──
    useEffect(() => {
        const fetchBillingInvoices = async () => {
            if (activeTab !== 'sales_billing_invoice') return;`;

content = content.replace(badBlockRegex, correctBlock);

// Also fix the handleDeleteTaxInvoice to use fetch instead of api.delete
const badDeleteRegex = /const handleDeleteTaxInvoice = async \(id\) => {[\s\S]*?api\.delete\(\`\/api\/tax-invoices\/\$\{id\}\`\);[\s\S]*?fetchTaxInvoices\(\);[\s\S]*?\} catch \(err\) {[\s\S]*?alert\('เกิดข้อผิดพลาดในการลบเอกสาร'\);[\s\S]*?\}[\s\S]*?\};/m;

const correctDelete = `const handleDeleteTaxInvoice = async (id) => {
        const ok = await showConfirm('ยืนยันการลบ', 'คุณต้องการลบเอกสารนี้ใช่หรือไม่?', 'warning');
        if (!ok) return;
        try {
            const res = await fetch(\`\${API_BASE}/tax-invoices/\${id}\`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                fetchTaxInvoices();
                showAlert('สำเร็จ', 'ลบเอกสารเรียบร้อยแล้ว', 'success');
            } else {
                showAlert('ลบไม่สำเร็จ', json.message, 'error');
            }
        } catch (err) {
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบเอกสาร', 'error');
        }
    };`;

content = content.replace(badDeleteRegex, correctDelete);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed Sales.jsx');

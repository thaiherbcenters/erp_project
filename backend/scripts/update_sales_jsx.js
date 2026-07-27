const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../src/pages/Sales.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Import
content = content.replace(
    "import BillingInvoiceForm from '../components/BillingInvoiceForm';",
    "import BillingInvoiceForm from '../components/BillingInvoiceForm';\nimport TaxInvoiceForm from '../components/TaxInvoiceForm';"
);

// 2. States
content = content.replace(
    "const [billingInvoicePagination, setBillingInvoicePagination] = useState({ page: 1, limit: 10, total: 0 });",
    "const [billingInvoicePagination, setBillingInvoicePagination] = useState({ page: 1, limit: 10, total: 0 });\n    const [taxInvoices, setTaxInvoices] = useState([]);\n    const [taxInvoiceSearch, setTaxInvoiceSearch] = useState('');\n    const [taxInvoicePagination, setTaxInvoicePagination] = useState({ page: 1, limit: 10, total: 0 });\n    const [showTaxInvoiceForm, setShowTaxInvoiceForm] = useState(false);\n    const [editTaxInvoiceId, setEditTaxInvoiceId] = useState(null);"
);

// 3. fetch function
const fetchFunc = `
    const fetchTaxInvoices = async () => {
        try {
            const res = await api.get('/api/tax-invoices', {
                params: { search: taxInvoiceSearch, page: taxInvoicePagination.page, limit: taxInvoicePagination.limit }
            });
            if (res.data.success) {
                setTaxInvoices(res.data.data);
                setTaxInvoicePagination(prev => ({ ...prev, total: res.data.total }));
            }
        } catch (err) {
            console.error('Error fetching tax invoices:', err);
        }
    };
`;
content = content.replace(
    "const fetchBillingInvoices = async () => {",
    fetchFunc + "\n    const fetchBillingInvoices = async () => {"
);

// 4. useEffect
const useEffectBlock = `
    useEffect(() => {
        if (activeTab === 'sales_tax_invoice' && hasSubPermission('sales_tax_invoice')) {
            if (!showTaxInvoiceForm) {
                fetchTaxInvoices();
            }
        }
    }, [activeTab, taxInvoiceSearch, taxInvoicePagination.page, showTaxInvoiceForm]);
`;
content = content.replace(
    "if (activeTab !== 'sales_billing_invoice') return;",
    "if (activeTab !== 'sales_billing_invoice') return;" + "\n" + useEffectBlock
);

// 5. getTabTitle & getTabDesc
content = content.replace(
    "case 'sales_billing_invoice': return 'ใบวางบิล/ใบแจ้งหนี้';",
    "case 'sales_billing_invoice': return 'ใบวางบิล/ใบแจ้งหนี้';\n            case 'sales_tax_invoice': return 'ใบแจ้งหนี้/ใบส่งสินค้า';"
);
content = content.replace(
    "case 'sales_billing_invoice': return 'สร้างและจัดการข้อมูลเอกสารใบวางบิล/ใบแจ้งหนี้ (Billing Note/Invoice)';",
    "case 'sales_billing_invoice': return 'สร้างและจัดการข้อมูลเอกสารใบวางบิล/ใบแจ้งหนี้ (Billing Note/Invoice)';\n            case 'sales_tax_invoice': return 'สร้างและจัดการข้อมูลเอกสารใบแจ้งหนี้/ใบส่งสินค้า (Invoice/Delivery Order)';"
);

// 6. Delete handler
const deleteFunc = `
    const handleDeleteTaxInvoice = async (id) => {
        if (window.confirm('คุณต้องการลบเอกสารนี้ใช่หรือไม่?')) {
            try {
                const res = await api.delete(\`/api/tax-invoices/\${id}\`);
                if (res.data.success) {
                    fetchTaxInvoices();
                }
            } catch (err) {
                alert('เกิดข้อผิดพลาดในการลบเอกสาร');
            }
        }
    };
`;
content = content.replace(
    "const handleDeleteBillingInvoice = async (id) => {",
    deleteFunc + "\n    const handleDeleteBillingInvoice = async (id) => {"
);

// 7. Preview Doc Modal
content = content.replace(
    "{previewDocModal.type === 'BillingInvoice' && (",
    "{previewDocModal.type === 'TaxInvoice' && (\n                                <TaxInvoiceForm editId={previewDocModal.id} viewOnly={true} isHistory={false} onBack={() => setPreviewDocModal(null)} />\n                            )}\n                            {previewDocModal.type === 'BillingInvoice' && ("
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated Sales.jsx states and logic');

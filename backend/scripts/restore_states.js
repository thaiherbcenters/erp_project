const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../src/pages/Sales.jsx');
let content = fs.readFileSync(file, 'utf8');

const missingLines = `    // ── State: การแสดงฟอร์ม ──
    const [showQuotationForm, setShowQuotationForm] = useState(false);
    const [localQuotations, setLocalQuotations] = useState([]);
    const [quotationPagination, setQuotationPagination] = useState({ page: 1, limit: 50, totalPages: 1 });
    const [appliedQuotationSearch, setAppliedQuotationSearch] = useState('');
    const [editingQuotationId, setEditingQuotationId] = useState(null);
    const [billingInvoiceSearch, setBillingInvoiceSearch] = useState('');
    const [showBillingInvoiceForm, setShowBillingInvoiceForm] = useState(false);
    const [localBillingInvoices, setLocalBillingInvoices] = useState([]);
    const [billingInvoicePagination, setBillingInvoicePagination] = useState({ page: 1, limit: 50, totalPages: 1 });
    const [appliedBillingInvoiceSearch, setAppliedBillingInvoiceSearch] = useState('');
    const [editingBillingInvoiceId, setEditingBillingInvoiceId] = useState(null);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [isHistoryView, setIsHistoryView] = useState(false); // To pass to form
    const [taxInvoices, setTaxInvoices] = useState([]);
    const [taxInvoiceSearch, setTaxInvoiceSearch] = useState('');
    const [taxInvoicePagination, setTaxInvoicePagination] = useState({ page: 1, limit: 10, total: 0 });
    const [showTaxInvoiceForm, setShowTaxInvoiceForm] = useState(false);
    const [editTaxInvoiceId, setEditTaxInvoiceId] = useState(null);
`;

content = content.replace(
    "const [showHistoryModal, setShowHistoryModal] = useState(false);",
    missingLines + "    const [showHistoryModal, setShowHistoryModal] = useState(false);"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Restored states in Sales.jsx');

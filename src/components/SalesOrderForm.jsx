import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Plus, Trash2, Search, X, Loader2, Printer } from 'lucide-react';
import { useAlert } from '../components/CustomAlert';
import API_BASE from '../config';
import '../pages/PageCommon.css';

const PRODUCT_CATALOG = {
    "ยาดมสมุนไพร": { price: 79 },
    "ยาดมสมุนไพร จัมโบ้": { price: 490 },
    "ยาหม่อง": { price: 59 },
    "ยาน้ำมัน ขนาด 10 มล.": { price: 129 },
    "ยาน้ำมัน ขนาด 5 มล.": { price: 69 },
    "ยาน้ำมันสมุนไพร สูตรเย็น": { price: 199 },
    "ยาน้ำมันสมุนไพร สูตรร้อน": { price: 199 },
    "ยาสเปรย์ผสมกระดูกไก่ดำ": { price: 199 },
    "แคปซูลขมิ้นชัน": { price: 129 },
    "แคปซูลฟ้าทะลายโจร": { price: 159 },
    "แคปซูลขิง": { price: 129 },
    "แคปซูลมะขามแขก": { price: 129 },
    "แคปซูลรางจืด": { price: 129 },
    "แคปซูลมะระขี้นก": { price: 129 },
    "แคปซูลตรีผลา": { price: 129 },
    "แคปซูลเพชรสังฆาต": { price: 129 },
    "แคปซูลประสะเจตพังคี": { price: 129 },
    "แคปซูลสหัศธารา": { price: 129 },
    "แคปซูลประสะมะแว้ง": { price: 129 },
    "แคปซูลปราบชมพูทวีป": { price: 129 },
    "ลูกประคบ": { price: 159 },
    "ชาอัสสัม กล่อง": { price: '' },
    "ชาอัสสัม ซอง": { price: 95 },
    "ชากัญชาโสมขาว": { price: 95 },
    "ชากัญชา": { price: 95 },
    "น้ำผึ้ง": { price: '' },
    "เทียนหอม Aromatic กลิ่น Rose": { price: 290 },
    "เทียนหอม Aromatic กลิ่น Morning": { price: 290 },
    "เทียนหอม Aromatic กลิ่น Thai": { price: 290 },
    "น้ำมันหอมระเหย กลิ่น Rose": { price: 490 },
    "น้ำมันหอมระเหย กลิ่น Morning": { price: 490 },
    "น้ำมันหอมระเหย กลิ่น Thai": { price: 490 }
};

// Helper: Convert Number to Thai Baht Text
function ThaiBaht(Number) {
    Number = Number.toString().replace(/[, ]/g, '');
    if (isNaN(Number) || Number === '') return "ศูนย์บาทถ้วน";
    Number = parseFloat(Number).toFixed(2);
    let integerPart = Number.split('.')[0];
    let fractionalPart = Number.split('.')[1];

    const txtNumArr = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ'];
    const txtDigitArr = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    function convertPart(str) {
        let bahtTxt = '';
        let strLen = str.length;
        for (let i = 0; i < strLen; i++) {
            let n = parseInt(str.charAt(i));
            if (n !== 0) {
                if ((i === (strLen - 1)) && (n === 1) && strLen > 1 && parseInt(str.charAt(i - 1)) !== 0) {
                    bahtTxt += 'เอ็ด';
                } else if ((i === (strLen - 2)) && (n === 2)) {
                    bahtTxt += 'ยี่';
                } else if ((i === (strLen - 2)) && (n === 1)) {
                    bahtTxt += '';
                } else {
                    bahtTxt += txtNumArr[n];
                }
                bahtTxt += txtDigitArr[strLen - i - 1];
            }
        }
        return bahtTxt;
    }

    let bahtText = convertPart(integerPart);
    let satangText = convertPart(fractionalPart);

    if (integerPart === '0') bahtText = 'ศูนย์';
    bahtText += 'บาท';

    if (satangText === '' || satangText === 'ศูนย์') {
        bahtText += 'ถ้วน';
    } else {
        bahtText += satangText + 'สตางค์';
    }
    return bahtText;
}

export default function SalesOrderForm({ editId, onBack, onSave, viewOnly }) {
    const { showConfirm, showAlert } = useAlert();
    const [saving, setSaving] = useState(false);
    const [approvedQTs, setApprovedQTs] = useState([]);
    const [selectedQT, setSelectedQT] = useState('');
    const [qtSearchText, setQtSearchText] = useState('');
    const [showQtDropdown, setShowQtDropdown] = useState(false);
    const [isFetchingQT, setIsFetchingQT] = useState(false);

    const filteredQTs = approvedQTs.filter(q => 
        (q.QuotationNo || '').toLowerCase().includes(qtSearchText.toLowerCase()) || 
        (q.CustomerName || '').toLowerCase().includes(qtSearchText.toLowerCase())
    );

    const handleClearQT = () => {
        setSelectedQT('');
        setQtSearchText('');
        setFormData(prev => ({
            ...prev,
            customerName: '',
            address: '',
            phone: '',
            taxId: '',
            taxBranch: 'head_office',
            branchNo: '',
            discountPercent: 0,
            vatRate: 0,
            shippingCost: 0,
            notes: '',
        }));
        setItems([
            { id: 1, name: '', qty: '', unit: 'ชิ้น', price: '' }
        ]);
    };
    const [formData, setFormData] = useState({
        docType: 'quotation_thc',
        customerName: '',
        address: '',
        phone: '',
        taxId: '',
        taxBranch: 'head_office',
        branchNo: '',
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        discountPercent: 0,
        vatRate: 0,
        shippingCost: 0,
        customerPONumber: '',
        contractId: '',
        notes: '',
    });

    const [items, setItems] = useState([
        { id: 1, name: '', qty: '', unit: 'ชิ้น', price: '' }
    ]);

    // Fetch approved quotations for dropdown
    useEffect(() => {
        const fetchApproved = async () => {
            try {
                const res = await fetch(`${API_BASE}/quotations/status/approved`);
                const json = await res.json();
                if (json.success) setApprovedQTs(json.data);
            } catch (err) { console.error('Error fetching approved QTs:', err); }
        };
        fetchApproved();
    }, []);

    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerList, setCustomerList] = useState([]);
    const [customerSearch, setCustomerSearch] = useState('');

    const openCustomerModal = async () => {
        try {
            const res = await fetch(`${API_BASE}/customers`);
            const json = await res.json();
            if (json.success) {
                setCustomerList(json.data || []);
                setShowCustomerModal(true);
            }
        } catch (err) {
            showAlert('ข้อผิดพลาด', 'ไม่สามารถโหลดรายชื่อลูกค้าได้', 'error');
        }
    };

    const handleSelectCustomer = (cust) => {
        setFormData(prev => ({
            ...prev,
            customerName: cust.CustomerName || '',
            contactPerson: cust.ContactPerson || '',
            phone: cust.Phone || '',
            email: cust.Email || '',
            address: cust.Address || '',
            taxId: cust.TaxID || '',
            taxBranch: cust.TaxBranch || 'head_office',
            branchNo: cust.BranchNo || ''
        }));
        setShowCustomerModal(false);
    };

    const filteredCustomers = customerList.filter(c =>
        (c.CustomerName || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.CustomerCode || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.ContactPerson || '').toLowerCase().includes(customerSearch.toLowerCase())
    );

    // Fetch Contracts for Dropdown
    const [contracts, setContracts] = useState([]);
    useEffect(() => {
        const fetchContracts = async () => {
            try {
                const res = await fetch(`${API_BASE}/contracts`);
                const json = await res.json();
                if (json.success) {
                    setContracts(json.data);
                }
            } catch (err) {
                console.error('Error fetching contracts:', err);
            }
        };
        fetchContracts();
    }, []);

    // Fetch existing SO for editing
    useEffect(() => {
        if (editId) {
            const fetchSO = async () => {
                try {
                    const res = await fetch(`${API_BASE}/sales-orders/${editId}`);
                    const json = await res.json();
                    if (json.success) {
                        const d = json.data;
                        setFormData({
                            docType: d.DocType || 'quotation_thc',
                            customerName: d.CustomerName || '',
                            address: d.Address || '',
                            phone: d.Phone || '',
                            taxId: d.TaxID || '',
                            orderDate: d.OrderDate ? d.OrderDate.split('T')[0] : '',
                            deliveryDate: d.DeliveryDate ? d.DeliveryDate.split('T')[0] : '',
                            discountPercent: d.DiscountPercent || 0,
                            vatRate: d.VatRate || 0,
                            shippingCost: d.ShippingCost || 0,
                            customerPONumber: d.CustomerPONumber || '',
                            contractId: d.ContractID || '',
                            notes: d.Notes || '',
                        });
                        if (d.QuotationNo) setSelectedQT(d.QuotationNo);
                        if (d.items?.length > 0) {
                            setItems(d.items.map(it => ({
                                id: it.ItemID, name: it.ItemName, qty: it.Qty,
                                unit: it.Unit || 'ชิ้น', price: it.Price,
                            })));
                        }
                    }
                } catch (err) { console.error('Error fetching SO:', err); }
            };
            fetchSO();
        }
    }, [editId]);

    // Auto-fill from Quotation
    const handleSelectQT = async (qtId) => {
        if (!qtId) { handleClearQT(); return; }
        setIsFetchingQT(true);
        try {
            const res = await fetch(`${API_BASE}/sales-orders/from-quotation/${qtId}`);
            const json = await res.json();
            if (json.success) {
                const d = json.data;
                setSelectedQT(d.QuotationNo);
                setFormData(prev => ({
                    ...prev,
                    docType: d.DocType || prev.docType,
                    customerName: d.CustomerName || '',
                    address: d.Address || '',
                    phone: d.Phone || '',
                    taxId: d.TaxID || '',
                    discountPercent: d.DiscountPercent || 0,
                    vatRate: d.VatRate || 0,
                    shippingCost: d.ShippingCost || 0,
                    contractId: d.ContractID || '',
                    notes: '',
                }));
                if (d.items?.length > 0) {
                    setItems(d.items.map((it, i) => ({
                        id: Date.now() + i, name: it.ItemName,
                        qty: it.Qty, unit: 'ชิ้น', price: it.Price,
                    })));
                }
            }
        } catch (err) { console.error('Error loading QT data:', err); }
        finally { setIsFetchingQT(false); }
    };


    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addItem = () => setItems(prev => [...prev, { id: Date.now(), name: '', qty: '', unit: 'ชิ้น', price: '' }]);
    const removeItem = (id) => { if (items.length > 1) setItems(prev => prev.filter(i => i.id !== id)); };
    const handleItemChange = (id, field, value) => {
        setItems(prev => prev.map(i => {
            if (i.id === id) {
                const updated = { ...i, [field]: value };
                if (field === 'name' && PRODUCT_CATALOG[value] && PRODUCT_CATALOG[value].price !== '') {
                    updated.price = PRODUCT_CATALOG[value].price;
                }
                return updated;
            }
            return i;
        }));
    };

    // Calculations
    const subTotal = items.reduce((sum, i) => sum + ((parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0)), 0);
    const discountAmount = subTotal * (parseFloat(formData.discountPercent) || 0) / 100;
    const afterDiscount = subTotal - discountAmount;
    const vatAmount = afterDiscount * (parseFloat(formData.vatRate) || 0) / 100;
    const shipping = parseFloat(formData.shippingCost) || 0;
    const grandTotal = afterDiscount + vatAmount + shipping;

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.customerName) return showAlert('แจ้งเตือน', 'กรุณาระบุชื่อลูกค้า', 'warning');
        if (!formData.deliveryDate) return showAlert('แจ้งเตือน', 'กรุณาระบุวันที่ต้องการส่ง', 'warning');
        if (!items.some(i => i.name)) return showAlert('แจ้งเตือน', 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ', 'warning');

        const ok = await showConfirm('ยืนยันบันทึก', 'ต้องการบันทึก Sales Order นี้ใช่หรือไม่?', 'info');
        if (!ok) return;

        setSaving(true);
        const qtObj = approvedQTs.find(q => q.QuotationNo === selectedQT);
        const payload = {
            quotationId: qtObj?.QuotationID || null,
            quotationNo: selectedQT || null,
            docType: formData.docType,
            customerName: formData.customerName,
            address: formData.address,
            phone: formData.phone,
            taxId: formData.taxId,
            orderDate: formData.orderDate,
            deliveryDate: formData.deliveryDate || null,
            subTotal, discountPercent: formData.discountPercent,
            discountAmount, afterDiscount, vatRate: formData.vatRate,
            vatAmount, shippingCost: shipping, grandTotal,
            customerPONumber: formData.customerPONumber,
            contractId: formData.contractId,
            notes: formData.notes,
            createdBy: '',
            items: items.filter(i => i.name).map(i => ({
                name: i.name, qty: i.qty, unit: i.unit,
                price: i.price, amount: (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0),
            })),
        };

        try {
            const url = editId ? `${API_BASE}/sales-orders/${editId}` : `${API_BASE}/sales-orders`;
            const method = editId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const json = await res.json();
            setSaving(false);
            if (json.success) {
                await showAlert('สำเร็จ', editId ? 'แก้ไข Sales Order สำเร็จ' : `สร้าง Sales Order สำเร็จ (${json.salesOrderNo})`, 'success');
                onSave?.();
            } else {
                showAlert('ข้อผิดพลาด', json.message || 'ไม่สามารถบันทึกได้', 'error');
            }
        } catch (err) {
            setSaving(false);
            console.error('Error saving SO:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    };

    const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border, #e2e8f0)', fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-white, #fff)', color: 'var(--text, #1e293b)' };
    const sectionStyle = { background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, padding: 20, marginBottom: 16 };

    const a4PageStyle = {
        width: '210mm',
        minHeight: '297mm',
        padding: '15mm',
        margin: '20px auto',
        background: '#fff',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        borderRadius: '4px',
        fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
        color: '#000',
        boxSizing: 'border-box',
        position: 'relative'
    };

    if (viewOnly) {
        return (
            <div style={{ background: '#f1f5f9', padding: '20px', minHeight: '100vh', animation: 'slideUp 0.3s ease-out' }}>
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', maxWidth: '210mm', margin: '0 auto' }}>
                    <button onClick={onBack} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowLeft size={16} /> กลับไปหน้ารายการ
                    </button>
                    <button onClick={() => window.print()} style={{ padding: '8px 16px', background: 'var(--primary, #4f46e5)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Printer size={16} /> พิมพ์เอกสาร
                    </button>
                </div>

                <div className="so-document" style={a4PageStyle}>
                    {/* Header */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '0' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '12%', textAlign: 'center', verticalAlign: 'middle', border: 'none', padding: '2px' }}>
                                    <img src="https://lh3.googleusercontent.com/d/10lptwep_aBvzXnQUHFAyS8cou2nrYyKK" style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'contain' }} alt="Logo" />
                                </td>
                                <td style={{ width: '55%', padding: '2px 8px', verticalAlign: 'middle', border: 'none' }}>
                                    <div style={{ color: '#1a7a3a', fontWeight: 'bold', fontSize: '13.5pt', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                                        วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์ (สำนักงานใหญ่)
                                    </div>
                                    <div style={{ fontSize: '9pt', marginTop: '1px', whiteSpace: 'nowrap' }}>
                                        Thai Herb Centers(THC)Community Enterprise (HEAD OFFICE)
                                    </div>
                                    <div style={{ fontSize: '9pt', marginTop: '1px' }}>
                                        6/10 หมู่ที่ 2 ต.ไทรม้า อ.เมืองนนทบุรี จ.นนทบุรี 11000
                                    </div>
                                    <div style={{ fontSize: '8pt' }}>
                                        6/10 Moo 2 Sai Ma subdistrict,Mueang Nonthaburi District,Nonthabui Province,Thailand 11000
                                    </div>
                                    <div style={{ fontSize: '9pt', marginTop: '1px' }}>
                                        โทร:083-9799389 / เลขประจำตัวผู้เสียภาษี 099-200438186-0
                                    </div>
                                </td>
                                <td style={{ width: '35%', textAlign: 'center', verticalAlign: 'middle', border: 'none', padding: '8px' }}>
                                    <div style={{ backgroundColor: '#2ecc71', color: 'white', borderRadius: '25px', padding: '8px 5px', position: 'relative' }}>
                                        <div style={{ fontSize: '15pt', fontWeight: 'bold', whiteSpace: 'nowrap' }}>ใบสั่งขาย (Sales Order)</div>
                                        <div style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '2px' }}>SALES ORDER</div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Customer Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        {/* Left: Customer Info Box */}
                        <div style={{ width: '65%', border: '1.5px solid #1a7a3a', borderRadius: '8px', padding: '6px 12px', boxSizing: 'border-box' }}>
                            <table style={{ width: '100%', border: 'none', fontSize: '10pt', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '30%', fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top' }}>
                                            ชื่อลูกค้า :<br /><span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>Customer Name</span>
                                        </td>
                                        <td style={{ width: '70%', padding: '2px 0', verticalAlign: 'top' }}>{formData.customerName || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top' }}>
                                            ที่อยู่ :<br /><span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>Address</span>
                                        </td>
                                        <td style={{ padding: '2px 0', verticalAlign: 'top', height: '35px' }}>{formData.address || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top' }}>
                                            โทรศัพท์ :<br /><span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>Tel. No.</span>
                                        </td>
                                        <td style={{ padding: '2px 0', verticalAlign: 'top' }}>{formData.phone || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 'bold', padding: '2px 0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                            เลขประจำตัวผู้เสียภาษี :<br /><span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>TAX ID</span>
                                        </td>
                                        <td style={{ padding: '2px 0', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <span>{formData.taxId || '-'}</span>
                                                <div style={{ fontSize: '7.5pt', marginLeft: 'auto', display: 'flex', gap: '15px', textAlign: 'left' }}>
                                                    <div>
                                                        <span style={{ fontSize: '12pt', display: 'inline-block', transform: 'translateY(2px)' }}>{formData.taxBranch === 'head_office' ? '☑' : '☐'}</span> สำนักงานใหญ่<br />
                                                        <span style={{ color: '#555', marginLeft: '12px' }}>Head Office</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '12pt', display: 'inline-block', transform: 'translateY(2px)' }}>{formData.taxBranch === 'branch' ? '☑' : '☐'}</span> สาขาที่ {formData.taxBranch === 'branch' ? formData.branchNo || '........' : '..........................'}<br />
                                                        <span style={{ color: '#555', marginLeft: '12px' }}>Branch No.</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Right: Doc Info Box */}
                        <div style={{ width: '33%', border: '1.5px solid #1a7a3a', borderRadius: '8px', overflow: 'hidden', boxSizing: 'border-box' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                                <tbody>
                                    <tr style={{ backgroundColor: '#d5f5e3' }}>
                                        <td style={{ width: '40%', fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #1a7a3a' }}>
                                            เลขที่ :<br /><span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>No.</span>
                                        </td>
                                        <td style={{ width: '60%', padding: '4px 8px', borderBottom: '1px solid #1a7a3a', fontWeight: 'bold' }}>{formData.salesOrderNo || 'SO-YYYY-MMXXX'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #1a7a3a' }}>
                                            วันที่ :<br /><span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>Date</span>
                                        </td>
                                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #1a7a3a' }}>{formData.orderDate ? new Date(formData.orderDate).toLocaleDateString('th-TH') : '-'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #1a7a3a' }}>
                                            อ้างอิง QT :<br /><span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>Ref. QT</span>
                                        </td>
                                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #1a7a3a' }}>{formData.quotationNo || formData.refQuotationNo || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 'bold', padding: '4px 8px' }}>
                                            กำหนดส่ง :<br /><span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>Deliver By</span>
                                        </td>
                                        <td style={{ padding: '4px 8px' }}>{formData.deliveryDate ? new Date(formData.deliveryDate).toLocaleDateString('th-TH') : '-'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ border: '1.5px solid #1a7a3a', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '9pt' }}>
                            <tbody>
                                <tr style={{ backgroundColor: '#d5f5e3' }}>
                                    <td style={{ width: '25%', fontWeight: 'bold', padding: '4px', borderRight: '1px solid #1a7a3a', borderBottom: '1px solid #1a7a3a' }}>
                                        เลขที่ใบสั่งซื้อ<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Purchase No.</span>
                                    </td>
                                    <td style={{ width: '25%', fontWeight: 'bold', padding: '4px', borderRight: '1px solid #1a7a3a', borderBottom: '1px solid #1a7a3a' }}>
                                        เงื่อนไขการชำระเงิน<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Term Of Payment</span>
                                    </td>
                                    <td style={{ width: '25%', fontWeight: 'bold', padding: '4px', borderRight: '1px solid #1a7a3a', borderBottom: '1px solid #1a7a3a' }}>
                                        ผู้ติดต่อ<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Contact Person</span>
                                    </td>
                                    <td style={{ width: '25%', fontWeight: 'bold', padding: '4px', borderBottom: '1px solid #1a7a3a' }}>
                                        พนักงานขาย<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Salesperson</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '6px', borderRight: '1px solid #1a7a3a' }}>{formData.customerPONumber || '-'}</td>
                                    <td style={{ padding: '6px', borderRight: '1px solid #1a7a3a' }}>{formData.paymentTerms || '-'}</td>
                                    <td style={{ padding: '6px', borderRight: '1px solid #1a7a3a' }}>{formData.contactPerson || '-'}</td>
                                    <td style={{ padding: '6px' }}>{formData.salesperson || 'Admin'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Products Table */}
                    <div style={{ border: '1.5px solid #1a7a3a', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px', minHeight: '230px', display: 'flex', flexDirection: 'column' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#d5f5e3' }}>
                                    <th style={{ width: '7%', borderRight: '1px solid #1a7a3a', borderBottom: '1px solid #1a7a3a', padding: '4px 2px', fontSize: '9pt', fontWeight: 'bold' }}>
                                        ลำดับ<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Item</span>
                                    </th>
                                    <th style={{ width: '45%', borderRight: '1px solid #1a7a3a', borderBottom: '1px solid #1a7a3a', padding: '4px 2px', fontSize: '9pt', fontWeight: 'bold' }}>
                                        รายการสินค้า<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Description</span>
                                    </th>
                                    <th style={{ width: '12%', borderRight: '1px solid #1a7a3a', borderBottom: '1px solid #1a7a3a', padding: '4px 2px', fontSize: '9pt', fontWeight: 'bold' }}>
                                        จำนวน<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Quantity</span>
                                    </th>
                                    <th style={{ width: '18%', borderRight: '1px solid #1a7a3a', borderBottom: '1px solid #1a7a3a', padding: '4px 2px', fontSize: '9pt', fontWeight: 'bold' }}>
                                        ราคาต่อหน่วย<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Unit Price</span>
                                    </th>
                                    <th style={{ width: '18%', borderBottom: '1px solid #1a7a3a', padding: '4px 2px', fontSize: '9pt', fontWeight: 'bold' }}>
                                        จำนวนเงิน<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Amount</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td style={{ padding: '2px', textAlign: 'center', borderRight: '1px solid #1a7a3a', fontSize: '9pt', fontWeight: 300 }}>{idx + 1}</td>
                                        <td style={{ padding: '2px 4px', borderRight: '1px solid #1a7a3a', fontSize: '9pt', textAlign: 'left', fontWeight: 300 }}>{item.name}</td>
                                        <td style={{ padding: '2px', textAlign: 'center', borderRight: '1px solid #1a7a3a', fontSize: '9pt', fontWeight: 300 }}>{item.qty} {item.unit}</td>
                                        <td style={{ padding: '2px 8px', textAlign: 'right', borderRight: '1px solid #1a7a3a', fontSize: '9pt', fontWeight: 300 }}>{parseFloat(item.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                        <td style={{ padding: '2px 8px', textAlign: 'right', fontSize: '9pt', fontWeight: 300 }}>{((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Empty space filler that preserves vertical lines */}
                        <div style={{ flex: 1, width: '100%', display: 'flex' }}>
                            <div style={{ width: '7%', borderRight: '1px solid #1a7a3a' }}></div>
                            <div style={{ width: '45%', borderRight: '1px solid #1a7a3a', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', color: '#666', fontSize: '10pt', padding: '10px' }}>
                                {items.length === 0 ? 'ไม่มีรายการสินค้า' : ''}
                            </div>
                            <div style={{ width: '12%', borderRight: '1px solid #1a7a3a' }}></div>
                            <div style={{ width: '18%', borderRight: '1px solid #1a7a3a' }}></div>
                            <div style={{ width: '18%' }}></div>
                        </div>
                    </div>

                    {/* Footer / Calculation */}
                    <div style={{ border: '1.5px solid #1a7a3a', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <tbody>
                                <tr>
                                    <td rowSpan={discountAmount > 0 ? 5 : 4} style={{ width: '54%', verticalAlign: 'top', padding: '5px 12px', borderRight: '1px solid #1a7a3a', borderTop: 'none', borderBottom: 'none' }}>
                                        <div style={{ fontSize: '9pt', minHeight: '15px' }}>
                                            <b>หมายเหตุ:</b> {formData.notes || '-'}
                                        </div>
                                        <div style={{ marginTop: '8px', padding: '5px 0' }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '10pt', color: '#1a7a3a' }}>
                                                ช่องทางชำระเงิน :
                                            </div>
                                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', fontSize: '10pt' }}>
                                                <label><span style={{ fontSize: '12pt', transform: 'translateY(1px)', display: 'inline-block' }}>{formData.paymentMethod === 'cash' ? '☑' : '☐'}</span> เงินสด (Cash)</label>
                                                <label><span style={{ fontSize: '12pt', transform: 'translateY(1px)', display: 'inline-block' }}>{formData.paymentMethod === 'transfer' ? '☑' : '☐'}</span> โอนเงิน (Bank Transfer)</label>
                                                <label><span style={{ fontSize: '12pt', transform: 'translateY(1px)', display: 'inline-block' }}>{formData.paymentMethod === 'cheque' ? '☑' : '☐'}</span> เช็ค (Cheque)</label>
                                            </div>
                                            <div style={{ marginTop: '6px', fontSize: '9pt', lineHeight: 1.7 }}>
                                                ธนาคาร (Bank) ........................................... สาขา (Branch) ...........................................<br />
                                                เลขที่เช็ค (Cheque No.) ........................................... วันที่ ...........................................
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ width: '33%', fontWeight: 'bold', textAlign: 'right', padding: '4px 10px', borderBottom: '1px solid #ccc', borderRight: '1px solid #1a7a3a', borderTop: 'none', fontSize: '10pt' }}>
                                        ยอดรวม<br /><span style={{ fontSize: '9pt', fontWeight: 'normal' }}>TOTAL</span>
                                    </td>
                                    <td style={{ width: '13%', textAlign: 'right', padding: '4px 10px', borderBottom: '1px solid #ccc', borderTop: 'none', fontSize: '10pt' }}>
                                        {subTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                
                                {discountAmount > 0 && (
                                    <tr>
                                        <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '4px 10px', borderBottom: '1px solid #ccc', borderRight: '1px solid #1a7a3a', fontSize: '10pt', color: 'black' }}>
                                            หักส่วนลด {formData.discountPercent > 0 ? `(${formData.discountPercent}%)` : ''}<br /><span style={{ fontSize: '9pt', fontWeight: 'normal' }}>DISCOUNT</span>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '4px 10px', borderBottom: '1px solid #ccc', fontSize: '10pt', color: 'black' }}>
                                            {discountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                )}
                                
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '4px 10px', borderBottom: '1px solid #ccc', borderRight: '1px solid #1a7a3a', fontSize: '10pt' }}>
                                        ภาษีมูลค่าเพิ่ม {formData.vatRate > 0 ? `(${formData.vatRate}%)` : ''}<br /><span style={{ fontSize: '9pt', fontWeight: 'normal' }}>VAT</span>
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '4px 10px', borderBottom: '1px solid #ccc', fontSize: '10pt' }}>
                                        {vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '4px 10px', borderBottom: '1px solid #ccc', borderRight: '1px solid #1a7a3a', fontSize: '10pt' }}>
                                        ค่าจัดส่ง<br /><span style={{ fontSize: '9pt', fontWeight: 'normal' }}>SHIPPING COST</span>
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '4px 10px', borderBottom: '1px solid #ccc', fontSize: '10pt' }}>
                                        {shipping.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>

                                <tr>
                                    <td style={{ width: '54%', textAlign: 'center', fontWeight: 'bold', fontSize: '12pt', backgroundColor: '#d5f5e3', borderRight: '1px solid #1a7a3a', borderTop: '1px solid #1a7a3a', padding: '5px' }}>
                                        <span>{ThaiBaht(grandTotal)}</span>
                                    </td>
                                    <td style={{ width: '33%', fontWeight: 'bold', textAlign: 'right', padding: '4px 10px', borderRight: '1px solid #1a7a3a', backgroundColor: '#d5f5e3', fontSize: '10pt' }}>
                                        รวมเงินทั้งสิ้น<br /><span style={{ fontSize: '9pt', fontWeight: 'normal' }}>GRAND TOTAL</span>
                                    </td>
                                    <td style={{ width: '13%', textAlign: 'right', fontWeight: 'bold', textDecoration: 'underline', backgroundColor: '#d5f5e3', padding: '5px 10px', fontSize: '11pt' }}>
                                        {grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Signatures */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', padding: '0 10px', gap: '15px' }}>
                        <div style={{ flex: 1, border: '1px solid #1a7a3a', borderRadius: '8px', padding: '15px 10px', textAlign: 'center' }}>
                            <div style={{ height: '50px' }}></div>
                            <div style={{ borderBottom: '1px dotted #000', width: '80%', margin: '0 auto 5px' }}></div>
                            <div style={{ fontSize: '10pt' }}>ผู้จัดทำ / Prepared By</div>
                            <div style={{ fontSize: '9pt', color: '#555', marginTop: '4px' }}>วันที่ / Date ......../......../........</div>
                        </div>
                        <div style={{ flex: 1, border: '1px solid #1a7a3a', borderRadius: '8px', padding: '15px 10px', textAlign: 'center' }}>
                            <div style={{ height: '50px' }}></div>
                            <div style={{ borderBottom: '1px dotted #000', width: '80%', margin: '0 auto 5px' }}></div>
                            <div style={{ fontSize: '10pt' }}>ผู้อนุมัติฝ่ายขาย / Sales Manager</div>
                            <div style={{ fontSize: '9pt', color: '#555', marginTop: '4px' }}>วันที่ / Date ......../......../........</div>
                        </div>
                        <div style={{ flex: 1, border: '1px solid #1a7a3a', borderRadius: '8px', padding: '15px 10px', textAlign: 'center' }}>
                            <div style={{ height: '50px' }}></div>
                            <div style={{ borderBottom: '1px dotted #000', width: '80%', margin: '0 auto 5px' }}></div>
                            <div style={{ fontSize: '10pt' }}>ผู้รับทราบการผลิต / Production</div>
                            <div style={{ fontSize: '9pt', color: '#555', marginTop: '4px' }}>วันที่ / Date ......../......../........</div>
                        </div>
                    </div>

                    <style>
                        {`
                        @page {
                            size: A4;
                            margin: 0mm;
                        }
                        @media print {
                            body {
                                margin: 0 !important;
                                padding: 0 !important;
                                background-color: #fff !important;
                            }
                            body * { 
                                visibility: hidden; 
                            }
                            .so-document, .so-document * { 
                                visibility: visible; 
                                -webkit-print-color-adjust: exact !important; 
                                print-color-adjust: exact !important; 
                            }
                            .so-document { 
                                position: absolute !important; 
                                left: 0 !important; 
                                top: 0 !important; 
                                width: 100% !important; 
                                margin: 0 !important; 
                                padding: 5mm 10mm !important; 
                                box-sizing: border-box !important; 
                                box-shadow: none !important;
                            }
                        }
                        `}
                    </style>
                </div>
            </div>
        );
    }

    return (
        <div style={{ animation: 'slideUp 0.3s ease-out' }}>
            <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', marginBottom: 16, border: '1px solid var(--primary-light, #818cf8)', borderRadius: 6, background: '#fff', color: 'var(--primary, #4f46e5)', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                <ArrowLeft size={16} /> กลับ
            </button>

            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>
                    {viewOnly ? '📄 รายละเอียด Sales Order' : editId ? '✏️ แก้ไข Sales Order' : '📦 สร้าง Sales Order ใหม่'}
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                    {viewOnly ? 'ดูรายละเอียดคำสั่งขาย' : editId ? 'แก้ไขข้อมูลคำสั่งขาย' : 'สร้างคำสั่งขายใหม่จากใบเสนอราคาหรือกรอกข้อมูลเอง'}
                </p>
            </div>

            {/* ── อ้างอิง Quotation ── */}
            {!editId && (
                <div style={sectionStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-light, #f1f5f9)' }}>
                        <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#16a34a' }}>📋</div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>อ้างอิงใบเสนอราคา</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>เลือกจากใบเสนอราคาที่อนุมัติแล้ว หรือปล่อยว่างเพื่อสร้าง Manual</div>
                        </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <div style={{ 
                            display: 'flex', alignItems: 'center', 
                            border: selectedQT ? '1px solid #22c55e' : '1px solid var(--border)', 
                            borderRadius: 6, 
                            background: selectedQT ? '#f0fdf4' : '#fff', 
                            padding: '0 12px' 
                        }}>
                            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                            {isFetchingQT ? (
                                <Loader2 size={16} color="#16a34a" style={{ animation: 'spin 1s linear infinite' }} />
                            ) : selectedQT ? (
                                <span style={{ color: '#16a34a', fontSize: 14 }}>✅</span>
                            ) : (
                                <Search size={16} color="#94a3b8" />
                            )}
                            <input 
                                type="text" 
                                placeholder="พิมพ์เลขที่ QT หรือชื่อลูกค้าเพื่อค้นหา (หรือปล่อยว่างเพื่อสร้าง Manual)" 
                                value={isFetchingQT ? 'กำลังดึงข้อมูล...' : selectedQT ? `อ้างอิงจาก ${selectedQT} เรียบร้อย` : qtSearchText} 
                                onChange={e => { setQtSearchText(e.target.value); setShowQtDropdown(true); }}
                                onFocus={() => { if (!selectedQT) setShowQtDropdown(true); }}
                                readOnly={!!selectedQT || isFetchingQT}
                                style={{ 
                                    width: '100%', border: 'none', padding: '10px', outline: 'none', fontSize: 13, 
                                    background: 'transparent', 
                                    color: selectedQT || isFetchingQT ? '#15803d' : 'var(--text)',
                                    fontWeight: selectedQT ? 600 : 400
                                }}
                            />
                            {selectedQT && !isFetchingQT ? (
                                <button onClick={handleClearQT} style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', padding: 4, borderRadius: '50%', color: '#ef4444', display: 'flex' }} title="ยกเลิกการอ้างอิง">
                                    <X size={14} />
                                </button>
                            ) : qtSearchText && !selectedQT && !isFetchingQT ? (
                                <button onClick={() => { setQtSearchText(''); setShowQtDropdown(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', display: 'flex' }}>
                                    <X size={14} />
                                </button>
                            ) : null}
                        </div>
                        
                        {!selectedQT && showQtDropdown && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setShowQtDropdown(false)} />
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, marginTop: 4, maxHeight: 250, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                        {filteredQTs.length === 0 ? (
                                            <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                                                ไม่พบใบเสนอราคาที่ค้นหา
                                            </div>
                                        ) : (
                                            filteredQTs.map(q => (
                                                <div 
                                                    key={q.QuotationID} 
                                                    onClick={() => { handleSelectQT(q.QuotationID); setShowQtDropdown(false); setQtSearchText(''); }}
                                                    style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                        <strong style={{ color: 'var(--text)', fontSize: 13 }}>{q.QuotationNo}</strong>
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>฿{(q.GrandTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{q.CustomerName}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                </div>
            )}

            {/* ── อ้างอิงสัญญา ── */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-light, #f1f5f9)' }}>
                    <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, color: '#d97706' }}>📄</div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>อ้างอิงสัญญา</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>เลือกสัญญาเพื่อผูกข้อมูล หรือข้ามถ้าไม่มี</div>
                    </div>
                </div>
                <div>
                    <select 
                        style={inputStyle} 
                        name="contractId" 
                        value={formData.contractId} 
                        onChange={handleFormChange}
                    >
                        <option value="">-- ไม่ระบุสัญญา / ไม่ได้เชื่อมโยง --</option>
                        {contracts.map(c => (
                            <option key={c.ContractID} value={c.ContractID}>
                                {c.ContractNo} - {c.ContractName} {c.CustomerName ? `(${c.CustomerName})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── ข้อมูลลูกค้า ── */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-light, #f1f5f9)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--primary)' }}>👤</div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>ข้อมูลลูกค้า</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ข้อมูลลูกค้าและรายละเอียดการสั่งซื้อ</div>
                        </div>
                    </div>
                    <button type="button" className="btn-primary" onClick={openCustomerModal} style={{ padding: '6px 12px', fontSize: '13px' }}>
                        🔍 เลือกลูกค้าจากฐานข้อมูล
                    </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>ชื่อลูกค้า <span style={{ color: '#ef4444' }}>*</span></label>
                        <input style={inputStyle} name="customerName" value={formData.customerName} onChange={handleFormChange} placeholder="ชื่อบริษัท/ลูกค้า" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>เลข PO ลูกค้า (ถ้ามี)</label>
                        <input style={inputStyle} name="customerPONumber" value={formData.customerPONumber} onChange={handleFormChange} placeholder="PO-XXXX ของลูกค้า" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>ที่อยู่</label>
                        <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} name="address" value={formData.address} onChange={handleFormChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>โทรศัพท์</label>
                        <input style={inputStyle} name="phone" value={formData.phone} onChange={handleFormChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>เลขผู้เสียภาษี</label>
                        <input style={inputStyle} name="taxId" value={formData.taxId} onChange={handleFormChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>สำนักงานใหญ่ / สาขา</label>
                        <select style={inputStyle} name="taxBranch" value={formData.taxBranch} onChange={handleFormChange}>
                            <option value="head_office">สำนักงานใหญ่</option>
                            <option value="branch">สาขา</option>
                        </select>
                    </div>
                    {formData.taxBranch === 'branch' ? (
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>รหัสสาขา</label>
                            <input style={inputStyle} name="branchNo" placeholder="เช่น 00001" value={formData.branchNo} onChange={handleFormChange} maxLength={5} />
                        </div>
                    ) : (
                        <div></div>
                    )}
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>วันที่สั่งซื้อ</label>
                        <input style={inputStyle} type="date" name="orderDate" value={formData.orderDate} onChange={handleFormChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>วันที่ต้องการส่ง <span style={{ color: '#ef4444' }}>*</span></label>
                        <input style={inputStyle} type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleFormChange} />
                    </div>
                </div>
            </div>

            {/* ── รายการสินค้า ── */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-light, #f1f5f9)' }}>
                    <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, color: '#2563eb' }}>📦</div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>รายการสินค้า</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>สินค้าที่ลูกค้าสั่งซื้อ</div>
                    </div>
                </div>

                {items.map((item, idx) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 14, border: '1px solid var(--border)', borderRadius: 6, marginBottom: 10, background: 'var(--bg-white)' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 24, paddingTop: 10 }}>{idx + 1}.</span>
                        <div style={{ flex: 3, minWidth: 200 }}>
                            <input 
                                style={inputStyle} 
                                value={item.name} 
                                onChange={e => handleItemChange(item.id, 'name', e.target.value)} 
                                placeholder="ชื่อสินค้า" 
                                list={`products_list_${item.id}`}
                            />
                            <datalist id={`products_list_${item.id}`}>
                                {Object.keys(PRODUCT_CATALOG).map(pName => <option key={pName} value={pName} />)}
                            </datalist>
                        </div>
                        <div style={{ flex: 1, minWidth: 80 }}>
                            <input style={{ ...inputStyle, textAlign: 'right' }} type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', e.target.value)} placeholder="จำนวน" />
                        </div>
                        <div style={{ flex: 1, minWidth: 70 }}>
                            <input style={inputStyle} value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} placeholder="หน่วย" />
                        </div>
                        <div style={{ flex: 1, minWidth: 100 }}>
                            <input style={{ ...inputStyle, textAlign: 'right' }} type="number" value={item.price} onChange={e => handleItemChange(item.id, 'price', e.target.value)} placeholder="ราคา/หน่วย" />
                        </div>
                        <div style={{ flex: 1, minWidth: 90, textAlign: 'right', fontWeight: 600, color: 'var(--primary)', paddingTop: 10, fontSize: 13 }}>
                            ฿{((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </div>
                        {items.length > 1 && (
                            <button onClick={() => removeItem(item.id)} style={{ width: 30, height: 30, border: 'none', background: '#fef2f2', color: '#ef4444', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                ))}

                <button onClick={addItem} style={{ width: '100%', padding: 8, background: 'transparent', color: 'var(--primary)', border: '1px dashed var(--primary-light, #818cf8)', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                    <Plus size={14} /> เพิ่มรายการ
                </button>
            </div>

            {/* ── สรุปยอด ── */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-light, #f1f5f9)' }}>
                    <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, color: '#d97706' }}>💰</div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>สรุปยอดเงิน</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>ส่วนลด (%)</label>
                        <input style={inputStyle} type="number" name="discountPercent" value={formData.discountPercent} onChange={handleFormChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>VAT (%)</label>
                        <input style={inputStyle} type="number" name="vatRate" value={formData.vatRate} onChange={handleFormChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>ค่าจัดส่ง (บาท)</label>
                        <input style={inputStyle} type="number" name="shippingCost" value={formData.shippingCost} onChange={handleFormChange} />
                    </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                    {[
                        { label: 'ยอดรวมก่อนส่วนลด', value: subTotal },
                        formData.discountPercent > 0 && { label: `ส่วนลด (${formData.discountPercent}%)`, value: -discountAmount },
                        formData.vatRate > 0 && { label: `VAT (${formData.vatRate}%)`, value: vatAmount },
                        shipping > 0 && { label: 'ค่าจัดส่ง', value: shipping },
                    ].filter(Boolean).map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light, #f1f5f9)' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{row.label}</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>฿{row.value.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>ยอดรวมสุทธิ</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* ── หมายเหตุ ── */}
            <div style={sectionStyle}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>หมายเหตุ</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} name="notes" value={formData.notes} onChange={handleFormChange} placeholder="หมายเหตุเพิ่มเติม..." />
            </div>

            {/* ── ปุ่ม ── */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={onBack} style={{ flex: 1, padding: '10px 16px', background: 'var(--bg-white)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                    ยกเลิก
                </button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px 16px', background: 'var(--primary, #4f46e5)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1 }}>
                    <Save size={16} /> {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'สร้าง Sales Order'}
                </button>
            </div>
            
            {/* Customer Selection Modal */}
            {showCustomerModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '10px', width: '700px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '18px' }}>เลือกลูกค้า</h2>
                            <button onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>&times;</button>
                        </div>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #eee' }}>
                            <input 
                                type="text" 
                                placeholder="ค้นหาชื่อ, รหัส, ผู้ติดต่อ..." 
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                            />
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1, padding: '0' }}>
                            <table className="data-table" style={{ border: 'none', minWidth: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>รหัสลูกค้า</th>
                                        <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>ชื่อลูกค้า</th>
                                        <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>ผู้ติดต่อ</th>
                                        <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'center' }}>เลือก</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                        <tr key={c.CustomerID} className="hover-row">
                                            <td style={{ color: '#4f46e5', fontWeight: '500' }}>{c.CustomerCode}</td>
                                            <td style={{ fontWeight: '500' }}>{c.CustomerName}</td>
                                            <td>{c.ContactPerson || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button type="button" onClick={() => handleSelectCustomer(c)} className="btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                                                    เลือก
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>ไม่พบข้อมูลลูกค้า</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { Save, Printer, ArrowLeft, Plus, Trash2, FileText, CheckCircle } from 'lucide-react';
import { useAlert } from '../components/CustomAlert';
import '../pages/PageCommon.css';

const styles = `
.q-form-wrapper {
    font-family: 'Inter', 'Sarabun', sans-serif;
    background: transparent;
    padding: 0;
}

.q-container {
    width: 100%;
    animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
}

.q-header {
    margin-bottom: 24px;
}

.q-header h1 {
    color: var(--text, #1e293b);
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 4px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.q-header p {
    color: var(--text-secondary, #475569);
    font-size: 13px;
    margin: 0;
}

.q-back-btn {
    background: #ffffff;
    color: var(--primary, #4f46e5);
    padding: 8px 16px;
    border: 1px solid var(--primary-light, #818cf8);
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    margin-bottom: 16px;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.q-back-btn:hover {
    background: #eef2ff;
    border-color: var(--primary, #4f46e5);
}

/* ===== Section Card ===== */
.q-section {
    background: var(--bg-white, #fff);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 16px;
}

.q-section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border-light, #f1f5f9);
}

.q-section-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg, #f8fafc);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 8px;
    color: var(--primary, #4f46e5);
    flex-shrink: 0;
}

.q-section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text, #1e293b);
    margin: 0;
}

.q-section-desc {
    font-size: 12px;
    color: var(--text-muted, #94a3b8);
    margin: 2px 0 0;
}

/* ===== Form Controls ===== */
.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    color: var(--text-secondary, #475569);
    font-weight: 500;
    margin-bottom: 6px;
    font-size: 13px;
}

.form-group label .required {
    color: var(--danger, #ef4444);
    margin-left: 3px;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    transition: border-color 0.2s;
    background: var(--bg-white, #fff);
    color: var(--text, #1e293b);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--primary, #4f46e5);
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.08);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

/* Products Section */
.product-item {
    background: var(--bg-white, #fff);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 6px;
    padding: 14px;
    margin-bottom: 10px;
    transition: border-color 0.15s;
}

.product-item:hover {
    border-color: var(--primary-light, #818cf8);
}

.product-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    flex-wrap: wrap;
}

.product-pic {
    flex: 1;
    min-width: 110px;
    margin-bottom: 0 !important;
}

.product-input {
    flex: 2;
    min-width: 240px;
    margin-bottom: 0 !important;
}

.qty-group, .price-group {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-white, #fff);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 6px;
    padding: 2px 8px 2px 4px;
    flex: 1;
    transition: border-color 0.15s;
}

.qty-group:focus-within, .price-group:focus-within {
    border-color: var(--primary, #4f46e5);
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.08);
}

.qty-group { min-width: 110px; }
.price-group { min-width: 130px; }

.product-qty,
.product-price {
    width: 100%;
    padding: 7px;
    border: none !important;
    font-size: 13px;
    text-align: right;
    background: transparent !important;
}

.product-qty:focus, .product-price:focus {
    outline: none !important;
    box-shadow: none !important;
}

.qty-label {
    color: var(--text-muted, #94a3b8);
    font-size: 12px;
    white-space: nowrap;
}

.row-amount {
    flex: 1;
    min-width: 90px;
    text-align: right;
    font-weight: 600;
    color: var(--primary, #4f46e5);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    font-size: 13px;
    min-height: 36px;
}

.remove-product-btn {
    width: 30px;
    height: 30px;
    border: none;
    background: #fef2f2;
    color: var(--danger, #ef4444);
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 4px;
}

.remove-product-btn:hover {
    background: #fecaca;
}

.add-product-btn {
    width: 100%;
    padding: 8px;
    background: transparent;
    color: var(--primary, #4f46e5);
    border: 1px dashed var(--primary-light, #818cf8);
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 10px;
}

.add-product-btn:hover {
    background: #eef2ff;
}

/* Payment Summary */
.payment-summary {
    margin: 0;
    padding: 0;
}

.payment-summary h3 {
    display: none;
}

.payment-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-light, #f1f5f9);
    align-items: center;
}

.payment-row .label { color: var(--text-secondary, #475569); font-size: 13px; }
.payment-row .value { font-weight: 600; color: var(--text, #1e293b); font-size: 13px; }

.submit-btn {
    width: 100%;
    padding: 10px 16px;
    background: var(--primary, #4f46e5);
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background-color 0.15s;
    flex: 2;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
}

.submit-btn:hover {
    background: var(--primary-dark, #3730a3);
}

.submit-btn:disabled {
    background: var(--text-muted, #94a3b8);
    cursor: not-allowed;
}

.print-btn {
    background: var(--bg-white, #fff);
    color: var(--text-secondary, #475569);
    border: 1px solid var(--border, #e2e8f0);
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
}
.print-btn:hover { background: var(--bg, #f8fafc); }

@media (max-width: 600px) {
    .form-row { grid-template-columns: 1fr; }
    .product-row { flex-direction: column; align-items: stretch; }
    .remove-product-btn { align-self: flex-end; }
}

/* ------------------------------------ */
/* CSS สำหรับการพิมพ์ (Media Print) */
/* ------------------------------------ */
@media print {
    body * { visibility: hidden; }
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    #q-print-container, #q-print-container * {
        visibility: visible;
    }
    .q-form-wrapper > *:not(#q-print-container) {
        display: none !important;
    }
    #q-print-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        color: black;
        font-family: 'Sarabun', sans-serif;
        font-size: 11pt;
        line-height: 1.2;
    }
    @page { size: A4; margin: 5mm 7mm; }

    .print-color-green { color: #27ae60 !important; }
    .print-color-red { color: red !important; }
    .print-color-blue { color: #2980b9 !important; }
    
    .print-bg-gray {
        background-color: #e6e6e6 !important;
        box-shadow: inset 0 0 0 1000px #e6e6e6 !important;
    }
    
    .print-notes-container span[style*="color:red"],
    .print-notes-container span[style*="color: red"],
    .print-notes-container div[style*="color:red"],
    .print-notes-container div[style*="color: red"] {
        color: red !important;
    }
    
    .print-header-table { width: 100%; border-collapse: collapse; border: none; margin-bottom: 0px; }
    .print-header-table td { border: none; }
    
    .print-info-table {
        width: 100%; border-collapse: collapse; border: 1px solid black; border-top: none;
        margin-bottom: 0; table-layout: fixed;
    }
    .print-info-table td { border-bottom: none; padding: 4px 8px; word-wrap: break-word; font-weight: 300; font-size: 10pt; }
    
    .print-products-table { width: 100%; border-collapse: collapse; border: 1px solid black; border-top: none; table-layout: fixed; }
    .print-products-table th { border: 1px solid black; text-align: center; padding: 4px 2px; font-size: 10pt; }
    .print-products-table td { border: 1px solid black; text-align: center; padding: 2px 4px; font-size: 10pt; font-weight: 300; word-wrap: break-word; }
    
    .print-footer-table { width: 100%; border-collapse: collapse; border: 1px solid black; border-top: none; table-layout: fixed; }
    .print-footer-table td { padding: 2px 4px; font-size: 10pt; }
    
    .print-signature-table { width: 100%; border-collapse: collapse; border: 1px solid black; border-top: none; }
}
@media screen {
    #q-print-container {
        display: none;
    }
}
`;

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

const PRODUCT_CATALOG = {
    "ยาดมสมุนไพร": { price: 79, promo: { qty: 50, price: 20 } },
    "ยาดมสมุนไพร จัมโบ้": { price: 490, promo: { qty: 5, price: 200 } },
    "ยาหม่อง": { price: 59, promo: { qty: 40, price: 25 } },
    "ยาน้ำมัน ขนาด 10 มล.": { price: 129, promo: { qty: 17, price: 59 } },
    "ยาน้ำมัน ขนาด 5 มล.": { price: 69, promo: { qty: 25, price: 40 } },
    "ยาน้ำมันสมุนไพร สูตรเย็น": { price: 199, promo: { qty: 14, price: 71 } },
    "ยาน้ำมันสมุนไพร สูตรร้อน": { price: 199, promo: { qty: 14, price: 71 } },
    "ยาสเปรย์ผสมกระดูกไก่ดำ": { price: 199, promo: { qty: 14, price: 71 } },
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

export default function QuotationForm({ editId, onBack, onSave, viewOnly, isHistory }) {
    const { showConfirm, showAlert } = useAlert();
    const [status, setStatus] = useState(null);

    const [formData, setFormData] = useState({
        docType: 'quotation_thc', // quotation_thc, quotation_psf, quotation_elt
        billStatus: 'ktb',
        billNo: `QT${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`,
        billDate: new Date().toISOString().split('T')[0],
        customerTypeId: '',
        customerName: '',
        contactPerson: '',
        email: '',
        address: '',
        phone: '',
        taxId: '',
        discountPercent: 0,
        vatRate: 0,
        shippingCost: 0,
        depositPercent: '0',
        customDepositAmount: 0,
        signer: '',
        notes: `<div style="font-weight:bold; color: black;">หมายเหตุ:
    <br>
    <span style="color:red; font-size: 11pt;">ชำระมัดจำ 50 % ณ วันที่สั่งซื้อ หรือสั่งผลิต ชำระส่วนที่เหลือ วันที่รับสินค้า</span>
    <br>
    <span style="color:red;">ห้ามวางจำหน่ายตามร้านค้าทั่วไป!</span>
</div>
<div style="color:red; margin-left: 20px;">- สินค้าไม่ผ่านกระบวนการทาง อย.</div>
<div style="color:red; margin-left: 20px;">- สินค้าสามารถขายได้เฉพาะงานมงคล งานบุญ งานขาวดำ</div>
<div style="color:red; margin-left: 30px;">ใช้เป็นของชำร่วย ,ของฝาก,ของขวัญ</div>
<div style="color:red; margin-left: 20px;">- สินค้าขายเฉพาะกลุ่ม</div>
<div style="color:red; margin-left: 30px;">(ราคารวมฉลากและรูปแบบโลโก้ชื่อแบรนด์)</div>
<div style="color:red; text-align: center; font-weight: bold;">**ราคานี้ยังไม่รวมค่าจัดส่ง**</div>`,
        showDiscountInPrint: false,
        showVatInPrint: false,
        showDepositInPrint: true,
        designFee: 500,
        showDesignFeeInPrint: false
    });

    useEffect(() => {
        if (formData.notes && !formData.notes.includes('<div')) {
            setFormData(prev => ({
                ...prev,
                notes: `<div style="font-weight:bold; color: black;">หมายเหตุ:
    <br>
    <span style="color:red; font-size: 11pt;">ชำระมัดจำ 50 % ณ วันที่สั่งซื้อ หรือสั่งผลิต ชำระส่วนที่เหลือ วันที่รับสินค้า</span>
    <br>
    <span style="color:red;">ห้ามวางจำหน่ายตามร้านค้าทั่วไป!</span>
</div>
<div style="color:red; margin-left: 20px;">- สินค้าไม่ผ่านกระบวนการทาง อย.</div>
<div style="color:red; margin-left: 20px;">- สินค้าสามารถขายได้เฉพาะงานมงคล งานบุญ งานขาวดำ</div>
<div style="color:red; margin-left: 30px;">ใช้เป็นของชำร่วย ,ของฝาก,ของขวัญ</div>
<div style="color:red; margin-left: 20px;">- สินค้าขายเฉพาะกลุ่ม</div>
<div style="color:red; margin-left: 30px;">(ราคารวมฉลากและรูปแบบโลโก้ชื่อแบรนด์)</div>
<div style="color:red; text-align: center; font-weight: bold;">**ราคานี้ยังไม่รวมค่าจัดส่ง**</div>`
            }));
        }
    }, [formData.notes]);

    // Fetch existing quotation for editing
    useEffect(() => {
        if (editId) {
            const fetchQuotation = async () => {
                try {
                    const isHistoryEdit = String(editId).startsWith('history-');
                    const targetId = isHistoryEdit ? editId.split('-')[1] : editId;
                    const endpoint = isHistoryEdit ? `/api/quotations/history/${targetId}` : `/api/quotations/${targetId}`;
                    const res = await fetch(`http://localhost:5000${endpoint}`);
                    const json = await res.json();
                    if (json.success) {
                        const data = json.data;
                        
                        setFormData({
                            docType: data.DocType || 'quotation_thc',
                            billStatus: data.BankAccount || 'ktb',
                            billNo: data.QuotationNo || '',
                            billDate: data.BillDate ? data.BillDate.split('T')[0] : '',
                            customerName: data.CustomerName || '',
                            address: data.Address || '',
                            phone: data.Phone || '',
                            taxId: data.TaxID || '',
                            discountPercent: data.DiscountPercent || 0,
                            vatRate: data.VatRate || 0,
                            shippingCost: data.ShippingCost || 0,
                            depositPercent: data.DepositPercent || '0',
                            customDepositAmount: data.DepositPercent === 'custom' ? data.DepositAmount : 0,
                            signer: data.Signer || '',
                            notes: data.Notes || '',
                            showDiscountInPrint: data.ShowDiscountInPrint,
                            showVatInPrint: data.ShowVatInPrint,
                            showDepositInPrint: data.ShowDepositInPrint,
                            designFee: data.DesignFee !== undefined ? parseFloat(data.DesignFee) : 500,
                            showDesignFeeInPrint: data.ShowDesignFeeInPrint !== undefined ? data.ShowDesignFeeInPrint : false
                        });

                        if (data.items && data.items.length > 0) {
                            setItems(data.items.map(item => ({
                                id: item.ItemID,
                                name: item.ItemName,
                                qty: item.Qty,
                                price: item.Price,
                                amount: item.Amount,
                                isPromo: item.IsPromo,
                                promoMultiplier: item.PromoMultiplier,
                                image: item.ImageURL || '',
                                showDropdown: false
                            })));
                        }
                    }
                } catch (err) {
                    console.error('Error fetching quotation for edit:', err);
                }
            };
            fetchQuotation();
        }
    }, [editId]);

    const [items, setItems] = useState([
        { id: 1, name: '', qty: '', price: '', isPromo: false, promoMultiplier: 1, showDropdown: false }
    ]);

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const nextData = { ...prev, [name]: type === 'checkbox' ? checked : value };
            
            // Auto-select bank logic
            if (name === 'docType') {
                if (value === 'quotation_psf') {
                    nextData.billStatus = 'kbank';
                } else if (value === 'quotation_thc' || value === 'quotation_elt') {
                    if (prev.billStatus === 'kbank') {
                        nextData.billStatus = 'ktb';
                    }
                }
            }
            
            return nextData;
        });
    };

    const addItem = () => {
        setItems(prev => [...prev, { id: Date.now(), name: '', qty: '', price: '', isPromo: false, promoMultiplier: 1, showDropdown: false }]);
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(prev => prev.filter(item => item.id !== id));
        }
    };

    const handleItemChange = (id, field, value) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const newItem = { ...item, [field]: value };
                
                if (field === 'name') {
                    if (PRODUCT_CATALOG[value]) {
                        if (newItem.isPromo && PRODUCT_CATALOG[value].promo) {
                            const pData = PRODUCT_CATALOG[value].promo;
                            newItem.qty = pData.qty * newItem.promoMultiplier;
                            newItem.price = pData.price;
                        } else {
                            newItem.isPromo = false;
                            newItem.promoMultiplier = 1;
                            if (PRODUCT_CATALOG[value].price !== '') {
                                newItem.price = PRODUCT_CATALOG[value].price;
                            }
                        }
                    } else {
                        newItem.isPromo = false;
                        newItem.promoMultiplier = 1;
                    }
                } else if (field === 'isPromo') {
                    if (value && PRODUCT_CATALOG[newItem.name] && PRODUCT_CATALOG[newItem.name].promo) {
                        const pData = PRODUCT_CATALOG[newItem.name].promo;
                        newItem.qty = pData.qty * newItem.promoMultiplier;
                        newItem.price = pData.price;
                    } else {
                        newItem.qty = '';
                        if (PRODUCT_CATALOG[newItem.name] && PRODUCT_CATALOG[newItem.name].price !== '') {
                            newItem.price = PRODUCT_CATALOG[newItem.name].price;
                        } else {
                            newItem.price = '';
                        }
                    }
                } else if (field === 'promoMultiplier') {
                    if (newItem.isPromo && PRODUCT_CATALOG[newItem.name] && PRODUCT_CATALOG[newItem.name].promo) {
                        const pData = PRODUCT_CATALOG[newItem.name].promo;
                        newItem.qty = pData.qty * parseInt(value, 10);
                        newItem.price = pData.price;
                    }
                }
                
                return newItem;
            }
            return item;
        }));
    };

    const handleImageUpload = (id, event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleItemChange(id, 'image', reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // การคำนวณยอดเงิน
    const subTotal = items.reduce((sum, item) => {
        if (item.isPromo) {
            return sum + (1000 * (parseInt(item.promoMultiplier) || 1));
        }
        return sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0));
    }, 0);
    const discountAmount = formData.showDiscountInPrint ? (subTotal * (parseFloat(formData.discountPercent) || 0) / 100) : 0;
    const afterDiscount = subTotal - discountAmount;
    const vatAmount = formData.showVatInPrint ? (afterDiscount * (parseFloat(formData.vatRate) || 0) / 100) : 0;
    const shipping = parseFloat(formData.shippingCost) || 0;
    const designFee = formData.showDesignFeeInPrint ? (parseFloat(formData.designFee) || 0) : 0;
    const grandTotal = afterDiscount + vatAmount + shipping + designFee;

    let depositAmount = 0;
    if (formData.depositPercent === 'custom') {
        depositAmount = parseFloat(formData.customDepositAmount) || 0;
    } else {
        depositAmount = grandTotal * (parseFloat(formData.depositPercent) || 0) / 100;
    }
    const remainingAmount = grandTotal - depositAmount;

    // Company Data
    let compNameTH = '';
    let compNameEN = '';
    let compAddr1 = '';
    let compAddr2 = '';
    let compTax = '';
    let compLogo = '';

    const isElt = formData.docType.includes('elt');
    const isPsf = formData.docType.includes('psf');

    if (isElt) {
        compNameTH = 'บริษัท อิลิท เทรดดิ้ง 2020 จำกัด (สำนักงานใหญ่)';
        compNameEN = '';
        compAddr1 = 'เลขที่ 6/8 หมู่ที่ 2 แขวง/ตำบล ไทรม้า เขต/อำเภอเมืองนนทบุรี';
        compAddr2 = 'จ.นนทบุรี รหัสไปรษณีย์ 11000 โทร:063-898-9895';
        compTax = 'เลขผู้เสียภาษี: 0125563029289';
        compLogo = '/images/logos/logo-elt.png';
    } else if (isPsf) {
        compNameTH = 'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด (สำนักงานใหญ่)';
        compNameEN = '';
        compAddr1 = 'เลขที่ 12 ซอยนนทบุรี 11/3 ต.บางกระสอ อ.เมืองนนทบุรี จ.นนทบุรี 11000';
        compAddr2 = '';
        compTax = 'เลขประจำตัวผู้เสียภาษี 0125566026612';
        compLogo = '/images/logos/logo-psf.png';
    } else {
        compNameTH = 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์ (สำนักงานใหญ่)';
        compNameEN = 'Thai Herb Centers(THC)Community Enterprise (HEAD OFFICE)';
        compAddr1 = '6/10 หมู่ที่ 2 ต.ไทรม้า อ.เมืองนนทบุรี จ.นนทบุรี 11000';
        compAddr2 = '6/10 Moo 2 Sai Ma subdistrict,Mueang Nonthaburi District,Nonthabui Province,Thailand 11000';
        compTax = 'โทร:083-9799389 / เลขประจำตัวผู้เสียภาษี 099-200438186-0';
        compLogo = '/images/logos/logo-thc.png';
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const ok = await showConfirm('ยืนยันการบันทึก', 'คุณต้องการบันทึกใบเสนอราคานี้ใช่หรือไม่?', 'info');
        if (!ok) return;

        if (!formData.customerTypeId) {
            showAlert('ข้อผิดพลาด', 'กรุณาระบุประเภทลูกค้าก่อนบันทึก', 'warning');
            return;
        }

        setStatus('saving');

        const payload = {
            quotationNo: formData.billNo,
            docType: formData.docType,
            bankAccount: formData.billStatus,
            customerTypeId: formData.customerTypeId,
            customerName: formData.customerName,
            contactPerson: formData.contactPerson,
            email: formData.email,
            address: formData.address,
            phone: formData.phone,
            taxId: formData.taxId,
            billDate: formData.billDate,
            validUntil: new Date(new Date(formData.billDate).getTime() + 30*24*60*60*1000).toISOString().split('T')[0],
            subTotal: subTotal,
            discountPercent: formData.discountPercent,
            discountAmount: discountAmount,
            afterDiscount: afterDiscount,
            vatRate: formData.vatRate,
            vatAmount: vatAmount,
            shippingCost: formData.shippingCost,
            grandTotal: grandTotal,
            depositPercent: formData.depositPercent,
            depositAmount: depositAmount,
            remainingAmount: remainingAmount,
            signer: formData.signer,
            notes: formData.notes,
            showDiscountInPrint: formData.showDiscountInPrint,
            showVatInPrint: formData.showVatInPrint,
            showDepositInPrint: formData.showDepositInPrint,
            showShippingInPrint: true,
            designFee: designFee,
            showDesignFeeInPrint: formData.showDesignFeeInPrint,
            status: editId ? undefined : 'พร้อมใช้', // Keep existing status if editing
            items: items.filter(i => i.name).map(i => ({
                name: i.name,
                qty: i.qty,
                price: i.price,
                amount: i.isPromo ? 1000 * i.promoMultiplier : i.qty * i.price,
                isPromo: i.isPromo,
                promoMultiplier: i.promoMultiplier,
                imageURL: i.image || i.imageURL
            }))
        };

        try {
            const url = editId ? `http://localhost:5000/api/quotations/${editId}` : 'http://localhost:5000/api/quotations';
            const method = editId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.success) {
                setStatus('success');
                showAlert('สำเร็จ', 'บันทึกข้อมูลใบเสนอราคาเรียบร้อยแล้ว', 'success');
                setTimeout(() => {
                    if (onSave) onSave();
                    setStatus(null);
                }, 1000);
            } else {
                console.error('Save failed:', json.message);
                setStatus('error');
                showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้: ' + (json.message || 'Unknown error'), 'error');
            }
        } catch (err) {
            console.error('Error saving quotation:', err);
            setStatus('error');
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error');
        }
    };

    const validItemsCount = items.filter(it => it.name).length;
    let cellHeight = 'auto';
    let imgSize = '55px';
    if (validItemsCount <= 2) { cellHeight = '110px'; imgSize = '100px'; }
    else if (validItemsCount === 3) { cellHeight = '90px'; imgSize = '80px'; }
    else if (validItemsCount <= 5) { cellHeight = '50px'; imgSize = '40px'; }
    else if (validItemsCount === 6) { cellHeight = '40px'; imgSize = '34px'; }
    else { cellHeight = '35px'; imgSize = '30px'; }

    return (
        <div className="q-form-wrapper">
            <style>{styles}</style>
            
            {viewOnly && (
                <>
                    <style>{`
                        @media screen {
                            .q-form-wrapper > *:not(#q-print-container):not(.view-only-controls):not(style) { 
                                display: none !important; 
                            }
                            #q-print-container { 
                                display: block !important; 
                                position: static !important;
                                width: 210mm; 
                                min-height: 297mm; 
                                margin: 0 auto; 
                                background: white; 
                                padding: 10mm;
                                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                                color: black;
                                font-family: 'Sarabun', sans-serif;
                                font-size: 11pt;
                                line-height: 1.2;
                            }
                            /* ── Color classes ── */
                            #q-print-container .print-color-green { color: #27ae60 !important; }
                            #q-print-container .print-color-red { color: red !important; }
                            #q-print-container .print-color-blue { color: #2980b9 !important; }
                            #q-print-container .print-bg-gray {
                                background-color: #e6e6e6 !important;
                            }
                            /* ── Notes container color fix ── */
                            #q-print-container .print-notes-container span[style*="color:red"],
                            #q-print-container .print-notes-container span[style*="color: red"],
                            #q-print-container .print-notes-container div[style*="color:red"],
                            #q-print-container .print-notes-container div[style*="color: red"] {
                                color: red !important;
                            }
                            /* ── Header table ── */
                            #q-print-container .print-header-table { width: 100%; border-collapse: collapse; border: none; margin-bottom: 0; }
                            #q-print-container .print-header-table td { border: none; }
                            /* ── Info table ── */
                            #q-print-container .print-info-table {
                                width: 100%; border-collapse: collapse; border: 1px solid black; border-top: none;
                                margin-bottom: 0; table-layout: fixed;
                            }
                            #q-print-container .print-info-table td { border-bottom: none; padding: 4px 8px; word-wrap: break-word; font-weight: 300; font-size: 10pt; }
                            /* ── Products table ── */
                            #q-print-container .print-products-table { width: 100%; border-collapse: collapse; border: 1px solid black; border-top: none; table-layout: fixed; }
                            #q-print-container .print-products-table th { border: 1px solid black; text-align: center; padding: 4px 2px; font-size: 10pt; }
                            #q-print-container .print-products-table td { border: 1px solid black; text-align: center; padding: 2px 4px; font-size: 10pt; font-weight: 300; word-wrap: break-word; }
                            /* ── Footer table ── */
                            #q-print-container .print-footer-table { width: 100%; border-collapse: collapse; border: 1px solid black; border-top: none; table-layout: fixed; }
                            #q-print-container .print-footer-table td { padding: 2px 4px; font-size: 10pt; }
                            /* ── Signature table ── */
                            #q-print-container .print-signature-table { width: 100%; border-collapse: collapse; border: 1px solid black; border-top: none; }
                        }
                    `}</style>
                    <div className="view-only-controls" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                        <button className="btn-back-text" type="button" onClick={onBack}>
                            <ArrowLeft size={16} /> กลับไปหน้ารายการ
                        </button>
                        <button className="btn-primary" type="button" onClick={handlePrint}>
                            <Printer size={16} /> พิมพ์ใบเสนอราคา
                        </button>
                    </div>
                    {isHistory && (
                        <div className="view-only-controls" style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fde68a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500', justifyContent: 'center' }}>
                            🕒 นี่คือเอกสารเวอร์ชั่นเก่าสำหรับดูประวัติ (ไม่สามารถแก้ไขได้)
                        </div>
                    )}
                </>
            )}

            <div className="q-container" style={{ display: viewOnly ? 'none' : 'block' }}>
                <div style={{ marginBottom: '16px' }}>
                    <button className="btn-back-text" onClick={onBack}>
                        <ArrowLeft size={16} /> กลับหน้าหลัก
                    </button>
                </div>
                
                <div className="q-header">
                    <h1><FileText size={22} color="#4f46e5" /> ฟอร์มออกใบเสนอราคา</h1>
                    <p>กรุณากรอกข้อมูลให้ครบถ้วนเพื่อออกใบเสนอราคาและเชื่อมต่อกับ Sales Order</p>
                </div>

                <form onSubmit={handleSave}>
                    {/* ===== Section 1: ข้อมูลเอกสาร ===== */}
                    <div className="q-section">
                        <div className="q-section-header">
                            <div className="q-section-icon"><FileText size={18} /></div>
                            <div>
                                <div className="q-section-title">ข้อมูลเอกสาร</div>
                                <div className="q-section-desc">เลือกประเภทเอกสาร บัญชีธนาคาร และเลขที่เอกสาร</div>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>ประเภทเอกสาร <span className="required">*</span></label>
                                <select name="docType" value={formData.docType} onChange={handleFormChange} required>
                                    <option value="quotation_thc">ใบเสนอราคา (Quotation) - THC</option>
                                    <option value="quotation_psf">ใบเสนอราคา (Quotation) - PSF</option>
                                    <option value="quotation_elt">ใบเสนอราคา (Quotation) - ELT</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>บัญชีธนาคาร (บริษัทรับเงิน) <span className="required">*</span></label>
                                <select name="billStatus" value={formData.billStatus} onChange={handleFormChange} required>
                                    {(formData.docType === 'quotation_thc' || formData.docType === 'quotation_elt') && (
                                        <>
                                            <option value="ktb">ธนาคารกรุงไทย (016-074423-7)</option>
                                            <option value="scb">ธนาคารไทยพาณิชย์ (3652680393)</option>
                                        </>
                                    )}
                                    {formData.docType === 'quotation_psf' && (
                                        <option value="kbank">ธนาคารกสิกรไทย (201-3-35956-6)</option>
                                    )}
                                </select>
                            </div>
                        </div>
                        <div className="form-row" style={{ marginTop: '14px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>เลขที่ / No. <span className="required">*</span></label>
                                <input type="text" name="billNo" value={formData.billNo} onChange={handleFormChange} required />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>วันที่ / Date <span className="required">*</span></label>
                                <input type="date" name="billDate" value={formData.billDate} onChange={handleFormChange} required />
                            </div>
                        </div>
                    </div>

                    {/* ===== Section 2: ข้อมูลลูกค้า ===== */}
                    <div className="q-section">
                        <div className="q-section-header">
                            <div className="q-section-icon"><span style={{ fontSize: '16px' }}>👤</span></div>
                            <div>
                                <div className="q-section-title">ข้อมูลลูกค้า</div>
                                <div className="q-section-desc">ชื่อ ที่อยู่ เบอร์โทร และเลขผู้เสียภาษีของลูกค้า</div>
                            </div>
                        </div>
                        <div className="form-row" style={{ gridTemplateColumns: '1.2fr 2fr 1.5fr' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>ประเภทลูกค้า <span className="required">*</span></label>
                                <select 
                                    name="customerTypeId" 
                                    value={formData.customerTypeId} 
                                    onChange={handleFormChange} 
                                    required 
                                >
                                    <option value="">-- เลือกประเภท --</option>
                                    <option value="1">ลูกค้า Retail (ขายปลีก)</option>
                                    <option value="2">ลูกค้า OEM (รับจ้างผลิต)</option>
                                    <option value="3">ลูกค้า Distributor (ตัวแทนจำหน่าย)</option>
                                    <option value="4">ลูกค้า Government (รัฐ)</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>ชื่อลูกค้า / บริษัท <span className="required">*</span></label>
                                <input type="text" name="customerName" placeholder="กรอกชื่อลูกค้าหรือบริษัท" value={formData.customerName} onChange={handleFormChange} required />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>ผู้ติดต่อ</label>
                                <input type="text" name="contactPerson" placeholder="ชื่อผู้ติดต่อ (ถ้ามี)" value={formData.contactPerson} onChange={handleFormChange} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>ที่อยู่ <span className="required">*</span></label>
                            <textarea name="address" placeholder="กรอกที่อยู่ลูกค้า" rows="2" value={formData.address} onChange={handleFormChange} required></textarea>
                        </div>
                        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>เบอร์โทร <span className="required">*</span></label>
                                <input type="tel" name="phone" placeholder="กรอกเบอร์โทร" value={formData.phone} onChange={handleFormChange} required />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>อีเมล</label>
                                <input type="email" name="email" placeholder="example@email.com" value={formData.email} onChange={handleFormChange} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>เลขประจำตัวผู้เสียภาษี</label>
                                <input type="text" name="taxId" placeholder="เลข 13 หลัก (ถ้ามี)" value={formData.taxId} onChange={handleFormChange} />
                            </div>
                        </div>
                    </div>

                    {/* ===== Section 3: รายการสินค้า ===== */}
                    <div className="q-section">
                        <div className="q-section-header">
                            <div className="q-section-icon"><span style={{ fontSize: '16px' }}>📦</span></div>
                            <div>
                                <div className="q-section-title">รายการสินค้า</div>
                                <div className="q-section-desc">เพิ่มรายการสินค้าหรือเลือกจากรายการโปรโมชั่น</div>
                            </div>
                        </div>

                    <div className="products-container">
                        {items.map((item) => (
                            <div className="product-item" key={item.id}>
                                <div className="product-row">
                                    <div className="form-group product-pic" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input type="file" accept="image/*" style={{ display: 'none' }} id={`pic_${item.id}`} onChange={(e) => handleImageUpload(item.id, e)} />
                                        <label htmlFor={`pic_${item.id}`} style={{ flex: 1, border: '1px dashed #cbd5e1', borderRadius: '8px', padding: item.image ? '2px' : '8px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 'bold', minHeight: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {item.image ? (
                                                <img src={item.image} alt="product" style={{ maxHeight: '46px', maxWidth: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <>อัพโหลดรูป<br/><span style={{fontSize: '11px'}}>(คลิก)</span></>
                                            )}
                                        </label>
                                    </div>
                                    <div className="form-group product-input" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                        <input 
                                            type="text" 
                                            placeholder="คลิกหรือพิมพ์เพื่อเลือกสินค้า" 
                                            value={item.name} 
                                            onChange={(e) => {
                                                handleItemChange(item.id, 'name', e.target.value);
                                                handleItemChange(item.id, 'showDropdown', true);
                                            }} 
                                            onFocus={() => handleItemChange(item.id, 'showDropdown', true)}
                                            onBlur={() => setTimeout(() => handleItemChange(item.id, 'showDropdown', false), 200)}
                                            required 
                                        />
                                        
                                        {item.showDropdown && (
                                            <div style={{ position: 'absolute', top: '42px', left: 0, width: '100%', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 50, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                                {Object.keys(PRODUCT_CATALOG)
                                                    .filter(pName => PRODUCT_CATALOG[item.name] || pName.toLowerCase().includes((item.name || '').toLowerCase()))
                                                    .map(pName => (
                                                        <div 
                                                            key={pName} 
                                                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#334155' }}
                                                            onClick={() => {
                                                                handleItemChange(item.id, 'name', pName);
                                                                handleItemChange(item.id, 'showDropdown', false);
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                                        >
                                                            {pName}
                                                        </div>
                                                    ))
                                                }
                                                {Object.keys(PRODUCT_CATALOG).filter(pName => !PRODUCT_CATALOG[item.name] && pName.toLowerCase().includes((item.name || '').toLowerCase())).length === 0 && !PRODUCT_CATALOG[item.name] && (
                                                    <div style={{ padding: '8px 12px', fontSize: '14px', color: '#94a3b8', textAlign: 'center', backgroundColor: '#f8fafc' }}>ไม่พบรายการสินค้า</div>
                                                )}
                                            </div>
                                        )}

                                        {PRODUCT_CATALOG[item.name] && PRODUCT_CATALOG[item.name].promo && (
                                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#d35400' }}>
                                                <input type="checkbox" id={`promo_${item.id}`} checked={item.isPromo} onChange={(e) => handleItemChange(item.id, 'isPromo', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', padding: 0 }} />
                                                <label htmlFor={`promo_${item.id}`} style={{ cursor: 'pointer', margin: 0, color: '#d35400', fontWeight: 'bold' }}>จัดโปรโมชั่น 1000 บาท</label>
                                                
                                                {item.isPromo && (
                                                    <select value={item.promoMultiplier} onChange={(e) => handleItemChange(item.id, 'promoMultiplier', e.target.value)} style={{ padding: '2px 5px', borderRadius: '4px', border: '1px solid #ffb74d', color: '#d35400', width: 'auto' }}>
                                                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                                            <option key={n} value={n}>{n} โปร</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="qty-group">
                                        <input type="number" className="product-qty" placeholder="0" min="1" value={item.qty} onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)} required readOnly={item.isPromo} style={{ backgroundColor: item.isPromo ? '#f1f5f9' : 'white' }} />
                                        <span className="qty-label">ชิ้น</span>
                                    </div>
                                    <div className="price-group">
                                        <input type="number" className="product-price" placeholder="0.00" min="0" step="0.01" value={item.price} onChange={(e) => handleItemChange(item.id, 'price', e.target.value)} required readOnly={item.isPromo} style={{ backgroundColor: item.isPromo ? '#f1f5f9' : 'white' }} />
                                        <span className="qty-label">บาท</span>
                                    </div>
                                    <div className="row-amount">
                                        <span>{
                                            (item.isPromo 
                                                ? (1000 * (parseInt(item.promoMultiplier) || 1)) 
                                                : ((parseFloat(item.qty)||0)*(parseFloat(item.price)||0))
                                            ).toLocaleString('th-TH', {minimumFractionDigits: 2})
                                        }</span>&nbsp;<span style={{ fontSize: '12px', color: '#64748b' }}>บาท</span>
                                    </div>
                                    <button type="button" className="remove-product-btn" onClick={() => removeItem(item.id)} title="ลบรายการนี้">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button type="button" className="add-product-btn" onClick={addItem}>
                        <Plus size={14} /> เพิ่มรายการสินค้า
                    </button>
                    </div>{/* end q-section 3 */}

                    {/* ===== Section 4: สรุปยอดเงิน ===== */}
                    <div className="q-section">
                        <div className="q-section-header">
                            <div className="q-section-icon"><span style={{ fontSize: '16px' }}>💰</span></div>
                            <div>
                                <div className="q-section-title">สรุปยอดเงิน</div>
                                <div className="q-section-desc">ส่วนลด ภาษี ค่าจัดส่ง และยอดรวมสุทธิ</div>
                            </div>
                        </div>
                        <div className="payment-summary">
                            {/* Sub Total */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#475569', fontSize: '13px' }}>รวมราคา / Sub Total</span>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{subTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                            </div>

                            {/* Discount */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#475569', fontSize: '13px' }}>ส่วนลด</span>
                                    <select name="discountPercent" value={formData.discountPercent} onChange={handleFormChange} style={{ width: '60px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px', fontSize: '13px' }}>
                                        {[...Array(101)].map((_, i) => <option key={i} value={i}>{i}%</option>)}
                                    </select>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                                        <input type="checkbox" name="showDiscountInPrint" checked={formData.showDiscountInPrint} onChange={handleFormChange} style={{ width: '13px', height: '13px', margin: 0 }} />
                                        แสดงในบิล
                                    </label>
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: '#ef4444' }}>{discountAmount > 0 ? '-' : ''}{discountAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                            </div>

                            {/* After Discount (show only when discount is checked) */}
                            {formData.showDiscountInPrint && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ color: '#475569', fontSize: '13px' }}>คงเหลือ / Balance</span>
                                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{afterDiscount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                                </div>
                            )}

                            {/* VAT */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#475569', fontSize: '13px' }}>ภาษีมูลค่าเพิ่ม (VAT)</span>
                                    <select name="vatRate" value={formData.vatRate} onChange={handleFormChange} style={{ width: '60px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px', fontSize: '13px' }}>
                                        <option value="0">0%</option>
                                        <option value="7">7%</option>
                                    </select>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                                        <input type="checkbox" name="showVatInPrint" checked={formData.showVatInPrint} onChange={handleFormChange} style={{ width: '13px', height: '13px', margin: 0 }} />
                                        แสดงในบิล
                                    </label>
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{vatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                            </div>

                            {/* Design Fee */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#475569', fontSize: '13px' }}>ค่าออกแบบ / Design Fee</span>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                                        <input type="checkbox" name="showDesignFeeInPrint" checked={formData.showDesignFeeInPrint} onChange={handleFormChange} style={{ width: '13px', height: '13px', margin: 0 }} />
                                        แสดงในบิล
                                    </label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input type="number" name="designFee" value={formData.designFee} onChange={handleFormChange} style={{ width: '80px', textAlign: 'right', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', fontSize: '13px' }} min="0" />
                                    <span style={{ fontSize: '13px', color: '#475569' }}>บาท</span>
                                </div>
                            </div>

                            {/* Shipping */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '2px solid #e2e8f0' }}>
                                <span style={{ color: '#475569', fontSize: '13px' }}>ค่าจัดส่ง / Shipping</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input type="number" name="shippingCost" value={formData.shippingCost} onChange={handleFormChange} style={{ width: '80px', textAlign: 'right', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', fontSize: '13px' }} min="0" />
                                    <span style={{ fontSize: '13px', color: '#475569' }}>บาท</span>
                                </div>
                            </div>

                            {/* Grand Total */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 6px' }}>
                                <span style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>ยอดเงินสุทธิ / Grand Total</span>
                                <span style={{ fontWeight: 700, fontSize: '18px', color: '#4f46e5' }}>{grandTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                            </div>

                            {/* Deposit */}
                            {depositAmount > 0 && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
                                        <span style={{ fontSize: '13px', color: '#475569' }}>ยอดชำระมัดจำ {formData.depositPercent !== 'custom' && formData.depositPercent !== '0' ? `(${formData.depositPercent}%)` : ''}</span>
                                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#f59e0b' }}>{depositAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                                        <span style={{ fontSize: '13px', color: '#475569' }}>ยอดคงเหลือที่ต้องชำระ</span>
                                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#10b981' }}>{remainingAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ===== Section 5: ตั้งค่าเอกสาร ===== */}
                    <div className="q-section">
                        <div className="q-section-header">
                            <div className="q-section-icon"><span style={{ fontSize: '16px' }}>⚙️</span></div>
                            <div>
                                <div className="q-section-title">ตั้งค่าเอกสาร</div>
                                <div className="q-section-desc">ลายเซ็น เงื่อนไขมัดจำ และหมายเหตุท้ายเอกสาร</div>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>ผู้เสนอราคา / ผู้วางบิล (ลายเซ็น)</label>
                                <select name="signer" value={formData.signer} onChange={handleFormChange}>
                                    <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
                                    <option value="jutharat">จุฑารัตน์ วงค์คำเหลา</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>เงื่อนไขการหักมัดจำ</span>
                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 'normal', color: '#94a3b8', margin: 0 }}>
                                        <input type="checkbox" name="showDepositInPrint" checked={formData.showDepositInPrint} onChange={handleFormChange} style={{ width: '14px', height: '14px', margin: 0, cursor: 'pointer' }} />
                                        แสดงในพิมพ์
                                    </label>
                                </label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <select name="depositPercent" value={formData.depositPercent} onChange={handleFormChange} style={{ flex: 1 }}>
                                        <option value="0">-- ไม่มีมัดจำ --</option>
                                        <option value="30">มัดจำ 30%</option>
                                        <option value="40">มัดจำ 40%</option>
                                        <option value="50">มัดจำ 50%</option>
                                        <option value="custom">ระบุเอง</option>
                                    </select>
                                    {formData.depositPercent === 'custom' && (
                                        <input type="number" name="customDepositAmount" placeholder="ระบุเงิน" value={formData.customDepositAmount} onChange={handleFormChange} style={{ flex: 1 }} min="0" />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>หมายเหตุ (ข้อความนี้จะแสดงท้ายบิล สามารถแก้ไขข้อความได้เลย)</label>
                            <div 
                                contentEditable 
                                suppressContentEditableWarning={true}
                                onBlur={(e) => setFormData(prev => ({ ...prev, notes: e.target.innerHTML }))}
                                style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', minHeight: '80px', background: 'white', fontSize: '13px', outline: 'none' }}
                                dangerouslySetInnerHTML={{ __html: formData.notes }}
                            />
                        </div>
                    </div>

                    {/* ===== Action Buttons ===== */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="print-btn" type="button" onClick={handlePrint}>
                            <Printer size={18} /> พิมพ์บิล
                        </button>
                        <button type="submit" className="submit-btn" disabled={status === 'saving'} style={status === 'error' ? {backgroundColor: '#ef4444'} : {}}>
                            {status === 'saving' ? 'กำลังบันทึก...' : status === 'error' ? 'บันทึกไม่สำเร็จ (ลองใหม่)' : <><Save size={18} /> บันทึกข้อมูล</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* Print Container (Hidden on screen, Visible on print via CSS) */}
            <div id="q-print-container">
                <table className="print-header-table" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: 0 }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '30%', textAlign: 'center', verticalAlign: 'middle', border: 'none', padding: '2px' }}>
                                <div style={{ fontWeight: 'bold', textAlign: 'center', lineHeight: 1.1 }}>
                                    <div style={{ marginBottom: '2px' }}>
                                        <img src={compLogo} alt="Logo" style={{ maxWidth: '140px', maxHeight: '140px', objectFit: 'contain' }} />
                                    </div>
                                </div>
                            </td>
                            <td style={{ width: '75%', padding: '2px 8px', verticalAlign: 'top' }}>
                                <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr>
                                            <td colSpan="2" style={{ textAlign: 'center', border: 'none', padding: '5px', position: 'relative', right: '60px' }}>
                                                <div className="print-color-green" style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '16pt' }}>{compNameTH}</div>
                                                {compNameEN && <div style={{ fontSize: '11pt', marginTop: '3px' }}>{compNameEN}</div>}
                                                <div style={{ fontSize: '11pt', marginTop: '3px' }}>{compAddr1}</div>
                                                {compAddr2 && <div style={{ fontSize: '10pt' }}>{compAddr2}</div>}
                                                <div style={{ fontSize: '11pt', marginTop: '3px' }}>{compTax}</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ width: '50%', border: 'none' }}></td>
                                            <td style={{ width: '50%', textAlign: 'right', border: 'none', verticalAlign: 'bottom' }}>
                                                <div style={{ fontSize: '16pt', fontWeight: 'bold' }}>ใบเสนอราคา</div>
                                                <div style={{ fontSize: '14pt', fontWeight: 'bold' }}>Quotation</div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <table className="print-info-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', borderTop: '1px solid black', marginBottom: 0 }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '25%', borderRight: '1px solid black', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'bold' }}>ชื่อลูกค้า :</span>
                            </td>
                            <td style={{ width: '35%', borderRight: '1px solid black', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'normal' }}>{formData.customerName || '-'}</span>
                            </td>
                            <td style={{ width: '40%', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'bold' }}>เลขที่/No.</span> <span style={{ marginLeft: '5px', fontWeight: 'normal' }}>{formData.billNo || '-'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'bold' }}>ที่อยู่ :</span>
                            </td>
                            <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'normal' }}>{formData.address || '-'}</span>
                            </td>
                            <td style={{ borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'bold' }}>วันที่/Date :</span> <span style={{ marginLeft: '5px', fontWeight: 'normal' }}>{formatDate(formData.billDate)}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'bold' }}>โทร :</span>
                            </td>
                            <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'normal' }}>{formData.phone || '-'}</span>
                            </td>
                            <td style={{ borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}></td>
                        </tr>
                        <tr>
                            <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'bold' }}>เลขประจำตัวผู้เสียภาษี :</span>
                            </td>
                            <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'normal' }}>{formData.taxId || '-'}</span>
                            </td>
                            <td style={{ borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}></td>
                        </tr>
                    </tbody>
                </table>

                <table className="print-products-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', borderTop: 'none' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '10%', border: '1px solid black', borderTop: 'none', padding: '4px 2px' }}>ลำดับ<br/>No</th>
                            <th style={{ width: '15%', border: '1px solid black', borderTop: 'none', padding: '4px 2px' }}>รูปสินค้า<br/>Picture</th>
                            <th style={{ width: '35%', border: '1px solid black', borderTop: 'none', padding: '4px 2px' }}>รายละเอียด<br/>Description</th>
                            <th style={{ width: '12%', border: '1px solid black', borderTop: 'none', padding: '4px 2px' }}>จำนวน<br/>Quantity</th>
                            <th style={{ width: '14%', border: '1px solid black', borderTop: 'none', padding: '4px 2px' }}>ราคา / ชิ้น<br/>Price</th>
                            <th style={{ width: '14%', border: '1px solid black', borderTop: 'none', padding: '4px 2px' }}>จำนวนเงิน<br/>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.filter(it => it.name).map((item, idx) => (
                            <tr key={item.id} style={{ height: cellHeight }}>
                                <td style={{ border: '1px solid black', textAlign: 'center', padding: '2px 4px' }}>{idx + 1}</td>
                                <td style={{ border: '1px solid black', textAlign: 'center', padding: '2px 4px' }}>
                                    {item.image && <img src={item.image} style={{ maxWidth: imgSize, maxHeight: imgSize, objectFit: 'contain' }} alt="pic" />}
                                </td>
                                <td style={{ border: '1px solid black', textAlign: 'left', padding: '2px 8px' }}>{item.name}</td>
                                <td style={{ border: '1px solid black', textAlign: 'center', padding: '2px 4px' }}>{item.qty}</td>
                                <td style={{ border: '1px solid black', textAlign: 'right', padding: '2px 8px' }}>{(parseFloat(item.price)||0).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                                <td style={{ border: '1px solid black', textAlign: 'right', padding: '2px 8px' }}>{
                                    (item.isPromo 
                                        ? (1000 * (parseInt(item.promoMultiplier) || 1)) 
                                        : ((parseFloat(item.qty)||0)*(parseFloat(item.price)||0))
                                    ).toLocaleString('th-TH', {minimumFractionDigits: 2})
                                }</td>
                            </tr>
                        ))}
                        {items.filter(it => it.name).length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ height: '50px', textAlign: 'center', border: '1px solid black' }}>ไม่มีรายการสินค้า</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <table className="print-footer-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', borderTop: 'none' }}>
                    <tbody>
                        <tr>
                            <td rowSpan={
                                (formData.showDiscountInPrint && discountAmount > 0 ? 2 : 0) +
                                (formData.showVatInPrint && vatAmount > 0 ? 1 : 0) +
                                (shipping > 0 ? 1 : 0) + 
                                (formData.showDesignFeeInPrint && designFee > 0 ? 1 : 0) + 
                                (formData.showDepositInPrint && depositAmount > 0 ? 2 : 0) + 1
                            } style={{ width: '60%', verticalAlign: 'middle', padding: '5px', borderRight: '1px solid black', borderBottom: '1px solid black', position: 'relative' }}>
                                <div className="print-color-red" style={{ position: 'absolute', top: '5px', left: '5px', color: 'red', fontSize: '10pt', fontWeight: 'bold' }}>ช่องทางการชำระเงิน :</div>
                                <div style={{ border: '2px dashed black', borderRadius: '10px', padding: '20px 10px', width: '90%', margin: '20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                                    {formData.billStatus === 'ktb' && (
                                        <img src="/images/banks/bank-ktb.png" style={{ width: '75px', maxHeight: '75px', objectFit: 'contain', flexShrink: 0 }} alt="ktb" />
                                    )}
                                    {formData.billStatus === 'scb' && (
                                        <img src="/images/banks/bank-scb.png" style={{ width: '75px', maxHeight: '75px', objectFit: 'contain', flexShrink: 0 }} alt="scb" />
                                    )}
                                    {formData.billStatus === 'kbank' && (
                                        <img src="/images/banks/bank-kbank.png" style={{ width: '75px', maxHeight: '75px', objectFit: 'contain', flexShrink: 0 }} alt="kbank" />
                                    )}
                                    <div style={{ textAlign: 'left', fontWeight: 'bold', lineHeight: 1.1 }}>
                                        <span style={{ fontSize: '16pt' }}>
                                            {formData.billStatus === 'ktb' ? 'ธนาคารกรุงไทย' : (formData.billStatus === 'scb' ? 'ธนาคารไทยพาณิชย์' : 'ธนาคารกสิกรไทย')}
                                        </span><br/>
                                        <span style={{ fontSize: '12pt' }}>{isElt ? 'บริษัท อิลิท เทรดดิ้ง 2020 จำกัด' : (isPsf ? 'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด' : 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์')}</span><br/>
                                        <span className="print-color-blue" style={{ fontSize: '20pt', color: '#2980b9' }}>
                                            {formData.billStatus === 'ktb' ? '016-074423-7' : (formData.billStatus === 'scb' ? '3652680393' : '201-3-35956-6')}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            <td style={{ width: '26%', fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px' }}>
                                รวมเป็นเงิน<br/><span style={{ fontSize: '10pt', fontWeight: 'normal' }}>TOTAL</span>
                            </td>
                            <td style={{ width: '14%', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', padding: '5px' }}>
                                <span style={{ fontWeight: 'normal' }}>{subTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                            </td>
                        </tr>
                        
                        {formData.showDiscountInPrint && (
                            <React.Fragment>
                                <tr>
                                    <td className="print-color-red" style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', borderRight: '1px solid black', color: 'red', padding: '5px' }}>
                                        หักส่วนลด {formData.discountPercent}%<br/><span className="print-color-red" style={{ fontSize: '10pt', fontWeight: 'normal', color: 'red' }}>DISCOUNT</span>
                                    </td>
                                    <td className="print-color-red" style={{ textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', color: 'red', padding: '5px' }}>
                                        <span className="print-color-red" style={{ fontWeight: 'normal', color: 'red' }}>{discountAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px' }}>
                                        คงเหลือ<br/><span style={{ fontSize: '10pt', fontWeight: 'normal' }}>BALANCE</span>
                                    </td>
                                    <td style={{ textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', padding: '5px' }}>
                                        <span style={{ fontWeight: 'normal' }}>{afterDiscount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                    </td>
                                </tr>
                            </React.Fragment>
                        )}
                        
                        {formData.showVatInPrint && vatAmount > 0 && (
                            <tr>
                                <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px' }}>
                                    ภาษีมูลค่าเพิ่ม {formData.vatRate}%<br/><span style={{ fontSize: '10pt', fontWeight: 'normal' }}>VAT</span>
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', padding: '5px' }}>
                                    <span style={{ fontWeight: 'normal' }}>{vatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                </td>
                            </tr>
                        )}
                        
                        {shipping > 0 && (
                            <tr>
                                <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px' }}>
                                    ค่าจัดส่ง<br/><span style={{ fontSize: '10pt', fontWeight: 'normal' }}>SHIPPING COST</span>
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', padding: '5px' }}>
                                    <span style={{ fontWeight: 'normal' }}>{shipping.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                </td>
                            </tr>
                        )}

                        {formData.showDesignFeeInPrint && designFee > 0 && (
                            <tr>
                                <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px' }}>
                                    ค่าออกแบบ<br/><span style={{ fontSize: '10pt', fontWeight: 'normal' }}>DESIGN FEE</span>
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', padding: '5px' }}>
                                    <span style={{ fontWeight: 'normal' }}>{designFee.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                </td>
                            </tr>
                        )}

                        {formData.showDepositInPrint && depositAmount > 0 && (
                            <>
                            <tr>
                                <td className="print-color-red" style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderRight: '1px solid black', borderBottom: '1px solid black', padding: '5px', color: 'red' }}>
                                    ยอดชำระมัดจำ {formData.depositPercent !== 'custom' ? `(${formData.depositPercent}%)` : ''}<br/><span className="print-color-red" style={{ fontSize: '10pt', fontWeight: 'normal', color: 'red' }}>DEPOSIT</span>
                                </td>
                                <td className="print-color-red" style={{ textAlign: 'right', fontWeight: 'normal', borderBottom: '1px solid black', padding: '5px', paddingRight: '10px', color: 'red' }}>
                                    <span className="print-color-red" style={{ fontWeight: 'normal', color: 'red' }}>{depositAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                </td>
                            </tr>
                            <tr>
                                <td className="print-color-red" style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderRight: '1px solid black', borderBottom: '1px solid black', padding: '5px', color: 'red' }}>
                                    ยอดคงเหลือที่ต้องชำระ<br/><span className="print-color-red" style={{ fontSize: '10pt', fontWeight: 'normal', color: 'red' }}>REMAINING BALANCE</span>
                                </td>
                                <td className="print-color-red" style={{ textAlign: 'right', fontWeight: 'normal', borderBottom: '1px solid black', padding: '5px', paddingRight: '10px', color: 'red' }}>
                                    <span className="print-color-red" style={{ fontWeight: 'normal', color: 'red' }}>{remainingAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                </td>
                            </tr>
                            </>
                        )}

                        <tr>
                            <td className="print-bg-gray" style={{ width: '60%', textAlign: 'center', fontWeight: 'bold', fontSize: '13pt', backgroundColor: '#e6e6e6', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px' }}>
                                {ThaiBaht(grandTotal)}
                            </td>
                            <td className="print-bg-gray" style={{ width: '26%', fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderRight: '1px solid black', borderBottom: '1px solid black', backgroundColor: '#e6e6e6', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', padding: '5px' }}>
                                จำนวนเงินรวมทั้งสิ้น<br/><span style={{ fontSize: '10pt', fontWeight: 'normal' }}>GRAND TOTAL</span>
                            </td>
                            <td className="print-bg-gray" style={{ width: '14%', textAlign: 'right', fontWeight: 'bold', textDecoration: 'underline', backgroundColor: '#e6e6e6', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', borderBottom: '1px solid black', padding: '5px', paddingRight: '10px' }}>
                                {grandTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <table className="print-signature-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td className="print-notes-container" style={{ width: '100%', verticalAlign: 'top', padding: '2px 4px', fontSize: '9pt' }}>
                                <div dangerouslySetInnerHTML={{ __html: formData.notes }} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '15px' }}>
                    <div style={{ textAlign: 'center', fontSize: '10pt' }}>
                        <div style={{ height: '30px' }}></div>
                        <div>(..................................................)</div>
                        <div style={{ marginTop: '2px' }}>ผู้รับเสนอราคา</div>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '10pt' }}>
                        <div style={{ height: '30px', position: 'relative' }}>
                            {formData.signer === 'jutharat' && (
                                <img src="/images/signatures/sign-jutharat.png" style={{ maxHeight: '40px', position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)' }} alt="signature" />
                            )}
                        </div>
                        <div>({formData.signer === 'jutharat' ? '....................................................' : '..................................................'})</div>
                        <div style={{ marginTop: '2px' }}>ผู้เสนอราคา</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

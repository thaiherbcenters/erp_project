import React, { useState, useEffect } from 'react';
import { Save, Printer, ArrowLeft, Plus, Trash2, FileText, CheckCircle } from 'lucide-react';
import '../pages/PageCommon.css';

const styles = `
.q-form-wrapper {
    font-family: 'Sarabun', sans-serif;
    background: transparent;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
}

.q-container {
    background: white;
    border-radius: 12px;
    border: 1px solid #cbd5e1;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    padding: 30px;
    width: 100%;
    max-width: 1000px;
    animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
}

.q-header {
    margin-bottom: 30px;
}

.q-header h1 {
    color: #1e293b;
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
    margin-top: 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

.q-header p {
    color: #64748b;
    font-size: 14px;
    margin: 0;
}

.q-back-btn {
    background: #f1f5f9;
    color: #475569;
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    font-family: 'Sarabun', sans-serif;
    cursor: pointer;
    margin-bottom: 20px;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.q-back-btn:hover {
    background: #e2e8f0;
}

.form-group {
    margin-bottom: 18px;
}

.form-group label {
    display: block;
    color: #475569;
    font-weight: 500;
    margin-bottom: 8px;
    font-size: 14px;
}

.form-group label .required {
    color: #ef4444;
    margin-left: 3px;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 14px;
    font-family: 'Sarabun', sans-serif;
    transition: all 0.2s ease;
    background: white;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

/* Products Section */
.product-item {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 12px;
    transition: all 0.2s ease;
}

.product-item:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.05);
}

.product-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
}

.product-pic {
    flex: 1;
    min-width: 120px;
    margin-bottom: 0 !important;
}

.product-input {
    flex: 2;
    min-width: 250px;
    margin-bottom: 0 !important;
}

.qty-group, .price-group {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 2px 10px 2px 4px;
    flex: 1;
    transition: all 0.2s ease;
}

.qty-group:focus-within, .price-group:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.qty-group { min-width: 120px; }
.price-group { min-width: 140px; }

.product-qty,
.product-price {
    width: 100%;
    padding: 8px;
    border: none !important;
    font-size: 14px;
    text-align: right;
    background: transparent !important;
}

.product-qty:focus, .product-price:focus {
    outline: none !important;
    box-shadow: none !important;
}

.qty-label {
    color: #64748b;
    font-size: 14px;
    white-space: nowrap;
}

.row-amount {
    flex: 1;
    min-width: 100px;
    text-align: right;
    font-weight: 600;
    color: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    font-size: 14px;
    min-height: 40px;
}

.remove-product-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: #fee2e2;
    color: #ef4444;
    border-radius: 6px;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 5px;
}

.remove-product-btn:hover {
    background: #fecaca;
}

.add-product-btn {
    width: 100%;
    padding: 10px;
    background: transparent;
    color: #3b82f6;
    border: 1px dashed #3b82f6;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    font-family: 'Sarabun', sans-serif;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
}

.add-product-btn:hover {
    background: #eff6ff;
}

/* Payment Summary */
.payment-summary {
    background: #f8fafc;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 20px;
    margin: 20px 0;
}

.payment-summary h3 {
    color: #1e293b;
    margin-bottom: 15px;
    font-size: 16px;
    margin-top: 0;
}

.payment-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px dashed #cbd5e1;
    align-items: center;
}

.payment-row .label { color: #475569; }
.payment-row .value { font-weight: 600; color: #1e293b; }

.submit-btn {
    width: 100%;
    padding: 12px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    font-family: 'Sarabun', sans-serif;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 10px;
    flex: 2;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
}

.submit-btn:hover {
    background: #2563eb;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.submit-btn:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    box-shadow: none;
}

.print-btn {
    background: white;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    font-family: 'Sarabun', sans-serif;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
}
.print-btn:hover { background: #f1f5f9; }

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

const PROMO_ITEMS = {
    "ยาดมสมุนไพร": { qty: 50, price: 20 },
    "ยาหม่อง": { qty: 40, price: 25 },
    "ยาดมสมุนไพร จัมโบ้": { qty: 5, price: 200 },
    "ยาน้ำมัน ขนาด 10 มล.": { qty: 17, price: 59 },
    "ยาน้ำมัน ขนาด 5 มล.": { qty: 25, price: 40 },
    "ยาน้ำมันสมุนไพร สูตรเย็น": { qty: 14, price: 71 },
    "ยาน้ำมันสมุนไพร สูตรร้อน": { qty: 14, price: 71 },
    "ยาสเปรย์ผสมกระดูกไก่ดำ": { qty: 14, price: 71 }
};

export default function QuotationForm({ onBack, onSave }) {
    const [status, setStatus] = useState(null);

    const [formData, setFormData] = useState({
        docType: 'quotation_thc', // quotation_thc, quotation_psf, quotation_elt
        billStatus: 'ktb',
        billNo: 'QT-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0'),
        billDate: new Date().toISOString().split('T')[0],
        customerName: '',
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
        showDepositInPrint: true
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

    const [items, setItems] = useState([
        { id: 1, name: '', qty: '', price: '', isPromo: false, promoMultiplier: 1, showDropdown: false }
    ]);

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
                    if (!PROMO_ITEMS[value]) {
                        newItem.isPromo = false;
                        newItem.promoMultiplier = 1;
                    } else if (newItem.isPromo) {
                        const pData = PROMO_ITEMS[value];
                        newItem.qty = pData.qty * newItem.promoMultiplier;
                        newItem.price = pData.price;
                    }
                } else if (field === 'isPromo') {
                    if (value && PROMO_ITEMS[newItem.name]) {
                        const pData = PROMO_ITEMS[newItem.name];
                        newItem.qty = pData.qty * newItem.promoMultiplier;
                        newItem.price = pData.price;
                    } else {
                        newItem.qty = '';
                        newItem.price = '';
                    }
                } else if (field === 'promoMultiplier') {
                    if (newItem.isPromo && PROMO_ITEMS[newItem.name]) {
                        const pData = PROMO_ITEMS[newItem.name];
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
    const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0), 0);
    const discountAmount = subTotal * (parseFloat(formData.discountPercent) || 0) / 100;
    const afterDiscount = subTotal - discountAmount;
    const vatAmount = afterDiscount * (parseFloat(formData.vatRate) || 0) / 100;
    const shipping = parseFloat(formData.shippingCost) || 0;
    const grandTotal = afterDiscount + vatAmount + shipping;

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
        compLogo = 'https://lh3.googleusercontent.com/d/1whvhHEM2J53JvI5Irg-bMec-LoPXVEaZ';
    } else if (isPsf) {
        compNameTH = 'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด (สำนักงานใหญ่)';
        compNameEN = '';
        compAddr1 = 'เลขที่ 12 ซอยนนทบุรี 11/3 ต.บางกระสอ อ.เมืองนนทบุรี จ.นนทบุรี 11000';
        compAddr2 = '';
        compTax = 'เลขประจำตัวผู้เสียภาษี 0125566026612';
        compLogo = 'https://lh3.googleusercontent.com/d/1FPtYXftp6xTLvFYz2rvM_iQeh4EEkzj8';
    } else {
        compNameTH = 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์ (สำนักงานใหญ่)';
        compNameEN = 'Thai Herb Centers(THC)Community Enterprise (HEAD OFFICE)';
        compAddr1 = '6/10 หมู่ที่ 2 ต.ไทรม้า อ.เมืองนนทบุรี จ.นนทบุรี 11000';
        compAddr2 = '6/10 Moo 2 Sai Ma subdistrict,Mueang Nonthaburi District,Nonthabui Province,Thailand 11000';
        compTax = 'โทร:083-9799389 / เลขประจำตัวผู้เสียภาษี 099-200438186-0';
        compLogo = 'https://lh3.googleusercontent.com/d/10lptwep_aBvzXnQUHFAyS8cou2nrYyKK';
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSave = (e) => {
        e.preventDefault();
        setStatus('saving');
        setTimeout(() => {
            setStatus('success');
            const newQuotation = {
                id: formData.billNo,
                number: formData.billNo,
                customer: formData.customerName,
                items: items.filter(i => i.name).length,
                total: grandTotal,
                date: formatDate(formData.billDate),
                validUntil: formatDate(new Date(new Date(formData.billDate).getTime() + 30*24*60*60*1000)),
                status: 'ร่าง'
            };
            if (onSave) onSave(newQuotation);
            setTimeout(() => setStatus(null), 3000);
        }, 800);
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
            <div className="q-container">
                <div style={{ marginBottom: '20px' }}>
                    <button className="q-back-btn" onClick={onBack}>
                        <ArrowLeft size={16} /> กลับหน้าหลัก
                    </button>
                </div>
                
                <div className="q-header">
                    <h1><FileText size={28} color="#3b82f6" /> ฟอร์มออกใบเสนอราคา</h1>
                    <p>กรุณากรอกข้อมูลให้ครบถ้วนเพื่อออกใบเสนอราคาและเชื่อมต่อกับ Sales Order</p>
                </div>

                <form onSubmit={handleSave}>
                    <div className="form-row" style={{ backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
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
                                <option value="ktb">ธนาคารกรุงไทย (016-074423-7)</option>
                                <option value="scb">ธนาคารไทยพาณิชย์ (3652680393)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>เลขที่ / No. <span className="required">*</span></label>
                            <input type="text" name="billNo" value={formData.billNo} onChange={handleFormChange} required />
                        </div>
                        <div className="form-group">
                            <label>วันที่ / Date <span className="required">*</span></label>
                            <input type="date" name="billDate" value={formData.billDate} onChange={handleFormChange} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>ชื่อลูกค้า / บริษัท <span className="required">*</span></label>
                        <input type="text" name="customerName" placeholder="กรอกชื่อลูกค้าหรือบริษัท" value={formData.customerName} onChange={handleFormChange} required />
                    </div>

                    <div className="form-group">
                        <label>ที่อยู่ <span className="required">*</span></label>
                        <textarea name="address" placeholder="กรอกที่อยู่ลูกค้า" rows="2" value={formData.address} onChange={handleFormChange} required></textarea>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>เบอร์โทร <span className="required">*</span></label>
                            <input type="tel" name="phone" placeholder="กรอกเบอร์โทร" value={formData.phone} onChange={handleFormChange} required />
                        </div>
                        <div className="form-group">
                            <label>เลขประจำตัวผู้เสียภาษี</label>
                            <input type="text" name="taxId" placeholder="เลข 13 หลัก (ถ้ามี)" value={formData.taxId} onChange={handleFormChange} />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '10px' }}>
                        <label>รายการสินค้า <span className="required">*</span></label>
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
                                                {Object.keys(PROMO_ITEMS)
                                                    .filter(pName => PROMO_ITEMS[item.name] || pName.toLowerCase().includes((item.name || '').toLowerCase()))
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
                                                {Object.keys(PROMO_ITEMS).filter(pName => !PROMO_ITEMS[item.name] && pName.toLowerCase().includes((item.name || '').toLowerCase())).length === 0 && !PROMO_ITEMS[item.name] && (
                                                    <div style={{ padding: '8px 12px', fontSize: '14px', color: '#94a3b8', textAlign: 'center', backgroundColor: '#f8fafc' }}>ไม่พบรายการโปรโมชั่น</div>
                                                )}
                                            </div>
                                        )}

                                        {PROMO_ITEMS[item.name] && (
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
                                        <span>{((parseFloat(item.qty)||0)*(parseFloat(item.price)||0)).toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>&nbsp;<span style={{ fontSize: '12px', color: '#64748b' }}>บาท</span>
                                    </div>
                                    <button type="button" className="remove-product-btn" onClick={() => removeItem(item.id)} title="ลบรายการนี้">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button type="button" className="add-product-btn" onClick={addItem}>
                        <Plus size={16} /> เพิ่มรายการสินค้า
                    </button>

                    {/* Payment Summary */}
                    <div className="payment-summary">
                        <h3>สรุปยอดเงิน</h3>
                        <div className="payment-row">
                            <span className="label">รวมราคา / Sub Total</span>
                            <span className="value">{subTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                        </div>
                        <div className="payment-row" style={{ alignItems: 'center', borderBottom: 'none', paddingBottom: '0' }}>
                            <span className="label" style={{ display: 'flex', alignItems: 'center' }}>
                                ส่วนลด / Discount &nbsp;
                            </span>
                            <span className="value" style={{ display: 'flex', alignItems: 'center' }}>
                                <select name="discountPercent" value={formData.discountPercent} onChange={handleFormChange} style={{ width: '70px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px' }}>
                                    {[...Array(101)].map((_, i) => <option key={i} value={i}>{i}</option>)}
                                </select> <span style={{ margin: '0 10px 0 5px' }}>%</span>
                                <span style={{ width: '80px', textAlign: 'right', color: '#ef4444' }}>{discountAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '10px', fontSize: '13px', borderBottom: '1px dashed #cbd5e1' }}>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 'normal', color: '#64748b' }}>
                                <input type="checkbox" name="showDiscountInPrint" checked={formData.showDiscountInPrint} onChange={handleFormChange} style={{ width: '14px', height: '14px', margin: 0 }} />
                                แสดงยอดส่วนลดลงในเอกสาร
                            </label>
                        </div>

                        <div className="payment-row">
                            <span className="label">คงเหลือ / Balance</span>
                            <span className="value">{afterDiscount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                        </div>

                        <div className="payment-row" style={{ alignItems: 'center', borderBottom: 'none', paddingBottom: '0' }}>
                            <span className="label" style={{ display: 'flex', alignItems: 'center' }}>
                                ภาษีมูลค่าเพิ่ม (VAT) &nbsp;
                                <select name="vatRate" value={formData.vatRate} onChange={handleFormChange} style={{ padding: '4px', width: '80px', fontSize: '14px', marginLeft: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                    <option value="0">0%</option>
                                    <option value="7">7%</option>
                                </select>
                            </span>
                            <span className="value">{vatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '10px', fontSize: '13px', borderBottom: '1px dashed #cbd5e1' }}>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 'normal', color: '#64748b' }}>
                                <input type="checkbox" name="showVatInPrint" checked={formData.showVatInPrint} onChange={handleFormChange} style={{ width: '14px', height: '14px', margin: 0 }} />
                                แสดงภาษีมูลค่าเพิ่มลงในเอกสาร
                            </label>
                        </div>

                        <div className="payment-row" style={{ alignItems: 'center', borderBottom: 'none', paddingBottom: '0' }}>
                            <span className="label" style={{ display: 'flex', alignItems: 'center' }}>
                                ค่าจัดส่ง / Shipping Cost &nbsp;
                            </span>
                            <span className="value" style={{ display: 'flex', alignItems: 'center' }}>
                                <input type="number" name="shippingCost" value={formData.shippingCost} onChange={handleFormChange} style={{ width: '80px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px' }} min="0" />
                                <span style={{ marginLeft: '5px' }}>บาท</span>
                            </span>
                        </div>
                        
                        <div className="payment-row" style={{ borderBottom: 'none', fontWeight: 700, fontSize: '18px', color: '#3b82f6', margin: '15px 0 5px 0' }}>
                            <span className="label" style={{ color: '#1e293b' }}>ยอดเงินสุทธิ / Grand Total</span>
                            <span className="value" style={{ color: '#3b82f6' }}>{grandTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                        </div>

                        {depositAmount > 0 && (
                            <>
                                <div className="payment-row" style={{ borderTop: '1px dashed #cbd5e1', marginTop: '5px', paddingTop: '10px', fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                                    <span className="label" style={{ color: '#475569' }}>ยอดชำระมัดจำ {formData.depositPercent !== 'custom' && formData.depositPercent !== '0' ? `(${formData.depositPercent}%)` : ''}</span>
                                    <span className="value" style={{ color: '#f59e0b' }}>{depositAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                                </div>
                                <div className="payment-row" style={{ display: 'flex', fontWeight: 600, fontSize: '14px', color: '#1e293b', borderBottom: 'none' }}>
                                    <span className="label" style={{ color: '#475569' }}>ยอดคงเหลือ</span>
                                    <span className="value" style={{ color: '#10b981' }}>{remainingAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                                </div>
                            </>
                        )}
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
                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 'normal', color: '#64748b', margin: 0 }}>
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

                    <div className="form-group">
                        <label>หมายเหตุ (ข้อความนี้จะแสดงท้ายบิล สามารถแก้ไขข้อความได้เลย)</label>
                        <div 
                            contentEditable 
                            suppressContentEditableWarning={true}
                            onBlur={(e) => setFormData(prev => ({ ...prev, notes: e.target.innerHTML }))}
                            style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '15px', minHeight: '100px', background: 'white', fontSize: '14px', outline: 'none' }}
                            dangerouslySetInnerHTML={{ __html: formData.notes }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                        <button className="print-btn" type="button" onClick={handlePrint}>
                            <Printer size={20} /> พิมพ์บิล
                        </button>
                        <button type="submit" className="submit-btn" disabled={status === 'saving'}>
                            {status === 'saving' ? 'กำลังบันทึก...' : <><Save size={20} /> บันทึกข้อมูล</>}
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
                                                <div className={isElt ? "print-color-blue" : "print-color-green"} style={{ color: isElt ? '#2980b9' : '#27ae60', fontWeight: 'bold', fontSize: '16pt' }}>{compNameTH}</div>
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
                                <td style={{ border: '1px solid black', textAlign: 'right', padding: '2px 8px' }}>{((parseFloat(item.qty)||0)*(parseFloat(item.price)||0)).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
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
                                (formData.showDiscountInPrint && discountAmount > 0 ? 1 : 0) +
                                (formData.showVatInPrint && vatAmount > 0 ? 1 : 0) +
                                (shipping > 0 ? 1 : 0) + 
                                (formData.showDepositInPrint && depositAmount > 0 ? 2 : 0) + 1
                            } style={{ width: '60%', verticalAlign: 'top', padding: '5px', borderRight: '1px solid black', borderBottom: '1px solid black', position: 'relative' }}>
                                <div className="print-color-red" style={{ color: 'red', fontSize: '10pt', fontWeight: 'bold' }}>ช่องทางการชำระเงิน :</div>
                                <div style={{ border: '2px dashed black', borderRadius: '10px', padding: '20px 10px', width: '90%', margin: '15px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                                    {formData.billStatus === 'ktb' ? (
                                        <img src="https://lh3.googleusercontent.com/d/11-qyC7VD7yoIc8MDL0s8JF5ZREKloMGH" style={{ width: '75px', maxHeight: '75px', objectFit: 'contain', flexShrink: 0 }} alt="ktb" />
                                    ) : (
                                        <img src="https://lh3.googleusercontent.com/d/11BqJ8f830_Q0qFqH_gNfN0j_bO2O8H1R" style={{ width: '75px', maxHeight: '75px', objectFit: 'contain', flexShrink: 0 }} alt="scb" />
                                    )}
                                    <div style={{ textAlign: 'left', fontWeight: 'bold', lineHeight: 1.1 }}>
                                        <span style={{ fontSize: '16pt' }}>{formData.billStatus === 'ktb' ? 'ธนาคารกรุงไทย' : 'ธนาคารกสิกรไทย'}</span><br/>
                                        <span style={{ fontSize: '12pt' }}>{isElt ? 'บริษัท อิลิท เทรดดิ้ง 2020 จำกัด' : (isPsf ? 'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด' : 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์')}</span><br/>
                                        <span className="print-color-blue" style={{ fontSize: '20pt', color: '#2980b9' }}>{formData.billStatus === 'ktb' ? '016-074423-7' : '201-3-35956-6'}</span>
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
                        
                        {formData.showDiscountInPrint && discountAmount > 0 && (
                            <tr>
                                <td className="print-color-red" style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', borderRight: '1px solid black', color: 'red', padding: '5px' }}>
                                    หักส่วนลด<br/><span style={{ fontSize: '10pt', fontWeight: 'normal' }}>DISCOUNT</span>
                                </td>
                                <td className="print-color-red" style={{ textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', color: 'red', padding: '5px' }}>
                                    <span style={{ fontWeight: 'normal' }}>{discountAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                </td>
                            </tr>
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

                        {formData.showDepositInPrint && depositAmount > 0 && (
                            <>
                            <tr>
                                <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderRight: '1px solid black', borderBottom: '1px solid black', padding: '5px', color: 'red' }}>
                                    ยอดชำระมัดจำ {formData.depositPercent !== 'custom' ? `(${formData.depositPercent}%)` : ''}<br/><span style={{ fontSize: '10pt', fontWeight: 'normal' }}>DEPOSIT</span>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid black', padding: '5px', paddingRight: '10px', color: 'red' }}>
                                    {depositAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderRight: '1px solid black', borderBottom: '1px solid black', padding: '5px', color: 'red' }}>
                                    ยอดคงเหลือที่ต้องชำระ<br/><span style={{ fontSize: '10pt', fontWeight: 'normal' }}>REMAINING BALANCE</span>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid black', padding: '5px', paddingRight: '10px', color: 'red' }}>
                                    {remainingAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}
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
                                <img src="https://lh3.googleusercontent.com/d/1ps5SyMaGMCwKLGFonra1eOKUK-I5cCrL" style={{ maxHeight: '40px', position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)' }} alt="signature" />
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

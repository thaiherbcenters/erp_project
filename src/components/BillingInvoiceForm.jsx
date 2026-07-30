import React, { useState, useEffect } from 'react';
import { Save, Printer, ArrowLeft, Plus, Trash2, FileText, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import { useAlert } from '../components/CustomAlert';
import API_BASE from '../config';
import CustomDatePicker from '../components/CustomDatePicker';
import TaxIdInput from '../components/TaxIdInput';
import CustomSelect from './CustomSelect';
import { useSignatures } from '../hooks/useSignatures';
import '../pages/PageCommon.css';

const styles = `
.q-form-wrapper {
    font-family: 'Inter', 'Sarabun', sans-serif;
    background: transparent;
    padding: 0;
    padding-bottom: 80px;
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
    margin-bottom: 20px;
}

.q-header h1 {
    color: var(--text, #1e293b);
    font-size: 22px;
    font-weight: 700;
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

/* ===== 2-Column Grid Layout ===== */
.q-main-grid {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 20px;
    align-items: start;
}

.q-main-left {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
}

.q-sidebar {
    position: sticky;
    top: 85px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: calc(100vh - 105px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
}

.q-sidebar::-webkit-scrollbar {
    width: 5px;
}
.q-sidebar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
}

/* ===== Section Card ===== */
.q-section {
    background: var(--bg-white, #fff);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
    transition: box-shadow 0.2s ease;
}

.q-section:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
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
    border-radius: 10px;
    flex-shrink: 0;
    font-size: 16px;
}

/* Section-specific icon backgrounds */
.q-section--doc .q-section-icon { background: #eef2ff; color: #4f46e5; border: 1px solid #e0e7ff; }
.q-section--customer .q-section-icon { background: #f0fdfa; color: #0d9488; border: 1px solid #ccfbf1; }
.q-section--products .q-section-icon { background: #fffbeb; color: #f59e0b; border: 1px solid #fef3c7; }
.q-section--summary .q-section-icon { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; }
.q-section--settings .q-section-icon { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }

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
    padding: 10px 14px;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    font-family: inherit;
    transition: all 0.2s ease;
    background: #f8fafc;
    color: #1e293b;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #4f46e5;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}


.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

/* Products Section */
.product-item {
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    transition: all 0.2s ease;
}

.product-item:hover {
    border-color: #f59e0b;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.08);
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
    background: #ffffff;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    padding: 4px 8px 4px 4px;
    flex: 1;
    transition: all 0.2s ease;
}

.qty-group:focus-within, .price-group:focus-within {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
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
    border-radius: 8px;
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
    padding: 10px;
    background: transparent;
    color: #f59e0b;
    border: 1.5px dashed #fbbf24;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
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
    background: #fffbeb;
    border-color: #f59e0b;
}

/* ===== Payment Summary (Sidebar) ===== */
.payment-summary {
    background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
    border-radius: 15px;
    padding: 20px;
}

.payment-summary h3 {
    color: #e65100;
    margin-bottom: 15px;
    font-size: 18px;
}

.payment-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px dashed #ffb74d;
    align-items: center;
}

.payment-row .label { color: #e65100; font-size: 13px; }
.payment-row .value { font-weight: 600; color: #1e293b; font-size: 13px; }

/* Grand Total Highlight */
.grand-total-highlight {
    padding: 16px 0 0 0;
    margin-top: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.grand-total-highlight .gt-label {
    color: #e65100;
    font-size: 15px;
    font-weight: 700;
}

.grand-total-highlight .gt-value {
    color: #d35400;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.5px;
}

/* ===== Action Buttons ===== */
.submit-btn {
    width: 100%;
    padding: 12px 16px;
    background: #10b981;
    color: #ffffff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    flex: 2;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.submit-btn:hover {
    background: #059669;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    transform: translateY(-1px);
}

.submit-btn:disabled {
    background: var(--text-muted, #94a3b8);
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
}

.print-btn {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: #fff;
    border: none;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
}
.print-btn:hover {
    background: linear-gradient(135deg, #3730a3, #4f46e5);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
    transform: translateY(-1px);
}

/* ===== Responsive ===== */
@media (max-width: 1024px) {
    .q-main-grid {
        grid-template-columns: 1fr;
    }
    .q-sidebar {
        position: static;
        max-height: none;
        overflow-y: visible;
    }
}

@media (max-width: 600px) {
    .form-row { grid-template-columns: 1fr; }
    .product-row { flex-direction: column; align-items: stretch; }
    .remove-product-btn { align-self: flex-end; }
}

/* ------------------------------------ */
/* CSS สำหรับการพิมพ์ (Media Print) */
/* ------------------------------------ */
@media print {
    body, html { background-color: white !important; }
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
        background-color: white !important;
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
;

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

function translateNotesToEN(html) {
    if (!html) return '';
    let res = html.replace(/&nbsp;/g, ' ');
    res = res.replace(/หมายเหตุ\s*:/g, 'Remarks:');
    res = res.replace(/ชำระมัดจำ\s*50\s*%\s*ณ\s*วันที่สั่งซื้อ\s*หรือสั่งผลิต\s*ชำระส่วนที่เหลือ\s*วันที่รับสินค้า/g, 'Pay 50% deposit on order date, pay the remaining balance on delivery date');
    res = res.replace(/ห้ามวางจำหน่ายตามร้านค้าทั่วไป!/g, 'Do not sell in general retail stores!');
    res = res.replace(/สินค้าไม่ผ่านกระบวนการทาง\s*อย\./g, 'Products have not passed FDA processing.');
    res = res.replace(/สินค้าสามารถขายได้เฉพาะงานมงคล\s*งานบุญ\s*งานขาวดำ/g, 'Products can only be sold for auspicious events, merit-making events, and funerals.');
    res = res.replace(/ใช้เป็นของชำร่วย\s*,\s*ของฝาก\s*,\s*ของขวัญ/g, 'Used as souvenirs or gifts.');
    res = res.replace(/สินค้าขายเฉพาะกลุ่ม/g, 'Products sold for specific groups only.');
    res = res.replace(/\(ราคารวมฉลากและรูปแบบโลโก้ชื่อแบรนด์\)/g, '(Price includes labels and brand logo design)');
    res = res.replace(/\*\*ราคานี้ยังไม่รวมค่าจัดส่ง\*\*/g, '**This price does not include shipping costs**');
    
    // FDA Quotation
    res = res.replace(/เงื่อนไข\s*:/g, 'Conditions:');
    res = res.replace(/กรณีที่ลูกค้าตกลงโอนชำระเงินรายการตามใบวางบิล\/ใบแจ้งหนี้เรียบร้อยแล้ว/g, 'If the customer has transferred payment according to the billing invoice');
    res = res.replace(/ทางบริษัท\(โรงงาน\)ขอสงวนสิทธิ์ในการคืนเงินทุกกรณี/g, 'The company (factory) reserves the right not to refund under any circumstances.');
    res = res.replace(/\*\*หากมีการเปลี่ยนแปลงอันที่จะเกิดขึ้นทาง\s*บริษัทขอพิจารณาไม่เกิน\s*15%\s*ของจำนวนทั้งหมด\*\*/g, '**Any changes made are subject to a maximum fee of 15% of the total amount.**');
    res = res.replace(/\*\*ค่าดำเนินการขึ้นทะเบียนและค่าธรรมเนียมชำระเพียงครั้งเดียว\s*100%\s*ในครั้งแรกที่ยื่นคำขอ\*\*/g, '**Registration and processing fees must be paid 100% in full upon the first application.**');
    
    return res;
}

const DEFAULT_NORMAL_NOTES = `<div style="font-weight:bold; color: black;">หมายเหตุ:
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
<div style="color:red; text-align: center; font-weight: bold;">**ราคานี้ยังไม่รวมค่าจัดส่ง**</div>`;

const DEFAULT_FDA_NOTES = `<div style="font-weight:bold; color: black; font-size: 14px; line-height: 1.5;">
เงื่อนไข : <span style="color:red; font-weight: normal;">กรณีที่ลูกค้าตกลงโอนชำระเงินรายการตามใบวางบิล/ใบแจ้งหนี้เรียบร้อยแล้ว<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ทางบริษัท(โรงงาน)ขอสงวนสิทธิ์ในการคืนเงินทุกกรณี<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="font-weight: bold;">**หากมีการเปลี่ยนแปลงอันที่จะเกิดขึ้นทาง บริษัทขอพิจารณาไม่เกิน 15% ของจำนวนทั้งหมด**</span></span><br>
<hr style="margin: 8px 0; border: none; border-top: 1px solid #000;">
หมายเหตุ : <span style="color:red">**ค่าดำเนินการขึ้นทะเบียนและค่าธรรมเนียมชำระเพียงครั้งเดียว 100% ในครั้งแรกที่ยื่นคำขอ**</span>
</div>`;

const PRODUCT_CATALOG = {
    "ยาดมสมุนไพร": { price: 79, promo: { newQty: 40, newPrice: 25, oldQty: 50, oldPrice: 20 } },
    "ยาดมสมุนไพร จัมโบ้": { price: 490, promo: { newQty: 5, newPrice: 200 } },
    "ยาหม่อง": { price: 59, promo: { newQty: 35, newPrice: 1000/35, oldQty: 40, oldPrice: 25 } },
    "ยาน้ำมัน ขนาด 10 มล.": { price: 129, promo: { newQty: 20, newPrice: 50, oldQty: 17, oldPrice: 59 } },
    "ยาน้ำมัน ขนาด 5 มล.": { price: 69, promo: { newQty: 25, newPrice: 40 } },
    "ยาน้ำมันสมุนไพร สูตรเย็น": { price: 199, promo: { newQty: 14, newPrice: 71 } },
    "ยาน้ำมันสมุนไพร สูตรร้อน": { price: 199, promo: { newQty: 14, newPrice: 71 } },
    "ยาสเปรย์ผสมกระดูกไก่ดำ": { price: 199, promo: { newQty: 14, newPrice: 71 } },
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

const PRODUCT_IMAGES = {
    "ยาดมสมุนไพร": "/images/products/yadom-samunprai.png",
    "ยาดมสมุนไพร จัมโบ้": "/images/products/yadom-samunprai-jumbo.png",
    "ยาหม่อง": "/images/products/ya-mong.png",
    "ยาน้ำมัน ขนาด 10 มล.": "/images/products/ya-namman-10ml.png",
    "ยาน้ำมัน ขนาด 5 มล.": "/images/products/ya-namman-10ml.png",
    "ยาน้ำมันสมุนไพร สูตรเย็น": "/images/products/ya-namman-sutra-yen.png",
    "ยาน้ำมันสมุนไพร สูตรร้อน": "/images/products/ya-namman-sutra-ron.png",
    "ยาสเปรย์ผสมกระดูกไก่ดำ": "/images/products/ya-spray-kraduk-kai-dam.png",
    "แคปซูลขมิ้นชัน": "/images/products/capsule-kamin-chan.png",
    "แคปซูลฟ้าทะลายโจร": "/images/products/capsule-fa-talai-jorn.png",
    "แคปซูลขิง": "/images/products/capsule-khing.png",
    "แคปซูลมะขามแขก": "/images/products/capsule-makham-khaek.png",
    "แคปซูลรางจืด": "/images/products/capsule-rang-juet.png",
    "แคปซูลมะระขี้นก": "/images/products/capsule-mara-khi-nok.png",
    "แคปซูลตรีผลา": "/images/products/capsule-tri-phala.png",
    "แคปซูลเพชรสังฆาต": "/images/products/capsule-phet-sang-khat.png",
    "แคปซูลประสะเจตพังคี": "/images/products/capsule-prasa-jet-phang-khi.png",
    "แคปซูลสหัศธารา": "/images/products/capsule-sahat-thara.png",
    "แคปซูลประสะมะแว้ง": "/images/products/capsule-prasa-mawaeng.png",
    "แคปซูลปราบชมพูทวีป": "/images/products/capsule-prap-chomphu-thawip.png",
    "ลูกประคบ": "/images/products/luk-prakop.png",
    "ชาอัสสัม กล่อง": "/images/products/cha-assam-box.png",
    "ชาอัสสัม ซอง": "/images/products/cha-assam-sachet.png",
    "ชากัญชาโสมขาว": "/images/products/cha-cannabis-ginseng.png",
    "ชากัญชา": "/images/products/cha-cannabis.png",
    "น้ำผึ้ง": "/images/products/namphung.png",
    "น้ำผึ้ง เล็ก": "/images/products/namphung.png",
    "น้ำผึ้ง ใหญ่": "/images/products/namphung.png",
    "เทียนหอม Aromatic กลิ่น Rose": "/images/products/candle-rose.png",
    "เทียนหอม Aromatic กลิ่น Morning": "/images/products/candle-morning.png",
    "เทียนหอม Aromatic กลิ่น Thai": "/images/products/candle-thai.png",
    "น้ำมันหอมระเหย กลิ่น Rose": "/images/products/essential-oil-rose.png",
    "น้ำมันหอมระเหย กลิ่น Morning": "/images/products/essential-oil-morning.png",
    "น้ำมันหอมระเหย กลิ่น Thai": "/images/products/essential-oil-thai.png"
};

const DEFAULT_UNITS = ['ชิ้น', 'กิโลกรัม', 'กรัม', 'กระปุก', 'ขวด', 'ถุง', 'ซอง', 'หลอด', 'กล่อง', 'แผง', 'ขวด(โหล)', 'โหล'];

export default function BillingInvoiceForm({ editId, onBack, onSave, viewOnly, isHistory }) {
    const { signatures: availableSignatures, getSignatureUrl } = useSignatures();
    const { showConfirm, showAlert, showPrompt } = useAlert();
    const [status, setStatus] = useState(null);

    const [customUnits, setCustomUnits] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('customUnits')) || [];
        } catch {
            return [];
        }
    });

    const [customProducts, setCustomProducts] = useState(() => {
        try {
            const data = JSON.parse(localStorage.getItem('customProducts')) || [];
            return data.map(item => typeof item === 'string' ? { name: item, image: null } : item);
        } catch {
            return [];
        }
    });

    const [addProductModal, setAddProductModal] = useState({ visible: false, targetItemId: null, name: '', image: null });
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');

    const [customBanks, setCustomBanks] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('customBanks')) || [];
        } catch {
            return [];
        }
    });
    const [addBankModal, setAddBankModal] = useState({ visible: false, bankName: '', accountName: '', accountNo: '', logo: null });
    const [showBankDropdown, setShowBankDropdown] = useState(false);

    const [formData, setFormData] = useState({
        docType: 'billing_invoice_thc', // billing_invoice_thc, billing_invoice_psf, billing_invoice_elt
        billStatus: 'ktb',
        billNo: '',
        billDate: new Date().toISOString().split('T')[0],
        printLanguage: 'TH', // TH or EN
        contractId: '',
        customerId: '',
        customerTypeId: '',
        customerName: '',
        contactPerson: '',
        email: '',
        address: '', // Will be combined from addr_* fields
        addr_no: '',
        addr_soi: '',
        addr_road: '',
        addr_subdistrict: '',
        addr_district: '',
        addr_province: '',
        addr_zip: '',
        phone: '',
        taxId: '',
        taxBranch: 'head_office',
        branchNo: '',
        discountPercent: 0,
        vatRate: 0,
        shippingCost: 0,
        depositPercent: '0',
        customDepositAmount: 0,
        signer: '',
        notes: DEFAULT_NORMAL_NOTES,
        showDiscountInPrint: false,
        showVatInPrint: false,
        showDepositInPrint: true,
        showShippingInPrint: false,
        designFee: 500,
        showDesignFeeInPrint: false,
        fdaCustomerCode: '',
        fdaEmail: '',
        fdaProjectName: 'ขึ้นทะเบียนตำรับยา (G)',
        fdaCreditTerms: 'ชำระเต็มจำนวน',
        fdaServiceRegister: true,
        fdaServiceRegisterPrice: 30000,
        fdaServiceTrademark: false,
        fdaServiceTrademarkPrice: 5000
    });

    useEffect(() => {
        if (formData.notes && !formData.notes.includes('<div')) {
            const isFda = formData.docType && formData.docType.includes('fda');
            setFormData(prev => ({
                ...prev,
                notes: isFda ? DEFAULT_FDA_NOTES : DEFAULT_NORMAL_NOTES
            }));
        }
    }, [formData.notes]);

    useEffect(() => {
        if (!editId) {
            const isFda = formData.docType && formData.docType.includes('fda');
            setFormData(prev => ({
                ...prev,
                notes: isFda ? DEFAULT_FDA_NOTES : DEFAULT_NORMAL_NOTES
            }));

            // Fetch next bill number from API
            const fetchNextNo = async () => {
                try {
                    const res = await fetch(`${API_BASE}/billing-invoices/next-number?docType=${formData.docType}`);
                    const json = await res.json();
                    if (json.success && json.nextNumber) {
                        setFormData(prev => ({ ...prev, billNo: json.nextNumber }));
                    }
                } catch (err) {
                    console.error('Error fetching next bill no:', err);
                }
            };
            fetchNextNo();
        }
    }, [formData.docType, editId]);

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

    const [customerList, setCustomerList] = useState([]);
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const res = await fetch(`${API_BASE}/customers`);
                const json = await res.json();
                if (json.success) {
                    setCustomerList(json.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch customers:", err);
            }
        };
        fetchCustomers();
    }, []);

    const [customerTypes, setCustomerTypes] = useState([]);
    useEffect(() => {
        const fetchCustomerTypes = async () => {
            try {
                const res = await fetch(`${API_BASE}/customers/types`);
                const json = await res.json();
                if (json.success) {
                    setCustomerTypes(json.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch customer types:", err);
            }
        };
        fetchCustomerTypes();
    }, []);

    const parseAddressToSplit = (fullAddress) => {
        if (!fullAddress) return { addr_no: '-', addr_soi: '-', addr_road: '-', addr_subdistrict: '-', addr_district: '-', addr_province: '-', addr_zip: '-' };
        let no = '', soi = '', road = '', sub = '', dist = '', prov = '', zip = '';
        
        const zipMatch = fullAddress.match(/\b\d{5}\b/);
        if (zipMatch) zip = zipMatch[0];
        let rem = fullAddress.replace(zip, '').trim();
        
        const provMatch = rem.match(/(จ\.|จังหวัด)\s*([^\s]+)/);
        if (provMatch) { prov = provMatch[2]; rem = rem.replace(provMatch[0], ''); }
        else {
            const bkkMatch = rem.match(/กรุงเทพมหานคร|กรุงเทพฯ|กทม\./);
            if (bkkMatch) { prov = 'กรุงเทพมหานคร'; rem = rem.replace(bkkMatch[0], ''); }
        }
        
        const distMatch = rem.match(/(อ\.|อำเภอ|เขต)\s*([^\s]+)/);
        if (distMatch) { dist = distMatch[2]; rem = rem.replace(distMatch[0], ''); }
        
        const subMatch = rem.match(/(ต\.|ตำบล|แขวง)\s*([^\s]+)/);
        if (subMatch) { sub = subMatch[2]; rem = rem.replace(subMatch[0], ''); }
        
        const roadMatch = rem.match(/(ถ\.|ถนน)\s*([^\s]+)/);
        if (roadMatch) { road = roadMatch[2]; rem = rem.replace(roadMatch[0], ''); }
        
        const soiMatch = rem.match(/(ซ\.|ซอย)\s*([^\s]+)/);
        if (soiMatch) { soi = soiMatch[2]; rem = rem.replace(soiMatch[0], ''); }
        
        no = rem.replace(/,/g, '').trim();
        if (no.endsWith('-')) no = no.slice(0, -1).trim();
        
        if (!soi) soi = '-';
        if (!road) road = '-';
        if (!sub) sub = '-';
        if (!dist) dist = '-';
        if (!prov) prov = '-';
        if (!zip) zip = '-';
        if (!no) no = '-';
        
        return { addr_no: no, addr_soi: soi, addr_road: road, addr_subdistrict: sub, addr_district: dist, addr_province: prov, addr_zip: zip };
    };

    const handleSelectCustomer = (cust) => {
        const parsedAddr = parseAddressToSplit(cust.Address || '');
        setFormData(prev => ({
            ...prev,
            customerId: cust.CustomerID || '',
            customerName: cust.CustomerName || '',
            contactPerson: cust.ContactPerson || '',
            phone: cust.Phone || '',
            email: cust.Email || '',
            address: cust.Address || '',
            ...parsedAddr,
            taxId: cust.TaxID || '',
            taxBranch: cust.TaxBranch || 'head_office',
            branchNo: cust.BranchNo || '',
            customerTypeId: cust.CustomerTypeID || ''
        }));
    };

    const filteredCustomers = customerList.filter(c => {
        const term = customerSearchTerm.toLowerCase();
        return (c.CustomerName || '').toLowerCase().includes(term) ||
            (c.CustomerCode || '').toLowerCase().includes(term) ||
            (c.ContactPerson || '').toLowerCase().includes(term);
    });

    useEffect(() => {
        if (editId) {
            const fetchQuotation = async () => {
                try {
                    const isHistoryEdit = String(editId).startsWith('history-');
                    const targetId = isHistoryEdit ? editId.split('-')[1] : editId;
                    const endpoint = isHistoryEdit ? `/billing-invoices/history/${targetId}` : `/billing-invoices/${targetId}`;
                    const res = await fetch(`${API_BASE}${endpoint}`);
                    const json = await res.json();
                    if (json.success) {
                        const data = json.data;
                        
                        const parsedAddr = parseAddressToSplit(data.Address || '');
                        
                        setFormData({
                            docType: data.DocType || 'billing_invoice_thc',
                            billStatus: data.BankAccount || 'ktb',
                            billNo: data.BillingInvoiceNo || '',
                            billDate: data.BillDate ? data.BillDate.split('T')[0] : '',
                            printLanguage: data.PrintLanguage || 'TH',
                            contractId: data.ContractID || '',
                            customerId: data.CustomerID || '',
                            customerName: data.CustomerName || '',
                            address: data.Address || '',
                            ...parsedAddr,
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
                            showShippingInPrint: data.ShowShippingInPrint !== undefined ? data.ShowShippingInPrint : false,
                            designFee: data.DesignFee !== undefined ? parseFloat(data.DesignFee) : 500,
                            showDesignFeeInPrint: data.ShowDesignFeeInPrint !== undefined ? data.ShowDesignFeeInPrint : false,
                            fdaCustomerCode: data.FdaCustomerCode || '',
                            fdaEmail: data.FdaEmail || '',
                            fdaProjectName: data.FdaProjectName || 'ขึ้นทะเบียนตำรับยา (G)',
                            fdaCreditTerms: data.FdaCreditTerms || 'ชำระเต็มจำนวน',
                            fdaServiceRegister: data.FdaServiceRegister !== undefined ? Boolean(data.FdaServiceRegister) : true,
                            fdaServiceRegisterPrice: data.FdaServiceRegisterPrice !== undefined ? parseFloat(data.FdaServiceRegisterPrice) : 30000,
                            fdaServiceTrademark: data.FdaServiceTrademark !== undefined ? Boolean(data.FdaServiceTrademark) : false,
                            fdaServiceTrademarkPrice: data.FdaServiceTrademarkPrice !== undefined ? parseFloat(data.FdaServiceTrademarkPrice) : 5000
                        });

                        if (data.items && data.items.length > 0) {
                            setItems(data.items.map(item => ({
                                id: item.ItemID,
                                name: item.ItemName,
                                qty: item.Qty,
                                price: item.Price,
                                amount: item.Amount,
                                isPromo: item.IsPromo,
                                promoType: item.IsPromo ? 'old' : '', // default to old for backward compat, or user can change
                                promoMultiplier: item.PromoMultiplier || 1,
                                basePromoName: item.ItemName,
                                image: item.ImageURL || null,
                                unit: item.Unit || 'ชิ้น',
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

    useEffect(() => {
        if (editId && customerList.length > 0) {
            if (formData.customerId && !formData.customerTypeId) {
                const matched = customerList.find(c => String(c.CustomerID) === String(formData.customerId));
                if (matched) {
                    setFormData(prev => ({ ...prev, customerTypeId: matched.CustomerTypeID || '' }));
                }
            } else if (!formData.customerId && formData.customerName) {
                const matched = customerList.find(c => c.CustomerName?.trim() === formData.customerName?.trim());
                if (matched) {
                    setFormData(prev => ({ 
                        ...prev, 
                        customerId: matched.CustomerID,
                        customerTypeId: prev.customerTypeId || matched.CustomerTypeID || ''
                    }));
                }
            }
        }
    }, [editId, customerList, formData.customerName, formData.customerId, formData.customerTypeId]);

    const [items, setItems] = useState([
        { id: 1, name: '', basePromoName: '', qty: '', price: '', isPromo: false, promoType: '', promoMultiplier: 1, unit: 'ชิ้น', image: null, showDropdown: false }
    ]);

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const nextData = { ...prev, [name]: type === 'checkbox' ? checked : value };
            
            if (name === 'docType') {

                if (value === 'billing_invoice_psf') {
                    nextData.billStatus = 'kbank';
                } else if (value === 'billing_invoice_thc' || value === 'billing_invoice_elt') {
                    if (prev.billStatus === 'kbank') {
                        nextData.billStatus = 'ktb';
                    }
                }
            }
            
            return nextData;
        });
    };

    const addItem = () => {
        setItems(prev => [...prev, { id: Date.now(), name: '', basePromoName: '', qty: '', price: '', isPromo: false, promoType: '', promoMultiplier: 1, unit: 'ชิ้น', image: null, showDropdown: false }]);
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
                
                if (field === 'manualTotal') {
                    const numTotal = parseFloat(value) || 0;
                    const qty = parseFloat(newItem.qty) || 1;
                    newItem.price = qty > 0 ? (numTotal / qty).toFixed(4) : 0;
                } else if (['qty', 'price', 'promoType', 'promoMultiplier', 'name', 'isPromo'].includes(field)) {
                    newItem.manualTotal = undefined;
                }

                if (field === 'name') {
                    const customProduct = customProducts.find(p => p.name === value);
                    if (PRODUCT_CATALOG[value]) {
                        newItem.basePromoName = value;
                        newItem.image = PRODUCT_IMAGES[value] || null;
                        if ((newItem.promoType || newItem.isPromo) && PRODUCT_CATALOG[value].promo) {
                            const pData = PRODUCT_CATALOG[value].promo;
                            const tQty = (newItem.promoType === 'old' && pData.oldQty) ? pData.oldQty : (pData.newQty || pData.qty);
                            const tPrice = (newItem.promoType === 'old' && pData.oldPrice) ? pData.oldPrice : (pData.newPrice || pData.price);
                            newItem.qty = tQty * newItem.promoMultiplier;
                            newItem.price = tPrice;
                        } else {
                            newItem.promoType = '';
                            newItem.isPromo = false;
                            newItem.promoMultiplier = 1;
                            if (PRODUCT_CATALOG[value].price !== '') {
                                newItem.price = PRODUCT_CATALOG[value].price;
                            }
                        }
                    } else if (customProduct) {
                        newItem.basePromoName = value;
                        newItem.image = customProduct.image || null;
                        newItem.promoType = '';
                        newItem.isPromo = false;
                        newItem.promoMultiplier = 1;
                        newItem.price = '';
                    }
                } else if (field === 'promoType') {
                    const baseName = newItem.basePromoName || newItem.name;
                    newItem.isPromo = !!value;
                    if (value && PRODUCT_CATALOG[baseName] && PRODUCT_CATALOG[baseName].promo) {
                        const pData = PRODUCT_CATALOG[baseName].promo;
                        const tQty = (value === 'old' && pData.oldQty) ? pData.oldQty : (pData.newQty || pData.qty);
                        const tPrice = (value === 'old' && pData.oldPrice) ? pData.oldPrice : (pData.newPrice || pData.price);
                        newItem.qty = tQty * newItem.promoMultiplier;
                        newItem.price = tPrice;
                    } else {
                        newItem.qty = '';
                        if (PRODUCT_CATALOG[baseName] && PRODUCT_CATALOG[baseName].price !== '') {
                            newItem.price = PRODUCT_CATALOG[baseName].price;
                        } else {
                            newItem.price = '';
                        }
                    }
                } else if (field === 'isPromo') {
                    const baseName = newItem.basePromoName || newItem.name;
                    if (value && PRODUCT_CATALOG[baseName] && PRODUCT_CATALOG[baseName].promo) {
                        newItem.promoType = 'old';
                        const pData = PRODUCT_CATALOG[baseName].promo;
                        const tQty = pData.oldQty || pData.qty;
                        const tPrice = pData.oldPrice || pData.price;
                        newItem.qty = tQty * newItem.promoMultiplier;
                        newItem.price = tPrice;
                    } else {
                        newItem.promoType = '';
                        newItem.qty = '';
                        if (PRODUCT_CATALOG[baseName] && PRODUCT_CATALOG[baseName].price !== '') {
                            newItem.price = PRODUCT_CATALOG[baseName].price;
                        } else {
                            newItem.price = '';
                        }
                    }
                } else if (field === 'promoMultiplier') {
                    const baseName = newItem.basePromoName || newItem.name;
                    if ((newItem.promoType || newItem.isPromo) && PRODUCT_CATALOG[baseName] && PRODUCT_CATALOG[baseName].promo) {
                        const pData = PRODUCT_CATALOG[baseName].promo;
                        const tQty = (newItem.promoType === 'old' && pData.oldQty) ? pData.oldQty : (pData.newQty || pData.qty);
                        const tPrice = (newItem.promoType === 'old' && pData.oldPrice) ? pData.oldPrice : (pData.newPrice || pData.price);
                        newItem.qty = tQty * parseInt(value, 10);
                        newItem.price = tPrice;
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

    const isFda = formData.docType && formData.docType.includes('fda');
    const validProductCount = items.filter(item => item.name && item.name.trim() !== '').length || 1;
    
    let subTotal = 0;
    if (isFda) {
        let fdaPrice = 0;
        if (formData.fdaServiceRegister) fdaPrice += parseFloat(formData.fdaServiceRegisterPrice) || 0;
        if (formData.fdaServiceTrademark) fdaPrice += parseFloat(formData.fdaServiceTrademarkPrice) || 0;
        subTotal = fdaPrice * validProductCount;
    } else {
        subTotal = items.reduce((sum, item) => {
            if (item.manualTotal !== undefined) {
                return sum + (parseFloat(item.manualTotal) || 0);
            }
            if (item.promoType || item.isPromo) {
                return sum + (1000 * (parseInt(item.promoMultiplier) || 1));
            }
            return sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0));
        }, 0);
    }
    const discountAmount = (!isFda && formData.showDiscountInPrint) ? (subTotal * (parseFloat(formData.discountPercent) || 0) / 100) : 0;
    const afterDiscount = subTotal - discountAmount;
    
    const effectiveVatRate = isFda ? 7 : (parseFloat(formData.vatRate) || 0);
    const effectiveShowVat = isFda ? true : formData.showVatInPrint;
    const vatAmount = effectiveShowVat ? (afterDiscount * effectiveVatRate / 100) : 0;
    
    const shipping = !isFda ? (parseFloat(formData.shippingCost) || 0) : 0;
    const designFee = (!isFda && formData.showDesignFeeInPrint) ? (parseFloat(formData.designFee) || 0) : 0;
    const grandTotal = afterDiscount + vatAmount + shipping + designFee;

    let depositAmount = 0;
    if (formData.depositPercent === 'custom') {
        depositAmount = parseFloat(formData.customDepositAmount) || 0;
    } else {
        depositAmount = grandTotal * (parseFloat(formData.depositPercent) || 0) / 100;
    }
    const remainingAmount = grandTotal - depositAmount;

    let compNameTH = '';
    let compNameEN = '';
    let compAddr1 = '';
    let compAddr2 = '';
    let compTax = '';
    let compLogo = '';

    const isElt = formData.docType.includes('elt');
    const isPsf = formData.docType.includes('psf');
    const isEn = formData.printLanguage === 'EN';

    if (isElt) {
        compNameTH = isEn ? 'Elite Trading 2020 Co., Ltd. (HEAD OFFICE)' : 'บริษัท อิลิท เทรดดิ้ง 2020 จำกัด (สำนักงานใหญ่)';
        compNameEN = '';
        compAddr1 = isEn ? '6/8 Moo 2, Sai Ma Subdistrict, Mueang Nonthaburi District' : 'เลขที่ 6/8 หมู่ที่ 2 แขวง/ตำบล ไทรม้า เขต/อำเภอเมืองนนทบุรี';
        compAddr2 = isEn ? 'Nonthaburi Province 11000 Tel:063-898-9895' : 'จ.นนทบุรี รหัสไปรษณีย์ 11000 โทร:063-898-9895';
        compTax = isEn ? 'Tax ID: 0125563029289' : 'เลขผู้เสียภาษี: 0125563029289';
        compLogo = '/images/logos/logo-elt.png';
    } else if (isPsf) {
        compNameTH = isEn ? 'Premier Smart Farm Co., Ltd. (HEAD OFFICE)' : 'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด (สำนักงานใหญ่)';
        compNameEN = '';
        compAddr1 = isEn ? '2/2 Soi Nonthaburi 38, Tha Sai Subdistrict, Mueang Nonthaburi District, Nonthaburi 11000' : 'เลขที่ 2/2 ซอยนนทบุรี 38 ต.ท่าทราย อ.เมืองนนทบุรี จ.นนทบุรี 11000';
        compAddr2 = '';
        compTax = isEn ? 'Tax ID: 0125566026612' : 'เลขประจำตัวผู้เสียภาษี 0125566026612';
        compLogo = '/images/logos/logo-psf.png';
    } else {
        compNameTH = isEn ? 'Thai Herb Centers(THC)Community Enterprise (HEAD OFFICE)' : 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์ (สำนักงานใหญ่)';
        compNameEN = isEn ? '' : 'Thai Herb Centers(THC)Community Enterprise (HEAD OFFICE)';
        compAddr1 = isEn ? '6/10 Moo 2 Sai Ma subdistrict, Mueang Nonthaburi District, Nonthaburi 11000' : '6/10 หมู่ที่ 2 ต.ไทรม้า อ.เมืองนนทบุรี จ.นนทบุรี 11000';
        compAddr2 = isEn ? '' : '6/10 Moo 2 Sai Ma subdistrict,Mueang Nonthaburi District,Nonthabui Province,Thailand 11000';
        compTax = isEn ? 'Tel: 083-9799389 / Tax ID: 099-200438186-0' : 'โทร:083-9799389 / เลขประจำตัวผู้เสียภาษี 099-200438186-0';
        compLogo = '/images/logos/logo-thc.png';
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isEn) {
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatMoney = (amount) => {
        return Number(amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const ok = await showConfirm('ยืนยันการบันทึก', 'คุณต้องการบันทึกใบวางบิล/ใบแจ้งหนี้นี้ใช่หรือไม่?', 'info');
        if (!ok) return;

        if (!formData.customerTypeId) {
            showAlert('ข้อผิดพลาด', 'กรุณาระบุประเภทลูกค้าก่อนบันทึก', 'warning');
            return;
        }

        setStatus('saving');

        let finalAddress = formData.address;
        if (formData.addr_no) {
            const parts = [
                formData.addr_no,
                formData.addr_soi ? `ซอย ${formData.addr_soi}` : '',
                formData.addr_road ? `ถนน ${formData.addr_road}` : '',
                formData.addr_subdistrict ? `ต. ${formData.addr_subdistrict}` : '',
                formData.addr_district ? `อ. ${formData.addr_district}` : '',
                formData.addr_province ? `จ. ${formData.addr_province}` : '',
                formData.addr_zip
            ].filter(p => p.trim() !== '');
            finalAddress = parts.join(' ');
        }

        const payload = {
            billingInvoiceNo: formData.billNo,
            docType: formData.docType,
            printLanguage: formData.printLanguage,
            bankAccount: formData.billStatus,
            customerId: formData.customerId,
            customerTypeId: formData.customerTypeId,
            customerName: formData.customerName,
            contactPerson: formData.contactPerson,
            email: formData.email,
            address: finalAddress,
            phone: formData.phone,
            taxId: formData.taxId,
            billDate: formData.billDate,
            validUntil: new Date(new Date(formData.billDate).getTime() + 30*24*60*60*1000).toISOString().split('T')[0],
            subTotal: Number(subTotal) || 0,
            discountPercent: Number(formData.discountPercent) || 0,
            discountAmount: Number(discountAmount) || 0,
            afterDiscount: Number(afterDiscount) || 0,
            vatRate: Number(formData.vatRate) || 0,
            vatAmount: Number(vatAmount) || 0,
            shippingCost: Number(formData.shippingCost) || 0,
            grandTotal: Number(grandTotal) || 0,
            depositPercent: formData.depositPercent,
            depositAmount: Number(depositAmount) || 0,
            remainingAmount: Number(remainingAmount) || 0,
            signer: formData.signer,
            notes: formData.notes,
            showDiscountInPrint: formData.showDiscountInPrint,
            showVatInPrint: formData.showVatInPrint,
            showDepositInPrint: formData.showDepositInPrint,
            showShippingInPrint: formData.showShippingInPrint,
            designFee: Number(designFee) || 0,
            showDesignFeeInPrint: formData.showDesignFeeInPrint,
            contractId: formData.contractId || null,
            status: editId ? undefined : 'พร้อมใช้',
            items: items.filter(i => i.name).map(i => ({
                name: i.name,
                qty: Number(i.qty) || 0,
                price: Number(i.price) || 0,
                amount: i.isPromo ? 1000 * (Number(i.promoMultiplier) || 1) : (Number(i.qty) || 0) * (Number(i.price) || 0),
                isPromo: i.isPromo,
                promoMultiplier: Number(i.promoMultiplier) || 1,
                imageURL: i.image || i.imageURL
            }))
        };

        try {
            const url = editId ? `${API_BASE}/billing-invoices/${editId}` : `${API_BASE}/billing-invoices`;
            const method = editId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.success) {
                setStatus('success');
                showAlert('สำเร็จ', 'บันทึกข้อมูลใบวางบิล/ใบแจ้งหนี้เรียบร้อยแล้ว', 'success');
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

    const selectedSignature = availableSignatures.find(s => s.KeyName === formData.signer);


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
                            #q-print-container .print-color-green { color: #27ae60 !important; }
                            #q-print-container .print-color-red { color: red !important; }
                            #q-print-container .print-color-blue { color: #2980b9 !important; }
                            #q-print-container .print-bg-gray {
                                background-color: #e6e6e6 !important;
                            }
                            #q-print-container .print-notes-container span[style*="color:red"],
                            #q-print-container .print-notes-container span[style*="color: red"],
                            #q-print-container .print-notes-container div[style*="color:red"],
                            #q-print-container .print-notes-container div[style*="color: red"] {
                                color: red !important;
                            }
                            #q-print-container .print-header-table { width: 100%; border-collapse: collapse; border: none; margin-bottom: 0; }
                            #q-print-container .print-header-table td { border: none; }
                            #q-print-container .print-info-table {
                                width: 100%; border-collapse: collapse; border: 1px solid black; border-top: none;
                                margin-bottom: 0; table-layout: fixed;
                            }
                            #q-print-container .print-info-table td { border-bottom: none; padding: 4px 8px; word-wrap: break-word; font-weight: 300; font-size: 10pt; }
                            #q-print-container .print-products-table { width: 100%; border-collapse: collapse; border: 1px solid black; border-top: none; table-layout: fixed; }
                            #q-print-container .print-products-table th { border: 1px solid black; text-align: center; padding: 4px 2px; font-size: 10pt; }
                            #q-print-container .print-products-table td { border: 1px solid black; text-align: center; padding: 2px 4px; font-size: 10pt; font-weight: 300; word-wrap: break-word; }
                            #q-print-container .print-footer-table { width: 100%; border-collapse: collapse; border: 1px solid black; border-top: none; table-layout: fixed; }
                            #q-print-container .print-footer-table td { padding: 2px 4px; font-size: 10pt; }
                            #q-print-container .print-signature-table { width: 100%; border-collapse: collapse; border: 1px solid black; border-top: none; }
                        }
                    `}</style>
                    <div className="view-only-controls" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                        <button className="btn-back-text" type="button" onClick={onBack}>
                            <ArrowLeft size={16} /> กลับไปหน้ารายการ
                        </button>
                        <button className="btn-primary" type="button" onClick={handlePrint}>
                            <Printer size={16} /> พิมพ์ใบวางบิล/ใบแจ้งหนี้
                        </button>
                    </div>

                </>
            )}

            <div className="q-container" style={{ display: viewOnly ? 'none' : 'block' }}>
                <div style={{ marginBottom: '16px' }}>
                    <button className="btn-back-text" onClick={onBack}>
                        <ArrowLeft size={16} /> กลับหน้าหลัก
                    </button>
                </div>
                
                <div className="q-header">
                    <h1><FileText size={22} color="#4f46e5" /> ฟอร์มออกใบวางบิล/ใบแจ้งหนี้</h1>
                    <p>กรุณากรอกข้อมูลให้ครบถ้วนเพื่อออกใบวางบิล/ใบแจ้งหนี้และเชื่อมต่อกับ Sales Order</p>
                </div>

                <form onSubmit={handleSave}>
                    <div className="q-main-grid">
                        <div className="q-main-left">
                    {/* ===== Section 1: ข้อมูลเอกสาร ===== */}
                    <div className="q-section q-section--doc">
                        <div className="q-section-header">
                            <div className="q-section-icon"><FileText size={18} /></div>
                            <div>
                                <div className="q-section-title">ข้อมูลเอกสาร</div>
                                <div className="q-section-desc">ตั้งค่าอ้างอิงสัญญา ประเภทเอกสาร บัญชีธนาคาร และเลขที่เอกสาร</div>
                            </div>
                        </div>

                        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '14px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>อ้างอิงสัญญา (เลือกจากระบบ)</label>
                                <CustomSelect name="contractId" value={formData.contractId} onChange={handleFormChange}>
                                    <option value="">-- ไม่ระบุสัญญา / ไม่ได้เชื่อมโยง --</option>
                                    {contracts.map(c => (
                                        <option key={c.ContractID} value={c.ContractID}>
                                            {c.ContractNo} - {c.ContractName} {c.CustomerName ? `(${c.CustomerName})` : ''}
                                        </option>
                                    ))}
                                </CustomSelect>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>เลือกลูกค้า (จากระบบ)</label>
                                <div onClick={() => setShowCustomerModal(true)} style={{ border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', minHeight: '42px' }}>
                                    <span style={{ color: formData.customerId ? '#334155' : '#94a3b8' }}>
                                        {formData.customerId ? (customerList.find(c => String(c.CustomerID) === String(formData.customerId))?.CustomerName || formData.customerName || 'เลือกลูกค้า') : (formData.customerName || '-- เลือกลูกค้า --')}
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>▼</span>
                                </div>
                            </div>
                        </div>



                        <div className="form-row" style={{ backgroundColor: '#fce4ec', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #f8bbd0' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>ประเภทเอกสาร <span className="required">*</span></label>
                                <CustomSelect name="docType" value={formData.docType} onChange={handleFormChange} required>
                                    <option value="billing_invoice_thc">ใบวางบิล/ใบแจ้งหนี้ (Billing Note/Invoice) - THC</option>
                                    <option value="billing_invoice_psf">ใบวางบิล/ใบแจ้งหนี้ (Billing Note/Invoice) - PSF</option>
                                    <option value="billing_invoice_elt">ใบวางบิล/ใบแจ้งหนี้ (Billing Note/Invoice) - ELT</option>
                                </CustomSelect>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                                <label>บัญชีธนาคาร (บริษัทรับเงิน) <span className="required">*</span></label>
                                <div 
                                    onClick={() => setShowBankDropdown(!showBankDropdown)}
                                    style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', background: '#f8fafc', color: '#1e293b', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span>
                                        {formData.billStatus === 'ktb' ? 'ธนาคารกรุงไทย (016-074423-7)' :
                                         formData.billStatus === 'kbank_charan' ? 'ธนาคารกสิกรไทย (235-1-19734-2)' :
                                         (() => {
                                             try {
                                                 const parsed = JSON.parse(formData.billStatus);
                                                 return `${parsed.bankName} (${parsed.accountNo})`;
                                             } catch {
                                                 return 'เลือกบัญชีธนาคาร';
                                             }
                                         })()}
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>▼</span>
                                </div>
                                
                                {showBankDropdown && (
                                    <>
                                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} onClick={() => setShowBankDropdown(false)} />
                                        <div style={{ position: 'absolute', top: '70px', left: 0, width: '100%', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 50, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                            <div 
                                                onClick={() => { setFormData(prev => ({...prev, billStatus: 'ktb'})); setShowBankDropdown(false); }}
                                                style={{ padding: '8px 12px', fontSize: '14px', color: '#334155', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                            >
                                                ธนาคารกรุงไทย (016-074423-7)
                                            </div>
                                            <div 
                                                onClick={() => { setFormData(prev => ({...prev, billStatus: 'kbank_charan'})); setShowBankDropdown(false); }}
                                                style={{ padding: '8px 12px', fontSize: '14px', color: '#334155', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                            >
                                                ธนาคารกสิกรไทย (235-1-19734-2)
                                            </div>
                                            {customBanks.map((bank, index) => (
                                                <div 
                                                    key={index} 
                                                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                                >
                                                    <div
                                                        onClick={() => { setFormData(prev => ({...prev, billStatus: JSON.stringify(bank)})); setShowBankDropdown(false); }}
                                                        style={{ padding: '8px 12px', fontSize: '14px', color: '#334155', flex: 1 }}
                                                    >
                                                        {bank.bankName} ({bank.accountNo})
                                                    </div>
                                                    <div
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const confirm = await showConfirm('ยืนยันการลบ', `ต้องการลบบัญชี "${bank.bankName}" ออกใช่หรือไม่?`);
                                                            if (confirm) {
                                                                const newCustom = customBanks.filter((_, i) => i !== index);
                                                                setCustomBanks(newCustom);
                                                                localStorage.setItem('customBanks', JSON.stringify(newCustom));
                                                                try {
                                                                    const parsed = JSON.parse(formData.billStatus);
                                                                    if (parsed.bankName === bank.bankName && parsed.accountNo === bank.accountNo) {
                                                                        setFormData(prev => ({...prev, billStatus: 'ktb'}));
                                                                    }
                                                                } catch {}
                                                            }
                                                        }}
                                                        style={{ padding: '8px 12px', color: '#ef4444', fontSize: '16px', lineHeight: 1 }}
                                                        title="ลบบัญชีนี้"
                                                    >
                                                        &times;
                                                    </div>
                                                </div>
                                            ))}
                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowBankDropdown(false);
                                                    setAddBankModal({ visible: true, bankName: '', accountName: '', accountNo: '', logo: null });
                                                }}
                                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#f59e0b', backgroundColor: '#fffbeb', fontWeight: 'bold', textAlign: 'center' }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#fef3c7'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = '#fffbeb'}
                                            >
                                                + เพิ่มบัญชีใหม่
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>


                        <div className="form-row" style={{ marginTop: '14px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>เลขที่ / No. <span className="required">*</span></label>
                                <input type="text" name="billNo" value={formData.billNo} onChange={handleFormChange} required />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>วันที่ / Date <span className="required">*</span></label>
                                <CustomDatePicker
                                    value={formData.billDate}
                                    name="billDate"
                                    onChange={handleFormChange}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* ===== Section 2: ข้อมูลลูกค้า ===== */}
                    <div className="q-section q-section--customer">
                        <div className="q-section-header">
                            <div className="q-section-icon"><span style={{ fontSize: '16px' }}>👤</span></div>
                            <div>
                                <div className="q-section-title">ข้อมูลลูกค้า</div>
                                <div className="q-section-desc">ชื่อ ที่อยู่ เบอร์โทร และเลขผู้เสียภาษีของลูกค้า</div>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>ชื่อลูกค้า / บริษัท <span className="required">*</span></label>
                                <input type="text" name="customerName" placeholder="กรอกชื่อลูกค้าหรือบริษัท" value={formData.customerName} onChange={handleFormChange} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>ที่อยู่ <span className="required">*</span></label>
                            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '14px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>บ้านเลขที่, อาคาร, หมู่</div>
                                            <input type="text" name="addr_no" placeholder="บ้านเลขที่, อาคาร, หมู่" value={formData.addr_no} onChange={handleFormChange} required />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>ซอย (ถ้ามี)</div>
                                            <input type="text" name="addr_soi" placeholder="ซอย (ถ้ามี)" value={formData.addr_soi} onChange={handleFormChange} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>ถนน (ถ้ามี)</div>
                                            <input type="text" name="addr_road" placeholder="ถนน (ถ้ามี)" value={formData.addr_road} onChange={handleFormChange} />
                                        </div>
                                    </div>
                                    <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '14px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>ตำบล/แขวง</div>
                                            <input type="text" name="addr_subdistrict" placeholder="ตำบล/แขวง" value={formData.addr_subdistrict} onChange={handleFormChange} required />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>อำเภอ/เขต</div>
                                            <input type="text" name="addr_district" placeholder="อำเภอ/เขต" value={formData.addr_district} onChange={handleFormChange} required />
                                        </div>
                                    </div>
                                    <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>จังหวัด</div>
                                            <input type="text" name="addr_province" placeholder="จังหวัด" value={formData.addr_province} onChange={handleFormChange} required />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>รหัสไปรษณีย์</div>
                                            <input type="text" name="addr_zip" placeholder="รหัสไปรษณีย์" value={formData.addr_zip} onChange={handleFormChange} required />
                                        </div>
                                    </div>
                        </div>
                        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>เบอร์โทร <span className="required">*</span></label>
                                <input type="tel" name="phone" placeholder="กรอกเบอร์โทร" value={formData.phone} onChange={handleFormChange} required />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>อีเมล</label>
                                <input type="email" name="email" placeholder="example@email.com" value={formData.email} onChange={handleFormChange} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>เลขประจำตัวผู้เสียภาษี</label>
                                <TaxIdInput name="taxId" value={formData.taxId} onChange={handleFormChange} />
                            </div>
                        </div>
                        {formData.docType && formData.docType.includes('fda') && (
                            <div style={{ backgroundColor: '#e8f5e9', padding: '15px', borderRadius: '8px', border: '1px solid #a5d6a7', marginTop: '20px' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: '#2e7d32', fontSize: '15px', fontWeight: 'bold' }}>ข้อมูลเฉพาะใบวางบิล/ใบแจ้งหนี้ อย. (FDA)</h4>
                                
                                <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontWeight: 'bold', color: '#334155' }}>รหัสลูกค้า (Customer Code)</label>
                                        <input type="text" name="fdaCustomerCode" placeholder="ถ้ามี" value={formData.fdaCustomerCode} onChange={handleFormChange} style={{ background: '#fff' }} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontWeight: 'bold', color: '#334155' }}>อีเมลลูกค้า (E-mail)</label>
                                        <input type="email" name="fdaEmail" placeholder="ถ้ามี" value={formData.fdaEmail} onChange={handleFormChange} style={{ background: '#fff' }} />
                                    </div>
                                </div>
                                
                                <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontWeight: 'bold', color: '#334155' }}>โครงการ (Project)</label>
                                        <input type="text" name="fdaProjectName" placeholder="ขึ้นทะเบียนตำรับยา (G)" value={formData.fdaProjectName} onChange={handleFormChange} style={{ background: '#fff' }} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontWeight: 'bold', color: '#334155' }}>กำหนดชำระเครดิต (Credit Terms)</label>
                                        <input type="text" name="fdaCreditTerms" placeholder="ชำระเต็มจำนวน" value={formData.fdaCreditTerms} onChange={handleFormChange} style={{ background: '#fff' }} />
                                    </div>
                                </div>
                                
                                <div style={{ marginBottom: '5px' }}>
                                    <label style={{ fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '10px' }}>ประเภทบริการ (เลือกได้มากกว่า 1)</label>
                                    
                                    <div style={{ background: '#fff', borderRadius: '8px', padding: '12px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', border: '1px solid #d1d5db' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input type="checkbox" id="fdaServiceRegister" checked={formData.fdaServiceRegister} onChange={(e) => {
                                                setFormData(prev => ({...prev, fdaServiceRegister: e.target.checked}));
                                                setTimeout(() => calculateTotal(items, formData.discountPercent, formData.vatRate, formData.shippingCost, formData.depositPercent, formData.customDepositAmount), 10);
                                            }} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }} />
                                            <label htmlFor="fdaServiceRegister" style={{ margin: 0, cursor: 'pointer', fontWeight: 'normal', fontSize: '14px', color: '#1f2937' }}>ค่าดำเนินการขึ้นทะเบียนผลิตภัณฑ์</label>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input type="number" value={formData.fdaServiceRegisterPrice} onChange={(e) => {
                                                setFormData(prev => ({...prev, fdaServiceRegisterPrice: parseFloat(e.target.value) || 0}));
                                                setTimeout(() => calculateTotal(items, formData.discountPercent, formData.vatRate, formData.shippingCost, formData.depositPercent, formData.customDepositAmount), 10);
                                            }} style={{ width: '120px', padding: '6px 10px', textAlign: 'right', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                            <span style={{ fontSize: '14px', color: '#1f2937' }}>บาท</span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ background: '#fff', borderRadius: '8px', padding: '12px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #d1d5db' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input type="checkbox" id="fdaServiceTrademark" checked={formData.fdaServiceTrademark} onChange={(e) => {
                                                setFormData(prev => ({...prev, fdaServiceTrademark: e.target.checked}));
                                                setTimeout(() => calculateTotal(items, formData.discountPercent, formData.vatRate, formData.shippingCost, formData.depositPercent, formData.customDepositAmount), 10);
                                            }} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }} />
                                            <label htmlFor="fdaServiceTrademark" style={{ margin: 0, cursor: 'pointer', fontWeight: 'normal', fontSize: '14px', color: '#1f2937' }}>ค่าดำเนินการยื่นจดเครื่องหมายการค้า</label>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input type="number" value={formData.fdaServiceTrademarkPrice} onChange={(e) => {
                                                setFormData(prev => ({...prev, fdaServiceTrademarkPrice: parseFloat(e.target.value) || 0}));
                                                setTimeout(() => calculateTotal(items, formData.discountPercent, formData.vatRate, formData.shippingCost, formData.depositPercent, formData.customDepositAmount), 10);
                                            }} style={{ width: '120px', padding: '6px 10px', textAlign: 'right', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                            <span style={{ fontSize: '14px', color: '#1f2937' }}>บาท</span>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ===== Section 3: รายการสินค้า ===== */}
                    <div className="q-section q-section--products">
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
                                <div className="product-row" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '15px', backgroundColor: 'white', position: 'relative', alignItems: 'stretch' }}>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'stretch', width: '100%' }}>
                                        {/* Image */}
                                        <div className="form-group" style={{ marginBottom: 0, width: '80px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                                            <input type="file" id={`pic_${item.id}`} accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(item.id, e)} />
                                            <label htmlFor={`pic_${item.id}`} style={{ flex: 1, border: '1px dashed #cbd5e1', borderRadius: '8px', padding: item.image ? '2px' : '8px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 'bold', minHeight: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexDirection: 'column', gap: '2px', position: 'relative' }}>
                                                {item.image ? (
                                                    <>
                                                        <img src={item.image} alt="product" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                                        <div 
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleItemChange(item.id, 'image', null);
                                                            }}
                                                            style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', lineHeight: 1, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                                                            title="ลบรูปภาพ"
                                                        >
                                                            &times;
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div style={{ lineHeight: '1.2' }}>อัพโหลดรูป<br/><span style={{fontSize: '11px', fontWeight: 'normal'}}>(คลิก)</span></div>
                                                )}
                                            </label>
                                        </div>

                                        {/* Name & Promos */}
                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div className="form-group product-input" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                                <input 
                                                    type="text" 
                                                    placeholder="คลิกหรือพิมพ์เพื่อเลือกสินค้า" 
                                                    value={item.name} 
                                                    onChange={(e) => {
                                                        handleItemChange(item.id, 'name', e.target.value);
                                                        handleItemChange(item.id, 'showDropdown', true);
                                                        handleItemChange(item.id, 'forceShowAll', false);
                                                    }} 
                                                    onFocus={() => handleItemChange(item.id, 'showDropdown', true)}
                                                    onBlur={() => setTimeout(() => {
                                                        handleItemChange(item.id, 'showDropdown', false);
                                                        handleItemChange(item.id, 'forceShowAll', false);
                                                    }, 200)}
                                                    required 
                                                    style={{ width: '100%', paddingRight: '30px' }}
                                                />
                                                <div 
                                                    style={{ position: 'absolute', right: '10px', top: '20px', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); // Prevent input from losing focus
                                                        e.stopPropagation();
                                                        const willShow = !item.showDropdown || !item.forceShowAll;
                                                        handleItemChange(item.id, 'showDropdown', willShow);
                                                        handleItemChange(item.id, 'forceShowAll', willShow);
                                                    }}
                                                >
                                                    ▼
                                                </div>
                                                
                                                {item.showDropdown && (
                                                    <div style={{ position: 'absolute', top: '42px', left: 0, width: '100%', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 50, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                                        {[...Object.keys(PRODUCT_CATALOG), ...customProducts.map(p => p.name)]
                                                            .filter(pName => item.forceShowAll || PRODUCT_CATALOG[item.name] || customProducts.some(p => p.name === item.name) || pName.toLowerCase().includes((item.name || '').toLowerCase()))
                                                            .map(pName => (
                                                                <div 
                                                                    key={pName} 
                                                                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                                                >
                                                                    <div
                                                                        onClick={() => {
                                                                            handleItemChange(item.id, 'name', pName);
                                                                            handleItemChange(item.id, 'showDropdown', false);
                                                                            handleItemChange(item.id, 'forceShowAll', false);
                                                                        }}
                                                                        style={{ padding: '8px 12px', fontSize: '14px', color: '#334155', flex: 1 }}
                                                                    >
                                                                        {pName}
                                                                    </div>
                                                                    {customProducts.some(p => p.name === pName) && (
                                                                        <div
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                const confirm = await showConfirm('ยืนยันการลบ', `ต้องการลบสินค้า "${pName}" ออกจากรายการใช่หรือไม่?`);
                                                                                if (confirm) {
                                                                                    const newCustom = customProducts.filter(p => p.name !== pName);
                                                                                    setCustomProducts(newCustom);
                                                                                    localStorage.setItem('customProducts', JSON.stringify(newCustom));
                                                                                    setItems(prev => prev.map(row => {
                                                                                        if (row.name === pName) {
                                                                                            return { ...row, name: '', image: null, basePromoName: '', promoType: '', isPromo: false, price: '', manualTotal: undefined };
                                                                                        }
                                                                                        return row;
                                                                                    }));
                                                                                }
                                                                            }}
                                                                            style={{ padding: '8px 12px', color: '#ef4444', fontSize: '16px', lineHeight: 1 }}
                                                                            title="ลบสินค้านี้"
                                                                        >
                                                                            &times;
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        }
                                                        {[...Object.keys(PRODUCT_CATALOG), ...customProducts.map(p => p.name)].filter(pName => !(item.forceShowAll || PRODUCT_CATALOG[item.name] || customProducts.some(p => p.name === item.name) || pName.toLowerCase().includes((item.name || '').toLowerCase()))).length === [...Object.keys(PRODUCT_CATALOG), ...customProducts].length && (
                                                            <div style={{ padding: '8px 12px', fontSize: '14px', color: '#94a3b8', textAlign: 'center', backgroundColor: '#f8fafc' }}>ไม่พบรายการสินค้า</div>
                                                        )}
                                                        <div 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleItemChange(item.id, 'showDropdown', false);
                                                                handleItemChange(item.id, 'forceShowAll', false);
                                                                setAddProductModal({ visible: true, targetItemId: item.id, name: '', image: null });
                                                            }}
                                                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#f59e0b', backgroundColor: '#fffbeb', fontWeight: 'bold', borderTop: '1px solid #fde68a', textAlign: 'center' }}
                                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#fef3c7'}
                                                            onMouseLeave={(e) => e.target.style.backgroundColor = '#fffbeb'}
                                                        >
                                                            + เพิ่มสินค้าใหม่
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {(() => {
                                                const baseName = item.basePromoName || item.name;
                                                return PRODUCT_CATALOG[baseName] && PRODUCT_CATALOG[baseName].promo && !(formData.docType && formData.docType.includes('fda')) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#d35400', flexWrap: 'wrap' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                            <input type="checkbox" checked={item.promoType === 'old' || (item.isPromo && item.promoType !== 'new')} onChange={(e) => handleItemChange(item.id, 'promoType', e.target.checked ? 'old' : '')} style={{ width: '16px', height: '16px', cursor: 'pointer', padding: 0, margin: 0 }} />
                                                            โปรเดิม 1000
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px' }}>
                                                            <input type="checkbox" checked={item.promoType === 'new'} onChange={(e) => handleItemChange(item.id, 'promoType', e.target.checked ? 'new' : '')} style={{ width: '16px', height: '16px', cursor: 'pointer', padding: 0, margin: 0 }} />
                                                            โปรใหม่ 1000
                                                        </label>
                                                        
                                                        {(item.promoType || item.isPromo) && (
                                                            <CustomSelect value={item.promoMultiplier} onChange={(e) => handleItemChange(item.id, 'promoMultiplier', e.target.value)} style={{ padding: '2px 5px', borderRadius: '4px', border: '1px solid #ffb74d', color: '#d35400', width: 'auto' }}>
                                                                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                                                    <option key={n} value={n}>{n} โปร</option>
                                                                ))}
                                                            </CustomSelect>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        {/* Delete Button (FDA only) */}
                                        {formData.docType && formData.docType.includes('fda') && (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <button type="button" className="remove-product-btn" onClick={() => removeItem(item.id)} title="ลบรายการนี้" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Qty, Price, Total, Delete (Non-FDA) */}
                                    {!(formData.docType && formData.docType.includes('fda')) && (
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '12px 15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <>
                                        <div style={{ flex: '1 1 120px' }}>
                                            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 500 }}>จำนวน</label>
                                            <div className="qty-group" style={{ margin: 0 }}>
                                                <input type="number" className="product-qty" placeholder="0" min="1" value={item.qty} onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)} required readOnly={!!(item.isPromo || item.promoType)} style={{ backgroundColor: (item.isPromo || item.promoType) ? '#f1f5f9' : 'white', flex: 1, minWidth: '60px', paddingRight: '8px' }} />
                                                <div 
                                                    style={{ position: 'relative', flexShrink: 0 }}
                                                    onBlur={(e) => {
                                                        const currentTarget = e.currentTarget;
                                                        setTimeout(() => {
                                                            if (!currentTarget.contains(document.activeElement)) {
                                                                handleItemChange(item.id, 'showUnitDropdown', false);
                                                            }
                                                        }, 200);
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingLeft: '8px', borderLeft: '1px solid #cbd5e1' }}>
                                                        <input
                                                            type="text"
                                                            value={item.unit || ''}
                                                            placeholder="ชิ้น"
                                                            onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                                                            onClick={() => handleItemChange(item.id, 'showUnitDropdown', true)}
                                                            onFocus={() => handleItemChange(item.id, 'showUnitDropdown', true)}
                                                            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', fontFamily: 'inherit', color: 'var(--text-muted, #94a3b8)', width: '35px', textAlign: 'right', padding: 0 }}
                                                        />
                                                        <span onClick={() => handleItemChange(item.id, 'showUnitDropdown', !item.showUnitDropdown)} style={{ fontSize: '10px', opacity: 0.7, cursor: 'pointer', padding: '0 4px', color: 'var(--text-muted, #94a3b8)' }}>▼</span>
                                                    </div>

                                                    {item.showUnitDropdown && (
                                                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 100, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', width: '120px', textAlign: 'left' }}>
                                                            {[...DEFAULT_UNITS, ...customUnits].map(unit => (
                                                                <div 
                                                                    key={unit} 
                                                                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', backgroundColor: item.unit === unit || (!item.unit && unit === 'ชิ้น') ? '#f1f5f9' : 'white', borderBottom: '1px solid #f8fafc' }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = item.unit === unit || (!item.unit && unit === 'ชิ้น') ? '#f1f5f9' : 'white'}
                                                                >
                                                                    <div
                                                                        onClick={() => {
                                                                            handleItemChange(item.id, 'unit', unit);
                                                                            handleItemChange(item.id, 'showUnitDropdown', false);
                                                                        }}
                                                                        style={{ padding: '8px 12px', fontSize: '13px', color: '#334155', fontWeight: item.unit === unit || (!item.unit && unit === 'ชิ้น') ? 'bold' : 'normal', flex: 1 }}
                                                                    >
                                                                        {unit}
                                                                    </div>
                                                                    {customUnits.includes(unit) && (
                                                                        <div
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                const confirm = await showConfirm('ยืนยันการลบ', `ต้องการลบหน่วย "${unit}" ออกจากรายการใช่หรือไม่?`);
                                                                                if (confirm) {
                                                                                    const newCustom = customUnits.filter(u => u !== unit);
                                                                                    setCustomUnits(newCustom);
                                                                                    localStorage.setItem('customUnits', JSON.stringify(newCustom));
                                                                                    if (item.unit === unit) {
                                                                                        handleItemChange(item.id, 'unit', 'ชิ้น'); // Reset to default if deleted unit is selected
                                                                                    }
                                                                                }
                                                                            }}
                                                                            style={{ padding: '8px 12px', color: '#ef4444', fontSize: '16px', lineHeight: 1 }}
                                                                            title="ลบหน่วยนี้"
                                                                        >
                                                                            &times;
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            <div 
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    handleItemChange(item.id, 'showUnitDropdown', false);
                                                                    const val = await showPrompt('เพิ่มหน่วยใหม่', 'ระบุหน่วยใหม่ที่ต้องการเพิ่ม:');
                                                                    if (val && val.trim() && !DEFAULT_UNITS.includes(val.trim()) && !customUnits.includes(val.trim())) {
                                                                        const newCustom = [...customUnits, val.trim()];
                                                                        setCustomUnits(newCustom);
                                                                        localStorage.setItem('customUnits', JSON.stringify(newCustom));
                                                                        handleItemChange(item.id, 'unit', val.trim());
                                                                    }
                                                                }}
                                                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#f59e0b', backgroundColor: '#fffbeb', fontWeight: 'bold', borderTop: '1px solid #fde68a', textAlign: 'center' }}
                                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#fef3c7'}
                                                                onMouseLeave={(e) => e.target.style.backgroundColor = '#fffbeb'}
                                                            >
                                                                + เพิ่มหน่วยใหม่
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div style={{ flex: '1 1 120px' }}>
                                            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 500 }}>ราคา/หน่วย</label>
                                            <div className="price-group" style={{ margin: 0 }}>
                                                <input type="number" className="product-price" placeholder="0.00" min="0" step="0.01" value={item.price} onChange={(e) => handleItemChange(item.id, 'price', e.target.value)} required readOnly={!!(item.isPromo || item.promoType)} style={{ backgroundColor: (item.isPromo || item.promoType) ? '#f1f5f9' : 'white', flex: 1, minWidth: '40px' }} />
                                                <span className="qty-label">บาท</span>
                                            </div>
                                        </div>

                                        <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                                            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 500 }}>รวมเป็นเงิน</label>
                                            <div className="row-amount" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                                                {item.isEditingTotal ? (
                                                    <input 
                                                        type="text"
                                                        inputMode="decimal"
                                                        autoFocus
                                                        style={{ 
                                                            fontSize: '16px', 
                                                            fontWeight: 'bold', 
                                                            border: 'none', 
                                                            background: 'transparent', 
                                                            textAlign: 'right', 
                                                            width: '100px', 
                                                            outline: 'none',
                                                            color: '#4338ca',
                                                            padding: '0 4px',
                                                            cursor: 'text'
                                                        }}
                                                        onBlur={() => handleItemChange(item.id, 'isEditingTotal', false)}
                                                        value={item.manualTotal !== undefined ? item.manualTotal : ((item.isPromo || item.promoType) ? (1000 * (parseInt(item.promoMultiplier) || 1)) : ((parseFloat(item.qty)||0)*(parseFloat(item.price)||0))).toFixed(2)}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            handleItemChange(item.id, 'manualTotal', val);
                                                        }}
                                                    />
                                                ) : (
                                                    <span 
                                                        style={{ 
                                                            fontSize: '16px', 
                                                            fontWeight: 'bold', 
                                                            cursor: 'pointer', 
                                                            padding: '0 4px', 
                                                            border: '1px solid transparent',
                                                            borderRadius: '4px',
                                                            transition: 'background 0.2s',
                                                            minWidth: '80px',
                                                            display: 'inline-block',
                                                            textAlign: 'right'
                                                        }} 
                                                        onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                        onClick={() => handleItemChange(item.id, 'isEditingTotal', true)}
                                                        title="คลิกเพื่อแก้ไขยอดเงิน"
                                                    >
                                                        {item.manualTotal !== undefined 
                                                            ? parseFloat(item.manualTotal || 0).toLocaleString('th-TH', {minimumFractionDigits: 2})
                                                            : ((item.isPromo || item.promoType) 
                                                                ? (1000 * (parseInt(item.promoMultiplier) || 1)) 
                                                                : ((parseFloat(item.qty)||0)*(parseFloat(item.price)||0))
                                                            ).toLocaleString('th-TH', {minimumFractionDigits: 2})
                                                        }
                                                    </span>
                                                )}
                                                &nbsp;<span style={{ fontSize: '12px', color: '#64748b' }}>บาท</span>
                                            </div>
                                        </div>
                                        </>
                                        

                                        <div style={{ paddingLeft: '15px', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                                            <button type="button" className="remove-product-btn" onClick={() => removeItem(item.id)} title="ลบรายการนี้" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button type="button" className="add-product-btn" onClick={addItem}>
                        <Plus size={14} /> เพิ่มรายการสินค้า
                    </button>
                    </div>{/* end q-section 3 */}

                    {/* ===== Section 5: ตั้งค่าเอกสาร ===== */}
                    <div className="q-section q-section--settings">
                        <div className="q-section-header">
                            <div className="q-section-icon"><span style={{ fontSize: '16px' }}>⚙️</span></div>
                            <div>
                                <div className="q-section-title">ตั้งค่าเอกสาร</div>
                                <div className="q-section-desc">ลายเซ็น เงื่อนไขมัดจำ และหมายเหตุท้ายเอกสาร</div>
                            </div>
                        </div>
                        <div className="form-group" style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                            <label>ภาษาที่ใช้พิมพ์ (Print Language) <span className="required">*</span></label>
                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '14px' }}>
                                    <input type="radio" name="printLanguage" value="TH" checked={formData.printLanguage === 'TH'} onChange={handleFormChange} style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }} />
                                    🇹🇭 ภาษาไทย
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '14px' }}>
                                    <input type="radio" name="printLanguage" value="EN" checked={formData.printLanguage === 'EN'} onChange={handleFormChange} style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }} />
                                    🇬🇧 English (เฉพาะใบวางบิล/ใบแจ้งหนี้)
                                </label>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>ผู้เสนอราคา / ผู้วางบิล (ลายเซ็น)</label>
                                <CustomSelect name="signer" value={formData.signer} onChange={handleFormChange}>
                                    <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
                                            {availableSignatures.map(sig => (
                                                <option key={sig.KeyName} value={sig.KeyName}>{sig.FullName}</option>
                                            ))}
                                        </CustomSelect>
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
                                    <CustomSelect name="depositPercent" value={formData.depositPercent} onChange={handleFormChange} style={{ flex: 1 }}>
                                        <option value="0">-- ไม่มีมัดจำ --</option>
                                        <option value="30">มัดจำ 30%</option>
                                        <option value="40">มัดจำ 40%</option>
                                        <option value="50">มัดจำ 50%</option>
                                        <option value="custom">ระบุเอง</option>
                                    </CustomSelect>
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

                        </div>
                        
                        <div className="q-sidebar">
                    {/* ===== Section 4: สรุปยอดเงิน ===== */}
                    <div className="payment-summary">
                        <h3>💰 สรุปยอดเงิน</h3>
                        
                        {/* Sub Total */}
                        <div className="payment-row">
                            <span className="label">รวมราคา / Sub Total</span>
                            <span className="value">{subTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                        </div>

                        {/* Discount */}
                        {!isFda && (
                            <div className="payment-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="label">ส่วนลด / Discount</span>
                                    <CustomSelect name="discountPercent" value={formData.discountPercent} onChange={handleFormChange} style={{ width: '60px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px', fontSize: '13px', background: '#fff' }}>
                                        {[...Array(101)].map((_, i) => <option key={i} value={i}>{i}%</option>)}
                                    </CustomSelect>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#666', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                                        <input type="checkbox" name="showDiscountInPrint" checked={formData.showDiscountInPrint} onChange={handleFormChange} style={{ width: '13px', height: '13px', margin: 0 }} />
                                        แสดงในบิล
                                    </label>
                                </div>
                                <span className="value" style={{ color: '#ef4444' }}>{discountAmount > 0 ? '-' : ''}{discountAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                            </div>
                        )}

                        {/* After Discount (show only when discount is checked) */}
                        {!isFda && formData.showDiscountInPrint && (
                            <div className="payment-row">
                                <span className="label">คงเหลือ / Balance</span>
                                <span className="value">{afterDiscount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                            </div>
                        )}

                        {/* VAT */}
                        <div className="payment-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="label">ภาษีมูลค่าเพิ่ม (VAT)</span>
                                <CustomSelect name="vatRate" value={isFda ? '7' : formData.vatRate} onChange={handleFormChange} disabled={isFda} style={{ width: '60px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px', fontSize: '13px', background: isFda ? '#f1f5f9' : '#fff', cursor: isFda ? 'not-allowed' : 'pointer' }}>
                                    <option value="0">0%</option>
                                    <option value="7">7%</option>
                                </CustomSelect>
                                {!isFda && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#666', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                                        <input type="checkbox" name="showVatInPrint" checked={formData.showVatInPrint} onChange={handleFormChange} style={{ width: '13px', height: '13px', margin: 0, cursor: 'pointer' }} />
                                        แสดงในบิล
                                    </label>
                                )}
                            </div>
                            <span className="value">{vatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                        </div>

                        {/* Design Fee */}
                        {!isFda && (
                            <div className="payment-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="label">ค่าออกแบบ / Design Fee</span>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#666', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                                        <input type="checkbox" name="showDesignFeeInPrint" checked={formData.showDesignFeeInPrint} onChange={handleFormChange} style={{ width: '13px', height: '13px', margin: 0 }} />
                                        แสดงในบิล
                                    </label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input type="number" name="designFee" value={formData.designFee} onChange={handleFormChange} style={{ width: '80px', textAlign: 'right', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', fontSize: '13px', background: '#fff' }} min="0" />
                                    <span className="value" style={{ fontWeight: 'normal' }}>บาท</span>
                                </div>
                            </div>
                        )}

                        {/* Shipping */}
                        {!isFda && (
                            <div className="payment-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="label">ค่าจัดส่ง / Shipping</span>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#666', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                                        <input type="checkbox" name="showShippingInPrint" checked={formData.showShippingInPrint} onChange={handleFormChange} style={{ width: '13px', height: '13px', margin: 0 }} />
                                        แสดงในบิล
                                    </label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input type="number" name="shippingCost" value={formData.shippingCost} onChange={handleFormChange} style={{ width: '80px', textAlign: 'right', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', fontSize: '13px', background: '#fff' }} min="0" />
                                    <span className="value" style={{ fontWeight: 'normal' }}>บาท</span>
                                </div>
                            </div>
                        )}

                        {/* Grand Total */}
                        <div className="grand-total-highlight">
                            <span className="gt-label">ยอดเงินสุทธิ / Grand Total</span>
                            <span className="gt-value">{grandTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                        </div>

                        {/* Deposit */}
                        {!isFda && depositAmount > 0 && (
                            <>
                                <div className="payment-row" style={{ borderTop: '1px dashed #ffb74d', marginTop: '10px' }}>
                                    <span className="label">ยอดชำระมัดจำ {formData.depositPercent !== 'custom' && formData.depositPercent !== '0' ? `(${formData.depositPercent}%)` : ''}</span>
                                    <span className="value" style={{ color: '#f59e0b' }}>{depositAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                                </div>
                                <div className="payment-row" style={{ borderBottom: 'none' }}>
                                    <span className="label">ยอดคงเหลือที่ต้องชำระ</span>
                                    <span className="value" style={{ color: '#10b981' }}>{remainingAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ===== Action Buttons ===== */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="print-btn" type="button" onClick={handlePrint}>
                            <Printer size={18} /> พิมพ์บิล
                        </button>
                        <button type="submit" className="submit-btn" disabled={status === 'saving'} style={status === 'error' ? {background: '#ef4444', boxShadow: 'none'} : {}}>
                            {status === 'saving' ? 'กำลังบันทึก...' : status === 'error' ? 'บันทึกไม่สำเร็จ (ลองใหม่)' : <><Save size={18} /> บันทึกข้อมูล</>}
                        </button>
                    </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Print Container (Hidden on screen, Visible on print via CSS) */}
            <div id="q-print-container">
                {isFda ? (
                    <div style={{ padding: '20px', fontFamily: "'Sarabun', sans-serif" }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ width: '25%', textAlign: 'center' }}>
                                <img src={compLogo} style={{ maxWidth: '180px', maxHeight: '130px', objectFit: 'contain' }} alt="Logo" />
                            </div>
                            <div style={{ width: '75%', textAlign: 'center' }}>
                                <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#1a7a3a' }}>{compNameTH}</div>
                                <div style={{ fontSize: '10pt', marginTop: '5px' }}>ที่อยู่ {compAddr1}</div>
                                <div style={{ fontSize: '10pt' }}>{compTax}</div>
                            </div>
                        </div>

                        {/* Title & Info Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '11pt', marginBottom: '-1px' }}>
                            <tbody>
                                <tr>
                                    <td rowSpan="4" style={{ width: '60%', textAlign: 'center', fontWeight: 'bold', fontSize: '16pt', border: '1px solid black', backgroundColor: '#ffffff', verticalAlign: 'middle' }}>
                                        ใบวางบิล/ใบแจ้งหนี้
                                    </td>
                                    <td style={{ width: '40%', border: '1px solid black', padding: '4px 8px', whiteSpace: 'nowrap' }}>
                                        <span>หมายเลขเอกสาร:</span> {formData.billNo || '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid black', padding: '4px 8px', whiteSpace: 'nowrap' }}>
                                        <span>รหัสลูกค้า:</span> {customerList.find(c => String(c.CustomerID) === String(formData.customerId))?.CustomerCode || '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid black', padding: '4px 8px', whiteSpace: 'nowrap' }}>
                                        <span>วันที่:</span> {formatDate(formData.billDate)}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid black', padding: '4px 8px', whiteSpace: 'nowrap' }}>
                                        <span>กำหนดชำระเครดิต/ Credit:</span> <span style={{ fontSize: '9pt', color: 'red' }}>ชำระเต็มจำนวน</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Customer Info Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '11pt', marginBottom: '-1px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '60%', border: '1px solid black', padding: '4px 8px', borderBottom: 'none' }}>
                                        <span style={{ fontWeight: 'bold' }}>ชื่อบริษัท/ลูกค้า :</span> {formData.customerName || '-'}
                                    </td>
                                    <td style={{ width: '40%', border: '1px solid black', padding: '4px 8px' }}>
                                        <span style={{ fontWeight: 'bold' }}>โทรศัพท์ :</span> {formData.phone || '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid black', padding: '4px 8px', borderTop: 'none', borderBottom: 'none' }}>
                                        <span style={{ fontWeight: 'bold' }}>ที่อยู่ติดต่อ :</span> {formData.address || '-'}
                                    </td>
                                    <td style={{ border: '1px solid black', padding: '4px 8px' }}>
                                        <span style={{ fontWeight: 'bold' }}>E-mail :</span> {formData.email || '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid black', padding: '4px 8px', borderTop: 'none' }}>
                                        <span style={{ fontWeight: 'bold' }}>เลขประจำตัวผู้เสียภาษี :</span> {formData.taxId || '-'}
                                    </td>
                                    <td style={{ border: '1px solid black', padding: '4px 8px' }}>
                                        <span style={{ fontWeight: 'bold' }}>โครงการ :</span> <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>ขึ้นทะเบียนตำรับยา (G)</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Items Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '11pt', marginBottom: '-1px', tableLayout: 'fixed' }}>
                            <colgroup>
                                <col style={{ width: '8%' }} />
                                <col style={{ width: '27%' }} />
                                <col style={{ width: '25%' }} />
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '25%' }} />
                            </colgroup>
                            <thead>
                                <tr style={{ backgroundColor: '#e0e0e0' }}>
                                    <th colSpan="5" style={{ border: '1px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                                        ขั้นตอนการดำเนินงานขึ้นทะเบียนตำรับ อย.(G)ในการสั่งผลิต {validProductCount} ผลิตภัณฑ์
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Service fee rows */}
                                {formData.fdaServiceRegister && (
                                    <tr>
                                        <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', width: '5%' }}>1</td>
                                        <td colSpan="2" style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center' }}>
                                            ค่าดำเนินการขึ้นทะเบียนผลิตภัณฑ์
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', width: '15%' }}>
                                            {validProductCount}
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'right', width: '25%' }}>
                                            {formatMoney((parseFloat(formData.fdaServiceRegisterPrice) || 0) * validProductCount)}
                                        </td>
                                    </tr>
                                )}
                                {formData.fdaServiceTrademark && (
                                    <tr>
                                        <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', width: '5%' }}>{formData.fdaServiceRegister ? '2' : '1'}</td>
                                        <td colSpan="2" style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center' }}>
                                            ค่าดำเนินการจดเครื่องหมายการค้า
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', width: '15%' }}>
                                            {validProductCount}
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'right', width: '25%' }}>
                                            {formatMoney((parseFloat(formData.fdaServiceTrademarkPrice) || 0) * validProductCount)}
                                        </td>
                                    </tr>
                                )}
                                
                                <tr style={{ backgroundColor: '#e0e0e0' }}>
                                    <td colSpan="5" style={{ border: '1px solid black', padding: '4px 8px', fontWeight: 'bold', textAlign: 'center' }}>ผลิตภัณฑ์</td>
                                </tr>

                                {/* Product rows */}
                                {items.filter(item => item.name && item.name.trim() !== '').map((item, index) => (
                                    <tr key={index}>
                                        <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center' }}>{index + 1}</td>
                                        <td colSpan="2" style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                                            {item.name}
                                        </td>
                                        <td colSpan="2" style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center' }}>
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Footer Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '10pt', tableLayout: 'fixed' }}>
                            <tbody>
                                <tr>
                                    <td rowSpan="3" style={{ width: '60%', border: '1px solid black', padding: '8px', verticalAlign: 'top' }}>
                                        <div style={{ color: 'red', fontSize: '10pt', fontWeight: 'bold' }}>ช่องทางการชำระเงิน :</div>
                                        <div style={{ border: '2px dashed black', borderRadius: '10px', padding: '15px 10px 15px 30px', width: '90%', margin: '10px auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '15px' }}>
                                            {(() => {
                                                try {
                                                    const customBank = JSON.parse(formData.billStatus);
                                                    return (
                                                        <>
                                                            {customBank.logo && (
                                                                <img src={customBank.logo} style={{ width: '65px', maxHeight: '65px', objectFit: 'contain', flexShrink: 0 }} alt="bank logo" />
                                                            )}
                                                            <div style={{ textAlign: 'left', fontWeight: 'bold', lineHeight: 1.2 }}>
                                                                <span style={{ fontSize: '14pt' }}>{customBank.bankName}</span><br/>
                                                                <span style={{ fontSize: '11pt' }}>{customBank.accountName}</span><br/>
                                                                <span className="print-color-blue" style={{ fontSize: '18pt', color: '#2980b9' }}>{customBank.accountNo}</span>
                                                            </div>
                                                        </>
                                                    );
                                                } catch {
                                                    return (
                                                        <>
                                                            {formData.billStatus === 'ktb' && (
                                                                <img src="/images/banks/bank-ktb.png" style={{ width: '65px', maxHeight: '65px', objectFit: 'contain', flexShrink: 0 }} alt="ktb" />
                                                            )}
                                                            {formData.billStatus === 'scb' && (
                                                                <img src="/images/banks/bank-scb.png" style={{ width: '65px', maxHeight: '65px', objectFit: 'contain', flexShrink: 0 }} alt="scb" />
                                                            )}
                                                            {formData.billStatus.includes('kbank') && (
                                                                <img src="/images/banks/bank-kbank.png" style={{ width: '65px', maxHeight: '65px', objectFit: 'contain', flexShrink: 0 }} alt="kbank" />
                                                            )}
                                                            <div style={{ textAlign: 'left', fontWeight: 'bold', lineHeight: 1.2 }}>
                                                                <span style={{ fontSize: '14pt' }}>
                                                                    {formData.billStatus === 'ktb' ? 'ธนาคารกรุงไทย' : 
                                                                     formData.billStatus === 'scb' ? 'ธนาคารไทยพาณิชย์' : 
                                                                     'ธนาคารกสิกรไทย'}
                                                                </span><br/>
                                                                <span style={{ fontSize: '11pt' }}>
                                                                    {formData.billStatus === 'ktb' ? 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์' : 
                                                                     formData.billStatus === 'kbank' ? 'บจก. พรีเมียร์ สมาร์ท ฟาร์ม' :
                                                                     formData.billStatus === 'kbank_charan' ? 'นาย จรัญ วาสิกสูตร' : 'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด'}
                                                                </span><br/>
                                                                <span className={formData.billStatus.includes('kbank') ? 'print-color-green' : 'print-color-blue'} style={{ fontSize: '18pt', color: formData.billStatus.includes('kbank') ? '#138f2d' : '#2980b9' }}>
                                                                    {formData.billStatus === 'ktb' ? '016-074-4237' : 
                                                                     formData.billStatus === 'scb' ? '000-0-00000-0' : 
                                                                     formData.billStatus === 'kbank_charan' ? '235-1-19734-2' : '201-3-35956-6'}
                                                                </span>
                                                            </div>
                                                        </>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </td>
                                    <td style={{ width: '25%', border: '1px solid black', padding: '4px 8px', fontWeight: 'bold' }}>ราคารวม</td>
                                    <td style={{ width: '15%', border: '1px solid black', padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                                        {formatMoney(subTotal)}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid black', padding: '4px 8px', fontWeight: 'bold' }}>ภาษีมูลค่าเพิ่ม/Vat 7%</td>
                                    <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                                        {formatMoney(vatAmount)}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid black', padding: '4px 8px', fontWeight: 'bold', backgroundColor: '#e6e6e6' }}>ราคารวมทั้งหมด<br/><span style={{ fontSize: '9pt', fontWeight: 'normal' }}>GRAND TOTAL</span></td>
                                    <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', backgroundColor: '#e6e6e6', textDecoration: 'underline' }}>
                                        {formatMoney(grandTotal)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* เงื่อนไข + หมายเหตุ */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginTop: '-1px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ border: '1px solid black', padding: '8px', verticalAlign: 'top' }}>
                                        <div className="print-notes-container" dangerouslySetInnerHTML={{ __html: formData.notes }} />
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Signatures */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginTop: '-1px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ border: '1px solid black', padding: '10px 5px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: '15px', marginBottom: '5px', padding: '0 5px' }}>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ height: '50px' }}></div>
                                                    <div>_________________</div>
                                                    <div style={{ marginTop: '3px', fontWeight: 'bold', fontSize: '9pt' }}>ผู้สั่งซื้อสินค้า</div>
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ height: '50px' }}></div>
                                                    <div>___________</div>
                                                    <div style={{ marginTop: '3px', fontWeight: 'bold', fontSize: '9pt' }}>ว/ด/ป</div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ height: '50px', position: 'relative' }}>
                                                    {selectedSignature && (
                                                        <img src={getSignatureUrl(selectedSignature.ImagePath)} style={{ maxHeight: '50px', position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', zIndex: 1 }} alt="signature" onError={(e) => { e.target.onerror = null; e.target.src = selectedSignature.ImagePath; }} />
                                                    )}
                                                </div>
                                                <div style={{ position: 'relative', zIndex: 0 }}>_______________</div>
                                                <div style={{ marginTop: '3px', fontWeight: 'bold', fontSize: '9pt' }}>ผู้เสนอราคา</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ height: '50px', position: 'relative' }}>
                                                    {formData.signer === 'thawat' && (
                                                        <img src="/images/signatures/sign-approver.png" style={{ maxHeight: '50px', position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', zIndex: 1 }} alt="approver signature" />
                                                    )}
                                                </div>
                                                <div style={{ position: 'relative', zIndex: 0 }}>_______________</div>
                                                <div style={{ marginTop: '3px', fontWeight: 'bold', fontSize: '9pt' }}>ผู้อนุมัติเสนอราคา</div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : (
                <>
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
                                                {isFda && <div style={{ color: 'red', fontSize: '11pt', fontWeight: 'bold' }}>{isEn ? '** For FDA Billing Invoice Only **' : '** ข้อมูลเฉพาะใบวางบิล/ใบแจ้งหนี้ อย. (FDA) **'}</div>}
                                                <div style={{ fontSize: '14pt', fontWeight: 'bold' }}>{isEn ? 'Billing Note/Invoice' : 'ใบวางบิล/ใบแจ้งหนี้'}</div>
                                                {!isEn && <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>Billing Note/Invoice</div>}
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
                                <span style={{ fontWeight: 'bold' }}>{isEn ? 'Customer Name :' : 'ชื่อลูกค้า :'}</span>
                            </td>
                            <td style={{ width: '35%', borderRight: '1px solid black', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'normal' }}>{formData.customerName || '-'}</span>
                            </td>
                            <td style={{ width: '40%', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'bold' }}>{isEn ? 'No.' : 'เลขที่/No.'}</span> <span style={{ marginLeft: '5px', fontWeight: 'normal' }}>{formData.billNo || '-'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'bold' }}>{isEn ? 'Address :' : 'ที่อยู่ :'}</span>
                            </td>
                            <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'normal' }}>{formData.address || '-'}</span>
                            </td>
                            <td style={{ borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'bold' }}>{isEn ? 'Date :' : 'วันที่/Date :'}</span> <span style={{ marginLeft: '5px', fontWeight: 'normal' }}>{formatDate(formData.billDate)}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'bold' }}>{isEn ? 'Tel :' : 'โทร :'}</span>
                            </td>
                            <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'normal' }}>{formData.phone || '-'}</span>
                            </td>
                            <td style={{ borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}></td>
                        </tr>
                        <tr>
                            <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'bold' }}>{isEn ? 'Tax ID :' : 'เลขประจำตัวผู้เสียภาษี :'}</span>
                            </td>
                            <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 'normal' }}>{formData.taxId || '-'}</span>
                            </td>
                            <td style={{ borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}></td>
                        </tr>
                        {isFda && (
                            <>
                                <tr>
                                    <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                        <span style={{ fontWeight: 'bold' }}>รหัสลูกค้า<br/>(Customer ID) :</span>
                                    </td>
                                    <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                        <span style={{ fontWeight: 'normal' }}>{formData.fdaCustomerCode || '-'}</span>
                                    </td>
                                    <td style={{ borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                        <span style={{ fontWeight: 'bold' }}>อีเมล (E-mail) :</span> <span style={{ marginLeft: '5px', fontWeight: 'normal' }}>{formData.fdaEmail || '-'}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                        <span style={{ fontWeight: 'bold' }}>ชื่อโครงการ<br/>(Project Name) :</span>
                                    </td>
                                    <td style={{ borderRight: '1px solid black', borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                        <span style={{ fontWeight: 'normal' }}>{formData.fdaProjectName || '-'}</span>
                                    </td>
                                    <td style={{ borderTop: 'none', padding: '2px 8px', verticalAlign: 'top' }}>
                                        <span style={{ fontWeight: 'bold' }}>เงื่อนไขชำระเงิน<br/>(Credit Term) :</span> <span style={{ marginLeft: '5px', fontWeight: 'normal' }}>{formData.fdaCreditTerms || '-'}</span>
                                    </td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>

                <table className="print-products-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', borderTop: 'none' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '10%', border: '1px solid black', borderTop: 'none', padding: '4px 2px' }}>{isEn ? 'Item' : 'ลำดับ'}<br/>{isEn ? '' : 'No'}</th>
                            <th style={{ width: '15%', border: '1px solid black', borderTop: 'none', padding: '4px 2px' }}>{isEn ? 'Picture' : 'รูปสินค้า'}<br/>{isEn ? '' : 'Picture'}</th>
                            <th style={{ width: isFda ? '75%' : '35%', border: '1px solid black', borderTop: 'none', padding: '4px 2px' }}>{isEn ? 'Description' : 'รายละเอียด'}<br/>{isEn ? '' : 'Description'}</th>
                            {!isFda && (
                                <>
                                    <th style={{ width: '12%', border: '1px solid black', borderTop: 'none', padding: '4px 2px' }}>{isEn ? 'Quantity' : 'จำนวน'}<br/>{isEn ? '' : 'Quantity'}</th>
                                    <th style={{ width: '14%', border: '1px solid black', borderTop: 'none', padding: '4px 2px' }}>{isEn ? 'Unit Price' : 'ราคา / ชิ้น'}<br/>{isEn ? '' : 'Price'}</th>
                                    <th style={{ width: '14%', border: '1px solid black', borderTop: 'none', padding: '4px 2px' }}>{isEn ? 'Amount' : 'จำนวนเงิน'}<br/>{isEn ? '' : 'Amount'}</th>
                                </>
                            )}
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
                                {!isFda && (
                                    <>
                                        <td style={{ border: '1px solid black', textAlign: 'center', padding: '2px 4px' }}>{item.qty ? `${Number(item.qty).toLocaleString('th-TH')} ${item.unit || 'ชิ้น'}` : ''}</td>
                                        <td style={{ border: '1px solid black', textAlign: 'right', padding: '2px 8px' }}>{(parseFloat(item.price)||0).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                                        <td style={{ border: '1px solid black', textAlign: 'right', padding: '2px 8px' }}>{
                                            ((item.isPromo || item.promoType) 
                                                ? (1000 * (parseInt(item.promoMultiplier) || 1)) 
                                                : ((parseFloat(item.qty)||0)*(parseFloat(item.price)||0))
                                            ).toLocaleString('th-TH', {minimumFractionDigits: 2})
                                        }</td>
                                    </>
                                )}
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
                                ((isFda || formData.showVatInPrint) && vatAmount > 0 ? 1 : 0) +
                                (formData.showShippingInPrint && shipping > 0 ? 1 : 0) + 
                                (formData.showDesignFeeInPrint && designFee > 0 ? 1 : 0) + 
                                (formData.showDepositInPrint && depositAmount > 0 ? 2 : 0) + 1
                            } style={{ width: '60%', verticalAlign: 'middle', padding: '5px', borderRight: '1px solid black', borderBottom: '1px solid black', position: 'relative' }}>
                                <div className="print-color-red" style={{ position: 'absolute', top: '5px', left: '5px', color: 'red', fontSize: '10pt', fontWeight: 'bold' }}>{isEn ? 'Payment Method :' : 'ช่องทางการชำระเงิน :'}</div>
                                <div style={{ border: '2px dashed black', borderRadius: '10px', padding: '20px 10px', width: '90%', margin: '20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                                    {(() => {
                                        try {
                                            const customBank = JSON.parse(formData.billStatus);
                                            return (
                                                <>
                                                    {customBank.logo && (
                                                        <img src={customBank.logo} style={{ width: '75px', maxHeight: '75px', objectFit: 'contain', flexShrink: 0 }} alt="bank logo" />
                                                    )}
                                                    <div style={{ textAlign: 'left', fontWeight: 'bold', lineHeight: 1.1 }}>
                                                        <span style={{ fontSize: '16pt' }}>{customBank.bankName}</span><br/>
                                                        <span style={{ fontSize: '12pt' }}>{customBank.accountName}</span><br/>
                                                        <span className="print-color-blue" style={{ fontSize: '20pt', color: '#2980b9' }}>{customBank.accountNo}</span>
                                                    </div>
                                                </>
                                            );
                                        } catch {
                                            return (
                                                <>
                                                    {formData.billStatus === 'ktb' && (
                                                        <img src="/images/banks/bank-ktb.png" style={{ width: '75px', maxHeight: '75px', objectFit: 'contain', flexShrink: 0 }} alt="ktb" />
                                                    )}
                                                    {formData.billStatus === 'scb' && (
                                                        <img src="/images/banks/bank-scb.png" style={{ width: '75px', maxHeight: '75px', objectFit: 'contain', flexShrink: 0 }} alt="scb" />
                                                    )}
                                                    {formData.billStatus.includes('kbank') && (
                                                        <img src="/images/banks/bank-kbank.png" style={{ width: '75px', maxHeight: '75px', objectFit: 'contain', flexShrink: 0 }} alt="kbank" />
                                                    )}
                                                    <div style={{ textAlign: 'left', fontWeight: 'bold', lineHeight: 1.1 }}>
                                                        <span style={{ fontSize: '16pt' }}>
                                                            {isEn ? (
                                                                formData.billStatus === 'ktb' ? 'Krungthai Bank' : 
                                                                (formData.billStatus === 'scb' ? 'Siam Commercial Bank' : 'Kasikorn Bank')
                                                            ) : (
                                                                formData.billStatus === 'ktb' ? 'ธนาคารกรุงไทย' : 
                                                                (formData.billStatus === 'scb' ? 'ธนาคารไทยพาณิชย์' : 'ธนาคารกสิกรไทย')
                                                            )}
                                                        </span><br/>
                                                        <span style={{ fontSize: '12pt' }}>
                                                            {isEn ? (
                                                                formData.billStatus === 'kbank_charan' ? 'Charan Wasiksut' :
                                                                (isElt ? 'Elite Trading 2020 Co., Ltd.' : (isPsf ? 'Premier Smart Farm Co., Ltd.' : 'Thai Herb Centers Community Enterprise'))
                                                            ) : (
                                                                formData.billStatus === 'kbank_charan' ? 'จรัญ วาสิกศิริ' :
                                                                (isElt ? 'บริษัท อิลิท เทรดดิ้ง 2020 จำกัด' : (isPsf ? 'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด' : 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์'))
                                                            )}
                                                        </span><br/>
                                                        <span className="print-color-blue" style={{ fontSize: '20pt', color: formData.billStatus === 'kbank_charan' ? '#138f2d' : '#2980b9' }}>
                                                            {formData.billStatus === 'ktb' ? '016-074423-7' : (formData.billStatus === 'scb' ? '3652680393' : (formData.billStatus === 'kbank_charan' ? '235-1-19734-2' : '201-3-35956-6'))}
                                                        </span>
                                                    </div>
                                                </>
                                            );
                                        }
                                    })()}
                                </div>
                            </td>
                            <td style={{ width: '26%', fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px' }}>
                                {isEn ? 'TOTAL' : 'รวมเป็นเงิน'}<br/><span style={{ fontSize: '10pt', fontWeight: 'normal' }}>{isEn ? '' : 'TOTAL'}</span>
                            </td>
                            <td style={{ width: '14%', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', padding: '5px' }}>
                                <span style={{ fontWeight: 'normal' }}>{subTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                            </td>
                        </tr>
                        
                        {formData.showDiscountInPrint && (
                            <React.Fragment>
                                <tr>
                                    <td className="print-color-red" style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', borderRight: '1px solid black', color: 'red', padding: '5px' }}>
                                        {isEn ? `AFTER DISCOUNT (${formData.discountPercent}%)` : `หักส่วนลด ${formData.discountPercent}%`}<br/>
                                        {!isEn && <span className="print-color-red" style={{ fontSize: '10pt', fontWeight: 'normal', color: 'red' }}>DISCOUNT</span>}
                                    </td>
                                    <td className="print-color-red" style={{ textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', color: 'red', padding: '5px' }}>
                                        <span className="print-color-red" style={{ fontWeight: 'normal', color: 'red' }}>{discountAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px' }}>
                                        {isEn ? 'BALANCE' : 'คงเหลือ'}<br/>
                                        {!isEn && <span style={{ fontSize: '10pt', fontWeight: 'normal' }}>BALANCE</span>}
                                    </td>
                                    <td style={{ textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', padding: '5px' }}>
                                        <span style={{ fontWeight: 'normal' }}>{afterDiscount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                    </td>
                                </tr>
                            </React.Fragment>
                        )}
                        
                        {(isFda || formData.showVatInPrint) && vatAmount > 0 && (
                            <tr>
                                <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px' }}>
                                    {isEn ? `VAT ${isFda ? '7' : formData.vatRate}%` : `ภาษีมูลค่าเพิ่ม ${isFda ? '7' : formData.vatRate}%`}<br/>
                                    {!isEn && <span style={{ fontSize: '10pt', fontWeight: 'normal' }}>VAT</span>}
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', padding: '5px' }}>
                                    <span style={{ fontWeight: 'normal' }}>{vatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                </td>
                            </tr>
                        )}
                        
                        {formData.showShippingInPrint && shipping > 0 && (
                            <tr>
                                <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px' }}>
                                    {isEn ? 'SHIPPING COST' : 'ค่าจัดส่ง'}<br/>
                                    {!isEn && <span style={{ fontSize: '10pt', fontWeight: 'normal' }}>SHIPPING COST</span>}
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', padding: '5px' }}>
                                    <span style={{ fontWeight: 'normal' }}>{shipping.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                </td>
                            </tr>
                        )}

                        {formData.showDesignFeeInPrint && designFee > 0 && (
                            <tr>
                                <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px' }}>
                                    {isEn ? 'DESIGN FEE' : 'ค่าออกแบบ'}<br/>
                                    {!isEn && <span style={{ fontSize: '10pt', fontWeight: 'normal' }}>DESIGN FEE</span>}
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
                                    {isEn ? `DEPOSIT ${formData.depositPercent !== 'custom' ? `(${formData.depositPercent}%)` : ''}` : `ยอดชำระมัดจำ ${formData.depositPercent !== 'custom' ? `(${formData.depositPercent}%)` : ''}`}<br/>
                                    {!isEn && <span className="print-color-red" style={{ fontSize: '10pt', fontWeight: 'normal', color: 'red' }}>DEPOSIT</span>}
                                </td>
                                <td className="print-color-red" style={{ textAlign: 'right', fontWeight: 'normal', borderBottom: '1px solid black', padding: '5px', paddingRight: '10px', color: 'red' }}>
                                    <span className="print-color-red" style={{ fontWeight: 'normal', color: 'red' }}>{depositAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                </td>
                            </tr>
                            <tr>
                                <td className="print-color-red" style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderRight: '1px solid black', borderBottom: '1px solid black', padding: '5px', color: 'red' }}>
                                    {isEn ? 'REMAINING BALANCE' : 'ยอดคงเหลือที่ต้องชำระ'}<br/>
                                    {!isEn && <span className="print-color-red" style={{ fontSize: '10pt', fontWeight: 'normal', color: 'red' }}>REMAINING BALANCE</span>}
                                </td>
                                <td className="print-color-red" style={{ textAlign: 'right', fontWeight: 'normal', borderBottom: '1px solid black', padding: '5px', paddingRight: '10px', color: 'red' }}>
                                    <span className="print-color-red" style={{ fontWeight: 'normal', color: 'red' }}>{remainingAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                </td>
                            </tr>
                            </>
                        )}

                        <tr>
                            <td className="print-bg-gray" style={{ width: '60%', textAlign: 'center', fontWeight: 'bold', fontSize: '13pt', backgroundColor: '#e6e6e6', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px' }}>
                                {isEn ? '-' : ThaiBaht(grandTotal)}
                            </td>
                            <td className="print-bg-gray" style={{ width: '26%', fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', borderRight: '1px solid black', borderBottom: '1px solid black', backgroundColor: '#e6e6e6', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', padding: '5px' }}>
                                {isEn ? 'GRAND TOTAL' : 'จำนวนเงินรวมทั้งสิ้น'}<br/>
                                {!isEn && <span style={{ fontSize: '10pt', fontWeight: 'normal' }}>GRAND TOTAL</span>}
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
                                <div dangerouslySetInnerHTML={{ __html: isEn ? translateNotesToEN(formData.notes) : formData.notes }} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '15px' }}>
                    <div style={{ textAlign: 'center', fontSize: '10pt' }}>
                        <div style={{ height: '30px' }}></div>
                        <div>(..................................................)</div>
                        <div style={{ marginTop: '2px' }}>ผู้รับวางบิล/ใบแจ้งหนี้</div>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '10pt' }}>
                        <div style={{ height: '30px', position: 'relative' }}>
                            {selectedSignature && (
                                                        <img src={getSignatureUrl(selectedSignature.ImagePath)} style={{ maxHeight: '40px', position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)' }} alt="signature" onError={(e) => { e.target.onerror = null; e.target.src = selectedSignature.ImagePath; }} />
                                                    )}
                        </div>
                        <div>(..................................................)</div>
                        <div style={{ marginTop: '2px' }}>ผู้วางบิล/ใบแจ้งหนี้</div>
                    </div>
                </div>
                </>
                )}
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
                                value={customerSearchTerm}
                                onChange={(e) => setCustomerSearchTerm(e.target.value)}
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
                                                <button type="button" onClick={() => { handleSelectCustomer(c); setShowCustomerModal(false); }} className="btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }}>
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

            {/* Add Custom Product Modal */}
            {addProductModal.visible && (
                <div className="custom-alert-overlay" onClick={() => setAddProductModal({ ...addProductModal, visible: false })}>
                    <div className="custom-alert-modal custom-alert-info" onClick={(e) => e.stopPropagation()} style={{ width: '400px' }}>
                        <div className="custom-alert-content" style={{ textAlign: 'left', padding: '10px' }}>
                            <h3 className="custom-alert-title" style={{ textAlign: 'center', marginBottom: '15px' }}>เพิ่มสินค้าใหม่</h3>
                            
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>ชื่อสินค้า <span className="required">*</span></label>
                                <input
                                    type="text"
                                    value={addProductModal.name}
                                    onChange={(e) => setAddProductModal({ ...addProductModal, name: e.target.value })}
                                    autoFocus
                                    placeholder="ระบุชื่อสินค้า..."
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>รูปภาพสินค้า (ทางเลือก)</label>
                                <div style={{ border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '15px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        id="newProductImage"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setAddProductModal({ ...addProductModal, image: reader.result });
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="newProductImage" style={{ cursor: 'pointer', color: '#3b82f6', fontSize: '13px', display: 'block', marginBottom: addProductModal.image ? '10px' : '0' }}>
                                        {addProductModal.image ? 'เปลี่ยนรูปภาพ' : 'คลิกเพื่ออัพโหลดรูปภาพ'}
                                    </label>
                                    {addProductModal.image && (
                                        <img src={addProductModal.image} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '8px', border: '1px solid #e2e8f0', objectFit: 'contain' }} />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="custom-alert-actions" style={{ marginTop: '20px' }}>
                            <button className="custom-alert-btn custom-alert-btn-cancel" onClick={() => setAddProductModal({ ...addProductModal, visible: false })}>
                                ยกเลิก
                            </button>
                            <button
                                className="custom-alert-btn custom-alert-btn-info"
                                onClick={() => {
                                    const val = addProductModal.name.trim();
                                    if (val) {
                                        if (Object.keys(PRODUCT_CATALOG).includes(val) || customProducts.some(p => p.name === val)) {
                                            showAlert('แจ้งเตือน', 'มีชื่อสินค้านี้อยู่แล้ว', 'warning');
                                            return;
                                        }
                                        const newProduct = { name: val, image: addProductModal.image };
                                        const newCustom = [...customProducts, newProduct];
                                        setCustomProducts(newCustom);
                                        localStorage.setItem('customProducts', JSON.stringify(newCustom));
                                        if (addProductModal.targetItemId) {
                                            handleItemChange(addProductModal.targetItemId, 'name', val);
                                        }
                                        setAddProductModal({ visible: false, targetItemId: null, name: '', image: null });
                                    }
                                }}
                            >
                                ตกลง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Custom Bank Modal */}
            {addBankModal.visible && (
                <div className="custom-alert-overlay" onClick={() => setAddBankModal({ ...addBankModal, visible: false })}>
                    <div className="custom-alert-modal custom-alert-info" onClick={(e) => e.stopPropagation()} style={{ width: '400px' }}>
                        <div className="custom-alert-content" style={{ textAlign: 'left', padding: '10px' }}>
                            <h3 className="custom-alert-title" style={{ textAlign: 'center', marginBottom: '15px' }}>เพิ่มบัญชีธนาคารใหม่</h3>
                            
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>ชื่อธนาคาร <span className="required">*</span></label>
                                <input
                                    type="text"
                                    value={addBankModal.bankName}
                                    onChange={(e) => setAddBankModal({ ...addBankModal, bankName: e.target.value })}
                                    autoFocus
                                    placeholder="เช่น ธนาคารไทยพาณิชย์..."
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>ชื่อบัญชี <span className="required">*</span></label>
                                <input
                                    type="text"
                                    value={addBankModal.accountName}
                                    onChange={(e) => setAddBankModal({ ...addBankModal, accountName: e.target.value })}
                                    placeholder="เช่น บจก. วิสาหกิจชุมชนไทยเฮิร์บ..."
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>เลขที่บัญชี <span className="required">*</span></label>
                                <input
                                    type="text"
                                    value={addBankModal.accountNo}
                                    onChange={(e) => setAddBankModal({ ...addBankModal, accountNo: e.target.value })}
                                    placeholder="เช่น 123-4-56789-0..."
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>โลโก้ธนาคาร (ทางเลือก)</label>
                                <div style={{ border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '15px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        id="newBankLogo"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setAddBankModal({ ...addBankModal, logo: reader.result });
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="newBankLogo" style={{ cursor: 'pointer', color: '#3b82f6', fontSize: '13px', display: 'block', marginBottom: addBankModal.logo ? '10px' : '0' }}>
                                        {addBankModal.logo ? 'เปลี่ยนโลโก้' : 'คลิกเพื่ออัพโหลดโลโก้'}
                                    </label>
                                    {addBankModal.logo && (
                                        <img src={addBankModal.logo} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '8px', border: '1px solid #e2e8f0', objectFit: 'contain' }} />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="custom-alert-actions" style={{ marginTop: '20px' }}>
                            <button className="custom-alert-btn custom-alert-btn-cancel" onClick={() => setAddBankModal({ ...addBankModal, visible: false })}>
                                ยกเลิก
                            </button>
                            <button
                                className="custom-alert-btn custom-alert-btn-info"
                                onClick={() => {
                                    const bName = addBankModal.bankName.trim();
                                    const aName = addBankModal.accountName.trim();
                                    const aNo = addBankModal.accountNo.trim();

                                    if (bName && aName && aNo) {
                                        if (customBanks.some(b => b.bankName === bName && b.accountNo === aNo)) {
                                            showAlert('แจ้งเตือน', 'มีบัญชีนี้อยู่แล้ว', 'warning');
                                            return;
                                        }
                                        const newBank = { bankName: bName, accountName: aName, accountNo: aNo, logo: addBankModal.logo };
                                        const newCustomBanks = [...customBanks, newBank];
                                        setCustomBanks(newCustomBanks);
                                        localStorage.setItem('customBanks', JSON.stringify(newCustomBanks));
                                        
                                        setFormData(prev => ({...prev, billStatus: JSON.stringify(newBank)}));
                                        
                                        setAddBankModal({ visible: false, bankName: '', accountName: '', accountNo: '', logo: null });
                                    } else {
                                        showAlert('แจ้งเตือน', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
                                    }
                                }}
                            >
                                ตกลง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

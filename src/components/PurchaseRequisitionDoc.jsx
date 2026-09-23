/**
 * =============================================================================
 * PurchaseRequisitionDoc.jsx — เอกสารใบขอซื้อ (Purchase Requisition - PR)
 * =============================================================================
 * หน้าต่างพรีวิวและพิมพ์เอกสารใบขอซื้อขนาด A4
 */

import React from 'react';
import { Printer, X, CheckCircle, ShoppingBag, FileText, AlertCircle } from 'lucide-react';
import { useSignatures } from '../hooks/useSignatures';
import './PurchaseRequisitionDoc.css';

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString('th-TH');
    } catch {
        return String(dateStr);
    }
};

function ThaiBaht(Number) {
    Number = (Number || 0).toString().replace(/[, ]/g, '');
    if (isNaN(Number) || Number === '' || parseFloat(Number) === 0) return "ศูนย์บาทถ้วน";
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

    if (satangText === '' || satangText === '00' || satangText === 'ศูนย์') {
        bahtText += 'ถ้วน';
    } else {
        bahtText += satangText + 'สตางค์';
    }
    return bahtText;
}

export default function PurchaseRequisitionDoc({ pr, onClose, onStatusUpdate, canUpdate = false, onCreatePO = null }) {
    const { signatures, getSignatureUrl } = useSignatures();
    const isPrintingRef = React.useRef(false);

    if (!pr) return null;

    const prNumber = pr.prNumber || pr.number || '-';
    const requestDate = pr.requestDate || pr.date || pr.createdAt;
    const items = Array.isArray(pr.items) ? pr.items : [];

    // Calculate totals
    const totalQty = items.reduce((sum, it) => sum + (Number(it.requestQty) || Number(it.qty) || Number(it.deductQty) || 0), 0);
    const totalEstimated = items.reduce((sum, it) => {
        const q = Number(it.requestQty) || Number(it.qty) || Number(it.deductQty) || 0;
        const p = Number(it.estimatedPrice) || Number(it.price) || 0;
        return sum + (q * p);
    }, 0) || Number(pr.estimatedPrice) || Number(pr.estimatedTotal) || 0;

    // 1. ผู้ขอซื้อ (Requested By) signature
    const requestorSigMatch = signatures?.find(s => s.FullName && (s.FullName === pr.requestor || pr.requestor?.includes(s.FullName)));
    const requestorSigPath = pr.requestorSignature || requestorSigMatch?.ImagePath || null;

    // 2. ฝ่ายจัดซื้อ (Purchasing Department) signature: ลายเซ็นของ user ผู้กดรับ/สั่งซื้อ/อนุมัติ (ไม่ใช่ประธาน)
    const isApprovedOrOrdered = pr.status === 'อนุมัติแล้ว' || pr.status === 'สั่งซื้อแล้ว';
    const purchaserSigMatch = signatures?.find(s => s.FullName && (s.FullName === pr.purchaser || (pr.purchaser && pr.purchaser.includes(s.FullName))));
    const purchaserSigPath = isApprovedOrOrdered ? (pr.purchaserSignature || purchaserSigMatch?.ImagePath || null) : null;
    const purchaserName = isApprovedOrOrdered ? (pr.purchaser || 'เจ้าหน้าที่ฝ่ายจัดซื้อ') : 'เจ้าหน้าที่ฝ่ายจัดซื้อ';

    const handlePrint = () => {
        if (isPrintingRef.current) return;
        isPrintingRef.current = true;

        const printEl = document.getElementById('pr-print-sheet');
        if (!printEl) {
            isPrintingRef.current = false;
            window.print();
            return;
        }

        const existingFrame = document.getElementById('pr-doc-print-frame');
        if (existingFrame) existingFrame.remove();

        const iframe = document.createElement('iframe');
        iframe.id = 'pr-doc-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>ใบขอซื้อ_${prNumber || 'PR'}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
                <style>
                    * {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 8mm 10mm;
                    }
                    html, body {
                        background: #ffffff !important;
                        font-family: 'Sarabun', sans-serif !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        color: #000000 !important;
                        font-size: 12px;
                        line-height: 1.4;
                    }
                    .pr-print-sheet {
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        background: #fff !important;
                    }
                    .pr-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 2px solid #059669;
                        padding-bottom: 14px;
                        margin-bottom: 16px;
                    }
                    .pr-company-info {
                        display: flex;
                        gap: 14px;
                        align-items: center;
                        max-width: 530px;
                    }
                    .pr-logo {
                        width: 64px;
                        height: 64px;
                        object-fit: contain;
                    }
                    .pr-company-name-th {
                        font-size: 15px;
                        font-weight: 800;
                        color: #000000;
                        line-height: 1.3;
                    }
                    .pr-company-name-en {
                        font-size: 10.5px;
                        font-weight: 600;
                        color: #059669;
                        letter-spacing: 0.2px;
                        margin-bottom: 3px;
                    }
                    .pr-company-sub {
                        font-size: 10px;
                        color: #000000;
                        line-height: 1.35;
                    }
                    .pr-title-box {
                        text-align: right;
                    }
                    .pr-original-mark {
                        font-size: 10.5px;
                        color: #000000;
                        margin-bottom: 3px;
                        font-weight: 500;
                    }
                    .pr-doc-title-th {
                        font-size: 23px;
                        font-weight: 800;
                        color: #000000;
                        line-height: 1.2;
                    }
                    .pr-doc-title-en {
                        font-size: 11px;
                        font-weight: 700;
                        color: #059669;
                        letter-spacing: 0.5px;
                    }
                    .pr-meta-grid {
                        display: grid;
                        grid-template-columns: 1.2fr 1fr;
                        gap: 12px;
                        margin-bottom: 16px;
                    }
                    .pr-meta-box {
                        background: #f8fcf9 !important;
                        border: 1px solid #d1fae5;
                        border-radius: 6px;
                        padding: 10px 12px;
                        font-size: 11.5px;
                    }
                    .pr-meta-row {
                        display: flex;
                        margin-bottom: 5px;
                        align-items: baseline;
                    }
                    .pr-meta-row:last-child {
                        margin-bottom: 0;
                    }
                    .pr-meta-label {
                        width: 110px;
                        flex-shrink: 0;
                        color: #047857;
                        font-weight: 600;
                    }
                    .pr-meta-val {
                        flex: 1;
                        color: #000000;
                    }
                    .pr-table-container {
                        margin-bottom: 16px;
                        border: 1px solid #a7f3d0;
                        border-radius: 6px;
                        overflow: hidden;
                    }
                    .pr-items-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 11px;
                    }
                    .pr-items-table thead th {
                        background: #ecfdf5 !important;
                        color: #065f46 !important;
                        font-weight: 700;
                        padding: 8px 6px;
                        border-bottom: 1.5px solid #a7f3d0;
                        border-right: 1px solid #d1fae5;
                    }
                    .pr-items-table thead th:last-child {
                        border-right: none;
                    }
                    .pr-items-table tbody td {
                        padding: 7px 6px;
                        border-bottom: 1px solid #f3f4f6;
                        border-right: 1px solid #f3f4f6;
                        color: #000000;
                        vertical-align: middle;
                    }
                    .pr-items-table tbody tr:nth-child(even) td {
                        background: #fafdfc;
                    }
                    .pr-items-table tbody td:last-child {
                        border-right: none;
                    }
                    .pr-items-table tbody tr:last-child td {
                        border-bottom: none;
                    }
                    .pr-items-table tfoot td {
                        background: #f8fcf9 !important;
                        padding: 8px 8px;
                        border-top: 1.5px solid #a7f3d0;
                        font-weight: 600;
                        color: #000000;
                    }
                    .pr-notes-box {
                        background: #f0fdf4 !important;
                        border: 1px solid #bbf7d0;
                        border-radius: 6px;
                        padding: 8px 12px;
                        font-size: 11px;
                        margin-bottom: 18px;
                        color: #000000;
                    }
                    .pr-notes-title {
                        font-weight: 700;
                        margin-bottom: 3px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        color: #059669;
                    }
                    .pr-signatures-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 20px;
                        margin-top: 8px;
                        page-break-inside: avoid;
                    }
                    .pr-sig-box {
                        border: 1px solid #d1fae5;
                        border-radius: 6px;
                        background: #ffffff !important;
                        padding: 8px 6px 10px 6px;
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        min-height: 115px;
                    }
                    .pr-sig-role {
                        font-size: 11.5px;
                        font-weight: 700;
                        color: #047857;
                        background: #f0fdf4;
                        border-bottom: 1px solid #d1fae5;
                        padding: 4px 2px;
                        margin-bottom: 4px;
                        border-radius: 4px;
                    }
                    .pr-sig-content {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-end;
                    }
                    .pr-sig-image-area {
                        height: 40px;
                        display: flex;
                        align-items: flex-end;
                        justify-content: center;
                        margin-bottom: -6px;
                        position: relative;
                    }
                    .pr-sig-img {
                        max-height: 42px;
                        max-width: 130px;
                        object-fit: contain;
                        position: relative;
                        bottom: -3px;
                        z-index: 1;
                    }
                    .pr-sig-line {
                        font-size: 10.5px;
                        color: #000000;
                        position: relative;
                        z-index: 0;
                    }
                    .pr-sig-name {
                        font-size: 11px;
                        font-weight: 600;
                        color: #000000;
                        margin-top: 2px;
                    }
                    .pr-sig-date {
                        font-size: 10px;
                        color: #000000;
                        margin-top: 2px;
                    }
                </style>
            </head>
            <body>
                <div class="pr-print-sheet">
                    ${printEl.innerHTML}
                </div>
            </body>
            </html>
        `);
        doc.close();

        let printed = false;
        let printTimer = null;

        const triggerPrint = () => {
            if (printed) return;
            printed = true;
            if (printTimer) {
                clearTimeout(printTimer);
                printTimer = null;
            }

            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.error('Print iframe error, fallback to window.print:', err);
                window.print();
            } finally {
                setTimeout(() => {
                    isPrintingRef.current = false;
                    if (iframe && iframe.parentNode) {
                        iframe.remove();
                    }
                }, 1500);
            }
        };

        const imgs = Array.from(doc.images);
        if (imgs.length === 0 || imgs.every(img => img.complete)) {
            printTimer = setTimeout(triggerPrint, 350);
        } else {
            let loaded = 0;
            const onImgFinish = () => {
                loaded++;
                if (loaded >= imgs.length) {
                    if (printTimer) clearTimeout(printTimer);
                    printTimer = setTimeout(triggerPrint, 100);
                }
            };
            imgs.forEach(img => {
                img.onload = onImgFinish;
                img.onerror = onImgFinish;
            });
            // Fallback timeout in case image loading stalls
            printTimer = setTimeout(triggerPrint, 1200);
        }
    };

    return (
        <div className="pr-doc-overlay" onClick={onClose}>
            <div className="pr-doc-wrapper" onClick={(e) => e.stopPropagation()}>
                {/* ── Top Bar Controls (Not printed) ── */}
                <div className="pr-doc-topbar no-print">
                    <div className="pr-doc-topbar-title">
                        <FileText size={18} color="#86efac" />
                        <span>ตัวอย่างเอกสารใบขอซื้อ: {prNumber}</span>
                        <span style={{ 
                            fontSize: 12, 
                            padding: '3px 10px', 
                            borderRadius: 12, 
                            background: pr.status === 'อนุมัติแล้ว' ? '#15803d' : pr.status === 'สั่งซื้อแล้ว' ? '#047857' : pr.status === 'ฉบับร่าง' ? '#475569' : '#b45309',
                            color: '#fff',
                            fontWeight: 600,
                            marginLeft: 8
                        }}>
                            {pr.status || 'รอจัดซื้อ'}
                        </span>
                    </div>
                    <div className="pr-doc-topbar-actions">
                        {onCreatePO && pr.status !== 'ยกเลิก' && pr.status !== 'สั่งซื้อแล้ว' && !pr.poNumber && (
                            <button
                                type="button"
                                onClick={() => onCreatePO(pr)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '7px 14px',
                                    background: '#059669',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <ShoppingBag size={15} /> เปิดใบสั่งซื้อ (PO)
                            </button>
                        )}
                        {canUpdate && onStatusUpdate && pr.status === 'รอจัดซื้อ' && (
                            <button
                                type="button"
                                onClick={() => onStatusUpdate(pr.id || pr.prNumber, 'อนุมัติแล้ว')}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '7px 14px',
                                    background: '#15803d',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <CheckCircle size={15} /> อนุมัติใบขอซื้อ
                            </button>
                        )}
                        <button 
                            type="button" 
                            className="pr-btn-print" 
                            onClick={handlePrint}
                            title="สั่งพิมพ์เอกสาร A4"
                        >
                            <Printer size={15} /> พิมพ์เอกสาร (Print A4)
                        </button>
                        <button 
                            type="button" 
                            className="pr-btn-close" 
                            onClick={onClose}
                            title="ปิดหน้าต่าง"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── A4 Sheet Page ── */}
                <div className="pr-print-sheet" id="pr-print-sheet">
                    {/* Header */}
                    <div className="pr-header">
                        <div className="pr-company-info">
                            <img 
                                src="/images/logos/logo-thc.png" 
                                alt="THC Logo" 
                                className="pr-logo" 
                                onError={(e) => { e.target.src = '/logo-small.png'; }}
                            />
                            <div>
                                <div className="pr-company-name-th">วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์ (สำนักงานใหญ่)</div>
                                <div className="pr-company-name-en">THAI HERB CENTERS (THC) COMMUNITY ENTERPRISE</div>
                                <div className="pr-company-sub">
                                    6/10 หมู่ที่ 2 ต.ไทรม้า อ.เมืองนนทบุรี จ.นนทบุรี 11000<br />
                                    โทรศัพท์: 083-9799389 | เลขประจำตัวผู้เสียภาษี: 099-200438186-0
                                </div>
                            </div>
                        </div>
                        <div className="pr-title-box">
                            <div className="pr-original-mark">( ต้นฉบับ / ORIGINAL )</div>
                            <div className="pr-doc-title-th">ใบขอซื้อ</div>
                            <div className="pr-doc-title-en">PURCHASE REQUISITION (PR)</div>
                        </div>
                    </div>

                    {/* Metadata Box Grid */}
                    <div className="pr-meta-grid">
                        {/* Left Box: Request details */}
                        <div className="pr-meta-box">
                            <div className="pr-meta-row">
                                <span className="pr-meta-label">แผนกที่ขอซื้อ :</span>
                                <span className="pr-meta-val" style={{ fontWeight: 600, color: '#000000' }}>{pr.department || 'ฝ่ายผลิต / คลังสินค้า'}</span>
                            </div>
                            <div className="pr-meta-row">
                                <span className="pr-meta-label">ผู้ขอซื้อ :</span>
                                <span className="pr-meta-val" style={{ color: '#000000' }}>{pr.requestor || 'เจ้าหน้าที่คลังสินค้า'}</span>
                            </div>
                            {pr.taskId && (
                                <div className="pr-meta-row">
                                    <span className="pr-meta-label">งานผลิตอ้างอิง :</span>
                                    <span className="pr-meta-val" style={{ fontWeight: 700, color: '#000000' }}>{pr.taskId}</span>
                                </div>
                            )}
                            {pr.formulaName && (
                                <div className="pr-meta-row">
                                    <span className="pr-meta-label">สูตรการผลิต :</span>
                                    <span className="pr-meta-val" style={{ fontWeight: 600, color: '#000000' }}>{pr.formulaName}</span>
                                </div>
                            )}
                            <div className="pr-meta-row">
                                <span className="pr-meta-label">วัตถุประสงค์ :</span>
                                <span className="pr-meta-val" style={{ color: '#000000' }}>
                                    {pr.notes || (pr.taskId ? `ขอซื้อวัตถุดิบเนื่องจากสต็อกไม่พอสำหรับงานผลิต ${pr.taskId}` : 'จัดซื้อเข้าสต็อกคลังสินค้า')}
                                </span>
                            </div>
                        </div>

                        {/* Right Box: Document numbers */}
                        <div className="pr-meta-box">
                            <div className="pr-meta-row">
                                <span className="pr-meta-label">เลขที่ใบขอซื้อ :</span>
                                <span className="pr-meta-val" style={{ fontWeight: 700, fontSize: 14, color: '#000000' }}>{prNumber}</span>
                            </div>
                            <div className="pr-meta-row">
                                <span className="pr-meta-label">วันที่ขอซื้อ :</span>
                                <span className="pr-meta-val" style={{ color: '#000000' }}>{formatDate(requestDate)}</span>
                            </div>
                            <div className="pr-meta-row">
                                <span className="pr-meta-label">สถานะเอกสาร :</span>
                                <span className="pr-meta-val" style={{ fontWeight: 600, color: '#000000' }}>
                                    {pr.status || 'รอจัดซื้อ'}
                                </span>
                            </div>
                            {pr.poNumber && (
                                <div className="pr-meta-row">
                                    <span className="pr-meta-label">เลขที่ใบสั่งซื้อ (PO) :</span>
                                    <span className="pr-meta-val" style={{ fontWeight: 700, color: '#000000' }}>{pr.poNumber}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Table of Items */}
                    <div className="pr-table-container">
                        <table className="pr-items-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '45px', textAlign: 'center' }}>ลำดับ</th>
                                    <th style={{ width: '110px', textAlign: 'center' }}>รหัสวัตถุดิบ</th>
                                    <th style={{ textAlign: 'left' }}>รายการวัตถุดิบ / สินค้าที่ขอซื้อ</th>
                                    <th style={{ width: '95px', textAlign: 'right' }}>สต็อกปัจจุบัน</th>
                                    <th style={{ width: '100px', textAlign: 'right' }}>จำนวนที่ขอซื้อ</th>
                                    <th style={{ width: '60px', textAlign: 'center' }}>หน่วย</th>
                                    <th style={{ width: '90px', textAlign: 'right' }}>ราคาประเมิน</th>
                                    <th style={{ width: '100px', textAlign: 'right' }}>รวมเงินประเมิน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length > 0 ? (
                                    items.map((it, idx) => {
                                        const qty = Number(it.requestQty) || Number(it.qty) || Number(it.deductQty) || 0;
                                        const price = Number(it.estimatedPrice) || Number(it.price) || 0;
                                        const lineTotal = qty * price;

                                        return (
                                            <tr key={idx}>
                                                <td style={{ textAlign: 'center', color: '#000000' }}>{idx + 1}</td>
                                                <td style={{ textAlign: 'center', color: '#000000', fontSize: 11 }}>{it.itemCode || it.code || '-'}</td>
                                                <td style={{ fontWeight: 600, color: '#000000' }}>
                                                    {it.itemName || it.item || it.name}
                                                </td>
                                                <td style={{ textAlign: 'right', color: Number(it.currentStock || 0) === 0 ? '#dc2626' : '#000000', fontWeight: Number(it.currentStock || 0) === 0 ? 600 : 400 }}>
                                                    {it.currentStock !== undefined ? Number(it.currentStock).toLocaleString('th-TH', { maximumFractionDigits: 4 }) : '-'}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#000000' }}>
                                                    {qty.toLocaleString('th-TH', { maximumFractionDigits: 4 })}
                                                </td>
                                                <td style={{ textAlign: 'center', color: '#000000' }}>
                                                    {it.unit || it.displayUnit || 'กก.'}
                                                </td>
                                                <td style={{ textAlign: 'right', color: '#000000' }}>
                                                    {price > 0 ? price.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#000000' }}>
                                                    {lineTotal > 0 ? lineTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', padding: 20, color: '#000000' }}>
                                            ไม่มีรายการสินค้า
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, color: '#000000' }}>
                                        รวมจำนวนรายการ: {items.length} รายการ
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#000000' }}>
                                        {totalQty.toLocaleString('th-TH', { maximumFractionDigits: 4 })}
                                    </td>
                                    <td></td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#000000' }}>รวมยอดประเมิน:</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#000000' }}>
                                        {totalEstimated > 0 ? `฿${totalEstimated.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Thai Baht text if total estimated is present */}
                    {totalEstimated > 0 && (
                        <div style={{ textAlign: 'right', fontSize: 12, color: '#000000', marginTop: -12, marginBottom: 16 }}>
                            ( <strong>คำอ่าน:</strong> {ThaiBaht(totalEstimated)} )
                        </div>
                    )}

                    {/* Notes Box */}
                    <div className="pr-notes-box">
                        <div className="pr-notes-title">
                            <AlertCircle size={14} color="#059669" /> หมายเหตุ / ความเร่งด่วนในการจัดซื้อ:
                        </div>
                        <div style={{ color: '#000000' }}>
                            {pr.notes ? pr.notes : 'วัตถุดิบรายการข้างต้นสต็อกคงเหลือไม่เพียงพอสำหรับรอบการผลิต กรุณาดำเนินการเปิดใบสั่งซื้อ (PO) และประสานงานส่งมอบเข้าคลังสินค้าโดยเร็ว'}
                        </div>
                    </div>

                    {/* Signatures Block (2 Columns: ผู้ขอซื้อ และ ฝ่ายจัดซื้อ) */}
                    <div className="pr-signatures-grid">
                        {/* Col 1: Requested By (ผู้ขอซื้อ) */}
                        <div className="pr-sig-box">
                            <div className="pr-sig-role">ผู้ขอซื้อ (Requested By)</div>
                            <div className="pr-sig-content">
                                <div className="pr-sig-image-area">
                                    {requestorSigPath ? (
                                        <img 
                                            src={getSignatureUrl(requestorSigPath)} 
                                            alt="Requestor Signature" 
                                            className="pr-sig-img"
                                        />
                                    ) : null}
                                </div>
                                <div className="pr-sig-line" style={{ color: '#000000' }}>( .................................................... )</div>
                                <div className="pr-sig-name" style={{ color: '#000000' }}>{pr.requestor || 'เจ้าหน้าที่คลังสินค้า'}</div>
                                <div className="pr-sig-date" style={{ color: '#000000' }}>วันที่: {formatDate(requestDate)}</div>
                            </div>
                        </div>

                        {/* Col 2: Purchasing Department (ฝ่ายจัดซื้อ) */}
                        <div className="pr-sig-box">
                            <div className="pr-sig-role">ฝ่ายจัดซื้อ (Purchasing Department)</div>
                            <div className="pr-sig-content">
                                <div className="pr-sig-image-area">
                                    {purchaserSigPath ? (
                                        <img 
                                            src={getSignatureUrl(purchaserSigPath)} 
                                            alt="Purchaser Signature" 
                                            className="pr-sig-img"
                                        />
                                    ) : null}
                                </div>
                                <div className="pr-sig-line" style={{ color: '#000000' }}>( .................................................... )</div>
                                <div className="pr-sig-name" style={{ color: '#000000' }}>{purchaserName}</div>
                                <div className="pr-sig-date" style={{ color: '#000000' }}>
                                    วันที่: {isApprovedOrOrdered ? formatDate(pr.purchasedAt || pr.purchaseDate || pr.updatedAt || new Date()) : '..... / ..... / ..........'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * =============================================================================
 * ProductionOrderPreview.jsx — พรีวิวเอกสารคำสั่งผลิต
 * =============================================================================
 * แสดงเอกสารคำสั่งผลิตในรูปแบบที่ตรงกับ formplanner.html ของบริษัท
 * รองรับ HTML print (window.print) สำหรับพิมพ์เอกสาร A4
 * 
 * Props:
 *   - job: ข้อมูล Job Order จาก PlannerContext
 *   - onClose: callback เมื่อปิด modal
 * =============================================================================
 */

import React, { useRef } from 'react';
import { ArrowLeft, Printer, X } from 'lucide-react';
import { useSignatures } from '../hooks/useSignatures';

const LOGO_URL = 'https://lh3.googleusercontent.com/d/10lptwep_aBvzXnQUHFAyS8cou2nrYyKK';

/**
 * แปลงวันที่จาก YYYY-MM-DD เป็นรูปแบบไทย เช่น "3 สิงหาคม 2569"
 */
const formatThaiDate = (dateStr) => {
    if (!dateStr) return '-';
    const months = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    try {
        const d = new Date(dateStr + 'T00:00:00');
        const day = d.getDate();
        const month = months[d.getMonth()];
        const year = d.getFullYear() + 543; // พ.ศ.
        return `${day} ${month} ${year}`;
    } catch {
        return dateStr;
    }
};

/**
 * แปลงวันที่เป็น DD/MM/YYYY (พ.ศ.) สำหรับช่องเซ็นชื่อ
 */
const formatShortThaiDate = (dateStr) => {
    if (!dateStr) return '........./........./.........';
    try {
        const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
        if (isNaN(d.getTime())) return '........./........./.........';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear() + 543;
        return `${day}/${month}/${year}`;
    } catch {
        return '........./........./.........';
    }
};

/**
 * Parse ข้อมูลจาก notes ของ Job Order
 * Notes format: "[ผลิตตามออร์เดอร์ (OEM)] OEM — อ้างอิงจาก SO: SO-xxx | สินค้า: yyy | ... | ลูกค้า: CustomerName"
 */
const parseJobNotes = (notes) => {
    const result = {
        soRef: '',
        itemName: '',
        customerName: '',
        productionType: '',
    };
    if (!notes) return result;

    // Extract SO reference
    const soMatch = notes.match(/SO:\s*(SO-[\d-]+)/);
    if (soMatch) result.soRef = soMatch[1];

    // Extract item name
    const itemMatch = notes.match(/สินค้า:\s*([^|]+)/);
    if (itemMatch) result.itemName = itemMatch[1].trim();

    // Extract customer name
    const custMatch = notes.match(/ลูกค้า:\s*([^|(]+)/);
    if (custMatch) result.customerName = custMatch[1].trim();

    // Extract production type
    const typeMatch = notes.match(/\[([^\]]+)\]/);
    if (typeMatch) result.productionType = typeMatch[1];

    return result;
};

export default function ProductionOrderPreview({ job, onClose }) {
    const printRef = useRef(null);
    const { signatures: availableSignatures, getSignatureUrl } = useSignatures();

    if (!job) return null;

    const parsed = parseJobNotes(job.notes);
    const customerName = job.customerName || parsed.customerName || job.brand || '-';

    // Helper to find signature image for any name
    const findSignatureImg = (nameStr) => {
        if (!nameStr) return null;
        if (availableSignatures && availableSignatures.length > 0) {
            const matched = availableSignatures.find(s => 
                (s.FullName && nameStr.includes(s.FullName)) || 
                (s.SignerName && nameStr.includes(s.SignerName)) ||
                (s.KeyName && nameStr.toLowerCase().includes(s.KeyName.toLowerCase())) ||
                (s.FullName && s.FullName.includes(nameStr))
            );
            if (matched && matched.ImagePath) {
                return getSignatureUrl(matched.ImagePath);
            }
        }
        if (nameStr.includes('ธวัช')) return '/images/signatures/sign-approver.png';
        return null;
    };

    const rawReqName = job.requestedBy || job.createdBy || '';
    const reqName = (rawReqName && rawReqName !== 'system') ? rawReqName : 'จุฑารัตน์ วงค์คำเหลา';
    const checkName = job.checkedBy || 'นางสาวกิรณา เลิศมณี';
    const appName = job.approvedBy || 'นายธวัช จรุงพิรวงศ์';
    const respName = job.responsibleBy || 'นายวันปิยะ คงกำเหนิด';

    const reqSig = findSignatureImg(reqName);
    const checkSig = findSignatureImg(checkName);
    const appSig = findSignatureImg(appName);
    const respSig = findSignatureImg(respName);

    // สร้างข้อมูลแถวตาราง — 1 JO = 1 สินค้า, pad ให้ได้อย่างน้อย 6 แถว
    const productName = job.productName || job.itemName || parsed.itemName || job.formulaName || '-';
    const productRows = [
        {
            name: productName,
            brand: customerName !== '-' ? customerName : '',
            qty: job.totalQty ? `${Number(job.totalQty).toLocaleString()} ${job.unit || 'ชิ้น'}` : '-',
            notes: '',
        }
    ];
    while (productRows.length < 6) {
        productRows.push({ name: '', brand: '', qty: '', notes: '' });
    }

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        // ใช้ iframe ซ่อนเพื่อพิมพ์ — ไม่ต้องเปิดหน้าต่างใหม่
        const existingFrame = document.getElementById('production-order-print-frame');
        if (existingFrame) existingFrame.remove();

        const iframe = document.createElement('iframe');
        iframe.id = 'production-order-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>คำสั่งผลิต ${job.id}</title>
                <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Sarabun', sans-serif; background: white; }
                    @page { size: A4; margin: 10mm 15mm 15mm 15mm; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                    .print-document { width: 100%; padding: 0; color: #000; font-size: 14px; }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);
        doc.close();

        // รอให้ font โหลดก่อนพิมพ์
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            // ลบ iframe หลังพิมพ์เสร็จ
            setTimeout(() => {
                iframe.remove();
            }, 1000);
        }, 600);
    };

    // ── Styles สำหรับ Preview (ในหน้าเว็บ) ──
    const styles = {
        overlay: {
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        },
        modal: {
            background: '#fff', borderRadius: '12px', width: '95%', maxWidth: '900px',
            height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        },
        header: {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
        },
        headerTitle: {
            margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b',
            display: 'flex', alignItems: 'center', gap: '8px',
        },
        body: { flex: 1, overflow: 'auto', padding: '30px', background: '#f1f5f9' },
        paper: {
            background: '#fff', maxWidth: '794px', margin: '0 auto', padding: '40px 35px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontFamily: "'Sarabun', sans-serif",
            fontSize: '14px', color: '#000',
        },
        btnGroup: { display: 'flex', gap: '8px' },
        btnBack: {
            padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
            background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#475569',
            display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Sarabun', sans-serif",
        },
        btnPrint: {
            padding: '8px 16px', borderRadius: '8px', border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
            cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Sarabun', sans-serif",
        },
        btnClose: {
            padding: '8px 16px', borderRadius: '8px', border: 'none',
            background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '13px',
            fontFamily: "'Sarabun', sans-serif",
        },
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* ── Modal Header ── */}
                <div style={styles.header}>
                    <h3 style={styles.headerTitle}>
                        📄 พรีวิวเอกสารคำสั่งผลิต
                    </h3>
                    <div style={styles.btnGroup}>
                        <button style={styles.btnBack} onClick={onClose}>
                            <ArrowLeft size={14} /> กลับไปหน้ารายการ
                        </button>
                        <button style={styles.btnPrint} onClick={handlePrint}>
                            <Printer size={14} /> พิมพ์ใบสั่งผลิต
                        </button>
                        <button style={styles.btnClose} onClick={onClose}>
                            ✕ ปิด
                        </button>
                    </div>
                </div>

                {/* ── Document Preview ── */}
                <div style={styles.body}>
                    <div style={styles.paper}>
                        <div ref={printRef} className="print-document">
                            {/* ════════ HEADER ════════ */}
                            <div style={{ display: 'flex', border: '1px solid #000' }}>
                                {/* Logo */}
                                <div style={{ width: '100px', borderRight: '1px solid #000', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img src={LOGO_URL} alt="Logo" style={{ maxWidth: '80px', maxHeight: '80px', objectFit: 'contain' }} />
                                </div>
                                {/* Info Grid */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {/* Row 1 */}
                                    <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                                        <div style={{ flex: 1, padding: '5px 10px', borderRight: '1px solid #000', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 }}>
                                            วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์
                                        </div>
                                        <div style={{ width: '200px', padding: '5px 10px', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                                            รหัสเอกสาร : SD-PD-001
                                        </div>
                                    </div>
                                    {/* Row 2 */}
                                    <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                                        <div style={{ flex: 1, padding: '5px 10px', borderRight: '1px solid #000', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            ขั้นตอนการปฏิบัติงาน
                                        </div>
                                        <div style={{ width: '200px', padding: '5px 10px', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                                            แก้ไขครั้งที่ : 01
                                        </div>
                                    </div>
                                    {/* Row 3 */}
                                    <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                                        <div style={{ flex: 1, padding: '5px 10px', borderRight: '1px solid #000', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                            คำสั่งผลิต
                                        </div>
                                        <div style={{ width: '200px', padding: '5px 10px', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                                            วันที่ประกาศใช้ : 05/02/2569
                                        </div>
                                    </div>
                                    {/* Row 4 */}
                                    <div style={{ display: 'flex' }}>
                                        <div style={{ flex: 1, padding: '5px 10px', borderRight: '1px solid #000', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                                            ฝ่ายขาย/ฝ่ายวางเเผน/ฝ่ายบัญชี/ฝ่ายบริหาร/ฝ่ายผลิต
                                        </div>
                                        <div style={{ width: '200px', padding: '5px 10px', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                                            Page : 1 of 1
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ════════ TITLE ════════ */}
                            <div style={{ height: '20px' }} />
                            <div style={{ textAlign: 'center', fontSize: '22px', fontWeight: 'bold', padding: '10px 0' }}>
                                คำสั่งผลิต
                            </div>
                            <div style={{ height: '10px' }} />

                            {/* ════════ DATE SECTION ════════ */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 20px', marginBottom: '10px', fontSize: '15px' }}>
                                <div>
                                    วันที่สั่งผลิต
                                    <span style={{ display: 'inline-block', minWidth: '220px', borderBottom: '1px dotted #000', textAlign: 'center', paddingBottom: '2px', marginLeft: '5px' }}>
                                        {formatThaiDate(job.planDate)}
                                    </span>
                                </div>
                                <div>
                                    วันที่จัดส่ง
                                    <span style={{ display: 'inline-block', minWidth: '220px', borderBottom: '1px dotted #000', textAlign: 'center', paddingBottom: '2px', marginLeft: '5px' }}>
                                        {formatThaiDate(job.dueDate)}
                                    </span>
                                </div>
                            </div>

                            {/* ════════ ITEMS TABLE ════════ */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', wordWrap: 'break-word' }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: '1px solid #000', padding: '10px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center', width: '70px' }}>ลำดับที่</th>
                                        <th style={{ border: '1px solid #000', padding: '10px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>ชื่อผลิตภัณฑ์</th>
                                        <th style={{ border: '1px solid #000', padding: '10px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>ชื่อแบรนด์</th>
                                        <th style={{ border: '1px solid #000', padding: '10px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center', width: '120px' }}>จำนวน (หน่วย)</th>
                                        <th style={{ border: '1px solid #000', padding: '10px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productRows.map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>
                                                {item.name ? idx + 1 : '\u00A0'}
                                            </td>
                                            <td style={{ border: '1px solid #000', padding: '10px 15px', textAlign: 'left' }}>
                                                {item.name || '\u00A0'}
                                            </td>
                                            <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>
                                                {item.brand || '\u00A0'}
                                            </td>
                                            <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>
                                                {item.qty || '\u00A0'}
                                            </td>
                                            <td style={{ border: '1px solid #000', padding: '10px 15px', textAlign: 'left' }}>
                                                {item.notes || '\u00A0'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* ════════ SPACER ════════ */}
                            <div style={{ height: '30px' }} />

                            {/* ════════ APPROVAL TABLE ════════ */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                                <thead>
                                    {/* Title Row */}
                                    <tr>
                                        <td colSpan={4} style={{ border: '1px solid #000', padding: '10px 0', textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                                            คำสั่งผลิต
                                        </td>
                                    </tr>
                                    {/* Roles Header */}
                                    <tr>
                                        <th style={{ border: '1px solid #000', padding: '10px', background: '#f5f5f5', width: '25%', textAlign: 'center' }}>ผู้ขอสั่งผลิต</th>
                                        <th style={{ border: '1px solid #000', padding: '10px', background: '#f5f5f5', width: '25%', textAlign: 'center' }}>ผู้ตรวจสอบ</th>
                                        <th style={{ border: '1px solid #000', padding: '10px', background: '#f5f5f5', width: '25%', textAlign: 'center' }}>ผู้อนุมัติ</th>
                                        <th style={{ border: '1px solid #000', padding: '10px', background: '#f5f5f5', width: '25%', textAlign: 'center' }}>ผู้รับผิดชอบ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Signature Row */}
                                    <tr>
                                        <td style={{ border: '1px solid #000', height: '70px', verticalAlign: 'bottom', paddingBottom: '5px', textAlign: 'center', position: 'relative' }}>
                                            {reqSig && (
                                                <img src={reqSig} alt="ลายเซ็น" style={{ maxHeight: '55px', position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1 }} onError={(e) => { e.target.style.display = 'none'; }} />
                                            )}
                                            <div style={{ position: 'relative', zIndex: 2 }}>...............................</div>
                                        </td>
                                        <td style={{ border: '1px solid #000', height: '70px', verticalAlign: 'bottom', paddingBottom: '5px', textAlign: 'center', position: 'relative' }}>
                                            {checkSig && (
                                                <img src={checkSig} alt="ลายเซ็น" style={{ maxHeight: '55px', position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1 }} onError={(e) => { e.target.style.display = 'none'; }} />
                                            )}
                                            <div style={{ position: 'relative', zIndex: 2 }}>...............................</div>
                                        </td>
                                        <td style={{ border: '1px solid #000', height: '70px', verticalAlign: 'bottom', paddingBottom: '5px', textAlign: 'center', position: 'relative' }}>
                                            {appSig && (
                                                <img src={appSig} alt="ลายเซ็น" style={{ maxHeight: '55px', position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1 }} onError={(e) => { e.target.style.display = 'none'; }} />
                                            )}
                                            <div style={{ position: 'relative', zIndex: 2 }}>...............................</div>
                                        </td>
                                        <td style={{ border: '1px solid #000', height: '70px', verticalAlign: 'bottom', paddingBottom: '5px', textAlign: 'center', position: 'relative' }}>
                                            {respSig && (
                                                <img src={respSig} alt="ลายเซ็น" style={{ maxHeight: '55px', position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1 }} onError={(e) => { e.target.style.display = 'none'; }} />
                                            )}
                                            <div style={{ position: 'relative', zIndex: 2 }}>...............................</div>
                                        </td>
                                    </tr>
                                    {/* Name Row */}
                                    <tr>
                                         <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>{reqName}</td>
                                         <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>{checkName}</td>
                                         <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>{appName}</td>
                                         <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>{respName}</td>
                                    </tr>
                                    {/* Department Row */}
                                    <tr>
                                        <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>ฝ่ายวางแผน</td>
                                        <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>ฝ่ายบัญชี</td>
                                        <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>ฝ่ายบริหาร</td>
                                        <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>ฝ่ายผลิต</td>
                                    </tr>
                                    {/* Date Row */}
                                    <tr>
                                         <td style={{ border: '1px solid #000', padding: '10px', fontSize: '12px', textAlign: 'center' }}>
                                             {reqName ? formatShortThaiDate(job.planDate) : '........./........./.........'}
                                         </td>
                                         <td style={{ border: '1px solid #000', padding: '10px', fontSize: '12px', textAlign: 'center' }}>
                                             {checkName ? formatShortThaiDate(job.planDate) : '........./........./.........'}
                                         </td>
                                         <td style={{ border: '1px solid #000', padding: '10px', fontSize: '12px', textAlign: 'center' }}>
                                             {appName ? formatShortThaiDate(job.planDate) : '........./........./.........'}
                                         </td>
                                         <td style={{ border: '1px solid #000', padding: '10px', fontSize: '12px', textAlign: 'center' }}>
                                             {respName ? formatShortThaiDate(job.dueDate || job.planDate) : '........./........./.........'}
                                         </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

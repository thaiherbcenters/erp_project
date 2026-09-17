import React, { forwardRef } from 'react';
import { numberToThaiBaht } from '../utils/thaiBahtConverter';

const renderRemarksHTML = (rawRemarks) => {
    if (!rawRemarks) return '';
    if (!/<[a-z][\s\S]*>/i.test(rawRemarks)) {
        return rawRemarks.replace(/\n/g, '<br/>');
    }
    return rawRemarks;
};

const EliteReceiptPrint = forwardRef(({ data }, ref) => {
    if (!data) return null;

    // Subtotal and Grand Total calculation
    const items = data.items || [];
    let subtotal = 0;
    if (items.length > 0) {
        items.forEach(item => {
            subtotal += Number(item.qty || 1) * Number(item.price || item.amount || 0);
        });
    } else {
        subtotal = Number(data.subtotal || data.grandTotal || 0);
    }

    const grandTotal = Number(data.grandTotal !== undefined ? data.grandTotal : subtotal);

    // Date formatting (Thai Buddhist format: 15 กันยายน 2569)
    let displayDate = '-';
    let autoBookNo = '';
    if (data.docDate) {
        const d = new Date(data.docDate);
        if (!isNaN(d.getTime())) {
            const day = d.getDate();
            const monthStr = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][d.getMonth()];
            const year = d.getFullYear() + 543;
            displayDate = `${day} ${monthStr} ${year}`;
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            autoBookNo = `${year}/${mm}`;
        }
    }

    const bookNo = data.bookNo || autoBookNo;
    const cleanDocNo = data.docNo ? String(data.docNo).replace(/\s*\(Rev\.\d+\)/gi, '').trim() : '-';

    // Formatted items description
    const joinedItemsDesc = data.itemsDesc || (items.length > 0 ? items.map(i => i.desc).filter(Boolean).join(', ') : '-');
    const thaiBahtText = numberToThaiBaht(grandTotal);

    const paymentMethod = data.paymentMethod || 'transfer';

    return (
        <div ref={ref} className="elite-receipt-paper" style={{
            width: '100%',
            maxWidth: '210mm',
            minHeight: '148.5mm', // A5 Landscape
            margin: '0 auto',
            background: '#ffffff',
            padding: '6mm 11mm 6mm 11mm',
            boxSizing: 'border-box',
            position: 'relative',
            fontFamily: "'Sarabun', 'TH Sarabun New', sans-serif",
            color: '#0f172a',
            fontSize: '11pt',
            lineHeight: 1.5
        }}>
            {/* 1. Header Area */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '10px',
                gap: '12px'
            }}>
                {/* Logo */}
                <div style={{ flex: '0 0 100px', textAlign: 'left' }}>
                    <img 
                        src="https://lh3.googleusercontent.com/d/1AOhQw5uKKJYoByWFR5XLW8TV7rxiIVfW" 
                        alt="Logo"
                        style={{ width: '95px', height: 'auto', objectFit: 'contain', marginLeft: '0px' }} 
                    />
                </div>

                {/* Company Info */}
                <div style={{ flex: '1 1 auto', paddingTop: '4px', minWidth: 0 }}>
                    <div style={{ color: '#1a7a3a', fontSize: '13pt', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        บริษัท อิลิท เทรดดิ้ง 2020 จำกัด (สำนักงานใหญ่)
                    </div>
                    <div style={{ fontSize: '10.5pt', fontWeight: 'bold', marginBottom: '2px', color: '#0f172a' }}>
                        ELITE TRADING 2020 CO., LTD.
                    </div>
                    <div style={{ fontSize: '9.5pt', lineHeight: 1.4, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        เลขที่ 6/8 หมู่ที่ 2 ต.ไทรม้า อ.เมืองนนทบุรี จ.นนทบุรี 11000<br />
                        โทรศัพท์ 063-898-9895<br />
                        เลขประจำตัวผู้เสียภาษี 0125563029289
                    </div>
                </div>

                {/* Document Title Badge */}
                <div style={{ flex: '0 0 185px', textAlign: 'center', paddingTop: '4px' }}>
                    {data.docType === 'receipt_tax' ? (
                        <div style={{
                            backgroundColor: '#2ecc71',
                            color: '#ffffff',
                            borderRadius: '24px',
                            padding: '7px 10px',
                            width: '100%',
                            boxSizing: 'border-box',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact',
                            marginBottom: '6px'
                        }}>
                            <div style={{ fontSize: '13.5pt', fontWeight: 'bold' }}>ใบเสร็จ/ใบกำกับภาษี</div>
                            <div style={{ fontSize: '10.5pt', fontWeight: 'bold' }}>RECEIPT/TAX INVOICE</div>
                        </div>
                    ) : (
                        <div style={{
                            backgroundColor: '#2ecc71',
                            color: '#ffffff',
                            borderRadius: '24px',
                            padding: '7px 10px',
                            width: '100%',
                            boxSizing: 'border-box',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact',
                            marginBottom: '6px'
                        }}>
                            <div style={{ fontSize: '14pt', fontWeight: 'bold' }}>ใบเสร็จรับเงิน</div>
                            <div style={{ fontSize: '11pt', fontWeight: 'bold', letterSpacing: '0.5px' }}>RECEIPT</div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Document Details */}
            <div style={{ marginBottom: '10px', marginTop: '6px' }}>
                <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 'bold', marginRight: '12px', fontSize: '11.5pt' }}>เล่มที่</span>
                        <span style={{ fontSize: '11pt', fontWeight: 500 }}>{bookNo || '-'}</span>
                    </div>
                    <div style={{ width: '185px', display: 'flex', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 'bold', marginRight: '12px', fontSize: '11.5pt' }}>เลขที่</span>
                        <span style={{ fontSize: '11pt', fontWeight: 500 }}>{cleanDocNo}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 'bold', marginRight: '6px', fontSize: '11.5pt' }}>เลขประจำตัวผู้เสียภาษีอากร :</span>
                        <span style={{ fontSize: '11pt', fontWeight: 500 }}>{data.customerTaxId || '-'}</span>
                    </div>
                    <div style={{ width: '185px', display: 'flex', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 'bold', marginRight: '12px', fontSize: '11.5pt' }}>วันที่</span>
                        <span style={{ fontSize: '11pt', fontWeight: 500 }}>{displayDate}</span>
                    </div>
                </div>
            </div>

            {/* 3. Content Section */}
            <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'baseline' }}>
                    <div style={{ width: '130px', fontWeight: 'bold', fontSize: '11.5pt', flexShrink: 0 }}>ได้รับเงินจาก</div>
                    <div style={{ fontSize: '11pt', fontWeight: 500, flexGrow: 1 }}>{data.customerName || '-'}</div>
                </div>

                <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
                    <div style={{ width: '130px', fontWeight: 'bold', fontSize: '11.5pt', flexShrink: 0 }}>ที่อยู่</div>
                    <div style={{ fontSize: '11pt', fontWeight: 500, flexGrow: 1, lineHeight: 1.4 }}>{data.customerAddress || '-'}</div>
                </div>

                <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'flex-start' }}>
                    <div style={{ width: '130px', fontWeight: 'bold', fontSize: '11.5pt', flexShrink: 0 }}>เป็นการชำระค่า</div>
                    <div style={{ fontSize: '11pt', fontWeight: 500, flexGrow: 1, minHeight: '24px', lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {joinedItemsDesc}
                    </div>
                </div>
            </div>

            {/* 4. Total Amount Section */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                margin: '14px 0',
                gap: '15px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '10px', fontSize: '11.5pt' }}>รวมเงิน</span>
                    <span style={{
                        backgroundColor: '#d5f5e3',
                        padding: '5px 14px',
                        minWidth: '100px',
                        textAlign: 'center',
                        borderRadius: '2px',
                        fontWeight: 'bold',
                        fontSize: '11.5pt',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                    }}>
                        {Number(grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '10px', fontSize: '11.5pt' }}>จำนวนเงิน(ตัวอักษร)</span>
                    <span style={{
                        backgroundColor: '#d5f5e3',
                        padding: '5px 12px',
                        fontWeight: 'bold',
                        fontSize: thaiBahtText.length > 45 ? '9.5pt' : (thaiBahtText.length > 35 ? '10.5pt' : '11pt'),
                        textAlign: 'center',
                        flexGrow: 1,
                        lineHeight: 1.4,
                        borderRadius: '2px',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                    }}>
                        {thaiBahtText}
                    </span>
                </div>
            </div>

            {/* 5. Payment Method */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: '12px',
                marginBottom: '16px',
                fontSize: '11pt'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '18px' }}>
                    <span style={{
                        width: '16px',
                        height: '16px',
                        border: '1.5px solid #000',
                        display: 'inline-flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: '8px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        paddingBottom: '2px',
                        boxSizing: 'border-box'
                    }}>
                        {paymentMethod === 'cash' ? '✓' : ''}
                    </span>
                    <span style={{ fontWeight: 'bold' }}>เงินสด</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginRight: '18px' }}>
                    <span style={{
                        width: '16px',
                        height: '16px',
                        border: '1.5px solid #000',
                        display: 'inline-flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: '8px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        paddingBottom: '2px',
                        boxSizing: 'border-box'
                    }}>
                        {paymentMethod === 'transfer' ? '✓' : ''}
                    </span>
                    <span style={{ fontWeight: 'bold' }}>โอนเงิน</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, whiteSpace: 'nowrap' }}>
                    <span style={{
                        width: '16px',
                        height: '16px',
                        border: '1.5px solid #000',
                        display: 'inline-flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: '8px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        paddingBottom: '2px',
                        boxSizing: 'border-box'
                    }}>
                        {paymentMethod === 'check' ? '✓' : ''}
                    </span>
                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>เช็คธนาคาร</span>
                    <span style={{
                        borderBottom: '1.5px dotted #000',
                        display: 'inline-block',
                        textAlign: 'center',
                        height: '18px',
                        margin: '0 4px',
                        flex: 2,
                        fontWeight: 500
                    }}>
                        {paymentMethod === 'check' ? (data.bankName || '') : ''}
                    </span>

                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>สาขา</span>
                    <span style={{
                        borderBottom: '1.5px dotted #000',
                        display: 'inline-block',
                        textAlign: 'center',
                        height: '18px',
                        margin: '0 4px',
                        flex: 1.2,
                        fontWeight: 500
                    }}>
                        {paymentMethod === 'check' ? (data.bankBranch || '') : ''}
                    </span>

                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>เลขที่</span>
                    <span style={{
                        borderBottom: '1.5px dotted #000',
                        display: 'inline-block',
                        textAlign: 'center',
                        height: '18px',
                        margin: '0 4px',
                        flex: 1.5,
                        fontWeight: 500
                    }}>
                        {paymentMethod === 'check' ? (data.checkNo || '') : ''}
                    </span>

                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>ลงวันที่</span>
                    <span style={{
                        borderBottom: '1.5px dotted #000',
                        display: 'inline-block',
                        textAlign: 'center',
                        height: '18px',
                        margin: '0 4px',
                        flex: 1.2,
                        fontWeight: 500
                    }}>
                        {paymentMethod === 'check' && data.checkDate ? String(data.checkDate).split('-').reverse().join('/') : ''}
                    </span>
                </div>
            </div>

            {/* 6. Signatures */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                marginTop: '22px',
                marginBottom: '12px'
            }}>
                <div style={{ width: '35%', textAlign: 'center', fontSize: '11pt', paddingTop: '32px' }}>
                    <div style={{ borderBottom: '1px solid #000', width: '100%', margin: '0 auto 5px auto' }}></div>
                    <div style={{ fontWeight: 'bold' }}>(ผู้รับเงิน)</div>
                </div>
                <div style={{ width: '35%', textAlign: 'center', fontSize: '11pt', paddingTop: '32px' }}>
                    <div style={{ borderBottom: '1px solid #000', width: '100%', margin: '0 auto 5px auto' }}></div>
                    <div style={{ fontWeight: 'bold' }}>(ผู้รับมอบอำนาจ)</div>
                </div>
            </div>

            {/* 7. Remarks Footer */}
            <div style={{
                display: 'flex',
                fontSize: '10.5pt',
                marginTop: '8px',
                lineHeight: 1.4,
                color: '#000000'
            }}>
                <div style={{ fontWeight: 'bold', marginRight: '10px', whiteSpace: 'nowrap', color: '#000000' }}>
                    หมายเหตุ
                </div>
                <div 
                    className="print-notes-container" 
                    style={{ color: '#000000', flexGrow: 1 }}
                    dangerouslySetInnerHTML={{
                        __html: data?.remarks 
                            ? renderRemarksHTML(data.remarks) 
                            : '<p>ใบเสร็จรับเงินฉบับนี้จะสมบูรณ์เมื่อมีลายเซ็นของพนักงานการเงินและผู้รับมอบอำนาจ หากชำระเงินด้วยเช็ค</p><p>ใบเสร็จรับเงินจะสมบูรณ์เมื่อ บริษัท อิลิท เทรดดิ้ง 2020 จำกัด ได้รับเงินตามเช็คเรียบร้อยแล้ว</p>'
                    }}
                />
            </div>
        </div>
    );
});

export default EliteReceiptPrint;

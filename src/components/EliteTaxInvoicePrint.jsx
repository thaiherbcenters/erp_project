import React, { forwardRef } from 'react';
import { numberToThaiBaht } from '../utils/thaiBahtConverter';

const renderRemarksHTML = (rawRemarks) => {
    if (!rawRemarks) return '';
    if (!/<[a-z][\s\S]*>/i.test(rawRemarks)) {
        return rawRemarks.replace(/\n/g, '<br/>');
    }
    return rawRemarks;
};

const EliteTaxInvoicePrint = forwardRef(({ data }, ref) => {
    if (!data) return null;

    const items = data.items || [];
    let subtotal = 0;
    items.forEach(item => {
        subtotal += Number(item.qty || 0) * Number(item.price || 0);
    });
    
    const discount = Number(data.discount || 0);
    let afterDiscount = subtotal - discount;
    if (afterDiscount < 0) afterDiscount = 0;
    
    const vat = data.includeVat ? (afterDiscount * 0.07) : 0;
    const grandTotal = afterDiscount + vat;
    const depositAmount = Number(data.depositAmount || 0);
    const remainingBalance = Number(data.remainingBalance !== undefined ? data.remainingBalance : (grandTotal - depositAmount));
    const hasDeposit = depositAmount > 0;

    let displayDate = '-';
    if (data.docDate) {
        const d = new Date(data.docDate);
        const day = String(d.getDate()).padStart(2, '0');
        const monthStr = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][d.getMonth()];
        const year = d.getFullYear() + 543;
        displayDate = `${day} ${monthStr} ${String(year).substring(2, 4)}`;
    }

    // Calculate empty rows so that the document fits comfortably on exactly 1 page of A4
    const baseMinRows = hasDeposit ? 5 : 6;
    let emptyCount = baseMinRows - items.length;
    if (emptyCount < 1) emptyCount = 1;
    const emptyRows = Array.from({ length: emptyCount });

    return (
        <div ref={ref} className="elite-print-paper" style={{
            width: '100%', maxWidth: '210mm', minHeight: '275mm', margin: '0 auto', background: '#fff', 
            padding: '5mm 10mm', boxSizing: 'border-box', position: 'relative',
            fontFamily: "'Sarabun', sans-serif", color: '#000'
        }}>
            {/* Header */}
            <table style={{ width: '100%', borderBottom: '2px solid #000', marginBottom: '10px', borderCollapse: 'collapse' }}>
                <tbody>
                    <tr>
                        <td style={{ width: '18%', paddingRight: '15px', verticalAlign: 'top', textAlign: 'right' }}>
                            <img 
                                src="/images/logos/logo-elite.png" 
                                alt="Logo" 
                                style={{ maxWidth: '130px', maxHeight: '130px', objectFit: 'contain', display: 'inline-block' }} 
                                onError={(e) => {
                                    if (!e.target.dataset.tried) {
                                        e.target.dataset.tried = 'true';
                                        e.target.src = '/images/logos/logo-elt.png';
                                    }
                                }}
                            />
                        </td>
                        <td style={{ width: '82%', verticalAlign: 'top', paddingTop: '10px', paddingRight: '60px', position: 'relative', textAlign: 'left' }}>
                            <div style={{ color: '#1a7a3a', fontSize: '16pt', fontWeight: 'bold', marginBottom: '4px', whiteSpace: 'nowrap' }}>บริษัท อิลิท เทรดดิ้ง 2020 จำกัด (สำนักงานใหญ่)</div>
                            <div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '4px' }}>ELITE TRADING 2020 CO., LTD.</div>
                            <div style={{ fontSize: '11pt', lineHeight: 1.5, marginBottom: '5px' }}>
                                เลขที่ 6/8 หมู่ที่ 2 ต.ไทรม้า อ.เมืองนนทบุรี จ.นนทบุรี 11000<br />
                                โทรศัพท์ 063-898-9895 - เลขประจำตัวผู้เสียภาษี 0125563029289
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Title */}
            <div style={{ width: '100%', textAlign: 'center', position: 'relative', margin: '10px 0' }}>
                <div style={{
                    border: '1.5px solid #2ecc71', borderRadius: '10px', display: 'inline-block',
                    padding: '4px 30px', background: '#2ecc71', color: 'white',
                    WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
                }}>
                    <div style={{ fontSize: '16pt', fontWeight: 'bold' }}>ใบวางบิล/ใบแจ้งหนี้/ใบกำกับภาษี</div>
                    <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>BILLING NOTE/INVOICE/TAX INVOICE</div>
                </div>
            </div>

            {/* Info Boxes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ width: '55%', border: '1.5px solid #000', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>ลูกค้า</td>
                                <td style={{ padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>{data.customerName || '-'}</td>
                            </tr>
                            <tr>
                                <td style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>ที่อยู่</td>
                                <td style={{ padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top', height: '48px' }}>
                                    {data.customerAddress || '-'}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>โทร</td>
                                <td style={{ padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>{data.customerPhone || '-'}</td>
                            </tr>
                            <tr>
                                <td style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>เลขประจำตัวผู้เสียภาษี</td>
                                <td style={{ padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>{data.customerTaxId || '-'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div style={{ width: '43%', border: '1.5px solid #000', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>เลขที่เอกสาร</td>
                                <td style={{ padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>
                                    {data.docNo ? String(data.docNo).replace(/\s*\(Rev\.\d+\)/gi, '').trim() : '-'}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>วันที่</td>
                                <td style={{ padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>{displayDate}</td>
                            </tr>
                            <tr>
                                <td style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>เงื่อนไขการชำระเงิน</td>
                                <td style={{ padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>{data.paymentTerm || '-'}</td>
                            </tr>
                            <tr>
                                <td style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>ผู้ติดต่อ</td>
                                <td style={{ padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>{data.contactPerson || '-'}</td>
                            </tr>
                            <tr>
                                <td style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>อ้างถึง</td>
                                <td style={{ padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>{data.reference || '-'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', border: 'none' }}>
                <thead>
                    <tr>
                        <th style={{ border: '1px solid #000', padding: '6px 2px', fontSize: '10.5pt', fontWeight: 'bold', textAlign: 'center', background: '#d5f5e3', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', width: '6%' }}>ลำดับ</th>
                        <th style={{ border: '1px solid #000', padding: '6px 2px', fontSize: '10.5pt', fontWeight: 'bold', textAlign: 'center', background: '#d5f5e3', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', width: '54%' }}>รายการ</th>
                        <th style={{ border: '1px solid #000', padding: '6px 2px', fontSize: '10.5pt', fontWeight: 'bold', textAlign: 'center', background: '#d5f5e3', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', width: '6%' }}>จำนวน</th>
                        <th style={{ border: '1px solid #000', padding: '6px 2px', fontSize: '10.5pt', fontWeight: 'bold', textAlign: 'center', background: '#d5f5e3', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', width: '6%' }}>หน่วย</th>
                        <th style={{ border: '1px solid #000', padding: '6px 2px', fontSize: '10.5pt', fontWeight: 'bold', textAlign: 'center', background: '#d5f5e3', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', width: '12%' }}>ราคา/หน่วย</th>
                        <th style={{ border: '1px solid #000', padding: '6px 2px', fontSize: '10.5pt', fontWeight: 'bold', textAlign: 'center', background: '#d5f5e3', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', width: '16%' }}>จำนวนเงิน</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #cbd5e1' }}>
                            <td style={{ border: '1px solid #000', borderTop: 'none', borderBottom: 'none', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top', textAlign: 'center' }}>{index + 1}</td>
                            <td style={{ border: '1px solid #000', borderTop: 'none', borderBottom: 'none', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top' }}>{item.desc}</td>
                            <td style={{ border: '1px solid #000', borderTop: 'none', borderBottom: 'none', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top', textAlign: 'center' }}>{item.qty}</td>
                            <td style={{ border: '1px solid #000', borderTop: 'none', borderBottom: 'none', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top', textAlign: 'center' }}>{item.unit}</td>
                            <td style={{ border: '1px solid #000', borderTop: 'none', borderBottom: 'none', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top', textAlign: 'right' }}>{Number(item.price || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td style={{ border: '1px solid #000', borderTop: 'none', borderBottom: 'none', padding: '4px 6px', fontSize: '11pt', verticalAlign: 'top', textAlign: 'right' }}>{(Number(item.qty || 0) * Number(item.price || 0)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                    ))}
                    
                    {emptyRows.map((_, index) => {
                        const isLast = index === emptyRows.length - 1;
                        return (
                            <tr key={`empty-${index}`} style={{ height: '28px', borderBottom: isLast ? '1.5px solid #000' : '1px solid #cbd5e1' }}>
                                <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000' }}></td>
                                <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000' }}></td>
                                <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000' }}></td>
                                <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000' }}></td>
                                <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000' }}></td>
                                <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000' }}></td>
                            </tr>
                        );
                    })}
                </tbody>
                <tbody style={{ borderTop: '1.5px solid #000', pageBreakInside: 'avoid' }}>
                    <tr style={{ borderBottom: 'none' }}>
                        <td colSpan="2" rowSpan={hasDeposit ? 6 : 4} style={{ padding: '5px 10px', verticalAlign: 'middle', border: 'none' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '11pt', color: '#dc2626', marginBottom: '5px' }}>ช่องทางการชำระเงิน :</div>
                            <div style={{ border: '1.5px dashed #000', borderRadius: '8px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '20px', boxSizing: 'border-box' }}>
                                <img src="https://lh3.googleusercontent.com/d/1GNinU6QiQbvKMnb07_Le0tW6LNL_Nf_h" alt="Bank" style={{ width: '55px', height: '55px' }} />
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '14pt' }}>ธนาคารกสิกรไทย</div>
                                    <div style={{ fontSize: '12pt' }}>บจก. อิลิท เทรดดิ้ง 2020</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '15pt', color: '#16a34a' }}>083-3-95366-4</div>
                                </div>
                            </div>
                        </td>
                        <td colSpan="3" style={{ fontWeight: 'bold', padding: '4px 10px', fontSize: '11pt', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: 'none' }}>รวมเป็นเงิน</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '4px', fontSize: '11pt', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: '1px solid #cbd5e1' }}>{subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                    <tr style={{ borderBottom: 'none' }}>
                        <td colSpan="3" style={{ fontWeight: 'bold', padding: '4px 10px', fontSize: '11pt', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: 'none' }}>หักส่วนลด</td>
                        <td style={{ textAlign: 'right', padding: '4px', fontSize: '11pt', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: '1px solid #cbd5e1' }}>{discount > 0 ? discount.toLocaleString('en-US', {minimumFractionDigits: 2}) : '-'}</td>
                    </tr>
                    <tr style={{ borderBottom: 'none' }}>
                        <td colSpan="3" style={{ fontWeight: 'bold', padding: '4px 10px', fontSize: '11pt', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: 'none' }}>จำนวนเงินหลังหักส่วนลด</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '4px', fontSize: '11pt', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: '1px solid #cbd5e1' }}>{afterDiscount.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                    <tr style={{ borderBottom: 'none' }}>
                        <td colSpan="3" style={{ fontWeight: 'bold', padding: '4px 10px', fontSize: '11pt', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: 'none' }}>ภาษีมูลค่าเพิ่ม 7%</td>
                        <td style={{ textAlign: 'right', padding: '4px', fontSize: '11pt', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: '1px solid #cbd5e1' }}>{vat > 0 ? vat.toLocaleString('en-US', {minimumFractionDigits: 2}) : '-'}</td>
                    </tr>
                    {hasDeposit && (
                        <>
                            <tr style={{ borderBottom: 'none' }}>
                                <td colSpan="3" style={{ fontWeight: 'bold', padding: '4px 10px', fontSize: '11pt', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: 'none' }}>
                                    ยอดชำระมัดจำ {data.depositPercent ? `(${data.depositPercent}%)` : ''}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '4px', fontSize: '11pt', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: '1px solid #cbd5e1' }}>
                                    {depositAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                            <tr style={{ borderBottom: 'none' }}>
                                <td colSpan="3" style={{ fontWeight: 'bold', padding: '4px 10px', fontSize: '11pt', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: 'none', color: '#dc2626' }}>
                                    ยอดคงเหลือที่ต้องชำระ
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '4px', fontSize: '11pt', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: '1px solid #cbd5e1', color: '#dc2626' }}>
                                    {remainingBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        </>
                    )}
                    
                    <tr style={{ borderBottom: 'none' }}>
                        <td colSpan="2" style={{ padding: '4px 10px', verticalAlign: 'middle', border: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', justifyContent: 'center' }}>
                                <div style={{ fontSize: '11pt' }}>ตัวอักษร</div>
                                <div style={{ border: '1.5px solid #000', borderRadius: '8px', flexGrow: 1, padding: '2px 10px', textAlign: 'center', fontSize: '11pt', background: '#d5f5e3', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                    {numberToThaiBaht(grandTotal)}
                                </div>
                            </div>
                        </td>
                        <td colSpan="3" style={{ fontWeight: 'bold', padding: '4px 10px', fontSize: '11pt', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: 'none' }}>จำนวนเงินรวมทั้งสิ้น</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '4px', fontSize: '11pt', background: '#d5f5e3', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', borderRight: '1px solid #000', borderLeft: 'none', borderTop: 'none', borderBottom: '3px double #000' }}>{grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                </tbody>
            </table>

            {/* Remarks */}
            <div style={{ marginTop: '10px', fontSize: '10.5pt', lineHeight: 1.4, color: '#000000' }}>
                <div style={{ fontWeight: 'bold', fontSize: '11pt', color: '#000000' }}>หมายเหตุ</div>
                {data.remarks && (
                    <div 
                        className="print-notes-container" 
                        style={{ fontSize: '10pt', marginTop: '2px', color: '#000000' }}
                        dangerouslySetInnerHTML={{ __html: renderRemarksHTML(data.remarks) }}
                    />
                )}
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', pageBreakInside: 'avoid' }}>
                <div style={{ width: '48%', border: '1.5px solid #000', borderRadius: '12px', padding: '10px 14px', boxSizing: 'border-box', fontSize: '10.5pt' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '10px' }}>
                        <div style={{ width: '100px' }}>ผู้รับวางบิล</div>
                        <div style={{ flexGrow: 1, borderBottom: '1.5px dashed #000' }}></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '10px' }}>
                        <div style={{ width: '100px' }}>วันที่รับวางบิล</div>
                        <div style={{ flexGrow: 1, borderBottom: '1.5px dashed #000' }}></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{ width: '100px' }}>วันที่นัดรับเช็ค</div>
                        <div style={{ flexGrow: 1, borderBottom: '1.5px dashed #000' }}></div>
                    </div>
                </div>
                
                <div style={{ width: '48%', border: '1.5px solid #000', borderRadius: '12px', padding: '10px 14px', boxSizing: 'border-box', fontSize: '10.5pt', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <div style={{ width: '75%', margin: '0 auto 8px auto' }}>
                        <div style={{ borderBottom: '1.5px dashed #000', width: '100%' }}></div>
                    </div>
                    <div style={{ marginBottom: '8px' }}>ผู้มีอำนาจลงนาม</div>
                    <div>บริษัท อิลิท เทรดดิ้ง 2020 จำกัด</div>
                </div>
            </div>

        </div>
    );
});

export default EliteTaxInvoicePrint;

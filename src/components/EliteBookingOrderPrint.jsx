import React, { forwardRef } from 'react';
import { numberToThaiBaht } from '../utils/thaiBahtConverter';
import { SYSTEM_BANKS } from './BankAccountSelect';

const resolveBankDetails = (bankAccount) => {
    if (!bankAccount) {
        return {
            bankName: 'ธนาคารกสิกรไทย',
            accountName: 'บจก. อิลิท เทรดดิ้ง 2020',
            accountNo: '083-3-95366-4',
            logo: '/images/banks/bank-kbank.png'
        };
    }

    if (typeof bankAccount === 'string' && (bankAccount.startsWith('{') || bankAccount.includes('"bankName"'))) {
        try {
            const parsed = JSON.parse(bankAccount);
            return {
                bankName: parsed.bankName || 'ธนาคารกสิกรไทย',
                accountName: parsed.accountName || 'บจก. อิลิท เทรดดิ้ง 2020',
                accountNo: parsed.accountNo || '083-3-95366-4',
                logo: parsed.logo || null
            };
        } catch {}
    }

    if (typeof bankAccount === 'object') {
        return {
            bankName: bankAccount.bankName || 'ธนาคารกสิกรไทย',
            accountName: bankAccount.accountName || 'บจก. อิลิท เทรดดิ้ง 2020',
            accountNo: bankAccount.accountNo || '083-3-95366-4',
            logo: bankAccount.logo || null
        };
    }

    const sys = (SYSTEM_BANKS || []).find(b => b.id === bankAccount);
    if (sys) {
        return {
            bankName: sys.bankName,
            accountName: sys.accountName,
            accountNo: sys.accountNo,
            logo: sys.logo
        };
    }

    return {
        bankName: 'ธนาคารกสิกรไทย',
        accountName: 'บจก. อิลิท เทรดดิ้ง 2020',
        accountNo: '083-3-95366-4',
        logo: '/images/banks/bank-kbank.png'
    };
};

const renderRemarksHTML = (rawRemarks) => {
    if (!rawRemarks) return '-';
    if (!/<[a-z][\s\S]*>/i.test(rawRemarks)) {
        return rawRemarks.replace(/\n/g, '<br/>');
    }
    return rawRemarks;
};

const EliteBookingOrderPrint = forwardRef(({ data }, ref) => {
    if (!data) return null;

    const bankInfo = resolveBankDetails(data.bankAccount);

    const items = data.items || [];
    let subtotal = 0;
    items.forEach(item => {
        if (!item.isHeading) {
            subtotal += Number(item.qty || 0) * Number(item.price || 0);
        }
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
        if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear() + 543;
            displayDate = `${day}/${month}/${year}`;
        }
    }

    // Dynamic row calculation so that it fits nicely on 1 page of A4
    const validItemsCount = items.length;
    const baseMinRows = hasDeposit ? 5 : 7;
    let emptyCount = baseMinRows - validItemsCount;
    if (emptyCount < 1) emptyCount = 1;
    const emptyRows = Array.from({ length: emptyCount });

    // Right summary rows count
    let rightRows = 1; // Subtotal
    if (discount > 0) rightRows += 2; // Discount + After discount
    if (vat > 0) rightRows += 1; // VAT
    if (hasDeposit) rightRows += 2; // Deposit + Remaining balance

    return (
        <div ref={ref} className="elite-print-paper" style={{
            width: '100%', maxWidth: '210mm', minHeight: '275mm', margin: '0 auto', background: '#fff',
            padding: '8mm 12mm', boxSizing: 'border-box', position: 'relative',
            fontFamily: "'Sarabun', Arial, sans-serif", color: '#000', fontSize: '10pt', lineHeight: 1.4,
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
        }}>
            <style>{`
                .print-remarks-content p {
                    margin: 0 0 2px 0 !important;
                    line-height: 1.4 !important;
                }
            `}</style>
            {/* Header */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '8px' }}>
                <tbody>
                    <tr>
                        <td style={{ width: '16%', textAlign: 'center', verticalAlign: 'middle', border: 'none', padding: '2px' }}>
                            <img
                                src="/images/logos/logo-elite.png"
                                alt="Logo"
                                style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'contain' }}
                                onError={(e) => {
                                    if (!e.target.dataset.tried) {
                                        e.target.dataset.tried = 'true';
                                        e.target.src = '/images/logos/logo-elt.png';
                                    }
                                }}
                            />
                        </td>
                        <td style={{ width: '54%', padding: '2px 10px', verticalAlign: 'middle', border: 'none' }}>
                            <div style={{ color: '#1a7a3a', fontWeight: 'bold', fontSize: '13.5pt', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                                บริษัท อิลิท เทรดดิ้ง 2020 จำกัด
                            </div>
                            <div style={{ fontSize: '9pt', marginTop: '1px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                ELITE TRADING 2020 CO., LTD.
                            </div>
                            <div style={{ fontSize: '9pt', marginTop: '1px' }}>
                                เลขที่ 6/8 หมู่ที่ 2 ต.ไทรม้า อ.เมืองนนทบุรี จ.นนทบุรี 11000
                            </div>
                            <div style={{ fontSize: '9pt', marginTop: '1px' }}>
                                โทรศัพท์ 063-898-9895 - เลขประจำตัวผู้เสียภาษี 0125563029289
                            </div>
                        </td>
                        <td style={{ width: '30%', textAlign: 'center', verticalAlign: 'middle', border: 'none', padding: '4px' }}>
                            <div style={{
                                backgroundColor: '#2ecc71', color: 'white', borderRadius: '25px', padding: '8px 10px',
                                textAlign: 'center', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
                            }}>
                                <div style={{ fontSize: '15pt', fontWeight: 'bold', whiteSpace: 'nowrap' }}>ใบสั่งจอง</div>
                                <div style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '2px', letterSpacing: '0.5px' }}>BOOKING ORDER</div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Info Boxes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', gap: '10px' }}>
                {/* Customer Box */}
                <div className="customer-info-box" style={{ width: '65%', border: '1.5px solid #1a7a3a', borderRadius: '8px', padding: '6px 12px', boxSizing: 'border-box' }}>
                    <table style={{ width: '100%', border: 'none', fontSize: '10pt', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '32%', fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top' }}>
                                    ชื่อลูกค้า :<br />
                                    <span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>Customer Name</span>
                                </td>
                                <td style={{ width: '68%', padding: '2px 0', verticalAlign: 'top', fontWeight: '500' }}>
                                    {data.customerName || '-'}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top' }}>
                                    ที่อยู่ :<br />
                                    <span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>Address</span>
                                </td>
                                <td style={{ padding: '2px 0', verticalAlign: 'top', minHeight: '35px', wordBreak: 'break-word' }}>
                                    {data.customerAddress || '-'}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top' }}>
                                    โทรศัพท์ :<br />
                                    <span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>Tel. No.</span>
                                </td>
                                <td style={{ padding: '2px 0', verticalAlign: 'top' }}>
                                    {data.customerPhone || '-'}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 'bold', padding: '2px 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                    เลขประจำตัวผู้เสียภาษี :<br />
                                    <span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>TAX ID</span>
                                </td>
                                <td style={{ padding: '2px 0', verticalAlign: 'top' }}>
                                    {data.customerTaxId || '-'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Doc Info Box */}
                <div className="doc-info-box" style={{ width: '35%', border: '1.5px solid #1a7a3a', borderRadius: '8px', overflow: 'hidden', boxSizing: 'border-box' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                        <tbody>
                            <tr style={{ backgroundColor: '#d5f5e3', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                <td style={{ width: '40%', fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #1a7a3a' }}>
                                    เลขที่ :<br />
                                    <span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>No.</span>
                                </td>
                                <td style={{ width: '60%', padding: '4px 8px', borderBottom: '1px solid #1a7a3a', fontWeight: 'bold', color: '#1a7a3a' }}>
                                    {data.docNo || '-'}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #1a7a3a' }}>
                                    วันที่ :<br />
                                    <span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>Date</span>
                                </td>
                                <td style={{ padding: '4px 8px', borderBottom: '1px solid #1a7a3a' }}>
                                    {displayDate}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #1a7a3a' }}>
                                    สถานที่ส่ง :<br />
                                    <span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>Deliver To</span>
                                </td>
                                <td style={{ padding: '4px 8px', borderBottom: '1px solid #1a7a3a' }}>
                                    {data.deliverTo || '-'}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 'bold', padding: '4px 8px' }}>
                                    ติดต่อ :<br />
                                    <span style={{ fontWeight: 'normal', fontSize: '8pt', color: '#555' }}>Contact</span>
                                </td>
                                <td style={{ padding: '4px 8px' }}>
                                    {data.contactPerson || '-'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Items Table Container */}
            <div className="booking-items-table-container" style={{ border: '1.5px solid #1a7a3a', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                        <tr style={{
                            backgroundColor: '#d5f5e3', color: '#000', textAlign: 'center', fontWeight: 'bold',
                            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
                        }}>
                            <th style={{ width: '7%', borderRight: '1px solid #1a7a3a', borderBottom: '1px solid #1a7a3a', padding: '5px 4px', fontSize: '9.5pt' }}>
                                ลำดับ<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>No</span>
                            </th>
                            <th style={{ width: '45%', borderRight: '1px solid #1a7a3a', borderBottom: '1px solid #1a7a3a', padding: '5px 8px', fontSize: '9.5pt', textAlign: 'left' }}>
                                รายละเอียด<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Description</span>
                            </th>
                            <th style={{ width: '9%', borderRight: '1px solid #1a7a3a', borderBottom: '1px solid #1a7a3a', padding: '5px 4px', fontSize: '9.5pt' }}>
                                จำนวน<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Qty</span>
                            </th>
                            <th style={{ width: '9%', borderRight: '1px solid #1a7a3a', borderBottom: '1px solid #1a7a3a', padding: '5px 4px', fontSize: '9.5pt' }}>
                                หน่วย<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Unit</span>
                            </th>
                            <th style={{ width: '15%', borderRight: '1px solid #1a7a3a', borderBottom: '1px solid #1a7a3a', padding: '5px 6px', fontSize: '9.5pt', textAlign: 'right' }}>
                                ราคา/หน่วย<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Unit Price</span>
                            </th>
                            <th style={{ width: '15%', borderBottom: '1px solid #1a7a3a', padding: '5px 8px', fontSize: '9.5pt', textAlign: 'right' }}>
                                จำนวนเงิน<br /><span style={{ fontWeight: 'normal', fontSize: '8pt' }}>Amount</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            const isHeading = item.isHeading === true || item.isHeading === 'true';
                            if (isHeading) {
                                return (
                                    <tr key={idx} style={{ height: '32px' }}>
                                        <td style={{ textAlign: 'center', borderRight: '1px solid #1a7a3a', padding: '6px 4px' }}></td>
                                        <td style={{ textAlign: 'left', fontWeight: 'bold', color: '#dc2626', borderRight: '1px solid #1a7a3a', padding: '6px 8px' }}>
                                            {item.desc || item.name}
                                        </td>
                                        <td style={{ borderRight: '1px solid #1a7a3a', padding: '6px 4px' }}></td>
                                        <td style={{ borderRight: '1px solid #1a7a3a', padding: '6px 4px' }}></td>
                                        <td style={{ borderRight: '1px solid #1a7a3a', padding: '6px 6px' }}></td>
                                        <td style={{ padding: '6px 8px' }}></td>
                                    </tr>
                                );
                            }

                            const itemQty = item.qty !== undefined && item.qty !== null ? item.qty : '';
                            const itemUnit = item.unit || '';
                            const itemPrice = Number(item.price || 0);
                            const itemAmount = item.amount !== undefined && item.amount !== null && item.amount !== ''
                                ? Number(item.amount)
                                : (Number(itemQty || 0) * itemPrice);
                            const descStyle = item.isSub ? { paddingLeft: '18px', color: '#555' } : {};

                            return (
                                <tr key={idx} style={{ minHeight: '30px' }}>
                                    <td style={{ textAlign: 'center', borderRight: '1px solid #1a7a3a', padding: '6px 4px', verticalAlign: 'top' }}>
                                        {item.seq || (idx + 1)}
                                    </td>
                                    <td style={{ borderRight: '1px solid #1a7a3a', padding: '6px 8px', verticalAlign: 'top', textAlign: 'left', ...descStyle }}>
                                        {item.desc || item.name}
                                    </td>
                                    <td style={{ textAlign: 'center', borderRight: '1px solid #1a7a3a', padding: '6px 4px', verticalAlign: 'top' }}>
                                        {itemQty}
                                    </td>
                                    <td style={{ textAlign: 'center', borderRight: '1px solid #1a7a3a', padding: '6px 4px', verticalAlign: 'top' }}>
                                        {itemUnit}
                                    </td>
                                    <td style={{ textAlign: 'right', borderRight: '1px solid #1a7a3a', padding: '6px 6px', verticalAlign: 'top' }}>
                                        {itemPrice > 0 ? itemPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '6px 8px', verticalAlign: 'top' }}>
                                        {itemAmount > 0 ? itemAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (itemAmount === 0 && (itemQty || itemPrice || (item.amount !== undefined && item.amount !== '')) ? '0.00' : '')}
                                    </td>
                                </tr>
                            );
                        })}

                        {/* Empty spacer rows */}
                        {emptyRows.map((_, i) => (
                            <tr key={`empty_${i}`} style={{ height: '32px' }}>
                                <td style={{ borderRight: '1px solid #1a7a3a' }}></td>
                                <td style={{ borderRight: '1px solid #1a7a3a' }}></td>
                                <td style={{ borderRight: '1px solid #1a7a3a' }}></td>
                                <td style={{ borderRight: '1px solid #1a7a3a' }}></td>
                                <td style={{ borderRight: '1px solid #1a7a3a' }}></td>
                                <td></td>
                            </tr>
                        ))}

                        {/* Summary Section Rows */}
                        <tr>
                            {/* Bank Details on Left */}
                            <td colSpan="2" rowSpan={rightRows} style={{
                                verticalAlign: 'top', padding: '8px 12px', borderRight: '1px solid #1a7a3a', borderTop: '1px solid #1a7a3a'
                            }}>
                                <div style={{ color: '#dc2626', fontSize: '10pt', fontWeight: 'bold', marginBottom: '6px', textAlign: 'left' }}>
                                    ช่องทางการชำระเงิน :
                                </div>
                                <div style={{
                                    border: '1.5px dashed #000', borderRadius: '8px', padding: '10px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '14px', boxSizing: 'border-box'
                                }}>
                                    {bankInfo.logo && (
                                        <img
                                            src={bankInfo.logo}
                                            alt={bankInfo.bankName}
                                            style={{ width: '48px', height: '48px', objectFit: 'contain', flexShrink: 0 }}
                                            onError={(e) => {
                                                if (!e.target.dataset.tried && bankInfo.logo !== '/images/banks/bank-kbank.png') {
                                                    e.target.dataset.tried = 'true';
                                                    e.target.src = '/images/banks/bank-kbank.png';
                                                } else {
                                                    e.target.style.display = 'none';
                                                }
                                            }}
                                        />
                                    )}
                                    <div style={{ textAlign: 'left', fontWeight: 'bold', lineHeight: 1.25 }}>
                                        <div style={{ fontSize: '12pt' }}>{bankInfo.bankName}</div>
                                        <div style={{ fontSize: '10pt', color: '#444' }}>{bankInfo.accountName}</div>
                                        <div style={{ fontSize: '14pt', color: '#16a34a', marginTop: '2px' }}>{bankInfo.accountNo}</div>
                                    </div>
                                </div>
                            </td>
                            {/* Subtotal */}
                            <td colSpan="3" style={{ fontWeight: 'bold', textAlign: 'right', padding: '5px 10px', borderRight: '1px solid #1a7a3a', borderTop: '1px solid #1a7a3a', fontSize: '10pt' }}>
                                รวมเป็นเงิน<br /><span style={{ fontSize: '8.5pt', fontWeight: 'normal', color: '#555' }}>TOTAL</span>
                            </td>
                            <td style={{ textAlign: 'right', padding: '5px 8px', borderTop: '1px solid #1a7a3a', fontSize: '10pt', fontWeight: 'bold' }}>
                                {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>

                        {/* Discount */}
                        {discount > 0 && (
                            <>
                                <tr>
                                    <td colSpan="3" style={{ fontWeight: 'bold', textAlign: 'right', padding: '5px 10px', borderRight: '1px solid #1a7a3a', borderTop: '1px solid #1a7a3a', fontSize: '10pt' }}>
                                        หักส่วนลด<br /><span style={{ fontSize: '8.5pt', fontWeight: 'normal', color: '#555' }}>DISCOUNT</span>
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '5px 8px', borderTop: '1px solid #1a7a3a', fontSize: '10pt' }}>
                                        {discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan="3" style={{ fontWeight: 'bold', textAlign: 'right', padding: '5px 10px', borderRight: '1px solid #1a7a3a', borderTop: '1px solid #1a7a3a', fontSize: '10pt' }}>
                                        จำนวนเงินหลังหักส่วนลด<br /><span style={{ fontSize: '8.5pt', fontWeight: 'normal', color: '#555' }}>AFTER DISCOUNT</span>
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '5px 8px', borderTop: '1px solid #1a7a3a', fontSize: '10pt', fontWeight: 'bold' }}>
                                        {afterDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </>
                        )}

                        {/* VAT */}
                        {vat > 0 && (
                            <tr>
                                <td colSpan="3" style={{ fontWeight: 'bold', textAlign: 'right', padding: '5px 10px', borderRight: '1px solid #1a7a3a', borderTop: '1px solid #1a7a3a', fontSize: '10pt' }}>
                                    ภาษีมูลค่าเพิ่ม 7%<br /><span style={{ fontSize: '8.5pt', fontWeight: 'normal', color: '#555' }}>VAT 7%</span>
                                </td>
                                <td style={{ textAlign: 'right', padding: '5px 8px', borderTop: '1px solid #1a7a3a', fontSize: '10pt' }}>
                                    {vat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        )}

                        {/* Deposit & Remaining */}
                        {hasDeposit && (
                            <>
                                <tr>
                                    <td colSpan="3" style={{ fontWeight: 'bold', textAlign: 'right', padding: '5px 10px', borderRight: '1px solid #1a7a3a', borderTop: '1px solid #1a7a3a', fontSize: '10pt', color: '#000000' }}>
                                        ยอดชำระมัดจำ {data.depositPercent ? `(${data.depositPercent}%)` : ''}<br />
                                        <span style={{ fontSize: '8.5pt', fontWeight: 'normal', color: '#555555' }}>DEPOSIT</span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '5px 8px', borderTop: '1px solid #1a7a3a', fontSize: '10pt', color: '#000000' }}>
                                        {depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan="3" style={{ fontWeight: 'bold', textAlign: 'right', padding: '5px 10px', borderRight: '1px solid #1a7a3a', borderTop: '1px solid #1a7a3a', fontSize: '10pt', color: '#000000' }}>
                                        ยอดคงเหลือที่ต้องชำระ<br />
                                        <span style={{ fontSize: '8.5pt', fontWeight: 'normal', color: '#555555' }}>REMAINING BALANCE</span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '5px 8px', borderTop: '1px solid #1a7a3a', fontSize: '10pt', color: '#000000' }}>
                                        {remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </>
                        )}

                        {/* Grand Total Row */}
                        <tr style={{ backgroundColor: '#d5f5e3', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            <td colSpan="2" style={{
                                textAlign: 'center', fontWeight: 'bold', fontSize: '11pt',
                                borderRight: '1px solid #1a7a3a', borderTop: '1px solid #1a7a3a', padding: '6px 8px'
                            }}>
                                ({numberToThaiBaht(grandTotal)})
                            </td>
                            <td colSpan="3" style={{
                                fontWeight: 'bold', textAlign: 'right', padding: '5px 10px',
                                borderRight: '1px solid #1a7a3a', borderTop: '1px solid #1a7a3a', fontSize: '10pt'
                            }}>
                                รวมเงินทั้งสิ้น<br /><span style={{ fontSize: '8.5pt', fontWeight: 'normal', color: '#555' }}>GRAND TOTAL</span>
                            </td>
                            <td style={{
                                textAlign: 'right', fontWeight: 'bold', textDecoration: 'underline',
                                borderTop: '1px solid #1a7a3a', padding: '6px 8px', fontSize: '11pt', color: '#1a7a3a'
                            }}>
                                {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>

                        {/* Remarks Row */}
                        <tr>
                            <td colSpan="6" style={{
                                padding: '6px 10px', borderTop: '1px solid #1a7a3a', fontSize: '9pt', color: '#000000', textAlign: 'left'
                            }}>
                                {data.remarks && !/หมายเหตุ|เงื่อนไข/i.test(data.remarks) && (
                                    <>
                                        <b>หมายเหตุ:</b><br />
                                    </>
                                )}
                                <div
                                    className="print-remarks-content"
                                    style={{ marginTop: '2px', lineHeight: 1.4 }}
                                    dangerouslySetInnerHTML={{ __html: renderRemarksHTML(data.remarks) }}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', gap: '15px' }}>
                <div className="signature-box" style={{
                    flex: 1, border: '1.5px solid #1a7a3a', borderRadius: '8px', textAlign: 'center',
                    fontSize: '10pt', padding: '16px 10px 10px 10px', position: 'relative'
                }}>
                    <div style={{ height: '35px' }}></div>
                    <div>(.......................................................)</div>
                    <div style={{ marginTop: '4px', fontWeight: 'bold', fontSize: '9.5pt' }}>ผู้จอง</div>
                    <div style={{ marginTop: '3px', fontSize: '8pt', color: '#555' }}>
                        วันที่ / Date {displayDate !== '-' ? displayDate : '......./......./.......'}
                    </div>
                </div>

                <div className="signature-box" style={{
                    flex: 1, border: '1.5px solid #1a7a3a', borderRadius: '8px', textAlign: 'center',
                    fontSize: '10pt', padding: '16px 10px 10px 10px', position: 'relative'
                }}>
                    <div style={{ height: '35px', position: 'relative' }}>
                        {data.signerImage && (
                            <img
                                src={data.signerImage}
                                alt="Signature"
                                style={{ maxHeight: '55px', position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)' }}
                            />
                        )}
                    </div>
                    <div>({data.signerName || '.......................................................'})</div>
                    <div style={{ marginTop: '4px', fontWeight: 'bold', fontSize: '9.5pt' }}>ผู้รับจอง</div>
                    <div style={{ marginTop: '3px', fontSize: '8pt', color: '#555' }}>
                        วันที่ / Date {displayDate !== '-' ? displayDate : '......./......./.......'}
                    </div>
                </div>
            </div>
        </div>
    );
});

EliteBookingOrderPrint.displayName = 'EliteBookingOrderPrint';
export default EliteBookingOrderPrint;

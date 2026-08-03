import React, { useState, useMemo } from 'react';
import { useAlert } from './CustomAlert';

export default function QuotationSelectorModal({
    show,
    onClose,
    quotations,
    selectedQuotationId,
    onSelect
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const { showConfirm } = useAlert();

    const filteredQuotations = useMemo(() => {
        if (!searchTerm.trim()) return quotations;
        const lower = searchTerm.toLowerCase();
        return quotations.filter(q => 
            (q.QuotationNo && q.QuotationNo.toLowerCase().includes(lower)) ||
            (q.CustomerName && q.CustomerName.toLowerCase().includes(lower)) ||
            (q.ProjectName && q.ProjectName.toLowerCase().includes(lower))
        );
    }, [quotations, searchTerm]);

    if (!show) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '10px', width: '700px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '18px' }}>เลือกอ้างอิงใบเสนอราคา</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>&times;</button>
                </div>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #eee' }}>
                    <input 
                        type="text" 
                        placeholder="ค้นหาเลขที่ใบเสนอราคา, ชื่อลูกค้า, ชื่อโปรเจกต์..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                        autoFocus
                    />
                </div>
                
                <div style={{ overflowY: 'auto', flex: 1, padding: '0' }}>
                    <table className="data-table" style={{ border: 'none', minWidth: '100%', borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'center', padding: '12px', width: '60px' }}>เลือก</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'left', padding: '12px' }}>ใบเสนอราคา</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'left', padding: '12px' }}>ชื่อลูกค้า</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'center', padding: '12px' }}>สถานะ</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'right', padding: '12px' }}>ยอดสุทธิ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredQuotations.length > 0 ? filteredQuotations.map(q => {
                                const isSelected = String(q.QuotationID) === String(selectedQuotationId);
                                const isUsed = !!q.IsUsed || q.Status === 'สร้าง SO แล้ว';
                                return (
                                    <tr 
                                        key={q.QuotationID} 
                                        className="hover-row" 
                                        style={{ borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: isSelected ? '#f0fdf4' : (isUsed ? '#fafafa' : 'transparent') }}
                                        onClick={async () => {
                                            if (isSelected) {
                                                onSelect(''); // Uncheck
                                                onClose();
                                            } else {
                                                if (isUsed) {
                                                    const ok = await showConfirm(
                                                        'ใบเสนอราคานี้ถูกใช้งานแล้ว',
                                                        `ใบเสนอราคาเลขที่ ${q.QuotationNo} เคยถูกนำไปออก Sales Order แล้ว\n\nคุณต้องการดึงข้อมูลใบเสนอราคานี้มาเปิด Sales Order เพิ่มเติมใช่หรือไม่?`,
                                                        'warning'
                                                    );
                                                    if (!ok) return;
                                                }
                                                onSelect(q.QuotationID);
                                                onClose();
                                            }
                                        }}
                                    >
                                        <td style={{ textAlign: 'center', padding: '12px' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected}
                                                readOnly
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                                            />
                                        </td>
                                        <td style={{ color: '#4f46e5', fontWeight: '600', padding: '12px' }}>{q.QuotationNo}</td>
                                        <td style={{ fontWeight: '500', padding: '12px' }}>{q.CustomerName || '-'}</td>
                                        <td style={{ textAlign: 'center', padding: '12px' }}>
                                            {isUsed ? (
                                                <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, display: 'inline-block' }}>
                                                    ออก SO แล้ว
                                                </span>
                                            ) : q.Status === 'อนุมัติ' ? (
                                                <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, display: 'inline-block' }}>
                                                    อนุมัติแล้ว
                                                </span>
                                            ) : (
                                                <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, display: 'inline-block' }}>
                                                    {q.Status || 'ฉบับร่าง'}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>฿{(q.GrandTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                                        ไม่พบข้อมูลใบเสนอราคา
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <style jsx="true">{`
                .hover-row:hover td {
                    background-color: #f8fafc !important;
                }
            `}</style>
        </div>
    );
}

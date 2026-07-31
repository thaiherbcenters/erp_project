import React, { useState, useMemo } from 'react';

export default function CustomerSelectorModal({
    show,
    onClose,
    customers,
    selectedCustomerId,
    onSelect
}) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = useMemo(() => {
        const activeCustomers = customers.filter(c => c.StatusName === 'Active');
        if (!searchTerm.trim()) return activeCustomers;
        const lower = searchTerm.toLowerCase();
        return activeCustomers.filter(c => 
            (c.CustomerCode && c.CustomerCode.toLowerCase().includes(lower)) ||
            (c.CustomerName && c.CustomerName.toLowerCase().includes(lower)) ||
            (c.ContactPerson && c.ContactPerson.toLowerCase().includes(lower))
        );
    }, [customers, searchTerm]);

    if (!show) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '10px', width: '700px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '18px' }}>เลือกลูกค้า</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>&times;</button>
                </div>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #eee' }}>
                    <input 
                        type="text" 
                        placeholder="ค้นหาชื่อ, รหัส, ผู้ติดต่อ..." 
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
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'left', padding: '12px' }}>รหัสลูกค้า</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'left', padding: '12px' }}>ชื่อลูกค้า</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'left', padding: '12px' }}>ผู้ติดต่อ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.length > 0 ? filteredCustomers.map(c => {
                                const isSelected = String(c.CustomerID) === String(selectedCustomerId);
                                return (
                                    <tr 
                                        key={c.CustomerID} 
                                        className="hover-row" 
                                        style={{ borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: isSelected ? '#f0fdf4' : 'transparent' }}
                                        onClick={() => {
                                            if (isSelected) {
                                                onSelect(null); // Uncheck
                                            } else {
                                                onSelect(c);
                                            }
                                            onClose();
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
                                        <td style={{ color: '#4f46e5', fontWeight: '500', padding: '12px' }}>{c.CustomerCode}</td>
                                        <td style={{ fontWeight: '500', padding: '12px' }}>{c.CustomerName}</td>
                                        <td style={{ padding: '12px' }}>{c.ContactPerson || '-'}</td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>ไม่พบข้อมูลลูกค้า</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <style jsx="true">{`
                .hover-row:hover td {
                    background-color: #f8fafc;
                }
            `}</style>
        </div>
    );
}

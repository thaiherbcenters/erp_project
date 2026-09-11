import React, { useState, useMemo } from 'react';
import { Search, X, Building2 } from 'lucide-react';

/**
 * =============================================================================
 * SupplierSelectorModal.jsx — Modal สำหรับค้นหาและเลือกผู้ขาย (Supplier)
 * =============================================================================
 */
export default function SupplierSelectorModal({
    show,
    onClose,
    suppliers = [],
    selectedSupplierId,
    onSelect
}) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredSuppliers = useMemo(() => {
        const activeSuppliers = suppliers.filter(s => s.ActiveStatus !== 'Inactive');
        if (!searchTerm.trim()) return activeSuppliers;
        const lower = searchTerm.toLowerCase();
        return activeSuppliers.filter(s => 
            (s.SupplierCode && s.SupplierCode.toLowerCase().includes(lower)) ||
            (s.SupplierName && s.SupplierName.toLowerCase().includes(lower)) ||
            (s.TaxID && s.TaxID.includes(lower)) ||
            (s.Phone && s.Phone.includes(lower)) ||
            (s.Email && s.Email.toLowerCase().includes(lower)) ||
            (s.ContactPerson && s.ContactPerson.toLowerCase().includes(lower))
        );
    }, [suppliers, searchTerm]);

    if (!show) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
        }}>
            <div style={{
                background: '#fff',
                borderRadius: '12px',
                width: '860px',
                maxWidth: '96vw',
                maxHeight: '88vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #e2e8f0'
            }}>
                {/* ── Modal Header ── */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: '#dcfce7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Building2 size={20} color="#16a34a" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                                เลือกผู้ขาย / ซัพพลายเออร์ (Supplier DB)
                            </h2>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                ค้นหาและคลิกเลือกผู้ขายเพื่อดึงข้อมูลเข้าสู่เอกสารใบสั่งซื้อ (PO)
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '22px',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#e2e8f0'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none'; }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Search Bar ── */}
                <div style={{ padding: '14px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="พิมพ์ค้นหาชื่อผู้ขาย, รหัส, เลขประจำตัวผู้เสียภาษี, เบอร์โทร หรือผู้ติดต่อ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px 10px 38px',
                                borderRadius: '8px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                fontFamily: 'inherit'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#16a34a'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                            autoFocus
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    padding: '4px 8px'
                                }}
                            >
                                ล้าง
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Table Content ── */}
                <div style={{ overflowY: 'auto', flex: 1, minHeight: '260px' }}>
                    <table className="data-table" style={{ border: 'none', width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'center', padding: '12px 8px', width: '56px' }}>เลือก</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'left', padding: '12px' }}>ชื่อผู้ขาย / บริษัทคู่ค้า</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'left', padding: '12px', width: '130px' }}>เลขผู้เสียภาษี</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'left', padding: '12px', width: '120px' }}>เบอร์โทร</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'left', padding: '12px' }}>ผู้ติดต่อ</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, textAlign: 'left', padding: '12px', width: '95px' }}>เครดิตเทอม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSuppliers.length > 0 ? (
                                filteredSuppliers.map((s) => {
                                    const isSelected = String(s.SupplierID) === String(selectedSupplierId);
                                    return (
                                        <tr
                                            key={s.SupplierID}
                                            style={{
                                                borderBottom: '1px solid #f1f5f9',
                                                cursor: 'pointer',
                                                backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                                                transition: 'background-color 0.15s'
                                            }}
                                            onClick={() => {
                                                if (isSelected) {
                                                    onSelect(null);
                                                } else {
                                                    onSelect(s);
                                                }
                                                onClose();
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    readOnly
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                                                />
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ fontWeight: 600, color: isSelected ? '#166534' : '#0f172a', fontSize: '13.5px' }}>
                                                    {s.SupplierName}
                                                </div>
                                                {s.SupplierCode && (
                                                    <small style={{ color: '#64748b', fontSize: '11px' }}>
                                                        รหัส: {s.SupplierCode}
                                                    </small>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', color: '#475569' }}>
                                                {s.TaxID || '-'}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', color: '#475569' }}>
                                                {s.Phone || '-'}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', color: '#475569' }}>
                                                {s.ContactPerson || '-'}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', color: '#475569' }}>
                                                {s.PaymentTerms || '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
                                        <Building2 size={36} color="#cbd5e1" style={{ margin: '0 auto 8px', display: 'block' }} />
                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>
                                            ไม่พบข้อมูลผู้ขายที่ตรงกับคำค้นหา
                                        </div>
                                        {searchTerm && (
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                                คำค้นหา: "{searchTerm}"
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Modal Footer ── */}
                <div style={{
                    padding: '12px 24px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                        แสดง <strong>{filteredSuppliers.length}</strong> รายการ จากทั้งหมด {suppliers.length} รายการ
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '8px 20px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            color: '#334155',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                    >
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>
    );
}

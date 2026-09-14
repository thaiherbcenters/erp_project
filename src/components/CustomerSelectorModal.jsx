import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, User, Phone, Check, Building2, RotateCcw } from 'lucide-react';
import PaginationControl from './PaginationControl';

export default function CustomerSelectorModal({
    show,
    onClose,
    customers,
    selectedCustomerId,
    onSelect
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Reset pagination when modal opens or search term changes
    useEffect(() => {
        if (show) {
            setCurrentPage(1);
        }
    }, [show]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setCurrentPage(1);
    };

    const filteredCustomers = useMemo(() => {
        // กรองเฉพาะลูกค้าสถานะ "ใช้งาน" (Active)
        const availableCustomers = (customers || []).filter(c => 
            !c.StatusName || c.StatusName === 'Active' || c.CustomerStatusID === 1 || c.StatusName !== 'Inactive'
        );
        if (!searchTerm.trim()) return availableCustomers;
        const lower = searchTerm.toLowerCase();
        return availableCustomers.filter(c => 
            (c.CustomerCode && c.CustomerCode.toLowerCase().includes(lower)) ||
            (c.CustomerName && c.CustomerName.toLowerCase().includes(lower)) ||
            (c.ContactPerson && c.ContactPerson.toLowerCase().includes(lower)) ||
            (c.Phone && c.Phone.toLowerCase().includes(lower))
        );
    }, [customers, searchTerm]);

    const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;

    const paginatedCustomers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredCustomers.slice(start, start + pageSize);
    }, [filteredCustomers, currentPage, pageSize]);

    const getStatusBadge = (statusName) => {
        if (statusName === 'Inactive' || statusName === 'ไม่ใช้งาน') {
            return (
                <span style={{ 
                    padding: '3px 8px', 
                    borderRadius: '12px', 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    background: '#fee2e2', 
                    color: '#b91c1c',
                    whiteSpace: 'nowrap'
                }}>
                    ไม่ใช้งาน
                </span>
            );
        }
        return (
            <span style={{ 
                padding: '3px 8px', 
                borderRadius: '12px', 
                fontSize: '11px', 
                fontWeight: 600, 
                background: '#dcfce7', 
                color: '#15803d',
                whiteSpace: 'nowrap'
            }}>
                ใช้งาน
            </span>
        );
    };

    if (!show) return null;

    return (
        <div 
            style={{ 
                position: 'fixed', 
                inset: 0, 
                background: 'rgba(15, 23, 42, 0.65)', 
                backdropFilter: 'blur(4px)',
                zIndex: 1100, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '16px',
                animation: 'custModalFadeIn 0.2s ease-out'
            }}
            onClick={onClose}
        >
            <div 
                style={{ 
                    background: '#fff', 
                    borderRadius: '14px', 
                    width: 'min(820px, 96vw)', 
                    maxHeight: 'min(88vh, 740px)', 
                    overflow: 'hidden', 
                    display: 'flex', 
                    flexDirection: 'column',
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25)',
                    animation: 'custModalPop 0.2s ease-out'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div style={{ 
                    padding: '18px 24px', 
                    borderBottom: '1px solid #e2e8f0', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: '#ffffff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '10px', 
                            background: '#e0f2fe', 
                            color: '#0284c7', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                        }}>
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                                เลือกลูกค้า
                            </h2>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                ค้นหาและเลือกลูกค้าเพื่อเชื่อมโยงกับเอกสาร
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            background: '#f1f5f9', 
                            border: 'none', 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '8px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: 'pointer', 
                            color: '#64748b',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                        title="ปิดหน้าต่าง"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Search Bar ── */}
                <div style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={18} style={{ position: 'absolute', left: '14px', color: '#94a3b8', pointerEvents: 'none' }} />
                        <input 
                            type="text" 
                            placeholder="ค้นหาด้วย ชื่อลูกค้า, รหัสลูกค้า, ผู้ติดต่อ, เบอร์โทร..." 
                            value={searchTerm}
                            onChange={handleSearchChange}
                            style={{ 
                                width: '100%', 
                                padding: '10px 40px 10px 42px', 
                                borderRadius: '8px', 
                                border: '1px solid #cbd5e1', 
                                fontSize: '13.5px', 
                                outline: 'none',
                                background: '#ffffff',
                                color: '#1e293b',
                                transition: 'border-color 0.2s, box-shadow 0.2s'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#3b82f6';
                                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.12)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#cbd5e1';
                                e.target.style.boxShadow = 'none';
                            }}
                            autoFocus
                        />
                        {searchTerm && (
                            <button 
                                onClick={handleClearSearch}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="ล้างคำค้นหา"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Table Content ── */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '0', background: '#ffffff' }}>
                    <table className="data-table" style={{ border: 'none', minWidth: '100%', borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, textAlign: 'center', padding: '10px 12px', width: '50px', borderBottom: '1px solid #e2e8f0' }}>เลือก</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, textAlign: 'left', padding: '10px 14px', width: '135px', borderBottom: '1px solid #e2e8f0', fontSize: '12.5px', color: '#475569' }}>รหัสลูกค้า</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '12.5px', color: '#475569' }}>ชื่อลูกค้า</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, textAlign: 'left', padding: '10px 14px', width: '190px', borderBottom: '1px solid #e2e8f0', fontSize: '12.5px', color: '#475569' }}>ผู้ติดต่อ / เบอร์โทร</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, textAlign: 'center', padding: '10px 12px', width: '85px', borderBottom: '1px solid #e2e8f0', fontSize: '12.5px', color: '#475569' }}>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedCustomers.length > 0 ? paginatedCustomers.map(c => {
                                const isSelected = String(c.CustomerID) === String(selectedCustomerId);
                                return (
                                    <tr 
                                        key={c.CustomerID} 
                                        className={`hover-row ${isSelected ? 'selected-row' : ''}`}
                                        style={{ 
                                            borderBottom: '1px solid #f1f5f9', 
                                            cursor: 'pointer', 
                                            backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                                            transition: 'background-color 0.15s ease'
                                        }}
                                        onClick={() => {
                                            if (isSelected) {
                                                onSelect(null); // Uncheck
                                            } else {
                                                onSelect(c);
                                            }
                                            onClose();
                                        }}
                                    >
                                        <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected}
                                                readOnly
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                                            />
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <span style={{ 
                                                color: '#4f46e5', 
                                                fontWeight: 600, 
                                                fontSize: '12.5px',
                                                background: '#eef2ff',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                display: 'inline-block'
                                            }}>
                                                {c.CustomerCode}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <div 
                                                style={{ 
                                                    fontWeight: 600, 
                                                    color: '#1e293b', 
                                                    fontSize: '13.5px',
                                                    wordBreak: 'break-word',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    lineHeight: 1.4
                                                }}
                                                title={c.CustomerName}
                                            >
                                                {c.CustomerName}
                                            </div>
                                            {c.TaxID && (
                                                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                                                    เลขผู้เสียภาษี: {c.TaxID}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: '13px' }}>
                                            <div style={{ color: '#334155', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                {c.ContactPerson ? (
                                                    <>
                                                        <User size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                        <span style={{ wordBreak: 'break-word' }}>{c.ContactPerson}</span>
                                                    </>
                                                ) : (
                                                    <span style={{ color: '#94a3b8' }}>-</span>
                                                )}
                                            </div>
                                            {c.Phone && (
                                                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                                                    <Phone size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                    <span>{c.Phone}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                                            {getStatusBadge(c.StatusName)}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                        <Building2 size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                                        <div style={{ fontSize: '14px', fontWeight: 500 }}>ไม่พบข้อมูลลูกค้าที่ตรงกับคำค้นหา</div>
                                        {searchTerm && (
                                            <button 
                                                onClick={handleClearSearch}
                                                style={{ 
                                                    marginTop: '10px', 
                                                    padding: '4px 12px', 
                                                    fontSize: '12px', 
                                                    background: '#f1f5f9', 
                                                    border: '1px solid #cbd5e1', 
                                                    borderRadius: '6px', 
                                                    cursor: 'pointer' 
                                                }}
                                            >
                                                ล้างการค้นหา
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination Control ── */}
                <PaginationControl
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredCustomers.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    pageSizeOptions={[10, 20, 50]}
                    itemLabel="คน"
                    style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
                />

                {/* ── Modal Footer ── */}
                <div style={{ 
                    padding: '12px 20px', 
                    borderTop: '1px solid #e2e8f0', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: '#ffffff'
                }}>
                    <div>
                        {selectedCustomerId && (
                            <button
                                type="button"
                                onClick={() => {
                                    onSelect(null);
                                    onClose();
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    fontSize: '12.5px',
                                    color: '#dc2626',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '7px',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit'
                                }}
                            >
                                <RotateCcw size={14} />
                                <span>ยกเลิกการเลือกลูกค้า (ล้างค่า)</span>
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '7px 18px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#475569',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontFamily: 'inherit'
                        }}
                    >
                        ปิด
                    </button>
                </div>
            </div>

            <style jsx="true">{`
                @keyframes custModalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes custModalPop {
                    from { opacity: 0; transform: scale(0.96) translateY(8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .hover-row:hover td {
                    background-color: #f8fafc !important;
                }
                .selected-row td {
                    background-color: #f0fdf4 !important;
                }
            `}</style>
        </div>
    );
}


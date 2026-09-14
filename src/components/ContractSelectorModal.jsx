import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, FileText, Building2, RotateCcw } from 'lucide-react';
import PaginationControl from './PaginationControl';

export default function ContractSelectorModal({
    show,
    onClose,
    contracts,
    selectedContractId,
    onSelect
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

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

    const filteredContracts = useMemo(() => {
        if (!searchTerm.trim()) return contracts || [];
        const lower = searchTerm.toLowerCase();
        return (contracts || []).filter(c => 
            (c.ContractNo && c.ContractNo.toLowerCase().includes(lower)) ||
            (c.ContractName && c.ContractName.toLowerCase().includes(lower)) ||
            (c.CustomerName && c.CustomerName.toLowerCase().includes(lower))
        );
    }, [contracts, searchTerm]);

    const totalPages = Math.ceil(filteredContracts.length / pageSize) || 1;

    const paginatedContracts = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredContracts.slice(start, start + pageSize);
    }, [filteredContracts, currentPage, pageSize]);

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
                animation: 'contractModalFadeIn 0.2s ease-out'
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
                    animation: 'contractModalPop 0.2s ease-out'
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
                            background: '#f3e8ff', 
                            color: '#7c3aed', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                        }}>
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                                เลือกอ้างอิงสัญญา
                            </h2>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                ค้นหาและเลือกสัญญาเพื่อผูกข้อมูลเข้ากับเอกสาร
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
                            placeholder="ค้นหาเลขที่สัญญา, ชื่อสัญญา, ชื่อลูกค้า..." 
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
                                e.target.style.borderColor = '#7c3aed';
                                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.12)';
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
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, textAlign: 'left', padding: '10px 14px', width: '140px', borderBottom: '1px solid #e2e8f0', fontSize: '12.5px', color: '#475569' }}>รหัสสัญญา</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '12.5px', color: '#475569' }}>ชื่อสัญญา</th>
                                <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, textAlign: 'left', padding: '10px 14px', width: '200px', borderBottom: '1px solid #e2e8f0', fontSize: '12.5px', color: '#475569' }}>ชื่อลูกค้า</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedContracts.length > 0 ? paginatedContracts.map(c => {
                                const isSelected = String(c.ContractID) === String(selectedContractId);
                                return (
                                    <tr 
                                        key={c.ContractID} 
                                        className={`hover-row ${isSelected ? 'selected-row' : ''}`}
                                        style={{ 
                                            borderBottom: '1px solid #f1f5f9', 
                                            cursor: 'pointer', 
                                            backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                                            transition: 'background-color 0.15s ease'
                                        }}
                                        onClick={() => {
                                            if (isSelected) {
                                                onSelect(''); // Uncheck
                                            } else {
                                                onSelect(c.ContractID);
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
                                                color: '#7c3aed', 
                                                fontWeight: 600, 
                                                fontSize: '12.5px',
                                                background: '#f5f3ff',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                display: 'inline-block'
                                            }}>
                                                {c.ContractNo}
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
                                                title={c.ContractName}
                                            >
                                                {c.ContractName}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: '13px' }}>
                                            <div style={{ color: '#334155', fontWeight: 500, wordBreak: 'break-word' }}>
                                                {c.CustomerName || '-'}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                        <FileText size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                                        <div style={{ fontSize: '14px', fontWeight: 500 }}>ไม่พบข้อมูลสัญญาที่ตรงกับคำค้นหา</div>
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
                    totalItems={filteredContracts.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    pageSizeOptions={[10, 20, 50]}
                    itemLabel="สัญญา"
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
                        {selectedContractId && (
                            <button
                                type="button"
                                onClick={() => {
                                    onSelect('');
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
                                <span>ยกเลิกการเลือกสัญญา (ล้างค่า)</span>
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
                @keyframes contractModalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes contractModalPop {
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


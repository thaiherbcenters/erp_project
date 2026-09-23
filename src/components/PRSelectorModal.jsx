import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, FileText, CheckCircle, Clock, ShoppingBag, Package, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import API_BASE from '../config';

/**
 * =============================================================================
 * PRSelectorModal.jsx — Modal สำหรับค้นหาและเลือกใบขอซื้อ (Purchase Requisition - PR)
 * =============================================================================
 * ใช้ในหน้าออกใบสั่งซื้อ (PO) เพื่อดึงรายการวัตถุดิบ/สินค้าจาก PR ที่ผ่านการอนุมัติแล้ว
 * มาหยอดลงในตารางสินค้าของ PO โดยอัตโนมัติ
 * =============================================================================
 */
export default function PRSelectorModal({
    show,
    onClose,
    onSelect,
    selectedPRNumber = ''
}) {
    const [prList, setPrList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('อนุมัติแล้ว'); // Default ให้แสดงใบที่อนุมัติแล้วก่อน
    const [expandedPR, setExpandedPR] = useState(null);

    // Fetch PRs when modal opens
    useEffect(() => {
        if (!show) return;
        const fetchPRs = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE}/purchase-requisitions`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    credentials: 'omit'
                });
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    // กรองเฉพาะใบที่ไม่ถูกยกเลิก
                    setPrList(json.data.filter(p => p.status !== 'ยกเลิก'));
                }
            } catch (err) {
                console.error('Error fetching PRs for selector:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPRs();
    }, [show]);

    // Filter logic
    const filteredPRs = useMemo(() => {
        return prList.filter(pr => {
            // Status match
            if (statusFilter !== 'ทั้งหมด' && pr.status !== statusFilter) {
                return false;
            }
            // Search match
            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            const prNo = (pr.prNumber || '').toLowerCase();
            const task = (pr.taskId || '').toLowerCase();
            const formula = (pr.formulaName || '').toLowerCase();
            const req = (pr.requestor || '').toLowerCase();
            const notes = (pr.notes || '').toLowerCase();
            const hasItem = Array.isArray(pr.items) && pr.items.some(it => 
                (it.itemName && it.itemName.toLowerCase().includes(term)) ||
                (it.itemCode && it.itemCode.toLowerCase().includes(term))
            );
            return prNo.includes(term) || task.includes(term) || formula.includes(term) || req.includes(term) || notes.includes(term) || hasItem;
        });
    }, [prList, statusFilter, searchTerm]);

    if (!show) return null;

    const formatDate = (d) => {
        if (!d) return '-';
        try {
            const date = new Date(d);
            return isNaN(date.getTime()) ? String(d) : date.toLocaleDateString('th-TH');
        } catch {
            return String(d);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
        }}>
            <div style={{
                background: '#ffffff',
                borderRadius: '14px',
                width: '900px',
                maxWidth: '96vw',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FileText size={22} color="#059669" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                                เลือกใบขอซื้อ (Purchase Requisition - PR)
                            </h2>
                            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                                เลือกใบขอซื้อเพื่อดึงรายการสินค้า/วัตถุดิบและเลขที่อ้างอิงเข้าสู่ใบสั่งซื้อ (PO) ให้อัตโนมัติ
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '8px',
                            width: '34px',
                            height: '34px',
                            cursor: 'pointer',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Filters & Search Toolbar ── */}
                <div style={{
                    padding: '14px 24px',
                    borderBottom: '1px solid #f1f5f9',
                    background: '#ffffff',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}>
                    {/* Search Input */}
                    <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
                        <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ค้นหาเลขที่ PR, งานผลิต, สูตร, ผู้ขอซื้อ, หรือชื่อวัตถุดิบ..."
                            style={{
                                width: '100%',
                                padding: '9px 12px 9px 36px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '13px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    fontSize: '12px'
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Status Tabs */}
                    <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                        {[
                            { key: 'อนุมัติแล้ว', label: 'อนุมัติแล้ว (พร้อมออก PO)' },
                            { key: 'รอจัดซื้อ', label: 'รอจัดซื้อ' },
                            { key: 'สั่งซื้อแล้ว', label: 'สั่งซื้อแล้ว' },
                            { key: 'ทั้งหมด', label: 'ทั้งหมด' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setStatusFilter(tab.key)}
                                style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    background: statusFilter === tab.key ? '#ffffff' : 'transparent',
                                    color: statusFilter === tab.key ? '#0f172a' : '#64748b',
                                    boxShadow: statusFilter === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── PR List Body ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', background: '#f8fafc' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>กำลังโหลดรายการใบขอซื้อ...</div>
                        </div>
                    ) : filteredPRs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b', background: '#ffffff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                            <FileText size={42} color="#cbd5e1" style={{ marginBottom: '10px' }} />
                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>
                                ไม่พบใบขอซื้อ (PR) ที่ตรงกับเงื่อนไข
                            </div>
                            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                                {statusFilter === 'อนุมัติแล้ว' ? 'ยังไม่มีใบขอซื้อที่ผ่านการอนุมัติ หรือถูกนำไปเปิด PO หมดแล้ว' : 'ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ'}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredPRs.map(pr => {
                                const isSelected = selectedPRNumber && selectedPRNumber === pr.prNumber;
                                const isExpanded = expandedPR === pr.prNumber;
                                const items = Array.isArray(pr.items) ? pr.items : [];

                                return (
                                    <div
                                        key={pr.id || pr.prNumber}
                                        style={{
                                            background: '#ffffff',
                                            borderRadius: '10px',
                                            border: isSelected ? '2px solid #10b981' : '1px solid #e2e8f0',
                                            padding: '14px 16px',
                                            boxShadow: isSelected ? '0 4px 12px rgba(16, 185, 129, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {/* Card Top Row */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                                                        {pr.prNumber}
                                                    </span>
                                                    
                                                    {/* Status Badge */}
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        background: pr.status === 'อนุมัติแล้ว' ? '#dcfce7' : pr.status === 'สั่งซื้อแล้ว' ? '#dbeafe' : '#fef3c7',
                                                        color: pr.status === 'อนุมัติแล้ว' ? '#15803d' : pr.status === 'สั่งซื้อแล้ว' ? '#1d4ed8' : '#b45309'
                                                    }}>
                                                        {pr.status === 'อนุมัติแล้ว' ? '✓ อนุมัติแล้ว' : pr.status}
                                                    </span>

                                                    {pr.poNumber && (
                                                        <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                                            PO: {pr.poNumber}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Meta Info */}
                                                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b', marginTop: '6px', flexWrap: 'wrap' }}>
                                                    <span>📅 วันที่: <strong>{formatDate(pr.requestDate || pr.createdAt)}</strong></span>
                                                    <span>👤 ผู้ขอซื้อ: <strong>{pr.requestor || 'ไม่ระบุ'}</strong></span>
                                                    <span>🏢 แผนก: <strong>{pr.department || 'ฝ่ายผลิต/คลัง'}</strong></span>
                                                    {pr.taskId && <span>⚙️ งานผลิต: <strong style={{ color: '#047857' }}>{pr.taskId}</strong></span>}
                                                    {pr.formulaName && <span>🧪 สูตร: <strong>{pr.formulaName}</strong></span>}
                                                </div>

                                                {pr.notes && (
                                                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px' }}>
                                                        💬 {pr.notes}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Button */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => onSelect(pr)}
                                                    style={{
                                                        padding: '7px 16px',
                                                        background: '#15803d',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)',
                                                        transition: 'background 0.15s'
                                                    }}
                                                >
                                                    <CheckCircle size={15} /> ดึงข้อมูลเข้า PO
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedPR(isExpanded ? null : pr.prNumber)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#64748b',
                                                        fontSize: '11.5px',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '2px',
                                                        padding: '2px 4px'
                                                    }}
                                                >
                                                    {isExpanded ? <>ซ่อนรายการ ({items.length}) <ChevronUp size={13} /></> : <>ดูรายการสินค้า ({items.length}) <ChevronDown size={13} /></>}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expandable Items Preview */}
                                        {isExpanded && (
                                            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                    รายการวัตถุดิบ/สินค้าในใบขอซื้อ ({items.length} รายการ):
                                                </div>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                                                    <thead>
                                                        <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                                                            <th style={{ padding: '5px 8px', textAlign: 'center', width: '40px' }}>#</th>
                                                            <th style={{ padding: '5px 8px', textAlign: 'left', width: '100px' }}>รหัส</th>
                                                            <th style={{ padding: '5px 8px', textAlign: 'left' }}>รายการสินค้า</th>
                                                            <th style={{ padding: '5px 8px', textAlign: 'right', width: '90px' }}>จำนวนขอซื้อ</th>
                                                            <th style={{ padding: '5px 8px', textAlign: 'center', width: '60px' }}>หน่วย</th>
                                                            <th style={{ padding: '5px 8px', textAlign: 'right', width: '100px' }}>ราคาประเมิน</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {items.map((it, idx) => {
                                                            const q = Number(it.requestQty) || Number(it.qty) || Number(it.deductQty) || 0;
                                                            const p = Number(it.estimatedPrice) || Number(it.price) || 0;
                                                            return (
                                                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                    <td style={{ padding: '5px 8px', textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                                                                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#047857' }}>{it.itemCode || it.code || '-'}</td>
                                                                    <td style={{ padding: '5px 8px', fontWeight: 600, color: '#0f172a' }}>{it.itemName || it.name}</td>
                                                                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{q.toLocaleString('th-TH')}</td>
                                                                    <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b' }}>{it.unit || it.displayUnit || 'กก.'}</td>
                                                                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#64748b' }}>{p > 0 ? `฿${p.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Modal Footer ── */}
                <div style={{
                    padding: '12px 24px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                    fontSize: '12.5px',
                    color: '#64748b'
                }}>
                    <div>
                        พบทั้งหมด <strong>{filteredPRs.length}</strong> ฉบับ
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '7px 18px',
                            background: '#e2e8f0',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: '#334155'
                        }}
                    >
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>
    );
}

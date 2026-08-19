/**
 * =============================================================================
 * Packaging.jsx — หน้า Packaging (บรรจุภัณฑ์)
 * =============================================================================
 * ประกอบด้วย 1 sub-page:
 *   1. Packaging — จัดการงานบรรจุภัณฑ์
 *
 * Flow:  ฝ่ายผลิต (Operator) → Packaging → QC Final → คลัง / จัดส่ง
 * =============================================================================
 */

// ── Imports ──
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRnD } from '../context/RnDContext';
import {
    PackageOpen, PackageCheck, Clock, AlertTriangle,
    CheckCircle2, Search, Plus, Box, Eye, Send, FileText,
    X, ShieldCheck, Truck, Warehouse, Edit3, Barcode, ScanBarcode, PlayCircle,
    Star, Tag, Calendar, Activity, CheckCircle, AlertCircle, HelpCircle
} from 'lucide-react';
import './PageCommon.css';
import './Packaging.css';

// ── Packaging Materials fetched from Inventory ──

// ── Helper: สีสถานะ ──
const getStatusBadge = (status) => {
    const map = {
        'รอเบิกบรรจุภัณฑ์': 'badge-warning',
        'รอบรรจุ':     'badge-danger',
        'กำลังบรรจุ':   'badge-warning',
        'บรรจุเสร็จ':   'badge-info',
        'รอ QC Final': 'badge-purple',
        'QC ผ่าน':     'badge-success',
        'ส่งมอบแล้ว':   'badge-muted',
    };
    return map[status] || 'badge-info';
};

const getDestBadge = (dest) => {
    if (dest === 'คลัง') return { bg: '#e0e7ff', color: '#4338ca', icon: <Warehouse size={12} /> };
    return { bg: '#d1fae5', color: '#065f46', icon: <Truck size={12} /> };
};

import API_BASE from '../config';
import CustomSelect from '../components/CustomSelect';

const API_URL = API_BASE;
import { useAlert } from '../components/CustomAlert';

export default function Packaging() {
    const { hasSubPermission, hasSectionPermission, canUpdate, canCreate, currentUser } = useAuth();
    const { showAlert, showConfirm } = useAlert();
    const { getVisibleSubPages } = useAuth();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('packaging');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;
    const { formulas: MOCK_FORMULAS } = useRnD();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ทั้งหมด');
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pmItems, setPmItems] = useState([]);
    const [pmLoading, setPmLoading] = useState(true);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/packaging/tasks`);
            if (!res.ok) throw new Error('Failed to fetch packaging tasks');
            const data = await res.json();
            setOrders(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPmMaterials = async () => {
        setPmLoading(true);
        try {
            const res = await fetch(`${API_URL}/stock?category=${encodeURIComponent('บรรจุภัณฑ์')}&limit=1000`);
            if (res.ok) {
                const data = await res.json();
                setPmItems(data.data || data.items || data || []);
            }
        } catch (err) {
            console.error('Failed to fetch PM materials', err);
        } finally {
            setPmLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchPmMaterials();
    }, []);

    // ── Stats ──
    const totalOrders = orders.length;
    const inProgress = orders.filter(o => o.status === 'กำลังบรรจุ').length;
    const waiting = orders.filter(o => o.status === 'รอบรรจุ' || o.status === 'รอเบิกบรรจุภัณฑ์').length;
    const readyForQC = orders.filter(o => o.status === 'บรรจุเสร็จ').length;
    const waitingQC = orders.filter(o => o.status === 'รอ QC Final').length;
    const completed = orders.filter(o => ['QC ผ่าน', 'ส่งมอบแล้ว'].includes(o.status)).length;

    // ── Actions ──
    const updateTaskStatus = async (orderId, newStatus, fullOrder = null) => {
        try {
            const res = await fetch(`${API_URL}/packaging/tasks/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                // If it's a QC request, we also need to create a QC ticket
                if (newStatus === 'รอ QC Final' && fullOrder) {
                    await fetch(`${API_URL}/qc/requests`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            requestID: `QCR-${Date.now()}`,
                            taskID: fullOrder.id,
                            jobOrderID: fullOrder.batch, // Map batch as fallback since Packaging_Tasks doesn't have JO
                            batchNo: fullOrder.batch,
                            formulaName: fullOrder.product,
                            line: fullOrder.line,
                            type: 'qc_final',
                            requestedAt: new Date().toISOString(),
                            status: 'รอตรวจ'
                        })
                    });
                }

                // Refresh data instead of only changing state to ensure sync
                fetchTasks();
                // Also update local selected order if it's open
                setSelectedOrder(prev => prev?.id === orderId ? { ...prev, status: newStatus } : prev);
            } else {
                showAlert('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
            }
        } catch (err) {
            console.error('Update err', err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        }
    };

    const handleSendToQC = (order) => {
        updateTaskStatus(order.id, 'รอ QC Final', order);
    };

    const handleMarkAsDelivered = (orderId) => {
        updateTaskStatus(orderId, 'ส่งมอบแล้ว');
    };

    // ── Update Progress (Manual & Barcode) ──
    const [progressTarget, setProgressTarget] = useState(null);
    const [scanMode, setScanMode] = useState(false);
    const [addedQty, setAddedQty] = useState('');
    const [defectQty, setDefectQty] = useState('');
    const [scanMultiplier, setScanMultiplier] = useState(1);
    const barcodeInputRef = React.useRef(null);

    // Give focus back to barcode input efficiently
    useEffect(() => {
        if (progressTarget && scanMode && barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    }, [progressTarget, scanMode]);

    const submitProgress = async (id, sqty, dqty) => {
        const parsedAdded = parseInt(sqty) || 0;
        const parsedDefect = parseInt(dqty) || 0;
        if (parsedAdded === 0 && parsedDefect === 0) return;

        if (progressTarget) {
            const remaining = progressTarget.qty - (progressTarget.packed || 0);
            const totalInput = parsedAdded + parsedDefect;
            if (totalInput > remaining) {
                showAlert('ยอดเกินกำหนด', `คุณใส่ยอดรวม (ดี+เสีย) ${totalInput} ซึ่งเกินยอดเป้าหมาย ${remaining} ชิ้น`, 'warning');
                return;
            }
        }

        try {
            const res = await fetch(`${API_URL}/packaging/tasks/${id}/progress`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addedQty: parsedAdded, defectQty: parsedDefect })
            });
            if (res.ok) {
                fetchTasks(); // Refresh
                if (!scanMode) {
                    setProgressTarget(null); // close if manual 
                } 
                setAddedQty('');
                setDefectQty('');
            } else {
                showAlert('เกิดข้อผิดพลาด', 'อัปเดตยอดไม่สำเร็จ', 'error');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleProgressBarcodeScan = (e) => {
        if (e.key === 'Enter') {
            const code = e.target.value;
            if (code.trim() !== '') {
                // Validate
                const remaining = progressTarget.qty - (progressTarget.packed || 0);
                if (scanMultiplier > remaining) {
                    showAlert('ยอดเกินกำหนด', `คุณตั้งตัวคูณไว้ที่ ${scanMultiplier} ชิ้น ซึ่งเกินยอดคงเหลือ (${remaining} ชิ้น)`, 'warning');
                    return;
                }
                // If scanned, increment by multiplier
                submitProgress(progressTarget.id, scanMultiplier, 0);
            }
            e.target.value = ''; // clear input for next scan
        }
    };

    const handleOpenProgress = (order) => {
        setProgressTarget(order);
        setScanMode(false);
        setAddedQty('');
        setDefectQty('');
    };

    // ── Filter ──
    const statusOptions = ['ทั้งหมด', 'บรรจุเสร็จ', 'รอ QC Final', 'QC ผ่าน', 'ส่งมอบแล้ว'];
    const filtered = orders.filter(o => {
        if (o.status === 'รอเบิกบรรจุภัณฑ์' || o.status === 'รอบรรจุ' || o.status === 'กำลังบรรจุ') return false; // Hide from table

        const matchSearch = (o.product || '').includes(searchTerm) || (o.code || '').includes(searchTerm) || (o.batch || '').includes(searchTerm);
        const matchStatus = statusFilter === 'ทั้งหมด' || o.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // ══════════════════════════════════════════════════════════════
    // Helper: แยก packType เป็นรายการวัสดุ + เช็คสต็อก
    // ══════════════════════════════════════════════════════════════
    const getRequiredMaterials = (order) => {
        const neededQty = (order.qty || 0) - (order.packed || 0); // จำนวนที่ยังต้องบรรจุ
        
        // 1. Try to find formula from RnD Context
        const formula = MOCK_FORMULAS?.find(f => f.name === order.product || f.id === order.product);
        if (formula && formula.ingredients) {
            const packagingItems = formula.ingredients.filter(i => i.type === 'packaging');
            if (packagingItems.length > 0) {
                return packagingItems.map(ing => {
                    const matchedItem = pmItems.find(m => String(m.id) === String(ing.materialId) || m.name === ing.name);
                    const reqQty = (neededQty > 0 ? neededQty : order.qty || 0) * (ing.qty || 1);
                    return {
                        name: ing.name || matchedItem?.name || '-',
                        neededQty: reqQty,
                        stockItem: matchedItem || null,
                        stockQty: matchedItem ? (matchedItem.qty || 0) : null,
                        unit: matchedItem?.unit || ing.unit || 'ชิ้น',
                        isAvailable: matchedItem ? (matchedItem.qty || 0) >= reqQty : false,
                    };
                });
            }
        }

        // 2. Fallback to old behavior (split by +)
        if (!order?.packType || order.packType === '-') return [];
        const keywords = order.packType.split(/[+,/]/).map(s => s.trim()).filter(Boolean);

        return keywords.map(keyword => {
            const matchedItem = pmItems.find(item => {
                const name = (item.name || '').toLowerCase();
                const kw = keyword.toLowerCase();
                return name.includes(kw) || kw.includes(name);
            });

            return {
                name: keyword,
                neededQty: neededQty > 0 ? neededQty : order.qty || 0,
                stockItem: matchedItem || null,
                stockQty: matchedItem ? (matchedItem.qty || 0) : null,
                unit: matchedItem?.unit || 'ชิ้น',
                isAvailable: matchedItem ? (matchedItem.qty || 0) >= (neededQty > 0 ? neededQty : order.qty || 0) : null,
            };
        });
    };

    // ══════════════════════════════════════════════════════════════
    // Modal: รายละเอียดคำสั่งบรรจุ
    // ══════════════════════════════════════════════════════════════
    const renderDetailModal = () => {
        if (!selectedOrder) return null;
        const o = selectedOrder;
        const dest = getDestBadge(o.destination);
        const progress = o.qty > 0 ? Math.floor(((o.packed || 0) / o.qty) * 100) : 0;

        // วัสดุบรรจุภัณฑ์ที่ต้องใช้
        const materials = getRequiredMaterials(o);
        const allMaterialsOk = materials.length > 0 && materials.every(m => m.isAvailable === true);
        const hasMaterialIssue = materials.length > 0 && materials.some(m => m.isAvailable === false);

        return (
            <div className="pkg-modal-overlay" onClick={() => setSelectedOrder(null)}>
                <div className="pkg-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📦 {o.code}</h2>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#71717a' }}>{o.product}</p>
                        </div>
                        <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body — scrollable */}
                    <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
                        {/* Status + Destination */}
                        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                            <span className={`badge ${getStatusBadge(o.status)}`} style={{ ...(o.status === 'QC ผ่าน' ? { background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac' } : {}), fontSize: 13, padding: '6px 14px' }}>
                                {o.status}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: dest.bg, color: dest.color, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                                {dest.icon} {o.destination}
                            </span>
                            {o.productionTaskId && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef3c7', color: '#92400e', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                                    🏭 จากฝ่ายผลิต
                                </span>
                            )}
                            {o.jobOrderId && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e0e7ff', color: '#3730a3', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                                    📋 {o.jobOrderId}
                                </span>
                            )}
                        </div>

                        {/* Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                            <div>
                                <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>เลขผลิต (JO)</span>
                                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{o.jobOrderId || o.batch}</p>
                            </div>
                            <div>
                                <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>ประเภทบรรจุ</span>
                                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{o.packType || '-'}</p>
                            </div>
                            <div>
                                <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>Line บรรจุ</span>
                                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{o.line}</p>
                            </div>
                            <div>
                                <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>ผู้รับผิดชอบ</span>
                                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{o.assignee}</p>
                            </div>
                            <div>
                                <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>กำหนดส่ง</span>
                                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{o.dueDate || '-'}</p>
                            </div>
                            <div>
                                <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>เป้าหมายบรรจุ</span>
                                <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#4f46e5', fontSize: 16 }}>{(o.qty || 0).toLocaleString()}</p>
                            </div>
                            {o.customer && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>ลูกค้า OEM</span>
                                    <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0d9488' }}>{o.customer}</p>
                                </div>
                            )}
                        </div>

                        {/* Progress */}
                        <div style={{ marginTop: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>ความคืบหน้าการบรรจุ</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: progress === 100 ? '#16a34a' : '#4f46e5' }}>{progress}%</span>
                            </div>
                            <div className="progress-container" style={{ height: 28, borderRadius: 8 }}>
                                <div className="progress-bar" style={{
                                    width: `${progress}%`,
                                    backgroundColor: progress === 100 ? '#16a34a' : '#6366f1',
                                    borderRadius: 8,
                                }} />
                                <span className="progress-text" style={{ fontSize: 12 }}>{(o.packed || 0).toLocaleString()} / {(o.qty || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* ── วัสดุบรรจุภัณฑ์ที่ต้องใช้ ── */}
                        {materials.length > 0 && (
                            <div className="pkg-material-section">
                                <div className="pkg-material-header">
                                    <Box size={16} /> วัสดุบรรจุภัณฑ์ที่ต้องใช้
                                </div>
                                <table className="pkg-material-table">
                                    <thead>
                                        <tr>
                                            <th>วัสดุ</th>
                                            <th style={{ textAlign: 'right' }}>ต้องใช้</th>
                                            <th style={{ textAlign: 'right' }}>คงเหลือในคลัง</th>
                                            <th style={{ textAlign: 'center' }}>สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {materials.map((mat, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{mat.name}</div>
                                                    {mat.stockItem && (
                                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                                            {mat.stockItem.name} ({mat.stockItem.id})
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                    {mat.neededQty.toLocaleString()} {mat.unit}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                    {mat.stockQty !== null
                                                        ? <span style={{ color: mat.isAvailable ? '#16a34a' : '#dc2626' }}>{mat.stockQty.toLocaleString()} {mat.unit}</span>
                                                        : <span style={{ color: '#92400e' }}>-</span>
                                                    }
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {mat.isAvailable === true && (
                                                        <span className="pkg-mat-ok">
                                                            <CheckCircle size={13} /> เพียงพอ
                                                        </span>
                                                    )}
                                                    {mat.isAvailable === false && (
                                                        <span className="pkg-mat-warn">
                                                            <AlertCircle size={13} /> ไม่พอ
                                                        </span>
                                                    )}
                                                    {mat.isAvailable === null && (
                                                        <span className="pkg-mat-unknown">
                                                            <HelpCircle size={13} /> ยังไม่ระบุในคลัง
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className={`pkg-mat-summary ${allMaterialsOk ? 'all-ok' : hasMaterialIssue ? 'has-issue' : ''}`}>
                                    {allMaterialsOk && <><CheckCircle size={15} /> วัสดุบรรจุภัณฑ์ครบถ้วน — พร้อมเริ่มบรรจุ</>}
                                    {hasMaterialIssue && <><AlertCircle size={15} /> วัสดุไม่เพียงพอ — กรุณาเบิกเพิ่มก่อนเริ่มบรรจุ</>}
                                    {!allMaterialsOk && !hasMaterialIssue && <><HelpCircle size={15} /> กรุณาตรวจสอบวัสดุในคลังบรรจุภัณฑ์</>}
                                </div>
                            </div>
                        )}

                        {/* Note */}
                        {o.note && (
                            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fafaf9', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                                <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>หมายเหตุ</span>
                                <p style={{ margin: '4px 0 0', fontSize: 14 }}>{o.note}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        {/* --- Requisition Actions --- */}
                        {o.status === 'รอบรรจุ' && materials.length > 0 && !o.requisitionJSON && (
                            <>
                                <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                    onClick={async () => {
                                        try {
                                            const reqData = {
                                                formulaName: o.product,
                                                expectedQty: o.qty,
                                                unit: 'ชิ้น',
                                                jobOrderId: o.jobOrderId || o.batch,
                                                taskId: o.id,
                                                batchNo: o.batch,
                                                items: materials.map(m => ({ id: m.stockItem?.id, name: m.name, deductQty: m.neededQty, unit: m.unit })),
                                                date: new Date().toLocaleDateString('th-TH'),
                                                requesterName: 'พนักงานบรรจุ'
                                            };
                                            const res = await fetch(`${API_URL}/print/requisition/preview`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(reqData)
                                            });
                                            if (res.ok) {
                                                const blob = await res.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                window.open(url, '_blank');
                                            }
                                        } catch(e) { console.error(e); }
                                    }}
                                >
                                    <FileText size={14} /> ดูใบเบิก
                                </button>
                                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f59e0b' }}
                                    onClick={async () => {
                                        if (!allMaterialsOk) {
                                            const confirm = await showConfirm('ยืนยันการขอเบิก', 'วัสดุบางรายการมีในสต็อกไม่พอ คุณต้องการส่งใบเบิกให้คลังพิจารณาหรือไม่?', 'warning');
                                            if (!confirm) return;
                                        } else {
                                            const confirm = await showConfirm('ยืนยันการขอเบิก', 'คุณต้องการส่งใบเบิกให้ฝ่ายคลังสินค้าเพื่อดำเนินการตัดสต็อกหรือไม่?', 'info');
                                            if (!confirm) return;
                                        }
                                        try {
                                            const res = await fetch(`${API_URL}/packaging/tasks/${o.id}/requisition`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    requisitionItems: materials.map(m => ({ id: m.stockItem?.id, name: m.name, deductQty: m.neededQty, unit: m.unit })),
                                                    requesterName: currentUser?.name || currentUser?.username || 'พนักงานบรรจุ'
                                                })
                                            });
                                            if (res.ok) {
                                                await showAlert('ส่งใบเบิกสำเร็จ', 'โปรดรอคลังอนุมัติการเบิกจ่าย', 'success');
                                                fetchTasks();
                                                setSelectedOrder(null);
                                            } else {
                                                showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งใบเบิกได้', 'error');
                                            }
                                        } catch(e) {
                                            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
                                        }
                                    }}
                                >
                                    <Send size={14} /> ส่งใบเบิกให้คลัง
                                </button>
                            </>
                        )}
                        
                        {o.status === 'รอเบิกบรรจุภัณฑ์' && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 600, fontSize: 13, background: '#fef3c7', padding: '8px 14px', borderRadius: 8 }}>
                                <Clock size={14} /> รอคลังอนุมัติใบเบิก
                            </span>
                        )}

                        {o.status === 'รอบรรจุ' && o.requisitionJSON && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontWeight: 600, fontSize: 13, background: '#dcfce7', padding: '8px 14px', borderRadius: 8 }}>
                                    <CheckCircle size={14} /> คลังตัดสต็อกแล้ว
                                </span>
                                <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(`${API_URL}/print/requisition/${o.id}`);
                                            if (!res.ok) throw new Error('Failed to fetch pdf');
                                            const blob = await res.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            window.open(url, '_blank');
                                        } catch (e) {
                                            console.error(e);
                                            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถแสดงใบเบิกได้', 'error');
                                        }
                                    }}
                                >
                                    <FileText size={14} /> ดูใบเบิก
                                </button>
                            </div>
                        )}

                        {o.status === 'รอบรรจุ' && (materials.length === 0 || o.requisitionJSON) && (
                            <button
                                className="btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                onClick={() => {
                                    updateTaskStatus(o.id, 'กำลังบรรจุ');
                                    setSelectedOrder(null);
                                }}
                            >
                                <PlayCircle size={14} /> เริ่มบรรจุ
                            </button>
                        )}
                        
                        {o.status === 'กำลังบรรจุ' && (
                            <>
                                <button
                                    className="btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#6366f1' }}
                                    onClick={() => { handleOpenProgress(o); setSelectedOrder(null); }}
                                >
                                    <Edit3 size={14} /> อัปเดตยอดบรรจุ
                                </button>
                                {o.packed >= o.qty && (
                                    <button
                                        className="btn-primary"
                                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#10b981' }}
                                        onClick={() => { updateTaskStatus(o.id, 'บรรจุเสร็จ'); setSelectedOrder(null); }}
                                    >
                                        <CheckCircle2 size={14} /> บรรจุเสร็จ
                                    </button>
                                )}
                            </>
                        )}
                        {o.status === 'บรรจุเสร็จ' && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7c3aed', fontWeight: 600, fontSize: 13, background: '#f5f3ff', padding: '8px 14px', borderRadius: 8 }}>
                                <ShieldCheck size={14} /> ✅ ส่ง QC Final อัตโนมัติแล้ว
                            </span>
                        )}
                        {o.status === 'QC ผ่าน' && o.destination === 'คลัง' && (
                            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#4338ca' }}
                                onClick={() => handleMarkAsDelivered(o.id)}>
                                <Warehouse size={14} /> ส่งเข้าคลังสินค้า
                            </button>
                        )}
                        {o.status === 'QC ผ่าน' && o.destination === 'จัดส่ง OEM' && (
                            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0d9488' }}
                                onClick={() => handleMarkAsDelivered(o.id)}>
                                <Truck size={14} /> ส่งต่อฝ่ายจัดส่ง (OEM)
                            </button>
                        )}
                        <button className="btn-secondary" onClick={() => setSelectedOrder(null)}
                            style={{ padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <X size={14} /> ปิด
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════
    // Modal: อัปเดตยอดบรรจุ / สแกนบาร์โค้ด
    // ══════════════════════════════════════════════════════════════
    const renderProgressModal = () => {
        if (!progressTarget) return null;
        const o = progressTarget;
        const progress = o.qty > 0 ? Math.floor(((o.packed || 0) / o.qty) * 100) : 0;

        return (
            <div className="pkg-modal-overlay" onClick={() => setProgressTarget(null)}>
                <div className="pkg-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📝 อัปเดตยอดบรรจุ</h2>
                            <button onClick={() => setProgressTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#4f46e5', fontWeight: 600 }}>{o.code} — {o.product}</p>
                    </div>

                    {/* Progress Info */}
                    <div style={{ padding: '16px 24px', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>ความคืบหน้าปัจจุบัน</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>{progress}%</span>
                        </div>
                        <div className="progress-container" style={{ height: 28, borderRadius: 8, marginBottom: 16 }}>
                            <div className="progress-bar" style={{ width: `${progress}%`, backgroundColor: '#6366f1', borderRadius: 8 }} />
                            <span className="progress-text" style={{ fontSize: 12 }}>{(o.packed || 0).toLocaleString()} / {(o.qty || 0).toLocaleString()}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#ef4444', fontWeight: 600 }}>ยอดของเสียสะสม: {o.defectQty || 0} ชิ้น</p>
                    </div>

                    {/* Mode Toggle */}
                    <div style={{ background: '#f1f5f9', padding: '12px 24px', display: 'flex', gap: 12 }}>
                        <button 
                            className={`btn-sm ${!scanMode ? 'btn-primary' : ''}`} 
                            style={{ flex: 1, padding: 10, background: !scanMode ? '#4f46e5' : '#fff', color: !scanMode ? '#fff' : '#64748b', border: '1px solid #cbd5e1' }}
                            onClick={() => setScanMode(false)}
                        >
                            <Edit3 size={16} style={{ marginRight: 6 }} /> พิมพ์กรอกยอด
                        </button>
                        <button 
                            className={`btn-sm ${scanMode ? 'btn-primary' : ''}`} 
                            style={{ flex: 1, padding: 10, background: scanMode ? '#4f46e5' : '#fff', color: scanMode ? '#fff' : '#64748b', border: '1px solid #cbd5e1' }}
                            onClick={() => setScanMode(true)}
                        >
                            <Barcode size={16} style={{ marginRight: 6 }} /> สแกนบาร์โค้ด
                        </button>
                    </div>

                    <div style={{ padding: '20px 24px' }}>
                        {!scanMode ? (() => {
                            const remaining = progressTarget.qty - (progressTarget.packed || 0);
                            const parsedAdded = parseInt(addedQty) || 0;
                            const parsedDefect = parseInt(defectQty) || 0;
                            const totalInput = parsedAdded + parsedDefect;
                            const isExceeded = totalInput > remaining;
                            const isNotEnough = totalInput > 0 && totalInput < remaining;
                            const isInvalid = (parsedAdded <= 0 && parsedDefect <= 0) || isExceeded || isNotEnough;

                            return (
                                // MANUAL INPUT MODE
                                <div style={{ display: 'grid', gap: 16 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>+ ยอดที่ทำได้เพิ่ม (Good Qty)</label>
                                        <input 
                                            type="number" min="0" placeholder="ระบุจำนวนชิ้น..."
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${isExceeded || isNotEnough ? '#ef4444' : '#cbd5e1'}`, fontSize: 16 }}
                                            value={addedQty} onChange={e => setAddedQty(e.target.value)}
                                        />
                                        {isExceeded && (
                                            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                                                ⚠️ ยอดเกินกำหนด! ยอดคงเหลือที่ต้องบรรจุคือ {remaining.toLocaleString()} ชิ้น
                                            </p>
                                        )}
                                        {isNotEnough && (
                                            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                                                ⚠️ ยอดยังไม่ครบ! ต้องบันทึกให้ครบเป้าหมายที่ {remaining.toLocaleString()} ชิ้น
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#ef4444' }}>+ ของเสียที่เกิด (Defect Qty)</label>
                                        <input 
                                            type="number" min="0" placeholder="ถ้าไม่มีไม่ต้องใส่..."
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #fca5a5', fontSize: 16 }}
                                            value={defectQty} onChange={e => setDefectQty(e.target.value)}
                                        />
                                    </div>
                                    
                                    <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#4b5563', margin: '-4px 0 4px' }}>
                                        ยอดรวมที่บันทึก (ดี + เสีย): <span style={{ color: totalInput === remaining ? '#16a34a' : '#ef4444' }}>{totalInput.toLocaleString()}</span> / {remaining.toLocaleString()} ชิ้น
                                    </div>

                                    <button 
                                        className="btn-primary" 
                                        style={{ marginTop: 4, padding: 12, fontSize: 15, opacity: isInvalid ? 0.5 : 1, cursor: isInvalid ? 'not-allowed' : 'pointer' }} 
                                        disabled={isInvalid}
                                        onClick={() => submitProgress(progressTarget.id, addedQty, defectQty)}
                                    >
                                        บันทึกยอด
                                    </button>
                                </div>
                            );
                        })() : (
                            // BARCODE MODE
                            <div>
                                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 16, textAlign: 'center', marginBottom: 16 }}>
                                    <ScanBarcode size={48} style={{ color: '#3b82f6', marginBottom: 12 }} />
                                    <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>พร้อมรับการสแกน</h3>
                                    <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>ให้เคอร์เซอร์อยู่ในช่องด้านล่าง แล้วใช้ปืนยิงบาร์โค้ดได้เลย ถ้ายิง 1 ครั้งระบบจะบวกยอดให้ทันที</p>
                                </div>
                                
                                <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                                    <label style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>ตั้งค่าตัวคูณ: 1 บาร์โค้ด = </label>
                                    <input 
                                        type="number" min="1" 
                                        value={scanMultiplier} onChange={e => setScanMultiplier(parseInt(e.target.value)||1)}
                                        style={{ width: 80, padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, textAlign: 'center', fontWeight: 'bold' }}
                                    />
                                    <span style={{ fontSize: 13, color: '#64748b' }}>ชิ้น</span>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>ช่องรับสัญญาณจากเครื่องสแกนบาร์โค้ด (Barcode Input)</label>
                                    <input 
                                        ref={barcodeInputRef}
                                        type="text" 
                                        placeholder="รอรับสัญญาณบาร์โค้ด..."
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '2px solid #3b82f6', fontSize: 18, background: '#f8fafc', outline: 'none' }}
                                        onKeyDown={handleProgressBarcodeScan}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════
    // Packaging Dashboard
    // ══════════════════════════════════════════════════════════════
    const renderPackaging = () => {
        return (
            <div className="packaging-main">

                {/* ── Active Tasks (Kanban Board) for Pending Orders ── */}
                {hasSectionPermission('packaging_main_orders') && !loading && orders.filter(o => o.status === 'รอเบิกบรรจุภัณฑ์' || o.status === 'รอบรรจุ' || o.status === 'กำลังบรรจุ').length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                        <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <PackageOpen size={18} style={{ color: '#f43f5e' }} /> งานที่ต้องดำเนินการ (รอเบิก / รอบรรจุ / กำลังบรรจุ)
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                            {orders.filter(o => o.status === 'รอเบิกบรรจุภัณฑ์' || o.status === 'รอบรรจุ' || o.status === 'กำลังบรรจุ').map(order => (
                                <div key={order.id} className={`pkg-pending-card ${order.status === 'กำลังบรรจุ' ? 'in-progress' : ''}`} onClick={() => setSelectedOrder(order)}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <span className="pkg-pending-id">{order.code || order.id}</span>
                                            <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                                                <Star size={10} style={{ marginRight: 2, verticalAlign: 'middle'}}/> ความสำคัญ: ปกติ
                                            </span>
                                        </div>
                                        <div className="pkg-pending-product">{order.product}</div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, color: '#64748b' }}>
                                                <Tag size={13} />
                                                <span>ประเภท: ผลิตตามแผน (MTS)</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, color: '#64748b' }}>
                                                <Calendar size={13} />
                                                <span>กำหนดส่ง: <strong style={{ color: '#334155' }}>{order.dueDate ? order.dueDate : '-'}</strong></span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, color: '#64748b' }}>
                                                <Activity size={13} />
                                                <span>สายการผลิต: <strong style={{ color: '#3b82f6' }}>{order.line || '-'}</strong></span>
                                                <span style={{ margin: '0 4px' }}>|</span>
                                                <span>เลขผลิต: <strong style={{ color: '#334155' }}>{order.jobOrderId || order.batch}</strong></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pkg-pending-qty">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ color: '#64748b', fontSize: 13, fontWeight: 'normal' }}>เป้าหมายรวม:</span>
                                            <span style={{ color: '#7b7bf5', fontSize: 16 }}>{order.qty?.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            {order.status === 'กำลังบรรจุ' && (
                                                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: '#e0e7ff', color: '#4338ca' }}>
                                                    กำลังบรรจุ...
                                                </span>
                                            )}
                                            <button 
                                                className="btn-primary"
                                                onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                                                style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                                            >
                                                <Eye size={14} /> ดูรายละเอียด
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Toolbar ── */}
                {hasSectionPermission('packaging_main_orders') && (
                    <>
                        <div className="toolbar">
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div className="search-group">
                                    <div className="search-input-wrap">
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder="ค้นหาคำสั่งบรรจุ..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <button className="search-btn">ค้นหา</button>
                                </div>
                                <CustomSelect
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, background: '#fff', cursor: 'pointer' }}
                                >
                                    {statusOptions.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </CustomSelect>
                            </div>

                        </div>

                        {/* ── Orders Table ── */}
                        <div className="card table-card" style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ whiteSpace: 'nowrap' }}>
                                <thead>
                                    <tr>
                                        <th>รหัส</th>
                                        <th>ผลิตภัณฑ์</th>
                                        <th>เลขผลิต (JO)</th>
                                        <th>Line</th>
                                        <th>ปลายทาง</th>
                                        <th>ความคืบหน้า</th>
                                        <th>สถานะ</th>
                                        <th>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="10" style={{ textAlign: 'center', padding: '32px' }}>กำลังโหลดข้อมูล...</td></tr>
                                    ) : filtered.map(order => {
                                        const dest = getDestBadge(order.destination);
                                        return (
                                            <tr key={order.id}>
                                                <td className="text-bold">{order.code}</td>
                                                <td>{order.product}</td>
                                                <td>{order.jobOrderId || order.batch}</td>
                                                <td>{order.line}</td>
                                                <td>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: dest.bg, color: dest.color, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                                                        {dest.icon} {order.destination}
                                                    </span>
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const pct = order.qty > 0 ? Math.floor(((order.packed || 0) / order.qty) * 100) : 0;
                                                        const isDone = pct === 100;
                                                        return (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <span style={{ fontSize: 13, fontWeight: 600, color: isDone ? '#16a34a' : '#3f3f46' }}>
                                                                    {order.packed.toLocaleString()}<span style={{ color: '#a1a1aa', fontWeight: 400 }}> / {order.qty.toLocaleString()}</span>
                                                                </span>
                                                                <span style={{
                                                                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                                                                    background: isDone ? '#dcfce7' : pct > 0 ? '#fef3c7' : '#f4f4f5',
                                                                    color: isDone ? '#16a34a' : pct > 0 ? '#d97706' : '#a1a1aa',
                                                                }}>
                                                                    {pct}%
                                                                </span>
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td>
                                                    <span className={`badge ${getStatusBadge(order.status)}`} style={order.status === 'QC ผ่าน' ? { background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac' } : {}}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                        <button className="btn-secondary" onClick={() => setSelectedOrder(order)} title="ดูรายละเอียด" style={{ padding: '6px 10px', borderRadius: '6px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Eye size={14} /> รายละเอียด
                                                        </button>
                                                        

                                                        
                                                        {order.status === 'กำลังบรรจุ' && (
                                                            <>
                                                                <button className="btn-primary" onClick={() => handleOpenProgress(order)} style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', color: '#4338ca', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                    <Edit3 size={14} /> อัปเดตยอด
                                                                </button>
                                                                <button className="btn-primary" onClick={() => updateTaskStatus(order.id, 'บรรจุเสร็จ')} style={{ background: '#10b981', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                    <CheckCircle size={14} /> บรรจุเสร็จ
                                                                </button>
                                                            </>
                                                        )}
                                                        
                                                        {order.status === 'บรรจุเสร็จ' && (
                                                            <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, background: '#f3e8ff', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <ShieldCheck size={14} /> รอ QC
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan="10" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                                                ไม่พบรายการที่ค้นหา
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

            </div>
        );
    };
    // ══════════════════════════════════════════════════════════════
    // Materials Dashboard
    // ══════════════════════════════════════════════════════════════
    const renderMaterials = () => {
        return (
            <div className="packaging-materials">
                {hasSectionPermission('packaging_materials_table') && (
                    <div className="card table-card" style={{ marginTop: '20px' }}>
                        <h3 className="card-title">วัสดุบรรจุภัณฑ์คงเหลือ</h3>
                        {pmLoading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>กำลังโหลดข้อมูลวัสดุบรรจุภัณฑ์...</div>
                        ) : (
                        <table className="data-table" style={{ marginTop: 16 }}>
                            <thead>
                                <tr>
                                    <th>รหัสวัสดุ</th>
                                    <th>วัสดุ</th>
                                    <th>คงเหลือ</th>
                                    <th>จองใช้</th>
                                    <th>พร้อมใช้</th>
                                    <th>หน่วย</th>
                                    <th>สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pmItems.length > 0 ? pmItems.map(mat => {
                                    const reserved = mat.reservedQty || 0;
                                    const available = (mat.qty || 0) - reserved;
                                    const lowStock = available <= (mat.minStock || 500);
                                    return (
                                        <tr key={mat.id}>
                                            <td style={{ fontWeight: 600, color: '#1e40af' }}>{mat.id}</td>
                                            <td className="text-bold">{mat.name}</td>
                                            <td>{(mat.qty || 0).toLocaleString()}</td>
                                            <td style={{ color: '#64748b' }}>{reserved.toLocaleString()}</td>
                                            <td style={{ fontWeight: 700, color: lowStock ? 'var(--danger, #e53935)' : 'var(--success, #43a047)' }}>
                                                {available.toLocaleString()}
                                            </td>
                                            <td>{mat.unit}</td>
                                            <td>
                                                <span className={`badge ${lowStock ? 'badge-danger' : 'badge-success'}`}>
                                                    {lowStock ? 'เหลือน้อย' : 'เพียงพอ'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>ไม่มีข้อมูลวัสดุบรรจุภัณฑ์ในระบบ</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (visibleSubPages.length === 0) {
        return <div className="page-container"><p className="no-permission">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;
    }

    // ── กำหนดชื่อหน้าตาม Tab ที่เลือก ──
    const getPageTitle = () => {
        switch (currentTab) {
            case 'packaging_main': return '📦 Packaging (บรรจุภัณฑ์)';
            case 'packaging_materials': return 'วัสดุบรรจุภัณฑ์';
            default: return 'บรรจุภัณฑ์ (Packaging)';
        }
    };

    const getPageDesc = () => {
        switch (currentTab) {
            case 'packaging_main': return 'จัดการงานบรรจุภัณฑ์และติดตามสถานะการบรรจุ → ส่ง QC Final';
            case 'packaging_materials': return 'จัดการข้อมูลวัสดุบรรจุภัณฑ์และสต็อกคงเหลือ';
            default: return 'จัดการการบรรจุภัณฑ์';
        }
    };

    return (
        <div className="page-container packaging-page page-enter">
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <h1>{getPageTitle()}</h1>
                <p>{getPageDesc()}</p>
            </div>
            {currentTab === 'packaging_main' && renderPackaging()}
            {currentTab === 'packaging_materials' && renderMaterials()}
            {renderDetailModal()}
            {renderProgressModal()}
        </div>
    );
}

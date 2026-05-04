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
import {
    PackageOpen, PackageCheck, Clock, AlertTriangle,
    CheckCircle2, Search, Plus, Box, Eye, Send,
    X, ShieldCheck, Truck, Warehouse, Edit3, Barcode, ScanBarcode
} from 'lucide-react';
import './PageCommon.css';
import './Packaging.css';

// ── Mock Data — วัสดุบรรจุภัณฑ์ (ยังไม่เชื่อม DB) ──
const MOCK_PACKAGING_MATERIALS = [
    { id: 1, name: 'กล่องกระดาษลูกฟูก (เล็ก)', inStock: 2500, reserved: 800, unit: 'ใบ' },
    { id: 2, name: 'ขวดพลาสติก PET 30ml', inStock: 1200, reserved: 1000, unit: 'ใบ' },
    { id: 3, name: 'ซองอลูมิเนียม', inStock: 5000, reserved: 1300, unit: 'ซอง' },
    { id: 4, name: 'ฉลากสินค้า (พิมพ์)', inStock: 3000, reserved: 600, unit: 'แผ่น' },
    { id: 5, name: 'ซีลฝาขวด', inStock: 800, reserved: 200, unit: 'ชิ้น' },
];

// ── Helper: สีสถานะ ──
const getStatusBadge = (status) => {
    const map = {
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Packaging() {
    const { getVisibleSubPages, hasSectionPermission } = useAuth();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('packaging');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ทั้งหมด');
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        fetchTasks();
    }, []);

    // ── Stats ──
    const totalOrders = orders.length;
    const inProgress = orders.filter(o => o.status === 'กำลังบรรจุ').length;
    const waiting = orders.filter(o => o.status === 'รอบรรจุ').length;
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
                alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
            }
        } catch (err) {
            console.error('Update err', err);
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
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
                alert('อัปเดตยอดไม่สำเร็จ');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleProgressBarcodeScan = (e) => {
        if (e.key === 'Enter') {
            const code = e.target.value;
            if (code.trim() !== '') {
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
    const statusOptions = ['ทั้งหมด', 'รอบรรจุ', 'กำลังบรรจุ', 'บรรจุเสร็จ', 'รอ QC Final', 'QC ผ่าน', 'ส่งมอบแล้ว'];
    const filtered = orders.filter(o => {
        const matchSearch = (o.product || '').includes(searchTerm) || (o.code || '').includes(searchTerm) || (o.batch || '').includes(searchTerm);
        const matchStatus = statusFilter === 'ทั้งหมด' || o.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // ══════════════════════════════════════════════════════════════
    // Modal: รายละเอียดคำสั่งบรรจุ
    // ══════════════════════════════════════════════════════════════
    const renderDetailModal = () => {
        if (!selectedOrder) return null;
        const o = selectedOrder;
        const dest = getDestBadge(o.destination);
        const progress = o.qty > 0 ? Math.floor(((o.packed || 0) / o.qty) * 100) : 0;

        return (
            <div className="pkg-modal-overlay" onClick={() => setSelectedOrder(null)}>
                <div className="pkg-modal" onClick={e => e.stopPropagation()}>
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

                    {/* Body */}
                    <div style={{ padding: '20px 24px' }}>
                        {/* Status + Destination */}
                        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                            <span className={`badge ${getStatusBadge(o.status)}`} style={{ fontSize: 13, padding: '6px 14px' }}>
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
                                <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>Batch</span>
                                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{o.batch}</p>
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
                                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{o.dueDate}</p>
                            </div>
                            {o.customer && (
                                <div>
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
                        {!scanMode ? (
                            // MANUAL INPUT MODE
                            <div style={{ display: 'grid', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>+ ยอดที่ทำได้เพิ่ม (Good Qty)</label>
                                    <input 
                                        type="number" min="0" placeholder="ระบุจำนวนชิ้น..."
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 16 }}
                                        value={addedQty} onChange={e => setAddedQty(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#ef4444' }}>+ ของเสียที่เกิด (Defect Qty)</label>
                                    <input 
                                        type="number" min="0" placeholder="ถ้าไม่มีไม่ต้องใส่..."
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #fca5a5', fontSize: 16 }}
                                        value={defectQty} onChange={e => setDefectQty(e.target.value)}
                                    />
                                </div>
                                <button className="btn-primary" style={{ marginTop: 8, padding: 12, fontSize: 15 }} onClick={() => submitProgress(progressTarget.id, addedQty, defectQty)}>
                                    บันทึกยอด
                                </button>
                            </div>
                        ) : (
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

                {/* ── Summary Cards ── */}
                {hasSectionPermission('packaging_main_stats') && (
                    <div className="summary-row">
                        <div className="card summary-card">
                            <div className="summary-icon" style={{ background: '#f0ebff', color: '#7b7bf5' }}><Box size={20} /></div>
                            <div><span className="summary-label">คำสั่งบรรจุทั้งหมด</span><span className="summary-value">{totalOrders}</span></div>
                        </div>
                        <div className="card summary-card">
                            <div className="summary-icon" style={{ background: '#fce4ec', color: '#e53935' }}><AlertTriangle size={20} /></div>
                            <div><span className="summary-label">รอบรรจุ</span><span className="summary-value">{waiting}</span></div>
                        </div>
                        <div className="card summary-card">
                            <div className="summary-icon" style={{ background: '#fff8e1', color: '#f9a825' }}><Clock size={20} /></div>
                            <div><span className="summary-label">กำลังบรรจุ</span><span className="summary-value">{inProgress}</span></div>
                        </div>
                        <div className="card summary-card">
                            <div className="summary-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}><PackageCheck size={20} /></div>
                            <div><span className="summary-label">บรรจุเสร็จ / รอ QC</span><span className="summary-value">{readyForQC + waitingQC}</span></div>
                        </div>
                        <div className="card summary-card">
                            <div className="summary-icon" style={{ background: '#e8f5e9', color: '#43a047' }}><CheckCircle2 size={20} /></div>
                            <div><span className="summary-label">QC ผ่าน / ส่งมอบ</span><span className="summary-value">{completed}</span></div>
                        </div>
                    </div>
                )}



                {/* ── Active Tasks (Kanban Board) ── */}
                {loading ? null : (
                    <div style={{ marginBottom: 24 }}>
                        <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <PackageOpen size={18} className="pkg-pulse" /> งานบรรจุภัณฑ์ที่กำลังดำเนินการ
                        </h3>
                        <div className="pkg-active-grid">
                            {orders.filter(o => o.status === 'รอบรรจุ' || o.status === 'กำลังบรรจุ').map(order => (
                                <div key={order.id} className="pkg-active-card">
                                    <div className="pkg-active-top">
                                        <div>
                                            <span className="pkg-active-batch">{order.batch}</span>
                                            <span className="pkg-batch-code">รหัส: {order.code}</span>
                                            {order.jobOrderId && <span className="pkg-batch-code" style={{ color: '#4f46e5' }}>📋 {order.jobOrderId}</span>}
                                        </div>
                                        <span className={`badge ${getStatusBadge(order.status)}`}>{order.status}</span>
                                    </div>
                                    <div className="pkg-active-product">{order.product}</div>
                                    <div className="pkg-active-meta">
                                        <Box size={14} /> {order.packType || '-'} • {order.line || '-'}
                                    </div>
                                    <div className="progress-container">
                                        <div className="progress-bar" style={{ width: `${order.qty > 0 ? ((order.packed || 0) / order.qty) * 100 : 0}%`, backgroundColor: 'var(--primary)' }}></div>
                                        <span className="progress-text">{(order.packed || 0).toLocaleString()} / {(order.qty || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="pkg-active-actions">
                                        {order.status === 'รอบรรจุ' ? (
                                            <button className="pkg-btn-start" onClick={() => updateTaskStatus(order.id, 'กำลังบรรจุ')}>
                                                เริ่มบรรจุ
                                            </button>
                                        ) : order.status === 'กำลังบรรจุ' ? (
                                            <>
                                                <button className="pkg-btn-complete" style={{ flex: 1, background: '#e0e7ff', color: '#4338ca', borderColor: '#c7d2fe' }} onClick={() => handleOpenProgress(order)}>
                                                    📝 อัปเดตยอด
                                                </button>
                                                <button className="pkg-btn-complete" style={{ flex: 1 }} onClick={() => updateTaskStatus(order.id, 'บรรจุเสร็จ')}>
                                                    <CheckCircle2 size={14} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} /> บรรจุเสร็จ
                                                </button>
                                            </>
                                        ) : null}
                                        <button className="btn-sm" onClick={() => setSelectedOrder(order)} style={{ background: '#f4f4f5', color: '#1a1a2e', border: '1px solid #e4e4e7', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, width: order.status === 'กำลังบรรจุ' ? 'auto' : undefined }}>
                                            <Eye size={14} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {orders.filter(o => o.status === 'รอบรรจุ' || o.status === 'กำลังบรรจุ').length === 0 && (
                                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                                    ✅ ไม่มีงานบรรจุภัณฑ์ที่ค้างอยู่
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Toolbar ── */}
                {hasSectionPermission('packaging_main_orders') && (
                    <>
                        <div className="toolbar">
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div className="search-box">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="ค้นหาคำสั่งบรรจุ..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, background: '#fff', cursor: 'pointer' }}
                                >
                                    {statusOptions.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                        </div>

                        {/* ── Orders Table ── */}
                        <div className="card table-card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รหัส</th>
                                        <th>ผลิตภัณฑ์</th>
                                        <th>Batch</th>
                                        <th>ประเภทบรรจุ</th>
                                        <th>Line</th>
                                        <th>ปลายทาง</th>
                                        <th>ความคืบหน้า</th>
                                        <th>กำหนดส่ง</th>
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
                                                <td>{order.batch}</td>
                                                <td><span className="badge badge-info">{order.packType || '-'}</span></td>
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
                                                <td>{order.dueDate}</td>
                                                <td>
                                                    <span className={`badge ${getStatusBadge(order.status)}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button className="btn-sm" onClick={() => setSelectedOrder(order)} title="ดูรายละเอียด">
                                                            <Eye size={14} />
                                                        </button>
                                                        {order.status === 'บรรจุเสร็จ' && (
                                                            <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>✅ รอ QC</span>
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
                        <h3 className="card-title">🧱 วัสดุบรรจุภัณฑ์คงเหลือ</h3>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>วัสดุ</th>
                                    <th>คงเหลือ</th>
                                    <th>จองใช้</th>
                                    <th>พร้อมใช้</th>
                                    <th>หน่วย</th>
                                    <th>สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_PACKAGING_MATERIALS.map(mat => {
                                    const available = mat.inStock - mat.reserved;
                                    const lowStock = available < 500;
                                    return (
                                        <tr key={mat.id}>
                                            <td className="text-bold">{mat.name}</td>
                                            <td>{mat.inStock.toLocaleString()}</td>
                                            <td>{mat.reserved.toLocaleString()}</td>
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
                                })}
                            </tbody>
                        </table>
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
            case 'packaging_materials': return '🧱 วัสดุบรรจุภัณฑ์';
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

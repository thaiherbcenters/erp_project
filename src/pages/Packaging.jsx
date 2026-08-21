/**
 * =============================================================================
 * Packaging.jsx — หน้า แพ็คกิ้ง (เตรียมจัดส่ง) สำหรับ Fulfillment
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    PackageOpen, Search, Eye, X, Box, CheckCircle, HelpCircle, Star, Tag, Calendar, Activity, ListOrdered, FileText, Send
} from 'lucide-react';
import './PageCommon.css';
import './Packaging.css';
import API_BASE from '../config';
import { useAlert } from '../components/CustomAlert';
import CustomSelect from '../components/CustomSelect';

const getStatusBadge = (status) => {
    const map = {
        'รอเบิกวัสดุแพ็ค': 'badge-warning',
        'รอคลังอนุมัติ': 'badge-info',
        'รอแพ็ค': 'badge-warning',
        'กำลังแพ็ค': 'badge-warning',
        'รอจัดส่ง': 'badge-info',
        'กำลังจัดส่ง': 'badge-purple',
        'ส่งมอบแล้ว': 'badge-success',
    };
    return map[status] || 'badge-info';
};

export default function Packaging() {
    const { getVisibleSubPages } = useAuth();
    const { showAlert } = useAlert();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('packaging');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ทั้งหมด'); // Default filter to show all in history
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    const [pmMaterials, setPmMaterials] = useState([]);

    const [reqItems, setReqItems] = useState([]);
    const [selectedPm, setSelectedPm] = useState('');
    const [reqQty, setReqQty] = useState('');
    const { user } = useAuth(); // for requester name

    const handleSendRequisition = async (order) => {
        if (reqItems.length === 0) {
            showAlert('แจ้งเตือน', 'กรุณาเพิ่มรายการวัสดุที่ต้องการเบิกอย่างน้อย 1 รายการ', 'warning');
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/shipping/${order.ShipmentID}/requisition`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    requisitionItems: reqItems.map(it => ({ id: it.id, name: it.name, deductQty: it.reqQty, unit: it.unit })),
                    requesterName: user?.name || user?.username || 'พนักงานจัดส่ง'
                })
            });
            if (res.ok) {
                showAlert('สำเร็จ', 'ส่งใบเบิกไปคลังสินค้าเรียบร้อยแล้ว', 'success');
                fetchTasks();
                setSelectedOrder(null);
                setReqItems([]);
            } else {
                showAlert('ข้อผิดพลาด', 'ไม่สามารถส่งใบเบิกได้', 'error');
            }
        } catch (err) {
            console.error(err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        }
    };

    const [loadingPm, setLoadingPm] = useState(false);
    const [pmSearch, setPmSearch] = useState('');

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/shipping`);
            if (!res.ok) throw new Error('Failed to fetch shipping orders');
            let data = await res.json();
            
            data = data.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
            setOrders(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPmMaterials = async () => {
        setLoadingPm(true);
        try {
            // limit to a high number to get all PM items, or we can use the same logic as Stock
            const res = await fetch(`${API_BASE}/stock?page=1&limit=500&search=${encodeURIComponent(pmSearch)}&category=${encodeURIComponent('บรรจุภัณฑ์')}`);
            if (!res.ok) throw new Error('Failed to fetch packaging materials');
            const data = await res.json();
            setPmMaterials(data.data || []);
        } catch (err) {
            console.error('Error fetching PM materials:', err);
        } finally {
            setLoadingPm(false);
        }
    };

    useEffect(() => {
        if (currentTab === 'packaging_main') {
            fetchTasks();
            fetchPmMaterials(); // Fetch PM materials so the dropdown in the modal has data
        } else if (currentTab === 'packaging_materials') {
            fetchPmMaterials();
        }
    }, [currentTab]);

    useEffect(() => {
        if (currentTab === 'packaging_materials') {
            const delay = setTimeout(() => {
                fetchPmMaterials();
            }, 500);
            return () => clearTimeout(delay);
        }
    }, [pmSearch]);

    const updateStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`${API_BASE}/shipping/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchTasks();
                setSelectedOrder(prev => prev?.ShipmentID === id ? { ...prev, Status: newStatus } : prev);
                return true;
            } else {
                showAlert('เกิดข้อผิดพลาด', 'อัปเดตสถานะไม่สำเร็จ', 'error');
                return false;
            }
        } catch (err) {
            console.error(err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
            return false;
        }
    };

    const handleStartPacking = async (order) => {
        const ok = await updateStatus(order.ShipmentID, 'กำลังแพ็ค');
        if (ok) {
            showAlert('สำเร็จ', 'เริ่มดำเนินการแพ็คสินค้าแล้ว', 'success');
        }
    };

    const handleFinishPacking = async (order) => {
        const ok = await updateStatus(order.ShipmentID, 'รอจัดส่ง');
        if (ok) {
            showAlert('สำเร็จ', 'แพ็คสินค้าเสร็จสิ้น ส่งต่อให้ฝ่ายจัดส่งเรียบร้อยแล้ว', 'success');
            setSelectedOrder(null); // Close modal when done
        }
    };

    // ── Filters ──
    const filtered = orders.filter(o => {
        const matchSearch = (o.ShipmentID || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (o.BatchNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (o.ProductName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (o.CustomerName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'ทั้งหมด' ? true : o.Status === statusFilter;
        return matchSearch && matchStatus;
    });

    if (visibleSubPages.length === 0) {
        return <div className="page-container"><p className="no-permission">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;
    }

    const getPageTitle = () => {
        switch (currentTab) {
            case 'packaging_main': return 'แพ็คกิ้ง (เตรียมจัดส่ง)';
            case 'packaging_materials': return 'วัสดุแพ็คกิ้ง';
            default: return 'แพ็คกิ้ง (เตรียมจัดส่ง)';
        }
    };

    const getPageDesc = () => {
        switch (currentTab) {
            case 'packaging_main': return 'จัดการแพ็คสินค้าลงกล่องเพื่อเตรียมส่งให้ฝ่ายจัดส่ง (Shipping)';
            case 'packaging_materials': return 'จัดการข้อมูลวัสดุบรรจุภัณฑ์ (กล่อง, เทป, ฯลฯ) และสต็อกคงเหลือ';
            default: return 'จัดการการแพ็คกิ้ง';
        }
    };

    const renderDetailModal = () => {
        if (!selectedOrder) return null;
        const o = selectedOrder;

        return (
            <div className="pkg-modal-overlay" onClick={() => setSelectedOrder(null)}>
                <div className="pkg-modal" style={{ maxWidth: 600, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                    <div style={{ background: '#f8fafc', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📦 รายละเอียดการแพ็ค: {o.ShipmentID}</h2>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{o.CustomerName ? `ลูกค้า: ${o.CustomerName}` : 'ไม่มีข้อมูลลูกค้า'}</p>
                        </div>
                        <button onClick={() => setSelectedOrder(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            <div className="detail-group">
                                <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>ผลิตภัณฑ์</label>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{o.ProductName}</div>
                            </div>
                            <div className="detail-group">
                                <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>เลขแบตช์ (Batch)</label>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{o.BatchNo}</div>
                            </div>
                            <div className="detail-group">
                                <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>จำนวนที่ต้องแพ็ค</label>
                                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>{o.Quantity} <span style={{fontSize: 14, fontWeight: 'normal'}}>ชิ้น</span></div>
                            </div>
                            <div className="detail-group">
                                <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>สถานะ</label>
                                <div>
                                    <span className={`badge ${getStatusBadge(o.Status)}`}>
                                        {o.Status}
                                    </span>
                                </div>
                            </div>
                            <div className="detail-group" style={{ gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>หมายเหตุ</label>
                                <div style={{ background: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: 6, fontSize: 13 }}>
                                    {o.Notes || '-'}
                                </div>
                            </div>
                        </div>

                        {o.Status === 'กำลังแพ็ค' && (
                            <div style={{ textAlign: 'center', marginBottom: 24, padding: '16px 0' }}>
                                <div style={{ animation: 'pkgSlideUp 0.5s ease-out' }}>
                                    <img src="/person-packing.png" alt="Packing" style={{ width: 260, height: 260, objectFit: 'contain', animation: 'pulse-slow 2s infinite ease-in-out' }} />
                                </div>
                                <div style={{ color: '#d97706', fontWeight: 600, fontSize: 18, marginTop: 12, animation: 'pkgFadeIn 1s' }}>กำลังดำเนินการแพ็คสินค้า...</div>
                            </div>
                        )}

                        {/* --- Requisition Section --- */}
                        {(o.Status === 'รอแพ็ค' || o.Status === 'รอเบิกวัสดุแพ็ค') && (
                            <div style={{ marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#334155' }}>📦 ขอเบิกวัสดุแพ็คกิ้งจากคลัง</h4>
                                
                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                    <CustomSelect 
                                        usePortal={true}
                                        value={selectedPm}
                                        onChange={e => setSelectedPm(e.target.value)}
                                        style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', height: 38 }}
                                    >
                                        <option value="">-- เลือกวัสดุแพ็คกิ้ง --</option>
                                        {pmMaterials.map(pm => (
                                            <option key={pm.id} value={pm.id}>{pm.name} (คงเหลือ: {pm.qty} {pm.unit})</option>
                                        ))}
                                    </CustomSelect>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        placeholder="จำนวน" 
                                        value={reqQty}
                                        onChange={e => setReqQty(e.target.value)}
                                        style={{ width: 100, padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                                        min="1"
                                    />
                                    <button 
                                        type="button"
                                        style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                        onClick={() => {
                                            if (!selectedPm || !reqQty || reqQty <= 0) {
                                                showAlert('แจ้งเตือน', 'กรุณาเลือกวัสดุและระบุจำนวนให้ถูกต้อง', 'warning');
                                                return;
                                            }
                                            const item = pmMaterials.find(x => String(x.id) === String(selectedPm));
                                            if (item) {
                                                setReqItems([...reqItems, { ...item, reqQty: Number(reqQty) }]);
                                                setSelectedPm('');
                                                setReqQty('');
                                            }
                                        }}
                                    >
                                        เพิ่ม
                                    </button>
                                </div>

                                {reqItems.length > 0 && (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff' }}>
                                        <thead>
                                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                                                <th style={{ padding: '8px', textAlign: 'left' }}>รายการ</th>
                                                <th style={{ padding: '8px', textAlign: 'right' }}>จำนวนขอเบิก</th>
                                                <th style={{ padding: '8px', textAlign: 'center', width: 50 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reqItems.map((rit, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '8px' }}>{rit.name}</td>
                                                    <td style={{ padding: '8px', textAlign: 'right' }}>{rit.reqQty} {rit.unit}</td>
                                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                                        <button 
                                                            style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                                            onClick={() => setReqItems(reqItems.filter((_, i) => i !== idx))}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                    <button 
                                        type="button"
                                        style={{ padding: '8px 16px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                                        onClick={async () => {
                                            if (reqItems.length === 0) {
                                                showAlert('แจ้งเตือน', 'กรุณาเพิ่มรายการวัสดุที่ต้องการเบิกก่อน', 'warning');
                                                return;
                                            }
                                            try {
                                                const reqData = {
                                                    formulaName: o.ProductName,
                                                    expectedQty: o.Quantity,
                                                    unit: 'ชิ้น',
                                                    jobOrderId: o.ShipmentID,
                                                    taskId: o.ShipmentID,
                                                    batchNo: o.BatchNo,
                                                    items: reqItems.map(m => ({ id: m.id, name: m.name, deductQty: m.reqQty, unit: m.unit })),
                                                    date: new Date().toLocaleDateString('th-TH'),
                                                    requesterName: user?.name || user?.username || 'พนักงานจัดส่ง'
                                                };
                                                const res = await fetch(`${API_BASE}/print/requisition/preview`, {
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
                                        <FileText size={14} /> พรีวิวใบเบิก
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleSendRequisition(o)}
                                        style={{ padding: '8px 16px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                                    >
                                        <Send size={14} /> ส่งใบเบิกให้คลัง
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #e2e8f0', padding: '16px 24px', background: '#fff', flexShrink: 0 }}>
                            {o.RequisitionJSON && (() => {
                                let history = [];
                                try {
                                    let parsed = JSON.parse(o.RequisitionJSON);
                                    if (Array.isArray(parsed)) {
                                        if (parsed.length > 0 && parsed[0].id && !parsed[0].items) history = [{items:parsed}];
                                        else history = parsed;
                                    } else if (parsed && parsed.items) {
                                        history = [parsed];
                                    }
                                } catch(e){}
                                
                                return history.length > 0 ? history.map((req, idx) => (
                                    <button 
                                        key={idx}
                                        className="btn-secondary" 
                                        style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}
                                        onClick={async () => {
                                            try {
                                                const res = await fetch(`${API_BASE}/print/requisition/${o.ShipmentID}?index=${idx}`);
                                                if (res.ok) {
                                                    const blob = await res.blob();
                                                    window.open(window.URL.createObjectURL(blob), '_blank');
                                                } else {
                                                    showAlert('ข้อผิดพลาด', 'ไม่สามารถแสดงใบเบิกได้', 'error');
                                                }
                                            } catch(e) { console.error(e); }
                                        }}
                                    >
                                        <FileText size={14} /> ใบเบิกครั้งที่ {idx + 1}
                                    </button>
                                )) : null;
                            })()}
                            {o.Status === 'รอแพ็ค' && (
                                <button className="btn-primary" onClick={() => handleStartPacking(o)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                                    <Box size={16} /> เริ่มแพ็คสินค้า
                                </button>
                            )}
                            {o.Status === 'กำลังแพ็ค' && (
                                <button className="btn-primary" onClick={() => handleFinishPacking(o)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#10b981', borderColor: '#10b981' }}>
                                    <CheckCircle size={16} /> แพ็คเสร็จสิ้น (ส่งมอบฝ่ายจัดส่ง)
                                </button>
                            )}
                            <button className="btn-secondary" onClick={() => setSelectedOrder(null)}>
                                ปิดหน้าต่าง
                            </button>
                        </div>
                </div>
            </div>
        );
    };

    const renderMainTab = () => {
        const activeOrders = orders.filter(o => 
            (['รอเบิกวัสดุแพ็ค', 'รอคลังอนุมัติ', 'รอแพ็ค', 'กำลังแพ็ค'].includes(o.Status)) &&
            (!searchTerm || 
             (o.ShipmentID && o.ShipmentID.toLowerCase().includes(searchTerm.toLowerCase())) || 
             (o.ProductName && o.ProductName.toLowerCase().includes(searchTerm.toLowerCase())) || 
             (o.BatchNo && o.BatchNo.toLowerCase().includes(searchTerm.toLowerCase())))
        );

        return (
            <div className="packaging-main-tab">
                {/* ── Active Tasks (Cards) ── */}
                {!loading && activeOrders.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                        <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <PackageOpen size={18} style={{ color: '#f43f5e' }} /> งานที่ต้องดำเนินการ (รอแพ็ค / กำลังแพ็ค)
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                            {activeOrders.map(order => (
                                <div key={order.ShipmentID} className={`pkg-pending-card ${order.Status === 'กำลังแพ็ค' ? 'in-progress' : ''}`} onClick={() => setSelectedOrder(order)}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <span className="pkg-pending-id">{order.ShipmentID}</span>
                                            <span className={`badge ${getStatusBadge(order.Status)}`} style={{ fontSize: 11 }}>
                                                {order.Status}
                                            </span>
                                        </div>
                                        <div className="pkg-pending-product">{order.ProductName}</div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, color: '#64748b' }}>
                                                <Tag size={13} />
                                                <span>ลูกค้า: <strong style={{ color: '#334155' }}>{order.CustomerName || 'คลังสินค้า'}</strong></span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, color: '#64748b' }}>
                                                <ListOrdered size={13} />
                                                <span>เลขแบตช์: <strong style={{ color: '#334155' }}>{order.BatchNo || '-'}</strong></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pkg-pending-qty">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ color: '#64748b', fontSize: 13, fontWeight: 'normal' }}>จำนวน:</span>
                                            <span style={{ color: '#7b7bf5', fontSize: 16 }}>{order.Quantity?.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            {order.Status === 'กำลังแพ็ค' && (
                                                <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleFinishPacking(order); }} style={{ background: '#10b981', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <CheckCircle size={14} /> แพ็คเสร็จ
                                                </button>
                                            )}
                                            <button 
                                                className="btn-primary"
                                                onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                                                style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569' }}
                                            >
                                                <Eye size={14} /> ตรวจเพื่อเริ่ม
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="card-title" style={{ fontSize: '1.1rem', marginBottom: 12, marginTop: activeOrders.length > 0 ? 24 : 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Activity size={18} style={{ color: '#3b82f6' }} /> ตารางประวัติรายการแพ็คกิ้ง
                </div>

                <div className="toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                    <div className="search-group" style={{ display: 'flex', gap: 8, flex: 1, minWidth: 250 }}>
                        <div className="search-input-wrap" style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0 12px', flex: 1 }}>
                            <Search size={16} color="#9ca3af" />
                            <input 
                                type="text" 
                                placeholder="ค้นหาประวัติ..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ border: 'none', outline: 'none', padding: '10px 8px', fontSize: 13, background: 'transparent', width: '100%' }}
                            />
                        </div>
                    </div>
                    <CustomSelect 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value)} 
                        style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, background: '#fff', cursor: 'pointer', minWidth: 160, width: 200, height: 42 }}
                    >
                        <option value="ทั้งหมด">ทั้งหมด</option>
                        <option value="รอเบิกวัสดุแพ็ค">รอเบิกวัสดุแพ็ค</option>
                    <option value="รอคลังอนุมัติ">รอคลังอนุมัติ</option>
                    <option value="รอแพ็ค">รอแพ็ค</option>
                        <option value="กำลังแพ็ค">กำลังแพ็ค</option>
                        <option value="รอจัดส่ง">รอจัดส่ง (แพ็คเสร็จแล้ว)</option>
                    </CustomSelect>
                </div>

                <div className="card table-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>รหัสคำสั่ง</th>
                                <th>ผลิตภัณฑ์</th>
                                <th>เลขแบตช์ (Batch)</th>
                                <th>ลูกค้า / ปลายทาง</th>
                                <th>จำนวน</th>
                                <th>สถานะ</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}><div className="loading-spinner"></div></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                            <PackageOpen size={48} color="#cbd5e1" />
                                            <p>ไม่พบข้อมูลคำสั่งแพ็คกิ้ง</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(order => (
                                    <tr key={order.ShipmentID} className="clickable-row" onClick={() => setSelectedOrder(order)}>
                                        <td style={{ fontWeight: 600, color: '#334155' }}>{order.ShipmentID}</td>
                                        <td>{order.ProductName}</td>
                                        <td>{order.BatchNo}</td>
                                        <td>{order.CustomerName || 'คลังสินค้า'}</td>
                                        <td style={{ fontWeight: 'bold' }}>{order.Quantity?.toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(order.Status)}`}>
                                                {order.Status}
                                            </span>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                                                    style={{ 
                                                        padding: '6px', borderRadius: 6, background: '#ffffff', color: '#64748b',
                                                        border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s ease',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                    }}
                                                    title="ดูรายละเอียดการแพ็ค"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                
                                                {order.Status === 'กำลังแพ็ค' && (
                                                    <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleFinishPacking(order); }} style={{ background: '#10b981', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <CheckCircle size={14} /> แพ็คเสร็จ
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {renderDetailModal()}
            </div>
        );
    };

    const renderMaterialsTab = () => (
        <div className="packaging-materials-tab">
            <div className="toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                <div className="search-group" style={{ display: 'flex', gap: 8, flex: 1, minWidth: 250 }}>
                    <div className="search-input-wrap" style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0 12px', flex: 1 }}>
                        <Search size={16} color="#9ca3af" />
                        <input 
                            type="text" 
                            placeholder="ค้นหาวัสดุบรรจุภัณฑ์ (PM)..." 
                            value={pmSearch}
                            onChange={e => setPmSearch(e.target.value)}
                            style={{ border: 'none', outline: 'none', padding: '10px 8px', fontSize: 13, background: 'transparent', width: '100%' }}
                        />
                    </div>
                </div>
            </div>

            <div className="card table-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>รหัสสินค้า</th>
                            <th>ชื่อวัสดุบรรจุภัณฑ์</th>
                            <th>ยอดคงเหลือ</th>
                            <th>หน่วย</th>
                            <th>สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingPm ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}><div className="loading-spinner"></div></td></tr>
                        ) : pmMaterials.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                        <Box size={48} color="#cbd5e1" />
                                        <p>ไม่พบข้อมูลวัสดุบรรจุภัณฑ์</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            pmMaterials.map(item => (
                                <tr key={item.id}>
                                    <td style={{ fontWeight: 600, color: '#1e40af' }}>{item.id}</td>
                                    <td>
                                        <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                        {item.nameEN && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal', marginTop: '2px' }}>{item.nameEN}</div>}
                                    </td>
                                    <td style={{ fontWeight: 700, color: item.qty > 0 ? '#059669' : '#ef4444' }}>
                                        {item.qty?.toLocaleString()}
                                    </td>
                                    <td>{item.unit}</td>
                                    <td>
                                        <span className={`badge ${item.qty > 0 ? 'badge-success' : 'badge-error'}`}>
                                            {item.qty > 0 ? 'มีสินค้า' : 'หมด'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: 24 }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
                    {getPageTitle()}
                </h1>
                <p className="page-desc" style={{ marginTop: 8 }}>{getPageDesc()}</p>
            </div>

            <div className="content-area">
                {currentTab === 'packaging_main' ? renderMainTab() : renderMaterialsTab()}
            </div>
        </div>
    );
}

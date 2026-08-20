/**
 * =============================================================================
 * Packaging.jsx — หน้า แพ็คกิ้ง (เตรียมจัดส่ง) สำหรับ Fulfillment
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    PackageOpen, Search, Eye, X, Box, CheckCircle, HelpCircle
} from 'lucide-react';
import './PageCommon.css';
import './Packaging.css';
import API_BASE from '../config';
import { useAlert } from '../components/CustomAlert';
import CustomSelect from '../components/CustomSelect';

const getStatusBadge = (status) => {
    const map = {
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
    const [statusFilter, setStatusFilter] = useState('รอแพ็ค'); // Default filter to focus on actionable items
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    const [pmMaterials, setPmMaterials] = useState([]);
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
            } else {
                showAlert('เกิดข้อผิดพลาด', 'อัปเดตสถานะไม่สำเร็จ', 'error');
            }
        } catch (err) {
            console.error(err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        }
    };

    const handleStartPacking = (order) => {
        updateStatus(order.ShipmentID, 'กำลังแพ็ค');
    };

    const handleFinishPacking = (order) => {
        updateStatus(order.ShipmentID, 'รอจัดส่ง');
        setSelectedOrder(null); // Close modal when done
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
            <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
                <div className="modal-content" style={{ maxWidth: 600, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                    <div style={{ background: '#f8fafc', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📦 รายละเอียดการแพ็ค: {o.ShipmentID}</h2>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{o.CustomerName ? `ลูกค้า: ${o.CustomerName}` : 'ไม่มีข้อมูลลูกค้า'}</p>
                        </div>
                        <button onClick={() => setSelectedOrder(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ padding: '24px' }}>
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

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
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
            </div>
        );
    };

    const renderMainTab = () => (
        <div className="packaging-main-tab">
            <div className="toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                <div className="search-group" style={{ display: 'flex', gap: 8, flex: 1, minWidth: 250 }}>
                    <div className="search-input-wrap" style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0 12px', flex: 1 }}>
                        <Search size={16} color="#9ca3af" />
                        <input 
                            type="text" 
                            placeholder="ค้นหาคำสั่งแพ็ค..." 
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
                                    <td style={{ fontWeight: 'bold' }}>{order.Quantity}</td>
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
                                            
                                            {order.Status === 'รอแพ็ค' && (
                                                <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleStartPacking(order); }} style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', color: '#4338ca', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Box size={14} /> เริ่มแพ็ค
                                                </button>
                                            )}
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

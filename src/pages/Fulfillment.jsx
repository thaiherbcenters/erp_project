import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, Eye, XCircle, MapPin, Calendar, User, ArrowRight } from 'lucide-react';
import './PageCommon.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function Fulfillment() {
    const { getVisibleSubPages, hasSectionPermission } = useAuth();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('fulfillment');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;

    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({ pending: 0, inTransit: 0, delivered: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersRes, statsRes] = await Promise.all([
                fetch(`${API_BASE}/shipping`),
                fetch(`${API_BASE}/shipping/stats/summary`)
            ]);
            if (ordersRes.ok) setOrders(await ordersRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
        } catch (err) {
            console.error('Failed to fetch shipping data:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, newStatus) => {
        setUpdatingId(id);
        try {
            const res = await fetch(`${API_BASE}/shipping/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, shippedBy: 'system' })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    const fmtDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };
    const fmtDateShort = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'รอจัดส่ง': return 'badge-warning';
            case 'กำลังจัดส่ง': return 'badge-info';
            case 'ส่งมอบแล้ว': return 'badge-success';
            default: return '';
        }
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'รอจัดส่ง': return <Clock size={14} />;
            case 'กำลังจัดส่ง': return <Truck size={14} />;
            case 'ส่งมอบแล้ว': return <CheckCircle size={14} />;
            default: return null;
        }
    };

    const getPriorityStyle = (p) => {
        if (p === 'สูง') return { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
        if (p === 'ปกติ') return { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' };
        return { background: '#f5f5f4', color: '#78716c', border: '1px solid #e7e5e4' };
    };

    if (visibleSubPages.length === 0) {
        return <div className="page-container"><p className="no-permission">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;
    }

    const renderDashboard = () => (
        <div className="fulfillment-dashboard">
            <div className="page-title">
                <h1>🚚 Shipping Dashboard</h1>
                <p>ภาพรวมและสถานะการจัดส่งสินค้า OEM ให้ลูกค้า</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Clock /></div>
                    <div className="stat-info">
                        <h3>รอจัดส่ง</h3>
                        <p className="stat-value">{stats.pending} <span style={{ fontSize: 14, fontWeight: 400 }}>รายการ</span></p>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><Truck /></div>
                    <div className="stat-info">
                        <h3>กำลังจัดส่ง</h3>
                        <p className="stat-value">{stats.inTransit} <span style={{ fontSize: 14, fontWeight: 400 }}>รายการ</span></p>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}><CheckCircle /></div>
                    <div className="stat-info">
                        <h3>ส่งมอบแล้ว</h3>
                        <p className="stat-value">{stats.delivered} <span style={{ fontSize: 14, fontWeight: 400 }}>รายการ</span></p>
                    </div>
                </div>
            </div>

            {/* Quick view of pending orders */}
            {stats.pending > 0 && (
                <div className="card" style={{ marginTop: 24 }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>⚡ งานที่รอจัดส่ง</h3>
                            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#71717a' }}>รายการ OEM ที่ผลิตเสร็จและรอการจัดส่ง</p>
                        </div>
                    </div>
                    <div style={{ padding: 16 }}>
                        {loading ? (
                            <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                                {orders.filter(o => o.Status === 'รอจัดส่ง').map(order => (
                                    <div key={order.ShipmentID} style={{
                                        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16,
                                        transition: 'all 0.2s', cursor: 'pointer'
                                    }}
                                        onClick={() => setSelectedOrder(order)}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                                            <span style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>{order.ShipmentID}</span>
                                            <span style={{ ...getPriorityStyle(order.Priority), padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                                {order.Priority}
                                            </span>
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{order.ProductName}</div>
                                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#78716c' }}>
                                            <span>📦 {order.Quantity?.toLocaleString()} ชิ้น</span>
                                            <span>🏢 {order.CustomerName || '-'}</span>
                                        </div>
                                        {order.DueDate && (
                                            <div style={{ marginTop: 6, fontSize: 11, color: '#d97706' }}>
                                                📅 กำหนดส่ง: {fmtDateShort(order.DueDate)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {!loading && orders.filter(o => o.Status === 'รอจัดส่ง').length === 0 && (
                            <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>
                                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                                <p style={{ fontWeight: 600, margin: 0 }}>ไม่มีงานรอจัดส่ง</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderOrders = () => (
        <div className="fulfillment-orders">
            <div className="page-title" style={{ marginBottom: 16 }}>
                <h1>📦 รายการจัดส่ง OEM</h1>
                <p>จัดการการจัดส่งสินค้า OEM ที่ผลิตเสร็จจากโรงงาน</p>
            </div>

            <div className="card table-card">
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>
                ) : orders.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
                        <div style={{ fontSize: 56, marginBottom: 12 }}>📭</div>
                        <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>ยังไม่มีรายการจัดส่ง</p>
                        <p style={{ fontSize: 13 }}>ระบบจะสร้างรายการอัตโนมัติเมื่อสินค้า OEM ผ่าน QC Final</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>รหัสจัดส่ง</th>
                                <th>ใบสั่งผลิต</th>
                                <th>สินค้า</th>
                                <th>ลูกค้า</th>
                                <th>จำนวน</th>
                                <th>กำหนดส่ง</th>
                                <th>สถานะ</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.ShipmentID}>
                                    <td>
                                        <span style={{ fontWeight: 700, color: '#0d9488' }}>{order.ShipmentID}</span>
                                    </td>
                                    <td>
                                        <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                                            {order.JobOrderID}
                                        </span>
                                    </td>
                                    <td className="text-bold">{order.ProductName}</td>
                                    <td>
                                        <div style={{ fontSize: 13 }}>{order.CustomerName || '-'}</div>
                                        {order.CustomerPO && <div style={{ fontSize: 11, color: '#9ca3af' }}>PO: {order.CustomerPO}</div>}
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 700, fontSize: 15 }}>{order.Quantity?.toLocaleString()}</span>
                                        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>ชิ้น</span>
                                    </td>
                                    <td>{fmtDateShort(order.DueDate)}</td>
                                    <td>
                                        <span className={`badge ${getStatusBadge(order.Status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            {getStatusIcon(order.Status)} {order.Status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn-sm" onClick={() => setSelectedOrder(order)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Eye size={14} />
                                            </button>
                                            {order.Status === 'รอจัดส่ง' && (
                                                <button className="btn-sm btn-primary" 
                                                    style={{ background: '#0d9488', borderColor: '#0d9488', display: 'flex', alignItems: 'center', gap: 4 }}
                                                    disabled={updatingId === order.ShipmentID}
                                                    onClick={() => updateStatus(order.ShipmentID, 'กำลังจัดส่ง')}>
                                                    <Truck size={14} /> จัดส่ง
                                                </button>
                                            )}
                                            {order.Status === 'กำลังจัดส่ง' && (
                                                <button className="btn-sm btn-primary"
                                                    style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}
                                                    disabled={updatingId === order.ShipmentID}
                                                    onClick={() => updateStatus(order.ShipmentID, 'ส่งมอบแล้ว')}>
                                                    <CheckCircle size={14} /> ส่งมอบแล้ว
                                                </button>
                                            )}
                                            {order.Status === 'ส่งมอบแล้ว' && (
                                                <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>✅ เสร็จสิ้น</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );

    const renderDetailModal = () => {
        if (!selectedOrder) return null;
        const o = selectedOrder;
        const close = () => setSelectedOrder(null);

        return (
            <div className="rnd-modal-overlay" onClick={close}>
                <div className="rnd-modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>🚚 รายละเอียดการจัดส่ง</h2>
                            <div className="rnd-modal-meta">
                                <span style={{ background: '#ccfbf1', color: '#0d9488', padding: '2px 10px', borderRadius: 6, fontWeight: 700 }}>
                                    {o.ShipmentID}
                                </span>
                                <span className={`badge ${getStatusBadge(o.Status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    {getStatusIcon(o.Status)} {o.Status}
                                </span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={close}><XCircle size={22} /></button>
                    </div>

                    <div className="rnd-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                        {/* สินค้า */}
                        <div style={{ background: '#f0fdfa', borderRadius: 10, border: '1px solid #99f6e4', padding: 16, marginBottom: 16 }}>
                            <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Package size={16} style={{ color: '#0d9488' }} /> ข้อมูลสินค้า
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                                <div><span style={{ color: '#6b7280' }}>ชื่อสินค้า:</span> <strong>{o.ProductName}</strong></div>
                                <div><span style={{ color: '#6b7280' }}>จำนวน:</span> <strong style={{ color: '#0d9488', fontSize: 18 }}>{o.Quantity?.toLocaleString()}</strong> ชิ้น</div>
                                <div><span style={{ color: '#6b7280' }}>Batch No.:</span> <strong style={{ color: '#1e40af' }}>{o.BatchNo}</strong></div>
                                <div><span style={{ color: '#6b7280' }}>ใบสั่งผลิต:</span> <strong style={{ color: '#4f46e5' }}>{o.JobOrderID}</strong></div>
                            </div>
                        </div>

                        {/* ลูกค้า */}
                        <div style={{ background: '#faf5ff', borderRadius: 10, border: '1px solid #e9d5ff', padding: 16, marginBottom: 16 }}>
                            <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={16} style={{ color: '#7c3aed' }} /> ข้อมูลลูกค้า OEM
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                                <div><span style={{ color: '#6b7280' }}>ชื่อลูกค้า:</span> <strong>{o.CustomerName || '-'}</strong></div>
                                <div><span style={{ color: '#6b7280' }}>PO ลูกค้า:</span> <strong>{o.CustomerPO || '-'}</strong></div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16 }}>
                            <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Calendar size={16} style={{ color: '#475569' }} /> Timeline
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }}></div>
                                    <span style={{ color: '#6b7280', minWidth: 100 }}>สร้างเมื่อ:</span>
                                    <strong>{fmtDate(o.CreatedAt)}</strong>
                                </div>
                                {o.DueDate && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }}></div>
                                        <span style={{ color: '#6b7280', minWidth: 100 }}>กำหนดส่ง:</span>
                                        <strong>{fmtDateShort(o.DueDate)}</strong>
                                    </div>
                                )}
                                {o.ShippedAt && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }}></div>
                                        <span style={{ color: '#6b7280', minWidth: 100 }}>ส่งมอบเมื่อ:</span>
                                        <strong>{fmtDate(o.ShippedAt)}</strong>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {o.Status !== 'ส่งมอบแล้ว' && (
                            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                {o.Status === 'รอจัดส่ง' && (
                                    <button className="btn-primary" style={{ background: '#0d9488', borderColor: '#0d9488', display: 'flex', alignItems: 'center', gap: 6 }}
                                        onClick={() => { updateStatus(o.ShipmentID, 'กำลังจัดส่ง'); close(); }}>
                                        <Truck size={16} /> เริ่มจัดส่ง
                                    </button>
                                )}
                                {o.Status === 'กำลังจัดส่ง' && (
                                    <button className="btn-primary" style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}
                                        onClick={() => { updateStatus(o.ShipmentID, 'ส่งมอบแล้ว'); close(); }}>
                                        <CheckCircle size={16} /> ยืนยันส่งมอบแล้ว
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="page-container page-enter">
            {currentTab === 'fulfillment_dashboard' && renderDashboard()}
            {currentTab === 'fulfillment_orders' && renderOrders()}
            {renderDetailModal()}
        </div>
    );
}

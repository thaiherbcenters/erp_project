import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, Eye, XCircle, MapPin, Calendar, User, ArrowRight, Printer, Phone } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import './PageCommon.css';

import API_BASE from '../config';

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

    const [shipForm, setShipForm] = useState({ courier: '', trackingNo: '', slipFile: null, slipPreview: null });
    const [submittingShip, setSubmittingShip] = useState(false);

    const handleSlipChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setShipForm(prev => ({ 
                ...prev, 
                slipFile: file,
                slipPreview: URL.createObjectURL(file)
            }));
        }
    };

    const submitShipment = async (id) => {
        if (!shipForm.courier) {
            alert('กรุณาระบุบริษัทขนส่ง');
            return;
        }
        setSubmittingShip(true);
        try {
            const formData = new FormData();
            formData.append('courier', shipForm.courier);
            formData.append('trackingNo', shipForm.trackingNo);
            if (shipForm.slipFile) {
                formData.append('slipImage', shipForm.slipFile);
            }
            formData.append('shippedBy', 'system'); // In real app, from user context

            const res = await fetch(`${API_BASE}/shipping/${id}/ship`, {
                method: 'PATCH',
                body: formData
            });

            if (res.ok) {
                setShipForm({ courier: '', trackingNo: '', slipFile: null, slipPreview: null });
                setSelectedOrder(null);
                fetchData();
            } else {
                alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลการจัดส่ง');
            }
        } catch (err) {
            console.error('Failed to submit shipment:', err);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setSubmittingShip(false);
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

    // ── Print Shipping Label (A6 sticker 10x15cm) ──
    const printShippingLabel = (order) => {
        const o = order;
        const win = window.open('', '_blank', 'width=450,height=650');
        win.document.write(`
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ฉลากจัดส่ง ${o.ShipmentID}</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; width: 100mm; height: 150mm; padding: 4mm; font-size: 10px; color: #111; }
  .label { width: 100%; height: 100%; border: 2px solid #000; border-radius: 3mm; overflow: hidden; display: flex; flex-direction: column; }
  .header { background: #1a1a1a; color: #fff; padding: 3mm 4mm; display: flex; justify-content: space-between; align-items: center; }
  .header .brand { font-size: 14px; font-weight: 800; letter-spacing: 0.5px; }
  .header .ship-id { font-size: 11px; font-weight: 600; background: #fff; color: #000; padding: 1mm 3mm; border-radius: 2mm; }
  .section { padding: 3mm 4mm; border-bottom: 1.5px dashed #999; }
  .section:last-child { border-bottom: none; }
  .section-title { font-size: 8px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1.5mm; }
  .recipient { flex: 1; }
  .recipient .name { font-size: 16px; font-weight: 800; margin-bottom: 2mm; }
  .recipient .address { font-size: 11px; line-height: 1.6; margin-bottom: 2mm; color: #333; }
  .recipient .phone { font-size: 12px; font-weight: 700; }
  .product-box { background: #f5f5f5; }
  .product-row { display: flex; justify-content: space-between; align-items: center; }
  .product-name { font-size: 12px; font-weight: 700; flex: 1; }
  .product-qty { font-size: 20px; font-weight: 900; color: #000; text-align: right; min-width: 25mm; }
  .product-qty span { font-size: 10px; font-weight: 400; color: #666; }
  .refs { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm; }
  .ref-item { font-size: 9px; }
  .ref-item .lbl { color: #888; }
  .ref-item .val { font-weight: 700; color: #000; }
  .barcode-area { text-align: center; padding: 2.5mm 4mm; background: #fff; }
  .barcode-text { font-size: 18px; font-weight: 900; letter-spacing: 3px; font-family: 'Courier New', monospace; }
  .barcode-sub { font-size: 7px; color: #999; margin-top: 1mm; }
  .sender { background: #fafafa; }
  .sender-info { font-size: 9px; line-height: 1.5; color: #555; }
  .sender-name { font-weight: 700; font-size: 10px; color: #000; }
  .footer { background: #1a1a1a; color: #fff; padding: 2mm 4mm; text-align: center; font-size: 8px; }
  @media print {
    body { width: 100mm; height: 150mm; }
    .no-print { display: none; }
  }
</style></head><body>
<div class="label">
  <div class="header">
    <div class="brand">THAIHERB</div>
    <div class="ship-id">${o.ShipmentID}</div>
  </div>

  <div class="section recipient">
    <div class="section-title">ผู้รับ / Recipient</div>
    <div class="name">${o.CustomerName || '-'}</div>
    <div class="address">${o.ShippingAddress || o.CustomerPO || 'ไม่ระบุที่อยู่'}</div>
    ${o.CustomerPhone ? `<div class="phone">${o.CustomerPhone}</div>` : ''}
  </div>

  <div class="section product-box">
    <div class="section-title">สินค้า / Product</div>
    <div class="product-row">
      <div class="product-name">${o.ProductName}</div>
      <div class="product-qty">${o.Quantity?.toLocaleString()} <span>ชิ้น</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">อ้างอิง / Reference</div>
    <div class="refs">
      <div class="ref-item"><span class="lbl">Batch:</span> <span class="val">${o.BatchNo || '-'}</span></div>
      <div class="ref-item"><span class="lbl">JO:</span> <span class="val">${o.JobOrderID || '-'}</span></div>
      <div class="ref-item"><span class="lbl">PO:</span> <span class="val">${o.CustomerPO || '-'}</span></div>
      <div class="ref-item"><span class="lbl">กำหนดส่ง:</span> <span class="val">${o.DueDate ? new Date(o.DueDate).toLocaleDateString('th-TH') : '-'}</span></div>
    </div>
  </div>

  <div class="barcode-area">
    <div class="barcode-text">${o.ShipmentID}</div>
    <div class="barcode-sub">Scan to track shipment</div>
  </div>

  <div class="section sender">
    <div class="section-title">ผู้ส่ง / Sender</div>
    <div class="sender-info">
      <div class="sender-name">บริษัท ไทยเฮิร์บเซ็นเตอร์ จำกัด</div>
      <div>โรงงานผลิต สมุนไพรไทย</div>
    </div>
  </div>

  <div class="footer">
    พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')} | OEM Shipment
  </div>
</div>

<div class="no-print" style="text-align:center; margin-top:8px;">
  <button onclick="window.print()" style="padding:8px 24px; font-size:14px; font-weight:700; background:#0d9488; color:#fff; border:none; border-radius:8px; cursor:pointer;">🖨️ พิมพ์ฉลาก</button>
</div>
</body></html>`);
        win.document.close();
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Phone size={13} style={{ color: '#6b7280' }} />
                                    <span style={{ color: '#6b7280' }}>เบอร์โทร:</span> <strong>{o.CustomerPhone || '-'}</strong>
                                </div>
                            </div>
                            {/* ที่อยู่จัดส่ง */}
                            <div style={{ marginTop: 10, padding: '10px 12px', background: '#f3e8ff', borderRadius: 8, border: '1px solid #d8b4fe' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <MapPin size={14} style={{ color: '#7c3aed' }} />
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>ที่อยู่จัดส่ง</span>
                                </div>
                                <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, color: '#374151' }}>{o.ShippingAddress || 'ยังไม่ระบุที่อยู่จัดส่ง'}</p>
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

                        {/* ข้อมูลการจัดส่ง (ฟอร์มบันทึก หรือ แสดงข้อมูล) */}
                        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 16, marginBottom: 16 }}>
                            <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Truck size={16} style={{ color: '#3b82f6' }} /> ข้อมูลการจัดส่ง
                            </h4>
                            
                            {o.Status === 'รอจัดส่ง' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 6px 4px' }}>
                                                🏢 บริษัทขนส่ง <span style={{color: '#ef4444'}}>*</span>
                                            </label>
                                            <CustomSelect 
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', height: 42, outline: 'none', transition: 'all 0.2s', background: '#fff' }}
                                                value={shipForm.courier} 
                                                onChange={e => setShipForm({...shipForm, courier: e.target.value})}
                                            >
                                                <option value="" disabled>-- เลือกบริษัทขนส่ง --</option>
                                                <option value="Kerry Express">Kerry Express</option>
                                                <option value="Flash Express">Flash Express</option>
                                                <option value="J&T Express">J&T Express</option>
                                                <option value="ไปรษณีย์ไทย (EMS)">ไปรษณีย์ไทย (EMS)</option>
                                                <option value="ไปรษณีย์ไทย (ลงทะเบียน)">ไปรษณีย์ไทย (ลงทะเบียน)</option>
                                                <option value="ขนส่งเอกชนอื่นๆ">ขนส่งเอกชนอื่นๆ</option>
                                                <option value="จัดส่งโดยบริษัท">จัดส่งโดยบริษัท</option>
                                            </CustomSelect>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 6px 4px' }}>
                                                🔢 หมายเลขพัสดุ (Tracking No.) <span style={{color: '#ef4444'}}>*</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', height: 42, outline: 'none', transition: 'all 0.2s', background: '#fff' }}
                                                placeholder="เช่น TH0123456789"
                                                value={shipForm.trackingNo} 
                                                onChange={e => setShipForm({...shipForm, trackingNo: e.target.value})}
                                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 6px 4px' }}>
                                            🧾 หลักฐานการจัดส่ง (Slip / ใบเสร็จ) <span style={{color: '#ef4444'}}>*</span>
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                            <label style={{ cursor: 'pointer', background: '#f8fafc', padding: '10px 16px', borderRadius: 8, border: '1.5px dashed #cbd5e1', fontSize: 13, fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.background = '#eff6ff'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#f8fafc'; }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                                อัปโหลดรูป
                                                <input 
                                                    type="file" 
                                                    style={{ display: 'none' }}
                                                    accept="image/*"
                                                    onChange={handleSlipChange}
                                                />
                                            </label>
                                            
                                            <label style={{ cursor: 'pointer', background: '#fff1f2', padding: '10px 16px', borderRadius: 8, border: '1.5px dashed #fecdd3', fontSize: 13, fontWeight: 600, color: '#e11d48', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#e11d48'; e.currentTarget.style.color = '#be123c'; e.currentTarget.style.background = '#ffe4e6'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#fecdd3'; e.currentTarget.style.color = '#e11d48'; e.currentTarget.style.background = '#fff1f2'; }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                                ถ่ายรูป
                                                <input 
                                                    type="file" 
                                                    style={{ display: 'none' }}
                                                    accept="image/*"
                                                    capture="environment"
                                                    onChange={handleSlipChange}
                                                />
                                            </label>

                                            <span style={{ fontSize: 13, color: shipForm.slipFile ? '#059669' : '#9ca3af', fontWeight: shipForm.slipFile ? 600 : 400, width: '100%' }}>
                                                {shipForm.slipFile ? `✅ เลือกไฟล์แล้ว: ${shipForm.slipFile.name}` : 'ยังไม่ได้เลือกไฟล์ / ถ่ายรูป'}
                                            </span>
                                        </div>
                                        {shipForm.slipPreview && (
                                            <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb', display: 'inline-block', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                                <img src={shipForm.slipPreview} alt="Slip Preview" style={{ maxHeight: 180, display: 'block' }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: o.SlipImage ? '1fr 1fr' : '1fr', gap: 16 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                                        <div><span style={{ color: '#6b7280' }}>ขนส่ง:</span> <strong style={{ color: '#0d9488' }}>{o.Courier || '-'}</strong></div>
                                        <div><span style={{ color: '#6b7280' }}>Tracking No:</span> <strong>{o.TrackingNo || '-'}</strong></div>
                                    </div>
                                    {o.SlipImage && (
                                        <div>
                                            <span style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 4 }}>หลักฐานการจัดส่ง:</span>
                                            <a href={`http://localhost:5000${o.SlipImage}`} target="_blank" rel="noopener noreferrer">
                                                <img src={`http://localhost:5000${o.SlipImage}`} alt="Shipping Slip" style={{ maxHeight: 100, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer' }} />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                            <button 
                                className="btn-sm" 
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#f0fdf4', border: '1.5px solid #86efac', color: '#15803d', fontWeight: 600, borderRadius: 8, cursor: 'pointer' }}
                                onClick={() => printShippingLabel(o)}
                            >
                                <Printer size={16} /> พิมพ์ฉลากจัดส่ง (A6)
                            </button>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {o.Status === 'รอจัดส่ง' && (
                                    <button 
                                        className="btn-primary" 
                                        style={{ 
                                            background: (!shipForm.courier || !shipForm.trackingNo || !shipForm.slipFile) ? '#cbd5e1' : '#0d9488', 
                                            borderColor: (!shipForm.courier || !shipForm.trackingNo || !shipForm.slipFile) ? '#cbd5e1' : '#0d9488', 
                                            cursor: (!shipForm.courier || !shipForm.trackingNo || !shipForm.slipFile) ? 'not-allowed' : 'pointer',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: 6 
                                        }}
                                        onClick={() => submitShipment(o.ShipmentID)}
                                        disabled={submittingShip || !shipForm.courier || !shipForm.trackingNo || !shipForm.slipFile}>
                                        <Truck size={16} /> {submittingShip ? 'กำลังบันทึก...' : 'บันทึกและเริ่มจัดส่ง'}
                                    </button>
                                )}
                                {o.Status === 'กำลังจัดส่ง' && (
                                    <button className="btn-primary" style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}
                                        onClick={() => { updateStatus(o.ShipmentID, 'ส่งมอบแล้ว'); close(); }}>
                                        <CheckCircle size={16} /> ยืนยันส่งมอบแล้ว
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ── กำหนดชื่อหน้าตาม Tab ที่เลือก ──
    const getPageTitle = () => {
        switch (currentTab) {
            case 'fulfillment_dashboard': return '🚚 Shipping Dashboard';
            case 'fulfillment_orders': return '📦 รายการจัดส่ง OEM';
            default: return 'จัดส่งสินค้า (Fulfillment)';
        }
    };

    const getPageDesc = () => {
        switch (currentTab) {
            case 'fulfillment_dashboard': return 'ภาพรวมและสถานะการจัดส่งสินค้า OEM ให้ลูกค้า';
            case 'fulfillment_orders': return 'จัดการการจัดส่งสินค้า OEM ที่ผลิตเสร็จจากโรงงาน';
            default: return 'จัดการการจัดส่งสินค้าและคลังสินค้า OEM';
        }
    };

    return (
        <div className="page-container fulfillment-page page-enter">
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <h1>{getPageTitle()}</h1>
                <p>{getPageDesc()}</p>
            </div>
            {currentTab === 'fulfillment_dashboard' && renderDashboard()}
            {currentTab === 'fulfillment_orders' && renderOrders()}
            {renderDetailModal()}
        </div>
    );
}

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    Package, Truck, CheckCircle, Clock, Eye, XCircle, MapPin, 
    Calendar, User, ArrowRight, Printer, Phone, Box, Pencil, 
    Search, RefreshCw, PackageOpen, FileText, CheckCircle2, ShieldCheck, Tag, AlertCircle 
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import PaginationControl from '../components/PaginationControl';
import { useAlert } from '../components/CustomAlert';
import './PageCommon.css';
import './Packaging.css';

import API_BASE from '../config';

export default function Fulfillment() {
    const { canRead, canUpdate } = useAuth();
    const { showAlert, showConfirm } = useAlert();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);
    const [editCustomerData, setEditCustomerData] = useState({ CustomerName: '', CustomerPO: '', CustomerPhone: '', ShippingAddress: '' });

    // ── Search & Filter State ──
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ทั้งหมด');

    // ── Pagination State ──
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // ── Shipping Submit Form ──
    const [shipForm, setShipForm] = useState({ courier: '', trackingNo: '', slipFile: null, slipPreview: null });
    const [submittingShip, setSubmittingShip] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const ordersRes = await fetch(`${API_BASE}/shipping`);
            if (ordersRes.ok) setOrders(await ordersRes.json());
        } catch (err) {
            console.error('Failed to fetch shipping data:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, newStatus, cb = null) => {
        let title = 'ยืนยันการทำรายการ';
        let message = `คุณต้องการอัปเดตสถานะเป็น "${newStatus}" ใช่หรือไม่?`;

        if (newStatus === 'กำลังจัดส่ง') {
            title = 'ยืนยันการจัดส่ง';
            message = `คุณต้องการเริ่มดำเนินการจัดส่งออเดอร์ ${id} ใช่หรือไม่?`;
        } else if (newStatus === 'ส่งมอบแล้ว') {
            title = 'ยืนยันการส่งมอบ';
            message = `คุณต้องการยืนยันว่าออเดอร์ ${id} ส่งมอบให้ลูกค้าเรียบร้อยแล้วใช่หรือไม่?`;
        }

        const confirmed = await showConfirm(title, message, 'info');
        if (!confirmed) return;

        setUpdatingId(id);
        try {
            const res = await fetch(`${API_BASE}/shipping/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, shippedBy: 'system' })
            });
            if (res.ok) {
                fetchData();
                if (cb) cb();
                showAlert('สำเร็จ', 'อัปเดตสถานะการจัดส่งเรียบร้อยแล้ว', 'success');
            } else {
                showAlert('ข้อผิดพลาด', 'อัปเดตสถานะไม่สำเร็จ', 'error');
            }
        } catch (err) {
            console.error('Failed to update status:', err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleUpdateCustomerInfo = async () => {
        if (!selectedOrder) return;
        try {
            const res = await fetch(`${API_BASE}/shipping/${selectedOrder.ShipmentID}/customer-info`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editCustomerData)
            });
            if (res.ok) {
                const updated = await res.json();
                setSelectedOrder(prev => ({ ...prev, ...updated }));
                setOrders(prev => prev.map(o => o.ShipmentID === updated.ShipmentID ? { ...o, ...updated } : o));
                showAlert('สำเร็จ', 'อัปเดตข้อมูลลูกค้าและที่อยู่จัดส่งเรียบร้อยแล้ว', 'success');
                setIsEditingCustomer(false);
            } else {
                showAlert('ข้อผิดพลาด', 'อัปเดตข้อมูลไม่สำเร็จ', 'error');
            }
        } catch (err) {
            console.error('Failed to update customer info:', err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        }
    };

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

    const handleOpenShipModal = (order) => {
        setSelectedOrder(order);
        setShipForm({
            courier: order.Courier || '',
            trackingNo: order.TrackingNo || '',
            slipFile: null,
            slipPreview: order.SlipImage || null
        });
        setIsEditingCustomer(false);
    };

    const submitShipment = async (id) => {
        if (!shipForm.courier) {
            showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุบริษัทขนส่ง', 'warning');
            return;
        }

        const confirmed = await showConfirm('ยืนยันการจัดส่ง', `คุณต้องการบันทึกข้อมูลการจัดส่งและเปลี่ยนสถานะออเดอร์ ${id} เป็น "กำลังจัดส่ง" ใช่หรือไม่?`, 'info');
        if (!confirmed) return;

        setSubmittingShip(true);
        try {
            const formData = new FormData();
            formData.append('courier', shipForm.courier);
            formData.append('trackingNo', shipForm.trackingNo);
            if (shipForm.slipFile) {
                formData.append('slipImage', shipForm.slipFile);
            }
            formData.append('shippedBy', 'system');

            const res = await fetch(`${API_BASE}/shipping/${id}/ship`, {
                method: 'PATCH',
                body: formData
            });

            if (res.ok) {
                setShipForm({ courier: '', trackingNo: '', slipFile: null, slipPreview: null });
                setSelectedOrder(null);
                fetchData();
                showAlert('สำเร็จ', 'บันทึกข้อมูลและเริ่มจัดส่งเรียบร้อยแล้ว', 'success');
            } else {
                showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการจัดส่ง', 'error');
            }
        } catch (err) {
            console.error('Failed to submit shipment:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
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
            case 'รอแพ็ค': return 'badge-secondary';
            case 'กำลังแพ็ค': return 'badge-info';
            case 'รอจัดส่ง': return 'badge-warning';
            case 'กำลังจัดส่ง': return 'badge-info';
            case 'ส่งมอบแล้ว': return 'badge-success';
            default: return 'badge-secondary';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'รอแพ็ค': return <Box size={14} />;
            case 'กำลังแพ็ค': return <Box size={14} />;
            case 'รอจัดส่ง': return <Clock size={14} />;
            case 'กำลังจัดส่ง': return <Truck size={14} />;
            case 'ส่งมอบแล้ว': return <CheckCircle size={14} />;
            default: return null;
        }
    };

    const getCardStatusClass = (status) => {
        switch (status) {
            case 'กำลังจัดส่ง':
            case 'กำลังแพ็ค':
                return 'in-progress';
            case 'ส่งมอบแล้ว':
                return 'status-delivered';
            case 'รอแพ็ค':
                return 'status-wait';
            default:
                return ''; // default amber for รอจัดส่ง
        }
    };

    const getPriorityStyle = (p) => {
        if (p === 'สูง') return { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
        if (p === 'ปกติ') return { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' };
        return { background: '#f5f5f4', color: '#78716c', border: '1px solid #e7e5e4' };
    };

    // ── Active Work Orders for the top section (ใบงาน) ──
    const activeOrders = useMemo(() => {
        return orders.filter(o => ['รอแพ็ค', 'กำลังแพ็ค', 'รอจัดส่ง', 'กำลังจัดส่ง'].includes(o.Status));
    }, [orders]);

    // ── Filtered Orders for the bottom table (ตาราง รายการ) ──
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            if (statusFilter !== 'ทั้งหมด' && order.Status !== statusFilter) {
                return false;
            }
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase().trim();
                const matchShipId = order.ShipmentID?.toLowerCase().includes(q);
                const matchJO = order.JobOrderID?.toLowerCase().includes(q);
                const matchBatch = order.BatchNo?.toLowerCase().includes(q);
                const matchProduct = order.ProductName?.toLowerCase().includes(q);
                const matchCustomer = order.CustomerName?.toLowerCase().includes(q);
                const matchPO = order.CustomerPO?.toLowerCase().includes(q);
                const matchCourier = order.Courier?.toLowerCase().includes(q);
                const matchTracking = order.TrackingNo?.toLowerCase().includes(q);
                if (!matchShipId && !matchJO && !matchBatch && !matchProduct && !matchCustomer && !matchPO && !matchCourier && !matchTracking) {
                    return false;
                }
            }
            return true;
        });
    }, [orders, statusFilter, searchTerm]);

    const paginatedOrders = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredOrders.slice(start, start + pageSize);
    }, [filteredOrders, page, pageSize]);

    if (!canRead('fulfillment')) {
        return <div className="page-container"><p className="no-permission">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;
    }

    const renderDetailModal = () => {
        if (!selectedOrder) return null;
        const o = selectedOrder;
        const close = () => {
            setSelectedOrder(null);
            setIsEditingCustomer(false);
        };

        return (
            <div className="rnd-modal-overlay" onClick={close}>
                <div className="rnd-modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>🚚 รายละเอียดการจัดส่ง</h2>
                            <div className="rnd-modal-meta" style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ background: '#ccfbf1', color: '#0d9488', padding: '2px 10px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
                                    {o.ShipmentID}
                                </span>
                                <span className={`badge ${getStatusBadge(o.Status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    {getStatusIcon(o.Status)} {o.Status}
                                </span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={close}><XCircle size={22} /></button>
                    </div>

                    <div className="rnd-modal-body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
                        {/* ข้อมูลสินค้า */}
                        <div style={{ background: '#f0fdfa', borderRadius: 10, border: '1px solid #99f6e4', padding: 16, marginBottom: 16 }}>
                            <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Package size={16} style={{ color: '#0d9488' }} /> ข้อมูลสินค้า
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                                <div><span style={{ color: '#6b7280' }}>ชื่อสินค้า:</span> <strong>{o.ProductName}</strong></div>
                                <div><span style={{ color: '#6b7280' }}>จำนวน:</span> <strong style={{ color: '#0d9488', fontSize: 18 }}>{o.Quantity?.toLocaleString()}</strong> ชิ้น</div>
                                <div><span style={{ color: '#6b7280' }}>Batch No.:</span> <strong style={{ color: '#1e40af' }}>{o.BatchNo || '-'}</strong></div>
                                <div><span style={{ color: '#6b7280' }}>ใบสั่งผลิต:</span> <strong style={{ color: '#4f46e5' }}>{o.JobOrderID || '-'}</strong></div>
                            </div>
                        </div>

                        {/* ข้อมูลลูกค้า OEM */}
                        <div style={{ background: '#faf5ff', borderRadius: 10, border: '1px solid #e9d5ff', padding: 16, marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <User size={16} style={{ color: '#7c3aed' }} /> ข้อมูลลูกค้า OEM
                                </h4>
                                {canUpdate('fulfillment') && (
                                    !isEditingCustomer ? (
                                        <button 
                                            className="btn-sm" 
                                            onClick={() => {
                                                setEditCustomerData({
                                                    CustomerName: o.CustomerName || '',
                                                    CustomerPO: o.CustomerPO || '',
                                                    CustomerPhone: o.CustomerPhone || '',
                                                    ShippingAddress: o.ShippingAddress || ''
                                                });
                                                setIsEditingCustomer(true);
                                            }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                        >
                                            <Pencil size={12} /> แก้ไขข้อมูล
                                        </button>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn-sm" onClick={() => setIsEditingCustomer(false)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: 12 }}>ยกเลิก</button>
                                            <button className="btn-sm" onClick={handleUpdateCustomerInfo} style={{ background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 }}>บันทึก</button>
                                        </div>
                                    )
                                )}
                            </div>

                            {!isEditingCustomer ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                                        <div><span style={{ color: '#6b7280' }}>ชื่อลูกค้า:</span> <strong>{o.CustomerName || '-'}</strong></div>
                                        <div><span style={{ color: '#6b7280' }}>PO ลูกค้า:</span> <strong>{o.CustomerPO || '-'}</strong></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Phone size={13} style={{ color: '#6b7280' }} />
                                            <span style={{ color: '#6b7280' }}>เบอร์โทร:</span> <strong>{o.CustomerPhone || '-'}</strong>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 10, padding: '10px 12px', background: '#f3e8ff', borderRadius: 8, border: '1px solid #d8b4fe' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <MapPin size={14} style={{ color: '#7c3aed' }} />
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>ที่อยู่จัดส่ง</span>
                                        </div>
                                        <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-wrap' }}>{o.ShippingAddress || 'ยังไม่ระบุที่อยู่จัดส่ง'}</p>
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={{ display: 'block', color: '#6b7280', marginBottom: 4 }}>ชื่อลูกค้า</label>
                                            <input type="text" className="form-input" value={editCustomerData.CustomerName} onChange={e => setEditCustomerData({...editCustomerData, CustomerName: e.target.value})} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#6b7280', marginBottom: 4 }}>PO ลูกค้า</label>
                                            <input type="text" className="form-input" value={editCustomerData.CustomerPO} onChange={e => setEditCustomerData({...editCustomerData, CustomerPO: e.target.value})} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#6b7280', marginBottom: 4 }}>เบอร์โทร</label>
                                        <input type="text" className="form-input" value={editCustomerData.CustomerPhone} onChange={e => setEditCustomerData({...editCustomerData, CustomerPhone: e.target.value})} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#6b7280', marginBottom: 4 }}>ที่อยู่จัดส่ง</label>
                                        <textarea className="form-input" rows={3} value={editCustomerData.ShippingAddress} onChange={e => setEditCustomerData({...editCustomerData, ShippingAddress: e.target.value})} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', resize: 'vertical' }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ข้อมูลการจัดส่ง (ฟอร์มบันทึก หรือ แสดงข้อมูล) */}
                        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 16, marginBottom: 16 }}>
                            <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Truck size={16} style={{ color: '#3b82f6' }} /> ข้อมูลการจัดส่ง
                            </h4>
                            
                            {(o.Status === 'รอจัดส่ง' || o.Status === 'รอแพ็ค' || o.Status === 'กำลังแพ็ค') ? (
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
                                                🔢 หมายเลขพัสดุ (Tracking No.)
                                            </label>
                                            <input 
                                                type="text" 
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', height: 42, outline: 'none', transition: 'all 0.2s', background: '#fff' }}
                                                placeholder="เช่น TH0123456789"
                                                value={shipForm.trackingNo} 
                                                onChange={e => setShipForm({...shipForm, trackingNo: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 6px 4px' }}>
                                            🧾 หลักฐานการจัดส่ง (Slip / ใบเสร็จ)
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                            <label style={{ cursor: 'pointer', background: '#f8fafc', padding: '10px 16px', borderRadius: 8, border: '1.5px dashed #cbd5e1', fontSize: 13, fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                                อัปโหลดรูป
                                                <input 
                                                    type="file" 
                                                    style={{ display: 'none' }}
                                                    accept="image/*"
                                                    onChange={handleSlipChange}
                                                />
                                            </label>
                                            
                                            <label style={{ cursor: 'pointer', background: '#fff1f2', padding: '10px 16px', borderRadius: 8, border: '1.5px dashed #fecdd3', fontSize: 13, fontWeight: 600, color: '#e11d48', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
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
                                            <a href={o.SlipImage} target="_blank" rel="noopener noreferrer">
                                                <img src={o.SlipImage} alt="Shipping Slip" style={{ maxHeight: 100, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer' }} />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
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
                        <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button 
                                className="btn-sm" 
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#f0fdf4', border: '1.5px solid #86efac', color: '#15803d', fontWeight: 600, borderRadius: 8, cursor: 'pointer' }}
                                onClick={() => printShippingLabel(o)}
                            >
                                <Printer size={16} /> พิมพ์ฉลากจัดส่ง (A6)
                            </button>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {canUpdate('fulfillment') && (o.Status === 'รอจัดส่ง' || o.Status === 'รอแพ็ค' || o.Status === 'กำลังแพ็ค') && (
                                    <button 
                                        className="btn-primary" 
                                        style={{ 
                                            background: (!shipForm.courier) ? '#cbd5e1' : '#0d9488', 
                                            borderColor: (!shipForm.courier) ? '#cbd5e1' : '#0d9488', 
                                            cursor: (!shipForm.courier) ? 'not-allowed' : 'pointer',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: 6 
                                        }}
                                        onClick={() => submitShipment(o.ShipmentID)}
                                        disabled={submittingShip || !shipForm.courier}>
                                        <Truck size={16} /> {submittingShip ? 'กำลังบันทึก...' : 'บันทึกและเริ่มจัดส่ง'}
                                    </button>
                                )}
                                {canUpdate('fulfillment') && o.Status === 'กำลังจัดส่ง' && (
                                    <button className="btn-primary" style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}
                                        onClick={() => updateStatus(o.ShipmentID, 'ส่งมอบแล้ว', close)}>
                                        <CheckCircle size={16} /> ยืนยันส่งมอบแล้ว
                                    </button>
                                )}
                                <button className="btn-secondary" onClick={close} style={{ padding: '8px 16px', borderRadius: 8 }}>
                                    ปิด
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="page-container fulfillment-page page-enter">
            {/* ── Page Header ── */}
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                            🚚 ฝ่ายจัดส่ง (Shipping & Dispatch)
                        </h1>
                        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
                            จัดการใบงานจัดส่งสินค้า พิมพ์ฉลากปะหน้า และติดตามสถานะการส่งมอบสินค้า OEM
                        </p>
                    </div>
                    <button 
                        className="btn-secondary" 
                        onClick={fetchData} 
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8 }}
                        title="รีเฟรชข้อมูล"
                    >
                        <RefreshCw size={15} className={loading ? 'spin' : ''} /> รีเฟรช
                    </button>
                </div>
            </div>


            {/* ============================================================ */}
            {/* ด้านบน: ใบงานรอแพ็คและจัดส่ง (Active Dispatch Cards)           */}
            {/* ============================================================ */}
            <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b' }}>
                            <PackageOpen size={22} style={{ color: '#0d9488' }} />
                            ใบงานรอแพ็คและจัดส่ง (Active Dispatch Cards)
                        </h2>
                        <span style={{ 
                            background: activeOrders.length > 0 ? '#ccfbf1' : '#f1f5f9', 
                            color: activeOrders.length > 0 ? '#0f766e' : '#64748b', 
                            padding: '3px 12px', 
                            borderRadius: 12, 
                            fontSize: 13, 
                            fontWeight: 700 
                        }}>
                            {activeOrders.length} งาน
                        </span>
                    </div>
                    <span style={{ fontSize: 13, color: '#64748b' }}>
                        รายการคำสั่งที่ต้องดำเนินการแพ็คหรือกำลังอยู่ระหว่างการจัดส่ง
                    </span>
                </div>

                {loading ? (
                    <div className="card" style={{ padding: 40, textAlign: 'center', color: '#94a3af' }}>
                        <RefreshCw size={26} className="spin" style={{ marginBottom: 8, margin: '0 auto', display: 'block' }} />
                        <div style={{ fontSize: 14 }}>กำลังโหลดข้อมูลใบงาน...</div>
                    </div>
                ) : activeOrders.length === 0 ? (
                    <div className="card" style={{ padding: '36px 20px', textAlign: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12 }}>
                        <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
                        <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>ไม่มีใบงานค้างจัดส่ง</h4>
                        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>สินค้า OEM ทั้งหมดถูกจัดส่งและส่งมอบให้ลูกค้าเรียบร้อยแล้ว</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 16 }}>
                        {activeOrders.map(order => (
                            <div 
                                key={order.ShipmentID} 
                                className={`pkg-pending-card ${getCardStatusClass(order.Status)}`} 
                                onClick={() => setSelectedOrder(order)}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {/* Card Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                        <span className="pkg-pending-id" style={{ whiteSpace: 'nowrap' }}>
                                            {order.ShipmentID}
                                        </span>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            {order.Priority && (
                                                <span style={{ ...getPriorityStyle(order.Priority), padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                                    {order.Priority}
                                                </span>
                                            )}
                                            <span className={`badge ${getStatusBadge(order.Status)}`} style={{ fontSize: 11, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                {getStatusIcon(order.Status)} {order.Status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Product Name */}
                                    <div className="pkg-pending-product" style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                                        {order.ProductName}
                                    </div>

                                    {/* Meta Details */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, color: '#64748b' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                            <User size={13} style={{ color: '#7c3aed', flexShrink: 0 }} />
                                            <span style={{ whiteSpace: 'nowrap' }}>ลูกค้า: <strong style={{ color: '#334155' }}>{order.CustomerName || '-'}</strong></span>
                                            {order.CustomerPO && (
                                                <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4, fontSize: 11, whiteSpace: 'nowrap' }}>
                                                    PO: {order.CustomerPO}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexWrap: 'nowrap' }}>
                                            <Tag size={13} style={{ color: '#4f46e5', flexShrink: 0 }} />
                                            <span style={{ color: '#64748b', fontSize: 12, flexShrink: 0 }}>JO:</span>
                                            <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 5, fontWeight: 700, fontSize: 11.5, whiteSpace: 'nowrap' }}>
                                                {order.JobOrderID || '-'}
                                            </span>
                                            <span style={{ color: '#cbd5e1', margin: '0 2px' }}>|</span>
                                            <span style={{ color: '#64748b', fontSize: 12, flexShrink: 0 }}>Batch:</span>
                                            <span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: 5, fontWeight: 700, fontSize: 11.5, whiteSpace: 'nowrap' }}>
                                                {order.BatchNo || '-'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                            <MapPin size={13} style={{ color: '#ef4444', marginTop: 2, flexShrink: 0 }} />
                                            <span style={{ color: '#475569', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {order.ShippingAddress || 'ยังไม่ระบุที่อยู่จัดส่ง'}
                                            </span>
                                        </div>
                                        {order.DueDate && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', whiteSpace: 'nowrap' }}>
                                                <Calendar size={13} style={{ flexShrink: 0 }} />
                                                <span>กำหนดส่ง: <strong>{fmtDateShort(order.DueDate)}</strong></span>
                                            </div>
                                        )}
                                        {order.Courier && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0d9488', whiteSpace: 'nowrap' }}>
                                                <Truck size={13} style={{ flexShrink: 0 }} />
                                                <span>ขนส่ง: <strong>{order.Courier}</strong> {order.TrackingNo ? `(${order.TrackingNo})` : ''}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="pkg-pending-qty" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                                        <span style={{ color: '#64748b', fontSize: 13 }}>จำนวน:</span>
                                        <span style={{ color: '#0d9488', fontSize: 17, fontWeight: 700 }}>
                                            {order.Quantity?.toLocaleString()}
                                        </span>
                                        <span style={{ fontSize: 12, color: '#94a3af' }}>ชิ้น</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                                        <button 
                                            type="button"
                                            onClick={() => printShippingLabel(order)}
                                            style={{ 
                                                height: 32, width: 32, 
                                                background: '#f8fafc', border: '1px solid #cbd5e1', 
                                                borderRadius: 6, cursor: 'pointer', 
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#475569', transition: 'all 0.15s'
                                            }}
                                            title="พิมพ์ฉลาก A6"
                                        >
                                            <Printer size={15} />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setSelectedOrder(order)}
                                            style={{ 
                                                height: 32, padding: '0 12px',
                                                background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', 
                                                borderRadius: 6, cursor: 'pointer', 
                                                display: 'inline-flex', alignItems: 'center', gap: 5, 
                                                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s'
                                            }}
                                        >
                                            <Eye size={14} /> รายละเอียด
                                        </button>
                                        {canUpdate('fulfillment') && (order.Status === 'รอจัดส่ง' || order.Status === 'รอแพ็ค' || order.Status === 'กำลังแพ็ค') && (
                                            <button 
                                                type="button"
                                                onClick={() => handleOpenShipModal(order)}
                                                style={{ 
                                                    height: 32, padding: '0 14px',
                                                    background: '#0d9488', border: '1px solid #0d9488', color: '#ffffff',
                                                    borderRadius: 6, cursor: 'pointer',
                                                    display: 'inline-flex', alignItems: 'center', gap: 5, 
                                                    fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s'
                                                }}
                                            >
                                                <Truck size={14} /> จัดส่ง
                                            </button>
                                        )}
                                        {canUpdate('fulfillment') && order.Status === 'กำลังจัดส่ง' && (
                                            <button 
                                                type="button"
                                                onClick={() => updateStatus(order.ShipmentID, 'ส่งมอบแล้ว')}
                                                style={{ 
                                                    height: 32, padding: '0 14px',
                                                    background: '#059669', border: '1px solid #059669', color: '#ffffff',
                                                    borderRadius: 6, cursor: 'pointer',
                                                    display: 'inline-flex', alignItems: 'center', gap: 5, 
                                                    fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s'
                                                }}
                                                disabled={updatingId === order.ShipmentID}
                                            >
                                                <CheckCircle size={14} /> ส่งมอบแล้ว
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ============================================================ */}
            {/* ด้านล่าง: ตาราง รายการ (Shipping Orders Table)               */}
            {/* ============================================================ */}
            <div style={{ marginBottom: 30 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b' }}>
                            <FileText size={22} style={{ color: '#2563eb' }} />
                            ตารางรายการจัดส่งทั้งหมด
                        </h2>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                            {filteredOrders.length} รายการ
                        </span>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="toolbar" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                        <div className="search-group" style={{ flex: 1, minWidth: 260 }}>
                            <div className="search-input-wrap">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="ค้นหารหัสจัดส่ง, ใบสั่งผลิต, สินค้า, ลูกค้า, ขนส่ง, เลขพัสดุ..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPage(1);
                                    }}
                                />
                            </div>
                            {searchTerm && (
                                <button className="search-btn" onClick={() => setSearchTerm('')} style={{ background: '#f1f5f9', color: '#64748b' }}>
                                    ล้าง
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>สถานะ:</span>
                            <CustomSelect
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                style={{ minWidth: 140, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff' }}
                            >
                                <option value="ทั้งหมด">ทั้งหมด</option>
                                <option value="รอแพ็ค">รอแพ็ค</option>
                                <option value="กำลังแพ็ค">กำลังแพ็ค</option>
                                <option value="รอจัดส่ง">รอจัดส่ง</option>
                                <option value="กำลังจัดส่ง">กำลังจัดส่ง</option>
                                <option value="ส่งมอบแล้ว">ส่งมอบแล้ว</option>
                            </CustomSelect>
                        </div>
                    </div>
                </div>

                {/* Table Card */}
                <div className="card table-card" style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                            กำลังโหลดข้อมูล...
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div style={{ padding: 50, textAlign: 'center', color: '#9ca3af' }}>
                            <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
                            <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 4px', color: '#334155' }}>ไม่พบรายการจัดส่ง</p>
                            <p style={{ fontSize: 13 }}>ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะเป็น "ทั้งหมด"</p>
                        </div>
                    ) : (
                        <>
                            <table className="data-table" style={{ whiteSpace: 'nowrap' }}>
                                <thead>
                                    <tr>
                                        <th>รหัสจัดส่ง</th>
                                        <th>ใบสั่งผลิต</th>
                                        <th>สินค้า</th>
                                        <th>ลูกค้า</th>
                                        <th>จำนวน</th>
                                        <th>ขนส่ง / เลขพัสดุ</th>
                                        <th>กำหนดส่ง</th>
                                        <th>สถานะ</th>
                                        <th style={{ textAlign: 'center' }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedOrders.map(order => (
                                        <tr key={order.ShipmentID}>
                                            <td>
                                                <span style={{ fontWeight: 700, color: '#0d9488' }}>{order.ShipmentID}</span>
                                            </td>
                                            <td>
                                                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                                                    {order.JobOrderID || '-'}
                                                </span>
                                                {order.BatchNo && (
                                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                                        Batch: {order.BatchNo}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-bold" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {order.ProductName}
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 13, fontWeight: 600 }}>{order.CustomerName || '-'}</div>
                                                {order.CustomerPO && <div style={{ fontSize: 11, color: '#94a3af' }}>PO: {order.CustomerPO}</div>}
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 700, fontSize: 15 }}>{order.Quantity?.toLocaleString()}</span>
                                                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>ชิ้น</span>
                                            </td>
                                            <td>
                                                {order.Courier ? (
                                                    <div>
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0d9488' }}>{order.Courier}</span>
                                                        {order.TrackingNo && (
                                                            <div style={{ fontSize: 11, color: '#64748b' }}>
                                                                {order.TrackingNo}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#cbd5e1' }}>—</span>
                                                )}
                                            </td>
                                            <td>{fmtDateShort(order.DueDate)}</td>
                                            <td>
                                                <span className={`badge ${getStatusBadge(order.Status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    {getStatusIcon(order.Status)} {order.Status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                                                    <button 
                                                        type="button"
                                                        onClick={() => printShippingLabel(order)}
                                                        style={{ 
                                                            height: 30, width: 30, 
                                                            background: '#f8fafc', border: '1px solid #cbd5e1', 
                                                            borderRadius: 6, cursor: 'pointer',
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                            color: '#475569', transition: 'all 0.15s'
                                                        }}
                                                        title="พิมพ์ฉลาก A6"
                                                    >
                                                        <Printer size={14} />
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setSelectedOrder(order)}
                                                        style={{ 
                                                            height: 30, width: 30, 
                                                            background: '#fff', border: '1px solid #cbd5e1', 
                                                            borderRadius: 6, cursor: 'pointer',
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                            color: '#3b82f6', transition: 'all 0.15s'
                                                        }}
                                                        title="ดูรายละเอียด"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    {canUpdate('fulfillment') && (order.Status === 'รอจัดส่ง' || order.Status === 'รอแพ็ค' || order.Status === 'กำลังแพ็ค') && (
                                                        <button 
                                                            type="button"
                                                            style={{ 
                                                                height: 30, padding: '0 10px',
                                                                background: '#0d9488', border: '1px solid #0d9488', color: '#fff',
                                                                borderRadius: 6, cursor: 'pointer',
                                                                display: 'inline-flex', alignItems: 'center', gap: 4, 
                                                                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s'
                                                            }}
                                                            disabled={updatingId === order.ShipmentID}
                                                            onClick={() => handleOpenShipModal(order)}
                                                        >
                                                            <Truck size={13} /> จัดส่ง
                                                        </button>
                                                    )}
                                                    {canUpdate('fulfillment') && order.Status === 'กำลังจัดส่ง' && (
                                                        <button 
                                                            type="button"
                                                            style={{ 
                                                                height: 30, padding: '0 10px',
                                                                background: '#059669', border: '1px solid #059669', color: '#fff',
                                                                borderRadius: 6, cursor: 'pointer',
                                                                display: 'inline-flex', alignItems: 'center', gap: 4, 
                                                                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s'
                                                            }}
                                                            disabled={updatingId === order.ShipmentID}
                                                            onClick={() => updateStatus(order.ShipmentID, 'ส่งมอบแล้ว')}
                                                        >
                                                            <CheckCircle size={13} /> ส่งมอบแล้ว
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <PaginationControl
                                currentPage={page}
                                totalPages={Math.ceil(filteredOrders.length / pageSize) || 1}
                                totalItems={filteredOrders.length}
                                pageSize={pageSize}
                                onPageChange={setPage}
                                onPageSizeChange={(newSize) => {
                                    setPageSize(newSize);
                                    setPage(1);
                                }}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Modal รายละเอียด / บันทึกการจัดส่ง */}
            {renderDetailModal()}
        </div>
    );
}

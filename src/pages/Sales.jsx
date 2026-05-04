/**
 * =============================================================================
 * Sales.jsx — หน้าฝ่ายขาย (Sales Department)
 * =============================================================================
 *
 * แสดงข้อมูลฝ่ายขาย:
 *   - Tab sales_dashboard : Sales Dashboard (ยอดขาย, คำสั่งซื้อ, ลูกค้า, ใบเสนอราคา)
 *   - Tab sales_customers : Customer Management (ค้นหา + ตารางลูกค้า)
 *   - Tab sales_quotation : Quotation (ค้นหา + ตารางใบเสนอราคา)
 *   - Tab sales_orders    : Sales Order (ค้นหา + ตารางคำสั่งซื้อ)
 *
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import { Eye, Edit, Trash2, Clock, History, X, Send } from 'lucide-react';
import { MOCK_CUSTOMERS } from '../data/mockData';
import QuotationForm from '../components/QuotationForm';
import SalesOrderForm from '../components/SalesOrderForm';
import API_BASE from '../config';
import './PageCommon.css';
import './DocumentControl.css';

export default function Sales() {
    const { showAlert, showConfirm } = useAlert();
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('sales');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'sales_dashboard';

    // ── State: ค้นหาแยกแต่ละ tab ──
    const [customerSearch, setCustomerSearch] = useState('');
    const [quotationSearch, setQuotationSearch] = useState('');
    const [orderSearch, setOrderSearch] = useState('');

    // ── State: การแสดงฟอร์ม ──
    const [showQuotationForm, setShowQuotationForm] = useState(false);
    const [localQuotations, setLocalQuotations] = useState([]);
    const [editingQuotationId, setEditingQuotationId] = useState(null);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [isHistoryView, setIsHistoryView] = useState(false); // To pass to form
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyList, setHistoryList] = useState([]);

    // ── State: Sales Order ──
    const [showSOForm, setShowSOForm] = useState(false);
    const [localSalesOrders, setLocalSalesOrders] = useState([]);
    const [editingSOId, setEditingSOId] = useState(null);
    const [isSOViewOnly, setIsSOViewOnly] = useState(false);

    // ── Fetch ข้อมูล Quotations ──
    useEffect(() => {
        const fetchQuotations = async () => {
            try {
                const res = await fetch(`${API_BASE}/quotations`);
                const json = await res.json();
                if (json.success) setLocalQuotations(json.data);
            } catch (err) { console.error('Error fetching quotations:', err); }
        };
        fetchQuotations();
    }, [showQuotationForm]);

    // ── Fetch ข้อมูล Sales Orders ──
    useEffect(() => {
        const fetchSalesOrders = async () => {
            try {
                const res = await fetch(`${API_BASE}/sales-orders`);
                const json = await res.json();
                if (json.success) setLocalSalesOrders(json.data);
            } catch (err) { console.error('Error fetching sales orders:', err); }
        };
        fetchSalesOrders();
    }, [showSOForm]);

    // ── Fetch History List ──
    const handleViewHistory = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/quotations/${id}/history`);
            const json = await res.json();
            if (json.success) {
                setHistoryList(json.data);
                setShowHistoryModal(true);
            } else {
                showAlert('ข้อผิดพลาด', 'ไม่สามารถดึงประวัติได้: ' + json.message, 'error');
            }
        } catch (err) {
            console.error('Error fetching history:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    };

    const handleDeleteQuotation = async (id) => {
        const ok = await showConfirm('ยืนยันการลบ', 'คุณต้องการลบใบเสนอราคานี้ใช่หรือไม่?', 'warning');
        if (!ok) return;
        try {
            const res = await fetch(`${API_BASE}/quotations/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                setLocalQuotations(prev => prev.filter(q => (q.QuotationID || q.id) !== id));
            } else { alert('ลบไม่สำเร็จ: ' + json.message); }
        } catch (err) { console.error('Error deleting quotation:', err); alert('เกิดข้อผิดพลาดในการลบ'); }
    };

    const handleDeleteSO = async (id) => {
        const ok = await showConfirm('ยืนยันการลบ', 'คุณต้องการลบ Sales Order นี้ใช่หรือไม่?', 'warning');
        if (!ok) return;
        try {
            const res = await fetch(`${API_BASE}/sales-orders/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                setLocalSalesOrders(prev => prev.filter(so => so.SalesOrderID !== id));
            } else { showAlert('ข้อผิดพลาด', 'ลบไม่สำเร็จ: ' + json.message, 'error'); }
        } catch (err) { console.error('Error deleting SO:', err); showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบ', 'error'); }
    };

    const handleSendToPlanner = async (so) => {
        const ok = await showConfirm('ยืนยันการส่ง', `ส่งคำสั่งซื้อ ${so.SalesOrderNo} ไปให้ Planner วางแผนผลิตใช่หรือไม่?`, 'info');
        if (!ok) return;
        try {
            const res = await fetch(`${API_BASE}/sales-orders/${so.SalesOrderID}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ส่ง Planner แล้ว' })
            });
            const json = await res.json();
            if (json.success) {
                setLocalSalesOrders(prev => prev.map(s => s.SalesOrderID === so.SalesOrderID ? { ...s, Status: 'ส่ง Planner แล้ว' } : s));
                showAlert('สำเร็จ', `ส่ง ${so.SalesOrderNo} ไปให้ Planner เรียบร้อยแล้ว!`, 'success');
            } else {
                showAlert('ข้อผิดพลาด', json.message, 'error');
            }
        } catch (err) {
            console.error('Error sending to planner:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการส่งข้อมูล', 'error');
        }
    };

    // ── คำนวณสถิติ Dashboard ──
    const totalRevenue = localSalesOrders.reduce((sum, o) => sum + (o.GrandTotal || 0), 0);
    const totalOrders = localSalesOrders.length;
    const totalCustomers = MOCK_CUSTOMERS.length;
    const totalQuotations = localQuotations.length;

    // ── กรองข้อมูลแต่ละ tab ──
    const filteredCustomers = MOCK_CUSTOMERS.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.contact.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.type.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const filteredQuotations = localQuotations.filter((q) => {
        const number = q.QuotationNo || q.number || '';
        const customer = q.CustomerName || q.customer || '';
        return number.toLowerCase().includes(quotationSearch.toLowerCase()) ||
               customer.toLowerCase().includes(quotationSearch.toLowerCase());
    });

    const filteredOrders = localSalesOrders.filter((o) => {
        const soNo = o.SalesOrderNo || '';
        const customer = o.CustomerName || '';
        const qtNo = o.QuotationNo || '';
        return soNo.toLowerCase().includes(orderSearch.toLowerCase()) ||
               customer.toLowerCase().includes(orderSearch.toLowerCase()) ||
               qtNo.toLowerCase().includes(orderSearch.toLowerCase());
    });

    // ── เลือก badge class ตามสถานะ ──
    const getCustomerStatusClass = (status) => {
        return status === 'ใช้งาน' ? 'badge-success' : 'badge-danger';
    };

    const getQuotationStatusClass = (status) => {
        switch (status) {
            case 'พร้อมใช้': return 'badge-success';
            case 'สร้าง SO แล้ว': return 'badge-info';
            case 'อนุมัติ': return 'badge-success';
            case 'ส่งแล้ว': return 'badge-info';
            case 'ร่าง': return 'badge-neutral';
            case 'ปฏิเสธ': return 'badge-danger';
            default: return '';
        }
    };

    const getOrderStatusClass = (status) => {
        switch (status) {
            case 'เสร็จสิ้น': return 'badge-success';
            case 'สร้างแล้ว': return 'badge-success';
            case 'กำลังดำเนินการ': return 'badge-info';
            case 'ส่ง Planner แล้ว': return 'badge-info';
            case 'จัดส่งแล้ว': return 'badge-warning';
            case 'รอดำเนินการ': return 'badge-neutral';
            case 'ร่าง': return 'badge-neutral';
            case 'ยกเลิก': return 'badge-danger';
            default: return '';
        }
    };

    // ── กำหนดชื่อหน้าตาม Tab ที่เลือก ──
    const getPageTitle = () => {
        switch (activeTab) {
            case 'sales_dashboard': return 'ภาพรวมยอดขาย';
            case 'sales_customers': return 'จัดการข้อมูลลูกค้า';
            case 'sales_quotation': return 'ใบเสนอราคา';
            case 'sales_orders': return 'คำสั่งซื้อ';
            default: return 'ฝ่ายขาย';
        }
    };

    const getPageDesc = () => {
        switch (activeTab) {
            case 'sales_dashboard': return 'ภาพรวมข้อมูลยอดขาย ลูกค้า และเอกสารทั้งหมดของฝ่ายขาย';
            case 'sales_customers': return 'จัดการข้อมูลและรายชื่อลูกค้าทั้งหมดในระบบ';
            case 'sales_quotation': return 'สร้างและจัดการข้อมูลเอกสารใบเสนอราคา (Quotation)';
            case 'sales_orders': return 'สร้างและจัดการข้อมูลคำสั่งซื้อ (Sales Order)';
            default: return 'จัดการข้อมูลลูกค้า ใบเสนอราคา และคำสั่งซื้อ';
        }
    };

    return (
        <div className="page-container sales-page page-enter">
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <h1>{getPageTitle()}</h1>
                <p>{getPageDesc()}</p>
            </div>

            {/* ── Tab: Sales Dashboard ── */}
            {(activeTab === 'sales_dashboard' && hasSubPermission('sales_dashboard')) && (
                <div className="subpage-content" key="sales_dashboard">
                    <div className="summary-row">
                        {hasSectionPermission('sales_dashboard_revenue') && (
                            <div className="summary-card card">
                                <div className="summary-icon">฿</div>
                                <div>
                                    <span className="summary-label">ยอดขายรวม</span>
                                    <span className="summary-value">฿{totalRevenue.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('sales_dashboard_orders') && (
                            <div className="summary-card card">
                                <div className="summary-icon">📦</div>
                                <div>
                                    <span className="summary-label">คำสั่งซื้อ</span>
                                    <span className="summary-value">{totalOrders}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('sales_dashboard_customers') && (
                            <div className="summary-card card">
                                <div className="summary-icon">👥</div>
                                <div>
                                    <span className="summary-label">ลูกค้า</span>
                                    <span className="summary-value">{totalCustomers}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('sales_dashboard_quotations') && (
                            <div className="summary-card card">
                                <div className="summary-icon">📄</div>
                                <div>
                                    <span className="summary-label">ใบเสนอราคา</span>
                                    <span className="summary-value">{totalQuotations}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab: Customer Management ── */}
            {(activeTab === 'sales_customers' && hasSubPermission('sales_customers')) && (
                <div className="subpage-content" key="sales_customers">
                    {hasSectionPermission('sales_customers_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์ชื่อลูกค้า..."
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">+ เพิ่มลูกค้า</button>
                        </div>
                    )}

                    {hasSectionPermission('sales_customers_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ลำดับ</th>
                                        <th>ชื่อลูกค้า</th>
                                        <th>ผู้ติดต่อ</th>
                                        <th>โทรศัพท์</th>
                                        <th>อีเมล</th>
                                        <th>ประเภท</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map((c) => (
                                        <tr key={c.id}>
                                            <td>{c.id}</td>
                                            <td className="text-bold">{c.name}</td>
                                            <td>{c.contact}</td>
                                            <td>{c.phone}</td>
                                            <td>{c.email}</td>
                                            <td>{c.type}</td>
                                            <td>
                                                <span className={`badge ${getCustomerStatusClass(c.status)}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Quotation ── */}
            {(activeTab === 'sales_quotation' && hasSubPermission('sales_quotation')) && (
                showQuotationForm ? (
                    <QuotationForm 
                        editId={editingQuotationId}
                        viewOnly={isViewOnly}
                        isHistory={isHistoryView}
                        onBack={() => {
                            setShowQuotationForm(false);
                            setEditingQuotationId(null);
                            setIsViewOnly(false);
                        }} 
                        onSave={() => {
                            setShowQuotationForm(false);
                            setEditingQuotationId(null);
                            setIsViewOnly(false);
                        }}
                    />
                ) : (
                    <div className="subpage-content" key="sales_quotation">
                        {hasSectionPermission('sales_quotation_search') && (
                            <div className="toolbar">
                                <div className="search-box">
                                    <span>ค้นหา</span>
                                    <input
                                        type="text"
                                        placeholder="พิมพ์เลขที่ใบเสนอราคา..."
                                        value={quotationSearch}
                                        onChange={(e) => setQuotationSearch(e.target.value)}
                                    />
                                </div>
                                <button className="btn-primary" onClick={() => setShowQuotationForm(true)}>+ สร้างใบเสนอราคา</button>
                            </div>
                        )}

                        {hasSectionPermission('sales_quotation_table') && (
                            <div className="table-card card">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ลำดับ</th>
                                            <th>เวอร์ชั่น</th>
                                            <th>เลขที่</th>
                                            <th>ลูกค้า</th>
                                            <th>ยอดรวม (บาท)</th>
                                            <th>วันที่</th>
                                            <th>ใช้ได้ถึง</th>
                                            <th>สถานะ</th>
                                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredQuotations.map((q, idx) => (
                                            <tr key={q.QuotationID || q.id}>
                                                <td>{idx + 1}</td>
                                                <td>v.{q.Revision || 0}</td>
                                                <td className="text-bold">{q.QuotationNo || q.number}</td>
                                                <td>{q.CustomerName || q.customer}</td>
                                                <td>{(q.GrandTotal || q.total || 0).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                                                <td>{q.BillDate ? new Date(q.BillDate).toLocaleDateString('th-TH') : q.date}</td>
                                                <td>{q.ValidUntil ? new Date(q.ValidUntil).toLocaleDateString('th-TH') : q.validUntil}</td>
                                                <td>
                                                    <span className={`badge ${getQuotationStatusClass(q.Status || q.status)}`}>
                                                        {q.Status || q.status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                        <button 
                                                            className="doc-action-btn"
                                                            title="ดูรายละเอียด"
                                                            onClick={() => {
                                                                setEditingQuotationId(q.QuotationID || q.id);
                                                                setIsViewOnly(true);
                                                                setIsHistoryView(false);
                                                                setShowQuotationForm(true);
                                                            }}
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                        {q.Revision > 0 && (
                                                            <button 
                                                                className="doc-action-btn"
                                                                title="ประวัติ"
                                                                onClick={() => handleViewHistory(q.QuotationID || q.id)}
                                                            >
                                                                <Clock size={15} />
                                                            </button>
                                                        )}
                                                        <button 
                                                            className="doc-action-btn"
                                                            title="แก้ไข"
                                                            onClick={() => {
                                                                setEditingQuotationId(q.QuotationID || q.id);
                                                                setIsViewOnly(false);
                                                                setIsHistoryView(false);
                                                                setShowQuotationForm(true);
                                                            }}
                                                        >
                                                            <Edit size={15} />
                                                        </button>
                                                        <button 
                                                            className="doc-action-btn doc-action-btn-danger"
                                                            title="ลบ"
                                                            onClick={() => handleDeleteQuotation(q.QuotationID || q.id)}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* History Modal */}
                        {/* History Modal */}
                        {showHistoryModal && (
                            <div className="pdf-preview-overlay" onClick={() => setShowHistoryModal(false)}>
                                <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', height: 'auto', padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <History size={18} /> ประวัติการแก้ไข
                                        </h3>
                                        <button onClick={() => setShowHistoryModal(false)} className="doc-action-btn" style={{ width: '30px', height: '30px', background: '#f1f5f9', borderRadius: '6px' }}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {historyList.length === 0 ? (
                                            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>ไม่มีประวัติการแก้ไขสำหรับเอกสารนี้</p>
                                        ) : (
                                            historyList.map((h, i) => (
                                                <div key={h.HistoryID} style={{
                                                    padding: '14px 16px',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '8px',
                                                    background: i === 0 ? '#f0fdf4' : 'var(--bg)',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '13px' }}>
                                                                {h.Revision === 0 ? 'ต้นฉบับ' : `v.${h.Revision}`}
                                                            </span>
                                                            {i === 0 && h.Revision > 0 && (
                                                                <span style={{ fontSize: '10px', color: '#64748b' }}>ถูกแทนที่ (v.{h.Revision + 1})</span>
                                                            )}
                                                            <span className={`badge ${getQuotationStatusClass(h.Status)}`} style={{ fontSize: '10px' }}>
                                                                {h.Status}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                #{h.HistoryID}
                                                            </span>
                                                            <button
                                                                className="doc-action-btn"
                                                                title="ดูเอกสาร"
                                                                style={{ background: '#e0f2fe', color: '#0284c7', width: '24px', height: '24px' }}
                                                                onClick={() => {
                                                                    setShowHistoryModal(false);
                                                                    setEditingQuotationId(`history-${h.HistoryID}`);
                                                                    setIsViewOnly(true);
                                                                    setIsHistoryView(true);
                                                                    setShowQuotationForm(true);
                                                                }}
                                                            >
                                                                <Eye size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                        ยอดรวมสุทธิ ฿{(h.GrandTotal || 0).toLocaleString('th-TH', {minimumFractionDigits: 2})} — {new Date(h.ArchivedAt).toLocaleString('th-TH')}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            )}

            {/* ── Tab: Sales Order ── */}
            {(activeTab === 'sales_orders' && hasSubPermission('sales_orders')) && (
                showSOForm ? (
                    <SalesOrderForm
                        editId={editingSOId}
                        viewOnly={isSOViewOnly}
                        onBack={() => { setShowSOForm(false); setEditingSOId(null); setIsSOViewOnly(false); }}
                        onSave={() => { setShowSOForm(false); setEditingSOId(null); setIsSOViewOnly(false); }}
                    />
                ) : (
                    <div className="subpage-content" key="sales_orders">
                        {hasSectionPermission('sales_orders_search') && (
                            <div className="toolbar">
                                <div className="search-box">
                                    <span>ค้นหา</span>
                                    <input type="text" placeholder="พิมพ์เลขที่ SO, ลูกค้า..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} />
                                </div>
                                <button className="btn-primary" onClick={() => setShowSOForm(true)}>+ สร้าง Sales Order</button>
                            </div>
                        )}

                        {hasSectionPermission('sales_orders_table') && (
                            <div className="table-card card">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ลำดับ</th>
                                            <th>เลขที่ SO</th>
                                            <th>อ้างอิง QT</th>
                                            <th>ลูกค้า</th>
                                            <th>PO ลูกค้า</th>
                                            <th>ยอดรวม (บาท)</th>
                                            <th>วันที่สั่ง</th>
                                            <th>สถานะ</th>
                                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOrders.length === 0 ? (
                                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ยังไม่มีรายการ Sales Order</td></tr>
                                        ) : filteredOrders.map((o, idx) => (
                                            <tr key={o.SalesOrderID}>
                                                <td>{idx + 1}</td>
                                                <td className="text-bold">{o.SalesOrderNo}</td>
                                                <td>{o.QuotationNo || '—'}</td>
                                                <td>{o.CustomerName}</td>
                                                <td>{o.CustomerPONumber || '—'}</td>
                                                <td>{(o.GrandTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                <td>{o.OrderDate ? new Date(o.OrderDate).toLocaleDateString('th-TH') : ''}</td>
                                                <td><span className={`badge ${getOrderStatusClass(o.Status)}`}>{o.Status}</span></td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                        {o.Status === 'ร่าง' && (
                                                            <button className="doc-action-btn" title="ส่งให้ Planner" style={{ background: '#dbeafe', color: '#2563eb' }} onClick={() => handleSendToPlanner(o)}>
                                                                <Send size={15} />
                                                            </button>
                                                        )}
                                                        <button className="doc-action-btn" title="ดูรายละเอียด" onClick={() => { setEditingSOId(o.SalesOrderID); setIsSOViewOnly(true); setShowSOForm(true); }}>
                                                            <Eye size={15} />
                                                        </button>
                                                        <button className="doc-action-btn" title="แก้ไข" onClick={() => { setEditingSOId(o.SalesOrderID); setIsSOViewOnly(false); setShowSOForm(true); }}>
                                                            <Edit size={15} />
                                                        </button>
                                                        <button className="doc-action-btn doc-action-btn-danger" title="ลบ" onClick={() => handleDeleteSO(o.SalesOrderID)}>
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
            )}
        </div>
    );
}

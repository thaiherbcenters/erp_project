/**
 * Customer.jsx — หน้าจัดการข้อมูลลูกค้า (Real DB)
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import { Eye, Edit2, Trash2, X } from 'lucide-react';
import API_BASE from '../config';
import './PageCommon.css';

export default function Customer() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const { showAlert, showConfirm } = useAlert();
    const visibleSubPages = getVisibleSubPages('customer');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'customer_list';

    const [customers, setCustomers] = useState([]);
    const [types, setTypes] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [viewCustomer, setViewCustomer] = useState(null);
    const [viewOrders, setViewOrders] = useState([]);
    const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', taxId: '', typeId: 1, statusId: 1 });

    // Fetch data
    useEffect(() => {
        fetchCustomers();
        fetchMeta();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await fetch(`${API_BASE}/customers`);
            const json = await res.json();
            if (json.success) setCustomers(json.data);
        } catch (err) { console.error('Error:', err); }
    };

    const fetchMeta = async () => {
        try {
            const [tRes, sRes] = await Promise.all([
                fetch(`${API_BASE}/customers/types`),
                fetch(`${API_BASE}/customers/statuses`)
            ]);
            const tJson = await tRes.json();
            const sJson = await sRes.json();
            if (tJson.success) setTypes(tJson.data);
            if (sJson.success) setStatuses(sJson.data);
        } catch (err) { console.error('Error:', err); }
    };

    const filtered = customers.filter(c =>
        (c.CustomerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.CustomerCode || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.ContactPerson || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.CustomerTypeName || '').toLowerCase().includes(search.toLowerCase())
    );

    const openCreate = () => {
        setEditingCustomer(null);
        setForm({ name: '', contactPerson: '', phone: '', email: '', address: '', taxId: '', typeId: 1, statusId: 1 });
        setShowModal(true);
    };

    const openEdit = (c) => {
        setEditingCustomer(c);
        setForm({
            name: c.CustomerName || '', contactPerson: c.ContactPerson || '',
            phone: c.Phone || '', email: c.Email || '', address: c.Address || '',
            taxId: c.TaxID || '', typeId: c.CustomerTypeID || 1, statusId: c.CustomerStatusID || 1
        });
        setShowModal(true);
    };

    const openView = async (c) => {
        try {
            const res = await fetch(`${API_BASE}/customers/${c.CustomerID}`);
            const json = await res.json();
            if (json.success) {
                setViewCustomer(json.data);
                setViewOrders(json.orders || []);
            }
        } catch (err) { console.error('Error:', err); }
    };

    const handleSave = async () => {
        if (!form.name.trim()) return showAlert('ข้อผิดพลาด', 'กรุณากรอกชื่อลูกค้า', 'error');
        try {
            const url = editingCustomer ? `${API_BASE}/customers/${editingCustomer.CustomerID}` : `${API_BASE}/customers`;
            const method = editingCustomer ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const json = await res.json();
            if (json.success) {
                showAlert('สำเร็จ', editingCustomer ? 'แก้ไขข้อมูลลูกค้าเรียบร้อย' : 'เพิ่มลูกค้าใหม่เรียบร้อย', 'success');
                setShowModal(false);
                fetchCustomers();
            } else {
                showAlert('ข้อผิดพลาด', json.message, 'error');
            }
        } catch (err) { showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึก', 'error'); }
    };

    const handleDelete = async (c) => {
        const ok = await showConfirm('ยืนยันการลบ', `ลบลูกค้า "${c.CustomerName}" ใช่หรือไม่?`, 'warning');
        if (!ok) return;
        try {
            const res = await fetch(`${API_BASE}/customers/${c.CustomerID}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) { fetchCustomers(); showAlert('สำเร็จ', 'ลบลูกค้าเรียบร้อย', 'success'); }
            else showAlert('ข้อผิดพลาด', json.message, 'error');
        } catch (err) { showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบ', 'error'); }
    };

    const getStatusClass = (s) => {
        if (s === 'Active') return 'badge-success';
        if (s === 'Inactive' || s === 'Suspended' || s === 'Blacklist') return 'badge-danger';
        if (s === 'Prospect') return 'badge-warning';
        return 'badge-neutral';
    };

    const getStatusThai = (s) => {
        const map = { Active: 'ใช้งาน', Inactive: 'ไม่ใช้งาน', Prospect: 'ผู้สนใจ', Suspended: 'ระงับ', Blacklist: 'ขึ้นบัญชีดำ' };
        return map[s] || s;
    };

    const getSourceThai = (s) => {
        const map = { manual: 'กรอกเอง', sales_order: 'จากใบสั่งซื้อ', quotation: 'จากใบเสนอราคา', online: 'ออนไลน์' };
        return map[s] || s || '-';
    };

    const getTypeClass = (t) => {
        if (!t) return 'badge-neutral';
        if (t.includes('OEM')) return 'badge-warning'; // ส้ม
        return 'badge-info'; // น้ำเงิน
    };

    const getPageTitle = () => activeTab === 'customer_history' ? 'ประวัติลูกค้าและการสั่งซื้อ' : 'รายชื่อลูกค้า';
    const getPageDesc = () => activeTab === 'customer_history' ? 'ตรวจสอบประวัติการสั่งซื้อ และเอกสารต่างๆ ของลูกค้าแต่ละราย' : 'จัดการฐานข้อมูลลูกค้า เพิ่มหรือแก้ไขข้อมูลการติดต่อ';

    return (
        <div className="page-container customer-page page-enter">
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <h1>{getPageTitle()}</h1>
                <p>{getPageDesc()}</p>
            </div>

            {/* ── Tab: Customer List ── */}
            {(activeTab === 'customer_list' && hasSubPermission('customer_list')) && (
                <div className="subpage-content" key="customer_list">
                    {hasSectionPermission('customer_list_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input type="text" placeholder="พิมพ์ชื่อ รหัส หรือประเภทลูกค้า..." value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                            <button className="btn-primary" onClick={openCreate}>+ เพิ่มลูกค้าใหม่</button>
                        </div>
                    )}

                    {hasSectionPermission('customer_list_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รหัสลูกค้า</th>
                                        <th>ชื่อบริษัท/ลูกค้า</th>
                                        <th>ผู้ติดต่อ</th>
                                        <th>โทรศัพท์</th>
                                        <th>อีเมล</th>
                                        <th>ประเภท</th>
                                        <th>วันที่เข้าร่วม</th>
                                        <th>สถานะ</th>
                                        <th style={{ textAlign: 'center' }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((c) => (
                                        <tr key={c.CustomerID}>
                                            <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{c.CustomerCode}</td>
                                            <td className="text-bold">{c.CustomerName}</td>
                                            <td>{c.ContactPerson || '-'}</td>
                                            <td>{c.Phone || '-'}</td>
                                            <td>{c.Email || '-'}</td>
                                            <td><span className={`badge ${getTypeClass(c.CustomerTypeName)}`}>{c.CustomerTypeName || '-'}</span></td>
                                            <td><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.CreatedDate ? new Date(c.CreatedDate).toLocaleDateString('th-TH') : '-'}</span></td>
                                            <td><span className={`badge ${getStatusClass(c.StatusName)}`}>{getStatusThai(c.StatusName)}</span></td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button className="doc-action-btn" title="ดูรายละเอียด" onClick={() => openView(c)}><Eye size={15} /></button>
                                                <button className="doc-action-btn" title="แก้ไข" onClick={() => openEdit(c)}><Edit2 size={15} /></button>
                                                <button className="doc-action-btn doc-action-btn-danger" title="ลบ" onClick={() => handleDelete(c)}><Trash2 size={15} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>ไม่พบข้อมูลลูกค้า</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Customer History ── */}
            {(activeTab === 'customer_history' && hasSubPermission('customer_history')) && (
                <div className="subpage-content" key="customer_history">
                    <div className="card"><p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>เลือกลูกค้าจากหน้ารายชื่อ แล้วกดปุ่ม "ดูรายละเอียด" เพื่อดูประวัติการสั่งซื้อ</p></div>
                </div>
            )}

            {/* ── Modal: Create/Edit ── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '10px', width: '520px', maxHeight: '90vh', overflow: 'auto', padding: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'grid', gap: '14px' }}>
                            <div>
                                <label style={labelStyle}>ชื่อบริษัท/ลูกค้า *</label>
                                <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="เช่น บริษัท ABC จำกัด" />
                            </div>
                            <div>
                                <label style={labelStyle}>ผู้ติดต่อ</label>
                                <input style={inputStyle} value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} placeholder="เช่น คุณสมชาย" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>โทรศัพท์</label>
                                    <input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="02-xxx-xxxx" />
                                </div>
                                <div>
                                    <label style={labelStyle}>อีเมล</label>
                                    <input style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>ที่อยู่</label>
                                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="ที่อยู่สำหรับจัดส่งเอกสารหรือสินค้า" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>เลขประจำตัวผู้เสียภาษี</label>
                                    <input style={inputStyle} value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} placeholder="0-xxxx-xxxxx-xx-x" />
                                </div>
                                <div>
                                    <label style={labelStyle}>ประเภทลูกค้า *</label>
                                    <select style={inputStyle} value={form.typeId} onChange={e => setForm({ ...form, typeId: parseInt(e.target.value) })}>
                                        {types.map(t => <option key={t.CustomerTypeID} value={t.CustomerTypeID}>{t.CustomerTypeName}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>สถานะ</label>
                                <select style={inputStyle} value={form.statusId} onChange={e => setForm({ ...form, statusId: parseInt(e.target.value) })}>
                                    {statuses.map(s => <option key={s.CustomerStatusID} value={s.CustomerStatusID}>{getStatusThai(s.StatusName)} ({s.StatusName})</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
                            <button className="btn-primary" onClick={handleSave}>{editingCustomer ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: View Detail ── */}
            {viewCustomer && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '10px', width: '600px', maxHeight: '90vh', overflow: 'auto', padding: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>รายละเอียดลูกค้า</h2>
                            <button onClick={() => setViewCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <InfoRow label="รหัสลูกค้า" value={viewCustomer.CustomerCode} />
                            <InfoRow label="ชื่อ" value={viewCustomer.CustomerName} />
                            <InfoRow label="ผู้ติดต่อ" value={viewCustomer.ContactPerson} />
                            <InfoRow label="โทรศัพท์" value={viewCustomer.Phone} />
                            <InfoRow label="อีเมล" value={viewCustomer.Email} />
                            <InfoRow label="ประเภท" value={<span className={`badge ${getTypeClass(viewCustomer.CustomerTypeName)}`}>{viewCustomer.CustomerTypeName || '-'}</span>} />
                            <InfoRow label="สถานะ" value={getStatusThai(viewCustomer.StatusName)} />
                            <InfoRow label="วันที่เข้าร่วม" value={viewCustomer.CreatedDate ? new Date(viewCustomer.CreatedDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'} />
                            <InfoRow label="ที่มา" value={getSourceThai(viewCustomer.Source)} />
                        </div>
                        {viewCustomer.Address && <div style={{ marginBottom: '16px' }}><InfoRow label="ที่อยู่" value={viewCustomer.Address} /></div>}
                        {viewCustomer.TaxID && <div style={{ marginBottom: '16px' }}><InfoRow label="เลขผู้เสียภาษี" value={viewCustomer.TaxID} /></div>}

                        {/* Order History */}
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>ประวัติการสั่งซื้อ ({viewOrders.length} รายการ)</h3>
                            {viewOrders.length > 0 ? (
                                <table className="data-table" style={{ minWidth: 'auto' }}>
                                    <thead><tr><th>เลขที่ SO</th><th>อ้างอิง QT</th><th>ยอดรวม</th><th>สถานะ</th><th>วันที่</th></tr></thead>
                                    <tbody>
                                        {viewOrders.map(o => (
                                            <tr key={o.SalesOrderID}>
                                                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{o.SalesOrderNo}</td>
                                                <td>{o.QuotationNo || '-'}</td>
                                                <td>฿{(o.GrandTotal || 0).toLocaleString()}</td>
                                                <td><span className="badge badge-info">{o.Status}</span></td>
                                                <td>{o.CreatedDate ? new Date(o.CreatedDate).toLocaleDateString('th-TH') : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>ยังไม่มีประวัติการสั่งซื้อ</p>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button className="btn-secondary" onClick={() => setViewCustomer(null)}>ปิด</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const InfoRow = ({ label, value }) => (
    <div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{value || '-'}</div>
    </div>
);

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

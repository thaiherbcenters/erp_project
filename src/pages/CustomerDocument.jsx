/**
 * =============================================================================
 * CustomerDocument.jsx — หน้าเอกสารข้อมูลลูกค้า
 * =============================================================================
 *
 * สำหรับกรอกข้อมูลลูกค้า (เช่น OEM หรือตัวแทนจำหน่าย) และบันทึกลงในระบบ
 * =============================================================================
 */

import React, { useState } from 'react';
import {
    Save, User, Building, Building2, Phone, Mail, FileText, CheckCircle,
    XCircle, Users, Plus, ArrowLeft, Search, Eye, Edit2, MapPin,
    Hash, Briefcase, MessageSquare, Factory, Store, Landmark, Package, Loader, Trash2
} from 'lucide-react';
import { useAlert } from '../components/CustomAlert';
import './PageCommon.css';
import './CustomerDocument.css';

const CUSTOMER_TYPES = [
    { value: 'OEM', label: 'OEM (รับจ้างผลิต)', emoji: '🏭', icon: Factory },
    { value: 'Distributor', label: 'ตัวแทนจำหน่าย', emoji: '🏪', icon: Store },
    { value: 'Retail', label: 'ลูกค้ารายย่อย', emoji: '🛒', icon: Package },
    { value: 'Government', label: 'หน่วยงานราชการ', emoji: '🏛️', icon: Landmark },
    { value: 'Other', label: 'อื่นๆ', emoji: '📋', icon: Briefcase },
];

export default function CustomerDocument({ hasPermission }) {
    const { showConfirm } = useAlert();

    if (!hasPermission('document_customers_form')) {
        return <div className="doc-no-access">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
    }

    const [viewMode, setViewMode] = useState('list');
    const [searchTerm, setSearchTerm] = useState('');

    const [mockCustomers, setMockCustomers] = useState([
        { id: 'CUST-001', name: 'บริษัท เอบีซี จำกัด', type: 'OEM', contact: 'คุณสมชาย', phone: '02-111-1111', email: 'sales@abc.com', date: '2026-03-01' },
        { id: 'CUST-002', name: 'ร้าน XYZ การค้า', type: 'Distributor', contact: 'คุณสมหญิง', phone: '02-222-2222', email: 'contact@xyz.com', date: '2026-03-05' },
        { id: 'CUST-003', name: 'หน่วยงานรัฐ GHI', type: 'Government', contact: 'คุณวิชัย', phone: '02-333-3333', email: 'gov@ghi.go.th', date: '2026-03-10' },
    ]);

    const [formData, setFormData] = useState({
        customerName: '', customerType: 'OEM', contactPerson: '',
        phone: '', email: '', address: '', taxId: '', notes: ''
    });

    const [status, setStatus] = useState(null);
    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            customerName: '', customerType: 'OEM', contactPerson: '',
            phone: '', email: '', address: '', taxId: '', notes: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('saving');
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            setStatus('success');
            setMessage('บันทึกข้อมูลลูกค้าสำเร็จ!');

            const newCustomer = {
                id: `CUST-${String(mockCustomers.length + 1).padStart(3, '0')}`,
                name: formData.customerName,
                type: formData.customerType,
                contact: formData.contactPerson || '-',
                phone: formData.phone || '-',
                email: formData.email || '-',
                date: new Date().toISOString().split('T')[0]
            };
            setMockCustomers([newCustomer, ...mockCustomers]);
            setTimeout(() => { setStatus(null); resetForm(); setViewMode('list'); }, 1500);
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
            setTimeout(() => setStatus(null), 5000);
        }
    };

    const filteredCustomers = mockCustomers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ==========================================
    // Render: หน้ารายการ (List View)
    // ==========================================
    if (viewMode === 'list') {
        return (
            <div className="doc-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                        <div className="search-box" style={{ maxWidth: '400px', margin: 0 }}>
                            <Search size={16} />
                            <input type="text" placeholder="ค้นหารหัส หรือ ชื่อบริษัท..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <button className="btn-primary" onClick={() => setViewMode('create')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> สร้างเอกสารข้อมูลลูกค้า
                    </button>
                </div>
                <div className="card table-card">
                    <div className="doc-section-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={20} color="var(--primary)" /> ทะเบียนเอกสารข้อมูลลูกค้า
                        </h3>
                        <span className="doc-section-badge">รวม {filteredCustomers.length} รายการ</span>
                    </div>
                    <table className="data-table">
                        <thead><tr>
                            <th>รหัสลูกค้า</th><th>ชื่อบริษัท / องค์กร</th><th>ประเภท</th>
                            <th>ผู้ติดต่อ</th><th>เบอร์โทรศัพท์</th><th>วันที่ขึ้นทะเบียน</th>
                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                        </tr></thead>
                        <tbody>
                            {filteredCustomers.map((cust) => (
                                <tr key={cust.id}>
                                    <td className="text-bold">{cust.id}</td>
                                    <td>{cust.name}</td>
                                    <td><span className={`badge ${cust.type === 'OEM' ? 'badge-info' : 'badge-primary'}`}>{cust.type}</span></td>
                                    <td>{cust.contact}</td><td>{cust.phone}</td><td>{cust.date}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button className="doc-action-btn" title="ดูข้อมูล"><Eye size={15} /></button>
                                        <button className="doc-action-btn" title="แก้ไข"><Edit2 size={15} /></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredCustomers.length === 0 && (
                                <tr><td colSpan="7" className="doc-empty-row">ไม่พบข้อมูลลูกค้าที่ค้นหา</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // ==========================================
    // Render: หน้าฟอร์ม (Create View) — Premium
    // ==========================================
    const selectedType = CUSTOMER_TYPES.find(t => t.value === formData.customerType);

    return (
        <div className="doc-fade-in" style={{ maxWidth: '960px', margin: '0 auto' }}>

            {/* ── Back Header ── */}
            <div className="cust-back-header">
                <button className="btn-back" onClick={() => setViewMode('list')} title="ย้อนกลับ">
                    <ArrowLeft size={18} />
                </button>
                <div className="cust-header-info">
                    <h2>
                        <Building2 size={24} color="var(--primary)" />
                        สร้างเอกสารข้อมูลลูกค้าใหม่
                    </h2>
                    <p>กรอกข้อมูลบริษัท ผู้ติดต่อ และรายละเอียดอื่นๆ เพื่อบันทึกเข้าสู่ระบบฐานข้อมูล</p>
                </div>
            </div>

            {/* ── Alerts ── */}
            {status === 'success' && (
                <div className="cust-alert success"><CheckCircle size={20} /> {message}</div>
            )}
            {status === 'error' && (
                <div className="cust-alert error"><XCircle size={20} /> {message}</div>
            )}

            <form onSubmit={handleSubmit}>

                {/* ── Section 1: ข้อมูลบริษัท ── */}
                <div className="cust-form-section">
                    <div className="cust-section-header">
                        <div className="cust-section-icon blue">
                            <Building size={22} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="cust-step-number">1</span>
                                <h3 className="cust-section-title">ข้อมูลบริษัท / องค์กร</h3>
                            </div>
                            <p className="cust-section-subtitle">ใส่ชื่อบริษัท ประเภทลูกค้า และเลขภาษี</p>
                        </div>
                    </div>

                    <div className="cust-form-grid">
                        <div className="cust-field full-width">
                            <label>
                                <Building2 size={14} className="label-icon" />
                                ชื่อลูกค้า / ชื่อบริษัท <span className="required">*</span>
                            </label>
                            <input
                                type="text" name="customerName" required
                                value={formData.customerName} onChange={handleChange}
                                placeholder="เช่น บริษัท ไทยเฮิร์บเซ็นเตอร์ จำกัด"
                            />
                        </div>

                        <div className="cust-field full-width">
                            <label>
                                <Briefcase size={14} className="label-icon" />
                                ประเภทลูกค้า <span className="required">*</span>
                            </label>
                            <div className="cust-type-chips">
                                {CUSTOMER_TYPES.map((t) => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        className={`cust-type-chip ${formData.customerType === t.value ? 'active' : ''}`}
                                        onClick={() => setFormData(prev => ({ ...prev, customerType: t.value }))}
                                    >
                                        <span className="chip-emoji">{t.emoji}</span>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="cust-field">
                            <label>
                                <Hash size={14} className="label-icon" />
                                เลขประจำตัวผู้เสียภาษี
                            </label>
                            <input
                                type="text" name="taxId" maxLength={13}
                                value={formData.taxId} onChange={handleChange}
                                placeholder="X-XXXX-XXXXX-XX-X"
                            />
                        </div>

                        <div className="cust-field">
                            <label>
                                <Briefcase size={14} className="label-icon" />
                                สถานะ
                            </label>
                            <input type="text" value="ใช้งาน" disabled
                                style={{ background: '#f0fdf4', color: '#166534', fontWeight: 600, cursor: 'not-allowed' }}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Section 2: ที่อยู่ ── */}
                <div className="cust-form-section">
                    <div className="cust-section-header">
                        <div className="cust-section-icon green">
                            <MapPin size={22} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="cust-step-number">2</span>
                                <h3 className="cust-section-title">ที่อยู่สำนักงาน</h3>
                            </div>
                            <p className="cust-section-subtitle">ที่อยู่สำหรับออกเอกสารทางการ</p>
                        </div>
                    </div>
                    <div className="cust-form-grid">
                        <div className="cust-field full-width">
                            <label>
                                <MapPin size={14} className="label-icon" />
                                ที่อยู่สำนักงาน / สถานประกอบการ
                            </label>
                            <textarea
                                name="address" rows={3}
                                value={formData.address} onChange={handleChange}
                                placeholder="เลขที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Section 3: ผู้ติดต่อ ── */}
                <div className="cust-form-section">
                    <div className="cust-section-header">
                        <div className="cust-section-icon purple">
                            <User size={22} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="cust-step-number">3</span>
                                <h3 className="cust-section-title">ข้อมูลผู้ติดต่อ</h3>
                            </div>
                            <p className="cust-section-subtitle">ข้อมูลบุคคลที่จะประสานงานด้วย</p>
                        </div>
                    </div>
                    <div className="cust-form-grid">
                        <div className="cust-field">
                            <label>
                                <User size={14} className="label-icon" />
                                ชื่อผู้ติดต่อประสานงาน
                            </label>
                            <input
                                type="text" name="contactPerson"
                                value={formData.contactPerson} onChange={handleChange}
                                placeholder="ชื่อ - นามสกุล"
                            />
                        </div>
                        <div className="cust-field">
                            <label>
                                <Phone size={14} className="label-icon" />
                                เบอร์โทรศัพท์
                            </label>
                            <div className="input-wrapper">
                                <span className="input-icon-left"><Phone size={16} /></span>
                                <input
                                    type="tel" name="phone" className="has-icon"
                                    value={formData.phone} onChange={handleChange}
                                    placeholder="099-999-9999"
                                />
                            </div>
                        </div>
                        <div className="cust-field">
                            <label>
                                <Mail size={14} className="label-icon" />
                                อีเมล (Email)
                            </label>
                            <div className="input-wrapper">
                                <span className="input-icon-left"><Mail size={16} /></span>
                                <input
                                    type="email" name="email" className="has-icon"
                                    value={formData.email} onChange={handleChange}
                                    placeholder="email@company.com"
                                />
                            </div>
                        </div>
                        <div className="cust-field">
                            <label>
                                <MessageSquare size={14} className="label-icon" />
                                หมายเหตุเพิ่มเติม
                            </label>
                            <input
                                type="text" name="notes"
                                value={formData.notes} onChange={handleChange}
                                placeholder="ข้อมูลเพิ่มเติมที่ควรทราบ"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Actions Bar ── */}
                <div className="cust-form-actions">
                    <div className="actions-hint">
                        <FileText size={16} />
                        ประเภท: <strong>{selectedType?.label || formData.customerType}</strong>
                    </div>
                    <div className="actions-right">
                        <button type="button" className="cust-btn-clear"
                            onClick={async () => { 
                                const ok = await showConfirm('ยืนยันการล้างข้อมูล', 'คุณต้องการล้างข้อมูลในฟอร์มใช่หรือไม่?', 'warning');
                                if (ok) resetForm(); 
                            }}>
                            <Trash2 size={16} /> ล้างข้อมูล
                        </button>
                        <button type="submit" className="btn-primary" disabled={status === 'saving'}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 28px' }}>
                            {status === 'saving' ? (
                                <><Loader size={18} className="spin" /> กำลังบันทึก...</>
                            ) : (
                                <><Save size={18} /> บันทึกข้อมูลลูกค้า</>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

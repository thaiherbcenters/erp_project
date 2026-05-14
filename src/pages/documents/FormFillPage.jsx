import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, UploadCloud, Edit2, Loader, Eye, Download, Trash2, XCircle, CheckCircle, AlertCircle, Plus, Send, Clock, Printer, X, History, RotateCcw, Save, ClipboardEdit, FileText, ArrowLeft, CheckSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../components/CustomAlert';
import { DOCUMENT_PARTS, DOCUMENT_CATEGORIES } from '../documentData';
import API_BASE from '../../config';

// Shared Utilities
export const getCategoryShortName = (catId) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.shortName : catId;
};
export const getCategoryName = (catId) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.name : catId;
};
export const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function FormFillPage({ doc, onBack }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        // ส่วนที่ 1: ข้อมูลผู้ใช้งาน
        request_date: new Date().toISOString().split('T')[0],
        applicant_name: '',
        employee_id: '',
        position: '',
        department: '',
        start_date: '',
        // ส่วนที่ 2: ประเภทการดำเนินการ
        requestType: '', // new_account, modify, revoke
        modify_reason: '',
        revoke_date: '',
        // ส่วนที่ 3: ระบบและสิทธิ์
        erp_production_hm: false,
        erp_production_tea: false,
        erp_warehouse: false,
        erp_purchasing: false,
        erp_qc: false,
        erp_qa: false,
        erp_sales: false,
        erp_other_check: false,
        erp_other: '',
        access_level: '', // read_only, data_entry, approve
        email_check: false,
        email_name: '',
        ai_check: false,
        shared_drive_check: false,
        shared_folder: '',
        // ส่วนที่ 5: สำหรับเจ้าหน้าที่ IT
        it_completed: false,
        it_username: '',
        it_email_created: '',
        it_notes: '',
        // ลายเซ็น
        name_applicant: '',
        date_applicant: new Date().toISOString().split('T')[0],
    });
    const [isSaved, setIsSaved] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { currentUser } = useAuth();

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsSaved(false);
    };

    const handleCheckboxChange = (field) => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }));
        setIsSaved(false);
    };

    const handleSave = () => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    // ── ฟังก์ชันส่งเอกสาร ──
    const handleSubmit = async () => {
        if (!formData.applicant_name || !formData.department) {
            alert('กรุณากรอกชื่อ-นามสกุล และแผนก ก่อนส่งเอกสาร');
            return;
        }

        if (!confirm('ยืนยันส่งเอกสารเพื่อขออนุมัติหรือไม่?')) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/submissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formCode: doc.id,
                    formName: doc.name,
                    formData: formData,
                    submittedBy: currentUser?.id || 0,
                    submittedByName: currentUser?.name || formData.applicant_name,
                }),
            });
            if (!response.ok) {
                const err = await response.json();
                alert('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถส่งได้'));
                return;
            }
            setIsSubmitted(true);
            alert('✅ ส่งเอกสารเรียบร้อยแล้ว! ระบบกำลังพาไปหน้า DAR เพื่อดูสถานะ');
            navigate('?tab=document_request');
        } catch (err) {
            alert('ไม่สามารถเชื่อมต่อกับ Server ได้: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── ฟังก์ชันพรีวิว PDF ──
    const handlePreviewPDF = async () => {
        setIsLoadingPreview(true);
        try {
            // จัดเตรียมข้อมูลฟิลด์ที่จะส่งไปเติมใน PDF
            const fields = {
                request_date: formatDateThai(formData.request_date),
                applicant_name: formData.applicant_name,
                employee_id: formData.employee_id,
                position: formData.position,
                department: formData.department,
                start_date: formatDateThai(formData.start_date),
                modify_reason: formData.modify_reason,
                revoke_date: formatDateThai(formData.revoke_date),
                erp_other: formData.erp_other,
                email_name: formData.email_name,
                shared_folder: formData.shared_folder,
                name_applicant: formData.applicant_name,
                date_applicant: formatDateThai(formData.date_applicant),

                // Checkboxes mapped to generic PDF field names
                'Check Box1': formData.requestType === 'new_account',
                'Check Box2': formData.requestType === 'modify',
                'Check Box3': formData.requestType === 'revoke',
                'Check Box4': !!formData.erp_production_hm,
                'Check Box5': !!formData.erp_production_tea,
                'Check Box6': !!formData.erp_warehouse,
                'Check Box7': !!formData.erp_purchasing,
                'Check Box8': !!formData.erp_qc,
                'Check Box9': !!formData.erp_qa,
                'Check Box10': !!formData.erp_sales,
                'Check Box11': !!formData.erp_other_check,
                'Check Box12': formData.access_level === 'read_only',
                'Check Box13': formData.access_level === 'data_entry',
                'Check Box14': formData.access_level === 'approve',
                'Check Box15': !!formData.email_check,
                'Check Box16': !!formData.ai_check,
                'Check Box17': !!formData.shared_drive_check,
                'Check Box18': !!formData.it_completed,
                it_username_assigned: formData.it_username || '',
                it_email_created: formData.it_email_created || '',
                it_notes: formData.it_notes || '',

                // Signatures (Preview before submit)
                sig_applicant_af_image: currentUser?.username ? `D:\\ERP_Data\\E-Signature\\${currentUser.username}.png` : '',
                doc_sig_creator_af_image: currentUser?.username ? `D:\\ERP_Data\\E-Signature\\${currentUser.username}.png` : '',
                doc_date_creator: formatDateThai(new Date().toISOString().split('T')[0]),
            };

            const response = await fetch(`${API_BASE}/forms/fill/FM-IT-01`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields }),
            });

            if (!response.ok) {
                const err = await response.json();
                alert('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถสร้าง PDF ได้'));
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setShowPreview(true);
        } catch (err) {
            alert('ไม่สามารถเชื่อมต่อกับ Server ได้: ' + err.message);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const closePreview = () => {
        setShowPreview(false);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    // แปลงวันที่จาก YYYY-MM-DD เป็น DD/MM/YYYY
    const formatDateThai = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // ── Section Header Component ──
    const SectionHeader = ({ num, title }) => (
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: 'var(--primary)', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>{num}</span>
            {title}
        </h3>
    );

    // ── Checkbox Item Component ──
    const CheckItem = ({ label, field, children }) => (
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: 'var(--text-primary)', cursor: 'pointer', padding: '7px 12px', borderRadius: '8px', border: formData[field] ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)', background: formData[field] ? 'var(--primary-light, #e0f2fe)' : 'transparent', transition: 'all 0.15s ease' }}>
            <input type="checkbox" checked={formData[field]} onChange={() => handleCheckboxChange(field)} style={{ accentColor: 'var(--primary)' }} />
            {label}
            {children}
        </label>
    );

    return (
        <div className="doc-fade-in">
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={onBack} className="btn-back" title="กลับ">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>กรอกแบบฟอร์ม: {doc.id}</h2>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{doc.name}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn-secondary"
                        onClick={handlePreviewPDF}
                        disabled={isLoadingPreview}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px', border: '1.5px solid var(--primary)', background: 'transparent', color: 'var(--primary)', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                    >
                        <Eye size={15} />
                        {isLoadingPreview ? 'กำลังสร้าง PDF...' : 'พรีวิว PDF'}
                    </button>
                    <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px' }}>
                        <Save size={15} />
                        {isSaved ? '✓ บันทึกแล้ว' : 'บันทึก'}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || isSubmitted}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 18px', background: isSubmitted ? '#22c55e' : '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', cursor: isSubmitted ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 600, opacity: isSubmitting ? 0.7 : 1 }}
                    >
                        {isSubmitted ? <><CheckCircle size={15} /> ส่งแล้ว</> : isSubmitting ? 'กำลังส่ง...' : <><Send size={15} /> ส่งเอกสาร</>}
                    </button>
                </div>
            </div>

            {/* ── Form Content Card ── */}
            <div className="card" style={{ padding: '24px' }}>
                {/* ── Doc Info Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid var(--border-color)' }}>
                    <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>รหัสแบบฟอร์ม</span>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{doc.id}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ชื่อเอกสาร</span>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '400px' }}>แบบฟอร์มขอสิทธิ์เข้าใช้งานระบบ ERP และสารสนเทศ</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rev.</span>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{doc.revision}</div>
                    </div>
                </div>

                {/* ════════════════════════════════════════════════════════════════
                    ส่วนที่ 1: ข้อมูลผู้ใช้งาน (User Information)
                   ════════════════════════════════════════════════════════════════ */}
                <div style={{ marginBottom: '28px' }}>
                    <SectionHeader num="1" title="ข้อมูลผู้ใช้งาน (User Information)" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-field">
                            <label>วันที่ขอสิทธิ์ <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="date" value={formData.request_date} onChange={(e) => handleChange('request_date', e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label>ชื่อ-นามสกุล <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="text" value={formData.applicant_name} onChange={(e) => handleChange('applicant_name', e.target.value)} placeholder="กรอกชื่อ-นามสกุล" />
                        </div>
                        <div className="form-field">
                            <label>รหัสพนักงาน</label>
                            <input type="text" value={formData.employee_id} onChange={(e) => handleChange('employee_id', e.target.value)} placeholder="กรอกรหัสพนักงาน" />
                        </div>
                        <div className="form-field">
                            <label>ตำแหน่ง</label>
                            <input type="text" value={formData.position} onChange={(e) => handleChange('position', e.target.value)} placeholder="กรอกตำแหน่ง" />
                        </div>
                        <div className="form-field">
                            <label>แผนก / ฝ่าย <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="text" value={formData.department} onChange={(e) => handleChange('department', e.target.value)} placeholder="กรอกแผนก/ฝ่าย" />
                        </div>
                        <div className="form-field">
                            <label>วันที่เริ่มปฏิบัติงาน</label>
                            <input type="date" value={formData.start_date} onChange={(e) => handleChange('start_date', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* ════════════════════════════════════════════════════════════════
                    ส่วนที่ 2: ประเภทการดำเนินการ (Type of Request)
                   ════════════════════════════════════════════════════════════════ */}
                <div style={{ marginBottom: '28px' }}>
                    <SectionHeader num="2" title="ประเภทการดำเนินการ (Type of Request)" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* สร้างบัญชีผู้ใช้ใหม่ */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', border: formData.requestType === 'new_account' ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)', background: formData.requestType === 'new_account' ? 'var(--primary-light, #e0f2fe)' : 'transparent', transition: 'all 0.15s ease' }}>
                            <input type="radio" name="requestType" value="new_account" checked={formData.requestType === 'new_account'} onChange={(e) => handleChange('requestType', e.target.value)} style={{ accentColor: 'var(--primary)' }} />
                            สร้างบัญชีผู้ใช้ใหม่ (New Account)
                        </label>

                        {/* ปรับปรุง/แก้ไขสิทธิ์ */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', border: formData.requestType === 'modify' ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)', background: formData.requestType === 'modify' ? 'var(--primary-light, #e0f2fe)' : 'transparent', transition: 'all 0.15s ease' }}>
                                <input type="radio" name="requestType" value="modify" checked={formData.requestType === 'modify'} onChange={(e) => handleChange('requestType', e.target.value)} style={{ accentColor: 'var(--primary)' }} />
                                ปรับปรุง/แก้ไขสิทธิ์การใช้งาน (Modify Access)
                            </label>
                            {formData.requestType === 'modify' && (
                                <div className="form-field" style={{ marginTop: '10px', marginLeft: '34px' }}>
                                    <label>ระบุเหตุผล</label>
                                    <input type="text" value={formData.modify_reason} onChange={(e) => handleChange('modify_reason', e.target.value)} placeholder="กรอกเหตุผลที่ต้องการเปลี่ยนแปลง" />
                                </div>
                            )}
                        </div>

                        {/* ยกเลิกสิทธิ์ */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', border: formData.requestType === 'revoke' ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)', background: formData.requestType === 'revoke' ? 'var(--primary-light, #e0f2fe)' : 'transparent', transition: 'all 0.15s ease' }}>
                                <input type="radio" name="requestType" value="revoke" checked={formData.requestType === 'revoke'} onChange={(e) => handleChange('requestType', e.target.value)} style={{ accentColor: 'var(--primary)' }} />
                                ยกเลิกสิทธิ์/พนักงานพ้นสภาพ (Revoke Account)
                            </label>
                            {formData.requestType === 'revoke' && (
                                <div className="form-field" style={{ marginTop: '10px', marginLeft: '34px' }}>
                                    <label>มีผลตั้งแต่วันที่</label>
                                    <input type="date" value={formData.revoke_date} onChange={(e) => handleChange('revoke_date', e.target.value)} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ════════════════════════════════════════════════════════════════
                    ส่วนที่ 3: ระบบและสิทธิ์ที่ต้องการใช้งาน
                   ════════════════════════════════════════════════════════════════ */}
                <div style={{ marginBottom: '28px' }}>
                    <SectionHeader num="3" title="ระบบและสิทธิ์ที่ต้องการใช้งาน (System & Access Required)" />

                    {/* 3.1 ระบบ ERP */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>3.1 ระบบ ERP (Enterprise Resource Planning)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <CheckItem label="ฝ่ายผลิตยา (Production - HM)" field="erp_production_hm" />
                            <CheckItem label="ฝ่ายผลิตชา (Production - Tea)" field="erp_production_tea" />
                            <CheckItem label="คลังสินค้า (Warehouse)" field="erp_warehouse" />
                            <CheckItem label="จัดซื้อ (Purchasing)" field="erp_purchasing" />
                            <CheckItem label="ควบคุมคุณภาพ (QC)" field="erp_qc" />
                            <CheckItem label="ประกันคุณภาพ (QA / Document Control)" field="erp_qa" />
                            <CheckItem label="ขายและการตลาด (Sales & Mkt.)" field="erp_sales" />
                        </div>
                        {/* อื่นๆ ระบุ */}
                        <div style={{ marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: 'var(--text-primary)', cursor: 'pointer', padding: '7px 12px', borderRadius: '8px', border: formData.erp_other_check ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)', background: formData.erp_other_check ? 'var(--primary-light, #e0f2fe)' : 'transparent' }}>
                                <input type="checkbox" checked={formData.erp_other_check} onChange={() => handleCheckboxChange('erp_other_check')} style={{ accentColor: 'var(--primary)' }} />
                                อื่นๆ ระบุ
                            </label>
                            {formData.erp_other_check && (
                                <div className="form-field" style={{ marginTop: '8px', marginLeft: '34px' }}>
                                    <input type="text" value={formData.erp_other} onChange={(e) => handleChange('erp_other', e.target.value)} placeholder="ระบุระบบ ERP อื่นๆ" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ระดับสิทธิ์การใช้งาน */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>ระดับสิทธิ์การใช้งาน (Access Level)</h4>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {[{ val: 'read_only', label: 'อ่านอย่างเดียว (Read Only)' }, { val: 'data_entry', label: 'บันทึก/แก้ไขข้อมูล (Data Entry)' }, { val: 'approve', label: 'อนุมัติ (Approve)' }].map(opt => (
                                <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', padding: '8px 14px', borderRadius: '8px', border: formData.access_level === opt.val ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)', background: formData.access_level === opt.val ? 'var(--primary-light, #e0f2fe)' : 'transparent', transition: 'all 0.15s ease' }}>
                                    <input type="radio" name="access_level" value={opt.val} checked={formData.access_level === opt.val} onChange={(e) => handleChange('access_level', e.target.value)} style={{ accentColor: 'var(--primary)' }} />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 3.2 ระบบสารสนเทศอื่นๆ */}
                    <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>3.2 ระบบสารสนเทศอื่นๆ</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* อีเมลองค์กร */}
                            <div>
                                <CheckItem label="อีเมลองค์กร (Corporate Email)" field="email_check" />
                                {formData.email_check && (
                                    <div className="form-field" style={{ marginTop: '8px', marginLeft: '34px' }}>
                                        <label>ระบุชื่ออีเมลที่ต้องการ</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input type="text" value={formData.email_name} onChange={(e) => handleChange('email_name', e.target.value)} placeholder="ชื่ออีเมล" style={{ flex: 1 }} />
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>@thaiherbcenter.com</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* AI Assistant */}
                            <CheckItem label="ระบบผู้ช่วยปัญญาประดิษฐ์ (AI Assistant)" field="ai_check" />
                            {/* Shared Drive */}
                            <div>
                                <CheckItem label="สิทธิ์เข้าถึงโฟลเดอร์แชร์ส่วนกลาง (Shared Drive)" field="shared_drive_check" />
                                {formData.shared_drive_check && (
                                    <div className="form-field" style={{ marginTop: '8px', marginLeft: '34px' }}>
                                        <label>ระบุโฟลเดอร์</label>
                                        <input type="text" value={formData.shared_folder} onChange={(e) => handleChange('shared_folder', e.target.value)} placeholder="ระบุชื่อโฟลเดอร์ที่ต้องการเข้าถึง" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ════════════════════════════════════════════════════════════════
                    ส่วนที่ 4: สำหรับเจ้าหน้าที่ IT (For IT Department Use Only)
                   ════════════════════════════════════════════════════════════════ */}
                <div style={{ marginBottom: '28px' }}>
                    <SectionHeader num="4" title="สำหรับเจ้าหน้าที่ IT (For IT Department Use Only)" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Checkbox: ดำเนินการเรียบร้อยแล้ว */}
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer', padding: '14px', borderRadius: '8px', border: formData.it_completed ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)', background: formData.it_completed ? 'var(--primary-light, #e0f2fe)' : 'transparent', lineHeight: 1.6 }}>
                            <input type="checkbox" checked={formData.it_completed} onChange={() => handleCheckboxChange('it_completed')} style={{ accentColor: 'var(--primary)', marginTop: '3px' }} />
                            <span>ดำเนินการสร้าง/แก้ไข/ยกเลิก บัญชีผู้ใช้งานเรียบร้อยแล้ว</span>
                        </label>
                        {/* Username ที่กำหนด */}
                        <div className="form-field">
                            <label>Username ที่กำหนด</label>
                            <input type="text" value={formData.it_username} onChange={(e) => handleChange('it_username', e.target.value)} placeholder="ระบุ Username ที่กำหนดให้" />
                        </div>
                        {/* อีเมลที่สร้าง */}
                        <div className="form-field">
                            <label>อีเมลที่สร้าง (ถ้ามี)</label>
                            <input type="text" value={formData.it_email_created} onChange={(e) => handleChange('it_email_created', e.target.value)} placeholder="ระบุอีเมลที่สร้างให้" />
                        </div>
                        {/* หมายเหตุเพิ่มเติม */}
                        <div className="form-field">
                            <label>หมายเหตุเพิ่มเติม</label>
                            <textarea rows={2} value={formData.it_notes} onChange={(e) => handleChange('it_notes', e.target.value)} placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" style={{ width: '100%', resize: 'vertical' }} />
                        </div>
                    </div>
                </div>


            </div>

            {/* ── Preview PDF Modal ── */}
            {showPreview && previewUrl && (
                <div className="pdf-preview-overlay" onClick={closePreview}>
                    <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pdf-preview-header">
                            <h3 style={{ margin: 0, fontSize: '15px' }}>พรีวิว PDF: {doc.id}</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <a href={previewUrl} download={`${doc.id}_filled.pdf`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 14px', textDecoration: 'none' }}>
                                    <Download size={14} />
                                    ดาวน์โหลด PDF
                                </a>
                                <button onClick={closePreview} className="doc-action-btn" style={{ width: '32px', height: '32px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px' }}>
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <iframe src={previewUrl} className="pdf-preview-iframe" title="PDF Preview" />
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Sub-page 3: Document Action Request (DAR)
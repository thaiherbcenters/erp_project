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

export default function RevisionFormPage({ parentSub, onBack, currentUser, navigate }) {
    // Pre-fill form data จากฉบับเดิม
    let initialData = {};
    if (parentSub.form_data) {
        try { initialData = JSON.parse(parentSub.form_data); } catch (e) { }
    }

    const [formData, setFormData] = useState({
        ...initialData,
        date_applicant: new Date().toISOString().split('T')[0],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCheckboxChange = (field) => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSubmitRevision = async () => {
        if (!formData.applicant_name || !formData.department) {
            alert('กรุณากรอกชื่อ-นามสกุล และแผนก ก่อนส่งเอกสาร');
            return;
        }

        if (!confirm('ยืนยันส่งเอกสารฉบับแก้ไขหรือไม่?')) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/submissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formCode: parentSub.form_code,
                    formName: parentSub.form_name,
                    formData: formData,
                    submittedBy: currentUser?.id || 0,
                    submittedByName: currentUser?.name || formData.applicant_name,
                    parentSubmissionId: parentSub.submission_id,
                }),
            });
            if (!response.ok) {
                const err = await response.json();
                alert('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถส่งได้'));
                return;
            }
            const result = await response.json();
            setIsSubmitted(true);
            alert(`✅ ${result.message}`);
            onBack();
        } catch (err) {
            alert('ไม่สามารถเชื่อมต่อกับ Server ได้: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const SectionHeader = ({ num, title }) => (
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: 'var(--primary)', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>{num}</span>
            {title}
        </h3>
    );

    const CheckItem = ({ label, field }) => (
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer', padding: '7px 12px', borderRadius: '6px', border: formData[field] ? '1px solid var(--primary)' : '1px solid var(--border)', background: formData[field] ? '#eef2ff' : 'transparent', transition: 'all 0.15s ease' }}>
            <input type="checkbox" checked={!!formData[field]} onChange={() => handleCheckboxChange(field)} style={{ accentColor: 'var(--primary)' }} />
            {label}
        </label>
    );

    return (
        <div className="doc-fade-in">
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={onBack} className="btn-back" title="กลับ">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '16px', color: 'var(--text)' }}>แก้ไขเอกสาร: {parentSub.form_code}</h2>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            ฉบับแก้ไขจาก #{parentSub.submission_id} — {parentSub.form_name}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSubmitRevision}
                    disabled={isSubmitting || isSubmitted}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 18px', background: isSubmitted ? '#22c55e' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: isSubmitted ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 600, opacity: isSubmitting ? 0.7 : 1 }}
                >
                    {isSubmitted ? <><CheckCircle size={15} /> ส่งแล้ว</> : isSubmitting ? 'กำลังส่ง...' : <><Send size={15} /> ส่งฉบับแก้ไข</>}
                </button>
            </div>

            {/* ── Revision Reason Banner ── */}
            {parentSub.revision_comment && (
                <div style={{ padding: '12px 16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#92400e', marginBottom: '2px' }}>เหตุผลที่ต้องแก้ไข</div>
                        <div style={{ fontSize: '13px', color: '#78350f' }}>{parentSub.revision_comment}</div>
                    </div>
                </div>
            )}

            {/* ── Form Content ── */}
            <div className="card" style={{ padding: '24px' }}>
                {/* Section 1 */}
                <div style={{ marginBottom: '24px' }}>
                    <SectionHeader num="1" title="ข้อมูลผู้ใช้งาน" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div className="form-field">
                            <label>วันที่ขอสิทธิ์</label>
                            <input type="date" value={formData.request_date || ''} onChange={(e) => handleChange('request_date', e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label>ชื่อ-นามสกุล <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="text" value={formData.applicant_name || ''} onChange={(e) => handleChange('applicant_name', e.target.value)} placeholder="กรอกชื่อ-นามสกุล" />
                        </div>
                        <div className="form-field">
                            <label>รหัสพนักงาน</label>
                            <input type="text" value={formData.employee_id || ''} onChange={(e) => handleChange('employee_id', e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label>ตำแหน่ง</label>
                            <input type="text" value={formData.position || ''} onChange={(e) => handleChange('position', e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label>แผนก / ฝ่าย <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="text" value={formData.department || ''} onChange={(e) => handleChange('department', e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label>วันที่เริ่มปฏิบัติงาน</label>
                            <input type="date" value={formData.start_date || ''} onChange={(e) => handleChange('start_date', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Section 2: ประเภทการดำเนินการ */}
                <div style={{ marginBottom: '24px' }}>
                    <SectionHeader num="2" title="ประเภทการดำเนินการ" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[{ val: 'new_account', label: 'สร้างบัญชีผู้ใช้ใหม่' }, { val: 'modify', label: 'ปรับปรุง/แก้ไขสิทธิ์' }, { val: 'revoke', label: 'ยกเลิกสิทธิ์' }].map(opt => (
                            <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '9px 14px', borderRadius: '6px', border: formData.requestType === opt.val ? '1px solid var(--primary)' : '1px solid var(--border)', background: formData.requestType === opt.val ? '#eef2ff' : 'transparent' }}>
                                <input type="radio" name="requestType" value={opt.val} checked={formData.requestType === opt.val} onChange={(e) => handleChange('requestType', e.target.value)} style={{ accentColor: 'var(--primary)' }} />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Section 3: ระบบ ERP */}
                <div style={{ marginBottom: '24px' }}>
                    <SectionHeader num="3" title="ระบบและสิทธิ์ที่ต้องการ" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <CheckItem label="ฝ่ายผลิตยา (HM)" field="erp_production_hm" />
                        <CheckItem label="ฝ่ายผลิตชา (Tea)" field="erp_production_tea" />
                        <CheckItem label="คลังสินค้า" field="erp_warehouse" />
                        <CheckItem label="จัดซื้อ" field="erp_purchasing" />
                        <CheckItem label="ควบคุมคุณภาพ (QC)" field="erp_qc" />
                        <CheckItem label="ประกันคุณภาพ (QA)" field="erp_qa" />
                        <CheckItem label="ขายและการตลาด" field="erp_sales" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>ระดับสิทธิ์</h4>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[{ val: 'read_only', label: 'อ่านอย่างเดียว' }, { val: 'data_entry', label: 'บันทึก/แก้ไข' }, { val: 'approve', label: 'อนุมัติ' }].map(opt => (
                                <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', padding: '7px 12px', borderRadius: '6px', border: formData.access_level === opt.val ? '1px solid var(--primary)' : '1px solid var(--border)', background: formData.access_level === opt.val ? '#eef2ff' : 'transparent' }}>
                                    <input type="radio" name="access_level" value={opt.val} checked={formData.access_level === opt.val} onChange={(e) => handleChange('access_level', e.target.value)} style={{ accentColor: 'var(--primary)' }} />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}












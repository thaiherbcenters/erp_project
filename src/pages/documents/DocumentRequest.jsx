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

export default function DocumentRequest({ hasPermission }) {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approverIds, setApproverIds] = useState({ step1: null, step2: null });
    const [actionModal, setActionModal] = useState(null); // { id, action: 'approve'|'reject'|'request-revision' }
    const [actionComment, setActionComment] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [previewLoadingId, setPreviewLoadingId] = useState(null);
    const [historyModal, setHistoryModal] = useState(null); // [{ submission_id, ... }]
    const [historyLoading, setHistoryLoading] = useState(false);
    const [revisionEditSub, setRevisionEditSub] = useState(null); // submission ที่กำลังแก้ไข

    // โหลดข้อมูล submissions + approver IDs
    const loadData = async () => {
        setLoading(true);
        try {
            const [subRes, approverRes] = await Promise.all([
                fetch(`${API_BASE}/submissions`),
                fetch(`${API_BASE}/submissions/approver-ids`),
            ]);
            if (subRes.ok) setSubmissions(await subRes.json());
            if (approverRes.ok) setApproverIds(await approverRes.json());
        } catch (err) {
            console.error('Error loading submissions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (!hasPermission('document_request_search'))
        return <div className="doc-no-access">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>;

    // ── ถ้ากำลังแก้ไข revision ให้แสดงหน้ากรอกฟอร์ม ──
    if (revisionEditSub) {
        return (
            <RevisionFormPage
                parentSub={revisionEditSub}
                onBack={() => { setRevisionEditSub(null); loadData(); }}
                currentUser={currentUser}
                navigate={navigate}
            />
        );
    }

    // กรองให้ approver เห็นเฉพาะเอกสารที่รอเขาอนุมัติ, user ทั่วไปเห็นเฉพาะของตัวเอง
    const userSubs = submissions.filter(s => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        if (currentUser.id === approverIds.step1) return s.step1_status === 'pending';
        if (currentUser.id === approverIds.step2) return s.step1_status === 'approved' && s.step2_status === 'pending';
        return s.submitted_by === currentUser.id;
    });

    const filteredSubs = userSubs.filter(s =>
        (s.form_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.form_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.submitted_by_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getBadgeClass = (status) => {
        if (status === 'อนุมัติแล้ว') return 'badge-success';
        if (status === 'ไม่อนุมัติ') return 'badge-danger';
        if (status === 'ส่งกลับแก้ไข') return 'badge-warning';
        if (status && status.startsWith('ถูกแทนที่')) return 'badge-neutral';
        return 'badge-info';
    };

    const canApprove = (sub) => {
        if (!currentUser) return false;
        if (currentUser.id === approverIds.step1 && sub.step1_status === 'pending') return true;
        if (currentUser.id === approverIds.step2 && sub.step1_status === 'approved' && sub.step2_status === 'pending') return true;
        return false;
    };

    // ตรวจสอบว่าผู้ส่งสามารถแก้ไขและส่งใหม่ได้
    const canRevise = (sub) => {
        if (!currentUser) return false;
        return sub.submitted_by === currentUser.id && sub.overall_status === 'ส่งกลับแก้ไข';
    };

    // ── ฟังก์ชันพรีวิว PDF จาก submission ──
    const handlePreviewSubmission = async (sub) => {
        setPreviewLoadingId(sub.submission_id);
        try {
            const detailRes = await fetch(`${API_BASE}/submissions`);
            const allSubs = await detailRes.json();
            const fullSub = allSubs.find(s => s.submission_id === sub.submission_id) || sub;

            let formData = {};
            if (fullSub.form_data) {
                try { formData = JSON.parse(fullSub.form_data); } catch (e) { }
            }

            const formatDateThai = (dateStr) => {
                if (!dateStr) return '';
                const parts = dateStr.split('-');
                if (parts.length !== 3) return dateStr;
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            };

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
                'Check Box18': !!formData.declaration,
                sig_applicant_af_image: fullSub.submitted_by_username ? `D:\\ERP_Data\\E-Signature\\${fullSub.submitted_by_username}.png` : '',
                doc_sig_creator_af_image: fullSub.submitted_by_username ? `D:\\ERP_Data\\E-Signature\\${fullSub.submitted_by_username}.png` : '',
                doc_sig_reviewer_af_image: (fullSub.step1_status === 'approved' && fullSub.step1_approved_by_username) ? `D:\\ERP_Data\\E-Signature\\${fullSub.step1_approved_by_username}.png` : '',
                doc_sig_approver_af_image: (fullSub.step2_status === 'approved' && fullSub.step2_approved_by_username) ? `D:\\ERP_Data\\E-Signature\\${fullSub.step2_approved_by_username}.png` : '',
                doc_date_creator: formatDateThai(fullSub.submitted_at ? fullSub.submitted_at.split('T')[0] : ''),
                doc_date_reviewer: fullSub.step1_status === 'approved' && fullSub.step1_approved_at ? formatDateThai(fullSub.step1_approved_at.split('T')[0]) : '',
                doc_date_approver: fullSub.step2_status === 'approved' && fullSub.step2_approved_at ? formatDateThai(fullSub.step2_approved_at.split('T')[0]) : '',
            };

            const response = await fetch(`${API_BASE}/forms/fill/FM-IT-01`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields }),
            });

            if (!response.ok) {
                alert('ไม่สามารถสร้าง PDF ได้');
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setPreviewDoc(sub);
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setPreviewLoadingId(null);
        }
    };

    const closePreview = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPreviewDoc(null);
    };

    // ── ดูประวัติ revision ──
    const handleViewHistory = async (sub) => {
        setHistoryLoading(true);
        try {
            const res = await fetch(`${API_BASE}/submissions/${sub.submission_id}/history`);
            if (res.ok) {
                const data = await res.json();
                setHistoryModal(data);
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setHistoryLoading(false);
        }
    };

    // ดำเนินการอนุมัติ/ไม่อนุมัติ/ส่งกลับแก้ไข
    const handleAction = async () => {
        if (!actionModal) return;

        // บังคับใส่เหตุผลสำหรับ request-revision
        if (actionModal.action === 'request-revision' && (!actionComment || actionComment.trim() === '')) {
            alert('กรุณาระบุเหตุผลที่ต้องแก้ไข');
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE}/submissions/${actionModal.id}/${actionModal.action}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, comment: actionComment }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`✅ ${data.message}`);
                setActionModal(null);
                setActionComment('');
                loadData();
            } else {
                alert('❌ ' + data.message);
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const pendingCount = userSubs.filter(s => s.overall_status !== 'อนุมัติแล้ว' && s.overall_status !== 'ไม่อนุมัติ' && s.overall_status !== 'ส่งกลับแก้ไข' && !(s.overall_status || '').startsWith('ถูกแทนที่')).length;
    const approvedCount = userSubs.filter(s => s.overall_status === 'อนุมัติแล้ว').length;
    const rejectedCount = userSubs.filter(s => s.overall_status === 'ไม่อนุมัติ').length;
    const revisionCount = userSubs.filter(s => s.overall_status === 'ส่งกลับแก้ไข').length;

    // ตรวจสอบว่ามีแถวไหนมีปุ่มจัดการหรือไม่ ถ้าไม่มีจะซ่อนคอลัมน์ทั้งหมด
    const showActionsColumn = filteredSubs.some(s => canApprove(s) || canRevise(s));

    const getActionTitle = () => {
        if (!actionModal) return '';
        if (actionModal.action === 'approve') return '✅ อนุมัติเอกสาร';
        if (actionModal.action === 'reject') return '❌ ไม่อนุมัติเอกสาร';
        return '✏️ ส่งกลับแก้ไข';
    };

    const getActionColor = () => {
        if (!actionModal) return '#6366f1';
        if (actionModal.action === 'approve') return '#16a34a';
        if (actionModal.action === 'reject') return '#dc2626';
        return '#f59e0b';
    };

    const getActionBtnText = () => {
        if (!actionModal) return '';
        if (actionLoading) return 'กำลังดำเนินการ...';
        if (actionModal.action === 'approve') return 'ยืนยันอนุมัติ';
        if (actionModal.action === 'reject') return 'ยืนยันไม่อนุมัติ';
        return 'ยืนยันส่งกลับแก้ไข';
    };

    return (
        <div className="doc-fade-in">
            {/* ── Toolbar ── */}
            <div className="toolbar">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="ค้นหารหัสฟอร์ม, ชื่อเอกสาร, หรือผู้ส่ง..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* ── Summary Strip ── */}
            <div className="doc-dar-summary">
                <div className="doc-dar-stat">
                    <span className="doc-dar-dot" style={{ background: '#3b82f6' }}></span>
                    รออนุมัติ <strong>{pendingCount}</strong>
                </div>
                <div className="doc-dar-stat">
                    <span className="doc-dar-dot" style={{ background: '#22c55e' }}></span>
                    อนุมัติแล้ว <strong>{approvedCount}</strong>
                </div>
                <div className="doc-dar-stat">
                    <span className="doc-dar-dot" style={{ background: '#f59e0b' }}></span>
                    ส่งกลับแก้ไข <strong>{revisionCount}</strong>
                </div>
                <div className="doc-dar-stat">
                    <span className="doc-dar-dot" style={{ background: '#ef4444' }}></span>
                    ไม่อนุมัติ <strong>{rejectedCount}</strong>
                </div>
                <div className="doc-dar-stat">
                    <span className="doc-dar-dot" style={{ background: '#6366f1' }}></span>
                    ทั้งหมด <strong>{userSubs.length}</strong>
                </div>
            </div>

            {/* ── Table ── */}
            {hasPermission('document_request_table') && (
                <div className="card table-card">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>กำลังโหลดข้อมูล...</div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>รหัสฟอร์ม</th>
                                    <th>ชื่อเอกสาร</th>
                                    <th>ผู้ส่ง</th>
                                    <th>วันที่ส่ง</th>
                                    <th style={{ textAlign: 'center' }}>Rev.</th>
                                    <th>สถานะ</th>
                                    <th style={{ textAlign: 'center' }}>ต้นฉบับ/ประวัติ</th>
                                    {showActionsColumn && <th style={{ textAlign: 'center' }}>จัดการ</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubs.map((sub) => (
                                    <tr key={sub.submission_id}>
                                        <td className="text-bold" data-label="#">{sub.submission_id}</td>
                                        <td data-label="รหัสฟอร์ม">
                                            <span className="doc-type-tag">
                                                <FileText size={14} />
                                                {sub.form_code}
                                            </span>
                                        </td>
                                        <td data-label="ชื่อเอกสาร">{sub.form_name || '-'}</td>
                                        <td data-label="ผู้ส่ง">{sub.submitted_by_name}</td>
                                        <td data-label="วันที่ส่ง">{formatDate(sub.submitted_at)}</td>
                                        <td data-label="Rev." style={{ textAlign: 'center' }}>
                                            {(sub.revision_number || 0) > 0 ? (
                                                <span className="badge badge-info" style={{ fontSize: '10px', padding: '1px 6px' }}>
                                                    Rev.{sub.revision_number}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>
                                            )}
                                        </td>
                                        <td data-label="สถานะ">
                                            <span className={`badge ${getBadgeClass(sub.overall_status)}`}>
                                                {sub.overall_status}
                                            </span>
                                        </td>
                                        {/* คอลัมน์ ต้นฉบับ/ประวัติ */}
                                        <td data-label="เอกสาร" style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                {/* ดูเอกสาร */}
                                                <button
                                                    className="doc-action-btn"
                                                    title="ดูเอกสาร"
                                                    style={{ background: '#e0f2fe', color: '#0284c7' }}
                                                    onClick={() => handlePreviewSubmission(sub)}
                                                    disabled={previewLoadingId === sub.submission_id}
                                                >
                                                    {previewLoadingId === sub.submission_id ? (
                                                        <Loader size={14} className="spin-animation" />
                                                    ) : (
                                                        <Eye size={14} />
                                                    )}
                                                </button>

                                                {/* ดูประวัติ (ถ้ามี revision) */}
                                                {(sub.revision_number > 0 || sub.parent_submission_id) && (
                                                    <button
                                                        className="doc-action-btn"
                                                        title="ดูประวัติแก้ไข"
                                                        style={{ background: '#ede9fe', color: '#7c3aed' }}
                                                        onClick={() => handleViewHistory(sub)}
                                                    >
                                                        <History size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>

                                        {/* คอลัมน์ จัดการ */}
                                        {showActionsColumn && (
                                            <td data-label="จัดการ" style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                    {/* Approver actions: อนุมัติ / ส่งกลับแก้ไข / ไม่อนุมัติ */}
                                                    {canApprove(sub) && (
                                                        <>
                                                            <button
                                                                className="doc-action-btn"
                                                                title="อนุมัติ"
                                                                style={{ background: '#dcfce7', color: '#16a34a' }}
                                                                onClick={() => setActionModal({ id: sub.submission_id, action: 'approve' })}
                                                            >
                                                                <CheckCircle size={14} />
                                                            </button>
                                                            <button
                                                                className="doc-action-btn"
                                                                title="ส่งกลับแก้ไข"
                                                                style={{ background: '#fef3c7', color: '#d97706' }}
                                                                onClick={() => setActionModal({ id: sub.submission_id, action: 'request-revision' })}
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                className="doc-action-btn"
                                                                title="ไม่อนุมัติ"
                                                                style={{ background: '#fee2e2', color: '#dc2626' }}
                                                                onClick={() => setActionModal({ id: sub.submission_id, action: 'reject' })}
                                                            >
                                                                <XCircle size={14} />
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* ผู้ส่ง: แก้ไขและส่งใหม่ */}
                                                    {canRevise(sub) && (
                                                        <button
                                                            className="doc-action-btn"
                                                            title="แก้ไขและส่งใหม่"
                                                            style={{ background: '#fef3c7', color: '#d97706' }}
                                                            onClick={() => setRevisionEditSub(sub)}
                                                        >
                                                            <RefreshCw size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* แสดงเหตุผลที่ต้องแก้ไข */}
                                                {sub.overall_status === 'ส่งกลับแก้ไข' && sub.revision_comment && (
                                                    <div style={{ fontSize: '11px', color: '#d97706', marginTop: '4px', textAlign: 'left', maxWidth: '200px' }}>
                                                        💬 {sub.revision_comment}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {filteredSubs.length === 0 && (
                                    <tr>
                                        <td colSpan={showActionsColumn ? 9 : 8} className="doc-empty-row">
                                            {loading ? 'กำลังโหลด...' : 'ยังไม่มีรายการเอกสารที่ส่ง'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ── PDF Preview Modal ── */}
            {previewUrl && previewDoc && (
                <div className="pdf-preview-overlay" onClick={closePreview} style={{ zIndex: 10000 }}>
                    <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pdf-preview-header">
                            <h3 style={{ margin: 0, fontSize: '15px' }}>เอกสาร: {previewDoc.form_code} — ส่งโดย {previewDoc.submitted_by_name}</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <a href={previewUrl} download={`${previewDoc.form_code}_submission_${previewDoc.submission_id}.pdf`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 14px', textDecoration: 'none' }}>
                                    <Download size={14} />
                                    ดาวน์โหลด
                                </a>
                                <button onClick={closePreview} className="doc-action-btn" style={{ width: '32px', height: '32px', background: '#fee2e2', color: '#dc2626', borderRadius: '6px' }}>
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <iframe src={previewUrl} className="pdf-preview-iframe" title="PDF Preview" />
                    </div>
                </div>
            )}

            {/* ── Action Modal (Approve / Reject / Request Revision) ── */}
            {actionModal && (
                <div className="pdf-preview-overlay" onClick={() => setActionModal(null)}>
                    <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', height: 'auto', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: getActionColor() }}>
                            {getActionTitle()}
                        </h3>
                        <div className="form-field" style={{ marginBottom: '16px' }}>
                            <label>
                                {actionModal.action === 'request-revision' ? (
                                    <>เหตุผลที่ต้องแก้ไข <span style={{ color: '#ef4444' }}>*</span></>
                                ) : (
                                    'ความเห็น (ถ้ามี)'
                                )}
                            </label>
                            <textarea
                                rows={3}
                                value={actionComment}
                                onChange={(e) => setActionComment(e.target.value)}
                                placeholder={
                                    actionModal.action === 'approve' ? 'ความเห็นเพิ่มเติม...' :
                                        actionModal.action === 'reject' ? 'ระบุเหตุผลที่ไม่อนุมัติ...' :
                                            'ระบุส่วนที่ต้องแก้ไข เช่น ข้อมูลแผนกไม่ถูกต้อง, ต้องเพิ่มสิทธิ์...'
                                }
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => { setActionModal(null); setActionComment(''); }}
                                style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={actionLoading}
                                style={{
                                    padding: '8px 20px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    background: getActionColor(),
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    opacity: actionLoading ? 0.7 : 1,
                                }}
                            >
                                {getActionBtnText()}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── History Modal ── */}
            {historyModal && (
                <div className="pdf-preview-overlay" onClick={() => setHistoryModal(null)}>
                    <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', height: 'auto', padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <History size={18} /> ประวัติการแก้ไข
                            </h3>
                            <button onClick={() => setHistoryModal(null)} className="doc-action-btn" style={{ width: '30px', height: '30px', background: '#f1f5f9', borderRadius: '6px' }}>
                                <X size={16} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {historyModal.map((item, i) => (
                                <div key={item.submission_id} style={{
                                    padding: '14px 16px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    background: i === historyModal.length - 1 ? '#f0fdf4' : 'var(--bg)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 600, fontSize: '13px' }}>
                                                {item.revision_number === 0 ? 'ต้นฉบับ' : `Rev.${item.revision_number}`}
                                            </span>
                                            <span className={`badge ${getBadgeClass(item.overall_status)}`} style={{ fontSize: '10px' }}>
                                                {item.overall_status}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                #{item.submission_id}
                                            </span>
                                            <button
                                                className="doc-action-btn"
                                                title="ดูเอกสาร"
                                                style={{ background: '#e0f2fe', color: '#0284c7', width: '24px', height: '24px' }}
                                                onClick={() => handlePreviewSubmission(item)}
                                                disabled={previewLoadingId === item.submission_id}
                                            >
                                                {previewLoadingId === item.submission_id ? (
                                                    <Loader size={12} className="spin-animation" />
                                                ) : (
                                                    <Eye size={12} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        ส่งโดย {item.submitted_by_name} — {formatDate(item.submitted_at)}
                                    </div>
                                    {item.revision_comment && (
                                        <div style={{ fontSize: '11px', color: '#d97706', marginTop: '6px', padding: '6px 10px', background: '#fef3c7', borderRadius: '4px' }}>
                                            💬 เหตุผลแก้ไข: {item.revision_comment}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// RevisionFormPage — หน้าแก้ไขและส่งเอกสารใหม่
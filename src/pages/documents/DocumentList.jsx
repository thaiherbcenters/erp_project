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

export default function DocumentList({ hasPermission, documents, standards, isLoading, error }) {
    if (!hasPermission('document_list_search'))
        return <div className="doc-no-access">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>;

    const { currentUser } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterPart, setFilterPart] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStandard, setFilterStandard] = useState('all');
    const [showPartDropdown, setShowPartDropdown] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showStandardDropdown, setShowStandardDropdown] = useState(false);

    // Upload state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [customFileName, setCustomFileName] = useState('');
    const [uploadDocCode, setUploadDocCode] = useState('');
    const [uploadDocName, setUploadDocName] = useState('');
    const [uploadCategory, setUploadCategory] = useState('');
    const [uploadTypeTag, setUploadTypeTag] = useState('Manual');
    const [uploadStandard, setUploadStandard] = useState('');
    const [uploadRevision, setUploadRevision] = useState('00');
    const [uploadEffectiveDate, setUploadEffectiveDate] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const fileInputRef = useRef(null);

    if (isLoading) {
        return <div className="doc-no-access">กำลังโหลดข้อมูลเอกสาร...</div>;
    }

    if (error) {
        return <div className="doc-no-access">เกิดข้อผิดพลาดในการโหลดข้อมูลเอกสาร: {error}</div>;
    }

    const filteredDocs = documents.filter(doc => {
        const matchSearch =
            doc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = filterType === 'all' || doc.typeTag === filterType;
        const docCategory = DOCUMENT_CATEGORIES.find(c => c.id === doc.category);
        const matchPart = filterPart === 'all' || (docCategory && docCategory.partId === filterPart);
        const matchCategory = filterCategory === 'all' || doc.category === filterCategory;
        const matchStandard = filterStandard === 'all' || (doc.standard && doc.standard.includes(filterStandard));
        return matchSearch && matchType && matchPart && matchCategory && matchStandard;
    });

    // คำนวณประเภทเอกสารที่มีในหมวด/ส่วน นั้นๆ
    const availableDocsForTypeFilter = documents.filter(doc => {
        const docCategory = DOCUMENT_CATEGORIES.find(c => c.id === doc.category);
        const matchPart = filterPart === 'all' || (docCategory && docCategory.partId === filterPart);
        const matchCategory = filterCategory === 'all' || doc.category === filterCategory;
        return matchPart && matchCategory;
    });

    const docTypes = ['all', ...new Set(availableDocsForTypeFilter.map(d => d.typeTag))];
    const availableStandards =
        standards && standards.length > 0
            ? standards
            : [...new Set(documents.map(d => d.standard).filter(Boolean))];

    return (
        <div className="doc-fade-in">
            {/* ── Top Bar ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '20px' }}>

                {/* ── Left Side (Search & Upload) ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div className="search-group" style={{ maxWidth: '400px', margin: 0, flex: 1 }}>
                            <div className="search-input-wrap">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="ค้นหารหัส หรือ ชื่อเอกสาร..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button className="search-btn">ค้นหา</button>
                        </div>
                        <button
                            className="doc-upload-btn"
                            onClick={() => {
                                setShowUploadModal(true);
                                setUploadResult(null);
                            }}
                            title="อัปโหลดเอกสาร"
                        >
                            <UploadCloud size={17} />
                            <span>อัปโหลดเอกสาร</span>
                        </button>
                    </div>
                </div>

                {/* ── Right Side (Filters) ── */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 2, minWidth: '450px' }}>

                    {/* 1. Part Filter Dropdown */}
                    <div className="doc-category-filter" style={{ marginBottom: 0, padding: 0, border: 'none', background: 'transparent', flex: 1, maxWidth: '220px' }}>
                        <div className="doc-dropdown-wrapper" style={{ width: '100%', maxWidth: '100%' }}>
                            <button
                                style={{ width: '100%' }}
                                className={`doc-dropdown-trigger ${showPartDropdown ? 'open' : ''}`}
                                onClick={() => {
                                    setShowPartDropdown(!showPartDropdown);
                                    setShowCategoryDropdown(false);
                                }}
                            >
                                <span className="doc-dropdown-text">
                                    {filterPart === 'all' ? (
                                        <>
                                            <span className="doc-dropdown-icon">📁</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>ส่วน:</span> ทุกส่วน
                                        </>
                                    ) : (
                                        <>
                                            <span className="doc-dropdown-icon">📂</span>
                                            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                ส่วน: {DOCUMENT_PARTS.find(p => p.id === filterPart)?.name.split(':')[0]}
                                            </span>
                                        </>
                                    )}
                                </span>
                                <ChevronDown size={16} className={`doc-dropdown-arrow ${showPartDropdown ? 'rotated' : ''}`} />
                            </button>

                            {showPartDropdown && (
                                <>
                                    <div className="doc-dropdown-backdrop" onClick={() => setShowPartDropdown(false)} />
                                    <div className="doc-dropdown-menu">
                                        <div className="doc-dropdown-header">เลือกส่วนของเอกสาร</div>
                                        <div
                                            className={`doc-dropdown-item ${filterPart === 'all' ? 'active' : ''}`}
                                            onClick={() => { setFilterPart('all'); setFilterCategory('all'); setFilterType('all'); setShowPartDropdown(false); }}
                                        >
                                            <span className="doc-dropdown-item-icon">📁</span>
                                            <span className="doc-dropdown-item-name">ทุกส่วน</span>
                                        </div>
                                        <div className="doc-dropdown-divider" />
                                        {DOCUMENT_PARTS.map((part) => (
                                            <div
                                                key={part.id}
                                                className={`doc-dropdown-item ${filterPart === part.id ? 'active' : ''}`}
                                                onClick={() => { setFilterPart(part.id); setFilterCategory('all'); setFilterType('all'); setShowPartDropdown(false); }}
                                            >
                                                <span className="doc-dropdown-item-icon">📄</span>
                                                <div className="doc-dropdown-item-info">
                                                    <span className="doc-dropdown-item-name">{part.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 2. Category Filter (Custom Dropdown) ── */}
                    <div className="doc-category-filter" style={{ marginBottom: 0, padding: 0, border: 'none', background: 'transparent', flex: 1, maxWidth: '240px' }}>
                        <div className="doc-dropdown-wrapper" style={{ width: '100%', maxWidth: '100%' }}>
                            <button
                                style={{ width: '100%' }}
                                className={`doc-dropdown-trigger ${showCategoryDropdown ? 'open' : ''}`}
                                onClick={() => {
                                    setShowCategoryDropdown(!showCategoryDropdown);
                                    setShowPartDropdown(false);
                                    setFilterType('all');
                                }}
                            >
                                <span className="doc-dropdown-text">
                                    {filterCategory === 'all' ? (
                                        <>
                                            <span className="doc-dropdown-icon">📁</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>หมวด:</span> ทุกหมวด
                                            {filterPart === 'all' && <span className="doc-dropdown-count">{documents.length}</span>}
                                        </>
                                    ) : (
                                        <>
                                            <span className="doc-dropdown-icon">📂</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>หมวด:</span> {getCategoryShortName(filterCategory)}
                                            <span className="doc-dropdown-count">
                                                {documents.filter(d => d.category === filterCategory).length}
                                            </span>
                                        </>
                                    )}
                                </span>
                                <ChevronDown size={16} className={`doc-dropdown-arrow ${showCategoryDropdown ? 'rotated' : ''}`} />
                            </button>

                            {showCategoryDropdown && (
                                <>
                                    <div className="doc-dropdown-backdrop" onClick={() => setShowCategoryDropdown(false)} />
                                    <div className="doc-dropdown-menu">
                                        <div className="doc-dropdown-header">เลือกหมวดเอกสาร</div>
                                        <div
                                            className={`doc-dropdown-item ${filterCategory === 'all' ? 'active' : ''}`}
                                            onClick={() => { setFilterCategory('all'); setFilterType('all'); setShowCategoryDropdown(false); }}
                                        >
                                            <span className="doc-dropdown-item-icon">📁</span>
                                            <span className="doc-dropdown-item-name">ทุกหมวด</span>
                                            {filterPart === 'all' && <span className="doc-dropdown-item-count">{documents.length}</span>}
                                        </div>
                                        <div className="doc-dropdown-divider" />
                                        {DOCUMENT_CATEGORIES
                                            .filter(cat => filterPart === 'all' || cat.partId === filterPart)
                                            .filter(cat => documents.some(d => d.category === cat.id))
                                            .map((cat) => {
                                                const count = documents.filter(d => d.category === cat.id).length;
                                                return (
                                                    <div
                                                        key={cat.id}
                                                        className={`doc-dropdown-item ${filterCategory === cat.id ? 'active' : ''}`}
                                                        onClick={() => { setFilterCategory(cat.id); setFilterType('all'); setShowCategoryDropdown(false); }}
                                                    >
                                                        <span className="doc-dropdown-item-icon">📄</span>
                                                        <div className="doc-dropdown-item-info">
                                                            <span className="doc-dropdown-item-name">{cat.shortName}</span>
                                                            <span className="doc-dropdown-item-full">{cat.name}</span>
                                                        </div>
                                                        <span className="doc-dropdown-item-count">{count}</span>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 3. Standard Filter (Custom Dropdown) ── */}
                    <div className="doc-category-filter" style={{ marginBottom: 0, padding: 0, border: 'none', background: 'transparent', flex: 1, maxWidth: '240px' }}>
                        <div className="doc-dropdown-wrapper" style={{ width: '100%', maxWidth: '100%' }}>
                            <button
                                style={{ width: '100%' }}
                                className={`doc-dropdown-trigger ${showStandardDropdown ? 'open' : ''}`}
                                onClick={() => {
                                    setShowStandardDropdown(!showStandardDropdown);
                                    setShowCategoryDropdown(false);
                                    setShowPartDropdown(false);
                                    setFilterType('all');
                                }}
                            >
                                <span className="doc-dropdown-text">
                                    {filterStandard === 'all' ? (
                                        <>
                                            <span className="doc-dropdown-icon">🔖</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>มาตรฐาน:</span> ทั้งหมด
                                        </>
                                    ) : (
                                        <>
                                            <span className="doc-dropdown-icon">🔖</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>มาตรฐาน:</span> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filterStandard}</span>
                                        </>
                                    )}
                                </span>
                                <ChevronDown size={16} className={`doc-dropdown-arrow ${showStandardDropdown ? 'rotated' : ''}`} />
                            </button>

                            {showStandardDropdown && (
                                <>
                                    <div className="doc-dropdown-backdrop" onClick={() => setShowStandardDropdown(false)} />
                                    <div className="doc-dropdown-menu">
                                        <div className="doc-dropdown-header">เลือกมาตรฐานที่เกี่ยวข้อง</div>
                                        <div
                                            className={`doc-dropdown-item ${filterStandard === 'all' ? 'active' : ''}`}
                                            onClick={() => { setFilterStandard('all'); setFilterType('all'); setShowStandardDropdown(false); }}
                                        >
                                            <span className="doc-dropdown-item-icon">🔖</span>
                                            <span className="doc-dropdown-item-name">ทุกมาตรฐาน</span>
                                        </div>
                                        <div className="doc-dropdown-divider" />
                                        {availableStandards.map((std) => (
                                            <div
                                                key={std}
                                                className={`doc-dropdown-item ${filterStandard === std ? 'active' : ''}`}
                                                onClick={() => { setFilterStandard(std); setFilterType('all'); setShowStandardDropdown(false); }}
                                            >
                                                <span className="doc-dropdown-item-icon">🔖</span>
                                                <div className="doc-dropdown-item-info">
                                                    <span className="doc-dropdown-item-name">{std}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Count Info + Type Filter Row ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div className="doc-result-info" style={{ marginBottom: 0 }}>
                    แสดง <strong>{filteredDocs.length}</strong> จาก <strong>{documents.length}</strong> รายการ
                    {(filterCategory !== 'all' || filterStandard !== 'all') && (
                        <span className="doc-active-filter">
                            {filterCategory !== 'all' && `หมวด: ${getCategoryShortName(filterCategory)} `}
                            {filterStandard !== 'all' && `มาตรฐาน: ${filterStandard}`}
                            <button className="doc-clear-filter" onClick={() => { setFilterCategory('all'); setFilterType('all'); setFilterStandard('all'); }}>✕</button>
                        </span>
                    )}
                </div>

                {/* ── Type Filter Buttons ── */}
                <div className="doc-filter-group" style={{ justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                    {docTypes.map((type) => (
                        <button
                            key={type}
                            className={`btn-sm ${filterType === type ? 'doc-filter-active' : ''}`}
                            onClick={() => setFilterType(type)}
                            style={{ borderRadius: '50px', padding: '4px 14px', fontSize: '12.5px' }}
                        >
                            {type === 'all' ? 'ทั้งหมด' : type}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Table ── */}
            {hasPermission('document_list_table') && (
                <div className="card table-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>รหัสเอกสาร</th>
                                <th>ชื่อเอกสาร</th>
                                <th>ประเภท</th>
                                <th>หมวด</th>
                                <th>มาตรฐาน</th>
                                <th style={{ textAlign: 'center' }}>Rev.</th>
                                <th>วันที่บังคับใช้</th>
                                <th>สถานะ</th>
                                <th style={{ textAlign: 'center' }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocs.map((doc) => (
                                <tr key={doc.id}>
                                    <td className="text-bold">{doc.id}</td>
                                    <td>{doc.name}</td>
                                    <td><span className="badge badge-info">{doc.typeTag}</span></td>
                                    <td>
                                        <span className="doc-cat-tag" title={getCategoryName(doc.category)}>
                                            {getCategoryShortName(doc.category)}
                                        </span>
                                    </td>
                                    <td>{doc.standard || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{doc.revision}</td>
                                    <td>{formatDate(doc.date)}</td>
                                    <td>
                                        <span className={`badge ${doc.status === 'ใช้งาน' ? 'badge-success' : 'badge-danger'}`}>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                            <button
                                                className="doc-action-btn"
                                                title="ดูเอกสาร"
                                                onClick={() => {
                                                    window.open(`${API_BASE}/documents/view/${doc.id}`, '_blank');
                                                }}
                                            >
                                                <Eye size={15} />
                                            </button>
                                            <button
                                                className="doc-action-btn"
                                                title="ดาวน์โหลด"
                                                onClick={() => {
                                                    window.location.href = `${API_BASE}/documents/download/${doc.id}`;
                                                }}
                                            >
                                                <Download size={15} />
                                            </button>
                                            <button
                                                className="doc-action-btn doc-action-btn-danger"
                                                title="ลบเอกสาร"
                                                onClick={async () => {
                                                    const ok = await showConfirm('ยืนยันการลบ', `ต้องการลบเอกสาร "${doc.id} - ${doc.name}" หรือไม่?\n\nการลบจะลบทั้งข้อมูลในระบบและไฟล์เอกสารจริง`, 'warning');
                                                    if (!ok) return;
                                                    try {
                                                        const res = await fetch(`${API_BASE}/documents/${doc.id}?user=${currentUser?.username || 'Unknown'}`, { method: 'DELETE' });
                                                        const data = await res.json();
                                                        if (!res.ok) throw new Error(data.message || 'ลบไม่สำเร็จ');
                                                        showAlert('สำเร็จ', 'ลบเอกสารสำเร็จ', 'success');
                                                        window.location.reload();
                                                    } catch (err) {
                                                        showAlert('เกิดข้อผิดพลาด', `เกิดข้อผิดพลาด: ${err.message}`, 'error');
                                                    }
                                                }}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredDocs.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="doc-empty-row">ไม่พบข้อมูลเอกสารที่ค้นหา</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* ── Upload Document Modal ── */}
            {/* ══════════════════════════════════════════════════════════ */}
            {showUploadModal && (
                <div className="doc-upload-overlay" onClick={() => { if (!isUploading) { setShowUploadModal(false); setUploadFile(null); setCustomFileName(''); setUploadResult(null); } }}>
                    <div className="doc-upload-modal" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="doc-upload-modal-header">
                            <h3>
                                <div style={{ background: '#e0e7ff', padding: '7px', borderRadius: '8px', display: 'flex', color: '#4f46e5' }}>
                                    <UploadCloud size={18} />
                                </div>
                                อัปโหลดเอกสาร
                            </h3>
                            <button
                                className="doc-upload-modal-close"
                                onClick={() => { if (!isUploading) { setShowUploadModal(false); setUploadFile(null); setCustomFileName(''); setUploadResult(null); } }}
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        {/* Success Message */}
                        {uploadResult && uploadResult.success && (
                            <div className="doc-upload-success">
                                <CheckCircle size={20} />
                                <span>{uploadResult.message}</span>
                            </div>
                        )}

                        {/* Error Message */}
                        {uploadResult && !uploadResult.success && (
                            <div className="doc-upload-error">
                                <AlertCircle size={20} />
                                <span>{uploadResult.message}</span>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!uploadFile || !uploadDocCode || !uploadDocName || !uploadCategory) {
                                setUploadResult({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
                                return;
                            }
                            setIsUploading(true);
                            setUploadResult(null);
                            try {
                                const formData = new FormData();
                                // ⚠️ ต้อง append text fields ก่อน file — multer อ่าน req.body ตามลำดับ
                                formData.append('doc_code', uploadDocCode);
                                formData.append('doc_name', uploadDocName);
                                formData.append('category', uploadCategory);
                                formData.append('typeTag', uploadTypeTag);
                                formData.append('revision', uploadRevision || '00');
                                formData.append('status', 'ใช้งาน');
                                if (uploadStandard.trim()) {
                                    formData.append('standard', uploadStandard.trim());
                                }
                                if (uploadEffectiveDate) {
                                    formData.append('effective_date', uploadEffectiveDate);
                                }
                                if (customFileName.trim()) {
                                    formData.append('custom_filename', customFileName.trim());
                                }
                                // file ต้องอยู่สุดท้าย เพื่อให้ multer อ่าน fields ข้างบนก่อน
                                formData.append('file', uploadFile);

                                const res = await fetch(`${API_BASE}/documents/upload`, {
                                    method: 'POST',
                                    body: formData,
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.message || 'การอัปโหลดล้มเหลว');

                                setUploadResult({ success: true, message: `อัปโหลดเอกสาร "${uploadDocName}" สำเร็จ!` });
                                // Reset form after success
                                setTimeout(() => {
                                    setUploadFile(null);
                                    setCustomFileName('');
                                    setUploadDocCode('');
                                    setUploadDocName('');
                                    setUploadCategory('');
                                    setUploadTypeTag('Manual');
                                    setUploadStandard('');
                                    setUploadRevision('00');
                                    setUploadEffectiveDate('');
                                    // Reload page to refresh document list
                                    window.location.reload();
                                }, 1500);
                            } catch (err) {
                                setUploadResult({ success: false, message: err.message });
                            } finally {
                                setIsUploading(false);
                            }
                        }}>
                            <div className="doc-upload-modal-body">
                                {/* File Dropzone */}
                                <div className="doc-upload-form-group">
                                    <label className="doc-upload-label">เลือกไฟล์ <span className="required">*</span></label>
                                    <div
                                        className={`doc-upload-dropzone ${uploadFile ? 'has-file' : ''}`}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                    const file = e.target.files[0];
                                                    setUploadFile(file);
                                                    // Auto-set custom filename from original file if empty
                                                    if (!customFileName) {
                                                        const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
                                                        setCustomFileName(nameWithoutExt);
                                                    }
                                                }
                                            }}
                                            style={{ display: 'none' }}
                                        />
                                        {!uploadFile ? (
                                            <>
                                                <UploadCloud className="doc-upload-dropzone-icon" size={36} />
                                                <div className="doc-upload-dropzone-text">คลิกเพื่อเลือกไฟล์ หรือลากมาวาง</div>
                                                <div className="doc-upload-dropzone-sub">PDF, Word, Excel, รูปภาพ ฯลฯ</div>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="doc-upload-dropzone-icon" size={36} />
                                                <div className="doc-upload-dropzone-text" style={{ color: '#059669' }}>
                                                    {uploadFile.name}
                                                </div>
                                                <div className="doc-upload-dropzone-sub">
                                                    {(uploadFile.size / 1024).toFixed(1)} KB • คลิกเพื่อเปลี่ยน
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Custom Filename */}
                                <div className="doc-upload-form-group">
                                    <label className="doc-upload-label">
                                        <Edit2 size={13} style={{ marginRight: '5px' }} />
                                        ตั้งชื่อไฟล์ใหม่ (ถ้าต้องการ)
                                    </label>
                                    <input
                                        className="doc-upload-input"
                                        type="text"
                                        placeholder="เช่น คู่มือ-ISO-9001-Rev02"
                                        value={customFileName}
                                        onChange={(e) => setCustomFileName(e.target.value)}
                                    />
                                    <span className="doc-upload-hint">ระบบจะเพิ่มนามสกุลไฟล์ให้อัตโนมัติ • ไฟล์เก็บที่ E:\Documents</span>
                                </div>

                                {/* Doc Code & Doc Name */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                                    <div className="doc-upload-form-group">
                                        <label className="doc-upload-label">รหัสเอกสาร <span className="required">*</span></label>
                                        <input
                                            className="doc-upload-input"
                                            type="text"
                                            placeholder="เช่น IMS-MN-01"
                                            value={uploadDocCode}
                                            onChange={(e) => setUploadDocCode(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="doc-upload-form-group">
                                        <label className="doc-upload-label">ชื่อเอกสาร <span className="required">*</span></label>
                                        <input
                                            className="doc-upload-input"
                                            type="text"
                                            placeholder="เช่น คู่มือระบบบริหารบูรณาการ"
                                            value={uploadDocName}
                                            onChange={(e) => setUploadDocName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Category & Type */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div className="doc-upload-form-group">
                                        <label className="doc-upload-label">หมวดเอกสาร <span className="required">*</span></label>
                                        <select
                                            className="doc-upload-input"
                                            value={uploadCategory}
                                            onChange={(e) => setUploadCategory(e.target.value)}
                                            required
                                        >
                                            <option value="">-- เลือกหมวด --</option>
                                            {DOCUMENT_CATEGORIES.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.shortName} — {cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="doc-upload-form-group">
                                        <label className="doc-upload-label">ประเภทเอกสาร</label>
                                        <select
                                            className="doc-upload-input"
                                            value={uploadTypeTag}
                                            onChange={(e) => setUploadTypeTag(e.target.value)}
                                        >
                                            <option value="Manual">Manual</option>
                                            <option value="SOP">SOP</option>
                                            <option value="WI">WI</option>
                                            <option value="Form">Form</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Standard, Rev, Effective Date */}
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px' }}>
                                    <div className="doc-upload-form-group">
                                        <label className="doc-upload-label">มาตรฐาน</label>
                                        <select
                                            className="doc-upload-input"
                                            value={uploadStandard}
                                            onChange={(e) => setUploadStandard(e.target.value)}
                                        >
                                            <option value="">-- เลือกมาตรฐาน --</option>
                                            {availableStandards.map(std => (
                                                <option key={std} value={std}>{std}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="doc-upload-form-group">
                                        <label className="doc-upload-label">Rev.</label>
                                        <input
                                            className="doc-upload-input"
                                            type="text"
                                            placeholder="00"
                                            value={uploadRevision}
                                            onChange={(e) => setUploadRevision(e.target.value)}
                                        />
                                    </div>
                                    <div className="doc-upload-form-group">
                                        <label className="doc-upload-label">วันที่บังคับใช้</label>
                                        <input
                                            className="doc-upload-input"
                                            type="date"
                                            value={uploadEffectiveDate}
                                            onChange={(e) => setUploadEffectiveDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="doc-upload-modal-footer">
                                <button
                                    type="button"
                                    className="doc-upload-btn-ghost"
                                    onClick={() => { if (!isUploading) { setShowUploadModal(false); setUploadFile(null); setCustomFileName(''); setUploadResult(null); } }}
                                    disabled={isUploading}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="doc-upload-btn-primary"
                                    disabled={isUploading || !uploadFile || !uploadDocCode || !uploadDocName || !uploadCategory}
                                >
                                    {isUploading ? (
                                        <><Loader size={16} className="spin" /> กำลังอัปโหลด...</>
                                    ) : (
                                        <><UploadCloud size={16} /> อัปโหลด</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Sub-page 2.5: Form Document List (แบบฟอร์มเอกสาร)
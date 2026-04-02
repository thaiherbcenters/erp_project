/**
 * =============================================================================
 * DocumentControl.jsx — หน้าควบคุมเอกสาร (Document Control)
 * =============================================================================
 *
 * ฟีเจอร์:
 *   1. Dashboard — สถิติภาพรวมเอกสาร + เอกสารอัปเดตล่าสุด
 *   2. Master List — รายการเอกสารทั้งหมดพร้อมค้นหา + กรองตามหมวด/ประเภท
 *   3. DAR — ใบคำร้องเอกสาร (Document Action Request)
 *
 * หมวดเอกสาร 15 หมวด ตามโครงสร้างจริงของบริษัท
 * =============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FileText,
    FileCog,
    Files,
    FilePlus,
    FileCheck,
    FileX,
    Search,
    Filter,
    Plus,
    Download,
    Eye,
    Edit2,
    Clock,
    TrendingUp,
    AlertCircle,
    ChevronDown,
    ClipboardEdit,
    ArrowLeft,
    Save,
    Printer,
    X,
    Send,
    XCircle,
    Loader,
    CheckCircle,
    FolderOpen,
    RotateCcw,
    History,
    RefreshCw,
    UploadCloud,
} from 'lucide-react';
import './PageCommon.css';
import './DocumentControl.css';
import { DOCUMENT_PARTS, DOCUMENT_CATEGORIES, DOCUMENTS } from './documentData';
import DocumentLibrary from './DocumentLibrary';
import CustomerDocument from './CustomerDocument';
import API_BASE from '../config';


/** Helper: ดึงชื่อย่อหมวดจาก category id */
const getCategoryShortName = (catId) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.shortName : catId;
};

/** Helper: ดึงชื่อเต็มหมวดจาก category id */
const getCategoryName = (catId) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.name : catId;
};

// =============================================================================
// Shared Utilities
// =============================================================================
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// =============================================================================
// Error Boundary — จับ error ที่เกิดในหน้าย่อย
// =============================================================================
class DocErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, info) { console.error('[DocumentControl] Render Error:', error, info); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', color: '#dc2626', background: '#fff5f5', borderRadius: '12px', margin: '20px' }}>
                    <h3>⚠️ เกิดข้อผิดพลาดในการแสดงผลหน้านี้</h3>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>{this.state.error?.message}</pre>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px', color: '#666' }}>{this.state.error?.stack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

// =============================================================================
// Main Component
// =============================================================================
export default function DocumentControl() {
    const { hasSectionPermission, getVisibleSubPages, currentUser, getUserPermissions } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [documents, setDocuments] = useState([]);
    const [standards, setStandards] = useState([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(true);
    const [docError, setDocError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoadingDocs(true);
            setDocError(null);
            try {
                // Find Data Scope for this page ('document_control')
                let dataScope = 'all';
                let userId = '';
                let department = '';

                if (currentUser) {
                    userId = currentUser.id;
                    department = currentUser.department || '';
                    const perms = getUserPermissions(currentUser.id);
                    // Check sub-page 'document_list' first, then parent 'document', then legacy 'document_control'
                    const docPerm = perms.find(p => p.page_id === 'document_list')
                        || perms.find(p => p.page_id === 'document')
                        || perms.find(p => p.page_id === 'document_control');
                    if (docPerm && docPerm.data_scope) {
                        dataScope = docPerm.data_scope;
                    }
                }

                console.log('[DocumentControl] data_scope:', dataScope, '| department:', department, '| userId:', userId);

                const queryParams = new URLSearchParams({
                    user_id: userId,
                    data_scope: dataScope,
                    department: department
                }).toString();

                const [docRes, stdRes] = await Promise.all([
                    fetch(`${API_BASE}/documents?${queryParams}`),
                    fetch(`${API_BASE}/documents/standards`),
                ]);
                if (!docRes.ok) throw new Error('ไม่สามารถดึงข้อมูลเอกสารได้');
                const docsJson = await docRes.json();
                const stdJson = stdRes.ok ? await stdRes.json() : [];
                if (!cancelled) {
                    setDocuments(Array.isArray(docsJson) ? docsJson : []);
                    setStandards(Array.isArray(stdJson) ? stdJson.map(s => s.standard_code) : []);
                }
            } catch (err) {
                console.error('Error loading documents:', err);
                if (!cancelled) setDocError(err.message || 'โหลดข้อมูลเอกสารไม่สำเร็จ');
            } finally {
                if (!cancelled) setIsLoadingDocs(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [currentUser, getUserPermissions]);

    const queryParams = new URLSearchParams(location.search);
    // ถ้าไม่ได้ระบุ tab ให้ใช้ sub-page แรกที่ user มีสิทธิ์เข้าถึง
    const visibleSubs = getVisibleSubPages('document');
    const defaultTab = visibleSubs.length > 0 ? visibleSubs[0].id : 'document_dashboard';
    const activeTab = queryParams.get('tab') || defaultTab;

    const renderSubPage = () => {
        switch (activeTab) {
            case 'document_dashboard':
                return (
                    <DocumentDashboard
                        hasPermission={hasSectionPermission}
                        documents={documents}
                        isLoading={isLoadingDocs}
                        error={docError}
                    />
                );
            case 'document_list':
                return (
                    <DocumentList
                        hasPermission={hasSectionPermission}
                        documents={documents}
                        standards={standards}
                        isLoading={isLoadingDocs}
                        error={docError}
                    />
                );
            case 'document_forms':
                return (
                    <FormDocumentList
                        hasPermission={hasSectionPermission}
                        documents={documents}
                        standards={standards}
                        isLoading={isLoadingDocs}
                        error={docError}
                    />
                );
            case 'document_request':
                return <DocumentRequest hasPermission={hasSectionPermission} />;
            case 'document_library':
                return (
                    <DocumentLibrary
                        hasPermission={hasSectionPermission}
                        documents={documents}
                        isLoading={isLoadingDocs}
                        error={docError}
                    />
                );
            case 'document_customers':
                return <CustomerDocument hasPermission={hasSectionPermission} />;
            default:
                return <DocumentDashboard hasPermission={hasSectionPermission} />;
        }
    };

    return (
        <div className="page-content">
            {activeTab !== 'document_library' && (
                <div className="page-title">
                    <h1>ระบบควบคุมเอกสาร</h1>
                    <p>จัดการโครงสร้างเอกสาร ISO, SOP, WI, Form และใบคำร้องเอกสาร (DAR)</p>
                </div>
            )}
            <DocErrorBoundary key={activeTab}>
                {renderSubPage()}
            </DocErrorBoundary>
        </div>
    );
}

// =============================================================================
// Sub-page 1: Dashboard
// =============================================================================
function DocumentDashboard({ hasPermission, documents, isLoading, error }) {
    if (!hasPermission('document_dashboard_stats'))
        return <div className="doc-no-access">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>;

    const [darPendingCount, setDarPendingCount] = useState(0);
    useEffect(() => {
        fetch(`${API_BASE}/submissions`)
            .then(r => r.ok ? r.json() : [])
            .then(data => setDarPendingCount(data.filter(s => s.overall_status !== 'อนุมัติแล้ว' && s.overall_status !== 'ไม่อนุมัติ').length))
            .catch(() => { });
    }, []);

    if (isLoading) {
        return <div className="doc-no-access">กำลังโหลดข้อมูลเอกสาร...</div>;
    }

    if (error) {
        return <div className="doc-no-access">เกิดข้อผิดพลาดในการโหลดข้อมูลเอกสาร: {error}</div>;
    }

    const totalDocs = documents.length;
    const activeDocs = documents.filter(d => d.status === 'ใช้งาน').length;
    const cancelledDocs = documents.filter(d => d.status === 'ยกเลิก').length;

    return (
        <div className="doc-fade-in">
            {/* ── Stats Cards ── */}
            <div className="summary-row">
                <div className="summary-card card">
                    <div className="summary-icon" style={{ background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd' }}>
                        <Files size={20} />
                    </div>
                    <div>
                        <span className="summary-label">เอกสารทั้งหมด</span>
                        <span className="summary-value">{totalDocs}</span>
                    </div>
                </div>
                <div className="summary-card card">
                    <div className="summary-icon" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                        <FileCheck size={20} />
                    </div>
                    <div>
                        <span className="summary-label">กำลังใช้งาน</span>
                        <span className="summary-value">{activeDocs}</span>
                    </div>
                </div>
                <div className="summary-card card">
                    <div className="summary-icon" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                        <Clock size={20} />
                    </div>
                    <div>
                        <span className="summary-label">DAR รออนุมัติ</span>
                        <span className="summary-value">{darPendingCount}</span>
                    </div>
                </div>
                <div className="summary-card card">
                    <div className="summary-icon" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
                        <FileX size={20} />
                    </div>
                    <div>
                        <span className="summary-label">เอกสารยกเลิก</span>
                        <span className="summary-value">{cancelledDocs}</span>
                    </div>
                </div>
            </div>

            {/* ── Quick Info Cards ── */}
            <div className="doc-info-row">
                <div className="doc-info-card card">
                    <div className="doc-info-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                        <TrendingUp size={18} />
                    </div>
                    <div className="doc-info-content">
                        <span className="doc-info-title">หมวดเอกสารทั้งหมด</span>
                        <span className="doc-info-value">{DOCUMENT_CATEGORIES.length} หมวด</span>
                    </div>
                </div>
                <div className="doc-info-card card">
                    <div className="doc-info-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
                        <AlertCircle size={18} />
                    </div>
                    <div className="doc-info-content">
                        <span className="doc-info-title">เอกสารใกล้ครบกำหนดทบทวน</span>
                        <span className="doc-info-value">15 รายการ</span>
                    </div>
                </div>
                <div className="doc-info-card card">
                    <div className="doc-info-icon" style={{ background: '#dcfce7', color: '#166534' }}>
                        <FileCog size={18} />
                    </div>
                    <div className="doc-info-content">
                        <span className="doc-info-title">แก้ไขล่าสุด (Revision)</span>
                        <span className="doc-info-value">3 รายการ</span>
                    </div>
                </div>
            </div>

            {/* ── Recent Documents Table ── */}
            {hasPermission('document_dashboard_recent') && (
                <div className="card table-card">
                    <div className="doc-section-header">
                        <h3>เอกสารอัปเดตล่าสุด</h3>
                        <span className="doc-section-badge">5 รายการล่าสุด</span>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>รหัสเอกสาร</th>
                                <th>ชื่อเอกสาร</th>
                                <th>ประเภท</th>
                                <th>หมวด</th>
                                <th>Rev.</th>
                                <th>วันที่บังคับใช้</th>
                                <th>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.slice(0, 5).map((doc) => (
                                <tr key={doc.id}>
                                    <td className="text-bold">{doc.id}</td>
                                    <td>{doc.name}</td>
                                    <td><span className="badge badge-info">{doc.typeTag}</span></td>
                                    <td><span className="doc-cat-tag">{getCategoryShortName(doc.category)}</span></td>
                                    <td style={{ textAlign: 'center' }}>{doc.revision}</td>
                                    <td>{formatDate(doc.date)}</td>
                                    <td>
                                        <span className={`badge ${doc.status === 'ใช้งาน' ? 'badge-success' : 'badge-danger'}`}>
                                            {doc.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Sub-page 2: Document List (Master List)
// =============================================================================
function DocumentList({ hasPermission, documents, standards, isLoading, error }) {
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
                        <div className="search-box" style={{ maxWidth: '400px', margin: 0, flex: 1 }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="ค้นหารหัส หรือ ชื่อเอกสาร..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
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
                                formData.append('file', uploadFile);
                                formData.append('doc_code', uploadDocCode);
                                formData.append('doc_name', uploadDocName);
                                formData.append('category', uploadCategory);
                                formData.append('typeTag', uploadTypeTag);
                                formData.append('status', 'ใช้งาน');
                                if (customFileName.trim()) {
                                    formData.append('custom_filename', customFileName.trim());
                                }

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
// =============================================================================
function FormDocumentList({ hasPermission, documents, standards, isLoading, error }) {
    if (!hasPermission('document_forms_search'))
        return <div className="doc-no-access">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>;

    const [searchTerm, setSearchTerm] = useState('');
    const [filterPart, setFilterPart] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStandard, setFilterStandard] = useState('all');
    const [showPartDropdown, setShowPartDropdown] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showStandardDropdown, setShowStandardDropdown] = useState(false);
    const [selectedForm, setSelectedForm] = useState(null);

    if (isLoading) {
        return <div className="doc-no-access">กำลังโหลดข้อมูลเอกสาร...</div>;
    }

    if (error) {
        return <div className="doc-no-access">เกิดข้อผิดพลาดในการโหลดข้อมูลเอกสาร: {error}</div>;
    }

    // ถ้ามีฟอร์มที่ถูกเลือก ให้แสดงหน้ากรอกข้อมูล
    if (selectedForm) {
        return <FormFillPage doc={selectedForm} onBack={() => setSelectedForm(null)} />;
    }

    // กรองเฉพาะเอกสารประเภท Form เท่านั้น
    const FORM_DOCUMENTS = documents.filter(doc => doc.typeTag === 'Form');

    const filteredDocs = FORM_DOCUMENTS.filter(doc => {
        const matchSearch =
            doc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = filterCategory === 'all' || doc.category === filterCategory;
        const matchStandard = filterStandard === 'all' || (doc.standard && doc.standard.includes(filterStandard));
        return matchSearch && matchCategory && matchStandard;
    });

    // คำนวณหมวดที่มีแบบฟอร์มอยู่จริง (ไม่แสดงหมวดที่ไม่มี Form)
    const categoriesWithForms = DOCUMENT_CATEGORIES.filter(cat =>
        FORM_DOCUMENTS.some(doc => doc.category === cat.id)
    );

    const availableStandards =
        standards && standards.length > 0
            ? standards
            : [...new Set(FORM_DOCUMENTS.map(d => d.standard).filter(Boolean))];

    return (
        <div className="doc-fade-in">
            {/* ── Top Bar ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '20px' }}>

                {/* ── Left Side (Search & Info) ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                    <div className="search-box" style={{ maxWidth: '400px', margin: 0 }}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="ค้นหารหัส หรือ ชื่อแบบฟอร์ม..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* ── Count Info ── */}
                    <div className="doc-result-info" style={{ marginBottom: 0 }}>
                        แสดง <strong>{filteredDocs.length}</strong> จาก <strong>{FORM_DOCUMENTS.length}</strong> แบบฟอร์ม
                        {(filterCategory !== 'all' || filterStandard !== 'all') && (
                            <span className="doc-active-filter">
                                {filterCategory !== 'all' && <>หมวด: {getCategoryShortName(filterCategory)} </>}
                                {filterStandard !== 'all' && <>มาตรฐาน: {filterStandard}</>}
                                <button
                                    className="doc-clear-filter"
                                    onClick={() => {
                                        setFilterCategory('all');
                                        setFilterStandard('all');
                                    }}
                                >
                                    ✕
                                </button>
                            </span>
                        )}
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
                                    setShowStandardDropdown(false);
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
                                            onClick={() => { setFilterPart('all'); setFilterCategory('all'); setShowPartDropdown(false); }}
                                        >
                                            <span className="doc-dropdown-item-icon">📁</span>
                                            <span className="doc-dropdown-item-name">ทุกส่วน</span>
                                        </div>
                                        <div className="doc-dropdown-divider" />
                                        {DOCUMENT_PARTS.map((part) => (
                                            <div
                                                key={part.id}
                                                className={`doc-dropdown-item ${filterPart === part.id ? 'active' : ''}`}
                                                onClick={() => { setFilterPart(part.id); setFilterCategory('all'); setShowPartDropdown(false); }}
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
                                    setShowStandardDropdown(false);
                                }}
                            >
                                <span className="doc-dropdown-text">
                                    {filterCategory === 'all' ? (
                                        <>
                                            <span className="doc-dropdown-icon">📁</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>หมวด:</span> ทุกหมวด
                                            {filterPart === 'all' && <span className="doc-dropdown-count">{FORM_DOCUMENTS.length}</span>}
                                        </>
                                    ) : (
                                        <>
                                            <span className="doc-dropdown-icon">📂</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>หมวด:</span> {getCategoryShortName(filterCategory)}
                                            <span className="doc-dropdown-count">
                                                {FORM_DOCUMENTS.filter(d => d.category === filterCategory).length}
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
                                            onClick={() => { setFilterCategory('all'); setFilterStandard('all'); setShowCategoryDropdown(false); }}
                                        >
                                            <span className="doc-dropdown-item-icon">📁</span>
                                            <span className="doc-dropdown-item-name">ทุกหมวด</span>
                                            {filterPart === 'all' && <span className="doc-dropdown-count">{FORM_DOCUMENTS.length}</span>}
                                        </div>
                                        <div className="doc-dropdown-divider" />
                                        {categoriesWithForms
                                            .filter(cat => filterPart === 'all' || cat.partId === filterPart)
                                            .map((cat) => {
                                                const count = FORM_DOCUMENTS.filter(d => d.category === cat.id).length;
                                                return (
                                                    <div
                                                        key={cat.id}
                                                        className={`doc-dropdown-item ${filterCategory === cat.id ? 'active' : ''}`}
                                                        onClick={() => { setFilterCategory(cat.id); setFilterStandard('all'); setShowCategoryDropdown(false); }}
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
                                            <span style={{ color: 'var(--text-secondary)' }}>มาตรฐาน:</span>{' '}
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {filterStandard}
                                            </span>
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
                                            onClick={() => { setFilterStandard('all'); setShowStandardDropdown(false); }}
                                        >
                                            <span className="doc-dropdown-item-icon">🔖</span>
                                            <span className="doc-dropdown-item-name">ทุกมาตรฐาน</span>
                                        </div>
                                        <div className="doc-dropdown-divider" />
                                        {availableStandards.map((std) => (
                                            <div
                                                key={std}
                                                className={`doc-dropdown-item ${filterStandard === std ? 'active' : ''}`}
                                                onClick={() => { setFilterStandard(std); setShowStandardDropdown(false); }}
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

            {/* ── Table ── */}
            {hasPermission('document_forms_table') && (
                <div className="card table-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>รหัสแบบฟอร์ม</th>
                                <th>ชื่อแบบฟอร์ม</th>
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
                                                title="กรอกแบบฟอร์ม"
                                                onClick={() => setSelectedForm(doc)}
                                                style={{ color: '#0284c7' }}
                                            >
                                                <ClipboardEdit size={15} />
                                            </button>
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
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredDocs.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="doc-empty-row">ไม่พบแบบฟอร์มที่ค้นหา</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Sub-page 2.75: Form Fill Page (หน้ากรอกแบบฟอร์ม)
// =============================================================================
function FormFillPage({ doc, onBack }) {
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
                    <button onClick={onBack} className="doc-action-btn" style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} title="กลับ">
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
// =============================================================================
function DocumentRequest({ hasPermission }) {
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
// =============================================================================
function RevisionFormPage({ parentSub, onBack, currentUser, navigate }) {
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
                    <button onClick={onBack} className="doc-action-btn" style={{ width: '34px', height: '34px', borderRadius: '6px', background: 'var(--bg)', border: '1px solid var(--border)' }} title="กลับ">
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












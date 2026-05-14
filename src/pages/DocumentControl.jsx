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
import { useAlert } from '../components/CustomAlert';
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
    Trash2,
} from 'lucide-react';
import './PageCommon.css';
import './DocumentControl.css';
import { DOCUMENT_PARTS, DOCUMENT_CATEGORIES, DOCUMENTS } from './documentData';
import DocumentLibrary from './DocumentLibrary';
import CustomerDocument from './CustomerDocument';
import API_BASE from '../config';

// ── Extracted Sub-Pages ──
import DocumentDashboard from './documents/DocumentDashboard';
import DocumentList from './documents/DocumentList';
import FormDocumentList from './documents/FormDocumentList';
import DocumentRequest from './documents/DocumentRequest';


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
    const { showAlert, showConfirm } = useAlert();
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

    // ── กำหนดชื่อหน้าตาม Tab ที่เลือก ──
    const getPageTitle = () => {
        switch (activeTab) {
            case 'document_dashboard': return 'ภาพรวมระบบควบคุมเอกสาร';
            case 'document_list': return 'ทะเบียนเอกสาร (Document List)';
            case 'document_request': return 'ใบคำร้องเอกสาร (DAR)';
            case 'document_customers': return 'เอกสารลูกค้า (Customer Documents)';
            default: return 'ระบบควบคุมเอกสาร';
        }
    };

    const getPageDesc = () => {
        switch (activeTab) {
            case 'document_dashboard': return 'ภาพรวมสถานะเอกสารและใบคำร้องทั้งหมด';
            case 'document_list': return 'จัดการโครงสร้างเอกสาร ISO, SOP, WI, และ Form';
            case 'document_request': return 'ระบบร้องขอจัดทำ แก้ไข หรือยกเลิกเอกสาร';
            case 'document_customers': return 'จัดการเอกสารภายนอกและเอกสารจากลูกค้า';
            default: return 'จัดการโครงสร้างเอกสาร ISO, SOP, WI, Form และใบคำร้องเอกสาร (DAR)';
        }
    };

    return (
        <div className="page-container document-page page-enter">
            {activeTab !== 'document_library' && (
                <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                    <h1>{getPageTitle()}</h1>
                    <p>{getPageDesc()}</p>
                </div>
            )}
            <DocErrorBoundary key={activeTab}>
                {renderSubPage()}
            </DocErrorBoundary>
        </div>
    );
}

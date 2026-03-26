import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    UploadCloud, Trash2, Download, Eye, FileText,
    Search, Loader, CheckCircle, XCircle, FilePlus,
    FileSpreadsheet, Image as ImageIcon, File,
    FolderPlus, Folder, FolderOpen, ChevronRight,
    MoreVertical, Edit3, Grid, List, Home,
    ArrowLeft, Info
} from 'lucide-react';
import './DocumentLibrary.css';
import API_BASE from '../config';


export default function DocumentLibrary({ hasPermission }) {
    if (!hasPermission('document_library_table'))
        return <div className="doc-no-access">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>;

    const { currentUser, getUserPermissions } = useAuth();

    // Navigation state
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [breadcrumb, setBreadcrumb] = useState([]);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    // Data state
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [renameTarget, setRenameTarget] = useState(null);

    // Upload state
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadDesc, setUploadDesc] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // New folder state
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    // Rename state
    const [renameName, setRenameName] = useState('');

    // Context menu state
    const [contextMenu, setContextMenu] = useState(null);

    // =========================================================================
    // Data Fetching
    // =========================================================================
    const fetchContents = useCallback(async (folderId) => {
        setIsLoading(true);
        try {
            // Find Data Scope for document_library
            let dataScope = 'all';
            let userId = '';
            let department = '';

            if (currentUser) {
                userId = currentUser.id;
                department = currentUser.department || '';
                const perms = getUserPermissions(currentUser.id);
                // Check sub-page 'document_library' first, then parent 'document', then legacy 'document_control'
                const libPerm = perms.find(p => p.page_id === 'document_library');
                const docPerm = perms.find(p => p.page_id === 'document')
                    || perms.find(p => p.page_id === 'document_control');

                if (libPerm && libPerm.data_scope) {
                    dataScope = libPerm.data_scope;
                } else if (docPerm && docPerm.data_scope) {
                    dataScope = docPerm.data_scope;
                }
            }

            const queryParams = new URLSearchParams({
                user_id: userId,
                data_scope: dataScope,
                department: department
            });

            if (folderId) {
                queryParams.append('parent_id', folderId);
                queryParams.append('folder_id', folderId);
            }
            const qs = `?${queryParams.toString()}`;

            const [foldersRes, filesRes] = await Promise.all([
                fetch(`${API_BASE}/folders${qs}`),
                fetch(`${API_BASE}${qs}`)
            ]);

            if (foldersRes.ok) setFolders(await foldersRes.json());
            if (filesRes.ok) setFiles(await filesRes.json());
        } catch (err) {
            console.error('Error fetching library contents:', err);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, getUserPermissions]);

    const fetchBreadcrumb = useCallback(async (folderId) => {
        if (!folderId) {
            setBreadcrumb([]);
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/folders/${folderId}/path`);
            if (res.ok) setBreadcrumb(await res.json());
        } catch (err) {
            console.error('Error fetching breadcrumb:', err);
        }
    }, []);

    useEffect(() => {
        fetchContents(currentFolderId);
        fetchBreadcrumb(currentFolderId);
    }, [currentFolderId, fetchContents, fetchBreadcrumb]);

    // Close context menu on click outside
    useEffect(() => {
        const handler = () => setContextMenu(null);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);

    // =========================================================================
    // Navigation
    // =========================================================================
    const navigateToFolder = (folderId) => {
        setCurrentFolderId(folderId);
        setSearchTerm('');
        setContextMenu(null);
    };

    const navigateToRoot = () => {
        setCurrentFolderId(null);
        setBreadcrumb([]);
        setSearchTerm('');
    };

    const navigateBack = () => {
        if (breadcrumb.length > 1) {
            setCurrentFolderId(breadcrumb[breadcrumb.length - 2].id);
        } else {
            navigateToRoot();
        }
    };

    // =========================================================================
    // Folder Actions
    // =========================================================================
    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        setIsCreatingFolder(true);
        try {
            const res = await fetch(`${API_BASE}/folders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folder_name: newFolderName.trim(),
                    parent_id: currentFolderId,
                    created_by: currentUser?.username || 'Unknown'
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setShowNewFolderModal(false);
            setNewFolderName('');
            fetchContents(currentFolderId);
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setIsCreatingFolder(false);
        }
    };

    const handleRenameFolder = async (e) => {
        e.preventDefault();
        if (!renameName.trim() || !renameTarget) return;
        try {
            const res = await fetch(`${API_BASE}/folders/${renameTarget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_name: renameName.trim() })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setShowRenameModal(false);
            setRenameTarget(null);
            setRenameName('');
            fetchContents(currentFolderId);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleDeleteFolder = async (folder) => {
        if (!window.confirm(`ลบโฟลเดอร์ "${folder.folder_name}" ?`)) return;
        try {
            const res = await fetch(`${API_BASE}/folders/${folder.id}?user=${currentUser?.username}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            fetchContents(currentFolderId);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    // =========================================================================
    // File Actions
    // =========================================================================
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) setUploadFile(e.target.files[0]);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!uploadFile) return alert('กรุณาเลือกไฟล์');
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('description', uploadDesc);
        formData.append('uploaded_by', currentUser?.username || 'Unknown');
        if (currentFolderId) formData.append('folder_id', currentFolderId);

        try {
            const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'การอัปโหลดล้มเหลว');
            setShowUploadModal(false);
            setUploadFile(null);
            setUploadDesc('');
            fetchContents(currentFolderId);
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteFile = async (id, name) => {
        if (!window.confirm(`ลบไฟล์ "${name}" ?`)) return;
        try {
            const res = await fetch(`${API_BASE}/${id}?user=${currentUser?.username}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            fetchContents(currentFolderId);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    // =========================================================================
    // Context Menu
    // =========================================================================
    const openContextMenu = (e, item, type) => {
        e.stopPropagation();
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        setContextMenu({
            x: rect.right,
            y: rect.bottom + 4,
            item,
            type
        });
    };

    // =========================================================================
    // Helpers
    // =========================================================================
    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getFileTypeInfo = (filename) => {
        if (!filename) return { icon: File, label: 'File', color: '#64748b', bg: '#f1f5f9' };
        const ext = filename.split('.').pop().toLowerCase();
        const map = {
            pdf: { icon: FileText, label: 'PDF', color: '#ef4444', bg: '#fef2f2' },
            doc: { icon: FileText, label: 'Word', color: '#2563eb', bg: '#eff6ff' },
            docx: { icon: FileText, label: 'Word', color: '#2563eb', bg: '#eff6ff' },
            xls: { icon: FileSpreadsheet, label: 'Excel', color: '#16a34a', bg: '#f0fdf4' },
            xlsx: { icon: FileSpreadsheet, label: 'Excel', color: '#16a34a', bg: '#f0fdf4' },
            csv: { icon: FileSpreadsheet, label: 'CSV', color: '#16a34a', bg: '#f0fdf4' },
            ppt: { icon: FileText, label: 'PPT', color: '#f97316', bg: '#fff7ed' },
            pptx: { icon: FileText, label: 'PPT', color: '#f97316', bg: '#fff7ed' },
            jpg: { icon: ImageIcon, label: 'Image', color: '#8b5cf6', bg: '#f5f3ff' },
            jpeg: { icon: ImageIcon, label: 'Image', color: '#8b5cf6', bg: '#f5f3ff' },
            png: { icon: ImageIcon, label: 'Image', color: '#8b5cf6', bg: '#f5f3ff' },
            gif: { icon: ImageIcon, label: 'Image', color: '#8b5cf6', bg: '#f5f3ff' },
            webp: { icon: ImageIcon, label: 'Image', color: '#8b5cf6', bg: '#f5f3ff' },
        };
        return map[ext] || { icon: File, label: ext.toUpperCase(), color: '#64748b', bg: '#f1f5f9' };
    };

    // =========================================================================
    // Filtering
    // =========================================================================
    const filteredFolders = folders.filter(f =>
        f.folder_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredFiles = files.filter(f =>
        f.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalItems = filteredFolders.length + filteredFiles.length;

    // =========================================================================
    // Render
    // =========================================================================
    return (
        <div className="drive-container doc-fade-in">
            {/* ── Header ── */}
            <div className="drive-header">
                <div className="drive-header-left">
                    <h1 className="drive-title">
                        <FolderOpen size={26} className="drive-title-icon" />
                        คลังเอกสาร
                    </h1>
                    <p className="drive-subtitle">จัดเก็บและจัดการไฟล์เอกสารทั่วไป</p>
                </div>
                <div className="drive-header-actions">
                    {hasPermission('document_library_upload') && (
                        <>
                            <button className="drive-btn drive-btn-secondary" onClick={() => setShowNewFolderModal(true)}>
                                <FolderPlus size={17} /> สร้างโฟลเดอร์
                            </button>
                            <button className="drive-btn drive-btn-primary" onClick={() => setShowUploadModal(true)}>
                                <UploadCloud size={17} /> อัปโหลดไฟล์
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Toolbar: Breadcrumb + Search + View Toggle ── */}
            <div className="drive-toolbar">
                <div className="drive-toolbar-left">
                    {/* Back button */}
                    {currentFolderId && (
                        <button className="drive-back-btn" onClick={navigateBack} title="ย้อนกลับ">
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    {/* Breadcrumb */}
                    <nav className="drive-breadcrumb">
                        <button
                            className={`drive-breadcrumb-item ${!currentFolderId ? 'active' : ''}`}
                            onClick={navigateToRoot}
                        >
                            <Home size={15} />
                            <span>คลังเอกสาร</span>
                        </button>
                        {breadcrumb.map((item, idx) => (
                            <span key={item.id} className="drive-breadcrumb-segment">
                                <ChevronRight size={14} className="drive-breadcrumb-sep" />
                                <button
                                    className={`drive-breadcrumb-item ${idx === breadcrumb.length - 1 ? 'active' : ''}`}
                                    onClick={() => navigateToFolder(item.id)}
                                >
                                    <Folder size={14} />
                                    <span>{item.name}</span>
                                </button>
                            </span>
                        ))}
                    </nav>
                </div>

                <div className="drive-toolbar-right">
                    <div className="drive-search">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="ค้นหา..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="drive-view-toggle">
                        <button
                            className={`drive-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <Grid size={17} />
                        </button>
                        <button
                            className={`drive-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="List View"
                        >
                            <List size={17} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Content Area ── */}
            <div className="drive-content">
                {isLoading ? (
                    <div className="drive-loading">
                        <Loader className="spin" size={28} />
                        <span>กำลังโหลด...</span>
                    </div>
                ) : totalItems === 0 ? (
                    <div className="drive-empty">
                        <div className="drive-empty-icon">
                            <FolderOpen size={56} />
                        </div>
                        <h3>{searchTerm ? 'ไม่พบรายการที่ค้นหา' : 'โฟลเดอร์นี้ว่างเปล่า'}</h3>
                        <p>{searchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'สร้างโฟลเดอร์หรืออัปโหลดไฟล์เพื่อเริ่มต้น'}</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* ── Grid View ── */
                    <>
                        {/* Folders Section */}
                        {filteredFolders.length > 0 && (
                            <div className="drive-section">
                                <div className="drive-section-header">
                                    <span>โฟลเดอร์</span>
                                    <span className="drive-section-count">{filteredFolders.length}</span>
                                </div>
                                <div className="drive-grid">
                                    {filteredFolders.map(folder => (
                                        <div
                                            key={`folder-${folder.id}`}
                                            className="drive-card drive-card-folder"
                                            onDoubleClick={() => navigateToFolder(folder.id)}
                                            onClick={() => navigateToFolder(folder.id)}
                                        >
                                            <div className="drive-card-top">
                                                <div className="drive-card-icon-folder">
                                                    <Folder size={24} />
                                                </div>
                                                <button
                                                    className="drive-card-menu"
                                                    onClick={(e) => { e.stopPropagation(); openContextMenu(e, folder, 'folder'); }}
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>
                                            <div className="drive-card-body">
                                                <div className="drive-card-name" title={folder.folder_name}>
                                                    {folder.folder_name}
                                                </div>
                                                <div className="drive-card-meta">
                                                    {folder.sub_folder_count > 0 && <span>{folder.sub_folder_count} โฟลเดอร์</span>}
                                                    {folder.file_count > 0 && <span>{folder.file_count} ไฟล์</span>}
                                                    {folder.sub_folder_count === 0 && folder.file_count === 0 && <span>ว่าง</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Files Section */}
                        {filteredFiles.length > 0 && (
                            <div className="drive-section">
                                <div className="drive-section-header">
                                    <span>ไฟล์</span>
                                    <span className="drive-section-count">{filteredFiles.length}</span>
                                </div>
                                <div className="drive-grid">
                                    {filteredFiles.map(file => {
                                        const typeInfo = getFileTypeInfo(file.original_name);
                                        const TypeIcon = typeInfo.icon;
                                        return (
                                            <div key={`file-${file.id}`} className="drive-card drive-card-file">
                                                <div className="drive-card-top">
                                                    <div className="drive-card-icon-file" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                                                        <TypeIcon size={24} />
                                                    </div>
                                                    <button
                                                        className="drive-card-menu"
                                                        onClick={(e) => openContextMenu(e, file, 'file')}
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                </div>
                                                <div className="drive-card-body">
                                                    <div className="drive-card-name" title={file.original_name}>
                                                        {file.original_name}
                                                    </div>
                                                    <div className="drive-card-meta">
                                                        <span className="drive-card-type-badge" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                                                            {typeInfo.label}
                                                        </span>
                                                        <span>{formatBytes(file.file_size)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* ── List View ── */
                    <div className="drive-list-container">
                        <table className="drive-list-table">
                            <thead>
                                <tr>
                                    <th>ชื่อ</th>
                                    <th>ประเภท</th>
                                    <th>ขนาด</th>
                                    <th>อัปโหลดโดย</th>
                                    <th>วันที่</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFolders.map(folder => (
                                    <tr
                                        key={`folder-${folder.id}`}
                                        className="drive-list-row drive-list-row-folder"
                                        onClick={() => navigateToFolder(folder.id)}
                                    >
                                        <td className="drive-list-name">
                                            <Folder size={18} className="drive-list-icon-folder" />
                                            <span>{folder.folder_name}</span>
                                        </td>
                                        <td><span className="drive-list-type-badge drive-list-type-folder">โฟลเดอร์</span></td>
                                        <td className="drive-list-meta">—</td>
                                        <td className="drive-list-meta">{folder.created_by || '—'}</td>
                                        <td className="drive-list-meta">{new Date(folder.created_date).toLocaleDateString('th-TH')}</td>
                                        <td>
                                            <button className="drive-card-menu" onClick={(e) => { e.stopPropagation(); openContextMenu(e, folder, 'folder'); }}>
                                                <MoreVertical size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredFiles.map(file => {
                                    const typeInfo = getFileTypeInfo(file.original_name);
                                    const TypeIcon = typeInfo.icon;
                                    return (
                                        <tr key={`file-${file.id}`} className="drive-list-row">
                                            <td className="drive-list-name">
                                                <TypeIcon size={18} style={{ color: typeInfo.color, flexShrink: 0 }} />
                                                <span>{file.original_name}</span>
                                            </td>
                                            <td>
                                                <span className="drive-list-type-badge" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                                                    {typeInfo.label}
                                                </span>
                                            </td>
                                            <td className="drive-list-meta">{formatBytes(file.file_size)}</td>
                                            <td className="drive-list-meta">{file.uploaded_by || '—'}</td>
                                            <td className="drive-list-meta">{new Date(file.upload_date).toLocaleDateString('th-TH')}</td>
                                            <td>
                                                <button className="drive-card-menu" onClick={(e) => openContextMenu(e, file, 'file')}>
                                                    <MoreVertical size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {totalItems === 0 && (
                                    <tr>
                                        <td colSpan="6" className="drive-list-empty">ไม่มีข้อมูล</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Context Menu Popup ── */}
            {contextMenu && (
                <div
                    className="drive-context-menu"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {contextMenu.type === 'file' ? (
                        <>
                            <button className="drive-ctx-item" onClick={() => { window.open(`${API_BASE}/action/view/${contextMenu.item.id}`, '_blank'); setContextMenu(null); }}>
                                <Eye size={15} /> ดูเอกสาร
                            </button>
                            <button className="drive-ctx-item" onClick={() => { window.location.href = `${API_BASE}/action/download/${contextMenu.item.id}`; setContextMenu(null); }}>
                                <Download size={15} /> ดาวน์โหลด
                            </button>
                            {hasPermission('document_library_delete') && (
                                <>
                                    <div className="drive-ctx-divider" />
                                    <button className="drive-ctx-item drive-ctx-danger" onClick={() => { handleDeleteFile(contextMenu.item.id, contextMenu.item.original_name); setContextMenu(null); }}>
                                        <Trash2 size={15} /> ลบ
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <button className="drive-ctx-item" onClick={() => { navigateToFolder(contextMenu.item.id); setContextMenu(null); }}>
                                <FolderOpen size={15} /> เปิดโฟลเดอร์
                            </button>
                            <button className="drive-ctx-item" onClick={() => { setRenameTarget(contextMenu.item); setRenameName(contextMenu.item.folder_name); setShowRenameModal(true); setContextMenu(null); }}>
                                <Edit3 size={15} /> เปลี่ยนชื่อ
                            </button>
                            {hasPermission('document_library_delete') && (
                                <>
                                    <div className="drive-ctx-divider" />
                                    <button className="drive-ctx-item drive-ctx-danger" onClick={() => { handleDeleteFolder(contextMenu.item); setContextMenu(null); }}>
                                        <Trash2 size={15} /> ลบโฟลเดอร์
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ── New Folder Modal ── */}
            {showNewFolderModal && (
                <div className="drive-modal-overlay" onClick={() => setShowNewFolderModal(false)}>
                    <div className="drive-modal drive-modal-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="drive-modal-header">
                            <h3><FolderPlus size={20} /> สร้างโฟลเดอร์ใหม่</h3>
                            <button className="drive-modal-close" onClick={() => setShowNewFolderModal(false)}><XCircle size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateFolder}>
                            <div className="drive-modal-body">
                                <label className="drive-label">ชื่อโฟลเดอร์ <span className="required">*</span></label>
                                <input
                                    className="drive-input"
                                    type="text"
                                    placeholder="เช่น เอกสารแผนก IT"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="drive-modal-footer">
                                <button type="button" className="drive-btn drive-btn-ghost" onClick={() => setShowNewFolderModal(false)}>ยกเลิก</button>
                                <button type="submit" className="drive-btn drive-btn-primary" disabled={isCreatingFolder || !newFolderName.trim()}>
                                    {isCreatingFolder ? <><Loader size={16} className="spin" /> กำลังสร้าง...</> : <><FolderPlus size={16} /> สร้าง</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Rename Folder Modal ── */}
            {showRenameModal && renameTarget && (
                <div className="drive-modal-overlay" onClick={() => setShowRenameModal(false)}>
                    <div className="drive-modal drive-modal-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="drive-modal-header">
                            <h3><Edit3 size={20} /> เปลี่ยนชื่อโฟลเดอร์</h3>
                            <button className="drive-modal-close" onClick={() => setShowRenameModal(false)}><XCircle size={20} /></button>
                        </div>
                        <form onSubmit={handleRenameFolder}>
                            <div className="drive-modal-body">
                                <label className="drive-label">ชื่อใหม่ <span className="required">*</span></label>
                                <input
                                    className="drive-input"
                                    type="text"
                                    value={renameName}
                                    onChange={(e) => setRenameName(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="drive-modal-footer">
                                <button type="button" className="drive-btn drive-btn-ghost" onClick={() => setShowRenameModal(false)}>ยกเลิก</button>
                                <button type="submit" className="drive-btn drive-btn-primary" disabled={!renameName.trim()}>
                                    <CheckCircle size={16} /> บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Upload Modal ── */}
            {showUploadModal && (
                <div className="drive-modal-overlay" onClick={() => setShowUploadModal(false)}>
                    <div className="drive-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="drive-modal-header">
                            <h3>
                                <div style={{ background: '#e0e7ff', padding: '6px', borderRadius: '8px', display: 'flex', color: '#4f46e5' }}>
                                    <FilePlus size={18} />
                                </div>
                                อัปโหลดไฟล์
                                {currentFolderId && breadcrumb.length > 0 && (
                                    <span className="drive-upload-folder-badge">
                                        <Folder size={13} /> {breadcrumb[breadcrumb.length - 1].name}
                                    </span>
                                )}
                            </h3>
                            <button className="drive-modal-close" onClick={() => setShowUploadModal(false)}><XCircle size={20} /></button>
                        </div>
                        <form onSubmit={handleUploadSubmit}>
                            <div className="drive-modal-body">
                                <div className="doc-form-group">
                                    <label className="drive-label">เลือกไฟล์ <span className="required">*</span></label>
                                    <div className={`drive-dropzone ${uploadFile ? 'has-file' : ''}`}>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="doc-file-input-hidden" required />
                                        {!uploadFile ? (
                                            <>
                                                <UploadCloud className="drive-dropzone-icon" size={36} />
                                                <div className="drive-dropzone-text">คลิกเพื่อเลือกไฟล์ หรือลากมาวาง</div>
                                                <div className="drive-dropzone-sub">PDF, Word, Excel, รูปภาพ ฯลฯ สูงสุด 50MB</div>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="drive-dropzone-icon" size={36} />
                                                <div className="drive-dropzone-text" style={{ color: '#059669' }}>
                                                    {uploadFile.name}
                                                </div>
                                                <div className="drive-dropzone-sub">{formatBytes(uploadFile.size)} • คลิกเพื่อเปลี่ยน</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="doc-form-group">
                                    <label className="drive-label">คำอธิบาย (ถ้ามี)</label>
                                    <textarea
                                        className="drive-textarea"
                                        value={uploadDesc}
                                        onChange={(e) => setUploadDesc(e.target.value)}
                                        placeholder="ระบุรายละเอียดเพิ่มเติม..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="drive-modal-footer">
                                <button type="button" className="drive-btn drive-btn-ghost" onClick={() => setShowUploadModal(false)} disabled={isUploading}>ยกเลิก</button>
                                <button type="submit" className="drive-btn drive-btn-primary" disabled={isUploading || !uploadFile}>
                                    {isUploading ? <><Loader size={16} className="spin" /> กำลังอัปโหลด...</> : <><UploadCloud size={16} /> อัปโหลด</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Status Bar ── */}
            <div className="drive-statusbar">
                <Info size={13} />
                <span>{filteredFolders.length} โฟลเดอร์, {filteredFiles.length} ไฟล์</span>
                {currentFolderId && (
                    <span className="drive-statusbar-path">
                        — ใน {breadcrumb.map(b => b.name).join(' / ') || '...'}
                    </span>
                )}
            </div>
        </div>
    );
}

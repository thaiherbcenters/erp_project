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

export default function FormDocumentList({ hasPermission, documents, standards, isLoading, error }) {
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
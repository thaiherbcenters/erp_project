import React, { useState, useEffect } from 'react';
import { Files, FileCheck, Clock, FileX, TrendingUp, AlertCircle, FileCog } from 'lucide-react';
import API_BASE from '../../config';
import { DOCUMENT_CATEGORIES } from '../documentData';

const getCategoryShortName = (catId) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.shortName : catId;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function DocumentDashboard({ hasPermission, documents, isLoading, error }) {
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

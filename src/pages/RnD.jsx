/**
 * =============================================================================
 * RnD.jsx — หน้า Research & Development (เขียนใหม่)
 * =============================================================================
 * ประกอบด้วย 3 sub-pages:
 *   1. R&D Dashboard     — สรุปภาพรวมสูตร โครงการวิจัย การทดลองล่าสุด
 *   2. สูตรการผลิต (BOM) — ตารางสูตร + Modal ดูรายละเอียดวัตถุดิบ
 *   3. โครงการวิจัย       — ตารางโครงการ R&D
 *
 * Data: ดึงจาก productionMockData.js (shared กับ Planner/Production)
 * =============================================================================
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FlaskConical, Lightbulb, Clock, CheckCircle2,
    TrendingUp, Plus, Search, Eye, XCircle,
    Beaker, ListChecks, Package, FileText, AlertTriangle
} from 'lucide-react';
import { MOCK_FORMULAS, MOCK_RND_PROJECTS, MOCK_EXPERIMENTS } from '../data/productionMockData';
import './PageCommon.css';
import './RnD.css';

export default function RnD() {
    const { getVisibleSubPages, hasSectionPermission } = useAuth();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('rnd');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFormula, setSelectedFormula] = useState(null);
    const [formulaFilter, setFormulaFilter] = useState('ทั้งหมด');

    // ── Stats ──
    const totalFormulas = MOCK_FORMULAS.length;
    const approvedFormulas = MOCK_FORMULAS.filter(f => f.status === 'อนุมัติ').length;
    const draftFormulas = MOCK_FORMULAS.filter(f => f.status === 'ร่าง' || f.status === 'ทดสอบ').length;
    const activeProjects = MOCK_RND_PROJECTS.filter(p => p.status === 'กำลังดำเนินการ').length;

    const getStatusColor = (status) => {
        switch (status) {
            case 'อนุมัติ': return 'badge-success';
            case 'ร่าง': return 'badge-neutral';
            case 'ทดสอบ': return 'badge-warning';
            case 'เสร็จสิ้น': return 'badge-success';
            case 'กำลังดำเนินการ': return 'badge-warning';
            default: return 'badge-neutral';
        }
    };

    const getResultColor = (result) => {
        switch (result) {
            case 'ผ่าน': return 'badge-success';
            case 'ไม่ผ่าน': return 'badge-danger';
            case 'รอผล': return 'badge-warning';
            default: return 'badge-neutral';
        }
    };

    // ══════════════════════════════════════════════════════════════════
    // 1. R&D Dashboard
    // ══════════════════════════════════════════════════════════════════
    const renderDashboard = () => (
        <div className="rnd-dashboard">
            <div className="page-title">
                <h1>R&D Dashboard</h1>
                <p>ภาพรวมสูตรผลิตภัณฑ์และโครงการวิจัย</p>
            </div>

            {hasSectionPermission('rnd_dashboard_stats') && (
                <div className="summary-row">
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#f0ebff', color: '#7b7bf5' }}><FlaskConical size={20} /></div>
                        <div><span className="summary-label">สูตรทั้งหมด</span><span className="summary-value">{totalFormulas}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#ecfdf5', color: '#059669' }}><CheckCircle2 size={20} /></div>
                        <div><span className="summary-label">อนุมัติแล้ว</span><span className="summary-value">{approvedFormulas}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#fff8e1', color: '#f9a825' }}><Clock size={20} /></div>
                        <div><span className="summary-label">ร่าง/ทดสอบ</span><span className="summary-value">{draftFormulas}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#e3f2fd', color: '#1e88e5' }}><TrendingUp size={20} /></div>
                        <div><span className="summary-label">โครงการดำเนินอยู่</span><span className="summary-value">{activeProjects}</span></div>
                    </div>
                </div>
            )}

            {hasSectionPermission('rnd_dashboard_recent') && (
                <>
                    {/* สูตรที่อนุมัติล่าสุด */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <h3 className="card-title"><CheckCircle2 size={16} style={{ color: '#059669' }} /> สูตรที่อนุมัติล่าสุด</h3>
                        <div className="rnd-approved-grid">
                            {MOCK_FORMULAS.filter(f => f.status === 'อนุมัติ').slice(0, 3).map(f => (
                                <div key={f.id} className="rnd-approved-card" onClick={() => setSelectedFormula(f)}>
                                    <div className="rnd-approved-header">
                                        <span className="rnd-approved-code">{f.id}</span>
                                        <span className={`badge ${getStatusColor(f.status)}`}>{f.status}</span>
                                    </div>
                                    <div className="rnd-approved-name">{f.name}</div>
                                    <div className="rnd-approved-meta">
                                        <span><Package size={12} /> {f.batchSize} {f.unit}/batch</span>
                                        <span><Beaker size={12} /> {f.ingredients.length} วัตถุดิบ</span>
                                    </div>
                                    <div className="rnd-approved-footer">
                                        อนุมัติ: {f.approvedDate} โดย {f.approvedBy}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* การทดลองล่าสุด */}
                    <div className="card">
                        <h3 className="card-title"><Beaker size={16} style={{ color: '#7b7bf5' }} /> การทดลองล่าสุด</h3>
                        <div className="table-card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รหัส</th>
                                        <th>โครงการ</th>
                                        <th>ชื่อการทดลอง</th>
                                        <th>วันที่</th>
                                        <th>ผลลัพธ์</th>
                                        <th>หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_EXPERIMENTS.slice(0, 5).map(exp => (
                                        <tr key={exp.id}>
                                            <td className="text-bold">{exp.code}</td>
                                            <td>{exp.projectCode}</td>
                                            <td>{exp.name}</td>
                                            <td>{exp.date}</td>
                                            <td><span className={`badge ${getResultColor(exp.result)}`}>{exp.result}</span></td>
                                            <td>{exp.note}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    // ══════════════════════════════════════════════════════════════════
    // 2. สูตรการผลิต (BOM / Formulas)
    // ══════════════════════════════════════════════════════════════════
    const renderFormulas = () => {
        const statuses = ['ทั้งหมด', ...new Set(MOCK_FORMULAS.map(f => f.status))];
        const filtered = MOCK_FORMULAS.filter(f => {
            const matchSearch = f.name.includes(searchTerm) || f.id.includes(searchTerm) || f.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchFilter = formulaFilter === 'ทั้งหมด' || f.status === formulaFilter;
            return matchSearch && matchFilter;
        });

        return (
            <div className="rnd-formulas">
                <div className="page-title">
                    <h1>สูตรการผลิต (BOM)</h1>
                    <p>จัดการสูตรผลิตภัณฑ์ วัตถุดิบ และวิธีการผลิต</p>
                </div>

                <div className="toolbar">
                    <div className="toolbar-left">
                        {hasSectionPermission('rnd_formulas_search') && (
                            <div className="search-box">
                                <Search size={16} />
                                <input type="text" placeholder="ค้นหาสูตร..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        )}
                        <div className="rnd-filter-group">
                            {statuses.map(s => (
                                <button key={s} className={`rnd-filter-btn ${formulaFilter === s ? 'active' : ''}`} onClick={() => setFormulaFilter(s)}>
                                    {s} {s !== 'ทั้งหมด' && <span className="rnd-filter-count">{MOCK_FORMULAS.filter(f => f.status === s).length}</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                    {hasSectionPermission('rnd_formulas_action') && (
                        <button className="btn-primary"><Plus size={16} /> สร้างสูตรใหม่</button>
                    )}
                </div>

                {hasSectionPermission('rnd_formulas_table') && (
                    <div className="card table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>รหัสสูตร</th>
                                    <th>ชื่อผลิตภัณฑ์</th>
                                    <th>หมวดหมู่</th>
                                    <th>เวอร์ชัน</th>
                                    <th>Batch Size</th>
                                    <th>วัตถุดิบ</th>
                                    <th>สถานะ</th>
                                    <th>ดูรายละเอียด</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(formula => (
                                    <tr key={formula.id}>
                                        <td className="text-bold">{formula.id}</td>
                                        <td>{formula.name}</td>
                                        <td><span className="badge badge-info">{formula.category}</span></td>
                                        <td><span className="badge badge-neutral">{formula.version}</span></td>
                                        <td>{formula.batchSize.toLocaleString()} {formula.unit}</td>
                                        <td>{formula.ingredients.length} รายการ</td>
                                        <td><span className={`badge ${getStatusColor(formula.status)}`}>{formula.status}</span></td>
                                        <td>
                                            <button className="btn-sm" onClick={() => setSelectedFormula(formula)}>
                                                <Eye size={14} /> ดูสูตร
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่พบสูตรที่ค้นหา</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // 3. โครงการวิจัย (Research Projects)
    // ══════════════════════════════════════════════════════════════════
    const renderProjects = () => {
        const filtered = MOCK_RND_PROJECTS.filter(p =>
            p.name.includes(searchTerm) || p.code.includes(searchTerm) || p.category.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="rnd-projects">
                <div className="page-title">
                    <h1>โครงการวิจัยและพัฒนา</h1>
                    <p>จัดการโครงการวิจัยผลิตภัณฑ์สมุนไพร</p>
                </div>

                <div className="toolbar">
                    {hasSectionPermission('rnd_projects_search') && (
                        <div className="search-box">
                            <Search size={16} />
                            <input type="text" placeholder="ค้นหาโครงการ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    )}
                    <button className="btn-primary"><Plus size={16} /> สร้างโครงการใหม่</button>
                </div>

                {hasSectionPermission('rnd_projects_table') && (
                    <div className="card table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>รหัส</th>
                                    <th>ชื่อโครงการ</th>
                                    <th>หมวดหมู่</th>
                                    <th>นักวิจัย</th>
                                    <th>เริ่มต้น</th>
                                    <th>เป้าหมาย</th>
                                    <th>เฟส</th>
                                    <th>Progress</th>
                                    <th>สูตรอ้างอิง</th>
                                    <th>สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(project => (
                                    <tr key={project.id}>
                                        <td className="text-bold">{project.code}</td>
                                        <td>{project.name}</td>
                                        <td><span className="badge badge-info">{project.category}</span></td>
                                        <td>{project.researcher}</td>
                                        <td>{project.startDate}</td>
                                        <td>{project.targetDate}</td>
                                        <td><span className="badge badge-neutral">{project.phase}</span></td>
                                        <td>
                                            <div className="progress-container">
                                                <div className="progress-bar" style={{ width: `${project.progress}%`, backgroundColor: project.progress === 100 ? 'var(--success, #43a047)' : 'var(--primary, #7b7bf5)' }}></div>
                                                <span className="progress-text">{project.progress}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            {project.formulaRef ? (
                                                <button className="rnd-formula-link" onClick={() => {
                                                    const fm = MOCK_FORMULAS.find(f => f.id === project.formulaRef);
                                                    if (fm) setSelectedFormula(fm);
                                                }}>
                                                    {project.formulaRef}
                                                </button>
                                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                        <td><span className={`badge ${getStatusColor(project.status)}`}>{project.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Formula Detail Modal
    // ══════════════════════════════════════════════════════════════════
    const renderFormulaModal = () => {
        if (!selectedFormula) return null;
        const f = selectedFormula;

        return (
            <div className="rnd-modal-overlay" onClick={() => setSelectedFormula(null)}>
                <div className="rnd-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>{f.name}</h2>
                            <div className="rnd-modal-meta">
                                <span className="badge badge-info">{f.id}</span>
                                <span className="badge badge-neutral">{f.version}</span>
                                <span className={`badge ${getStatusColor(f.status)}`}>{f.status}</span>
                                <span className="badge badge-neutral">{f.category}</span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => setSelectedFormula(null)}><XCircle size={22} /></button>
                    </div>

                    <div className="rnd-modal-body">
                        {/* ข้อมูลทั่วไป */}
                        <div className="rnd-modal-info-grid">
                            <div className="rnd-modal-info-item">
                                <label>ขนาดต่อ Batch</label>
                                <span>{f.batchSize.toLocaleString()} {f.unit}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>อายุการเก็บ</label>
                                <span>{f.shelfLife}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>สร้างโดย</label>
                                <span>{f.createdBy}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>อนุมัติโดย</label>
                                <span>{f.approvedBy || '—'}</span>
                            </div>
                        </div>

                        {f.description && (
                            <div className="rnd-modal-description">
                                <h4>คำอธิบาย</h4>
                                <p>{f.description}</p>
                            </div>
                        )}

                        {/* ตารางวัตถุดิบ */}
                        <div className="rnd-modal-section">
                            <h4><Beaker size={16} /> วัตถุดิบที่ใช้ ({f.ingredients.length} รายการ)</h4>
                            <table className="data-table rnd-ingredients-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>รหัส</th>
                                        <th>ชื่อวัตถุดิบ</th>
                                        <th>ปริมาณ / Batch</th>
                                        <th>หน่วย</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {f.ingredients.map((ing, idx) => (
                                        <tr key={idx}>
                                            <td>{idx + 1}</td>
                                            <td className="text-bold">{ing.materialId}</td>
                                            <td>{ing.name}</td>
                                            <td style={{ fontWeight: 600 }}>{ing.qty}</td>
                                            <td>{ing.unit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* วิธีการผลิต */}
                        {f.instructions && (
                            <div className="rnd-modal-section">
                                <h4><ListChecks size={16} /> วิธีการผลิต ({f.instructions.length} ขั้นตอน)</h4>
                                <ol className="rnd-instructions-list">
                                    {f.instructions.map((step, idx) => (
                                        <li key={idx}>{step}</li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Main Render
    // ══════════════════════════════════════════════════════════════════
    if (visibleSubPages.length === 0) {
        return <div className="page-container"><p className="no-permission">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;
    }

    return (
        <div className="page-container rnd-page page-enter">
            {currentTab === 'rnd_dashboard' && renderDashboard()}
            {currentTab === 'rnd_formulas' && renderFormulas()}
            {currentTab === 'rnd_projects' && renderProjects()}
            {renderFormulaModal()}
        </div>
    );
}

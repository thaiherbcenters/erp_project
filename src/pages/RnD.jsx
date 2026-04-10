/**
 * =============================================================================
 * RnD.jsx — หน้า Research & Development (Full CRUD + Workflow)
 * =============================================================================
 * ประกอบด้วย 3 sub-pages:
 *   1. R&D Dashboard     — สรุปภาพรวมสูตร โครงการวิจัย การทดลองล่าสุด
 *   2. สูตรการผลิต (BOM) — ตารางสูตร + Modal ดูรายละเอียด + สร้าง/แก้ไข/อนุมัติ
 *   3. โครงการวิจัย       — ตารางโครงการ R&D + สร้าง + บันทึกผลทดลอง
 * =============================================================================
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FlaskConical, Lightbulb, Clock, CheckCircle2,
    TrendingUp, Plus, Search, Eye, XCircle,
    Beaker, ListChecks, Package, FileText, AlertTriangle,
    Edit, Trash2, ArrowRight, DollarSign, Shield
} from 'lucide-react';
import { useRnD } from '../context/RnDContext';
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

    // Modals
    const [showCreateFormula, setShowCreateFormula] = useState(false);
    const [showEditFormula, setShowEditFormula] = useState(false);
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [showCreateExperiment, setShowCreateExperiment] = useState(false);

    // Forms
    const emptyFormulaForm = {
        name: '', category: 'ยาดม', version: 'v1.0', batchSize: 0, unit: '', shelfLife: '',
        description: '', instructions: [''], ingredients: [{ materialId: '', name: '', qty: 0, unit: '' }],
    };
    const [formulaForm, setFormulaForm] = useState(emptyFormulaForm);
    const [projectForm, setProjectForm] = useState({ name: '', category: '', researcher: '', startDate: '', targetDate: '', formulaRef: '' });
    const [experimentForm, setExperimentForm] = useState({ projectCode: '', name: '', date: '', result: 'รอผล', note: '' });
    const [saving, setSaving] = useState(false);

    const {
        formulas, materials, projects, experiments, loading,
        createFormula, updateFormula, updateFormulaStatus, deleteFormula,
        createProject, createExperiment, pharmApprove,
    } = useRnD();

    // ── Stats ──
    const totalFormulas = formulas.length;
    const approvedFormulas = formulas.filter(f => f.status === 'อนุมัติ').length;
    const draftFormulas = formulas.filter(f => f.status === 'ร่าง' || f.status === 'ทดสอบ').length;
    const activeProjects = projects.filter(p => p.status === 'กำลังดำเนินการ').length;

    const getStatusColor = (status) => {
        switch (status) {
            case 'อนุมัติ': return 'badge-success';
            case 'ร่าง': return 'badge-neutral';
            case 'รอทดสอบ': return 'badge-warning';
            case 'ทดสอบผ่าน': return 'badge-info';
            case 'ทดสอบไม่ผ่าน': return 'badge-danger';
            case 'รอเภสัชกร': return 'badge-warning';
            case 'เภสัชกรไม่อนุมัติ': return 'badge-danger';
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

    // ── Cost calculation (#6) ──
    const calcBatchCost = (formula) => {
        if (!formula?.ingredients) return 0;
        return formula.ingredients.reduce((sum, ing) => {
            const mat = materials.find(m => m.id === ing.materialId);
            return sum + (mat ? mat.costPerUnit * ing.qty : 0);
        }, 0);
    };

    // ── Formula Form Helpers ──
    const addIngredient = () => setFormulaForm(p => ({ ...p, ingredients: [...p.ingredients, { materialId: '', name: '', qty: 0, unit: '' }] }));
    const removeIngredient = (idx) => setFormulaForm(p => ({ ...p, ingredients: p.ingredients.filter((_, i) => i !== idx) }));
    const updateIngredient = (idx, field, value) => {
        setFormulaForm(p => {
            const ings = [...p.ingredients];
            ings[idx] = { ...ings[idx], [field]: value };
            if (field === 'materialId') {
                const mat = materials.find(m => m.id === value);
                if (mat) { ings[idx].name = mat.name; ings[idx].unit = mat.unit; }
            }
            return { ...p, ingredients: ings };
        });
    };
    const addInstruction = () => setFormulaForm(p => ({ ...p, instructions: [...p.instructions, ''] }));
    const removeInstruction = (idx) => setFormulaForm(p => ({ ...p, instructions: p.instructions.filter((_, i) => i !== idx) }));
    const updateInstruction = (idx, value) => {
        setFormulaForm(p => {
            const ins = [...p.instructions];
            ins[idx] = value;
            return { ...p, instructions: ins };
        });
    };

    // ── Handlers ──
    const handleCreateFormula = async () => {
        if (!formulaForm.name) return alert('กรุณาระบุชื่อสูตร');
        setSaving(true);
        const res = await createFormula(formulaForm);
        setSaving(false);
        if (res.success) { alert('สร้างสูตรสำเร็จ!'); setShowCreateFormula(false); setFormulaForm(emptyFormulaForm); }
        else alert('เกิดข้อผิดพลาด');
    };

    const handleEditFormula = async () => {
        if (!formulaForm.name) return alert('กรุณาระบุชื่อสูตร');
        setSaving(true);
        const res = await updateFormula(selectedFormula.id, formulaForm);
        setSaving(false);
        if (res.success) { alert('บันทึกสำเร็จ!'); setShowEditFormula(false); setSelectedFormula(null); }
        else alert('เกิดข้อผิดพลาด');
    };

    const handleStatusChange = async (formula, newStatus) => {
        const res = await updateFormulaStatus(formula.id, newStatus, 'Admin');
        if (res.success) alert(`เปลี่ยนสถานะเป็น "${newStatus}" สำเร็จ!`);
    };

    const handleDeleteFormula = async (id, name) => {
        if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสูตร ${id} (${name})? ข้อมูลนี้จะไม่สามารถกู้คืนได้`)) return;
        setSaving(true);
        const res = await deleteFormula(id);
        setSaving(false);
        if (res.success) {
            alert('ลบสูตรสำเร็จ!');
            if (selectedFormula?.id === id) setSelectedFormula(null);
        } else {
            alert('เกิดข้อผิดพลาดในการลบสูตร');
        }
    };

    const openEditFormula = (f) => {
        setFormulaForm({
            name: f.name, category: f.category, version: f.version, batchSize: f.batchSize,
            unit: f.unit, shelfLife: f.shelfLife, description: f.description,
            instructions: f.instructions?.length ? f.instructions : [''],
            ingredients: f.ingredients?.length ? f.ingredients : [{ materialId: '', name: '', qty: 0, unit: '' }],
        });
        setSelectedFormula(f);
        setShowEditFormula(true);
    };

    const handleCreateProject = async () => {
        if (!projectForm.name) return alert('กรุณาระบุชื่อโครงการ');
        setSaving(true);
        const res = await createProject(projectForm);
        setSaving(false);
        if (res.success) { alert('สร้างโครงการสำเร็จ!'); setShowCreateProject(false); setProjectForm({ name: '', category: '', researcher: '', startDate: '', targetDate: '', formulaRef: '' }); }
        else alert('เกิดข้อผิดพลาด');
    };

    const handleCreateExperiment = async () => {
        if (!experimentForm.projectCode || !experimentForm.name) return alert('กรุณากรอกข้อมูลให้ครบ');
        setSaving(true);
        const res = await createExperiment(experimentForm);
        setSaving(false);
        if (res.success) { alert('บันทึกผลทดลองสำเร็จ!'); setShowCreateExperiment(false); setExperimentForm({ projectCode: '', name: '', date: '', result: 'รอผล', note: '' }); }
        else alert('เกิดข้อผิดพลาด');
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
                    <div className="card" style={{ marginBottom: 16 }}>
                        <h3 className="card-title"><CheckCircle2 size={16} style={{ color: '#059669' }} /> สูตรที่อนุมัติล่าสุด</h3>
                        <div className="rnd-approved-grid">
                            {formulas.filter(f => f.status === 'อนุมัติ').slice(0, 3).map(f => (
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
                                        💰 ต้นทุน: ฿{calcBatchCost(f).toLocaleString()}/batch
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="card-title"><Beaker size={16} style={{ color: '#7b7bf5' }} /> การทดลองล่าสุด</h3>
                        <div className="table-card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รหัส</th><th>โครงการ</th><th>ชื่อการทดลอง</th><th>วันที่</th><th>ผลลัพธ์</th><th>หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {experiments.slice(0, 5).map(exp => (
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
        const statuses = ['ทั้งหมด', ...new Set(formulas.map(f => f.status))];
        const filtered = formulas.filter(f => {
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
                                    {s} {s !== 'ทั้งหมด' && <span className="rnd-filter-count">{formulas.filter(f => f.status === s).length}</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                    {hasSectionPermission('rnd_formulas_action') && (
                        <button className="btn-primary" onClick={() => { setFormulaForm(emptyFormulaForm); setShowCreateFormula(true); }}><Plus size={16} /> สร้างสูตรใหม่</button>
                    )}
                </div>

                {hasSectionPermission('rnd_formulas_table') && (
                    <div className="card table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>รหัสสูตร</th><th>ชื่อผลิตภัณฑ์</th><th>หมวดหมู่</th><th>เวอร์ชัน</th>
                                    <th>Batch Size</th><th>วัตถุดิบ</th><th>ต้นทุน/Batch</th><th>สถานะ</th><th>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(formula => (
                                    <tr key={formula.id}>
                                        <td className="text-bold">{formula.id}</td>
                                        <td>{formula.name}</td>
                                        <td><span className="badge badge-info">{formula.category}</span></td>
                                        <td><span className="badge badge-neutral">{formula.version}</span></td>
                                        <td>{formula.batchSize?.toLocaleString()} {formula.unit}</td>
                                        <td>{formula.ingredients?.length} รายการ</td>
                                        <td style={{ fontWeight: 600, color: '#059669' }}>฿{calcBatchCost(formula).toLocaleString()}</td>
                                        <td><span className={`badge ${getStatusColor(formula.status)}`}>{formula.status}</span></td>
                                        <td style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn-sm" onClick={() => setSelectedFormula(formula)} title="ดูรายละเอียด"><Eye size={14} /></button>
                                            <button className="btn-sm" onClick={() => openEditFormula(formula)} title="แก้ไข"><Edit size={14} /></button>
                                            <button className="btn-sm" onClick={() => handleDeleteFormula(formula.id, formula.name)} title="ลบ" style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                                            {formula.status === 'ร่าง' && (
                                                <button className="btn-sm" style={{ color: '#f59e0b' }} onClick={() => handleStatusChange(formula, 'รอทดสอบ')} title="ส่งให้ QC ทดสอบ"><ArrowRight size={14} /></button>
                                            )}
                                            {formula.status === 'ทดสอบผ่าน' && (
                                                <button className="btn-sm" style={{ color: '#7c3aed' }} onClick={() => handleStatusChange(formula, 'รอเภสัชกร')} title="ส่งให้เภสัชกร"><ArrowRight size={14} /></button>
                                            )}
                                            {formula.status === 'รอเภสัชกร' && (
                                                <button className="btn-sm" style={{ color: '#059669' }} onClick={async () => { const res = await pharmApprove(formula.id, 'เภสัชกร', true); if (res.success) alert('อนุมัติสำเร็จ!'); }} title="เภสัชกรอนุมัติ"><Shield size={14} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่พบสูตรที่ค้นหา</td></tr>
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
        const filtered = projects.filter(p =>
            p.name.includes(searchTerm) || p.code.includes(searchTerm) || p.category.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="rnd-projects">
                <div className="page-title">
                    <h1>โครงการวิจัยและพัฒนา</h1>
                    <p>จัดการโครงการวิจัยผลิตภัณฑ์สมุนไพร</p>
                </div>

                <div className="toolbar">
                    <div className="toolbar-left">
                        {hasSectionPermission('rnd_projects_search') && (
                            <div className="search-box">
                                <Search size={16} />
                                <input type="text" placeholder="ค้นหาโครงการ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-secondary" onClick={() => setShowCreateExperiment(true)}><Beaker size={16} /> บันทึกผลทดลอง</button>
                        <button className="btn-primary" onClick={() => setShowCreateProject(true)}><Plus size={16} /> สร้างโครงการใหม่</button>
                    </div>
                </div>

                {hasSectionPermission('rnd_projects_table') && (
                    <div className="card table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>รหัส</th><th>ชื่อโครงการ</th><th>หมวดหมู่</th><th>นักวิจัย</th>
                                    <th>เริ่มต้น</th><th>เป้าหมาย</th><th>เฟส</th><th>Progress</th>
                                    <th>สูตรอ้างอิง</th><th>สถานะ</th>
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
                                                    const fm = formulas.find(f => f.id === project.formulaRef);
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

                {/* ตารางผลทดลอง */}
                <div className="card table-card" style={{ marginTop: 16 }}>
                    <h3 className="card-title"><Beaker size={16} style={{ color: '#7b7bf5' }} /> ผลการทดลองทั้งหมด ({experiments.length})</h3>
                    <table className="data-table">
                        <thead>
                            <tr><th>รหัส</th><th>โครงการ</th><th>ชื่อการทดลอง</th><th>วันที่</th><th>ผลลัพธ์</th><th>หมายเหตุ</th></tr>
                        </thead>
                        <tbody>
                            {experiments.map(exp => (
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
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Formula Detail Modal (ดูรายละเอียด + ต้นทุน)
    // ══════════════════════════════════════════════════════════════════
    const renderFormulaModal = () => {
        if (!selectedFormula || showEditFormula) return null;
        const f = selectedFormula;
        const batchCost = calcBatchCost(f);

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
                        <div className="rnd-modal-info-grid">
                            <div className="rnd-modal-info-item">
                                <label>ขนาดต่อ Batch</label>
                                <span>{f.batchSize?.toLocaleString()} {f.unit}</span>
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

                        {/* ต้นทุนต่อ Batch (#6) */}
                        <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: 16, margin: '16px 0' }}>
                            <strong style={{ color: '#059669', fontSize: 14 }}>💰 ต้นทุนวัตถุดิบต่อ Batch</strong>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#065f46', marginTop: 4 }}>
                                ฿{batchCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                                ต่อหน่วย: ฿{f.batchSize ? (batchCost / f.batchSize).toFixed(2) : '—'} / {f.unit}
                            </div>
                        </div>

                        {f.description && (
                            <div className="rnd-modal-description">
                                <h4>คำอธิบาย</h4>
                                <p>{f.description}</p>
                            </div>
                        )}

                        <div className="rnd-modal-section">
                            <h4><Beaker size={16} /> วัตถุดิบที่ใช้ ({f.ingredients?.length} รายการ)</h4>
                            <table className="data-table rnd-ingredients-table">
                                <thead>
                                    <tr><th>#</th><th>รหัส</th><th>ชื่อวัตถุดิบ</th><th>ปริมาณ / Batch</th><th>หน่วย</th><th>ราคา/หน่วย</th><th>ต้นทุน</th></tr>
                                </thead>
                                <tbody>
                                    {f.ingredients?.map((ing, idx) => {
                                        const mat = materials.find(m => m.id === ing.materialId);
                                        const cost = mat ? mat.costPerUnit * ing.qty : 0;
                                        return (
                                            <tr key={idx}>
                                                <td>{idx + 1}</td>
                                                <td className="text-bold">{ing.materialId}</td>
                                                <td>{ing.name}</td>
                                                <td style={{ fontWeight: 600 }}>{ing.qty}</td>
                                                <td>{ing.unit}</td>
                                                <td style={{ color: '#6b7280' }}>{mat ? `฿${mat.costPerUnit.toLocaleString()}` : '—'}</td>
                                                <td style={{ fontWeight: 600, color: '#059669' }}>฿{cost.toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {f.instructions?.length > 0 && (
                            <div className="rnd-modal-section">
                                <h4><ListChecks size={16} /> วิธีการผลิต ({f.instructions.length} ขั้นตอน)</h4>
                                <ol className="rnd-instructions-list">
                                    {f.instructions.map((step, idx) => (<li key={idx}>{step}</li>))}
                                </ol>
                            </div>
                        )}

                        {/* Workflow buttons */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                            <button className="btn-sm" onClick={() => openEditFormula(f)}>✏️ แก้ไขสูตร</button>
                            <button className="btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => handleDeleteFormula(f.id, f.name)}>🗑️ ลบสูตร</button>
                            {f.status === 'ร่าง' && <button className="btn-sm" style={{ background: '#fef3c7', color: '#92400e' }} onClick={() => { handleStatusChange(f, 'รอทดสอบ'); setSelectedFormula(null); }}>🧪 ส่งให้ QC ทดสอบ</button>}
                            {f.status === 'ทดสอบผ่าน' && <button className="btn-sm" style={{ background: '#ede9fe', color: '#5b21b6' }} onClick={() => { handleStatusChange(f, 'รอเภสัชกร'); setSelectedFormula(null); }}>🏥 ส่งให้เภสัชกร</button>}
                            {f.status === 'รอเภสัชกร' && <button className="btn-sm" style={{ background: '#d1fae5', color: '#065f46' }} onClick={async () => { const res = await pharmApprove(f.id, 'เภสัชกร', true); if (res.success) { alert('อนุมัติสำเร็จ!'); setSelectedFormula(null); } }}>✅ เภสัชกรอนุมัติ</button>}
                            {f.status === 'รอเภสัชกร' && <button className="btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={async () => { const res = await pharmApprove(f.id, 'เภสัชกร', false); if (res.success) { alert('ไม่อนุมัติ'); setSelectedFormula(null); } }}>❌ เภสัชกรไม่อนุมัติ</button>}
                            {(f.status === 'ทดสอบไม่ผ่าน' || f.status === 'เภสัชกรไม่อนุมัติ') && <button className="btn-sm" style={{ background: '#fef3c7', color: '#92400e' }} onClick={() => { handleStatusChange(f, 'ร่าง'); setSelectedFormula(null); }}>↩️ กลับไปแก้ไข</button>}
                        </div>

                        {/* Status info */}
                        <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>
                            <strong>🔄 Flow:</strong> ร่าง → <span style={{ color: '#f59e0b' }}>รอทดสอบ (QC)</span> → <span style={{ color: '#2563eb' }}>ทดสอบผ่าน</span> → <span style={{ color: '#7c3aed' }}>รอเภสัชกร</span> → <span style={{ color: '#059669' }}>อนุมัติ ✅</span>
                            {f.qcApprovedBy && <div style={{ marginTop: 4 }}>🧪 QC: {f.qcApprovedBy} ({f.qcApprovedDate})</div>}
                            {f.pharmApprovedBy && <div>🏥 เภสัชกร: {f.pharmApprovedBy} ({f.pharmApprovedDate})</div>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Formula Create/Edit Modal (#1, #2)
    // ══════════════════════════════════════════════════════════════════
    const renderFormulaFormModal = () => {
        const isEdit = showEditFormula;
        if (!showCreateFormula && !showEditFormula) return null;

        return (
            <div className="rnd-modal-overlay" onClick={() => { setShowCreateFormula(false); setShowEditFormula(false); }}>
                <div className="rnd-modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>{isEdit ? '✏️ แก้ไขสูตร' : '➕ สร้างสูตรใหม่'}</h2>
                            <div className="rnd-modal-meta"><span className="badge badge-primary">{isEdit ? selectedFormula?.id : 'New Formula'}</span></div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => { setShowCreateFormula(false); setShowEditFormula(false); }}><XCircle size={22} /></button>
                    </div>
                    <div className="rnd-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {/* ข้อมูลทั่วไป */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FlaskConical size={16} style={{ color: '#7b7bf5' }} /> ข้อมูลทั่วไป
                        </h4>
                        <div className="rnd-modal-info-grid" style={{ marginBottom: 20 }}>
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>ชื่อสูตร <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" style={inputStyle} value={formulaForm.name} onChange={e => setFormulaForm({ ...formulaForm, name: e.target.value })} placeholder="เช่น ยาดมสมุนไพร สูตรเย็น" />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>หมวดหมู่</label>
                                <select style={inputStyle} value={formulaForm.category} onChange={e => setFormulaForm({ ...formulaForm, category: e.target.value })}>
                                    <option>ยาดม</option><option>Skincare</option><option>น้ำมันนวด</option><option>เครื่องดื่ม</option><option>สุขอนามัย</option><option>Essential Oil</option>
                                </select>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>เวอร์ชัน</label>
                                <input type="text" style={inputStyle} value={formulaForm.version} onChange={e => setFormulaForm({ ...formulaForm, version: e.target.value })} />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>Batch Size</label>
                                <input type="number" style={inputStyle} value={formulaForm.batchSize} onChange={e => setFormulaForm({ ...formulaForm, batchSize: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>หน่วย</label>
                                <input type="text" style={inputStyle} value={formulaForm.unit} onChange={e => setFormulaForm({ ...formulaForm, unit: e.target.value })} placeholder="เช่น ชิ้น, กระปุก" />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>อายุสินค้า</label>
                                <input type="text" style={inputStyle} value={formulaForm.shelfLife} onChange={e => setFormulaForm({ ...formulaForm, shelfLife: e.target.value })} placeholder="เช่น 24 เดือน" />
                            </div>
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>คำอธิบาย</label>
                                <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={formulaForm.description} onChange={e => setFormulaForm({ ...formulaForm, description: e.target.value })} />
                            </div>
                        </div>

                        {/* วัตถุดิบ */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Beaker size={16} style={{ color: '#1e88e5' }} /> วัตถุดิบ ({formulaForm.ingredients.length} รายการ)
                        </h4>
                        {formulaForm.ingredients.map((ing, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                <select style={{ ...inputStyle, flex: 2 }} value={ing.materialId} onChange={e => updateIngredient(idx, 'materialId', e.target.value)}>
                                    <option value="">-- เลือกวัตถุดิบ --</option>
                                    {materials.map(m => <option key={m.id} value={m.id}>{m.id} — {m.name} ({m.unit})</option>)}
                                </select>
                                <input type="number" style={{ ...inputStyle, flex: 0.5 }} placeholder="จำนวน" value={ing.qty || ''} onChange={e => updateIngredient(idx, 'qty', parseFloat(e.target.value) || 0)} />
                                <span style={{ color: '#6b7280', fontSize: 13, minWidth: 30 }}>{ing.unit}</span>
                                <button onClick={() => removeIngredient(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                            </div>
                        ))}
                        <button className="btn-sm" onClick={addIngredient} style={{ marginBottom: 20 }}><Plus size={14} /> เพิ่มวัตถุดิบ</button>

                        {/* วิธีการผลิต */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ListChecks size={16} style={{ color: '#f59e0b' }} /> วิธีการผลิต ({formulaForm.instructions.length} ขั้นตอน)
                        </h4>
                        {formulaForm.instructions.map((step, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, color: '#6b7280', minWidth: 24 }}>{idx + 1}.</span>
                                <input type="text" style={{ ...inputStyle, flex: 1 }} value={step} onChange={e => updateInstruction(idx, e.target.value)} placeholder={`ขั้นตอนที่ ${idx + 1}`} />
                                <button onClick={() => removeInstruction(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                            </div>
                        ))}
                        <button className="btn-sm" onClick={addInstruction}><Plus size={14} /> เพิ่มขั้นตอน</button>
                    </div>
                    <div className="rnd-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
                        <button className="btn-secondary" onClick={() => { setShowCreateFormula(false); setShowEditFormula(false); }}>ยกเลิก</button>
                        <button className="btn-primary" onClick={isEdit ? handleEditFormula : handleCreateFormula} disabled={saving}>
                            {saving ? 'กำลังบันทึก...' : isEdit ? '✅ บันทึกการแก้ไข' : '📝 บันทึกฉบับร่าง'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Create Project Modal (#4)
    // ══════════════════════════════════════════════════════════════════
    const renderCreateProjectModal = () => {
        if (!showCreateProject) return null;
        return (
            <div className="rnd-modal-overlay" onClick={() => setShowCreateProject(false)}>
                <div className="rnd-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <h2>➕ สร้างโครงการวิจัยใหม่</h2>
                        <button className="rnd-modal-close" onClick={() => setShowCreateProject(false)}><XCircle size={22} /></button>
                    </div>
                    <div className="rnd-modal-body">
                        <div className="rnd-modal-info-grid">
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>ชื่อโครงการ <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" style={inputStyle} value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="เช่น พัฒนาสูตรครีมขมิ้นชัน V3" />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>หมวดหมู่</label>
                                <select style={inputStyle} value={projectForm.category} onChange={e => setProjectForm({ ...projectForm, category: e.target.value })}>
                                    <option value="">-- เลือก --</option>
                                    <option>Skincare</option><option>Essential Oil</option><option>เครื่องดื่ม</option><option>น้ำมันนวด</option><option>สุขอนามัย</option><option>ยาดม</option>
                                </select>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>นักวิจัย</label>
                                <input type="text" style={inputStyle} value={projectForm.researcher} onChange={e => setProjectForm({ ...projectForm, researcher: e.target.value })} placeholder="ชื่อนักวิจัย" />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>วันเริ่มต้น</label>
                                <input type="date" style={inputStyle} value={projectForm.startDate} onChange={e => setProjectForm({ ...projectForm, startDate: e.target.value })} />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>วันเป้าหมาย</label>
                                <input type="date" style={inputStyle} value={projectForm.targetDate} onChange={e => setProjectForm({ ...projectForm, targetDate: e.target.value })} />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>สูตรอ้างอิง (ถ้ามี)</label>
                                <select style={inputStyle} value={projectForm.formulaRef} onChange={e => setProjectForm({ ...projectForm, formulaRef: e.target.value })}>
                                    <option value="">-- ไม่มี --</option>
                                    {formulas.map(f => <option key={f.id} value={f.id}>{f.id} — {f.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="rnd-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
                        <button className="btn-secondary" onClick={() => setShowCreateProject(false)}>ยกเลิก</button>
                        <button className="btn-primary" onClick={handleCreateProject} disabled={saving}>{saving ? 'กำลังสร้าง...' : '✅ สร้างโครงการ'}</button>
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Create Experiment Modal (#5)
    // ══════════════════════════════════════════════════════════════════
    const renderCreateExperimentModal = () => {
        if (!showCreateExperiment) return null;
        return (
            <div className="rnd-modal-overlay" onClick={() => setShowCreateExperiment(false)}>
                <div className="rnd-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <h2>🧪 บันทึกผลการทดลอง</h2>
                        <button className="rnd-modal-close" onClick={() => setShowCreateExperiment(false)}><XCircle size={22} /></button>
                    </div>
                    <div className="rnd-modal-body">
                        <div className="rnd-modal-info-grid">
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>โครงการ <span style={{ color: '#ef4444' }}>*</span></label>
                                <select style={inputStyle} value={experimentForm.projectCode} onChange={e => setExperimentForm({ ...experimentForm, projectCode: e.target.value })}>
                                    <option value="">-- เลือกโครงการ --</option>
                                    {projects.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
                                </select>
                            </div>
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>ชื่อการทดลอง <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" style={inputStyle} value={experimentForm.name} onChange={e => setExperimentForm({ ...experimentForm, name: e.target.value })} placeholder="เช่น ทดสอบค่า pH ครั้งที่ 2" />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>วันที่ทดลอง</label>
                                <input type="date" style={inputStyle} value={experimentForm.date} onChange={e => setExperimentForm({ ...experimentForm, date: e.target.value })} />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>ผลลัพธ์</label>
                                <select style={inputStyle} value={experimentForm.result} onChange={e => setExperimentForm({ ...experimentForm, result: e.target.value })}>
                                    <option value="รอผล">รอผล</option><option value="ผ่าน">ผ่าน</option><option value="ไม่ผ่าน">ไม่ผ่าน</option>
                                </select>
                            </div>
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>หมายเหตุ</label>
                                <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={experimentForm.note} onChange={e => setExperimentForm({ ...experimentForm, note: e.target.value })} placeholder="รายละเอียดผลทดลอง..." />
                            </div>
                        </div>
                    </div>
                    <div className="rnd-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
                        <button className="btn-secondary" onClick={() => setShowCreateExperiment(false)}>ยกเลิก</button>
                        <button className="btn-primary" onClick={handleCreateExperiment} disabled={saving}>{saving ? 'กำลังบันทึก...' : '✅ บันทึกผลทดลอง'}</button>
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // 4. เภสัชกรอนุมัติ (Pharmacist Approval)
    // ══════════════════════════════════════════════════════════════════
    const renderPharmacist = () => {
        const pharmFormulas = formulas.filter(f => ['รอเภสัชกร', 'เภสัชกรไม่อนุมัติ', 'อนุมัติ'].includes(f.status));
        const pendingFormulas = formulas.filter(f => f.status === 'รอเภสัชกร');
        
        return (
            <div className="rnd-pharmacist">
                <div className="page-title">
                    <h1>เภสัชกร</h1>
                    <p>ตรวจสอบความถูกต้องของสูตรตามกฎหมายและอนุมัติการผลิต</p>
                </div>

                {pendingFormulas.length > 0 && (
                    <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #7c3aed' }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#5b21b6' }}>⚠️ รอเภสัชกรอนุมัติ ({pendingFormulas.length} รายการ)</h3>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {pendingFormulas.map(f => (
                                <button key={f.id} className="btn-sm" style={{ background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd' }}
                                    onClick={() => setSelectedFormula(f)}>
                                    🏥 {f.id} — {f.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {hasSectionPermission('rnd_pharmacist_approve') && (
                    <div className="card table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>รหัสสูตร</th><th>ชื่อผลิตภัณฑ์</th><th>หมวดหมู่</th>
                                    <th>ผู้ทดสอบ (QC)</th><th>วันที่ QC ผ่าน</th>
                                    <th>สถานะ</th><th>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pharmFormulas.map(formula => (
                                    <tr key={formula.id}>
                                        <td className="text-bold">{formula.id}</td>
                                        <td>{formula.name}</td>
                                        <td><span className="badge badge-info">{formula.category}</span></td>
                                        <td>{formula.qcApprovedBy || '-'}</td>
                                        <td>{formula.qcApprovedDate || '-'}</td>
                                        <td><span className={`badge ${getStatusColor(formula.status)}`}>{formula.status}</span></td>
                                        <td>
                                            <button className="btn-sm" onClick={() => setSelectedFormula(formula)} title="ดูรายละเอียดและอนุมัติ"><Eye size={14} /> ตรวจสอบ</button>
                                        </td>
                                    </tr>
                                ))}
                                {pharmFormulas.length === 0 && (
                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่มีรายการที่รอการตรวจสอบจากเภสัชกร</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
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
            {currentTab === 'rnd_pharmacist' && renderPharmacist()}
            {renderFormulaModal()}
            {renderFormulaFormModal()}
            {renderCreateProjectModal()}
            {renderCreateExperimentModal()}
        </div>
    );
}

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 };

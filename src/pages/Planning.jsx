/**
 * =============================================================================
 * Planning.jsx — หน้าวางแผนการผลิต (เขียนใหม่)
 * =============================================================================
 * ประกอบด้วย 5 sub-pages:
 *   1. Planning Overview      — Dashboard ภาพรวมแผนการผลิต
 *   2. ใบสั่งผลิต (Job Order) — ตาราง Job Orders อ้างอิงสูตรจาก R&D
 *   3. ความต้องการวัตถุดิบ    — BOM Explosion คำนวณวัตถุดิบรวม
 *   4. Gantt / Timeline       — Placeholder
 *   5. เชื่อมโยง QC           — Placeholder
 *
 * Data: ดึงจาก productionMockData.js (shared กับ R&D/Production)
 * =============================================================================
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Search, Plus, Filter, CalendarDays, PieChart, Activity,
    CheckCircle, Wrench, Package, ClipboardList, AlertTriangle,
    ArrowRight, Eye, XCircle, Beaker, TrendingUp, Clock, Play
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { useRnD } from '../context/RnDContext';
import { useAlert } from '../components/CustomAlert';
import './PageCommon.css';
import './Planning.css';

export default function Planning() {
    const { getVisibleSubPages, hasSectionPermission } = useAuth();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('planning');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;
    const { jobs, loading, releaseJobOrder, createJob } = usePlanner();
    const { formulas: MOCK_FORMULAS, materials: MOCK_RAW_MATERIALS } = useRnD();
    const { showAlert, showConfirm } = useAlert();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ทั้งหมด');
    const [selectedJob, setSelectedJob] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        formulaId: '',
        formulaName: '',
        batchQty: 1,
        batchSize: 0,
        totalQty: 0,
        unit: '',
        priority: 'ปกติ',
        planDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        assignedLine: 'Line A',
        notes: '',
        customerName: '',
        customerPO: '',
        productionType: 'ผลิตตามแผน',
    });

    // Handle formula selection in create form
    const handleFormulaSelect = (formulaId) => {
        const formula = MOCK_FORMULAS.find(f => f.id === formulaId);
        if (formula) {
            const batchQty = createForm.batchQty || 1;
            setCreateForm(prev => ({
                ...prev,
                formulaId: formula.id,
                formulaName: formula.name,
                batchSize: formula.batchSize,
                unit: formula.unit,
                totalQty: batchQty * formula.batchSize,
            }));
        }
    };

    // Handle total qty change
    const handleTotalQtyChange = (val) => {
        const qty = parseInt(val) || 0;
        setCreateForm(prev => {
            const bSize = prev.batchSize > 0 ? prev.batchSize : 1;
            const bQty = Math.ceil(qty / bSize);
            return { ...prev, totalQty: qty, batchQty: bQty };
        });
    };

    // Submit create form
    const handleCreateSubmit = async () => {
        if (!createForm.formulaId) return showAlert('ข้อมูลไม่ครบ', 'กรุณาเลือกสูตรการผลิต', 'warning');
        if (!createForm.batchQty || createForm.batchQty < 1) return showAlert('ข้อมูลไม่ครบ', 'กรุณาระบุจำนวน Batch', 'warning');
        if (!createForm.dueDate) return showAlert('ข้อมูลไม่ครบ', 'กรุณาระบุวันกำหนดเสร็จ', 'warning');
        setIsCreating(true);
        const res = await createJob(createForm);
        setIsCreating(false);
        if (res.success) {
            await showAlert('สำเร็จ', 'สร้างใบสั่งผลิตสำเร็จ!', 'success');
            setShowCreateModal(false);
            setCreateForm({
                formulaId: '', formulaName: '', batchQty: 1, batchSize: 0, totalQty: 0, unit: '',
                priority: 'ปกติ', planDate: new Date().toISOString().split('T')[0], dueDate: '',
                assignedLine: 'Line A', notes: '', customerName: '', customerPO: '', productionType: 'ผลิตตามแผน',
            });
        } else {
            showAlert('เกิดข้อผิดพลาด', 'สร้างไม่สำเร็จ: ' + res.message, 'error');
        }
    };

    // ── Stats ──
    const totalJobs = jobs.length;
    const inProgressJobs = jobs.filter(j => j.status === 'กำลังผลิต').length;
    const waitingJobs = jobs.filter(j => j.status === 'รอผลิต' || j.status === 'รอเริ่มงาน').length;
    const completedJobs = jobs.filter(j => j.status === 'เสร็จสิ้น').length;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'กำลังผลิต': return 'status-warning';
            case 'รอผลิต': return 'status-info';
            case 'รอเริ่มงาน': return 'status-primary'; // A bluish-purple badge
            case 'เสร็จสิ้น': return 'status-success';
            default: return 'status-gray';
        }
    };

    const getPriorityBadge = (priority) => {
        switch (priority) {
            case 'สูง': return 'badge-danger';
            case 'ปกติ': return 'badge-success';
            case 'ต่ำ': return 'badge-info';
            default: return 'badge-neutral';
        }
    };

    const getLineBadge = (line) => {
        switch (line) {
            case 'Line A': return 'badge-info';
            case 'Line B': return 'badge-warning';
            case 'Line C': return 'badge-success';
            default: return 'badge-neutral';
        }
    };

    // ══════════════════════════════════════════════════════════════════
    // 1. Planning Overview (Dashboard)
    // ══════════════════════════════════════════════════════════════════
    const renderOverview = () => (
        <div className="planning-overview">
            <div className="page-title">
                <h1>Planning Overview</h1>
                <p>ภาพรวมการวางแผนการผลิต — ข้อมูลสูตรจาก R&D</p>
            </div>

            {hasSectionPermission('planning_overview_stats') && (
                <div className="summary-row">
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#f0ebff', color: '#7b7bf5' }}><ClipboardList size={20} /></div>
                        <div><span className="summary-label">ใบสั่งผลิตทั้งหมด</span><span className="summary-value">{totalJobs}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#fff8e1', color: '#f9a825' }}><Activity size={20} /></div>
                        <div><span className="summary-label">กำลังผลิต</span><span className="summary-value">{inProgressJobs}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#e3f2fd', color: '#1e88e5' }}><Clock size={20} /></div>
                        <div><span className="summary-label">รอผลิต</span><span className="summary-value">{waitingJobs}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#ecfdf5', color: '#059669' }}><CheckCircle size={20} /></div>
                        <div><span className="summary-label">เสร็จสิ้น</span><span className="summary-value">{completedJobs}</span></div>
                    </div>
                </div>
            )}

            {/* สูตรที่พร้อมใช้งาน (จาก R&D) */}
            <div className="card" style={{ marginBottom: 16 }}>
                <h3 className="plan-card-title"><Beaker size={16} style={{ color: '#7b7bf5' }} /> สูตรที่พร้อมใช้งาน (จาก R&D)</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>สูตรที่ผ่านการอนุมัติแล้ว สามารถนำมาเปิดใบสั่งผลิตได้</p>
                <div className="plan-formula-grid">
                    {MOCK_FORMULAS.filter(f => f.status === 'อนุมัติ').map(f => (
                        <div key={f.id} className="plan-formula-card">
                            <div className="plan-formula-top">
                                <span className="plan-formula-code">{f.id}</span>
                                <span className="badge badge-success">พร้อมผลิต</span>
                            </div>
                            <div className="plan-formula-name">{f.name}</div>
                            <div className="plan-formula-meta">
                                <span>{f.batchSize.toLocaleString()} {f.unit}/batch</span>
                                <span>{f.ingredients.length} วัตถุดิบ</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Job Orders ล่าสุด */}
            <div className="card">
                <h3 className="plan-card-title"><ClipboardList size={16} style={{ color: '#1e88e5' }} /> ใบสั่งผลิตล่าสุด</h3>
                <div className="table-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>เลขที่</th>
                                <th>ผลิตภัณฑ์</th>
                                <th>จำนวน</th>
                                <th>สถานะ</th>
                                <th>Progress</th>
                                <th>กำหนดเสร็จ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล...</td></tr>
                            ) : jobs.slice(0, 3).map(job => (
                                <tr key={job.id}>
                                    <td className="text-bold" style={{ whiteSpace: 'nowrap' }}>{job.id}</td>
                                    <td>{job.formulaName}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{job.totalQty.toLocaleString()} {job.unit}</td>
                                    <td><span className={`status-badge ${getStatusBadge(job.status)}`}>{job.status}</span></td>
                                    <td>
                                        <div className="progress-container">
                                            <div className="progress-bar" style={{ width: `${job.progress}%`, backgroundColor: job.status === 'เสร็จสิ้น' ? 'var(--success)' : 'var(--primary)' }}></div>
                                            <span className="progress-text">{job.progress}%</span>
                                        </div>
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{job.dueDate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════
    // 2. ใบสั่งผลิต (Job Order List)
    // ══════════════════════════════════════════════════════════════════
    const handleReleaseJob = async (jobId) => {
        const ok = await showConfirm('ยืนยันการส่งงาน', `ยืนยันการส่งใบสั่งผลิต ${jobId} ให้ฝ่ายผลิต?\nระบบจะทำการตั้งคิวงานใหม่ทันที`, 'info');
        if (!ok) return;
        const res = await releaseJobOrder(jobId);
        if (res.success) {
            showAlert('สำเร็จ', 'ส่งงานให้ฝ่ายผลิตเรียบร้อยแล้ว! สามารถดูคิวงานได้ที่หน้าฝ่ายผลิต', 'success');
        } else {
            showAlert('เกิดข้อผิดพลาด', res.message, 'error');
        }
    };
    const renderPlanList = () => {
        const statuses = ['ทั้งหมด', 'รอผลิต', 'รอเริ่มงาน', 'กำลังผลิต', 'เสร็จสิ้น'];
        const filtered = jobs.filter(j => {
            const matchSearch = j.formulaName.includes(searchTerm) || j.id.includes(searchTerm);
            const matchStatus = statusFilter === 'ทั้งหมด' || j.status === statusFilter;
            return matchSearch && matchStatus;
        });

        return (
            <div className="planning-list">
                <div className="page-title">
                    <h1>ใบสั่งผลิต (Job Order)</h1>
                    <p>สร้างและจัดการใบสั่งผลิตโดยอ้างอิงสูตรจาก R&D</p>
                </div>

                <div className="toolbar">
                    <div className="toolbar-left">
                        {hasSectionPermission('planning_list_search') && (
                            <div className="search-box">
                                <Search size={16} />
                                <input type="text" placeholder="ค้นหาใบสั่งผลิต..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        )}
                        <div className="plan-filter-group">
                            {statuses.map(s => (
                                <button key={s} className={`plan-filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    {hasSectionPermission('planning_list_action') && (
                        <button className="btn-primary" onClick={() => setShowCreateModal(true)}><Plus size={16} /> สร้างใบสั่งผลิต</button>
                    )}
                </div>

                {hasSectionPermission('planning_list_table') && (
                    <div className="card table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>เลขที่</th>
                                    <th>สูตร (จาก R&D)</th>
                                    <th>ผลิตภัณฑ์</th>
                                    <th>จำนวน Batch</th>
                                    <th>จำนวนรวม</th>
                                    <th>ความสำคัญ</th>
                                    <th>ไลน์ผลิต</th>
                                    <th>วันที่ผลิต</th>
                                    <th>กำหนดเสร็จ</th>
                                    <th>สถานะ</th>
                                    <th>Progress</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(job => (
                                    <tr key={job.id}>
                                        <td className="text-bold" style={{ whiteSpace: 'nowrap' }}>{job.id}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}><span className="plan-formula-ref">{job.formulaId}</span></td>
                                        <td>{job.formulaName}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{job.batchQty} batch</td>
                                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{job.totalQty.toLocaleString()} {job.unit}</td>
                                        <td><span className={`badge ${getPriorityBadge(job.priority)}`}>{job.priority}</span></td>
                                        <td><span className={`badge ${getLineBadge(job.assignedLine)}`}>{job.assignedLine}</span></td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{job.planDate}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{job.dueDate}</td>
                                        <td><span className={`status-badge ${getStatusBadge(job.status)}`}>{job.status}</span></td>
                                        <td>
                                            <div className="progress-container">
                                                <div className="progress-bar" style={{ width: `${job.progress}%`, backgroundColor: job.status === 'เสร็จสิ้น' ? 'var(--success)' : 'var(--primary)' }}></div>
                                                <span className="progress-text">{job.progress}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <button className="btn-sm" onClick={() => setSelectedJob(job)}><Eye size={14} /></button>
                                                {job.status === 'รอผลิต' && (
                                                    <button 
                                                        className="btn-sm" 
                                                        style={{ background: '#e0e7ff', color: '#4338ca' }} 
                                                        title="ปล่อยให้ฝ่ายผลิต" 
                                                        onClick={() => handleReleaseJob(job.id)}
                                                    >
                                                        <Play size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan="12" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่พบข้อมูล</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // 3. ความต้องการวัตถุดิบ (Material Requirement / BOM Explosion)
    // ══════════════════════════════════════════════════════════════════
    const renderMaterials = () => {
        // คำนวณ BOM Explosion จาก Job Orders ที่ยังไม่เสร็จ
        const activeJobs = jobs.filter(j => j.status === 'กำลังผลิต' || j.status === 'รอผลิต');
        const materialRequirements = {};

        activeJobs.forEach(job => {
            const formula = MOCK_FORMULAS.find(f => f.id === job.formulaId);
            if (!formula) return;

            formula.ingredients.forEach(ing => {
                const key = ing.materialId;
                const requiredQty = ing.qty * job.batchQty;
                if (materialRequirements[key]) {
                    materialRequirements[key].requiredQty += requiredQty;
                    materialRequirements[key].jobs.push(job.id);
                } else {
                    const rm = MOCK_RAW_MATERIALS.find(m => m.id === ing.materialId);
                    materialRequirements[key] = {
                        materialId: ing.materialId,
                        name: ing.name,
                        unit: ing.unit,
                        requiredQty: requiredQty,
                        currentStock: rm ? rm.stock : 0,
                        minStock: rm ? rm.minStock : 0,
                        costPerUnit: rm ? rm.costPerUnit : 0,
                        jobs: [job.id],
                    };
                }
            });
        });

        const materialList = Object.values(materialRequirements);
        const totalCost = materialList.reduce((sum, m) => sum + (m.requiredQty * m.costPerUnit), 0);

        return (
            <div className="planning-materials">
                <div className="page-title">
                    <h1>ความต้องการวัตถุดิบ (BOM Explosion)</h1>
                    <p>คำนวณวัตถุดิบรวมจากใบสั่งผลิตที่ยังดำเนินอยู่ ({activeJobs.length} ใบสั่ง)</p>
                </div>

                <div className="summary-row">
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#f0ebff', color: '#7b7bf5' }}><Package size={20} /></div>
                        <div><span className="summary-label">วัตถุดิบที่ต้องใช้</span><span className="summary-value">{materialList.length} รายการ</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#fff8e1', color: '#f9a825' }}><AlertTriangle size={20} /></div>
                        <div><span className="summary-label">ไม่เพียงพอ</span><span className="summary-value">{materialList.filter(m => m.currentStock < m.requiredQty).length} รายการ</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#e3f2fd', color: '#1e88e5' }}><TrendingUp size={20} /></div>
                        <div><span className="summary-label">ต้นทุนวัตถุดิบรวม</span><span className="summary-value">฿{totalCost.toLocaleString()}</span></div>
                    </div>
                </div>

                <div className="card table-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>รหัส</th>
                                <th>ชื่อวัตถุดิบ</th>
                                <th>ต้องการ</th>
                                <th>สต็อกปัจจุบัน</th>
                                <th>หน่วย</th>
                                <th>สถานะ</th>
                                <th>ต้นทุน</th>
                                <th>ใบสั่งผลิต</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materialList.map(m => {
                                const isShort = m.currentStock < m.requiredQty;
                                return (
                                    <tr key={m.materialId} className={isShort ? 'plan-row-warning' : ''}>
                                        <td className="text-bold">{m.materialId}</td>
                                        <td>{m.name}</td>
                                        <td style={{ fontWeight: 700 }}>{m.requiredQty}</td>
                                        <td style={{ color: isShort ? '#ef4444' : '#059669', fontWeight: 600 }}>{m.currentStock}</td>
                                        <td>{m.unit}</td>
                                        <td>
                                            {isShort ? (
                                                <span className="badge badge-danger">ไม่เพียงพอ (-{(m.requiredQty - m.currentStock).toFixed(1)})</span>
                                            ) : (
                                                <span className="badge badge-success">เพียงพอ</span>
                                            )}
                                        </td>
                                        <td>฿{(m.requiredQty * m.costPerUnit).toLocaleString()}</td>
                                        <td>
                                            <div className="plan-job-tags">
                                                {m.jobs.map(j => <span key={j} className="plan-job-tag">{j}</span>)}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // 4. Gantt Chart (Placeholder)
    // ══════════════════════════════════════════════════════════════════
    const renderGantt = () => (
        <div className="planning-gantt">
            <div className="page-title">
                <h1>Gantt Chart & Timeline</h1>
                <p>แผนภูมิแสดงช่วงเวลาการผลิตแต่ละรายการ</p>
            </div>

            <div className="card">
                {/* Simple timeline bars */}
                <div className="plan-timeline">
                    {jobs.filter(j => j.status !== 'เสร็จสิ้น').map(job => (
                        <div key={job.id} className="plan-timeline-row">
                            <div className="plan-timeline-label">
                                <span className="plan-timeline-id">{job.id}</span>
                                <span className="plan-timeline-name">{job.formulaName}</span>
                            </div>
                            <div className="plan-timeline-bar-container">
                                <div className="plan-timeline-bar"
                                    style={{
                                        width: `${Math.max(job.progress, 10)}%`,
                                        background: (job.status === 'รอผลิต' || job.status === 'รอเริ่มงาน') ? '#e2e8f0' : 'linear-gradient(90deg, #7b7bf5, #a78bfa)'
                                    }}>
                                    <span>{job.progress}%</span>
                                </div>
                                <div className="plan-timeline-dates">
                                    <span>{job.planDate}</span>
                                    <ArrowRight size={12} />
                                    <span>{job.dueDate}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════
    // 5. QC Link (Placeholder)
    // ══════════════════════════════════════════════════════════════════
    const renderQCLink = () => (
        <div className="planning-qc">
            <div className="page-title">
                <h1>เชื่อมโยงผลการตรวจสอบคุณภาพ (QC)</h1>
                <p>สถานะ QC ของแต่ละใบสั่งผลิต</p>
            </div>

            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                <CheckCircle size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
                <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 8px' }}>กำลังพัฒนา</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>อัปเดตสถานะอัตโนมัติเมื่อฝ่าย QC ป้อนผลตรวจ</p>
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════
    // Job Order Detail Modal
    // ══════════════════════════════════════════════════════════════════
    const renderJobModal = () => {
        if (!selectedJob) return null;
        const job = selectedJob;
        const formula = MOCK_FORMULAS.find(f => f.id === job.formulaId);

        return (
            <div className="rnd-modal-overlay" onClick={() => setSelectedJob(null)}>
                <div className="rnd-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>ใบสั่งผลิต {job.id}</h2>
                            <div className="rnd-modal-meta">
                                <span className={`status-badge ${getStatusBadge(job.status)}`}>{job.status}</span>
                                <span className={`badge ${getPriorityBadge(job.priority)}`}>ความสำคัญ: {job.priority}</span>
                                <span className={`badge ${getLineBadge(job.assignedLine)}`}>{job.assignedLine}</span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => setSelectedJob(null)}><XCircle size={22} /></button>
                    </div>

                    <div className="rnd-modal-body">
                        <div className="rnd-modal-info-grid">
                            <div className="rnd-modal-info-item">
                                <label>ผลิตภัณฑ์</label>
                                <span>{job.formulaName}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>สูตรอ้างอิง (R&D)</label>
                                <span style={{ color: '#2563eb' }}>{job.formulaId}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>จำนวน Batch</label>
                                <span>{job.batchQty} batch × {job.batchSize.toLocaleString()} = {job.totalQty.toLocaleString()} {job.unit}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>กำหนดเสร็จ</label>
                                <span>{job.dueDate}</span>
                            </div>
                        </div>

                        {job.notes && (
                            <div className="rnd-modal-description">
                                <h4>หมายเหตุ</h4>
                                <p>{job.notes}</p>
                            </div>
                        )}

                        {/* วัตถุดิบที่ต้องใช้สำหรับ Job นี้ */}
                        {formula && (
                            <div className="rnd-modal-section">
                                <h4><Package size={16} /> วัตถุดิบที่ต้องใช้ (คำนวณจากสูตร × {job.batchQty} batch)</h4>
                                <table className="data-table rnd-ingredients-table">
                                    <thead>
                                        <tr>
                                            <th>วัตถุดิบ</th>
                                            <th>ต่อ 1 Batch</th>
                                            <th>รวม ({job.batchQty} Batch)</th>
                                            <th>หน่วย</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formula.ingredients.map((ing, idx) => (
                                            <tr key={idx}>
                                                <td>{ing.name}</td>
                                                <td>{ing.qty}</td>
                                                <td style={{ fontWeight: 700 }}>{(ing.qty * job.batchQty).toFixed(1)}</td>
                                                <td>{ing.unit}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Create Job Order Modal
    // ══════════════════════════════════════════════════════════════════
    const renderCreateModal = () => {
        if (!showCreateModal) return null;
        const approvedFormulas = MOCK_FORMULAS.filter(f => f.status === 'อนุมัติ');
        const selectedFormula = MOCK_FORMULAS.find(f => f.id === createForm.formulaId);
        
        return (
            <div className="rnd-modal-overlay" onClick={() => setShowCreateModal(false)}>
                <div className="rnd-modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>สร้างใบสั่งผลิตใหม่</h2>
                            <div className="rnd-modal-meta">
                                <span className="badge badge-primary">Production Plan</span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => setShowCreateModal(false)}><XCircle size={22} /></button>
                    </div>
                    <div className="rnd-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {/* ── Section 1: สูตรการผลิต ── */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Beaker size={16} style={{ color: '#7b7bf5' }} /> เลือกสูตรการผลิต (จาก R&D)
                        </h4>
                        <div className="rnd-modal-info-grid" style={{ marginBottom: 20 }}>
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>สูตรที่อนุมัติแล้ว <span style={{ color: '#ef4444' }}>*</span></label>
                                <select 
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.formulaId} 
                                    onChange={(e) => handleFormulaSelect(e.target.value)}
                                >
                                    <option value="">-- เลือกสูตร --</option>
                                    {approvedFormulas.map(f => (
                                        <option key={f.id} value={f.id}>{f.id} — {f.name} ({f.batchSize} {f.unit}/batch)</option>
                                    ))}
                                </select>
                            </div>
                            {selectedFormula && (
                                <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1', background: '#f0fdf4', padding: 12, borderRadius: 8 }}>
                                    <label style={{ color: '#059669' }}>รายละเอียดสูตร</label>
                                    <span style={{ fontSize: 13 }}>
                                        {selectedFormula.description}<br/>
                                        <strong>Batch Size:</strong> {selectedFormula.batchSize} {selectedFormula.unit} | 
                                        <strong> อายุสินค้า:</strong> {selectedFormula.shelfLife} | 
                                        <strong> Version:</strong> {selectedFormula.version}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* ── Section 2: จำนวนการผลิต ── */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Package size={16} style={{ color: '#1e88e5' }} /> จำนวนการผลิต
                        </h4>
                        <div className="rnd-modal-info-grid" style={{ marginBottom: 20 }}>
                            <div className="rnd-modal-info-item">
                                <label>ยอดผลิตที่ต้องการรวม <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="number" min="1"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.totalQty}
                                    onChange={(e) => handleTotalQtyChange(e.target.value)}
                                    placeholder="ใส่จำนวณรวมที่ต้องการ"
                                />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>ขนาดต่อ Batch</label>
                                <span style={{ fontSize: 16, fontWeight: 700, color: '#7b7bf5' }}>
                                    {createForm.batchSize > 0 ? `${createForm.batchSize.toLocaleString()} ${createForm.unit}` : '—'}
                                </span>
                            </div>
                            <div className="rnd-modal-info-item" style={{ background: '#f0ebff', padding: 12, borderRadius: 8 }}>
                                <label style={{ color: '#7b7bf5', fontWeight: 700 }}>จำนวน Batch (จำนวนใบงาน)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                    <input 
                                        type="number" min="1"
                                        style={{ width: '80px', padding: '6px 12px', borderRadius: 8, border: '1.5px solid #c4b5fd', fontSize: 16, fontWeight: 700, color: '#5b21b6' }}
                                        value={createForm.batchQty}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, batchQty: parseInt(e.target.value) || 1 }))}
                                    />
                                    <span style={{ fontSize: 16, fontWeight: 800, color: '#5b21b6' }}>Batch</span>
                                </div>
                                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#7b7bf5' }}>* ระบบจะแยกเป็นหลายใบงานตามจำนวนเครื่องผสม สามารถแก้เป็น 1 ได้ถ้าต้องการใบเดียว</p>
                            </div>
                        </div>

                        {/* ── Section 3: การวางแผน ── */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CalendarDays size={16} style={{ color: '#f59e0b' }} /> การวางแผนและกำหนดการ
                        </h4>
                        <div className="rnd-modal-info-grid" style={{ marginBottom: 20 }}>
                            <div className="rnd-modal-info-item">
                                <label>ประเภทการผลิต</label>
                                <select style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.productionType}
                                    onChange={(e) => setCreateForm({...createForm, productionType: e.target.value})}
                                >
                                    <option value="ผลิตตามแผน">ผลิตตามแผน (MTS)</option>
                                    <option value="ผลิตตามออเดอร์">ผลิตตามออเดอร์ (OEM)</option>
                                    <option value="ผลิตเร่งด่วน">ผลิตเร่งด่วน (Urgent)</option>
                                    <option value="ผลิตทดสอบ">ผลิตทดสอบ (Trial Run)</option>
                                </select>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>ความสำคัญ <span style={{ color: '#ef4444' }}>*</span></label>
                                <select style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.priority}
                                    onChange={(e) => setCreateForm({...createForm, priority: e.target.value})}
                                >
                                    <option value="ต่ำ">ต่ำ</option>
                                    <option value="ปกติ">ปกติ</option>
                                    <option value="สูง">สูง (ด่วน)</option>
                                </select>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>วันเริ่มผลิต</label>
                                <input type="date" 
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.planDate}
                                    onChange={(e) => setCreateForm({...createForm, planDate: e.target.value})}
                                />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>กำหนดเสร็จ <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="date"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.dueDate}
                                    onChange={(e) => setCreateForm({...createForm, dueDate: e.target.value})}
                                />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>สายการผลิต (Production Line)</label>
                                <select style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.assignedLine}
                                    onChange={(e) => setCreateForm({...createForm, assignedLine: e.target.value})}
                                >
                                    <option value="Line A">Line A (สายหลัก)</option>
                                    <option value="Line B">Line B (สายรอง)</option>
                                    <option value="Line C">Line C (สารเคมี)</option>
                                </select>
                            </div>
                        </div>

                        {/* ── Section 4: ข้อมูลลูกค้า (ถ้ามี) ── */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ClipboardList size={16} style={{ color: '#059669' }} /> ข้อมูลเพิ่มเติม (ถ้ามี)
                        </h4>
                        <div className="rnd-modal-info-grid" style={{ marginBottom: 20 }}>
                            <div className="rnd-modal-info-item">
                                <label>ชื่อลูกค้า / บริษัท</label>
                                <input type="text" placeholder="เช่น บจก.สมุนไพรไทย"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.customerName}
                                    onChange={(e) => setCreateForm({...createForm, customerName: e.target.value})}
                                />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>เลขที่ PO / เลขอ้างอิง</label>
                                <input type="text" placeholder="เช่น PO-2026-0510"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.customerPO}
                                    onChange={(e) => setCreateForm({...createForm, customerPO: e.target.value})}
                                />
                            </div>
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>หมายเหตุ / คำสั่งพิเศษ</label>
                                <textarea rows={3} placeholder="เช่น ต้องติดฉลากภาษาอังกฤษ, ห่อพิเศษสำหรับส่งออก"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, resize: 'vertical' }}
                                    value={createForm.notes}
                                    onChange={(e) => setCreateForm({...createForm, notes: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* ── Summary ── */}
                        {createForm.formulaId && (
                            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: 16, marginBottom: 8 }}>
                                <strong style={{ color: '#1d4ed8', fontSize: 14 }}>📋 สรุปใบสั่งผลิต</strong>
                                <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.8, color: '#374151' }}>
                                    <div>สูตร: <strong>{createForm.formulaName}</strong> ({createForm.formulaId})</div>
                                    <div>ผลิต: <strong>{createForm.batchQty} batch × {createForm.batchSize.toLocaleString()} = {createForm.totalQty.toLocaleString()} {createForm.unit}</strong></div>
                                    <div>ไลน์: <strong>{createForm.assignedLine}</strong> | ความสำคัญ: <strong>{createForm.priority}</strong></div>
                                    <div>กำหนดการ: {createForm.planDate} → {createForm.dueDate || '(ยังไม่ระบุ)'}</div>
                                    {createForm.customerName && <div>ลูกค้า: <strong>{createForm.customerName}</strong> {createForm.customerPO && `(${createForm.customerPO})`}</div>}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="rnd-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
                        <button className="btn-secondary" onClick={() => setShowCreateModal(false)} disabled={isCreating}>ยกเลิก</button>
                        <button className="btn-primary" onClick={handleCreateSubmit} disabled={isCreating || !createForm.formulaId}>
                            {isCreating ? 'กำลังสร้าง...' : '✅ สร้างใบสั่งผลิต'}
                        </button>
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
        <div className="page-container planning-page page-enter">
            {currentTab === 'planning_overview' && renderOverview()}
            {currentTab === 'planning_list' && renderPlanList()}
            {currentTab === 'planning_materials' && renderMaterials()}
            {renderJobModal()}
            {renderCreateModal()}
        </div>
    );
}

/**
 * =============================================================================
 * Operator.jsx — หน้าฝ่ายผลิต (Production Operator) + Workflow Stepper
 * =============================================================================
 * ประกอบด้วย 2 sub-pages:
 *   1. งานของฉัน              — รายการงาน + Stepper ขั้นตอนการผลิต
 *   2. ประวัติการผลิต          — ตารางประวัติงานที่ทำเสร็จแล้ว
 *
 * Production Workflow Steps:
 *   In Progress 1 → QC In-Process → In Progress 2 → Completed
 *   → Packaging → QC Final → Stock (เข้าคลัง)
 * =============================================================================
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    CheckSquare, Play, CheckCircle, Search,
    Clock, Package, AlertTriangle, Activity, ClipboardList,
    Timer, TrendingUp, Repeat, ShieldCheck, Warehouse,
    SearchCheck, ChevronRight, Eye, XCircle
} from 'lucide-react';
import {
    MOCK_PRODUCTION_TASKS, MOCK_JOB_ORDERS, PRODUCTION_STEPS
} from '../data/productionMockData';
import './PageCommon.css';
import './Operator.css';

// Icon map for the stepper
const STEP_ICONS = {
    Play, SearchCheck, Repeat, CheckCircle, Package, ShieldCheck, Warehouse
};

export default function Operator() {
    const { getVisibleSubPages, hasSectionPermission } = useAuth();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('operator');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;

    const [tasks, setTasks] = useState(MOCK_PRODUCTION_TASKS);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);

    // ── Stats ──
    const activeTasks = tasks.filter(t => t.status === 'กำลังทำ');
    const completedTasks = tasks.filter(t => t.status === 'เสร็จสิ้น');
    const totalProduced = tasks.reduce((sum, t) => sum + t.producedQty, 0);
    const totalDefect = tasks.reduce((sum, t) => sum + t.defectQty, 0);

    // ── Advance step ──
    const advanceStep = (taskId) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            const currentIdx = PRODUCTION_STEPS.findIndex(s => s.key === t.currentStep);
            if (currentIdx >= PRODUCTION_STEPS.length - 1) return t; // already at last step
            const nextStep = PRODUCTION_STEPS[currentIdx + 1];
            const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
            const newStepTimes = { ...t.stepTimes, [nextStep.key]: now };
            const isFinished = nextStep.key === 'stock';
            return {
                ...t,
                currentStep: nextStep.key,
                stepTimes: newStepTimes,
                status: isFinished ? 'เสร็จสิ้น' : 'กำลังทำ',
                endTime: isFinished ? now : null,
            };
        }));
        // Also update selectedTask if open
        setSelectedTask(prev => {
            if (!prev || prev.id !== taskId) return prev;
            const t = tasks.find(x => x.id === taskId);
            if (!t) return prev;
            const currentIdx = PRODUCTION_STEPS.findIndex(s => s.key === t.currentStep);
            const nextStep = PRODUCTION_STEPS[currentIdx + 1];
            if (!nextStep) return prev;
            const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
            return {
                ...t,
                currentStep: nextStep.key,
                stepTimes: { ...t.stepTimes, [nextStep.key]: now },
                status: nextStep.key === 'stock' ? 'เสร็จสิ้น' : 'กำลังทำ',
                endTime: nextStep.key === 'stock' ? now : null,
            };
        });
    };

    const startTask = (taskId) => {
        const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            return {
                ...t,
                status: 'กำลังทำ',
                currentStep: 'production_1',
                startTime: now,
                stepTimes: { ...t.stepTimes, production_1: now },
            };
        }));
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'เสร็จสิ้น': return 'op-status-success';
            case 'กำลังทำ': return 'op-status-active';
            default: return 'op-status-pending';
        }
    };

    // ══════════════════════════════════════════════════════════════════
    // Stepper Component
    // ══════════════════════════════════════════════════════════════════
    const WorkflowStepper = ({ task, compact = false }) => {
        const currentIdx = PRODUCTION_STEPS.findIndex(s => s.key === task.currentStep);

        return (
            <div className={`op-stepper ${compact ? 'op-stepper-compact' : ''}`}>
                {PRODUCTION_STEPS.map((step, idx) => {
                    const isDone = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    const isFuture = idx > currentIdx;
                    const StepIcon = STEP_ICONS[step.icon] || CheckCircle;
                    const time = task.stepTimes?.[step.key];

                    return (
                        <div key={step.key} className="op-step-wrapper">
                            {/* Connector line */}
                            {idx > 0 && (
                                <div className={`op-step-connector ${isDone ? 'done' : isCurrent ? 'current' : ''}`} />
                            )}
                            {/* Step circle */}
                            <div className={`op-step ${isDone ? 'done' : isCurrent ? 'current' : 'future'}`}>
                                <div className="op-step-circle">
                                    {isDone ? <CheckCircle size={compact ? 14 : 16} /> : <StepIcon size={compact ? 14 : 16} />}
                                </div>
                                <div className="op-step-info">
                                    <span className="op-step-label">{compact ? step.shortLabel : step.label}</span>
                                    {!compact && time && <span className="op-step-time">{time}</span>}
                                    {!compact && isCurrent && !time && <span className="op-step-time op-step-now">ดำเนินการอยู่</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Task Detail Modal with Full Stepper
    // ══════════════════════════════════════════════════════════════════
    const renderTaskModal = () => {
        if (!selectedTask) return null;
        const task = selectedTask;
        const currentIdx = PRODUCTION_STEPS.findIndex(s => s.key === task.currentStep);
        const isLastStep = currentIdx >= PRODUCTION_STEPS.length - 1;
        const nextStep = !isLastStep ? PRODUCTION_STEPS[currentIdx + 1] : null;

        return (
            <div className="rnd-modal-overlay" onClick={() => setSelectedTask(null)}>
                <div className="rnd-modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>{task.batchNo} — {task.formulaName}</h2>
                            <div className="rnd-modal-meta">
                                <span className="op-jo-ref">{task.jobOrderId}</span>
                                <span className={`op-status-badge ${getStatusBadge(task.status)}`}>{task.status}</span>
                                <span className="badge badge-neutral">{task.line}</span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => setSelectedTask(null)}><XCircle size={22} /></button>
                    </div>

                    <div className="rnd-modal-body">
                        {/* Info Grid */}
                        <div className="rnd-modal-info-grid">
                            <div className="rnd-modal-info-item">
                                <label>กระบวนการ</label>
                                <span>{task.process}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>ผลิตได้ / เป้าหมาย</label>
                                <span>{task.producedQty} / {task.expectedQty}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>ของเสีย</label>
                                <span style={{ color: task.defectQty > 0 ? '#ef4444' : undefined }}>{task.defectQty}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>ขั้นตอนปัจจุบัน</label>
                                <span style={{ color: '#7b7bf5', fontWeight: 700 }}>
                                    {PRODUCTION_STEPS.find(s => s.key === task.currentStep)?.label}
                                </span>
                            </div>
                        </div>

                        {/* FULL STEPPER */}
                        <div className="op-modal-stepper-section">
                            <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Activity size={16} /> ขั้นตอนการผลิต
                            </h4>
                            <WorkflowStepper task={task} compact={false} />
                        </div>

                        {/* Next Step Action */}
                        {!isLastStep && task.status !== 'เสร็จสิ้น' && (
                            <div className="op-modal-next-action">
                                <span>ขั้นตอนถัดไป: <strong>{nextStep?.label}</strong></span>
                                <button className="op-btn op-btn-start" onClick={() => {
                                    advanceStep(task.id);
                                    // refresh selected task
                                    setTimeout(() => {
                                        setSelectedTask(prev => {
                                            if (!prev) return null;
                                            return tasks.find(t => t.id === prev.id) || prev;
                                        });
                                    }, 50);
                                }}>
                                    <ChevronRight size={14} /> ไปขั้นตอนถัดไป
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // 1. งานของฉัน (My Tasks)
    // ══════════════════════════════════════════════════════════════════
    const renderDashboard = () => {
        const currentActive = tasks.filter(t => t.status === 'กำลังทำ');
        const pending = tasks.filter(t => t.status !== 'เสร็จสิ้น');

        return (
            <div className="operator-dashboard">
                <div className="page-title">
                    <h1>งานของฉัน — Production Operator</h1>
                    <p>รายการงานที่ได้รับจาก Planner</p>
                </div>

                {hasSectionPermission('operator_dashboard_status') && (
                    <div className="summary-row">
                        <div className="card summary-card">
                            <div className="summary-icon" style={{ background: '#fff8e1', color: '#f9a825' }}><Activity size={20} /></div>
                            <div><span className="summary-label">งานกำลังทำ</span><span className="summary-value">{activeTasks.length}</span></div>
                        </div>
                        <div className="card summary-card">
                            <div className="summary-icon" style={{ background: '#ecfdf5', color: '#059669' }}><CheckCircle size={20} /></div>
                            <div><span className="summary-label">เสร็จสิ้นแล้ว</span><span className="summary-value">{completedTasks.length}</span></div>
                        </div>
                        <div className="card summary-card">
                            <div className="summary-icon" style={{ background: '#f0ebff', color: '#7b7bf5' }}><Package size={20} /></div>
                            <div><span className="summary-label">ผลิตได้รวม</span><span className="summary-value">{totalProduced.toLocaleString()}</span></div>
                        </div>
                        <div className="card summary-card">
                            <div className="summary-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><AlertTriangle size={20} /></div>
                            <div><span className="summary-label">ของเสีย</span><span className="summary-value">{totalDefect}</span></div>
                        </div>
                    </div>
                )}

                {/* ── Active Tasks with Stepper ── */}
                {currentActive.length > 0 && (
                    <div className="op-active-section">
                        <h3 className="op-section-title"><Timer size={16} className="op-pulse" /> งานที่กำลังทำอยู่ตอนนี้</h3>
                        <div className="op-active-grid">
                            {currentActive.map(task => {
                                const currentStepObj = PRODUCTION_STEPS.find(s => s.key === task.currentStep);
                                const currentIdx = PRODUCTION_STEPS.findIndex(s => s.key === task.currentStep);
                                const isLastStep = currentIdx >= PRODUCTION_STEPS.length - 1;

                                return (
                                    <div key={task.id} className="op-active-card">
                                        <div className="op-active-top">
                                            <div>
                                                <span className="op-active-batch">{task.batchNo}</span>
                                                <span className="op-active-job">← {task.jobOrderId}</span>
                                            </div>
                                            <span className="op-status-badge op-status-active">{currentStepObj?.shortLabel}</span>
                                        </div>
                                        <div className="op-active-product">{task.formulaName}</div>
                                        <div className="op-active-process">{task.process} • {task.line}</div>

                                        {/* Mini Stepper */}
                                        <WorkflowStepper task={task} compact={true} />

                                        <div className="op-active-progress">
                                            <div className="op-active-progress-bar">
                                                <div className="op-active-progress-fill" style={{ width: `${(task.producedQty / task.expectedQty) * 100}%` }}></div>
                                            </div>
                                            <span className="op-active-progress-text">{task.producedQty} / {task.expectedQty}</span>
                                        </div>

                                        <div className="op-active-actions">
                                            {!isLastStep && (
                                                <button className="op-btn op-btn-start" onClick={() => advanceStep(task.id)}>
                                                    <ChevronRight size={14} /> ขั้นตอนถัดไป
                                                </button>
                                            )}
                                            <button className="op-btn op-btn-detail" onClick={() => setSelectedTask(task)}>
                                                <Eye size={14} /> รายละเอียด
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── All Tasks Table ── */}
                {hasSectionPermission('operator_dashboard_tasks') && (
                    <div className="card" style={{ marginTop: 16 }}>
                        <h3 className="op-section-title"><ClipboardList size={16} /> รายการงานทั้งหมด</h3>
                        <div className="table-card" style={{ marginTop: 8 }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รหัสงาน</th>
                                        <th>ใบสั่งผลิต</th>
                                        <th>ผลิตภัณฑ์</th>
                                        <th>Batch No.</th>
                                        <th>ขั้นตอนปัจจุบัน</th>
                                        <th>เป้าหมาย</th>
                                        <th>ทำได้แล้ว</th>
                                        <th>สถานะ</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.filter(t => t.status !== 'เสร็จสิ้น').map(task => {
                                        const stepObj = PRODUCTION_STEPS.find(s => s.key === task.currentStep);
                                        return (
                                            <tr key={task.id}>
                                                <td className="text-bold">{task.id}</td>
                                                <td><span className="op-jo-ref">{task.jobOrderId}</span></td>
                                                <td>{task.formulaName}</td>
                                                <td><span className="badge badge-neutral">{task.batchNo}</span></td>
                                                <td>
                                                    <span className="op-step-badge">
                                                        {stepObj?.shortLabel || '—'}
                                                    </span>
                                                </td>
                                                <td>{task.expectedQty.toLocaleString()}</td>
                                                <td>
                                                    <div className="progress-container">
                                                        <div className="progress-bar" style={{ width: `${(task.producedQty / task.expectedQty) * 100}%`, backgroundColor: 'var(--primary)' }}></div>
                                                        <span className="progress-text">{task.producedQty} / {task.expectedQty}</span>
                                                    </div>
                                                </td>
                                                <td><span className={`op-status-badge ${getStatusBadge(task.status)}`}>{task.status}</span></td>
                                                <td>
                                                    <button className="btn-sm" onClick={() => setSelectedTask(task)}>
                                                        <Eye size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // 2. ประวัติการผลิต (Production History)
    // ══════════════════════════════════════════════════════════════════
    const renderHistory = () => {
        const completed = tasks.filter(t => t.status === 'เสร็จสิ้น');
        const filtered = completed.filter(t =>
            t.formulaName.includes(searchTerm) || t.jobOrderId.includes(searchTerm) || t.batchNo.includes(searchTerm)
        );

        const totalYield = completed.reduce((sum, t) => sum + t.producedQty, 0);
        const totalDefects = completed.reduce((sum, t) => sum + t.defectQty, 0);
        const yieldRate = totalYield > 0 ? (((totalYield - totalDefects) / totalYield) * 100).toFixed(1) : 0;

        return (
            <div className="operator-history">
                <div className="page-title">
                    <h1>ประวัติการผลิต</h1>
                    <p>บันทึกผลการผลิตที่ดำเนินการเสร็จสิ้นแล้ว</p>
                </div>

                <div className="summary-row">
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#ecfdf5', color: '#059669' }}><CheckCircle size={20} /></div>
                        <div><span className="summary-label">งานที่เสร็จ</span><span className="summary-value">{completed.length} งาน</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#f0ebff', color: '#7b7bf5' }}><Package size={20} /></div>
                        <div><span className="summary-label">ผลิตรวม</span><span className="summary-value">{totalYield.toLocaleString()}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#e3f2fd', color: '#1e88e5' }}><TrendingUp size={20} /></div>
                        <div><span className="summary-label">อัตราผลผลิตดี</span><span className="summary-value">{yieldRate}%</span></div>
                    </div>
                </div>

                {hasSectionPermission('operator_history_search') && (
                    <div className="toolbar">
                        <div className="search-box">
                            <Search size={16} />
                            <input type="text" placeholder="ค้นหาประวัติ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                )}

                {hasSectionPermission('operator_history_table') && (
                    <div className="card table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>รหัสงาน</th>
                                    <th>ใบสั่งผลิต</th>
                                    <th>ผลิตภัณฑ์</th>
                                    <th>Batch No.</th>
                                    <th>ไลน์</th>
                                    <th>ทำได้จริง</th>
                                    <th>ของเสีย</th>
                                    <th>อัตรา %</th>
                                    <th>เริ่ม → เสร็จ</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(task => {
                                    const rate = ((task.producedQty - task.defectQty) / task.producedQty * 100).toFixed(1);
                                    return (
                                        <tr key={task.id}>
                                            <td className="text-bold">{task.id}</td>
                                            <td><span className="op-jo-ref">{task.jobOrderId}</span></td>
                                            <td>{task.formulaName}</td>
                                            <td><span className="badge badge-neutral">{task.batchNo}</span></td>
                                            <td>{task.line}</td>
                                            <td style={{ fontWeight: 600, color: '#059669' }}>{task.producedQty.toLocaleString()}</td>
                                            <td style={{ color: task.defectQty > 0 ? '#ef4444' : 'var(--text-muted)' }}>{task.defectQty}</td>
                                            <td>
                                                <span className={`badge ${parseFloat(rate) >= 99 ? 'badge-success' : parseFloat(rate) >= 95 ? 'badge-warning' : 'badge-danger'}`}>
                                                    {rate}%
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 11 }}>{task.startTime}<br />{task.endTime || '—'}</td>
                                            <td>
                                                <button className="btn-sm" onClick={() => setSelectedTask(task)}>
                                                    <Eye size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่มีประวัติการผลิต</td></tr>
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
        <div className="page-container operator-page page-enter">
            {currentTab === 'operator_dashboard' && renderDashboard()}
            {currentTab === 'operator_history' && renderHistory()}
            {renderTaskModal()}
        </div>
    );
}

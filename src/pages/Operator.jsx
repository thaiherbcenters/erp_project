/**
 * =============================================================================
 * Operator.jsx — หน้าฝ่ายผลิต + Workflow Stepper + ส่งคำขอ QC
 * =============================================================================
 * Production Workflow Steps:
 *   In Progress 1 → QC In-Process → In Progress 2 → Completed
 *   → Packaging → QC Final → Stock (เข้าคลัง)
 *
 * เมื่อถึงขั้นตอน QC → ส่งคำขอ QC อัตโนมัติ → QC ตรวจ → ผลกลับมาอัปเดต
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProduction } from '../context/ProductionContext';
import API_BASE from '../config';
import {
    CheckSquare, Play, CheckCircle, Search,
    Clock, Package, AlertTriangle, Activity, ClipboardList,
    Timer, TrendingUp, Repeat, ShieldCheck, Warehouse,
    SearchCheck, ChevronRight, Eye, XCircle, Send, Plus, Save
} from 'lucide-react';
import { PRODUCTION_STEPS } from '../data/productionMockData';
import './PageCommon.css';
import './Operator.css';

// Icon map
const STEP_ICONS = {
    Play, SearchCheck, Repeat, CheckCircle, Package, ShieldCheck, Warehouse
};

export default function Operator() {
    const { user, getVisibleSubPages, hasSectionPermission } = useAuth();
    const { tasks, advanceTaskStep, startTask, sendQcRequest, qcRequests, addProductionLog } = useProduction();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('operator');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedTaskLogs, setSelectedTaskLogs] = useState([]);
    const [logForm, setLogForm] = useState({ producedQty: '', defectQty: '', notes: '' });
    const [isSubmittingLog, setIsSubmittingLog] = useState(false);

    useEffect(() => {
        if (selectedTask) {
            fetch(`${API_BASE}/production/tasks/${selectedTask.id}/logs`)
                .then(res => res.json())
                .then(data => setSelectedTaskLogs(data))
                .catch(err => console.error('Failed to fetch logs', err));
        } else {
            setSelectedTaskLogs([]);
            setLogForm({ producedQty: '', defectQty: '', notes: '' });
        }
    }, [selectedTask]);

    const handleAddLog = async () => {
        if (!selectedTask) return;
        if (!logForm.producedQty && !logForm.defectQty) return;
        
        setIsSubmittingLog(true);
        const res = await addProductionLog(selectedTask.id, {
            producedQty: parseInt(logForm.producedQty) || 0,
            defectQty: parseInt(logForm.defectQty) || 0,
            notes: logForm.notes,
            operatorId: user?.username || 'operator'
        });
        
        setIsSubmittingLog(false);
        if (res.success) {
            setLogForm({ producedQty: '', defectQty: '', notes: '' });
            // Refresh logs
            fetch(`${API_BASE}/production/tasks/${selectedTask.id}/logs`)
                .then(res => res.json())
                .then(data => setSelectedTaskLogs(data));
        } else {
            alert('บันทึกไม่สำเร็จ: ' + res.message);
        }
    };

    // ── Stats ──
    const activeTasks = tasks.filter(t => t.status === 'กำลังทำ');
    const completedTasks = tasks.filter(t => t.status === 'เสร็จสิ้น');
    const totalProduced = tasks.reduce((sum, t) => sum + t.producedQty, 0);
    const totalDefect = tasks.reduce((sum, t) => sum + t.defectQty, 0);

    // ── Check if task is waiting for QC result ──
    const isWaitingForQc = (task) => {
        if (task.currentStep !== 'qc_inprocess' && task.currentStep !== 'qc_final') return false;
        const pendingReq = qcRequests.find(r => r.taskId === task.id && r.type === task.currentStep && r.status === 'รอตรวจ');
        return !!pendingReq;
    };

    // ── Check if task already sent QC request ──
    const hasQcRequest = (task) => {
        return qcRequests.some(r => r.taskId === task.id && r.type === task.currentStep);
    };

    // ── Handle advancing to next step (with QC auto-send) ──
    const handleAdvanceStep = (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const currentIdx = PRODUCTION_STEPS.findIndex(s => s.key === task.currentStep);
        const nextStep = PRODUCTION_STEPS[currentIdx + 1];
        if (!nextStep) return;

        // If next step is QC, advance AND auto-send QC request
        if (nextStep.key === 'qc_inprocess' || nextStep.key === 'qc_final') {
            advanceTaskStep(taskId);
            // Send QC request after advancing
            setTimeout(() => {
                const updatedTask = { ...task, currentStep: nextStep.key };
                sendQcRequest(updatedTask, nextStep.key);
            }, 100);
        } else {
            advanceTaskStep(taskId);
        }
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
        const waitingQc = isWaitingForQc(task);

        return (
            <div className={`op-stepper ${compact ? 'op-stepper-compact' : ''}`}>
                {PRODUCTION_STEPS.map((step, idx) => {
                    const isDone = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    const isFuture = idx > currentIdx;
                    const isQcStep = step.key === 'qc_inprocess' || step.key === 'qc_final';
                    const isQcWaiting = isCurrent && isQcStep && waitingQc;
                    const StepIcon = STEP_ICONS[step.icon] || CheckCircle;
                    const time = task.stepTimes?.[step.key];

                    return (
                        <div key={step.key} className="op-step-wrapper">
                            {idx > 0 && (
                                <div className={`op-step-connector ${isDone ? 'done' : isCurrent ? 'current' : ''}`} />
                            )}
                            <div className={`op-step ${isDone ? 'done' : isCurrent ? (isQcWaiting ? 'qc-waiting' : 'current') : 'future'}`}>
                                <div className="op-step-circle">
                                    {isDone ? <CheckCircle size={compact ? 14 : 16} /> : <StepIcon size={compact ? 14 : 16} />}
                                </div>
                                <div className="op-step-info">
                                    <span className="op-step-label">{compact ? step.shortLabel : step.label}</span>
                                    {!compact && time && <span className="op-step-time">{time}</span>}
                                    {!compact && isCurrent && isQcWaiting && <span className="op-step-time op-step-qc-waiting">⏳ รอ QC ตรวจ</span>}
                                    {!compact && isCurrent && !isQcStep && !time && <span className="op-step-time op-step-now">ดำเนินการอยู่</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Task Detail Modal
    // ══════════════════════════════════════════════════════════════════
    const renderTaskModal = () => {
        if (!selectedTask) return null;
        // Get fresh task data from context
        const task = tasks.find(t => t.id === selectedTask.id) || selectedTask;
        const currentIdx = PRODUCTION_STEPS.findIndex(s => s.key === task.currentStep);
        const isLastStep = currentIdx >= PRODUCTION_STEPS.length - 1;
        const nextStep = !isLastStep ? PRODUCTION_STEPS[currentIdx + 1] : null;
        const isQcStep = task.currentStep === 'qc_inprocess' || task.currentStep === 'qc_final';
        const waitingQc = isWaitingForQc(task);
        const qcReqForTask = qcRequests.filter(r => r.taskId === task.id);

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
                                <span style={{ color: waitingQc ? '#f59e0b' : '#7b7bf5', fontWeight: 700 }}>
                                    {PRODUCTION_STEPS.find(s => s.key === task.currentStep)?.label}
                                    {waitingQc && ' (รอ QC)'}
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

                        {/* QC Waiting State */}
                        {waitingQc && (
                            <div className="op-qc-waiting-banner">
                                <SearchCheck size={20} />
                                <div>
                                    <strong>📋 ส่งคำขอ QC แล้ว — รอเจ้าหน้าที่ QC ตรวจ</strong>
                                    <p>เมื่อ QC ตรวจผ่าน ระบบจะเลื่อนขั้นตอนให้อัตโนมัติ</p>
                                </div>
                            </div>
                        )}

                        {/* QC Send Button (if at QC step but hasn't sent yet) */}
                        {isQcStep && !hasQcRequest(task) && (
                            <div className="op-modal-next-action" style={{ background: '#fef3c7', borderColor: '#fde68a' }}>
                                <span>ขั้นตอนนี้ต้องส่งให้ QC ตรวจ</span>
                                <button className="op-btn op-btn-qc" onClick={() => sendQcRequest(task, task.currentStep)}>
                                    <Send size={14} /> ส่งคำขอ QC
                                </button>
                            </div>
                        )}

                        {/* Normal Next Step (non-QC) */}
                        {!isLastStep && !isQcStep && task.status !== 'เสร็จสิ้น' && (
                            <div className="op-modal-next-action">
                                <span>ขั้นตอนถัดไป: <strong>{nextStep?.label}</strong></span>
                                <button className="op-btn op-btn-start" onClick={() => handleAdvanceStep(task.id)}>
                                    <ChevronRight size={14} /> ไปขั้นตอนถัดไป
                                </button>
                            </div>
                        )}

                        {/* ==================================================== */}
                        {/* UPDATE PRODUCTION LOGS SECTION */}
                        {/* ==================================================== */}
                        {task.status !== 'เสร็จสิ้น' && (
                            <div className="op-log-section">
                                <h4 style={{ margin: '24px 0 12px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
                                    <Plus size={16} /> บันทึกยอดผลิต/เสีย (อัปเดตรายกะ)
                                </h4>
                                <div className="op-log-form">
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>ยอดดี (เพิ่ม)</label>
                                        <input 
                                            type="number" 
                                            min="0" 
                                            style={{ width: '100%', padding: '6px' }}
                                            value={logForm.producedQty}
                                            onChange={(e) => setLogForm({...logForm, producedQty: e.target.value})}
                                            placeholder="จำนวนชิ้น"
                                            disabled={isSubmittingLog}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ color: '#ef4444' }}>ของเสีย (เพิ่ม)</label>
                                        <input 
                                            type="number" 
                                            min="0" 
                                            style={{ width: '100%', padding: '6px', borderColor: '#fca5a5' }}
                                            value={logForm.defectQty}
                                            onChange={(e) => setLogForm({...logForm, defectQty: e.target.value})}
                                            placeholder="จำนวนชิ้น"
                                            disabled={isSubmittingLog}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
                                        <label>หมายเหตุ</label>
                                        <input 
                                            type="text" 
                                            style={{ width: '100%', padding: '6px' }}
                                            value={logForm.notes}
                                            onChange={(e) => setLogForm({...logForm, notes: e.target.value})}
                                            placeholder="ระบุหมายเหตุถ้ามี"
                                            disabled={isSubmittingLog}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                        <button 
                                            className="op-btn" 
                                            style={{ height: '36px', background: 'var(--primary)', color: 'white', padding: '0 12px', borderRadius: 4, fontWeight: 600 }}
                                            onClick={handleAddLog}
                                            disabled={isSubmittingLog || (!logForm.producedQty && !logForm.defectQty)}
                                        >
                                            {isSubmittingLog ? 'รอ...' : <><Save size={14} /> บันทึก</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* LIST LOG HISTORY */}
                        {selectedTaskLogs.length > 0 && (
                            <div className="op-qc-history" style={{ marginTop: 24, background: '#f8fafc' }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700 }}>📅 ประวัติการลงยอดผลิต</h4>
                                <table style={{ width: '100%', fontSize: 13, textAlign: 'left', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                            <th style={{ padding: '4px 0' }}>เวลา</th>
                                            <th>โดย</th>
                                            <th>ยอดดี (+)</th>
                                            <th>เสีย (+)</th>
                                            <th>หมายเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTaskLogs.map(log => (
                                            <tr key={log.LogID} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '6px 0', color: '#475569' }}>{new Date(log.LogDate).toLocaleString('th-TH')}</td>
                                                <td>{log.OperatorID}</td>
                                                <td style={{ color: '#059669', fontWeight: 600 }}>+{log.ProducedQty}</td>
                                                <td style={{ color: log.DefectQty > 0 ? '#ef4444' : '#94a3b8' }}>{log.DefectQty > 0 ? `+${log.DefectQty}` : '-'}</td>
                                                <td style={{ color: '#475569' }}>{log.Notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* QC History for this task */}
                        {qcReqForTask.length > 0 && (
                            <div className="op-qc-history">
                                <h4 style={{ margin: '16px 0 8px', fontSize: 13, fontWeight: 700 }}>📋 ประวัติ QC ของงานนี้</h4>
                                {qcReqForTask.map(r => (
                                    <div key={r.id} className={`op-qc-history-item ${r.status === 'ผ่าน' ? 'passed' : r.status === 'ไม่ผ่าน' ? 'failed' : 'pending'}`}>
                                        <div className="op-qc-history-top">
                                            <span className="op-qc-history-type">{r.typeLabel}</span>
                                            <span className={`badge ${r.status === 'ผ่าน' ? 'badge-success' : r.status === 'ไม่ผ่าน' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span>
                                        </div>
                                        <div className="op-qc-history-meta">
                                            <span>📅 ส่ง: {r.requestedAt}</span>
                                            {r.inspectedAt && <span>✅ ตรวจ: {r.inspectedAt}</span>}
                                            {r.inspector && <span>👤 โดย: {r.inspector}</span>}
                                        </div>
                                        {r.notes && <div className="op-qc-history-note">💬 {r.notes}</div>}
                                    </div>
                                ))}
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
                                const isQcStep = task.currentStep === 'qc_inprocess' || task.currentStep === 'qc_final';
                                const waitingQc = isWaitingForQc(task);
                                const needsSendQc = isQcStep && !hasQcRequest(task);

                                return (
                                    <div key={task.id} className={`op-active-card ${waitingQc ? 'op-active-card-qc' : ''}`}>
                                        <div className="op-active-top">
                                            <div>
                                                <span className="op-active-batch">{task.batchNo}</span>
                                                <span className="op-active-job">← {task.jobOrderId}</span>
                                            </div>
                                            <span className={`op-status-badge ${waitingQc ? 'op-status-qc' : 'op-status-active'}`}>
                                                {waitingQc ? '⏳ รอ QC' : currentStepObj?.shortLabel}
                                            </span>
                                        </div>
                                        <div className="op-active-product">{task.formulaName}</div>
                                        <div className="op-active-process">{task.process} • {task.line}</div>

                                        <WorkflowStepper task={task} compact={true} />

                                        <div className="op-active-progress">
                                            <div className="op-active-progress-bar">
                                                <div className="op-active-progress-fill" style={{ width: `${(task.producedQty / task.expectedQty) * 100}%` }}></div>
                                            </div>
                                            <span className="op-active-progress-text">{task.producedQty} / {task.expectedQty}</span>
                                        </div>

                                        <div className="op-active-actions">
                                            {waitingQc ? (
                                                <span className="op-waiting-label">⏳ รอเจ้าหน้าที่ QC ตรวจ...</span>
                                            ) : needsSendQc ? (
                                                <button className="op-btn op-btn-qc" onClick={() => sendQcRequest(task, task.currentStep)}>
                                                    <Send size={14} /> ส่งคำขอ QC
                                                </button>
                                            ) : !isLastStep && !isQcStep ? (
                                                <button className="op-btn op-btn-start" onClick={() => handleAdvanceStep(task.id)}>
                                                    <ChevronRight size={14} /> ขั้นตอนถัดไป
                                                </button>
                                            ) : null}
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
                                        const waitingQc = isWaitingForQc(task);
                                        return (
                                            <tr key={task.id} className={waitingQc ? 'op-row-qc-waiting' : ''}>
                                                <td className="text-bold">{task.id}</td>
                                                <td><span className="op-jo-ref">{task.jobOrderId}</span></td>
                                                <td>{task.formulaName}</td>
                                                <td><span className="badge badge-neutral">{task.batchNo}</span></td>
                                                <td>
                                                    <span className={`op-step-badge ${waitingQc ? 'op-step-badge-qc' : ''}`}>
                                                        {waitingQc ? '⏳ รอ QC ตรวจ' : stepObj?.shortLabel || '—'}
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
                                                    <button className="btn-sm" onClick={() => setSelectedTask(task)}><Eye size={14} /></button>
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
    // 2. ประวัติการผลิต
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
                                                <span className={`badge ${parseFloat(rate) >= 99 ? 'badge-success' : parseFloat(rate) >= 95 ? 'badge-warning' : 'badge-danger'}`}>{rate}%</span>
                                            </td>
                                            <td style={{ fontSize: 11 }}>{task.startTime}<br />{task.endTime || '—'}</td>
                                            <td><button className="btn-sm" onClick={() => setSelectedTask(task)}><Eye size={14} /></button></td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่มีประวัติ</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

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

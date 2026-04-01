/**
 * =============================================================================
 * Operator.jsx — หน้าฝ่ายผลิต (Production Operator) (เขียนใหม่)
 * =============================================================================
 * ประกอบด้วย 2 sub-pages:
 *   1. งานของฉัน              — รายการงานจาก Planner + กดเริ่ม/ปิดจ็อบ
 *   2. ประวัติการผลิต          — ตารางประวัติงานที่ทำเสร็จแล้ว
 *
 * Data: ดึงจาก productionMockData.js (shared กับ R&D/Planner)
 * =============================================================================
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    CheckSquare, Play, Pause, CheckCircle, Search,
    Clock, Package, AlertTriangle, Activity, ClipboardList,
    Timer, TrendingUp
} from 'lucide-react';
import {
    MOCK_PRODUCTION_TASKS, MOCK_JOB_ORDERS
} from '../data/productionMockData';
import './PageCommon.css';
import './Operator.css';

export default function Operator() {
    const { getVisibleSubPages, hasSectionPermission } = useAuth();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('operator');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;

    const [tasks, setTasks] = useState(MOCK_PRODUCTION_TASKS);
    const [searchTerm, setSearchTerm] = useState('');

    // ── Stats ──
    const activeTasks = tasks.filter(t => t.status === 'กำลังทำ');
    const completedTasks = tasks.filter(t => t.status === 'เสร็จสิ้น');
    const totalProduced = tasks.reduce((sum, t) => sum + t.producedQty, 0);
    const totalDefect = tasks.reduce((sum, t) => sum + t.defectQty, 0);

    const handleAction = (id, newStatus) => {
        setTasks(prev => prev.map(t => {
            if (t.id === id) {
                const updated = { ...t, status: newStatus };
                if (newStatus === 'เสร็จสิ้น') {
                    updated.producedQty = t.expectedQty;
                    updated.endTime = new Date().toISOString().slice(0, 16).replace('T', ' ');
                }
                if (newStatus === 'กำลังทำ') {
                    updated.startTime = new Date().toISOString().slice(0, 16).replace('T', ' ');
                }
                return updated;
            }
            return t;
        }));
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'เสร็จสิ้น': return 'op-status-success';
            case 'กำลังทำ': return 'op-status-active';
            case 'ยังไม่เริ่ม': return 'op-status-pending';
            default: return 'op-status-pending';
        }
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

                {/* Active Tasks Highlight */}
                {currentActive.length > 0 && (
                    <div className="op-active-section">
                        <h3 className="op-section-title"><Timer size={16} className="op-pulse" /> งานที่กำลังทำอยู่ตอนนี้</h3>
                        <div className="op-active-grid">
                            {currentActive.map(task => (
                                <div key={task.id} className="op-active-card">
                                    <div className="op-active-top">
                                        <div>
                                            <span className="op-active-batch">{task.batchNo}</span>
                                            <span className="op-active-job">← {task.jobOrderId}</span>
                                        </div>
                                        <span className="op-status-badge op-status-active">กำลังทำ</span>
                                    </div>
                                    <div className="op-active-product">{task.formulaName}</div>
                                    <div className="op-active-process">{task.process} • {task.line}</div>
                                    <div className="op-active-progress">
                                        <div className="op-active-progress-bar">
                                            <div className="op-active-progress-fill" style={{ width: `${(task.producedQty / task.expectedQty) * 100}%` }}></div>
                                        </div>
                                        <span className="op-active-progress-text">{task.producedQty} / {task.expectedQty}</span>
                                    </div>
                                    <div className="op-active-actions">
                                        <button className="op-btn op-btn-complete" onClick={() => handleAction(task.id, 'เสร็จสิ้น')}>
                                            <CheckSquare size={14} /> ปิดจ็อบ
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Tasks Table */}
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
                                        <th>กระบวนการ / ไลน์</th>
                                        <th>Batch No.</th>
                                        <th>เป้าหมาย</th>
                                        <th>ทำได้แล้ว</th>
                                        <th>ของเสีย</th>
                                        <th>สถานะ</th>
                                        <th>อัปเดต</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pending.map(task => (
                                        <tr key={task.id}>
                                            <td className="text-bold">{task.id}</td>
                                            <td><span className="op-jo-ref">{task.jobOrderId}</span></td>
                                            <td>{task.formulaName}</td>
                                            <td>{task.process}<br /><small style={{ color: 'var(--text-muted)' }}>{task.line}</small></td>
                                            <td><span className="badge badge-neutral">{task.batchNo}</span></td>
                                            <td>{task.expectedQty.toLocaleString()}</td>
                                            <td>
                                                <div className="progress-container">
                                                    <div className="progress-bar" style={{ width: `${(task.producedQty / task.expectedQty) * 100}%`, backgroundColor: task.status === 'เสร็จสิ้น' ? 'var(--success)' : 'var(--primary)' }}></div>
                                                    <span className="progress-text">{task.producedQty} / {task.expectedQty}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: task.defectQty > 0 ? '#ef4444' : 'var(--text-muted)' }}>{task.defectQty}</td>
                                            <td><span className={`op-status-badge ${getStatusBadge(task.status)}`}>{task.status}</span></td>
                                            <td>
                                                {task.status === 'ยังไม่เริ่ม' && (
                                                    <button className="op-btn op-btn-start" onClick={() => handleAction(task.id, 'กำลังทำ')}>
                                                        <Play size={12} /> เริ่ม
                                                    </button>
                                                )}
                                                {task.status === 'กำลังทำ' && (
                                                    <button className="op-btn op-btn-complete" onClick={() => handleAction(task.id, 'เสร็จสิ้น')}>
                                                        <CheckSquare size={12} /> ปิดจ็อบ
                                                    </button>
                                                )}
                                                {task.status === 'เสร็จสิ้น' && (
                                                    <CheckCircle size={18} color="#059669" />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
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
                                    <th>เป้าหมาย</th>
                                    <th>ทำได้จริง</th>
                                    <th>ของเสีย</th>
                                    <th>อัตรา %</th>
                                    <th>เริ่มงาน</th>
                                    <th>เสร็จงาน</th>
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
                                            <td>{task.expectedQty.toLocaleString()}</td>
                                            <td style={{ fontWeight: 600, color: '#059669' }}>{task.producedQty.toLocaleString()}</td>
                                            <td style={{ color: task.defectQty > 0 ? '#ef4444' : 'var(--text-muted)' }}>{task.defectQty}</td>
                                            <td>
                                                <span className={`badge ${parseFloat(rate) >= 99 ? 'badge-success' : parseFloat(rate) >= 95 ? 'badge-warning' : 'badge-danger'}`}>
                                                    {rate}%
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12 }}>{task.startTime}</td>
                                            <td style={{ fontSize: 12 }}>{task.endTime || '—'}</td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr><td colSpan="11" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่มีประวัติการผลิต</td></tr>
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
        </div>
    );
}

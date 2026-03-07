import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Play, Pause, CheckCircle } from 'lucide-react';
import './PageCommon.css';
import './Operator.css'; // Assume creating a specific css for Operator if needed, or reuse PageCommon

const MOCK_TASKS = [
    { id: 'T-001', planId: 'PLN-001', process: 'ประกอบจอภาพ', line: 'A1', expectedQty: 50, producedQty: 25, status: 'กำลังทำ' },
    { id: 'T-002', planId: 'PLN-001', process: 'บรรจุลงกล่อง', line: 'B1', expectedQty: 50, producedQty: 0, status: 'ยังไม่เริ่ม' },
    { id: 'T-003', planId: 'PLN-003', process: 'ตัดไม้ประกอบเก้าอี้', line: 'Wood-01', expectedQty: 50, producedQty: 50, status: 'เสร็จสิ้น' },
];

export default function Operator() {
    const { getVisibleSubPages, hasSectionPermission } = useAuth();
    const location = useLocation();

    const visibleSubPages = getVisibleSubPages('operator');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;

    const [tasks, setTasks] = useState(MOCK_TASKS);

    const handleAction = (id, newStatus) => {
        setTasks(prev => prev.map(t =>
            t.id === id ? { ...t, status: newStatus, producedQty: newStatus === 'เสร็จสิ้น' ? t.expectedQty : t.producedQty } : t
        ));
    };

    const renderDashboard = () => (
        <div className="operator-dashboard">
            <h2 className="section-title">Production Operator - งานของคุณ (Line A1 / B1)</h2>

            {/* Quick Actions / Status Update */}
            {hasSectionPermission('operator_dashboard_status') && (
                <div className="status-update-panel card-style mb-4">
                    <h3>สถานะเครื่องจักร/ไลน์ผลิต</h3>
                    <div className="btn-group mt-2">
                        <button className="btn btn-primary"><Play size={16} /> เริ่มทำงาน</button>
                        <button className="btn" style={{ backgroundColor: '#ffc107', color: '#000' }}><Pause size={16} /> พัก/หยุดเครื่อง</button>
                        <button className="btn" style={{ backgroundColor: '#dc3545', color: '#fff' }}>แจ้งปัญหา (Downtime)</button>
                    </div>
                </div>
            )}

            {/* Tasks List */}
            {hasSectionPermission('operator_dashboard_tasks') && (
                <div className="task-list card-style">
                    <h3>รายการงาน (Production Tasks)</h3>
                    <div className="table-responsive mt-3">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>รหัสงาน</th>
                                    <th>แผนผลิต</th>
                                    <th>ขั้นตอน/กระบวนการ</th>
                                    <th>เป้าหมาย</th>
                                    <th>ทำได้แล้ว</th>
                                    <th>สถานะ</th>
                                    <th>อัปเดต</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map((task) => (
                                    <tr key={task.id}>
                                        <td className="fw-500">{task.id}</td>
                                        <td>{task.planId}</td>
                                        <td>{task.process} <br /><small className="text-muted">Line: {task.line}</small></td>
                                        <td>{task.expectedQty}</td>
                                        <td>
                                            <div className="progress-container">
                                                <div className="progress-bar" style={{ width: `${(task.producedQty / task.expectedQty) * 100}%`, backgroundColor: task.status === 'เสร็จสิ้น' ? 'var(--success)' : 'var(--primary)' }}></div>
                                                <span className="progress-text">{task.producedQty} / {task.expectedQty}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${task.status === 'เสร็จสิ้น' ? 'status-success' : task.status === 'กำลังทำ' ? 'status-warning' : 'status-gray'}`}>
                                                {task.status}
                                            </span>
                                        </td>
                                        <td>
                                            {task.status === 'ยังไม่เริ่ม' && (
                                                <button className="btn btn-sm btn-primary" onClick={() => handleAction(task.id, 'กำลังทำ')}>เริ่ม</button>
                                            )}
                                            {task.status === 'กำลังทำ' && (
                                                <button className="btn btn-sm btn-outline" style={{ color: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleAction(task.id, 'เสร็จสิ้น')}><CheckSquare size={14} /> ปิดจ็อบ</button>
                                            )}
                                            {task.status === 'เสร็จสิ้น' && (
                                                <CheckCircle size={20} color="var(--success)" />
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

    if (visibleSubPages.length === 0) {
        return <div className="page-container"><p className="no-permission">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;
    }

    return (
        <div className="page-container operator-page page-enter">
            {currentTab === 'operator_dashboard' && renderDashboard()}
        </div>
    );
}

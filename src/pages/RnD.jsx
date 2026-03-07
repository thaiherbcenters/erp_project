/**
 * =============================================================================
 * RnD.jsx — หน้า Research & Development
 * =============================================================================
 * ประกอบด้วย 2 sub-pages:
 *   1. R&D Dashboard     — สรุปภาพรวมโครงการวิจัย
 *   2. Research Projects  — ตารางโครงการวิจัยและพัฒนา
 * =============================================================================
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FlaskConical, Lightbulb, Clock, CheckCircle2, AlertTriangle,
    TrendingUp, FileText, Plus, Search
} from 'lucide-react';
import './PageCommon.css';
import './RnD.css';

// ── Mock Data ──
const MOCK_RND_PROJECTS = [
    { id: 1, code: 'RD-2026-001', name: 'สูตรสมุนไพรบำรุงผิว V2', category: 'Skincare', researcher: 'ดร.สมศรี วิจัย', startDate: '2026-01-15', targetDate: '2026-06-30', phase: 'ทดสอบ', progress: 65, status: 'กำลังดำเนินการ' },
    { id: 2, code: 'RD-2026-002', name: 'น้ำมันหอมระเหยเกรดพรีเมียม', category: 'Essential Oil', researcher: 'ดร.วิชัย สมุนไพร', startDate: '2026-02-01', targetDate: '2026-08-31', phase: 'วิจัย', progress: 30, status: 'กำลังดำเนินการ' },
    { id: 3, code: 'RD-2026-003', name: 'ผลิตภัณฑ์ลดน้ำหนักจากธรรมชาติ', category: 'Supplement', researcher: 'ดร.สมศรี วิจัย', startDate: '2025-09-01', targetDate: '2026-03-31', phase: 'อนุมัติ', progress: 100, status: 'เสร็จสิ้น' },
    { id: 4, code: 'RD-2026-004', name: 'ครีมกันแดดสูตรออร์แกนิค', category: 'Skincare', researcher: 'คุณนภา พัฒนา', startDate: '2026-03-01', targetDate: '2026-09-30', phase: 'เริ่มต้น', progress: 10, status: 'กำลังดำเนินการ' },
    { id: 5, code: 'RD-2026-005', name: 'แชมพูสมุนไพรลดผมร่วง', category: 'Hair Care', researcher: 'ดร.วิชัย สมุนไพร', startDate: '2025-11-15', targetDate: '2026-05-15', phase: 'ทดสอบ', progress: 80, status: 'กำลังดำเนินการ' },
];

const MOCK_RND_EXPERIMENTS = [
    { id: 1, code: 'EXP-001', project: 'RD-2026-001', name: 'ทดสอบสารสกัดขมิ้นความเข้มข้น 5%', date: '2026-03-05', result: 'ผ่าน', note: 'ค่า pH อยู่ในเกณฑ์' },
    { id: 2, code: 'EXP-002', project: 'RD-2026-001', name: 'ทดสอบความคงตัว 3 เดือน', date: '2026-03-06', result: 'รอผล', note: 'อยู่ระหว่างการทดสอบ' },
    { id: 3, code: 'EXP-003', project: 'RD-2026-002', name: 'สกัดน้ำมันด้วยวิธี Cold Press', date: '2026-03-04', result: 'ผ่าน', note: 'ได้ผลผลิต 85%' },
    { id: 4, code: 'EXP-004', project: 'RD-2026-005', name: 'ทดสอบ Dermatology Test', date: '2026-03-06', result: 'ไม่ผ่าน', note: 'ต้องปรับสูตร ลดสาร X' },
];

export default function RnD() {
    const { getVisibleSubPages, hasSectionPermission } = useAuth();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('rnd');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;

    const [searchTerm, setSearchTerm] = useState('');

    // ── Stats ──
    const totalProjects = MOCK_RND_PROJECTS.length;
    const activeProjects = MOCK_RND_PROJECTS.filter(p => p.status === 'กำลังดำเนินการ').length;
    const completedProjects = MOCK_RND_PROJECTS.filter(p => p.status === 'เสร็จสิ้น').length;
    const avgProgress = Math.round(MOCK_RND_PROJECTS.reduce((sum, p) => sum + p.progress, 0) / totalProjects);

    // ── Dashboard ──
    const renderDashboard = () => (
        <div className="rnd-dashboard">
            <div className="page-title">
                <h1>R&D Dashboard</h1>
                <p>ภาพรวมโครงการวิจัยและพัฒนา</p>
            </div>

            {hasSectionPermission('rnd_dashboard_stats') && (
                <div className="summary-row">
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#f0ebff', color: '#7b7bf5' }}><FlaskConical size={20} /></div>
                        <div><span className="summary-label">โครงการทั้งหมด</span><span className="summary-value">{totalProjects}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#e8f5e9', color: '#43a047' }}><TrendingUp size={20} /></div>
                        <div><span className="summary-label">กำลังดำเนินการ</span><span className="summary-value">{activeProjects}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#fff8e1', color: '#f9a825' }}><Clock size={20} /></div>
                        <div><span className="summary-label">ค่าเฉลี่ย Progress</span><span className="summary-value">{avgProgress}%</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#e3f2fd', color: '#1e88e5' }}><CheckCircle2 size={20} /></div>
                        <div><span className="summary-label">เสร็จสิ้น</span><span className="summary-value">{completedProjects}</span></div>
                    </div>
                </div>
            )}

            {hasSectionPermission('rnd_dashboard_recent') && (
                <div className="card">
                    <h3 className="card-title">การทดลองล่าสุด</h3>
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
                                {MOCK_RND_EXPERIMENTS.map(exp => (
                                    <tr key={exp.id}>
                                        <td className="text-bold">{exp.code}</td>
                                        <td>{exp.project}</td>
                                        <td>{exp.name}</td>
                                        <td>{exp.date}</td>
                                        <td>
                                            <span className={`badge ${exp.result === 'ผ่าน' ? 'badge-success' : exp.result === 'ไม่ผ่าน' ? 'badge-danger' : 'badge-warning'}`}>
                                                {exp.result}
                                            </span>
                                        </td>
                                        <td>{exp.note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );

    // ── Research Projects ──
    const renderProjects = () => {
        const filtered = MOCK_RND_PROJECTS.filter(p =>
            p.name.includes(searchTerm) || p.code.includes(searchTerm) || p.category.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="rnd-projects">
                <div className="page-title">
                    <h1>Research & Development</h1>
                    <p>จัดการโครงการวิจัยและพัฒนาผลิตภัณฑ์</p>
                </div>

                <div className="toolbar">
                    <div className="search-box">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="ค้นหาโครงการ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary"><Plus size={16} /> สร้างโครงการใหม่</button>
                </div>

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
                                        <span className={`badge ${project.status === 'เสร็จสิ้น' ? 'badge-success' : 'badge-warning'}`}>
                                            {project.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (visibleSubPages.length === 0) {
        return <div className="page-container"><p className="no-permission">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;
    }

    return (
        <div className="page-container rnd-page page-enter">
            {currentTab === 'rnd_dashboard' && renderDashboard()}
            {currentTab === 'rnd_projects' && renderProjects()}
        </div>
    );
}

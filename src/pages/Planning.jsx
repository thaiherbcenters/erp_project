import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Filter, CalendarDays, PieChart, Activity, Wrench, CheckCircle } from 'lucide-react';
import './PageCommon.css';
import './Planning.css'; // Assume creating a specific css for planning if needed, or reuse PageCommon

// --- MOCK DATA FOR PLANNING ---
const MOCK_PLANS = [
    { id: 'PLN-001', product: 'Laptop Dell XPS 15', targetQty: 100, status: 'กำลังผลิต', startDate: '2026-03-01', endDate: '2026-03-10', progress: 45 },
    { id: 'PLN-002', product: 'จอภาพ 27 นิ้ว', targetQty: 250, status: 'รอการผลิต', startDate: '2026-03-15', endDate: '2026-03-25', progress: 0 },
    { id: 'PLN-003', product: 'เก้าอี้สำนักงาน', targetQty: 50, status: 'เสร็จสิ้น', startDate: '2026-02-20', endDate: '2026-02-28', progress: 100 },
];

export default function Planning() {
    const { getVisibleSubPages, hasSectionPermission } = useAuth();
    const location = useLocation();

    // ดึง subPages ที่มีสิทธิ์เห็น
    const visibleSubPages = getVisibleSubPages('planning');

    // กำหนด tab ปัจจุบัน (จาก URL หรือ default tab แรก)
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;

    // --- State สำหรับข้อมูล ---
    const [searchTerm, setSearchTerm] = useState('');
    const [plans, setPlans] = useState(MOCK_PLANS);

    // Filter plans
    const filteredPlans = plans.filter(p =>
        p.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ==========================================
    // Render Sections
    // ==========================================

    const renderOverview = () => (
        <div className="planning-overview">
            <h2 className="section-title">ภาพรวมการวางแผนการผลิต</h2>
            <div className="stats-grid">
                <div className="stat-card card-style">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                        <CalendarDays size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>แผนทั้งหมด</h3>
                        <p className="stat-value">12</p>
                    </div>
                </div>
                <div className="stat-card card-style">
                    <div className="stat-icon" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>
                        <Activity size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>กำลังผลิต</h3>
                        <p className="stat-value">4</p>
                    </div>
                </div>
                <div className="stat-card card-style">
                    <div className="stat-icon" style={{ backgroundColor: '#d4edda', color: '#155724' }}>
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>เสร็จสิ้นแล้ว</h3>
                        <p className="stat-value">8</p>
                    </div>
                </div>
            </div>

            <div className="card-style" style={{ padding: '24px', marginTop: '24px' }}>
                <h3>ประสิทธิภาพการผลิต (ตัวอย่าง Graph Placeholder)</h3>
                <div style={{ height: '200px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '16px', color: 'var(--text-muted)' }}>
                    <PieChart size={48} style={{ opacity: 0.5, marginRight: '16px' }} />
                    <span>พื้นที่แสดงกราฟภาพรวม (รอเชื่อมต่อ Chart Library)</span>
                </div>
            </div>
        </div>
    );

    const renderPlanList = () => (
        <div className="planning-list card-style">
            <div className="action-bar">
                {hasSectionPermission('planning_list_search') && (
                    <div className="search-group">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder="ค้นหาแผนการผลิต..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}

                <div className="action-buttons">
                    {hasSectionPermission('planning_list_search') && (
                        <button className="btn btn-outline">
                            <Filter size={16} /> ตัวกรอง
                        </button>
                    )}
                    {hasSectionPermission('planning_list_action') && (
                        <button className="btn btn-primary">
                            <Plus size={16} /> สร้างแผนการผลิต
                        </button>
                    )}
                </div>
            </div>

            {hasSectionPermission('planning_list_table') && (
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>รหัสแผน</th>
                                <th>สินค้า</th>
                                <th>จำนวนเป้าหมาย</th>
                                <th>สถานะ</th>
                                <th>วันที่เริ่ม</th>
                                <th>วันที่สิ้นสุด</th>
                                <th>ความคืบหน้า</th>
                                {hasSectionPermission('planning_list_action') && <th>จัดการ</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPlans.length > 0 ? (
                                filteredPlans.map((plan) => (
                                    <tr key={plan.id}>
                                        <td className="fw-500">{plan.id}</td>
                                        <td>{plan.product}</td>
                                        <td>{plan.targetQty}</td>
                                        <td>
                                            <span className={`status-badge ${plan.status === 'เสร็จสิ้น' ? 'status-success' : plan.status === 'กำลังผลิต' ? 'status-warning' : 'status-gray'}`}>
                                                {plan.status}
                                            </span>
                                        </td>
                                        <td>{plan.startDate}</td>
                                        <td>{plan.endDate}</td>
                                        <td>
                                            <div className="progress-container">
                                                <div className="progress-bar" style={{ width: `${plan.progress}%`, backgroundColor: plan.status === 'เสร็จสิ้น' ? 'var(--success)' : 'var(--primary)' }}></div>
                                                <span className="progress-text">{plan.progress}%</span>
                                            </div>
                                        </td>
                                        {hasSectionPermission('planning_list_action') && (
                                            <td>
                                                <button className="btn-text">แก้ไข</button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={hasSectionPermission('planning_list_action') ? 8 : 7} className="text-center py-4">
                                        ไม่พบข้อมูลแผนการผลิต
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const renderMaterials = () => (
        <div className="planning-materials card-style text-center py-4">
            <h3 className="section-title">สรุปความต้องการวัตถุดิบ (Material Requirement)</h3>
            <p className="text-muted mt-2">หน้านี้จะแสดงรายการวัตถุดิบที่ต้องใช้ตามแผนการผลิต (BOM Explosion)</p>
            <div className="empty-state mt-4">
                <Wrench size={48} className="text-muted" opacity={0.3} />
                <p className="mt-2 text-muted">กำลังอยู่ระหว่างการพัฒนา</p>
            </div>
        </div>
    );

    const renderGantt = () => (
        <div className="planning-gantt card-style text-center py-4">
            <h3 className="section-title">Gantt Chart & Timeline</h3>
            <p className="text-muted mt-2">แผนภูมิแสดงช่วงเวลาการผลิตแต่ละรายการ</p>
            <div className="empty-state mt-4">
                <CalendarDays size={48} className="text-muted" opacity={0.3} />
                <p className="mt-2 text-muted">ต้องเชื่อมต่อกับ Gantt Chart Library (เช่น dhtmlxGantt หรือ Frappe Gantt)</p>
            </div>
        </div>
    );

    const renderQCLink = () => (
        <div className="planning-qc card-style text-center py-4">
            <h3 className="section-title">เชื่อมโยงผลการตรวจสอบคุณภาพ (QC Link)</h3>
            <p className="text-muted mt-2">แสดงรายการผลิตที่กำลังรอ หรือผ่านการตรวจ QC แล้ว</p>
            <div className="empty-state mt-4">
                <CheckCircle size={48} className="text-muted" opacity={0.3} />
                <p className="mt-2 text-muted">อัปเดตสถานะอัตโนมัติเมื่อฝ่าย QC ป้อนผลแล็บ</p>
            </div>
        </div>
    );

    // ==========================================
    // Main Render
    // ==========================================
    if (visibleSubPages.length === 0) {
        return <div className="page-container"><p className="no-permission">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;
    }

    return (
        <div className="page-container planning-page page-enter">
            {currentTab === 'planning_overview' && renderOverview()}
            {currentTab === 'planning_list' && renderPlanList()}
            {currentTab === 'planning_materials' && renderMaterials()}
            {currentTab === 'planning_gantt' && renderGantt()}
            {currentTab === 'planning_qc_link' && renderQCLink()}
        </div>
    );
}

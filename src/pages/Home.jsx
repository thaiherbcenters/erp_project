/**
 * =============================================================================
 * Home.jsx — หน้าหลัก (Dashboard)
 * =============================================================================
 *
 * แสดงภาพรวมของระบบ ERP:
 *   - Tab home_stats    : สถิติภาพรวม (ยอดขาย, คำสั่งซื้อ, สินค้า, ลูกค้า) + กราฟ
 *   - Tab home_activity : กิจกรรมล่าสุด (รายการ activity)
 *   - Tab home_actions  : ปุ่มดำเนินการด่วน (Quick Actions)
 *
 * =============================================================================
 */

import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

export default function Home() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('home');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'home_stats';

    // ── ข้อมูลสถิติภาพรวม ──
    const stats = [
        { id: 'home_stats_revenue', label: 'ยอดขายรวม (เดือนนี้)', value: '฿1,250,000', change: '+15.5%', positive: true },
        { id: 'home_stats_orders', label: 'คำสั่งซื้อ OEM', value: '128', change: '+5.2%', positive: true },
        { id: 'home_stats_products', label: 'สินค้าคงคลัง (รายการ)', value: '450', change: '-1.1%', positive: false },
        { id: 'home_stats_customers', label: 'ตัวแทนจำหน่าย', value: '85', change: '+12.0%', positive: true },
    ];

    // ── ข้อมูลกิจกรรมล่าสุด ──
    const recentActivities = [
        { action: 'คำสั่งซื้อ OEM ใหม่', detail: '#OEM-2024-089 (สมุนไพรอัดเม็ด)', time: '10 นาทีที่แล้ว' },
        { action: 'อัปเดตสต็อก', detail: 'ฟ้าทะลายโจรแคปซูล (+500 ขวด)', time: '45 นาทีที่แล้ว' },
        { action: 'ส่งมอบงานผลิต', detail: 'Lot: L-2401 (ชาสมุนไพร)', time: '2 ชั่วโมงที่แล้ว' },
        { action: 'อนุมัติสูตรใหม่', detail: 'เซรั่มบำรุงผิวสูตรขมิ้นชัน', time: '3 ชั่วโมงที่แล้ว' },
        { action: 'รายงานประจำสัปดาห์', detail: 'สรุปยอดขายและสต็อก', time: '1 วันที่แล้ว' },
    ];

    return (
        <div className="page-home">
            <div className="page-title">
                <h1>ภาพรวม</h1>
                <p>สรุปข้อมูลภาพรวมของระบบ</p>
            </div>

            {/* ── Tab: สถิติภาพรวม ── */}
            {(activeTab === 'home_stats' && hasSubPermission('home_stats')) && (
                <div className="subpage-content" key="home_stats">
                    {/* การ์ดสถิติ */}
                    <div className="stats-grid">
                        {stats.filter((stat) => hasSectionPermission(stat.id)).map((stat, i) => (
                            <div className="stat-card" key={i}>
                                <div className="stat-info">
                                    <span className="stat-label">{stat.label}</span>
                                    <span className="stat-value">{stat.value}</span>
                                    <span className={`stat-change ${stat.positive ? 'positive' : 'negative'}`}>
                                        {stat.change}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* กราฟ Mock */}
                    <div className="dashboard-charts">
                        {/* กราฟแท่ง: แนวโน้มยอดขาย */}
                        <div className="chart-card card">
                            <div className="chart-header">
                                <h2>แนวโน้มยอดขาย (6 เดือนล่าสุด)</h2>
                                <select className="chart-filter">
                                    <option>รายเดือน</option>
                                    <option>รายปี</option>
                                </select>
                            </div>
                            <div className="mock-chart-container">
                                <div className="mock-bar-wrapper"><div className="mock-bar" style={{ height: '40%' }}></div><span className="mock-label">ก.ย.</span></div>
                                <div className="mock-bar-wrapper"><div className="mock-bar" style={{ height: '55%' }}></div><span className="mock-label">ต.ค.</span></div>
                                <div className="mock-bar-wrapper"><div className="mock-bar" style={{ height: '45%' }}></div><span className="mock-label">พ.ย.</span></div>
                                <div className="mock-bar-wrapper"><div className="mock-bar" style={{ height: '70%' }}></div><span className="mock-label">ธ.ค.</span></div>
                                <div className="mock-bar-wrapper"><div className="mock-bar" style={{ height: '65%' }}></div><span className="mock-label">ม.ค.</span></div>
                                <div className="mock-bar-wrapper"><div className="mock-bar" style={{ height: '85%', background: 'var(--primary)' }}></div><span className="mock-label">ก.พ.</span></div>
                            </div>
                        </div>

                        {/* กราฟวงกลม: สัดส่วนยอดขาย */}
                        <div className="chart-card card">
                            <div className="chart-header">
                                <h2>สัดส่วนยอดขายตามประเภท</h2>
                            </div>
                            <div className="mock-pie-container">
                                <div className="mock-pie-chart"></div>
                                <div className="mock-pie-legend">
                                    <div className="legend-item"><span className="dot" style={{ background: 'var(--primary)' }}></span>OEM (55%)</div>
                                    <div className="legend-item"><span className="dot" style={{ background: 'var(--primary-light)' }}></span>ขายปลีก (30%)</div>
                                    <div className="legend-item"><span className="dot" style={{ background: '#ff9800' }}></span>ตัวแทนจำหน่าย (15%)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab: กิจกรรมล่าสุด ── */}
            {(activeTab === 'home_activity' && hasSubPermission('home_activity')) && (
                <div className="subpage-content" key="home_activity">
                    {hasSectionPermission('home_activity_list') && (
                        <div className="activity-card card">
                            <h2>กิจกรรมล่าสุด</h2>
                            <div className="activity-list">
                                {recentActivities.map((item, i) => (
                                    <div className="activity-item" key={i}>
                                        <div className="activity-info">
                                            <span className="activity-action">{item.action}</span>
                                            <span className="activity-detail">{item.detail}</span>
                                        </div>
                                        <span className="activity-time">{item.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: ดำเนินการด่วน ── */}
            {(activeTab === 'home_actions' && hasSubPermission('home_actions')) && (
                <div className="subpage-content" key="home_actions">
                    {hasSectionPermission('home_actions_buttons') && (
                        <div className="quick-actions card">
                            <h2>ดำเนินการด่วน</h2>
                            <div className="actions-grid">
                                {['เพิ่มสินค้า', 'สร้างคำสั่งซื้อ', 'สร้างรายงาน', 'เพิ่มพนักงาน'].map((action, i) => (
                                    <button className="action-btn" key={i}>{action}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

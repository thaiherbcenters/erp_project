/**
 * =============================================================================
 * Reports.jsx — หน้ารายงาน (Reports)
 * =============================================================================
 *
 * แสดงรายงานและสรุปข้อมูล:
 *   - Tab reports_create : ปุ่มสร้างรายงานใหม่
 *   - Tab reports_list   : รายการรายงานที่มีอยู่ (การ์ด + ปุ่มดาวน์โหลด)
 *
 * =============================================================================
 */

import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PageCommon.css';

export default function Reports() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('reports');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'reports_create';

    // ── ข้อมูลรายงาน (mock) ──
    const reports = [
        { name: 'รายงานยอดขายรายเดือน', type: 'การขาย', date: '2026-02-01', status: 'พร้อม' },
        { name: 'สรุปสินค้าคงคลัง', type: 'คลังสินค้า', date: '2026-02-05', status: 'พร้อม' },
        { name: 'ประเมินผลพนักงาน', type: 'บุคลากร', date: '2026-02-10', status: 'กำลังประมวลผล' },
        { name: 'งบการเงิน', type: 'การเงิน', date: '2026-01-31', status: 'พร้อม' },
        { name: 'รายรับรายไตรมาส', type: 'การขาย', date: '2026-01-15', status: 'พร้อม' },
    ];

    // ── กำหนดชื่อหน้าตาม Tab ที่เลือก ──
    const getPageTitle = () => {
        switch (activeTab) {
            case 'reports_create': return 'สร้างรายงาน (Create Report)';
            case 'reports_list': return 'รายงานทั้งหมด (All Reports)';
            default: return 'รายงาน';
        }
    };

    const getPageDesc = () => {
        switch (activeTab) {
            case 'reports_create': return 'สร้างและดึงข้อมูลรายงานใหม่จากระบบตามเงื่อนไขที่ต้องการ';
            case 'reports_list': return 'รายการรายงานที่ถูกสร้างและบันทึกไว้ในระบบ';
            default: return 'รายงานและสรุปข้อมูลต่างๆ';
        }
    };

    return (
        <div className="page-container reports-page page-enter">
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <h1>{getPageTitle()}</h1>
                <p>{getPageDesc()}</p>
            </div>

            {/* ── Tab: สร้างรายงาน ── */}
            {(activeTab === 'reports_create' && hasSubPermission('reports_create')) && (
                <div className="subpage-content" key="reports_create">
                    {hasSectionPermission('reports_create_btn') && (
                        <div className="toolbar">
                            <button className="btn-primary">+ สร้างรายงาน</button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: รายการรายงาน ── */}
            {(activeTab === 'reports_list' && hasSubPermission('reports_list')) && (
                <div className="subpage-content" key="reports_list">
                    {hasSectionPermission('reports_list_cards') && (
                        <div className="card-grid">
                            {reports.map((report, i) => (
                                <div className="report-card" key={i}>
                                    <div className="report-type">{report.type}</div>
                                    <h3>{report.name}</h3>
                                    <div className="report-meta">
                                        <span className="report-date">วันที่: {report.date}</span>
                                    </div>
                                    <div className="report-footer">
                                        <span className={`badge ${report.status === 'พร้อม' ? 'badge-success' : 'badge-warning'}`}>
                                            {report.status}
                                        </span>
                                        <button className="btn-sm">ดาวน์โหลด</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

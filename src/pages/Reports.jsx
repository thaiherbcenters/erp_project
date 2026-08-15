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

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import { Search, Loader, Package, GitMerge, FileText } from 'lucide-react';

import './PageCommon.css';

export default function Reports() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('reports');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'reports_create';
    const { showAlert } = useAlert();

    // ── Traceability State ──
    const [traceType, setTraceType] = useState('batch');
    const [traceQuery, setTraceQuery] = useState('');
    const [traceData, setTraceData] = useState(null);
    const [traceLoading, setTraceLoading] = useState(false);

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
            case 'reports_traceability': return 'สอบกลับล็อตผลิต (Lot Traceability)';
            default: return 'รายงาน';
        }
    };

    const getPageDesc = () => {
        switch (activeTab) {
            case 'reports_create': return 'สร้างและดึงข้อมูลรายงานใหม่จากระบบตามเงื่อนไขที่ต้องการ';
            case 'reports_list': return 'รายการรายงานที่ถูกสร้างและบันทึกไว้ในระบบ';
            case 'reports_traceability': return 'ตรวจสอบย้อนกลับข้อมูลวัตถุดิบและปลายทางของล็อตที่ผลิต';
            default: return 'รายงานและสรุปข้อมูลต่างๆ';
        }
    };

    const handleTraceSearch = async () => {
        if (!traceQuery) return;
        setTraceLoading(true);
        try {
            const res = await api.get(`/reports/traceability?type=${traceType}&query=${encodeURIComponent(traceQuery)}`);
            setTraceData(res.data);
        } catch (error) {
            console.error('Trace error:', error);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลสอบกลับได้', 'error');
        } finally {
            setTraceLoading(false);
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

            {/* ── Tab: สอบกลับล็อตผลิต (Traceability) ── */}
            {(activeTab === 'reports_traceability' && hasSubPermission('reports_traceability')) && (
                <div className="subpage-content" key="reports_traceability">
                    {hasSectionPermission('reports_trace_search') && (
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                                <select 
                                    className="input-field" 
                                    value={traceType} 
                                    onChange={(e) => setTraceType(e.target.value)}
                                    style={{ width: 200 }}
                                >
                                    <option value="batch">ค้นหาด้วย Batch No (การผลิต)</option>
                                    <option value="lot">ค้นหาด้วย Lot No (วัตถุดิบ/WIP)</option>
                                </select>
                                <input 
                                    type="text" 
                                    className="input-field" 
                                    placeholder={traceType === 'batch' ? "เช่น B2505-..." : "เช่น WIP-B2505-... หรือ RM-..."} 
                                    value={traceQuery}
                                    onChange={(e) => setTraceQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleTraceSearch()}
                                    style={{ flex: 1, maxWidth: 400 }}
                                />
                                <button className="btn-primary" onClick={handleTraceSearch} disabled={traceLoading || !traceQuery}>
                                    {traceLoading ? <Loader size={16} className="spin" /> : <Search size={16} />} ค้นหา
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {traceData && (
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
                                    <GitMerge size={20} /> ผลการสอบกลับ (Traceability Result)
                                </h3>
                                <p style={{ margin: 0, color: '#64748b' }}>
                                    เป้าหมาย: <strong style={{ color: '#0ea5e9' }}>{traceData.info?.targetId}</strong> ({traceData.info?.targetType})
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                
                                {/* BACKWARD TRACE */}
                                <div>
                                    <h4 style={{ margin: '0 0 12px', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, color: '#334155' }}>
                                        ◀ ต้นน้ำ (Backward Trace) - แหล่งที่มา
                                    </h4>
                                    {traceData.backward && traceData.backward.length > 0 ? (
                                        <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
                                            <thead>
                                                <tr>
                                                    <th>รหัสวัตถุดิบ</th>
                                                    <th>ชื่อ</th>
                                                    <th>ประเภท</th>
                                                    <th>Lot No</th>
                                                    <th style={{ textAlign: 'right' }}>จำนวนที่ใช้</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {traceData.backward.map((b, i) => (
                                                    <tr key={i}>
                                                        <td>{b.ItemID}</td>
                                                        <td>{b.ItemName}</td>
                                                        <td>{b.ItemCategory}</td>
                                                        <td><strong style={{ color: '#059669' }}>{b.LotNo || b.BatchNo}</strong></td>
                                                        <td style={{ textAlign: 'right' }}>{b.QtyUsed || b.Quantity} {b.Unit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 6 }}>
                                            ไม่มีข้อมูลต้นน้ำ
                                        </div>
                                    )}
                                </div>

                                {/* FORWARD TRACE */}
                                <div>
                                    <h4 style={{ margin: '0 0 12px', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, color: '#334155' }}>
                                        ปลายน้ำ (Forward Trace) - ถูกนำไปใช้ที่ไหน ▶
                                    </h4>
                                    
                                    {traceType === 'lot' && traceData.forward && traceData.forward.length > 0 ? (
                                        <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
                                            <thead>
                                                <tr>
                                                    <th>Batch No (ผลิต)</th>
                                                    <th>สินค้าที่ผลิต</th>
                                                    <th style={{ textAlign: 'right' }}>จำนวนที่ถูกใช้</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {traceData.forward.map((f, i) => (
                                                    <tr key={i}>
                                                        <td><strong style={{ color: '#2563eb' }}>{f.BatchNo}</strong></td>
                                                        <td>{f.ItemName}</td>
                                                        <td style={{ textAlign: 'right' }}>{f.QtyUsed} {f.Unit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : traceType === 'batch' && traceData.forward ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {traceData.forward.wipProduced?.length > 0 && (
                                                <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 6, border: '1px solid #bbf7d0' }}>
                                                    <strong style={{ color: '#166534', display: 'block', marginBottom: 4 }}>WIP (กึ่งสำเร็จรูป) ที่ผลิตได้:</strong>
                                                    {traceData.forward.wipProduced.map((w, i) => (
                                                        <div key={i}>Lot: <strong>{w.LotNo}</strong> ({w.Quantity} {w.Unit})</div>
                                                    ))}
                                                </div>
                                            )}
                                            {traceData.forward.fgProduced?.length > 0 && (
                                                <div style={{ background: '#eff6ff', padding: 12, borderRadius: 6, border: '1px solid #bfdbfe' }}>
                                                    <strong style={{ color: '#1e40af', display: 'block', marginBottom: 4 }}>FG (สินค้าสำเร็จรูป) ที่ผลิตได้:</strong>
                                                    {traceData.forward.fgProduced.map((f, i) => (
                                                        <div key={i}>Task: {f.TaskID} | ยอด: {f.Qty}</div>
                                                    ))}
                                                </div>
                                            )}
                                            {(!traceData.forward.wipProduced?.length && !traceData.forward.fgProduced?.length) && (
                                                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 6 }}>
                                                    ยังไม่มีการรับเข้า WIP หรือ FG จาก Batch นี้
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 6 }}>
                                            ไม่มีข้อมูลปลายน้ำ
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

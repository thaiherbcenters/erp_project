/**
 * =============================================================================
 * QC.jsx — หน้าตรวจสอบคุณภาพ (Quality Control) — เชื่อมกับ Production
 * =============================================================================
 * Integration:
 *   - Production ส่งคำขอ QC → แสดงในหน้า QC In-Process / QC Final
 *   - QC กด ผ่าน/ไม่ผ่าน → ผลกลับไปอัปเดต Production Stepper อัตโนมัติ
 * =============================================================================
 */

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProduction } from '../context/ProductionContext';
import API_BASE from '../config';
import './PageCommon.css';
import './QC.css';

export default function QC() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const { qcRequests, submitQcResult, getPendingQcRequests } = useProduction();
    const visibleSubPages = getVisibleSubPages('qc');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'qc_dashboard';

    const [searchIncoming, setSearchIncoming] = useState('');
    const [searchInprocess, setSearchInprocess] = useState('');
    const [searchFinal, setSearchFinal] = useState('');
    const [searchDefect, setSearchDefect] = useState('');
    const [inspectingRequest, setInspectingRequest] = useState(null);
    const [inspectNotes, setInspectNotes] = useState('');

    const [incomings, setIncomings] = useState([]);
    const [defects, setDefects] = useState([]);

    // ── Fetch Data ──
    const fetchQcData = useCallback(async () => {
        try {
            const resInc = await fetch(`${API_BASE}/qc/incoming`);
            if (resInc.ok) {
                const data = await resInc.json();
                setIncomings(data.map(d => ({
                    id: d.IncomingID,
                    lotNumber: d.LotNumber,
                    item: d.ItemName,
                    supplier: d.SupplierName,
                    inspector: d.InspectorID,
                    result: d.Result,
                    notes: d.Notes,
                    date: d.CreatedAt ? new Date(d.CreatedAt).toLocaleDateString('th-TH') : ''
                })));
            }

            const resDef = await fetch(`${API_BASE}/qc/defect`);
            if (resDef.ok) {
                const data = await resDef.json();
                setDefects(data.map(d => ({
                    id: d.NcrID,
                    ncrNumber: d.NcrNumber,
                    refLot: d.RefLot,
                    item: d.ItemName,
                    issue: d.IssueDescription,
                    action: d.ActionTaken,
                    status: d.Status,
                    date: d.CreatedAt ? new Date(d.CreatedAt).toLocaleDateString('th-TH') : ''
                })));
            }
        } catch (err) {
            console.error('Error fetching QC data:', err);
        }
    }, []);

    import('react').then(React => {
        React.useEffect(() => {
            fetchQcData();
        }, [fetchQcData]);
    });

    const filteredIncoming = incomings.filter((item) =>
        item.lotNumber?.toLowerCase().includes(searchIncoming.toLowerCase()) ||
        item.item?.toLowerCase().includes(searchIncoming.toLowerCase())
    );
    const filteredDefect = defects.filter((item) =>
        item.ncrNumber?.toLowerCase().includes(searchDefect.toLowerCase()) ||
        item.item?.toLowerCase().includes(searchDefect.toLowerCase())
    );

    // ── QC Requests from Production ──
    const qcInprocessRequests = qcRequests.filter(r => r.type === 'qc_inprocess');
    const qcFinalRequests = qcRequests.filter(r => r.type === 'qc_final');
    const pendingRequests = getPendingQcRequests();

    // ── Stats ──
    const allQcItems = [...incomings];
    const totalInspections = allQcItems.length + qcRequests.length;
    const passedCount = allQcItems.filter(i => i.result === 'ผ่าน').length + qcRequests.filter(r => r.status === 'ผ่าน').length;
    const failedCount = allQcItems.filter(i => i.result === 'ไม่ผ่าน').length + qcRequests.filter(r => r.status === 'ไม่ผ่าน').length;
    const pendingCount = allQcItems.filter(i => i.result === 'รอตรวจสอบ').length + pendingRequests.length;

    const getResultBadge = (result) => {
        switch (result) {
            case 'ผ่าน': return 'badge-success';
            case 'ไม่ผ่าน': return 'badge-danger';
            case 'รอตรวจสอบ': case 'รอตรวจ': return 'badge-warning';
            default: return 'badge-neutral';
        }
    };
    const getStatusBadge = (status) => {
        if (status === 'ดำเนินการแล้ว') return 'badge-success';
        if (status === 'รอดำเนินการ') return 'badge-warning';
        return 'badge-neutral';
    };

    // ── Handle QC inspection submit ──
    const handleInspect = (requestId, result) => {
        submitQcResult(requestId, result, 'qc1', inspectNotes);
        setInspectingRequest(null);
        setInspectNotes('');
    };

    // ── Render QC requests from Production as a table ──
    const renderProductionQcTable = (requests, type) => {
        if (requests.length === 0) {
            return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>ยังไม่มีรายการ</p>;
        }

        return (
            <>
                {/* Pending requests from Production (highlighted) */}
                {requests.filter(r => r.status === 'รอตรวจ').length > 0 && (
                    <div className="qc-pending-section">
                        <h4 className="qc-pending-title">
                            🔔 คำขอตรวจจากฝ่ายผลิต ({requests.filter(r => r.status === 'รอตรวจ').length} รายการ)
                        </h4>
                        <div className="qc-pending-grid">
                            {requests.filter(r => r.status === 'รอตรวจ').map(req => (
                                <div key={req.id} className="qc-pending-card">
                                    <div className="qc-pending-header">
                                        <div>
                                            <span className="qc-pending-batch">{req.batchNo}</span>
                                            <span className="qc-pending-jo">← {req.jobOrderId}</span>
                                        </div>
                                        <span className="badge badge-warning">⏳ รอตรวจ</span>
                                    </div>
                                    <div className="qc-pending-product">{req.formulaName}</div>
                                    <div className="qc-pending-meta">
                                        <span>📅 ส่ง: {req.requestedAt}</span>
                                        <span>🏭 {req.line}</span>
                                    </div>

                                    {inspectingRequest === req.id ? (
                                        <div className="qc-inspect-form">
                                            <textarea
                                                className="qc-inspect-notes"
                                                placeholder="หมายเหตุ (ถ้ามี)..."
                                                value={inspectNotes}
                                                onChange={(e) => setInspectNotes(e.target.value)}
                                            />
                                            <div className="qc-inspect-actions">
                                                <button className="qc-btn qc-btn-pass" onClick={() => handleInspect(req.id, 'ผ่าน')}>
                                                    ✅ ผ่าน
                                                </button>
                                                <button className="qc-btn qc-btn-fail" onClick={() => handleInspect(req.id, 'ไม่ผ่าน')}>
                                                    ❌ ไม่ผ่าน
                                                </button>
                                                <button className="qc-btn qc-btn-cancel" onClick={() => { setInspectingRequest(null); setInspectNotes(''); }}>
                                                    ยกเลิก
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="qc-pending-actions">
                                            <button className="qc-btn qc-btn-inspect" onClick={() => setInspectingRequest(req.id)}>
                                                🔍 ตรวจสอบ
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Completed QC results */}
                {requests.filter(r => r.status !== 'รอตรวจ').length > 0 && (
                    <div className="card table-card" style={{ marginTop: 16 }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                            ผลตรวจจากฝ่ายผลิต
                        </h4>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Batch No.</th>
                                    <th>ใบสั่งผลิต</th>
                                    <th>ผลิตภัณฑ์</th>
                                    <th>ไลน์</th>
                                    <th>วันที่ส่ง</th>
                                    <th>วันที่ตรวจ</th>
                                    <th>ผู้ตรวจ</th>
                                    <th>ผลตรวจ</th>
                                    <th>หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.filter(r => r.status !== 'รอตรวจ').map(req => (
                                    <tr key={req.id}>
                                        <td className="text-bold">{req.batchNo}</td>
                                        <td><span className="op-jo-ref">{req.jobOrderId}</span></td>
                                        <td>{req.formulaName}</td>
                                        <td>{req.line}</td>
                                        <td>{req.requestedAt}</td>
                                        <td>{req.inspectedAt || '—'}</td>
                                        <td>{req.inspector || '—'}</td>
                                        <td><span className={`badge ${getResultBadge(req.status)}`}>{req.status}</span></td>
                                        <td>{req.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="page-content">
            <div className="page-title">
                <h1>ตรวจสอบคุณภาพ (QC)</h1>
                <p>จัดการและติดตามผลการตรวจสอบคุณภาพสินค้า</p>
            </div>

            {/* ── Dashboard ── */}
            {(activeTab === 'qc_dashboard' && hasSubPermission('qc_dashboard')) && (
                <div className="subpage-content" key="qc_dashboard">
                    <div className="summary-row">
                        {hasSectionPermission('qc_dashboard_total') && (
                            <div className="summary-card card">
                                <div className="summary-icon">📋</div>
                                <div>
                                    <span className="summary-label">รายการตรวจทั้งหมด</span>
                                    <span className="summary-value">{totalInspections}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('qc_dashboard_passed') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#2d9e5a' }}>✓</div>
                                <div>
                                    <span className="summary-label">ผ่านการตรวจ</span>
                                    <span className="summary-value" style={{ color: '#2d9e5a' }}>{passedCount}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('qc_dashboard_failed') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#c04040' }}>✕</div>
                                <div>
                                    <span className="summary-label">ไม่ผ่านการตรวจ</span>
                                    <span className="summary-value" style={{ color: '#c04040' }}>{failedCount}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('qc_dashboard_pending') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#c67d08' }}>⏳</div>
                                <div>
                                    <span className="summary-label">รอตรวจสอบ</span>
                                    <span className="summary-value" style={{ color: '#c67d08' }}>{pendingCount}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pending requests banner on dashboard */}
                    {pendingRequests.length > 0 && (
                        <div className="qc-dashboard-alert">
                            <div className="qc-dashboard-alert-icon">🔔</div>
                            <div>
                                <strong>มีคำขอตรวจใหม่จากฝ่ายผลิต {pendingRequests.length} รายการ</strong>
                                <p>กรุณาเข้าไปตรวจที่ Tab "QC In-Process" หรือ "QC Final"</p>
                                <div className="qc-dashboard-alert-items">
                                    {pendingRequests.map(r => (
                                        <span key={r.id} className="qc-dashboard-alert-tag">
                                            {r.batchNo} — {r.formulaName} ({r.typeLabel})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Incoming ── */}
            {(activeTab === 'qc_incoming' && hasSubPermission('qc_incoming')) && (
                <div className="subpage-content" key="qc_incoming">
                    {hasSectionPermission('qc_incoming_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input type="text" placeholder="พิมพ์ Lot No., วัตถุดิบ..." value={searchIncoming} onChange={(e) => setSearchIncoming(e.target.value)} />
                            </div>
                            <button className="btn-primary">+ ตรวจรับวัตถุดิบ</button>
                        </div>
                    )}
                    {hasSectionPermission('qc_incoming_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr><th>วันที่</th><th>Lot Number</th><th>วัตถุดิบ</th><th>Supplier</th><th>ผู้ตรวจ</th><th>ผลตรวจ</th><th>หมายเหตุ</th></tr>
                                </thead>
                                <tbody>
                                    {filteredIncoming.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.date}</td>
                                            <td className="text-bold">{item.lotNumber}</td>
                                            <td>{item.item}</td>
                                            <td>{item.supplier}</td>
                                            <td>{item.inspector}</td>
                                            <td><span className={`badge ${getResultBadge(item.result)}`}>{item.result}</span></td>
                                            <td className="text-muted">{item.notes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── In-Process — NOW WITH PRODUCTION QC REQUESTS ── */}
            {(activeTab === 'qc_inprocess' && hasSubPermission('qc_inprocess')) && (
                <div className="subpage-content" key="qc_inprocess">
                    {renderProductionQcTable(qcInprocessRequests, 'qc_inprocess')}

                    {/* Production QC requests */}
                    {hasSectionPermission('qc_inprocess_search') && (
                        <div className="toolbar" style={{ marginTop: 16 }}>
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input type="text" placeholder="ค้นหาข้อมูล..." value={searchInprocess} onChange={(e) => setSearchInprocess(e.target.value)} />
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* ── Final — NOW WITH PRODUCTION QC REQUESTS ── */}
            {(activeTab === 'qc_final' && hasSubPermission('qc_final')) && (
                <div className="subpage-content" key="qc_final">
                    {renderProductionQcTable(qcFinalRequests, 'qc_final')}

                    {hasSectionPermission('qc_final_search') && (
                        <div className="toolbar" style={{ marginTop: 16 }}>
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input type="text" placeholder="ค้นหาข้อมูล..." value={searchFinal} onChange={(e) => setSearchFinal(e.target.value)} />
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* ── Defect / NCR ── */}
            {(activeTab === 'qc_defect' && hasSubPermission('qc_defect')) && (
                <div className="subpage-content" key="qc_defect">
                    {hasSectionPermission('qc_defect_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input type="text" placeholder="พิมพ์ NCR No., สินค้า..." value={searchDefect} onChange={(e) => setSearchDefect(e.target.value)} />
                            </div>
                            <button className="btn-danger">+ สร้าง NCR</button>
                        </div>
                    )}
                    {hasSectionPermission('qc_defect_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr><th>เลขที่ NCR</th><th>Lot อ้างอิง</th><th>สินค้า</th><th>ปัญหา</th><th>การจัดการ</th><th>สถานะ</th></tr>
                                </thead>
                                <tbody>
                                    {filteredDefect.map(item => (
                                        <tr key={item.id}>
                                            <td className="text-bold text-danger">{item.ncrNumber}</td>
                                            <td>{item.refLot}</td>
                                            <td>{item.item}</td>
                                            <td>{item.issue}</td>
                                            <td>{item.action}</td>
                                            <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Reports ── */}
            {(activeTab === 'qc_reports' && hasSubPermission('qc_reports')) && (
                <div className="subpage-content" key="qc_reports">
                    {hasSectionPermission('qc_reports_list') && (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                            <h3>รายงานและการวิเคราะห์คุณภาพ</h3>
                            <p className="text-muted" style={{ marginTop: '0.5rem' }}>
                                สามารถดึงรายงานสรุป (Monthly / Yearly QC Report) จากส่วนนี้
                            </p>
                            <button className="btn-primary" style={{ marginTop: '1.5rem' }}>สร้างรายงานใหม่</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

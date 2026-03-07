/**
 * =============================================================================
 * QC.jsx — หน้าตรวจสอบคุณภาพ (Quality Control)
 * =============================================================================
 *
 * แสดงข้อมูลการตรวจสอบคุณภาพสินค้า:
 *   - Tab qc_dashboard : สรุปผลตวจ
 *   - Tab qc_incoming  : วัตถุดิบเข้า (Incoming)
 *   - Tab qc_inprocess : ระหว่างผลิต (In-Process)
 *   - Tab qc_final     : ก่อนบรรจุ (Final)
 *   - Tab qc_defect    : ของเสีย (Defect / NCR)
 *   - Tab qc_reports   : รายงาน (Reports)
 *
 * =============================================================================
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    MOCK_QC_INCOMING,
    MOCK_QC_INPROCESS,
    MOCK_QC_FINAL,
    MOCK_QC_DEFECT
} from '../data/mockData';
import './PageCommon.css';

export default function QC() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('qc');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'qc_dashboard';

    // ── States: ค้นหา ──
    const [searchIncoming, setSearchIncoming] = useState('');
    const [searchInprocess, setSearchInprocess] = useState('');
    const [searchFinal, setSearchFinal] = useState('');
    const [searchDefect, setSearchDefect] = useState('');

    // ── กรองข้อมูล ──
    const filteredIncoming = MOCK_QC_INCOMING.filter((item) =>
        item.lotNumber.toLowerCase().includes(searchIncoming.toLowerCase()) ||
        item.item.toLowerCase().includes(searchIncoming.toLowerCase()) ||
        item.result.toLowerCase().includes(searchIncoming.toLowerCase())
    );

    const filteredInprocess = MOCK_QC_INPROCESS.filter((item) =>
        item.lotNumber.toLowerCase().includes(searchInprocess.toLowerCase()) ||
        item.process.toLowerCase().includes(searchInprocess.toLowerCase()) ||
        item.result.toLowerCase().includes(searchInprocess.toLowerCase())
    );

    const filteredFinal = MOCK_QC_FINAL.filter((item) =>
        item.lotNumber.toLowerCase().includes(searchFinal.toLowerCase()) ||
        item.product.toLowerCase().includes(searchFinal.toLowerCase()) ||
        item.result.toLowerCase().includes(searchFinal.toLowerCase())
    );

    const filteredDefect = MOCK_QC_DEFECT.filter((item) =>
        item.ncrNumber.toLowerCase().includes(searchDefect.toLowerCase()) ||
        item.item.toLowerCase().includes(searchDefect.toLowerCase()) ||
        item.status.toLowerCase().includes(searchDefect.toLowerCase())
    );

    // ── สถิติสำหรับ Dashboard ──
    const allQcItems = [...MOCK_QC_INCOMING, ...MOCK_QC_INPROCESS, ...MOCK_QC_FINAL];
    const totalInspections = allQcItems.length;
    const passedCount = allQcItems.filter((i) => i.result === 'ผ่าน').length;
    const failedCount = allQcItems.filter((i) => i.result === 'ไม่ผ่าน').length;
    const pendingCount = allQcItems.filter((i) => i.result === 'รอตรวจสอบ').length;

    // ── เลือก badge class ──
    const getResultBadge = (result) => {
        switch (result) {
            case 'ผ่าน': return 'badge-success';
            case 'ไม่ผ่าน': return 'badge-danger';
            case 'รอตรวจสอบ': return 'badge-warning';
            default: return 'badge-neutral';
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'ดำเนินการแล้ว') return 'badge-success';
        if (status === 'รอดำเนินการ') return 'badge-warning';
        return 'badge-neutral';
    };

    return (
        <div className="page-content">
            <div className="page-title">
                <h1>ตรวจสอบคุณภาพ (QC)</h1>
                <p>จัดการและติดตามผลการตรวจสอบคุณภาพสินค้า (Incoming, In-Process, Final)</p>
            </div>

            {/* ── Tab: Dashboard สรุปผลตรวจ ── */}
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
                </div>
            )}

            {/* ── Tab: Incoming (วัตถุดิบเข้า) ── */}
            {(activeTab === 'qc_incoming' && hasSubPermission('qc_incoming')) && (
                <div className="subpage-content" key="qc_incoming">
                    {hasSectionPermission('qc_incoming_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์ Lot No., วัตถุดิบ, หรือผลตรวจ..."
                                    value={searchIncoming}
                                    onChange={(e) => setSearchIncoming(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">+ ตรวจรับวัตถุดิบ</button>
                        </div>
                    )}

                    {hasSectionPermission('qc_incoming_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>วันที่</th>
                                        <th>Lot Number</th>
                                        <th>วัตถุดิบ (Item)</th>
                                        <th>Supplier</th>
                                        <th>ผู้ตรวจสอบ</th>
                                        <th>ผลตรวจ</th>
                                        <th>หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredIncoming.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.date}</td>
                                            <td className="text-bold">{item.lotNumber}</td>
                                            <td>{item.item}</td>
                                            <td>{item.supplier}</td>
                                            <td>{item.inspector}</td>
                                            <td>
                                                <span className={`badge ${getResultBadge(item.result)}`}>
                                                    {item.result}
                                                </span>
                                            </td>
                                            <td className="text-muted">{item.notes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: In-Process (ระหว่างผลิต) ── */}
            {(activeTab === 'qc_inprocess' && hasSubPermission('qc_inprocess')) && (
                <div className="subpage-content" key="qc_inprocess">
                    {hasSectionPermission('qc_inprocess_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์ Lot No., กระบวนการ..."
                                    value={searchInprocess}
                                    onChange={(e) => setSearchInprocess(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">+ บันทึกผลระหว่างกระบวนการ</button>
                        </div>
                    )}

                    {hasSectionPermission('qc_inprocess_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>วันที่</th>
                                        <th>Lot Number</th>
                                        <th>กระบวนการ</th>
                                        <th>Line ผลิต</th>
                                        <th>ผู้ตรวจสอบ</th>
                                        <th>ผลตรวจ</th>
                                        <th>หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInprocess.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.date}</td>
                                            <td className="text-bold">{item.lotNumber}</td>
                                            <td>{item.process}</td>
                                            <td>{item.line}</td>
                                            <td>{item.inspector}</td>
                                            <td>
                                                <span className={`badge ${getResultBadge(item.result)}`}>
                                                    {item.result}
                                                </span>
                                            </td>
                                            <td className="text-muted">{item.notes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Final (ตรวจสอบก่อนบรรจุ) ── */}
            {(activeTab === 'qc_final' && hasSubPermission('qc_final')) && (
                <div className="subpage-content" key="qc_final">
                    {hasSectionPermission('qc_final_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์ Lot No., สินค้าสำเร็จรูป..."
                                    value={searchFinal}
                                    onChange={(e) => setSearchFinal(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">+ ตรวจสอบก่อนบรรจุ</button>
                        </div>
                    )}

                    {hasSectionPermission('qc_final_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>วันที่</th>
                                        <th>Lot Number</th>
                                        <th>สินค้าสำเร็จรูป</th>
                                        <th>จำนวน (ชิ้น)</th>
                                        <th>ผู้ตรวจสอบ</th>
                                        <th>ผลตรวจ</th>
                                        <th>หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredFinal.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.date}</td>
                                            <td className="text-bold">{item.lotNumber}</td>
                                            <td>{item.product}</td>
                                            <td>{item.qty}</td>
                                            <td>{item.inspector}</td>
                                            <td>
                                                <span className={`badge ${getResultBadge(item.result)}`}>
                                                    {item.result}
                                                </span>
                                            </td>
                                            <td className="text-muted">{item.notes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Defect / NCR (ของเสีย) ── */}
            {(activeTab === 'qc_defect' && hasSubPermission('qc_defect')) && (
                <div className="subpage-content" key="qc_defect">
                    {hasSectionPermission('qc_defect_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์ NCR No., สินค้า/วัตถุดิบ หรือปัญหา..."
                                    value={searchDefect}
                                    onChange={(e) => setSearchDefect(e.target.value)}
                                />
                            </div>
                            <button className="btn-danger">+ สร้าง NCR</button>
                        </div>
                    )}

                    {hasSectionPermission('qc_defect_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>เลขที่ NCR</th>
                                        <th>Lot อ้างอิง</th>
                                        <th>สินค้า/วัตถุดิบ</th>
                                        <th>ปัญหาที่พบ (Issue)</th>
                                        <th>การจัดการ (Action)</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDefect.map((item) => (
                                        <tr key={item.id}>
                                            <td className="text-bold text-danger">{item.ncrNumber}</td>
                                            <td>{item.refLot}</td>
                                            <td>{item.item}</td>
                                            <td>{item.issue}</td>
                                            <td>{item.action}</td>
                                            <td>
                                                <span className={`badge ${getStatusBadge(item.status)}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Reports ── */}
            {(activeTab === 'qc_reports' && hasSubPermission('qc_reports')) && (
                <div className="subpage-content" key="qc_reports">
                    {hasSectionPermission('qc_reports_list') && (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                            <h3>รายงานและการวิเคราะห์คุณภาพ</h3>
                            <p className="text-muted" style={{ marginTop: '0.5rem' }}>
                                สามารถดึงรายงานสรุป (Monthly / Yearly QC Report) และวิเคราะห์สัดส่วนของเสียได้จากส่วนนี้
                            </p>
                            <button className="btn-primary" style={{ marginTop: '1.5rem' }}>สร้างรายงานใหม่</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * =============================================================================
 * Accounts.jsx — หน้าบัญชี (Accounts)
 * =============================================================================
 *
 * แสดงข้อมูลบัญชี:
 *   - Tab accounts_dashboard : Accounts Dashboard (AR, AP, กำไร/ขาดทุน)
 *   - Tab accounts_ar        : Accounts Receivable — ลูกหนี้การค้า
 *   - Tab accounts_ap        : Accounts Payable — เจ้าหนี้การค้า
 *   - Tab accounts_reports   : Reports — รายงานบัญชี
 *
 * =============================================================================
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOCK_AR, MOCK_AP } from '../data/mockData';
import './PageCommon.css';

export default function Accounts() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('accounts');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'accounts_dashboard';

    // ── State: ค้นหาแยกตาม tab ──
    const [arSearch, setArSearch] = useState('');
    const [apSearch, setApSearch] = useState('');

    // ── State: กรอง docType (invoice / payment / credit_note / all) ──
    const [arFilter, setArFilter] = useState('all');
    const [apFilter, setApFilter] = useState('all');

    // ── คำนวณ Dashboard stats ──
    const arInvoiceTotal = MOCK_AR
        .filter((d) => d.docType === 'invoice')
        .reduce((sum, d) => sum + d.amount, 0);
    const apInvoiceTotal = MOCK_AP
        .filter((d) => d.docType === 'invoice')
        .reduce((sum, d) => sum + d.amount, 0);
    const profit = arInvoiceTotal - apInvoiceTotal;

    // ── กรอง AR ──
    const filteredAR = MOCK_AR.filter((d) => {
        const matchSearch =
            d.number.toLowerCase().includes(arSearch.toLowerCase()) ||
            d.customer.toLowerCase().includes(arSearch.toLowerCase());
        const matchFilter = arFilter === 'all' || d.docType === arFilter;
        return matchSearch && matchFilter;
    });

    // ── กรอง AP ──
    const filteredAP = MOCK_AP.filter((d) => {
        const matchSearch =
            d.number.toLowerCase().includes(apSearch.toLowerCase()) ||
            d.supplier.toLowerCase().includes(apSearch.toLowerCase());
        const matchFilter = apFilter === 'all' || d.docType === apFilter;
        return matchSearch && matchFilter;
    });

    // ── Badge class helpers ──
    const getDocStatusClass = (status) => {
        switch (status) {
            case 'ชำระแล้ว': case 'สำเร็จ': return 'badge-success';
            case 'ค้างชำระ': return 'badge-danger';
            case 'อนุมัติ': return 'badge-info';
            default: return 'badge-neutral';
        }
    };

    const getDocTypeLabel = (docType) => {
        switch (docType) {
            case 'invoice': return 'Invoice';
            case 'payment': return 'Payment';
            case 'credit_note': return 'Credit Note';
            default: return docType;
        }
    };

    // ── รายงานบัญชี (mock) ──
    const accountReports = [
        { name: 'งบกำไรขาดทุน', type: 'การเงิน', date: '2026-02-28', status: 'พร้อม' },
        { name: 'รายงานลูกหนี้คงค้าง', type: 'AR', date: '2026-03-01', status: 'พร้อม' },
        { name: 'รายงานเจ้าหนี้คงค้าง', type: 'AP', date: '2026-03-01', status: 'พร้อม' },
        { name: 'งบดุล', type: 'การเงิน', date: '2026-02-28', status: 'กำลังประมวลผล' },
        { name: 'ภาษีมูลค่าเพิ่ม', type: 'ภาษี', date: '2026-02-28', status: 'พร้อม' },
    ];

    // ── กำหนดชื่อหน้าตาม Tab ที่เลือก ──
    const getPageTitle = () => {
        switch (activeTab) {
            case 'accounts_dashboard': return 'ภาพรวมบัญชี';
            case 'accounts_ar': return 'ลูกหนี้การค้า (AR)';
            case 'accounts_ap': return 'เจ้าหนี้การค้า (AP)';
            case 'accounts_reports': return 'รายงานบัญชี';
            default: return 'บัญชี';
        }
    };

    const getPageDesc = () => {
        switch (activeTab) {
            case 'accounts_dashboard': return 'ภาพรวมลูกหนี้ เจ้าหนี้ และกำไรขาดทุน';
            case 'accounts_ar': return 'จัดการข้อมูลลูกหนี้การค้าและการรับชำระเงิน';
            case 'accounts_ap': return 'จัดการข้อมูลเจ้าหนี้การค้าและการจ่ายชำระเงิน';
            case 'accounts_reports': return 'รายงานงบการเงินและเอกสารทางบัญชี';
            default: return 'จัดการลูกหนี้ เจ้าหนี้ และรายงานการเงิน';
        }
    };

    return (
        <div className="page-container accounts-page page-enter">
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <h1>{getPageTitle()}</h1>
                <p>{getPageDesc()}</p>
            </div>

            {/* ── Tab: Accounts Dashboard ── */}
            {(activeTab === 'accounts_dashboard' && hasSubPermission('accounts_dashboard')) && (
                <div className="subpage-content" key="accounts_dashboard">
                    <div className="summary-row">
                        {hasSectionPermission('accounts_dashboard_ar_total') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#2d9e5a' }}>↓</div>
                                <div>
                                    <span className="summary-label">ลูกหนี้การค้ารวม (AR)</span>
                                    <span className="summary-value" style={{ color: '#2d9e5a' }}>
                                        ฿{arInvoiceTotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('accounts_dashboard_ap_total') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#c04040' }}>↑</div>
                                <div>
                                    <span className="summary-label">เจ้าหนี้การค้ารวม (AP)</span>
                                    <span className="summary-value" style={{ color: '#c04040' }}>
                                        ฿{apInvoiceTotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('accounts_dashboard_profit') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: profit >= 0 ? '#2d9e5a' : '#c04040' }}>
                                    {profit >= 0 ? '▲' : '▼'}
                                </div>
                                <div>
                                    <span className="summary-label">กำไร/ขาดทุน</span>
                                    <span className="summary-value" style={{ color: profit >= 0 ? '#2d9e5a' : '#c04040' }}>
                                        ฿{Math.abs(profit).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab: Accounts Receivable (AR) ── */}
            {(activeTab === 'accounts_ar' && hasSubPermission('accounts_ar')) && (
                <div className="subpage-content" key="accounts_ar">
                    {/* ค้นหา + กรอง docType */}
                    {hasSectionPermission('accounts_ar_invoice') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์เลขที่เอกสาร หรือชื่อลูกค้า..."
                                    value={arSearch}
                                    onChange={(e) => setArSearch(e.target.value)}
                                />
                            </div>
                            <select
                                className="filter-select"
                                value={arFilter}
                                onChange={(e) => setArFilter(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '14px' }}
                            >
                                <option value="all">ทั้งหมด</option>
                                <option value="invoice">Invoice</option>
                                <option value="payment">Receive Payment</option>
                                <option value="credit_note">Credit Note</option>
                            </select>
                            <button className="btn-primary">+ สร้าง Invoice</button>
                        </div>
                    )}

                    {hasSectionPermission('accounts_ar_invoice') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ลำดับ</th>
                                        <th>เลขที่เอกสาร</th>
                                        <th>ลูกค้า</th>
                                        <th>ประเภท</th>
                                        <th>จำนวนเงิน (บาท)</th>
                                        <th>วันที่</th>
                                        <th>ครบกำหนด</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAR.map((d) => (
                                        <tr key={d.id}>
                                            <td>{d.id}</td>
                                            <td className="text-bold">{d.number}</td>
                                            <td>{d.customer}</td>
                                            <td>
                                                <span className="badge badge-neutral">{getDocTypeLabel(d.docType)}</span>
                                            </td>
                                            <td style={{ color: d.amount < 0 ? '#c04040' : 'inherit' }}>
                                                {d.amount < 0 ? '-' : ''}฿{Math.abs(d.amount).toLocaleString()}
                                            </td>
                                            <td>{d.date}</td>
                                            <td>{d.dueDate || '—'}</td>
                                            <td>
                                                <span className={`badge ${getDocStatusClass(d.status)}`}>
                                                    {d.status}
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

            {/* ── Tab: Accounts Payable (AP) ── */}
            {(activeTab === 'accounts_ap' && hasSubPermission('accounts_ap')) && (
                <div className="subpage-content" key="accounts_ap">
                    {hasSectionPermission('accounts_ap_invoice') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์เลขที่เอกสาร หรือชื่อซัพพลายเออร์..."
                                    value={apSearch}
                                    onChange={(e) => setApSearch(e.target.value)}
                                />
                            </div>
                            <select
                                className="filter-select"
                                value={apFilter}
                                onChange={(e) => setApFilter(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '14px' }}
                            >
                                <option value="all">ทั้งหมด</option>
                                <option value="invoice">Invoice</option>
                                <option value="payment">Payment</option>
                                <option value="credit_note">Credit Note</option>
                            </select>
                            <button className="btn-primary">+ สร้าง Bill</button>
                        </div>
                    )}

                    {hasSectionPermission('accounts_ap_invoice') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ลำดับ</th>
                                        <th>เลขที่เอกสาร</th>
                                        <th>ซัพพลายเออร์</th>
                                        <th>ประเภท</th>
                                        <th>จำนวนเงิน (บาท)</th>
                                        <th>วันที่</th>
                                        <th>ครบกำหนด</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAP.map((d) => (
                                        <tr key={d.id}>
                                            <td>{d.id}</td>
                                            <td className="text-bold">{d.number}</td>
                                            <td>{d.supplier}</td>
                                            <td>
                                                <span className="badge badge-neutral">{getDocTypeLabel(d.docType)}</span>
                                            </td>
                                            <td style={{ color: d.amount < 0 ? '#c04040' : 'inherit' }}>
                                                {d.amount < 0 ? '-' : ''}฿{Math.abs(d.amount).toLocaleString()}
                                            </td>
                                            <td>{d.date}</td>
                                            <td>{d.dueDate || '—'}</td>
                                            <td>
                                                <span className={`badge ${getDocStatusClass(d.status)}`}>
                                                    {d.status}
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
            {(activeTab === 'accounts_reports' && hasSubPermission('accounts_reports')) && (
                <div className="subpage-content" key="accounts_reports">
                    {hasSectionPermission('accounts_reports_list') && (
                        <div className="card-grid">
                            {accountReports.map((report, i) => (
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

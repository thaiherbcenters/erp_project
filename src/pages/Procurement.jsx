/**
 * =============================================================================
 * Procurement.jsx — หน้าจัดซื้อ (Procurement)
 * =============================================================================
 *
 * แสดงข้อมูลฝ่ายจัดซื้อ:
 *   - Tab procurement_dashboard : Dashboard ยอดสั่งซื้อ จำนวน PR/PO และการรับสินค้า
 *   - Tab procurement_pr        : Purchase Requisition (ใบขอซื้อ)
 *   - Tab procurement_po        : Purchase Order (ใบสั่งซื้อ)
 *   - Tab procurement_recv      : Receiving (รายการรับสินค้าเข้าคลัง)
 *
 * =============================================================================
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOCK_PR, MOCK_PO, MOCK_RECV } from '../data/mockData';
import './PageCommon.css';

export default function Procurement() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('procurement');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'procurement_dashboard';

    // ── State: ค้นหาแยกตาม tab ──
    const [prSearch, setPrSearch] = useState('');
    const [poSearch, setPoSearch] = useState('');
    const [recvSearch, setRecvSearch] = useState('');

    // ── คำนวณ Dashboard stats ──
    const totalOrderedAmount = MOCK_PO.reduce((sum, po) => sum + po.total, 0);
    const totalPRs = MOCK_PR.length;
    const totalPOs = MOCK_PO.length;
    const completedReceives = MOCK_RECV.filter(r => r.status === 'ครบถ้วน').length;

    // ── กรองข้อมูลแต่ละ tab ──
    const filteredPR = MOCK_PR.filter((pr) =>
        pr.number.toLowerCase().includes(prSearch.toLowerCase()) ||
        pr.item.toLowerCase().includes(prSearch.toLowerCase()) ||
        pr.requestor.toLowerCase().includes(prSearch.toLowerCase())
    );

    const filteredPO = MOCK_PO.filter((po) =>
        po.number.toLowerCase().includes(poSearch.toLowerCase()) ||
        po.supplier.toLowerCase().includes(poSearch.toLowerCase()) ||
        po.item.toLowerCase().includes(poSearch.toLowerCase())
    );

    const filteredRecv = MOCK_RECV.filter((r) =>
        r.number.toLowerCase().includes(recvSearch.toLowerCase()) ||
        r.poNumber.toLowerCase().includes(recvSearch.toLowerCase()) ||
        r.supplier.toLowerCase().includes(recvSearch.toLowerCase())
    );

    // ── Badge class helpers ──
    const getPRStatusClass = (status) => {
        switch (status) {
            case 'อนุมัติแล้ว': return 'badge-success';
            case 'สั่งซื้อแล้ว': return 'badge-info';
            case 'รออนุมัติ': return 'badge-warning';
            case 'ไม่อนุมัติ': return 'badge-danger';
            default: return 'badge-neutral';
        }
    };

    const getPOStatusClass = (status) => {
        switch (status) {
            case 'รับสินค้าแล้ว': return 'badge-success';
            case 'กำลังจัดส่ง': return 'badge-info';
            case 'รอเตรียมจัดส่ง': return 'badge-warning';
            case 'ยกเลิก': return 'badge-danger';
            default: return 'badge-neutral';
        }
    };

    const getRecvStatusClass = (status) => {
        switch (status) {
            case 'ครบถ้วน': return 'badge-success';
            case 'ไม่ครบ': return 'badge-warning';
            case 'ตีกลับ': return 'badge-danger';
            default: return 'badge-neutral';
        }
    };

    return (
        <div className="page-content">
            <div className="page-title">
                <h1>จัดซื้อ (Procurement)</h1>
                <p>จัดการคำขอซื้อ สั่งซื้อ และรับสินค้า</p>
            </div>

            {/* ── Tab: Procurement Dashboard ── */}
            {(activeTab === 'procurement_dashboard' && hasSubPermission('procurement_dashboard')) && (
                <div className="subpage-content" key="procurement_dashboard">
                    <div className="summary-row">
                        {hasSectionPermission('procurement_dashboard_total') && (
                            <div className="summary-card card">
                                <div className="summary-icon">฿</div>
                                <div>
                                    <span className="summary-label">ยอดสั่งซื้อ (บาท)</span>
                                    <span className="summary-value">฿{totalOrderedAmount.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('procurement_dashboard_orders') && (
                            <div className="summary-card card">
                                <div className="summary-icon">📄</div>
                                <div>
                                    <span className="summary-label">จำนวน PR / PO</span>
                                    <span className="summary-value">{totalPRs} / {totalPOs}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('procurement_dashboard_receiving') && (
                            <div className="summary-card card">
                                <div className="summary-icon">📦</div>
                                <div>
                                    <span className="summary-label">รับสินค้า (ครบถ้วน)</span>
                                    <span className="summary-value">{completedReceives} รายการ</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab: PR (Purchase Requisition) ── */}
            {(activeTab === 'procurement_pr' && hasSubPermission('procurement_pr')) && (
                <div className="subpage-content" key="procurement_pr">
                    {hasSectionPermission('procurement_pr_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์เลขที่ PR, รายการ หรือผู้ขอ..."
                                    value={prSearch}
                                    onChange={(e) => setPrSearch(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">+ สร้างใบขอซื้อ (PR)</button>
                        </div>
                    )}

                    {hasSectionPermission('procurement_pr_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>เลขที่ PR</th>
                                        <th>ผู้ขอ / แผนก</th>
                                        <th>รายการ</th>
                                        <th>จำนวน</th>
                                        <th>ราคาประเมิน</th>
                                        <th>วันที่ขอ</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPR.map((pr) => (
                                        <tr key={pr.id}>
                                            <td className="text-bold">{pr.number}</td>
                                            <td>{pr.requestor} <br /><small className="text-muted">{pr.department}</small></td>
                                            <td>{pr.item}</td>
                                            <td>{pr.qty}</td>
                                            <td>฿{pr.estimatedPrice.toLocaleString()}</td>
                                            <td>{pr.date}</td>
                                            <td>
                                                <span className={`badge ${getPRStatusClass(pr.status)}`}>
                                                    {pr.status}
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

            {/* ── Tab: PO (Purchase Order) ── */}
            {(activeTab === 'procurement_po' && hasSubPermission('procurement_po')) && (
                <div className="subpage-content" key="procurement_po">
                    {hasSectionPermission('procurement_po_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์เลขที่ PO, ซัพพลายเออร์ หรือสินค้า..."
                                    value={poSearch}
                                    onChange={(e) => setPoSearch(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">+ สร้างใบสั่งซื้อ (PO)</button>
                        </div>
                    )}

                    {hasSectionPermission('procurement_po_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>เลขที่ PO</th>
                                        <th>อ้างอิง PR</th>
                                        <th>ซัพพลายเออร์</th>
                                        <th>สินค้าที่สั่ง</th>
                                        <th>จำนวน</th>
                                        <th>ยอดรวม</th>
                                        <th>วันที่สั่ง</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPO.map((po) => (
                                        <tr key={po.id}>
                                            <td className="text-bold">{po.number}</td>
                                            <td>{po.prNumber || '-'}</td>
                                            <td>{po.supplier}</td>
                                            <td>{po.item}</td>
                                            <td>{po.qty}</td>
                                            <td>฿{po.total.toLocaleString()}</td>
                                            <td>{po.date}</td>
                                            <td>
                                                <span className={`badge ${getPOStatusClass(po.status)}`}>
                                                    {po.status}
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

            {/* ── Tab: Receiving ── */}
            {(activeTab === 'procurement_recv' && hasSubPermission('procurement_recv')) && (
                <div className="subpage-content" key="procurement_recv">
                    {hasSectionPermission('procurement_recv_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์เลขที่รับ, อ้างอิง PO หรือซัพพลายเออร์..."
                                    value={recvSearch}
                                    onChange={(e) => setRecvSearch(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">+ บันทึกรับสินค้า</button>
                        </div>
                    )}

                    {hasSectionPermission('procurement_recv_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>เลขที่รับสินค้า</th>
                                        <th>อ้างอิง PO</th>
                                        <th>ซัพพลายเออร์</th>
                                        <th>วันที่รับ</th>
                                        <th>ผู้รับ</th>
                                        <th>หมายเหตุ</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecv.map((r) => (
                                        <tr key={r.id}>
                                            <td className="text-bold">{r.number}</td>
                                            <td>{r.poNumber}</td>
                                            <td>{r.supplier}</td>
                                            <td>{r.date}</td>
                                            <td>{r.receivedBy}</td>
                                            <td className="text-muted">{r.note}</td>
                                            <td>
                                                <span className={`badge ${getRecvStatusClass(r.status)}`}>
                                                    {r.status}
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
        </div>
    );
}

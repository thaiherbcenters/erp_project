/**
 * =============================================================================
 * Sales.jsx — หน้าฝ่ายขาย (Sales Department)
 * =============================================================================
 *
 * แสดงข้อมูลฝ่ายขาย:
 *   - Tab sales_dashboard : Sales Dashboard (ยอดขาย, คำสั่งซื้อ, ลูกค้า, ใบเสนอราคา)
 *   - Tab sales_customers : Customer Management (ค้นหา + ตารางลูกค้า)
 *   - Tab sales_quotation : Quotation (ค้นหา + ตารางใบเสนอราคา)
 *   - Tab sales_orders    : Sales Order (ค้นหา + ตารางคำสั่งซื้อ)
 *
 * =============================================================================
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOCK_CUSTOMERS, MOCK_QUOTATIONS, MOCK_SALES_ORDERS } from '../data/mockData';
import './PageCommon.css';

export default function Sales() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('sales');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'sales_dashboard';

    // ── State: ค้นหาแยกแต่ละ tab ──
    const [customerSearch, setCustomerSearch] = useState('');
    const [quotationSearch, setQuotationSearch] = useState('');
    const [orderSearch, setOrderSearch] = useState('');

    // ── คำนวณสถิติ Dashboard ──
    const totalRevenue = MOCK_SALES_ORDERS.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = MOCK_SALES_ORDERS.length;
    const totalCustomers = MOCK_CUSTOMERS.length;
    const totalQuotations = MOCK_QUOTATIONS.length;

    // ── กรองข้อมูลแต่ละ tab ──
    const filteredCustomers = MOCK_CUSTOMERS.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.contact.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.type.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const filteredQuotations = MOCK_QUOTATIONS.filter((q) =>
        q.number.toLowerCase().includes(quotationSearch.toLowerCase()) ||
        q.customer.toLowerCase().includes(quotationSearch.toLowerCase())
    );

    const filteredOrders = MOCK_SALES_ORDERS.filter((o) =>
        o.number.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customer.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.product.toLowerCase().includes(orderSearch.toLowerCase())
    );

    // ── เลือก badge class ตามสถานะ ──
    const getCustomerStatusClass = (status) => {
        return status === 'ใช้งาน' ? 'badge-success' : 'badge-danger';
    };

    const getQuotationStatusClass = (status) => {
        switch (status) {
            case 'อนุมัติ': return 'badge-success';
            case 'ส่งแล้ว': return 'badge-info';
            case 'ร่าง': return 'badge-neutral';
            case 'ปฏิเสธ': return 'badge-danger';
            default: return '';
        }
    };

    const getOrderStatusClass = (status) => {
        switch (status) {
            case 'เสร็จสิ้น': return 'badge-success';
            case 'กำลังดำเนินการ': return 'badge-info';
            case 'จัดส่งแล้ว': return 'badge-warning';
            case 'รอดำเนินการ': return 'badge-neutral';
            default: return '';
        }
    };

    return (
        <div className="page-content">
            <div className="page-title">
                <h1>ฝ่ายขาย</h1>
                <p>จัดการข้อมูลลูกค้า ใบเสนอราคา และคำสั่งซื้อ</p>
            </div>

            {/* ── Tab: Sales Dashboard ── */}
            {(activeTab === 'sales_dashboard' && hasSubPermission('sales_dashboard')) && (
                <div className="subpage-content" key="sales_dashboard">
                    <div className="summary-row">
                        {hasSectionPermission('sales_dashboard_revenue') && (
                            <div className="summary-card card">
                                <div className="summary-icon">฿</div>
                                <div>
                                    <span className="summary-label">ยอดขายรวม</span>
                                    <span className="summary-value">฿{totalRevenue.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('sales_dashboard_orders') && (
                            <div className="summary-card card">
                                <div className="summary-icon">📦</div>
                                <div>
                                    <span className="summary-label">คำสั่งซื้อ</span>
                                    <span className="summary-value">{totalOrders}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('sales_dashboard_customers') && (
                            <div className="summary-card card">
                                <div className="summary-icon">👥</div>
                                <div>
                                    <span className="summary-label">ลูกค้า</span>
                                    <span className="summary-value">{totalCustomers}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('sales_dashboard_quotations') && (
                            <div className="summary-card card">
                                <div className="summary-icon">📄</div>
                                <div>
                                    <span className="summary-label">ใบเสนอราคา</span>
                                    <span className="summary-value">{totalQuotations}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab: Customer Management ── */}
            {(activeTab === 'sales_customers' && hasSubPermission('sales_customers')) && (
                <div className="subpage-content" key="sales_customers">
                    {hasSectionPermission('sales_customers_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์ชื่อลูกค้า..."
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">+ เพิ่มลูกค้า</button>
                        </div>
                    )}

                    {hasSectionPermission('sales_customers_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ลำดับ</th>
                                        <th>ชื่อลูกค้า</th>
                                        <th>ผู้ติดต่อ</th>
                                        <th>โทรศัพท์</th>
                                        <th>อีเมล</th>
                                        <th>ประเภท</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map((c) => (
                                        <tr key={c.id}>
                                            <td>{c.id}</td>
                                            <td className="text-bold">{c.name}</td>
                                            <td>{c.contact}</td>
                                            <td>{c.phone}</td>
                                            <td>{c.email}</td>
                                            <td>{c.type}</td>
                                            <td>
                                                <span className={`badge ${getCustomerStatusClass(c.status)}`}>
                                                    {c.status}
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

            {/* ── Tab: Quotation ── */}
            {(activeTab === 'sales_quotation' && hasSubPermission('sales_quotation')) && (
                <div className="subpage-content" key="sales_quotation">
                    {hasSectionPermission('sales_quotation_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์เลขที่ใบเสนอราคา..."
                                    value={quotationSearch}
                                    onChange={(e) => setQuotationSearch(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">+ สร้างใบเสนอราคา</button>
                        </div>
                    )}

                    {hasSectionPermission('sales_quotation_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ลำดับ</th>
                                        <th>เลขที่</th>
                                        <th>ลูกค้า</th>
                                        <th>รายการ</th>
                                        <th>ยอดรวม (บาท)</th>
                                        <th>วันที่</th>
                                        <th>ใช้ได้ถึง</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredQuotations.map((q) => (
                                        <tr key={q.id}>
                                            <td>{q.id}</td>
                                            <td className="text-bold">{q.number}</td>
                                            <td>{q.customer}</td>
                                            <td>{q.items} รายการ</td>
                                            <td>{q.total.toLocaleString()}</td>
                                            <td>{q.date}</td>
                                            <td>{q.validUntil}</td>
                                            <td>
                                                <span className={`badge ${getQuotationStatusClass(q.status)}`}>
                                                    {q.status}
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

            {/* ── Tab: Sales Order ── */}
            {(activeTab === 'sales_orders' && hasSubPermission('sales_orders')) && (
                <div className="subpage-content" key="sales_orders">
                    {hasSectionPermission('sales_orders_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์เลขที่คำสั่งซื้อ..."
                                    value={orderSearch}
                                    onChange={(e) => setOrderSearch(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">+ สร้างคำสั่งซื้อ</button>
                        </div>
                    )}

                    {hasSectionPermission('sales_orders_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ลำดับ</th>
                                        <th>เลขที่</th>
                                        <th>ลูกค้า</th>
                                        <th>สินค้า</th>
                                        <th>จำนวน</th>
                                        <th>ยอดรวม (บาท)</th>
                                        <th>วันที่</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((o) => (
                                        <tr key={o.id}>
                                            <td>{o.id}</td>
                                            <td className="text-bold">{o.number}</td>
                                            <td>{o.customer}</td>
                                            <td>{o.product}</td>
                                            <td>{o.qty}</td>
                                            <td>{o.total.toLocaleString()}</td>
                                            <td>{o.date}</td>
                                            <td>
                                                <span className={`badge ${getOrderStatusClass(o.status)}`}>
                                                    {o.status}
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

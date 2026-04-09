/**
 * =============================================================================
 * Customer.jsx — หน้าจัดการข้อมูลลูกค้า (Customer Management)
 * =============================================================================
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOCK_CUSTOMERS } from '../data/mockData';
import './PageCommon.css';

export default function Customer() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('customer');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'customer_list';

    const [customerSearch, setCustomerSearch] = useState('');

    const filteredCustomers = MOCK_CUSTOMERS.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.contact.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.type.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const getCustomerStatusClass = (status) => {
        return status === 'ใช้งาน' ? 'badge-success' : 'badge-danger';
    };

    return (
        <div className="page-content">
            <div className="page-title">
                <h1>ข้อมูลลูกค้า (Customers)</h1>
                <p>จัดการฐานข้อมูลลูกค้า, ประวัติการสั่งซื้อ และข้อมูลเพิ่มเติม</p>
            </div>

            {/* ── Tab: Customer List ── */}
            {(activeTab === 'customer_list' && hasSubPermission('customer_list')) && (
                <div className="subpage-content" key="customer_list">
                    {hasSectionPermission('customer_list_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์ชื่อหรือประเภทลูกค้า..."
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">+ เพิ่มลูกค้าใหม่</button>
                        </div>
                    )}

                    {hasSectionPermission('customer_list_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รหัสลูกค้า</th>
                                        <th>ชื่อบริษัท/ลูกค้า</th>
                                        <th>ผู้ติดต่อ</th>
                                        <th>โทรศัพท์</th>
                                        <th>อีเมล</th>
                                        <th>ประเภท</th>
                                        <th>สถานะ</th>
                                        <th>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map((c) => (
                                        <tr key={c.id}>
                                            <td>CUST-{c.id.toString().padStart(4, '0')}</td>
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
                                            <td>
                                                <button className="btn-icon" title="ดูรายละเอียด" style={{marginRight: '8px', cursor: 'pointer', background: 'none', border:'none'}}>👁️</button>
                                                <button className="btn-icon" title="แก้ไข" style={{cursor: 'pointer', background: 'none', border:'none'}}>✏️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            
            {/* ── Tab: Customer History ── */}
            {(activeTab === 'customer_history' && hasSubPermission('customer_history')) && (
                <div className="subpage-content" key="customer_history">
                     <div className="card">
                         <p style={{padding: '24px', textAlign: 'center'}}>จะแสดงประวัติการสั่งซื้อ และเอกสารใบรับรองต่างๆ ในอนาคต</p>
                     </div>
                </div>
            )}
        </div>
    );
}

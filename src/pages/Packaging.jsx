/**
 * =============================================================================
 * Packaging.jsx — หน้า Packaging (บรรจุภัณฑ์)
 * =============================================================================
 * ประกอบด้วย 1 sub-page:
 *   1. Packaging — จัดการงานบรรจุภัณฑ์
 * =============================================================================
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    PackageOpen, PackageCheck, Clock, AlertTriangle,
    CheckCircle2, Search, Plus, Box
} from 'lucide-react';
import './PageCommon.css';
import './Packaging.css';

// ── Mock Data ──
const MOCK_PACKAGING_ORDERS = [
    { id: 1, code: 'PKG-2026-001', product: 'ครีมสมุนไพรบำรุงผิว 50g', batch: 'B-2026-015', qty: 500, packed: 320, packType: 'กล่อง + ซอง', line: 'Pack-01', assignee: 'สมชาย', dueDate: '2026-03-10', status: 'กำลังบรรจุ' },
    { id: 2, code: 'PKG-2026-002', product: 'น้ำมันหอมระเหย 30ml', batch: 'B-2026-018', qty: 1000, packed: 1000, packType: 'ขวด + กล่อง', line: 'Pack-02', assignee: 'สมหญิง', dueDate: '2026-03-08', status: 'เสร็จสิ้น' },
    { id: 3, code: 'PKG-2026-003', product: 'แชมพูสมุนไพร 250ml', batch: 'B-2026-020', qty: 300, packed: 0, packType: 'ขวด + ฉลาก', line: 'Pack-01', assignee: 'สมศักดิ์', dueDate: '2026-03-12', status: 'รอบรรจุ' },
    { id: 4, code: 'PKG-2026-004', product: 'สบู่สมุนไพร 100g', batch: 'B-2026-022', qty: 800, packed: 450, packType: 'ซอง + กล่อง', line: 'Pack-03', assignee: 'สมชาย', dueDate: '2026-03-11', status: 'กำลังบรรจุ' },
    { id: 5, code: 'PKG-2026-005', product: 'อาหารเสริมแคปซูล 60 เม็ด', batch: 'B-2026-025', qty: 200, packed: 200, packType: 'กระปุก + กล่อง + ซีล', line: 'Pack-02', assignee: 'สมหญิง', dueDate: '2026-03-07', status: 'เสร็จสิ้น' },
];

const MOCK_PACKAGING_MATERIALS = [
    { id: 1, name: 'กล่องกระดาษลูกฟูก (เล็ก)', inStock: 2500, reserved: 800, unit: 'ใบ' },
    { id: 2, name: 'ขวดพลาสติก PET 30ml', inStock: 1200, reserved: 1000, unit: 'ใบ' },
    { id: 3, name: 'ซองอลูมิเนียม', inStock: 5000, reserved: 1300, unit: 'ซอง' },
    { id: 4, name: 'ฉลากสินค้า (พิมพ์)', inStock: 3000, reserved: 600, unit: 'แผ่น' },
    { id: 5, name: 'ซีลฝาขวด', inStock: 800, reserved: 200, unit: 'ชิ้น' },
];

export default function Packaging() {
    const { getVisibleSubPages, hasSectionPermission } = useAuth();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('packaging');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;

    const [searchTerm, setSearchTerm] = useState('');

    // ── Stats ──
    const totalOrders = MOCK_PACKAGING_ORDERS.length;
    const inProgress = MOCK_PACKAGING_ORDERS.filter(o => o.status === 'กำลังบรรจุ').length;
    const waiting = MOCK_PACKAGING_ORDERS.filter(o => o.status === 'รอบรรจุ').length;
    const completed = MOCK_PACKAGING_ORDERS.filter(o => o.status === 'เสร็จสิ้น').length;

    // ── Packaging Dashboard ──
    const renderPackaging = () => {
        const filtered = MOCK_PACKAGING_ORDERS.filter(o =>
            o.product.includes(searchTerm) || o.code.includes(searchTerm) || o.batch.includes(searchTerm)
        );

        return (
            <div className="packaging-main">
                <div className="page-title">
                    <h1>Packaging</h1>
                    <p>จัดการงานบรรจุภัณฑ์และติดตามสถานะการบรรจุ</p>
                </div>

                {/* Summary Cards */}
                {hasSectionPermission('packaging_main_stats') && (
                    <div className="summary-row">
                        <div className="card summary-card">
                            <div className="summary-icon" style={{ background: '#f0ebff', color: '#7b7bf5' }}><Box size={20} /></div>
                            <div><span className="summary-label">คำสั่งบรรจุทั้งหมด</span><span className="summary-value">{totalOrders}</span></div>
                        </div>
                        <div className="card summary-card">
                            <div className="summary-icon" style={{ background: '#fff8e1', color: '#f9a825' }}><Clock size={20} /></div>
                            <div><span className="summary-label">กำลังบรรจุ</span><span className="summary-value">{inProgress}</span></div>
                        </div>
                        <div className="card summary-card">
                            <div className="summary-icon" style={{ background: '#fce4ec', color: '#e53935' }}><AlertTriangle size={20} /></div>
                            <div><span className="summary-label">รอบรรจุ</span><span className="summary-value">{waiting}</span></div>
                        </div>
                        <div className="card summary-card">
                            <div className="summary-icon" style={{ background: '#e8f5e9', color: '#43a047' }}><CheckCircle2 size={20} /></div>
                            <div><span className="summary-label">เสร็จสิ้น</span><span className="summary-value">{completed}</span></div>
                        </div>
                    </div>
                )}

                {/* Orders Table */}
                {hasSectionPermission('packaging_main_orders') && (
                    <>
                        <div className="toolbar">
                            <div className="search-box">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="ค้นหาคำสั่งบรรจุ..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary"><Plus size={16} /> สร้างคำสั่งบรรจุ</button>
                        </div>

                        <div className="card table-card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รหัส</th>
                                        <th>ผลิตภัณฑ์</th>
                                        <th>Batch</th>
                                        <th>ประเภทบรรจุ</th>
                                        <th>Line</th>
                                        <th>ผู้รับผิดชอบ</th>
                                        <th>ความคืบหน้า</th>
                                        <th>กำหนดส่ง</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(order => (
                                        <tr key={order.id}>
                                            <td className="text-bold">{order.code}</td>
                                            <td>{order.product}</td>
                                            <td>{order.batch}</td>
                                            <td><span className="badge badge-info">{order.packType}</span></td>
                                            <td>{order.line}</td>
                                            <td>{order.assignee}</td>
                                            <td>
                                                <div className="progress-container">
                                                    <div className="progress-bar" style={{
                                                        width: `${(order.packed / order.qty) * 100}%`,
                                                        backgroundColor: order.status === 'เสร็จสิ้น' ? 'var(--success, #43a047)' : 'var(--primary, #7b7bf5)'
                                                    }}></div>
                                                    <span className="progress-text">{order.packed} / {order.qty}</span>
                                                </div>
                                            </td>
                                            <td>{order.dueDate}</td>
                                            <td>
                                                <span className={`badge ${order.status === 'เสร็จสิ้น' ? 'badge-success' : order.status === 'กำลังบรรจุ' ? 'badge-warning' : 'badge-danger'}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Packaging Materials */}
                {hasSectionPermission('packaging_main_materials') && (
                    <div className="card table-card" style={{ marginTop: '20px' }}>
                        <h3 className="card-title">วัสดุบรรจุภัณฑ์คงเหลือ</h3>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>วัสดุ</th>
                                    <th>คงเหลือ</th>
                                    <th>จองใช้</th>
                                    <th>พร้อมใช้</th>
                                    <th>หน่วย</th>
                                    <th>สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_PACKAGING_MATERIALS.map(mat => {
                                    const available = mat.inStock - mat.reserved;
                                    const lowStock = available < 500;
                                    return (
                                        <tr key={mat.id}>
                                            <td className="text-bold">{mat.name}</td>
                                            <td>{mat.inStock.toLocaleString()}</td>
                                            <td>{mat.reserved.toLocaleString()}</td>
                                            <td style={{ fontWeight: 700, color: lowStock ? 'var(--danger, #e53935)' : 'var(--success, #43a047)' }}>
                                                {available.toLocaleString()}
                                            </td>
                                            <td>{mat.unit}</td>
                                            <td>
                                                <span className={`badge ${lowStock ? 'badge-danger' : 'badge-success'}`}>
                                                    {lowStock ? 'เหลือน้อย' : 'เพียงพอ'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    if (visibleSubPages.length === 0) {
        return <div className="page-container"><p className="no-permission">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;
    }

    return (
        <div className="page-container packaging-page page-enter">
            {currentTab === 'packaging_main' && renderPackaging()}
        </div>
    );
}

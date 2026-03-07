/**
 * =============================================================================
 * Stock.jsx — หน้าคลังสินค้า (Inventory)
 * =============================================================================
 *
 * แสดงข้อมูลสินค้าคงคลัง:
 *   - Tab stock_data : Data STOCK (ตารางยอดคงเหลือ)
 *   - Tab stock_logs : รายการของเข้า-ออก (ประวัติเข้า-ออก)
 *
 * =============================================================================
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOCK_STOCK, MOCK_STOCK_LOGS } from '../data/mockData';
import './PageCommon.css';

export default function Stock() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('stock');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'stock_data';

    // ── State: ค้นหา ──
    const [searchStock, setSearchStock] = useState('');
    const [searchLogs, setSearchLogs] = useState('');

    // ── กรองข้อมูลแต่ละ Tab ──
    const filteredStock = MOCK_STOCK.filter((item) =>
        item.name.toLowerCase().includes(searchStock.toLowerCase()) ||
        item.category.toLowerCase().includes(searchStock.toLowerCase())
    );

    const filteredLogs = MOCK_STOCK_LOGS.filter((log) =>
        log.item.toLowerCase().includes(searchLogs.toLowerCase()) ||
        log.ref.toLowerCase().includes(searchLogs.toLowerCase()) ||
        log.note.toLowerCase().includes(searchLogs.toLowerCase())
    );

    // ── เลือก badge class ตามสถานะ ──
    const getStockStatusClass = (status) => {
        if (status === 'มีสินค้า') return 'badge-success';
        if (status === 'สินค้าเหลือน้อย') return 'badge-warning';
        return 'badge-danger'; // สินค้าหมด
    };

    const getLogTypeClass = (type) => {
        return type === 'IN' ? 'badge-success' : 'badge-warning';
    };

    return (
        <div className="page-content">
            <div className="page-title">
                <h1>คลังสินค้า (Inventory)</h1>
                <p>ข้อมูลสินค้าคงคลัง และประวัติรายการเข้า-ออก</p>
            </div>

            {/* ── Tab: Data STOCK ── */}
            {(activeTab === 'stock_data' && hasSubPermission('stock_data')) && (
                <div className="subpage-content" key="stock_data">
                    {hasSectionPermission('stock_data_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์ชื่อสินค้าหรือหมวดหมู่..."
                                    value={searchStock}
                                    onChange={(e) => setSearchStock(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">+ เพิ่มสินค้าใหม่</button>
                        </div>
                    )}

                    {hasSectionPermission('stock_data_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รหัสสินค้า</th>
                                        <th>ชื่อสินค้า</th>
                                        <th>หมวดหมู่</th>
                                        <th>ยอดคงเหลือ</th>
                                        <th>ราคาต่อหน่วย (บาท)</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStock.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.id}</td>
                                            <td className="text-bold">{item.name}</td>
                                            <td>{item.category}</td>
                                            <td>{item.qty}</td>
                                            <td>{item.price.toLocaleString()}</td>
                                            <td>
                                                <span className={`badge ${getStockStatusClass(item.status)}`}>
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

            {/* ── Tab: รายการของเข้า-ออก (Stock Logs) ── */}
            {(activeTab === 'stock_logs' && hasSubPermission('stock_logs')) && (
                <div className="subpage-content" key="stock_logs">
                    {hasSectionPermission('stock_logs_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์เลขที่อ้างอิง, ชื่อสินค้า หรือหมายเหตุ..."
                                    value={searchLogs}
                                    onChange={(e) => setSearchLogs(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">ส่งออกประวัติ (Excel)</button>
                        </div>
                    )}

                    {hasSectionPermission('stock_logs_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>วัน-เวลา</th>
                                        <th>ประเภท</th>
                                        <th>ชื่อสินค้า</th>
                                        <th>จำนวน</th>
                                        <th>เลขที่อ้างอิง</th>
                                        <th>ผู้บันทึก</th>
                                        <th>หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td>{log.date}</td>
                                            <td>
                                                <span className={`badge ${getLogTypeClass(log.type)}`}>
                                                    {log.type === 'IN' ? 'รับเข้า' : 'เบิกจ่าย'}
                                                </span>
                                            </td>
                                            <td className="text-bold">{log.item}</td>
                                            <td>
                                                <span className={log.type === 'IN' ? 'text-success' : 'text-danger'}>
                                                    {log.type === 'IN' ? '+' : '-'}{log.qty}
                                                </span>
                                            </td>
                                            <td>{log.ref}</td>
                                            <td>{log.user}</td>
                                            <td className="text-muted">{log.note}</td>
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

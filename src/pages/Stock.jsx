/**
 * =============================================================================
 * Stock.jsx — หน้าคลังสินค้า (Inventory) — ดึงข้อมูลจริงจาก Database
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, XCircle, Package, Truck, ArrowDownCircle, ArrowUpCircle, Factory, FileText, Clock } from 'lucide-react';
import API_BASE from '../config';
import './PageCommon.css';

export default function Stock() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('stock');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'stock_data';

    // ── State ──
    const [searchStock, setSearchStock] = useState('');
    const [searchLogs, setSearchLogs] = useState('');
    const [stockItems, setStockItems] = useState([]);
    const [stockLogs, setStockLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [logDetailLoading, setLogDetailLoading] = useState(false);
    const [logDetail, setLogDetail] = useState(null);

    // ── Fetch real data from API ──
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [itemsRes, logsRes] = await Promise.all([
                    fetch(`${API_BASE}/stock`),
                    fetch(`${API_BASE}/stock/logs`)
                ]);
                if (itemsRes.ok) setStockItems(await itemsRes.json());
                if (logsRes.ok) setStockLogs(await logsRes.json());
            } catch (err) {
                console.error('Failed to fetch stock data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // ── Fetch detail for selected item ──
    const openDetail = async (item) => {
        setSelectedItem(item);
        setDetailLoading(true);
        try {
            const res = await fetch(`${API_BASE}/stock/${item.id}/detail`);
            if (res.ok) {
                setDetail(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch detail:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    // ── Fetch detail for selected log ──
    const openLogDetail = async (log) => {
        if (!log.ref) return;
        setSelectedLog(log);
        setLogDetailLoading(true);
        try {
            const res = await fetch(`${API_BASE}/stock/logs/${log.ref}/detail`);
            if (res.ok) {
                setLogDetail(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch log detail:', err);
        } finally {
            setLogDetailLoading(false);
        }
    };

    // ── กรองข้อมูลแต่ละ Tab ──
    const filteredStock = stockItems.filter((item) =>
        item.name.toLowerCase().includes(searchStock.toLowerCase()) ||
        (item.category || '').toLowerCase().includes(searchStock.toLowerCase())
    );

    const filteredLogs = stockLogs.filter((log) =>
        (log.item || '').toLowerCase().includes(searchLogs.toLowerCase()) ||
        (log.ref || '').toLowerCase().includes(searchLogs.toLowerCase()) ||
        (log.note || '').toLowerCase().includes(searchLogs.toLowerCase())
    );

    // ── เลือก badge class ตามสถานะ ──
    const getStockStatusClass = (status) => {
        if (status === 'มีสินค้า') return 'badge-success';
        if (status === 'สินค้าเหลือน้อย') return 'badge-warning';
        return 'badge-danger';
    };

    const getLogTypeClass = (type) => {
        return type === 'IN' ? 'badge-success' : 'badge-warning';
    };

    const fmtDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // ── Detail Modal ──
    const renderDetailModal = () => {
        if (!selectedItem) return null;

        return (
            <div className="rnd-modal-overlay" onClick={() => { setSelectedItem(null); setDetail(null); }}>
                <div className="rnd-modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="rnd-modal-header">
                        <div>
                            <h2>📦 {selectedItem.name}</h2>
                            <div className="rnd-modal-meta">
                                <span style={{ color: '#059669', fontWeight: 700 }}>{selectedItem.id}</span>
                                <span className={`badge ${getStockStatusClass(selectedItem.status)}`}>{selectedItem.status}</span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => { setSelectedItem(null); setDetail(null); }}>
                            <XCircle size={22} />
                        </button>
                    </div>

                    <div className="rnd-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {detailLoading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>
                        ) : detail ? (
                            <>
                                {/* Info Grid */}
                                <div className="rnd-modal-info-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                                    <div className="rnd-modal-info-item" style={{ background: '#ecfdf5', borderRadius: 10, padding: 14 }}>
                                        <label style={{ fontWeight: 700, color: '#059669', fontSize: 12 }}>ยอดคงเหลือ</label>
                                        <span style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>{detail.item.qty?.toLocaleString()}</span>
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>{detail.item.unit}</span>
                                    </div>
                                    <div className="rnd-modal-info-item" style={{ background: '#f0ebff', borderRadius: 10, padding: 14 }}>
                                        <label style={{ fontWeight: 700, color: '#7c3aed', fontSize: 12 }}>หมวดหมู่</label>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#5b21b6' }}>{detail.item.category}</span>
                                    </div>
                                    <div className="rnd-modal-info-item" style={{ background: '#fef3c7', borderRadius: 10, padding: 14 }}>
                                        <label style={{ fontWeight: 700, color: '#92400e', fontSize: 12 }}>Batch ที่เข้าคลัง</label>
                                        <span style={{ fontSize: 28, fontWeight: 800, color: '#d97706' }}>{detail.logs.filter(l => l.type === 'IN').length}</span>
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>ครั้ง</span>
                                    </div>
                                </div>

                                {/* Production Tasks */}
                                {detail.productionTasks.length > 0 && (
                                    <div style={{ marginBottom: 20 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Factory size={16} style={{ color: '#7c3aed' }} /> ข้อมูลการผลิตที่เกี่ยวข้อง
                                        </h4>
                                        <div style={{ background: '#fafaf9', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                                            <table className="data-table" style={{ fontSize: 13 }}>
                                                <thead>
                                                    <tr>
                                                        <th>Batch No.</th>
                                                        <th>ใบสั่งผลิต</th>
                                                        <th>Line</th>
                                                        <th>เป้าหมาย</th>
                                                        <th>ผลิตได้</th>
                                                        <th>ของเสีย</th>
                                                        <th>ประเภท</th>
                                                        <th>สถานะ</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {detail.productionTasks.map((t, i) => {
                                                        const isOEM = (t.plannerNotes || '').includes('ผลิตตามออเดอร์');
                                                        return (
                                                            <tr key={i}>
                                                                <td style={{ fontWeight: 700, color: '#1e40af' }}>{t.batchNo}</td>
                                                                <td>
                                                                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                                                        {t.jobOrderId}
                                                                    </span>
                                                                </td>
                                                                <td>{t.line}</td>
                                                                <td>{t.expectedQty?.toLocaleString()}</td>
                                                                <td style={{ fontWeight: 700, color: '#059669' }}>{t.producedQty?.toLocaleString()}</td>
                                                                <td style={{ color: t.defectQty > 0 ? '#ef4444' : '#9ca3af' }}>{t.defectQty || 0}</td>
                                                                <td>
                                                                    {isOEM ? (
                                                                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                                                            🚚 OEM
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ background: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                                                            📦 ผลิตตามแผน
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    <span className={`badge ${t.status === 'เสร็จสิ้น' ? 'badge-success' : 'badge-warning'}`}>
                                                                        {t.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Stock Logs */}
                                <div>
                                    <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <FileText size={16} style={{ color: '#2563eb' }} /> ประวัติรับเข้า-เบิกจ่าย ({detail.logs.length} รายการ)
                                    </h4>
                                    {detail.logs.length === 0 ? (
                                        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', background: '#fafaf9', borderRadius: 10 }}>ยังไม่มีประวัติ</div>
                                    ) : (
                                        <div style={{ background: '#fafaf9', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                                            {detail.logs.map((log, i) => (
                                                <div key={i} style={{ padding: '12px 16px', borderBottom: i < detail.logs.length - 1 ? '1px solid #e5e7eb' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        {log.type === 'IN' ? (
                                                            <ArrowDownCircle size={20} style={{ color: '#059669' }} />
                                                        ) : (
                                                            <ArrowUpCircle size={20} style={{ color: '#f59e0b' }} />
                                                        )}
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                                                                {log.type === 'IN' ? '📥 รับเข้า' : log.refType === 'oem_direct' ? '🚚 OEM ส่งตรง' : '📤 เบิกจ่าย'}
                                                                {log.ref && (
                                                                    <span style={{ marginLeft: 8, background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                                                        {log.ref}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{log.notes}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 800, fontSize: 16, color: log.type === 'IN' ? '#059669' : '#ef4444' }}>
                                                            {log.type === 'IN' ? '+' : '-'}{log.qty?.toLocaleString()}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Clock size={10} /> {fmtDate(log.date)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    };

    // ── Log Detail Modal ──
    const renderLogDetailModal = () => {
        if (!selectedLog) return null;
        const close = () => { setSelectedLog(null); setLogDetail(null); };

        return (
            <div className="rnd-modal-overlay" onClick={close}>
                <div className="rnd-modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>📋 รายละเอียดรายการ</h2>
                            <div className="rnd-modal-meta">
                                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: 6, fontWeight: 700 }}>
                                    Batch: {selectedLog.ref}
                                </span>
                                <span className={`badge ${getLogTypeClass(selectedLog.type)}`}>
                                    {selectedLog.type === 'IN' ? '📥 รับเข้า' : selectedLog.refType === 'oem_direct' ? '🚚 OEM ส่งตรง' : '📤 เบิกจ่าย'}
                                </span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={close}><XCircle size={22} /></button>
                    </div>

                    <div className="rnd-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {logDetailLoading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>
                        ) : logDetail ? (
                            <>
                                {/* ข้อมูลสินค้า */}
                                <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16, marginBottom: 16 }}>
                                    <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>📦 สินค้า: {selectedLog.item}</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                                        <div><span style={{ color: '#6b7280' }}>จำนวน:</span> <strong style={{ color: selectedLog.type === 'IN' ? '#059669' : '#ef4444', fontSize: 18 }}>{selectedLog.type === 'IN' ? '+' : '-'}{selectedLog.qty?.toLocaleString()}</strong></div>
                                        <div><span style={{ color: '#6b7280' }}>วัน-เวลา:</span> <strong>{fmtDate(selectedLog.date || new Date())}</strong></div>
                                    </div>
                                </div>

                                {/* ข้อมูลการผลิต */}
                                {logDetail.production && (
                                    <div style={{ background: '#faf5ff', borderRadius: 10, border: '1px solid #e9d5ff', padding: 16, marginBottom: 16 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Factory size={16} style={{ color: '#7c3aed' }} /> ข้อมูลการผลิต
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                                            <div><span style={{ color: '#6b7280' }}>รหัสงาน:</span> <strong>{logDetail.production.taskId}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>ใบสั่งผลิต:</span> <strong style={{ color: '#4f46e5' }}>{logDetail.production.jobOrderId}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>Batch No.:</span> <strong style={{ color: '#1e40af' }}>{logDetail.production.batchNo}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>สูตร:</span> <strong>{logDetail.production.formulaName}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>Line:</span> <strong>{logDetail.production.line}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>กระบวนการ:</span> <strong>{logDetail.production.process}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>เป้าหมาย:</span> <strong>{logDetail.production.expectedQty?.toLocaleString()}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>ผลิตได้จริง:</span> <strong style={{ color: '#059669' }}>{logDetail.production.producedQty?.toLocaleString()}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>ของเสีย:</span> <strong style={{ color: logDetail.production.defectQty > 0 ? '#ef4444' : '#9ca3af' }}>{logDetail.production.defectQty || 0}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>สถานะ:</span> <span className={`badge ${logDetail.production.status === 'เสร็จสิ้น' ? 'badge-success' : 'badge-warning'}`}>{logDetail.production.status}</span></div>
                                            <div><span style={{ color: '#6b7280' }}>เริ่มผลิต:</span> <strong>{fmtDate(logDetail.production.startTime)}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>เสร็จสิ้น:</span> <strong>{fmtDate(logDetail.production.endTime)}</strong></div>
                                        </div>
                                        {logDetail.production.customerName && (
                                            <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef3c7', borderRadius: 8, fontSize: 13 }}>
                                                <span style={{ fontWeight: 700, color: '#92400e' }}>🏢 ลูกค้า OEM:</span> {logDetail.production.customerName}
                                                {logDetail.production.customerPO && <span style={{ marginLeft: 8, color: '#78716c' }}>PO: {logDetail.production.customerPO}</span>}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ข้อมูล Packaging */}
                                {logDetail.packaging && (
                                    <div style={{ background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', padding: 16, marginBottom: 16 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Package size={16} style={{ color: '#059669' }} /> ข้อมูลบรรจุภัณฑ์
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 13 }}>
                                            <div><span style={{ color: '#6b7280' }}>ยอดบรรจุ:</span> <strong>{logDetail.packaging.packedQty?.toLocaleString()} / {logDetail.packaging.qty?.toLocaleString()}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>ปลายทาง:</span> <strong>{logDetail.packaging.destination}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>สถานะ:</span> <span className={`badge ${logDetail.packaging.status === 'QC ผ่าน' || logDetail.packaging.status === 'ส่งมอบแล้ว' ? 'badge-success' : 'badge-info'}`}>{logDetail.packaging.status}</span></div>
                                        </div>
                                    </div>
                                )}

                                {/* ข้อมูล QC */}
                                {logDetail.qcResults.length > 0 && (
                                    <div style={{ background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', padding: 16, marginBottom: 16 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            🔬 ผลตรวจสอบคุณภาพ ({logDetail.qcResults.length} รายการ)
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {logDetail.qcResults.map((qc, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                                                    <div style={{ fontSize: 13 }}>
                                                        <strong>{qc.type === 'qc_inprocess' ? '🔍 QC ระหว่างผลิต' : '🛡️ QC Final'}</strong>
                                                        <span style={{ marginLeft: 8, color: '#6b7280' }}>โดย: {qc.inspector || '-'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmtDate(qc.inspectedAt)}</span>
                                                        <span className={`badge ${qc.status === 'ผ่าน' ? 'badge-success' : qc.status === 'ไม่ผ่าน' ? 'badge-danger' : 'badge-warning'}`}>
                                                            {qc.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    };

    // ── กำหนดชื่อหน้าตาม Tab ที่เลือก ──
    const getPageTitle = () => {
        switch (activeTab) {
            case 'stock_data': return 'ยอดคงเหลือสินค้า (Inventory Data)';
            case 'stock_logs': return 'ประวัติเข้า-ออก (Stock Logs)';
            default: return 'คลังสินค้า (Inventory)';
        }
    };

    const getPageDesc = () => {
        switch (activeTab) {
            case 'stock_data': return 'ตรวจสอบยอดคงเหลือ สถานะ และรายละเอียดของสินค้าในคลัง';
            case 'stock_logs': return 'ประวัติและรายละเอียดการรับเข้าหรือเบิกจ่ายสินค้า';
            default: return 'ข้อมูลสินค้าคงคลัง และประวัติรายการเข้า-ออก';
        }
    };

    return (
        <div className="page-container stock-page page-enter">
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <h1>{getPageTitle()}</h1>
                <p>{getPageDesc()}</p>
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
                        </div>
                    )}

                    {hasSectionPermission('stock_data_table') && (
                        <div className="table-card card">
                            {loading ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>
                            ) : filteredStock.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                                    <p style={{ fontWeight: 600 }}>ยังไม่มีสินค้าในคลัง</p>
                                    <p style={{ fontSize: 13 }}>สินค้าจะเข้าคลังอัตโนมัติเมื่อกระบวนการผลิตเสร็จสิ้น</p>
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>รหัสสินค้า</th>
                                            <th>ชื่อสินค้า</th>
                                            <th>หมวดหมู่</th>
                                            <th>ยอดคงเหลือ</th>
                                            <th>หน่วย</th>
                                            <th>สถานะ</th>
                                            <th>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStock.map((item) => (
                                            <tr key={item.id}>
                                                <td style={{ fontWeight: 600, color: '#1e40af' }}>{item.id}</td>
                                                <td className="text-bold">{item.name}</td>
                                                <td>{item.category}</td>
                                                <td style={{ fontWeight: 700, color: item.qty > 0 ? '#059669' : '#ef4444' }}>
                                                    {item.qty?.toLocaleString()}
                                                </td>
                                                <td>{item.unit}</td>
                                                <td>
                                                    <span className={`badge ${getStockStatusClass(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button className="btn-sm" onClick={() => openDetail(item)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <Eye size={14} /> ดูรายละเอียด
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
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
                        </div>
                    )}

                    {hasSectionPermission('stock_logs_table') && (
                        <div className="table-card card">
                            {loading ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>
                            ) : filteredLogs.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                                    <p style={{ fontWeight: 600 }}>ยังไม่มีประวัติเข้า-ออก</p>
                                    <p style={{ fontSize: 13 }}>ระบบจะบันทึกประวัติอัตโนมัติเมื่อมีสินค้าเข้าหรือออกจากคลัง</p>
                                </div>
                            ) : (
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
                                            <th>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td>{log.date}</td>
                                                <td>
                                                    <span className={`badge ${getLogTypeClass(log.type)}`}>
                                                        {log.type === 'IN' ? '📥 รับเข้า' : log.refType === 'oem_direct' ? '🚚 OEM ส่งตรง' : '📤 เบิกจ่าย'}
                                                    </span>
                                                </td>
                                                <td className="text-bold">{log.item}</td>
                                                <td>
                                                    <span className={log.type === 'IN' ? 'text-success' : 'text-danger'} style={{ fontWeight: 700 }}>
                                                        {log.type === 'IN' ? '+' : '-'}{log.qty?.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                                                        {log.ref}
                                                    </span>
                                                </td>
                                                <td>{log.user}</td>
                                                <td className="text-muted" style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.note}</td>
                                                <td>
                                                    {log.ref && (
                                                        <button className="btn-sm" onClick={() => openLogDetail(log)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Eye size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Detail Modal ── */}
            {renderDetailModal()}
            {renderLogDetailModal()}
        </div>
    );
}

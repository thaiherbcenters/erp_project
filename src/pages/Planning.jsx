/**
 * =============================================================================
 * Planning.jsx — หน้าวางแผนการผลิต (เขียนใหม่)
 * =============================================================================
 * ประกอบด้วย 5 sub-pages:
 *   1. Planning Overview      — Dashboard ภาพรวมแผนการผลิต
 *   2. ใบสั่งผลิต (Job Order) — ตาราง Job Orders อ้างอิงสูตรจาก R&D
 *   3. ความต้องการวัตถุดิบ    — BOM Explosion คำนวณวัตถุดิบรวม
 *   4. Gantt / Timeline       — Placeholder
 *   5. เชื่อมโยง QC           — Placeholder
 *
 * Data: ดึงจาก productionMockData.js (shared กับ R&D/Production)
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Search, Plus, Filter, CalendarDays, PieChart, Activity,
    CheckCircle, Wrench, Package, ClipboardList, AlertTriangle,
    ArrowRight, Eye, XCircle, Beaker, TrendingUp, Clock, Play, ShoppingCart
} from 'lucide-react';
import API_BASE from '../config';
import { usePlanner } from '../context/PlannerContext';
import { useRnD } from '../context/RnDContext';
import { useAlert } from '../components/CustomAlert';
import './PageCommon.css';
import './Planning.css';

export default function Planning() {
    const { getVisibleSubPages, hasSectionPermission } = useAuth();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('planning');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;
    const { jobs, loading, releaseJobOrder, createJob } = usePlanner();
    const { formulas: MOCK_FORMULAS, materials: MOCK_RAW_MATERIALS } = useRnD();
    const { showAlert, showConfirm } = useAlert();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ทั้งหมด');
    const [soFilter, setSOFilter] = useState('');
    const [selectedJob, setSelectedJob] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        formulaId: '',
        formulaName: '',
        batchQty: 1,
        batchSize: 0,
        totalQty: 0,
        unit: '',
        priority: 'ปกติ',
        planDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        assignedLine: 'Line A',
        notes: '',
        customerName: '',
        customerPO: '',
        productionType: 'ผลิตตามแผน',
    });

    const [pendingSalesOrders, setPendingSalesOrders] = useState([]);
    const [loadingSOs, setLoadingSOs] = useState(false);
    const [viewingSODetail, setViewingSODetail] = useState(null);
    const [showSODetailModal, setShowSODetailModal] = useState(false);

    useEffect(() => {
        if (currentTab === 'planning_overview') {
            fetchPendingSalesOrders();
        }
    }, [currentTab]);

    const fetchPendingSalesOrders = async () => {
        setLoadingSOs(true);
        try {
            const res = await fetch(`${API_BASE}/sales-orders`);
            const json = await res.json();
            if (json.success) {
                const pending = json.data.filter(so => so.Status === 'ส่ง Planner แล้ว');
                setPendingSalesOrders(pending);
            }
        } catch (err) {
            console.error('Error fetching sales orders:', err);
        } finally {
            setLoadingSOs(false);
        }
    };

    const handleCreateFromSO = async (so) => {
        try {
            const res = await fetch(`${API_BASE}/sales-orders/${so.SalesOrderID}`);
            const json = await res.json();
            if (json.success) {
                const approvedFormulas = MOCK_FORMULAS.filter(f => f.status === 'อนุมัติ');
                const itemsWithMapping = (json.data.items || []).map(item => {
                    // Try auto-match formula by name
                    const matched = approvedFormulas.find(f => f.name === item.ItemName);
                    // Check if a JO already exists for this SO + item
                    const alreadyCreated = jobs.some(j => 
                        j.notes && j.notes.includes(`SO: ${so.SalesOrderNo}`) && j.notes.includes(`สินค้า: ${item.ItemName}`)
                    );
                    return {
                        ...item,
                        selectedFormulaId: matched ? matched.id : '',
                        priority: 'ปกติ',
                        assignedLine: 'Line A',
                        planDate: new Date().toISOString().split('T')[0],
                        notes: '',
                        created: alreadyCreated,
                    };
                });
                setSOPlanData({
                    soId: so.SalesOrderID,
                    soNo: so.SalesOrderNo,
                    customerName: so.CustomerName,
                    customerPO: so.CustomerPONumber || '',
                    deliveryDate: so.DeliveryDate,
                    items: itemsWithMapping,
                });
                setShowSOPlanModal(true);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // ── SO Planning Modal State ──
    const [showSOPlanModal, setShowSOPlanModal] = useState(false);
    const [soPlanData, setSOPlanData] = useState(null);
    const [creatingItemIdx, setCreatingItemIdx] = useState(-1);

    // Store SO items for showing in create modal (legacy - keep for normal create)
    const [createFromSOData, setCreateFromSOData] = useState(null);

    const handleCreateJobFromSOItem = async (itemIdx) => {
        if (!soPlanData) return;
        const item = soPlanData.items[itemIdx];
        if (!item.selectedFormulaId) {
            return showAlert('ข้อมูลไม่ครบ', `กรุณาเลือกสูตรการผลิตสำหรับ "${item.ItemName}"`, 'warning');
        }
        const formula = MOCK_FORMULAS.find(f => f.id === item.selectedFormulaId);
        if (!formula) return;

        const bSize = formula.batchSize > 0 ? formula.batchSize : 1;
        // OEM: ผลิตพอดีจำนวนสั่ง (ไม่ปัดขึ้นเป็น batch)
        const scaleFactor = item.Qty / bSize;

        setCreatingItemIdx(itemIdx);
        const userNotes = item.notes ? item.notes.trim() : '';
        const autoNote = `OEM — อ้างอิงจาก SO: ${soPlanData.soNo} | สินค้า: ${item.ItemName} | สเกล: ${(scaleFactor * 100).toFixed(1)}% ของสูตรหลัก`;
        const finalNotes = userNotes ? `${autoNote} | ${userNotes}` : autoNote;
        const jobData = {
            formulaId: formula.id,
            formulaName: formula.name,
            batchQty: 1,
            batchSize: item.Qty, // ผลิตพอดีจำนวนสั่ง
            totalQty: item.Qty,
            unit: formula.unit,
            priority: item.priority,
            planDate: item.planDate || new Date().toISOString().split('T')[0],
            dueDate: soPlanData.deliveryDate ? new Date(soPlanData.deliveryDate).toISOString().split('T')[0] : '',
            assignedLine: item.assignedLine,
            notes: finalNotes,
            customerName: soPlanData.customerName,
            customerPO: soPlanData.customerPO,
            productionType: 'ผลิตตามออร์เดอร์ (OEM)',
        };

        const res = await createJob(jobData);
        setCreatingItemIdx(-1);

        if (res.success) {
            setSOPlanData(prev => ({
                ...prev,
                items: prev.items.map((it, idx) => idx === itemIdx ? { ...it, created: true } : it)
            }));
            showAlert('สำเร็จ', `สร้างใบสั่งผลิต "${item.ItemName}" จำนวน ${Number(item.Qty).toLocaleString()} ${formula.unit} (สเกล ${(scaleFactor * 100).toFixed(1)}% ของสูตรหลัก) สำเร็จ!`, 'success');
        } else {
            showAlert('เกิดข้อผิดพลาด', res.message, 'error');
        }
    };

    const handleSOItemFormulaChange = (itemIdx, formulaId) => {
        setSOPlanData(prev => ({
            ...prev,
            items: prev.items.map((it, idx) => idx === itemIdx ? { ...it, selectedFormulaId: formulaId } : it)
        }));
    };

    const handleSOItemFieldChange = (itemIdx, field, value) => {
        setSOPlanData(prev => ({
            ...prev,
            items: prev.items.map((it, idx) => idx === itemIdx ? { ...it, [field]: value } : it)
        }));
    };

    const renderSOPlanModal = () => {
        if (!showSOPlanModal || !soPlanData) return null;
        const approvedFormulas = MOCK_FORMULAS.filter(f => f.status === 'อนุมัติ');
        const allCreated = soPlanData.items.every(it => it.created);

        return (
            <div className="rnd-modal-overlay" onClick={() => setShowSOPlanModal(false)}>
                <div className="rnd-modal" style={{ maxWidth: 850 }} onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>📋 จัดทำแผนผลิตจาก {soPlanData.soNo}</h2>
                            <div className="rnd-modal-meta" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <span className="badge badge-primary">MTO — ผลิตตามคำสั่งซื้อ</span>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ลูกค้า: <strong>{soPlanData.customerName}</strong></span>
                                {soPlanData.deliveryDate && (
                                    <span style={{ fontSize: 12, color: '#dc2626' }}>กำหนดส่ง: <strong>{new Date(soPlanData.deliveryDate).toLocaleDateString('th-TH')}</strong></span>
                                )}
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => setShowSOPlanModal(false)}><XCircle size={22} /></button>
                    </div>
                    <div className="rnd-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
                            เลือกสูตรการผลิตให้แต่ละรายการสินค้า แล้วกด "สร้างใบสั่งผลิต" ทีละรายการ (1 สินค้า = 1 ใบสั่งผลิต)
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {soPlanData.items.map((item, idx) => {
                                const matchedFormula = MOCK_FORMULAS.find(f => f.id === item.selectedFormulaId);
                                const bSize = matchedFormula && matchedFormula.batchSize > 0 ? matchedFormula.batchSize : 0;

                                return (
                                    <div key={idx} style={{
                                        border: item.created ? '1.5px solid #22c55e' : '1.5px solid var(--border)',
                                        borderRadius: 10,
                                        padding: 14,
                                        background: item.created ? '#f0fdf4' : 'var(--card-bg)',
                                        opacity: item.created ? 0.7 : 1,
                                        transition: 'all 0.3s'
                                    }}>
                                        {/* Row 1: Item info */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</span>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.ItemName}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>จำนวนที่ต้องผลิต: <strong style={{ color: 'var(--primary)' }}>{Number(item.Qty || 0).toLocaleString('th-TH')} {item.Unit || 'ชิ้น'}</strong></div>
                                                </div>
                                            </div>
                                            {item.created && (
                                                <span className="badge badge-success" style={{ fontSize: 11 }}>✅ สร้างแล้ว</span>
                                            )}
                                        </div>

                                        {/* Row 2: Formula select + Details */}
                                        {!item.created && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {/* สูตรการผลิต */}
                                                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                                    <div style={{ flex: 1, minWidth: 200 }}>
                                                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>สูตรการผลิต <span style={{ color: '#ef4444' }}>*</span></label>
                                                        <select
                                                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 13 }}
                                                            value={item.selectedFormulaId}
                                                            onChange={(e) => handleSOItemFormulaChange(idx, e.target.value)}
                                                        >
                                                            <option value="">-- เลือกสูตร --</option>
                                                            {approvedFormulas.map(f => (
                                                                <option key={f.id} value={f.id}>{f.id} — {f.name} ({f.batchSize.toLocaleString()} {f.unit}/batch)</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {matchedFormula && (
                                                        <div style={{ fontSize: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px', minWidth: 180 }}>
                                                            <div style={{ color: '#92400e', fontWeight: 600, marginBottom: 2 }}>OEM — ผลิตพอดีจำนวนสั่ง</div>
                                                            <div style={{ color: '#78716c' }}>สูตรอ้างอิง: <strong>{bSize.toLocaleString()} {matchedFormula.unit}/batch</strong></div>
                                                            <div style={{ color: '#78716c' }}>สเกลวัตถุดิบ: <strong style={{ color: '#0369a1' }}>{bSize > 0 ? ((item.Qty / bSize) * 100).toFixed(1) : 0}%</strong> ของสูตรหลัก</div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* รายละเอียดการวางแผน */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                                                    <div>
                                                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>ประเภทการผลิต</label>
                                                        <div style={{ padding: '7px 10px', borderRadius: 6, border: '1.5px solid #fde68a', fontSize: 12, fontWeight: 600, color: '#92400e', background: '#fffbeb', textAlign: 'center' }}>
                                                            ผลิตตามออร์เดอร์ (OEM)
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>ความสำคัญ <span style={{ color: '#ef4444' }}>*</span></label>
                                                        <select
                                                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 12 }}
                                                            value={item.priority}
                                                            onChange={(e) => handleSOItemFieldChange(idx, 'priority', e.target.value)}
                                                        >
                                                            <option value="ต่ำ">ต่ำ</option>
                                                            <option value="ปกติ">ปกติ</option>
                                                            <option value="สูง">สูง (ด่วน)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>วันเริ่มผลิต</label>
                                                        <input
                                                            type="date"
                                                            style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 12, boxSizing: 'border-box' }}
                                                            value={item.planDate}
                                                            onChange={(e) => handleSOItemFieldChange(idx, 'planDate', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>สายการผลิต</label>
                                                        <select
                                                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 12 }}
                                                            value={item.assignedLine}
                                                            onChange={(e) => handleSOItemFieldChange(idx, 'assignedLine', e.target.value)}
                                                        >
                                                            <option value="Line A">Line A (สายหลัก)</option>
                                                            <option value="Line B">Line B (สายรอง)</option>
                                                            <option value="Line C">Line C (สารเคมี)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* หมายเหตุ + ปุ่มสร้าง */}
                                                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>ข้อมูลเพิ่มเติม / หมายเหตุ</label>
                                                        <input
                                                            type="text"
                                                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 12, boxSizing: 'border-box' }}
                                                            placeholder="เช่น ติดฉลากภาษาอังกฤษ, ห่อพิเศษ"
                                                            value={item.notes || ''}
                                                            onChange={(e) => handleSOItemFieldChange(idx, 'notes', e.target.value)}
                                                        />
                                                    </div>
                                                    <button
                                                        className="btn-primary"
                                                        style={{ padding: '8px 16px', fontSize: 12, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                                                        onClick={() => handleCreateJobFromSOItem(idx)}
                                                        disabled={creatingItemIdx === idx}
                                                    >
                                                        {creatingItemIdx === idx ? '⏳ กำลังสร้าง...' : '📝 สร้างใบสั่งผลิต'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {allCreated && (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#22c55e', fontWeight: 600, fontSize: 15 }}>
                                🎉 สร้างใบสั่งผลิตครบทุกรายการแล้ว!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const handleViewSODetail = async (soId) => {
        try {
            const res = await fetch(`${API_BASE}/sales-orders/${soId}`);
            const json = await res.json();
            if (json.success) {
                setViewingSODetail(json.data);
                setShowSODetailModal(true);
            }
        } catch (err) {
            console.error('Error fetching SO detail:', err);
        }
    };

    const renderSODetailModal = () => {
        if (!showSODetailModal || !viewingSODetail) return null;
        const so = viewingSODetail;
        return (
            <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div className="card" style={{ width: '90%', maxWidth: 650, maxHeight: '85vh', overflowY: 'auto', padding: 24, animation: 'slideUp 0.25s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>📄 รายละเอียด {so.SalesOrderNo}</h2>
                        <button onClick={() => setShowSODetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>✖</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginBottom: 20, fontSize: 13 }}>
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>ชื่อลูกค้า</div>
                            <div style={{ fontWeight: 500 }}>{so.CustomerName || '-'}</div>
                        </div>
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>อ้างอิง QT</div>
                            <div style={{ fontWeight: 500 }}>{so.QuotationNo || '-'}</div>
                        </div>
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>PO ลูกค้า</div>
                            <div style={{ fontWeight: 500 }}>{so.CustomerPONumber || '-'}</div>
                        </div>
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>โทรศัพท์</div>
                            <div style={{ fontWeight: 500 }}>{so.Phone || '-'}</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>ที่อยู่</div>
                            <div style={{ fontWeight: 500 }}>{so.Address || '-'}</div>
                        </div>
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>วันที่สั่งซื้อ</div>
                            <div style={{ fontWeight: 500 }}>{so.OrderDate ? new Date(so.OrderDate).toLocaleDateString('th-TH') : '-'}</div>
                        </div>
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>กำหนดส่งมอบ</div>
                            <div style={{ fontWeight: 500, color: so.DeliveryDate ? '#dc2626' : 'var(--text)' }}>{so.DeliveryDate ? new Date(so.DeliveryDate).toLocaleDateString('th-TH') : '-'}</div>
                        </div>
                    </div>

                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px', borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>📦 รายการสินค้าที่ต้องผลิต</h3>
                    <table className="data-table" style={{ fontSize: 12, marginBottom: 16 }}>
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}>#</th>
                                <th>ชื่อสินค้า</th>
                                <th style={{ textAlign: 'right' }}>จำนวน</th>
                                <th>หน่วย</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(so.items || []).map((item, idx) => (
                                <tr key={idx}>
                                    <td>{idx + 1}</td>
                                    <td style={{ fontWeight: 500 }}>{item.ItemName}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>{Number(item.Qty || 0).toLocaleString('th-TH')}</td>
                                    <td>{item.Unit || 'ชิ้น'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Handle formula selection in create form
    const handleFormulaSelect = (formulaId) => {
        const formula = MOCK_FORMULAS.find(f => f.id === formulaId);
        if (formula) {
            const batchQty = createForm.batchQty || 1;
            setCreateForm(prev => ({
                ...prev,
                formulaId: formula.id,
                formulaName: formula.name,
                batchSize: formula.batchSize,
                unit: formula.unit,
                totalQty: batchQty * formula.batchSize,
            }));
        }
    };

    // Handle total qty change
    const handleTotalQtyChange = (val) => {
        const qty = parseInt(val) || 0;
        setCreateForm(prev => {
            const bSize = prev.batchSize > 0 ? prev.batchSize : 1;
            const bQty = Math.ceil(qty / bSize);
            return { ...prev, totalQty: qty, batchQty: bQty };
        });
    };

    // Submit create form
    const handleCreateSubmit = async () => {
        if (!createForm.formulaId) return showAlert('ข้อมูลไม่ครบ', 'กรุณาเลือกสูตรการผลิต', 'warning');
        if (!createForm.batchQty || createForm.batchQty < 1) return showAlert('ข้อมูลไม่ครบ', 'กรุณาระบุจำนวน Batch', 'warning');
        if (!createForm.dueDate) return showAlert('ข้อมูลไม่ครบ', 'กรุณาระบุวันกำหนดเสร็จ', 'warning');
        setIsCreating(true);
        const res = await createJob(createForm);
        setIsCreating(false);
        if (res.success) {
            await showAlert('สำเร็จ', 'สร้างใบสั่งผลิตสำเร็จ!', 'success');
            setShowCreateModal(false);
            setCreateForm({
                formulaId: '', formulaName: '', batchQty: 1, batchSize: 0, totalQty: 0, unit: '',
                priority: 'ปกติ', planDate: new Date().toISOString().split('T')[0], dueDate: '',
                assignedLine: 'Line A', notes: '', customerName: '', customerPO: '', productionType: 'ผลิตตามแผน',
            });
        } else {
            showAlert('เกิดข้อผิดพลาด', 'สร้างไม่สำเร็จ: ' + res.message, 'error');
        }
    };

    // ── Stats ──
    const totalJobs = jobs.length;
    const inProgressJobs = jobs.filter(j => j.status === 'กำลังผลิต').length;
    const waitingJobs = jobs.filter(j => j.status === 'รอผลิต' || j.status === 'รอเริ่มงาน').length;
    const completedJobs = jobs.filter(j => j.status === 'เสร็จสิ้น').length;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'กำลังผลิต': return 'status-warning';
            case 'รอผลิต': return 'status-info';
            case 'รอเริ่มงาน': return 'status-primary'; // A bluish-purple badge
            case 'เสร็จสิ้น': return 'status-success';
            default: return 'status-gray';
        }
    };

    const getPriorityBadge = (priority) => {
        switch (priority) {
            case 'สูง': return 'badge-danger';
            case 'ปกติ': return 'badge-success';
            case 'ต่ำ': return 'badge-info';
            default: return 'badge-neutral';
        }
    };

    const getLineBadge = (line) => {
        switch (line) {
            case 'Line A': return 'badge-info';
            case 'Line B': return 'badge-warning';
            case 'Line C': return 'badge-success';
            default: return 'badge-neutral';
        }
    };

    // ══════════════════════════════════════════════════════════════════
    // 1. Planning Overview (Dashboard)
    // ══════════════════════════════════════════════════════════════════
    const renderOverview = () => (
        <div className="planning-overview">

            {hasSectionPermission('planning_overview_stats') && (
                <div className="summary-row">
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#f0ebff', color: '#7b7bf5' }}><ClipboardList size={20} /></div>
                        <div><span className="summary-label">ใบสั่งผลิตทั้งหมด</span><span className="summary-value">{totalJobs}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#fff8e1', color: '#f9a825' }}><Activity size={20} /></div>
                        <div><span className="summary-label">กำลังผลิต</span><span className="summary-value">{inProgressJobs}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#e3f2fd', color: '#1e88e5' }}><Clock size={20} /></div>
                        <div><span className="summary-label">รอผลิต</span><span className="summary-value">{waitingJobs}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#ecfdf5', color: '#059669' }}><CheckCircle size={20} /></div>
                        <div><span className="summary-label">เสร็จสิ้น</span><span className="summary-value">{completedJobs}</span></div>
                    </div>
                </div>
            )}

            {/* คำสั่งซื้อที่รอวางแผน (Sales Orders) */}
            <div className="card" style={{ marginBottom: 16 }}>
                <h3 className="plan-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0284c7', margin: '0 0 4px' }}>
                    <ShoppingCart size={16} /> คำสั่งซื้อที่รอวางแผน (Pending Sales Orders)
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>ออเดอร์จากฝ่ายขายที่รอการจัดทำแผนผลิต (ใบสั่งผลิต)</p>
                <div className="table-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>เลขที่ SO</th>
                                <th>ลูกค้า / อ้างอิง PO</th>
                                <th>กำหนดส่งมอบ</th>
                                <th style={{ textAlign: 'center' }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingSOs ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>กำลังโหลดข้อมูลคำสั่งซื้อ...</td></tr>
                            ) : pendingSalesOrders.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่มีคำสั่งซื้อที่รอวางแผนในขณะนี้ 🎉</td></tr>
                            ) : pendingSalesOrders.map(so => (
                                <tr key={so.SalesOrderID}>
                                    <td className="text-bold" style={{ color: 'var(--primary)' }}>{so.SalesOrderNo}</td>
                                    <td>
                                        <div>{so.CustomerName}</div>
                                        {so.CustomerPONumber && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PO: {so.CustomerPONumber}</div>}
                                    </td>
                                    <td>{so.DeliveryDate ? new Date(so.DeliveryDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                            <button 
                                                className="doc-action-btn" title="ดูรายละเอียด"
                                                onClick={() => handleViewSODetail(so.SalesOrderID)}
                                            >
                                                <Eye size={15} />
                                            </button>
                                            <button 
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                                                onClick={() => handleCreateFromSO(so)}
                                            >
                                                <ClipboardList size={14} /> จัดทำแผนผลิต
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* สูตรที่พร้อมใช้งาน (จาก R&D) */}
            <div className="card" style={{ marginBottom: 16 }}>
                <h3 className="plan-card-title"><Beaker size={16} style={{ color: '#7b7bf5' }} /> สูตรที่พร้อมใช้งาน (จาก R&D)</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>สูตรที่ผ่านการอนุมัติแล้ว สามารถนำมาเปิดใบสั่งผลิตได้</p>
                <div className="plan-formula-grid">
                    {MOCK_FORMULAS.filter(f => f.status === 'อนุมัติ').map(f => (
                        <div key={f.id} className="plan-formula-card">
                            <div className="plan-formula-top">
                                <span className="plan-formula-code">{f.id}</span>
                                <span className="badge badge-success">พร้อมผลิต</span>
                            </div>
                            <div className="plan-formula-name">{f.name}</div>
                            <div className="plan-formula-meta">
                                <span>{f.batchSize.toLocaleString()} {f.unit}/batch</span>
                                <span>{f.ingredients.length} วัตถุดิบ</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Job Orders ล่าสุด */}
            <div className="card">
                <h3 className="plan-card-title"><ClipboardList size={16} style={{ color: '#1e88e5' }} /> ใบสั่งผลิตล่าสุด</h3>
                <div className="table-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>เลขที่</th>
                                <th>ผลิตภัณฑ์</th>
                                <th>จำนวน</th>
                                <th>สถานะ</th>
                                <th>Progress</th>
                                <th>กำหนดเสร็จ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล...</td></tr>
                            ) : jobs.slice(0, 3).map(job => (
                                <tr key={job.id}>
                                    <td className="text-bold" style={{ whiteSpace: 'nowrap' }}>{job.id}</td>
                                    <td>{job.formulaName}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{job.totalQty.toLocaleString()} {job.unit}</td>
                                    <td><span className={`status-badge ${getStatusBadge(job.status)}`}>{job.status}</span></td>
                                    <td>
                                        <div className="progress-container">
                                            <div className="progress-bar" style={{ width: `${job.progress}%`, backgroundColor: job.status === 'เสร็จสิ้น' ? 'var(--success)' : 'var(--primary)' }}></div>
                                            <span className="progress-text">{job.progress}%</span>
                                        </div>
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{job.dueDate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════
    // 2. ใบสั่งผลิต (Job Order List)
    // ══════════════════════════════════════════════════════════════════
    const handleReleaseJob = async (jobId) => {
        const ok = await showConfirm('ยืนยันการส่งงาน', `ยืนยันการส่งใบสั่งผลิต ${jobId} ให้ฝ่ายผลิต?\nระบบจะทำการตั้งคิวงานใหม่ทันที`, 'info');
        if (!ok) return;
        const res = await releaseJobOrder(jobId);
        if (res.success) {
            showAlert('สำเร็จ', 'ส่งงานให้ฝ่ายผลิตเรียบร้อยแล้ว! สามารถดูคิวงานได้ที่หน้าฝ่ายผลิต', 'success');
        } else {
            showAlert('เกิดข้อผิดพลาด', res.message, 'error');
        }
    };
    const renderPlanList = () => {
        const statuses = ['ทั้งหมด', 'รอผลิต', 'รอเริ่มงาน', 'กำลังผลิต', 'เสร็จสิ้น'];

        // Extract SO references from job notes
        const extractSO = (notes) => {
            if (!notes) return null;
            const match = notes.match(/SO:\s*(SO-[\d-]+)/);
            return match ? match[1] : null;
        };

        // Build unique SO list for filter
        const soList = [...new Set(jobs.map(j => extractSO(j.notes)).filter(Boolean))].sort();

        const filtered = jobs.filter(j => {
            const matchSearch = j.formulaName.includes(searchTerm) || j.id.includes(searchTerm) || (j.notes && j.notes.includes(searchTerm));
            const matchStatus = statusFilter === 'ทั้งหมด' || j.status === statusFilter;
            const matchSO = !soFilter || extractSO(j.notes) === soFilter;
            return matchSearch && matchStatus && matchSO;
        });

        return (
            <div className="planning-list">

                <div className="toolbar">
                    <div className="toolbar-left">
                        {hasSectionPermission('planning_list_search') && (
                            <div className="search-box">
                                <Search size={16} />
                                <input type="text" placeholder="ค้นหาใบสั่งผลิต..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        )}
                        <div className="plan-filter-group">
                            {statuses.map(s => (
                                <button key={s} className={`plan-filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        {soList.length > 0 && (
                            <select 
                                value={soFilter} 
                                onChange={(e) => setSOFilter(e.target.value)}
                                style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 12, color: soFilter ? '#0369a1' : 'var(--text-muted)', background: soFilter ? '#e0f2fe' : 'var(--card-bg)' }}
                            >
                                <option value="">ทุก SO</option>
                                {soList.map(so => (
                                    <option key={so} value={so}>{so}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    {hasSectionPermission('planning_list_action') && (
                        <button className="btn-primary" onClick={() => setShowCreateModal(true)}><Plus size={16} /> สร้างใบสั่งผลิต</button>
                    )}
                </div>

                {hasSectionPermission('planning_list_table') && (
                    <div className="card table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>เลขที่</th>
                                    <th>อ้างอิง SO</th>
                                    <th>สูตร (จาก R&D)</th>
                                    <th>ผลิตภัณฑ์</th>
                                    <th>จำนวนรวม</th>
                                    <th>ความสำคัญ</th>
                                    <th>ไลน์ผลิต</th>
                                    <th>กำหนดเสร็จ</th>
                                    <th>สถานะ</th>
                                    <th>Progress</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(job => {
                                    const soRef = extractSO(job.notes);
                                    return (
                                        <tr key={job.id}>
                                            <td className="text-bold" style={{ whiteSpace: 'nowrap' }}>{job.id}</td>
                                            <td>
                                                {soRef ? (
                                                    <span 
                                                        style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}
                                                        onClick={() => setSOFilter(soRef)}
                                                        title={`กรอง SO: ${soRef}`}
                                                    >
                                                        {soRef}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}><span className="plan-formula-ref">{job.formulaId}</span></td>
                                            <td>{job.formulaName}</td>
                                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{job.totalQty.toLocaleString()} {job.unit}</td>
                                            <td><span className={`badge ${getPriorityBadge(job.priority)}`}>{job.priority}</span></td>
                                            <td><span className={`badge ${getLineBadge(job.assignedLine)}`}>{job.assignedLine}</span></td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{job.dueDate}</td>
                                            <td><span className={`status-badge ${getStatusBadge(job.status)}`}>{job.status}</span></td>
                                            <td>
                                                <div className="progress-container">
                                                    <div className="progress-bar" style={{ width: `${job.progress}%`, backgroundColor: job.status === 'เสร็จสิ้น' ? 'var(--success)' : 'var(--primary)' }}></div>
                                                    <span className="progress-text">{job.progress}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <button className="btn-sm" onClick={() => setSelectedJob(job)}><Eye size={14} /></button>
                                                    {job.status === 'รอผลิต' && (
                                                        <button 
                                                            className="btn-sm" 
                                                            style={{ background: '#e0e7ff', color: '#4338ca' }} 
                                                            title="ปล่อยให้ฝ่ายผลิต" 
                                                            onClick={() => handleReleaseJob(job.id)}
                                                        >
                                                            <Play size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr><td colSpan="12" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่พบข้อมูล</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // 3. ความต้องการวัตถุดิบ (Material Requirement / BOM Explosion)
    // ══════════════════════════════════════════════════════════════════
    const renderMaterials = () => {
        // คำนวณ BOM Explosion จาก Job Orders ที่ยังไม่เสร็จ
        const activeJobs = jobs.filter(j => j.status === 'กำลังผลิต' || j.status === 'รอผลิต');
        const materialRequirements = {};

        activeJobs.forEach(job => {
            const formula = MOCK_FORMULAS.find(f => f.id === job.formulaId);
            if (!formula) return;

            formula.ingredients.forEach(ing => {
                const key = ing.materialId;
                // OEM scaling: use actual qty vs formula batch size
                const isOEM = job.notes && job.notes.includes('MTO');
                const scaleFactor = isOEM ? (job.totalQty / formula.batchSize) : job.batchQty;
                const requiredQty = ing.qty * scaleFactor;
                if (materialRequirements[key]) {
                    materialRequirements[key].requiredQty += requiredQty;
                    materialRequirements[key].jobs.push(job.id);
                } else {
                    const rm = MOCK_RAW_MATERIALS.find(m => m.id === ing.materialId);
                    materialRequirements[key] = {
                        materialId: ing.materialId,
                        name: ing.name,
                        unit: ing.unit,
                        requiredQty: requiredQty,
                        currentStock: rm ? rm.stock : 0,
                        minStock: rm ? rm.minStock : 0,
                        costPerUnit: rm ? rm.costPerUnit : 0,
                        jobs: [job.id],
                    };
                }
            });
        });

        const materialList = Object.values(materialRequirements);
        const totalCost = materialList.reduce((sum, m) => sum + (m.requiredQty * m.costPerUnit), 0);

        return (
            <div className="planning-materials">

                <div className="summary-row">
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#f0ebff', color: '#7b7bf5' }}><Package size={20} /></div>
                        <div><span className="summary-label">วัตถุดิบที่ต้องใช้</span><span className="summary-value">{materialList.length} รายการ</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#fff8e1', color: '#f9a825' }}><AlertTriangle size={20} /></div>
                        <div><span className="summary-label">ไม่เพียงพอ</span><span className="summary-value">{materialList.filter(m => m.currentStock < m.requiredQty).length} รายการ</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#e3f2fd', color: '#1e88e5' }}><TrendingUp size={20} /></div>
                        <div><span className="summary-label">ต้นทุนวัตถุดิบรวม</span><span className="summary-value">฿{totalCost.toLocaleString()}</span></div>
                    </div>
                </div>

                <div className="card table-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>รหัส</th>
                                <th>ชื่อวัตถุดิบ</th>
                                <th>ต้องการ</th>
                                <th>สต็อกปัจจุบัน</th>
                                <th>หน่วย</th>
                                <th>สถานะ</th>
                                <th>ต้นทุน</th>
                                <th>ใบสั่งผลิต</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materialList.map(m => {
                                const isShort = m.currentStock < m.requiredQty;
                                return (
                                    <tr key={m.materialId} className={isShort ? 'plan-row-warning' : ''}>
                                        <td className="text-bold">{m.materialId}</td>
                                        <td>{m.name}</td>
                                        <td style={{ fontWeight: 700 }}>{m.requiredQty}</td>
                                        <td style={{ color: isShort ? '#ef4444' : '#059669', fontWeight: 600 }}>{m.currentStock}</td>
                                        <td>{m.unit}</td>
                                        <td>
                                            {isShort ? (
                                                <span className="badge badge-danger">ไม่เพียงพอ (-{(m.requiredQty - m.currentStock).toFixed(1)})</span>
                                            ) : (
                                                <span className="badge badge-success">เพียงพอ</span>
                                            )}
                                        </td>
                                        <td>฿{(m.requiredQty * m.costPerUnit).toLocaleString()}</td>
                                        <td>
                                            <div className="plan-job-tags">
                                                {m.jobs.map(j => <span key={j} className="plan-job-tag">{j}</span>)}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // 4. Gantt Chart (Placeholder)
    // ══════════════════════════════════════════════════════════════════
    const renderGantt = () => (
        <div className="planning-gantt">

            <div className="card">
                {/* Simple timeline bars */}
                <div className="plan-timeline">
                    {jobs.filter(j => j.status !== 'เสร็จสิ้น').map(job => (
                        <div key={job.id} className="plan-timeline-row">
                            <div className="plan-timeline-label">
                                <span className="plan-timeline-id">{job.id}</span>
                                <span className="plan-timeline-name">{job.formulaName}</span>
                            </div>
                            <div className="plan-timeline-bar-container">
                                <div className="plan-timeline-bar"
                                    style={{
                                        width: `${Math.max(job.progress, 10)}%`,
                                        background: (job.status === 'รอผลิต' || job.status === 'รอเริ่มงาน') ? '#e2e8f0' : 'linear-gradient(90deg, #7b7bf5, #a78bfa)'
                                    }}>
                                    <span>{job.progress}%</span>
                                </div>
                                <div className="plan-timeline-dates">
                                    <span>{job.planDate}</span>
                                    <ArrowRight size={12} />
                                    <span>{job.dueDate}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════
    // 5. QC Link (Placeholder)
    // ══════════════════════════════════════════════════════════════════
    const renderQCLink = () => (
        <div className="planning-qc">

            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                <CheckCircle size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
                <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 8px' }}>กำลังพัฒนา</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>อัปเดตสถานะอัตโนมัติเมื่อฝ่าย QC ป้อนผลตรวจ</p>
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════
    // Job Order Detail Modal
    // ══════════════════════════════════════════════════════════════════
    const renderJobModal = () => {
        if (!selectedJob) return null;
        const job = selectedJob;
        const formula = MOCK_FORMULAS.find(f => f.id === job.formulaId);

        return (
            <div className="rnd-modal-overlay" onClick={() => setSelectedJob(null)}>
                <div className="rnd-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>ใบสั่งผลิต {job.id}</h2>
                            <div className="rnd-modal-meta">
                                <span className={`status-badge ${getStatusBadge(job.status)}`}>{job.status}</span>
                                <span className={`badge ${getPriorityBadge(job.priority)}`}>ความสำคัญ: {job.priority}</span>
                                <span className={`badge ${getLineBadge(job.assignedLine)}`}>{job.assignedLine}</span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => setSelectedJob(null)}><XCircle size={22} /></button>
                    </div>

                    <div className="rnd-modal-body">
                        <div className="rnd-modal-info-grid">
                            <div className="rnd-modal-info-item">
                                <label>ผลิตภัณฑ์</label>
                                <span>{job.formulaName}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>สูตรอ้างอิง (R&D)</label>
                                <span style={{ color: '#2563eb' }}>{job.formulaId}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>จำนวน Batch</label>
                                <span>{job.batchQty} batch × {job.batchSize.toLocaleString()} = {job.totalQty.toLocaleString()} {job.unit}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>กำหนดเสร็จ</label>
                                <span>{job.dueDate}</span>
                            </div>
                        </div>

                        {job.notes && (
                            <div className="rnd-modal-description">
                                <h4>หมายเหตุ</h4>
                                <p>{job.notes}</p>
                            </div>
                        )}

                        {/* วัตถุดิบที่ต้องใช้สำหรับ Job นี้ */}
                        {formula && (() => {
                            // OEM scaling: if totalQty differs from formula batchSize, scale ingredients proportionally
                            const isOEM = job.notes && job.notes.includes('MTO');
                            const scaleFactor = isOEM ? (job.totalQty / formula.batchSize) : job.batchQty;
                            const scaleLabel = isOEM 
                                ? `สเกลตามจำนวนสั่ง ${job.totalQty.toLocaleString()} ${job.unit} (${(scaleFactor * 100).toFixed(1)}% ของสูตรหลัก)`
                                : `คำนวณจากสูตร × ${job.batchQty} batch`;

                            return (
                                <div className="rnd-modal-section">
                                    <h4><Package size={16} /> วัตถุดิบที่ต้องใช้ ({scaleLabel})</h4>
                                    <table className="data-table rnd-ingredients-table">
                                        <thead>
                                            <tr>
                                                <th>วัตถุดิบ</th>
                                                <th>ต่อ 1 Batch ({formula.batchSize.toLocaleString()} {formula.unit})</th>
                                                <th>จำนวนที่ต้องใช้จริง</th>
                                                <th>หน่วย</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formula.ingredients.map((ing, idx) => (
                                                <tr key={idx}>
                                                    <td>{ing.name}</td>
                                                    <td style={{ color: 'var(--text-muted)' }}>{ing.qty}</td>
                                                    <td style={{ fontWeight: 700, color: isOEM ? '#0369a1' : 'var(--text)' }}>{(ing.qty * scaleFactor).toFixed(2)}</td>
                                                    <td>{ing.unit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Create Job Order Modal
    // ══════════════════════════════════════════════════════════════════
    const renderCreateModal = () => {
        if (!showCreateModal) return null;
        const approvedFormulas = MOCK_FORMULAS.filter(f => f.status === 'อนุมัติ');
        const selectedFormula = MOCK_FORMULAS.find(f => f.id === createForm.formulaId);
        
        return (
            <div className="rnd-modal-overlay" onClick={() => { setShowCreateModal(false); setCreateFromSOData(null); }}>
                <div className="rnd-modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>สร้างใบสั่งผลิตใหม่</h2>
                            <div className="rnd-modal-meta">
                                <span className="badge badge-primary">Production Plan</span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => { setShowCreateModal(false); setCreateFromSOData(null); }}><XCircle size={22} /></button>
                    </div>
                    <div className="rnd-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {/* ── SO Reference Info ── */}
                        {createFromSOData && (
                            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 14, marginBottom: 18 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontWeight: 600, fontSize: 14, color: '#0369a1' }}>
                                    <ShoppingCart size={15} /> ข้อมูลจากคำสั่งซื้อ: {createFromSOData.soNo}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12, marginBottom: 10 }}>
                                    <div><span style={{ color: 'var(--text-muted)' }}>ลูกค้า:</span> <strong>{createFromSOData.customerName}</strong></div>
                                    <div><span style={{ color: 'var(--text-muted)' }}>กำหนดส่ง:</span> <strong style={{ color: '#dc2626' }}>{createFromSOData.deliveryDate ? new Date(createFromSOData.deliveryDate).toLocaleDateString('th-TH') : '-'}</strong></div>
                                </div>
                                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #bae6fd', color: '#0369a1' }}>
                                            <th style={{ padding: '4px 6px', textAlign: 'left', width: 30 }}>#</th>
                                            <th style={{ padding: '4px 6px', textAlign: 'left' }}>ชื่อสินค้า</th>
                                            <th style={{ padding: '4px 6px', textAlign: 'right' }}>จำนวน</th>
                                            <th style={{ padding: '4px 6px', textAlign: 'left' }}>หน่วย</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {createFromSOData.items.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #e0f2fe' }}>
                                                <td style={{ padding: '4px 6px' }}>{idx + 1}</td>
                                                <td style={{ padding: '4px 6px', fontWeight: 500 }}>{item.ItemName}</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600, color: '#0369a1' }}>{Number(item.Qty || 0).toLocaleString('th-TH')}</td>
                                                <td style={{ padding: '4px 6px' }}>{item.Unit || 'ชิ้น'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {/* ── Section 1: สูตรการผลิต ── */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Beaker size={16} style={{ color: '#7b7bf5' }} /> เลือกสูตรการผลิต (จาก R&D)
                        </h4>
                        <div className="rnd-modal-info-grid" style={{ marginBottom: 20 }}>
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>สูตรที่อนุมัติแล้ว <span style={{ color: '#ef4444' }}>*</span></label>
                                <select 
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.formulaId} 
                                    onChange={(e) => handleFormulaSelect(e.target.value)}
                                >
                                    <option value="">-- เลือกสูตร --</option>
                                    {approvedFormulas.map(f => (
                                        <option key={f.id} value={f.id}>{f.id} — {f.name} ({f.batchSize} {f.unit}/batch)</option>
                                    ))}
                                </select>
                            </div>
                            {selectedFormula && (
                                <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1', background: '#f0fdf4', padding: 12, borderRadius: 8 }}>
                                    <label style={{ color: '#059669' }}>รายละเอียดสูตร</label>
                                    <span style={{ fontSize: 13 }}>
                                        {selectedFormula.description}<br/>
                                        <strong>Batch Size:</strong> {selectedFormula.batchSize} {selectedFormula.unit} | 
                                        <strong> อายุสินค้า:</strong> {selectedFormula.shelfLife} | 
                                        <strong> Version:</strong> {selectedFormula.version}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* ── Section 2: จำนวนการผลิต ── */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Package size={16} style={{ color: '#1e88e5' }} /> จำนวนการผลิต
                        </h4>
                        <div className="rnd-modal-info-grid" style={{ marginBottom: 20 }}>
                            <div className="rnd-modal-info-item">
                                <label>ยอดผลิตที่ต้องการรวม <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="number" min="1"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.totalQty}
                                    onChange={(e) => handleTotalQtyChange(e.target.value)}
                                    placeholder="ใส่จำนวณรวมที่ต้องการ"
                                />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>ขนาดต่อ Batch</label>
                                <span style={{ fontSize: 16, fontWeight: 700, color: '#7b7bf5' }}>
                                    {createForm.batchSize > 0 ? `${createForm.batchSize.toLocaleString()} ${createForm.unit}` : '—'}
                                </span>
                            </div>
                            <div className="rnd-modal-info-item" style={{ background: '#f0ebff', padding: 12, borderRadius: 8 }}>
                                <label style={{ color: '#7b7bf5', fontWeight: 700 }}>จำนวน Batch (จำนวนใบงาน)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                    <input 
                                        type="number" min="1"
                                        style={{ width: '80px', padding: '6px 12px', borderRadius: 8, border: '1.5px solid #c4b5fd', fontSize: 16, fontWeight: 700, color: '#5b21b6' }}
                                        value={createForm.batchQty}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, batchQty: parseInt(e.target.value) || 1 }))}
                                    />
                                    <span style={{ fontSize: 16, fontWeight: 800, color: '#5b21b6' }}>Batch</span>
                                </div>
                                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#7b7bf5' }}>* ระบบจะแยกเป็นหลายใบงานตามจำนวนเครื่องผสม สามารถแก้เป็น 1 ได้ถ้าต้องการใบเดียว</p>
                            </div>
                        </div>

                        {/* ── Section 3: การวางแผน ── */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CalendarDays size={16} style={{ color: '#f59e0b' }} /> การวางแผนและกำหนดการ
                        </h4>
                        <div className="rnd-modal-info-grid" style={{ marginBottom: 20 }}>
                            <div className="rnd-modal-info-item">
                                <label>ประเภทการผลิต</label>
                                <select style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.productionType}
                                    onChange={(e) => setCreateForm({...createForm, productionType: e.target.value})}
                                >
                                    <option value="ผลิตตามแผน">ผลิตตามแผน (MTS)</option>
                                    <option value="ผลิตตามออร์เดอร์ (OEM)">ผลิตตามออร์เดอร์ (OEM)</option>
                                    <option value="ผลิตเร่งด่วน">ผลิตเร่งด่วน (Urgent)</option>
                                    <option value="ผลิตทดสอบ">ผลิตทดสอบ (Trial Run)</option>
                                </select>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>ความสำคัญ <span style={{ color: '#ef4444' }}>*</span></label>
                                <select style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.priority}
                                    onChange={(e) => setCreateForm({...createForm, priority: e.target.value})}
                                >
                                    <option value="ต่ำ">ต่ำ</option>
                                    <option value="ปกติ">ปกติ</option>
                                    <option value="สูง">สูง (ด่วน)</option>
                                </select>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>วันเริ่มผลิต</label>
                                <input type="date" 
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.planDate}
                                    onChange={(e) => setCreateForm({...createForm, planDate: e.target.value})}
                                />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>กำหนดเสร็จ <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="date"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.dueDate}
                                    onChange={(e) => setCreateForm({...createForm, dueDate: e.target.value})}
                                />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>สายการผลิต (Production Line)</label>
                                <select style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.assignedLine}
                                    onChange={(e) => setCreateForm({...createForm, assignedLine: e.target.value})}
                                >
                                    <option value="Line A">Line A (สายหลัก)</option>
                                    <option value="Line B">Line B (สายรอง)</option>
                                    <option value="Line C">Line C (สารเคมี)</option>
                                </select>
                            </div>
                        </div>

                        {/* ── Section 4: ข้อมูลลูกค้า (ถ้ามี) ── */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ClipboardList size={16} style={{ color: '#059669' }} /> ข้อมูลเพิ่มเติม (ถ้ามี)
                        </h4>
                        <div className="rnd-modal-info-grid" style={{ marginBottom: 20 }}>
                            <div className="rnd-modal-info-item">
                                <label>ชื่อลูกค้า / บริษัท</label>
                                <input type="text" placeholder="เช่น บจก.สมุนไพรไทย"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.customerName}
                                    onChange={(e) => setCreateForm({...createForm, customerName: e.target.value})}
                                />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>เลขที่ PO / เลขอ้างอิง</label>
                                <input type="text" placeholder="เช่น PO-2026-0510"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                                    value={createForm.customerPO}
                                    onChange={(e) => setCreateForm({...createForm, customerPO: e.target.value})}
                                />
                            </div>
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>หมายเหตุ / คำสั่งพิเศษ</label>
                                <textarea rows={3} placeholder="เช่น ต้องติดฉลากภาษาอังกฤษ, ห่อพิเศษสำหรับส่งออก"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, resize: 'vertical' }}
                                    value={createForm.notes}
                                    onChange={(e) => setCreateForm({...createForm, notes: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* ── Summary ── */}
                        {createForm.formulaId && (
                            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: 16, marginBottom: 8 }}>
                                <strong style={{ color: '#1d4ed8', fontSize: 14 }}>📋 สรุปใบสั่งผลิต</strong>
                                <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.8, color: '#374151' }}>
                                    <div>สูตร: <strong>{createForm.formulaName}</strong> ({createForm.formulaId})</div>
                                    <div>ผลิต: <strong>{createForm.batchQty} batch × {createForm.batchSize.toLocaleString()} = {createForm.totalQty.toLocaleString()} {createForm.unit}</strong></div>
                                    <div>ไลน์: <strong>{createForm.assignedLine}</strong> | ความสำคัญ: <strong>{createForm.priority}</strong></div>
                                    <div>กำหนดการ: {createForm.planDate} → {createForm.dueDate || '(ยังไม่ระบุ)'}</div>
                                    {createForm.customerName && <div>ลูกค้า: <strong>{createForm.customerName}</strong> {createForm.customerPO && `(${createForm.customerPO})`}</div>}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="rnd-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
                        <button className="btn-secondary" onClick={() => setShowCreateModal(false)} disabled={isCreating}>ยกเลิก</button>
                        <button className="btn-primary" onClick={handleCreateSubmit} disabled={isCreating || !createForm.formulaId}>
                            {isCreating ? 'กำลังสร้าง...' : '✅ สร้างใบสั่งผลิต'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Main Render
    // ══════════════════════════════════════════════════════════════════
    if (visibleSubPages.length === 0) {
        return <div className="page-container"><p className="no-permission">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;
    }

    // ── กำหนดชื่อหน้าตาม Tab ที่เลือก ──
    const getPageTitle = () => {
        switch (currentTab) {
            case 'planning_overview': return 'ภาพรวมการวางแผน (Planning Overview)';
            case 'planning_list': return 'ใบสั่งผลิต (Job Order)';
            case 'planning_materials': return 'ความต้องการวัตถุดิบ (BOM Explosion)';
            case 'planning_gantt': return 'แผนภูมิการผลิต (Gantt Chart)';
            case 'planning_qc': return 'เชื่อมโยงผลการตรวจสอบคุณภาพ (QC)';
            default: return 'วางแผนการผลิต (Planning)';
        }
    };

    const getPageDesc = () => {
        switch (currentTab) {
            case 'planning_overview': return 'ภาพรวมการวางแผนการผลิต และข้อมูลสูตรที่พร้อมใช้งานจาก R&D';
            case 'planning_list': return 'สร้างและจัดการใบสั่งผลิตโดยอ้างอิงสูตรจากฝ่ายวิจัยและพัฒนา';
            case 'planning_materials': return `คำนวณวัตถุดิบรวมจากใบสั่งผลิตที่กำลังดำเนินการอยู่`;
            case 'planning_gantt': return 'แผนภูมิแสดงกำหนดการและช่วงเวลาการผลิตแต่ละรายการ';
            case 'planning_qc': return 'ตรวจสอบสถานะและเชื่อมโยงผล QC ของใบสั่งผลิตแต่ละใบ';
            default: return 'จัดการและวางแผนการผลิต';
        }
    };

    return (
        <div className="page-container planning-page page-enter">
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <h1>{getPageTitle()}</h1>
                <p>{getPageDesc()}</p>
            </div>
            {currentTab === 'planning_overview' && renderOverview()}
            {currentTab === 'planning_list' && renderPlanList()}
            {currentTab === 'planning_materials' && renderMaterials()}
            {renderJobModal()}
            {renderCreateModal()}
            {renderSODetailModal()}
            {renderSOPlanModal()}
        </div>
    );
}

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
    CheckCircle, CheckCircle2, Wrench, Package, ClipboardList, AlertTriangle,
    ArrowRight, Eye, XCircle, Beaker, TrendingUp, Clock, Play, ShoppingCart, FileText, UserCheck,
    Printer, Sparkles, Layers, SlidersHorizontal, RefreshCw, X
} from 'lucide-react';
import API_BASE from '../config';
import { usePlanner } from '../context/PlannerContext';
import { formatDynamicBatchSize, getDynamicBatchSizeValue, convertToBase, toLocalDateInput, getTodayLocal, formatThaiDocDate } from '../utils/formatters';
import { useRnD } from '../context/RnDContext';
import { useProduction } from '../context/ProductionContext';
import { useAlert } from '../components/CustomAlert';
import CustomDatePicker from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import PaginationControl from '../components/PaginationControl';
import { UNIT_OPTIONS } from '../data/billingData';
import ProductionOrderPreview from '../components/ProductionOrderPreview';
import { useSignatures } from '../hooks/useSignatures';
import './PageCommon.css';
import './Planning.css';

export default function Planning() {
    const { getVisibleSubPages, hasSectionPermission, canCreate, canUpdate, canDelete } = useAuth();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('planning');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;
    const { jobs, loading, releaseJobOrder, createJob } = usePlanner();
    const { formulas: MOCK_FORMULAS, materials: MOCK_RAW_MATERIALS, pmMaterials } = useRnD();
    const { qcRequests } = useProduction();
    const { showAlert, showConfirm } = useAlert();
    const { signatures: dbSignatures } = useSignatures();

    const hasSignature = (nameStr) => {
        if (!nameStr) return false;
        if (dbSignatures && dbSignatures.length > 0) {
            return dbSignatures.some(s => 
                (s.FullName && nameStr.includes(s.FullName)) ||
                (s.SignerName && nameStr.includes(s.SignerName)) ||
                (s.KeyName && nameStr.toLowerCase().includes(s.KeyName.toLowerCase())) ||
                (s.FullName && s.FullName.includes(nameStr))
            );
        }
        return nameStr.includes('ธวัช') || nameStr.includes('จุฑารัตน์');
    };

    const getSignatureSelectStyle = (baseStyle, val) => {
        const isSigned = hasSignature(val);
        return {
            ...baseStyle,
            background: isSigned ? '#f0fdf4' : '#fff',
            borderColor: isSigned ? '#86efac' : (baseStyle.borderColor || '#cbd5e1'),
            fontWeight: isSigned ? 600 : 400,
            color: isSigned ? '#15803d' : '#1e293b',
        };
    };

    const signatureOptions = (dbSignatures && dbSignatures.length > 0)
        ? Array.from(new Set(dbSignatures.map(s => s.FullName || s.SignerName || s.KeyName).filter(Boolean)))
        : ['ธวัช จรุงพิรวงศ์', 'จุฑารัตน์ วงค์คำเหลา'];

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ทั้งหมด');
    const [soFilter, setSOFilter] = useState('');
    const [lineFilter, setLineFilter] = useState('');
    const [formulaSearch, setFormulaSearch] = useState('');
    const [soSearch, setSoSearch] = useState('');
    const [jobPage, setJobPage] = useState(1);
    const [jobPageSize, setJobPageSize] = useState(10);

    // ── In-page Navigation View: 'jobs' | 'pending_so' | 'formulas' ──
    const [activeView, setActiveView] = useState(() => {
        const tab = new URLSearchParams(location.search).get('tab');
        if (tab === 'pending_so') return 'pending_so';
        if (tab === 'formulas') return 'formulas';
        return 'jobs';
    });

    useEffect(() => {
        const tab = new URLSearchParams(location.search).get('tab');
        if (tab === 'pending_so') setActiveView('pending_so');
        else if (tab === 'formulas') setActiveView('formulas');
        else if (tab === 'planning_list') setActiveView('jobs');
    }, [location.search]);

    const handleOpenCreateWithFormula = (formula) => {
        handleFormulaSelect(formula.id);
        setShowCreateModal(true);
    };

    useEffect(() => {
        setJobPage(1);
    }, [searchTerm, statusFilter, soFilter, jobPageSize]);

    const [selectedJob, setSelectedJob] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [previewJob, setPreviewJob] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        formulaId: '',
        formulaName: '',
        productName: '',
        batchQty: 1,
        batchSize: 0,
        totalQty: 0,
        unit: '',
        priority: 'ปกติ',
        planDate: getTodayLocal(),
        dueDate: '',
        assignedLine: 'Line A',
        notes: '',
        customerName: '',
        customerPO: '',
        productionType: 'ผลิตตามแผน',
        requestedBy: 'จุฑารัตน์ วงค์คำเหลา',
        checkedBy: 'นางสาวกิรณา เลิศมณี',
        approvedBy: 'ธวัช จรุงพิรวงศ์',
        responsibleBy: 'นายวันปิยะ คงกำเหนิด',
    });

    const [pendingSalesOrders, setPendingSalesOrders] = useState([]);
    const [allSalesOrders, setAllSalesOrders] = useState([]);
    const [loadingSOs, setLoadingSOs] = useState(false);
    const [viewingSODetail, setViewingSODetail] = useState(null);
    const [showSODetailModal, setShowSODetailModal] = useState(false);
    const [stockProducts, setStockProducts] = useState([]);

    useEffect(() => {
        const fetchStockProducts = async () => {
            try {
                const token = localStorage.getItem('erp_token');
                const res = await fetch(`${API_BASE}/stock?category=${encodeURIComponent('สินค้าสำเร็จรูป')}&limit=1000`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStockProducts(data.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch stock products:', err);
            }
        };
        fetchStockProducts();
    }, []);

    useEffect(() => {
        fetchPendingSalesOrders(pendingSalesOrders.length === 0);
    }, [jobs, showCreateModal]);

    const fetchPendingSalesOrders = async (showLoading = true) => {
        if (showLoading) setLoadingSOs(true);
        try {
            const res = await fetch(`${API_BASE}/sales-orders`);
            const json = await res.json();
            if (json.success) {
                setAllSalesOrders(json.data || []);
                const pending = json.data.filter(so => so.Status === 'ส่ง Planner แล้ว');
                setPendingSalesOrders(pending);
            }
        } catch (err) {
            console.error('Error fetching sales orders:', err);
        } finally {
            if (showLoading) setLoadingSOs(false);
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
                        requestedBy: 'จุฑารัตน์ วงค์คำเหลา',
                        checkedBy: 'นางสาวกิรณา เลิศมณี',
                        approvedBy: 'ธวัช จรุงพิรวงศ์',
                        responsibleBy: 'นายวันปิยะ คงกำเหนิด',
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
        let effectiveTotalBase = item.Qty;
        if (['ชิ้น', 'กระปุก', 'ขวด', 'กล่อง', 'หลอด', 'ดวง', 'ม้วน'].includes(item.Unit || 'ชิ้น') && !['ชิ้น', 'กระปุก', 'ขวด', 'กล่อง', 'หลอด', 'ดวง', 'ม้วน'].includes(formula.unit)) {
            effectiveTotalBase = item.Qty * (formula.unitSize || 1);
        }
        const scaleFactor = effectiveTotalBase / bSize;

        setCreatingItemIdx(itemIdx);
        const userNotes = item.notes ? item.notes.trim() : '';
        const autoNote = `OEM — อ้างอิงจาก SO: ${soPlanData.soNo} | สินค้า: ${item.ItemName} | สเกล: ${(scaleFactor * 100).toFixed(1)}% ของสูตรหลัก`;
        const finalNotes = userNotes ? `${autoNote} | ${userNotes}` : autoNote;
        const jobData = {
            formulaId: formula.id,
            formulaName: formula.name,
            productName: item.ItemName,
            batchQty: 1,
            batchSize: effectiveTotalBase, // Store effective base amount for reference
            totalQty: item.Qty,
            unit: item.Unit || 'ชิ้น',
            priority: item.priority,
            planDate: item.planDate || new Date().toISOString().split('T')[0],
            dueDate: soPlanData.deliveryDate ? new Date(soPlanData.deliveryDate).toISOString().split('T')[0] : '',
            assignedLine: item.assignedLine,
            notes: finalNotes,
            customerName: soPlanData.customerName,
            customerPO: soPlanData.customerPO,
            productionType: 'ผลิตตามออร์เดอร์ (OEM)',
            requestedBy: item.requestedBy || '',
            checkedBy: item.checkedBy || '',
            approvedBy: item.approvedBy || 'ธวัช จรุงพิรวงศ์',
            responsibleBy: item.responsibleBy || '',
        };

        const res = await createJob(jobData);
        setCreatingItemIdx(-1);

        if (res.success) {
            setSOPlanData(prev => {
                const newItems = prev.items.map((it, idx) => idx === itemIdx ? { ...it, created: true } : it);
                
                // Check if ALL items are now planned
                const allCreated = newItems.every(it => it.created);
                if (allCreated) {
                    // Automatically mark SO as 'วางแผนแล้ว'
                    const token = localStorage.getItem('token');
                    fetch(`${API_BASE}/sales-orders/${prev.soId}/status`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({ status: 'วางแผนแล้ว' })
                    }).then(() => {
                        fetchPendingSalesOrders(false);
                    }).catch(err => console.error('Failed to update SO status:', err));
                }
                
                return { ...prev, items: newItems };
            });
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
                                <span className="badge badge-primary">MTO — ผลิตตามคำสั่งขาย</span>
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
                                            {item.created && (() => {
                                                // หา JO ที่ตรงกับ item นี้
                                                const matchedJob = jobs.find(j => j.notes && j.notes.includes(`SO: ${soPlanData.soNo}`) && j.notes.includes(`สินค้า: ${item.ItemName}`));
                                                return (
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                        <span className="badge badge-success" style={{ fontSize: 11 }}>✅ สร้างแล้ว</span>
                                                        {matchedJob && (
                                                            <button
                                                                onClick={() => { setShowSOPlanModal(false); setPreviewJob(matchedJob); }}
                                                                style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #a7f3d0', background: '#ecfdf5', cursor: 'pointer', fontSize: 11, color: '#065f46', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
                                                            >
                                                                <FileText size={12} /> พรีวิวเอกสาร
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Row 2: Formula select + Details */}
                                        {!item.created && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                {/* ── สูตรการผลิต (full width) ── */}
                                                <div>
                                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 500 }}>สูตรการผลิต <span style={{ color: '#ef4444' }}>*</span></label>
                                                    <CustomSelect
                                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, boxSizing: 'border-box' }}
                                                        value={item.selectedFormulaId}
                                                        onChange={(e) => handleSOItemFormulaChange(idx, e.target.value)}
                                                    >
                                                        <option value="">-- เลือกสูตร --</option>
                                                        {approvedFormulas.map(f => (
                                                            <option key={f.id} value={f.id}>{f.id} — {f.name} ({f.ingredients?.length ? formatDynamicBatchSize(f.ingredients) : `${f.batchSize.toLocaleString()} ${f.unit}`}/batch)</option>
                                                        ))}
                                                    </CustomSelect>
                                                </div>

                                                {/* ── OEM Info (แสดงเมื่อเลือกสูตรแล้ว) ── */}
                                                {matchedFormula && (
                                                    <div style={{ display: 'flex', gap: 12, fontSize: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 14px', alignItems: 'center' }}>
                                                        <span style={{ color: '#92400e', fontWeight: 600, whiteSpace: 'nowrap' }}>OEM — ผลิตพอดีจำนวนสั่ง</span>
                                                        <span style={{ color: '#78716c' }}>สูตรอ้างอิง: <strong>{matchedFormula.ingredients?.length ? formatDynamicBatchSize(matchedFormula.ingredients) : `${bSize.toLocaleString()} ${matchedFormula.unit}`}/batch</strong></span>
                                                        <span style={{ color: '#78716c' }}>สเกลวัตถุดิบ: <strong style={{ color: '#0369a1' }}>{bSize > 0 ? ((item.Qty / bSize) * 100).toFixed(1) : 0}%</strong> ของสูตรหลัก</span>
                                                    </div>
                                                )}

                                                {/* ── รายละเอียดการวางแผน (4 ช่อง เท่ากัน) ── */}
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                                    <div>
                                                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 500 }}>ประเภทการผลิต</label>
                                                        <div style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #fde68a', fontSize: 12, fontWeight: 600, color: '#92400e', background: '#fffbeb', textAlign: 'center', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                                                            ผลิตตาม OEM
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 500 }}>ความสำคัญ <span style={{ color: '#ef4444' }}>*</span></label>
                                                        <CustomSelect
                                                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 12, height: 38, boxSizing: 'border-box' }}
                                                            value={item.priority}
                                                            onChange={(e) => handleSOItemFieldChange(idx, 'priority', e.target.value)}
                                                        >
                                                            <option value="ต่ำ">ต่ำ</option>
                                                            <option value="ปกติ">ปกติ</option>
                                                            <option value="สูง">สูง (ด่วน)</option>
                                                        </CustomSelect>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 500 }}>วันเริ่มผลิต</label>
                                                        <CustomDatePicker
                                                            value={item.planDate}
                                                            onChange={(e) => handleSOItemFieldChange(idx, 'planDate', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 500 }}>สายการผลิต</label>
                                                        <CustomSelect
                                                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 12, height: 38, boxSizing: 'border-box' }}
                                                            value={item.assignedLine}
                                                            onChange={(e) => handleSOItemFieldChange(idx, 'assignedLine', e.target.value)}
                                                        >
                                                            <option value="Line A">Line A (สายหลัก)</option>
                                                            <option value="Line B">Line B (สายรอง)</option>
                                                            <option value="Line C">Line C (สารเคมี)</option>
                                                        </CustomSelect>
                                                    </div>
                                                </div>

                                                {/* ── หมายเหตุ (full width) ── */}
                                                <div>
                                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 500 }}>ข้อมูลเพิ่มเติม / หมายเหตุ</label>
                                                    <input
                                                        type="text"
                                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 12, boxSizing: 'border-box', height: 38 }}
                                                        placeholder="เช่น ติดฉลากภาษาอังกฤษ, ห่อพิเศษ"
                                                        value={item.notes || ''}
                                                        onChange={(e) => handleSOItemFieldChange(idx, 'notes', e.target.value)}
                                                    />
                                                </div>

                                                {/* ── ผู้ลงนามและอนุมัติเอกสาร (4 ฝ่าย) ── */}
                                                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                                    <label style={{ fontSize: 11, color: '#334155', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, fontWeight: 600 }}>
                                                        <UserCheck size={14} color="#7c3aed" /> ผู้ลงนามและอนุมัติเอกสาร (4 ฝ่าย)
                                                    </label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                                                        <div>
                                                            <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3, fontWeight: 500 }}>ผู้ขอสั่งผลิต (วางแผน)</label>
                                                            <CustomSelect 
                                                                style={getSignatureSelectStyle({ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 12, height: 34, boxSizing: 'border-box' }, item.requestedBy)}
                                                                value={item.requestedBy || ''}
                                                                onChange={(e) => handleSOItemFieldChange(idx, 'requestedBy', e.target.value)}
                                                            >
                                                                <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
                                                                {signatureOptions.map(name => (
                                                                    <option key={name} value={name}>
                                                                        {name}{hasSignature(name) ? ' (มีลายเซ็น)' : ''}
                                                                    </option>
                                                                ))}
                                                            </CustomSelect>
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3, fontWeight: 500 }}>ผู้ตรวจสอบ (บัญชี)</label>
                                                            <CustomSelect 
                                                                style={getSignatureSelectStyle({ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 12, height: 34, boxSizing: 'border-box' }, item.checkedBy)}
                                                                value={item.checkedBy || ''}
                                                                onChange={(e) => handleSOItemFieldChange(idx, 'checkedBy', e.target.value)}
                                                            >
                                                                <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
                                                                {signatureOptions.map(name => (
                                                                    <option key={name} value={name}>
                                                                        {name}{hasSignature(name) ? ' (มีลายเซ็น)' : ''}
                                                                    </option>
                                                                ))}
                                                            </CustomSelect>
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3, fontWeight: 500 }}>ผู้อนุมัติ (บริหาร)</label>
                                                            <CustomSelect 
                                                                style={getSignatureSelectStyle({ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 12, height: 34, boxSizing: 'border-box' }, item.approvedBy)}
                                                                value={item.approvedBy || 'ธวัช จรุงพิรวงศ์'}
                                                                onChange={(e) => handleSOItemFieldChange(idx, 'approvedBy', e.target.value)}
                                                            >
                                                                <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
                                                                {signatureOptions.map(name => (
                                                                    <option key={name} value={name}>
                                                                        {name} {name.includes('ธวัช') ? ' (มีลายเซ็น)' : ''}
                                                                    </option>
                                                                ))}
                                                            </CustomSelect>
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3, fontWeight: 500 }}>ผู้รับผิดชอบ (ผลิต)</label>
                                                            <CustomSelect 
                                                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 12, height: 34, boxSizing: 'border-box' }}
                                                                value={item.responsibleBy || ''}
                                                                onChange={(e) => handleSOItemFieldChange(idx, 'responsibleBy', e.target.value)}
                                                            >
                                                                <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
                                                                {signatureOptions.map(name => (
                                                                    <option key={name} value={name}>{name}</option>
                                                                ))}
                                                            </CustomSelect>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ── ปุ่มดำเนินการ (ชิดขวา) ── */}
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                    <button
                                                        style={{ padding: '8px 16px', fontSize: 12, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8, border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#065f46', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}
                                                        onClick={() => {
                                                            const formula = MOCK_FORMULAS.find(f => f.id === item.selectedFormulaId);
                                                            setPreviewJob({
                                                                id: `(ยังไม่สร้าง)`,
                                                                formulaId: item.selectedFormulaId || '',
                                                                formulaName: formula ? formula.name : item.ItemName,
                                                                itemName: item.ItemName,
                                                                productName: item.ItemName,
                                                                totalQty: item.Qty || 0,
                                                                unit: item.Unit || 'ชิ้น',
                                                                planDate: item.planDate || new Date().toISOString().split('T')[0],
                                                                dueDate: soPlanData.deliveryDate ? new Date(soPlanData.deliveryDate).toISOString().split('T')[0] : '',
                                                                assignedLine: item.assignedLine || 'Line A',
                                                                notes: `OEM — อ้างอิงจาก SO: ${soPlanData.soNo} | สินค้า: ${item.ItemName} | ลูกค้า: ${soPlanData.customerName || '-'}`,
                                                                createdBy: '',
                                                            });
                                                        }}
                                                        title="พรีวิวเอกสารคำสั่งผลิต"
                                                    >
                                                        <FileText size={14} /> พรีวิวเอกสาร
                                                    </button>
                                                    <button
                                                        className="btn-primary"
                                                        style={{ padding: '8px 20px', fontSize: 12, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}
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
            <div className="modal-overlay" onClick={() => setShowSODetailModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: 680, maxHeight: '85vh', overflowY: 'auto', padding: 24, animation: 'slideUp 0.25s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>📄 รายละเอียด {so.SalesOrderNo}</h2>
                        <button onClick={() => setShowSODetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 4 }}>✖</button>
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
                    <div style={{ width: '100%', overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: 8, marginBottom: 8 }}>
                        <table className="data-table" style={{ width: '100%', minWidth: 'unset', fontSize: 13, marginBottom: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ width: 45, textAlign: 'center' }}>#</th>
                                    <th>ชื่อสินค้า</th>
                                    <th style={{ width: 110, textAlign: 'right' }}>จำนวน</th>
                                    <th style={{ width: 80, textAlign: 'center' }}>หน่วย</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(so.items || []).map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                        <td style={{ fontWeight: 500, whiteSpace: 'normal' }}>{item.ItemName}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>{Number(item.Qty || 0).toLocaleString('th-TH')}</td>
                                        <td style={{ textAlign: 'center' }}>{item.Unit || 'ชิ้น'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // Handle product selection in create form
    const handleProductChange = (val) => {
        const matched = stockProducts.find(p => p.name === val);
        setCreateForm(prev => ({
            ...prev,
            productName: val,
            unit: matched?.unit || prev.unit || 'ชิ้น'
        }));
    };

    // Handle formula selection in create form
    const handleFormulaSelect = (formulaId) => {
        const formula = MOCK_FORMULAS.find(f => f.id === formulaId);
        if (formula) {
            setCreateForm(prev => {
                const bSize = formula.batchSize;
                const qty = prev.totalQty || ''; // Do not auto-fill, keep existing or empty
                const bQty = qty ? Math.ceil(qty / bSize) : 1;
                return {
                    ...prev,
                    formulaId: formula.id,
                    formulaName: formula.name,
                    productName: prev.productName || formula.name,
                    batchSize: bSize,
                    formulaUnit: formula.unit, // Store formula unit separately
                    totalQty: qty,
                    batchQty: bQty,
                };
            });
        }
    };

    // Handle total qty change
    const handleTotalQtyChange = (val) => {
        const qty = val === '' ? '' : parseInt(val) || 0;
        setCreateForm(prev => {
            const bSize = prev.batchSize > 0 ? prev.batchSize : 1;
            const bQty = qty ? Math.ceil(qty / bSize) : 1;
            return { ...prev, totalQty: qty, batchQty: bQty };
        });
    };

    // Submit create form
    const handleCreateSubmit = async () => {
        if (!createForm.formulaId) return showAlert('ข้อมูลไม่ครบ', 'กรุณาเลือกสูตรการผลิต', 'warning');
        if (!createForm.totalQty || createForm.totalQty < 1) return showAlert('ข้อมูลไม่ครบ', 'กรุณาระบุยอดผลิตที่ต้องการรวม', 'warning');
        if (!createForm.unit) return showAlert('ข้อมูลไม่ครบ', 'กรุณาระบุหน่วยผลิตภัณฑ์', 'warning');
        if (!createForm.dueDate) return showAlert('ข้อมูลไม่ครบ', 'กรุณาระบุวันกำหนดเสร็จ', 'warning');
        setIsCreating(true);
        const res = await createJob(createForm);
        setIsCreating(false);
        if (res.success) {
            await showAlert('สำเร็จ', 'สร้างใบสั่งผลิตสำเร็จ!', 'success');
            setShowCreateModal(false);
            setCreateForm({
                formulaId: '', formulaName: '', productName: '', batchQty: 1, batchSize: 0, totalQty: 0, unit: '',
                priority: 'ปกติ', planDate: new Date().toISOString().split('T')[0], dueDate: '',
                assignedLine: 'Line A', notes: '', customerName: '', customerPO: '', productionType: 'ผลิตตามแผน',
                requestedBy: 'จุฑารัตน์ วงค์คำเหลา', checkedBy: 'นางสาวกิรณา เลิศมณี', approvedBy: 'ธวัช จรุงพิรวงศ์', responsibleBy: 'นายวันปิยะ คงกำเหนิด',
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
    // Unified Planning Hub Components
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

    // Extract SO references from job notes
    const extractSO = (notes) => {
        if (!notes) return null;
        const match = notes.match(/SO:\s*(SO-?[\d-]+)/);
        return match ? match[1] : null;
    };

    // QC Rejected Alert Banner
    const renderQCAlert = () => {
        const jobsWithRejectedQc = jobs.filter(j => {
            const jobQcs = (qcRequests || []).filter(q => q.jobOrderId === j.id);
            const latestQcs = {};
            jobQcs.forEach(q => {
                const key = `${q.taskId}_${q.type}`;
                if (!latestQcs[key] || new Date(q.requestedAt) > new Date(latestQcs[key].requestedAt)) {
                    latestQcs[key] = q;
                }
            });
            return Object.values(latestQcs).some(q => q.status === 'ไม่ผ่าน');
        });

        if (jobsWithRejectedQc.length === 0) return null;

        return (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', marginBottom: 18, display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', boxShadow: '0 2px 4px rgba(220, 38, 38, 0.05)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AlertTriangle size={20} color="#dc2626" />
                    </div>
                    <div>
                        <h4 style={{ color: '#991b1b', margin: '0 0 3px', fontSize: 14, fontWeight: 700 }}>
                            แจ้งเตือน: พบใบสั่งผลิตที่ไม่ผ่าน QC ({jobsWithRejectedQc.length} รายการ)
                        </h4>
                        <p style={{ color: '#b91c1c', margin: 0, fontSize: 12.5 }}>
                            มีรายการผลิตที่ผลตรวจคุณภาพไม่ผ่าน (ถูกส่งกลับแก้ไขหรือคัดทิ้ง) กรุณาตรวจสอบและประสานงานฝ่ายผลิต
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => { setActiveView('jobs'); setStatusFilter('ติดปัญหา (QC)'); }}
                    style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                >
                    <Filter size={14} /> กรองดูรายการที่ติดปัญหา
                </button>
            </div>
        );
    };

    // ── KPI Summary Cards ──
    const renderKPIStats = () => {
        const totalJobs = jobs.length;
        const inProgressJobs = jobs.filter(j => j.status === 'กำลังผลิต').length;
        const waitingJobs = jobs.filter(j => j.status === 'รอผลิต' || j.status === 'รอเริ่มงาน').length;
        const completedJobs = jobs.filter(j => j.status === 'เสร็จสิ้น').length;
        const pendingSOCount = pendingSalesOrders.length;
        const approvedFormulasCount = (MOCK_FORMULAS || []).filter(f => f.status === 'อนุมัติ').length;

        return (
            <div className="planning-kpi-grid">
                {/* 1. ออเดอร์รอวางแผน (Sales Orders) */}
                <div 
                    className={`planning-kpi-card ${activeView === 'pending_so' ? 'active-filter' : ''}`}
                    onClick={() => setActiveView('pending_so')}
                    title="คลิกเพื่อดูและจัดทำแผนผลิตจากคำสั่งขาย"
                    style={{ borderLeft: '4px solid #8b5cf6' }}
                >
                    <div className="planning-kpi-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                        <ShoppingCart size={22} />
                    </div>
                    <div className="planning-kpi-info">
                        <span className="planning-kpi-label">ออเดอร์รอวางแผน</span>
                        <span className="planning-kpi-value" style={{ color: pendingSOCount > 0 ? '#7c3aed' : '#0f172a' }}>
                            {pendingSOCount}
                        </span>
                        <span className="planning-kpi-sub">
                            {pendingSOCount > 0 ? '⚠️ มีคำสั่งขายรอเปิด JO' : 'จัดการครบถ้วนแล้ว'}
                        </span>
                    </div>
                </div>

                {/* 2. ใบสั่งผลิตทั้งหมด */}
                <div 
                    className={`planning-kpi-card ${activeView === 'jobs' && statusFilter === 'ทั้งหมด' ? 'active-filter' : ''}`}
                    onClick={() => { setActiveView('jobs'); setStatusFilter('ทั้งหมด'); }}
                    title="คลิกเพื่อดูใบสั่งผลิตทั้งหมด"
                    style={{ borderLeft: '4px solid #3b82f6' }}
                >
                    <div className="planning-kpi-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                        <ClipboardList size={22} />
                    </div>
                    <div className="planning-kpi-info">
                        <span className="planning-kpi-label">ใบสั่งผลิตทั้งหมด</span>
                        <span className="planning-kpi-value">{totalJobs}</span>
                        <span className="planning-kpi-sub">รายการ Job Order</span>
                    </div>
                </div>

                {/* 3. รอผลิต / รอเริ่มงาน */}
                <div 
                    className={`planning-kpi-card ${activeView === 'jobs' && statusFilter === 'รอผลิต' ? 'active-filter' : ''}`}
                    onClick={() => { setActiveView('jobs'); setStatusFilter('รอผลิต'); }}
                    title="คลิกเพื่อกรองเฉพาะงานที่รอผลิต"
                    style={{ borderLeft: '4px solid #0284c7' }}
                >
                    <div className="planning-kpi-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                        <Clock size={22} />
                    </div>
                    <div className="planning-kpi-info">
                        <span className="planning-kpi-label">รอเริ่มผลิต</span>
                        <span className="planning-kpi-value">{waitingJobs}</span>
                        <span className="planning-kpi-sub">พร้อมปล่อยเข้าไลน์</span>
                    </div>
                </div>

                {/* 4. กำลังผลิต */}
                <div 
                    className={`planning-kpi-card ${activeView === 'jobs' && statusFilter === 'กำลังผลิต' ? 'active-filter' : ''}`}
                    onClick={() => { setActiveView('jobs'); setStatusFilter('กำลังผลิต'); }}
                    title="คลิกเพื่อกรองเฉพาะงานที่กำลังผลิต"
                    style={{ borderLeft: '4px solid #f59e0b' }}
                >
                    <div className="planning-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                        <Activity size={22} />
                    </div>
                    <div className="planning-kpi-info">
                        <span className="planning-kpi-label">กำลังผลิต</span>
                        <span className="planning-kpi-value">{inProgressJobs}</span>
                        <span className="planning-kpi-sub">ในสายการผลิต</span>
                    </div>
                </div>

                {/* 5. เสร็จสิ้น */}
                <div 
                    className={`planning-kpi-card ${activeView === 'jobs' && statusFilter === 'เสร็จสิ้น' ? 'active-filter' : ''}`}
                    onClick={() => { setActiveView('jobs'); setStatusFilter('เสร็จสิ้น'); }}
                    title="คลิกเพื่อกรองเฉพาะงานที่เสร็จแล้ว"
                    style={{ borderLeft: '4px solid #10b981' }}
                >
                    <div className="planning-kpi-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                        <CheckCircle size={22} />
                    </div>
                    <div className="planning-kpi-info">
                        <span className="planning-kpi-label">ผลิตเสร็จสิ้น</span>
                        <span className="planning-kpi-value">{completedJobs}</span>
                        <span className="planning-kpi-sub">ส่งต่อคลังสินค้าแล้ว</span>
                    </div>
                </div>

                {/* 6. สูตร R&D พร้อมใช้ */}
                <div 
                    className={`planning-kpi-card ${activeView === 'formulas' ? 'active-filter' : ''}`}
                    onClick={() => setActiveView('formulas')}
                    title="คลิกเพื่อดูสูตรที่พร้อมผลิตจาก R&D"
                    style={{ borderLeft: '4px solid #06b6d4' }}
                >
                    <div className="planning-kpi-icon" style={{ background: '#ecfeff', color: '#0891b2' }}>
                        <Beaker size={22} />
                    </div>
                    <div className="planning-kpi-info">
                        <span className="planning-kpi-label">สูตร R&D พร้อมใช้</span>
                        <span className="planning-kpi-value">{approvedFormulasCount}</span>
                        <span className="planning-kpi-sub">อนุมัติพร้อมเปิดบิล</span>
                    </div>
                </div>
            </div>
        );
    };

    // ── In-Page Segmented Tab Navigation ──
    const renderTabBar = () => {
        const approvedFormulasCount = (MOCK_FORMULAS || []).filter(f => f.status === 'อนุมัติ').length;

        return (
            <div className="planning-hub-nav">
                <div className="planning-hub-tabs">
                    <button 
                        type="button" 
                        className={`planning-hub-tab-btn ${activeView === 'jobs' ? 'active' : ''}`}
                        onClick={() => setActiveView('jobs')}
                    >
                        <ClipboardList size={16} />
                        <span>ใบสั่งผลิตทั้งหมด (Job Orders)</span>
                        <span className="planning-hub-badge">{jobs.length}</span>
                    </button>
                    <button 
                        type="button" 
                        className={`planning-hub-tab-btn ${activeView === 'pending_so' ? 'active' : ''}`}
                        onClick={() => setActiveView('pending_so')}
                    >
                        <ShoppingCart size={16} />
                        <span>ออเดอร์รอวางแผน (Sales Orders)</span>
                        <span className={`planning-hub-badge ${pendingSalesOrders.length > 0 ? 'highlight' : ''}`}>
                            {pendingSalesOrders.length}
                        </span>
                    </button>
                    <button 
                        type="button" 
                        className={`planning-hub-tab-btn ${activeView === 'formulas' ? 'active' : ''}`}
                        onClick={() => setActiveView('formulas')}
                    >
                        <Beaker size={16} />
                        <span>สูตรพร้อมใช้ R&D (Formulas)</span>
                        <span className="planning-hub-badge">{approvedFormulasCount}</span>
                    </button>
                </div>
            </div>
        );
    };

    // ── TAB 1: รายการใบสั่งผลิตทั้งหมด ──
    const renderJobsTab = () => {
        const statuses = ['ทั้งหมด', 'รอผลิต', 'รอเริ่มงาน', 'กำลังผลิต', 'เสร็จสิ้น', 'ติดปัญหา (QC)'];
        const soList = [...new Set(jobs.map(j => extractSO(j.notes)).filter(Boolean))].sort();

        const filtered = jobs.filter(j => {
            const matchSearch = (j.formulaName || '').includes(searchTerm) ||
                (j.id || '').includes(searchTerm) ||
                (j.productName || '').includes(searchTerm) ||
                (j.notes && j.notes.includes(searchTerm));

            // ตรวจสอบ QC Rejected
            const jobQcs = (qcRequests || []).filter(q => q.jobOrderId === j.id);
            const latestQcs = {};
            jobQcs.forEach(q => {
                const key = `${q.taskId}_${q.type}`;
                if (!latestQcs[key] || new Date(q.requestedAt) > new Date(latestQcs[key].requestedAt)) {
                    latestQcs[key] = q;
                }
            });
            const hasRejected = Object.values(latestQcs).some(q => q.status === 'ไม่ผ่าน');

            let matchStatus = true;
            if (statusFilter === 'ติดปัญหา (QC)') {
                matchStatus = hasRejected && j.status !== 'เสร็จสิ้น';
            } else if (statusFilter !== 'ทั้งหมด') {
                matchStatus = j.status === statusFilter;
            }

            const matchSO = !soFilter || extractSO(j.notes) === soFilter;
            const matchLine = !lineFilter || j.assignedLine === lineFilter;

            return matchSearch && matchStatus && matchSO && matchLine;
        });

        const paginatedJobs = filtered.slice((jobPage - 1) * jobPageSize, (jobPage - 1) * jobPageSize + jobPageSize);

        return (
            <div className="planning-list">
                {/* ── Toolbar ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    {/* Row 1: ค้นหา + กรองสถานะ */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        {hasSectionPermission('planning_list_search') && (
                            <div className="search-group" style={{ maxWidth: 380, flex: 1, minWidth: 260 }}>
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="ค้นหาใบสั่งผลิต... (เลขที่ JO, สินค้า, SO)" 
                                        value={searchTerm} 
                                        onChange={(e) => setSearchTerm(e.target.value)} 
                                    />
                                    {searchTerm && (
                                        <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94a3b8' }}>
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* กรองสถานะ */}
                        <div className="plan-filter-group">
                            {statuses.map(s => (
                                <button 
                                    key={s} 
                                    className={`plan-filter-btn ${statusFilter === s ? 'active' : ''}`} 
                                    onClick={() => setStatusFilter(s)}
                                    style={s === 'ติดปัญหา (QC)' ? { borderColor: '#fca5a5', color: statusFilter === s ? '#fff' : '#dc2626', background: statusFilter === s ? '#dc2626' : '#fef2f2' } : {}}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Row 2: ตัวกรองย่อย SO + สายการผลิต + ตัวนับ */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            {soList.length > 0 && (
                                <CustomSelect 
                                    value={soFilter} 
                                    onChange={(e) => setSOFilter(e.target.value)}
                                    style={{ width: 170, padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 12.5, color: soFilter ? '#0369a1' : 'var(--text-muted)', background: soFilter ? '#e0f2fe' : '#fff' }}
                                >
                                    <option value="">ทุกคำสั่งขาย (SO)</option>
                                    {soList.map(so => (
                                        <option key={so} value={so}>{so}</option>
                                    ))}
                                </CustomSelect>
                            )}

                            <CustomSelect 
                                value={lineFilter} 
                                onChange={(e) => setLineFilter(e.target.value)}
                                style={{ width: 160, padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 12.5, color: lineFilter ? '#0369a1' : 'var(--text-muted)', background: lineFilter ? '#e0f2fe' : '#fff' }}
                            >
                                <option value="">ทุกสายการผลิต</option>
                                <option value="Line A">Line A (สายหลัก)</option>
                                <option value="Line B">Line B (สายรอง)</option>
                                <option value="Line C">Line C (สารเคมี)</option>
                            </CustomSelect>

                            {(searchTerm || statusFilter !== 'ทั้งหมด' || soFilter || lineFilter) && (
                                <button 
                                    onClick={() => { setSearchTerm(''); setStatusFilter('ทั้งหมด'); setSOFilter(''); setLineFilter(''); }}
                                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 8, fontSize: 12, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                >
                                    <RefreshCw size={12} /> ล้างตัวกรอง
                                </button>
                            )}
                        </div>

                        <div style={{ fontSize: 13, color: '#64748b' }}>
                            พบ <strong>{filtered.length}</strong> รายการ
                        </div>
                    </div>
                </div>

                {hasSectionPermission('planning_list_table') && (
                    <div className="card table-card" style={{ overflow: 'auto' }}>
                        <table className="data-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: 1040 }}>
                            <colgroup>
                                <col style={{ width: 155 }} />
                                <col style={{ width: 135 }} />
                                <col style={{ width: 'auto' }} />
                                <col style={{ width: 85 }} />
                                <col style={{ width: 75 }} />
                                <col style={{ width: 75 }} />
                                <col style={{ width: 105 }} />
                                <col style={{ width: 110 }} />
                                <col style={{ width: 95 }} />
                                <col style={{ width: 110 }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>เลขที่ JO</th>
                                    <th>อ้างอิง SO</th>
                                    <th>ผลิตภัณฑ์ / สูตร</th>
                                    <th style={{ textAlign: 'center' }}>จำนวน</th>
                                    <th style={{ textAlign: 'center' }}>สำคัญ</th>
                                    <th style={{ textAlign: 'center' }}>ไลน์</th>
                                    <th style={{ textAlign: 'center' }}>กำหนดเสร็จ</th>
                                    <th style={{ textAlign: 'center' }}>สถานะ</th>
                                    <th style={{ textAlign: 'center' }}>Progress</th>
                                    <th style={{ textAlign: 'center' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedJobs.map(job => {
                                    const soRef = extractSO(job.notes);
                                    
                                    const jobQcs = (qcRequests || []).filter(q => q.jobOrderId === job.id);
                                    const latestQcs = {};
                                    jobQcs.forEach(q => {
                                        const key = `${q.taskId}_${q.type}`;
                                        if (!latestQcs[key] || new Date(q.requestedAt) > new Date(latestQcs[key].requestedAt)) {
                                            latestQcs[key] = q;
                                        }
                                    });
                                    const hasRejected = Object.values(latestQcs).some(q => q.status === 'ไม่ผ่าน');
                                    
                                    let displayStatus = job.status;
                                    let badgeClass = getStatusBadge(job.status);
                                    if (hasRejected && job.status !== 'เสร็จสิ้น') {
                                        displayStatus = 'ติดปัญหา (QC)';
                                        badgeClass = 'badge-danger';
                                    }

                                    const progressColor = job.status === 'เสร็จสิ้น' ? 'var(--success)' : hasRejected ? 'var(--danger)' : 'var(--primary)';

                                    return (
                                        <tr key={job.id} style={hasRejected ? { background: '#fef2f2' } : {}}>
                                            {/* เลขที่ JO */}
                                            <td style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    {hasRejected && <AlertTriangle size={13} color="#dc2626" style={{ flexShrink: 0 }} />}
                                                    <span style={{ fontWeight: 600, fontSize: 12.5, color: hasRejected ? '#dc2626' : 'var(--primary)', letterSpacing: '0.3px' }}>
                                                        {job.id}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* อ้างอิง SO */}
                                            <td style={{ verticalAlign: 'middle' }}>
                                                {soRef ? (
                                                    <span 
                                                        style={{ fontSize: 11, background: '#ede9fe', color: '#6d28d9', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-block' }}
                                                        onClick={() => setSOFilter(soRef)}
                                                        title={`กรอง SO: ${soRef}`}
                                                    >
                                                        {soRef}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                                                )}
                                            </td>

                                            {/* ผลิตภัณฑ์ / สูตร */}
                                            <td style={{ verticalAlign: 'middle', overflow: 'hidden' }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={job.productName || job.formulaName}>
                                                    {job.productName && job.productName !== job.formulaName ? job.productName : job.formulaName}
                                                </div>
                                                {job.productName && job.productName !== job.formulaName && (
                                                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {job.formulaName}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                    <span className="plan-formula-ref" style={{ fontSize: 10 }}>{job.formulaId}</span>
                                                </div>
                                            </td>

                                            {/* จำนวน */}
                                            <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                                {job.totalQty.toLocaleString()}
                                                <div style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--text-muted)' }}>{job.unit}</div>
                                            </td>

                                            {/* ความสำคัญ */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <span className={`badge ${getPriorityBadge(job.priority)}`} style={{ fontSize: 11 }}>{job.priority}</span>
                                            </td>

                                            {/* ไลน์ผลิต */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <span className={`badge ${getLineBadge(job.assignedLine)}`} style={{ fontSize: 11 }}>{job.assignedLine}</span>
                                            </td>

                                            {/* กำหนดเสร็จ */}
                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: 12, verticalAlign: 'middle' }}>
                                                {job.dueDate ? formatThaiDocDate(job.dueDate) : '-'}
                                            </td>

                                            {/* สถานะ */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <span className={`status-badge ${badgeClass}`} style={{ fontSize: 11 }}>{displayStatus}</span>
                                            </td>

                                            {/* Progress */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div className="progress-container" style={{ minWidth: 60 }}>
                                                    <div className="progress-bar" style={{ width: `${job.progress}%`, backgroundColor: progressColor }}></div>
                                                    <span className="progress-text">{job.progress}%</span>
                                                </div>
                                            </td>

                                            {/* จัดการ */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center', background: '#f8fafc', borderRadius: 8, padding: '3px 4px', border: '1px solid #e2e8f0' }}>
                                                    <button 
                                                        className="btn-sm" 
                                                        onClick={() => setSelectedJob(job)} 
                                                        title="ดูรายละเอียด BOM & ขั้นตอน" 
                                                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button 
                                                        className="btn-sm" 
                                                        style={{ background: '#d1fae5', color: '#065f46', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} 
                                                        onClick={() => setPreviewJob(job)} 
                                                        title="พิมพ์ใบสั่งผลิต"
                                                    >
                                                        <Printer size={14} />
                                                    </button>
                                                    {(job.status === 'รอผลิต' || job.status === 'รอเริ่มงาน') && canUpdate('planning_list') && (
                                                        <button 
                                                            className="btn-sm" 
                                                            style={{ background: '#e0e7ff', color: '#4338ca', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} 
                                                            title="ปล่อยงานเข้าสู่ฝ่ายผลิต" 
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
                                    <tr>
                                        <td colSpan="10" style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                                <Search size={28} style={{ opacity: 0.3 }} />
                                                <p style={{ margin: 0, fontWeight: 500 }}>ไม่พบข้อมูลใบสั่งผลิตที่ตรงกับเงื่อนไข</p>
                                                {(searchTerm || statusFilter !== 'ทั้งหมด' || soFilter || lineFilter) && (
                                                    <button 
                                                        onClick={() => { setSearchTerm(''); setStatusFilter('ทั้งหมด'); setSOFilter(''); setLineFilter(''); }}
                                                        style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', marginTop: 4 }}
                                                    >
                                                        ล้างตัวกรองทั้งหมด
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <PaginationControl
                            currentPage={jobPage}
                            totalPages={Math.ceil(filtered.length / jobPageSize) || 1}
                            totalItems={filtered.length}
                            pageSize={jobPageSize}
                            onPageChange={setJobPage}
                            onPageSizeChange={setJobPageSize}
                        />
                    </div>
                )}
            </div>
        );
    };

    // ── TAB 2: คำสั่งขายที่รอวางแผน (Pending Sales Orders) ──
    const renderPendingSOTab = () => {
        const filteredSOs = pendingSalesOrders.filter(so => {
            if (!soSearch) return true;
            const term = soSearch.toLowerCase();
            return (so.SalesOrderNo || '').toLowerCase().includes(term) ||
                (so.CustomerName || '').toLowerCase().includes(term) ||
                (so.CustomerPONumber || '').toLowerCase().includes(term);
        });

        return (
            <div className="planning-so-view">
                {/* Header & Search */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShoppingCart size={18} color="#7c3aed" /> คำสั่งขายที่รอจัดทำแผนผลิต (Pending Sales Orders)
                        </h3>
                        <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
                            ออเดอร์ที่ได้รับการยืนยันจากฝ่ายขายแล้ว และรอจัดทำใบสั่งผลิต (Job Order) พร้อมสเกลวัตถุดิบอัตโนมัติ
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="search-input-wrap" style={{ width: 280 }}>
                            <Search size={15} />
                            <input 
                                type="text" 
                                placeholder="ค้นหาออเดอร์ (SO, ลูกค้า, PO)..." 
                                value={soSearch} 
                                onChange={(e) => setSoSearch(e.target.value)} 
                            />
                            {soSearch && (
                                <button onClick={() => setSoSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94a3b8' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <button 
                            onClick={() => fetchPendingSalesOrders(true)} 
                            style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: 8, fontSize: 12.5, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                            title="รีเฟรชคำสั่งขาย"
                        >
                            <RefreshCw size={14} className={loadingSOs ? 'spin' : ''} /> รีเฟรช
                        </button>
                    </div>
                </div>

                {loadingSOs ? (
                    <div className="card text-center" style={{ padding: 48, color: 'var(--text-muted)' }}>
                        <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px', color: '#8b5cf6' }} />
                        <div>กำลังโหลดคำสั่งขาย...</div>
                    </div>
                ) : filteredSOs.length === 0 ? (
                    <div className="card text-center" style={{ padding: '52px 24px', background: '#fff', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <CheckCircle2 size={34} />
                        </div>
                        <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 18, fontWeight: 700 }}>
                            {soSearch ? 'ไม่พบคำสั่งขายที่ตรงกับคำค้นหา' : 'ไม่มีคำสั่งขายที่รอวางแผนในขณะนี้ 🎉'}
                        </h3>
                        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                            {soSearch ? 'ลองตรวจสอบคำค้นหา หรือกดล้างคำค้นหา' : 'ยอดเยี่ยมมาก! ทุกคำสั่งขายจากฝ่ายขายได้รับการจัดทำแผนการผลิตเรียบร้อยแล้ว หรือยังไม่มีคำสั่งขายใหม่ส่งเข้ามา'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                            {soSearch ? (
                                <button className="btn-secondary" onClick={() => setSoSearch('')}>ล้างคำค้นหา</button>
                            ) : (
                                <button className="btn-primary" onClick={() => setActiveView('jobs')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <ClipboardList size={16} /> ดูรายการใบสั่งผลิตทั้งหมด
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="planning-so-grid">
                        {filteredSOs.map(so => (
                            <div key={so.SalesOrderID} className="planning-so-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                                {/* Header */}
                                <div className="planning-so-header">
                                    <div>
                                        <span className="planning-so-badge">
                                            <ShoppingCart size={13} /> {so.SalesOrderNo}
                                        </span>
                                        <h4 style={{ margin: '10px 0 0', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                                            {so.CustomerName}
                                        </h4>
                                    </div>
                                    <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
                                        {so.Status}
                                    </span>
                                </div>

                                {/* Body */}
                                <div className="planning-so-body">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {so.CustomerPONumber && (
                                            <div className="planning-so-meta-row">
                                                <FileText size={14} style={{ color: '#94a3b8' }} />
                                                <span>PO ลูกค้า: <strong style={{ color: '#334155' }}>{so.CustomerPONumber}</strong></span>
                                            </div>
                                        )}
                                        <div className="planning-so-meta-row">
                                            <CalendarDays size={14} style={{ color: '#94a3b8' }} />
                                            <span>กำหนดส่งมอบ: <strong style={{ color: '#dc2626' }}>{so.DeliveryDate ? formatThaiDocDate(so.DeliveryDate) : 'ไม่ระบุ'}</strong></span>
                                        </div>
                                    </div>

                                    {/* Items List Preview */}
                                    <div className="planning-so-items-box">
                                        <div style={{ fontWeight: 600, color: '#475569', marginBottom: 6, fontSize: 11.5, display: 'flex', justifyContent: 'space-between' }}>
                                            <span>รายการสินค้าในออเดอร์</span>
                                            <span>จำนวน</span>
                                        </div>
                                        {(so.items || []).length > 0 ? (
                                            (so.items || []).map((it, idx) => (
                                                <div key={idx} className="planning-so-item-row">
                                                    <span style={{ color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                                                        {it.ItemName}
                                                    </span>
                                                    <span style={{ fontWeight: 600, color: '#0369a1' }}>
                                                        {Number(it.Qty).toLocaleString()} {it.Unit || 'ชิ้น'}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>คลิกดูรายละเอียดเพื่อดูรายการสินค้า</div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="planning-so-footer">
                                    <button 
                                        onClick={() => handleViewSODetail(so.SalesOrderID)}
                                        style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #cbd5e1', color: '#475569', padding: '9px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                                    >
                                        <Eye size={14} /> รายละเอียด
                                    </button>
                                    <button 
                                        onClick={() => handleCreateFromSO(so)}
                                        style={{ flex: 1.3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, background: '#7c3aed', color: '#fff', border: 'none', padding: '9px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 4px rgba(124, 58, 237, 0.25)' }}
                                    >
                                        <ClipboardList size={15} /> จัดทำแผนผลิต
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ── TAB 3: สูตรการผลิตพร้อมใช้จาก R&D ──
    const renderFormulasTab = () => {
        const approvedFormulas = (MOCK_FORMULAS || []).filter(f => f.status === 'อนุมัติ');
        const filteredFormulas = approvedFormulas.filter(f => {
            if (!formulaSearch) return true;
            const term = formulaSearch.toLowerCase();
            return (f.id || '').toLowerCase().includes(term) ||
                (f.name || '').toLowerCase().includes(term);
        });

        return (
            <div className="planning-formulas-view">
                {/* Header & Search */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Beaker size={18} color="#0891b2" /> สูตรการผลิตที่พร้อมใช้งานจากฝ่ายวิจัยและพัฒนา (R&D)
                        </h3>
                        <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
                            สูตรที่ผ่านการคิดค้น ตรวจสอบ และอนุมัติแล้ว สามารถคลิก "+ เปิดใบสั่งผลิตจากสูตรนี้" เพื่อวางแผนผลิตได้ทันที
                        </p>
                    </div>

                    <div className="search-input-wrap" style={{ width: 280 }}>
                        <Search size={15} />
                        <input 
                            type="text" 
                            placeholder="ค้นหาสูตร (รหัสสูตร, ชื่อสูตร)..." 
                            value={formulaSearch} 
                            onChange={(e) => setFormulaSearch(e.target.value)} 
                        />
                        {formulaSearch && (
                            <button onClick={() => setFormulaSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94a3b8' }}>
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {filteredFormulas.length === 0 ? (
                    <div className="card text-center" style={{ padding: 48, color: 'var(--text-muted)' }}>
                        <Beaker size={32} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
                        <p style={{ margin: 0, fontWeight: 500 }}>ไม่พบสูตรที่ตรงกับคำค้นหา "{formulaSearch}"</p>
                    </div>
                ) : (
                    <div className="planning-formula-grid-v2">
                        {filteredFormulas.map(f => (
                            <div key={f.id} className="planning-formula-card-v2">
                                <div>
                                    <div className="planning-formula-top-v2">
                                        <span className="planning-formula-badge-code">{f.id}</span>
                                        <span className="badge badge-success" style={{ fontSize: 11 }}>พร้อมผลิต</span>
                                    </div>
                                    <h4 className="planning-formula-title">{f.name}</h4>
                                    
                                    <div className="planning-formula-details-box">
                                        <div>
                                            <div className="planning-formula-detail-label">ขนาด Batch มาตรฐาน</div>
                                            <div className="planning-formula-detail-val">
                                                {f.ingredients?.length ? formatDynamicBatchSize(f.ingredients) : `${f.batchSize?.toLocaleString()} ${f.unit}`}/batch
                                            </div>
                                        </div>
                                        <div>
                                            <div className="planning-formula-detail-label">จำนวนวัตถุดิบ</div>
                                            <div className="planning-formula-detail-val">{f.ingredients?.length || 0} รายการ</div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    className="btn-primary" 
                                    onClick={() => handleOpenCreateWithFormula(f)}
                                    style={{ width: '100%', padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#2563eb' }}
                                >
                                    <Plus size={15} /> เปิดใบสั่งผลิตจากสูตรนี้
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Legacy fallbacks for compatibility
    const renderOverview = () => renderJobsTab();
    const renderPlanList = () => renderJobsTab();



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
        const isOEM = (job.notes && (job.notes.includes('MTO') || job.notes.includes('OEM'))) || (job.productionType && job.productionType.includes('OEM'));

        return (
            <div className="rnd-modal-overlay" onClick={() => setSelectedJob(null)}>
                <div className="rnd-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>ใบสั่งผลิต {job.id}</h2>
                            <div className="rnd-modal-meta">
                                {(() => {
                                    const jobQcs = (qcRequests || []).filter(q => q.jobOrderId === job.id);
                                    const latestQcs = {};
                                    jobQcs.forEach(q => {
                                        const key = `${q.taskId}_${q.type}`;
                                        if (!latestQcs[key] || new Date(q.requestedAt) > new Date(latestQcs[key].requestedAt)) {
                                            latestQcs[key] = q;
                                        }
                                    });
                                    const hasRejected = Object.values(latestQcs).some(q => q.status === 'ไม่ผ่าน');
                                    let displayStatus = job.status;
                                    let badgeClass = getStatusBadge(job.status);
                                    if (hasRejected && job.status !== 'เสร็จสิ้น') {
                                        displayStatus = 'ติดปัญหา (QC)';
                                        badgeClass = 'badge-danger';
                                    }
                                    return <span className={`status-badge ${badgeClass}`}>{displayStatus}</span>;
                                })()}
                                <span className={`badge ${getPriorityBadge(job.priority)}`}>ความสำคัญ: {job.priority}</span>
                                <span className={`badge ${getLineBadge(job.assignedLine)}`}>{job.assignedLine}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={() => { setSelectedJob(null); setPreviewJob(job); }}
                                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #a7f3d0', background: '#ecfdf5', cursor: 'pointer', fontSize: '13px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, whiteSpace: 'nowrap' }}
                            >
                                <FileText size={14} /> พรีวิวเอกสาร
                            </button>
                            <button className="rnd-modal-close" onClick={() => setSelectedJob(null)}><XCircle size={22} /></button>
                        </div>
                    </div>

                    <div className="rnd-modal-body">
                        <div className="rnd-modal-info-grid">
                            <div className="rnd-modal-info-item">
                                <label>ผลิตภัณฑ์</label>
                                <span>{job.productName || job.formulaName}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>สูตรอ้างอิง (R&D)</label>
                                <span style={{ color: '#2563eb' }}>{job.formulaName} ({job.formulaId})</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>ยอดผลิตเป้าหมาย</label>
                                <span>
                                    {isOEM ? (
                                        <><strong style={{ color: '#0f172a' }}>{job.totalQty.toLocaleString()} {job.unit}</strong> <span style={{ color: '#64748b', fontSize: '13px' }}>(ผลิตตามสัดส่วน OEM)</span></>
                                    ) : (
                                        <>{job.batchQty} batch × {formula?.ingredients?.length ? formatDynamicBatchSize(formula.ingredients) : `${job.batchSize.toLocaleString()} ${job.unit}`} = <strong style={{ color: '#0f172a' }}>{job.totalQty.toLocaleString()} {job.unit}</strong></>
                                    )}
                                </span>
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
                            
                            const isPieceUnit = ['ชิ้น', 'กระปุก', 'ขวด', 'กล่อง', 'หลอด', 'ดวง', 'ม้วน'].includes(job.unit);
                            
                            let effectiveTotalBase = convertToBase(job.totalQty, job.unit);
                            if (isPieceUnit) {
                                effectiveTotalBase = job.totalQty * (formula.unitSize || 1);
                            }
                            
                            const actualFormulaBase = getDynamicBatchSizeValue(formula.ingredients) || convertToBase(formula.batchSize, formula.unit) || 1;
                            const scaleFactor = isOEM ? (effectiveTotalBase / actualFormulaBase) : job.batchQty;
                            const scaleLabel = isOEM 
                                ? `สเกลตามจำนวนสั่ง ${job.totalQty.toLocaleString()} ${job.unit} (${(scaleFactor * 100).toFixed(1)}% ของสูตรหลัก)`
                                : `คำนวณจากสูตร × ${job.batchQty} batch`;
                                
                            const explanationBlock = isPieceUnit ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#1e40af' }}>
                                    <div><strong style={{ color: '#1e3a8a' }}>1. หาน้ำหนักเป้าหมาย:</strong> ยอดสั่ง {job.totalQty.toLocaleString()} {job.unit} × ปริมาณบรรจุ {formula.unitSize || 1} กรัม/ชิ้น = <strong style={{ color: '#1d4ed8', fontSize: '14px' }}>{effectiveTotalBase.toLocaleString()} กรัม</strong></div>
                                    <div><strong style={{ color: '#1e3a8a' }}>2. หาสัดส่วน (Scale Factor):</strong> นำน้ำหนักเป้าหมาย ({effectiveTotalBase.toLocaleString()} กรัม) ÷ น้ำหนักสูตรหลัก 1 Batch ({actualFormulaBase.toLocaleString(undefined, { maximumFractionDigits: 2 })} กรัม) = <strong style={{ color: '#1d4ed8', fontSize: '14px' }}>{(scaleFactor * 100).toFixed(4)}%</strong></div>
                                    <div style={{ color: '#3b82f6', marginTop: '4px', fontSize: '12px' }}>* ระบบจะนำสัดส่วน {(scaleFactor * 100).toFixed(4)}% ไปคูณกับวัตถุดิบแต่ละตัวในสูตรหลัก เพื่อหาจำนวนที่ต้องใช้จริง</div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#1e40af' }}>
                                    <div><strong style={{ color: '#1e3a8a' }}>1. หาน้ำหนักเป้าหมาย:</strong> ยอดสั่ง = <strong style={{ color: '#1d4ed8', fontSize: '14px' }}>{effectiveTotalBase.toLocaleString()} กรัม</strong></div>
                                    <div><strong style={{ color: '#1e3a8a' }}>2. หาสัดส่วน (Scale Factor):</strong> นำน้ำหนักเป้าหมาย ({effectiveTotalBase.toLocaleString()} กรัม) ÷ น้ำหนักสูตรหลัก 1 Batch ({actualFormulaBase.toLocaleString(undefined, { maximumFractionDigits: 2 })} กรัม) = <strong style={{ color: '#1d4ed8', fontSize: '14px' }}>{(scaleFactor * 100).toFixed(4)}%</strong></div>
                                    <div style={{ color: '#3b82f6', marginTop: '4px', fontSize: '12px' }}>* ระบบจะนำสัดส่วน {(scaleFactor * 100).toFixed(4)}% ไปคูณกับวัตถุดิบแต่ละตัวในสูตรหลัก เพื่อหาจำนวนที่ต้องใช้จริง</div>
                                </div>
                            );
                            
                            const rawMaterials = formula.ingredients.filter(i => i.type !== 'packaging');
                            const packagingItems = formula.ingredients.filter(i => i.type === 'packaging');

                            let targetUnits = job.batchQty;
                            if (job.totalQty && formula.unitSize) {
                                if (isPieceUnit) {
                                    targetUnits = job.totalQty;
                                } else {
                                    targetUnits = Math.ceil(job.totalQty / formula.unitSize);
                                }
                            }

                            return (
                                <>
                                    {isOEM && (
                                        <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderLeft: '4px solid #3b82f6', padding: '14px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
                                            <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: '10px', fontSize: '14.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>💡</span> วิธีคำนวณสัดส่วนการใช้วัตถุดิบ
                                            </div>
                                            {explanationBlock}
                                        </div>
                                    )}
                                    <div className="rnd-modal-section">
                                        <h4><Beaker size={16} /> วัตถุดิบที่ต้องใช้ ({scaleLabel})</h4>
                                        <table className="data-table rnd-ingredients-table">
                                            <thead>
                                                <tr>
                                                    <th>วัตถุดิบ</th>
                                                    <th>ต่อ 1 Batch ({formula.ingredients?.length ? formatDynamicBatchSize(formula.ingredients) : `${formula.batchSize.toLocaleString()} ${formula.unit}`})</th>
                                                    <th>จำนวนที่ต้องใช้จริง</th>
                                                    <th>หน่วย</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rawMaterials.map((ing, idx) => {
                                                    const cleanName = ing.name
                                                        ? ing.name.replace(/<\/p>\s*<p>/gi, ', ').replace(/<[^>]+>/g, '').trim()
                                                        : '-';
                                                    return (
                                                    <tr key={idx}>
                                                        <td>{cleanName}</td>
                                                        <td style={{ color: 'var(--text-muted)' }}>{ing.qty}</td>
                                                        <td style={{ fontWeight: 700, color: isOEM ? '#0369a1' : 'var(--text)' }}>{(ing.qty * scaleFactor).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                                                        <td>{ing.unit}</td>
                                                    </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {packagingItems.length > 0 && (
                                        <div className="rnd-modal-section">
                                            <h4><Package size={16} style={{ color: '#f59e0b' }} /> บรรจุภัณฑ์ที่ต้องใช้ (เป้าหมาย: {targetUnits.toLocaleString()} ชิ้น)</h4>
                                            <table className="data-table rnd-ingredients-table">
                                                <thead>
                                                    <tr>
                                                        <th>บรรจุภัณฑ์ (อ้างอิงระบบ)</th>
                                                        <th>ชื่อบรรจุภัณฑ์</th>
                                                        <th>จำนวนที่ต้องใช้จริง</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        return packagingItems.map((ing, idx) => {
                                                            const pmMatch = pmMaterials?.find(m => String(m.id) === String(ing.materialId));
                                                            const rawMatch = MOCK_RAW_MATERIALS?.find(m => String(m.id) === String(ing.materialId));
                                                            const foundName = ing.name || (pmMatch ? pmMatch.name : (rawMatch ? rawMatch.name : null));
                                                            
                                                            const cleanName = foundName
                                                                ? foundName.replace(/<\/p>\s*<p>/gi, ', ').replace(/<[^>]+>/g, '').trim()
                                                                : '-';
                                                            
                                                            const baseQty = parseFloat(ing.qty) || 1;
                                                            // For packaging, qty defined in formula is per-piece
                                                            const scaledQty = Math.ceil(targetUnits * baseQty);

                                                            return (
                                                            <tr key={idx}>
                                                                <td className="text-bold">{ing.materialId}</td>
                                                                <td>{cleanName}</td>
                                                                <td style={{ fontWeight: 700, color: '#1e40af', background: '#eff6ff' }}>{scaledQty.toLocaleString()} {ing.unit || 'ชิ้น'}</td>
                                                            </tr>
                                                            );
                                                        });
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
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

        // Shared input style
        const inputStyle = { width: '100%', padding: '9px 14px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', height: 40, outline: 'none', transition: 'all 0.2s', background: '#fff' };
        const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 };
        const sectionHeaderStyle = { fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 };

        return (
            <div className="rnd-modal-overlay" onClick={() => { setShowCreateModal(false); setCreateFromSOData(null); }}>
                <div className="rnd-modal" style={{ maxWidth: 880, width: '92%' }} onClick={(e) => e.stopPropagation()}>
                    {/* ── Header ── */}
                    <div className="rnd-modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '18px 28px', background: '#f8fafc' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#0f172a' }}>สร้างใบสั่งผลิตใหม่</h2>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>ระบุข้อมูลสูตร กำหนดการ และจำนวนเพื่อสร้าง Job Order ใหม่</p>
                        </div>
                        <button className="rnd-modal-close" onClick={() => { setShowCreateModal(false); setCreateFromSOData(null); }}><XCircle size={24} /></button>
                    </div>

                    <div className="rnd-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '24px 28px' }}>

                        {/* ══ Section: อ้างอิงจาก SO ══ */}
                        <div style={{ marginBottom: 24, background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                            <div style={sectionHeaderStyle}>
                                <ShoppingCart size={18} color="#0284c7" />
                                <span>อ้างอิงจากคำสั่งขาย (Sales Order)</span>
                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginLeft: 'auto' }}>(ไม่บังคับ)</span>
                            </div>
                            {createFromSOData ? (
                                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, color: '#0369a1' }}>
                                            <ShoppingCart size={15} /> {createFromSOData.soNo}
                                        </div>
                                        <button 
                                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
                                            onClick={() => setCreateFromSOData(null)}
                                        >ยกเลิกลิงก์</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13 }}>
                                        <div><span style={{ color: '#64748b' }}>ลูกค้า:</span> <strong>{createFromSOData.customerName}</strong></div>
                                        <div><span style={{ color: '#64748b' }}>กำหนดส่ง:</span> <strong style={{ color: '#dc2626' }}>{createFromSOData.deliveryDate ? new Date(createFromSOData.deliveryDate).toLocaleDateString('th-TH') : '-'}</strong></div>
                                    </div>
                                </div>
                            ) : (
                                <CustomSelect
                                    style={{ ...inputStyle, height: 42 }}
                                    value=""
                                    onChange={async (e) => {
                                        const soId = e.target.value;
                                        if (!soId) return;
                                        const list = allSalesOrders.length > 0 ? allSalesOrders : pendingSalesOrders;
                                        const selectedSO = list.find(so => String(so.SalesOrderID) === String(soId));
                                        if (selectedSO) {
                                            setShowCreateModal(false);
                                            setCreateFromSOData(null);
                                            handleCreateFromSO(selectedSO);
                                        } else {
                                            try {
                                                const res = await fetch(`${API_BASE}/sales-orders/${soId}`);
                                                const json = await res.json();
                                                if (json.success) {
                                                    setShowCreateModal(false);
                                                    setCreateFromSOData(null);
                                                    handleCreateFromSO(json.data);
                                                }
                                            } catch (err) { console.error(err); }
                                        }
                                    }}
                                >
                                    <option value="">-- กรอกข้อมูลเอง (ไม่ระบุ SO) --</option>
                                    {(allSalesOrders.length > 0 ? allSalesOrders : pendingSalesOrders).map(so => (
                                        <option key={so.SalesOrderID} value={so.SalesOrderID}>
                                            {so.SalesOrderNo} — {so.CustomerName} ({so.Status || 'คำสั่งขาย'})
                                        </option>
                                    ))}
                                </CustomSelect>
                            )}
                        </div>

                        {/* ══ Section: สูตรและจำนวนการผลิต ══ */}
                        <div style={{ marginBottom: 24, background: '#fff', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                            <div style={sectionHeaderStyle}>
                                <Beaker size={18} color="#6366f1" />
                                <span>สูตรการผลิตและปริมาณ</span>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                                <div>
                                    <label style={labelStyle}>ชื่อผลิตภัณฑ์ที่สั่งผลิตจริง <span style={{ color: '#ef4444' }}>*</span></label>
                                    <CustomSelect 
                                        value={createForm.productName} 
                                        onChange={(e) => handleProductChange(e.target.value)}
                                    >
                                        <option value="">-- เลือกผลิตภัณฑ์ที่ต้องการผลิต --</option>
                                        {stockProducts.map(p => (
                                            <option key={p.id} value={p.name}>{p.name}</option>
                                        ))}
                                    </CustomSelect>
                                </div>
                                <div>
                                    <label style={labelStyle}>สูตรการผลิตที่อนุมัติแล้ว <span style={{ color: '#ef4444' }}>*</span></label>
                                    <CustomSelect 
                                        style={inputStyle}
                                        value={createForm.formulaId} 
                                        onChange={(e) => handleFormulaSelect(e.target.value)}
                                    >
                                        <option value="">-- เลือกสูตรจาก R&D --</option>
                                        {approvedFormulas.map(f => (
                                            <option key={f.id} value={f.id}>{f.id} — {f.name} ({f.ingredients?.length ? formatDynamicBatchSize(f.ingredients) : `${f.batchSize} ${f.unit}`}/batch)</option>
                                        ))}
                                    </CustomSelect>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'end' }}>
                                <div>
                                    <label style={labelStyle}>ยอดผลิตที่ต้องการรวม <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="number" min="1" style={inputStyle}
                                        value={createForm.totalQty}
                                        onChange={(e) => handleTotalQtyChange(e.target.value)}
                                        placeholder="ใส่จำนวนรวมที่ต้องการ"
                                    />
                                </div>

                                <div>
                                    <label style={labelStyle}>หน่วยผลิตภัณฑ์ <span style={{ color: '#ef4444' }}>*</span></label>
                                    <CustomSelect 
                                        style={inputStyle}
                                        value={createForm.unit || ''}
                                        onChange={(e) => setCreateForm({...createForm, unit: e.target.value})}
                                    >
                                        <option value="">-- ระบุหน่วย --</option>
                                        {UNIT_OPTIONS.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </CustomSelect>
                                </div>

                                <div>
                                    <label style={labelStyle}>ขนาดต่อ Batch</label>
                                    <div style={{ ...inputStyle, background: '#f8fafc', display: 'flex', alignItems: 'center', fontWeight: 600, color: '#475569' }}>
                                        {selectedFormula 
                                            ? (selectedFormula.ingredients?.length 
                                                ? formatDynamicBatchSize(selectedFormula.ingredients) 
                                                : `${selectedFormula.batchSize?.toLocaleString() || 0} ${selectedFormula.unit || ''}`) 
                                            : '—'}
                                    </div>
                                </div>
                            </div>

                            {selectedFormula && (
                                <div style={{ marginTop: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534' }}>
                                    <strong>รายละเอียดสูตร:</strong> {selectedFormula.name} — {selectedFormula.description} (อายุ: {selectedFormula.shelfLife} | Ver. {selectedFormula.version})
                                </div>
                            )}
                        </div>

                        {/* ══ Section: กำหนดการและสายการผลิต ══ */}
                        <div style={{ marginBottom: 24, background: '#fff', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                            <div style={sectionHeaderStyle}>
                                <CalendarDays size={18} color="#d97706" />
                                <span>การวางแผนและกำหนดการผลิต</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                                <div>
                                    <label style={labelStyle}>ประเภทการผลิต</label>
                                    <CustomSelect style={inputStyle}
                                        value={createForm.productionType}
                                        onChange={(e) => setCreateForm({...createForm, productionType: e.target.value})}
                                    >
                                        <option value="ผลิตตามแผน">ผลิตตามแผน (MTS)</option>
                                        <option value="ผลิตตามออร์เดอร์ (OEM)">ผลิตตามออร์เดอร์ (OEM)</option>
                                        <option value="ผลิตเร่งด่วน">ผลิตเร่งด่วน (Urgent)</option>
                                        <option value="ผลิตทดสอบ">ผลิตทดสอบ (Trial Run)</option>
                                    </CustomSelect>
                                </div>
                                <div>
                                    <label style={labelStyle}>ความสำคัญ <span style={{ color: '#ef4444' }}>*</span></label>
                                    <CustomSelect style={inputStyle}
                                        value={createForm.priority}
                                        onChange={(e) => setCreateForm({...createForm, priority: e.target.value})}
                                    >
                                        <option value="ต่ำ">ต่ำ</option>
                                        <option value="ปกติ">ปกติ</option>
                                        <option value="สูง">สูง (ด่วน)</option>
                                    </CustomSelect>
                                </div>
                                <div>
                                    <label style={labelStyle}>สายการผลิต (Line)</label>
                                    <CustomSelect style={inputStyle}
                                        value={createForm.assignedLine}
                                        onChange={(e) => setCreateForm({...createForm, assignedLine: e.target.value})}
                                    >
                                        <option value="Line A">Line A (สายหลัก)</option>
                                        <option value="Line B">Line B (สายรอง)</option>
                                        <option value="Line C">Line C (สารเคมี)</option>
                                    </CustomSelect>
                                </div>
                                <div>
                                    <label style={labelStyle}>วันเริ่มผลิต</label>
                                    <CustomDatePicker 
                                        value={createForm.planDate}
                                        onChange={(e) => setCreateForm({...createForm, planDate: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>กำหนดเสร็จ <span style={{ color: '#ef4444' }}>*</span></label>
                                    <CustomDatePicker
                                        value={createForm.dueDate}
                                        onChange={(e) => setCreateForm({...createForm, dueDate: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ══ Section: ข้อมูลเพิ่มเติม ══ */}
                        <div style={{ marginBottom: 24, background: '#fff', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                            <div style={sectionHeaderStyle}>
                                <ClipboardList size={18} color="#059669" />
                                <span>ข้อมูลลูกค้าและคำสั่งพิเศษ</span>
                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginLeft: 'auto' }}>(ไม่บังคับ)</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div>
                                    <label style={labelStyle}>ชื่อแบรนด์ / ชื่อลูกค้า</label>
                                    <input type="text" placeholder="เช่น มานะคท, บจก.สมุนไพรไทย" style={inputStyle}
                                        value={createForm.customerName}
                                        onChange={(e) => setCreateForm({...createForm, customerName: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>เลขที่ PO / เลขอ้างอิง</label>
                                    <input type="text" placeholder="เช่น PO-2026-0510" style={inputStyle}
                                        value={createForm.customerPO}
                                        onChange={(e) => setCreateForm({...createForm, customerPO: e.target.value})}
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>หมายเหตุ / คำสั่งพิเศษ</label>
                                    <textarea rows={2} placeholder="เช่น ต้องติดฉลากภาษาอังกฤษ, ห่อพิเศษสำหรับส่งออก"
                                        style={{ ...inputStyle, height: 'auto', resize: 'vertical' }}
                                        value={createForm.notes}
                                        onChange={(e) => setCreateForm({...createForm, notes: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ══ Section: ผู้ลงนามและอนุมัติเอกสาร ══ */}
                        <div style={{ marginBottom: 24, background: '#fff', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                            <div style={sectionHeaderStyle}>
                                <UserCheck size={18} color="#7c3aed" />
                                <span>ผู้ลงนามและอนุมัติเอกสาร (4 ฝ่าย)</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>ผู้ขอสั่งผลิต (วางแผน)</label>
                                    <CustomSelect 
                                        style={getSignatureSelectStyle(inputStyle, createForm.requestedBy)}
                                        value={createForm.requestedBy}
                                        onChange={(e) => setCreateForm({...createForm, requestedBy: e.target.value})}
                                    >
                                        <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
                                        {signatureOptions.map(name => (
                                            <option key={name} value={name}>
                                                {name}{hasSignature(name) ? ' (มีลายเซ็น)' : ''}
                                            </option>
                                        ))}
                                    </CustomSelect>
                                </div>
                                <div>
                                    <label style={labelStyle}>ผู้ตรวจสอบ (บัญชี)</label>
                                    <CustomSelect 
                                        style={getSignatureSelectStyle(inputStyle, createForm.checkedBy)}
                                        value={createForm.checkedBy}
                                        onChange={(e) => setCreateForm({...createForm, checkedBy: e.target.value})}
                                    >
                                        <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
                                        {signatureOptions.map(name => (
                                            <option key={name} value={name}>
                                                {name}{hasSignature(name) ? ' (มีลายเซ็น)' : ''}
                                            </option>
                                        ))}
                                    </CustomSelect>
                                </div>
                                <div>
                                    <label style={labelStyle}>ผู้อนุมัติ (บริหาร)</label>
                                    <CustomSelect 
                                        style={getSignatureSelectStyle(inputStyle, createForm.approvedBy)}
                                        value={createForm.approvedBy}
                                        onChange={(e) => setCreateForm({...createForm, approvedBy: e.target.value})}
                                    >
                                        <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
                                        {signatureOptions.map(name => (
                                            <option key={name} value={name}>
                                                {name}{hasSignature(name) ? ' (มีลายเซ็น)' : ''}
                                            </option>
                                        ))}
                                    </CustomSelect>
                                </div>
                                <div>
                                    <label style={labelStyle}>ผู้รับผิดชอบ (ผลิต)</label>
                                    <CustomSelect 
                                        style={getSignatureSelectStyle(inputStyle, createForm.responsibleBy)}
                                        value={createForm.responsibleBy}
                                        onChange={(e) => setCreateForm({...createForm, responsibleBy: e.target.value})}
                                    >
                                        <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
                                        {signatureOptions.map(name => (
                                            <option key={name} value={name}>
                                                {name}{hasSignature(name) ? ' (มีลายเซ็น)' : ''}
                                            </option>
                                        ))}
                                    </CustomSelect>
                                </div>
                            </div>
                        </div>

                        {/* ── Summary ── */}
                        {createForm.formulaId && (
                            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '16px 20px' }}>
                                <strong style={{ color: '#1d4ed8', fontSize: 14 }}>📋 สรุปใบสั่งผลิต</strong>
                                <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.8, color: '#334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                                    <div>ผลิตภัณฑ์: <strong>{createForm.productName || createForm.formulaName}</strong></div>
                                    <div>สูตรการผลิต: <strong>{createForm.formulaName}</strong> ({createForm.formulaId})</div>
                                    <div>ยอดผลิต: <strong>{createForm.batchQty} batch × {createForm.batchSize.toLocaleString()} = {createForm.totalQty.toLocaleString()} {createForm.unit}</strong></div>
                                    <div>ไลน์: <strong>{createForm.assignedLine}</strong> | ความสำคัญ: <strong>{createForm.priority}</strong></div>
                                    <div>กำหนดการ: {createForm.planDate} → {createForm.dueDate || '(ยังไม่ระบุ)'}</div>
                                    {createFromSOData && <div style={{ gridColumn: '1 / -1', color: '#0369a1' }}>🔗 อ้างอิง SO: <strong>{createFromSOData.soNo}</strong></div>}
                                    {createForm.customerName && <div style={{ gridColumn: '1 / -1' }}>ลูกค้า: <strong>{createForm.customerName}</strong> {createForm.customerPO && `(${createForm.customerPO})`}</div>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 28px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        <button className="btn-secondary" onClick={() => setShowCreateModal(false)} disabled={isCreating}>ยกเลิก</button>
                        <button 
                            type="button" 
                            className="btn-secondary" 
                            style={{ background: '#ecfdf5', color: '#047857', border: '1.5px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: createForm.formulaId ? 'pointer' : 'not-allowed', opacity: createForm.formulaId ? 1 : 0.6 }}
                            onClick={() => {
                                if (!createForm.formulaId) return showAlert('ข้อมูลไม่ครบ', 'กรุณาเลือกสูตรการผลิตก่อนพรีวิว', 'warning');
                                const draftJob = {
                                    id: 'JO-DRAFT',
                                    formulaId: createForm.formulaId,
                                    formulaName: createForm.productName || createForm.formulaName || selectedFormula?.name || 'ผลิตภัณฑ์',
                                    productName: createForm.productName || createForm.formulaName || selectedFormula?.name || 'ผลิตภัณฑ์',
                                    batchSize: createForm.batchSize || 0,
                                    batchQty: createForm.batchQty || 1,
                                    totalQty: createForm.totalQty || 0,
                                    unit: createForm.unit || 'ชิ้น',
                                    priority: createForm.priority || 'ปกติ',
                                    assignedLine: createForm.assignedLine || 'Line A',
                                    planDate: createForm.planDate || new Date().toISOString().split('T')[0],
                                    dueDate: createForm.dueDate || new Date().toISOString().split('T')[0],
                                    status: 'รอผลิต',
                                    progress: 0,
                                    notes: createForm.productName ? `สินค้า: ${createForm.productName} | ${createForm.notes || ''}` : createForm.notes,
                                    customerName: createForm.customerName || (createFromSOData ? createFromSOData.customerName : ''),
                                    customerPO: createForm.customerPO || '',
                                    requestedBy: createForm.requestedBy,
                                    checkedBy: createForm.checkedBy,
                                    approvedBy: createForm.approvedBy,
                                    responsibleBy: createForm.responsibleBy,
                                };
                                setPreviewJob(draftJob);
                            }}
                            disabled={!createForm.formulaId}
                        >
                            <FileText size={16} /> พรีวิวเอกสาร
                        </button>
                        <button className="btn-primary" onClick={handleCreateSubmit} disabled={isCreating || !createForm.formulaId} style={{ padding: '8px 20px', fontSize: 14 }}>
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
            case 'planning_qc': return 'เชื่อมโยงผลการตรวจสอบคุณภาพ (QC)';
            default: return 'วางแผนการผลิต (Planning)';
        }
    };

    const getPageDesc = () => {
        switch (currentTab) {
            case 'planning_overview': return 'ภาพรวมการวางแผนการผลิต และข้อมูลสูตรที่พร้อมใช้งานจาก R&D';
            case 'planning_list': return 'สร้างและจัดการใบสั่งผลิตโดยอ้างอิงสูตรจากฝ่ายวิจัยและพัฒนา';
            case 'planning_qc': return 'ตรวจสอบสถานะและเชื่อมโยงผล QC ของใบสั่งผลิตแต่ละใบ';
            default: return 'จัดการและวางแผนการผลิต';
        }
    };

    return (
        <div className="page-container planning-page page-enter">
            {/* Header */}
            <div className="page-title" style={{ padding: '0 0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontSize: 24, fontWeight: 700 }}>
                        <CalendarDays size={26} color="var(--primary)" />
                        ศูนย์วางแผนการผลิต (Production Planning Hub)
                    </h1>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                        ศูนย์ควบคุมแผนการผลิต จัดการใบสั่งผลิต ออเดอร์จากฝ่ายขาย และสูตรการผลิต R&D ครบวงจร
                    </p>
                </div>
                {hasSectionPermission('planning_list_action') && canCreate('planning_list') && (
                    <button 
                        className="btn-primary" 
                        onClick={() => setShowCreateModal(true)} 
                        style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)' }}
                    >
                        <Plus size={16} /> สร้างใบสั่งผลิตใหม่
                    </button>
                )}
            </div>

            {/* QC Rejected Alert Banner */}
            {renderQCAlert()}

            {/* Top Interactive KPI Cards (ศูนย์ควบคุมสถิติ) */}
            {hasSectionPermission('planning_overview_stats') && renderKPIStats()}

            {/* In-Page Navigation Tabs (สลับหน้าได้ทันที ไม่ต้องออกไปเมนูซ้าย) */}
            {renderTabBar()}

            {/* Tab Contents */}
            {activeView === 'jobs' && renderJobsTab()}
            {activeView === 'pending_so' && renderPendingSOTab()}
            {activeView === 'formulas' && renderFormulasTab()}

            {/* Modals */}
            {renderJobModal()}
            {renderCreateModal()}
            {renderSODetailModal()}
            {renderSOPlanModal()}
            {previewJob && <ProductionOrderPreview job={previewJob} onClose={() => setPreviewJob(null)} />}
        </div>
    );
}

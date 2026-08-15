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
    ArrowRight, Eye, XCircle, Beaker, TrendingUp, Clock, Play, ShoppingCart, FileText, UserCheck
} from 'lucide-react';
import API_BASE from '../config';
import { usePlanner } from '../context/PlannerContext';
import { useRnD } from '../context/RnDContext';
import { useProduction } from '../context/ProductionContext';
import { useAlert } from '../components/CustomAlert';
import CustomDatePicker from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import { PRODUCT_LIST } from '../data/billingData';
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
        planDate: new Date().toISOString().split('T')[0],
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

    useEffect(() => {
        if (currentTab === 'planning_overview' || showCreateModal) {
            // Only show loading indicator if it's currently empty (first load)
            fetchPendingSalesOrders(pendingSalesOrders.length === 0);
        }
    }, [currentTab, jobs, showCreateModal]);

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
                    fetch(`${API_BASE}/sales-orders/${prev.id}/status`, {
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
                                                            <option key={f.id} value={f.id}>{f.id} — {f.name} ({f.batchSize.toLocaleString()} {f.unit}/batch)</option>
                                                        ))}
                                                    </CustomSelect>
                                                </div>

                                                {/* ── OEM Info (แสดงเมื่อเลือกสูตรแล้ว) ── */}
                                                {matchedFormula && (
                                                    <div style={{ display: 'flex', gap: 12, fontSize: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 14px', alignItems: 'center' }}>
                                                        <span style={{ color: '#92400e', fontWeight: 600, whiteSpace: 'nowrap' }}>OEM — ผลิตพอดีจำนวนสั่ง</span>
                                                        <span style={{ color: '#78716c' }}>สูตรอ้างอิง: <strong>{bSize.toLocaleString()} {matchedFormula.unit}/batch</strong></span>
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
                productName: prev.productName || formula.name,
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
    // 1. Planning Overview (Dashboard)
    // ══════════════════════════════════════════════════════════════════
    const renderOverview = () => {
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

        return (
        <div className="planning-overview">

            {jobsWithRejectedQc.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <AlertTriangle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <h4 style={{ color: '#991b1b', margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>แจ้งเตือน: พบรายการผลิตที่ไม่ผ่าน QC</h4>
                        <p style={{ color: '#b91c1c', margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                            มีใบสั่งผลิตจำนวน <strong>{jobsWithRejectedQc.length}</strong> รายการที่ฝ่ายผลิตถูกส่งกลับแก้ไข (Rework) หรือคัดทิ้ง (Reject) เนื่องจากไม่ผ่านการตรวจสอบคุณภาพ 
                            กรุณาตรวจสอบตารางด้านล่างและประสานงานกับฝ่ายผลิต
                        </p>
                    </div>
                </div>
            )}

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

            {/* คำสั่งขายที่รอวางแผน (Sales Orders) */}
            <div className="card" style={{ marginBottom: 16 }}>
                <h3 className="plan-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0284c7', margin: '0 0 4px' }}>
                    <ShoppingCart size={16} /> คำสั่งขายที่รอวางแผน (Pending Sales Orders)
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
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>กำลังโหลดข้อมูลคำสั่งขาย...</td></tr>
                            ) : pendingSalesOrders.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่มีคำสั่งขายที่รอวางแผนในขณะนี้ 🎉</td></tr>
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
    };

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

                {/* ── Toolbar ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {/* Row 1: ค้นหา + ปุ่มสร้าง */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        {hasSectionPermission('planning_list_search') && (
                            <div className="search-group" style={{ maxWidth: 400 }}>
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input type="text" placeholder="ค้นหาใบสั่งผลิต... (เลขที่ JO, ชื่อสินค้า, SO)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('planning_list_action') && canCreate('planning_list') && (
                            <button className="btn-primary" onClick={() => setShowCreateModal(true)} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}><Plus size={16} /> สร้างใบสั่งผลิต</button>
                        )}
                    </div>
                    {/* Row 2: กรองสถานะ + กรอง SO */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div className="plan-filter-group">
                            {statuses.map(s => (
                                <button key={s} className={`plan-filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        {soList.length > 0 && (
                            <CustomSelect 
                                value={soFilter} 
                                onChange={(e) => setSOFilter(e.target.value)}
                                style={{ width: 160, padding: '5px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 12, color: soFilter ? '#0369a1' : 'var(--text-muted)', background: soFilter ? '#e0f2fe' : 'var(--card-bg)' }}
                            >
                                <option value="">ทุก SO</option>
                                {soList.map(so => (
                                    <option key={so} value={so}>{so}</option>
                                ))}
                            </CustomSelect>
                        )}
                    </div>
                </div>

                {hasSectionPermission('planning_list_table') && (
                    <div className="card table-card" style={{ overflow: 'auto' }}>
                        <table className="data-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: 1000 }}>
                            <colgroup>
                                <col style={{ width: 155 }} />
                                <col style={{ width: 135 }} />
                                <col style={{ width: 'auto' }} />
                                <col style={{ width: 80 }} />
                                <col style={{ width: 70 }} />
                                <col style={{ width: 70 }} />
                                <col style={{ width: 100 }} />
                                <col style={{ width: 100 }} />
                                <col style={{ width: 90 }} />
                                <col style={{ width: 100 }} />
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
                                {filtered.map(job => {
                                    const soRef = extractSO(job.notes);
                                    
                                    // หา QC ล่าสุดของแต่ละ Task ใน Job นี้
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
                                            {/* ── เลขที่ JO ── */}
                                            <td style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    {hasRejected && <AlertTriangle size={13} color="#dc2626" style={{ flexShrink: 0 }} />}
                                                    <span style={{ fontWeight: 600, fontSize: 12, color: hasRejected ? '#dc2626' : 'var(--primary)', letterSpacing: '0.3px' }}>{job.id}</span>
                                                </div>
                                            </td>
                                            {/* ── อ้างอิง SO ── */}
                                            <td style={{ verticalAlign: 'middle' }}>
                                                {soRef ? (
                                                    <span 
                                                        style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap', display: 'inline-block' }}
                                                        onClick={() => setSOFilter(soRef)}
                                                        title={`กรอง SO: ${soRef}`}
                                                    >
                                                        {soRef}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                                                )}
                                            </td>
                                            {/* ── ผลิตภัณฑ์ / สูตร (รวมกัน) ── */}
                                            <td style={{ verticalAlign: 'middle', overflow: 'hidden' }}>
                                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={job.formulaName}>
                                                    {job.formulaName}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                                    <span className="plan-formula-ref" style={{ fontSize: 10 }}>{job.formulaId}</span>
                                                </div>
                                            </td>
                                            {/* ── จำนวน ── */}
                                            <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                                {job.totalQty.toLocaleString()}
                                                <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>{job.unit}</div>
                                            </td>
                                            {/* ── ความสำคัญ ── */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <span className={`badge ${getPriorityBadge(job.priority)}`} style={{ fontSize: 11 }}>{job.priority}</span>
                                            </td>
                                            {/* ── ไลน์ผลิต ── */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <span className={`badge ${getLineBadge(job.assignedLine)}`} style={{ fontSize: 11 }}>{job.assignedLine}</span>
                                            </td>
                                            {/* ── กำหนดเสร็จ ── */}
                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: 12, verticalAlign: 'middle' }}>{job.dueDate}</td>
                                            {/* ── สถานะ ── */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <span className={`status-badge ${badgeClass}`} style={{ fontSize: 11 }}>{displayStatus}</span>
                                            </td>
                                            {/* ── Progress ── */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div className="progress-container" style={{ minWidth: 60 }}>
                                                    <div className="progress-bar" style={{ width: `${job.progress}%`, backgroundColor: progressColor }}></div>
                                                    <span className="progress-text">{job.progress}%</span>
                                                </div>
                                            </td>
                                            {/* ── จัดการ ── */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'inline-flex', gap: 3, alignItems: 'center', background: 'var(--bg)', borderRadius: 6, padding: '2px 3px' }}>
                                                    <button className="btn-sm" onClick={() => setSelectedJob(job)} title="ดูรายละเอียด" style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><Eye size={14} /></button>
                                                    <button className="btn-sm" style={{ background: '#d1fae5', color: '#065f46', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={() => setPreviewJob(job)} title="พรีวิวเอกสาร"><FileText size={14} /></button>
                                                    {job.status === 'รอผลิต' && canUpdate('planning_list') && (
                                                        <button 
                                                            className="btn-sm" 
                                                            style={{ background: '#e0e7ff', color: '#4338ca', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} 
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
                                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่พบข้อมูล</td></tr>
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
                const isOEM = (job.notes && (job.notes.includes('MTO') || job.notes.includes('OEM'))) || (job.productionType && job.productionType.includes('OEM'));
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
                            const isOEM = (job.notes && (job.notes.includes('MTO') || job.notes.includes('OEM'))) || (job.productionType && job.productionType.includes('OEM'));
                            
                            let effectiveTotalBase = job.totalQty;
                            if (['ชิ้น', 'กระปุก', 'ขวด', 'กล่อง', 'หลอด', 'ดวง', 'ม้วน'].includes(job.unit) && !['ชิ้น', 'กระปุก', 'ขวด', 'กล่อง', 'หลอด', 'ดวง', 'ม้วน'].includes(formula.unit)) {
                                effectiveTotalBase = job.totalQty * (formula.unitSize || 1);
                            }
                            
                            const scaleFactor = isOEM ? (effectiveTotalBase / formula.batchSize) : job.batchQty;
                            const scaleLabel = isOEM 
                                ? `สเกลตามจำนวนสั่ง ${job.totalQty.toLocaleString()} ${job.unit} (${(scaleFactor * 100).toFixed(1)}% ของสูตรหลัก)`
                                : `คำนวณจากสูตร × ${job.batchQty} batch`;
                            
                            const rawMaterials = formula.ingredients.filter(i => i.type !== 'packaging');
                            const packagingItems = formula.ingredients.filter(i => i.type === 'packaging');

                            let targetUnits = job.batchQty;
                            if (job.totalQty && formula.unitSize) {
                                if (['ชิ้น', 'กระปุก', 'ขวด', 'กล่อง', 'หลอด', 'ดวง', 'ม้วน'].includes(job.unit)) {
                                    targetUnits = job.totalQty;
                                } else {
                                    targetUnits = Math.ceil(job.totalQty / formula.unitSize);
                                }
                            }

                            return (
                                <>
                                    <div className="rnd-modal-section">
                                        <h4><Beaker size={16} /> วัตถุดิบที่ต้องใช้ ({scaleLabel})</h4>
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
                                                        const maxPkgQty = Math.max(...packagingItems.map(p => parseFloat(p.qty) || 1));
                                                        let inferredBatchYield = 1;
                                                        if (maxPkgQty > 50) {
                                                            inferredBatchYield = maxPkgQty;
                                                        } else if (formula.unitSize && formula.batchSize) {
                                                            inferredBatchYield = formula.batchSize / formula.unitSize;
                                                        }

                                                        return packagingItems.map((ing, idx) => {
                                                            const pmMatch = pmMaterials?.find(m => String(m.id) === String(ing.materialId));
                                                            const rawMatch = MOCK_RAW_MATERIALS?.find(m => String(m.id) === String(ing.materialId));
                                                            const foundName = ing.name || (pmMatch ? pmMatch.name : (rawMatch ? rawMatch.name : null));
                                                            
                                                            const cleanName = foundName
                                                                ? foundName.replace(/<\/p>\s*<p>/gi, ', ').replace(/<[^>]+>/g, '').trim()
                                                                : '-';
                                                            
                                                            const baseQty = parseFloat(ing.qty) || 1;
                                                            const pkgRatio = baseQty / inferredBatchYield;
                                                            const scaledQty = Math.ceil(targetUnits * pkgRatio);

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
                                        onChange={(e) => setCreateForm({...createForm, productName: e.target.value})}
                                    >
                                        <option value="">-- เลือกผลิตภัณฑ์ที่ต้องการผลิต --</option>
                                        {PRODUCT_LIST.map(p => (
                                            <option key={p} value={p}>{p}</option>
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
                                            <option key={f.id} value={f.id}>{f.id} — {f.name} ({f.batchSize} {f.unit}/batch)</option>
                                        ))}
                                    </CustomSelect>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, alignItems: 'end' }}>
                                <div>
                                    <label style={labelStyle}>ยอดผลิตที่ต้องการรวม <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="number" min="1" style={inputStyle}
                                        value={createForm.totalQty}
                                        onChange={(e) => handleTotalQtyChange(e.target.value)}
                                        placeholder="ใส่จำนวนรวมที่ต้องการ"
                                    />
                                </div>

                                <div>
                                    <label style={labelStyle}>ขนาดต่อ Batch</label>
                                    <div style={{ ...inputStyle, background: '#f8fafc', display: 'flex', alignItems: 'center', fontWeight: 600, color: '#475569' }}>
                                        {createForm.batchSize > 0 ? `${createForm.batchSize.toLocaleString()} ${createForm.unit}` : '—'}
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>จำนวน Batch</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <input type="number" min="1"
                                            style={{ ...inputStyle, width: 75, textAlign: 'center', fontWeight: 700, color: '#4338ca', borderColor: '#818cf8', flexShrink: 0 }}
                                            value={createForm.batchQty}
                                            onChange={(e) => setCreateForm(prev => ({ ...prev, batchQty: parseInt(e.target.value) || 1 }))}
                                        />
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>Batch</span>
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
            {previewJob && <ProductionOrderPreview job={previewJob} onClose={() => setPreviewJob(null)} />}
        </div>
    );
}

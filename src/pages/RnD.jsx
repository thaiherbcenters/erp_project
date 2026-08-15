/**
 * =============================================================================
 * RnD.jsx — หน้า Research & Development (Full CRUD + Workflow)
 * =============================================================================
 * ประกอบด้วย 3 sub-pages:
 *   1. R&D Dashboard     — สรุปภาพรวมสูตร โครงการวิจัย การทดลองล่าสุด
 *   2. สูตรการผลิต (BOM) — ตารางสูตร + Modal ดูรายละเอียด + สร้าง/แก้ไข/อนุมัติ
 *   3. โครงการวิจัย       — ตารางโครงการ R&D + สร้าง + บันทึกผลทดลอง
 * =============================================================================
 */

import React, { useState, Fragment } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FlaskConical, Lightbulb, Clock, CheckCircle2,
    TrendingUp, Plus, Search, Eye, XCircle,
    Beaker, ListChecks, Package, FileText, AlertTriangle,
    Edit, Trash2, ArrowRight, DollarSign, Shield, Copy, ChevronDown, ChevronRight, Send, ClipboardCheck
} from 'lucide-react';
import { useRnD } from '../context/RnDContext';
import { useAlert } from '../components/CustomAlert';
import { TipTapCell } from '../components/TipTapCell';
import CustomDatePicker from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import API_BASE from '../config';
import './PageCommon.css';
import './RnD.css';

// --- Unit Conversion Helpers ---
const convertToBase = (qty, unit) => {
    if (!qty || isNaN(qty)) return 0;
    const val = parseFloat(qty);
    const u = (unit || '').toLowerCase().trim();
    if (['กิโลกรัม', 'kg', 'kgs', 'กก.', 'ลิตร', 'l', 'liter', 'liters'].includes(u)) return val * 1000;
    if (['มิลลิกรัม', 'mg', 'มก.'].includes(u)) return val * 0.001;
    return val; // Base is grams/ml
};

const convertFromBase = (valInBase, targetUnit) => {
    if (!valInBase || isNaN(valInBase)) return 0;
    const u = (targetUnit || '').toLowerCase().trim();
    if (['กิโลกรัม', 'kg', 'kgs', 'กก.', 'ลิตร', 'l', 'liter', 'liters'].includes(u)) return valInBase / 1000;
    if (['มิลลิกรัม', 'mg', 'มก.'].includes(u)) return valInBase / 0.001;
    return valInBase;
};

const calculateTotalBatchSize = (ingredients, targetUnit) => {
    if (!ingredients || !ingredients.length) return 0;
    const totalBase = ingredients.filter(i => i.type !== 'packaging').reduce((sum, ing) => sum + convertToBase(ing.qty, ing.unit), 0);
    return convertFromBase(totalBase, targetUnit);
};

const formatDynamicBatchSize = (ingredients) => {
    if (!ingredients || !ingredients.length) return "0 กรัม";
    const totalBase = ingredients.filter(i => i.type !== 'packaging').reduce((sum, ing) => sum + convertToBase(ing.qty, ing.unit), 0);
    
    if (totalBase >= 1000) {
        return (totalBase / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' กิโลกรัม';
    }
    return totalBase.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' กรัม';
};

export default function RnD() {
    const { showAlert, showConfirm } = useAlert();
    const { user, getVisibleSubPages, hasSectionPermission, canCreate, canUpdate, canDelete } = useAuth();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('rnd');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProjectForView, setSelectedProjectForView] = useState(null);
    const [selectedFormula, setSelectedFormula] = useState(null);
    const [selectedExperimentForPharm, setSelectedExperimentForPharm] = useState(null);
    const [formulaFilter, setFormulaFilter] = useState('ทั้งหมด');

    // Modals
    const [showCreateFormula, setShowCreateFormula] = useState(false);
    const [showEditFormula, setShowEditFormula] = useState(false);
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [showCreateExperiment, setShowCreateExperiment] = useState(false);
    const [isPromoting, setIsPromoting] = useState(false);

    // Forms
    const emptyFormulaForm = {
        name: '', formulaType: 'สูตรทั่วไป', category: 'ยาดม', version: 'v1.0', batchSize: 0, unit: '', unitSize: 0, shelfLife: '',
        description: '', instructions: [''], ingredients: [{ materialId: '', name: '', qty: 0, unit: '', type: 'active', engName: '', latinName: '', partUsed: '' }],
    };
    const [formulaForm, setFormulaForm] = useState(emptyFormulaForm);
    const [projectForm, setProjectForm] = useState({ name: '', category: '', researcher: '', startDate: '', targetDate: '', formulaRef: '' });
    const [experimentForm, setExperimentForm] = useState({ projectCode: '', name: '', date: '', result: 'รอผล', note: '', formulaRef: '' });
    const [saving, setSaving] = useState(false);

    // Simulator State
    const [simTargetUnits, setSimTargetUnits] = useState(1000);
    const [simUnitSize, setSimUnitSize] = useState(5);

    const {
        formulas, materials, pmMaterials = [], projects, experiments, loading,
        createFormula, updateFormula, updateFormulaStatus, deleteFormula,
        createProject, deleteProject, createExperiment, updateExperiment, deleteExperiment, pharmApprove,
    } = useRnD();

    // ── Stats ──
    const totalFormulas = formulas.length;
    const approvedFormulas = formulas.filter(f => f.status === 'อนุมัติ').length;
    const draftFormulas = formulas.filter(f => f.status === 'ร่าง' || f.status === 'ทดสอบ').length;
    const activeProjects = projects.filter(p => p.status === 'กำลังดำเนินการ').length;

    const getCategoryStyle = (category) => {
        if (!category) return { background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' };
        const cat = category.toLowerCase();
        if (cat.includes('ยาดม')) return { background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' };
        if (cat.includes('ยาหม่อง')) return { background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' };
        if (cat.includes('ยาน้ำ') || cat.includes('น้ำมัน')) return { background: '#fce7f3', color: '#be185d', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' };
        if (cat.includes('ลูกประคบ')) return { background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' };
        return { background: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' };
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'อนุมัติ': return 'badge-success';
            case 'ร่าง': return 'badge-neutral';
            case 'รอทดสอบ': return 'badge-warning';
            case 'ทดสอบผ่าน': return 'badge-info';
            case 'ทดสอบไม่ผ่าน': return 'badge-danger';
            case 'รอเภสัชกร': return 'badge-warning';
            case 'เภสัชกรไม่อนุมัติ': return 'badge-danger';
            case 'เสร็จสิ้น': return 'badge-success';
            case 'กำลังดำเนินการ': return 'badge-warning';
            default: return 'badge-neutral';
        }
    };

    const getResultColor = (result) => {
        switch (result) {
            case 'ผ่าน': return 'badge-success';
            case 'ไม่ผ่าน': return 'badge-danger';
            case 'รอผล': return 'badge-warning';
            default: return 'badge-neutral';
        }
    };

    // ── Cost calculation (#6) ──
    const calcBatchCost = (formula) => {
        if (!formula?.ingredients) return 0;
        return formula.ingredients.reduce((sum, ing) => {
            const mat = materials.find(m => m.id === ing.materialId);
            return sum + (mat ? mat.costPerUnit * ing.qty : 0);
        }, 0);
    };

    // ── Formula Form Helpers ──
    const addIngredient = () => setFormulaForm(p => ({ ...p, ingredients: [...p.ingredients, { materialId: '', name: '', qty: 0, unit: '', type: 'active', engName: '', latinName: '', partUsed: '' }] }));
    const removeIngredient = (idx) => {
        setFormulaForm(p => {
            const newIngs = p.ingredients.filter((_, i) => i !== idx);
            const newBatchSize = calculateTotalBatchSize(newIngs, p.unit);
            return { ...p, ingredients: newIngs, batchSize: newBatchSize };
        });
    };
    const updateIngredient = (idx, field, value) => {
        setFormulaForm(p => {
            const ings = [...p.ingredients];
            ings[idx] = { ...ings[idx], [field]: value };
            if (field === 'materialId') {
                const mat = materials.find(m => m.id === value) || pmMaterials.find(m => m.id === value);
                if (mat) { ings[idx].name = mat.name; ings[idx].unit = mat.unit; }
            }
            const newBatchSize = calculateTotalBatchSize(ings, p.unit);
            return { ...p, ingredients: ings, batchSize: newBatchSize };
        });
    };
    const addInstruction = () => setFormulaForm(p => ({ ...p, instructions: [...p.instructions, ''] }));
    const removeInstruction = (idx) => setFormulaForm(p => ({ ...p, instructions: p.instructions.filter((_, i) => i !== idx) }));
    const updateInstruction = (idx, value) => {
        setFormulaForm(p => {
            const ins = [...p.instructions];
            ins[idx] = value;
            return { ...p, instructions: ins };
        });
    };

    // ── Handlers ──
    const handleCreateFormula = async () => {
        if (!formulaForm.name) return showAlert('เกิดข้อผิดพลาด', 'กรุณาระบุชื่อสูตร', 'error');
        const hasEmptyName = formulaForm.ingredients.some(ing => (!ing.name || ing.name.trim() === '<p></p>' || ing.name.trim() === '') && !ing.materialId);
        if (hasEmptyName) return showAlert('เกิดข้อผิดพลาด', 'กรุณาระบุชื่อ หรือเลือกรายการอ้างอิงให้ครบถ้วน หรือลบรายการที่ไม่ได้ใช้ออก', 'error');
        
        setSaving(true);
        const payload = { 
            ...formulaForm, 
            status: isPromoting ? 'อนุมัติ' : 'ร่าง',
            createdBy: (isPromoting && formulaForm._researcher) ? formulaForm._researcher : (user?.displayName || user?.name || user?.username || 'R&D Staff') 
        };
        const res = await createFormula(payload);
        setSaving(false);
        if (res.success) { showAlert('สำเร็จ', 'สร้างสูตรสำเร็จ!', 'success'); setShowCreateFormula(false); setFormulaForm(emptyFormulaForm); }
        else showAlert('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการสร้างสูตร', 'error');
    };

    const handleEditFormula = async () => {
        if (!formulaForm.name) return showAlert('เกิดข้อผิดพลาด', 'กรุณาระบุชื่อสูตร', 'error');
        const hasEmptyName = formulaForm.ingredients.some(ing => (!ing.name || ing.name.trim() === '<p></p>' || ing.name.trim() === '') && !ing.materialId);
        if (hasEmptyName) return showAlert('เกิดข้อผิดพลาด', 'กรุณาระบุชื่อ หรือเลือกรายการอ้างอิงให้ครบถ้วน หรือลบรายการที่ไม่ได้ใช้ออก', 'error');
        
        setSaving(true);
        const res = await updateFormula(formulaForm.id, formulaForm);
        setSaving(false);
        if (res.success) { showAlert('สำเร็จ', 'บันทึกสำเร็จ!', 'success'); setShowEditFormula(false); }
        else showAlert('เกิดข้อผิดพลาด', res.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    };

    const handleStatusChange = async (formula, newStatus) => {
        const res = await updateFormulaStatus(formula.id, newStatus, 'Admin');
        if (res.success) showAlert('สำเร็จ', `เปลี่ยนสถานะเป็น "${newStatus}" สำเร็จ!`, 'success');
    };

    const handleDeleteFormula = async (id, name) => {
        const ok = await showConfirm('ยืนยันการลบ', `คุณแน่ใจหรือไม่ว่าต้องการลบสูตร ${id} (${name})? ข้อมูลนี้จะไม่สามารถกู้คืนได้`, 'warning');
        if (!ok) return;
        setSaving(true);
        const res = await deleteFormula(id);
        setSaving(false);
        if (res.success) {
            showAlert('สำเร็จ', 'ลบสูตรสำเร็จ!', 'success');
            if (selectedFormula?.id === id) setSelectedFormula(null);
        } else {
            showAlert('ไม่สามารถลบได้', res.message || 'เกิดข้อผิดพลาดในการลบสูตร', 'error');
        }
    };

    const openEditFormula = (f) => {
        setFormulaForm({
            id: f.id,
            name: f.name, category: f.category, formulaType: f.formulaType, version: f.version, batchSize: f.batchSize,
            unit: f.unit, unitSize: f.unitSize, shelfLife: f.shelfLife, description: f.description,
            instructions: f.instructions?.length ? f.instructions : [''],
            ingredients: f.ingredients?.length ? f.ingredients : [{ materialId: '', name: '', qty: 0, unit: '', type: 'active', engName: '', latinName: '', partUsed: '' }],
        });
        setSelectedFormula(null); // Close preview modal if it was open
        setShowEditFormula(true);
    };

    const handleCopyFormula = (f) => {
        setFormulaForm({
            id: '', // Empty ID means it will create a new formula
            name: `${f.name} (คัดลอก)`,
            category: f.category, formulaType: f.formulaType, version: 'v1.0', batchSize: f.batchSize,
            unit: f.unit, unitSize: f.unitSize, shelfLife: f.shelfLife, description: f.description,
            instructions: f.instructions?.length ? f.instructions : [''],
            ingredients: f.ingredients?.length ? f.ingredients : [{ materialId: '', name: '', qty: 0, unit: '', type: 'active', engName: '', latinName: '', partUsed: '' }],
        });
        setSelectedFormula(null); // Close preview modal if it was open
        setShowCreateFormula(true); // Open in CREATE mode
    };

    const handleCreateProject = async () => {
        if (!projectForm.name) return showAlert('เกิดข้อผิดพลาด', 'กรุณาระบุชื่อโครงการ', 'error');
        setSaving(true);
        const res = await createProject(projectForm);
        setSaving(false);
        if (res.success) { showAlert('สำเร็จ', 'สร้างโครงการสำเร็จ!', 'success'); setShowCreateProject(false); setProjectForm({ name: '', category: '', researcher: '', startDate: '', targetDate: '', formulaRef: '' }); }
        else showAlert('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการสร้างโครงการ', 'error');
    };

    const handleDeleteProject = async (code) => {
        const ok = await showConfirm('ยืนยันการลบ', `ยืนยันการลบโครงการ ${code} หรือไม่?`, 'warning');
        if (!ok) return;
        const res = await deleteProject(code);
        if (res.success) showAlert('สำเร็จ', 'ลบโครงการสำเร็จ!', 'success');
        else showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถลบโครงการได้', 'error');
    };

    const handleEditExperiment = (exp, isViewOnly = false) => {
        let parsedIngredients = [];
        try {
            const arr = JSON.parse(exp.trialRecipe);
            if (Array.isArray(arr)) parsedIngredients = arr;
        } catch(e) {}

        setExperimentForm({
            code: exp.code,
            projectCode: exp.projectCode,
            name: exp.name,
            date: exp.date || '',
            result: exp.result || 'รอผล',
            note: exp.note || '',
            formulaRef: exp.formulaRef || '',
            ingredients: parsedIngredients,
            isViewOnly: isViewOnly
        });

        setShowCreateExperiment(true);
    };

    const handleUpdateExperimentStatus = async (exp, newResult) => {
        const ok = await showConfirm('ยืนยันการเปลี่ยนสถานะ', `ต้องการเปลี่ยนสถานะผลการทดลองเป็น "${newResult}" หรือไม่?`, 'warning');
        if (!ok) return;
        setSaving(true);
        const res = await updateExperiment(exp.code, { ...exp, result: newResult });
        setSaving(false);
        if (res.success) showAlert('สำเร็จ', 'อัพเดทสถานะสำเร็จ!', 'success');
        else showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถอัพเดทสถานะได้', 'error');
    };

    const handlePromoteToFormula = (exp) => {
        setIsPromoting(true);
        let ingredients = [];
        try { ingredients = JSON.parse(exp.trialRecipe); } catch(e) {}
        const validIngredients = Array.isArray(ingredients) ? ingredients : [{ materialId: '', name: '', qty: 0, unit: '', type: 'active', engName: '', latinName: '', partUsed: '' }];
        const initialBatchSize = calculateTotalBatchSize(validIngredients, formulaForm.unit);

        setFormulaForm({
            ...emptyFormulaForm,
            name: `${exp.name} (จากผลทดลอง)`,
            description: `อ้างอิงจากผลทดลอง: ${exp.code || exp.id}`,
            ingredients: validIngredients,
            batchSize: initialBatchSize
        });
        setShowCreateFormula(true);
    };

    const handleSaveExperiment = async () => {
        if (!experimentForm.projectCode || !experimentForm.name) return showAlert('เกิดข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบ', 'error');
        
        // Ensure ingredients are serialized as trialRecipe for the backend
        const dataToSave = { ...experimentForm, trialRecipe: JSON.stringify(experimentForm.ingredients || []) };
        
        setSaving(true);
        const res = experimentForm.code ? await updateExperiment(experimentForm.code, dataToSave) : await createExperiment(dataToSave);
        setSaving(false);
        if (res.success) { showAlert('สำเร็จ', 'บันทึกผลทดลองสำเร็จ!', 'success'); setShowCreateExperiment(false); setExperimentForm({ code: '', projectCode: '', name: '', date: '', result: 'รอผล', note: '', formulaRef: '', ingredients: [] }); }
        else showAlert('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกผล', 'error');
    };

    const handleExpFormulaRefChange = (e) => {
        const ref = e.target.value;
        const formula = formulas.find(f => f.code === ref || f.id === ref);
        let ings = [];
        if (formula && formula.ingredients) {
            ings = JSON.parse(JSON.stringify(formula.ingredients));
        }
        setExperimentForm({ ...experimentForm, formulaRef: ref, ingredients: ings });
    };

    const updateExpIngredient = (idx, field, value) => {
        const newIngs = [...(experimentForm.ingredients || [])];
        newIngs[idx] = { ...newIngs[idx], [field]: value };
        if (field === 'materialId' && value) {
            const m = materials.find(x => String(x.id) === String(value)) || pmMaterials.find(x => String(x.id) === String(value));
            if (m) {
                newIngs[idx].name = m.name;
                newIngs[idx].unit = m.unit;
            }
        }
        setExperimentForm({ ...experimentForm, ingredients: newIngs });
    };

    const addExpIngredient = () => {
        setExperimentForm({
            ...experimentForm,
            ingredients: [...(experimentForm.ingredients || []), { materialId: '', name: '', qty: 0, unit: '', type: 'active' }]
        });
    };

    const removeExpIngredient = (idx) => {
        const newIngs = [...(experimentForm.ingredients || [])];
        newIngs.splice(idx, 1);
        setExperimentForm({ ...experimentForm, ingredients: newIngs });
    };

    // ══════════════════════════════════════════════════════════════════
    // 1. R&D Dashboard
    // ══════════════════════════════════════════════════════════════════
    const renderDashboard = () => (
        <div className="rnd-dashboard">

            {hasSectionPermission('rnd_dashboard_stats') && (
                <div className="summary-row">
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#f0ebff', color: '#7b7bf5' }}><FlaskConical size={20} /></div>
                        <div><span className="summary-label">สูตรทั้งหมด</span><span className="summary-value">{totalFormulas}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#ecfdf5', color: '#059669' }}><CheckCircle2 size={20} /></div>
                        <div><span className="summary-label">อนุมัติแล้ว</span><span className="summary-value">{approvedFormulas}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#fff8e1', color: '#f9a825' }}><Clock size={20} /></div>
                        <div><span className="summary-label">ร่าง/ทดสอบ</span><span className="summary-value">{draftFormulas}</span></div>
                    </div>
                    <div className="card summary-card">
                        <div className="summary-icon" style={{ background: '#e3f2fd', color: '#1e88e5' }}><TrendingUp size={20} /></div>
                        <div><span className="summary-label">โครงการดำเนินอยู่</span><span className="summary-value">{activeProjects}</span></div>
                    </div>
                </div>
            )}

            {hasSectionPermission('rnd_dashboard_recent') && (
                <>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <h3 className="card-title"><CheckCircle2 size={16} style={{ color: '#059669' }} /> สูตรที่อนุมัติล่าสุด</h3>
                        <div className="rnd-approved-grid">
                            {formulas.filter(f => f.status === 'อนุมัติ').slice(0, 3).map(f => (
                                <div key={f.id} className="rnd-approved-card" onClick={() => { setSelectedFormula(f); if(f.unitSize) setSimUnitSize(f.unitSize); }}>
                                    <div className="rnd-approved-header">
                                        <span className="rnd-approved-code">{f.id}</span>
                                        <span className={`badge ${getStatusColor(f.status)}`}>{f.status}</span>
                                    </div>
                                    <div className="rnd-approved-name">{f.name}</div>
                                    <div className="rnd-approved-meta">
                                        <span><Package size={12} /> {f.batchSize} {f.unit}/batch</span>
                                        <span><Beaker size={12} /> {f.ingredients.length} วัตถุดิบ</span>
                                    </div>
                                    <div className="rnd-approved-footer">
                                        💰 ต้นทุน: ฿{calcBatchCost(f).toLocaleString()}/batch
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="card-title"><Beaker size={16} style={{ color: '#7b7bf5' }} /> การทดลองล่าสุด</h3>
                        <div className="table-card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รหัส</th><th>โครงการ</th><th>ชื่อการทดลอง</th><th>วันที่</th><th>ผลลัพธ์</th><th>หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {experiments.slice(0, 5).map(exp => (
                                        <tr key={exp.id}>
                                            <td className="text-bold">{exp.code}</td>
                                            <td>{exp.projectCode}</td>
                                            <td>{exp.name}</td>
                                            <td>{exp.date}</td>
                                            <td><span className={`badge ${getResultColor(exp.result)}`}>{exp.result}</span></td>
                                            <td>{exp.note}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    // ══════════════════════════════════════════════════════════════════
    // 2. สูตรการผลิต (BOM / Formulas)
    // ══════════════════════════════════════════════════════════════════
    const renderFormulas = () => {
        const statuses = ['ทั้งหมด', ...new Set(formulas.map(f => f.status))];
        const filtered = formulas.filter(f => {
            const matchSearch = f.name.includes(searchTerm) || f.id.includes(searchTerm) || f.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchFilter = formulaFilter === 'ทั้งหมด' || f.status === formulaFilter;
            return matchSearch && matchFilter;
        });

        return (
            <div className="rnd-formulas">

                <div className="toolbar">
                    <div className="toolbar-left">
                        {hasSectionPermission('rnd_formulas_search') && (
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input type="text" placeholder="ค้นหาสูตร..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                                <button className="search-btn">ค้นหา</button>
                            </div>
                        )}
                        <div className="rnd-filter-group">
                            {statuses.map(s => (
                                <button key={s} className={`rnd-filter-btn ${formulaFilter === s ? 'active' : ''}`} onClick={() => setFormulaFilter(s)}>
                                    {s} {s !== 'ทั้งหมด' && <span className="rnd-filter-count">{formulas.filter(f => f.status === s).length}</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                    {canCreate('rnd_formulas') && (
                        <button className="btn-primary" onClick={() => { setFormulaForm(emptyFormulaForm); setShowCreateFormula(true); }}><Plus size={16} /> สร้างสูตรใหม่</button>
                    )}
                </div>

                {hasSectionPermission('rnd_formulas_table') && (
                    <div className="card table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>รหัสสูตร</th><th>ชื่อผลิตภัณฑ์</th><th>ที่มาของสูตร</th><th>หมวดหมู่</th><th>เวอร์ชัน</th>
                                    <th>Batch Size</th><th>วัตถุดิบ</th><th>ต้นทุน/Batch</th><th>สถานะ</th><th>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(formula => (
                                    <tr key={formula.id}>
                                        <td className="text-bold">{formula.id}</td>
                                        <td>
                                            {formula.name.replace(' (จากผลทดลอง)', '')}
                                            <div style={{ marginTop: 4 }}>
                                                <span className={`badge ${formula.formulaType === 'สูตร อย.' ? 'badge-primary' : 'badge-neutral'}`} style={{ fontSize: 10 }}>
                                                    {formula.formulaType || 'สูตรทั่วไป'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            {(formula.description?.includes('อ้างอิงจากผลทดลอง') || formula.name.includes('(จากผลทดลอง)')) ? (
                                                <span className="badge" style={{ background: '#fef3c7', color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <FlaskConical size={12} /> ผลทดลอง
                                                </span>
                                            ) : (
                                                <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <Edit size={12} /> สร้างโดยตรง
                                                </span>
                                            )}
                                        </td>
                                        <td><span style={getCategoryStyle(formula.category)}>{formula.category || '-'}</span></td>
                                        <td><span className="badge badge-neutral">{formula.version}</span></td>
                                        <td>{formula.batchSize?.toLocaleString()} {formula.unit}</td>
                                        <td>{formula.ingredients?.length} รายการ</td>
                                        <td style={{ fontWeight: 600, color: '#059669' }}>฿{calcBatchCost(formula).toLocaleString()}</td>
                                        <td><span className={`badge ${getStatusColor(formula.status)}`}>{formula.status}</span></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="btn-sm" onClick={() => { setSelectedFormula(formula); if(formula.unitSize) setSimUnitSize(formula.unitSize); }} title="ดูรายละเอียด"><Eye size={14} /></button>
                                            {canCreate('rnd_formulas') && (
                                                <button className="btn-sm" onClick={() => handleCopyFormula(formula)} title="คัดลอกสูตร"><Copy size={14} /></button>
                                            )}
                                            {canUpdate('rnd_formulas') && (
                                                <button className="btn-sm" onClick={() => openEditFormula(formula)} title="แก้ไข"><Edit size={14} /></button>
                                            )}
                                            {canDelete('rnd_formulas') && (
                                                <button className="btn-sm" onClick={() => handleDeleteFormula(formula.id, formula.name)} title="ลบ" style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                                            )}
                                            {formula.status === 'ร่าง' && (!formula.description || !formula.description.includes('พัฒนามาจากการทดลอง')) && (
                                                <button className="btn-sm" style={{ color: '#f59e0b' }} onClick={() => handleStatusChange(formula, 'รอทดสอบ')} title="ส่งให้ QC ทดสอบ"><ArrowRight size={14} /></button>
                                            )}
                                            {formula.status === 'ทดสอบผ่าน' && (
                                                <button className="btn-sm" style={{ color: '#7c3aed' }} onClick={() => handleStatusChange(formula, 'รอเภสัชกร')} title="ส่งให้เภสัชกร"><ArrowRight size={14} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่พบสูตรที่ค้นหา</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // 3. โครงการวิจัย (Research Projects)
    // ══════════════════════════════════════════════════════════════════
    const handlePrintSafetyCert = async (exp) => {
        try {
            const token = localStorage.getItem('erp_token');
            window.open(`${API_BASE}/rnd/experiments/${exp.id}/print?token=${token}`, '_blank');
        } catch (error) {
            console.error('Error printing certificate:', error);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับระบบได้', 'error');
        }
    };

    const renderProjectDetailsModal = () => {
        if (!selectedProjectForView) return null;
        
        const project = selectedProjectForView;
        const projectExps = experiments.filter(e => e.projectCode === project.code).sort((a, b) => b.id - a.id);

        return (
            <div className="rnd-modal-overlay" onClick={() => setSelectedProjectForView(null)}>
                <div className="rnd-modal" style={{ width: 1000, maxWidth: '95%' }} onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <h3><Beaker size={18} style={{ color: '#4f46e5', marginRight: 8 }}/> ผลการทดลอง: โครงการ {project.code} ({project.name})</h3>
                        <button className="doc-action-btn" onClick={() => setSelectedProjectForView(null)}><XCircle size={20} /></button>
                    </div>
                    <div className="rnd-modal-body" style={{ background: '#f8fafc', padding: 20 }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h4 style={{ margin: 0, color: '#1e293b' }}>รายการทดลองทั้งหมด ({projectExps.length})</h4>
                            <button className="btn-primary btn-sm" onClick={() => { setSelectedProjectForView(null); setShowCreateExperiment(true); }}>
                                <Beaker size={14} style={{ marginRight: 4 }}/> บันทึกผลทดลองใหม่
                            </button>
                        </div>
                        
                        {projectExps.length > 0 ? (
                            <table className="data-table" style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: 8 }}>
                                <thead style={{ background: '#f1f5f9' }}>
                                    <tr>
                                        <th style={{ padding: '12px' }}>รหัส</th>
                                        <th style={{ padding: '12px' }}>ชื่อการทดลอง</th>
                                        <th style={{ padding: '12px' }}>อ้างอิงสูตร</th>
                                        <th style={{ padding: '12px' }}>สูตร/สัดส่วนที่ทดลอง</th>
                                        <th style={{ padding: '12px' }}>วันที่</th>
                                        <th style={{ padding: '12px' }}>ผลลัพธ์</th>
                                        <th style={{ padding: '12px' }}>หมายเหตุ</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectExps.map(exp => (
                                        <tr key={exp.id}>
                                            <td className="text-bold" style={{ padding: '12px' }}>{exp.code}</td>
                                            <td style={{ padding: '12px' }}>{exp.name}</td>
                                            <td style={{ padding: '12px' }}>{exp.formulaRef ? <span className="badge badge-info">{exp.formulaRef}</span> : '-'}</td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ maxWidth: 250, fontSize: 12 }}>
                                                    {(() => {
                                                        try {
                                                            const arr = JSON.parse(exp.trialRecipe);
                                                            if (Array.isArray(arr)) {
                                                                return <ul style={{ margin: 0, paddingLeft: 16 }}>{arr.map((item, i) => <li key={i}>{item.name ? item.name.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''}: {item.qty} {item.unit}</li>)}</ul>;
                                                            }
                                                        } catch(e) {}
                                                        return typeof exp.trialRecipe === 'string' ? exp.trialRecipe.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '-';
                                                    })()}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>{exp.date}</td>
                                            <td style={{ padding: '12px' }}><span className={`badge ${getResultColor(exp.result)}`}>{exp.result}</span></td>
                                            <td style={{ padding: '12px' }}>{exp.note}</td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, flexWrap: 'wrap' }}>
                                                    {exp.result === 'รอผล' && (
                                                        <button className="doc-action-btn" style={{ color: '#6b7280' }} title="แก้ไข" onClick={() => { handleEditExperiment(exp); }}>
                                                            <Edit size={16} />
                                                        </button>
                                                    )}
                                                    
                                                    {exp.result === 'รอประเมิน' && (
                                                        <button className="doc-action-btn" style={{ color: '#3b82f6' }} title="ดูรายละเอียด" onClick={() => { setSelectedExperimentForPharm(exp); }}>
                                                            <Eye size={16} />
                                                        </button>
                                                    )}
                                                    
                                                    {exp.result === 'รอผล' && (
                                                        <button className="doc-action-btn" style={{ color: '#3b82f6' }} title="ส่งให้เภสัชกร" onClick={() => { setSelectedProjectForView(null); handleUpdateExperimentStatus(exp, 'รอประเมิน'); }} disabled={saving}>
                                                            <Send size={16} />
                                                        </button>
                                                    )}

                                                    {(exp.result === 'ผ่าน' || exp.result === 'ไม่ผ่าน') && (
                                                        <button className="doc-action-btn" style={{ color: exp.result === 'ผ่าน' ? '#10b981' : '#ef4444' }} title="พรีวิวใบประเมิน (PDF)" onClick={() => handlePrintSafetyCert(exp)}>
                                                            <FileText size={16} />
                                                        </button>
                                                    )}
                                                    
                                                    {exp.result === 'ผ่าน' && (
                                                        <>
                                                            {canUpdate('rnd_projects') && !formulas.some(f => (f.description && f.description.includes(exp.code || exp.id)) || f.name === exp.name + ' (จากผลทดลอง)') && (
                                                                <button className="doc-action-btn" style={{ color: '#8b5cf6' }} title="ขึ้นสูตรหลัก" onClick={() => { setSelectedProjectForView(null); handlePromoteToFormula(exp); }}>
                                                                    <ArrowRight size={16} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                                <FlaskConical size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                                <div>ยังไม่มีผลการทดลองในโครงการนี้</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderProjects = () => {
        const filtered = projects.filter(p =>
            p.name.includes(searchTerm) || p.code.includes(searchTerm) || p.category.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="rnd-projects">

                <div className="toolbar">
                    <div className="toolbar-left">
                        {hasSectionPermission('rnd_projects_search') && (
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input type="text" placeholder="ค้นหาโครงการ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                                <button className="search-btn">ค้นหา</button>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {canCreate('rnd_projects') && (
                            <button className="btn-primary" onClick={() => setShowCreateProject(true)}><Plus size={16} /> สร้างโครงการใหม่</button>
                        )}
                    </div>
                </div>

                {hasSectionPermission('rnd_projects_table') && (
                    <div className="card table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>รหัส</th><th>ชื่อโครงการ</th><th>หมวดหมู่</th><th>นักวิจัย</th>
                                    <th>เริ่มต้น</th><th>เป้าหมาย</th><th>เฟส</th><th>Progress</th>
                                    <th>สูตรอ้างอิง</th><th>สถานะ</th><th style={{ textAlign: 'right' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(project => (
                                    <tr key={project.id}>
                                        <td className="text-bold">{project.code}</td>
                                        <td>{project.name}</td>
                                        <td><span style={getCategoryStyle(project.category)}>{project.category}</span></td>
                                        <td>{project.researcher}</td>
                                        <td>{project.startDate}</td>
                                        <td>{project.targetDate}</td>
                                        <td><span className="badge badge-neutral">{project.phase}</span></td>
                                        <td>
                                            <div className="progress-container">
                                                <div className="progress-bar" style={{ width: `${project.progress}%`, backgroundColor: project.progress === 100 ? 'var(--success, #43a047)' : 'var(--primary, #7b7bf5)' }}></div>
                                                <span className="progress-text">{project.progress}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            {project.formulaRef ? (
                                                <button className="rnd-formula-link" onClick={() => {
                                                    const fm = formulas.find(f => f.id === project.formulaRef);
                                                    if (fm) setSelectedFormula(fm);
                                                }}>
                                                    {project.formulaRef}
                                                </button>
                                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                        <td><span className={`badge ${getStatusColor(project.status)}`}>{project.status}</span></td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                                <button className="doc-action-btn" style={{ color: '#4f46e5' }} title="ดูผลการทดลอง" onClick={() => setSelectedProjectForView(project)}>
                                                    <Eye size={16} />
                                                </button>
                                                <button className="doc-action-btn" style={{ color: '#10b981' }} title="บันทึกผลทดลอง" onClick={() => setShowCreateExperiment(true)}>
                                                    <Beaker size={16} />
                                                </button>
                                                {canDelete('rnd_projects') && (
                                                    <button className="doc-action-btn doc-action-btn-danger" style={{ color: '#ef4444' }} title="ลบ" onClick={() => handleDeleteProject(project.code)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Formula Detail Modal (ดูรายละเอียด + ต้นทุน)
    // ══════════════════════════════════════════════════════════════════
    const renderFormulaModal = () => {
        if (!selectedFormula || showEditFormula) return null;
        const f = selectedFormula;
        const batchCost = calcBatchCost(f);

        return (
            <div className="rnd-modal-overlay" onClick={() => setSelectedFormula(null)}>
                <div className="rnd-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>{f.name}</h2>
                            <div className="rnd-modal-meta">
                                <span className="badge badge-info">{f.id}</span>
                                <span className="badge badge-neutral">{f.version}</span>
                                <span className={`badge ${getStatusColor(f.status)}`}>{f.status}</span>
                                <span className="badge badge-neutral">{f.category}</span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => setSelectedFormula(null)}><XCircle size={22} /></button>
                    </div>

                    <div className="rnd-modal-body">
                        <div className="rnd-modal-info-grid">
                            <div className="rnd-modal-info-item">
                                <label>ขนาดต่อ Batch</label>
                                <span>{f.ingredients?.length ? formatDynamicBatchSize(f.ingredients) : `${(f.batchSize || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} กิโลกรัม`}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>ปริมาณบรรจุต่อชิ้น</label>
                                <span>{f.unitSize ? `${f.unitSize} ${f.unit === 'มิลลิลิตร' || f.unit === 'ลิตร' ? 'ml' : 'กรัม'}` : '—'}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>อายุการเก็บ</label>
                                <span>{f.shelfLife}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>สร้างโดย</label>
                                <span>{f.createdBy}</span>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>อนุมัติโดย</label>
                                <span>{f.approvedBy || '—'}</span>
                            </div>
                        </div>

                        {/* ต้นทุนต่อ Batch (#6) */}
                        <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: 16, margin: '16px 0' }}>
                            <strong style={{ color: '#059669', fontSize: 14 }}>💰 ต้นทุนวัตถุดิบต่อ Batch</strong>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#065f46', marginTop: 4 }}>
                                ฿{batchCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                                ต่อหน่วย: ฿{f.batchSize ? (batchCost / (f.ingredients?.length ? calculateTotalBatchSize(f.ingredients, f.unit) : f.batchSize || 1)).toFixed(2) : '—'} / {f.unit}
                            </div>
                        </div>

                        {f.description && (
                            <div className="rnd-modal-description">
                                <h4>คำอธิบาย</h4>
                                <p>{f.description}</p>
                            </div>
                        )}

                        {/* Simulator Calculator */}
                        <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: 16, margin: '16px 0' }}>
                            <strong style={{ color: '#1e3a8a', fontSize: 14 }}>🧮 เครื่องคำนวณสัดส่วนการผลิต (Production Simulator)</strong>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <label style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>จำนวนเป้าหมาย (ชิ้น/กระปุก)</label>
                                    <input type="number" value={simTargetUnits} onChange={e => setSimTargetUnits(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: '8px', border: '1px solid #bfdbfe', borderRadius: '6px' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <label style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>ปริมาณบรรจุต่อชิ้น ({f?.unit === 'มิลลิลิตร' || f?.unit === 'ลิตร' ? 'ml' : 'กรัม'})</label>
                                    <input type="number" value={simUnitSize} onChange={e => setSimUnitSize(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: '8px', border: '1px solid #bfdbfe', borderRadius: '6px' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <label style={{ fontSize: 12, color: '#1e3a8a', fontWeight: 600 }}>รวมผลผลิตที่ต้องการ</label>
                                    <div style={{ padding: '8px', background: '#dbeafe', borderRadius: '6px', fontWeight: 'bold', color: '#1e40af' }}>
                                        {(() => {
                                            const totalBase = simTargetUnits * simUnitSize;
                                            if (f?.unit === 'มิลลิลิตร' || f?.unit === 'ลิตร') {
                                                return `${(totalBase / 1000).toFixed(3)} L (${totalBase.toLocaleString()} ml)`;
                                            } else if (f?.unit === 'กรัม' || f?.unit === 'กิโลกรัม') {
                                                return `${(totalBase / 1000).toFixed(3)} kg (${totalBase.toLocaleString()} g)`;
                                            }
                                            return `${totalBase.toLocaleString()} ${f?.unit || ''}`;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rnd-modal-section">
                            <h4><Beaker size={16} /> วัตถุดิบที่ใช้ ({f.ingredients?.filter(i => i.type !== 'packaging').length || 0} รายการ)</h4>
                            <table className="data-table rnd-ingredients-table">
                                <thead>
                                    <tr><th>#</th><th>รหัส</th><th>ชื่อวัตถุดิบ</th><th>ปริมาณมาตรฐาน</th><th>หน่วย</th><th>ปริมาณที่ต้องใช้ (จำลอง)</th><th>ต้นทุน (จำลอง)</th></tr>
                                </thead>
                                <tbody>
                                    {f.ingredients?.filter(i => i.type !== 'packaging').map((ing, idx) => {
                                        const mat = materials.find(m => m.id === ing.materialId);
                                        const ingName = ing.name || mat?.name || '';
                                        const cost = mat ? mat.costPerUnit * ing.qty : 0;
                                        
                                        // Calc Scale
                                        let baseYieldGrams = f.ingredients?.filter(i => i.type !== 'packaging').reduce((s, i) => s + convertToBase(i.qty, i.unit), 0) || convertToBase(f.batchSize, f.unit) || 1;
                                        const targetYieldGrams = simTargetUnits * simUnitSize;
                                        const scaleFactor = targetYieldGrams / baseYieldGrams;
                                        const scaledQty = ing.qty * scaleFactor;
                                        const scaledCost = cost * scaleFactor;

                                        return (
                                            <tr key={idx}>
                                                <td>{idx + 1}</td>
                                                <td className="text-bold">{ing.materialId}</td>
                                                <td dangerouslySetInnerHTML={{ __html: ingName }} />
                                                <td style={{ color: '#6b7280' }}>{ing.qty} {ing.unit}</td>
                                                <td>{ing.unit}</td>
                                                <td style={{ fontWeight: 700, color: '#1e40af', background: '#eff6ff' }}>{scaledQty.toLocaleString(undefined, { maximumFractionDigits: 4 })} {ing.unit}</td>
                                                <td style={{ fontWeight: 600, color: '#059669' }}>฿{scaledCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {f.ingredients?.some(i => i.type === 'packaging') && (
                            <div className="rnd-modal-section">
                                <h4><Package size={16} style={{ color: '#f59e0b' }} /> บรรจุภัณฑ์ ({f.ingredients?.filter(i => i.type === 'packaging').length} รายการ)</h4>
                                <table className="data-table rnd-ingredients-table">
                                    <thead>
                                        <tr><th>#</th><th>รหัส</th><th>ชื่อบรรจุภัณฑ์</th><th>ปริมาณที่ต้องใช้ (จำลอง)</th></tr>
                                    </thead>
                                    <tbody>
                                        {f.ingredients?.filter(i => i.type === 'packaging').map((ing, idx) => {
                                            const pm = pmMaterials.find(m => m.id === ing.materialId);
                                            const pmName = ing.name || pm?.name || '';
                                            // Per user instruction: Packaging quantity is exactly the target units. No formula calculation needed.
                                            const scaledQty = simTargetUnits;

                                            return (
                                                <tr key={idx}>
                                                    <td>{idx + 1}</td>
                                                    <td className="text-bold">{ing.materialId}</td>
                                                    <td dangerouslySetInnerHTML={{ __html: pmName }} />
                                                    <td style={{ fontWeight: 700, color: '#1e40af', background: '#eff6ff' }}>{scaledQty.toLocaleString()} {ing.unit || 'ชิ้น'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {f.instructions?.length > 0 && (
                            <div className="rnd-modal-section">
                                <h4><ListChecks size={16} /> วิธีการผลิต ({f.instructions.length} ขั้นตอน)</h4>
                                <ol className="rnd-instructions-list">
                                    {f.instructions.map((step, idx) => (<li key={idx}>{step}</li>))}
                                </ol>
                            </div>
                        )}



                        {/* Official Status Tracking Timeline */}
                        <div style={{ marginTop: 24, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Clock size={16} /> ประวัติการอนุมัติ (Approval Tracking)
                            </div>
                            <div style={{ padding: 16 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {(() => {
                                        const isFromExp = f.description?.includes('อ้างอิงจากผลทดลอง') || f.name.includes('(จากผลทดลอง)');
                                        return (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckCircle2 size={14} /></div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>สร้างสูตรตำรับ (Draft Created)</div>
                                                <div style={{ color: '#94a3b8', fontSize: 12 }}>{f.createdDate || '-'}</div>
                                            </div>
                                            <div style={{ color: '#64748b', fontSize: 12 }}>ผู้สร้าง: {f.createdBy || 'ฝ่ายวิจัยและพัฒนา (R&D)'}</div>
                                        </div>
                                    </div>
                                    
                                    {!isFromExp && (
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                            {['ทดสอบผ่าน', 'รอเภสัชกร', 'อนุมัติ', 'เภสัชกรไม่อนุมัติ', 'ทดสอบไม่ผ่าน'].includes(f.status) ? (
                                                <>
                                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: f.status === 'ทดสอบไม่ผ่าน' ? '#fee2e2' : '#d1fae5', color: f.status === 'ทดสอบไม่ผ่าน' ? '#ef4444' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {f.status === 'ทดสอบไม่ผ่าน' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>ตรวจสอบคุณภาพ (QC) - {f.status === 'ทดสอบไม่ผ่าน' ? 'ไม่ผ่าน' : 'ผ่าน'}</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <div style={{ color: '#94a3b8', fontSize: 12 }}>{f.qcApprovedDate || f.createdDate || '-'}</div>
                                                                <button 
                                                                    style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }} 
                                                                    onClick={() => window.open(`${API_BASE}/rnd/formulas/${f.id}/latest-qc-print?token=${localStorage.getItem('erp_token')}`, '_blank')} 
                                                                    title="ดูเอกสารรายงานผลทดสอบ QC"
                                                                >
                                                                    <FileText size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div style={{ color: '#64748b', fontSize: 12 }}>ตรวจสอบโดย: ฝ่ายตรวจสอบคุณภาพ (QC)</div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Clock size={14} /></div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, color: '#64748b', fontSize: 13 }}>ตรวจสอบคุณภาพ (QC)</div>
                                                        <div style={{ color: '#94a3b8', fontSize: 12 }}>รอดำเนินการ</div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                        {['อนุมัติ', 'เภสัชกรไม่อนุมัติ'].includes(f.status) ? (
                                            <>
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: f.status === 'เภสัชกรไม่อนุมัติ' ? '#fee2e2' : '#d1fae5', color: f.status === 'เภสัชกรไม่อนุมัติ' ? '#ef4444' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {f.status === 'เภสัชกรไม่อนุมัติ' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>อนุมัติสูตรตำรับ (Pharmacist) - {f.status === 'เภสัชกรไม่อนุมัติ' ? 'ไม่อนุมัติ' : 'อนุมัติ'}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ color: '#94a3b8', fontSize: 12 }}>{f.pharmApprovedDate || f.approvedDate || '-'}</div>
                                                            <button 
                                                                style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }} 
                                                                onClick={() => window.open(`${API_BASE}/rnd/formulas/${f.id}/pharm-print?token=${localStorage.getItem('erp_token')}`, '_blank')} 
                                                                title="ดูใบอนุมัติสูตรตำรับ"
                                                            >
                                                                <FileText size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div style={{ color: '#64748b', fontSize: 12 }}>อนุมัติโดย: {f.pharmApprovedBy || f.approvedBy || 'เภสัชกร'}</div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Clock size={14} /></div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, color: '#64748b', fontSize: 13 }}>อนุมัติสูตรตำรับ (Pharmacist)</div>
                                                    <div style={{ color: '#94a3b8', fontSize: 12 }}>รอดำเนินการ</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Workflow buttons */}
                        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                            {f.status === 'ร่าง' && <button style={{ padding: '10px 20px', fontSize: '15px', fontWeight: 600, border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#fef3c7', color: '#92400e', transition: 'all 0.2s' }} onClick={() => { handleStatusChange(f, 'รอทดสอบ'); setSelectedFormula(null); }}>🧪 ส่งให้ QC ทดสอบ</button>}
                            {f.status === 'ทดสอบผ่าน' && <button style={{ padding: '10px 20px', fontSize: '15px', fontWeight: 600, border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#ede9fe', color: '#5b21b6', transition: 'all 0.2s' }} onClick={() => { handleStatusChange(f, 'รอเภสัชกร'); setSelectedFormula(null); }}>🏥 ส่งให้เภสัชกร</button>}
                            
                            {f.status === 'รอเภสัชกร' && <button style={{ padding: '12px 24px', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#fee2e2', color: '#991b1b', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }} onClick={async () => { const res = await pharmApprove(f.id, 'เภสัชกร', false); if (res.success) { showAlert('แจ้งเตือน', 'ไม่อนุมัติ', 'warning'); setSelectedFormula(null); } }}><XCircle size={20} /> ไม่อนุมัติ</button>}
                            {f.status === 'รอเภสัชกร' && <button style={{ padding: '12px 32px', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#10b981', color: '#fff', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: 8 }} onClick={async () => { const res = await pharmApprove(f.id, 'เภสัชกร', true); if (res.success) { showAlert('สำเร็จ', 'อนุมัติสำเร็จ!', 'success'); setSelectedFormula(null); } }}><CheckCircle2 size={20} /> อนุมัติสูตร</button>}
                            
                            {(f.status === 'ทดสอบไม่ผ่าน' || f.status === 'เภสัชกรไม่อนุมัติ') && <button style={{ padding: '10px 20px', fontSize: '15px', fontWeight: 600, border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#fef3c7', color: '#92400e', transition: 'all 0.2s' }} onClick={() => { handleStatusChange(f, 'ร่าง'); setSelectedFormula(null); }}>↩️ กลับไปแก้ไข</button>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Formula Create/Edit Modal (#1, #2)
    // ══════════════════════════════════════════════════════════════════
    const renderFormulaFormModal = () => {
        const isEdit = showEditFormula;
        if (!showCreateFormula && !showEditFormula) return null;

        return (
            <div className="rnd-modal-overlay" onClick={() => { setShowCreateFormula(false); setShowEditFormula(false); }}>
                <div className="rnd-modal" style={{ maxWidth: 1200, width: '95%' }} onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>{isEdit ? 'แก้ไขสูตร' : 'ขึ้นสูตร'}</h2>
                            <div className="rnd-modal-meta"><span className="badge badge-primary">{isEdit ? formulaForm.id : 'New Formula'}</span></div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => { setShowCreateFormula(false); setShowEditFormula(false); }}><XCircle size={22} /></button>
                    </div>
                    <div className="rnd-modal-body" style={{ padding: '20px 24px 24px' }}>
                        {/* ข้อมูลทั่วไป */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FlaskConical size={16} style={{ color: '#7b7bf5' }} /> ข้อมูลทั่วไป
                        </h4>
                        <div className="rnd-modal-info-grid" style={{ marginBottom: 20 }}>
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>ชื่อสูตร <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" style={inputStyle} value={formulaForm.name} onChange={e => setFormulaForm({ ...formulaForm, name: e.target.value })} placeholder="เช่น ยาดมสมุนไพร สูตรเย็น" />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>ประเภทสูตร</label>
                                <CustomSelect style={inputStyle} value={formulaForm.formulaType || 'สูตรทั่วไป'} onChange={e => setFormulaForm({ ...formulaForm, formulaType: e.target.value })}>
                                    <option value="สูตรทั่วไป">สูตรทั่วไป</option>
                                    <option value="สูตร อย.">สูตร อย.</option>
                                </CustomSelect>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>หมวดหมู่</label>
                                <CustomSelect style={inputStyle} value={formulaForm.category} onChange={e => setFormulaForm({ ...formulaForm, category: e.target.value })}>
                                    <option value="">-- ไม่ระบุ --</option>
                                    <option>ยาดม</option><option>สเปรย์</option><option>ยาน้ำมัน</option><option>ยาหม่อง</option>
                                </CustomSelect>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>เวอร์ชัน</label>
                                <input type="text" style={inputStyle} value={formulaForm.version} onChange={e => setFormulaForm({ ...formulaForm, version: e.target.value })} />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>Batch Size</label>
                                <input type="number" style={inputStyle} value={formulaForm.batchSize} onChange={e => setFormulaForm({ ...formulaForm, batchSize: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>ปริมาณบรรจุต่อชิ้น</label>
                                <input type="number" style={inputStyle} value={formulaForm.unitSize} onChange={e => setFormulaForm({ ...formulaForm, unitSize: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="เช่น 5, 10" />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>หน่วย</label>
                                <CustomSelect style={inputStyle} value={formulaForm.unit} onChange={e => setFormulaForm({ ...formulaForm, unit: e.target.value })}>
                                    <option value="">-- เลือกหน่วย --</option>
                                    <option>กรัม</option>
                                    <option>กิโลกรัม</option>
                                    <option>มิลลิลิตร</option>
                                    <option>ลิตร</option>
                                    <option>ชิ้น</option>
                                    <option>กระปุก</option>
                                    <option>ขวด</option>
                                </CustomSelect>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>อายุสินค้า</label>
                                <input type="text" style={inputStyle} value={formulaForm.shelfLife} onChange={e => setFormulaForm({ ...formulaForm, shelfLife: e.target.value })} placeholder="เช่น 24 เดือน" />
                            </div>
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>คำอธิบาย</label>
                                <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={formulaForm.description} onChange={e => setFormulaForm({ ...formulaForm, description: e.target.value })} />
                            </div>
                        </div>

                        {/* วัตถุดิบ */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Beaker size={16} style={{ color: '#1e88e5' }} /> วัตถุดิบ ({formulaForm.ingredients.filter(i => i.type !== 'packaging').length} รายการ)
                        </h4>
                        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                            <table className="data-table" style={{ width: '100%', minWidth: 1100 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 40, textAlign: 'center' }}>#</th>
                                        <th style={{ width: 120 }}>ชนิด</th>
                                        <th style={{ minWidth: 220 }}>วัตถุดิบ (อ้างอิงระบบ)</th>
                                        <th style={{ minWidth: 150 }}>ชื่อ (พิมพ์เอง)</th>
                                        <th style={{ minWidth: 120 }}>อังกฤษ</th>
                                        <th style={{ minWidth: 150 }}>วิทยาศาสตร์/ละติน</th>
                                        <th style={{ width: 100 }}>ส่วนที่ใช้</th>
                                        <th style={{ width: 90 }}>ปริมาณ</th>
                                        <th style={{ width: 100 }}>หน่วย</th>
                                        <th style={{ width: 50, textAlign: 'center' }}>ลบ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formulaForm.ingredients.map((ing, originalIdx) => ({ing, originalIdx})).filter(({ing}) => ing.type !== 'packaging').map(({ing, originalIdx}, displayIdx) => (
                                        <tr key={originalIdx} style={{ verticalAlign: 'middle' }}>
                                            <td style={{ textAlign: 'center' }}>{displayIdx + 1}</td>
                                            <td style={{ padding: '8px 4px' }}>
                                                <CustomSelect usePortal={true} style={{ ...inputStyle, width: '100%', padding: '6px 8px' }} value={ing.type} onChange={e => updateIngredient(originalIdx, 'type', e.target.value)}>
                                                    <option value="active">Active</option>
                                                    <option value="extract">Extract</option>
                                                    <option value="inactive">Inactive</option>
                                                </CustomSelect>
                                            </td>
                                            <td style={{ padding: '8px 4px' }}>
                                                <CustomSelect usePortal={true} style={{ ...inputStyle, width: '100%', minWidth: 200, padding: '6px 8px' }} value={ing.materialId} onChange={e => updateIngredient(originalIdx, 'materialId', e.target.value)}>
                                                    <option value="">-- เลือก (ถ้ามี) --</option>
                                                    {materials.filter(m => m.category !== 'Packaging').map(m => <option key={m.id} value={m.id}>{m.id} — {m.name}</option>)}
                                                </CustomSelect>
                                            </td>
                                            {!ing.materialId ? (
                                                <>
                                                    <td style={{ padding: '8px 4px' }}>
                                                        <div style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', minHeight: '38px', padding: '6px 8px', display: 'flex', fontSize: 14 }}>
                                                            <TipTapCell value={ing.name || ''} onChange={val => updateIngredient(originalIdx, 'name', val)} placeholder="ชื่อวัตถุดิบ" />
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '8px 4px' }}>
                                                        <div style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', minHeight: '38px', padding: '6px 8px', display: 'flex', fontSize: 14 }}>
                                                            <TipTapCell value={ing.engName || ''} onChange={val => updateIngredient(originalIdx, 'engName', val)} placeholder="อังกฤษ" />
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '8px 4px' }}>
                                                        <div style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', minHeight: '38px', padding: '6px 8px', display: 'flex', fontSize: 14 }}>
                                                            <TipTapCell value={ing.latinName || ''} onChange={val => updateIngredient(originalIdx, 'latinName', val)} placeholder="วิทย์" />
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '8px 4px' }}>
                                                        <div style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', minHeight: '38px', padding: '6px 8px', display: 'flex', fontSize: 14 }}>
                                                            <TipTapCell value={ing.partUsed || ''} onChange={val => updateIngredient(originalIdx, 'partUsed', val)} placeholder="ส่วนที่ใช้" />
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <td colSpan="4" style={{ padding: '8px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    <div style={{ color: '#9ca3af', fontSize: 13 }}>- อ้างอิงจากระบบ -</div>
                                                </td>
                                            )}
                                            <td style={{ padding: '8px 4px' }}>
                                                <input type="number" style={{ ...inputStyle, width: '100%', padding: '6px 8px', minHeight: '38px', boxSizing: 'border-box' }} placeholder="จำนวน" value={ing.qty === 0 ? 0 : (ing.qty || '')} onChange={e => updateIngredient(originalIdx, 'qty', e.target.value)} />
                                            </td>
                                            <td style={{ padding: '8px 4px' }}>
                                                <CustomSelect usePortal={true} style={{ ...inputStyle, width: '100%', padding: '6px 8px' }} value={ing.unit} onChange={e => updateIngredient(originalIdx, 'unit', e.target.value)}>
                                                    <option value="">- หน่วย -</option>
                                                    <option>กรัม</option><option>กิโลกรัม</option><option>มิลลิลิตร</option><option>ลิตร</option><option>ชิ้น</option>
                                                </CustomSelect>
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                                                <button className="btn-sm" onClick={() => removeIngredient(originalIdx)} style={{ background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer', color: '#ef4444', padding: '6px', borderRadius: 4, marginTop: 2 }} title="ลบรายการ">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button className="btn-sm" onClick={addIngredient} style={{ marginBottom: 20 }}><Plus size={14} /> เพิ่มวัตถุดิบ</button>

                        {/* บรรจุภัณฑ์ */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, paddingTop: 16, borderTop: '1px dashed #e2e8f0' }}>
                            <Package size={16} style={{ color: '#f59e0b' }} /> บรรจุภัณฑ์ ({formulaForm.ingredients.filter(i => i.type === 'packaging').length} รายการ)
                        </h4>
                        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                            <table className="data-table" style={{ width: '100%', minWidth: 800 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 40, textAlign: 'center' }}>#</th>
                                        <th style={{ minWidth: 220 }}>บรรจุภัณฑ์ (อ้างอิงระบบ)</th>
                                        <th style={{ width: 50, textAlign: 'center' }}>ลบ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formulaForm.ingredients.map((ing, originalIdx) => ({ing, originalIdx})).filter(({ing}) => ing.type === 'packaging').map(({ing, originalIdx}, displayIdx) => (
                                        <tr key={originalIdx} style={{ verticalAlign: 'middle' }}>
                                            <td style={{ textAlign: 'center' }}>{displayIdx + 1}</td>
                                            <td style={{ padding: '8px 4px' }}>
                                                <CustomSelect usePortal={true} style={{ ...inputStyle, width: '100%', minWidth: 200, padding: '6px 8px' }} value={ing.materialId} onChange={e => updateIngredient(originalIdx, 'materialId', e.target.value)}>
                                                    <option value="">-- เลือก (ถ้ามี) --</option>
                                                    {pmMaterials.map(m => <option key={m.id} value={m.id}>{m.id} — {m.name}</option>)}
                                                </CustomSelect>
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                                                <button className="btn-sm" onClick={() => removeIngredient(originalIdx)} style={{ background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer', color: '#ef4444', padding: '6px', borderRadius: 4, marginTop: 2 }} title="ลบรายการ">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button className="btn-sm" onClick={() => setFormulaForm({
                            ...formulaForm,
                            ingredients: [...formulaForm.ingredients, { type: 'packaging', materialId: '', name: '', engName: '', latinName: '', partUsed: '', qty: 1, unit: 'ชิ้น' }]
                        })} style={{ marginBottom: 24, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>
                            <Plus size={14} /> เพิ่มบรรจุภัณฑ์
                        </button>

                        {/* วิธีการผลิต */}
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ListChecks size={16} style={{ color: '#f59e0b' }} /> วิธีการผลิต ({formulaForm.instructions.length} ขั้นตอน)
                        </h4>
                        {formulaForm.instructions.map((step, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, color: '#6b7280', minWidth: 24 }}>{idx + 1}.</span>
                                <input type="text" style={{ ...inputStyle, flex: 1 }} value={step} onChange={e => updateInstruction(idx, e.target.value)} placeholder={`ขั้นตอนที่ ${idx + 1}`} />
                                <button onClick={() => removeInstruction(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                            </div>
                        ))}
                        <button className="btn-sm" onClick={addInstruction}><Plus size={14} /> เพิ่มขั้นตอน</button>
                    </div>
                    <div className="rnd-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
                        <button className="btn-secondary" onClick={() => { setShowCreateFormula(false); setShowEditFormula(false); }}>ยกเลิก</button>
                        <button className="btn-primary" onClick={isEdit ? handleEditFormula : handleCreateFormula} disabled={saving}>
                            {saving ? 'กำลังบันทึก...' : isEdit ? '✅ บันทึกการแก้ไข' : '📝 บันทึกฉบับร่าง'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Create Project Modal (#4)
    // ══════════════════════════════════════════════════════════════════
    const renderCreateProjectModal = () => {
        if (!showCreateProject) return null;
        return (
            <div className="rnd-modal-overlay" onClick={() => setShowCreateProject(false)}>
                <div className="rnd-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <h2>➕ สร้างโครงการวิจัยใหม่</h2>
                        <button className="rnd-modal-close" onClick={() => setShowCreateProject(false)}><XCircle size={22} /></button>
                    </div>
                    <div className="rnd-modal-body">
                        <div className="rnd-modal-info-grid">
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>ชื่อโครงการ <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" style={inputStyle} value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="เช่น พัฒนาสูตรครีมขมิ้นชัน V3" />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>หมวดหมู่</label>
                                <CustomSelect style={inputStyle} value={projectForm.category} onChange={e => setProjectForm({ ...projectForm, category: e.target.value })}>
                                    <option value="">-- เลือก --</option>
                                    <option>Skincare</option><option>Essential Oil</option><option>เครื่องดื่ม</option><option>น้ำมันนวด</option><option>สุขอนามัย</option><option>ยาดม</option>
                                </CustomSelect>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>นักวิจัย</label>
                                <input type="text" style={inputStyle} value={projectForm.researcher} onChange={e => setProjectForm({ ...projectForm, researcher: e.target.value })} placeholder="ชื่อนักวิจัย" />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>วันเริ่มต้น</label>
                                <CustomDatePicker style={inputStyle} value={projectForm.startDate} onChange={e => setProjectForm({ ...projectForm, startDate: e.target.value })} />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>วันเป้าหมาย</label>
                                <CustomDatePicker style={inputStyle} value={projectForm.targetDate} onChange={e => setProjectForm({ ...projectForm, targetDate: e.target.value })} />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>สูตรอ้างอิง (ถ้ามี)</label>
                                <CustomSelect style={inputStyle} value={projectForm.formulaRef} onChange={e => setProjectForm({ ...projectForm, formulaRef: e.target.value })}>
                                    <option value="">-- ไม่มี --</option>
                                    {formulas.map(f => <option key={f.id} value={f.id}>{f.id} — {f.name}</option>)}
                                </CustomSelect>
                            </div>
                        </div>
                    </div>
                    <div className="rnd-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
                        <button className="btn-secondary" onClick={() => setShowCreateProject(false)}>ยกเลิก</button>
                        <button className="btn-primary" onClick={handleCreateProject} disabled={saving}>{saving ? 'กำลังสร้าง...' : '✅ สร้างโครงการ'}</button>
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Create Experiment Modal (#5)
    // ══════════════════════════════════════════════════════════════════
    const renderCreateExperimentModal = () => {
        if (!showCreateExperiment) return null;
        return (
            <div className="rnd-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowCreateExperiment(false)}>
                <div className="rnd-modal" style={{ maxWidth: 1200, width: '95%' }} onClick={e => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <h2>{experimentForm.isViewOnly ? '🔍 รายละเอียดผลการทดลอง' : '🧪 บันทึกผลการทดลอง'}</h2>
                        <button className="rnd-modal-close" onClick={() => setShowCreateExperiment(false)}><XCircle size={22} /></button>
                    </div>
                    <div className="rnd-modal-body">
                        <div className="rnd-modal-info-grid">
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>โครงการ <span style={{ color: '#ef4444' }}>*</span></label>
                                <CustomSelect style={inputStyle} value={experimentForm.projectCode} onChange={e => setExperimentForm({ ...experimentForm, projectCode: e.target.value })} disabled={experimentForm.isViewOnly}>
                                    <option value="">-- เลือกโครงการ --</option>
                                    {projects.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
                                </CustomSelect>
                            </div>
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>ชื่อการทดลอง <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" style={inputStyle} value={experimentForm.name} onChange={e => setExperimentForm({ ...experimentForm, name: e.target.value })} placeholder="เช่น ทดสอบค่า pH ครั้งที่ 2" disabled={experimentForm.isViewOnly} />
                            </div>
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>สูตรอ้างอิง</label>
                                <CustomSelect style={inputStyle} value={experimentForm.formulaRef} onChange={handleExpFormulaRefChange} disabled={experimentForm.isViewOnly}>
                                    <option value="">-- เลือกสูตรอ้างอิง (ถ้ามี) --</option>
                                    {formulas.map(f => <option key={f.code || f.id} value={f.code || f.id}>{f.code || f.id} — {f.name}</option>)}
                                </CustomSelect>
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>วันที่ทดลอง</label>
                                <CustomDatePicker style={inputStyle} value={experimentForm.date} onChange={e => setExperimentForm({ ...experimentForm, date: e.target.value })} disabled={experimentForm.isViewOnly} />
                            </div>
                            <div className="rnd-modal-info-item">
                                <label>ผลลัพธ์</label>
                                <CustomSelect 
                                    style={{ ...inputStyle, backgroundColor: experimentForm.isViewOnly ? '#f3f4f6' : '#fff', cursor: experimentForm.isViewOnly ? 'not-allowed' : 'pointer', color: '#6b7280' }} 
                                    value={experimentForm.result || 'รอผล'} 
                                    onChange={e => setExperimentForm({ ...experimentForm, result: e.target.value })}
                                    disabled={true}
                                >
                                    <option value="รอผล">รอผล</option>
                                    {experimentForm.isViewOnly && <option value="รอประเมิน">รอประเมิน</option>}
                                    {experimentForm.isViewOnly && <option value="ผ่าน">ผ่าน</option>}
                                    {experimentForm.isViewOnly && <option value="ไม่ผ่าน">ไม่ผ่าน</option>}
                                </CustomSelect>
                            </div>
                            <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                <label>หมายเหตุ</label>
                                <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={experimentForm.note} onChange={e => setExperimentForm({ ...experimentForm, note: e.target.value })} placeholder="รายละเอียดผลทดลอง..." disabled={experimentForm.isViewOnly} />
                            </div>

                            {/* วัตถุดิบ (สัดส่วนที่ปรับแก้ในการทดลอง) */}
                            <div style={{ gridColumn: '1 / -1', marginTop: 16 }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Beaker size={16} style={{ color: '#1e88e5' }} /> ส่วนผสมที่ปรับปรุงในการทดลอง ({experimentForm.ingredients?.length || 0} รายการ)
                                </h4>
                                {experimentForm.ingredients && (
                                    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                                        <table className="data-table" style={{ width: '100%', minWidth: 1100 }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 40, textAlign: 'center' }}>#</th>
                                                    <th style={{ width: 120 }}>ชนิด</th>
                                                    <th style={{ minWidth: 220 }}>วัตถุดิบ (อ้างอิงระบบ)</th>
                                                    <th style={{ minWidth: 150 }}>ชื่อ (พิมพ์เอง)</th>
                                                    <th style={{ minWidth: 120 }}>อังกฤษ</th>
                                                    <th style={{ minWidth: 150 }}>วิทยาศาสตร์/ละติน</th>
                                                    <th style={{ width: 100 }}>ส่วนที่ใช้</th>
                                                    <th style={{ width: 90 }}>ปริมาณ</th>
                                                    <th style={{ width: 100 }}>หน่วย</th>
                                                    {!experimentForm.isViewOnly && <th style={{ width: 50, textAlign: 'center' }}>ลบ</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {experimentForm.ingredients.map((ing, idx) => (
                                                    <tr key={idx} style={{ verticalAlign: 'middle' }}>
                                                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                        <td style={{ padding: '8px 4px' }}>
                                                            <CustomSelect usePortal={true} style={{ ...inputStyle, width: '100%', padding: '6px 8px' }} value={ing.type} onChange={e => updateExpIngredient(idx, 'type', e.target.value)} disabled={experimentForm.isViewOnly}>
                                                                <option value="active">Active</option>
                                                                <option value="extract">Extract</option>
                                                                <option value="inactive">Inactive</option>
                                                            </CustomSelect>
                                                        </td>
                                                        <td style={{ padding: '8px 4px' }}>
                                                            <CustomSelect usePortal={true} style={{ ...inputStyle, width: '100%', minWidth: 200, padding: '6px 8px' }} value={ing.materialId} onChange={e => updateExpIngredient(idx, 'materialId', e.target.value)} disabled={experimentForm.isViewOnly}>
                                                                <option value="">-- เลือก (ถ้ามี) --</option>
                                                                {materials.map(m => <option key={m.id} value={m.id}>{m.id} — {m.name}</option>)}
                                                            </CustomSelect>
                                                        </td>
                                                        {!ing.materialId ? (
                                                            <>
                                                                <td style={{ padding: '8px 4px' }}>
                                                                    <div style={{ background: experimentForm.isViewOnly ? '#f3f4f6' : '#fff', border: '1px solid #d1d5db', borderRadius: '4px', minHeight: '38px', padding: '6px 8px', display: 'flex', fontSize: 14 }}>
                                                                        <TipTapCell value={ing.name || ''} onChange={val => updateExpIngredient(idx, 'name', val)} placeholder="ชื่อวัตถุดิบ" readOnly={experimentForm.isViewOnly} />
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '8px 4px' }}>
                                                                    <div style={{ background: experimentForm.isViewOnly ? '#f3f4f6' : '#fff', border: '1px solid #d1d5db', borderRadius: '4px', minHeight: '38px', padding: '6px 8px', display: 'flex', fontSize: 14 }}>
                                                                        <TipTapCell value={ing.engName || ''} onChange={val => updateExpIngredient(idx, 'engName', val)} placeholder="อังกฤษ" readOnly={experimentForm.isViewOnly} />
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '8px 4px' }}>
                                                                    <div style={{ background: experimentForm.isViewOnly ? '#f3f4f6' : '#fff', border: '1px solid #d1d5db', borderRadius: '4px', minHeight: '38px', padding: '6px 8px', display: 'flex', fontSize: 14 }}>
                                                                        <TipTapCell value={ing.latinName || ''} onChange={val => updateExpIngredient(idx, 'latinName', val)} placeholder="วิทย์" readOnly={experimentForm.isViewOnly} />
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '8px 4px' }}>
                                                                    <div style={{ background: experimentForm.isViewOnly ? '#f3f4f6' : '#fff', border: '1px solid #d1d5db', borderRadius: '4px', minHeight: '38px', padding: '6px 8px', display: 'flex', fontSize: 14 }}>
                                                                        <TipTapCell value={ing.partUsed || ''} onChange={val => updateExpIngredient(idx, 'partUsed', val)} placeholder="ส่วนที่ใช้" readOnly={experimentForm.isViewOnly} />
                                                                    </div>
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <td colSpan="4" style={{ padding: '8px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                                <div style={{ color: '#9ca3af', fontSize: 13 }}>- อ้างอิงจากระบบ -</div>
                                                            </td>
                                                        )}
                                                        <td style={{ padding: '8px 4px' }}>
                                                            <input type="number" style={{ ...inputStyle, width: '100%', padding: '6px 8px', minHeight: '38px', boxSizing: 'border-box' }} placeholder="จำนวน" value={ing.qty === 0 ? 0 : (ing.qty || '')} onChange={e => updateExpIngredient(idx, 'qty', e.target.value)} disabled={experimentForm.isViewOnly} />
                                                        </td>
                                                        <td style={{ padding: '8px 4px' }}>
                                                            <CustomSelect usePortal={true} style={{ ...inputStyle, width: '100%', padding: '6px 8px' }} value={ing.unit} onChange={e => updateExpIngredient(idx, 'unit', e.target.value)} disabled={experimentForm.isViewOnly}>
                                                                <option value="">- หน่วย -</option>
                                                                <option>กรัม</option><option>กิโลกรัม</option><option>มิลลิลิตร</option><option>ลิตร</option><option>ชิ้น</option>
                                                            </CustomSelect>
                                                        </td>
                                                        {!experimentForm.isViewOnly && (
                                                            <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                                                                <button className="btn-sm" onClick={() => removeExpIngredient(idx)} style={{ background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer', color: '#ef4444', padding: '6px', borderRadius: 4, marginTop: 2 }} title="ลบรายการ">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                                {experimentForm.ingredients.length === 0 && (
                                                    <tr><td colSpan={experimentForm.isViewOnly ? "9" : "10"} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>ยังไม่มีวัตถุดิบ</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {!experimentForm.isViewOnly && (
                                    <button className="btn-sm" style={{ color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe' }} onClick={addExpIngredient}>
                                        <Plus size={16} /> เพิ่มวัตถุดิบ
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="rnd-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
                        {experimentForm.isViewOnly ? (
                            <button className="btn-secondary" onClick={() => setShowCreateExperiment(false)}>ปิดหน้าต่าง</button>
                        ) : (
                            <>
                                <button className="btn-secondary" onClick={() => setShowCreateExperiment(false)}>ยกเลิก</button>
                                <button className="btn-primary" onClick={handleSaveExperiment} disabled={saving}>{saving ? 'กำลังบันทึก...' : '✅ บันทึกผลทดลอง'}</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // 4. เภสัชกรอนุมัติ (Pharmacist Approval)
    // ══════════════════════════════════════════════════════════════════
    const renderPharmacist = () => {
        const pharmFormulas = formulas.filter(f => ['รอเภสัชกร', 'เภสัชกรไม่อนุมัติ', 'อนุมัติ'].includes(f.status));
        const pendingFormulas = formulas.filter(f => f.status === 'รอเภสัชกร');
        const pharmExperiments = [...experiments]
            .filter(e => ['รอประเมิน', 'ผ่าน', 'ไม่ผ่าน'].includes(e.result))
            .sort((a, b) => b.id - a.id);
        
        return (
            <div className="rnd-pharmacist">

                {pendingFormulas.length > 0 && (
                    <div style={{ 
                        background: 'linear-gradient(to right, #faf5ff, #f3e8ff)', 
                        border: '1px solid #e9d5ff', 
                        borderRadius: '12px', 
                        padding: '20px', 
                        marginBottom: '24px',
                        boxShadow: '0 4px 6px -1px rgba(168, 85, 247, 0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: '#a855f7', color: '#fff', borderRadius: '50%', fontWeight: 'bold', fontSize: '20px', boxShadow: '0 2px 4px rgba(168, 85, 247, 0.3)' }}>!</div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#6b21a8' }}>
                                    รอเภสัชกรตรวจสอบและอนุมัติ ({pendingFormulas.length} รายการ)
                                </h3>
                                <div style={{ fontSize: '13px', color: '#7e22ce', marginTop: '2px' }}>
                                    โปรดตรวจสอบความถูกต้องของสูตรตามกฎหมายและอนุมัติการผลิต
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                            {pendingFormulas.map(f => (
                                <div key={f.id} style={{ 
                                    background: '#ffffff', 
                                    border: '1px solid #d8b4fe', 
                                    borderRadius: '8px', 
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; }}
                                onClick={() => { setSelectedFormula(f); if(f.unitSize) setSimUnitSize(f.unitSize); }}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#9333ea', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }}></span>
                                            {f.id}
                                        </div>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', lineHeight: '1.4' }}>{f.name}</div>
                                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>เวอร์ชั่น: {f.version} • หมวดหมู่: {f.category || 'ทั่วไป'}</div>
                                    </div>
                                    <button style={{ 
                                        width: '100%', 
                                        padding: '10px 0', 
                                        background: '#a855f7', 
                                        color: '#fff', 
                                        border: 'none', 
                                        borderRadius: '6px', 
                                        fontWeight: 600, 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#9333ea'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#a855f7'}
                                    >
                                        <Beaker size={16} /> ตรวจสอบสูตร
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {hasSectionPermission('rnd_pharmacist_approve') && (
                    <>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Beaker size={18} style={{ color: '#6366f1' }}/> สูตรหลัก (Formulas)
                        </h3>
                        <div className="card table-card" style={{ marginBottom: 24 }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รหัสสูตร</th><th>ชื่อผลิตภัณฑ์</th><th>หมวดหมู่</th>
                                        <th>ผู้ทดสอบ (QC)</th><th>วันที่ QC ผ่าน</th>
                                        <th>สถานะ</th><th>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pharmFormulas.map(formula => (
                                        <tr key={formula.id}>
                                            <td className="text-bold">{formula.id}</td>
                                            <td>
                                                {formula.name}
                                                <div style={{ marginTop: 4 }}>
                                                    <span className={`badge ${formula.formulaType === 'สูตร อย.' ? 'badge-primary' : 'badge-neutral'}`} style={{ fontSize: 10 }}>
                                                        {formula.formulaType || 'สูตรทั่วไป'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td><span style={getCategoryStyle(formula.category)}>{formula.category}</span></td>
                                            <td>{formula.qcApprovedBy || '-'}</td>
                                            <td>{formula.qcApprovedDate || '-'}</td>
                                            <td><span className={`badge ${getStatusColor(formula.status)}`}>{formula.status}</span></td>
                                            <td>
                                                {formula.status === 'รอเภสัชกร' ? (
                                                    <button 
                                                        className="btn-sm" 
                                                        style={{ background: '#a855f7', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(168, 85, 247, 0.3)' }}
                                                        onClick={() => { setSelectedFormula(formula); if(formula.unitSize) setSimUnitSize(formula.unitSize); }} 
                                                        title="ดูรายละเอียดและอนุมัติ"
                                                    >
                                                        <ClipboardCheck size={14} /> ตรวจสอบ
                                                    </button>
                                                ) : (
                                                    <button 
                                                        className="btn-sm" 
                                                        style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                        onClick={() => { setSelectedFormula(formula); if(formula.unitSize) setSimUnitSize(formula.unitSize); }} 
                                                        title="ดูรายละเอียดสูตร"
                                                    >
                                                        <Eye size={14} /> ดูรายละเอียด
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {pharmFormulas.length === 0 && (
                                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่มีรายการที่รอการตรวจสอบจากเภสัชกร</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ClipboardCheck size={18} style={{ color: '#10b981' }}/> ผลการทดลอง (Experiments) ที่ส่งให้เภสัชกรประเมิน
                        </h3>
                        <div className="card table-card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รหัสการทดลอง</th>
                                        <th>ชื่อการทดลอง</th>
                                        <th>อ้างอิงสูตร</th>
                                        <th>วันที่ทดลอง</th>
                                        <th>ผลประเมิน</th>
                                        <th style={{ textAlign: 'right' }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pharmExperiments.map(exp => (
                                        <tr key={exp.id}>
                                            <td className="text-bold">{exp.code}</td>
                                            <td>{exp.name}</td>
                                            <td>{exp.formulaRef ? <span className="badge badge-info">{exp.formulaRef}</span> : '-'}</td>
                                            <td>{exp.date || '-'}</td>
                                            <td><span className={`badge ${getResultColor(exp.result)}`}>{exp.result}</span></td>
                                            <td style={{ textAlign: 'right' }}>
                                                {exp.result === 'รอประเมิน' ? (
                                                    <button className="btn-sm" onClick={() => setSelectedExperimentForPharm(exp)} title="ตรวจสอบข้อมูลผลการทดลอง"><Eye size={14} /> ตรวจสอบ</button>
                                                ) : (
                                                    <button className="btn-sm btn-secondary" onClick={() => handlePrintSafetyCert(exp)} title="เปิดดูใบประเมิน (PDF)"><FileText size={14} /> พรีวิว</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {pharmExperiments.length === 0 && (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ไม่มีผลการทดลองที่รอประเมิน</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════════
    // Pharmacist Experiment Preview Modal
    // ══════════════════════════════════════════════════════════════════
    const renderExperimentPharmModal = () => {
        if (!selectedExperimentForPharm) return null;
        const exp = selectedExperimentForPharm;

        // Ensure we parse trialRecipe if it's a string
        let recipeItems = [];
        if (typeof exp.trialRecipe === 'string') {
            try { recipeItems = JSON.parse(exp.trialRecipe); } catch(e) { console.error('Failed to parse trialRecipe', e); }
        } else if (Array.isArray(exp.trialRecipe)) {
            recipeItems = exp.trialRecipe;
        }

        return (
            <div className="rnd-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setSelectedExperimentForPharm(null)}>
                <div className="rnd-modal" style={{ width: 800, maxWidth: '95%' }} onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>{exp.name}</h2>
                            <div className="rnd-modal-meta">
                                <span className="badge badge-info">{exp.code}</span>
                                <span className={`badge ${getResultColor(exp.result)}`}>{exp.result}</span>
                                {exp.formulaRef && <span className="badge badge-neutral">อ้างอิง: {exp.formulaRef}</span>}
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => setSelectedExperimentForPharm(null)}><XCircle size={22} /></button>
                    </div>

                    <div className="rnd-modal-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            <div className="info-box" style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>ผู้ทดสอบ</label>
                                <div style={{ fontWeight: 600, color: '#334155' }}>{exp.tester || '-'}</div>
                            </div>
                            <div className="info-box" style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>วันที่ทดลอง</label>
                                <div style={{ fontWeight: 600, color: '#334155' }}>{exp.date || '-'}</div>
                            </div>
                        </div>

                        <h4 style={{ margin: '0 0 12px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>ส่วนผสม (Trial Recipe)</h4>
                        {recipeItems.length > 0 ? (
                            <div className="card table-card" style={{ marginBottom: 24, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th>ชนิด/ประเภท</th>
                                            <th>ชื่อสาร / วัตถุดิบ</th>
                                            <th>รายละเอียดเพิ่มเติม</th>
                                            <th style={{ textAlign: 'right' }}>ปริมาณ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recipeItems.map((item, idx) => {
                                            const itemName = item.name ? String(item.name).replace(/<[^>]+>/g, ' ') : '';
                                            return (
                                                <tr key={item.id || idx}>
                                                    <td>{item.type || '-'}</td>
                                                    <td>{item.materialCode ? `${item.materialCode} - ${itemName}` : itemName}</td>
                                                    <td>{item.description ? String(item.description).replace(/<[^>]+>/g, ' ') : '-'}</td>
                                                    <td style={{ textAlign: 'right' }}>{item.qty || 0} {item.unit || 'g'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: 24 }}>ไม่มีข้อมูลส่วนผสม</p>
                        )}

                        <h4 style={{ margin: '0 0 12px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>รายละเอียดผลการทดลอง</h4>
                        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, color: '#334155', minHeight: 60, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                            {exp.note || '-'}
                        </div>
                    </div>

                    <div className="rnd-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-secondary" onClick={() => setSelectedExperimentForPharm(null)}>ปิด</button>
                            <button className="btn-primary" style={{ background: '#3b82f6', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => handlePrintSafetyCert(exp)}>
                                <FileText size={16} /> ใบประเมิน (PDF)
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {currentTab === 'rnd_pharmacist' && exp.result === 'รอประเมิน' && (
                                <>
                                    <button className="btn-primary" style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => { handleUpdateExperimentStatus(exp, 'ผ่าน'); setSelectedExperimentForPharm(null); }}>
                                        <CheckCircle2 size={16} /> ประเมินผ่าน
                                    </button>
                                    <button className="btn-primary" style={{ background: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => { handleUpdateExperimentStatus(exp, 'ไม่ผ่าน'); setSelectedExperimentForPharm(null); }}>
                                        <XCircle size={16} /> ประเมินไม่ผ่าน
                                    </button>
                                </>
                            )}
                        </div>
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
            case 'rnd_dashboard': return 'R&D Dashboard';
            case 'rnd_formulas': return 'สูตรการผลิต (BOM)';
            case 'rnd_projects': return 'โครงการวิจัยและพัฒนา';
            case 'rnd_pharmacist': return 'เภสัชกร (Pharmacist)';
            default: return 'วิจัยและพัฒนา (R&D)';
        }
    };

    const getPageDesc = () => {
        switch (currentTab) {
            case 'rnd_dashboard': return 'ภาพรวมสูตรผลิตภัณฑ์และโครงการวิจัย';
            case 'rnd_formulas': return 'จัดการสูตรผลิตภัณฑ์ วัตถุดิบ และวิธีการผลิต';
            case 'rnd_projects': return 'จัดการโครงการวิจัยผลิตภัณฑ์สมุนไพร';
            case 'rnd_pharmacist': return 'ตรวจสอบความถูกต้องของสูตรตามกฎหมายและอนุมัติการผลิต';
            default: return 'จัดการข้อมูลการวิจัยและพัฒนาผลิตภัณฑ์';
        }
    };

    return (
        <div className="page-container rnd-page page-enter">
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <h1>{getPageTitle()}</h1>
                <p>{getPageDesc()}</p>
            </div>
            {currentTab === 'rnd_dashboard' && renderDashboard()}
            {currentTab === 'rnd_formulas' && renderFormulas()}
            {currentTab === 'rnd_projects' && renderProjects()}
            {currentTab === 'rnd_pharmacist' && renderPharmacist()}
            {renderFormulaModal()}
            {renderExperimentPharmModal()}
            {renderFormulaFormModal()}
            {renderCreateProjectModal()}
            {renderCreateExperimentModal()}
            {renderProjectDetailsModal()}
        </div>
    );
}

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 };

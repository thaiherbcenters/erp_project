/**
 * =============================================================================
 * QC.jsx — หน้าตรวจสอบคุณภาพ (Quality Control) — เชื่อมกับ Production
 * =============================================================================
 * Integration:
 *   - Production ส่งคำขอ QC → แสดงในหน้า QC In-Process / QC Final
 *   - QC กด ผ่าน/ไม่ผ่าน → ผลกลับไปอัปเดต Production Stepper อัตโนมัติ
 * =============================================================================
 */

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProduction } from '../context/ProductionContext';
import { useRnD } from '../context/RnDContext';
import API_BASE from '../config';
import { Search, Plus, FileText, Trash2, Save, Eye, ListChecks } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { useAlert } from '../components/CustomAlert';
import './PageCommon.css';
import './QC.css';

// --- Unit Conversion Helpers ---
const convertToBase = (qty, unit) => {
    if (!qty || isNaN(qty)) return 0;
    const val = parseFloat(qty);
    const u = (unit || '').toLowerCase().trim();
    if (['กิโลกรัม', 'kg', 'kgs', 'กก.', 'ลิตร', 'l', 'liter', 'liters'].includes(u)) return val * 1000;
    if (['มิลลิกรัม', 'mg', 'มก.'].includes(u)) return val * 0.001;
    return val;
};

const formatDynamicBatchSize = (ingredients) => {
    if (!ingredients || !ingredients.length) return "0 กรัม";
    const totalBase = ingredients.filter(i => i.type !== 'packaging').reduce((sum, ing) => sum + convertToBase(ing.qty, ing.unit), 0);
    
    if (totalBase >= 1000) {
        return (totalBase / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' กิโลกรัม';
    }
    return totalBase.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' กรัม';
};

export default function QC() {
    const { currentUser, canCreate, canUpdate, canDelete, hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const { qcRequests, submitQcResult, getPendingQcRequests } = useProduction();
    const { showAlert } = useAlert();
    const visibleSubPages = getVisibleSubPages('qc');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'qc_dashboard';

    const [searchIncoming, setSearchIncoming] = useState('');
    const [searchInprocess, setSearchInprocess] = useState('');
    const [searchFinal, setSearchFinal] = useState('');
    const [searchDefect, setSearchDefect] = useState('');
    const [inspectingRequest, setInspectingRequest] = useState(null);
    const [inspectNotes, setInspectNotes] = useState('');
    const [rejectDialog, setRejectDialog] = useState({ open: false, request: null });

    // QC/Lab Formula Testing
    const { formulas, fetchFormulaTests, submitFormulaTest } = useRnD();
    const [formulaTests, setFormulaTests] = useState([]);
    const [showTestForm, setShowTestForm] = useState(false);
    const [testFormData, setTestFormData] = useState({
        formulaId: '', testedBy: currentUser?.name || currentUser?.username || '', pH: '', viscosity: '', color: '', smell: '', stability: '', microbial: '', overallResult: '', notes: ''
    });
    const [testSaving, setTestSaving] = useState(false);

    const pendingFormulas = formulas.filter(f => f.status === 'รอทดสอบ');

    const loadFormulaTests = useCallback(async () => {
        const data = await fetchFormulaTests();
        setFormulaTests(data);
    }, [fetchFormulaTests]);

    const handleSubmitTest = async () => {
        if (!testFormData.formulaId || !testFormData.overallResult) return showAlert('คำเตือน', 'กรุณาเลือกสูตรและระบุผลทดสอบ', 'warning');
        setTestSaving(true);
        const res = await submitFormulaTest(testFormData);
        setTestSaving(false);
        if (res.success) {
            showAlert('สำเร็จ', 'บันทึกผลทดสอบสำเร็จ!', 'success');
            setShowTestForm(false);
            setTestFormData({ formulaId: '', testedBy: currentUser?.name || currentUser?.username || '', pH: '', viscosity: '', color: '', smell: '', stability: '', microbial: '', overallResult: '', notes: '' });
            loadFormulaTests();
        } else showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกได้ กรุณาลองใหม่', 'error');
    };

    const handlePrintQcReport = async (test) => {
        try {
            const token = localStorage.getItem('erp_token');
            window.open(`${API_BASE}/rnd/formula-tests/${test.id}/print?token=${token}`, '_blank');
        } catch (error) {
            console.error('Print error:', error);
            showAlert('ข้อผิดพลาด', 'เกิดปัญหาในการสร้างเอกสาร', 'error');
        }
    };

    const [incomings, setIncomings] = useState([]);
    const [defects, setDefects] = useState([]);

    // ── Fetch Data ──
    const fetchQcData = useCallback(async () => {
        try {
            const resInc = await fetch(`${API_BASE}/qc/incoming`);
            if (resInc.ok) {
                const data = await resInc.json();
                setIncomings(data.map(d => ({
                    id: d.IncomingID,
                    requestId: d.RequestID || `QCIC-${d.IncomingID}`,
                    lotNumber: d.LotNumber,
                    item: d.ItemName,
                    supplier: d.SupplierName,
                    inspector: d.InspectorID,
                    result: d.Result,
                    notes: d.Notes,
                    date: d.CreatedAt ? new Date(d.CreatedAt).toLocaleDateString('th-TH') : ''
                })));
            }

            const resDef = await fetch(`${API_BASE}/qc/defect`);
            if (resDef.ok) {
                const data = await resDef.json();
                setDefects(data.map(d => ({
                    id: d.NcrID,
                    ncrNumber: d.NcrNumber,
                    refLot: d.RefLot,
                    item: d.ItemName,
                    issue: d.IssueDescription,
                    action: d.ActionTaken,
                    status: d.Status,
                    date: d.CreatedAt ? new Date(d.CreatedAt).toLocaleDateString('th-TH') : ''
                })));
            }
        } catch (err) {
            console.error('Error fetching QC data:', err);
        }
    }, []);

    useEffect(() => {
        fetchQcData();
        loadFormulaTests();
    }, [fetchQcData, loadFormulaTests]);

    const filteredIncoming = incomings.filter((item) =>
        item.lotNumber?.toLowerCase().includes(searchIncoming.toLowerCase()) ||
        item.item?.toLowerCase().includes(searchIncoming.toLowerCase())
    );
    const filteredDefect = defects.filter((item) =>
        item.ncrNumber?.toLowerCase().includes(searchDefect.toLowerCase()) ||
        item.item?.toLowerCase().includes(searchDefect.toLowerCase())
    );

    // ── QC Requests from Production ──
    const qcInprocessRequests = qcRequests.filter(r => r.type === 'qc_inprocess');
    const qcFinalRequests = qcRequests.filter(r => r.type === 'qc_final');
    const pendingRequests = getPendingQcRequests();

    // ── Stats ──
    const allQcItems = [...incomings];
    const totalInspections = allQcItems.length + qcRequests.length;
    const passedCount = allQcItems.filter(i => i.result === 'ผ่าน').length + qcRequests.filter(r => r.status === 'ผ่าน').length;
    const failedCount = allQcItems.filter(i => i.result === 'ไม่ผ่าน').length + qcRequests.filter(r => r.status === 'ไม่ผ่าน').length;
    const pendingCount = allQcItems.filter(i => i.result === 'รอตรวจสอบ').length + pendingRequests.length;

    const getResultBadge = (result) => {
        switch (result) {
            case 'ผ่าน': return 'badge-success';
            case 'ไม่ผ่าน': return 'badge-danger';
            case 'รอตรวจสอบ': case 'รอตรวจ': return 'badge-warning';
            default: return 'badge-neutral';
        }
    };
    const getStatusBadge = (status) => {
        if (status === 'ดำเนินการแล้ว') return 'badge-success';
        if (status === 'รอดำเนินการ') return 'badge-warning';
        return 'badge-neutral';
    };

    // ── Inspect QC Request (Checklists) ──
    const [checklistData, setChecklistData] = useState([]);
    const [loadingCriteria, setLoadingCriteria] = useState(false);
    const [newCriteria, setNewCriteria] = useState({ CheckItem: '', StandardRequirement: '' });
    const [isAddingCriteria, setIsAddingCriteria] = useState(false);

    const handleViewQcPdf = async (e, taskId) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/print/qc-request/${taskId}`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!res.ok) throw new Error('Failed to fetch QC Request PDF');
            
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error(err);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดใบส่งตรวจ QC (PDF) ได้', 'error');
        }
    };

    const openInspectModal = async (req) => {
        setInspectingRequest(req);
        setInspectNotes(req.notes || '');
        setLoadingCriteria(true);
        try {
            if (req.status === 'รอตรวจ') {
                // fetch criteria
                const url = `${API_BASE}/qc/criteria?category=${encodeURIComponent(req.formulaName || '')}&stage=${req.type}`;
                const res = await fetch(url);
                if (res.ok) {
                    const criteria = await res.json();
                    setChecklistData(criteria.map(c => ({
                        CriteriaID: c.CriteriaID,
                        CheckItem: c.CheckItem,
                        StandardRequirement: c.StandardRequirement,
                        IsPass: true, // Default pass
                        ActualValue: ''
                    })));
                }
            } else {
                // fetch saved results
                const res = await fetch(`${API_BASE}/qc/requests/${req.id}/results`);
                if (res.ok) {
                    const results = await res.json();
                    setChecklistData(results.map(r => ({
                        CriteriaID: r.CriteriaID,
                        CheckItem: r.CheckItem,
                        StandardRequirement: r.StandardRequirement,
                        IsPass: r.IsPass,
                        ActualValue: r.ActualValue
                    })));
                }
            }
        } catch (err) {
            console.error('Failed to load QC criteria or results', err);
        } finally {
            setLoadingCriteria(false);
        }
    };

    const handleInspectSubmit = async (finalResult, disposition = null) => {
        if (!inspectingRequest) return;
        await submitQcResult(inspectingRequest.id, finalResult, 'qc_user', inspectNotes, checklistData, disposition);
        showAlert('สำเร็จ', 'บันทึกผลการตรวจสอบคุณภาพเรียบร้อยแล้ว', 'success');
        setInspectingRequest(null);
        setChecklistData([]);
        setInspectNotes('');
        setIsAddingCriteria(false);
        setRejectDialog({ open: false, request: null });
    };

    const handleSaveNewCriteria = async () => {
        if (!newCriteria.CheckItem) {
            showAlert('แจ้งเตือน', 'กรุณาระบุหัวข้อที่ตรวจ', 'warning');
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/qc/criteria`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    checkItem: newCriteria.CheckItem,
                    standardRequirement: newCriteria.StandardRequirement,
                    category: inspectingRequest.formulaName,
                    stage: inspectingRequest.type
                })
            });
            if (res.ok) {
                const added = await res.json();
                setChecklistData([...checklistData, { ...added, IsPass: true, ActualValue: '' }]);
                setNewCriteria({ CheckItem: '', StandardRequirement: '' });
                setIsAddingCriteria(false);
                showAlert('สำเร็จ', 'เพิ่มรายการตรวจสอบใหม่เรียบร้อยแล้ว', 'success');
            } else {
                showAlert('ข้อผิดพลาด', 'ไม่สามารถบันทึกรายการได้', 'error');
            }
        } catch (err) {
            console.error(err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถบันทึกรายการได้', 'error');
        }
    };

    const handleDeleteCriteriaRow = async (id) => {
        if(!window.confirm('ต้องการลบหัวข้อตรวจนี้ใช่หรือไม่?')) return;
        try {
            const res = await fetch(`${API_BASE}/qc/criteria/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setChecklistData(checklistData.filter(c => c.CriteriaID !== id));
                showAlert('สำเร็จ', 'ลบรายการตรวจเรียบร้อยแล้ว', 'success');
            }
        } catch(err) {
            console.error(err);
        }
    };

    const handleRejectClick = () => {
        // Show disposition dialog
        setRejectDialog({ open: true, request: inspectingRequest });
    };

    const handleChecklistChange = (criteriaId, field, value) => {
        setChecklistData(prev => prev.map(item => 
            item.CriteriaID === criteriaId ? { ...item, [field]: value } : item
        ));
    };

    // ── Render QC requests from Production as a table ──
    const renderProductionQcTable = (requests, type) => {
        if (requests.length === 0) {
            return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>ยังไม่มีรายการ</p>;
        }

        return (
            <>
                {/* Pending requests from Production (highlighted) */}
                {requests.filter(r => r.status === 'รอตรวจ').length > 0 && (
                    <div className="qc-pending-section">
                        <h4 className="qc-pending-title">
                            🔔 คำขอตรวจจากฝ่ายผลิต ({requests.filter(r => r.status === 'รอตรวจ').length} รายการ)
                        </h4>
                        <div className="qc-pending-grid">
                            {requests.filter(r => r.status === 'รอตรวจ').map(req => (
                                <div key={req.id} className="qc-pending-card">
                                    <div className="qc-pending-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className="qc-pending-batch" style={{ whiteSpace: 'nowrap' }}>{req.id}</span>
                                        </div>
                                        <span className="badge badge-warning" style={{ whiteSpace: 'nowrap' }}>⏳ รอตรวจ</span>
                                    </div>
                                    <div className="qc-pending-product">{req.productName || req.formulaName}</div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                                        <div style={{ fontSize: 12, color: '#475569', display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600 }}>อ้างอิงงาน:</span> 
                                            <span style={{ color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>{req.jobOrderId}</span>
                                        </div>
                                        <div className="qc-pending-meta" style={{ marginTop: 2 }}>
                                            <span style={{ whiteSpace: 'nowrap' }}>🏭 {req.line}</span>
                                            <span style={{ color: '#cbd5e1' }}>|</span>
                                            <span style={{ whiteSpace: 'nowrap' }}>📅 ส่ง: {req.requestedAt}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="qc-pending-actions">
                                        {canUpdate('qc_inprocess') && (<button className="qc-btn qc-btn-inspect" onClick={() => openInspectModal(req)}>
                                            🔍 ตรวจสอบคุณภาพ
                                        </button>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Inspect Modal Overlay */}
                {inspectingRequest && inspectingRequest.type === type && (
                    <div className="rnd-modal-overlay" onClick={() => setInspectingRequest(null)}>
                        <div className="rnd-modal" style={{ maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🔍 แบบฟอร์มตรวจ QC ({inspectingRequest.type === 'qc_inprocess' ? 'In-Process' : 'Final'})</h2>
                                    <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
                                        {inspectingRequest.jobOrderId} — {inspectingRequest.productName || inspectingRequest.formulaName}
                                    </p>
                                </div>
                                <button 
                                    className="btn-secondary"
                                    onClick={(e) => handleViewQcPdf(e, inspectingRequest.taskId || inspectingRequest.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    📄 ดูใบส่งตรวจ (PDF)
                                </button>
                            </div>
                            
                            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                                {loadingCriteria ? (
                                    <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>กำลังโหลดเกณฑ์มาตรฐาน...</div>
                                ) : (
                                    <div className="qc-checklist-container">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                                                📋 รายการที่ต้องตรวจสอบ (มาตรฐาน)
                                            </h3>
                                            {inspectingRequest.status === 'รอตรวจ' && (
                                                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setIsAddingCriteria(!isAddingCriteria)}>
                                                    <Plus size={14} /> เพิ่มรายการตรวจ
                                                </button>
                                            )}
                                        </div>
                                        
                                        <table className="data-table" style={{ marginBottom: 20 }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 60, textAlign: 'center' }}>ผ่าน</th>
                                                    <th>หัวข้อที่ตรวจ</th>
                                                    <th>เกณฑ์อ้างอิง Spec</th>
                                                    <th>ค่าที่วัดได้จริง (Optional)</th>
                                                    {inspectingRequest.status === 'รอตรวจ' && <th style={{ width: 40, textAlign: 'center' }}>ลบ</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {checklistData.length === 0 && !isAddingCriteria ? (
                                                    <tr><td colSpan={inspectingRequest.status === 'รอตรวจ' ? "5" : "4"} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>ไม่มีหัวข้อตรวจแบบเฉพาะเจาะจง {inspectingRequest.status === 'รอตรวจ' && 'กรุณาเพิ่มรายการตรวจ หรือใช้การประเมินทั่วไปด้านล่าง'}</td></tr>
                                                ) : checklistData.map((item) => (
                                                    <tr key={item.CriteriaID} style={{ background: item.IsPass ? 'transparent' : '#fef2f2' }}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={item.IsPass}
                                                                onChange={(e) => handleChecklistChange(item.CriteriaID, 'IsPass', e.target.checked)}
                                                                disabled={inspectingRequest.status !== 'รอตรวจ'}
                                                                style={{ width: 18, height: 18, cursor: inspectingRequest.status !== 'รอตรวจ' ? 'default' : 'pointer', accentColor: item.IsPass ? '#16a34a' : 'initial' }}
                                                            />
                                                        </td>
                                                        <td style={{ fontWeight: 500 }}>{item.CheckItem}</td>
                                                        <td style={{ color: '#64748b', fontSize: 13 }}>{item.StandardRequirement}</td>
                                                        <td>
                                                            <input 
                                                                type="text" 
                                                                placeholder="ระบุค่า"
                                                                value={item.ActualValue}
                                                                onChange={(e) => handleChecklistChange(item.CriteriaID, 'ActualValue', e.target.value)}
                                                                disabled={inspectingRequest.status !== 'รอตรวจ'}
                                                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                                                            />
                                                        </td>
                                                        {inspectingRequest.status === 'รอตรวจ' && (
                                                            <td style={{ textAlign: 'center' }}>
                                                                <button onClick={() => handleDeleteCriteriaRow(item.CriteriaID)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} title="ลบรายการนี้">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                                {isAddingCriteria && inspectingRequest.status === 'รอตรวจ' && (
                                                    <tr style={{ background: '#f8fafc' }}>
                                                        <td style={{ textAlign: 'center' }}>-</td>
                                                        <td>
                                                            <input type="text" placeholder="ระบุหัวข้อที่ตรวจ..." value={newCriteria.CheckItem} onChange={e => setNewCriteria({...newCriteria, CheckItem: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #94a3b8', fontSize: 13 }} autoFocus />
                                                        </td>
                                                        <td>
                                                            <input type="text" placeholder="ระบุเกณฑ์อ้างอิง..." value={newCriteria.StandardRequirement} onChange={e => setNewCriteria({...newCriteria, StandardRequirement: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #94a3b8', fontSize: 13 }} />
                                                        </td>
                                                        <td>-</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button onClick={handleSaveNewCriteria} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', padding: 4 }} title="บันทึก">
                                                                <Save size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>

                                        <div style={{ marginTop: 20 }}>
                                            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>หมายเหตุรวม (ข้อติชม/สรุปผล):</label>
                                            <textarea 
                                                rows={3} 
                                                value={inspectNotes}
                                                onChange={e => setInspectNotes(e.target.value)}
                                                placeholder={inspectingRequest.status !== 'รอตรวจ' ? '-' : "ความเห็นจากเจ้าหน้าที่ QC..."}
                                                disabled={inspectingRequest.status !== 'รอตรวจ'}
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, resize: 'vertical', background: inspectingRequest.status !== 'รอตรวจ' ? '#f8fafc' : '#fff' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                                <button className="btn-secondary" onClick={() => setInspectingRequest(null)}>ปิด</button>
                                {inspectingRequest.status === 'รอตรวจ' && (
                                    <>
                                        <button className="btn-danger" onClick={handleRejectClick}>
                                            ❌ ไม่ผ่าน
                                        </button>
                                        {canCreate('qc_formula_lab') && (
                                            <button className="btn-primary" onClick={() => handleInspectSubmit('ผ่าน')}>
                                                ✅ ผ่าน QC (Approve)
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Reject Disposition Dialog ── */}
                {rejectDialog.open && (
                    <div className="rnd-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setRejectDialog({ open: false, request: null })}>
                        <div className="rnd-modal" style={{ maxWidth: 520, borderTop: '4px solid var(--danger)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
                                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#dc2626' }}>⚠️ QC ไม่ผ่าน — เลือกวิธีจัดการ</h2>
                                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
                                    {rejectDialog.request?.batchNo} — {rejectDialog.request?.productName || rejectDialog.request?.formulaName}
                                </p>
                            </div>
                            <div style={{ padding: '20px 24px' }}>
                                <p style={{ fontSize: 14, color: '#374151', marginBottom: 16, fontWeight: 500 }}>
                                    กรุณาเลือกวิธีจัดการตามมาตรฐาน GMP:
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {/* Rework Option */}
                                    <button
                                        onClick={() => handleInspectSubmit('ไม่ผ่าน', 'rework')}
                                        style={{
                                            display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px',
                                            border: '2px solid #fde68a', borderRadius: 10, background: '#fffbeb',
                                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                                        }}
                                        onMouseOver={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                        onMouseOut={e => { e.currentTarget.style.borderColor = '#fde68a'; e.currentTarget.style.transform = 'none'; }}
                                    >
                                        <div style={{ fontSize: 28, lineHeight: 1 }}>🔁</div>
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: '#92400e' }}>Rework — ส่งกลับแก้ไข</div>
                                            <div style={{ fontSize: 12, color: '#a16207', marginTop: 4 }}>ย้อนขั้นตอนกลับไปผลิตใหม่ ให้ Operator แก้ไขปัญหาแล้วส่ง QC อีกครั้ง</div>
                                            <div style={{ fontSize: 11, color: '#b45309', marginTop: 6, fontStyle: 'italic' }}>ระบบจะสร้าง NCR อัตโนมัติ</div>
                                        </div>
                                    </button>
                                    {/* Reject Option */}
                                    <button
                                        onClick={() => handleInspectSubmit('ไม่ผ่าน', 'reject')}
                                        style={{
                                            display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px',
                                            border: '2px solid #fecaca', borderRadius: 10, background: '#fef2f2',
                                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                                        }}
                                        onMouseOver={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                        onMouseOut={e => { e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.transform = 'none'; }}
                                    >
                                        <div style={{ fontSize: 28, lineHeight: 1 }}>🗑️</div>
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: '#991b1b' }}>Reject — คัดทิ้งทั้ง Batch</div>
                                            <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>ของเสียถาวร ไม่สามารถแก้ไขได้ ปิดงาน Batch นี้และบันทึกเป็นของเสีย</div>
                                            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6, fontStyle: 'italic' }}>⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้ + สร้าง NCR อัตโนมัติ</div>
                                        </div>
                                    </button>
                                </div>
                                <div style={{ marginTop: 16, textAlign: 'right' }}>
                                    <button className="btn-secondary" onClick={() => setRejectDialog({ open: false, request: null })}>ยกเลิก</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Completed QC results */}
                {requests.filter(r => r.status !== 'รอตรวจ').length > 0 && (
                    <div className="card table-card" style={{ marginTop: 16 }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                            ผลตรวจจากฝ่ายผลิต
                        </h4>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>รหัสใบตรวจ</th>
                                    <th>ใบสั่งผลิต (JO)</th>
                                    <th>ผลิตภัณฑ์</th>
                                    <th>ไลน์</th>
                                    <th>วันที่ส่ง</th>
                                    <th>วันที่ตรวจ</th>
                                    <th>ผู้ตรวจ</th>
                                    <th>ผลตรวจ</th>
                                    <th>หมายเหตุ</th>
                                    <th style={{ width: 60, textAlign: 'center' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.filter(r => r.status !== 'รอตรวจ').map(req => (
                                    <tr key={req.id}>
                                        <td className="text-bold" style={{ color: '#4338ca' }}>{req.id}</td>
                                        <td className="text-bold">{req.jobOrderId}</td>
                                        <td>{req.productName || req.formulaName}</td>
                                        <td>{req.line}</td>
                                        <td>{req.requestedAt}</td>
                                        <td>{req.inspectedAt || '—'}</td>
                                        <td>{req.inspector || '—'}</td>
                                        <td><span className={`badge ${getResultBadge(req.status)}`}>{req.status}</span></td>
                                        <td>{req.notes || '—'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                <button 
                                                    onClick={() => openInspectModal(req)}
                                                    style={{ 
                                                        background: '#ffffff', border: '1px solid #e2e8f0', color: '#64748b', 
                                                        cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b'; }}
                                                    title="ดูรายละเอียด"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleViewQcPdf(e, req.taskId || req.id)}
                                                    style={{ 
                                                        background: '#ffffff', border: '1px solid #bae6fd', color: '#0284c7', 
                                                        cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.borderColor = '#7dd3fc'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#bae6fd'; }}
                                                    title="ดูเอกสาร (PDF)"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </>
        );
    };

    // ── กำหนดชื่อหน้าตาม Tab ที่เลือก ──
    const getPageTitle = () => {
        switch (activeTab) {
            case 'qc_dashboard': return 'ตรวจสอบคุณภาพ (QC)';
            case 'qc_incoming': return 'ตรวจรับวัตถุดิบ (Incoming QC)';
            case 'qc_inprocess': return 'ตรวจสอบระหว่างผลิต (In-Process QC)';
            case 'qc_final': return 'ตรวจสอบขั้นสุดท้าย (Final QC)';
            case 'qc_defect': return 'แจ้งปัญหาและของเสีย (NCR)';
            case 'qc_formula_lab': return 'QC/Lab ทดสอบสูตร';
            case 'qc_reports': return 'รายงานและการวิเคราะห์คุณภาพ';
            default: return 'ตรวจสอบคุณภาพ (QC)';
        }
    };

    const getPageDesc = () => {
        switch (activeTab) {
            case 'qc_dashboard': return 'ภาพรวมและติดตามผลการตรวจสอบคุณภาพสินค้าทั้งหมด';
            case 'qc_incoming': return 'ตรวจสอบคุณภาพวัตถุดิบและบรรจุภัณฑ์ที่รับเข้า';
            case 'qc_inprocess': return 'ตรวจสอบคุณภาพสินค้าระหว่างกระบวนการผลิต';
            case 'qc_final': return 'ตรวจสอบคุณภาพสินค้าขั้นสุดท้ายก่อนส่งเข้าคลัง';
            case 'qc_defect': return 'จัดการรายงานสินค้าที่ไม่ได้มาตรฐาน (Non-Conformance Report)';
            case 'qc_formula_lab': return 'ทดสอบสูตรผลิตภัณฑ์จาก R&D — กรอกผลตรวจ pH, สี, กลิ่น, ความหนืด แล้วส่งผลกลับ';
            case 'qc_reports': return 'สรุปและวิเคราะห์ผลการดำเนินการตรวจสอบคุณภาพ';
            default: return 'จัดการและติดตามผลการตรวจสอบคุณภาพสินค้า';
        }
    };

    return (
        <div className="page-container qc-page page-enter">
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <h1>{getPageTitle()}</h1>
                <p>{getPageDesc()}</p>
            </div>

            {/* ── Dashboard ── */}
            {(activeTab === 'qc_dashboard' && hasSubPermission('qc_dashboard')) && (
                <div className="subpage-content" key="qc_dashboard">
                    <div className="summary-row">
                        {hasSectionPermission('qc_dashboard_total') && (
                            <div className="summary-card card">
                                <div className="summary-icon">📋</div>
                                <div>
                                    <span className="summary-label">รายการตรวจทั้งหมด</span>
                                    <span className="summary-value">{totalInspections}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('qc_dashboard_passed') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#2d9e5a' }}>✓</div>
                                <div>
                                    <span className="summary-label">ผ่านการตรวจ</span>
                                    <span className="summary-value" style={{ color: '#2d9e5a' }}>{passedCount}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('qc_dashboard_failed') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#c04040' }}>✕</div>
                                <div>
                                    <span className="summary-label">ไม่ผ่านการตรวจ</span>
                                    <span className="summary-value" style={{ color: '#c04040' }}>{failedCount}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('qc_dashboard_pending') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#c67d08' }}>⏳</div>
                                <div>
                                    <span className="summary-label">รอตรวจสอบ</span>
                                    <span className="summary-value" style={{ color: '#c67d08' }}>{pendingCount}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pending requests banner on dashboard */}
                    {pendingRequests.length > 0 && (
                        <div className="qc-dashboard-alert">
                            <div className="qc-dashboard-alert-icon">🔔</div>
                            <div>
                                <strong>มีคำขอตรวจใหม่จากฝ่ายผลิต {pendingRequests.length} รายการ</strong>
                                <p>กรุณาเข้าไปตรวจที่ Tab "QC In-Process" หรือ "QC Final"</p>
                                <div className="qc-dashboard-alert-items">
                                    {pendingRequests.map(r => (
                                        <span key={r.id} className="qc-dashboard-alert-tag">
                                            {r.batchNo} — {r.productName || r.formulaName} ({r.typeLabel})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Incoming ── */}
            {(activeTab === 'qc_incoming' && hasSubPermission('qc_incoming')) && (
                <div className="subpage-content" key="qc_incoming">
                    {hasSectionPermission('qc_incoming_search') && (
                        <div className="toolbar">
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input type="text" placeholder="พิมพ์ Lot No., วัตถุดิบ..." value={searchIncoming} onChange={(e) => setSearchIncoming(e.target.value)} />
                                </div>
                                <button className="search-btn">ค้นหา</button>
                            </div>
                            {canCreate('qc_incoming') && (<button className="btn-primary">+ ตรวจรับวัตถุดิบ</button>)}
                        </div>
                    )}
                    {hasSectionPermission('qc_incoming_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr><th>รหัสอ้างอิง</th><th>วันที่</th><th>Lot Number</th><th>วัตถุดิบ</th><th>Supplier</th><th>ผู้ตรวจ</th><th>ผลตรวจ</th><th>หมายเหตุ</th></tr>
                                </thead>
                                <tbody>
                                    {filteredIncoming.map(item => (
                                        <tr key={item.id}>
                                            <td className="text-bold" style={{ color: '#475569' }}>{item.requestId}</td>
                                            <td>{item.date}</td>
                                            <td className="text-bold">{item.lotNumber}</td>
                                            <td>{item.item}</td>
                                            <td>{item.supplier}</td>
                                            <td>{item.inspector}</td>
                                            <td><span className={`badge ${getResultBadge(item.result)}`}>{item.result}</span></td>
                                            <td className="text-muted">{item.notes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── In-Process — NOW WITH PRODUCTION QC REQUESTS ── */}
            {(activeTab === 'qc_inprocess' && hasSubPermission('qc_inprocess')) && (
                <div className="subpage-content" key="qc_inprocess">
                    {/* Production QC requests */}
                    {hasSectionPermission('qc_inprocess_search') && (
                        <div className="toolbar">
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input type="text" placeholder="ค้นหาข้อมูล..." value={searchInprocess} onChange={(e) => setSearchInprocess(e.target.value)} />
                                </div>
                                <button className="search-btn">ค้นหา</button>
                            </div>
                        </div>
                    )}

                    {renderProductionQcTable(qcInprocessRequests, 'qc_inprocess')}

                </div>
            )}

            {/* ── Final — NOW WITH PRODUCTION QC REQUESTS ── */}
            {(activeTab === 'qc_final' && hasSubPermission('qc_final')) && (
                <div className="subpage-content" key="qc_final">
                    {hasSectionPermission('qc_final_search') && (
                        <div className="toolbar">
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input type="text" placeholder="ค้นหาข้อมูล..." value={searchFinal} onChange={(e) => setSearchFinal(e.target.value)} />
                                </div>
                                <button className="search-btn">ค้นหา</button>
                            </div>
                        </div>
                    )}

                    {renderProductionQcTable(qcFinalRequests, 'qc_final')}

                </div>
            )}

            {/* ── Defect / NCR ── */}
            {(activeTab === 'qc_defect' && hasSubPermission('qc_defect')) && (
                <div className="subpage-content" key="qc_defect">
                    {hasSectionPermission('qc_defect_search') && (
                        <div className="toolbar">
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input type="text" placeholder="พิมพ์ NCR No., สินค้า..." value={searchDefect} onChange={(e) => setSearchDefect(e.target.value)} />
                                </div>
                                <button className="search-btn">ค้นหา</button>
                            </div>
                            {canCreate('qc_defect') && (<button className="btn-danger">+ สร้าง NCR</button>)}
                        </div>
                    )}
                    {hasSectionPermission('qc_defect_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr><th>เลขที่ NCR</th><th>Lot อ้างอิง</th><th>สินค้า</th><th>ปัญหา</th><th>การจัดการ</th><th>สถานะ</th></tr>
                                </thead>
                                <tbody>
                                    {filteredDefect.map(item => (
                                        <tr key={item.id}>
                                            <td className="text-bold text-danger">{item.ncrNumber}</td>
                                            <td>{item.refLot}</td>
                                            <td>{item.item}</td>
                                            <td>{item.issue}</td>
                                            <td>{item.action}</td>
                                            <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── QC/Lab Formula Testing ── */}
            {(activeTab === 'qc_formula_lab' && hasSubPermission('qc_formula_lab')) && (
                <div className="subpage-content" key="qc_formula_lab">

                    {/* สูตรรอทดสอบ */}
                    {pendingFormulas.length > 0 && (
                        <div style={{ 
                            background: 'linear-gradient(to right, #fffbeb, #fef3c7)', 
                            border: '1px solid #fde68a', 
                            borderRadius: '12px', 
                            padding: '20px', 
                            marginBottom: '24px',
                            boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: '#f59e0b', color: '#fff', borderRadius: '50%', fontWeight: 'bold', fontSize: '20px', boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)' }}>!</div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#92400e' }}>
                                        สูตรที่ต้องเร่งทดสอบ ({pendingFormulas.length} รายการ)
                                    </h3>
                                    <div style={{ fontSize: '13px', color: '#b45309', marginTop: '2px' }}>
                                        โปรดบันทึกผลการทดสอบสำหรับรายการด้านล่าง
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                {pendingFormulas.map(f => (
                                    <div key={f.id} style={{ 
                                        background: '#ffffff', 
                                        border: '1px solid #fcd34d', 
                                        borderRadius: '8px', 
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '16px',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; }}
                                    onClick={() => { setTestFormData({ ...testFormData, formulaId: f.id, testedBy: testFormData.testedBy || currentUser?.name || currentUser?.username || '' }); setShowTestForm(true); }}>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#d97706', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
                                                {f.id}
                                            </div>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', lineHeight: '1.4' }}>{f.name}</div>
                                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>เวอร์ชั่น: {f.version} • หมวดหมู่: {f.category || 'ทั่วไป'}</div>
                                        </div>
                                        <button style={{ 
                                            width: '100%', 
                                            padding: '10px 0', 
                                            background: '#f59e0b', 
                                            color: '#fff', 
                                            border: 'none', 
                                            borderRadius: '6px', 
                                            fontWeight: 700,
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            gap: '8px',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#d97706'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#f59e0b'}>
                                            บันทึกผลทดสอบ
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setTestFormData({ ...testFormData, testedBy: testFormData.testedBy || currentUser?.name || currentUser?.username || '' }); setShowTestForm(true); }}><Plus size={16} /> บันทึกผลทดสอบสูตร</button>
                    </div>

                    {/* ใบทดสอบสูตร Modal */}
                    {showTestForm && (
                        <div className="rnd-modal-overlay" onClick={() => setShowTestForm(false)}>
                            <div className="rnd-modal" style={{ maxWidth: 650 }} onClick={e => e.stopPropagation()}>
                                <div className="rnd-modal-header">
                                    <h2>ใบทดสอบสูตร (Formula Test Report)</h2>
                                    <button className="rnd-modal-close" onClick={() => setShowTestForm(false)}>✕</button>
                                </div>
                                <div className="rnd-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                                    <div className="rnd-modal-info-grid">
                                        <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                            <label>สูตรที่ทดสอบ <span style={{ color: '#ef4444' }}>*</span></label>
                                            <CustomSelect style={fmtInput} value={testFormData.formulaId} onChange={e => setTestFormData({ ...testFormData, formulaId: e.target.value })}>
                                                <option value="">-- เลือกสูตร --</option>
                                                {formulas.filter(f => f.status === 'รอทดสอบ' || f.status === 'ร่าง' || f.status === 'ทดสอบไม่ผ่าน').map(f => (
                                                    <option key={f.id} value={f.id}>{f.id} — {f.name} [{f.status}]</option>
                                                ))}
                                            </CustomSelect>
                                        </div>
                                        {testFormData.formulaId && (() => {
                                            const f = formulas.find(formula => formula.id === testFormData.formulaId);
                                            if (!f) return null;
                                            return (
                                                <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                                                    <h4 style={{ margin: '0 0 12px 0', color: '#334155', fontSize: '15px' }}>รายละเอียดสูตร: {f.name} (v{f.version})</h4>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px', fontSize: '13px' }}>
                                                        <div><span style={{ color: '#64748b' }}>ขนาดต่อ Batch:</span> <strong style={{ color: '#0f172a' }}>{f.ingredients?.length ? formatDynamicBatchSize(f.ingredients) : `${f.batchSize?.toLocaleString(undefined, { maximumFractionDigits: 1 })} กิโลกรัม`}</strong></div>
                                                        <div><span style={{ color: '#64748b' }}>ปริมาณบรรจุต่อชิ้น:</span> <strong style={{ color: '#0f172a' }}>{f.unitSize || '-'}</strong></div>
                                                        <div><span style={{ color: '#64748b' }}>อายุการเก็บ:</span> <strong style={{ color: '#0f172a' }}>{f.shelfLife || '-'}</strong></div>
                                                    </div>
                                                    
                                                    {(() => {
                                                        const activeIngredients = f.ingredients?.filter(ing => ing.type !== 'packaging') || [];
                                                        if (activeIngredients.length === 0) return null;
                                                        return (
                                                            <div style={{ marginBottom: '16px' }}>
                                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>วัตถุดิบ ({activeIngredients.length} รายการ)</div>
                                                                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                                                                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                                                        <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                                                                            <tr>
                                                                                <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>ชื่อวัตถุดิบ</th>
                                                                                <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>ปริมาณ</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {activeIngredients.map((ing, idx) => (
                                                                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                                    <td style={{ padding: '6px 8px' }} dangerouslySetInnerHTML={{ __html: ing.name || ing.materialId }} />
                                                                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500 }}>{ing.qty} {ing.unit}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {(() => {
                                                        const validInstructions = f.instructions?.filter(s => s.trim() !== '') || [];
                                                        return (
                                                            <div>
                                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>วิธีการผลิต</div>
                                                                {validInstructions.length > 0 ? (
                                                                    <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155' }}>
                                                                        {validInstructions.map((step, idx) => <li key={idx} style={{ marginBottom: '4px' }}>{step}</li>)}
                                                                    </ol>
                                                                ) : (
                                                                    <div style={{ fontSize: '13px', color: '#64748b' }}>-</div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        })()}
                                        <div className="rnd-modal-info-item">
                                            <label>ผู้ทดสอบ</label>
                                            <input type="text" style={fmtInput} value={testFormData.testedBy} onChange={e => setTestFormData({ ...testFormData, testedBy: e.target.value })} placeholder="ชื่อผู้ทดสอบ" />
                                        </div>
                                        <div className="rnd-modal-info-item">
                                            <label>ค่า pH</label>
                                            <input type="text" style={fmtInput} value={testFormData.pH} onChange={e => setTestFormData({ ...testFormData, pH: e.target.value })} placeholder="เช่น 5.5" />
                                        </div>
                                        <div className="rnd-modal-info-item">
                                            <label>ความหนืด (Viscosity)</label>
                                            <input type="text" style={fmtInput} value={testFormData.viscosity} onChange={e => setTestFormData({ ...testFormData, viscosity: e.target.value })} placeholder="เช่น 2500 cP" />
                                        </div>
                                        <div className="rnd-modal-info-item">
                                            <label>สี (Color)</label>
                                            <input type="text" style={fmtInput} value={testFormData.color} onChange={e => setTestFormData({ ...testFormData, color: e.target.value })} placeholder="เช่น ขาวนวล" />
                                        </div>
                                        <div className="rnd-modal-info-item">
                                            <label>กลิ่น (Smell)</label>
                                            <input type="text" style={fmtInput} value={testFormData.smell} onChange={e => setTestFormData({ ...testFormData, smell: e.target.value })} placeholder="เช่น หอมอ่อน" />
                                        </div>
                                        <div className="rnd-modal-info-item">
                                            <label>ความคงตัว (Stability)</label>
                                            <input type="text" style={fmtInput} value={testFormData.stability} onChange={e => setTestFormData({ ...testFormData, stability: e.target.value })} placeholder="เช่น คงตัวดี 3 เดือน" />
                                        </div>
                                        <div className="rnd-modal-info-item">
                                            <label>จุลินทรีย์ (Microbial)</label>
                                            <input type="text" style={fmtInput} value={testFormData.microbial} onChange={e => setTestFormData({ ...testFormData, microbial: e.target.value })} placeholder="เช่น ไม่พบ" />
                                        </div>
                                        <div className="rnd-modal-info-item">
                                            <label>ผลรวม <span style={{ color: '#ef4444' }}>*</span></label>
                                            <CustomSelect style={fmtInput} value={testFormData.overallResult} onChange={e => setTestFormData({ ...testFormData, overallResult: e.target.value })}>
                                                <option value="">-- เลือกผล --</option>
                                                <option value="ผ่าน">✅ ผ่าน</option>
                                                <option value="ไม่ผ่าน">❌ ไม่ผ่าน</option>
                                            </CustomSelect>
                                        </div>
                                        <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                            <label>หมายเหตุ / รายละเอียดเพิ่มเติม</label>
                                            <textarea rows={3} style={{ ...fmtInput, resize: 'vertical' }} value={testFormData.notes} onChange={e => setTestFormData({ ...testFormData, notes: e.target.value })} placeholder="รายละเอียดผลทดสอบ..." />
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
                                    <button className="btn-secondary" onClick={() => setShowTestForm(false)}>ยกเลิก</button>
                                    <button className="btn-primary" onClick={handleSubmitTest} disabled={testSaving}>{testSaving ? 'กำลังบันทึก...' : '✅ บันทึกผลทดสอบ'}</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ตารางผลทดสอบที่ผ่านมา */}
                    <div className="card table-card">
                        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>ประวัติผลทดสอบสูตร ({formulaTests.length})</h3>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>สูตร</th><th>ชื่อสูตร</th><th>วันที่</th><th>ผู้ทดสอบ</th>
                                    <th>pH</th><th>สี</th><th>กลิ่น</th><th>Microbial</th><th>ผลรวม</th><th>เอกสาร</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formulaTests.map(t => (
                                    <tr key={t.id}>
                                        <td className="text-bold">{t.formulaId}</td>
                                        <td>{t.productName || t.formulaName}</td>
                                        <td>{t.testDate}</td>
                                        <td>{t.testedBy}</td>
                                        <td>{t.pH}</td>
                                        <td>{t.color}</td>
                                        <td>{t.smell}</td>
                                        <td>{t.microbial}</td>
                                        <td><span className={`badge ${t.overallResult === 'ผ่าน' ? 'badge-success' : 'badge-danger'}`}>{t.overallResult}</span></td>
                                        <td>
                                            <button className="btn-sm btn-secondary" onClick={() => handlePrintQcReport(t)} title="พิมพ์ใบรายงานผล" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileText size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {formulaTests.length === 0 && (
                                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ยังไม่มีผลทดสอบ</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Reports ── */}
            {(activeTab === 'qc_reports' && hasSubPermission('qc_reports')) && (
                <div className="subpage-content" key="qc_reports">
                    {hasSectionPermission('qc_reports_list') && (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                            <h3>รายงานและการวิเคราะห์คุณภาพ</h3>
                            <p className="text-muted" style={{ marginTop: '0.5rem' }}>
                                สามารถดึงรายงานสรุป (Monthly / Yearly QC Report) จากส่วนนี้
                            </p>
                            {canCreate('qc_reports') && (<button className="btn-primary" style={{ marginTop: '1.5rem' }}>สร้างรายงานใหม่</button>)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const fmtInput = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 };

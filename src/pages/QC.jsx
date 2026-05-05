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
import './PageCommon.css';
import './QC.css';

export default function QC() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const { qcRequests, submitQcResult, getPendingQcRequests } = useProduction();
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
        formulaId: '', testedBy: '', pH: '', viscosity: '', color: '', smell: '', stability: '', microbial: '', overallResult: '', notes: ''
    });
    const [testSaving, setTestSaving] = useState(false);

    const pendingFormulas = formulas.filter(f => f.status === 'รอทดสอบ');

    const loadFormulaTests = useCallback(async () => {
        const data = await fetchFormulaTests();
        setFormulaTests(data);
    }, [fetchFormulaTests]);

    const handleSubmitTest = async () => {
        if (!testFormData.formulaId || !testFormData.overallResult) return alert('กรุณาเลือกสูตรและระบุผลทดสอบ');
        setTestSaving(true);
        const res = await submitFormulaTest(testFormData);
        setTestSaving(false);
        if (res.success) {
            alert('บันทึกผลทดสอบสำเร็จ!');
            setShowTestForm(false);
            setTestFormData({ formulaId: '', testedBy: '', pH: '', viscosity: '', color: '', smell: '', stability: '', microbial: '', overallResult: '', notes: '' });
            loadFormulaTests();
        } else alert('เกิดข้อผิดพลาด');
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

    const openInspectModal = async (req) => {
        setInspectingRequest(req);
        setInspectNotes('');
        setLoadingCriteria(true);
        // fetch criteria
        try {
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
        } catch (err) {
            console.error('Failed to load QC criteria', err);
        } finally {
            setLoadingCriteria(false);
        }
    };

    const handleInspectSubmit = (finalResult, disposition = null) => {
        if (!inspectingRequest) return;
        submitQcResult(inspectingRequest.id, finalResult, 'qc_user', inspectNotes, checklistData, disposition);
        setInspectingRequest(null);
        setChecklistData([]);
        setInspectNotes('');
        setRejectDialog({ open: false, request: null });
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
                                        <div>
                                            <span className="qc-pending-batch">{req.batchNo}</span>
                                            <span className="qc-pending-jo">← {req.jobOrderId}</span>
                                        </div>
                                        <span className="badge badge-warning">⏳ รอตรวจ</span>
                                    </div>
                                    <div className="qc-pending-product">{req.formulaName}</div>
                                    <div className="qc-pending-meta">
                                        <span>📅 ส่ง: {req.requestedAt}</span>
                                        <span>🏭 {req.line}</span>
                                    </div>
                                    
                                    <div className="qc-pending-actions">
                                        <button className="qc-btn qc-btn-inspect" onClick={() => openInspectModal(req)}>
                                            🔍 ตรวจสอบคุณภาพ
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Inspect Modal Overlay */}
                {inspectingRequest && inspectingRequest.type === type && (
                    <div className="pkg-modal-overlay" onClick={() => setInspectingRequest(null)}>
                        <div className="pkg-modal" style={{ maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🔍 แบบฟอร์มตรวจ QC ({inspectingRequest.type === 'qc_inprocess' ? 'In-Process' : 'Final'})</h2>
                                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
                                    {inspectingRequest.batchNo} — {inspectingRequest.formulaName}
                                </p>
                            </div>
                            
                            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                                {loadingCriteria ? (
                                    <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>กำลังโหลดเกณฑ์มาตรฐาน...</div>
                                ) : (
                                    <div className="qc-checklist-container">
                                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            📋 รายการที่ต้องตรวจสอบ (มาตรฐาน)
                                        </h3>
                                        
                                        {checklistData.length === 0 ? (
                                            <p style={{ color: '#94a3b8', fontSize: 14 }}>ไม่มีหัวข้อตรวจแบบเฉพาะเจาะจง (ใช้การประเมินทั่วไป)</p>
                                        ) : (
                                            <table className="data-table" style={{ marginBottom: 20 }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: 60, textAlign: 'center' }}>ผ่าน</th>
                                                        <th>หัวข้อที่ตรวจ</th>
                                                        <th>เกณฑ์อ้างอิง Spec</th>
                                                        <th>ค่าที่วัดได้จริง (Optional)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {checklistData.map((item) => (
                                                        <tr key={item.CriteriaID} style={{ background: item.IsPass ? 'transparent' : '#fef2f2' }}>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={item.IsPass}
                                                                    onChange={(e) => handleChecklistChange(item.CriteriaID, 'IsPass', e.target.checked)}
                                                                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: item.IsPass ? '#16a34a' : 'initial' }}
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
                                                                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}

                                        <div style={{ marginTop: 20 }}>
                                            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>หมายเหตุรวม (ข้อติชม/สรุปผล):</label>
                                            <textarea 
                                                rows={3} 
                                                value={inspectNotes}
                                                onChange={e => setInspectNotes(e.target.value)}
                                                placeholder="ความเห็นจากเจ้าหน้าที่ QC..."
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, resize: 'vertical' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                                <button className="btn-secondary" onClick={() => setInspectingRequest(null)}>ยกเลิก</button>
                                <button className="btn-danger" onClick={handleRejectClick}>
                                    ❌ ไม่ผ่าน
                                </button>
                                <button className="btn-primary" onClick={() => handleInspectSubmit('ผ่าน')}>
                                    ✅ ผ่าน QC (Approve)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Reject Disposition Dialog ── */}
                {rejectDialog.open && (
                    <div className="pkg-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setRejectDialog({ open: false, request: null })}>
                        <div className="pkg-modal" style={{ maxWidth: 520, borderTop: '4px solid var(--danger)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
                                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#dc2626' }}>⚠️ QC ไม่ผ่าน — เลือกวิธีจัดการ</h2>
                                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
                                    {rejectDialog.request?.batchNo} — {rejectDialog.request?.formulaName}
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
                                    <th>Batch No.</th>
                                    <th>ใบสั่งผลิต</th>
                                    <th>ผลิตภัณฑ์</th>
                                    <th>ไลน์</th>
                                    <th>วันที่ส่ง</th>
                                    <th>วันที่ตรวจ</th>
                                    <th>ผู้ตรวจ</th>
                                    <th>ผลตรวจ</th>
                                    <th>หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.filter(r => r.status !== 'รอตรวจ').map(req => (
                                    <tr key={req.id}>
                                        <td className="text-bold">{req.batchNo}</td>
                                        <td><span className="op-jo-ref">{req.jobOrderId}</span></td>
                                        <td>{req.formulaName}</td>
                                        <td>{req.line}</td>
                                        <td>{req.requestedAt}</td>
                                        <td>{req.inspectedAt || '—'}</td>
                                        <td>{req.inspector || '—'}</td>
                                        <td><span className={`badge ${getResultBadge(req.status)}`}>{req.status}</span></td>
                                        <td>{req.notes || '—'}</td>
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
            case 'qc_formula_lab': return '🧪 QC/Lab ทดสอบสูตร';
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
                                            {r.batchNo} — {r.formulaName} ({r.typeLabel})
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
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input type="text" placeholder="พิมพ์ Lot No., วัตถุดิบ..." value={searchIncoming} onChange={(e) => setSearchIncoming(e.target.value)} />
                            </div>
                            <button className="btn-primary">+ ตรวจรับวัตถุดิบ</button>
                        </div>
                    )}
                    {hasSectionPermission('qc_incoming_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr><th>วันที่</th><th>Lot Number</th><th>วัตถุดิบ</th><th>Supplier</th><th>ผู้ตรวจ</th><th>ผลตรวจ</th><th>หมายเหตุ</th></tr>
                                </thead>
                                <tbody>
                                    {filteredIncoming.map(item => (
                                        <tr key={item.id}>
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
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input type="text" placeholder="ค้นหาข้อมูล..." value={searchInprocess} onChange={(e) => setSearchInprocess(e.target.value)} />
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
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input type="text" placeholder="ค้นหาข้อมูล..." value={searchFinal} onChange={(e) => setSearchFinal(e.target.value)} />
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
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input type="text" placeholder="พิมพ์ NCR No., สินค้า..." value={searchDefect} onChange={(e) => setSearchDefect(e.target.value)} />
                            </div>
                            <button className="btn-danger">+ สร้าง NCR</button>
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
                        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #f59e0b' }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#92400e' }}>⏳ สูตรรอทดสอบ ({pendingFormulas.length})</h3>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {pendingFormulas.map(f => (
                                    <button key={f.id} className="btn-sm" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
                                        onClick={() => { setTestFormData({ ...testFormData, formulaId: f.id }); setShowTestForm(true); }}>
                                        🧪 {f.id} — {f.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <button className="btn-primary" onClick={() => setShowTestForm(true)}>➕ บันทึกผลทดสอบสูตร</button>
                    </div>

                    {/* ใบทดสอบสูตร Modal */}
                    {showTestForm && (
                        <div className="rnd-modal-overlay" onClick={() => setShowTestForm(false)}>
                            <div className="rnd-modal" style={{ maxWidth: 650 }} onClick={e => e.stopPropagation()}>
                                <div className="rnd-modal-header">
                                    <h2>📋 ใบทดสอบสูตร (Formula Test Report)</h2>
                                    <button className="rnd-modal-close" onClick={() => setShowTestForm(false)}>✕</button>
                                </div>
                                <div className="rnd-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                                    <div className="rnd-modal-info-grid">
                                        <div className="rnd-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                            <label>สูตรที่ทดสอบ <span style={{ color: '#ef4444' }}>*</span></label>
                                            <select style={fmtInput} value={testFormData.formulaId} onChange={e => setTestFormData({ ...testFormData, formulaId: e.target.value })}>
                                                <option value="">-- เลือกสูตร --</option>
                                                {formulas.filter(f => f.status === 'รอทดสอบ' || f.status === 'ร่าง' || f.status === 'ทดสอบไม่ผ่าน').map(f => (
                                                    <option key={f.id} value={f.id}>{f.id} — {f.name} [{f.status}]</option>
                                                ))}
                                            </select>
                                        </div>
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
                                            <select style={fmtInput} value={testFormData.overallResult} onChange={e => setTestFormData({ ...testFormData, overallResult: e.target.value })}>
                                                <option value="">-- เลือกผล --</option>
                                                <option value="ผ่าน">✅ ผ่าน</option>
                                                <option value="ไม่ผ่าน">❌ ไม่ผ่าน</option>
                                            </select>
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
                        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>📊 ประวัติผลทดสอบสูตร ({formulaTests.length})</h3>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>สูตร</th><th>ชื่อสูตร</th><th>วันที่</th><th>ผู้ทดสอบ</th>
                                    <th>pH</th><th>สี</th><th>กลิ่น</th><th>Microbial</th><th>ผลรวม</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formulaTests.map(t => (
                                    <tr key={t.id}>
                                        <td className="text-bold">{t.formulaId}</td>
                                        <td>{t.formulaName}</td>
                                        <td>{t.testDate}</td>
                                        <td>{t.testedBy}</td>
                                        <td>{t.pH}</td>
                                        <td>{t.color}</td>
                                        <td>{t.smell}</td>
                                        <td>{t.microbial}</td>
                                        <td><span className={`badge ${t.overallResult === 'ผ่าน' ? 'badge-success' : 'badge-danger'}`}>{t.overallResult}</span></td>
                                    </tr>
                                ))}
                                {formulaTests.length === 0 && (
                                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ยังไม่มีผลทดสอบ</td></tr>
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
                            <button className="btn-primary" style={{ marginTop: '1.5rem' }}>สร้างรายงานใหม่</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const fmtInput = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14 };

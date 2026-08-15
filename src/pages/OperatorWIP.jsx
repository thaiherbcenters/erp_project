import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Warehouse, Save, ArrowLeft, Package, CheckCircle, SearchCheck, XCircle, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import { useRnD } from '../context/RnDContext';
import { useProduction } from '../context/ProductionContext';
import CustomSelect from '../components/CustomSelect';
import { getDynamicBatchSizeValue, convertToBase } from '../utils/formatters';

const API_BASE = 'http://localhost:5000/api';

const OperatorWIP = () => {
    const { user, canCreate } = useAuth();
    const { showAlert } = useAlert();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Hooks from Contexts
    const { formulas: MOCK_FORMULAS, materials: MOCK_RAW_MATERIALS, pmMaterials } = useRnD();
    const { sendQcRequest, tasks } = useProduction();
    
    // State
    const [loading, setLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    
    const wipTasks = useMemo(() => {
        if (!tasks) return [];
        return tasks.filter(t => t.batchNo && t.batchNo.includes('-WIP')).reverse();
    }, [tasks]);
    const [formData, setFormData] = useState({
        formulaName: '',
        expectedQty: '',
        unit: 'กรัม'
    });
    const [fromTask, setFromTask] = useState(false); // true when navigated from production page
    const [sourceJobOrderId, setSourceJobOrderId] = useState('');
    const [checkedItems, setCheckedItems] = useState({});
    const [isMixing, setIsMixing] = useState(false);

    // Filter only approved formulas
    const approvedFormulas = useMemo(() => {
        return (MOCK_FORMULAS || []).filter(f => f.status === 'อนุมัติ');
    }, [MOCK_FORMULAS]);

    // taskCalc holds the production task's qty/unit for ingredient scaling (e.g. 20 ชิ้น)
    const [taskCalc, setTaskCalc] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const formula = params.get('formula');
        const wipQty = params.get('wipQty');      // WIP weight to display (e.g. 7.094)
        const wipUnit = params.get('wipUnit');     // WIP unit to display (e.g. กรัม)
        const taskQty = params.get('taskQty');     // Task qty for scaling (e.g. 20)
        const taskUnit = params.get('taskUnit');   // Task unit for scaling (e.g. ชิ้น)
        const jobOrderId = params.get('jobOrderId');
        
        // Legacy support: old URL format with qty/unit
        const legacyQty = params.get('qty');
        const legacyUnit = params.get('unit');
        
        let initialFormula = formula;
        if (!initialFormula && approvedFormulas.length > 0) {
            initialFormula = approvedFormulas[0].name;
        }

        // Display value: use wipQty/wipUnit (the actual WIP weight), fallback to legacy
        const displayQty = wipQty || legacyQty || '';
        const displayUnit = (wipUnit || legacyUnit || '').replace(/,/g, '').trim() || 'กรัม';

        setFormData(prev => ({ 
            ...prev, 
            formulaName: initialFormula || '',
            expectedQty: displayQty,
            unit: displayUnit
        }));
        
        // If we have task-level scaling data, store it separately
        if (taskQty && taskUnit) {
            setTaskCalc({
                qty: parseFloat(taskQty),
                unit: decodeURIComponent(taskUnit).replace(/,/g, '').trim()
            });
        }
        
        // If we got data from URL, mark it as from-task
        if (formula && (wipQty || legacyQty)) {
            setFromTask(true);
        }
        if (jobOrderId) {
            setSourceJobOrderId(jobOrderId);
        }
    }, [location.search, approvedFormulas]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Calculate Ingredients dynamically
    const selectedFormulaData = useMemo(() => {
        return approvedFormulas.find(f => f.name === formData.formulaName || f.id === formData.formulaName);
    }, [formData.formulaName, approvedFormulas]);

    // Only auto-set unit from formula if NOT from a production task
    useEffect(() => {
        if (!fromTask && selectedFormulaData && selectedFormulaData.unit) {
            setFormData(prev => ({ ...prev, unit: selectedFormulaData.unit }));
        }
    }, [selectedFormulaData, fromTask]);

    const { rawMaterials, scaleFactor, targetWeight, isStandard, scaleLabel, actualFormulaBase } = useMemo(() => {
        if (!selectedFormulaData || (!formData.expectedQty && !taskCalc)) {
            return { rawMaterials: [], scaleFactor: 1, targetWeight: 0, isStandard: true, scaleLabel: '', actualFormulaBase: 1 };
        }
        
        // If we have taskCalc data from the production page, use it for scaling
        // Otherwise, use the form data directly
        let calcQty, calcUnit;
        if (taskCalc) {
            calcQty = taskCalc.qty;
            calcUnit = taskCalc.unit;
        } else {
            calcQty = parseFloat(formData.expectedQty) || 0;
            calcUnit = formData.unit;
        }
        
        let convertedTargetWt = calcQty;
        
        // If not piece unit, convert target to base unit (grams/ml) for calculation
        const isPieceUnit = ['ชิ้น', 'กระปุก', 'ขวด', 'กล่อง', 'หลอด', 'ดวง', 'ม้วน'].includes(calcUnit);
        if (selectedFormulaData && isPieceUnit && selectedFormulaData.unitSize && selectedFormulaData.unitSize > 0) {
            convertedTargetWt = calcQty * selectedFormulaData.unitSize;
        } else if (!isPieceUnit && calcUnit) {
            convertedTargetWt = convertToBase(calcQty, calcUnit);
        }

        const actualBase = getDynamicBatchSizeValue(selectedFormulaData.ingredients) || convertToBase(selectedFormulaData.batchSize, selectedFormulaData.unit) || 1;
        const scaleFact = convertedTargetWt / actualBase;
        
        const isStd = Math.abs(convertedTargetWt - actualBase) < 0.1;
        const displayQty = taskCalc ? `${taskCalc.qty.toLocaleString()} ${taskCalc.unit}` : `${(parseFloat(formData.expectedQty) || 0).toLocaleString()} ${formData.unit}`;
        const label = isStd 
            ? `คำนวณจากสูตร (1 Batch)` 
            : `สเกลตามยอดเป้าหมาย ${displayQty} (${(scaleFact * 100).toFixed(2)}% ของสูตรหลัก)`;

        const rawMats = selectedFormulaData.ingredients.filter(i => i.type !== 'packaging');
        
        return { 
            rawMaterials: rawMats, 
            scaleFactor: scaleFact, 
            targetWeight: convertedTargetWt, 
            isStandard: isStd, 
            scaleLabel: label,
            actualFormulaBase: actualBase
        };
    }, [selectedFormulaData, formData.expectedQty, formData.unit]);

    const handleCheckItem = (idx) => {
        setCheckedItems(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    const allChecked = useMemo(() => {
        if (!rawMaterials || rawMaterials.length === 0) return false;
        return rawMaterials.every((_, idx) => checkedItems[idx]);
    }, [rawMaterials, checkedItems]);

    const handleCheckAll = () => {
        if (allChecked) {
            setCheckedItems({});
        } else {
            const newChecked = {};
            rawMaterials.forEach((_, idx) => {
                newChecked[idx] = true;
            });
            setCheckedItems(newChecked);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.expectedQty || parseFloat(formData.expectedQty) <= 0) {
            showAlert('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนที่ต้องการผลิต', 'warning');
            return;
        }
        if (!allChecked) {
            showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณาติ๊กเตรียมวัตถุดิบให้ครบถ้วนก่อนบันทึกการผลิต', 'warning');
            return;
        }

        setLoading(true);
        try {
            // 1. Create WIP Task
            const res = await fetch(`${API_BASE}/production/tasks/wip`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    formulaName: selectedFormulaData ? selectedFormulaData.name : formData.formulaName,
                    expectedQty: parseFloat(formData.expectedQty),
                    unit: formData.unit
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error creating WIP task');
            }

            const { taskId } = await res.json();

            // 2. Advance Status to QC In-Process directly!
            const advanceRes = await fetch(`${API_BASE}/production/tasks/${taskId}/advance`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    currentStep: 'qc_inprocess',
                    status: 'รอตรวจ QC',
                    stepTimes: [] // We skip prepare and production steps
                })
            });

            if (!advanceRes.ok) {
                console.error("Failed to advance task status, but task was created.");
            }

            // 3. Send QC Request automatically
            // We use the context function sendQcRequest. We need to format the task object for it.
            const taskObjForQc = {
                id: taskId,
                formulaName: formData.formulaName,
                batchNo: `B260815-WIP`, // Note: Backend created a real one, but this is just for QC request mock
                currentStep: 'qc_inprocess'
            };
            await sendQcRequest(taskObjForQc, 'qc_inprocess');

            showAlert('สำเร็จ', 'บันทึกการผลิต WIP และส่งคำขอ QC เรียบร้อยแล้ว', 'success');
            
            // Clear form and reset checkboxes
            setFormData(prev => ({ ...prev, expectedQty: '' }));
            setCheckedItems({});
            
            // Redirect back if came from production task
            if (fromTask) {
                setTimeout(() => {
                    navigate('/operator');
                }, 1500);
            }
            
        } catch (err) {
            console.error('Submit error:', err);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกได้: ' + err.message, 'error');
        } finally {
            setLoading(false);
            setIsMixing(false);
        }
    };

    if (!canCreate('operator_wip')) {
        return (
            <div className="page-container" style={{ padding: 24, display: 'flex', justifyContent: 'center', marginTop: 40 }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <XCircle size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                    <h4>ไม่มีสิทธิ์เข้าถึงหน้านี้</h4>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ padding: '32px 40px', width: '100%', fontFamily: 'Inter, "Noto Sans Thai", sans-serif', boxSizing: 'border-box', minHeight: '100vh', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <h2 style={{ margin: 0, fontSize: 24, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800 }}>
                    <div style={{ padding: 10, background: '#e0f2fe', borderRadius: 10, color: '#0284c7', display: 'flex', boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.2)' }}>
                        <Warehouse size={28} />
                    </div>
                    สถานีผลิตสินค้ากึ่งสำเร็จรูป (WIP Workstation)
                </h2>
                <button 
                    onClick={() => setShowHistory(!showHistory)}
                    style={{ background: showHistory ? '#f1f5f9' : '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#475569', fontWeight: 600, transition: 'all 0.2s' }}
                >
                    <History size={18} />
                    {showHistory ? 'ซ่อนประวัติ' : 'ดูประวัติการผสม WIP'}
                </button>
            </div>

            {showHistory && (
                <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#1e293b' }}>ประวัติการผสม WIP (ล่าสุด)</h3>
                    {wipTasks.length === 0 ? (
                        <p style={{ color: '#64748b' }}>ยังไม่มีประวัติการทำ WIP</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: 12, color: '#475569', fontSize: 13, width: 150 }}>เลข Lot / Batch</th>
                                        <th style={{ padding: 12, color: '#475569', fontSize: 13 }}>สูตรที่ผสม</th>
                                        <th style={{ padding: 12, color: '#475569', fontSize: 13, width: 120 }}>จำนวน</th>
                                        <th style={{ padding: 12, color: '#475569', fontSize: 13, width: 120 }}>สถานะ</th>
                                        <th style={{ padding: 12, color: '#475569', fontSize: 13, width: 150 }}>รหัสใบสั่งผลิต</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wipTasks.map((t, i) => (
                                        <tr key={t.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: 12, fontWeight: 700, color: '#0369a1' }}>{t.batchNo}</td>
                                            <td style={{ padding: 12, color: '#1e293b', fontWeight: 500 }}>{t.formulaName}</td>
                                            <td style={{ padding: 12, color: '#475569' }}>{(t.expectedQty || 0).toLocaleString()} {t.unit || t.jobUnit || 'กรัม'}</td>
                                            <td style={{ padding: 12 }}>
                                                <span style={{ 
                                                    padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                                    background: t.status?.includes('QC') ? '#fef3c7' : t.status?.includes('เสร็จ') ? '#dcfce3' : '#f1f5f9',
                                                    color: t.status?.includes('QC') ? '#d97706' : t.status?.includes('เสร็จ') ? '#166534' : '#475569'
                                                }}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: 12, color: '#94a3b8', fontSize: 13 }}>{t.jobOrderId || t.id}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24, alignItems: 'start' }}>
                
                {/* LEFT COLUMN: FORM */}
                <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                    {fromTask && sourceJobOrderId && (
                        <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderLeft: '4px solid #3b82f6', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Package size={16} />
                            <span>ข้อมูลจากใบสั่งผลิต <strong>{sourceJobOrderId}</strong> — สูตร จำนวน หน่วย ถูกตั้งค่าจากระบบผลิตหลักแล้ว</span>
                        </div>
                    )}
                    <h3 style={{ margin: '0 0 24px 0', fontSize: 18, color: '#1e293b', fontWeight: 700, borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
                        1. ตั้งค่าการผลิต
                    </h3>
                    
                    <form style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>สูตรที่ต้องการผลิต <span style={{color: '#ef4444'}}>*</span></label>
                            <CustomSelect 
                                name="formulaName" 
                                value={formData.formulaName} 
                                onChange={(val) => { setFormData(prev => ({ ...prev, formulaName: val })); setCheckedItems({}); }}
                                style={{ 
                                    padding: '12px 14px', borderRadius: 8, border: '1px solid #cbd5e1', 
                                    fontSize: 14, color: '#334155', backgroundColor: '#f8fafc', width: '100%'
                                }}
                            >
                                {approvedFormulas.map(item => (
                                    <option key={item.id} value={item.name}>
                                        {item.name}
                                    </option>
                                ))}
                            </CustomSelect>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>จำนวนที่ผลิต <span style={{color: '#ef4444'}}>*</span></label>
                                <input 
                                    type="number" 
                                    name="expectedQty"
                                    value={formData.expectedQty} 
                                    onChange={handleChange}
                                    placeholder="ระบุตัวเลข เช่น 1000"
                                    step="any"
                                    min="0"
                                    style={{ 
                                        padding: '12px 14px', borderRadius: 8, border: '1px solid #cbd5e1', 
                                        fontSize: 15, color: '#334155', outline: 'none', transition: 'border-color 0.2s', fontWeight: 600
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>หน่วย</label>
                                <CustomSelect 
                                    name="unit" 
                                    value={formData.unit} 
                                    onChange={(val) => setFormData(prev => ({ ...prev, unit: val }))}
                                    style={{ 
                                        padding: '12px 14px', borderRadius: 8, border: '1px solid #cbd5e1', 
                                        fontSize: 14, color: '#334155', backgroundColor: '#f8fafc', width: '100%'
                                    }}
                                >
                                    <option value="ชิ้น">ชิ้น (pcs)</option>
                                    <option value="ขวด">ขวด (bottles)</option>
                                    <option value="กระปุก">กระปุก (jars)</option>
                                    <option value="หลอด">หลอด (tubes)</option>
                                    <option value="กล่อง">กล่อง (boxes)</option>
                                    <option value="กรัม">กรัม (g)</option>
                                    <option value="กิโลกรัม">กิโลกรัม (kg)</option>
                                    <option value="มิลลิลิตร">มิลลิลิตร (ml)</option>
                                    <option value="ลิตร">ลิตร (L)</option>
                                    {selectedFormulaData?.unit && !['ชิ้น', 'ขวด', 'กระปุก', 'หลอด', 'กล่อง', 'กรัม', 'กิโลกรัม', 'มิลลิลิตร', 'ลิตร'].includes(selectedFormulaData.unit) && (
                                        <option value={selectedFormulaData.unit}>{selectedFormulaData.unit}</option>
                                    )}
                                </CustomSelect>
                            </div>
                        </div>

                        <div style={{ background: '#f0f9ff', padding: 16, borderRadius: 12, border: '1px solid #bae6fd', display: 'flex', gap: 12, marginTop: 8 }}>
                            <div style={{ color: '#0284c7' }}>
                                <SearchCheck size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: 14, color: '#0369a1', fontWeight: 700 }}>ขั้นตอนการทำงานแบบใหม่ (One-Page)</h4>
                                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#0c4a6e', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <li>ระบุสูตรและจำนวนด้านซ้าย</li>
                                    <li>เตรียมวัตถุดิบและผสมตามตารางด้านขวา</li>
                                    <li>ติ๊กยืนยันครบทุกรายการ แล้วกดบันทึก</li>
                                    <li>ระบบจะสร้างงานและส่งให้ QC อัตโนมัติ</li>
                                </ul>
                            </div>
                        </div>
                    </form>
                </div>

                {/* RIGHT COLUMN: CHECKLIST */}
                <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: 18, color: '#1e293b', fontWeight: 700, borderBottom: '2px solid #e2e8f0', paddingBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>2. วัตถุดิบที่ต้องผสม</span>
                        {formData.expectedQty && (
                            <span style={{ fontSize: 13, background: '#e2e8f0', padding: '4px 10px', borderRadius: 20, color: '#475569', fontWeight: 500 }}>
                                {scaleLabel}
                            </span>
                        )}
                    </h3>

                    {!selectedFormulaData || !formData.expectedQty ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                            <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <p style={{ fontSize: 15, margin: 0 }}>กรุณาเลือกสูตรและระบุจำนวนผลิต<br/>เพื่อดูตารางวัตถุดิบ</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            
                            {rawMaterials.length === 0 ? (
                                <div style={{ padding: 24, textAlign: 'center', color: '#64748b', background: '#f1f5f9', borderRadius: 8 }}>
                                    ไม่มีข้อมูลวัตถุดิบในสูตรนี้
                                </div>
                            ) : isMixing ? (
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc' }}>
                                    <img src="/3d-mixing-pot.jpg" alt="Mixing" style={{ width: 280, height: 280, objectFit: 'contain', mixBlendMode: 'multiply', animation: 'pulse-slow 2s infinite ease-in-out' }} />
                                    <h4 style={{ marginTop: 24, color: '#0369a1', fontSize: 20, fontWeight: 700 }}>กำลังปั่นผสมวัตถุดิบ...</h4>
                                    <div style={{ marginTop: 12, width: '100%', maxWidth: 300, height: 8, background: '#e0f2fe', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: '100%', background: '#0284c7', animation: 'progress-infinite 1.5s ease-in-out infinite' }} />
                                    </div>
                                    <style>{`
                                        @keyframes progress-infinite {
                                            0% { transform: translateX(-100%); }
                                            100% { transform: translateX(100%); }
                                        }
                                        @keyframes pulse-slow {
                                            0% { transform: scale(1); }
                                            50% { transform: scale(1.02); }
                                            100% { transform: scale(1); }
                                        }
                                    `}</style>
                                </div>
                            ) : (
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', margin: 0, border: 'none' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                <th style={{ padding: '12px 16px', fontSize: 13, color: '#475569', width: 40, textAlign: 'center' }}>
                                                    <div 
                                                        onClick={handleCheckAll}
                                                        style={{ 
                                                            width: 20, height: 20, borderRadius: 4, 
                                                            border: allChecked ? 'none' : '2px solid #cbd5e1',
                                                            background: allChecked ? '#22c55e' : '#fff',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            cursor: 'pointer', margin: '0 auto', transition: 'all 0.1s'
                                                        }}
                                                    >
                                                        {allChecked && <CheckCircle size={14} color="#fff" strokeWidth={3} />}
                                                    </div>
                                                </th>
                                                <th style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>วัตถุดิบ</th>
                                                <th style={{ padding: '12px 16px', fontSize: 13, color: '#475569', textAlign: 'right' }}>ปริมาณที่ต้องใช้</th>
                                                <th style={{ padding: '12px 16px', fontSize: 13, color: '#475569', width: 80 }}>หน่วย</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rawMaterials.map((ing, idx) => {
                                                const pmMatch = pmMaterials?.find(m => String(m.id) === String(ing.materialId));
                                                const rawMatch = MOCK_RAW_MATERIALS?.find(m => String(m.id) === String(ing.materialId));
                                                const foundName = ing.name || (pmMatch ? pmMatch.name : (rawMatch ? rawMatch.name : null));
                                                const cleanName = foundName ? foundName.replace(/<\/p>\s*<p>/gi, ', ').replace(/<[^>]+>/g, '').trim() : '-';
                                                
                                                const requiredQty = (ing.qty * scaleFactor).toFixed(4);
                                                const isChecked = checkedItems[idx] || false;

                                                return (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: isChecked ? '#f0fdf4' : '#fff', transition: 'background 0.2s' }}>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                            <div 
                                                                onClick={() => handleCheckItem(idx)}
                                                                style={{ 
                                                                    width: 24, height: 24, borderRadius: 6, 
                                                                    border: isChecked ? 'none' : '2px solid #cbd5e1',
                                                                    background: isChecked ? '#22c55e' : '#fff',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    cursor: 'pointer', margin: '0 auto', transition: 'all 0.1s'
                                                                }}
                                                            >
                                                                {isChecked && <CheckCircle size={16} color="#fff" strokeWidth={3} />}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', fontSize: 14, color: isChecked ? '#166534' : '#1e293b', fontWeight: isChecked ? 600 : 400 }}>
                                                            {cleanName}
                                                        </td>
                                                        <td style={{ padding: '12px 16px', fontSize: 15, fontWeight: 700, color: isChecked ? '#15803d' : '#0369a1', textAlign: 'right' }}>
                                                            {requiredQty}
                                                        </td>
                                                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                                                            {ing.unit}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {!allChecked && rawMaterials.length > 0 && (
                                    <div style={{ fontSize: 13, color: '#ef4444', textAlign: 'right', fontWeight: 500 }}>
                                        * กรุณาตรวจสอบและเตรียมวัตถุดิบให้ครบทุกรายการก่อนบันทึก
                                    </div>
                                )}
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (!isMixing) {
                                            setIsMixing(true);
                                        } else {
                                            handleSubmit(e);
                                        }
                                    }}
                                    disabled={loading || !allChecked || rawMaterials.length === 0}
                                    style={{ 
                                        background: (loading || !allChecked || rawMaterials.length === 0) ? '#94a3b8' : (isMixing ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'), 
                                        color: '#ffffff', border: 'none', padding: '16px', 
                                        borderRadius: 12, fontSize: 16, fontWeight: 700, 
                                        cursor: (loading || !allChecked || rawMaterials.length === 0) ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, 
                                        boxShadow: (loading || !allChecked) ? 'none' : (isMixing ? '0 4px 12px rgba(16, 185, 129, 0.4)' : '0 4px 12px rgba(37, 99, 235, 0.4)'),
                                        transition: 'all 0.2s ease', width: '100%'
                                    }}
                                >
                                    {isMixing ? <Save size={20} /> : <Package size={20} />} 
                                    {loading ? 'กำลังดำเนินการ...' : (isMixing ? 'ผสมเสร็จสิ้น — บันทึกการผลิตและส่งตรวจ QC' : 'เริ่มผสม')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default OperatorWIP;

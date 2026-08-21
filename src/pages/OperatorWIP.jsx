import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Warehouse, Save, ArrowLeft, Package, CheckCircle, SearchCheck, XCircle, History, Plus, Timer, Tag, Calendar, Activity, Star, FileText, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import { useRnD } from '../context/RnDContext';
import { useProduction } from '../context/ProductionContext';
import CustomSelect from '../components/CustomSelect';
import { getDynamicBatchSizeValue, convertToBase } from '../utils/formatters';
import './PageCommon.css';
import './Operator.css';

import API_BASE from '../config';

const OperatorWIP = () => {
    const { currentUser: user, canCreate } = useAuth();
    const { showAlert, showConfirm } = useAlert();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Hooks from Contexts
    const { formulas: MOCK_FORMULAS, materials: MOCK_RAW_MATERIALS, pmMaterials } = useRnD();
    const { sendQcRequest, tasks, routeWipTask } = useProduction();
    
    // State
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'create'
    const [stockItems, setStockItems] = useState([]);

    useEffect(() => {
        const fetchStock = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE}/stock?limit=1000`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStockItems(data.data || data || []);
                }
            } catch (err) {
                console.error("Failed to fetch stock", err);
            }
        };
        fetchStock();
    }, []);

    const handleRouteWip = async (taskId, action) => {
        const title = 'ยืนยันส่งเข้าคลัง WIP';
        const msg = 'คุณต้องการเก็บเนื้อยานี้เข้าคลังสินค้ากึ่งสำเร็จรูปเพื่อส่งต่อให้ฝ่ายผลิตใช่หรือไม่?';
        const confirmed = await showConfirm(title, msg, 'info');
        if (!confirmed) return;
        
        setLoading(true);
        const res = await routeWipTask(taskId, action);
        setLoading(false);
        if (res.success) {
            showAlert('สำเร็จ', 'ส่งเนื้อยาเข้าคลัง WIP เรียบร้อย ฝ่ายผลิตสามารถดำเนินการต่อได้', 'success');
        } else {
            showAlert('ผิดพลาด', res.message, 'error');
        }
    };
    
    const wipTasks = useMemo(() => {
        if (!tasks) return [];
        return tasks.filter(t => t.batchNo && t.batchNo.includes('-WIP')).reverse();
    }, [tasks]);
    
    const activeWipTasks = useMemo(() => wipTasks.filter(t => t.status === 'รอเริ่มงาน' || t.status === 'กำลังทำ' || t.status === 'รอเบิกวัตถุดิบ' || t.status === 'พร้อมเริ่มงาน'), [wipTasks]);
    const historyWipTasks = useMemo(() => wipTasks.filter(t => t.status !== 'รอเริ่มงาน' && t.status !== 'กำลังทำ' && t.status !== 'รอเบิกวัตถุดิบ' && t.status !== 'พร้อมเริ่มงาน'), [wipTasks]);

    const [formData, setFormData] = useState({
        formulaName: '',
        expectedQty: '',
        unit: 'กรัม'
    });
    const [fromTask, setFromTask] = useState(false); // true when navigated from production page
    const [sourceJobOrderId, setSourceJobOrderId] = useState('');
    const [checkedItems, setCheckedItems] = useState({});
    const [isMixing, setIsMixing] = useState(false);
    const [existingTask, setExistingTask] = useState(null);
    const [detailModalTask, setDetailModalTask] = useState(null);
    const isUrlParsed = React.useRef(false);

    const handleStartTask = (task) => {
        setFormData({
            formulaName: task.formulaName || '',
            expectedQty: task.expectedQty || '',
            unit: task.jobUnit || task.unit || 'กรัม'
        });
        setSourceJobOrderId(task.jobOrderId || '');
        setTaskCalc({ qty: task.expectedQty, unit: task.jobUnit || task.unit || 'กรัม' });
        setExistingTask(task);
        setFromTask(true);
        setViewMode('create');
        
        // ถ้าสถานะเป็นกำลังทำ ให้เข้าหน้าแอนิเมชันเลย
        if (task.status === 'กำลังทำ') {
            setIsMixing(true);
        }
    };

    // Filter only approved formulas
    const approvedFormulas = useMemo(() => {
        return (MOCK_FORMULAS || []).filter(f => f.status === 'อนุมัติ');
    }, [MOCK_FORMULAS]);

    // taskCalc holds the production task's qty/unit for ingredient scaling (e.g. 20 ชิ้น)
    const [taskCalc, setTaskCalc] = useState(null);

    useEffect(() => {
        if (isUrlParsed.current) return;

        const params = new URLSearchParams(location.search);
        const formula = params.get('formula');
        
        // Wait for formulas to load before initializing default
        if (!formula && approvedFormulas.length === 0) return;
        
        isUrlParsed.current = true;

        const wipQty = params.get('wipQty');      // WIP weight to display (e.g. 7.094)
        const wipUnit = params.get('wipUnit');     // WIP unit to display (e.g. กรัม)
        const taskQty = params.get('taskQty');     // Task qty for scaling (e.g. 20)
        const taskUnit = params.get('taskUnit');   // Task unit for scaling (e.g. ชิ้น)
        const jobOrderId = params.get('jobOrderId');
        
        // Legacy support: old URL format with qty/unit
        const legacyQty = params.get('qty');
        const legacyUnit = params.get('unit');
        
        if (formula && (wipQty || legacyQty)) {
            // URL has task data, initialize form with it
            const displayQty = wipQty || legacyQty || '';
            const displayUnit = (wipUnit || legacyUnit || '').replace(/,/g, '').trim() || 'กรัม';

            setFormData(prev => ({ 
                ...prev, 
                formulaName: formula,
                expectedQty: displayQty,
                unit: displayUnit
            }));
            
            if (taskQty && taskUnit) {
                setTaskCalc({
                    qty: parseFloat(taskQty),
                    unit: decodeURIComponent(taskUnit).replace(/,/g, '').trim()
                });
            }
            
            setFromTask(true);
            setViewMode('create');
        } else if (approvedFormulas.length > 0) {
            // Normal creation, just set the first available formula
            setFormData(prev => ({ ...prev, formulaName: approvedFormulas[0].name }));
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

    const handlePreviewRequisition = async (e) => {
        e.preventDefault();
        
        if (!formData.expectedQty || parseFloat(formData.expectedQty) <= 0) {
            showAlert('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนที่ต้องการผลิต', 'warning');
            return;
        }

        const usedRawMaterials = rawMaterials.map((ing, idx) => {
            if (!checkedItems[idx]) return null;
            const stockItem = stockItems.find(s => ing.materialId && String(s.id).trim() === String(ing.materialId).trim());
            if (!stockItem) return null;
            
            let deductQty = ing.qty * scaleFactor;
            const displayQty = deductQty;
            const displayUnit = ing.unit;

            if (stockItem.unit === 'กิโลกรัม' && ing.unit === 'กรัม') deductQty /= 1000;
            else if (stockItem.unit === 'กรัม' && ing.unit === 'กิโลกรัม') deductQty *= 1000;
            if (['ลิตร', 'l', 'liter', 'liters'].includes((stockItem.unit||'').toLowerCase()) && ['มิลลิลิตร', 'ml'].includes((ing.unit||'').toLowerCase())) deductQty /= 1000;
            else if (['มิลลิลิตร', 'ml'].includes((stockItem.unit||'').toLowerCase()) && ['ลิตร', 'l', 'liter', 'liters'].includes((ing.unit||'').toLowerCase())) deductQty *= 1000;
            
            return { id: stockItem.id, name: stockItem.name, unit: stockItem.unit, deductQty, displayQty, displayUnit };
        }).filter(Boolean);

        if (usedRawMaterials.length === 0) {
            showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกวัตถุดิบอย่างน้อย 1 รายการเพื่อดูตัวอย่างใบเบิก', 'warning');
            return;
        }

        try {
            const reqData = {
                formulaName: selectedFormulaData ? selectedFormulaData.name : formData.formulaName,
                expectedQty: parseFloat(formData.expectedQty),
                unit: formData.unit,
                jobOrderId: sourceJobOrderId || (existingTask ? existingTask.jobOrderId : null),
                taskId: existingTask ? existingTask.id : null,
                batchNo: existingTask ? existingTask.batchNo : null,
                items: usedRawMaterials,
                date: new Date().toLocaleDateString('th-TH'),
                requesterName: user?.name || user?.username || 'ผู้ปฏิบัติงาน'
            };

            const res = await fetch(`${API_BASE}/print/requisition/preview`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(reqData)
            });

            if (!res.ok) throw new Error('Failed to generate preview PDF');
            
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error(err);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างตัวอย่างใบเบิกได้', 'error');
        }
    };

    const handlePrintRequisition = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/print/requisition/${existingTask.id}`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!res.ok) throw new Error('Failed to fetch saved PDF');
            
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error(err);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดใบเบิก PDF ได้', 'error');
        }
    };

    const handleViewHistoryPdf = async (e, taskId) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/print/requisition/${taskId}`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!res.ok) throw new Error('Failed to fetch saved PDF');
            
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error(err);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดใบเบิก PDF ได้', 'error');
        }
    };

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

    // Auto-check items that have enough stock
    useEffect(() => {
        if (rawMaterials.length > 0 && stockItems.length > 0) {
            setCheckedItems(prev => {
                let hasChanges = false;
                const next = { ...prev };

                rawMaterials.forEach((ing, idx) => {
                    if (prev[idx] !== undefined) return; // Already explicitly checked or unchecked

                    const requiredQtyNum = (ing.qty * scaleFactor);
                    const stockItem = stockItems.find(s => ing.materialId && String(s.id).trim() === String(ing.materialId).trim());

                    if (stockItem) {
                        let availQty = stockItem.qty || 0;
                        if (stockItem.unit === 'กิโลกรัม' && ing.unit === 'กรัม') availQty *= 1000;
                        else if (stockItem.unit === 'กรัม' && ing.unit === 'กิโลกรัม') availQty /= 1000;

                        if (availQty >= requiredQtyNum) {
                            next[idx] = true;
                            hasChanges = true;
                        } else {
                            next[idx] = false; // explicitly false so it doesn't try again
                            hasChanges = true;
                        }
                    } else {
                        next[idx] = false;
                        hasChanges = true;
                    }
                });

                return hasChanges ? next : prev;
            });
        }
    }, [rawMaterials, stockItems, scaleFactor, pmMaterials]);

    const allChecked = useMemo(() => {
        if (!rawMaterials || rawMaterials.length === 0) return false;
        return rawMaterials.every((_, idx) => checkedItems[idx]);
    }, [rawMaterials, checkedItems]);

    const handleCheckAll = () => {
        if (allChecked) {
            // Uncheck all
            const newChecked = {};
            rawMaterials.forEach((_, idx) => newChecked[idx] = false);
            setCheckedItems(newChecked);
        } else {
            // Check only those with enough stock (skip errors)
            setCheckedItems(prev => {
                const next = { ...prev };
                rawMaterials.forEach((ing, idx) => {
                    const requiredQtyNum = (ing.qty * scaleFactor);
                    const stockItem = stockItems.find(s => ing.materialId && String(s.id).trim() === String(ing.materialId).trim());

                    let hasEnough = false;
                    if (stockItem) {
                        let availQty = stockItem.qty || 0;
                        if (stockItem.unit === 'กิโลกรัม' && ing.unit === 'กรัม') availQty *= 1000;
                        else if (stockItem.unit === 'กรัม' && ing.unit === 'กิโลกรัม') availQty /= 1000;
                        if (availQty >= requiredQtyNum) hasEnough = true;
                    }
                    if (hasEnough) next[idx] = true;
                });
                return next;
            });
        }
    };

    const handleStartMixing = async () => {
        if (!formData.expectedQty || parseFloat(formData.expectedQty) <= 0) {
            showAlert('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนที่ต้องการผลิต', 'warning');
            return;
        }
        if (!allChecked && (!existingTask || !existingTask.RequisitionJSON)) {
            showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณาติ๊กเตรียมวัตถุดิบให้ครบถ้วนก่อนขอเบิก', 'warning');
            return;
        }

        setLoading(true);
        try {
            let taskIdToUse = existingTask ? existingTask.id : null;
            let jobOrderIdToUse = sourceJobOrderId;
            let batchNoToUse = existingTask ? existingTask.batchNo : null;

            if (!existingTask || !existingTask.RequisitionJSON) {
                // Construct requisition items
                const usedRawMaterials = rawMaterials.map((ing, idx) => {
                    if (!checkedItems[idx]) return null;
                    const stockItem = stockItems.find(s => ing.materialId && String(s.id).trim() === String(ing.materialId).trim());
                    if (!stockItem) return null;
                    
                    let deductQty = ing.qty * scaleFactor;
                    const displayQty = deductQty;
                    const displayUnit = ing.unit;

                    if (stockItem.unit === 'กิโลกรัม' && ing.unit === 'กรัม') deductQty /= 1000;
                    else if (stockItem.unit === 'กรัม' && ing.unit === 'กิโลกรัม') deductQty *= 1000;
                    if (['ลิตร', 'l', 'liter', 'liters'].includes((stockItem.unit||'').toLowerCase()) && ['มิลลิลิตร', 'ml'].includes((ing.unit||'').toLowerCase())) deductQty /= 1000;
                    else if (['มิลลิลิตร', 'ml'].includes((stockItem.unit||'').toLowerCase()) && ['ลิตร', 'l', 'liter', 'liters'].includes((ing.unit||'').toLowerCase())) deductQty *= 1000;
                    
                    return { id: stockItem.id, name: stockItem.name, unit: stockItem.unit, deductQty, displayQty, displayUnit };
                }).filter(Boolean);

                if (!existingTask) {
                    // 1a. Create NEW WIP Task and Request Materials
                    const res = await fetch(`${API_BASE}/production/tasks/wip`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                            formulaName: selectedFormulaData ? selectedFormulaData.name : formData.formulaName,
                            expectedQty: parseFloat(formData.expectedQty),
                            unit: formData.unit,
                            sourceJobOrderId: sourceJobOrderId || null,
                            requisitionItems: usedRawMaterials,
                            requesterName: user?.name || user?.username || 'ไม่ระบุ'
                        })
                    });

                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.message || 'Error creating WIP task');
                    }

                    const data = await res.json();
                    
                    setExistingTask({
                        id: data.taskId,
                        jobOrderId: data.jobOrderId,
                        batchNo: data.batchNo,
                        formulaName: selectedFormulaData ? selectedFormulaData.name : formData.formulaName,
                        status: 'รอเบิกวัตถุดิบ',
                        RequisitionJSON: JSON.stringify(usedRawMaterials)
                    });
                } else {
                    // 1b. Submit Requisition for EXISTING Task (from Planner)
                    const res = await fetch(`${API_BASE}/production/tasks/${existingTask.id}/requisition`, {
                        method: 'PUT',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                            requisitionItems: usedRawMaterials,
                            requesterName: user?.name || user?.username || 'ไม่ระบุ'
                        })
                    });

                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.message || 'Error submitting requisition');
                    }

                    setExistingTask(prev => ({
                        ...prev,
                        status: 'รอเบิกวัตถุดิบ',
                        RequisitionJSON: JSON.stringify(usedRawMaterials)
                    }));
                }
                
                showAlert('ส่งใบเบิกวัตถุดิบสำเร็จ', 'กรุณารอฝ่ายคลังสินค้าอนุมัติจ่ายของให้ครบถ้วน จากนั้นจึงจะสามารถเริ่มผสมได้', 'success');
                setLoading(false);
                return; // Stop here, waiting for warehouse
            }

            // 2. Set status to "กำลังทำ" in DB so it persists
            const advanceRes = await fetch(`${API_BASE}/production/tasks/${taskIdToUse}/advance`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    currentStep: 'prepare',
                    status: 'กำลังทำ',
                    stepTimes: [] 
                })
            });

            if (!advanceRes.ok) {
                console.error("Failed to advance task status to mixing.");
            }
            
            setIsMixing(true);
        } catch (err) {
            console.error('Start mixing error:', err);
            showAlert('เกิดข้อผิดพลาด', err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        setLoading(true);
        try {
            if (!existingTask || !existingTask.id) {
                throw new Error("ไม่พบข้อมูล Task กรุณากลับไปเริ่มใหม่");
            }
            
            const taskIdToUse = existingTask.id;
            const jobOrderIdToUse = existingTask.jobOrderId || sourceJobOrderId;
            const batchNoToUse = existingTask.batchNo;

            // 1. Advance Status to QC In-Process
            const advanceRes = await fetch(`${API_BASE}/production/tasks/${taskIdToUse}/advance`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    currentStep: 'qc_inprocess',
                    status: 'รอตรวจ QC',
                    stepTimes: [] 
                })
            });

            if (!advanceRes.ok) {
                console.error("Failed to advance task status, but task was created.");
            }

            // 3. Send QC Request automatically
            // We use the context function sendQcRequest. We need to format the task object for it.
            const taskObjForQc = {
                id: taskIdToUse,
                jobOrderId: jobOrderIdToUse,
                formulaName: formData.formulaName,
                batchNo: batchNoToUse, 
                currentStep: 'qc_inprocess'
            };
            await sendQcRequest(taskObjForQc, 'qc_inprocess');

            showAlert('สำเร็จ', 'บันทึกการผลิต WIP และส่งคำขอ QC เรียบร้อยแล้ว', 'success');
            
            // Clear form and reset checkboxes
            setFormData(prev => ({ ...prev, expectedQty: '' }));
            setCheckedItems({});
            
            // Redirect back if came from FG task (indicated by URL params)
            setTimeout(() => {
                if (location.search) {
                    navigate('/operator');
                } else {
                    setViewMode('list');
                }
            }, 1500);
            
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
            <div className="page-container operator-page page-enter" style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <XCircle size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                    <h4>ไม่มีสิทธิ์เข้าถึงหน้านี้</h4>
                </div>
            </div>
        );
    }

    if (viewMode === 'list') {
        return (
            <div className="page-container operator-page page-enter">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                    <h2 style={{ margin: 0, fontSize: 24, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800 }}>
                        <div style={{ padding: 10, background: '#e0f2fe', borderRadius: 10, color: '#0284c7', display: 'flex', boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.2)' }}>
                            <Warehouse size={28} />
                        </div>
                        สถานีผลิตสินค้ากึ่งสำเร็จรูป (WIP Workstation)
                    </h2>
                    {canCreate('operator_wip') && (
                        <button 
                            onClick={() => setViewMode('create')}
                            className="primary-button"
                            style={{ 
                                background: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', 
                                borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, 
                                cursor: 'pointer', fontWeight: 600, fontSize: 14, boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                            }}
                        >
                            <Plus size={18} />
                            สร้างงาน WIP
                        </button>
                    )}
                </div>

                <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 className="op-section-title" style={{ margin: 0 }}>
                            <Timer size={16} className="op-pulse" /> งาน WIP ที่รอเริ่มดำเนินการ
                        </h3>
                    </div>

                    {activeWipTasks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                            <Warehouse size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                            <p style={{ margin: 0, fontSize: 14 }}>ไม่มีงาน WIP ที่กำลังดำเนินการ</p>
                        </div>
                    ) : (
                        <div className="op-active-grid">
                            {activeWipTasks.map(task => (
                                <div key={task.id} className={`op-active-card ${task.status === 'กำลังทำ' ? 'status-progress' : ''}`}>
                                    <div className="op-active-top">
                                        <div>
                                            <span className="op-active-batch">{task.batchNo}</span>
                                            <span className="op-active-job">← {task.jobOrderId || 'ไม่มีรหัสออเดอร์'}</span>
                                        </div>
                                        <span className={`op-status-badge ${task.status === 'กำลังทำ' ? 'op-status-in-progress' : 'op-status-active'}`}>
                                            {task.status}
                                        </span>
                                    </div>
                                    <div className="op-active-product" style={{ fontSize: 16, marginTop: 8, marginBottom: 8 }}>{task.productName || task.formulaName}</div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                                        <div className="op-active-progress" style={{ margin: 0 }}>
                                            <span style={{ fontSize: 13, color: '#64748b' }}>เป้าหมายผลิต:</span>
                                            <div style={{ fontWeight: 700, color: '#0369a1', fontSize: 15 }}>
                                                {(task.expectedQty || 0).toLocaleString()} {task.unit || task.jobUnit || 'กรัม'}
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleStartTask(task)}
                                            style={{ 
                                                padding: '6px 16px', fontSize: 13, fontWeight: 700,
                                                background: '#eff6ff', color: '#2563eb', 
                                                border: '1.5px solid #60a5fa', borderRadius: 8, 
                                                cursor: 'pointer', transition: 'all 0.15s ease',
                                                display: 'flex', alignItems: 'center', gap: 6
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.color = '#fff'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; }}
                                        >
                                            {task.status === 'กำลังทำ' ? '▶ ทำต่อ' : '▶ เริ่มทำ WIP'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <History size={18} color="#64748b" />
                        <h3 style={{ margin: 0, fontSize: 16, color: '#475569' }}>ประวัติงาน WIP ทั้งหมด</h3>
                    </div>

                    {historyWipTasks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                            <History size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                            <p>ไม่มีประวัติการทำ WIP (งานเสร็จสิ้น)</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '10px 14px', color: '#475569', fontSize: 12, fontWeight: 700, width: 60 }}>ลำดับ</th>
                                        <th style={{ padding: '10px 14px', color: '#475569', fontSize: 12, fontWeight: 700, width: 160 }}>เลข Lot / Batch</th>
                                        <th style={{ padding: '10px 14px', color: '#475569', fontSize: 12, fontWeight: 700, minWidth: 250 }}>สูตรที่ผสม</th>
                                        <th style={{ padding: '10px 14px', color: '#475569', fontSize: 12, fontWeight: 700, width: 120 }}>จำนวน</th>
                                        <th style={{ padding: '10px 14px', color: '#475569', fontSize: 12, fontWeight: 700, width: 120 }}>สถานะ</th>
                                        <th style={{ padding: '10px 14px', color: '#475569', fontSize: 12, fontWeight: 700, width: 150 }}>รหัสใบสั่งผลิต</th>
                                        <th style={{ padding: '10px 14px', color: '#475569', fontSize: 12, fontWeight: 700, width: 180, textAlign: 'center' }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyWipTasks.map((t, i) => (
                                        <tr key={t.id || i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 13 }}>{i + 1}</td>
                                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0369a1', whiteSpace: 'nowrap', fontSize: 13 }}>{t.batchNo}</td>
                                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500, fontSize: 13 }}>{t.productName || t.formulaName}</td>
                                            <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap', fontSize: 13 }}>{(t.expectedQty || 0).toLocaleString()} {t.unit || t.jobUnit || 'กรัม'}</td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{ 
                                                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                                    background: t.status === 'QC ผ่าน' ? '#dcfce7' : t.status?.includes('รอตรวจ') ? '#fef3c7' : t.status?.includes('เสร็จ') ? '#dbeafe' : '#f1f5f9',
                                                    color: t.status === 'QC ผ่าน' ? '#15803d' : t.status?.includes('รอตรวจ') ? '#d97706' : t.status?.includes('เสร็จ') ? '#1d4ed8' : '#475569'
                                                }}>
                                                    {t.status === 'QC ผ่าน' ? '✓ QC ผ่าน' : t.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 12 }}>{t.jobOrderId || t.id}</td>
                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                    {t.status === 'QC ผ่าน' && (
                                                        <button 
                                                            onClick={() => handleRouteWip(t.id, 'wip_stock')}
                                                            disabled={loading}
                                                            style={{ 
                                                                padding: '6px',
                                                                background: '#ffffff', color: '#16a34a', 
                                                                border: '1px solid #bbf7d0', borderRadius: 6, 
                                                                cursor: loading ? 'not-allowed' : 'pointer', 
                                                                opacity: loading ? 0.5 : 1,
                                                                transition: 'all 0.15s ease',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                boxShadow: '0 1px 2px rgba(34, 197, 94, 0.1)'
                                                            }}
                                                            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#86efac'; }}}
                                                            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#bbf7d0'; }}
                                                            title="ส่งเข้าคลัง WIP"
                                                        >
                                                            <Package size={16} />
                                                        </button>
                                                    )}
                                                    
                                                    {t.currentStep === 'stock' && (
                                                        <span 
                                                            style={{ 
                                                                padding: '6px', background: '#dcfce7', color: '#15803d', 
                                                                borderRadius: 6, border: '1px solid #bbf7d0', 
                                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center' 
                                                            }}
                                                            title="อยู่ในคลัง WIP แล้ว"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </span>
                                                    )}

                                                    <button 
                                                        onClick={() => setDetailModalTask(t)}
                                                        style={{ 
                                                            padding: '6px', borderRadius: 6, background: '#ffffff', color: '#64748b',
                                                            border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s ease',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#1e293b'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
                                                        title="ดูรายละเอียดใบงาน"
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    {t.RequisitionJSON && (
                                                        <button 
                                                            onClick={(e) => handleViewHistoryPdf(e, t.id)}
                                                            style={{ 
                                                                padding: '6px', borderRadius: 6, background: '#ffffff', color: '#0369a1', 
                                                                border: '1px solid #bae6fd', cursor: 'pointer', transition: 'all 0.15s ease',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                boxShadow: '0 1px 2px rgba(3, 105, 161, 0.1)'
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.color = '#0284c7'; e.currentTarget.style.borderColor = '#7dd3fc'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#0369a1'; e.currentTarget.style.borderColor = '#bae6fd'; }}
                                                            title="ดูใบเบิกวัตถุดิบ (PDF)"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                    )}

                                                    {(['qc_inprocess', 'รอตรวจ QC', 'กำลังตรวจ', 'QC ผ่าน', 'QC ไม่ผ่าน', 'รอตรวจซ้ำ', 'เสร็จสิ้น'].includes(t.status) || ['qc_inprocess', 'qc'].includes(t.currentStep)) && (
                                                        <button 
                                                            onClick={(e) => handleViewQcPdf(e, t.id)}
                                                            style={{ 
                                                                padding: '6px', borderRadius: 6, background: '#ffffff', color: '#d97706', 
                                                                border: '1px solid #fde68a', cursor: 'pointer', transition: 'all 0.15s ease',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                boxShadow: '0 1px 2px rgba(217, 119, 6, 0.1)'
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#fef3c7'; e.currentTarget.style.color = '#b45309'; e.currentTarget.style.borderColor = '#fcd34d'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#d97706'; e.currentTarget.style.borderColor = '#fde68a'; }}
                                                            title="ดูใบส่งตรวจ QC (PDF)"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                    )}

                                                    {(!t.RequisitionJSON && !['qc_inprocess', 'รอตรวจ QC', 'กำลังตรวจ', 'QC ผ่าน', 'QC ไม่ผ่าน', 'รอตรวจซ้ำ', 'เสร็จสิ้น'].includes(t.status) && !['qc_inprocess', 'qc'].includes(t.currentStep) && t.status !== 'QC ผ่าน' && t.currentStep !== 'stock') && (
                                                        <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
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
                
                {/* Detail Modal */}
                {detailModalTask && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: '#ffffff', borderRadius: 16, width: '90%', maxWidth: 650, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ padding: 8, background: '#f1f5f9', borderRadius: 8, color: '#475569' }}>
                                        <Eye size={20} />
                                    </div>
                                    รายละเอียดการผลิตกึ่งสำเร็จรูป (WIP)
                                </h3>
                                <button 
                                    onClick={() => setDetailModalTask(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>
                            
                            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>รหัส Lot / Batch</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#0369a1' }}>{detailModalTask.batchNo}</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>รหัสใบสั่งผลิตหลัก</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>{detailModalTask.jobOrderId || '-'}</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>สูตรที่ใช้ผลิต</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{detailModalTask.productName || detailModalTask.formulaName}</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>จำนวนที่ผลิต</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{(detailModalTask.expectedQty || 0).toLocaleString()} {detailModalTask.unit || detailModalTask.jobUnit || 'กรัม'}</div>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#1e293b' }}>สถานะการดำเนินการ</h4>
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                        <div style={{ background: detailModalTask.status === 'QC ผ่าน' ? '#dcfce7' : '#f1f5f9', color: detailModalTask.status === 'QC ผ่าน' ? '#15803d' : '#475569', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1px solid ${detailModalTask.status === 'QC ผ่าน' ? '#bbf7d0' : '#e2e8f0'}` }}>
                                            สถานะการผลิต: {detailModalTask.status}
                                        </div>
                                        {['qc_inprocess', 'รอตรวจ QC', 'กำลังตรวจ', 'QC ผ่าน', 'QC ไม่ผ่าน', 'รอตรวจซ้ำ'].includes(detailModalTask.status) || ['qc_inprocess'].includes(detailModalTask.currentStep) ? (
                                            <button 
                                                onClick={(e) => handleViewQcPdf(e, detailModalTask.id)}
                                                style={{ background: '#fef3c7', color: '#b45309', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid #fde68a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                            >
                                                📄 ดูใบส่งตรวจ QC
                                            </button>
                                        ) : null}
                                        {detailModalTask.currentStep === 'stock' && (
                                            <div style={{ background: '#dcfce7', color: '#16a34a', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid #bbf7d0' }}>
                                                📦 การจัดเก็บ: เข้าคลัง WIP แล้ว
                                            </div>
                                        )}
                                        {detailModalTask.RequisitionJSON && (
                                            <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid #bae6fd' }}>
                                                📄 การเบิกวัตถุดิบ: ออกใบเบิกแล้ว
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {detailModalTask.RequisitionJSON && (
                                    <div>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#1e293b' }}>รายการวัตถุดิบที่เบิก</h4>
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                                                <thead style={{ background: '#f8fafc' }}>
                                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600 }}>รหัส</th>
                                                        <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600 }}>รายการวัตถุดิบ</th>
                                                        <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>จำนวนที่ใช้</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        try {
                                                            const parsed = typeof detailModalTask.RequisitionJSON === 'string' ? JSON.parse(detailModalTask.RequisitionJSON) : detailModalTask.RequisitionJSON;
                                                            return (parsed.items || []).map((item, idx) => (
                                                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                    <td style={{ padding: '8px 14px', color: '#475569' }}>{item.id || '-'}</td>
                                                                    <td style={{ padding: '8px 14px', color: '#1e293b', fontWeight: 500 }}>{item.name || item.materialName || '-'}</td>
                                                                    <td style={{ padding: '8px 14px', color: '#0369a1', fontWeight: 600, textAlign: 'right' }}>
                                                                        {Number(item.displayQty || item.qty || item.deductQty || 0).toLocaleString(undefined, {maximumFractionDigits:4})} {item.displayUnit || item.unit || 'g'}
                                                                    </td>
                                                                </tr>
                                                            ));
                                                        } catch (e) {
                                                            return <tr><td colSpan="3" style={{ padding: 12, textAlign: 'center', color: '#ef4444' }}>ไม่สามารถดึงข้อมูลวัตถุดิบได้</td></tr>;
                                                        }
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                                <button 
                                    onClick={() => setDetailModalTask(null)}
                                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 24px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
                                >
                                    ปิดหน้าต่าง
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="page-container operator-page page-enter">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button 
                        onClick={() => {
                            if (location.search) {
                                navigate('/operator');
                            } else {
                                setFromTask(false);
                                setViewMode('list');
                            }
                        }}
                        style={{ 
                            background: '#f59e0b', 
                            border: 'none', 
                            padding: '10px 18px', 
                            borderRadius: 8, 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: 8, 
                            cursor: 'pointer', 
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: 14,
                            transition: 'all 0.2s', 
                            boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)' 
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(245, 158, 11, 0.3)';
                            e.currentTarget.style.background = '#d97706';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.2)';
                            e.currentTarget.style.background = '#f59e0b';
                        }}
                    >
                        <ArrowLeft size={18} color="#ffffff" />
                        กลับหน้าหลัก WIP
                    </button>
                    <h2 style={{ margin: 0, fontSize: 24, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800 }}>
                        <div style={{ padding: 10, background: '#e0f2fe', borderRadius: 10, color: '#0284c7', display: 'flex', boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.2)' }}>
                            <Warehouse size={28} />
                        </div>
                        สร้างใบสั่งผลิตกึ่งสำเร็จรูป (WIP)
                    </h2>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 24, alignItems: 'start' }}>
                
                {/* LEFT COLUMN: FORM */}
                <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', minWidth: 0 }}>
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
                <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', minWidth: 0 }}>
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
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', margin: 0, border: 'none', minWidth: 'auto' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                <th style={{ padding: '10px 12px', fontSize: 13, color: '#475569', width: 40, textAlign: 'center' }}>
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
                                                <th style={{ padding: '10px 12px', fontSize: 13, color: '#475569' }}>วัตถุดิบ</th>
                                                <th style={{ padding: '10px 12px', fontSize: 13, color: '#475569', textAlign: 'right' }}>ในสต็อก</th>
                                                <th style={{ padding: '10px 12px', fontSize: 13, color: '#475569', textAlign: 'right' }}>ปริมาณที่ต้องใช้</th>
                                                <th style={{ padding: '10px 12px', fontSize: 13, color: '#475569', width: 60 }}>หน่วย</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rawMaterials.map((ing, idx) => {
                                                const pmMatch = pmMaterials?.find(m => String(m.id) === String(ing.materialId));
                                                const rawMatch = MOCK_RAW_MATERIALS?.find(m => String(m.id) === String(ing.materialId));
                                                const foundName = ing.name || (pmMatch ? pmMatch.name : (rawMatch ? rawMatch.name : null));
                                                let cleanName = foundName ? foundName.replace(/<\/p>\s*<p>/gi, ', ').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim() : '-';
                                                cleanName = cleanName.replace(/\s*\(.*?\)/g, '').trim();
                                                
                                                const requiredQtyNum = (ing.qty * scaleFactor);
                                                const requiredQty = requiredQtyNum.toFixed(4);
                                                
                                                const stockItem = stockItems.find(s => ing.materialId && String(s.id).trim() === String(ing.materialId).trim());

                                                let hasEnoughStock = true;
                                                let stockDisplay = "-";
                                                let isStockError = false;

                                                if (stockItem) {
                                                    let availQty = stockItem.qty || 0;
                                                    
                                                    if (stockItem.unit === 'กิโลกรัม' && ing.unit === 'กรัม') {
                                                        availQty = availQty * 1000;
                                                    } else if (stockItem.unit === 'กรัม' && ing.unit === 'กิโลกรัม') {
                                                        availQty = availQty / 1000;
                                                    }

                                                    hasEnoughStock = availQty >= requiredQtyNum;
                                                    stockDisplay = `${(stockItem.qty || 0).toLocaleString()} ${stockItem.unit || ''}`;
                                                    isStockError = !hasEnoughStock;
                                                } else {
                                                    hasEnoughStock = false;
                                                    isStockError = true;
                                                    stockDisplay = "0";
                                                }

                                                const isChecked = checkedItems[idx] || false;

                                                return (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: isChecked ? '#f0fdf4' : (isStockError ? '#fef2f2' : '#fff'), transition: 'background 0.2s' }}>
                                                        <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                            <div 
                                                                onClick={() => {
                                                                    if (isStockError) {
                                                                        showAlert('สต็อกไม่เพียงพอ', `ไม่สามารถเตรียมวัตถุดิบ ${cleanName} ได้เนื่องจากสต็อกไม่พอ`, 'error');
                                                                        return; 
                                                                    }
                                                                    handleCheckItem(idx);
                                                                }}
                                                                style={{ 
                                                                    width: 24, height: 24, borderRadius: 6, 
                                                                    border: isChecked ? 'none' : (isStockError ? '2px solid #fca5a5' : '2px solid #cbd5e1'),
                                                                    background: isChecked ? '#22c55e' : (isStockError ? '#fee2e2' : '#fff'),
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    cursor: isStockError ? 'not-allowed' : 'pointer', margin: '0 auto', transition: 'all 0.1s'
                                                                }}
                                                            >
                                                                {isChecked && <CheckCircle size={16} color="#fff" strokeWidth={3} />}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 12px', fontSize: 14, color: isChecked ? '#166534' : (isStockError ? '#b91c1c' : '#1e293b'), fontWeight: isChecked ? 600 : (isStockError ? 600 : 400) }}>
                                                            {cleanName}
                                                            {isStockError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠️ สต็อกไม่พอ</div>}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', fontSize: 14, color: isStockError ? '#ef4444' : '#64748b', textAlign: 'right' }}>
                                                            {stockDisplay}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', fontSize: 15, fontWeight: 700, color: isChecked ? '#15803d' : '#0369a1', textAlign: 'right' }}>
                                                            {requiredQty}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#64748b' }}>
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
                                {(!existingTask || !existingTask.RequisitionJSON) && !allChecked && rawMaterials.length > 0 && (
                                    <div style={{ fontSize: 13, color: '#ef4444', textAlign: 'right', fontWeight: 500 }}>
                                        * กรุณาตรวจสอบและเลือกวัตถุดิบให้ครบเพื่อทำใบขอเบิก
                                    </div>
                                )}
                                
                                {existingTask && existingTask.status === 'รอเบิกวัตถุดิบ' && (
                                    <div style={{ fontSize: 14, color: '#d97706', textAlign: 'center', fontWeight: 600, padding: 12, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                                        ⏳ ส่งใบเบิกแล้ว กรุณารอฝ่ายคลังสินค้าอนุมัติจ่ายของ
                                    </div>
                                )}

                                {existingTask && (existingTask.status === 'พร้อมเริ่มงาน' || existingTask.status === 'เริ่มผสม') && (
                                    <div style={{ fontSize: 14, color: '#15803d', textAlign: 'center', fontWeight: 600, padding: 12, background: '#dcfce7', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                                        ✅ คลังอนุมัติจ่ายวัตถุดิบแล้ว! สามารถเริ่มผสมได้เลย
                                    </div>
                                )}

                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (!isMixing) {
                                            handleStartMixing();
                                        } else {
                                            handleSubmit(e);
                                        }
                                    }}
                                    disabled={loading || ((!existingTask || !existingTask.RequisitionJSON) && !allChecked) || rawMaterials.length === 0 || (existingTask && existingTask.status === 'รอเบิกวัตถุดิบ')}
                                    style={{ 
                                        background: (loading || ((!existingTask || !existingTask.RequisitionJSON) && !allChecked) || rawMaterials.length === 0 || (existingTask && existingTask.status === 'รอเบิกวัตถุดิบ')) ? '#94a3b8' : (isMixing ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'), 
                                        color: '#ffffff', border: 'none', padding: '16px', 
                                        borderRadius: 12, fontSize: 16, fontWeight: 700, 
                                        cursor: (loading || ((!existingTask || !existingTask.RequisitionJSON) && !allChecked) || rawMaterials.length === 0 || (existingTask && existingTask.status === 'รอเบิกวัตถุดิบ')) ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, 
                                        boxShadow: (loading || ((!existingTask || !existingTask.RequisitionJSON) && !allChecked) || (existingTask && existingTask.status === 'รอเบิกวัตถุดิบ')) ? 'none' : (isMixing ? '0 4px 12px rgba(16, 185, 129, 0.4)' : '0 4px 12px rgba(37, 99, 235, 0.4)'),
                                        transition: 'all 0.2s ease', width: '100%'
                                    }}
                                >
                                    {isMixing ? <Save size={20} /> : <Package size={20} />} 
                                    {loading ? 'กำลังดำเนินการ...' : 
                                        (isMixing ? 'ผสมเสร็จสิ้น — บันทึกการผลิตและส่งตรวจ QC' : 
                                            ((!existingTask || !existingTask.RequisitionJSON) ? 'บันทึกและส่งใบเบิกวัตถุดิบ' : 
                                                (existingTask.status === 'รอเบิกวัตถุดิบ' ? 'รอเบิกวัตถุดิบ' : 'เริ่มผสม')
                                            )
                                        )
                                    }
                                </button>

                                {!isMixing && (
                                    <button 
                                        onClick={(e) => {
                                            if (existingTask && existingTask.RequisitionJSON) {
                                                handlePrintRequisition(e);
                                            } else {
                                                handlePreviewRequisition(e);
                                            }
                                        }}
                                        style={{ 
                                            background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', 
                                            padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, 
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s ease', width: '100%'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    >
                                        <FileText size={18} color="#64748b" /> 
                                        {(existingTask && existingTask.RequisitionJSON) ? 'ดูใบเบิกวัตถุดิบที่อนุมัติแล้ว (PDF)' : 'ดูตัวอย่างใบเบิก (PDF)'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default OperatorWIP;

/**
 * =============================================================================
 * ProductionContext.jsx — Shared State ระหว่าง Production ↔ QC
 * =============================================================================
 * Context กลางที่เชื่อมโยง:
 *   - Production (Operator) ส่งคำขอ QC เมื่อถึงขั้นตอน QC
 *   - QC เห็นคำขอจาก Production แล้วตรวจสอบ ผ่าน/ไม่ผ่าน
 *   - ผลตรวจ QC อัปเดตกลับไปที่ Production Stepper อัตโนมัติ
 *
 * Flow:
 *   Production ถึงขั้น qc_inprocess/qc_final
 *   → สร้าง QC Request (status: 'รอตรวจ')
 *   → QC เห็น QC Request ในหน้า QC
 *   → QC กด ผ่าน/ไม่ผ่าน
 *   → Production Stepper อัปเดตอัตโนมัติ
 * =============================================================================
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MOCK_PRODUCTION_TASKS, PRODUCTION_STEPS } from '../data/productionMockData';
import API_BASE from '../config';

const ProductionContext = createContext();

export function ProductionProvider({ children }) {
    const [tasks, setTasks] = useState([]);
    const [qcRequests, setQcRequests] = useState([]);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/production/tasks`);
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
        }
    }, []);

    const fetchQcRequests = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/qc/requests`);
            if (res.ok) {
                const data = await res.json();
                // Map the DB column names back to frontend structure to minimize changes
                const mappedData = data.map(dbItem => ({
                    id: dbItem.RequestID,
                    taskId: dbItem.TaskID,
                    jobOrderId: dbItem.JobOrderID,
                    batchNo: dbItem.BatchNo,
                    formulaName: dbItem.FormulaName,
                    line: dbItem.Line,
                    type: dbItem.Type,
                    typeLabel: dbItem.Type === 'qc_inprocess' ? 'QC In-Process (ระหว่างผลิต)' : 'QC Final (ขั้นสุดท้าย)',
                    requestedAt: dbItem.RequestedAt ? new Date(dbItem.RequestedAt).toLocaleString('th-TH') : '',
                    status: dbItem.Status,
                    result: dbItem.Status,
                    inspector: dbItem.Inspector,
                    inspectedAt: dbItem.InspectedAt ? new Date(dbItem.InspectedAt).toLocaleString('th-TH') : '',
                    notes: dbItem.Notes || '',
                }));
                setQcRequests(mappedData);
            }
        } catch (err) {
            console.error('Failed to fetch QC requests:', err);
        }
    }, []);

    // Load data initially + auto-polling ทุก 10 วินาที
    useEffect(() => {
        fetchTasks();
        fetchQcRequests();
        const interval = setInterval(() => {
            fetchTasks();
            fetchQcRequests();
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchQcRequests, fetchTasks]);

    // ── Production sends QC Request ──
    const sendQcRequest = useCallback(async (task, qcType) => {
        const now = new Date().toISOString();
        const payload = {
            requestID: `QCR-${Date.now()}`,
            taskID: task.id,
            jobOrderID: task.jobOrderId,
            batchNo: task.batchNo,
            formulaName: task.formulaName,
            line: task.line,
            type: qcType,
            requestedAt: now,
            status: 'รอตรวจ',
        };
        
        try {
            await fetch(`${API_BASE}/qc/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            // Refresh from backend
            fetchQcRequests();
        } catch (err) {
            console.error('Failed to send QC request:', err);
        }
    }, [fetchQcRequests]);

    // ── QC submits result ──
    const submitQcResult = useCallback(async (requestId, result, inspector, notes, checklist = [], disposition = null) => {
        const now = new Date().toISOString();
        const payload = {
            result_status: result,
            inspector: inspector || 'system',
            inspectedAt: now,
            notes: notes || '',
            checklist: checklist,
            disposition: disposition || null
        };

        try {
            const res = await fetch(`${API_BASE}/qc/requests/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                // Refresh list
                await fetchQcRequests();

                // Find the request to get taskId info
                const request = qcRequests.find(r => r.id === requestId);
                if (request && request.taskId) {
                    if (request.taskId.startsWith('PKG-')) {
                        // Packaging QC flow
                        const nextStatus = result === 'ผ่าน' ? 'QC ผ่าน' : 'บรรจุเสร็จ';
                        try {
                            await fetch(`${API_BASE}/packaging/tasks/${request.taskId}/status`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: nextStatus })
                            });
                            await fetchTasks();
                        } catch (pkgErr) {
                            console.error('Failed to update packaging task after QC:', pkgErr);
                        }
                    } else if (result === 'ผ่าน') {
                        // QC passed → advance to next step
                        advanceTaskStep(request.taskId);
                    } else if (result === 'ไม่ผ่าน') {
                        // QC failed → handle based on disposition
                        if (disposition === 'reject') {
                            // Reject → mark task as rejected
                            await rejectTask(request.taskId);
                        } else {
                            // Rework (default) → revert to previous production step
                            await revertTaskStep(request.taskId, request.type);
                        }
                        // Auto-create NCR
                        try {
                            await fetch(`${API_BASE}/qc/defect`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    ncrNumber: `NCR-${Date.now().toString().slice(-8)}`,
                                    refLot: request.batchNo,
                                    itemName: request.formulaName,
                                    issueDescription: notes || 'QC ไม่ผ่าน',
                                    actionTaken: disposition === 'reject' ? 'คัดทิ้ง (Reject)' : 'ส่งกลับแก้ไข (Rework)',
                                    status: disposition === 'reject' ? 'ดำเนินการแล้ว' : 'รอดำเนินการ'
                                })
                            });
                        } catch (ncrErr) {
                            console.error('Failed to auto-create NCR:', ncrErr);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Failed to submit QC result:', err);
        }
    }, [qcRequests, fetchQcRequests]);

    // ── Revert task to previous production step (Rework) ──
    const revertTaskStep = useCallback(async (taskId, qcType) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Determine which step to revert to
        const revertTo = qcType === 'qc_inprocess' ? 'production_1' : 'production_2';
        const now = new Date().toISOString();

        const payload = {
            currentStep: revertTo,
            stepTimes: { ...task.stepTimes, [`${revertTo}_rework`]: now },
            status: 'กำลังทำ',
            endTime: null
        };

        try {
            await fetch(`${API_BASE}/production/tasks/${taskId}/advance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            fetchTasks();
        } catch (err) {
            console.error('Failed to revert task step:', err);
        }
    }, [tasks, fetchTasks]);

    // ── Reject task permanently ──
    const rejectTask = useCallback(async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const now = new Date().toISOString();
        const payload = {
            currentStep: task.currentStep,
            stepTimes: { ...task.stepTimes, rejected: now },
            status: 'เสร็จสิ้น',
            endTime: now
        };

        try {
            await fetch(`${API_BASE}/production/tasks/${taskId}/advance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            fetchTasks();
        } catch (err) {
            console.error('Failed to reject task:', err);
        }
    }, [tasks, fetchTasks]);

    // ── Advance task to next step ──
    const advanceTaskStep = useCallback(async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const currentIdx = PRODUCTION_STEPS.findIndex(s => s.key === task.currentStep);
        if (currentIdx >= PRODUCTION_STEPS.length - 1) return;
        
        const nextStep = PRODUCTION_STEPS[currentIdx + 1];
        const now = new Date().toISOString();
        const isFinished = nextStep.key === 'stock';

        const payload = {
            currentStep: nextStep.key,
            stepTimes: { ...task.stepTimes, [nextStep.key]: now },
            status: isFinished ? 'เสร็จสิ้น' : 'กำลังทำ',
            endTime: isFinished ? now : null
        };

        try {
            const res = await fetch(`${API_BASE}/production/tasks/${taskId}/advance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                fetchTasks(); // refresh data automatically
            }
        } catch (err) {
            console.error('Failed to advance task natively:', err);
        }
    }, [tasks, fetchTasks]);

    // ── Start a task ──
    const startTask = useCallback(async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const now = new Date().toISOString();
        const payload = {
            status: 'กำลังทำ',
            currentStep: 'production_1',
            startTime: now,
            stepTimes: { ...task.stepTimes, production_1: now }
        };

        try {
            const res = await fetch(`${API_BASE}/production/tasks/${taskId}/start`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                fetchTasks();
            }
        } catch (err) {
            console.error('Failed to start task:', err);
        }
    }, [tasks, fetchTasks]);

    // ── Add Production Log ──
    const addProductionLog = useCallback(async (taskId, payload) => {
        try {
            const res = await fetch(`${API_BASE}/production/tasks/${taskId}/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                // Refresh tasks to get the updated produced/defect quantities
                fetchTasks();
                return { success: true };
            } else {
                const errorData = await res.json();
                return { success: false, message: errorData.message };
            }
        } catch (err) {
            console.error('Failed to add production log:', err);
            return { success: false, message: 'Server connection error' };
        }
    }, [fetchTasks]);

    // ── Get QC requests filtered by type ──
    const getQcRequestsByType = useCallback((type) => {
        return qcRequests.filter(r => r.type === type);
    }, [qcRequests]);

    // ── Get pending QC requests ──
    const getPendingQcRequests = useCallback(() => {
        return qcRequests.filter(r => r.status === 'รอตรวจ');
    }, [qcRequests]);

    const value = {
        tasks,
        qcRequests,
        fetchQcRequests,
        sendQcRequest,
        submitQcResult,
        advanceTaskStep,
        startTask,
        getQcRequestsByType,
        getPendingQcRequests,
        addProductionLog
    };

    return (
        <ProductionContext.Provider value={value}>
            {children}
        </ProductionContext.Provider>
    );
}

export function useProduction() {
    const context = useContext(ProductionContext);
    if (!context) {
        throw new Error('useProduction must be used within a ProductionProvider');
    }
    return context;
}

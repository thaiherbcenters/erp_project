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

import { createContext, useContext, useState, useCallback } from 'react';
import { MOCK_PRODUCTION_TASKS, PRODUCTION_STEPS } from '../data/productionMockData';

const ProductionContext = createContext();

export function ProductionProvider({ children }) {
    const [tasks, setTasks] = useState(MOCK_PRODUCTION_TASKS);
    const [qcRequests, setQcRequests] = useState([
        // Pre-populated from mock data — tasks that are currently at QC steps
        {
            id: 'QCR-001',
            taskId: 'PT-005',
            jobOrderId: 'JO-2026-005',
            batchNo: 'B2026-005-2',
            formulaName: 'ครีมสมุนไพรบำรุงผิว ขมิ้นชัน',
            line: 'Line B',
            type: 'qc_inprocess',
            typeLabel: 'QC In-Process (ระหว่างผลิต)',
            requestedAt: '2026-03-04 11:00',
            status: 'รอตรวจ',        // 'รอตรวจ', 'ผ่าน', 'ไม่ผ่าน', 'Hold'
            result: null,
            inspector: null,
            inspectedAt: null,
            notes: '',
        },
    ]);

    // ── Production sends QC Request ──
    const sendQcRequest = useCallback((task, qcType) => {
        const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const newRequest = {
            id: `QCR-${Date.now()}`,
            taskId: task.id,
            jobOrderId: task.jobOrderId,
            batchNo: task.batchNo,
            formulaName: task.formulaName,
            line: task.line,
            type: qcType,  // 'qc_inprocess' or 'qc_final'
            typeLabel: qcType === 'qc_inprocess' ? 'QC In-Process (ระหว่างผลิต)' : 'QC Final (ขั้นสุดท้าย)',
            requestedAt: now,
            status: 'รอตรวจ',
            result: null,
            inspector: null,
            inspectedAt: null,
            notes: '',
        };
        setQcRequests(prev => [newRequest, ...prev]);
        return newRequest;
    }, []);

    // ── QC submits result ──
    const submitQcResult = useCallback((requestId, result, inspector, notes) => {
        const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
        
        setQcRequests(prev => prev.map(req => {
            if (req.id !== requestId) return req;
            return {
                ...req,
                status: result,    // 'ผ่าน' or 'ไม่ผ่าน' or 'Hold'
                result,
                inspector,
                inspectedAt: now,
                notes,
            };
        }));

        // If passed, advance production step
        const request = qcRequests.find(r => r.id === requestId);
        if (request && result === 'ผ่าน') {
            advanceTaskStep(request.taskId);
        }
    }, [qcRequests]);

    // ── Advance task to next step ──
    const advanceTaskStep = useCallback((taskId) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            const currentIdx = PRODUCTION_STEPS.findIndex(s => s.key === t.currentStep);
            if (currentIdx >= PRODUCTION_STEPS.length - 1) return t;
            const nextStep = PRODUCTION_STEPS[currentIdx + 1];
            const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
            const isFinished = nextStep.key === 'stock';
            return {
                ...t,
                currentStep: nextStep.key,
                stepTimes: { ...t.stepTimes, [nextStep.key]: now },
                status: isFinished ? 'เสร็จสิ้น' : 'กำลังทำ',
                endTime: isFinished ? now : null,
            };
        }));
    }, []);

    // ── Start a task ──
    const startTask = useCallback((taskId) => {
        const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            return {
                ...t,
                status: 'กำลังทำ',
                currentStep: 'production_1',
                startTime: now,
                stepTimes: { ...t.stepTimes, production_1: now },
            };
        }));
    }, []);

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
        sendQcRequest,
        submitQcResult,
        advanceTaskStep,
        startTask,
        getQcRequestsByType,
        getPendingQcRequests,
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

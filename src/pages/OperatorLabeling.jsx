/**
 * =============================================================================
 * OperatorLabeling.jsx — หน้า งานติดฉลาก (ฝ่ายผลิต)
 * =============================================================================
 * Flow:  ฝ่ายผลิต (บรรจุเสร็จ) → ตรวจสอบสต็อกสติ๊กเกอร์/ขอเบิก → ติดฉลาก → ส่ง QC Final
 * UX/UI ออกแบบตามโครงสร้างหน้า งานบรรจุ (OperatorPackaging)
 * =============================================================================
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import PaginationControl from '../components/PaginationControl';
import CustomSelect from '../components/CustomSelect';
import API_BASE from '../config';
import { 
  Tag, CheckCircle2, Clock, Activity, Search, 
  Plus, X, AlertTriangle, Eye, Calendar, CheckCircle,
  Box, PlayCircle, Send, AlertCircle, FileText,
  Star, Edit3, Barcode, ScanBarcode, ShieldCheck, HelpCircle
} from 'lucide-react';
import './PageCommon.css';
import './Packaging.css';
import './OperatorLabeling.css';

// ── Helper: สีสถานะ ──
const getStatusBadge = (status) => {
  const map = {
    'รอสติ๊กเกอร์': 'badge-warning',
    'รอเบิกสติ๊กเกอร์': 'badge-warning',
    'รอสั่งสติ๊กเกอร์': 'badge-warning',
    'สั่งแล้ว-รอรับ': 'badge-warning',
    'พร้อมติดฉลาก': 'badge-info',
    'รับแล้ว-พร้อมติด': 'badge-info',
    'กำลังติดฉลาก': 'badge-primary',
    'ติดฉลากเสร็จ': 'badge-success',
    'รอ QC Final': 'badge-purple',
    'QC ผ่าน': 'badge-success',
  };
  return map[status] || 'badge-neutral';
};

const getCardStatusClass = (status) => {
  if (['รอสติ๊กเกอร์', 'รอเบิกสติ๊กเกอร์', 'รอสั่งสติ๊กเกอร์', 'สั่งแล้ว-รอรับ'].includes(status)) return 'status-req';
  if (['พร้อมติดฉลาก', 'รับแล้ว-พร้อมติด'].includes(status)) return 'status-wait';
  if (status === 'กำลังติดฉลาก') return 'in-progress';
  return '';
};

export default function OperatorLabeling() {
  const { user, canUpdate } = useAuth();
  const { showAlert, showConfirm } = useAlert();

  // ── Tab State ──
  const [activeTab, setActiveTab] = useState('labeling_main'); // 'labeling_main' | 'labeling_materials'

  // ── Task States ──
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ทั้งหมด');
  const [tblPage, setTblPage] = useState(1);
  const [tblPageSize, setTblPageSize] = useState(10);

  // ── Detail Modal States ──
  const [selectedTask, setSelectedTask] = useState(null);
  const [liveConfigs, setLiveConfigs] = useState([]);
  const [availableStickers, setAvailableStickers] = useState([]);
  const [checkingStock, setCheckingStock] = useState(false);
  const [allSufficient, setAllSufficient] = useState(false);
  const [selectedStickerId, setSelectedStickerId] = useState('');
  const [selectingSticker, setSelectingSticker] = useState(false);

  // ── Progress Modal States (Manual & Barcode Scanner) ──
  const [progressTarget, setProgressTarget] = useState(null);
  const [scanMode, setScanMode] = useState(false);
  const [addedQty, setAddedQty] = useState('');
  const [defectQty, setDefectQty] = useState('');
  const [scanMultiplier, setScanMultiplier] = useState(1);
  const barcodeInputRef = useRef(null);

  // ── Warehouse Sticker Inventory States ──
  const [stickerItems, setStickerItems] = useState([]);
  const [stickerLoading, setStickerLoading] = useState(false);

  // ── Fetch Tasks ──
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/labeling/tasks`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Error fetching labeling tasks', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Warehouse Stickers (Category: ฉลาก/สิ่งพิมพ์) ──
  const fetchStickerMaterials = async () => {
    try {
      setStickerLoading(true);
      const res = await fetch(`${API_BASE}/stock?category=${encodeURIComponent('ฉลาก/สิ่งพิมพ์')}&limit=1000`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStickerItems(data.data || data.items || (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.error('Failed to fetch sticker materials', err);
    } finally {
      setStickerLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchStickerMaterials();
  }, []);

  // ── Barcode Scanner Focus ──
  useEffect(() => {
    if (progressTarget && scanMode && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [progressTarget, scanMode]);

  // ── Reset page on filter changes ──
  useEffect(() => {
    setTblPage(1);
  }, [searchTerm, statusFilter]);

  // ── Open Detail Modal & Live Check Stock ──
  const handleOpenDetailModal = async (task) => {
    setSelectedTask(task);
    setLiveConfigs([]);
    setSelectedStickerId('');
    setCheckingStock(true);
    setAllSufficient(false);

    try {
      const res = await fetch(`${API_BASE}/labeling/tasks/${task.TaskID}/check-stock`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLiveConfigs(data.configs || []);
        setAvailableStickers(data.availableStickers || []);
        setAllSufficient(data.allSufficient);
      }
    } catch (err) {
      console.error('Error checking stock:', err);
    } finally {
      setCheckingStock(false);
    }
  };

  // ── Open Progress Modal ──
  const handleOpenProgress = (task) => {
    setProgressTarget(task);
    setScanMode(false);
    setAddedQty('');
    setDefectQty('');
  };

  // ── Select Sticker from Warehouse for Task ──
  const handleSelectSticker = async (taskId, stickerItemId) => {
    if (!canUpdate('operator_labeling')) {
      showAlert('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์แก้ไขข้อมูล', 'error');
      return;
    }
    if (!stickerItemId) {
      showAlert('แจ้งเตือน', 'กรุณาเลือกรายการสติ๊กเกอร์จากคลังสินค้า', 'warning');
      return;
    }

    setSelectingSticker(true);
    try {
      const res = await fetch(`${API_BASE}/labeling/tasks/${taskId}/select-sticker`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ stickerItemId, qtyPerUnit: 1, applyTo: 'ขวด' })
      });
      if (res.ok) {
        const data = await res.json();
        setLiveConfigs(data.configs || []);
        setAllSufficient(data.allSufficient);
        showAlert('สำเร็จ', 'เลือกสติ๊กเกอร์จากคลังเรียบร้อยแล้ว', 'success');
        fetchTasks();
      } else {
        const data = await res.json().catch(() => ({}));
        showAlert('ข้อผิดพลาด', data.message || 'ไม่สามารถเลือกสติ๊กเกอร์ได้', 'error');
      }
    } catch (err) {
      showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setSelectingSticker(false);
    }
  };

  // ── Start Task ──
  const handleStartTask = async (id) => {
    if (!canUpdate('operator_labeling')) {
      showAlert('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์เริ่มต้นการทำงานนี้', 'error');
      return;
    }
    
    const ok = await showConfirm('ยืนยัน', 'ต้องการเริ่มติดฉลากใช่หรือไม่?', 'info');
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/labeling/tasks/${id}/start`, { 
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        showAlert('สำเร็จ', 'เริ่มติดฉลากแล้ว', 'success');
        fetchTasks();
        setSelectedTask(null);
      } else {
        showAlert('ข้อผิดพลาด', 'ไม่สามารถเริ่มติดฉลากได้', 'error');
      }
    } catch (err) {
      showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  // ── Send Requisition to Warehouse ──
  const handleSendRequisition = async (id) => {
    if (!canUpdate('operator_labeling')) {
      showAlert('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์ขอเบิกสติ๊กเกอร์', 'error');
      return;
    }

    if (liveConfigs.length === 0) {
      showAlert('ผิดพลาด', 'ไม่พบรายการสติ๊กเกอร์ที่ต้องเบิก', 'error');
      return;
    }

    const requisitionItems = liveConfigs.map(cfg => ({
      id: cfg.stickerItemId,
      name: cfg.stickerName,
      applyTo: cfg.applyTo,
      deductQty: cfg.needed,
      unit: cfg.unit || 'ดวง'
    }));

    if (!allSufficient) {
      const ok = await showConfirm('ยืนยันการขอเบิก', 'สติ๊กเกอร์บางรายการในคลังสินค้ามีไม่พอ คุณต้องการส่งใบเบิกให้ฝ่ายคลังพิจารณาหรือไม่?', 'warning');
      if (!ok) return;
    } else {
      const ok = await showConfirm('ยืนยันการขอเบิก', 'ต้องการส่งใบเบิกสติ๊กเกอร์ไปยังฝ่ายคลังสินค้าเพื่อดำเนินการจ่ายสต็อกใช่หรือไม่?', 'info');
      if (!ok) return;
    }

    try {
      const res = await fetch(`${API_BASE}/labeling/tasks/${id}/requisition`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          requisitionItems,
          requesterName: user?.name || user?.username || 'พนักงานติดฉลาก'
        })
      });

      if (res.ok) {
        showAlert('สำเร็จ', 'ส่งใบเบิกสติ๊กเกอร์ไปยังคลังสินค้าเรียบร้อยแล้ว', 'success');
        fetchTasks();
        setSelectedTask(null);
      } else {
        const data = await res.json().catch(() => ({}));
        showAlert('ข้อผิดพลาด', data.message || 'ไม่สามารถส่งใบเบิกได้', 'error');
      }
    } catch (err) {
      showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
  };

  // ── Submit Progress (Manual & Barcode) ──
  const submitProgress = async (id, sqty, dqty) => {
    const parsedAdded = parseInt(sqty, 10) || 0;
    const parsedDefect = parseInt(dqty, 10) || 0;
    if (parsedAdded === 0 && parsedDefect === 0) return;

    if (progressTarget) {
      const remaining = progressTarget.Qty - (progressTarget.LabeledQty || 0);
      const totalInput = parsedAdded + parsedDefect;
      if (totalInput > remaining) {
        showAlert('ยอดเกินกำหนด', `คุณใส่ยอดรวม (ดี+เสีย) ${totalInput} ซึ่งเกินยอดเป้าหมายคงเหลือ ${remaining} ชิ้น`, 'warning');
        return;
      }
    }

    const currentGood = progressTarget ? (progressTarget.LabeledQty || 0) : 0;
    const currentDefect = progressTarget ? (progressTarget.DefectQty || 0) : 0;
    const newGood = currentGood + parsedAdded;
    const newDefect = currentDefect + parsedDefect;

    try {
      const res = await fetch(`${API_BASE}/labeling/tasks/${id}/progress`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ labeledQty: newGood, defectQty: newDefect })
      });
      if (res.ok) {
        fetchTasks();
        if (progressTarget) {
          setProgressTarget(prev => prev ? { ...prev, LabeledQty: newGood, DefectQty: newDefect } : null);
        }
        if (!scanMode) {
          setProgressTarget(null); // ปิด modal เมื่อบันทึกแบบกรอกมือสำเร็จ
        }
        setAddedQty('');
        setDefectQty('');
      } else {
        showAlert('เกิดข้อผิดพลาด', 'อัปเดตยอดไม่สำเร็จ', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  // ── Barcode Scanner Scan Handler ──
  const handleProgressBarcodeScan = (e) => {
    if (e.key === 'Enter') {
      const code = e.target.value;
      if (code.trim() !== '') {
        const remaining = progressTarget.Qty - (progressTarget.LabeledQty || 0);
        if (scanMultiplier > remaining) {
          showAlert('ยอดเกินกำหนด', `คุณตั้งตัวคูณไว้ที่ ${scanMultiplier} ชิ้น ซึ่งเกินยอดคงเหลือ (${remaining} ชิ้น)`, 'warning');
          return;
        }
        submitProgress(progressTarget.TaskID, scanMultiplier, 0);
      }
      e.target.value = ''; // เคลียร์ช่องพร้อมยิงบาร์โค้ดครั้งต่อไป
    }
  };

  // ── Complete Task (Send to QC) ──
  const handleCompleteTask = async (id) => {
    if (!canUpdate('operator_labeling')) {
      showAlert('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์แก้ไขข้อมูล', 'error');
      return;
    }

    const task = tasks.find(t => t.TaskID === id) || selectedTask || progressTarget;
    if (task) {
      const totalProcessed = (task.LabeledQty || 0) + (task.DefectQty || 0);
      if (totalProcessed < task.Qty) {
        const ok = await showConfirm('ยืนยันเสร็จสิ้น', `ยอดรวมของดีและของเสีย (${totalProcessed}) ยังไม่ถึงเป้าหมาย (${task.Qty}) ต้องการเสร็จสิ้นงานก่อนกำหนดหรือไม่?`, 'warning');
        if (!ok) return;
      } else {
        const ok = await showConfirm('ยืนยัน', 'ต้องการเสร็จสิ้นการติดฉลากและส่งไปยังขั้นตอน QC Final ใช่หรือไม่?', 'info');
        if (!ok) return;
      }
    } else {
      const ok = await showConfirm('ยืนยัน', 'ต้องการเสร็จสิ้นการติดฉลากใช่หรือไม่?', 'info');
      if (!ok) return;
    }

    try {
      const res = await fetch(`${API_BASE}/labeling/tasks/${id}/complete`, { 
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        showAlert('สำเร็จ', 'บันทึกเสร็จสิ้นการติดฉลากและส่งไปยัง QC Final แล้ว', 'success');
        fetchTasks();
        setSelectedTask(null);
        setProgressTarget(null);
      } else {
        showAlert('ข้อผิดพลาด', 'ไม่สามารถจบงานได้', 'error');
      }
    } catch (err) {
      showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  // ── Print Requisition PDF (Approved) ──
  const handlePrintRequisition = async (taskId) => {
    try {
      const res = await fetch(`${API_BASE}/print/requisition/${taskId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch requisition pdf');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถแสดงใบเบิกได้', 'error');
    }
  };

  // ── Print Requisition Preview PDF ──
  const handlePreviewRequisition = async (task, configs) => {
    try {
      const reqData = {
        formulaName: task.ProductName,
        expectedQty: task.Qty,
        unit: 'ชิ้น',
        jobOrderId: task.JobOrderID || task.BatchNo,
        taskId: task.TaskID,
        batchNo: task.BatchNo,
        items: configs.map(c => ({ id: c.stickerItemId, name: c.stickerName, deductQty: c.needed, unit: c.unit || 'ดวง' })),
        date: new Date().toLocaleDateString('th-TH'),
        requesterName: user?.name || user?.username || 'พนักงานติดฉลาก'
      };
      const res = await fetch(`${API_BASE}/print/requisition/preview`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(reqData)
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        showAlert('ข้อผิดพลาด', 'ไม่สามารถสร้างพรีวิวใบเบิกได้', 'error');
      }
    } catch(e) { 
      console.error(e);
      showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  // ── Print QC Request PDF ──
  const handlePrintQcRequest = async (taskId) => {
    try {
      const res = await fetch(`${API_BASE}/print/qc-request/${taskId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch QC request pdf');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถแสดงใบส่งตรวจ QC ได้', 'error');
    }
  };

  // ── Pending Tasks for Top Kanban Board ──
  const pendingTasks = useMemo(() => {
    return tasks
      .filter(t => ['รอสติ๊กเกอร์', 'รอเบิกสติ๊กเกอร์', 'รอสั่งสติ๊กเกอร์', 'สั่งแล้ว-รอรับ', 'พร้อมติดฉลาก', 'รับแล้ว-พร้อมติด', 'กำลังติดฉลาก'].includes(t.Status))
      .sort((a, b) => {
        const dateA = new Date(a.CreatedAt || 0).getTime();
        const dateB = new Date(b.CreatedAt || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b.TaskID || '').localeCompare(a.TaskID || '');
      });
  }, [tasks]);

  // ── Filtered Tasks for Data Table ──
  const statusOptions = ['ทั้งหมด', 'รอสติ๊กเกอร์', 'รอเบิกสติ๊กเกอร์', 'พร้อมติดฉลาก', 'กำลังติดฉลาก', 'ติดฉลากเสร็จ'];
  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => {
        const matchSearch = (task.ProductName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (task.TaskID || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (task.BatchNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (task.JobOrderID || '').toLowerCase().includes(searchTerm.toLowerCase());
        let matchStatus = true;
        if (statusFilter === 'รอสติ๊กเกอร์') {
          matchStatus = ['รอสติ๊กเกอร์', 'รอสั่งสติ๊กเกอร์', 'สั่งแล้ว-รอรับ'].includes(task.Status);
        } else if (statusFilter === 'รอเบิกสติ๊กเกอร์') {
          matchStatus = task.Status === 'รอเบิกสติ๊กเกอร์';
        } else if (statusFilter === 'พร้อมติดฉลาก') {
          matchStatus = ['พร้อมติดฉลาก', 'รับแล้ว-พร้อมติด'].includes(task.Status);
        } else if (statusFilter !== 'ทั้งหมด') {
          matchStatus = task.Status === statusFilter;
        }
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(a.CreatedAt || 0).getTime();
        const dateB = new Date(b.CreatedAt || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b.TaskID || '').localeCompare(a.TaskID || '');
      });
  }, [tasks, searchTerm, statusFilter]);

  const paginatedTasks = useMemo(() => {
    const start = (tblPage - 1) * tblPageSize;
    return filteredTasks.slice(start, start + tblPageSize);
  }, [filteredTasks, tblPage, tblPageSize]);

  // ══════════════════════════════════════════════════════════════
  // Modal: รายละเอียดคำสั่งติดฉลาก (Detail Modal)
  // ══════════════════════════════════════════════════════════════
  const renderDetailModal = () => {
    if (!selectedTask) return null;
    const task = selectedTask;
    const progress = task.Qty > 0 ? Math.min(100, Math.floor(((task.LabeledQty || 0) / task.Qty) * 100)) : 0;
    const hasConfigIssue = liveConfigs.length > 0 && !allSufficient;

    return (
      <div className="pkg-modal-overlay" onClick={() => setSelectedTask(null)}>
        <div className="pkg-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🏷️ {task.TaskID}</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#71717a' }}>{task.ProductName}</p>
            </div>
            <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}>
              <X size={20} />
            </button>
          </div>

          {/* Body — Scrollable */}
          <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
            {/* Status + Tags */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <span className={`badge ${getStatusBadge(task.Status)}`} style={{ fontSize: 13, padding: '6px 14px', fontWeight: 600 }}>
                {task.Status}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f3e8ff', color: '#7e22ce', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                <Tag size={14} /> {task.LabelType === 'custom' ? 'ผลิตตามออร์เดอร์ (OEM)' : 'ผลิตตามแผน (MTS)'}
              </span>
              {task.JobOrderID && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e0e7ff', color: '#3730a3', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  📋 {task.JobOrderID}
                </span>
              )}
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
              <div>
                <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>เลขผลิต (JO / Batch)</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{task.JobOrderID || task.BatchNo}</p>
              </div>
              <div>
                <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>สายการผลิต (Line)</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{task.Line || 'Line A'}</p>
              </div>
              <div>
                <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>วันที่สร้าง</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{task.CreatedAt ? new Date(task.CreatedAt).toLocaleDateString('th-TH') : '-'}</p>
              </div>
              <div>
                <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>เป้าหมายติดฉลาก</span>
                <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#4f46e5', fontSize: 16 }}>{task.Qty?.toLocaleString()} ชิ้น</p>
              </div>
            </div>

            {/* Progress */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>ความคืบหน้าการติดฉลาก</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: progress === 100 ? '#16a34a' : '#4f46e5' }}>{progress}%</span>
              </div>
              <div className="progress-container" style={{ height: 28, borderRadius: 8 }}>
                <div className="progress-bar" style={{
                  width: `${progress}%`,
                  backgroundColor: progress === 100 ? '#16a34a' : '#6366f1',
                  borderRadius: 8,
                }} />
                <span className="progress-text" style={{ fontSize: 12 }}>
                  {(task.LabeledQty || 0).toLocaleString()} / {task.Qty?.toLocaleString()} ชิ้น
                  {task.DefectQty > 0 && <span style={{ color: '#ef4444', marginLeft: 6 }}>(เสีย {task.DefectQty} ชิ้น)</span>}
                </span>
              </div>
            </div>

            {/* ── ส่วนตรวจสอบสต็อกสติ๊กเกอร์ในคลังสินค้า (pkg-material-section) ── */}
            <div className="pkg-material-section" style={{ marginTop: 24 }}>
              <div className="pkg-material-header">
                <Box size={16} /> สติ๊กเกอร์/ฉลากที่ต้องใช้ (ตรวจสอบจากคลังสินค้า: หมวดฉลาก/สิ่งพิมพ์)
              </div>

              {checkingStock ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  <Clock size={20} style={{ marginBottom: 6, display: 'inline-block' }} />
                  <div>กำลังตรวจสอบสต็อกสติ๊กเกอร์จากคลัง...</div>
                </div>
              ) : (
                <>
                  {liveConfigs.length > 0 ? (
                    <table className="pkg-material-table">
                      <thead>
                        <tr>
                          <th>สติ๊กเกอร์</th>
                          <th style={{ textAlign: 'center' }}>ตำแหน่ง</th>
                          <th style={{ textAlign: 'right' }}>ต้องใช้</th>
                          <th style={{ textAlign: 'right' }}>คงเหลือในคลัง</th>
                          <th style={{ textAlign: 'center' }}>สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveConfigs.map((cfg, idx) => (
                          <tr key={idx}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{cfg.stickerName}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{cfg.stickerItemId}</div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                                {cfg.applyTo || 'ขวด'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#4338ca' }}>
                              {cfg.needed?.toLocaleString()} {cfg.unit || 'ดวง'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              <span style={{ color: cfg.isEnough ? '#16a34a' : '#dc2626' }}>
                                {cfg.stockAvailable?.toLocaleString()} {cfg.unit || 'ดวง'}
                              </span>
                              {!cfg.isEnough && (
                                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
                                  (ขาด {(cfg.needed - cfg.stockAvailable)?.toLocaleString()} {cfg.unit || 'ดวง'})
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {cfg.isEnough ? (
                                <span className="pkg-mat-ok">
                                  <CheckCircle size={13} /> เพียงพอ
                                </span>
                              ) : (
                                <span className="pkg-mat-warn">
                                  <AlertCircle size={13} /> ไม่พอ
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '16px', background: '#fffbeb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', marginBottom: 10 }}>
                        <AlertCircle size={16} color="#d97706" />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>ยังไม่ได้ผูกสติ๊กเกอร์สำหรับสินค้านี้ — กรุณาเลือกสติ๊กเกอร์จากคลัง (หมวด: ฉลาก/สิ่งพิมพ์):</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select 
                          style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          value={selectedStickerId}
                          onChange={e => setSelectedStickerId(e.target.value)}
                        >
                          <option value="">-- เลือกสติ๊กเกอร์/ฉลากที่มีในคลัง --</option>
                          {availableStickers.map(s => (
                            <option key={s.ItemID} value={s.ItemID}>
                              {s.ProductName} ({s.ItemID}) — คงเหลือในคลัง {s.Quantity?.toLocaleString()} {s.Unit}
                            </option>
                          ))}
                        </select>
                        <button 
                          className="btn-primary"
                          disabled={!selectedStickerId || selectingSticker}
                          onClick={() => handleSelectSticker(task.TaskID, selectedStickerId)}
                          style={{ fontSize: 13, padding: '8px 16px', whiteSpace: 'nowrap' }}
                        >
                          {selectingSticker ? 'กำลังบันทึก...' : 'เลือกสติ๊กเกอร์นี้'}
                        </button>
                      </div>
                    </div>
                  )}

                  {liveConfigs.length > 0 && (
                    <div className={`pkg-mat-summary ${allSufficient ? 'all-ok' : hasConfigIssue ? 'has-issue' : ''}`}>
                      {allSufficient && <><CheckCircle size={15} /> สติ๊กเกอร์ในคลังสินค้าพร้อมสำหรับเบิก / ติดฉลาก</>}
                      {hasConfigIssue && <><AlertCircle size={15} /> สติ๊กเกอร์ในคลังสินค้าไม่เพียงพอ — กรุณาประสานงานฝ่ายจัดซื้อหรือรอคลังรับเข้าสติ๊กเกอร์</>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            {/* Status: รอสติ๊กเกอร์ / รอสั่งสติ๊กเกอร์ */}
            {['รอสติ๊กเกอร์', 'รอสั่งสติ๊กเกอร์', 'สั่งแล้ว-รอรับ'].includes(task.Status) && (
              <>
                {liveConfigs.length > 0 && (
                  <button 
                    className="btn-secondary" 
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => handlePreviewRequisition(task, liveConfigs)}
                  >
                    <FileText size={14} /> พรีวิวใบเบิก
                  </button>
                )}
                <button 
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f59e0b' }}
                  disabled={liveConfigs.length === 0}
                  onClick={() => handleSendRequisition(task.TaskID)}
                >
                  <Send size={14} /> ส่งใบเบิกให้คลัง
                </button>
              </>
            )}

            {/* Status: รอเบิกสติ๊กเกอร์ */}
            {task.Status === 'รอเบิกสติ๊กเกอร์' && (
              <>
                <button 
                  className="btn-secondary" 
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => handlePrintRequisition(task.TaskID)}
                >
                  <FileText size={14} /> ดูใบเบิก
                </button>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 600, fontSize: 13, background: '#fef3c7', padding: '8px 14px', borderRadius: 8 }}>
                  <Clock size={14} /> รอคลังอนุมัติการจ่ายสติ๊กเกอร์...
                </span>
              </>
            )}

            {/* Status: พร้อมติดฉลาก */}
            {['พร้อมติดฉลาก', 'รับแล้ว-พร้อมติด'].includes(task.Status) && (
              <button 
                className="btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#10b981' }}
                onClick={() => handleStartTask(task.TaskID)}
              >
                <PlayCircle size={14} /> เริ่มติดฉลาก
              </button>
            )}

            {/* Status: กำลังติดฉลาก */}
            {task.Status === 'กำลังติดฉลาก' && (
              <>
                <button 
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#6366f1' }}
                  onClick={() => { handleOpenProgress(task); setSelectedTask(null); }}
                >
                  <Edit3 size={14} /> อัปเดตยอดติดฉลาก
                </button>
                {(task.LabeledQty + (task.DefectQty || 0)) >= task.Qty && (
                  <button 
                    className="btn-primary" 
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#10b981' }}
                    onClick={() => handleCompleteTask(task.TaskID)}
                  >
                    <CheckCircle2 size={14} /> ติดฉลากเสร็จ (ส่ง QC)
                  </button>
                )}
              </>
            )}

            {/* Status: ติดฉลากเสร็จ */}
            {task.Status === 'ติดฉลากเสร็จ' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7c3aed', fontWeight: 600, fontSize: 13, background: '#f5f3ff', padding: '8px 14px', borderRadius: 8 }}>
                <ShieldCheck size={14} /> ✅ ส่ง QC Final เรียบร้อยแล้ว
              </span>
            )}

            <button className="btn-secondary" onClick={() => setSelectedTask(null)}
              style={{ padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <X size={14} /> ปิด
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // Modal: อัปเดตยอดติดฉลาก / สแกนบาร์โค้ด (Progress Modal)
  // ══════════════════════════════════════════════════════════════
  const renderProgressModal = () => {
    if (!progressTarget) return null;
    const task = progressTarget;
    const progress = task.Qty > 0 ? Math.min(100, Math.floor(((task.LabeledQty || 0) / task.Qty) * 100)) : 0;
    const remaining = Math.max(0, task.Qty - (task.LabeledQty || 0));

    return (
      <div className="pkg-modal-overlay" onClick={() => setProgressTarget(null)}>
        <div className="pkg-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📝 อัปเดตยอดติดฉลาก</h2>
              <button onClick={() => setProgressTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#4f46e5', fontWeight: 600 }}>{task.TaskID} — {task.ProductName}</p>
          </div>

          {/* Progress Info */}
          <div style={{ padding: '16px 24px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>ความคืบหน้าปัจจุบัน</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>{progress}%</span>
            </div>
            <div className="progress-container" style={{ height: 28, borderRadius: 8, marginBottom: 16 }}>
              <div className="progress-bar" style={{ width: `${progress}%`, backgroundColor: '#6366f1', borderRadius: 8 }} />
              <span className="progress-text" style={{ fontSize: 12 }}>{(task.LabeledQty || 0).toLocaleString()} / {task.Qty?.toLocaleString()} ชิ้น</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#ef4444', fontWeight: 600 }}>ยอดของเสียสะสม: {task.DefectQty || 0} ชิ้น</p>
          </div>

          {/* Mode Toggle */}
          <div style={{ background: '#f1f5f9', padding: '12px 24px', display: 'flex', gap: 12 }}>
            <button 
              className={`btn-sm ${!scanMode ? 'btn-primary' : ''}`} 
              style={{ flex: 1, padding: 10, background: !scanMode ? '#4f46e5' : '#fff', color: !scanMode ? '#fff' : '#64748b', border: '1px solid #cbd5e1' }}
              onClick={() => setScanMode(false)}
            >
              <Edit3 size={16} style={{ marginRight: 6 }} /> พิมพ์กรอกยอด
            </button>
            <button 
              className={`btn-sm ${scanMode ? 'btn-primary' : ''}`} 
              style={{ flex: 1, padding: 10, background: scanMode ? '#4f46e5' : '#fff', color: scanMode ? '#fff' : '#64748b', border: '1px solid #cbd5e1' }}
              onClick={() => setScanMode(true)}
            >
              <Barcode size={16} style={{ marginRight: 6 }} /> สแกนบาร์โค้ด
            </button>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {!scanMode ? (() => {
              const parsedAdded = parseInt(addedQty, 10) || 0;
              const parsedDefect = parseInt(defectQty, 10) || 0;
              const totalInput = parsedAdded + parsedDefect;
              const isExceeded = totalInput > remaining;
              const isInvalid = (parsedAdded <= 0 && parsedDefect <= 0) || isExceeded;

              return (
                // MANUAL INPUT MODE
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>+ ยอดที่ทำได้เพิ่ม (Good Qty)</label>
                    <input 
                      type="number" min="0" placeholder="ระบุจำนวนชิ้น..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${isExceeded ? '#ef4444' : '#cbd5e1'}`, fontSize: 16 }}
                      value={addedQty} onChange={e => setAddedQty(e.target.value)}
                    />
                    {isExceeded && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                        ⚠️ ยอดเกินกำหนด! ยอดคงเหลือที่ต้องติดฉลากคือ {remaining.toLocaleString()} ชิ้น
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#ef4444' }}>+ ของเสียที่เกิด (Defect Qty)</label>
                    <input 
                      type="number" min="0" placeholder="ถ้าไม่มีไม่ต้องใส่..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #fca5a5', fontSize: 16 }}
                      value={defectQty} onChange={e => setDefectQty(e.target.value)}
                    />
                  </div>
                  
                  <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#4b5563', margin: '-4px 0 4px' }}>
                    ยอดรวมที่บันทึก (ดี + เสีย): <span style={{ color: totalInput <= remaining ? '#16a34a' : '#ef4444' }}>{totalInput.toLocaleString()}</span> / {remaining.toLocaleString()} ชิ้น
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      className="btn-primary" 
                      style={{ flex: 1, padding: 12, fontSize: 15, opacity: isInvalid ? 0.5 : 1, cursor: isInvalid ? 'not-allowed' : 'pointer' }} 
                      disabled={isInvalid}
                      onClick={() => submitProgress(task.TaskID, addedQty, defectQty)}
                    >
                      บันทึกยอด
                    </button>
                    {(task.LabeledQty + (task.DefectQty || 0)) >= task.Qty && (
                      <button
                        className="btn-primary"
                        style={{ padding: 12, fontSize: 15, background: '#10b981' }}
                        onClick={() => handleCompleteTask(task.TaskID)}
                      >
                        เสร็จสิ้นงาน (ส่ง QC)
                      </button>
                    )}
                  </div>
                </div>
              );
            })() : (
              // BARCODE MODE
              <div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 16, textAlign: 'center', marginBottom: 16 }}>
                  <ScanBarcode size={48} style={{ color: '#3b82f6', marginBottom: 12 }} />
                  <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>พร้อมรับการสแกน</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>ให้เคอร์เซอร์อยู่ในช่องด้านล่าง แล้วใช้ปืนยิงบาร์โค้ดได้เลย เมื่อยิง 1 ครั้งระบบจะบวกยอดให้ทันที</p>
                </div>
                
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>ตั้งค่าตัวคูณ: 1 บาร์โค้ด = </label>
                  <input 
                    type="number" min="1" 
                    value={scanMultiplier} onChange={e => setScanMultiplier(parseInt(e.target.value, 10) || 1)}
                    style={{ width: 80, padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, textAlign: 'center', fontWeight: 'bold' }}
                  />
                  <span style={{ fontSize: 13, color: '#64748b' }}>ชิ้น</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>ช่องรับสัญญาณจากเครื่องสแกนบาร์โค้ด (Barcode Input)</label>
                  <input 
                    ref={barcodeInputRef}
                    type="text" 
                    placeholder="รอรับสัญญาณบาร์โค้ด..."
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '2px solid #3b82f6', fontSize: 18, background: '#f8fafc', outline: 'none' }}
                    onKeyDown={handleProgressBarcodeScan}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // View 1: Labeling Tasks Dashboard
  // ══════════════════════════════════════════════════════════════
  const renderLabelingMain = () => {
    return (
      <div className="packaging-main">
        {/* ── Active Tasks (Kanban Board) for Pending Orders ── */}
        {!loading && pendingTasks.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={18} style={{ color: '#f43f5e' }} /> งานที่ต้องดำเนินการ (รอสติ๊กเกอร์ / พร้อมติดฉลาก / กำลังติดฉลาก)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {pendingTasks.map(task => {
                const percent = task.Qty > 0 ? Math.min(100, Math.floor(((task.LabeledQty || 0) / task.Qty) * 100)) : 0;
                return (
                  <div key={task.TaskID} className={`pkg-pending-card ${getCardStatusClass(task.Status)}`} onClick={() => handleOpenDetailModal(task)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <span className="pkg-pending-id" style={{ whiteSpace: 'nowrap' }}>{task.TaskID}</span>
                        <span className={`badge ${getStatusBadge(task.Status)}`} style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                          {task.Status}
                        </span>
                      </div>
                      <div className="pkg-pending-product">{task.ProductName}</div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, color: '#64748b' }}>
                          <Star size={13} style={{ color: '#f59e0b' }} />
                          <span>ความสำคัญ: <strong style={{ color: '#334155' }}>ปกติ</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, color: '#64748b' }}>
                          <Tag size={13} />
                          <span>ประเภท: {task.LabelType === 'custom' ? 'ผลิตตามออร์เดอร์ (OEM)' : 'ผลิตตามแผน (MTS)'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, color: '#64748b' }}>
                          <Calendar size={13} />
                          <span>วันที่สร้าง: <strong style={{ color: '#334155' }}>{task.CreatedAt ? new Date(task.CreatedAt).toLocaleDateString('th-TH') : '-'}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, color: '#64748b' }}>
                          <Activity size={13} />
                          <span>สายการผลิต: <strong style={{ color: '#3b82f6' }}>{task.Line || 'Line A'}</strong></span>
                          <span style={{ margin: '0 4px' }}>|</span>
                          <span>เลขผลิต: <strong style={{ color: '#334155' }}>{task.JobOrderID || task.BatchNo}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Progress in Card if In-Progress */}
                    {task.Status === 'กำลังติดฉลาก' && (
                      <div style={{ marginTop: 6 }}>
                        <div className="progress-container" style={{ height: 18, borderRadius: 6 }}>
                          <div className="progress-bar" style={{
                            width: `${percent}%`,
                            backgroundColor: '#6366f1',
                            borderRadius: 6,
                          }} />
                          <span className="progress-text" style={{ fontSize: 10 }}>
                            {(task.LabeledQty || 0).toLocaleString()} / {task.Qty?.toLocaleString()} ({percent}%)
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pkg-pending-qty">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 'normal' }}>เป้าหมายรวม:</span>
                        <span style={{ color: '#7b7bf5', fontSize: 16 }}>{task.Qty?.toLocaleString()} ชิ้น</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {task.Status === 'กำลังติดฉลาก' && (
                          <button 
                            className="btn-primary"
                            onClick={(e) => { e.stopPropagation(); handleOpenProgress(task); }}
                            style={{ padding: '6px 10px', fontSize: 12, background: '#4f46e5', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Edit3 size={13} /> อัปเดตยอด
                          </button>
                        )}
                        {['พร้อมติดฉลาก', 'รับแล้ว-พร้อมติด'].includes(task.Status) && (
                          <button 
                            className="btn-primary"
                            onClick={(e) => { e.stopPropagation(); handleStartTask(task.TaskID); }}
                            style={{ padding: '6px 10px', fontSize: 12, background: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <PlayCircle size={13} /> เริ่มติดฉลาก
                          </button>
                        )}
                        <button 
                          className="btn-primary"
                          onClick={(e) => { e.stopPropagation(); handleOpenDetailModal(task); }}
                          style={{ 
                            padding: '6px 14px', 
                            fontSize: 12, 
                            fontWeight: 600,
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 6, 
                            background: '#4f46e5',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 1px 2px rgba(79, 70, 229, 0.2)'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#4338ca'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#4f46e5'; }}
                        >
                          <Eye size={14} /> ดูรายละเอียด
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="toolbar">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-group">
              <div className="search-input-wrap">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="ค้นหาคำสั่งติดฉลาก..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <CustomSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, background: '#fff', cursor: 'pointer' }}
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </CustomSelect>
          </div>
        </div>

        {/* ── Orders Table ── */}
        <div className="card table-card" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ผลิตภัณฑ์</th>
                <th>เลขผลิต (JO)</th>
                <th>Line</th>
                <th>ประเภท</th>
                <th>ความคืบหน้า</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '32px' }}>กำลังโหลดข้อมูล...</td></tr>
              ) : paginatedTasks.map(task => {
                const percent = task.Qty > 0 ? Math.min(100, Math.floor(((task.LabeledQty || 0) / task.Qty) * 100)) : 0;
                const isDone = percent === 100;
                return (
                  <tr key={task.TaskID}>
                    <td className="text-bold" style={{ color: '#4338ca' }}>{task.TaskID}</td>
                    <td className="text-bold">{task.ProductName}</td>
                    <td>{task.JobOrderID || task.BatchNo}</td>
                    <td>{task.Line || 'Line A'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f3e8ff', color: '#7e22ce', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                        <Tag size={12} /> {task.LabelType === 'custom' ? 'OEM' : 'MTS'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: isDone ? '#16a34a' : '#3f3f46' }}>
                          {(task.LabeledQty || 0).toLocaleString()}
                          <span style={{ color: '#a1a1aa', fontWeight: 400 }}> / {task.Qty?.toLocaleString()}</span>
                          {task.DefectQty > 0 && <span style={{ color: '#ef4444', fontSize: 11, marginLeft: 4 }}>(เสีย {task.DefectQty})</span>}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          background: isDone ? '#dcfce7' : percent > 0 ? '#fef3c7' : '#f4f4f5',
                          color: isDone ? '#16a34a' : percent > 0 ? '#d97706' : '#a1a1aa',
                        }}>
                          {percent}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(task.Status)}`}>
                        {task.Status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {/* ดูรายละเอียด */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenDetailModal(task); }}
                          style={{ 
                            padding: '6px', borderRadius: 6, background: '#ffffff', color: '#64748b',
                            border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s ease',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#1e293b'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
                          title="ดูรายละเอียดคำสั่งติดฉลาก"
                        >
                          <Eye size={16} />
                        </button>

                        {/* ดูใบเบิก PDF (หากส่งเบิกแล้ว) */}
                        {['รอเบิกสติ๊กเกอร์', 'พร้อมติดฉลาก', 'กำลังติดฉลาก', 'ติดฉลากเสร็จ'].includes(task.Status) && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handlePrintRequisition(task.TaskID); }}
                            style={{ 
                              padding: '6px', borderRadius: 6, background: '#ffffff', color: '#0369a1', 
                              border: '1px solid #bae6fd', cursor: 'pointer', transition: 'all 0.15s ease',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 1px 2px rgba(3, 105, 161, 0.1)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.color = '#0284c7'; e.currentTarget.style.borderColor = '#7dd3fc'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#0369a1'; e.currentTarget.style.borderColor = '#bae6fd'; }}
                            title="ดูใบเบิกสติ๊กเกอร์ (PDF)"
                          >
                            <FileText size={16} />
                          </button>
                        )}

                        {/* ดูใบส่งตรวจ QC Final PDF (หากติดฉลากเสร็จ) */}
                        {task.Status === 'ติดฉลากเสร็จ' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handlePrintQcRequest(task.TaskID); }}
                            style={{ 
                              padding: '6px', borderRadius: 6, background: '#ffffff', color: '#d97706', 
                              border: '1px solid #fde68a', cursor: 'pointer', transition: 'all 0.15s ease',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 1px 2px rgba(217, 119, 6, 0.1)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef3c7'; e.currentTarget.style.color = '#b45309'; e.currentTarget.style.borderColor = '#fcd34d'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#d97706'; e.currentTarget.style.borderColor = '#fde68a'; }}
                            title="ดูใบส่งตรวจ QC Final (PDF)"
                          >
                            <FileText size={16} />
                          </button>
                        )}

                        {/* เริ่มติดฉลาก */}
                        {['พร้อมติดฉลาก', 'รับแล้ว-พร้อมติด'].includes(task.Status) && (
                          <button 
                            className="btn-primary" 
                            onClick={() => handleStartTask(task.TaskID)}
                            style={{ background: '#10b981', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <PlayCircle size={14} /> เริ่มติดฉลาก
                          </button>
                        )}

                        {/* อัปเดตยอด & เสร็จสิ้น */}
                        {task.Status === 'กำลังติดฉลาก' && (
                          <>
                            <button 
                              className="btn-primary" 
                              onClick={() => handleOpenProgress(task)}
                              style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', color: '#4338ca', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <Edit3 size={14} /> อัปเดตยอด
                            </button>
                            <button 
                              className="btn-primary" 
                              onClick={() => handleCompleteTask(task.TaskID)}
                              style={{ background: '#10b981', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <CheckCircle size={14} /> ติดฉลากเสร็จ
                            </button>
                          </>
                        )}

                        {task.Status === 'ติดฉลากเสร็จ' && (
                          <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, background: '#f3e8ff', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ShieldCheck size={14} /> ส่ง QC แล้ว
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    ไม่พบรายการที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <PaginationControl
            currentPage={tblPage}
            totalPages={Math.ceil(filteredTasks.length / tblPageSize) || 1}
            totalItems={filteredTasks.length}
            pageSize={tblPageSize}
            onPageChange={setTblPage}
            onPageSizeChange={(size) => { setTblPageSize(size); setTblPage(1); }}
          />
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // View 2: Warehouse Sticker Stock Dashboard
  // ══════════════════════════════════════════════════════════════
  const renderMaterials = () => {
    return (
      <div className="packaging-materials">
        <div className="card table-card" style={{ marginTop: '20px' }}>
          <h3 className="card-title">สติ๊กเกอร์คงเหลือในคลังสินค้า (หมวด: ฉลาก/สิ่งพิมพ์)</h3>
          {stickerLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>กำลังโหลดข้อมูลสติ๊กเกอร์ในคลัง...</div>
          ) : (
            <table className="data-table" style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>รหัสวัสดุ</th>
                  <th>สติ๊กเกอร์ / ฉลากสินค้า</th>
                  <th>คงเหลือ</th>
                  <th>จองใช้</th>
                  <th>พร้อมใช้</th>
                  <th>หน่วย</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {stickerItems.length > 0 ? stickerItems.map(mat => {
                  const reserved = mat.reservedQty || 0;
                  const available = (mat.qty || 0) - reserved;
                  const lowStock = available <= (mat.minStock || 500);
                  return (
                    <tr key={mat.id}>
                      <td style={{ fontWeight: 600, color: '#1e40af' }}>{mat.id}</td>
                      <td className="text-bold">{mat.name}</td>
                      <td>{(mat.qty || 0).toLocaleString()}</td>
                      <td style={{ color: '#64748b' }}>{reserved.toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: lowStock ? 'var(--danger, #e53935)' : 'var(--success, #43a047)' }}>
                        {available.toLocaleString()}
                      </td>
                      <td>{mat.unit || 'ดวง'}</td>
                      <td>
                        <span className={`badge ${lowStock ? 'badge-danger' : 'badge-success'}`}>
                          {lowStock ? 'เหลือน้อย' : 'เพียงพอ'}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>ไม่มีข้อมูลสติ๊กเกอร์ในคลังสินค้า</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container packaging-page page-enter">
      {/* ── Page Header ── */}
      <div className="page-title" style={{ padding: '0 0 20px 0' }}>
        <h1>{activeTab === 'labeling_materials' ? 'สติ๊กเกอร์ / ฉลากสินค้าในคลัง' : 'งานติดฉลาก (ฝ่ายผลิต)'}</h1>
        <p>{activeTab === 'labeling_materials' ? 'ตรวจสอบสต็อกสติ๊กเกอร์และฉลากคงเหลือในคลังสินค้า (หมวด: ฉลาก/สิ่งพิมพ์)' : 'จัดการงานติดฉลาก ตรวจสอบสต็อกสติ๊กเกอร์ ขอเบิก และบันทึกยอดการติดฉลาก → ส่ง QC Final'}</p>
      </div>

      {/* ── Sub-Navigation Tabs (Style like Packaging) ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
        <button 
          onClick={() => setActiveTab('labeling_main')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'labeling_main' ? '#4f46e5' : '#f1f5f9',
            color: activeTab === 'labeling_main' ? '#fff' : '#475569',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s'
          }}
        >
          <Tag size={16} /> งานติดฉลาก (ฝ่ายผลิต)
        </button>
        <button 
          onClick={() => setActiveTab('labeling_materials')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'labeling_materials' ? '#4f46e5' : '#f1f5f9',
            color: activeTab === 'labeling_materials' ? '#fff' : '#475569',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s'
          }}
        >
          <Box size={16} /> สติ๊กเกอร์คงเหลือในคลัง (ฉลาก/สิ่งพิมพ์)
        </button>
      </div>

      {/* ── Tab Views ── */}
      {activeTab === 'labeling_main' && renderLabelingMain()}
      {activeTab === 'labeling_materials' && renderMaterials()}

      {/* ── Modals ── */}
      {renderDetailModal()}
      {renderProgressModal()}
    </div>
  );
}

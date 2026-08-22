import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import { 
  Tag, CheckCircle2, Clock, Activity, Search, 
  Plus, X, ChevronDown, ChevronUp, AlertTriangle, Check, Eye, Calendar, CheckCircle,
  Box, PlayCircle, Send, AlertCircle, FileText
} from 'lucide-react';
import './PageCommon.css';
import './OperatorLabeling.css';

export default function OperatorLabeling() {
  const { user, canCreate, canUpdate, canDelete } = useAuth();
  const { showAlert, showConfirm } = useAlert();

  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('ทั้งหมด');
  const [loading, setLoading] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updateQty, setUpdateQty] = useState(0);
  const [updateDefectQty, setUpdateDefectQty] = useState(0);

  // OEM Sticker states
  const [oemSupplier, setOemSupplier] = useState('');
  const [oemNote, setOemNote] = useState('');

  // Live stock states
  const [liveConfigs, setLiveConfigs] = useState([]);
  const [checkingStock, setCheckingStock] = useState(false);
  const [allSufficient, setAllSufficient] = useState(true);

  const [stockItems, setStockItems] = useState([]);

  useEffect(() => {
    fetchTasks();
    fetchStockItems();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/labeling/tasks');
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

  const fetchStockItems = async () => {
    try {
      const res = await fetch('/api/stock?category=all');
      if (res.ok) {
        const data = await res.json();
        setStockItems(data);
      }
    } catch (err) {
      console.error('Error fetching stock items', err);
    }
  };

  const handleOpenModal = async (task) => {
    setSelectedTask(task);
    setUpdateQty('');
    setUpdateDefectQty('');
    setOemSupplier(task.StickerSupplier || '');
    setOemNote(task.StickerNote || '');
    setLiveConfigs([]);
    setCheckingStock(false);
    setAllSufficient(true);
    setShowModal(true);

    if (task.LabelType === 'stock') {
      setCheckingStock(true);
      try {
        const res = await fetch(`http://localhost:5000/api/labeling/tasks/${task.TaskID}/check-stock`);
        if (res.ok) {
          const data = await res.json();
          setLiveConfigs(data.configs || []);
          setAllSufficient(data.allSufficient);
        }
      } catch (err) {
        console.error('Error checking stock:', err);
      } finally {
        setCheckingStock(false);
      }
    }
  };

  const handleStartTask = async (id) => {
    if (!canUpdate('operator_labeling')) {
      showAlert('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์เริ่มต้นการทำงานนี้', 'error');
      return;
    }
    
    const ok = await showConfirm('ยืนยัน', 'ต้องการเริ่มติดฉลากใช่หรือไม่?', 'info');
    if (!ok) return;

    try {
      const res = await fetch(`/api/labeling/tasks/${id}/start`, { method: 'PUT' });
      if (res.ok) {
        showAlert('สำเร็จ', 'เริ่มติดฉลากแล้ว', 'success');
        fetchTasks();
        setShowModal(false);
      } else {
        showAlert('ข้อผิดพลาด', 'ไม่สามารถเริ่มติดฉลากได้', 'error');
      }
    } catch (err) {
      showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

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
      deductQty: cfg.needed,
      unit: 'ชิ้น'
    }));

    const ok = await showConfirm('ยืนยัน', 'ต้องการส่งใบเบิกสติ๊กเกอร์ไปยังคลังสินค้าใช่หรือไม่?', 'info');
    if (!ok) return;

    try {
      const res = await fetch(`/api/labeling/tasks/${id}/requisition`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          requisitionItems,
          requesterName: user?.name || user?.username || 'ผู้ปฏิบัติงาน'
        })
      });

      if (res.ok) {
        showAlert('สำเร็จ', 'ส่งใบเบิกไปยังคลังสินค้าเรียบร้อยแล้ว', 'success');
        fetchTasks();
        setShowModal(false);
      } else {
        const data = await res.json();
        showAlert('ข้อผิดพลาด', data.message || 'ไม่สามารถส่งใบเบิกได้', 'error');
      }
    } catch (err) {
      showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
  };

  const handleUpdateProgress = async (id) => {
    if (!canUpdate('operator_labeling')) {
      showAlert('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์อัปเดตข้อมูล', 'error');
      return;
    }

    const addedQty = parseInt(updateQty, 10) || 0;
    const addedDefect = parseInt(updateDefectQty, 10) || 0;
    if (addedQty < 0 || addedDefect < 0) {
      showAlert('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนที่ไม่ติดลบ', 'error');
      return;
    }
    
    if (addedQty === 0 && addedDefect === 0) {
      showAlert('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนที่ต้องการเพิ่ม', 'warning');
      return;
    }

    const newGood = (selectedTask.LabeledQty || 0) + addedQty;
    const newDefect = (selectedTask.DefectQty || 0) + addedDefect;
    const newTotal = newGood + newDefect;

    if (newTotal > selectedTask.Qty) {
      showAlert('จำนวนเกิน', `ยอดรวมของดีและของเสียใหม่ (${newTotal}) เกินกว่าเป้าหมายรวม (${selectedTask.Qty})`, 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/labeling/tasks/${id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labeledQty: newGood, defectQty: newDefect })
      });
      if (res.ok) {
        showAlert('สำเร็จ', 'อัปเดตความคืบหน้าแล้ว', 'success');
        fetchTasks();
        setUpdateQty('');
        setUpdateDefectQty('');
        
        // update selectedTask state if open
        if (selectedTask && selectedTask.TaskID === id) {
          setSelectedTask({...selectedTask, LabeledQty: newGood, DefectQty: newDefect});
        }
      } else {
        showAlert('ข้อผิดพลาด', 'ไม่สามารถอัปเดตได้', 'error');
      }
    } catch (err) {
      showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  const handleCompleteTask = async (id) => {
    if (!canUpdate('operator_labeling')) {
      showAlert('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์แก้ไขข้อมูล', 'error');
      return;
    }

    if (selectedTask) {
        const totalProcessed = (selectedTask.LabeledQty || 0) + (selectedTask.DefectQty || 0);
        if (totalProcessed < selectedTask.Qty) {
            const ok = await showConfirm('ยืนยันเสร็จสิ้น', `ยอดรวมของดีและของเสีย (${totalProcessed}) ยังไม่ถึงเป้าหมาย (${selectedTask.Qty}) ต้องการเสร็จสิ้นงานก่อนกำหนดหรือไม่?`, 'warning');
            if (!ok) return;
        } else {
            const ok = await showConfirm('ยืนยัน', 'ต้องการเสร็จสิ้นการติดฉลากใช่หรือไม่?', 'info');
            if (!ok) return;
        }
    } else {
        const ok = await showConfirm('ยืนยัน', 'ต้องการเสร็จสิ้นการติดฉลากใช่หรือไม่?', 'info');
        if (!ok) return;
    }

    try {
      const res = await fetch(`/api/labeling/tasks/${id}/complete`, { method: 'PUT' });
      if (res.ok) {
        showAlert('สำเร็จ', 'บันทึกเสร็จสิ้นการติดฉลากแล้ว', 'success');
        fetchTasks();
        setShowModal(false);
      } else {
        showAlert('ข้อผิดพลาด', 'ไม่สามารถจบงานได้', 'error');
      }
    } catch (err) {
      showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  const handleStickerOrdered = async (id) => {
    if (!canUpdate('operator_labeling')) {
      showAlert('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์แก้ไขข้อมูล', 'error');
      return;
    }
    
    if (!oemSupplier) {
      showAlert('ข้อมูลไม่ครบ', 'กรุณาระบุโรงพิมพ์/ผู้ผลิตสติ๊กเกอร์', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/labeling/tasks/${id}/sticker-ordered`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier: oemSupplier, note: oemNote })
      });
      if (res.ok) {
        showAlert('สำเร็จ', 'บันทึกการสั่งสติ๊กเกอร์แล้ว', 'success');
        fetchTasks();
        setShowModal(false);
      } else {
        showAlert('ข้อผิดพลาด', 'ไม่สามารถบันทึกได้', 'error');
      }
    } catch (err) {
      showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleStickerReceived = async (id) => {
    if (!canUpdate('operator_labeling')) {
      showAlert('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์แก้ไขข้อมูล', 'error');
      return;
    }

    const ok = await showConfirm('ยืนยัน', 'ยืนยันว่าได้รับสติ๊กเกอร์แล้ว?', 'info');
    if (!ok) return;

    try {
      const res = await fetch(`/api/labeling/tasks/${id}/sticker-received`, { method: 'PUT' });
      if (res.ok) {
        showAlert('สำเร็จ', 'บันทึกรับสติ๊กเกอร์แล้ว', 'success');
        fetchTasks();
        setShowModal(false);
      } else {
        showAlert('ข้อผิดพลาด', 'ไม่สามารถบันทึกได้', 'error');
      }
    } catch (err) {
      showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาด', 'error');
    }
  };



  const filteredTasks = tasks.filter(task => {
    if (filter === 'ทั้งหมด') return true;
    if (filter === 'รอสติ๊กเกอร์') return ['รอสติ๊กเกอร์', 'รอเบิกสติ๊กเกอร์', 'รอสั่งสติ๊กเกอร์', 'สั่งแล้ว-รอรับ'].includes(task.Status);
    if (filter === 'พร้อมติด') return ['พร้อมติดฉลาก', 'รับแล้ว-พร้อมติด'].includes(task.Status);
    if (filter === 'กำลังติด') return task.Status === 'กำลังติดฉลาก';
    if (filter === 'เสร็จแล้ว') return task.Status === 'ติดฉลากเสร็จ';
    return true;
  });

  const getStatusBadgeClass = (status) => {
    if (status?.includes('รอ')) return 'badge-warning';
    if (status?.includes('พร้อม')) return 'badge-info';
    if (status?.includes('กำลัง')) return 'badge-primary';
    if (status?.includes('เสร็จ')) return 'badge-success';
    return 'badge-neutral';
  };

  return (
    <div className="page-container page-enter">
      <div className="page-title" style={{ padding: '0 0 20px 0' }}>
          <h1>งานติดฉลาก (Labeling)</h1>
          <p>จัดการคิวงานติดฉลากสติ๊กเกอร์, สั่งทำสติ๊กเกอร์ OEM และบันทึกยอดการติดฉลาก → ส่ง QC Final</p>
      </div>

      <div className="lbl-page-container">
        {/* Stats */}
      <div className="lbl-stats-grid">
        <div className="lbl-stat-card yellow">
          <div className="stat-icon"><Clock size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{tasks.filter(t => ['รอสติ๊กเกอร์', 'รอสั่งสติ๊กเกอร์', 'สั่งแล้ว-รอรับ'].includes(t.Status)).length}</span>
            <span className="stat-label">รอสติ๊กเกอร์</span>
          </div>
        </div>
        <div className="lbl-stat-card blue">
          <div className="stat-icon"><CheckCircle2 size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{tasks.filter(t => ['พร้อมติดฉลาก', 'รับแล้ว-พร้อมติด'].includes(t.Status)).length}</span>
            <span className="stat-label">พร้อมติดฉลาก</span>
          </div>
        </div>
        <div className="lbl-stat-card orange">
          <div className="stat-icon"><Activity size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{tasks.filter(t => t.Status === 'กำลังติดฉลาก').length}</span>
            <span className="stat-label">กำลังติดฉลาก</span>
          </div>
        </div>
        <div className="lbl-stat-card green">
          <div className="stat-icon"><CheckCircle2 size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{tasks.filter(t => t.Status === 'ติดฉลากเสร็จ').length}</span>
            <span className="stat-label">เสร็จแล้ว</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="lbl-filter-tabs">
        {['ทั้งหมด', 'รอสติ๊กเกอร์', 'พร้อมติด', 'กำลังติด', 'เสร็จแล้ว'].map(t => (
          <button 
            key={t}
            className={`lbl-filter-tab ${filter === t ? 'active' : ''}`}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tasks Grid */}
      <div className="lbl-task-grid">
        {filteredTasks.map(task => {
          let configs = [];
          try {
            if (task.LabelConfigJSON) configs = JSON.parse(task.LabelConfigJSON);
          } catch(e) {}

          const percent = task.Qty ? Math.min(100, (task.LabeledQty / task.Qty) * 100) : 0;

          return (
            <div 
              key={task.TaskID} 
              className={`lbl-task-card ${task.LabelType === 'custom' ? 'oem' : 'mts'}`}
              onClick={() => handleOpenModal(task)}
            >
              <div className="lbl-card-header">
                <div className="lbl-card-title">
                  <span className="lbl-task-id">{task.TaskID}</span>
                  <span className={`badge ${getStatusBadgeClass(task.Status)}`} style={{ fontWeight: 500, padding: '4px 8px' }}>
                    {task.Status}
                  </span>
                </div>
                
                <div className="lbl-task-product">{task.ProductName}</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, color: '#64748b' }}>
                    <Tag size={13} />
                    <span>ประเภท: {task.LabelType === 'custom' ? 'ผลิตตามออร์เดอร์ (OEM)' : 'ผลิตตามแผน (MTS)'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, color: '#64748b' }}>
                    <Calendar size={13} />
                    <span>สร้าง: <strong style={{ color: '#1e293b' }}>{task.CreatedAt ? new Date(task.CreatedAt).toLocaleDateString('th-TH') : '-'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, color: '#64748b' }}>
                    <Activity size={13} />
                    <span>สายการผลิต: <strong style={{ color: '#3b82f6' }}>{task.Line || 'Line A'}</strong></span>
                    <span style={{ margin: '0 4px' }}>|</span>
                    <span>จำนวน: <strong style={{ color: '#1e293b' }}>1 Batch</strong> ({task.BatchNo})</span>
                  </div>
                </div>
              </div>

              <div className="lbl-card-body" style={{ padding: '0 1.25rem' }}>
                {task.LabelType === 'stock' && configs.length > 0 && (
                  <div className="lbl-sticker-info">
                    {configs.map((c, idx) => (
                      <div key={idx} className="lbl-sticker-item">
                        <span className="lbl-sticker-name">{c.stickerName} ({c.applyTo})</span>
                        <div className={`lbl-sticker-status ${c.stockAvailable >= c.qtyPerUnit * task.Qty ? 'ok' : 'warn'}`}>
                          {c.stockAvailable >= c.qtyPerUnit * task.Qty ? <Check size={14} /> : <AlertTriangle size={14} />}
                          <span>{c.qtyPerUnit * task.Qty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ padding: '0 1.25rem', marginTop: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '12px', paddingBottom: '12px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>เป้าหมายรวม:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(task.LabeledQty > 0 || task.DefectQty > 0) && (
                          <span style={{ fontSize: 13, fontWeight: 600 }}>
                            <span style={{ color: '#10b981' }}>{task.LabeledQty.toLocaleString()}</span>
                            <span style={{ color: '#d1d5db', margin: '0 4px', fontWeight: 400 }}>/</span>
                            <span style={{ color: '#ef4444' }}>{task.DefectQty || 0}</span>
                            <span style={{ color: '#94a3b8', margin: '0 6px', fontWeight: 400 }}>|</span>
                          </span>
                        )}
                        <span style={{ color: '#3b82f6', fontSize: 16, fontWeight: 700 }}>{task.Qty.toLocaleString()}</span>
                    </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* History Table */}
      <div className="card table-card" style={{ marginTop: '1rem' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 20px', margin: 0, borderBottom: '1px solid #e2e8f0', fontSize: '16px' }}>
          <Activity size={18} /> รายการงานทั้งหมด
        </h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>รหัสงาน</th>
                <th>สินค้า</th>
                <th>Lot / Batch</th>
                <th style={{ textAlign: 'center' }}>ของดี / ของเสีย (จากเป้า)</th>
                <th style={{ textAlign: 'center' }}>สถานะ</th>
                <th style={{ textAlign: 'center' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => {
                const percent = task.Qty ? Math.min(100, (task.LabeledQty / task.Qty) * 100) : 0;
                return (
                  <tr key={`tbl-${task.TaskID}`}>
                    <td style={{ fontWeight: 600, color: '#4338ca' }}>{task.TaskID}</td>
                    <td style={{ fontWeight: 600 }}>{task.ProductName}</td>
                    <td>{task.BatchNo}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: percent === 100 ? '#16a34a' : '#3f3f46' }}>
                          <span style={{ color: '#10b981' }}>{task.LabeledQty.toLocaleString()}</span> <span style={{ color: '#d1d5db', fontWeight: 400 }}>/</span> <span style={{ color: '#ef4444' }}>{task.DefectQty || 0}</span> 
                          <span style={{ color: '#94a3b8', margin: '0 4px', fontWeight: 400 }}>|</span>
                          <span style={{ color: '#64748b' }}>{task.Qty.toLocaleString()}</span>
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${getStatusBadgeClass(task.Status)}`} style={{ fontWeight: 600, padding: '4px 10px' }}>
                        {task.Status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="doc-action-btn"
                        title="ดูรายละเอียด"
                        onClick={() => handleOpenModal(task)}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>ไม่มีรายการงาน</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedTask && (
        <div className="lbl-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lbl-modal-content" style={{ maxWidth: 640, borderRadius: 12, border: 'none', padding: 0 }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🏷️ {selectedTask.TaskID}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#71717a' }}>{selectedTask.ProductName}</p>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}>
                    <X size={20} />
                </button>
            </div>
            
            {/* Body */}
            <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Status + Tags */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                  <span className={`badge ${getStatusBadgeClass(selectedTask.Status)}`} style={{ fontSize: 13, padding: '6px 14px', fontWeight: 600 }}>
                    {selectedTask.Status}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f3e8ff', color: '#7e22ce', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                      <Tag size={14} /> {selectedTask.LabelType === 'custom' ? 'OEM' : 'MTS (Stock)'}
                  </span>
                  {selectedTask.JobOrderID && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e0e7ff', color: '#3730a3', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          📋 {selectedTask.JobOrderID}
                      </span>
                  )}
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                  <div>
                      <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>Lot / Batch</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{selectedTask.BatchNo}</p>
                  </div>
                  <div>
                      <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>สายการผลิต</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{selectedTask.Line || 'Line A'}</p>
                  </div>
                  <div>
                      <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>จำนวนเต็ม</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#4f46e5', fontSize: 16 }}>{selectedTask.Qty.toLocaleString()}</p>
                  </div>
                  <div>
                      <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>ติดฉลากแล้ว <span style={{ color: '#d1d5db' }}>|</span> <span style={{ color: '#ef4444' }}>เสีย</span></span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#10b981', fontSize: 16 }}>{selectedTask.LabeledQty.toLocaleString()} <span style={{ color: '#d1d5db', fontWeight: 400, fontSize: 14 }}>/</span> <span style={{ color: '#ef4444' }}>{selectedTask.DefectQty || 0}</span></p>
                  </div>
              </div>

              {selectedTask.LabelType === 'custom' && selectedTask.Status === 'รอสั่งสติ๊กเกอร์' && (
                <div style={{ marginTop: 24, padding: '16px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#9a3412', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={16} /> สั่งสติ๊กเกอร์ OEM</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9a3412', marginBottom: 4 }}>โรงพิมพ์ / ผู้ผลิต</label>
                      <input type="text" style={{ width: '100%', padding: '8px 12px', border: '1px solid #fdba74', borderRadius: 6 }} value={oemSupplier} onChange={e => setOemSupplier(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9a3412', marginBottom: 4 }}>หมายเหตุ</label>
                      <input type="text" style={{ width: '100%', padding: '8px 12px', border: '1px solid #fdba74', borderRadius: 6 }} value={oemNote} onChange={e => setOemNote(e.target.value)} />
                    </div>
                    <button className="lbl-btn primary" style={{ background: '#f97316', alignSelf: 'flex-start' }} onClick={() => handleStickerOrdered(selectedTask.TaskID)}>
                      บันทึกการสั่ง
                    </button>
                  </div>
                </div>
              )}

              {selectedTask.LabelType === 'custom' && selectedTask.Status === 'สั่งแล้ว-รอรับ' && (
                <div style={{ marginTop: 24, padding: '16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 12, color: '#166534', fontWeight: 500 }}>โรงพิมพ์:</span> 
                    <span style={{ marginLeft: 6, fontWeight: 600, color: '#15803d' }}>{selectedTask.StickerSupplier}</span>
                  </div>
                  <button className="lbl-btn primary" style={{ background: '#10b981' }} onClick={() => handleStickerReceived(selectedTask.TaskID)}>
                    ยืนยันรับสติ๊กเกอร์
                  </button>
                </div>
              )}

              {selectedTask.LabelType === 'stock' && (selectedTask.Status === 'รอสติ๊กเกอร์' || selectedTask.Status === 'รอเบิกสติ๊กเกอร์' || selectedTask.Status === 'พร้อมติดฉลาก') && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px 8px 0 0', fontWeight: 600, color: '#334155' }}>
                      <Box size={16} /> ตรวจสอบสต็อกสติ๊กเกอร์
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 16 }}>
                  
                  {checkingStock ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>กำลังตรวจสอบสต็อก...</div>
                  ) : (
                    <>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ textAlign: 'left', padding: '8px', color: '#64748b', fontWeight: 500 }}>ชื่อสติ๊กเกอร์</th>
                            <th style={{ textAlign: 'center', padding: '8px', color: '#64748b', fontWeight: 500 }}>จุดที่ติด</th>
                            <th style={{ textAlign: 'right', padding: '8px', color: '#64748b', fontWeight: 500 }}>จำนวนที่ต้องการ</th>
                            <th style={{ textAlign: 'right', padding: '8px', color: '#64748b', fontWeight: 500 }}>มีในสต็อก</th>
                            <th style={{ textAlign: 'center', padding: '8px', color: '#64748b', fontWeight: 500 }}>สถานะ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveConfigs.length > 0 ? liveConfigs.map((c, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px', fontWeight: 600 }}>{c.stickerName}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>{c.applyTo}</td>
                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{c.needed.toLocaleString()}</td>
                              <td style={{ padding: '8px', textAlign: 'right', color: c.isEnough ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
                                {c.stockAvailable.toLocaleString()}
                                {!c.isEnough && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>(ขาด {(c.needed - c.stockAvailable).toLocaleString()})</div>}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                {c.isEnough ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}><CheckCircle size={12} /> เพียงพอ</span>
                                ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}><AlertCircle size={12} /> ไม่พอ</span>
                                )}
                              </td>
                            </tr>
                          )) : (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>ไม่มีการตั้งค่าสติ๊กเกอร์สำหรับสินค้านี้</td></tr>
                          )}
                        </tbody>
                      </table>

                      {!allSufficient && (
                        <div style={{ marginTop: 12, fontSize: 13, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, borderLeft: '4px solid #f59e0b', justifyContent: 'space-between', backgroundColor: '#fffbeb', borderRadius: '4px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <AlertCircle size={16} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <strong style={{ display: 'block', marginBottom: 4, color: '#b45309' }}>สต็อกสติ๊กเกอร์ไม่เพียงพอ</strong>
                                <span style={{ color: '#d97706' }}>กรุณาจัดเตรียมสติ๊กเกอร์และส่งใบเบิกก่อนเริ่มงาน</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {allSufficient && liveConfigs.length > 0 && (
                        <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '8px 16px', borderRadius: 4, fontSize: 13, fontWeight: 600, width: '100%', justifyContent: 'center' }}>
                            <CheckCircle size={16} /> วัสดุสติ๊กเกอร์พร้อมสำหรับเบิก / ติดฉลาก
                        </div>
                      )}
                    </>
                  )}
                  </div>
                </div>
              )}

              {selectedTask.Status === 'กำลังติดฉลาก' && (() => {
                  const addedGood = parseInt(updateQty, 10) || 0;
                  const addedDefect = parseInt(updateDefectQty, 10) || 0;
                  const newGood = (selectedTask.LabeledQty || 0) + addedGood;
                  const newDefect = (selectedTask.DefectQty || 0) + addedDefect;
                  const newTotalProcessed = newGood + newDefect;
                  const isExceeded = newTotalProcessed > selectedTask.Qty;

                  return (
                    <div style={{ marginTop: 24, padding: '16px', background: '#fafaf9', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 4 }}>+ เพิ่มของดี (Good)</span>
                              <span style={{ fontSize: 12, color: '#64748b' }}>จำนวนที่ทำเพิ่มรอบนี้</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 4, color: '#ef4444' }}>+ เพิ่มของเสีย (Defect)</span>
                              <span style={{ fontSize: 12, color: '#64748b' }}>สติ๊กเกอร์พังรอบนี้</span>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <input 
                                    type="number" 
                                    min="0"
                                    placeholder="ระบุจำนวน..."
                                    style={{ width: '100%', padding: '8px 12px', border: `1px solid ${isExceeded ? '#ef4444' : '#d4d4d8'}`, borderRadius: 6, outlineColor: '#3b82f6' }}
                                    value={updateQty} 
                                    onChange={e => setUpdateQty(e.target.value)} 
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <input 
                                    type="number" 
                                    min="0"
                                    placeholder="ระบุจำนวน..."
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #fca5a5', borderRadius: 6, outlineColor: '#ef4444', color: '#ef4444' }}
                                    value={updateDefectQty} 
                                    onChange={e => setUpdateDefectQty(e.target.value)} 
                                />
                            </div>
                        </div>

                        {isExceeded && (
                            <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                               <AlertCircle size={14} /> * ยอดรวมใหม่ ({newTotalProcessed}) เกินเป้าหมายที่กำหนด ({selectedTask.Qty})
                            </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                            <button 
                                className="lbl-btn secondary" 
                                disabled={updateQty === '' || addedGood < 0 || addedDefect < 0 || isExceeded}
                                onClick={() => handleUpdateProgress(selectedTask.TaskID)}
                            >
                                อัปเดตยอด
                            </button>
                            <button 
                                className="lbl-btn primary" 
                                style={{ background: '#10b981', flex: 1 }} 
                                disabled={updateQty !== '' || updateDefectQty !== ''}
                                onClick={() => handleCompleteTask(selectedTask.TaskID)}
                            >
                                เสร็จสิ้นการติดฉลาก (ส่ง QC)
                            </button>
                        </div>
                    </div>
                  );
              })()}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
              {(selectedTask.Status === 'พร้อมติดฉลาก' || selectedTask.Status === 'รับแล้ว-พร้อมติด') && (
                <button 
                  className="lbl-btn primary" 
                  onClick={() => handleStartTask(selectedTask.TaskID)}
                  disabled={selectedTask.LabelType === 'stock' && !allSufficient}
                >
                  <PlayCircle size={16} /> เริ่มติดฉลาก
                </button>
              )}
              {selectedTask.LabelType === 'stock' && selectedTask.Status === 'รอสติ๊กเกอร์' && (
                <>
                  <button className="lbl-btn secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={async () => {
                          try {
                              const reqData = {
                                  formulaName: selectedTask.ProductName,
                                  expectedQty: selectedTask.Qty,
                                  unit: 'ชิ้น',
                                  jobOrderId: selectedTask.JobOrderID || selectedTask.BatchNo,
                                  taskId: selectedTask.TaskID,
                                  batchNo: selectedTask.BatchNo,
                                  items: liveConfigs.map(c => ({ id: c.stickerItemId, name: c.stickerName, deductQty: c.needed, unit: 'ดวง' })),
                                  date: new Date().toLocaleDateString('th-TH'),
                                  requesterName: 'พนักงานติดฉลาก'
                              };
                              const res = await fetch(`/api/print/requisition/preview`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
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
                      }}
                  >
                      <FileText size={14} /> ดูใบเบิก
                  </button>
                  <button 
                    className="lbl-btn primary" 
                    onClick={() => handleSendRequisition(selectedTask.TaskID)}
                  >
                    <Send size={14} style={{ marginRight: 6 }} /> ส่งใบเบิกสติ๊กเกอร์
                  </button>
                </>
              )}
              {selectedTask.LabelType === 'stock' && selectedTask.Status === 'รอเบิกสติ๊กเกอร์' && (
                <>
                  <button className="lbl-btn secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={async () => {
                          try {
                              const res = await fetch(`/api/print/requisition/${selectedTask.TaskID}`);
                              if (res.ok) {
                                  const blob = await res.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  window.open(url, '_blank');
                              } else {
                                  showAlert('ข้อผิดพลาด', 'ไม่สามารถเปิดใบเบิกได้', 'error');
                              }
                          } catch(e) {
                              console.error(e);
                              showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
                          }
                      }}
                  >
                      <FileText size={14} /> ดูใบเบิก
                  </button>
                  <button className="lbl-btn secondary" disabled style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', background: '#fef3c7', borderColor: '#fde68a' }}>
                    <Clock size={14} /> กำลังรอคลังอนุมัติใบเบิก...
                  </button>
                </>
              )}
              {selectedTask.LabelType === 'custom' && selectedTask.Status === 'รอสั่งสติ๊กเกอร์' && (
                <button className="lbl-btn secondary" disabled>
                  กรุณากรอกข้อมูลและสั่งสติ๊กเกอร์
                </button>
              )}
              {selectedTask.LabelType === 'custom' && selectedTask.Status === 'สั่งแล้ว-รอรับ' && (
                <button className="lbl-btn primary" onClick={() => handleStickerReceived(selectedTask.TaskID)}>
                  รับสติ๊กเกอร์แล้ว
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import { 
  Tag, CheckCircle2, Clock, Activity, Search, 
  Plus, X, ChevronDown, ChevronUp, AlertTriangle, Check
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
  
  const [updateQty, setUpdateQty] = useState('');
  const [oemSupplier, setOemSupplier] = useState('');
  const [oemNote, setOemNote] = useState('');

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
      const res = await fetch('/api/stock/items?category=all');
      if (res.ok) {
        const data = await res.json();
        setStockItems(data);
      }
    } catch (err) {
      console.error('Error fetching stock items', err);
    }
  };

  const handleStartTask = async (id) => {
    if (!canUpdate('operator_labeling')) {
      showAlert('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์เริ่มต้นการทำงานนี้', 'error');
      return;
    }
    
    showConfirm('ยืนยัน', 'ต้องการเริ่มติดฉลากใช่หรือไม่?', async () => {
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
    });
  };

  const handleUpdateProgress = async (id) => {
    if (!canUpdate('operator_labeling')) {
      showAlert('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์อัปเดตข้อมูล', 'error');
      return;
    }

    const qty = parseInt(updateQty, 10);
    if (isNaN(qty) || qty < 0) {
      showAlert('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนที่ถูกต้อง', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/labeling/tasks/${id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labeledQty: qty })
      });
      if (res.ok) {
        showAlert('สำเร็จ', 'อัปเดตความคืบหน้าแล้ว', 'success');
        fetchTasks();
        setUpdateQty('');
        
        // update selectedTask state if open
        if (selectedTask && selectedTask.TaskID === id) {
          setSelectedTask({...selectedTask, LabeledQty: qty});
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

    showConfirm('ยืนยัน', 'ต้องการจบงานติดฉลากใช่หรือไม่?', async () => {
      try {
        const res = await fetch(`/api/labeling/tasks/${id}/complete`, { method: 'PUT' });
        if (res.ok) {
          showAlert('สำเร็จ', 'จบงานเรียบร้อยแล้ว', 'success');
          fetchTasks();
          setShowModal(false);
        } else {
          showAlert('ข้อผิดพลาด', 'ไม่สามารถจบงานได้', 'error');
        }
      } catch (err) {
        showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      }
    });
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

    showConfirm('ยืนยัน', 'ยืนยันว่าได้รับสติ๊กเกอร์แล้ว?', async () => {
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
    });
  };



  const filteredTasks = tasks.filter(task => {
    if (filter === 'ทั้งหมด') return true;
    if (filter === 'รอสติ๊กเกอร์') return ['รอสติ๊กเกอร์', 'รอสั่งสติ๊กเกอร์', 'สั่งแล้ว-รอรับ'].includes(task.Status);
    if (filter === 'พร้อมติด') return ['พร้อมติดฉลาก', 'รับแล้ว-พร้อมติด'].includes(task.Status);
    if (filter === 'กำลังติด') return task.Status === 'กำลังติดฉลาก';
    if (filter === 'เสร็จแล้ว') return task.Status === 'ติดฉลากเสร็จ';
    return true;
  });

  const getStatusColor = (status) => {
    if (status?.includes('รอ')) return 'yellow';
    if (status?.includes('พร้อม')) return 'blue';
    if (status?.includes('กำลัง')) return 'orange';
    if (status?.includes('เสร็จ')) return 'green';
    return 'gray';
  };

  return (
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
              onClick={() => { setSelectedTask(task); setUpdateQty(task.LabeledQty); setShowModal(true); }}
            >
              <div className="lbl-card-header">
                <div className="lbl-card-title">
                  <span className="lbl-task-id">{task.TaskID}</span>
                  <div className="lbl-badges">
                    <span className={`lbl-badge ${task.LabelType === 'custom' ? 'oem' : 'mts'}`}>
                      {task.LabelType === 'custom' ? 'OEM' : 'MTS'}
                    </span>
                    <span className="lbl-badge status" style={{ backgroundColor: `var(--${getStatusColor(task.Status)}-light)`, color: `var(--${getStatusColor(task.Status)}-dark)` }}>
                      {task.Status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="lbl-card-body">
                {task.LabelType === 'custom' && task.CustomerName && (
                  <div className="lbl-customer-name">ลูกค้า: {task.CustomerName}</div>
                )}
                
                <div className="lbl-info-row">
                  <span className="lbl-info-label">สินค้า:</span>
                  <span className="lbl-info-value">{task.ProductName}</span>
                </div>
                <div className="lbl-info-row">
                  <span className="lbl-info-label">Lot:</span>
                  <span className="lbl-info-value">{task.BatchNo}</span>
                </div>

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

                <div className="lbl-progress-container">
                  <div className="lbl-progress-header">
                    <span>ความคืบหน้า</span>
                    <span>{task.LabeledQty} / {task.Qty}</span>
                  </div>
                  <div className="lbl-progress-bar">
                    <div className="lbl-progress-fill" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="lbl-card-footer">
                {(task.Status === 'พร้อมติดฉลาก' || task.Status === 'รับแล้ว-พร้อมติด') && (
                  <button className="lbl-btn primary" onClick={(e) => { e.stopPropagation(); handleStartTask(task.TaskID); }}>
                    เริ่มติดฉลาก
                  </button>
                )}
                {task.Status === 'กำลังติดฉลาก' && (
                  <button className="lbl-btn primary" onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setShowModal(true); }}>
                    อัปเดต / จบงาน
                  </button>
                )}
                {task.LabelType === 'custom' && task.Status === 'รอสั่งสติ๊กเกอร์' && (
                  <button className="lbl-btn secondary" onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setShowModal(true); }}>
                    สั่งสติ๊กเกอร์
                  </button>
                )}
                {task.LabelType === 'custom' && task.Status === 'สั่งแล้ว-รอรับ' && (
                  <button className="lbl-btn secondary" onClick={(e) => { e.stopPropagation(); handleStickerReceived(task.TaskID); }}>
                    รับสติ๊กเกอร์แล้ว
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {showModal && selectedTask && (
        <div className="lbl-modal-overlay">
          <div className="lbl-modal-content">
            <div className="lbl-modal-header">
              <h2 className="lbl-modal-title">รายละเอียดงาน: {selectedTask.TaskID}</h2>
              <button className="lbl-close-btn" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            
            <div className="lbl-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="lbl-info-row"><span className="lbl-info-label">สถานะ:</span> <span className="lbl-info-value">{selectedTask.Status}</span></div>
                <div className="lbl-info-row"><span className="lbl-info-label">ประเภท:</span> <span className="lbl-info-value">{selectedTask.LabelType === 'custom' ? 'OEM' : 'MTS (Stock)'}</span></div>
                <div className="lbl-info-row"><span className="lbl-info-label">สินค้า:</span> <span className="lbl-info-value">{selectedTask.ProductName}</span></div>
                <div className="lbl-info-row"><span className="lbl-info-label">Lot:</span> <span className="lbl-info-value">{selectedTask.BatchNo}</span></div>
                <div className="lbl-info-row"><span className="lbl-info-label">จำนวนเต็ม:</span> <span className="lbl-info-value">{selectedTask.Qty}</span></div>
                <div className="lbl-info-row"><span className="lbl-info-label">ติดฉลากแล้ว:</span> <span className="lbl-info-value">{selectedTask.LabeledQty}</span></div>
              </div>

              {selectedTask.LabelType === 'custom' && selectedTask.Status === 'รอสั่งสติ๊กเกอร์' && (
                <div className="lbl-oem-form">
                  <h3>สั่งสติ๊กเกอร์ OEM</h3>
                  <div className="lbl-form-group">
                    <label className="lbl-form-label">โรงพิมพ์ / ผู้ผลิต</label>
                    <input type="text" className="lbl-input" value={oemSupplier} onChange={e => setOemSupplier(e.target.value)} />
                  </div>
                  <div className="lbl-form-group">
                    <label className="lbl-form-label">หมายเหตุ</label>
                    <input type="text" className="lbl-input" value={oemNote} onChange={e => setOemNote(e.target.value)} />
                  </div>
                  <button className="lbl-btn primary" onClick={() => handleStickerOrdered(selectedTask.TaskID)}>
                    บันทึกการสั่ง
                  </button>
                </div>
              )}

              {selectedTask.LabelType === 'custom' && selectedTask.Status === 'สั่งแล้ว-รอรับ' && (
                <div className="lbl-oem-form">
                  <div className="lbl-info-row"><span className="lbl-info-label">โรงพิมพ์:</span> <span className="lbl-info-value">{selectedTask.StickerSupplier}</span></div>
                  <button className="lbl-btn primary" onClick={() => handleStickerReceived(selectedTask.TaskID)}>
                    ยืนยันรับสติ๊กเกอร์
                  </button>
                </div>
              )}

              {selectedTask.LabelType === 'stock' && (
                <div className="lbl-sticker-table">
                  <h3>รายการสติ๊กเกอร์ที่ต้องใช้</h3>
                  <table className="lbl-table">
                    <thead><tr><th>ชื่อสติ๊กเกอร์</th><th>จุดที่ติด</th><th>จำนวนที่ต้องการ</th><th>มีในสต็อก</th></tr></thead>
                    <tbody>
                      {JSON.parse(selectedTask.LabelConfigJSON || '[]').map((c, i) => (
                        <tr key={i}>
                          <td>{c.stickerName}</td>
                          <td>{c.applyTo}</td>
                          <td>{c.qtyPerUnit * selectedTask.Qty}</td>
                          <td style={{ color: c.stockAvailable >= c.qtyPerUnit * selectedTask.Qty ? '#16a34a' : '#ef4444' }}>
                            {c.stockAvailable}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedTask.Status === 'กำลังติดฉลาก' && (
                <div className="lbl-update-progress">
                  <div className="lbl-form-group" style={{ flex: 1 }}>
                    <label className="lbl-form-label">อัปเดตจำนวนที่ติดเสร็จแล้ว</label>
                    <input 
                      type="number" 
                      className="lbl-input" 
                      value={updateQty} 
                      onChange={e => setUpdateQty(e.target.value)} 
                      max={selectedTask.Qty}
                    />
                  </div>
                  <button className="lbl-btn secondary" onClick={() => handleUpdateProgress(selectedTask.TaskID)}>อัปเดต</button>
                  <button className="lbl-btn primary" onClick={() => handleCompleteTask(selectedTask.TaskID)}>จบงาน</button>
                </div>
              )}
            </div>

            <div className="lbl-modal-footer">
              <button className="lbl-btn secondary" onClick={() => setShowModal(false)}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

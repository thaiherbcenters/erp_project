import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import { Search, Plus, Eye, Edit, Trash2, XCircle, Package } from 'lucide-react';
import API_BASE from '../config';
import './PageCommon.css';
import './ProductMaster.css';

const TYPE_CONFIG = {
    all: { label: 'ทั้งหมด', color: '#475569' },
    finished_goods: { label: 'ผลิตภัณฑ์สำเร็จรูป', color: '#059669', bg: '#ecfdf5' },
    raw_material: { label: 'วัตถุดิบ', color: '#d97706', bg: '#fffbeb' },
    packaging: { label: 'บรรจุภัณฑ์', color: '#2563eb', bg: '#eff6ff' },
    label: { label: 'ฉลาก/สิ่งพิมพ์', color: '#7c3aed', bg: '#f5f3ff' },
    consumable: { label: 'วัสดุสิ้นเปลือง', color: '#dc2626', bg: '#fef2f2' }
};

const emptyForm = {
    itemType: 'finished_goods', itemName: '', itemNameEN: '', subCategory: '',
    unit: 'ชิ้น', sellingPrice: 0, costPerUnit: 0, currentStock: 0, minStock: 0,
    netWeight: '', fdaNumber: '', notes: ''
};

const ProductMaster = () => {
    const { token, canCreate, canUpdate, canDelete } = useAuth();
    const { showAlert, showConfirm } = useAlert();

    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeType, setActiveType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1 });

    const getAuthHeaders = useCallback((json = true) => {
        const h = { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` };
        if (json) h['Content-Type'] = 'application/json';
        return h;
    }, [token]);

    const fetchSummary = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/master-items/summary`, {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setSummary(data);
            }
        } catch (error) {
            console.error('Failed to fetch summary', error);
        }
    }, [getAuthHeaders]);

    const fetchItems = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page,
                limit: pagination.limit,
                ...(activeType !== 'all' && { type: activeType }),
                ...(appliedSearch && { search: appliedSearch })
            });

            const response = await fetch(`${API_BASE}/api/master-items?${query}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                setItems(data.items || []);
                setPagination(prev => ({
                    ...prev,
                    page: data.pagination?.currentPage || 1,
                    totalPages: data.pagination?.totalPages || 1
                }));
            } else {
                const err = await response.json();
                showAlert('error', err.message || 'ไม่สามารถโหลดข้อมูลได้');
            }
        } catch (error) {
            console.error('Failed to fetch items', error);
            showAlert('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        } finally {
            setLoading(false);
        }
    }, [activeType, appliedSearch, pagination.limit, getAuthHeaders, showAlert]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    useEffect(() => {
        fetchItems(1);
    }, [activeType, appliedSearch, fetchItems]);

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setAppliedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleCreate = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/master-items`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showAlert('success', 'เพิ่มรายการสำเร็จ');
                setShowCreateModal(false);
                setFormData(emptyForm);
                fetchItems();
                fetchSummary();
            } else {
                const err = await response.json();
                showAlert('error', err.message || 'ไม่สามารถเพิ่มรายการได้');
            }
        } catch (error) {
            console.error('Create error', error);
            showAlert('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        }
    };

    const handleEdit = async () => {
        if (!selectedItem) return;
        try {
            const response = await fetch(`${API_BASE}/api/master-items/${selectedItem._id || selectedItem.id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showAlert('success', 'แก้ไขรายการสำเร็จ');
                setShowEditModal(false);
                setSelectedItem(null);
                setFormData(emptyForm);
                fetchItems(pagination.page);
                fetchSummary();
            } else {
                const err = await response.json();
                showAlert('error', err.message || 'ไม่สามารถแก้ไขรายการได้');
            }
        } catch (error) {
            console.error('Edit error', error);
            showAlert('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        }
    };

    const handleDelete = async (item) => {
        const confirm = await showConfirm(
            'ยืนยันการลบ',
            `คุณต้องการลบรายการ ${item.itemName} ใช่หรือไม่?`
        );
        
        if (confirm) {
            try {
                const response = await fetch(`${API_BASE}/api/master-items/${item._id || item.id}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });

                if (response.ok) {
                    showAlert('success', 'ลบรายการสำเร็จ');
                    fetchItems(pagination.page);
                    fetchSummary();
                } else {
                    const err = await response.json();
                    showAlert('error', err.message || 'ไม่สามารถลบรายการได้');
                }
            } catch (error) {
                console.error('Delete error', error);
                showAlert('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
            }
        }
    };

    const openEditModal = (item) => {
        setSelectedItem(item);
        setFormData({
            itemType: item.itemType || 'finished_goods',
            itemName: item.itemName || '',
            itemNameEN: item.itemNameEN || '',
            subCategory: item.subCategory || '',
            unit: item.unit || 'ชิ้น',
            sellingPrice: item.sellingPrice || 0,
            costPerUnit: item.costPerUnit || 0,
            currentStock: item.currentStock || 0,
            minStock: item.minStock || 0,
            netWeight: item.netWeight || '',
            fdaNumber: item.fdaNumber || '',
            notes: item.notes || ''
        });
        setShowEditModal(true);
    };

    const openViewModal = (item) => {
        setSelectedItem(item);
        setShowViewModal(true);
    };

    const getStatusBadge = (qty, minStock) => {
        const cQty = Number(qty) || 0;
        const cMin = Number(minStock) || 0;
        if (cQty <= 0) return <span className="badge badge-danger">หมด</span>;
        if (cQty <= cMin) return <span className="badge badge-warning">เหลือน้อย</span>;
        return <span className="badge badge-success">ปกติ</span>;
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div className="header-title">
                    <h1 className="page-title">รายการสินค้า (Product Master)</h1>
                    <p className="page-subtitle">จัดการสินค้า วัตถุดิบ บรรจุภัณฑ์ และวัสดุสิ้นเปลืองทั้งหมด</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="pm-summary-grid">
                {['finished_goods', 'raw_material', 'packaging', 'label', 'consumable'].map(type => (
                    <div 
                        key={type} 
                        className="pm-summary-card" 
                        style={{ borderLeft: `4px solid ${TYPE_CONFIG[type].color}` }}
                    >
                        <span className="pm-card-label">{TYPE_CONFIG[type].label}</span>
                        <span className="pm-card-value">
                            {summary ? (summary[type] || 0).toLocaleString() : '-'}
                        </span>
                    </div>
                ))}
            </div>

            <div className="toolbar">
                <div className="pm-type-tabs">
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                        <button
                            key={key}
                            className={`pm-type-tab ${activeType === key ? 'active' : ''}`}
                            onClick={() => setActiveType(key)}
                            style={activeType === key ? { backgroundColor: config.color, borderColor: config.color } : {}}
                        >
                            {config.label}
                        </button>
                    ))}
                </div>

                <div className="toolbar-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="search-group">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="ค้นหารายการ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canCreate('stock_data') && (
                        <button 
                            className="btn-primary"
                            onClick={() => {
                                setFormData(emptyForm);
                                setShowCreateModal(true);
                            }}
                        >
                            <Plus size={18} />
                            เพิ่มรายการ
                        </button>
                    )}
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>รหัส</th>
                            <th>ชื่อรายการ</th>
                            <th>ประเภท</th>
                            <th>หมวดหมู่</th>
                            <th>หน่วย</th>
                            <th className="text-right">ราคา/ต้นทุน</th>
                            <th className="text-right">คงเหลือ</th>
                            <th className="text-center">สถานะ</th>
                            <th className="text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="9" className="text-center py-4">กำลังโหลดข้อมูล...</td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="text-center py-4">ไม่พบข้อมูล</td>
                            </tr>
                        ) : (
                            items.map(item => {
                                const typeConf = TYPE_CONFIG[item.itemType] || TYPE_CONFIG.all;
                                return (
                                    <tr key={item._id || item.id}>
                                        <td>{item.itemCode || '-'}</td>
                                        <td>{item.itemName}</td>
                                        <td>
                                            <span 
                                                className="pm-badge-type"
                                                style={{ backgroundColor: typeConf.bg, color: typeConf.color }}
                                            >
                                                {typeConf.label}
                                            </span>
                                        </td>
                                        <td>{item.subCategory || '-'}</td>
                                        <td>{item.unit || '-'}</td>
                                        <td className="text-right">
                                            {item.itemType === 'finished_goods' 
                                                ? `฿${Number(item.sellingPrice || 0).toLocaleString()}`
                                                : `฿${Number(item.costPerUnit || 0).toLocaleString()} (ต้นทุน)`
                                            }
                                        </td>
                                        <td className="text-right">{Number(item.currentStock || 0).toLocaleString()}</td>
                                        <td className="text-center">
                                            {getStatusBadge(item.currentStock, item.minStock)}
                                        </td>
                                        <td className="text-center">
                                            <div className="action-buttons" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                <button className="btn-icon text-blue" onClick={() => openViewModal(item)} title="ดูรายละเอียด">
                                                    <Eye size={16} />
                                                </button>
                                                {canUpdate('stock_data') && (
                                                    <button className="btn-icon text-orange" onClick={() => openEditModal(item)} title="แก้ไข">
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {canDelete('stock_data') && (
                                                    <button className="btn-icon text-red" onClick={() => handleDelete(item)} title="ลบ">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {pagination.totalPages > 1 && (
                <div className="pagination">
                    <button 
                        disabled={pagination.page <= 1}
                        onClick={() => fetchItems(pagination.page - 1)}
                        className="btn-secondary"
                    >
                        ก่อนหน้า
                    </button>
                    <span style={{ fontSize: '14px' }}>
                        หน้า {pagination.page} จาก {pagination.totalPages}
                    </span>
                    <button 
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchItems(pagination.page + 1)}
                        className="btn-secondary"
                    >
                        ถัดไป
                    </button>
                </div>
            )}

            {/* Create / Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="rnd-modal-overlay" onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                }}>
                    <div className="rnd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <div className="rnd-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>{showCreateModal ? 'เพิ่มรายการใหม่' : 'แก้ไขรายการ'}</h3>
                            <button className="btn-icon" onClick={() => {
                                setShowCreateModal(false);
                                setShowEditModal(false);
                            }}>
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="rnd-modal-body">
                            <div className="pm-form-grid">
                                <div className="pm-form-group">
                                    <label>ประเภท *</label>
                                    <select 
                                        value={formData.itemType}
                                        onChange={e => setFormData({...formData, itemType: e.target.value})}
                                    >
                                        <option value="finished_goods">ผลิตภัณฑ์สำเร็จรูป</option>
                                        <option value="raw_material">วัตถุดิบ</option>
                                        <option value="packaging">บรรจุภัณฑ์</option>
                                        <option value="label">ฉลาก/สิ่งพิมพ์</option>
                                        <option value="consumable">วัสดุสิ้นเปลือง</option>
                                    </select>
                                </div>
                                <div className="pm-form-group">
                                    <label>หมวดหมู่ย่อย</label>
                                    <input 
                                        type="text" 
                                        value={formData.subCategory}
                                        onChange={e => setFormData({...formData, subCategory: e.target.value})}
                                        placeholder="เช่น ครีม, เซรั่ม, ขวด, สติกเกอร์"
                                    />
                                </div>

                                <div className="pm-form-group">
                                    <label>ชื่อรายการ *</label>
                                    <input 
                                        type="text" 
                                        value={formData.itemName}
                                        onChange={e => setFormData({...formData, itemName: e.target.value})}
                                    />
                                </div>
                                <div className="pm-form-group">
                                    <label>ชื่อภาษาอังกฤษ</label>
                                    <input 
                                        type="text" 
                                        value={formData.itemNameEN}
                                        onChange={e => setFormData({...formData, itemNameEN: e.target.value})}
                                    />
                                </div>

                                <div className="pm-form-group">
                                    <label>หน่วย *</label>
                                    <input 
                                        type="text" 
                                        value={formData.unit}
                                        onChange={e => setFormData({...formData, unit: e.target.value})}
                                        placeholder="ชิ้น, กิโลกรัม, ลิตร"
                                    />
                                </div>
                                {formData.itemType === 'finished_goods' ? (
                                    <div className="pm-form-group">
                                        <label>ราคาขาย</label>
                                        <input 
                                            type="number" 
                                            value={formData.sellingPrice}
                                            onChange={e => setFormData({...formData, sellingPrice: e.target.value})}
                                        />
                                    </div>
                                ) : (
                                    <div className="pm-form-group">
                                        <label>ต้นทุน/หน่วย</label>
                                        <input 
                                            type="number" 
                                            value={formData.costPerUnit}
                                            onChange={e => setFormData({...formData, costPerUnit: e.target.value})}
                                        />
                                    </div>
                                )}

                                <div className="pm-form-group">
                                    <label>จำนวนคงเหลือ</label>
                                    <input 
                                        type="number" 
                                        value={formData.currentStock}
                                        onChange={e => setFormData({...formData, currentStock: e.target.value})}
                                    />
                                </div>
                                <div className="pm-form-group">
                                    <label>จำนวนขั้นต่ำ (เตือน)</label>
                                    <input 
                                        type="number" 
                                        value={formData.minStock}
                                        onChange={e => setFormData({...formData, minStock: e.target.value})}
                                    />
                                </div>

                                {formData.itemType === 'finished_goods' && (
                                    <>
                                        <div className="pm-form-group">
                                            <label>น้ำหนักบรรจุ/ชิ้น (กรัม)</label>
                                            <input 
                                                type="number" 
                                                value={formData.netWeight}
                                                onChange={e => setFormData({...formData, netWeight: e.target.value})}
                                            />
                                        </div>
                                        <div className="pm-form-group">
                                            <label>เลข อย.</label>
                                            <input 
                                                type="text" 
                                                value={formData.fdaNumber}
                                                onChange={e => setFormData({...formData, fdaNumber: e.target.value})}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="pm-form-group full-width">
                                    <label>หมายเหตุ</label>
                                    <textarea 
                                        value={formData.notes}
                                        onChange={e => setFormData({...formData, notes: e.target.value})}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="rnd-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                            <button className="btn-secondary" onClick={() => {
                                setShowCreateModal(false);
                                setShowEditModal(false);
                            }}>ยกเลิก</button>
                            <button className="btn-primary" onClick={showCreateModal ? handleCreate : handleEdit}>
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {showViewModal && selectedItem && (
                <div className="rnd-modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="rnd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="rnd-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Package size={20} />
                                รายละเอียดรายการ
                            </h3>
                            <button className="btn-icon" onClick={() => setShowViewModal(false)}>
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="rnd-modal-body">
                            <div style={{ marginBottom: '15px' }}>
                                <strong>รหัส:</strong> <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '14px', fontFamily: 'monospace' }}>{selectedItem.itemCode || '-'}</span>
                                <span 
                                    className="pm-badge-type"
                                    style={{ 
                                        backgroundColor: (TYPE_CONFIG[selectedItem.itemType] || TYPE_CONFIG.all).bg, 
                                        color: (TYPE_CONFIG[selectedItem.itemType] || TYPE_CONFIG.all).color,
                                        marginLeft: '10px'
                                    }}
                                >
                                    {(TYPE_CONFIG[selectedItem.itemType] || TYPE_CONFIG.all).label}
                                </span>
                            </div>
                            <div className="pm-form-grid" style={{ gap: '10px' }}>
                                <div><strong>ชื่อรายการ:</strong> {selectedItem.itemName}</div>
                                <div><strong>ชื่อภาษาอังกฤษ:</strong> {selectedItem.itemNameEN || '-'}</div>
                                <div><strong>หมวดหมู่ย่อย:</strong> {selectedItem.subCategory || '-'}</div>
                                <div><strong>หน่วย:</strong> {selectedItem.unit || '-'}</div>
                                
                                {selectedItem.itemType === 'finished_goods' ? (
                                    <div><strong>ราคาขาย:</strong> ฿{Number(selectedItem.sellingPrice || 0).toLocaleString()}</div>
                                ) : (
                                    <div><strong>ต้นทุน/หน่วย:</strong> ฿{Number(selectedItem.costPerUnit || 0).toLocaleString()}</div>
                                )}
                                
                                <div><strong>คงเหลือ:</strong> {Number(selectedItem.currentStock || 0).toLocaleString()}</div>
                                <div><strong>ขั้นต่ำ:</strong> {Number(selectedItem.minStock || 0).toLocaleString()}</div>
                                
                                {selectedItem.itemType === 'finished_goods' && (
                                    <>
                                        <div><strong>น้ำหนักบรรจุ:</strong> {selectedItem.netWeight ? `${selectedItem.netWeight} กรัม` : '-'}</div>
                                        <div><strong>เลข อย.:</strong> {selectedItem.fdaNumber || '-'}</div>
                                    </>
                                )}
                                
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <strong>หมายเหตุ:</strong>
                                    <p style={{ margin: '5px 0 0', padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '14px' }}>
                                        {selectedItem.notes || '-'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="rnd-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button className="btn-secondary" onClick={() => setShowViewModal(false)}>ปิด</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ProductMaster;

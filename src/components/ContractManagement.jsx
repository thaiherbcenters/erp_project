import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, FileText, Eye, X } from 'lucide-react';
import { useAlert } from './CustomAlert';
import API_BASE from '../config';
import './ContractManagement.css';

const ContractManagement = () => {
    const { showAlert } = useAlert();
    const [contracts, setContracts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form state
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        contractNo: '',
        contractName: '',
        startDate: '',
        endDate: '',
        status: 'กำลังดำเนินการ'
    });

    // View Modal state
    const [viewModalData, setViewModalData] = useState(null);
    const [linkedDocs, setLinkedDocs] = useState([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_BASE}/contracts`);
            const json = await res.json();
            if (json.success) {
                setContracts(json.data);
            }
        } catch (err) {
            console.error(err);
            showAlert('error', 'ไม่สามารถดึงข้อมูลสัญญาได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.contractNo || !formData.contractName) {
            showAlert('error', 'กรุณากรอกเลขที่สัญญาและชื่อโปรเจกต์');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/contracts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const json = await res.json();
            if (json.success) {
                showAlert('success', 'เพิ่มสัญญาเรียบร้อยแล้ว');
                setShowForm(false);
                setFormData({ contractNo: '', contractName: '', startDate: '', endDate: '', status: 'กำลังดำเนินการ' });
                fetchContracts();
            } else {
                showAlert('error', 'เกิดข้อผิดพลาด: ' + json.message);
            }
        } catch (err) {
            console.error(err);
            showAlert('error', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
        }
    };

    const handleDelete = async (id, no) => {
        if (!window.confirm(`ยืนยันการลบสัญญา ${no} ใช่หรือไม่?`)) return;
        
        try {
            const res = await fetch(`${API_BASE}/contracts/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                showAlert('success', 'ลบสัญญาเรียบร้อยแล้ว');
                fetchContracts();
            } else {
                showAlert('error', 'เกิดข้อผิดพลาด: ' + json.message);
            }
        } catch (err) {
            console.error(err);
            showAlert('error', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
        }
    };

    const handleViewDetails = async (contract) => {
        setViewModalData(contract);
        setIsLoadingDocs(true);
        try {
            const res = await fetch(`${API_BASE}/contracts/${contract.ContractID}/documents`);
            const json = await res.json();
            if (json.success) {
                setLinkedDocs(json.data);
            } else {
                setLinkedDocs([]);
            }
        } catch (err) {
            console.error('Error fetching docs', err);
            setLinkedDocs([]);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    const closeViewModal = () => {
        setViewModalData(null);
        setLinkedDocs([]);
    };

    const filteredContracts = contracts.filter(c => 
        c.ContractNo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.ContractName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="contract-mgt-container">
            <div className="contract-header">
                <div>
                    <h1 className="contract-title">
                        <FileText size={24} color="#1e40af" />
                        จัดการสัญญา (Contracts)
                    </h1>
                    <p className="contract-subtitle">เพิ่ม/ลบ สัญญาและโปรเจกต์เพื่อใช้ผูกกับเอกสารต่างๆ ในระบบ</p>
                </div>
                <button className="btn-add-contract" onClick={() => setShowForm(!showForm)}>
                    <Plus size={18} />
                    {showForm ? 'ยกเลิก' : 'เพิ่มสัญญาใหม่'}
                </button>
            </div>

            {showForm && (
                <form className="contract-form-card" onSubmit={handleSubmit}>
                    <h3>เพิ่มสัญญาใหม่</h3>
                    <div className="contract-form-grid">
                        <div className="form-group">
                            <label>เลขที่สัญญา *</label>
                            <input type="text" name="contractNo" value={formData.contractNo} onChange={handleChange} placeholder="เช่น CT-001" required />
                        </div>
                        <div className="form-group">
                            <label>ชื่อโปรเจกต์/สัญญา *</label>
                            <input type="text" name="contractName" value={formData.contractName} onChange={handleChange} placeholder="เช่น ผลิตผลิตภัณฑ์สมุนไพร" required />
                        </div>
                        <div className="form-group">
                            <label>วันที่เริ่มต้น</label>
                            <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>วันที่สิ้นสุด (ถ้ามี)</label>
                            <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="contract-form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>ยกเลิก</button>
                        <button type="submit" className="btn-primary">บันทึกสัญญา</button>
                    </div>
                </form>
            )}

            <div className="contract-list-card">
                <div className="contract-list-header">
                    <div className="search-box">
                        <Search size={16} color="#64748b" />
                        <input 
                            type="text" 
                            placeholder="ค้นหาเลขที่สัญญา หรือ ชื่อโปรเจกต์..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="loading-state">กำลังโหลดข้อมูล...</div>
                ) : filteredContracts.length === 0 ? (
                    <div className="empty-state">ไม่พบข้อมูลสัญญาในระบบ</div>
                ) : (
                    <div className="table-responsive">
                        <table className="contract-table">
                            <thead>
                                <tr>
                                    <th>เลขที่สัญญา</th>
                                    <th>ชื่อโปรเจกต์</th>
                                    <th>วันที่เริ่มต้น</th>
                                    <th>วันที่สิ้นสุด</th>
                                    <th>สถานะ</th>
                                    <th style={{ textAlign: 'right' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredContracts.map(c => (
                                    <tr key={c.ContractID}>
                                        <td className="fw-500 text-blue">{c.ContractNo}</td>
                                        <td>{c.ContractName}</td>
                                        <td>{c.StartDate ? new Date(c.StartDate).toLocaleDateString('th-TH') : '-'}</td>
                                        <td>{c.EndDate ? new Date(c.EndDate).toLocaleDateString('th-TH') : '-'}</td>
                                        <td><span className="status-badge progress">{c.Status}</span></td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <button className="btn-icon view" onClick={() => handleViewDetails(c)} title="ดูรายละเอียด">
                                                <Eye size={16} />
                                            </button>
                                            <button className="btn-icon delete" onClick={() => handleDelete(c.ContractID, c.ContractNo)} title="ลบสัญญา">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* View Modal */}
            {viewModalData && (
                <div className="contract-modal-overlay">
                    <div className="contract-modal">
                        <div className="contract-modal-header">
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>รายละเอียดสัญญา</h2>
                            <button className="btn-icon" onClick={closeViewModal}><X size={20} /></button>
                        </div>
                        <div className="contract-modal-body">
                            <div className="contract-info-grid">
                                <div><span className="info-label">เลขที่สัญญา:</span> <span className="fw-500">{viewModalData.ContractNo}</span></div>
                                <div><span className="info-label">สถานะ:</span> <span className="status-badge progress">{viewModalData.Status}</span></div>
                                <div style={{ gridColumn: '1 / -1' }}><span className="info-label">ชื่อโปรเจกต์:</span> {viewModalData.ContractName}</div>
                                <div><span className="info-label">วันที่เริ่มต้น:</span> {viewModalData.StartDate ? new Date(viewModalData.StartDate).toLocaleDateString('th-TH') : '-'}</div>
                                <div><span className="info-label">วันที่สิ้นสุด:</span> {viewModalData.EndDate ? new Date(viewModalData.EndDate).toLocaleDateString('th-TH') : '-'}</div>
                            </div>
                            
                            <h3 style={{ margin: '24px 0 12px 0', fontSize: '15px', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>เอกสารที่เกี่ยวข้อง (อ้างอิงสัญญานี้)</h3>
                            
                            {isLoadingDocs ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>กำลังโหลดเอกสาร...</div>
                            ) : linkedDocs.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '4px' }}>ไม่มีเอกสารที่เกี่ยวข้องกับสัญญานี้</div>
                            ) : (
                                <table className="contract-table docs-table">
                                    <thead>
                                        <tr>
                                            <th>ประเภทเอกสาร</th>
                                            <th>เลขที่เอกสาร</th>
                                            <th>วันที่เอกสาร</th>
                                            <th>สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {linkedDocs.map(doc => (
                                            <tr key={doc.DocumentID}>
                                                <td>{doc.DocumentType === 'poa' ? 'หนังสือมอบอำนาจ' : doc.DocumentType}</td>
                                                <td>{doc.DocumentNo || '-'}</td>
                                                <td>{doc.DocumentDate ? new Date(doc.DocumentDate).toLocaleDateString('th-TH') : '-'}</td>
                                                <td><span className="status-badge progress">{doc.Status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContractManagement;

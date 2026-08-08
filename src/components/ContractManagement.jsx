import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, FileText, Eye, X, Paperclip } from 'lucide-react';
import { useAlert } from './CustomAlert';
import { useAuth } from '../context/AuthContext';
import API_BASE from '../config';
import CustomDatePicker from './CustomDatePicker';
import './ContractManagement.css';

const getAutoContractStatus = (startDate, endDate) => {
    const now = new Date();
    now.setHours(0,0,0,0);
    
    let start = null;
    let end = null;
    if (startDate) {
        start = new Date(startDate);
        start.setHours(0,0,0,0);
    }
    if (endDate) {
        end = new Date(endDate);
        end.setHours(0,0,0,0);
    }

    if (start && now < start) {
        return 'รอดำเนินการ';
    }
    if (end && now > end) {
        return 'สิ้นสุด/หมดอายุ';
    }
    return 'กำลังดำเนินการ';
};

const ContractManagement = ({ onViewDocument }) => {
    const { showAlert } = useAlert();
    const { canCreate, canDelete } = useAuth();
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

    const getDocTypeLabel = (type) => {
        const types = {
            'poa': 'ขึ้นทะเบียน (POA)',
            'herbal_cert': 'คำรับรอง',
            'torbor1': 'แบบ ทบ.๑',
            'contract_mfg': 'สัญญาจ้างผลิตสินค้า',
            'pdpa_consent': 'หนังสือให้ความยินยอม (PDPA)',
            'corp_rep': 'หนังสือแต่งตั้งผู้แทน',
            'safety_cert': 'คำรับรองความปลอดภัยฯ'
        };
        return types[type] || type;
    };

    const handleViewDetails = async (contract) => {
        setViewModalData(contract);
        setIsLoadingDocs(true);
        try {
            const res = await fetch(`${API_BASE}/contracts/${contract.ContractID}/documents`);
            const json = await res.json();
            if (json.success) {
                // Group by CreatedAt (within 5 seconds)
                const groupedDocs = [];
                (json.data || []).forEach(doc => {
                    // Only group legal documents, not quotations/sales orders
                    const isLegalDoc = ['poa', 'herbal_cert', 'torbor1', 'contract_mfg', 'pdpa_consent', 'corp_rep', 'safety_cert'].includes(doc.DocumentType);
                    
                    if (!isLegalDoc) {
                        groupedDocs.push({
                            ...doc,
                            primaryDoc: doc,
                            docs: [doc],
                            documentTypeLabel: doc.DocumentType
                        });
                        return;
                    }

                    const groupIndex = groupedDocs.findIndex(g => {
                        if (!g.CreatedAt || !doc.CreatedAt) return false;
                        const isGLegal = ['poa', 'herbal_cert', 'torbor1', 'contract_mfg', 'pdpa_consent', 'corp_rep', 'safety_cert'].includes(g.DocumentType);
                        if (!isGLegal) return false;
                        return Math.abs(new Date(g.CreatedAt) - new Date(doc.CreatedAt)) < 5000;
                    });
                    
                    if (groupIndex !== -1) {
                        groupedDocs[groupIndex].docs.push(doc);
                        groupedDocs[groupIndex].documentTypeLabel += `, ${getDocTypeLabel(doc.DocumentType)}`;
                        
                        // Promote poa, herbal_cert, or torbor1 as primary document if possible
                        if (['poa', 'herbal_cert', 'torbor1'].includes(doc.DocumentType) && 
                            !['poa', 'herbal_cert', 'torbor1'].includes(groupedDocs[groupIndex].primaryDoc.DocumentType)) {
                            groupedDocs[groupIndex].primaryDoc = doc;
                            groupedDocs[groupIndex].DocumentNo = doc.DocumentNo;
                        }
                    } else {
                        groupedDocs.push({
                            ...doc,
                            primaryDoc: doc,
                            docs: [doc],
                            documentTypeLabel: getDocTypeLabel(doc.DocumentType)
                        });
                    }
                });
                setLinkedDocs(groupedDocs);
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

    const handlePrintDoc = async (doc) => {
        if (onViewDocument) {
            onViewDocument(doc.DocumentType, doc.DocumentID, doc.docs);
        } else {
            // Fallback for legal documents if no handler provided
            if (doc.DocumentType === 'poa' || doc.DocumentType === 'corp_rep') {
                window.open(`${API_BASE}/legal-documents/${doc.DocumentID}/print`, '_blank');
            } else {
                showAlert('error', 'ไม่สามารถเปิดเอกสารได้จากหน้านี้');
            }
        }
    };

    const closeViewModal = () => {
        setViewModalData(null);
        setLinkedDocs([]);
    };

    const handleToggleForm = () => {
        if (!showForm) {
            // Auto generate contract number: CT-YYMMDD-XXX
            const d = new Date();
            const yy = d.getFullYear().toString().slice(-2);
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const prefix = `CT-${yy}${mm}${dd}-`;
            
            // Find how many contracts exist today to increment
            const countToday = contracts.filter(c => c.ContractNo?.startsWith(prefix)).length;
            const nextNum = String(countToday + 1).padStart(3, '0');
            
            setFormData({ 
                contractNo: `${prefix}${nextNum}`, 
                contractName: '', 
                startDate: '', 
                endDate: '', 
                status: 'กำลังดำเนินการ' 
            });
        }
        setShowForm(!showForm);
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
            </div>

            <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: '24px' }}>
                <div className="search-group">
                    <div className="search-input-wrap">
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder="ค้นหาเลขที่สัญญา หรือ ชื่อโปรเจกต์..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                {canCreate('sales_contracts') && (
                    <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleToggleForm}>
                        <Plus size={16} /> {showForm ? 'ยกเลิก' : 'เพิ่มสัญญาใหม่'}
                    </button>
                )}
            </div>

            {showForm && (
                <form className="contract-form-card" onSubmit={handleSubmit}>
                    <h3>เพิ่มสัญญาใหม่</h3>
                    <div className="contract-form-grid">
                        <div className="form-group">
                            <label>เลขที่สัญญา *</label>
                            <input type="text" name="contractNo" value={formData.contractNo} onChange={handleChange} placeholder="เช่น CT-001" required readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} title="สร้างให้อัตโนมัติ" />
                        </div>
                        <div className="form-group">
                            <label>ชื่อโปรเจกต์/สัญญา *</label>
                            <input type="text" name="contractName" value={formData.contractName} onChange={handleChange} placeholder="เช่น ผลิตผลิตภัณฑ์สมุนไพร" required />
                        </div>
                        <div className="form-group">
                            <label>วันที่เริ่มต้น</label>
                            <CustomDatePicker name="startDate" value={formData.startDate} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>วันที่สิ้นสุด (ถ้ามี)</label>
                            <CustomDatePicker name="endDate" value={formData.endDate} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="contract-form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>ยกเลิก</button>
                        <button type="submit" className="btn-primary">บันทึกสัญญา</button>
                    </div>
                </form>
            )}

            <div className="table-card card">


                {isLoading ? (
                    <div className="loading-state">กำลังโหลดข้อมูล...</div>
                ) : filteredContracts.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>ไม่พบข้อมูลสัญญาในระบบ</div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>เลขที่สัญญา</th>
                                    <th>ชื่อโปรเจกต์</th>
                                    <th>วันที่เริ่มต้น</th>
                                    <th>วันที่สิ้นสุด</th>
                                    <th>สถานะ</th>
                                    <th style={{ textAlign: 'center' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredContracts.map(c => (
                                    <tr key={c.ContractID}>
                                        <td className="fw-500 text-blue">{c.ContractNo}</td>
                                        <td>{c.ContractName}</td>
                                        <td>{c.StartDate ? new Date(c.StartDate).toLocaleDateString('th-TH') : '-'}</td>
                                        <td>{c.EndDate ? new Date(c.EndDate).toLocaleDateString('th-TH') : '-'}</td>
                                        <td><span className={`status-badge ${
                                            (() => {
                                                const s = getAutoContractStatus(c.StartDate, c.EndDate);
                                                if (s === 'รอดำเนินการ') return 'pending';
                                                if (s === 'กำลังดำเนินการ') return 'progress';
                                                if (s === 'สิ้นสุด/หมดอายุ') return 'rejected';
                                                return 'progress';
                                            })()
                                        }`}>{getAutoContractStatus(c.StartDate, c.EndDate)}</span></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className="contract-actions">
                                                <button className="btn-icon view" onClick={() => handleViewDetails(c)} title="ดูรายละเอียด">
                                                    <Eye size={16} />
                                                </button>
                                                {canDelete('sales_contracts') && (
                                                    <button className="btn-icon delete" onClick={() => handleDelete(c.ContractID, c.ContractNo)} title="ลบสัญญา">
                                                        <Trash2 size={16} />
                                                    </button>
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

            {/* View Modal */}
            {viewModalData && (
                <div className="contract-modal-overlay">
                    <div className="contract-modal" style={{ width: '800px', maxWidth: '90vw' }}>
                        <div className="contract-modal-header">
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>รายละเอียดสัญญา</h2>
                            <button className="btn-icon" onClick={closeViewModal}><X size={20} /></button>
                        </div>
                        <div className="contract-modal-body">
                            <div className="contract-info-grid">
                                <div><span className="info-label">เลขที่สัญญา:</span> <span className="fw-500">{viewModalData.ContractNo}</span></div>
                                <div><span className="info-label">สถานะ:</span> <span className={`status-badge ${
                                    (() => {
                                        const s = getAutoContractStatus(viewModalData.StartDate, viewModalData.EndDate);
                                        if (s === 'รอดำเนินการ') return 'pending';
                                        if (s === 'กำลังดำเนินการ') return 'progress';
                                        if (s === 'สิ้นสุด/หมดอายุ') return 'rejected';
                                        return 'progress';
                                    })()
                                }`}>{getAutoContractStatus(viewModalData.StartDate, viewModalData.EndDate)}</span></div>
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
                                <table className="contract-table docs-table" style={{ whiteSpace: 'nowrap' }}>
                                    <thead>
                                        <tr>
                                            <th>ประเภทเอกสาร</th>
                                            <th>เลขที่เอกสาร</th>
                                            <th>วันที่เอกสาร</th>
                                            <th>สถานะ</th>
                                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {linkedDocs.map(doc => (
                                            <tr key={doc.DocumentID}>
                                                <td>{doc.documentTypeLabel || doc.DocumentType}</td>
                                                <td>{doc.primaryDoc?.DocumentNo || doc.DocumentNo || '-'}</td>
                                                <td>{doc.primaryDoc?.DocumentDate || doc.DocumentDate ? new Date(doc.primaryDoc?.DocumentDate || doc.DocumentDate).toLocaleDateString('th-TH') : '-'}</td>
                                                <td><span className={`status-badge ${
                                                    (() => {
                                                        const s = doc.Status || '';
                                                        if (s === 'ร่าง' || s.includes('รอ')) return 'pending';
                                                        if (s === 'พร้อมใช้' || s.includes('อนุมัติ') || s.includes('เสร็จ') || s.includes('ส่ง') || s.includes('ลงนาม')) return 'approved';
                                                        if (s.includes('ยกเลิก') || s.includes('ปฏิเสธ')) return 'rejected';
                                                        return 'progress';
                                                    })()
                                                }`}>{doc.Status}</span></td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div className="action-buttons justify-center" style={{ display: 'flex', gap: '8px' }}>
                                                        <button className="btn-icon" title="ดูเอกสารฉบับพิมพ์" onClick={() => handlePrintDoc(doc)} style={{ color: '#2563eb', background: '#eff6ff', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                                                            <Eye size={16} />
                                                        </button>
                                                        {doc.HasAttachment ? (
                                                            <a href={`${API_BASE}${doc.AttachmentPath}`} target="_blank" rel="noreferrer" className="btn-icon" title="ดูไฟล์แนบลายเซ็น" style={{ color: '#10b981', background: '#ecfdf5', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                                                                <Paperclip size={16} />
                                                            </a>
                                                        ) : null}
                                                    </div>
                                                </td>
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

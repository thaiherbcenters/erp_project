import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, Users, FileSignature, ChevronDown, Check, Save, Printer, Loader2 } from 'lucide-react';
import { useAlert } from './CustomAlert';
import API_BASE from '../config';
import PowerOfAttorneyForm from './PowerOfAttorneyForm';
import HerbalCertForm from './HerbalCertForm';

/**
 * RegistrationDocCreator.jsx
 * หน้าสร้างเอกสารขึ้นทะเบียนใหม่
 * - เลือกลูกค้า
 * - เลือกอ้างอิงสัญญา
 * - เลือกประเภทเอกสาร (multi-select)
 * - แสดงฟอร์มตามประเภทที่เลือก
 */

const DOC_TYPES = [
    { id: 'poa', name: 'หนังสือมอบอำนาจ', icon: '📜', description: 'หนังสือมอบอำนาจสำหรับผลิตภัณฑ์สมุนไพร' },
    { id: 'herbal_cert', name: 'คำรับรอง (อ้างอิงแม่แบบ)', icon: '📝', description: 'คำรับรองสำหรับผู้ยื่นคำขอขึ้นทะเบียนตำรับผลิตภัณฑ์สมุนไพร' },
];

const RegistrationDocCreator = ({ onBack, editingDocId = null, editingDocType = null }) => {
    const { showAlert, showConfirm, showLoading, hideLoading } = useAlert();
    const [customers, setCustomers] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedContractId, setSelectedContractId] = useState('');
    const [selectedDocTypes, setSelectedDocTypes] = useState(editingDocType ? [editingDocType] : []);
    const [activeTabId, setActiveTabId] = useState(editingDocType || '');
    const [customerData, setCustomerData] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [sharedFormData, setSharedFormData] = useState({ writtenAt: '', documentDate: '' });
    const [draggedTab, setDraggedTab] = useState(null);
    const [docVersion, setDocVersion] = useState(1);
    const [docStatus, setDocStatus] = useState('ร่าง');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const statusDropdownRef = useRef(null);
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
                setShowStatusDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSharedDataChange = (field, value) => {
        setSharedFormData(prev => ({ ...prev, [field]: value }));
    };

    // Refs สำหรับดึงข้อมูลจากแต่ละฟอร์ม
    const poaFormRef = useRef(null);
    const herbalCertFormRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    const collectAllFormData = () => {
        const collectedData = [];
        if (selectedDocTypes.includes('poa') && poaFormRef.current) {
            collectedData.push(poaFormRef.current.getFormData());
        }
        if (selectedDocTypes.includes('herbal_cert') && herbalCertFormRef.current) {
            collectedData.push(herbalCertFormRef.current.getFormData());
        }
        return collectedData;
    };

    const saveFormsToDatabase = async (allData, status = 'ร่าง') => {
        const results = [];
        for (const item of allData) {
            const { type, data } = item;
            try {
                // ถ้าใน data มี documentId อยู่แล้วแปลว่าเป็นการอัปเดต (PUT)
                // ถ้าไม่มีแปลว่าเป็นการสร้างใหม่ (POST)
                let isUpdate = !!data.documentId;
                let method = isUpdate ? 'PUT' : 'POST';
                let endpointBase = `${API_BASE}/legal-documents`;
                if (type === 'herbal_cert') {
                    endpointBase = `${API_BASE}/herbal-cert-documents`;
                }

                let targetId = data.documentId;

                // Check if we should automatically create a new version
                if (isUpdate && status !== 'พรีวิว' && (status === 'ลูกค้าขอแก้ไข' || docStatus === 'ลูกค้าขอแก้ไข' || docStatus === 'ลูกค้าลงนามแล้ว')) {
                    try {
                        const verRes = await fetch(`${endpointBase}/${targetId}/version`, { method: 'POST' });
                        const verData = await verRes.json();
                        if (verData.success) {
                            targetId = verData.documentId;
                            method = 'PUT'; // Update the newly created version
                            data.documentId = targetId; // Important for payload
                            setDocVersion(verData.version);
                        }
                    } catch (err) {
                        console.error('Error creating new version', err);
                    }
                }

                const url = isUpdate 
                    ? `${endpointBase}/${targetId}` 
                    : `${endpointBase}`;
                    
                // กำหนดสถานะตามที่ผู้ใช้เลือก (ยกเว้นกรณีพิมพ์พรีวิวสำหรับเอกสารเดิม จะไม่เปลี่ยนสถานะ)
                const payload = { ...data, documentType: type };
                if (status) {
                    if (isUpdate && status === 'พรีวิว') {
                        payload.status = docStatus;
                    } else {
                        payload.status = status;
                    }
                }

                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (result.success) {
                    const savedId = result.documentId || data.documentId;
                    
                    // อัปเดต ID กลับไปที่ฟอร์มเพื่อไม่ให้สร้างซ้ำถัดไป
                    if (type === 'poa' && poaFormRef.current && poaFormRef.current.setCurrentDocId) {
                        poaFormRef.current.setCurrentDocId(savedId);
                    }
                    if (type === 'herbal_cert' && herbalCertFormRef.current && herbalCertFormRef.current.setCurrentDocId) {
                        herbalCertFormRef.current.setCurrentDocId(savedId);
                    }
                    
                    results.push({ type, documentId: savedId });
                } else {
                    console.error('Save failed for', type, result);
                }
            } catch (err) {
                console.error('Error saving', type, err);
            }
        }
        return results;
    };

    const handlePrintAll = async () => {
        const allData = collectAllFormData();
        if (allData.length === 0) {
            showAlert('แจ้งเตือน', 'กรุณาเลือกประเภทเอกสารที่ต้องการพิมพ์', 'warning');
            return;
        }

        setIsPrinting(true);
        try {
            // 0. ตรวจสอบก่อนว่าเอกสารไหนบ้างที่มี Template (แม่แบบ) ใน Backend
            const missingTemplates = [];
            const validData = [];
            
            for (const item of allData) {
                const docName = DOC_TYPES.find(d => d.id === item.type)?.name || item.type;
                try {
                    const checkRes = await fetch(`${API_BASE}/print/check-template/${item.type}`);
                    const checkData = await checkRes.json();
                    if (checkData.exists) {
                        validData.push(item);
                    } else {
                        missingTemplates.push(`• ${docName}`);
                    }
                } catch (e) {
                    // ถ้าเช็คไม่ได้ สมมติว่ามีไปก่อนแล้วค่อยไปดักตอน error สร้าง PDF ทีหลัง
                    validData.push(item);
                }
            }

            if (missingTemplates.length > 0) {
                // หยุด Loading ชั่วคราวเพื่อถามผู้ใช้
                setIsPrinting(false);
                
                const message = `ไม่พบแม่แบบ PDF สำหรับเอกสารดังต่อไปนี้:\n${missingTemplates.join('\n')}\n\nคุณต้องการพิมพ์เฉพาะเอกสารที่พร้อมใช้งานหรือไม่?`;
                const proceed = await showConfirm('แจ้งเตือนแม่แบบไม่พร้อม', message, 'warning');
                
                if (!proceed) {
                    return; // ยกเลิกการพิมพ์
                }
                
                if (validData.length === 0) {
                    showAlert('แจ้งเตือน', 'ไม่มีเอกสารใดที่สามารถพิมพ์ได้ในขณะนี้', 'warning');
                    return;
                }
                
                // ถ้ายืนยันจะพิมพ์ต่อ ให้เริ่ม Loading ใหม่
                setIsPrinting(true);
            }

            // 1. บันทึกลง Database ก่อน (ใช้สถานะ "พรีวิว" เพื่อไม่ให้แสดงในหน้ารายการ)
            // บันทึกเฉพาะข้อมูลที่มี Template พร้อมพิมพ์เท่านั้น (หรือจะบันทึกทั้งหมดก็ได้ แต่ตอนนี้เลือกบันทึกเฉพาะที่พิมพ์ได้)
            const savedDocs = await saveFormsToDatabase(validData, 'พรีวิว');
            
            if (savedDocs.length === 0) {
                showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลก่อนพิมพ์ได้', 'error');
                setIsPrinting(false);
                return;
            }

            // 2. ข้อมูลลง DB แล้ว ค่อยเรียก Print API ไปดึงข้อมูลมาออกเป็น PDF
            let successCount = 0;
            const errorMessages = [];

            for (const doc of savedDocs) {
                if (!doc.documentId) continue;
                
                const docName = DOC_TYPES.find(d => d.id === doc.type)?.name || doc.type;
                
                try {
                    const printResponse = await fetch(`${API_BASE}/print`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ documentType: doc.type, documentId: doc.documentId })
                    });

                    if (printResponse.ok) {
                        const blob = await printResponse.blob();
                        const url = window.URL.createObjectURL(blob);
                        window.open(url, '_blank');
                        successCount++;
                    } else {
                        try {
                            const errorData = await printResponse.json();
                            errorMessages.push(`• ${docName}: ${errorData.error || 'ไม่สามารถสร้าง PDF ได้'}`);
                        } catch (e) {
                            errorMessages.push(`• ${docName}: ไม่พบแม่แบบหรือเกิดข้อผิดพลาดจากเซิร์ฟเวอร์`);
                        }
                        console.error('Print API Error for', doc.type);
                    }
                } catch (err) {
                    errorMessages.push(`• ${docName}: เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์`);
                    console.error('Error printing document type:', doc.type, err);
                }
            }
            
            if (errorMessages.length > 0) {
                if (successCount > 0) {
                    showAlert('พิมพ์เอกสารสำเร็จบางส่วน', `เปิดเอกสารสำเร็จ ${successCount} ฉบับ\n\nแต่พบปัญหาดังนี้:\n${errorMessages.join('\n')}`, 'warning');
                } else {
                    showAlert('ไม่สามารถสร้างเอกสารได้', `พบปัญหาดังนี้:\n${errorMessages.join('\n')}`, 'error');
                }
            } else if (successCount > 0) {
                showAlert('สำเร็จ', `เปิด PDF เอกสารจำนวน ${successCount} ฉบับเรียบร้อยแล้ว`, 'success');
            }
            
        } catch (error) {
            console.error('Error in handlePrintAll:', error);
            showAlert('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการประมวลผล', 'error');
        } finally {
            setIsPrinting(false);
        }
    };

    const handleSaveAll = async () => {
        const allData = collectAllFormData();
        if (allData.length === 0) {
            showAlert('แจ้งเตือน', 'กรุณาเลือกประเภทเอกสารที่ต้องการบันทึก', 'warning');
            return;
        }
        
        setIsSaving(true);
        try {
            const savedDocs = await saveFormsToDatabase(allData, docStatus);
            if (savedDocs.length > 0) {
                showAlert('สำเร็จ', 'บันทึกข้อมูลเอกสารจำนวน ' + savedDocs.length + ' รายการเรียบร้อยแล้ว', 'success');
                if (onBack) onBack();
            } else {
                showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            }
        } catch (err) {
            console.error(err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับระบบได้', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Fetch customers
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const res = await fetch(`${API_BASE}/customers`);
                const json = await res.json();
                if (json.success) setCustomers(json.data || []);
            } catch (err) { console.error('Error fetching customers:', err); }
        };
        fetchCustomers();
    }, []);

    // Fetch contracts
    useEffect(() => {
        const fetchContracts = async () => {
            try {
                const res = await fetch(`${API_BASE}/contracts`);
                const json = await res.json();
                if (json.success) setContracts(json.data || []);
            } catch (err) { console.error('Error fetching contracts:', err); }
        };
        fetchContracts();
    }, []);

    // When customer is selected, fetch full details
    const handleSelectCustomer = async (customer) => {
        setSelectedCustomerId(customer.CustomerID);
        setCustomerSearch(customer.CustomerName);
        setShowCustomerDropdown(false);
        try {
            const res = await fetch(`${API_BASE}/customers/${customer.CustomerID}`);
            const json = await res.json();
            if (json.success) setCustomerData(json.data);
        } catch (err) { console.error('Error:', err); }
    };

    useEffect(() => {
        if (selectedDocTypes.length > 0) {
            if (!selectedDocTypes.includes(activeTabId)) {
                setActiveTabId(selectedDocTypes[0]);
            }
        } else {
            setActiveTabId('');
        }
    }, [selectedDocTypes, activeTabId]);

    // Fetch document data if editing
    useEffect(() => {
        if (editingDocId && editingDocType) {
            const fetchDoc = async () => {
                try {
                    let endpoint = `${API_BASE}/legal-documents`;
                    if (editingDocType === 'herbal_cert') {
                        endpoint = `${API_BASE}/herbal-cert-documents`;
                    }
                    const res = await fetch(`${endpoint}/${editingDocId}`);
                    const json = await res.json();
                    if (json.success && json.data) {
                        const doc = json.data;
                        setDocVersion(doc.Version || 1);
                        setDocStatus(doc.Status || 'ร่าง');
                        if (doc.ContractID) {
                            setSelectedContractId(doc.ContractID);
                        }
                        const name = doc.GrantorName || doc.ApplicantName || (doc.Data && (doc.Data.licenseeName || doc.Data.applicantName));
                        if (name) {
                            setCustomerSearch(name);
                            // Fetch customers to find full details
                            fetch(`${API_BASE}/customers`)
                                .then(res => res.json())
                                .then(cJson => {
                                    if (cJson.success) {
                                        const cust = cJson.data.find(c => c.CustomerName === name);
                                        if (cust) {
                                            setSelectedCustomerId(cust.CustomerID);
                                            fetch(`${API_BASE}/customers/${cust.CustomerID}`)
                                                .then(r => r.json())
                                                .then(d => {
                                                    if (d.success) setCustomerData(d.data);
                                                });
                                        } else {
                                            setCustomerData({ CustomerName: name });
                                        }
                                    }
                                }).catch(() => {
                                    setCustomerData({ CustomerName: name });
                                });
                        }
                    }
                } catch (err) {
                    console.error('Error fetching edit doc:', err);
                }
            };
            fetchDoc();
        }
    }, [editingDocId, editingDocType]);

    // Handle document type togglection
    const toggleDocType = (typeId) => {
        setSelectedDocTypes(prev =>
            prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
        );
    };

    const handleDragStart = (e, id) => {
        setDraggedTab(id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedTab || draggedTab === targetId) return;

        const draggedIndex = selectedDocTypes.indexOf(draggedTab);
        const targetIndex = selectedDocTypes.indexOf(targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const newDocTypes = [...selectedDocTypes];
            newDocTypes.splice(draggedIndex, 1);
            newDocTypes.splice(targetIndex, 0, draggedTab);
            setSelectedDocTypes(newDocTypes);
        }
        setDraggedTab(null);
    };

    // Filter customers for dropdown
    const filteredCustomers = customers.filter(c =>
        (c.CustomerName || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.CustomerCode || '').toLowerCase().includes(customerSearch.toLowerCase())
    );

    const cardStyle = {
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    };

    const sectionTitle = {
        fontSize: '16px',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: '#475569',
        marginBottom: '6px'
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s'
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '10px 20px', paddingBottom: '100px' }}>
            <style>
            {`
                @media print {
                    body, html {
                        background-color: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .print-only-area, .print-only-area * {
                        visibility: visible;
                    }
                    .print-only-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100vw !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background-color: white !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .doc-tab-content {
                        display: block !important;
                    }
                    .print-page-break {
                        page-break-before: always;
                    }
                    .print-page-break:first-child {
                        page-break-before: auto;
                    }
                    @page {
                        margin: 1cm;
                    }
                }
                
                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}
            </style>
            
            {/* Header */}
            <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <button
                    onClick={onBack}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}
                >
                    <ArrowLeft size={16} /> กลับ
                </button>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {editingDocId ? 'แก้ไขเอกสารขึ้นทะเบียน' : 'สร้างเอกสารขึ้นทะเบียนใหม่'}
                        {editingDocId && <span style={{ fontSize: '14px', padding: '2px 8px', background: '#e0e7ff', color: '#4338ca', borderRadius: '12px' }}>เวอร์ชัน {docVersion}</span>}
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>{editingDocId ? 'แก้ไขข้อมูลลูกค้า สัญญาอ้างอิง และเพิ่ม/ลดเอกสารที่ต้องการ' : 'เลือกข้อมูลลูกค้า สัญญาอ้างอิง และประเภทเอกสารที่ต้องการ'}</p>
                </div>
            </div>

            {/* Step 1: เลือกลูกค้า + สัญญา */}
            <div className="no-print" style={cardStyle}>
                <h3 style={sectionTitle}><Users size={18} color="#2563eb" /> ข้อมูลลูกค้าและสัญญา</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Customer Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <label style={labelStyle}>เลือกลูกค้า *</label>
                        <input
                            style={inputStyle}
                            value={customerSearch}
                            onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                            onFocus={() => setShowCustomerDropdown(true)}
                            onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                            placeholder="พิมพ์ชื่อหรือรหัสลูกค้าเพื่อค้นหา..."
                        />
                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                            <ul style={{
                                position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight: '200px',
                                overflowY: 'auto', background: '#fff', border: '1px solid #ccc', borderRadius: '8px',
                                zIndex: 1000, margin: 0, padding: 0, listStyle: 'none',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}>
                                {filteredCustomers.slice(0, 20).map(c => (
                                    <li
                                        key={c.CustomerID}
                                        onClick={() => handleSelectCustomer(c)}
                                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}
                                        onMouseEnter={e => e.target.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.target.style.background = 'transparent'}
                                    >
                                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{c.CustomerName}</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{c.CustomerCode} • {c.Phone || '-'}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Contract Dropdown */}
                    <div>
                        <label style={labelStyle}>อ้างอิงสัญญา (เลือกจากระบบ)</label>
                        <select
                            style={{ ...inputStyle, appearance: 'auto' }}
                            value={selectedContractId}
                            onChange={e => setSelectedContractId(e.target.value)}
                        >
                            <option value="">-- เลือกสัญญา --</option>
                            {contracts.map(c => (
                                <option key={c.ContractID} value={c.ContractID}>
                                    {c.ContractNo} - {c.ContractName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Customer Info Preview */}
                {customerData && (
                    <div style={{ marginTop: '16px', padding: '14px 18px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', marginBottom: '8px' }}>📋 ข้อมูลลูกค้าที่เลือก</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px', color: '#334155' }}>
                            <div><b>ชื่อ:</b> {customerData.CustomerName}</div>
                            <div><b>โทร:</b> {customerData.Phone || '-'}</div>
                            <div><b>อีเมล:</b> {customerData.Email || '-'}</div>
                            <div><b>เลขภาษี:</b> {customerData.TaxID || '-'}</div>
                            <div style={{ gridColumn: '2 / 4' }}><b>ที่อยู่:</b> {customerData.Address || '-'}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 2: เลือกประเภทเอกสาร */}
            <div className="no-print" style={cardStyle}>
                <h3 style={sectionTitle}><FileText size={18} color="#2563eb" /> เลือกประเภทเอกสาร</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', marginTop: '-8px' }}>
                    สามารถเลือกได้มากกว่า 1 ประเภท ฟอร์มจะแสดงด้านล่างตามที่เลือก
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {DOC_TYPES.map(dt => {
                        const isSelected = selectedDocTypes.includes(dt.id);
                        return (
                            <div
                                key={dt.id}
                                onClick={() => toggleDocType(dt.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '14px',
                                    padding: '16px 20px', borderRadius: '10px',
                                    cursor: 'pointer',
                                    border: isSelected ? '2px solid #2563eb' : '2px solid #e2e8f0',
                                    background: isSelected ? '#eff6ff' : '#fff',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{
                                    width: '24px', height: '24px', borderRadius: '6px',
                                    border: isSelected ? '2px solid #2563eb' : '2px solid #cbd5e1',
                                    background: isSelected ? '#2563eb' : '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, transition: 'all 0.2s'
                                }}>
                                    {isSelected && <Check size={14} color="#fff" />}
                                </div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>
                                        {dt.icon} {dt.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                        {dt.description}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Step 3: แสดงฟอร์มตามประเภทที่เลือก */}
            {selectedDocTypes.length > 0 && (
                <div className="print-only-area">
                    {/* Tabs Header */}
                    <div className="no-print" style={{ display: 'flex', gap: '4px', marginBottom: '0', overflowX: 'auto', padding: '0 8px' }}>
                        {selectedDocTypes.map(typeId => {
                            const dt = DOC_TYPES.find(d => d.id === typeId);
                            if (!dt) return null;
                            const isActive = activeTabId === typeId;
                            
                            const typeColors = {
                                poa: '#1e40af',
                                herbal_cert: '#047857'
                            };
                            const color = typeColors[typeId] || '#2563eb';
                            
                            return (
                                <div
                                    key={typeId}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, typeId)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, typeId)}
                                    onClick={() => setActiveTabId(typeId)}
                                    style={{
                                        padding: '14px 28px',
                                        cursor: 'pointer',
                                        background: isActive ? color : '#f1f5f9',
                                        border: 'none',
                                        borderRadius: '12px 12px 0 0',
                                        fontWeight: isActive ? '700' : '500',
                                        color: isActive ? '#fff' : '#64748b',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isActive ? '0 -4px 10px rgba(0,0,0,0.1)' : 'inset 0 -1px 0 #cbd5e1',
                                        zIndex: isActive ? 10 : 1,
                                        position: 'relative'
                                    }}
                                >
                                    <span style={{ fontSize: '18px' }}>{dt.icon}</span> 
                                    <span style={{ fontSize: '15px' }}>{dt.name}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="doc-tab-content" style={{ display: activeTabId === 'poa' ? 'block' : 'none' }}>
                        {selectedDocTypes.includes('poa') && (
                            <div className="print-page-break" style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: '4px solid #1e40af' }}>
                                <div style={{ padding: '0' }}>
                                    <PowerOfAttorneyForm
                                        ref={poaFormRef}
                                        documentId={editingDocType === 'poa' ? editingDocId : null}
                                        onBack={null}
                                        customerData={customerData}
                                        contractId={selectedContractId}
                                        embedded={true}
                                        sharedFormData={sharedFormData}
                                        onSharedDataChange={handleSharedDataChange}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="doc-tab-content" style={{ display: activeTabId === 'herbal_cert' ? 'block' : 'none' }}>
                        {selectedDocTypes.includes('herbal_cert') && (
                            <div className="print-page-break" style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: '4px solid #047857' }}>
                                <div style={{ padding: '0' }}>
                                    <HerbalCertForm
                                        ref={herbalCertFormRef}
                                        documentId={editingDocType === 'herbal_cert' ? editingDocId : null}
                                        customerData={customerData}
                                        contractId={selectedContractId}
                                        embedded={true}
                                        sharedFormData={sharedFormData}
                                        onSharedDataChange={handleSharedDataChange}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedDocTypes.length === 0 && (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
                    <FileText size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '15px', fontWeight: '500' }}>กรุณาเลือกประเภทเอกสารด้านบน</p>
                    <p style={{ fontSize: '13px' }}>ฟอร์มกรอกข้อมูลจะแสดงที่นี่</p>
                </div>
            )}
            
            {/* Sticky Footer สำหรับปุ่มบันทึกรวม */}
            {selectedDocTypes.length > 0 && (
                <div className="no-print" style={{
                    position: 'sticky',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    borderTop: '1px solid #e2e8f0',
                    padding: '16px 24px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)',
                    zIndex: 50,
                    marginTop: '24px',
                    borderRadius: '0 0 12px 12px',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: 'auto' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>สถานะเอกสาร:</label>
                        <div style={{ position: 'relative' }} ref={statusDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                style={{
                                    padding: '8px 36px 8px 16px', 
                                    borderRadius: '20px', 
                                    border: `1px solid ${
                                        docStatus === 'สร้างแล้ว' ? '#bae6fd' :
                                        docStatus === 'ส่งให้ลูกค้าแล้ว' ? '#fecaca' :
                                        docStatus === 'ลูกค้าขอแก้ไข' ? '#fde047' :
                                        docStatus === 'ลูกค้าลงนามแล้ว' ? '#bbf7d0' : '#cbd5e1'
                                    }`,
                                    backgroundColor: 
                                        docStatus === 'สร้างแล้ว' ? '#e0f2fe' :
                                        docStatus === 'ส่งให้ลูกค้าแล้ว' ? '#fee2e2' :
                                        docStatus === 'ลูกค้าขอแก้ไข' ? '#fef9c3' :
                                        docStatus === 'ลูกค้าลงนามแล้ว' ? '#dcfce7' : '#f1f5f9',
                                    color: 
                                        docStatus === 'สร้างแล้ว' ? '#0369a1' :
                                        docStatus === 'ส่งให้ลูกค้าแล้ว' ? '#b91c1c' :
                                        docStatus === 'ลูกค้าขอแก้ไข' ? '#a16207' :
                                        docStatus === 'ลูกค้าลงนามแล้ว' ? '#15803d' : '#475569',
                                    fontSize: '14px', 
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    minWidth: '180px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <span>{docStatus === 'ร่าง' ? 'ร่าง (Draft)' : 
                                      docStatus === 'สร้างแล้ว' ? 'สร้างแล้ว (Generated)' : 
                                      docStatus === 'ส่งให้ลูกค้าแล้ว' ? 'ส่งให้ลูกค้าแล้ว (Sent)' : 
                                      docStatus === 'ลูกค้าขอแก้ไข' ? 'ลูกค้าขอแก้ไข (Revision)' : 
                                      docStatus === 'ลูกค้าลงนามแล้ว' ? 'ลูกค้าลงนามแล้ว (Signed)' : docStatus}</span>
                                <ChevronDown size={16} style={{ 
                                    position: 'absolute', 
                                    right: '12px',
                                    transform: showStatusDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease'
                                }} />
                            </button>
                            
                            {showStatusDropdown && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: 0,
                                    marginBottom: '8px',
                                    width: '100%',
                                    minWidth: '220px',
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                    padding: '8px',
                                    zIndex: 100,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    {[
                                        { val: 'ร่าง', label: 'ร่าง (Draft)', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
                                        { val: 'สร้างแล้ว', label: 'สร้างแล้ว (Generated)', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
                                        { val: 'ส่งให้ลูกค้าแล้ว', label: 'ส่งให้ลูกค้าแล้ว (Sent)', bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
                                        { val: 'ลูกค้าขอแก้ไข', label: 'ลูกค้าขอแก้ไข (Revision)', bg: '#fef9c3', color: '#a16207', border: '#fde047' },
                                        { val: 'ลูกค้าลงนามแล้ว', label: 'ลูกค้าลงนามแล้ว (Signed)', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' }
                                    ].map(opt => (
                                        <div
                                            key={opt.val}
                                            onClick={() => {
                                                setDocStatus(opt.val);
                                                setShowStatusDropdown(false);
                                            }}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                backgroundColor: docStatus === opt.val ? opt.bg : 'transparent',
                                                color: docStatus === opt.val ? opt.color : '#334155',
                                                border: `1px solid ${docStatus === opt.val ? opt.border : 'transparent'}`,
                                                transition: 'all 0.15s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (docStatus !== opt.val) e.currentTarget.style.backgroundColor = '#f8fafc';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (docStatus !== opt.val) e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            {opt.label}
                                            {docStatus === opt.val && <Check size={14} />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={handlePrintAll} disabled={isSaving || isPrinting} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}>
                        <Printer size={18} /> {isPrinting ? 'กำลังสร้าง PDF...' : 'พรีวิว / พิมพ์ทั้งหมด'}
                    </button>
                    <button onClick={handleSaveAll} disabled={isSaving || isPrinting} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}>
                        <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </button>
                </div>
            )}

            {/* Popup Loading Overlay */}
            {(isSaving || isPrinting) && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(2px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '32px 48px',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <Loader2 
                            size={40} 
                            color="#2563eb" 
                            style={{ animation: 'spin 1s linear infinite' }} 
                        />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                                {isPrinting ? 'กำลังสร้างเอกสาร PDF...' : 'กำลังบันทึกข้อมูล...'}
                            </div>
                            <div style={{ fontSize: '14px', color: '#64748b' }}>
                                กรุณารอสักครู่ ระบบกำลังประมวลผล
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegistrationDocCreator;

import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef as useRefLocal } from 'react';
import { MapPin, Calendar, User, FileText } from 'lucide-react';
import API_BASE from '../config';
import './PowerOfAttorneyForm.css';
import NameInputWithTitle from './NameInputWithTitle';
import CustomDatePicker from './CustomDatePicker';

const SafetyCertForm = forwardRef(({ documentId, contractId, customerId, onSharedDataChange, embedded }, ref) => {
    const [loading, setLoading] = useState(false);
    const [currentDocId, setCurrentDocId] = useState(documentId);

    const [form, setForm] = useState({
        writtenAt: '',
        documentDate: new Date().toISOString().split('T')[0],
        ownerPrefix: '',
        ownerName: '',
        reqTypeRegistration: false,
        reqTypeDetailNotification: false,
        reqTypeNotification: false,
        productName: '',
        receiptNo: ''
    });

    useEffect(() => {
        if (currentDocId) {
            fetchData();
        }
    }, [currentDocId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/safety-cert-documents/${currentDocId}`);
            if (res.ok) {
                const data = await res.json();
                setForm(prev => ({
                    ...prev,
                    writtenAt: data.WrittenAt || '',
                    documentDate: data.DocumentDate ? data.DocumentDate.split('T')[0] : '',
                    ownerPrefix: data.OwnerPrefix || '',
                    ownerName: data.OwnerName || '',
                    reqTypeRegistration: data.ReqTypeRegistration || false,
                    reqTypeDetailNotification: data.ReqTypeDetailNotification || false,
                    reqTypeNotification: data.ReqTypeNotification || false,
                    productName: data.ProductName || '',
                    receiptNo: data.ReceiptNo || ''
                }));
                if (onSharedDataChange) {
                    onSharedDataChange({
                        writtenAt: data.WrittenAt
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching safety cert data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setForm(prev => ({ ...prev, [name]: val }));
    };

    useImperativeHandle(ref, () => ({
        getFormData: () => ({
            type: 'safety_cert',
            data: {
                ...form,
                documentId: currentDocId,
                contractId: contractId || null,
                customerId: customerId || null
            }
        }),
        setCurrentDocId: (id) => setCurrentDocId(id)
    }));

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;

    return (
        <div className="poa-form-wrapper">
            {!embedded && (
                <div style={{ marginBottom: '24px', padding: '16px', background: '#ecfdf5', color: '#047857', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                    <strong>ℹ️ หนังสือคำรับรองความปลอดภัยผลิตภัณฑ์สมุนไพร</strong> <br/>
                    สำหรับผู้รับใบสำคัญการขึ้นทะเบียนตำรับ ใบรับแจ้งรายละเอียด และใบรับจดแจ้งผลิตภัณฑ์สมุนไพร สำหรับการดำเนินการติดตามความปลอดภัยจากผลิตภัณฑ์สมุนไพร
                </div>
            )}

            {/* ข้อมูลการเขียน */}
            <div className="poa-info-box gray" style={{ marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ marginTop: 0 }}><MapPin size={18} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> ข้อมูลการทำเอกสาร</div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>เขียนที่</label>
                        <input type="text" name="writtenAt" value={form.writtenAt} onChange={handleChange} placeholder="บริษัท..." />
                    </div>
                    <div className="poa-field">
                        <label>วันที่</label>
                        <CustomDatePicker name="documentDate" value={form.documentDate} onChange={handleChange} />
                    </div>
                </div>
            </div>

            {/* ข้อมูลผู้ยื่น */}
            <div className="poa-info-box" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ color: '#15803d', marginTop: 0 }}><User size={18} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> ข้อมูลผู้ยื่นคำขอ</div>
                
                <div className="poa-row">
                    <div className="poa-field full">
                        <label>ข้าพเจ้า (ชื่อบุคคล/นิติบุคคล)</label>
                        <NameInputWithTitle 
                            value={(form.ownerPrefix && form.ownerPrefix !== 'นิติบุคคล' ? form.ownerPrefix : '') + (form.ownerName || '')}
                            onChange={(val) => setForm(prev => ({ ...prev, ownerPrefix: '', ownerName: val }))}
                            placeholder="ชื่อ-นามสกุล หรือ ชื่อนิติบุคคล"
                        />
                    </div>
                </div>
            </div>

            {/* ประเภทคำขอและผลิตภัณฑ์ */}
            <div className="poa-info-box" style={{ background: '#f0f9ff', borderColor: '#bae6fd', marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ color: '#0369a1', marginTop: 0 }}><FileText size={18} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> ข้อมูลผลิตภัณฑ์สมุนไพร</div>
                
                <div className="poa-row">
                    <div className="poa-field full">
                        <label>ซึ่งเป็นผู้ยื่น (เลือกได้มากกว่า 1)</label>
                        <div className="poa-checkbox-group" style={{ flexDirection: 'column', gap: '8px', background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <label className="poa-checkbox-item">
                                <input type="checkbox" name="reqTypeRegistration" checked={form.reqTypeRegistration} onChange={handleChange} />
                                คำขอขึ้นทะเบียนตำรับผลิตภัณฑ์สมุนไพร
                            </label>
                            <label className="poa-checkbox-item">
                                <input type="checkbox" name="reqTypeDetailNotification" checked={form.reqTypeDetailNotification} onChange={handleChange} />
                                คำขอแจ้งรายละเอียดผลิตภัณฑ์สมุนไพร
                            </label>
                            <label className="poa-checkbox-item">
                                <input type="checkbox" name="reqTypeNotification" checked={form.reqTypeNotification} onChange={handleChange} />
                                คำขอจดแจ้งผลิตภัณฑ์สมุนไพร
                            </label>
                        </div>
                    </div>
                </div>

                <div className="poa-row">
                    <div className="poa-field">
                        <label>ชื่อผลิตภัณฑ์สมุนไพร</label>
                        <input type="text" name="productName" value={form.productName} onChange={handleChange} placeholder="ระบุชื่อผลิตภัณฑ์" />
                    </div>
                    <div className="poa-field">
                        <label>เลขรับที่</label>
                        <input type="text" name="receiptNo" value={form.receiptNo} onChange={handleChange} placeholder="ระบุเลขรับที่ (ถ้ามี)" />
                    </div>
                </div>
            </div>
            
            {!embedded && (
                <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', marginTop: '30px' }}>
                    --- สิ้นสุดเอกสารหนังสือคำรับรองความปลอดภัยผลิตภัณฑ์สมุนไพร ---
                </div>
            )}
        </div>
    );
});

export default SafetyCertForm;



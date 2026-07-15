import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef as useRefLocal } from 'react';
import { MapPin, Calendar, User, FileText } from 'lucide-react';

const SafetyCertForm = forwardRef(({ documentId, contractId, customerId, onSharedDataChange, embedded }, ref) => {
    const [loading, setLoading] = useState(false);
    const [currentDocId, setCurrentDocId] = useState(documentId);
    
    // Shared formatting styles
    const cardStyle = {
        background: '#fff', borderRadius: '12px', padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '24px',
        border: '1px solid #e2e8f0'
    };
    
    const inputStyle = {
        width: '100%', padding: '10px 14px', borderRadius: '8px',
        border: '1px solid #cbd5e1', fontSize: '14px', transition: 'all 0.2s',
        outline: 'none', backgroundColor: '#f8fafc'
    };

    const labelStyle = {
        display: 'block', marginBottom: '6px', fontSize: '13px',
        fontWeight: '600', color: '#475569'
    };

    const gridTwo = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' };

    const [form, setForm] = useState({
        writtenAt: 'บริษัท ไทยเฮิร์บ เซ็นเตอร์ จำกัด',
        documentDate: new Date().toISOString().split('T')[0],
        ownerPrefix: 'นาย',
        ownerName: 'สมชาย รักษาดี',
        reqTypeRegistration: true,
        reqTypeDetailNotification: false,
        reqTypeNotification: true,
        productName: 'ยาดมสมุนไพร ตราไทยเฮิร์บ',
        receiptNo: '1234567890'
    });

    useEffect(() => {
        if (currentDocId) {
            fetchData();
        }
    }, [currentDocId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`http://localhost:5173/api/safety-cert-documents/${currentDocId}`);
            if (res.ok) {
                const data = await res.json();
                setForm(prev => ({
                    ...prev,
                    writtenAt: data.WrittenAt || '',
                    documentDate: data.DocumentDate ? data.DocumentDate.split('T')[0] : '',
                    ownerPrefix: data.OwnerPrefix || 'นาย',
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

    const sectionTitleStyle = {
        fontSize: '16px', fontWeight: '700', color: '#1e293b',
        borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '8px'
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
            {!embedded && (
                <div style={{ marginBottom: '24px', padding: '16px', background: '#ecfdf5', color: '#047857', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                    <strong>ℹ️ หนังสือคำรับรองความปลอดภัยผลิตภัณฑ์สมุนไพร</strong> <br/>
                    สำหรับผู้รับใบสำคัญการขึ้นทะเบียนตำรับ ใบรับแจ้งรายละเอียด และใบรับจดแจ้งผลิตภัณฑ์สมุนไพร สำหรับการดำเนินการติดตามความปลอดภัยจากผลิตภัณฑ์สมุนไพร
                </div>
            )}

            {/* ข้อมูลการเขียน */}
            <div className="card" style={cardStyle}>
                <div style={sectionTitleStyle}><MapPin size={18} /> ข้อมูลการทำเอกสาร</div>
                <div style={gridTwo}>
                    <div>
                        <label style={labelStyle}>เขียนที่</label>
                        <input type="text" name="writtenAt" value={form.writtenAt} onChange={handleChange} placeholder="บริษัท..." style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>วันที่</label>
                        <input type="date" name="documentDate" value={form.documentDate} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>
            </div>

            {/* ข้อมูลผู้ยื่น */}
            <div className="card" style={cardStyle}>
                <div style={sectionTitleStyle}><User size={18} /> ข้อมูลผู้ยื่นคำขอ</div>
                
                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>ข้าพเจ้า (ชื่อบุคคล/นิติบุคคล)</label>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                            <input type="radio" name="ownerPrefix" value="นาย" checked={form.ownerPrefix === 'นาย'} onChange={handleChange} /> นาย
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                            <input type="radio" name="ownerPrefix" value="นาง" checked={form.ownerPrefix === 'นาง'} onChange={handleChange} /> นาง
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                            <input type="radio" name="ownerPrefix" value="นางสาว" checked={form.ownerPrefix === 'นางสาว'} onChange={handleChange} /> นางสาว
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                            <input type="radio" name="ownerPrefix" value="นิติบุคคล" checked={form.ownerPrefix === 'นิติบุคคล'} onChange={handleChange} /> นิติบุคคล
                        </label>
                    </div>
                    <input 
                        type="text" 
                        name="ownerName" 
                        value={form.ownerName} 
                        onChange={handleChange} 
                        placeholder="ชื่อ-นามสกุล หรือ ชื่อนิติบุคคล" 
                        style={{...inputStyle, maxWidth: '500px'}} 
                    />
                </div>
            </div>

            {/* ประเภทคำขอและผลิตภัณฑ์ */}
            <div className="card" style={cardStyle}>
                <div style={sectionTitleStyle}><FileText size={18} /> ข้อมูลผลิตภัณฑ์สมุนไพร</div>
                
                <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>ซึ่งเป็นผู้ยื่น (เลือกได้มากกว่า 1)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                            <input type="checkbox" name="reqTypeRegistration" checked={form.reqTypeRegistration} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                            คำขอขึ้นทะเบียนตำรับผลิตภัณฑ์สมุนไพร
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                            <input type="checkbox" name="reqTypeDetailNotification" checked={form.reqTypeDetailNotification} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                            คำขอแจ้งรายละเอียดผลิตภัณฑ์สมุนไพร
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                            <input type="checkbox" name="reqTypeNotification" checked={form.reqTypeNotification} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                            คำขอจดแจ้งผลิตภัณฑ์สมุนไพร
                        </label>
                    </div>
                </div>

                <div style={gridTwo}>
                    <div>
                        <label style={labelStyle}>ชื่อผลิตภัณฑ์สมุนไพร</label>
                        <input type="text" name="productName" value={form.productName} onChange={handleChange} placeholder="ระบุชื่อผลิตภัณฑ์" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>เลขรับที่</label>
                        <input type="text" name="receiptNo" value={form.receiptNo} onChange={handleChange} placeholder="ระบุเลขรับที่ (ถ้ามี)" style={inputStyle} />
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

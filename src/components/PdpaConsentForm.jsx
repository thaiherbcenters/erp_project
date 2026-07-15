import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import '../pages/PageCommon.css'; // Assume common styles for inputs

/**
 * PdpaConsentForm.jsx
 * ฟอร์ม: หนังสือให้ความยินยอมเก็บรวบรวม ใช้ เปิดเผยข้อมูลส่วนบุคคล
 */

const PdpaConsentForm = forwardRef(({ documentId, customerData, contractId, embedded, sharedFormData, onSharedDataChange }, ref) => {
    const [currentDocId, setCurrentDocId] = useState(documentId || null);

    const [form, setForm] = useState({
        writtenAt: 'บริษัท ไทยเฮิร์บ จำกัด',
        documentDate: new Date().toISOString().split('T')[0],
        personPrefix: 'นาย', // 'นาย', 'นาง', 'นางสาว', 'อื่นๆ'
        personPrefixOther: '',
        personName: '',
        juristicName: '',
        publicHealthProvince: 'นนทบุรี',
        actName: 'ผลิตภัณฑ์สมุนไพร พ.ศ.2562',
        actName2: 'ผลิตภัณฑ์สมุนไพร พ.ศ.2562',
        actName3: 'ผลิตภัณฑ์สมุนไพร พ.ศ.2562',
        keepYears: 10,
        contactGroup: 'ผลิตภัณฑ์สมุนไพร',
    });

    // Auto-fill from customer data if provided
    useEffect(() => {
        if (customerData) {
            setForm(prev => ({
                ...prev,
                personName: customerData.CustomerName || prev.personName,
            }));
        }
    }, [customerData]);

    // Sync from shared state
    useEffect(() => {
        if (sharedFormData) {
            setForm(prev => ({
                ...prev,
                writtenAt: sharedFormData.writtenAt !== undefined ? sharedFormData.writtenAt : prev.writtenAt,
                documentDate: sharedFormData.documentDate !== undefined ? sharedFormData.documentDate : prev.documentDate,
            }));
        }
    }, [sharedFormData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : value;
        
        // Handle radio for isConsent specially since value is string "true"/"false" from input
        if (name === 'isConsent') {
            setForm(prev => ({ ...prev, [name]: value === 'true' }));
            return;
        }

        setForm(prev => ({ ...prev, [name]: finalValue }));
        
        // Propagate shared fields upwards
        if ((name === 'writtenAt' || name === 'documentDate') && onSharedDataChange) {
            onSharedDataChange(name, finalValue);
        }
    };

    useImperativeHandle(ref, () => ({
        getFormData: () => ({
            type: 'pdpa_consent',
            data: {
                ...form,
                documentId: currentDocId,
                contractId: contractId || null
            }
        }),
        setCurrentDocId: (id) => setCurrentDocId(id)
    }));

    const sectionTitleStyle = {
        fontSize: '16px', fontWeight: '700', color: '#1e293b',
        borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '8px'
    };

    const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' };
    const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };

    return (
        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px' }}>
            {!embedded && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>หนังสือให้ความยินยอม (PDPA)</h3>
                </div>
            )}
            
            <div className="card" style={{ padding: '24px', background: '#fff', marginBottom: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h4 style={sectionTitleStyle}><span style={{fontSize: '18px'}}>👤</span> ข้อมูลเจ้าของข้อมูลส่วนบุคคล</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                    <div>
                        <label style={labelStyle}>ข้าพเจ้า</label>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="radio" name="personPrefix" value="นาย" checked={form.personPrefix === 'นาย'} onChange={handleChange} /> นาย
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="radio" name="personPrefix" value="นาง" checked={form.personPrefix === 'นาง'} onChange={handleChange} /> นาง
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="radio" name="personPrefix" value="นางสาว" checked={form.personPrefix === 'นางสาว'} onChange={handleChange} /> นางสาว
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="radio" name="personPrefix" value="อื่นๆ" checked={form.personPrefix === 'อื่นๆ'} onChange={handleChange} /> อื่นๆ
                            </label>
                        </div>
                        {form.personPrefix === 'อื่นๆ' && (
                            <input
                                type="text"
                                name="personPrefixOther"
                                value={form.personPrefixOther}
                                onChange={handleChange}
                                placeholder="ระบุคำนำหน้า..."
                                style={{ ...inputStyle, marginBottom: '12px' }}
                            />
                        )}
                        <input
                            type="text"
                            name="personName"
                            value={form.personName}
                            onChange={handleChange}
                            placeholder="ชื่อ - นามสกุล"
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>โดย (กรณีเป็นนิติบุคคล)</label>
                        <input
                            type="text"
                            name="juristicName"
                            value={form.juristicName}
                            onChange={handleChange}
                            placeholder="ชื่อนิติบุคคล"
                            style={inputStyle}
                        />
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '24px', background: '#fff', marginBottom: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h4 style={sectionTitleStyle}><span style={{fontSize: '18px'}}>📝</span> รายละเอียดความยินยอม</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label style={labelStyle}>ยื่นคำขออนุญาตตามพระราชบัญญัติ</label>
                        <input type="text" name="actName" value={form.actName} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>กอง/กลุ่ม</label>
                        <input type="text" name="contactGroup" value={form.contactGroup} onChange={handleChange} placeholder="เช่น ผลิตภัณฑ์สมุนไพร" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>สำนักงานสาธารณสุขจังหวัด</label>
                        <input type="text" name="publicHealthProvince" value={form.publicHealthProvince} onChange={handleChange} placeholder="เช่น นนทบุรี" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>ผู้อนุญาตตามพระราชบัญญัติ</label>
                        <input type="text" name="actName2" value={form.actName2} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>ระยะเวลาเก็บรวบรวม... อีกไม่เกิน (ปี)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="number" name="keepYears" value={form.keepYears} onChange={handleChange} style={{ ...inputStyle, width: '120px' }} />
                        <span style={{ fontSize: '14px', color: '#475569' }}>ปี นับตั้งแต่ใบอนุญาตสิ้นอายุ</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default PdpaConsentForm;

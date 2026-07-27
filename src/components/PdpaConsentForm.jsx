import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import API_BASE from '../config';
import './PowerOfAttorneyForm.css';
import NameInputWithTitle from './NameInputWithTitle';

/**
 * PdpaConsentForm.jsx
 * ฟอร์ม: หนังสือให้ความยินยอมเก็บรวบรวม ใช้ เปิดเผยข้อมูลส่วนบุคคล
 */

const PdpaConsentForm = forwardRef(({ documentId, customerData, contractId, embedded, sharedFormData, onSharedDataChange }, ref) => {
    const [currentDocId, setCurrentDocId] = useState(documentId || null);

    const [form, setForm] = useState({
        writtenAt: '',
        documentDate: new Date().toISOString().split('T')[0],
        personPrefix: '', // '', '', '', 'อื่นๆ'
        personPrefixOther: '',
        personName: '',
        juristicName: '',
        publicHealthProvince: '',
        actName: '',
        actName2: '',
        actName3: '',
        keepYears: '',
        contactGroup: '',
    });

    // Fetch saved data when editing
    useEffect(() => {
        if (!documentId) return;
        setCurrentDocId(documentId);
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_BASE}/pdpa-consent-documents/${documentId}`);
                const json = await res.json();
                const d = json.data || json;
                if (d && !d.error) {
                    setForm(prev => ({
                        ...prev,
                        writtenAt: d.WrittenAt || prev.writtenAt,
                        documentDate: d.DocumentDate ? new Date(d.DocumentDate).toISOString().split('T')[0] : prev.documentDate,
                        personPrefix: d.PersonPrefix || prev.personPrefix,
                        personPrefixOther: d.PersonPrefixOther || prev.personPrefixOther,
                        personName: d.PersonName || prev.personName,
                        juristicName: d.JuristicName || prev.juristicName,
                        publicHealthProvince: d.PublicHealthProvince || prev.publicHealthProvince,
                        actName: d.ActName || prev.actName,
                        actName2: d.ActName2 || prev.actName2,
                        actName3: d.ActName3 || prev.actName3,
                        keepYears: d.KeepYears !== undefined && d.KeepYears !== null ? d.KeepYears : prev.keepYears,
                        contactGroup: d.ContactGroup || prev.contactGroup,
                    }));
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };
        fetchData();
    }, [documentId]);

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

    return (
        <div className="poa-form-wrapper">
            {!embedded && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>หนังสือให้ความยินยอม (PDPA)</h3>
                </div>
            )}
            
            <div className="poa-info-box" style={{ background: '#f0f9ff', borderColor: '#bae6fd', marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ color: '#0369a1', marginTop: 0 }}>👤 ข้อมูลเจ้าของข้อมูลส่วนบุคคล</div>
                
                <div className="poa-row">
                    <div className="poa-field full">
                        <label>ข้าพเจ้า</label>
                        <NameInputWithTitle 
                            value={(form.personPrefix && form.personPrefix !== 'อื่นๆ' ? form.personPrefix : '') + (form.personName || '')}
                            onChange={(val) => setForm(prev => ({ ...prev, personPrefix: '', personName: val }))}
                            placeholder="ชื่อ - นามสกุล"
                        />
                    </div>
                </div>
                
                <div className="poa-row">
                    <div className="poa-field full">
                        <label>โดย (กรณีเป็นนิติบุคคล)</label>
                        <input
                            type="text"
                            name="juristicName"
                            value={form.juristicName}
                            onChange={handleChange}
                            placeholder="ชื่อนิติบุคคล"
                        />
                    </div>
                </div>
            </div>

            <div className="poa-info-box gray" style={{ marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ marginTop: 0 }}>📝 รายละเอียดความยินยอม</div>
                
                <div className="poa-row">
                    <div className="poa-field">
                        <label>ยื่นคำขออนุญาตตามพระราชบัญญัติ</label>
                        <input type="text" name="actName" value={form.actName} onChange={handleChange} />
                    </div>
                    <div className="poa-field">
                        <label>กอง/กลุ่ม</label>
                        <input type="text" name="contactGroup" value={form.contactGroup} onChange={handleChange} placeholder="เช่น ผลิตภัณฑ์สมุนไพร" />
                    </div>
                </div>
                
                <div className="poa-row">
                    <div className="poa-field">
                        <label>สำนักงานสาธารณสุขจังหวัด</label>
                        <input type="text" name="publicHealthProvince" value={form.publicHealthProvince} onChange={handleChange} placeholder="เช่น นนทบุรี" />
                    </div>
                    <div className="poa-field">
                        <label>ผู้อนุญาตตามพระราชบัญญัติ</label>
                        <input type="text" name="actName2" value={form.actName2} onChange={handleChange} />
                    </div>
                </div>

                <div className="poa-row">
                    <div className="poa-field full">
                        <label>ระยะเวลาเก็บรวบรวม... อีกไม่เกิน (ปี)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input type="number" name="keepYears" value={form.keepYears} onChange={handleChange} style={{ width: '120px' }} />
                            <span>ปี นับตั้งแต่ใบอนุญาตสิ้นอายุ</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default PdpaConsentForm;



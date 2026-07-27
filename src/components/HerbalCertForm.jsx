import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Save, Printer, FileText } from 'lucide-react';
import { useAlert } from './CustomAlert';
import API_BASE from '../config';
import './PowerOfAttorneyForm.css';
import NameInputWithTitle from './NameInputWithTitle';
import CustomDatePicker from './CustomDatePicker';

/**
 * HerbalCertForm.jsx
 * ฟอร์ม: คำรับรองสำหรับผู้ยื่นคำขอขึ้นทะเบียนตำรับผลิตภัณฑ์สมุนไพร
 * ที่อ้างอิงข้อมูลจากทะเบียนตำรับแม่แบบ
 */

const HerbalCertForm = forwardRef(({ documentId, customerData, contractId, embedded, sharedFormData, onSharedDataChange }, ref) => {
    const { showAlert } = useAlert();
    const [isSaving, setIsSaving] = useState(false);
    const [currentDocId, setCurrentDocId] = useState(documentId || null);

    const [form, setForm] = useState({
        writtenAt: '',
        documentDate: new Date().toISOString().split('T')[0],
        applicantPrefix: '',
        applicantName: '',
        productName: '',
        receiptNo: '',
        refProductNameThai: '',
        refRegistrationNo: '',
        certificateHolder: '',
        signDate: new Date().toISOString().split('T')[0],
    });

    // Fetch saved data when editing
    useEffect(() => {
        if (!documentId) return;
        setCurrentDocId(documentId);
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_BASE}/herbal-cert-documents/${documentId}`);
                const json = await res.json();
                if (json.success && json.data) {
                    const d = json.data;
                    setForm(prev => ({
                        ...prev,
                        writtenAt: d.WrittenAt || prev.writtenAt,
                        documentDate: d.DocumentDate ? new Date(d.DocumentDate).toISOString().split('T')[0] : prev.documentDate,
                        applicantPrefix: d.ApplicantPrefix || d.ApplicantType || prev.applicantPrefix,
                        applicantName: d.ApplicantName || prev.applicantName,
                        productName: d.ProductName || prev.productName,
                        receiptNo: d.ReceiptNo || prev.receiptNo,
                        refProductNameThai: d.RefProductNameThai || prev.refProductNameThai,
                        refRegistrationNo: d.RefRegistrationNo || prev.refRegistrationNo,
                        certificateHolder: d.CertificateHolder || prev.certificateHolder,
                        signDate: d.SignDate ? new Date(d.SignDate).toISOString().split('T')[0] : prev.signDate,
                        productNameAlt: d.ProductNameAlt || prev.productNameAlt || '',
                        regNo: d.RegNo || prev.regNo || '',
                        regDetailNo: d.RegDetailNo || prev.regDetailNo || '',
                        regNoticeNo: d.RegNoticeNo || prev.regNoticeNo || '',
                    }));
                }
            } catch (err) {
                console.error('Error fetching herbal cert data:', err);
            }
        };
        fetchData();
    }, [documentId]);

    // Auto-fill from customer data
    useEffect(() => {
        if (customerData) {
            setForm(prev => ({
                ...prev,
                applicantName: customerData.CustomerName || '',
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
        setForm(prev => ({ ...prev, [name]: finalValue }));
        
        // Propagate shared fields upwards
        if ((name === 'writtenAt' || name === 'documentDate') && onSharedDataChange) {
            onSharedDataChange(name, finalValue);
        }
    };

    const handleSave = async () => {
        if (!form.applicantName) return showAlert('ข้อผิดพลาด', 'กรุณากรอกชื่อผู้ยื่นคำขอ', 'error');
        setIsSaving(true);
        try {
            // TODO: Implement save API
            showAlert('สำเร็จ', 'บันทึกคำรับรองเรียบร้อยแล้ว', 'success');
        } catch (err) {
            showAlert('ข้อผิดพลาด', 'ไม่สามารถบันทึกได้', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    useImperativeHandle(ref, () => ({
        setCurrentDocId,
        getFormData: () => {
            const payload = { ...form };
            if (currentDocId) {
                payload.documentId = currentDocId;
            }
            return {
                type: 'herbal_cert',
                data: payload
            };
        }
    }));

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="poa-form-wrapper">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>แบบฟอร์มคำรับรอง (อ้างอิงแม่แบบ)</h3>
                {!embedded && (
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handlePrint} disabled={isSaving} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Printer size={16} /> พิมพ์
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Save size={16} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
                )}
            </div>

            <div className="poa-info-box gray" style={{ marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ marginTop: 0 }}><FileText size={18} color="#2563eb" /> ข้อมูลทั่วไป</div>
                
                <div className="poa-row">
                    <div className="poa-field">
                        <label>เขียนที่</label>
                        <input name="writtenAt" value={form.writtenAt} onChange={handleChange} placeholder="เช่น บริษัท ..." />
                    </div>
                    <div className="poa-field">
                        <label>วันที่</label>
                        <CustomDatePicker name="documentDate" value={form.documentDate} onChange={handleChange} />
                    </div>
                </div>

                <div className="poa-row">
                    <div className="poa-field full">
                        <label>ข้าพเจ้า</label>
                        <NameInputWithTitle 
                            value={(form.applicantPrefix || '') + (form.applicantName || '')}
                            onChange={(val) => setForm(prev => ({ ...prev, applicantPrefix: '', applicantName: val }))}
                            placeholder="ชื่อ-นามสกุล หรือ ชื่อนิติบุคคล"
                        />
                    </div>
                </div>
            </div>

            <div className="poa-info-box" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ color: '#15803d', marginTop: 0 }}><FileText size={18} color="#15803d" /> ข้อมูลผลิตภัณฑ์สมุนไพร</div>
                
                <div className="poa-row">
                    <div className="poa-field">
                        <label>ชื่อผลิตภัณฑ์สมุนไพร (ที่ยื่นคำขอ)</label>
                        <input name="productName" value={form.productName} onChange={handleChange} />
                    </div>
                    <div className="poa-field">
                        <label>เลขรับที่</label>
                        <input name="receiptNo" value={form.receiptNo} onChange={handleChange} />
                    </div>
                </div>

                <div className="poa-info-box" style={{ background: '#fff', borderColor: '#e2e8f0', marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>อ้างอิงข้อมูลจากทะเบียนตำรับแม่แบบ โดยมีรายละเอียดดังนี้</p>
                    <div className="poa-row">
                        <div className="poa-field">
                            <label>ชื่อผลิตภัณฑ์สมุนไพร (ภาษาไทย) แม่แบบ</label>
                            <input name="refProductNameThai" value={form.refProductNameThai} onChange={handleChange} />
                        </div>
                        <div className="poa-field">
                            <label>เลขทะเบียนที่ (แม่แบบ)</label>
                            <input name="refRegistrationNo" value={form.refRegistrationNo} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="poa-row">
                        <div className="poa-field full">
                            <label>ผู้รับใบสำคัญการขึ้นทะเบียนตำรับผลิตภัณฑ์สมุนไพร คือ</label>
                            <input name="certificateHolder" value={form.certificateHolder} onChange={handleChange} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="poa-info-box" style={{ background: '#f0f9ff', borderColor: '#bae6fd', marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ color: '#0369a1', marginTop: 0 }}><FileText size={18} color="#0369a1" /> ผู้ให้คำรับรอง</div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>วันที่ลงนาม</label>
                        <CustomDatePicker name="signDate" value={form.signDate} onChange={handleChange} />
                    </div>
                </div>
            </div>
        </div>
    );
});

export default HerbalCertForm;



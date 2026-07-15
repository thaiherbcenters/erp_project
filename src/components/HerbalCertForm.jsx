import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Save, Printer, FileText } from 'lucide-react';
import { useAlert } from './CustomAlert';
import API_BASE from '../config';
import '../pages/PageCommon.css'; // Assume common styles for inputs

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
        writtenAt: 'บริษัท ไทยเฮิร์บ จำกัด',
        documentDate: new Date().toISOString().split('T')[0],
        applicantPrefix: 'นิติบุคคล',
        applicantName: 'บริษัท ทดสอบสมุนไพร จำกัด',
        productName: 'ยาดมสมุนไพรตราทดสอบ',
        receiptNo: '12345/2567',
        refProductNameThai: 'ยาหม่องสมุนไพร',
        refRegistrationNo: 'G 123/67',
        certificateHolder: 'นายธวัช จรุงพิรวงศ์',
        signDate: new Date().toISOString().split('T')[0],
    });

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

    const sectionTitleStyle = {
        fontSize: '16px', fontWeight: '700', color: '#1e293b',
        borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '8px'
    };

    const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' };
    const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
    const checkboxRowStyle = { display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' };
    const checkboxDescStyle = { margin: 0, fontSize: '14px', color: '#334155', lineHeight: '1.6' };

    return (
        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px' }}>
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

            <div className="card" style={{ padding: '24px', background: '#fff', marginBottom: '20px' }}>
                <h4 style={sectionTitleStyle}><FileText size={18} color="#2563eb" /> ข้อมูลทั่วไป</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label style={labelStyle}>เขียนที่</label>
                        <input name="writtenAt" value={form.writtenAt} onChange={handleChange} style={inputStyle} placeholder="เช่น บริษัท ..." />
                    </div>
                    <div>
                        <label style={labelStyle}>วันที่</label>
                        <input name="documentDate" type="date" value={form.documentDate} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                    <div>
                        <label style={labelStyle}>ข้าพเจ้า</label>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="radio" name="applicantPrefix" value="นาย" checked={form.applicantPrefix === 'นาย'} onChange={handleChange} /> นาย
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="radio" name="applicantPrefix" value="นาง" checked={form.applicantPrefix === 'นาง'} onChange={handleChange} /> นาง
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="radio" name="applicantPrefix" value="นางสาว" checked={form.applicantPrefix === 'นางสาว'} onChange={handleChange} /> นางสาว
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="radio" name="applicantPrefix" value="นิติบุคคล" checked={form.applicantPrefix === 'นิติบุคคล'} onChange={handleChange} /> ชื่อนิติบุคคล
                            </label>
                        </div>
                        <input name="applicantName" value={form.applicantName} onChange={handleChange} style={inputStyle} placeholder="ชื่อ-นามสกุล หรือ ชื่อนิติบุคคล" />
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '24px', background: '#fff', marginBottom: '20px' }}>
                <h4 style={sectionTitleStyle}><FileText size={18} color="#2563eb" /> ข้อมูลผลิตภัณฑ์สมุนไพร</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label style={labelStyle}>ชื่อผลิตภัณฑ์สมุนไพร (ที่ยื่นคำขอ)</label>
                        <input name="productName" value={form.productName} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>เลขรับที่</label>
                        <input name="receiptNo" value={form.receiptNo} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>

                <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>อ้างอิงข้อมูลจากทะเบียนตำรับแม่แบบ โดยมีรายละเอียดดังนี้</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>ชื่อผลิตภัณฑ์สมุนไพร (ภาษาไทย) แม่แบบ</label>
                            <input name="refProductNameThai" value={form.refProductNameThai} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>เลขทะเบียนที่ (แม่แบบ)</label>
                            <input name="refRegistrationNo" value={form.refRegistrationNo} onChange={handleChange} style={inputStyle} />
                        </div>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                        <label style={labelStyle}>ผู้รับใบสำคัญการขึ้นทะเบียนตำรับผลิตภัณฑ์สมุนไพร คือ</label>
                        <input name="certificateHolder" value={form.certificateHolder} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '24px', background: '#fff' }}>
                <h4 style={sectionTitleStyle}><FileText size={18} color="#2563eb" /> ผู้ให้คำรับรอง</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                    <div>
                        <label style={labelStyle}>วันที่ลงนาม</label>
                        <input name="signDate" type="date" value={form.signDate} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>
            </div>
        </div>
    );
});

export default HerbalCertForm;

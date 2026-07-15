import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Save, Printer, ArrowLeft, FileSignature } from 'lucide-react';
import { useAlert } from './CustomAlert';
import API_BASE from '../config';
import './PowerOfAttorneyForm.css';

/**
 * =============================================================================
 * PowerOfAttorneyForm.jsx
 * =============================================================================
 * ฟอร์มหนังสือมอบอำนาจ สำหรับผลิตภัณฑ์สมุนไพร
 * (ตามแบบ ทบ.๑/จร.๑/ขจ.๑ / ทบ.๑ จร.๑ ขจ.๑ /บท./ลล.)
 *
 * ข้อมูลครบตามแบบฟอร์มราชการ:
 *   ส่วนที่ 1 - ผู้รับอนุญาต (ผู้มอบอำนาจ)
 *   ส่วนที่ 2 - ผู้รับมอบอำนาจ
 *   ขอบเขตอำนาจ (ข้อ 1-3)
 *   ลายเซ็น / พยาน / เอกสารแนบ
 * =============================================================================
 */

/* ── Helper: ID card input boxes ── */
const IdCardInput = ({ value = '', onChange, pattern = '1-4-5-2-1' }) => {
    const groups = pattern.split('-').map(Number);
    const totalDigits = groups.reduce((a, b) => a + b, 0);
    const digits = (value || '').padEnd(totalDigits, '').split('');
    const inputRefs = useRef([]);

    const handleDigitChange = (globalIdx, val) => {
        const newDigits = [...digits];
        newDigits[globalIdx] = val.slice(-1);
        const newValue = newDigits.join('').replace(/\s/g, '');
        onChange(newValue);

        // Auto-focus next input
        if (val && globalIdx < totalDigits - 1) {
            inputRefs.current[globalIdx + 1]?.focus();
        }
    };

    const handleKeyDown = (globalIdx, e) => {
        if (e.key === 'Backspace' && !digits[globalIdx]?.trim() && globalIdx > 0) {
            inputRefs.current[globalIdx - 1]?.focus();
        }
    };

    let globalIdx = 0;
    return (
        <div className="poa-id-boxes">
            {groups.map((count, gIdx) => (
                <React.Fragment key={gIdx}>
                    {gIdx > 0 && <span className="poa-id-separator">-</span>}
                    {Array.from({ length: count }).map((_, dIdx) => {
                        const idx = globalIdx++;
                        return (
                            <input
                                key={idx}
                                ref={el => inputRefs.current[idx] = el}
                                type="text"
                                maxLength={1}
                                value={digits[idx]?.trim() || ''}
                                onChange={e => handleDigitChange(idx, e.target.value)}
                                onKeyDown={e => handleKeyDown(idx, e)}
                                inputMode="numeric"
                            />
                        );
                    })}
                </React.Fragment>
            ))}
        </div>
    );
};

const PowerOfAttorneyForm = forwardRef(({ documentId, onBack, customerData, contractId: externalContractId, embedded, sharedFormData, onSharedDataChange }, ref) => {
    const { showAlert, showConfirm, showLoading, hideLoading } = useAlert();
    const [isSaving, setIsSaving] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [contracts, setContracts] = useState([]);
    const [currentDocId, setCurrentDocId] = useState(documentId || null);

    const [form, setForm] = useState({
        // ── ข้อมูลทั่วไป ──
        contractId: '',
        writtenAt: 'บริษัท ไทยเฮิร์บ จำกัด',
        documentDate: new Date().toISOString().split('T')[0],

        // ── ส่วนที่ 1: ผู้รับอนุญาต (ผู้มอบอำนาจ) ──
        licenseeName: 'บริษัท ทดสอบสมุนไพร จำกัด',
        licenseNo: '10-1-6500012345',
        // ประเภทผู้รับอนุญาต
        isProducer: false,
        isImporter: false,
        // ประเภทผลิตภัณฑ์สมุนไพร
        prodTypeHerbalMedicine: true,
        prodTypeTraditionalMed: false,
        prodTypeDevMed: false,
        prodTypeHealthProduct: false,
        prodTypeCosmetic: false,
        prodTypeDetail: 'ยาดมสมุนไพร',
        // ประเภทบุคคล
        personType: 'juristic', // 'natural' | 'juristic'
        citizenId: '',
        citizenIdExpiry: '',
        juristicId: '0105555555555',
        juristicIdExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        // ผู้ดำเนินกิจการ
        operatorPrefix: 'นาย',
        operatorName: 'สมชาย รักษาดี',
        operatorCitizenId: '1100000000000',
        operatorIdExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0],

        // ── สถานที่ประกอบการ ──
        establishmentName: 'โรงงานไทยเฮิร์บ',
        estAddressNo: '123',
        estSoi: 'สุขุมวิท 1',
        estMoo: '1',
        estRoad: 'สุขุมวิท',
        estSubDistrict: 'คลองเตย',
        estDistrict: 'คลองเตย',
        estProvince: 'กรุงเทพมหานคร',
        estPostcode: '10110',
        estPhone: '02-123-4567',
        estFax: '02-123-4568',
        estEmail: 'test@thaiherb.com',

        // ── ประเภทคำขอ ──
        reqType: '',  // 'register' | 'notifyDetail' | 'notify' | 'renew'

        // ── ผู้ยื่น ──
        submitterIsIn: true,
        submitFormType: '',  // 'amend' | 'replace' | 'other'
        submitFormOther: '',
        productName: '',
        productReceiveNo: '',
        submitterIsOr: false,
        productNameAlt: '',
        hasRegNo: false,
        hasRegDetail: false,
        hasNoticeNo: false,
        regNoticeNo: '',

        // ── ส่วนที่ 2: ผู้รับมอบอำนาจ ──
        granteePrefix: 'นาย',
        granteeName: 'ธวัช จรุงพิรวงศ์',
        granteeAge: '45',
        granteeCitizenId: '3259900200422',
        granteeIdExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0],
        granteeAddressNo: '6/10',
        granteeMoo: '2',
        granteeSoi: '',
        granteeRoad: '',
        granteeSubDistrict: 'ไทรม้า',
        granteeDistrict: 'เมืองนนทบุรี',
        granteeProvince: 'นนทบุรี',
        granteePhone: '081-999-9999',
        granteeEmail: 'grantee@thaiherb.com',

        // ── ขอบเขตอำนาจ ──
        scopeSubmit: true,
        scopeAmend: true,
        scopeAll: true,
        scopeOther: '',
        scopeStartDate: '',

        // ── เอกสารแนบ ──
        attachLicenseCopy: true,

        // ── ลายเซ็น ──
        grantorSignName: '',
        granteeSignName: '',
        witness1Name: '',
        witness2Name: '',
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : value;
        setForm(prev => ({ ...prev, [name]: finalValue }));
        
        // Propagate shared fields upwards
        if ((name === 'writtenAt' || name === 'documentDate') && onSharedDataChange) {
            onSharedDataChange(name, finalValue);
        }
    };

    useEffect(() => {
        const fetchContracts = async () => {
            try {
                const response = await fetch(`${API_BASE}/contracts`);
                const result = await response.json();
                if (result.success) {
                    setContracts(result.data);
                }
            } catch (err) {
                console.error('Error fetching contracts:', err);
            }
        };
        fetchContracts();
    }, []);

    // Auto-fill customer data when provided from parent
    useEffect(() => {
        if (customerData && !currentDocId) {
            setForm(prev => ({
                ...prev,
                licenseeName: customerData.CustomerName || '',
                citizenId: customerData.TaxID || '',
                estPhone: customerData.Phone || '',
                estEmail: customerData.Email || '',
            }));
        }
    }, [customerData, currentDocId]);

    // Auto-fill contractId from parent
    useEffect(() => {
        if (externalContractId && !currentDocId) {
            setForm(prev => ({ ...prev, contractId: externalContractId }));
        }
    }, [externalContractId, currentDocId]);

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

    // Fetch existing document data if documentId is provided
    useEffect(() => {
        if (currentDocId) {
            const fetchDocument = async () => {
                try {
                    const response = await fetch(`${API_BASE}/legal-documents/${currentDocId}`);
                    const result = await response.json();
                    if (result.success && result.data) {
                        const d = result.data;
                        // Format dates for input type="date"
                        const formatDt = (dateString) => {
                            if (!dateString) return '';
                            return dateString.split('T')[0];
                        };
                        
                        const newWrittenAt = d.WrittenAt || '';
                        const newDocDate = formatDt(d.DocumentDate);
                        
                        setForm(prev => ({
                            ...prev,
                            documentNo: d.DocumentNo || '',
                            writtenAt: newWrittenAt,
                            documentDate: newDocDate,
                            contractId: d.ContractID || '',
                            
                            licenseeName: d.GrantorName || '',
                            licenseNo: d.LicenseNo || '',
                            isProducer: d.IsProducer || false,
                            isImporter: d.IsImporter || false,
                            prodTypeHerbalMedicine: d.ProdTypeHerbalMedicine || false,
                            prodTypeTraditionalMed: d.ProdTypeTraditionalMed || false,
                            prodTypeDevMed: d.ProdTypeDevMed || false,
                            prodTypeHealthProduct: d.ProdTypeHealthProduct || false,
                            prodTypeCosmetic: d.ProdTypeCosmetic || false,
                            prodTypeDetail: d.ProdTypeDetail || '',
                            
                            personType: d.GrantorType || 'natural',
                            citizenId: d.GrantorCitizenID || '',
                            citizenIdExpiry: formatDt(d.GrantorCitizenIDExpiryDate),
                            juristicId: d.GrantorJuristicID || '',
                            juristicIdExpiry: formatDt(d.JuristicIDExpiryDate),
                            
                            operatorPrefix: d.OperatorPrefix || '',
                            operatorName: d.OperatorName || '',
                            operatorCitizenId: d.OperatorCitizenID || '',
                            operatorIdExpiry: formatDt(d.OperatorIDExpiryDate),
                            
                            establishmentName: d.EstablishmentName || '',
                            estAddressNo: d.EstAddressNo || '',
                            estSoi: d.EstSoi || '',
                            estMoo: d.EstMoo || '',
                            estRoad: d.EstRoad || '',
                            estSubDistrict: d.EstSubDistrict || '',
                            estDistrict: d.EstDistrict || '',
                            estProvince: d.EstProvince || '',
                            estPostcode: d.EstPostcode || '',
                            estPhone: d.EstPhone || '',
                            estFax: d.EstFax || '',
                            estEmail: d.EstEmail || '',
                            
                            reqType: d.RequestType || '',
                            submitterIsIn: d.SubmitterIsIn !== false, // default true
                            submitFormType: d.SubmitFormType || '',
                            submitFormOther: d.SubmitFormOther || '',
                            productName: d.ProductName || '',
                            productReceiveNo: d.ProductReceiveNo || '',
                            submitterIsOr: d.SubmitterIsOr || false,
                            productNameAlt: d.ProductNameAlt || '',
                            hasRegNo: d.HasRegNo || false,
                            hasRegDetail: d.HasRegDetail || false,
                            hasNoticeNo: d.HasNoticeNo || false,
                            regNoticeNo: d.RegNoticeNo || '',
                            
                            granteePrefix: d.GranteePrefix || '',
                            granteeName: d.GranteeName || '',
                            granteeAge: d.GranteeAge || '',
                            granteeCitizenId: d.GranteeCitizenID || '',
                            granteeIdExpiry: formatDt(d.GranteeIDExpiryDate),
                            granteeAddressNo: d.GranteeAddressNo || '',
                            granteeMoo: d.GranteeMoo || '',
                            granteeSoi: d.GranteeSoi || '',
                            granteeRoad: d.GranteeRoad || '',
                            granteeSubDistrict: d.GranteeSubDistrict || '',
                            granteeDistrict: d.GranteeDistrict || '',
                            granteeProvince: d.GranteeProvince || '',
                            granteePhone: d.GranteePhone || '',
                            granteeEmail: d.GranteeEmail || '',
                            
                            scopeSubmit: d.ScopeSubmit || false,
                            scopeAmend: d.ScopeAmend || false,
                            scopeAll: d.ScopeAll || false,
                            scopeOther: d.ScopeOther || '',
                            scopeStartDate: formatDt(d.ScopeStartDate),
                            
                            attachLicenseCopy: d.AttachLicenseCopy !== false,
                            grantorSignName: d.GrantorSignName || '',
                            granteeSignName: d.GranteeSignName || '',
                            witness1Name: d.Witness1Name || '',
                            witness2Name: d.Witness2Name || ''
                        }));
                        
                        if (onSharedDataChange) {
                            onSharedDataChange('writtenAt', newWrittenAt);
                            onSharedDataChange('documentDate', newDocDate);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching document:', error);
                }
            };
            fetchDocument();
        }
    }, [currentDocId]);

    const handleIdChange = (fieldName) => (value) => {
        setForm(prev => ({ ...prev, [fieldName]: value }));
    };

    const getCleanPayload = () => {
        let payload = {
            ...form,
            documentType: 'poa',
            status: 'ร่าง'
        };

        // ล้างข้อมูลผู้รับอนุญาตที่ไม่ได้เลือก
        if (payload.personType === 'natural') {
            payload.juristicId = '';
            payload.juristicIdExpiry = '';
            payload.operatorPrefix = '';
            payload.operatorName = '';
            payload.operatorCitizenId = '';
            payload.operatorIdExpiry = '';
        } else if (payload.personType === 'juristic') {
            payload.citizenId = '';
            payload.citizenIdExpiry = '';
        }

        return payload;
    };

    useImperativeHandle(ref, () => ({
        getFormData: () => {
            const payload = getCleanPayload();
            if (currentDocId) {
                payload.documentId = currentDocId;
            }
            return {
                type: 'poa',
                data: payload
            };
        }
    }));

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = getCleanPayload();
            
            const method = currentDocId ? 'PUT' : 'POST';
            const url = currentDocId 
                ? `${API_BASE}/legal-documents/${currentDocId}` 
                : `${API_BASE}/legal-documents`;

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            if (result.success) {
                showAlert('สำเร็จ', 'บันทึกข้อมูลหนังสือมอบอำนาจเรียบร้อยแล้ว', 'success');
                if (result.documentId && result.documentId !== currentDocId) {
                    setCurrentDocId(result.documentId);
                }
            } else {
                showAlert('เกิดข้อผิดพลาด', result.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            }
        } catch (error) {
            console.error('Error saving document:', error);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับระบบได้', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            // 0. ตรวจสอบแม่แบบก่อนพิมพ์
            try {
                const checkRes = await fetch(`${API_BASE}/print/check-template/poa`);
                const checkData = await checkRes.json();
                if (!checkData.exists) {
                    showAlert('เกิดข้อผิดพลาด', 'ไม่พบแม่แบบ (Template) สำหรับหนังสือมอบอำนาจในระบบ', 'error');
                    return;
                }
            } catch (e) {
                console.error('Template check failed', e);
            }

            // 1. บันทึกข้อมูลลง Database ก่อน
            const payload = getCleanPayload();
            // ถ้าพิมพ์จากฟอร์มเดี่ยว ๆ จะไม่กำหนด Status ให้เป็นพรีวิว เพื่อไม่ให้บันทึกทับสถานะร่าง (Backend จัดการ Status ให้)
            
            const method = currentDocId ? 'PUT' : 'POST';
            const url = currentDocId 
                ? `${API_BASE}/legal-documents/${currentDocId}` 
                : `${API_BASE}/legal-documents`;

            const saveResponse = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const saveResult = await saveResponse.json();
            if (!saveResult.success) {
                showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลก่อนพิมพ์ได้', 'error');
                return;
            }

            // 2. ข้อมูลลง DB แล้ว ค่อยเรียก Print API ไปดึงข้อมูลล่าสุดมาพิมพ์
            const printPayload = { documentType: 'poa' };
            let docIdToPrint = currentDocId;
            if (saveResult.documentId && saveResult.documentId !== currentDocId) {
                setCurrentDocId(saveResult.documentId);
                docIdToPrint = saveResult.documentId;
            }
            if (docIdToPrint) {
                printPayload.documentId = docIdToPrint;
            }

            showLoading('กำลังเปิดเอกสาร...', 'กรุณารอสักครู่ ระบบกำลังสร้าง PDF');
            const printResponse = await fetch(`${API_BASE}/print`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(printPayload)
            });

            hideLoading();
            if (printResponse.ok) {
                const blob = await printResponse.blob();
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else {
                const errText = await printResponse.text();
                console.error('Print API Error:', errText);
                showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างเอกสาร PDF ได้', 'error');
            }
        } catch (error) {
            hideLoading();
            console.error('Error printing document:', error);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับระบบได้', 'error');
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className={!embedded ? "print-page-break card" : "poa-form-wrapper"} style={!embedded ? { padding: 0, overflow: 'hidden', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' } : {}}>
            {/* ════════════════════════════════════════════════════════════════ */}
            {/* Header                                                         */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {!embedded && (
                <div style={{ padding: '16px 24px', background: '#1e40af', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {onBack && (
                        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#fff', marginRight: '8px' }}>
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <FileSignature size={20} />
                    <span style={{ fontSize: '16px', fontWeight: '700' }}>📜 หนังสือมอบอำนาจ</span>
                </div>
            )}

            <div className={!embedded ? "poa-form-wrapper" : ""} style={!embedded ? { boxShadow: 'none' } : {}}>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', lineHeight: 1.6 }}>
                    สำหรับการมอบอำนาจ (ฉบับจะ = คำขอ) ของผู้รับอนุญาตผลิต/นำเข้าผลิตภัณฑ์สมุนไพร
                    (ตามแบบ ทบ.๑/จร.๑/ขจ.๑ / ทบ.๑ จร.๑ ขจ.๑ /บท./ลล.)
                </p>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* ข้อมูลทั่วไป: เขียนที่ / วันที่                                      */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="poa-info-box gray">
                <div className="poa-section-subtitle" style={{ marginTop: 0 }}>ข้อมูลเอกสาร</div>
                <div className="poa-row" style={{ marginBottom: '12px' }}>
                    <div className="poa-field medium">
                        <label>อ้างอิงสัญญา <span style={{fontSize: '11px', color: '#64748b', fontWeight: 'normal'}}>(เลือกจากระบบ)</span></label>
                        <select name="contractId" value={form.contractId} onChange={handleChange} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '100%' }}>
                            <option value="">-- ไม่ระบุสัญญา / ไม่ได้เชื่อมโยง --</option>
                            {contracts.map(c => (
                                <option key={c.ContractID} value={c.ContractID}>
                                    {c.ContractNo} : {c.ContractName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>เขียนที่</label>
                        <input type="text" name="writtenAt" value={form.writtenAt} onChange={handleChange} placeholder="เช่น บริษัท ..." />
                    </div>
                    <div className="poa-field medium">
                        <label>วันที่เอกสาร</label>
                        <input type="date" name="documentDate" value={form.documentDate} onChange={handleChange} />
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* ส่วนที่ 1: ผู้รับอนุญาต (ผู้มอบอำนาจ)                                */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="poa-section-title">1. โดยหนังสือฉบับนี้ ผู้รับอนุญาตชื่อ</div>

            <div className="poa-row">
                <div className="poa-field">
                    <label>ชื่อผู้รับอนุญาต <span className="required">*</span></label>
                    <input type="text" name="licenseeName" value={form.licenseeName} onChange={handleChange} />
                </div>
                <div className="poa-field medium">
                    <label>ใบอนุญาตเลขที่</label>
                    <input type="text" name="licenseNo" value={form.licenseNo} onChange={handleChange} />
                </div>
            </div>

            {/* ── ประเภทผู้รับอนุญาต ── */}
            <div className="poa-section-subtitle">เป็นผู้รับอนุญาต</div>
            <div className="poa-checkbox-group">
                <label className="poa-radio-item">
                    <input type="checkbox" name="isProducer" checked={form.isProducer} onChange={handleChange} />
                    ผลิต
                </label>
                <label className="poa-radio-item">
                    <input type="checkbox" name="isImporter" checked={form.isImporter} onChange={handleChange} />
                    นำเข้า
                </label>
                <span style={{ fontSize: '13px', color: '#475569', paddingTop: '2px' }}>ผลิตภัณฑ์สมุนไพร</span>
            </div>

            {/* ── ประเภทผลิตภัณฑ์สมุนไพร ── */}
            <div className="poa-info-box" style={{ marginTop: '8px' }}>
                <div className="poa-section-subtitle" style={{ marginTop: 0 }}>ประเภทผลิตภัณฑ์สมุนไพร</div>
                <div className="poa-checkbox-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                        <label className="poa-checkbox-item">
                            <input type="checkbox" name="prodTypeHerbalMedicine" checked={form.prodTypeHerbalMedicine} onChange={handleChange} />
                            <span style={{ fontWeight: 600 }}>ยาจากสมุนไพร : ประเภท</span>
                        </label>
                        
                        {form.prodTypeHerbalMedicine && (
                            <div style={{ marginLeft: '28px', display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '6px' }}>
                                <label className="poa-checkbox-item">
                                    <input type="checkbox" name="prodTypeTraditionalMed" checked={form.prodTypeTraditionalMed} onChange={handleChange} />
                                    ยาแผนไทย/ยาตามองค์ความรู้การแพทย์ทางเลือก
                                </label>
                                <label className="poa-checkbox-item">
                                    <input type="checkbox" name="prodTypeDevMed" checked={form.prodTypeDevMed} onChange={handleChange} />
                                    ยาพัฒนาจากสมุนไพร
                                </label>
                            </div>
                        )}
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                        <label className="poa-checkbox-item">
                            <input type="checkbox" name="prodTypeHealthProduct" checked={form.prodTypeHealthProduct} onChange={handleChange} />
                            ผลิตภัณฑ์สมุนไพรเพื่อสุขภาพ
                        </label>
                        <label className="poa-checkbox-item">
                            <input type="checkbox" name="prodTypeCosmetic" checked={form.prodTypeCosmetic} onChange={handleChange} />
                            เวชสำอางสมุนไพร
                        </label>
                    </div>
                </div>
                <div className="poa-row" style={{ marginTop: '8px' }}>
                    <div className="poa-field">
                        <label>ประเภท (ระบุเพิ่มเติม)</label>
                        <input type="text" name="prodTypeDetail" value={form.prodTypeDetail} onChange={handleChange} placeholder="เช่น อาหารสมุนไพร, ประเภท ..." />
                    </div>
                </div>
            </div>

            {/* ── ประเภทบุคคล / นิติบุคคล ── */}
            <div className="poa-info-box blue" style={{ marginTop: '12px' }}>
                <div className="poa-section-subtitle" style={{ marginTop: 0 }}>
                    ผู้รับอนุญาต ตามข้อ 1 เป็นบุคคลธรรมดา หรือเป็นนิติบุคคล
                    <span style={{ fontSize: '11px', color: '#64748b' }}> (กรอกเพียงด้านเดียว ที่ตรงตามคุณสมบัติของผู้รับอนุญาต)</span>
                </div>

                <div className="poa-checkbox-group" style={{ marginBottom: '12px' }}>
                    <label className="poa-radio-item">
                        <input type="radio" name="personType" value="natural" checked={form.personType === 'natural'} onChange={handleChange} />
                        บุคคลธรรมดา
                    </label>
                    <label className="poa-radio-item">
                        <input type="radio" name="personType" value="juristic" checked={form.personType === 'juristic'} onChange={handleChange} />
                        นิติบุคคล
                    </label>
                </div>

                {form.personType === 'natural' && (
                    <div style={{ padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div className="poa-section-subtitle" style={{ marginTop: 0 }}>เป็น บุคคลธรรมดา — บัตรประชาชนเลขที่</div>
                        <IdCardInput value={form.citizenId} onChange={handleIdChange('citizenId')} pattern="1-4-5-2-1" />
                        <div className="poa-row" style={{ marginTop: '12px' }}>
                            <div className="poa-field medium">
                                <label>(วันที่บัตรหมดอายุ)</label>
                                <input type="date" name="citizenIdExpiry" value={form.citizenIdExpiry} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                )}

                {form.personType === 'juristic' && (
                    <div style={{ padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div className="poa-section-subtitle" style={{ marginTop: 0 }}>เป็น นิติบุคคล — ทะเบียนนิติบุคคล เลขที่</div>
                        <IdCardInput value={form.juristicId} onChange={handleIdChange('juristicId')} pattern="1-4-5-2-1" />
                    </div>
                )}
            </div>

            {/* ── ผู้ดำเนินกิจการ ── */}
            <div className="poa-info-box gray" style={{ marginTop: '12px' }}>
                <div className="poa-section-subtitle" style={{ marginTop: 0 }}>มีผู้ดำเนินกิจการ ตามที่ระบุที่ใบอนุญาต</div>
                <div className="poa-row">
                    <div className="poa-field" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>ชื่อ</span>
                            <label className="poa-radio-item" style={{ fontSize: '13px', margin: 0 }}>
                                <input type="radio" name="operatorPrefix" value="นาย" checked={form.operatorPrefix === 'นาย'} onChange={handleChange} /> นาย
                            </label>
                            <label className="poa-radio-item" style={{ fontSize: '13px', margin: 0 }}>
                                <input type="radio" name="operatorPrefix" value="นาง" checked={form.operatorPrefix === 'นาง'} onChange={handleChange} /> นาง
                            </label>
                            <label className="poa-radio-item" style={{ fontSize: '13px', margin: 0 }}>
                                <input type="radio" name="operatorPrefix" value="นางสาว" checked={form.operatorPrefix === 'นางสาว'} onChange={handleChange} /> นางสาว
                            </label>
                        </div>
                        <input type="text" name="operatorName" value={form.operatorName} onChange={handleChange} placeholder="ชื่อ-นามสกุล" />
                    </div>
                </div>
                <div className="poa-section-subtitle">บัตรประจำตัวประชาชนเลขที่</div>
                <IdCardInput value={form.operatorCitizenId} onChange={handleIdChange('operatorCitizenId')} pattern="1-4-5-2-1" />
                <div className="poa-row" style={{ marginTop: '10px' }}>
                    <div className="poa-field medium">
                        <label>วันที่บัตรหมดอายุ</label>
                        <input type="date" name="operatorIdExpiry" value={form.operatorIdExpiry} onChange={handleChange} />
                    </div>
                </div>
            </div>

            {/* ── สถานที่ประกอบการ ── */}
            <div className="poa-section-subtitle" style={{ marginTop: '16px', fontWeight: 700, color: '#1e3a5f' }}>มีสถานที่ประกอบการที่ระบุในใบอนุญาตชื่อ</div>
            <div className="poa-row">
                <div className="poa-field full">
                    <label>ชื่อสถานที่ประกอบการ</label>
                    <input type="text" name="establishmentName" value={form.establishmentName} onChange={handleChange} />
                </div>
            </div>
            <div className="poa-row">
                <div className="poa-field small">
                    <label>ที่อยู่เลขที่</label>
                    <input type="text" name="estAddressNo" value={form.estAddressNo} onChange={handleChange} />
                </div>
                <div className="poa-field small">
                    <label>ซอย/ตรอก</label>
                    <input type="text" name="estSoi" value={form.estSoi} onChange={handleChange} />
                </div>
                <div className="poa-field small">
                    <label>หมู่ที่</label>
                    <input type="text" name="estMoo" value={form.estMoo} onChange={handleChange} />
                </div>
                <div className="poa-field">
                    <label>ถนน</label>
                    <input type="text" name="estRoad" value={form.estRoad} onChange={handleChange} />
                </div>
                <div className="poa-field">
                    <label>ตำบล/แขวง</label>
                    <input type="text" name="estSubDistrict" value={form.estSubDistrict} onChange={handleChange} />
                </div>
            </div>
            <div className="poa-row">
                <div className="poa-field">
                    <label>เขต/อำเภอ</label>
                    <input type="text" name="estDistrict" value={form.estDistrict} onChange={handleChange} />
                </div>
                <div className="poa-field">
                    <label>จังหวัด</label>
                    <input type="text" name="estProvince" value={form.estProvince} onChange={handleChange} />
                </div>
                <div className="poa-field small">
                    <label>รหัสไปรษณีย์</label>
                    <input type="text" name="estPostcode" value={form.estPostcode} onChange={handleChange} />
                </div>
            </div>
            <div className="poa-row">
                <div className="poa-field">
                    <label>โทรศัพท์</label>
                    <input type="tel" name="estPhone" value={form.estPhone} onChange={handleChange} />
                </div>
                <div className="poa-field">
                    <label>โทรสาร</label>
                    <input type="text" name="estFax" value={form.estFax} onChange={handleChange} />
                </div>
                <div className="poa-field">
                    <label>E-mail</label>
                    <input type="email" name="estEmail" value={form.estEmail} onChange={handleChange} />
                </div>
            </div>

            {/* ── ประเภทคำขอ + ผู้ยื่น + ข้อมูลผลิตภัณฑ์ (รวมในกล่องเดียว ตามแบบฟอร์มต้นฉบับ) ── */}
            <div className="poa-info-box pink" style={{ marginTop: '12px' }}>

                {/* ── แถวบน: ตามแบบ ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e3a5f', whiteSpace: 'nowrap' }}>ตามแบบ</span>
                    <label className="poa-radio-item">
                        <input type="radio" name="reqType" value="register" checked={form.reqType === 'register'} onChange={handleChange} />
                        คำขอขึ้นทะเบียนฯ (ทบ.๑)
                    </label>
                    <label className="poa-radio-item">
                        <input type="radio" name="reqType" value="notifyDetail" checked={form.reqType === 'notifyDetail'} onChange={handleChange} />
                        คำขอแจ้งรายละเอียดฯ (จร.๑)
                    </label>
                    <label className="poa-radio-item">
                        <input type="radio" name="reqType" value="notify" checked={form.reqType === 'notify'} onChange={handleChange} />
                        คำขอจดแจ้ง (จจ.๑)
                    </label>
                    <label className="poa-radio-item">
                        <input type="radio" name="reqType" value="renew" checked={form.reqType === 'renew'} onChange={handleChange} />
                        คำขอต่ออายุ (คต.)
                    </label>
                </div>

                {/* ── เป็นผู้ยื่น (เลือก) ── */}
                <div style={{ borderTop: '1px solid #fecdd3', paddingTop: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e3a5f', marginBottom: '8px', display: 'block' }}>เป็นผู้ยื่น <span style={{ fontWeight: 400, color: '#64748b' }}>(เลือก)</span></span>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                            {/* แถว: ตามแบบ + ตัวเลือกคำขอ */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 500 }}>ตามแบบ</span>
                                <label className="poa-radio-item">
                                    <input type="radio" name="submitFormType" value="amend" checked={form.submitFormType === 'amend'} onChange={handleChange} />
                                    คำขอแก้ไขเปลี่ยนแปลง (ทบ.3 / จร.3 / จจ.3)
                                </label>
                                <label className="poa-radio-item">
                                    <input type="radio" name="submitFormType" value="replace" checked={form.submitFormType === 'replace'} onChange={handleChange} />
                                    คำขอใบแทน (บท)
                                </label>
                                <label className="poa-radio-item">
                                    <input type="radio" name="submitFormType" value="other" checked={form.submitFormType === 'other'} onChange={handleChange} />
                                    อื่นๆ
                                </label>
                                {form.submitFormType === 'other' && (
                                    <input type="text" name="submitFormOther" value={form.submitFormOther || ''} onChange={handleChange}
                                        style={{ width: '160px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit' }}
                                        placeholder="ระบุ..."
                                    />
                                )}
                            </div>
                            {/* แถว: ชื่อผลิตภัณฑ์ + เลขรับที่ */}
                            <div className="poa-row" style={{ marginBottom: '4px' }}>
                                <div className="poa-field">
                                    <label>ชื่อผลิตภัณฑ์</label>
                                    <input type="text" name="productName" value={form.productName} onChange={handleChange} />
                                </div>
                                <div className="poa-field medium">
                                    <label>เลขรับที่</label>
                                    <input type="text" name="productReceiveNo" value={form.productReceiveNo || ''} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ flex: 1 }}>
                            <div className="poa-row" style={{ marginBottom: '8px' }}>
                                <div className="poa-field">
                                    <label>ชื่อ</label>
                                    <input type="text" name="productNameAlt" value={form.productNameAlt || ''} onChange={handleChange} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <label className="poa-checkbox-item">
                                    <input type="checkbox" name="hasRegNo" checked={form.hasRegNo} onChange={handleChange} />
                                    เลขทะเบียนที่
                                </label>
                                <label className="poa-checkbox-item">
                                    <input type="checkbox" name="hasRegDetail" checked={form.hasRegDetail || false} onChange={handleChange} />
                                    แจ้งรายละเอียดที่
                                </label>
                                <label className="poa-checkbox-item">
                                    <input type="checkbox" name="hasNoticeNo" checked={form.hasNoticeNo || false} onChange={handleChange} />
                                    เลขรับจดแจ้งที่
                                </label>
                                {form.hasNoticeNo && (
                                    <input type="text" name="regNoticeNo" value={form.regNoticeNo || ''} onChange={handleChange}
                                        style={{ width: '120px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit' }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── บรรทัดสุดท้าย ── */}
                    <p style={{ fontSize: '12.5px', color: '#334155', marginTop: '10px', lineHeight: 1.6 }}>
                        มีความประสงค์ยื่นคำขอแก้ไขเปลี่ยนแปลงรายการในทะเบียนตำรับ ของผลิตภัณฑ์ดังกล่าว ที่เคยได้รับอนุญาตไว้
                    </p>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* ส่วนที่ 2: ผู้รับมอบอำนาจ                                          */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="poa-section-title">2. ขอมอบอำนาจให้</div>

            <div className="poa-row">
                <div className="poa-field" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>คำนำหน้า <span className="required">*</span></span>
                        <label className="poa-radio-item" style={{ fontSize: '13px', margin: 0 }}>
                            <input type="radio" name="granteePrefix" value="นาย" checked={form.granteePrefix === 'นาย'} onChange={handleChange} /> นาย
                        </label>
                        <label className="poa-radio-item" style={{ fontSize: '13px', margin: 0 }}>
                            <input type="radio" name="granteePrefix" value="นาง" checked={form.granteePrefix === 'นาง'} onChange={handleChange} /> นาง
                        </label>
                        <label className="poa-radio-item" style={{ fontSize: '13px', margin: 0 }}>
                            <input type="radio" name="granteePrefix" value="นางสาว" checked={form.granteePrefix === 'นางสาว'} onChange={handleChange} /> นางสาว
                        </label>
                    </div>
                    <input type="text" name="granteeName" value={form.granteeName} onChange={handleChange} placeholder="ชื่อ-นามสกุล" />
                </div>
                <div className="poa-field small">
                    <label>อายุ (ปี)</label>
                    <input type="number" name="granteeAge" value={form.granteeAge} onChange={handleChange} />
                </div>
            </div>

            <div className="poa-section-subtitle">บัตรประจำตัวประชาชนเลขที่</div>
            <div className="poa-id-row">
                <IdCardInput value={form.granteeCitizenId} onChange={handleIdChange('granteeCitizenId')} pattern="1-4-5-2-1" />
                <div className="poa-id-expiry">
                    <span>(วันที่บัตรหมดอายุ</span>
                    <input type="date" name="granteeIdExpiry" value={form.granteeIdExpiry} onChange={handleChange} />
                    <span>)</span>
                </div>
            </div>

            <div className="poa-row">
                <div className="poa-field small">
                    <label>อยู่บ้านเลขที่</label>
                    <input type="text" name="granteeAddressNo" value={form.granteeAddressNo} onChange={handleChange} />
                </div>
                <div className="poa-field small">
                    <label>หมู่ที่</label>
                    <input type="text" name="granteeMoo" value={form.granteeMoo} onChange={handleChange} />
                </div>
                <div className="poa-field">
                    <label>ตรอก/ซอย</label>
                    <input type="text" name="granteeSoi" value={form.granteeSoi} onChange={handleChange} />
                </div>
                <div className="poa-field">
                    <label>ถนน</label>
                    <input type="text" name="granteeRoad" value={form.granteeRoad} onChange={handleChange} />
                </div>
                <div className="poa-field">
                    <label>ตำบล/แขวง</label>
                    <input type="text" name="granteeSubDistrict" value={form.granteeSubDistrict} onChange={handleChange} />
                </div>
            </div>
            <div className="poa-row">
                <div className="poa-field">
                    <label>อำเภอ/เขต</label>
                    <input type="text" name="granteeDistrict" value={form.granteeDistrict} onChange={handleChange} />
                </div>
                <div className="poa-field">
                    <label>จังหวัด</label>
                    <input type="text" name="granteeProvince" value={form.granteeProvince} onChange={handleChange} />
                </div>
                <div className="poa-field">
                    <label>โทรศัพท์</label>
                    <input type="tel" name="granteePhone" value={form.granteePhone} onChange={handleChange} />
                </div>
                <div className="poa-field">
                    <label>Email</label>
                    <input type="email" name="granteeEmail" value={form.granteeEmail} onChange={handleChange} />
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* ขอบเขตอำนาจ                                                     */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <p style={{ fontSize: '13px', color: '#475569', margin: '20px 0 12px' }}>
                เป็นผู้มีอำนาจกระทำการแทนข้าพเจ้าในกิจการดังต่อไปนี้
            </p>

            <div className="poa-scope-list">
                <div className="poa-scope-item">
                    <span className="scope-num">ข้อ (1)</span>
                    ยื่นคำขออนุญาตผลิตภัณฑ์สมุนไพร ตามที่ระบุข้างต้น ต่อสำนักงานคณะกรรมการอาหารและยา ทางอินเตอร์เน็ต (E-Submission) ตลอดจนดำเนินการอื่นใดที่จำเป็นเกี่ยวกับ<strong>การขออนุญาตฯ</strong> ดังกล่าวข้างต้นจนเสร็จการ
                </div>
                <div className="poa-scope-item">
                    <span className="scope-num">ข้อ (2)</span>
                    การแก้ไข การชี้แจง การส่งเอกสารเพิ่มเติม การชำระค่าธรรมเนียม /ค่าใช้จ่ายต่างๆ ตามที่กฎหมายกำหนด รับรองเอกสาร รับเอกสารคืน รับใบสำคัญการขึ้นทะเบียน/ใบรับแจ้งรายละเอียด/ใบรับจดแจ้ง /การรับเอกสารการอนุญาตให้แก้ไขเปลี่ยนแปลงฯ/ การรับใบแทน/ การขอยกเลิกคำขอฯ/ การรับเอกสารที่ได้รับอนุญาตที่เกี่ยวข้อง และการอื่นใดที่จำเป็นที่เกี่ยวข้องกับคำขอที่ได้ยื่นไว้ ตามที่ระบุดังกล่าว ข้างต้นจนเสร็จการ และอื่นๆ
                    <input type="text" name="scopeOther" value={form.scopeOther || ''} onChange={handleChange}
                        style={{ width: '200px', margin: '0 4px', padding: '2px 6px', border: 'none', borderBottom: '1px dotted #94a3b8', fontSize: '13px', fontFamily: 'inherit', background: 'transparent' }}
                        placeholder="ระบุ..."
                    />
                </div>
                <div className="poa-scope-item">
                    <span className="scope-num">ข้อ (3)</span>
                    การใดที่ผู้รับมอบอำนาจ ตามข้อ (1) – (3) ดังกล่าว ได้กระทำไปภายใต้ขอบเขตแห่งการมอบอำนาจนี้ ข้าพเจ้าขอรับผิดชอบ
                    และมีผลผูกพันกับข้าพเจ้าทุกประการ โดยเสมือนว่าข้าพเจ้าเป็นผู้กระทำด้วยตนเองทั้งสิ้น ทั้งนี้นับตั้งแต่วันที่
                    <input type="text" name="scopeStartDay" value={form.scopeStartDay || ''} onChange={handleChange}
                        style={{ width: '60px', margin: '0 4px', padding: '2px 6px', border: 'none', borderBottom: '1px dotted #94a3b8', textAlign: 'center', fontSize: '13px', fontFamily: 'inherit', background: 'transparent' }}
                        placeholder="........"
                    />
                    เดือน
                    <input type="text" name="scopeStartMonth" value={form.scopeStartMonth || ''} onChange={handleChange}
                        style={{ width: '90px', margin: '0 4px', padding: '2px 6px', border: 'none', borderBottom: '1px dotted #94a3b8', textAlign: 'center', fontSize: '13px', fontFamily: 'inherit', background: 'transparent' }}
                        placeholder=".................."
                    />
                    พ.ศ.
                    <input type="text" name="scopeStartYear" value={form.scopeStartYear || ''} onChange={handleChange}
                        style={{ width: '60px', margin: '0 4px', padding: '2px 6px', border: 'none', borderBottom: '1px dotted #94a3b8', textAlign: 'center', fontSize: '13px', fontFamily: 'inherit', background: 'transparent' }}
                        placeholder="........"
                    />
                    เป็นต้นไป จนเสร็จการ
                </div>
            </div>






            {/* ── Version ── */}
            <div className="poa-version">ver001 261264</div>
            
            </div> {/* Close the inner wrapper */}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* Footer Buttons                                                 */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {!embedded && (
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
                    borderRadius: '0 0 12px 12px'
                }}>
                    <button onClick={handlePrint} disabled={isSaving || isPrinting} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}>
                        <Printer size={18} /> {isPrinting ? 'กำลังสร้าง PDF...' : 'พรีวิว / พิมพ์'}
                    </button>
                    <button onClick={handleSave} disabled={isSaving || isPrinting} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}>
                        <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </button>
                </div>
            )}
        </div>
    );
});

export default PowerOfAttorneyForm;

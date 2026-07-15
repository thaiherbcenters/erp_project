import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { useAlert } from './CustomAlert';
import { FileText, User, Building2, Globe, Check, ChevronRight, Plus, Trash2, Factory, Ship } from 'lucide-react';

// ─── Design Tokens ───
const colors = {
    primary: '#1d4ed8',
    primaryLight: '#dbeafe',
    primaryDark: '#1e3a8a',
    accent: '#0ea5e9',
    bg: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    text: '#0f172a',
    textMuted: '#64748b',
    textLabel: '#475569',
    success: '#059669',
    successBg: '#ecfdf5',
};

const sectionTitleStyle = {
    fontSize: '15px', fontWeight: '700', color: colors.text,
    borderBottom: `2px solid ${colors.primary}`, paddingBottom: '10px', marginBottom: '20px',
    display: 'flex', alignItems: 'center', gap: '10px',
};

const labelStyle = {
    display: 'block', fontSize: '12.5px', fontWeight: '600',
    color: colors.textLabel, marginBottom: '5px', letterSpacing: '0.02em',
};

const inputStyle = {
    width: '100%', padding: '9px 12px', border: `1px solid ${colors.border}`,
    borderRadius: '8px', fontSize: '13.5px', outline: 'none',
    boxSizing: 'border-box', background: '#fff',
    transition: 'border-color 0.2s, box-shadow 0.2s',
};

const cardStyle = {
    padding: '24px', background: colors.card, marginBottom: '16px',
    borderRadius: '12px', border: `1px solid ${colors.border}`,
};

const applicantTypes = [
    { value: 'บุคคลธรรมดา', label: 'บุคคลธรรมดา', icon: <User size={18} /> },
    { value: 'นิติบุคคล', label: 'นิติบุคคล', icon: <Building2 size={18} /> },
    { value: 'บุคคลธรรมดาต่างด้าว', label: 'บุคคลธรรมดาต่างด้าว', icon: <Globe size={18} /> },
    { value: 'นิติบุคคลต่างด้าว', label: 'นิติบุคคลต่างด้าว', icon: <Globe size={18} /> },
];

const TorBor1Form = forwardRef(({ documentId, readOnly = false, initialData = null, onStatusChange, customerData, contractId, embedded, sharedFormData, onSharedDataChange }, ref) => {
    const { showAlert } = useAlert();
    const [form, setForm] = useState({
        // สำหรับเจ้าหน้าที่ (Official Use)
        ReceiptNo: 'ร.1234/2567',
        ReceiptDate: '2024-01-15',
        ReceiverName: 'นายเจ้าหน้าที่ ทดสอบ',

        documentId: null,
        DocumentDate: new Date().toISOString().split('T')[0],
        // ๑. ความประสงค์
        ReqMedicineFromHerb: true,
        ReqMedType: 'ยาแผนไทย',
        ReqMedTypeOther: '',
        ReqHealthProduct: false,
        TypeProduce: true,
        TypeImport: false,
        TypeExportOnly: false,
        ProductNameThai: 'ยาสมุนไพรไทยตราเทส',
        ProductNameEng: 'Thai Herb Test Brand',
        ApplicantType: 'นิติบุคคล',
        AppNaturalName: 'นายทดสอบ บุคคลธรรมดา', AppNaturalAge: '35', AppNaturalNationality: 'ไทย', AppNaturalCitizenID: '1234567890123',
        AppNaturalAddressNo: '111', AppNaturalBuilding: 'ตึกเทส', AppNaturalMoo: '1', AppNaturalSoi: 'ซอยทดสอบ',
        AppNaturalRoad: 'ถนนทดสอบ', AppNaturalSubDistrict: 'แขวงเทส', AppNaturalDistrict: 'เขตเทส', AppNaturalProvince: 'กรุงเทพมหานคร',
        AppNaturalPostcode: '10000', AppNaturalFax: '02-111-1111', AppNaturalPhone: '081-111-1111', AppNaturalEmail: 'test@test.com',
        AppJuristicName: 'บริษัท ทดสอบ จำกัด', AppJuristicID: '0105555555555',
        AppJuristicAddressNo: '222', AppJuristicBuilding: 'ตึกบริษัท', AppJuristicMoo: '2', AppJuristicSoi: 'ซอยออฟฟิศ',
        AppJuristicRoad: 'ถนนออฟฟิศ', AppJuristicSubDistrict: 'แขวงบริษัท', AppJuristicDistrict: 'เขตบริษัท', AppJuristicProvince: 'กรุงเทพมหานคร',
        AppJuristicPostcode: '10000', AppJuristicFax: '02-222-2222', AppJuristicPhone: '082-222-2222', AppJuristicEmail: 'company@test.com',
        AppJuristicRepName: 'นายตัวแทน นิติบุคคล', AppJuristicRepAge: '40', AppJuristicRepNationality: 'ไทย', AppJuristicRepCitizenID: '9876543210987',
        AppForeignPassportNo: 'A12345678', AppForeignPassportExpiry: '2030-12-31',
        AppForeignResCertNo: 'R87654321', AppForeignResCertDate: '2020-05-10',
        AppForeignWorkPermitNo: 'W11223344', AppForeignWorkPermitExpiry: '2025-05-10',
        
        AppForeignBizLicenseNo: 'FL-998877', AppForeignBizLicenseDate: '2021-01-01',
        AppForeignBizCertNo: 'FC-112233', AppForeignBizCertDate: '2021-01-15',

        // ๓. ข้อมูลสถานที่ผลิต หรือนำเข้า
        ProductionType: 'ผลิตในประเทศ', // 'ผลิตในประเทศ', 'นำเข้า'

        // กรณีผลิตในประเทศ
        ProdLicenseeName: 'บริษัท โรงงานผลิตเทส จำกัด', ProdLicenseNo: 'ผ.123/2560',
        ProdOperatorName: 'นายผู้ดำเนิน โรงงาน', ProdPlaceName: 'โรงงานสมุนไพรเทส',
        ProdAddressNo: '333', ProdSoi: 'ซอยโรงงาน', ProdRoad: 'ถนนโรงงาน', ProdMoo: '3', ProdSubDistrict: 'ตำบลโรงงาน',
        ProdDistrict: 'อำเภอโรงงาน', ProdProvince: 'ปทุมธานี', ProdPostcode: '12000', ProdPhone: '02-333-3333',

        // กรณีแบ่งบรรจุ
        RepackRegNo: 'บ.999/2567',

        // กรณีนำเข้า
        ImportLicenseeName: 'บริษัท นำเข้าเทส จำกัด', ImportLicenseNo: 'น.456/2560',
        ImportOperatorName: 'นางผู้นำเข้า ทดสอบ', ImportPlaceName: 'โกดังนำเข้าเทส',
        ImportAddressNo: '444', ImportSoi: 'ซอยโกดัง', ImportRoad: 'ถนนนำเข้า',
        ImportMoo: '4', ImportSubDistrict: 'ตำบลโกดัง', ImportDistrict: 'อำเภอโกดัง', ImportProvince: 'สมุทรปราการ',
        ImportPostcode: '10270', ImportPhone: '02-444-4444',
        ImportForeignMfgName: 'Foreign Test Co., Ltd.', ImportForeignMfgAddress: '123 Fake St, Test City, Test Country',

        // ๔. รายละเอียดผู้ผลิตอื่นที่เกี่ยวข้อง (Stored as JSON string)
        RelatedManufacturers: [
            { name: 'บริษัท ซัพพลายเออร์ 1 จำกัด (ที่อยู่ 111)', licenseNo: 'ส.111/2560', responsibility: 'บรรจุผลิตภัณฑ์' },
            { name: 'บริษัท ซัพพลายเออร์ 2 จำกัด (ที่อยู่ 222)', licenseNo: 'ส.222/2560', responsibility: 'เตรียมผลิตภัณฑ์กึ่งสำเร็จรูป' }
        ],

        // ๔ (ต่อ). รายละเอียดของตำรับผลิตภัณฑ์สมุนไพร
        RecipeOtherName: 'Test Recipe Alternative Name', RecipeFormat: 'แคปซูล (Capsule)', RecipeQuantity: '1000 แคปซูล',
        RecipeActiveIngredients: [
            { thaiName: 'ขมิ้นชัน', engName: 'Turmeric', latinName: 'Curcuma longa', partUsed: 'เหง้า', quantity: '250 mg' },
            { thaiName: 'พริกไทยดำ', engName: 'Black Pepper', latinName: 'Piper nigrum', partUsed: 'ผล', quantity: '50 mg' }
        ],
        RecipeExtracts: [
            { extractName: 'สารสกัดฟ้าทะลายโจร', latinName: 'Andrographis paniculata', partUsed: 'ใบ', solvent: 'เอทานอล', ratio: '10:1', quantity: '100 mg' }
        ],
        RecipeExcipients: [
            { name: 'แป้งข้าวโพด', casNumber: '9005-25-8', function: 'สารเติมเต็ม (Filler)', quantity: '100 mg' },
            { name: 'แมกนีเซียมสเตียเรต', casNumber: '557-04-0', function: 'สารหล่อลื่น (Lubricant)', quantity: '5 mg' }
        ],

        // ๕. รายละเอียดของผลิตภัณฑ์สมุนไพร
        ProductAppearance: 'แคปซูลสีเขียว-ขาว บรรจุผงสีน้ำตาล', ProductPackSize: 'กระปุกละ 60 แคปซูล, แผงละ 10 แคปซูล', ProductMfgProcess: 'ผสมสารสกัดและสมุนไพรบดหยาบ นำเข้าเครื่องบรรจุแคปซูล', ProductIndication: 'บรรเทาอาการท้องอืด ท้องเฟ้อ ช่วยย่อยอาหาร',
        ProductDosage: 'รับประทานครั้งละ 1-2 แคปซูล วันละ 3 ครั้ง', ProductPreparation: 'ไม่ต้องเตรียม', ProductCondition: 'รับประทานหลังอาหารทันที', ProductStorage: 'เก็บในที่แห้ง อุณหภูมิต่ำกว่า 30 องศาเซลเซียส / อายุ 2 ปี',
        ProductContraindication: 'ห้ามใช้ในสตรีมีครรภ์และผู้ป่วยท่อน้ำดีอุดตัน', ProductWarning: 'หากมีอาการแพ้ควรหยุดใช้ทันที', ProductPrecaution: 'ควรระวังการใช้ร่วมกับยาต้านการแข็งตัวของเลือด', ProductAdverseReaction: 'อาจเกิดอาการระคายเคืองกระเพาะอาหาร',
        SalesChannel: 'ผลิตภัณฑ์สมุนไพรขายทั่วไป', ProductSummary: 'ผลิตภัณฑ์มีคุณภาพผ่านเกณฑ์มาตรฐาน สมุนไพรมีความปลอดภัยตามเอกสารอ้างอิง และมีประสิทธิภาพในการบรรเทาอาการท้องอืด',
        AttachedDocuments: {
            doc1: true, doc2: true, doc3: true, doc4: false, doc5: false,
            doc6_1: true, doc6_2: true, doc6_3: true, doc6_4: false, doc6_5: false, doc6_6: false,
            doc7: true, doc8: false, doc9: true
        }
    });

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            setForm(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const handleChange = useCallback((e) => {
        if (readOnly) return;
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }, [readOnly]);

    const handleAttachmentChange = useCallback((e) => {
        if (readOnly) return;
        const { name, checked } = e.target;
        setForm(prev => ({
            ...prev,
            AttachedDocuments: {
                ...(prev.AttachedDocuments || {}),
                [name]: checked
            }
        }));
    }, [readOnly]);

    const handleRelatedMfgChange = (index, field, val) => {
        if (readOnly) return;
        const list = [...(form.RelatedManufacturers || [])];
        list[index] = { ...list[index], [field]: val };
        setForm({ ...form, RelatedManufacturers: list });
    };

    const addRelatedMfg = () => {
        if (readOnly) return;
        setForm(prev => ({
            ...prev,
            RelatedManufacturers: [...(prev.RelatedManufacturers || []), { name: '', licenseNo: '', responsibility: '' }]
        }));
    };

    const removeRelatedMfg = (index) => {
        if (readOnly) return;
        setForm(prev => ({
            ...prev,
            RelatedManufacturers: (prev.RelatedManufacturers || []).filter((_, i) => i !== index)
        }));
    };

    // --- Active Ingredients ---
    const addActiveIngredient = () => {
        if (readOnly) return;
        setForm(prev => ({ ...prev, RecipeActiveIngredients: [...(prev.RecipeActiveIngredients || []), { thaiName: '', engName: '', latinName: '', partUsed: '', quantity: '' }] }));
    };
    const removeActiveIngredient = (index) => {
        if (readOnly) return;
        setForm(prev => ({ ...prev, RecipeActiveIngredients: (prev.RecipeActiveIngredients || []).filter((_, i) => i !== index) }));
    };
    const handleActiveIngredientChange = (index, field, val) => {
        if (readOnly) return;
        const list = [...(form.RecipeActiveIngredients || [])];
        list[index] = { ...list[index], [field]: val };
        setForm({ ...form, RecipeActiveIngredients: list });
    };

    // --- Extracts ---
    const addExtract = () => {
        if (readOnly) return;
        setForm(prev => ({ ...prev, RecipeExtracts: [...(prev.RecipeExtracts || []), { extractName: '', latinName: '', partUsed: '', solvent: '', ratio: '', quantity: '' }] }));
    };
    const removeExtract = (index) => {
        if (readOnly) return;
        setForm(prev => ({ ...prev, RecipeExtracts: (prev.RecipeExtracts || []).filter((_, i) => i !== index) }));
    };
    const handleExtractChange = (index, field, val) => {
        if (readOnly) return;
        const list = [...(form.RecipeExtracts || [])];
        list[index] = { ...list[index], [field]: val };
        setForm({ ...form, RecipeExtracts: list });
    };

    // --- Excipients ---
    const addExcipient = () => {
        if (readOnly) return;
        setForm(prev => ({ ...prev, RecipeExcipients: [...(prev.RecipeExcipients || []), { name: '', casNumber: '', function: '', quantity: '' }] }));
    };
    const removeExcipient = (index) => {
        if (readOnly) return;
        setForm(prev => ({ ...prev, RecipeExcipients: (prev.RecipeExcipients || []).filter((_, i) => i !== index) }));
    };
    const handleExcipientChange = (index, field, val) => {
        if (readOnly) return;
        const list = [...(form.RecipeExcipients || [])];
        list[index] = { ...list[index], [field]: val };
        setForm({ ...form, RecipeExcipients: list });
    };


    useImperativeHandle(ref, () => ({
        getFormData: () => ({ type: 'torbor1', data: form }),
        validateForm: () => {
            if (!form.ApplicantType) {
                showAlert('กรุณาระบุ', 'กรุณาเลือกประเภทผู้ขอขึ้นทะเบียน', 'warning');
                return false;
            }
            if (!form.ProductNameThai) {
                showAlert('กรุณาระบุ', 'กรุณาระบุชื่อภาษาไทยของผลิตภัณฑ์', 'warning');
                return false;
            }
            return true;
        }
    }));

    // Styles and Tokens moved outside component for stability

    const chipStyle = (active) => ({
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
        cursor: readOnly ? 'default' : 'pointer',
        border: active ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
        background: active ? colors.primaryLight : '#fff',
        color: active ? colors.primaryDark : colors.textMuted,
        transition: 'all 0.2s',
        boxShadow: active ? '0 2px 8px rgba(29,78,216,0.12)' : 'none',
    });

    const tabBtnStyle = (active) => ({
        flex: 1, padding: '12px 16px', borderRadius: '10px',
        fontSize: '13.5px', fontWeight: '700', cursor: readOnly ? 'default' : 'pointer',
        border: 'none', outline: 'none',
        background: active ? colors.card : 'transparent',
        color: active ? colors.primary : colors.textMuted,
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
        transition: 'all 0.25s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    });

    const InputField = useMemo(() => {
        const Field = ({ label, name, value, type = 'text', width, disabled = false, placeholder = '' }) => (
            <div style={{ flex: width || 1, minWidth: 0 }}>
                <label style={labelStyle}>{label}</label>
                <input
                    type={type} name={name} value={value || ''} onChange={handleChange}
                    disabled={disabled || readOnly} placeholder={placeholder}
                    style={{ ...inputStyle, ...(disabled || readOnly ? { background: '#f1f5f9', color: '#94a3b8' } : {}) }}
                    onFocus={(e) => { e.target.style.borderColor = colors.primary; e.target.style.boxShadow = `0 0 0 3px ${colors.primaryLight}`; }}
                    onBlur={(e) => { e.target.style.borderColor = colors.border; e.target.style.boxShadow = 'none'; }}
                />
            </div>
        );
        Field.displayName = 'InputField';
        return Field;
    }, [handleChange, readOnly]);

    const TextAreaField = useMemo(() => {
        const Field = ({ label, name, value, disabled = false, placeholder = '', rows = 3 }) => (
            <div style={{ width: '100%', marginBottom: '14px' }}>
                <label style={labelStyle}>{label}</label>
                <textarea
                    name={name} value={value || ''} onChange={handleChange}
                    disabled={disabled || readOnly} placeholder={placeholder} rows={rows}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', ...(disabled || readOnly ? { background: '#f1f5f9', color: '#94a3b8' } : {}) }}
                    onFocus={(e) => { e.target.style.borderColor = colors.primary; e.target.style.boxShadow = `0 0 0 3px ${colors.primaryLight}`; }}
                    onBlur={(e) => { e.target.style.borderColor = colors.border; e.target.style.boxShadow = 'none'; }}
                />
            </div>
        );
        Field.displayName = 'TextAreaField';
        return Field;
    }, [handleChange, readOnly]);

    // Applicant types moved outside

    return (
        <div style={{ background: colors.bg, padding: '28px', borderRadius: '16px', fontFamily: "'Inter', 'Sarabun', sans-serif" }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: colors.text, letterSpacing: '-0.02em' }}>
                        คำขอขึ้นทะเบียนตำรับผลิตภัณฑ์สมุนไพร
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: colors.textMuted }}>
                        กรอกข้อมูลตามแบบฟอร์ม ทบ.๑ ให้ครบถ้วน
                    </p>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                    color: '#fff', padding: '6px 16px', borderRadius: '20px',
                    fontSize: '13px', fontWeight: '700', letterSpacing: '0.04em',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                }}>
                    แบบ ทบ.๑
                </div>
            </div>

            {/* ── สำหรับเจ้าหน้าที่ (Official Use) ── */}
            <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.border}`, marginBottom: '16px', background: '#f8fafc' }}>
                <h4 style={{ ...sectionTitleStyle, borderBottom: 'none', marginBottom: '12px', fontSize: '13px', color: colors.textMuted }}>
                    สำหรับเจ้าหน้าที่ (ส่วนบนขวาของเอกสาร)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <InputField label="เลขรับที่" name="ReceiptNo" value={form.ReceiptNo} disabled={readOnly} placeholder="เช่น ร.1234/2567" />
                    <InputField label="วันที่ (รับ)" name="ReceiptDate" type="date" value={form.ReceiptDate} disabled={readOnly} />
                    <InputField label="ลงชื่อ (ผู้รับคำขอ)" name="ReceiverName" value={form.ReceiverName} disabled={readOnly} placeholder="ชื่อเจ้าหน้าที่" />
                </div>
            </div>

            {/* ── Section 1: ชนิดคำขอ + ประเภท ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* ชนิด */}
                <div style={cardStyle}>
                    <h4 style={sectionTitleStyle}>
                        <span style={{ background: colors.primary, color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>1</span>
                        คำขออนุญาต (ชนิด)
                    </h4>

                    {/* ยาจากสมุนไพร */}
                    <div style={{
                        border: `1px solid ${form.ReqMedicineFromHerb ? colors.primary : colors.border}`,
                        borderRadius: '10px', padding: '14px 16px', marginBottom: '12px',
                        background: form.ReqMedicineFromHerb ? colors.primaryLight : '#fff',
                        transition: 'all 0.2s',
                    }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', color: colors.text }}>
                            <input type="checkbox" name="ReqMedicineFromHerb" checked={form.ReqMedicineFromHerb} onChange={handleChange} disabled={readOnly}
                                style={{ width: '18px', height: '18px', accentColor: colors.primary }} />
                            ยาจากสมุนไพร
                        </label>
                        <div style={{
                            marginTop: '12px', paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '8px',
                            borderLeft: `2px solid ${form.ReqMedicineFromHerb ? colors.primary : colors.border}`,
                            opacity: form.ReqMedicineFromHerb ? 1 : 0.4,
                            transition: 'opacity 0.2s',
                        }}>
                            {['ยาแผนไทย', 'ยาตามองค์ความรู้การแพทย์แผนทางเลือก', 'ยาพัฒนาจากสมุนไพร'].map(opt => (
                                <div key={opt}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: colors.textLabel, paddingLeft: '8px' }}>
                                        <input type="radio" name="ReqMedType" value={opt} checked={form.ReqMedType === opt}
                                            onChange={handleChange} disabled={readOnly || !form.ReqMedicineFromHerb}
                                            style={{ accentColor: colors.primary }} />
                                        {opt}
                                    </label>
                                    {opt === 'ยาตามองค์ความรู้การแพทย์แผนทางเลือก' && form.ReqMedType === opt && (
                                        <div style={{ marginTop: '8px', paddingLeft: '34px' }}>
                                            <InputField 
                                                name="ReqMedTypeOther" 
                                                value={form.ReqMedTypeOther} 
                                                disabled={readOnly || !form.ReqMedicineFromHerb} 
                                                placeholder="โปรดระบุ..." 
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ผลิตภัณฑ์สมุนไพรเพื่อสุขภาพ */}
                    <div style={{
                        border: `1px solid ${form.ReqHealthProduct ? colors.primary : colors.border}`,
                        borderRadius: '10px', padding: '14px 16px',
                        background: form.ReqHealthProduct ? colors.primaryLight : '#fff',
                        transition: 'all 0.2s',
                    }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', color: colors.text }}>
                            <input type="checkbox" name="ReqHealthProduct" checked={form.ReqHealthProduct} onChange={handleChange} disabled={readOnly}
                                style={{ width: '18px', height: '18px', accentColor: colors.primary }} />
                            ผลิตภัณฑ์สมุนไพรเพื่อสุขภาพ
                        </label>
                    </div>
                </div>

                {/* ประเภท + ชื่อผลิตภัณฑ์ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={cardStyle}>
                        <h4 style={sectionTitleStyle}>
                            <span style={{ background: colors.primary, color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>2</span>
                            ประเภทการดำเนินการ
                        </h4>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {[
                                { name: 'TypeProduce', label: 'ผลิต' },
                                { name: 'TypeImport', label: 'นำเข้า' },
                                { name: 'TypeExportOnly', label: 'เพื่อส่งออกเท่านั้น' },
                            ].map(item => (
                                <label key={item.name} style={chipStyle(form[item.name])}>
                                    <input type="checkbox" name={item.name} checked={form[item.name]} onChange={handleChange} disabled={readOnly} style={{ display: 'none' }} />
                                    {form[item.name] && <Check size={14} />}
                                    {item.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ ...cardStyle, flex: 1 }}>
                        <h4 style={sectionTitleStyle}>
                            <span style={{ background: colors.primary, color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>3</span>
                            ชื่อของผลิตภัณฑ์
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <InputField label="ชื่อภาษาไทย" name="ProductNameThai" value={form.ProductNameThai} placeholder="ระบุชื่อผลิตภัณฑ์เป็นภาษาไทย" />
                            <InputField label="ชื่อภาษาอังกฤษ (ถ้ามี)" name="ProductNameEng" value={form.ProductNameEng} placeholder="English product name (optional)" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Section 2: ข้อมูลผู้ขอขึ้นทะเบียน ── */}
            <div style={cardStyle}>
                <h4 style={sectionTitleStyle}>
                    <span style={{ background: colors.primary, color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>4</span>
                    ข้อมูลผู้ขอขึ้นทะเบียนตำรับผลิตภัณฑ์สมุนไพร (เจ้าของผลิตภัณฑ์)
                </h4>

                {/* Applicant Type Tabs */}
                <div style={{
                    display: 'flex', gap: '4px', padding: '4px',
                    background: '#f1f5f9', borderRadius: '12px', marginBottom: '20px',
                }}>
                    {applicantTypes.map(({ value, label, icon }) => (
                        <button key={value} type="button" style={tabBtnStyle(form.ApplicantType === value)}
                            onClick={() => !readOnly && handleChange({ target: { name: 'ApplicantType', value, type: 'radio' } })}>
                            {icon} {label}
                        </button>
                    ))}
                </div>

                {/* Empty state */}
                {!form.ApplicantType && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textMuted }}>
                        <ChevronRight size={40} style={{ opacity: 0.15, marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>กรุณาเลือกประเภทผู้ขอขึ้นทะเบียนด้านบน</p>
                    </div>
                )}

                {/* บุคคลธรรมดา */}
                {form.ApplicantType === 'บุคคลธรรมดา' && (
                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 2fr', gap: '14px', marginBottom: '20px' }}>
                            <InputField label="ชื่อ - นามสกุล" name="AppNaturalName" value={form.AppNaturalName} />
                            <InputField label="อายุ (ปี)" name="AppNaturalAge" value={form.AppNaturalAge} type="number" />
                            <InputField label="สัญชาติ" name="AppNaturalNationality" value={form.AppNaturalNationality} />
                            <InputField label="เลขประจำตัวประชาชน" name="AppNaturalCitizenID" value={form.AppNaturalCitizenID} />
                        </div>

                        <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: '16px', marginBottom: '20px' }}>
                            <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: colors.textLabel }}>📍 ที่อยู่ติดต่อ</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 2fr', gap: '14px', marginBottom: '14px' }}>
                                <InputField label="เลขที่" name="AppNaturalAddressNo" value={form.AppNaturalAddressNo} />
                                <InputField label="หมู่บ้าน/อาคาร" name="AppNaturalBuilding" value={form.AppNaturalBuilding} />
                                <InputField label="หมู่ที่" name="AppNaturalMoo" value={form.AppNaturalMoo} />
                                <InputField label="ตรอก/ซอย" name="AppNaturalSoi" value={form.AppNaturalSoi} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                                <InputField label="ถนน" name="AppNaturalRoad" value={form.AppNaturalRoad} />
                                <InputField label="ตำบล/แขวง" name="AppNaturalSubDistrict" value={form.AppNaturalSubDistrict} />
                                <InputField label="อำเภอ/เขต" name="AppNaturalDistrict" value={form.AppNaturalDistrict} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 4fr', gap: '14px' }}>
                                <InputField label="จังหวัด" name="AppNaturalProvince" value={form.AppNaturalProvince} />
                                <InputField label="รหัสไปรษณีย์" name="AppNaturalPostcode" value={form.AppNaturalPostcode} />
                                <div></div>
                            </div>
                        </div>

                        <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: '16px' }}>
                            <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: colors.textLabel }}>📞 ช่องทางติดต่อ</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                                <InputField label="โทรศัพท์" name="AppNaturalPhone" value={form.AppNaturalPhone} />
                                <InputField label="โทรสาร" name="AppNaturalFax" value={form.AppNaturalFax} />
                                <InputField label="อีเมล" name="AppNaturalEmail" value={form.AppNaturalEmail} type="email" />
                            </div>
                        </div>
                    </div>
                )}

                {/* นิติบุคคล */}
                {form.ApplicantType === 'นิติบุคคล' && (
                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '20px' }}>
                            <InputField label="ชื่อนิติบุคคล" name="AppJuristicName" value={form.AppJuristicName} />
                            <InputField label="เลขทะเบียนนิติบุคคล" name="AppJuristicID" value={form.AppJuristicID} />
                        </div>

                        <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: '16px', marginBottom: '20px' }}>
                            <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: colors.textLabel }}>📍 ที่ตั้งนิติบุคคล</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 2fr', gap: '14px', marginBottom: '14px' }}>
                                <InputField label="เลขที่" name="AppJuristicAddressNo" value={form.AppJuristicAddressNo} />
                                <InputField label="หมู่บ้าน/อาคาร" name="AppJuristicBuilding" value={form.AppJuristicBuilding} />
                                <InputField label="หมู่ที่" name="AppJuristicMoo" value={form.AppJuristicMoo} />
                                <InputField label="ตรอก/ซอย" name="AppJuristicSoi" value={form.AppJuristicSoi} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                                <InputField label="ถนน" name="AppJuristicRoad" value={form.AppJuristicRoad} />
                                <InputField label="ตำบล/แขวง" name="AppJuristicSubDistrict" value={form.AppJuristicSubDistrict} />
                                <InputField label="อำเภอ/เขต" name="AppJuristicDistrict" value={form.AppJuristicDistrict} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 4fr', gap: '14px' }}>
                                <InputField label="จังหวัด" name="AppJuristicProvince" value={form.AppJuristicProvince} />
                                <InputField label="รหัสไปรษณีย์" name="AppJuristicPostcode" value={form.AppJuristicPostcode} />
                                <div></div>
                            </div>
                        </div>

                        <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: '16px', marginBottom: '20px' }}>
                            <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: colors.textLabel }}>📞 ช่องทางติดต่อ</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                                <InputField label="โทรศัพท์" name="AppJuristicPhone" value={form.AppJuristicPhone} />
                                <InputField label="โทรสาร" name="AppJuristicFax" value={form.AppJuristicFax} />
                                <InputField label="อีเมล" name="AppJuristicEmail" value={form.AppJuristicEmail} type="email" />
                            </div>
                        </div>

                        {/* Representative Info */}
                        <div style={{
                            background: '#eff6ff', border: '1px solid #bfdbfe',
                            borderRadius: '12px', padding: '20px', marginTop: '8px',
                        }}>
                            <p style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: '700', color: colors.primaryDark }}>
                                👤 ผู้แทนนิติบุคคล (ผู้มีอำนาจทำการแทน)
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 2fr', gap: '14px' }}>
                                <InputField label="ชื่อ - นามสกุล" name="AppJuristicRepName" value={form.AppJuristicRepName} />
                                <InputField label="อายุ (ปี)" name="AppJuristicRepAge" value={form.AppJuristicRepAge} type="number" />
                                <InputField label="สัญชาติ" name="AppJuristicRepNationality" value={form.AppJuristicRepNationality} />
                                <InputField label="เลขประจำตัวประชาชน" name="AppJuristicRepCitizenID" value={form.AppJuristicRepCitizenID} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ข้อมูลเพิ่มเติมสำหรับชาวต่างชาติ (รวมทั้งบุคคลและนิติบุคคล) */}
                {(form.ApplicantType === 'บุคคลธรรมดาต่างด้าว' || form.ApplicantType === 'นิติบุคคลต่างด้าว') && (
                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                        
                        {/* เฉพาะบุคคลธรรมดาต่างด้าว ต้องมี Passport & Work Permit */}
                        {form.ApplicantType === 'บุคคลธรรมดาต่างด้าว' && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    {/* Passport */}
                                    <div style={{ background: colors.borderLight, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                                        <p style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: '700', color: colors.text }}>🛂 หนังสือเดินทาง (Passport)</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <InputField label="หนังสือเดินทางเลขที่" name="AppForeignPassportNo" value={form.AppForeignPassportNo} />
                                            <InputField label="วันหมดอายุ" name="AppForeignPassportExpiry" value={form.AppForeignPassportExpiry ? form.AppForeignPassportExpiry.split('T')[0] : ''} type="date" />
                                        </div>
                                    </div>

                                    {/* Residence Certificate */}
                                    <div style={{ background: colors.borderLight, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                                        <p style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: '700', color: colors.text }}>🏠 ใบสำคัญถิ่นที่อยู่</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <InputField label="ใบสำคัญถิ่นที่อยู่เลขที่" name="AppForeignResCertNo" value={form.AppForeignResCertNo} />
                                            <InputField label="ออกให้ ณ วันที่" name="AppForeignResCertDate" value={form.AppForeignResCertDate ? form.AppForeignResCertDate.split('T')[0] : ''} type="date" />
                                        </div>
                                    </div>
                                </div>

                                {/* Work Permit */}
                                <div style={{ background: colors.borderLight, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}`, marginTop: '16px' }}>
                                    <p style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: '700', color: colors.text }}>💼 ใบอนุญาตทำงาน (Work Permit)</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                        <InputField label="ใบอนุญาตทำงานเลขที่" name="AppForeignWorkPermitNo" value={form.AppForeignWorkPermitNo} />
                                        <InputField label="วันหมดอายุ" name="AppForeignWorkPermitExpiry" value={form.AppForeignWorkPermitExpiry ? form.AppForeignWorkPermitExpiry.split('T')[0] : ''} type="date" />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Foreign Business License / Certificate (ใช้ทั้งสองแบบ) */}
                        <div style={{ background: colors.borderLight, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}`, marginTop: form.ApplicantType === 'นิติบุคคลต่างด้าว' ? '0' : '16px' }}>
                            <p style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: '700', color: colors.text }}>🏢 ใบอนุญาตประกอบธุรกิจ / หนังสือรับรอง (ตามกฎหมายการประกอบธุรกิจของคนต่างด้าว)</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                                <InputField label="ใบอนุญาตประกอบธุรกิจตามบัญชีสาม เลขที่" name="AppForeignBizLicenseNo" value={form.AppForeignBizLicenseNo} />
                                <InputField label="ออกให้ ณ วันที่" name="AppForeignBizLicenseDate" value={form.AppForeignBizLicenseDate ? form.AppForeignBizLicenseDate.split('T')[0] : ''} type="date" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <InputField label="หรือหนังสือรับรองตามกฎหมาย เลขที่" name="AppForeignBizCertNo" value={form.AppForeignBizCertNo} />
                                <InputField label="ออกให้ ณ วันที่" name="AppForeignBizCertDate" value={form.AppForeignBizCertDate ? form.AppForeignBizCertDate.split('T')[0] : ''} type="date" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Section 3: ข้อมูลสถานที่ผลิต หรือนำเข้า ── */}
            <div style={cardStyle}>
                <h4 style={sectionTitleStyle}>
                    <span style={{ background: colors.primary, color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>5</span>
                    ข้อมูลสถานที่ผลิต หรือนำเข้า ผลิตภัณฑ์สมุนไพร
                </h4>

                {/* Production Type Tabs */}
                <div style={{ display: 'flex', gap: '4px', padding: '4px', background: '#f1f5f9', borderRadius: '12px', marginBottom: '20px' }}>
                    {[
                        { value: 'ผลิตในประเทศ', label: 'กรณีผลิตในประเทศ', icon: <Factory size={18} /> },
                        { value: 'นำเข้า', label: 'กรณีนำเข้า', icon: <Ship size={18} /> },
                    ].map(({ value, label, icon }) => (
                        <button key={value} type="button" style={tabBtnStyle(form.ProductionType === value)}
                            onClick={() => !readOnly && handleChange({ target: { name: 'ProductionType', value, type: 'radio' } })}>
                            {icon} {label}
                        </button>
                    ))}
                </div>

                {/* Empty state */}
                {!form.ProductionType && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textMuted }}>
                        <ChevronRight size={40} style={{ opacity: 0.15, marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>กรุณาเลือกกรณีผลิตในประเทศ หรือนำเข้า</p>
                    </div>
                )}

                {/* ── กรณีผลิตในประเทศ ── */}
                {form.ProductionType === 'ผลิตในประเทศ' && (
                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                            <InputField label="ชื่อผู้รับอนุญาตผลิต" name="ProdLicenseeName" value={form.ProdLicenseeName} />
                            <InputField label="ใบอนุญาตผลิตเลขที่" name="ProdLicenseNo" value={form.ProdLicenseNo} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                            <InputField label="ชื่อผู้ดำเนินกิจการ (กรณีนิติบุคคล)" name="ProdOperatorName" value={form.ProdOperatorName} />
                            <InputField label="ชื่อสถานที่ผลิต" name="ProdPlaceName" value={form.ProdPlaceName} />
                        </div>

                        <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: '16px', marginBottom: '20px' }}>
                            <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: colors.textLabel }}>📍 ที่ตั้งสถานที่ผลิต</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 2fr', gap: '14px', marginBottom: '14px' }}>
                                <InputField label="อยู่เลขที่" name="ProdAddressNo" value={form.ProdAddressNo} />
                                <InputField label="ตรอก/ซอย" name="ProdSoi" value={form.ProdSoi} />
                                <InputField label="หมู่ที่" name="ProdMoo" value={form.ProdMoo} />
                                <InputField label="ถนน" name="ProdRoad" value={form.ProdRoad} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                                <InputField label="ตำบล/แขวง" name="ProdSubDistrict" value={form.ProdSubDistrict} />
                                <InputField label="อำเภอ/เขต" name="ProdDistrict" value={form.ProdDistrict} />
                                <InputField label="จังหวัด" name="ProdProvince" value={form.ProdProvince} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 4fr', gap: '14px' }}>
                                <InputField label="รหัสไปรษณีย์" name="ProdPostcode" value={form.ProdPostcode} />
                                <InputField label="โทรศัพท์" name="ProdPhone" value={form.ProdPhone} />
                                <div></div>
                            </div>
                        </div>

                        {/* กรณีแบ่งบรรจุ */}
                        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px', marginTop: '8px' }}>
                            <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', color: '#92400e' }}>📦 กรณีแบ่งบรรจุ</p>
                            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#a16207', lineHeight: '1.6' }}>
                                ระบุเลขทะเบียนผลิตภัณฑ์สมุนไพร ที่นำมาแบ่งบรรจุ<br/>
                                <span style={{ fontSize: '11px', fontStyle: 'italic' }}>(กรณีสถานที่ผลิตมากกว่าหนึ่งแห่ง ให้แจ้งรายละเอียดของผู้ผลิตทั้งหมด ท้ายแบบคำขอ)</span>
                            </p>
                            <InputField label="เลขทะเบียนผลิตภัณฑ์สมุนไพรที่นำมาแบ่งบรรจุ" name="RepackRegNo" value={form.RepackRegNo} />
                        </div>
                    </div>
                )}

                {/* ── กรณีนำเข้า ── */}
                {form.ProductionType === 'นำเข้า' && (
                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                            <InputField label="ชื่อผู้รับอนุญาตนำเข้า" name="ImportLicenseeName" value={form.ImportLicenseeName} />
                            <InputField label="ใบอนุญาตนำเข้าเลขที่" name="ImportLicenseNo" value={form.ImportLicenseNo} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                            <InputField label="กรณีนิติบุคคล ระบุชื่อผู้ดำเนินกิจการ" name="ImportOperatorName" value={form.ImportOperatorName} />
                            <InputField label="ชื่อสถานที่นำเข้า" name="ImportPlaceName" value={form.ImportPlaceName} />
                        </div>

                        <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: '16px', marginBottom: '20px' }}>
                            <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: colors.textLabel }}>📍 ที่ตั้งสถานที่นำเข้า</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '14px', marginBottom: '14px' }}>
                                <InputField label="อยู่เลขที่" name="ImportAddressNo" value={form.ImportAddressNo} />
                                <InputField label="ตรอก/ซอย" name="ImportSoi" value={form.ImportSoi} />
                                <InputField label="ถนน" name="ImportRoad" value={form.ImportRoad} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                                <InputField label="หมู่ที่" name="ImportMoo" value={form.ImportMoo} />
                                <InputField label="ตำบล/แขวง" name="ImportSubDistrict" value={form.ImportSubDistrict} />
                                <InputField label="อำเภอ/เขต" name="ImportDistrict" value={form.ImportDistrict} />
                                <InputField label="จังหวัด" name="ImportProvince" value={form.ImportProvince} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 4fr', gap: '14px' }}>
                                <InputField label="รหัสไปรษณีย์" name="ImportPostcode" value={form.ImportPostcode} />
                                <InputField label="โทรศัพท์" name="ImportPhone" value={form.ImportPhone} />
                                <div></div>
                            </div>
                        </div>

                        {/* ผู้ผลิตต่างประเทศ */}
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '20px', marginTop: '8px' }}>
                            <p style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: '700', color: colors.primaryDark }}>🌐 ข้อมูลผู้ผลิตต่างประเทศ</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <InputField label="ชื่อผู้ผลิตต่างประเทศ" name="ImportForeignMfgName" value={form.ImportForeignMfgName} />
                                <InputField label="ที่ตั้งสถานที่ผลิต" name="ImportForeignMfgAddress" value={form.ImportForeignMfgAddress} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Section 4: รายละเอียดผู้ผลิตอื่นที่เกี่ยวข้อง ── */}
            <div style={cardStyle}>
                <h4 style={sectionTitleStyle}>
                    <span style={{ background: colors.primary, color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>6</span>
                    รายละเอียดผู้ผลิตอื่นที่เกี่ยวข้อง
                </h4>

                {/* Table */}
                <div style={{ border: `1px solid ${colors.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                    {/* Table Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 50px', background: colors.primary, color: '#fff' }}>
                        <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700' }}>ชื่อและที่อยู่</div>
                        <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>เลขที่ใบอนุญาต (ถ้ามี)</div>
                        <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>หน้าที่รับผิดชอบในขั้นตอนการผลิต **</div>
                        <div style={{ padding: '12px 16px', borderLeft: '1px solid rgba(255,255,255,0.15)' }}></div>
                    </div>

                    {/* Table Rows */}
                    {(form.RelatedManufacturers || []).map((mfg, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 50px', borderTop: `1px solid ${colors.border}`, background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                            <div style={{ padding: '8px 12px' }}>
                                <input value={mfg.name} onChange={(e) => handleRelatedMfgChange(idx, 'name', e.target.value)}
                                    disabled={readOnly} placeholder="ชื่อ-ที่อยู่ผู้ผลิต"
                                    style={{ ...inputStyle, border: 'none', background: 'transparent', padding: '6px 4px' }} />
                            </div>
                            <div style={{ padding: '8px 12px', borderLeft: `1px solid ${colors.border}` }}>
                                <input value={mfg.licenseNo} onChange={(e) => handleRelatedMfgChange(idx, 'licenseNo', e.target.value)}
                                    disabled={readOnly} placeholder="เลขที่ใบอนุญาต"
                                    style={{ ...inputStyle, border: 'none', background: 'transparent', padding: '6px 4px' }} />
                            </div>
                            <div style={{ padding: '8px 12px', borderLeft: `1px solid ${colors.border}` }}>
                                <input value={mfg.responsibility} onChange={(e) => handleRelatedMfgChange(idx, 'responsibility', e.target.value)}
                                    disabled={readOnly} placeholder="เช่น การเตรียมผลิตภัณฑ์, การบรรจุ"
                                    style={{ ...inputStyle, border: 'none', background: 'transparent', padding: '6px 4px' }} />
                            </div>
                            <div style={{ padding: '8px 4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {!readOnly && (form.RelatedManufacturers || []).length > 1 && (
                                    <button type="button" onClick={() => removeRelatedMfg(idx)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="ลบแถวนี้">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add Row Button */}
                {!readOnly && (
                    <button type="button" onClick={addRelatedMfg}
                        style={{
                            marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                            border: `1px dashed ${colors.primary}`, background: colors.primaryLight,
                            color: colors.primary, cursor: 'pointer', transition: 'all 0.2s',
                        }}>
                        <Plus size={16} /> เพิ่มแถว
                    </button>
                )}

                <p style={{ marginTop: '12px', fontSize: '11.5px', color: colors.textMuted, lineHeight: '1.6', fontStyle: 'italic' }}>
                    ** ตัวอย่างเช่น การเตรียมผลิตภัณฑ์ที่สำเร็จรูป, การบรรจุผลิตภัณฑ์, การทำ granulation, ผู้ผลิต bulk finished dosage form เป็นต้น
                </p>
            </div>

            {/* ── Section 4: รายละเอียดของตำรับผลิตภัณฑ์สมุนไพร ── */}
            <div style={cardStyle}>
                <h4 style={sectionTitleStyle}>
                    <span style={{ background: colors.primary, color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>4</span>
                    รายละเอียดของตำรับผลิตภัณฑ์สมุนไพร
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginBottom: '20px' }}>
                    <InputField label="ชื่อภาษาไทย" name="ProductNameThai" value={form.ProductNameThai} />
                    <InputField label="ชื่อภาษาอังกฤษ (ถ้ามี)" name="ProductNameEng" value={form.ProductNameEng} />
                    <InputField label="ชื่อภาษาต่างประเทศอื่นๆ (ถ้ามี)" name="RecipeOtherName" value={form.RecipeOtherName} />
                    <InputField label="รูปแบบ" name="RecipeFormat" value={form.RecipeFormat} />
                    <InputField label="ในตำรับนี้ (ระบุปริมาณและหน่วยของผลิตภัณฑ์สำเร็จรูปต่อรุ่นการผลิต โดยแสดงเป็นระบบเมตริก)" name="RecipeQuantity" value={form.RecipeQuantity} />
                </div>

                {/* Table 1: Active Ingredients */}
                <div style={{ marginBottom: '24px' }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: colors.primaryDark }}>มีวัตถุอันเป็นส่วนประกอบ คือ</p>
                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1fr 50px', background: colors.primary, color: '#fff' }}>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700' }}>ชื่อภาษาไทย</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ชื่ออังกฤษ</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ชื่อวิทยาศาสตร์/ละติน</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ส่วนที่ใช้</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ปริมาณ</div>
                            <div style={{ padding: '12px 16px', borderLeft: '1px solid rgba(255,255,255,0.15)' }}></div>
                        </div>
                        {(form.RecipeActiveIngredients || []).map((row, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1fr 50px', borderTop: `1px solid ${colors.border}`, background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                <div style={{ padding: '4px' }}><input value={row.thaiName} onChange={(e) => handleActiveIngredientChange(idx, 'thaiName', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}` }}><input value={row.engName} onChange={(e) => handleActiveIngredientChange(idx, 'engName', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}` }}><input value={row.latinName} onChange={(e) => handleActiveIngredientChange(idx, 'latinName', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}` }}><input value={row.partUsed} onChange={(e) => handleActiveIngredientChange(idx, 'partUsed', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}` }}><input value={row.quantity} onChange={(e) => handleActiveIngredientChange(idx, 'quantity', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {!readOnly && (form.RecipeActiveIngredients || []).length > 1 && (
                                        <button type="button" onClick={() => removeActiveIngredient(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {!readOnly && (
                        <button type="button" onClick={addActiveIngredient} style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: `1px dashed ${colors.primary}`, background: colors.primaryLight, color: colors.primary, cursor: 'pointer' }}><Plus size={16} /> เพิ่มแถว</button>
                    )}
                </div>

                {/* Table 2: Extracts */}
                <div style={{ marginBottom: '24px' }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: colors.primaryDark }}>กรณีเป็นสารสกัด ให้แจ้งรายละเอียดในตารางข้างล่าง</p>
                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 1fr 50px', background: colors.primary, color: '#fff' }}>
                            <div style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '700' }}>ชื่อสารสกัด</div>
                            <div style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ชื่อวิทยาศาสตร์</div>
                            <div style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ส่วนที่ใช้</div>
                            <div style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ตัวทำละลาย</div>
                            <div style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>อัตราส่วน</div>
                            <div style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ปริมาณ</div>
                            <div style={{ padding: '12px 4px', borderLeft: '1px solid rgba(255,255,255,0.15)' }}></div>
                        </div>
                        {(form.RecipeExtracts || []).map((row, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 1fr 50px', borderTop: `1px solid ${colors.border}`, background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                <div style={{ padding: '4px' }}><input value={row.extractName} onChange={(e) => handleExtractChange(idx, 'extractName', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}` }}><input value={row.latinName} onChange={(e) => handleExtractChange(idx, 'latinName', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}` }}><input value={row.partUsed} onChange={(e) => handleExtractChange(idx, 'partUsed', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}` }}><input value={row.solvent} onChange={(e) => handleExtractChange(idx, 'solvent', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}` }}><input value={row.ratio} onChange={(e) => handleExtractChange(idx, 'ratio', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}` }}><input value={row.quantity} onChange={(e) => handleExtractChange(idx, 'quantity', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {!readOnly && (form.RecipeExtracts || []).length > 1 && (
                                        <button type="button" onClick={() => removeExtract(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {!readOnly && (
                        <button type="button" onClick={addExtract} style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: `1px dashed ${colors.primary}`, background: colors.primaryLight, color: colors.primary, cursor: 'pointer' }}><Plus size={16} /> เพิ่มแถว</button>
                    )}
                </div>

                {/* Table 3: Excipients */}
                <div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: colors.primaryDark }}>ชื่อสารช่วย</p>
                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 50px', background: colors.primary, color: '#fff' }}>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700' }}>ชื่อภาษาไทย/อังกฤษ</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>CAS number</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>หน้าที่</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ปริมาณ</div>
                            <div style={{ padding: '12px 16px', borderLeft: '1px solid rgba(255,255,255,0.15)' }}></div>
                        </div>
                        {(form.RecipeExcipients || []).map((row, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 50px', borderTop: `1px solid ${colors.border}`, background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                <div style={{ padding: '4px' }}><input value={row.name} onChange={(e) => handleExcipientChange(idx, 'name', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}` }}><input value={row.casNumber} onChange={(e) => handleExcipientChange(idx, 'casNumber', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}` }}><input value={row.function} onChange={(e) => handleExcipientChange(idx, 'function', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}` }}><input value={row.quantity} onChange={(e) => handleExcipientChange(idx, 'quantity', e.target.value)} disabled={readOnly} style={{ ...inputStyle, border: 'none', background: 'transparent' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {!readOnly && (form.RecipeExcipients || []).length > 1 && (
                                        <button type="button" onClick={() => removeExcipient(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {!readOnly && (
                        <button type="button" onClick={addExcipient} style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: `1px dashed ${colors.primary}`, background: colors.primaryLight, color: colors.primary, cursor: 'pointer' }}><Plus size={16} /> เพิ่มแถว</button>
                    )}
                </div>
            </div>

            {/* ── Section 5: รายละเอียดของผลิตภัณฑ์สมุนไพร ── */}
            <div style={cardStyle}>
                <h4 style={sectionTitleStyle}>
                    <span style={{ background: colors.primary, color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>5</span>
                    รายละเอียดของผลิตภัณฑ์สมุนไพร
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <TextAreaField label="ลักษณะ" name="ProductAppearance" value={form.ProductAppearance} rows={3} />
                    <TextAreaField label="ขนาดบรรจุ" name="ProductPackSize" value={form.ProductPackSize} rows={3} />
                    <TextAreaField label="กรรมวิธีการผลิต" name="ProductMfgProcess" value={form.ProductMfgProcess} rows={4} />
                    <TextAreaField label="สรรพคุณ/ข้อบ่งใช้/ ข้อความกล่าวอ้างทางสุขภาพ" name="ProductIndication" value={form.ProductIndication} rows={4} />
                    <TextAreaField label="ขนาดและวิธีการใช้" name="ProductDosage" value={form.ProductDosage} rows={3} />
                    <TextAreaField label="วิธีเตรียมก่อนรับประทาน" name="ProductPreparation" value={form.ProductPreparation} rows={3} />
                    <TextAreaField label="เงื่อนไขการรับประทาน" name="ProductCondition" value={form.ProductCondition} rows={3} />
                    <TextAreaField label="การเก็บรักษา / อายุการเก็บรักษา" name="ProductStorage" value={form.ProductStorage} rows={3} />
                    <TextAreaField label="ข้อห้ามใช้" name="ProductContraindication" value={form.ProductContraindication} rows={3} />
                    <TextAreaField label="คำเตือน" name="ProductWarning" value={form.ProductWarning} rows={3} />
                    <TextAreaField label="ข้อควรระวัง" name="ProductPrecaution" value={form.ProductPrecaution} rows={3} />
                    <TextAreaField label="อาการไม่พึงประสงค์" name="ProductAdverseReaction" value={form.ProductAdverseReaction} rows={3} />
                    
                    {/* Sales Channel */}
                    <div style={{ width: '100%', marginBottom: '14px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                        <label style={{ ...labelStyle, fontSize: '13.5px', marginBottom: '12px' }}>ช่องทางการขาย (สำหรับเจ้าหน้าที่กรอก)</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: readOnly ? 'default' : 'pointer' }}>
                                <input type="radio" name="SalesChannel" value="ผลิตภัณฑ์สมุนไพรขายทั่วไป" checked={form.SalesChannel === 'ผลิตภัณฑ์สมุนไพรขายทั่วไป'} onChange={handleChange} disabled={readOnly} style={{ width: '16px', height: '16px', cursor: readOnly ? 'default' : 'pointer' }} />
                                <span style={{ fontSize: '13px', color: colors.text }}>ผลิตภัณฑ์สมุนไพรขายทั่วไป</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: readOnly ? 'default' : 'pointer' }}>
                                <input type="radio" name="SalesChannel" value="ผลิตภัณฑ์ขายในสถานที่ใบอนุญาต" checked={form.SalesChannel === 'ผลิตภัณฑ์ขายในสถานที่ใบอนุญาต'} onChange={handleChange} disabled={readOnly} style={{ width: '16px', height: '16px', cursor: readOnly ? 'default' : 'pointer' }} />
                                <span style={{ fontSize: '13px', color: colors.text }}>ผลิตภัณฑ์ขายในสถานที่ใบอนุญาต</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: readOnly ? 'default' : 'pointer' }}>
                                <input type="radio" name="SalesChannel" value="ผลิตภัณฑ์ใช้เฉพาะสถานพยาบาล" checked={form.SalesChannel === 'ผลิตภัณฑ์ใช้เฉพาะสถานพยาบาล'} onChange={handleChange} disabled={readOnly} style={{ width: '16px', height: '16px', cursor: readOnly ? 'default' : 'pointer' }} />
                                <span style={{ fontSize: '13px', color: colors.text }}>ผลิตภัณฑ์ใช้เฉพาะสถานพยาบาล</span>
                            </label>
                        </div>
                    </div>

                    <TextAreaField label="บทสรุป ด้านคุณภาพ ความปลอดภัย และประสิทธิภาพ" name="ProductSummary" value={form.ProductSummary} rows={4} />
                </div>
            </div>

            {/* Inline animation keyframes */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
});

export default TorBor1Form;

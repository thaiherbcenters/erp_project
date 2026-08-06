import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { useAlert } from './CustomAlert';
import { FileText, User, Building2, Globe, Check, ChevronRight, Plus, Trash2, Factory, Ship, Database, X, AlignLeft, AlignCenter, AlignRight, Save, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import { TipTapCell } from './TipTapCell';
import API_BASE from '../config';
import './PowerOfAttorneyForm.css';
import NameInputWithTitle from './NameInputWithTitle';
import IdCardInput from './IdCardInput';
import CustomDatePicker from './CustomDatePicker';

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
        // ── สำหรับเจ้าหน้าที่ (Official Use)
        ReceiptNo: '',
        ReceiptDate: '',
        ReceiverName: '',

        documentId: null,
        DocumentDate: new Date().toISOString().split('T')[0],
        // ๑. ประเภทคำขอ
        ReqMedicineFromHerb: false,
        ReqMedType: '',
        ReqMedTypeOther: '',
        ReqHealthProduct: false,
        TypeProduce: false,
        TypeImport: false,
        TypeExportOnly: false,
        ProductNameThai: '',
        ProductNameEng: '',
        ApplicantType: '',
        AppJuristicRepName: '', AppJuristicRepAge: '', AppJuristicRepNationality: '', AppJuristicRepCitizenID: '',
        AppForeignPassportNo: '', AppForeignPassportExpiry: '',
        AppForeignResCertNo: '', AppForeignResCertDate: '',
        AppForeignWorkPermitNo: '', AppForeignWorkPermitExpiry: '',
        
        AppForeignBizLicenseNo: '', AppForeignBizLicenseDate: '',
        AppForeignBizCertNo: '', AppForeignBizCertDate: '',

        // ๓. ข้อมูลสถานที่ผลิต หรือนำเข้า
        ProductionType: 'ผลิตในประเทศ', // 'ผลิตในประเทศ', 'นำเข้า'

        // กรณีผลิตในประเทศ
        ProdLicenseeName: 'นายธวัช จรุงพิรวงศ์', ProdLicenseNo: 'HB 12-1-67-1',
        ProdOperatorName: '-', ProdPlaceName: 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์',
        ProdAddressNo: '6/8', ProdSoi: '-', ProdRoad: '-', ProdMoo: '2', ProdSubDistrict: 'ไทรม้า',
        ProdDistrict: 'เมืองนนทบุรี', ProdProvince: 'นนทบุรี', ProdPostcode: '11000', ProdPhone: '0839799389',

        // กรณีแบ่งบรรจุ
        RepackRegNo: '-',

        // กรณีนำเข้า
        ImportLicenseeName: '', ImportLicenseNo: '',
        ImportOperatorName: '', ImportPlaceName: '',
        ImportAddressNo: '', ImportSoi: '', ImportRoad: '',
        ImportMoo: '', ImportSubDistrict: '', ImportDistrict: '', ImportProvince: '',
        ImportPostcode: '', ImportPhone: '',
        ImportForeignMfgName: '', ImportForeignMfgAddress: '',

        // ๔. รายละเอียดผู้ผลิตอื่นที่เกี่ยวข้อง (Stored as JSON string)
        RelatedManufacturers: [],

        // ๔ (ต่อ). รายละเอียดของตำรับผลิตภัณฑ์สมุนไพร
        RecipeOtherName: '', RecipeFormat: '', RecipeQuantity: '',
        RecipeActiveIngredients: [],
        RecipeExtracts: [],
        RecipeExcipients: [],

        // ๕. รายละเอียดของผลิตภัณฑ์สมุนไพร
        ProductAppearance: '', ProductPackSize: '', ProductMfgProcess: '', ProductIndication: '',
        ProductDosage: '', ProductPreparation: '', ProductCondition: '', ProductStorage: '',
        ProductContraindication: '', ProductWarning: '', ProductPrecaution: '', ProductAdverseReaction: '',
        SalesChannel: '', ProductSummary: '', CustomProductDetails: [],
        Section5FieldOrder: [
            { type: 'standard', key: 'ProductAppearance' }, { type: 'standard', key: 'ProductPackSize' },
            { type: 'standard', key: 'ProductMfgProcess' }, { type: 'standard', key: 'ProductIndication' },
            { type: 'standard', key: 'ProductDosage' }, { type: 'standard', key: 'ProductPreparation' },
            { type: 'standard', key: 'ProductCondition' }, { type: 'standard', key: 'ProductStorage' },
            { type: 'standard', key: 'ProductContraindication' }, { type: 'standard', key: 'ProductWarning' },
            { type: 'standard', key: 'ProductPrecaution' }, { type: 'standard', key: 'ProductAdverseReaction' }
        ],
        AttachedDocuments: {
            doc1: false, doc2: false, doc3: false, doc4: false, doc5: false,
            doc6_1: false, doc6_2: false, doc6_3: false, doc6_4: false, doc6_5: false, doc6_6: false,
            doc7: false, doc8: false, doc9: false
        }
    });

    const [formulas, setFormulas] = useState([]);
    const [showFormulaModal, setShowFormulaModal] = useState(false);
    const [currentDocId, setCurrentDocId] = useState(documentId);
    const [linkedFormulaId, setLinkedFormulaId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasFormatChanges, setHasFormatChanges] = useState(false);
    const [draggedSection5Idx, setDraggedSection5Idx] = useState(null);

    // Fetch saved data when editing
    useEffect(() => {
        if (!documentId) return;
        setCurrentDocId(documentId);
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_BASE}/torbor1-documents/${documentId}`);
                const json = await res.json();
                if (json.success && json.data) {
                    const d = json.data;
                    if (d.FormulaID) setLinkedFormulaId(d.FormulaID);
                    
                    // Backwards compatibility migration for Section5FieldOrder
                    let order = d.Section5FieldOrder;
                    if (!order || order.length === 0) {
                        order = [
                            { type: 'standard', key: 'ProductAppearance' }, { type: 'standard', key: 'ProductPackSize' },
                            { type: 'standard', key: 'ProductMfgProcess' }, { type: 'standard', key: 'ProductIndication' },
                            { type: 'standard', key: 'ProductDosage' }, { type: 'standard', key: 'ProductPreparation' },
                            { type: 'standard', key: 'ProductCondition' }, { type: 'standard', key: 'ProductStorage' },
                            { type: 'standard', key: 'ProductContraindication' }, { type: 'standard', key: 'ProductWarning' },
                            { type: 'standard', key: 'ProductPrecaution' }, { type: 'standard', key: 'ProductAdverseReaction' }
                        ];
                        if (d.CustomProductDetails && d.CustomProductDetails.length > 0) {
                            d.CustomProductDetails.forEach(c => {
                                order.push({ type: 'custom', title: c.title, content: c.content, id: c.id || Date.now().toString() + Math.random().toString(36).substr(2, 5) });
                            });
                        }
                    }

                    setForm(prev => ({
                        ...prev,
                        ...d,
                        Section5FieldOrder: order,
                        ReceiptNo: d.ReceiptNo || prev.ReceiptNo,
                        ReceiptDate: d.ReceiptDate ? new Date(d.ReceiptDate).toISOString().split('T')[0] : prev.ReceiptDate,
                        ReceiverName: d.ReceiverName || prev.ReceiverName,
                        DocumentDate: d.DocumentDate ? new Date(d.DocumentDate).toISOString().split('T')[0] : prev.DocumentDate,
                        ReqMedicineFromHerb: d.ReqMedicineFromHerb !== undefined ? Boolean(d.ReqMedicineFromHerb) : prev.ReqMedicineFromHerb,
                        ReqMedType: d.ReqMedType || prev.ReqMedType,
                        ReqMedTypeOther: d.ReqMedTypeOther || prev.ReqMedTypeOther,
                        ReqHealthProduct: d.ReqHealthProduct !== undefined ? Boolean(d.ReqHealthProduct) : prev.ReqHealthProduct,
                        TypeProduce: d.TypeProduce !== undefined ? Boolean(d.TypeProduce) : prev.TypeProduce,
                        TypeImport: d.TypeImport !== undefined ? Boolean(d.TypeImport) : prev.TypeImport,
                        TypeExportOnly: d.TypeExportOnly !== undefined ? Boolean(d.TypeExportOnly) : prev.TypeExportOnly,
                        ProductNameThai: d.ProductNameThai || prev.ProductNameThai,
                        ProductNameEng: d.ProductNameEng || prev.ProductNameEng,
                        ApplicantType: d.ApplicantType || prev.ApplicantType,
                        AppNaturalName: d.AppNaturalName || prev.AppNaturalName,
                        AppNaturalAge: d.AppNaturalAge || prev.AppNaturalAge,
                        AppNaturalNationality: d.AppNaturalNationality || prev.AppNaturalNationality,
                        AppNaturalCitizenID: d.AppNaturalCitizenID || prev.AppNaturalCitizenID,
                        AppNaturalAddressNo: d.AppNaturalAddressNo || prev.AppNaturalAddressNo,
                        AppNaturalBuilding: d.AppNaturalBuilding || prev.AppNaturalBuilding,
                        AppNaturalMoo: d.AppNaturalMoo || prev.AppNaturalMoo,
                        AppNaturalSoi: d.AppNaturalSoi || prev.AppNaturalSoi,
                        AppNaturalRoad: d.AppNaturalRoad || prev.AppNaturalRoad,
                        AppNaturalSubDistrict: d.AppNaturalSubDistrict || prev.AppNaturalSubDistrict,
                        AppNaturalDistrict: d.AppNaturalDistrict || prev.AppNaturalDistrict,
                        AppNaturalProvince: d.AppNaturalProvince || prev.AppNaturalProvince,
                        AppNaturalPostcode: d.AppNaturalPostcode || prev.AppNaturalPostcode,
                        AppNaturalFax: d.AppNaturalFax || prev.AppNaturalFax,
                        AppNaturalPhone: d.AppNaturalPhone || prev.AppNaturalPhone,
                        AppNaturalEmail: d.AppNaturalEmail || prev.AppNaturalEmail,
                        AppJuristicName: d.AppJuristicName || prev.AppJuristicName,
                        AppJuristicID: d.AppJuristicID || prev.AppJuristicID,
                        AppJuristicAddressNo: d.AppJuristicAddressNo || prev.AppJuristicAddressNo,
                        AppJuristicBuilding: d.AppJuristicBuilding || prev.AppJuristicBuilding,
                        AppJuristicMoo: d.AppJuristicMoo || prev.AppJuristicMoo,
                        AppJuristicSoi: d.AppJuristicSoi || prev.AppJuristicSoi,
                        AppJuristicRoad: d.AppJuristicRoad || prev.AppJuristicRoad,
                        AppJuristicSubDistrict: d.AppJuristicSubDistrict || prev.AppJuristicSubDistrict,
                        AppJuristicDistrict: d.AppJuristicDistrict || prev.AppJuristicDistrict,
                        AppJuristicProvince: d.AppJuristicProvince || prev.AppJuristicProvince,
                        AppJuristicPostcode: d.AppJuristicPostcode || prev.AppJuristicPostcode,
                        AppJuristicFax: d.AppJuristicFax || prev.AppJuristicFax,
                        AppJuristicPhone: d.AppJuristicPhone || prev.AppJuristicPhone,
                        AppJuristicEmail: d.AppJuristicEmail || prev.AppJuristicEmail,
                        AppJuristicRepName: d.AppJuristicRepName || prev.AppJuristicRepName,
                        AppJuristicRepAge: d.AppJuristicRepAge || prev.AppJuristicRepAge,
                        AppJuristicRepNationality: d.AppJuristicRepNationality || prev.AppJuristicRepNationality,
                        AppJuristicRepCitizenID: d.AppJuristicRepCitizenID || prev.AppJuristicRepCitizenID,
                        AppForeignPassportNo: d.AppForeignPassportNo || prev.AppForeignPassportNo,
                        AppForeignPassportExpiry: d.AppForeignPassportExpiry ? new Date(d.AppForeignPassportExpiry).toISOString().split('T')[0] : prev.AppForeignPassportExpiry,
                        AppForeignResCertNo: d.AppForeignResCertNo || prev.AppForeignResCertNo,
                        AppForeignResCertDate: d.AppForeignResCertDate ? new Date(d.AppForeignResCertDate).toISOString().split('T')[0] : prev.AppForeignResCertDate,
                        AppForeignWorkPermitNo: d.AppForeignWorkPermitNo || prev.AppForeignWorkPermitNo,
                        AppForeignWorkPermitExpiry: d.AppForeignWorkPermitExpiry ? new Date(d.AppForeignWorkPermitExpiry).toISOString().split('T')[0] : prev.AppForeignWorkPermitExpiry,
                        AppForeignBizLicenseNo: d.AppForeignBizLicenseNo || prev.AppForeignBizLicenseNo,
                        AppForeignBizLicenseDate: d.AppForeignBizLicenseDate ? new Date(d.AppForeignBizLicenseDate).toISOString().split('T')[0] : prev.AppForeignBizLicenseDate,
                        AppForeignBizCertNo: d.AppForeignBizCertNo || prev.AppForeignBizCertNo,
                        AppForeignBizCertDate: d.AppForeignBizCertDate ? new Date(d.AppForeignBizCertDate).toISOString().split('T')[0] : prev.AppForeignBizCertDate,
                        ProductionType: d.ProductionType || prev.ProductionType,
                        ProdLicenseeName: d.ProdLicenseeName || prev.ProdLicenseeName,
                        ProdLicenseNo: d.ProdLicenseNo || prev.ProdLicenseNo,
                        ProdOperatorName: d.ProdOperatorName || prev.ProdOperatorName,
                        ProdPlaceName: d.ProdPlaceName || prev.ProdPlaceName,
                        ProdAddressNo: d.ProdAddressNo || prev.ProdAddressNo,
                        ProdSoi: d.ProdSoi || prev.ProdSoi,
                        ProdRoad: d.ProdRoad || prev.ProdRoad,
                        ProdMoo: d.ProdMoo || prev.ProdMoo,
                        ProdSubDistrict: d.ProdSubDistrict || prev.ProdSubDistrict,
                        ProdDistrict: d.ProdDistrict || prev.ProdDistrict,
                        ProdProvince: d.ProdProvince || prev.ProdProvince,
                        ProdPostcode: d.ProdPostcode || prev.ProdPostcode,
                        ProdPhone: d.ProdPhone || prev.ProdPhone,
                        RepackRegNo: d.RepackRegNo || prev.RepackRegNo,
                        ImportLicenseeName: d.ImportLicenseeName || prev.ImportLicenseeName,
                        ImportLicenseNo: d.ImportLicenseNo || prev.ImportLicenseNo,
                        ImportOperatorName: d.ImportOperatorName || prev.ImportOperatorName,
                        ImportPlaceName: d.ImportPlaceName || prev.ImportPlaceName,
                        ImportAddressNo: d.ImportAddressNo || prev.ImportAddressNo,
                        ImportSoi: d.ImportSoi || prev.ImportSoi,
                        ImportRoad: d.ImportRoad || prev.ImportRoad,
                        ImportMoo: d.ImportMoo || prev.ImportMoo,
                        ImportSubDistrict: d.ImportSubDistrict || prev.ImportSubDistrict,
                        ImportDistrict: d.ImportDistrict || prev.ImportDistrict,
                        ImportProvince: d.ImportProvince || prev.ImportProvince,
                        ImportPostcode: d.ImportPostcode || prev.ImportPostcode,
                        ImportPhone: d.ImportPhone || prev.ImportPhone,
                        ImportForeignMfgName: d.ImportForeignMfgName || prev.ImportForeignMfgName,
                        ImportForeignMfgAddress: d.ImportForeignMfgAddress || prev.ImportForeignMfgAddress,
                        RelatedManufacturers: d.RelatedManufacturers || prev.RelatedManufacturers,
                        RecipeOtherName: d.RecipeOtherName || prev.RecipeOtherName,
                        RecipeFormat: d.RecipeFormat || prev.RecipeFormat,
                        RecipeQuantity: d.RecipeQuantity || prev.RecipeQuantity,
                        RecipeActiveIngredients: d.RecipeActiveIngredients || prev.RecipeActiveIngredients,
                        RecipeExtracts: d.RecipeExtracts || prev.RecipeExtracts,
                        RecipeExcipients: d.RecipeExcipients || prev.RecipeExcipients,
                        ProductAppearance: d.ProductAppearance || prev.ProductAppearance,
                        ProductPackSize: d.ProductPackSize || prev.ProductPackSize,
                        ProductMfgProcess: d.ProductMfgProcess || prev.ProductMfgProcess,
                        ProductIndication: d.ProductIndication || prev.ProductIndication,
                        ProductDosage: d.ProductDosage || prev.ProductDosage,
                        ProductPreparation: d.ProductPreparation || prev.ProductPreparation,
                        ProductCondition: d.ProductCondition || prev.ProductCondition,
                        ProductStorage: d.ProductStorage || prev.ProductStorage,
                        ProductContraindication: d.ProductContraindication || prev.ProductContraindication,
                        ProductWarning: d.ProductWarning || prev.ProductWarning,
                        ProductPrecaution: d.ProductPrecaution || prev.ProductPrecaution,
                        ProductAdverseReaction: d.ProductAdverseReaction || prev.ProductAdverseReaction,
                        SalesChannel: d.SalesChannel || prev.SalesChannel,
                        ProductSummary: d.ProductSummary || prev.ProductSummary,
                        AttachedDocuments: d.AttachedDocuments || prev.AttachedDocuments,
                    }));
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };
        fetchData();
    }, [documentId]);

    // Sync shared form data
    useEffect(() => {
        if (sharedFormData?.productName) {
            setForm(prev => {
                if (prev.ProductNameThai !== sharedFormData.productName) {
                    return { ...prev, ProductNameThai: sharedFormData.productName };
                }
                return prev;
            });
        }
    }, [sharedFormData?.productName]);

    useEffect(() => {
        fetch(`${API_BASE}/rnd/formulas`)
            .then(res => res.json())
            .then(data => setFormulas(data))
            .catch(err => console.error("Error fetching formulas:", err));
    }, []);

    const handleSelectFormula = (formula) => {
        if (!formula || !formula.ingredients) return;
        
        setLinkedFormulaId(formula.id);
        setHasFormatChanges(false);
        
        const active = [];
        const extract = [];
        const inactive = [];
        
        formula.ingredients.forEach(ing => {
            const ingredientData = {
                thaiName: ing.name || '',
                engName: ing.engName || '',
                latinName: ing.latinName || '',
                partUsed: ing.partUsed || '',
                quantity: (ing.qty || '') + (ing.unit ? ' ' + ing.unit : '')
            };
            
            if (ing.type === 'active') {
                active.push(ingredientData);
            } else if (ing.type === 'extract') {
                extract.push({
                    extractName: ing.name || '',
                    latinName: ing.latinName || '',
                    partUsed: ing.partUsed || '',
                    solvent: '',
                    ratio: '',
                    quantity: (ing.qty || '') + (ing.unit ? ' ' + ing.unit : '')
                });
            } else if (ing.type === 'inactive') {
                inactive.push({
                    name: ing.name || '',
                    casNumber: '',
                    function: '',
                    quantity: (ing.qty || '') + (ing.unit ? ' ' + ing.unit : '')
                });
            }
        });
        
        let instructions = {};
        if (formula.instructions) {
            if (Array.isArray(formula.instructions) && formula.instructions.length === 0) {
                // Ignore empty array which is the default for old formulas
            } else if (typeof formula.instructions === 'object') {
                instructions = formula.instructions;
            }
        }
        
        const hasInstructions = Object.keys(instructions).length > 0;
        
        setForm(prev => {
            const nextState = {
                ...prev,
                // Map product details if they exist in instructions
                ProductAppearance: hasInstructions ? (instructions.ProductAppearance || '') : '',
                ProductPackSize: hasInstructions ? (instructions.ProductPackSize || '') : '',
                ProductMfgProcess: hasInstructions ? (instructions.ProductMfgProcess || '') : '',
                ProductIndication: hasInstructions ? (instructions.ProductIndication || '') : '',
                ProductDosage: hasInstructions ? (instructions.ProductDosage || '') : '',
                ProductPreparation: hasInstructions ? (instructions.ProductPreparation || '') : '',
                ProductCondition: hasInstructions ? (instructions.ProductCondition || '') : '',
                ProductStorage: hasInstructions ? (instructions.ProductStorage || '') : '',
                ProductContraindication: hasInstructions ? (instructions.ProductContraindication || '') : '',
                ProductWarning: hasInstructions ? (instructions.ProductWarning || '') : '',
                ProductPrecaution: hasInstructions ? (instructions.ProductPrecaution || '') : '',
                ProductAdverseReaction: hasInstructions ? (instructions.ProductAdverseReaction || '') : '',
                SalesChannel: hasInstructions ? (instructions.SalesChannel || '') : '',
                ProductSummary: hasInstructions ? (instructions.ProductSummary || '') : ''
            };
            
            if (formula.torbor1Format) {
                if (formula.torbor1Format.RecipeActiveIngredients) {
                    nextState.RecipeActiveIngredients = formula.torbor1Format.RecipeActiveIngredients;
                    nextState.RecipeExtracts = formula.torbor1Format.RecipeExtracts || [];
                    nextState.RecipeExcipients = formula.torbor1Format.RecipeExcipients || [];
                }
                
                // Override text fields if they exist in torbor1Format
                const fieldsToOverride = ['ProductAppearance', 'ProductPackSize', 'ProductMfgProcess', 'ProductIndication', 'ProductDosage', 'ProductPreparation', 'ProductCondition', 'ProductStorage', 'ProductContraindication', 'ProductWarning', 'ProductPrecaution', 'ProductAdverseReaction'];
                fieldsToOverride.forEach(f => {
                    if (formula.torbor1Format[f] !== undefined) {
                        nextState[f] = formula.torbor1Format[f];
                    }
                });
                if (formula.torbor1Format.Section5FieldOrder) {
                    nextState.Section5FieldOrder = formula.torbor1Format.Section5FieldOrder;
                } else if (formula.torbor1Format.CustomProductDetails && formula.torbor1Format.CustomProductDetails.length > 0) {
                    // Backwards compatibility migration
                    const newOrder = [...nextState.Section5FieldOrder];
                    formula.torbor1Format.CustomProductDetails.forEach(c => {
                        newOrder.push({ type: 'custom', title: c.title, content: c.content, id: c.id || Date.now().toString() });
                    });
                    nextState.Section5FieldOrder = newOrder;
                }
            }
            
            if (!formula.torbor1Format || !formula.torbor1Format.RecipeActiveIngredients) {
                nextState.RecipeActiveIngredients = active.length > 0 ? active : [{ thaiName: '', engName: '', latinName: '', partUsed: '', quantity: '' }];
                nextState.RecipeExtracts = extract.length > 0 ? extract : [{ extractName: '', latinName: '', partUsed: '', solvent: '', ratio: '', quantity: '' }];
                nextState.RecipeExcipients = inactive.length > 0 ? inactive : [{ name: '', casNumber: '', function: '', quantity: '' }];
            }
            if (!formula.torbor1Format || (!formula.torbor1Format.Section5FieldOrder && !(formula.torbor1Format.CustomProductDetails && formula.torbor1Format.CustomProductDetails.length > 0))) {
                nextState.Section5FieldOrder = [
                    { type: 'standard', key: 'ProductAppearance' }, { type: 'standard', key: 'ProductPackSize' },
                    { type: 'standard', key: 'ProductMfgProcess' }, { type: 'standard', key: 'ProductIndication' },
                    { type: 'standard', key: 'ProductDosage' }, { type: 'standard', key: 'ProductPreparation' },
                    { type: 'standard', key: 'ProductCondition' }, { type: 'standard', key: 'ProductStorage' },
                    { type: 'standard', key: 'ProductContraindication' }, { type: 'standard', key: 'ProductWarning' },
                    { type: 'standard', key: 'ProductPrecaution' }, { type: 'standard', key: 'ProductAdverseReaction' }
                ];
            }
            return nextState;
        });
        
        setShowFormulaModal(false);
        if (formula.torbor1Format) {
            showAlert('success', 'ดึงข้อมูลสูตรตำรับสำเร็จ (โหลดรูปแบบตารางที่เคยบันทึกไว้)');
        } else {
            showAlert('success', 'ดึงข้อมูลสูตรตำรับสำเร็จ');
        }
    };

    const handleSaveFormulaFormat = async () => {
        if (!linkedFormulaId) return;
        try {
            const torbor1Format = {
                RecipeActiveIngredients: form.RecipeActiveIngredients,
                RecipeExtracts: form.RecipeExtracts,
                RecipeExcipients: form.RecipeExcipients,
                ProductAppearance: form.ProductAppearance,
                ProductPackSize: form.ProductPackSize,
                ProductMfgProcess: form.ProductMfgProcess,
                ProductIndication: form.ProductIndication,
                ProductDosage: form.ProductDosage,
                ProductPreparation: form.ProductPreparation,
                ProductCondition: form.ProductCondition,
                ProductStorage: form.ProductStorage,
                ProductContraindication: form.ProductContraindication,
                ProductWarning: form.ProductWarning,
                ProductPrecaution: form.ProductPrecaution,
                ProductAdverseReaction: form.ProductAdverseReaction,
                CustomProductDetails: form.CustomProductDetails,
                Section5FieldOrder: form.Section5FieldOrder
            };
            
            const res = await fetch(`${API_BASE}/rnd/formulas/${linkedFormulaId}/torbor1-format`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ torbor1Format })
            });
            const data = await res.json();
            if (data.success) {
                showAlert('success', 'บันทึกรูปแบบตารางกลับไปยังสูตรหลักสำเร็จแล้ว');
                setHasFormatChanges(false);
                
                // Update the local formulas state so re-selecting uses the new format
                setFormulas(prev => prev.map(f => {
                    if (f.id === linkedFormulaId || f.FormulaID === linkedFormulaId) {
                        return { ...f, torbor1Format };
                    }
                    return f;
                }));
            } else {
                showAlert('error', 'เกิดข้อผิดพลาดในการบันทึกรูปแบบตาราง');
            }
        } catch (err) {
            console.error('Error saving formula format:', err);
            showAlert('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            setForm(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const handleChange = useCallback((e) => {
        if (readOnly) return;
        const { name, value, type, checked } = e.target;
        
        setForm(prev => {
            const nextForm = { ...prev, [name]: type === 'checkbox' ? checked : value };
            
            if (name === 'ApplicantType') {
                // Clear all section 4 fields to avoid saving mixed data
                nextForm.AppNaturalName = ''; nextForm.AppNaturalAge = ''; nextForm.AppNaturalNationality = ''; nextForm.AppNaturalCitizenID = '';
                nextForm.AppNaturalAddressNo = ''; nextForm.AppNaturalBuilding = ''; nextForm.AppNaturalMoo = ''; nextForm.AppNaturalSoi = '';
                nextForm.AppNaturalRoad = ''; nextForm.AppNaturalSubDistrict = ''; nextForm.AppNaturalDistrict = ''; nextForm.AppNaturalProvince = '';
                nextForm.AppNaturalPostcode = ''; nextForm.AppNaturalPhone = ''; nextForm.AppNaturalFax = ''; nextForm.AppNaturalEmail = '';
                
                nextForm.AppJuristicName = ''; nextForm.AppJuristicID = ''; nextForm.AppJuristicAddressNo = ''; nextForm.AppJuristicBuilding = '';
                nextForm.AppJuristicMoo = ''; nextForm.AppJuristicSoi = ''; nextForm.AppJuristicRoad = ''; nextForm.AppJuristicSubDistrict = '';
                nextForm.AppJuristicDistrict = ''; nextForm.AppJuristicProvince = ''; nextForm.AppJuristicPostcode = ''; nextForm.AppJuristicPhone = '';
                nextForm.AppJuristicFax = ''; nextForm.AppJuristicEmail = '';
                nextForm.AppJuristicRepName = ''; nextForm.AppJuristicRepAge = ''; nextForm.AppJuristicRepNationality = ''; nextForm.AppJuristicRepCitizenID = '';

                // If customer data is available, populate it into the newly selected type
                if (customerData && !documentId) {
                    const customerAddress = customerData.Address || '';
                    const customerTaxId = customerData.TaxID || customerData.IDCard || '';
                    const customerName = customerData.CustomerName || '';
                    const customerPhone = customerData.Phone || '';
                    const customerEmail = customerData.Email || '';
                    
                    const parseAddress = (addr) => {
                        if (!addr) return { no: '-', moo: '-', soi: '-', road: '-', subDistrict: '-', district: '-', province: '-', zip: '-' };
                        let remaining = addr.trim();
                        let no = '-', moo = '-', soi = '-', road = '-', subDistrict = '-', district = '-', province = '-', zip = '-';

                        const zipMatch = remaining.match(/\s?(\d{5})$/);
                        if (zipMatch) { zip = zipMatch[1]; remaining = remaining.replace(/\s?\d{5}$/, '').trim(); }

                        const provMatch = remaining.match(/(?:จ\.|จังหวัด)\s*([^\s]+)/);
                        if (provMatch) { province = provMatch[1]; remaining = remaining.replace(/(?:จ\.|จังหวัด)\s*[^\s]+/, '').trim(); }

                        const distMatch = remaining.match(/(?:อ\.|อำเภอ|เขต)\s*([^\s]+)/);
                        if (distMatch) { district = distMatch[1]; remaining = remaining.replace(/(?:อ\.|อำเภอ|เขต)\s*[^\s]+/, '').trim(); }

                        const subMatch = remaining.match(/(?:ต\.|ตำบล|แขวง)\s*([^\s]+)/);
                        if (subMatch) { subDistrict = subMatch[1]; remaining = remaining.replace(/(?:ต\.|ตำบล|แขวง)\s*[^\s]+/, '').trim(); }

                        const roadMatch = remaining.match(/(?:ถ\.|ถนน)\s*([^\s]+)/);
                        if (roadMatch) { road = roadMatch[1]; remaining = remaining.replace(/(?:ถ\.|ถนน)\s*[^\s]+/, '').trim(); }

                        const soiMatch = remaining.match(/(?:ซ\.|ซอย)\s*([^\s]+)/);
                        if (soiMatch) { soi = soiMatch[1]; remaining = remaining.replace(/(?:ซ\.|ซอย)\s*[^\s]+/, '').trim(); }

                        const mooMatch = remaining.match(/(?:ม\.|หมู่|หมู่ที่)\s*([0-9]+)/);
                        if (mooMatch) { moo = mooMatch[1]; remaining = remaining.replace(/(?:ม\.|หมู่|หมู่ที่)\s*[0-9]+/, '').trim(); }

                        remaining = remaining.replace(/เลขที่\s*/, '').trim();
                        no = remaining || '-';
                        
                        return { no, moo, soi, road, subDistrict, district, province, zip, building: '-' }; // added building for TorBor1
                    };
                    const addr = parseAddress(customerAddress);
                    
                    const fallback = (val) => val ? val : '-';

                    if (value === 'บุคคลธรรมดา') {
                        nextForm.AppNaturalName = fallback(customerName);
                        nextForm.AppNaturalCitizenID = customerTaxId;
                        nextForm.AppNaturalAddressNo = addr.no;
                        nextForm.AppNaturalBuilding = addr.building;
                        nextForm.AppNaturalMoo = addr.moo;
                        nextForm.AppNaturalSoi = addr.soi;
                        nextForm.AppNaturalRoad = addr.road;
                        nextForm.AppNaturalSubDistrict = addr.subDistrict;
                        nextForm.AppNaturalDistrict = addr.district;
                        nextForm.AppNaturalProvince = addr.province;
                        nextForm.AppNaturalPostcode = addr.zip === '-' ? '' : addr.zip; // Zip is better left empty if none
                        nextForm.AppNaturalPhone = fallback(customerPhone);
                        nextForm.AppNaturalEmail = fallback(customerEmail);
                        nextForm.AppNaturalFax = '-'; // usually not in CRM, fallback
                    } else if (value === 'นิติบุคคล') {
                        nextForm.AppJuristicName = fallback(customerName);
                        nextForm.AppJuristicID = customerTaxId;
                        nextForm.AppJuristicAddressNo = addr.no;
                        nextForm.AppJuristicBuilding = addr.building;
                        nextForm.AppJuristicMoo = addr.moo;
                        nextForm.AppJuristicSoi = addr.soi;
                        nextForm.AppJuristicRoad = addr.road;
                        nextForm.AppJuristicSubDistrict = addr.subDistrict;
                        nextForm.AppJuristicDistrict = addr.district;
                        nextForm.AppJuristicProvince = addr.province;
                        nextForm.AppJuristicPostcode = addr.zip === '-' ? '' : addr.zip;
                        nextForm.AppJuristicPhone = fallback(customerPhone);
                        nextForm.AppJuristicEmail = fallback(customerEmail);
                        nextForm.AppJuristicFax = '-';
                    }
                }
            }
            if (name === 'ProductionType') {
                if (value === 'ผลิตในประเทศ') {
                    // Clear Import fields
                    nextForm.ImportLicenseeName = ''; nextForm.ImportLicenseNo = '';
                    nextForm.ImportOperatorName = ''; nextForm.ImportPlaceName = '';
                    nextForm.ImportAddressNo = ''; nextForm.ImportSoi = ''; nextForm.ImportRoad = '';
                    nextForm.ImportMoo = ''; nextForm.ImportSubDistrict = ''; nextForm.ImportDistrict = ''; nextForm.ImportProvince = '';
                    nextForm.ImportPostcode = ''; nextForm.ImportPhone = '';
                    nextForm.ImportForeignMfgName = ''; nextForm.ImportForeignMfgAddress = '';
                    
                    // Restore Prod defaults if empty
                    nextForm.ProdLicenseeName = nextForm.ProdLicenseeName || 'นายธวัช จรุงพิรวงศ์';
                    nextForm.ProdLicenseNo = nextForm.ProdLicenseNo || 'HB 12-1-67-1';
                    nextForm.ProdPlaceName = nextForm.ProdPlaceName || 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์';
                    nextForm.ProdAddressNo = nextForm.ProdAddressNo || '6/8';
                    nextForm.ProdMoo = nextForm.ProdMoo || '2';
                    nextForm.ProdSubDistrict = nextForm.ProdSubDistrict || 'ไทรม้า';
                    nextForm.ProdDistrict = nextForm.ProdDistrict || 'เมืองนนทบุรี';
                    nextForm.ProdProvince = nextForm.ProdProvince || 'นนทบุรี';
                    nextForm.ProdPostcode = nextForm.ProdPostcode || '11000';
                    nextForm.ProdOperatorName = nextForm.ProdOperatorName || '-';
                    nextForm.ProdSoi = nextForm.ProdSoi || '-';
                    nextForm.ProdRoad = nextForm.ProdRoad || '-';
                    nextForm.ProdPhone = nextForm.ProdPhone || '0839799389';
                } else if (value === 'นำเข้า') {
                    // Clear Prod fields
                    nextForm.ProdLicenseeName = ''; nextForm.ProdLicenseNo = '';
                    nextForm.ProdOperatorName = ''; nextForm.ProdPlaceName = '';
                    nextForm.ProdAddressNo = ''; nextForm.ProdSoi = ''; nextForm.ProdRoad = ''; nextForm.ProdMoo = ''; nextForm.ProdSubDistrict = '';
                    nextForm.ProdDistrict = ''; nextForm.ProdProvince = ''; nextForm.ProdPostcode = ''; nextForm.ProdPhone = '';
                    
                    // Set Import defaults to -
                    nextForm.ImportLicenseeName = nextForm.ImportLicenseeName || '-';
                    nextForm.ImportLicenseNo = nextForm.ImportLicenseNo || '-';
                    nextForm.ImportOperatorName = nextForm.ImportOperatorName || '-';
                    nextForm.ImportPlaceName = nextForm.ImportPlaceName || '-';
                    nextForm.ImportAddressNo = nextForm.ImportAddressNo || '-';
                    nextForm.ImportSoi = nextForm.ImportSoi || '-';
                    nextForm.ImportRoad = nextForm.ImportRoad || '-';
                    nextForm.ImportMoo = nextForm.ImportMoo || '-';
                    nextForm.ImportSubDistrict = nextForm.ImportSubDistrict || '-';
                    nextForm.ImportDistrict = nextForm.ImportDistrict || '-';
                    nextForm.ImportProvince = nextForm.ImportProvince || '-';
                    nextForm.ImportPhone = nextForm.ImportPhone || '-';
                    nextForm.ImportForeignMfgName = nextForm.ImportForeignMfgName || '-';
                    nextForm.ImportForeignMfgAddress = nextForm.ImportForeignMfgAddress || '-';
                }
            }
            
            return nextForm;
        });
    }, [readOnly, customerData, documentId]);

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
        setHasFormatChanges(true);
    };
    const removeActiveIngredient = (index) => {
        if (readOnly) return;
        setForm(prev => ({ ...prev, RecipeActiveIngredients: (prev.RecipeActiveIngredients || []).filter((_, i) => i !== index) }));
        setHasFormatChanges(true);
    };
    const handleActiveIngredientChange = (index, field, val) => {
        if (readOnly) return;
        const list = [...(form.RecipeActiveIngredients || [])];
        list[index] = { ...list[index], [field]: val };
        setForm({ ...form, RecipeActiveIngredients: list });
        setHasFormatChanges(true);
    };

    // --- Extracts ---
    const addExtract = () => {
        if (readOnly) return;
        setForm(prev => ({ ...prev, RecipeExtracts: [...(prev.RecipeExtracts || []), { extractName: '', latinName: '', partUsed: '', solvent: '', ratio: '', quantity: '' }] }));
        setHasFormatChanges(true);
    };
    const removeExtract = (index) => {
        if (readOnly) return;
        setForm(prev => ({ ...prev, RecipeExtracts: (prev.RecipeExtracts || []).filter((_, i) => i !== index) }));
        setHasFormatChanges(true);
    };
    const handleExtractChange = (index, field, val) => {
        if (readOnly) return;
        const list = [...(form.RecipeExtracts || [])];
        list[index] = { ...list[index], [field]: val };
        setForm({ ...form, RecipeExtracts: list });
        setHasFormatChanges(true);
    };

    // --- Excipients ---
    const addExcipient = () => {
        if (readOnly) return;
        setForm(prev => ({ ...prev, RecipeExcipients: [...(prev.RecipeExcipients || []), { name: '', casNumber: '', function: '', quantity: '' }] }));
        setHasFormatChanges(true);
    };
    const removeExcipient = (index) => {
        if (readOnly) return;
        setForm(prev => ({ ...prev, RecipeExcipients: (prev.RecipeExcipients || []).filter((_, i) => i !== index) }));
        setHasFormatChanges(true);
    };
    const handleExcipientChange = (index, field, val) => {
        if (readOnly) return;
        const list = [...(form.RecipeExcipients || [])];
        list[index] = { ...list[index], [field]: val };
        setForm({ ...form, RecipeExcipients: list });
        setHasFormatChanges(true);
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
            <div className={`poa-field ${width === 'full' ? 'full' : ''}`} style={width && width !== 'full' ? { flex: width } : {}}>
                <label>{label}</label>
                {type === 'date' ? (
                    <CustomDatePicker
                        name={name} value={value || ''} onChange={handleChange}
                        disabled={disabled || readOnly} placeholderText={placeholder}
                    />
                ) : (
                    <input
                        type={type} name={name} value={value || ''} onChange={handleChange}
                        disabled={disabled || readOnly} placeholder={placeholder}
                    />
                )}
            </div>
        );
        Field.displayName = 'InputField';
        return Field;
    }, [handleChange, readOnly]);

    const IdCardInputField = useMemo(() => {
        const Field = ({ label, name, value, width, disabled = false }) => (
            <div className={`poa-field ${width === 'full' ? 'full' : ''}`} style={width && width !== 'full' ? { flex: width } : {}}>
                <label>{label}</label>
                <div style={{ marginTop: '6px' }}>
                    <IdCardInput 
                        value={value || ''} 
                        onChange={(val) => handleChange({ target: { name, value: val } })} 
                        disabled={disabled || readOnly} 
                    />
                </div>
            </div>
        );
        Field.displayName = 'IdCardInputField';
        return Field;
    }, [handleChange, readOnly]);

    const TextAreaField = useMemo(() => {
        const Field = ({ label, name, value, disabled = false, placeholder = '', rows = 3 }) => (
            <div className="poa-field full" style={{ marginBottom: '14px' }}>
                <label>{label}</label>
                <textarea
                    name={name} value={value || ''} onChange={handleChange}
                    disabled={disabled || readOnly} placeholder={placeholder} rows={rows}
                />
            </div>
        );
        Field.displayName = 'TextAreaField';
        return Field;
    }, [handleChange, readOnly]);

    const TipTapField = useMemo(() => {
        const Field = ({ label, name, value, disabled = false, minHeight = '80px' }) => {
            let formattedValue = value || '';
            if (formattedValue && !formattedValue.includes('<p>')) {
                formattedValue = formattedValue.split('\n').map(line => `<p>${line}</p>`).join('');
            }
            return (
                <div className="poa-field full" style={{ marginBottom: '14px' }}>
                    <label>{label}</label>
                    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', minHeight, background: (disabled || readOnly) ? '#f9fafb' : '#fff' }}>
                        <TipTapCell
                            value={formattedValue}
                            onChange={(val) => {
                                setForm(prev => ({ ...prev, [name]: val }));
                                if (linkedFormulaId) setHasFormatChanges(true);
                            }}
                            readOnly={disabled || readOnly}
                            style={{ minHeight }}
                        />
                    </div>
                </div>
            );
        };
        Field.displayName = 'TipTapField';
        return Field;
    }, [setForm, readOnly, linkedFormulaId]);

    // Applicant types moved outside

    return (
        <div className="poa-form-wrapper">
            <style>
                {`
                .tiptap {
                    font-family: inherit !important;
                    font-size: 13.5px !important;
                    padding: 8px !important;
                    line-height: 1.4 !important;
                    outline: none !important;
                    min-height: 40px;
                }
                .tiptap p {
                    margin-bottom: 0 !important;
                }
                `}
            </style>

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
            <div className="poa-info-box gray" style={{ marginBottom: '16px' }}>
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
                <div className="poa-info-box" style={{ background: '#fff', marginBottom: '20px' }}>
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
                    <div className="poa-info-box" style={{ background: '#fff', marginBottom: '20px' }}>
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

                    <div className="poa-info-box" style={{ flex: 1, marginBottom: '20px' }}>
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
            <div className="poa-info-box" style={{ background: '#fff', marginBottom: '20px' }}>
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
                            <IdCardInputField label="เลขประจำตัวประชาชน" name="AppNaturalCitizenID" value={form.AppNaturalCitizenID} />
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
                            <IdCardInputField label="เลขทะเบียนนิติบุคคล" name="AppJuristicID" value={form.AppJuristicID} />
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
                                <IdCardInputField label="เลขประจำตัวประชาชน" name="AppJuristicRepCitizenID" value={form.AppJuristicRepCitizenID} />
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
            <div className="poa-info-box" style={{ background: '#fff', marginBottom: '20px' }}>
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
            <div className="poa-info-box" style={{ background: '#fff', marginBottom: '20px' }}>
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
            <div className="poa-info-box" style={{ background: '#fff', marginBottom: '20px' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: colors.primaryDark }}>มีวัตถุอันเป็นส่วนประกอบ คือ</p>
                        {!readOnly && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {linkedFormulaId && hasFormatChanges && (
                                    <button type="button" onClick={handleSaveFormulaFormat} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: `1px solid ${colors.success}`, background: '#fff', color: colors.success, cursor: 'pointer', boxShadow: '0 2px 4px -1px rgba(16, 185, 129, 0.1)' }}>
                                        <Save size={14} /> บันทึกรูปแบบตาราง (R&D)
                                    </button>
                                )}
                                <button type="button" onClick={() => setShowFormulaModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', cursor: 'pointer', boxShadow: '0 2px 6px -1px rgba(16, 185, 129, 0.35)' }}>
                                    <Database size={14} /> เลือกสูตรตำรับ (R&D)
                                </button>
                            </div>
                        )}
                    </div>
                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 2.2fr 2.8fr 1.1fr 1.1fr 40px', background: colors.primary, color: '#fff' }}>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700' }}>ชื่อภาษาไทย</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ชื่ออังกฤษ</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ชื่อวิทยาศาสตร์/ละติน</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ส่วนที่ใช้</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ปริมาณ</div>
                            <div style={{ padding: '12px 16px', borderLeft: '1px solid rgba(255,255,255,0.15)' }}></div>
                        </div>
                        {(form.RecipeActiveIngredients || []).map((row, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.8fr 2.2fr 2.8fr 1.1fr 1.1fr 40px', borderTop: `1px solid ${colors.border}`, background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                <div style={{ padding: '4px', display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.thaiName || ''} onChange={(val) => handleActiveIngredientChange(idx, 'thaiName', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.engName || ''} onChange={(val) => handleActiveIngredientChange(idx, 'engName', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.latinName || ''} onChange={(val) => handleActiveIngredientChange(idx, 'latinName', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.partUsed || ''} onChange={(val) => handleActiveIngredientChange(idx, 'partUsed', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.quantity || ''} onChange={(val) => handleActiveIngredientChange(idx, 'quantity', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
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
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 2fr 1.5fr 40px', background: colors.primary, color: '#fff' }}>
                            <div style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '700' }}>ชื่อสารสกัด</div>
                            <div style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ชื่อวิทยาศาสตร์</div>
                            <div style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ส่วนที่ใช้</div>
                            <div style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ตัวทำละลาย</div>
                            <div style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>อัตราส่วน</div>
                            <div style={{ padding: '12px 8px', fontSize: '12px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ปริมาณ</div>
                            <div style={{ padding: '12px 4px', borderLeft: '1px solid rgba(255,255,255,0.15)' }}></div>
                        </div>
                        {(form.RecipeExtracts || []).map((row, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 2fr 1.5fr 40px', borderTop: `1px solid ${colors.border}`, background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                <div style={{ padding: '4px', display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.extractName || ''} onChange={(val) => handleExtractChange(idx, 'extractName', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.latinName || ''} onChange={(val) => handleExtractChange(idx, 'latinName', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.partUsed || ''} onChange={(val) => handleExtractChange(idx, 'partUsed', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.solvent || ''} onChange={(val) => handleExtractChange(idx, 'solvent', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.ratio || ''} onChange={(val) => handleExtractChange(idx, 'ratio', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.quantity || ''} onChange={(val) => handleExtractChange(idx, 'quantity', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
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
                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2.5fr 2fr 40px', background: colors.primary, color: '#fff' }}>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700' }}>ชื่อภาษาไทย/อังกฤษ</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>CAS number</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>หน้าที่</div>
                            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>ปริมาณ</div>
                            <div style={{ padding: '12px 16px', borderLeft: '1px solid rgba(255,255,255,0.15)' }}></div>
                        </div>
                        {(form.RecipeExcipients || []).map((row, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2.5fr 2fr 40px', borderTop: `1px solid ${colors.border}`, background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                <div style={{ padding: '4px', display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.name || ''} onChange={(val) => handleExcipientChange(idx, 'name', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.casNumber || ''} onChange={(val) => handleExcipientChange(idx, 'casNumber', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.function || ''} onChange={(val) => handleExcipientChange(idx, 'function', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
                                <div style={{ padding: '4px', borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}><TipTapCell value={row.quantity || ''} onChange={(val) => handleExcipientChange(idx, 'quantity', val)} readOnly={readOnly} style={{ flex: 1, minHeight: '40px' }} /></div>
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
            <div className="poa-info-box" style={{ background: '#fff', marginBottom: '20px' }}>
                <h4 style={sectionTitleStyle}>
                    <span style={{ background: colors.primary, color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>5</span>
                    รายละเอียดของผลิตภัณฑ์สมุนไพร
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {form.Section5FieldOrder && form.Section5FieldOrder.map((fieldMeta, idx) => {
                        const standardFieldsMeta = {
                            'ProductAppearance': { label: 'ลักษณะ', minHeight: '80px' },
                            'ProductPackSize': { label: 'ขนาดบรรจุ', minHeight: '80px' },
                            'ProductMfgProcess': { label: 'กรรมวิธีการผลิต', minHeight: '120px' },
                            'ProductIndication': { label: 'สรรพคุณ/ข้อบ่งใช้/ ข้อความกล่าวอ้างทางสุขภาพ', minHeight: '120px' },
                            'ProductDosage': { label: 'ขนาดและวิธีการใช้', minHeight: '80px' },
                            'ProductPreparation': { label: 'วิธีเตรียมก่อนรับประทาน', minHeight: '80px' },
                            'ProductCondition': { label: 'เงื่อนไขการรับประทาน', minHeight: '80px' },
                            'ProductStorage': { label: 'การเก็บรักษา / อายุการเก็บรักษา', minHeight: '80px' },
                            'ProductContraindication': { label: 'ข้อห้ามใช้', minHeight: '80px' },
                            'ProductWarning': { label: 'คำเตือน', minHeight: '80px' },
                            'ProductPrecaution': { label: 'ข้อควรระวัง', minHeight: '80px' },
                            'ProductAdverseReaction': { label: 'อาการไม่พึงประสงค์', minHeight: '80px' }
                        };

                        const handleDragStart = (e) => {
                            if (readOnly) {
                                e.preventDefault();
                                return;
                            }
                            setDraggedSection5Idx(idx);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', idx);
                        };

                        const handleDragOver = (e) => {
                            e.preventDefault(); // Necessary to allow dropping
                        };

                        const handleDrop = (e) => {
                            e.preventDefault();
                            if (readOnly || draggedSection5Idx === null || draggedSection5Idx === idx) return;
                            
                            setForm(prev => {
                                const newOrder = [...prev.Section5FieldOrder];
                                const itemToMove = newOrder.splice(draggedSection5Idx, 1)[0];
                                newOrder.splice(idx, 0, itemToMove);
                                return { ...prev, Section5FieldOrder: newOrder };
                            });
                            if (linkedFormulaId) setHasFormatChanges(true);
                            setDraggedSection5Idx(null);
                        };

                        const handleDragEnd = () => {
                            setDraggedSection5Idx(null);
                        };

                        return (
                            <div 
                                key={fieldMeta.id || fieldMeta.key} 
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onDragEnd={handleDragEnd}
                                style={{ 
                                    position: 'relative', 
                                    background: 'transparent', 
                                    padding: '0', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    marginBottom: '14px',
                                    opacity: draggedSection5Idx === idx ? 0.5 : 1,
                                    cursor: readOnly ? 'default' : 'auto'
                                }}
                            >
                                {!readOnly && (
                                    <div style={{ position: 'absolute', top: '30px', right: '0', display: 'flex', gap: '4px', zIndex: 10, alignItems: 'center' }}>
                                        <div style={{ color: '#94a3b8', cursor: 'grab', display: 'flex', padding: '4px' }} title="ลากเพื่อย้ายตำแหน่ง" 
                                            onMouseDown={(e) => { e.currentTarget.parentNode.parentNode.setAttribute('draggable', 'true'); }}
                                            onMouseUp={(e) => { e.currentTarget.parentNode.parentNode.removeAttribute('draggable'); }}
                                        >
                                            <GripVertical size={18} />
                                        </div>
                                        <button type="button" onClick={() => {
                                            setForm(prev => {
                                                const newOrder = [...prev.Section5FieldOrder];
                                                newOrder.splice(idx, 1);
                                                return { ...prev, Section5FieldOrder: newOrder };
                                            });
                                            if (linkedFormulaId) setHasFormatChanges(true);
                                        }} style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: '#ef4444' }} title="ลบหัวข้อ"><Trash2 size={16} /></button>
                                    </div>
                                )}
                                
                                <div style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', paddingRight: '90px' }}>
                                        <input 
                                            type="text" 
                                            value={fieldMeta.customTitle !== undefined ? fieldMeta.customTitle : (fieldMeta.type === 'standard' ? (standardFieldsMeta[fieldMeta.key]?.label || fieldMeta.key) : fieldMeta.title)} 
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setForm(prev => {
                                                    const newOrder = [...prev.Section5FieldOrder];
                                                    if (newOrder[idx].type === 'standard') {
                                                        newOrder[idx].customTitle = val;
                                                    } else {
                                                        newOrder[idx].title = val;
                                                    }
                                                    return { ...prev, Section5FieldOrder: newOrder };
                                                });
                                                if (linkedFormulaId) setHasFormatChanges(true);
                                            }} 
                                            disabled={readOnly}
                                            placeholder="คลิกเพื่อตั้งชื่อหัวข้อ..."
                                            style={{ ...labelStyle, background: 'transparent', border: 'none', padding: 0, width: '100%', outline: 'none', marginBottom: 0 }}
                                        />
                                    </div>
                                    <div className="tiptap-field-wrapper" style={{ border: `1px solid ${colors.border}`, borderRadius: '10px', background: readOnly ? '#f9fafb' : '#fff' }}>
                                        <TipTapCell
                                            value={fieldMeta.type === 'standard' ? form[fieldMeta.key] : fieldMeta.content}
                                            onChange={(val) => {
                                                setForm(prev => {
                                                    if (fieldMeta.type === 'standard') {
                                                        return { ...prev, [fieldMeta.key]: val };
                                                    } else {
                                                        const newOrder = [...prev.Section5FieldOrder];
                                                        newOrder[idx].content = val;
                                                        return { ...prev, Section5FieldOrder: newOrder };
                                                    }
                                                });
                                                if (linkedFormulaId) setHasFormatChanges(true);
                                            }}
                                            readOnly={readOnly}
                                            style={{ minHeight: fieldMeta.type === 'standard' ? (standardFieldsMeta[fieldMeta.key]?.minHeight || '80px') : '80px' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {!readOnly && (
                        <button type="button" onClick={() => {
                            setForm(prev => ({
                                ...prev, 
                                Section5FieldOrder: [...(prev.Section5FieldOrder || []), { type: 'custom', title: '', content: '', id: Date.now().toString() + Math.random().toString(36).substr(2, 5) }]
                            }));
                            if (linkedFormulaId) setHasFormatChanges(true);
                        }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: `1px dashed ${colors.primary}`, background: colors.primaryLight, color: colors.primary, cursor: 'pointer', width: 'max-content', marginBottom: '20px' }}>
                            <Plus size={16} /> เพิ่มหัวข้อเพิ่มเติม
                        </button>
                    )}
                    
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

            {/* Modal เลือกสูตร R&D */}
            {showFormulaModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: '#fff', borderRadius: '12px', width: '500px', maxWidth: '90%', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Database size={20} color={colors.primary} />
                                เลือกสูตรตำรับ (R&D)
                            </h3>
                            <button type="button" onClick={() => setShowFormulaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {formulas.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>ไม่พบสูตรตำรับในระบบ</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {formulas.map(f => (
                                        <div key={f.id} onClick={() => handleSelectFormula(f)} style={{ padding: '12px', border: `1px solid ${colors.border}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = colors.primary} onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '14px', color: colors.text }}>{f.name} <span style={{ fontSize: '12px', color: colors.textMuted }}>({f.version})</span></div>
                                                <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>{f.category} • ส่วนประกอบ {f.ingredients?.length || 0} รายการ</div>
                                            </div>
                                            <ChevronRight size={16} color={colors.primary} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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



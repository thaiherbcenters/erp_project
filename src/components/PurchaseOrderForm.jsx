/**
 * =============================================================================
 * PurchaseOrderForm.jsx — ฟอร์มใบสั่งซื้อ (Purchase Order - PO)
 * =============================================================================
 * รองรับการสร้าง แก้ไข คำนวณภาษี 7% หัก ณ ที่จ่าย และพิมพ์เอกสารตามแบบมาตรฐาน
 * =============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
    ArrowLeft, Printer, Save, Plus, Trash2, RotateCcw, 
    Building2, User, FileText, Calendar, DollarSign, CheckCircle, Search 
} from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';
import CustomSelect from './CustomSelect';
import { useAlert } from './CustomAlert';
import { useSignatures } from '../hooks/useSignatures';
import { TipTapCell } from './TipTapCell';
import API_BASE from '../config';
import SupplierSelectorModal from './SupplierSelectorModal';
import './PurchaseOrderForm.css';

// ── Formatting Helpers ──
const formatCurrency = (num) => {
    return Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const actualStr = typeof dateStr === 'object' ? (dateStr.target?.value || dateStr.value || '') : dateStr;
    if (!actualStr) return '-';
    try {
        const d = new Date(actualStr);
        return isNaN(d.getTime()) ? String(actualStr) : d.toLocaleDateString('th-TH');
    } catch {
        return String(actualStr);
    }
};

function ThaiBaht(Number) {
    Number = (Number || 0).toString().replace(/[, ]/g, '');
    if (isNaN(Number) || Number === '') return "ศูนย์บาทถ้วน";
    Number = parseFloat(Number).toFixed(2);
    let integerPart = Number.split('.')[0];
    let fractionalPart = Number.split('.')[1];

    const txtNumArr = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ'];
    const txtDigitArr = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    function convertPart(str) {
        let bahtTxt = '';
        let strLen = str.length;
        for (let i = 0; i < strLen; i++) {
            let n = parseInt(str.charAt(i));
            if (n !== 0) {
                if ((i === (strLen - 1)) && (n === 1) && strLen > 1 && parseInt(str.charAt(i - 1)) !== 0) {
                    bahtTxt += 'เอ็ด';
                } else if ((i === (strLen - 2)) && (n === 2)) {
                    bahtTxt += 'ยี่';
                } else if ((i === (strLen - 2)) && (n === 1)) {
                    bahtTxt += '';
                } else {
                    bahtTxt += txtNumArr[n];
                }
                bahtTxt += txtDigitArr[strLen - i - 1];
            }
        }
        return bahtTxt;
    }

    let bahtText = convertPart(integerPart);
    let satangText = convertPart(fractionalPart);

    if (integerPart === '0') bahtText = 'ศูนย์';
    bahtText += 'บาท';

    if (satangText === '' || satangText === '00' || satangText === 'ศูนย์') {
        bahtText += 'ถ้วน';
    } else {
        bahtText += satangText + 'สตางค์';
    }
    return bahtText;
}

// รายละเอียดบริษัทผู้ซื้อ (Buyer Entities)
const BUYER_COMPANIES = {
    po_thc: {
        name: 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์',
        headerName: 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์ (สำนักงานใหญ่)',
        nameEn: 'Thai Herb Centers (THC) Community Enterprise (HEAD OFFICE)',
        address: '6/10 หมู่ที่ 2 ต.ไทรม้า อ.เมืองนนทบุรี จ.นนทบุรี 11000',
        phone: '083-9799389',
        email: 'thaiherbcenters@gmail.com',
        taxId: '099-200438186-0',
        logo: '/images/logos/logo-thc.png'
    },
    po_psf: {
        name: 'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด',
        headerName: 'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด (สำนักงานใหญ่)',
        nameEn: 'Premier Smart Farm Co., Ltd. (HEAD OFFICE)',
        address: 'เลขที่ 2/2 ซอยนนทบุรี 38 ต.ท่าทราย อ.เมืองนนทบุรี จ.นนทบุรี 11000',
        phone: '083-9799389',
        email: 'thaiherbcenters@gmail.com',
        taxId: '0125566026612',
        logo: '/images/logos/logo-psf.png'
    },
    po_elt: {
        name: 'บริษัท อิลิท เทรดดิ้ง 2020 จำกัด',
        headerName: 'บริษัท อิลิท เทรดดิ้ง 2020 จำกัด (สำนักงานใหญ่)',
        nameEn: 'Elite Trading 2020 Co., Ltd. (HEAD OFFICE)',
        address: 'เลขที่ 6/8 หมู่ที่ 2 แขวง/ตำบล ไทรม้า เขต/อำเภอเมืองนนทบุรี จ.นนทบุรี 11000',
        phone: '063-8989895',
        email: 'thaiherbcenters@gmail.com',
        taxId: '0125563029289',
        logo: '/images/logos/logo-elt.png'
    }
};

const formatPhone = (phone) => {
    if (!phone) return '-';
    const trimmed = String(phone).trim();
    const clean = trimmed.replace(/[^0-9]/g, '');
    if (clean === '0839799389') return '083-9799389';
    if (clean.length === 10) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    if (clean.length === 9) return `${clean.slice(0, 2)}-${clean.slice(2)}`;
    return trimmed;
};

const COMMON_UNITS = ['kg', 'g', 'Set', 'ชิ้น', 'กล่อง', 'ขวด', 'ลิตร', 'มล.', 'แพ็ค', 'ม้วน', 'ถุง', 'กระสอบ'];

const DEFAULT_PO_NOTES = `<p><strong>หมายเหตุ :</strong> ขอใบรับรองฮาลาล และใบ COA ของรายการสินค้าที่สั่งซื้อ</p>`;

const getInitialNotes = () => {
    try {
        const saved = localStorage.getItem('TemplateNotes_PurchaseOrder');
        if (saved) {
            if (/หมายเหตุ|เงื่อนไข/i.test(saved)) {
                return saved;
            }
            const clean = saved.replace(/^<p>/, '').replace(/<\/p>$/, '').trim();
            const migrated = `<p><strong>หมายเหตุ :</strong> ${clean}</p>`;
            localStorage.setItem('TemplateNotes_PurchaseOrder', migrated);
            return migrated;
        }
    } catch (e) {
        console.error('Error reading TemplateNotes_PurchaseOrder:', e);
    }
    return DEFAULT_PO_NOTES;
};

export default function PurchaseOrderForm({ editId, onBack, onSave, onEdit, viewOnly = false, hideControls = false, isHistory = false }) {
    const { showAlert, showConfirm } = useAlert();
    const { signatures, userSignatures, bossSignatures, getSignatureUrl, defaultSignerKey } = useSignatures();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [showSupplierModal, setShowSupplierModal] = useState(false);

    // ── Form State ──
    const [formData, setFormData] = useState({
        poNumber: '',
        poDate: new Date().toISOString().split('T')[0],
        refNumber: '',
        prNumber: '',
        docType: 'po_thc',
        revision: 0,
        
        // ผู้ซื้อ
        buyerName: BUYER_COMPANIES.po_thc.name,
        buyerAddress: BUYER_COMPANIES.po_thc.address,
        buyerPhone: BUYER_COMPANIES.po_thc.phone,
        buyerEmail: BUYER_COMPANIES.po_thc.email,
        buyerTaxId: BUYER_COMPANIES.po_thc.taxId,

        // ผู้ขาย
        supplierId: '',
        supplierName: '',
        supplierAddress: '',
        supplierPhone: '',
        supplierEmail: '',
        supplierTaxId: '',

        // การเงิน
        discountPercent: 0,
        vatRate: 7,
        withholdingTaxRate: 0,

        // หมายเหตุ & ลายเซ็น (ผู้อนุมัติเป็นคุณธวัชเสมอ, ผู้ออกเอกสารตาม user ที่ล็อกอิน)
        notes: getInitialNotes(),
        preparedBy: defaultSignerKey || '',
        approvedBy: 'thawat',
        supplierRecipient: '',
        status: 'รออนุมัติ'
    });

    // ── ซิงค์ลายเซ็นเริ่มต้นสำหรับ PO ใหม่: ผู้อนุมัติ = คุณธวัช จรุงพิรวงศ์ เสมอ, ผู้ออกเอกสาร = user ที่ล็อกอิน ──
    useEffect(() => {
        if (!editId) {
            setFormData(prev => {
                let updated = false;
                const nextState = { ...prev };

                // ผู้อนุมัติเอกสาร (ผู้ซื้อ) -> คุณธวัช จรุงพิรวงศ์ เสมอ
                if (!nextState.approvedBy) {
                    const bossKey = bossSignatures.find(s => s.KeyName === 'thawat' || s.FullName?.includes('ธวัช'))?.KeyName
                        || (bossSignatures && bossSignatures.length > 0 ? bossSignatures[0].KeyName : 'thawat');
                    nextState.approvedBy = bossKey;
                    updated = true;
                }

                // ผู้ออกเอกสาร (ผู้ซื้อ) -> ลายเซ็นของ user ที่ล็อกอินเป็นปกติ
                if (!nextState.preparedBy) {
                    if (defaultSignerKey) {
                        nextState.preparedBy = defaultSignerKey;
                        updated = true;
                    } else if (userSignatures && userSignatures.length > 0) {
                        nextState.preparedBy = userSignatures[0].KeyName;
                        updated = true;
                    }
                }

                return updated ? nextState : prev;
            });
        }
    }, [editId, defaultSignerKey, userSignatures, bossSignatures]);

    // ── Template Notes Handlers ──
    const handleResetNotesTemplate = () => {
        setFormData(prev => ({ ...prev, notes: DEFAULT_PO_NOTES }));
        localStorage.setItem('TemplateNotes_PurchaseOrder', DEFAULT_PO_NOTES);
        showAlert('คืนค่าสำเร็จ', 'รีเซ็ตข้อความหมายเหตุกลับเป็นค่าเริ่มต้นแล้ว', 'info');
    };

    // ── Items State ──
    const [items, setItems] = useState([
        { id: 1, name: '', code: '', qty: 1, unit: 'kg', price: 0 }
    ]);

    // ── Fetch Initial Data (Next Number & Suppliers) ──
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch next PO number if creating new
                if (!editId) {
                    const resNo = await fetch(`${API_BASE}/purchase-orders/next-number`);
                    const jsonNo = await resNo.json();
                    if (jsonNo.success && jsonNo.nextNumber) {
                        setFormData(prev => ({ ...prev, poNumber: jsonNo.nextNumber }));
                    }

                    const savedTemplate = getInitialNotes();
                    if (savedTemplate) {
                        setFormData(prev => ({ ...prev, notes: savedTemplate }));
                    }
                }

                // Fetch active suppliers
                const resSup = await fetch(`${API_BASE}/purchase-orders/suppliers`);
                const jsonSup = await resSup.json();
                if (jsonSup.success && jsonSup.data) {
                    setSuppliers(jsonSup.data);
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
            }
        };

        fetchInitialData();
    }, [editId]);

    // ── Fetch Existing PO for Edit ──
    useEffect(() => {
        if (editId) {
            const fetchPODetail = async () => {
                setLoading(true);
                try {
                    const isHist = String(editId).startsWith('history-') || isHistory;
                    const histId = isHist ? String(editId).replace('history-', '') : null;
                    const url = isHist 
                        ? `${API_BASE}/purchase-orders/history/${histId}`
                        : `${API_BASE}/purchase-orders/${editId}`;

                    const res = await fetch(url);
                    const json = await res.json();
                    if (json.success && json.data) {
                        const po = json.data;
                        let loadedNotes = po.Notes || '';
                        if (loadedNotes && !/หมายเหตุ|เงื่อนไข/i.test(loadedNotes)) {
                            const clean = loadedNotes.replace(/^<p>/, '').replace(/<\/p>$/, '').trim();
                            loadedNotes = `<p><strong>หมายเหตุ :</strong> ${clean}</p>`;
                        }

                        setFormData({
                            poNumber: po.PONumber || '',
                            poDate: po.PODate ? po.PODate.split('T')[0] : '',
                            refNumber: po.RefNumber || '',
                            prNumber: po.PRNumber || '',
                            docType: po.DocType || 'po_thc',
                            revision: po.Revision !== undefined ? po.Revision : 0,
                            buyerName: po.BuyerName || '',
                            buyerAddress: po.BuyerAddress || '',
                            buyerPhone: po.BuyerPhone || '',
                            buyerEmail: po.BuyerEmail || '',
                            buyerTaxId: po.BuyerTaxID || '',
                            supplierId: po.SupplierID || '',
                            supplierName: po.SupplierName || '',
                            supplierAddress: po.SupplierAddress || '',
                            supplierPhone: po.SupplierPhone || '',
                            supplierEmail: po.SupplierEmail || '',
                            supplierTaxId: po.SupplierTaxID || '',
                            discountPercent: po.DiscountPercent || 0,
                            vatRate: po.VatRate !== undefined ? po.VatRate : 7,
                            withholdingTaxRate: po.WithholdingTaxRate || 0,
                            notes: loadedNotes,
                            preparedBy: po.PreparedBy || '',
                            approvedBy: po.ApprovedBy || 'thawat',
                            supplierRecipient: po.SupplierRecipient || '',
                            status: po.Status || 'รออนุมัติ'
                        });

                        if (po.items && po.items.length > 0) {
                            setItems(po.items.map((it, idx) => ({
                                id: it.ItemID || it.ItemHistoryID || idx + 1,
                                name: it.ItemName || '',
                                code: it.ItemCode || '',
                                qty: parseFloat(it.Qty) || 1,
                                unit: it.Unit || 'kg',
                                price: parseFloat(it.UnitPrice) || 0
                            })));
                        }
                    }
                } catch (err) {
                    console.error('Error fetching PO detail:', err);
                    showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลใบสั่งซื้อได้', 'error');
                } finally {
                    setLoading(false);
                }
            };

            fetchPODetail();
        }
    }, [editId, isHistory]);

    // ── Handle Change Buyer Company ──
    const handleDocTypeChange = (e) => {
        const val = typeof e === 'object' && e?.target ? e.target.value : e;
        const comp = BUYER_COMPANIES[val] || BUYER_COMPANIES.po_thc;
        setFormData(prev => ({
            ...prev,
            docType: val,
            buyerName: comp.name,
            buyerAddress: comp.address,
            buyerPhone: comp.phone,
            buyerEmail: comp.email,
            buyerTaxId: comp.taxId
        }));
    };

    // ── Handle Select Supplier ──
    const handleSelectSupplier = (sup) => {
        if (!sup) {
            setFormData(prev => ({
                ...prev,
                supplierId: '',
                supplierName: '',
                supplierAddress: '',
                supplierPhone: '',
                supplierEmail: '',
                supplierTaxId: ''
            }));
            return;
        }
        setFormData(prev => ({
            ...prev,
            supplierId: sup.SupplierID || '',
            supplierName: sup.SupplierName || '',
            supplierAddress: sup.Address || '',
            supplierPhone: sup.Phone || '',
            supplierEmail: sup.Email || '',
            supplierTaxId: sup.TaxID || ''
        }));
    };

    // ── Handle Supplier Input Changes ──
    const handleSupplierNameChange = (val) => {
        const cleanVal = val.trim().toLowerCase();
        const cleanTax = (formData.supplierTaxId || '').trim();
        const matched = suppliers.find(s => 
            (s.SupplierName && s.SupplierName.trim().toLowerCase() === cleanVal) ||
            (cleanTax && s.TaxID && s.TaxID.trim() === cleanTax)
        );

        setFormData(prev => ({
            ...prev,
            supplierName: val,
            supplierId: matched ? matched.SupplierID : (cleanTax && prev.supplierId ? prev.supplierId : '')
        }));
    };

    const handleSupplierTaxIdChange = (val) => {
        const cleanVal = val.trim();
        const matched = cleanVal ? suppliers.find(s => s.TaxID && s.TaxID.trim() === cleanVal) : null;

        setFormData(prev => ({
            ...prev,
            supplierTaxId: val,
            ...(matched ? {
                supplierId: matched.SupplierID,
                supplierName: prev.supplierName || matched.SupplierName || '',
                supplierAddress: prev.supplierAddress || matched.Address || '',
                supplierPhone: prev.supplierPhone || matched.Phone || '',
                supplierEmail: prev.supplierEmail || matched.Email || ''
            } : {})
        }));
    };

    // ── Items Management ──
    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            { id: Date.now(), name: '', code: '', qty: 1, unit: 'kg', price: 0 }
        ]);
    };

    const handleRemoveItem = (index) => {
        if (items.length <= 1) {
            showAlert('แจ้งเตือน', 'ต้องมีรายการสินค้าอย่างน้อย 1 รายการ', 'warning');
            return;
        }
        setItems(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleItemChange = (index, field, value) => {
        setItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    // ── Financial Calculations ──
    const subTotal = useMemo(() => {
        return items.reduce((sum, it) => {
            const q = parseFloat(it.qty) || 0;
            const p = parseFloat(it.price) || 0;
            return sum + (q * p);
        }, 0);
    }, [items]);

    const discountAmount = useMemo(() => {
        const discPct = parseFloat(formData.discountPercent) || 0;
        return (subTotal * discPct) / 100;
    }, [subTotal, formData.discountPercent]);

    const afterDiscount = useMemo(() => {
        return subTotal - discountAmount;
    }, [subTotal, discountAmount]);

    const vatAmount = useMemo(() => {
        const rate = parseFloat(formData.vatRate) || 0;
        return (afterDiscount * rate) / 100;
    }, [afterDiscount, formData.vatRate]);

    const grandTotal = useMemo(() => {
        return afterDiscount + vatAmount;
    }, [afterDiscount, vatAmount]);

    const withholdingTaxAmount = useMemo(() => {
        const rate = parseFloat(formData.withholdingTaxRate) || 0;
        return (afterDiscount * rate) / 100;
    }, [afterDiscount, formData.withholdingTaxRate]);

    const totalPayable = useMemo(() => {
        return grandTotal - withholdingTaxAmount;
    }, [grandTotal, withholdingTaxAmount]);


    // ── Save Handler ──
    const handleSave = async (e) => {
        if (e) e.preventDefault();

        if (!formData.poNumber || !formData.poNumber.trim()) {
            showAlert('กรุณากรอกข้อมูล', 'กรุณาระบุเลขที่ใบสั่งซื้อ (PO Number)', 'warning');
            return;
        }

        if (!formData.supplierName || !formData.supplierName.trim()) {
            showAlert('กรุณากรอกข้อมูล', 'กรุณาระบุชื่อผู้ขาย / ซัพพลายเออร์', 'warning');
            return;
        }

        const validItems = items.filter(it => it.name && it.name.trim());
        if (validItems.length === 0) {
            showAlert('กรุณากรอกข้อมูล', 'กรุณาระบุชื่อรายการสินค้าอย่างน้อย 1 รายการ', 'warning');
            return;
        }

        setSaving(true);
        try {
            let cleanPoDate = formData.poDate;
            if (cleanPoDate && typeof cleanPoDate === 'object') {
                cleanPoDate = cleanPoDate.target?.value || cleanPoDate.value || '';
            }

            const payload = {
                ...formData,
                poDate: cleanPoDate,
                subTotal,
                discountAmount,
                vatAmount,
                grandTotal,
                withholdingTaxAmount,
                totalPayable,
                items: validItems.map((it, idx) => {
                    const q = parseFloat(it.qty) || 0;
                    const p = parseFloat(it.price) || 0;
                    const lineSub = q * p;
                    const lineVat = (lineSub * (parseFloat(formData.vatRate) || 0)) / 100;
                    const lineWht = (lineSub * (parseFloat(formData.withholdingTaxRate) || 0)) / 100;
                    return {
                        itemOrder: idx + 1,
                        name: it.name,
                        code: it.code || null,
                        qty: q,
                        unit: it.unit || 'ชิ้น',
                        price: p,
                        vatRate: parseFloat(formData.vatRate) || 0,
                        vatAmount: lineVat,
                        lineTotal: lineSub + lineVat,
                        whtRate: parseFloat(formData.withholdingTaxRate) || 0,
                        whtAmount: lineWht
                    };
                })
            };

            const endpoint = editId ? `${API_BASE}/purchase-orders/${editId}` : `${API_BASE}/purchase-orders`;
            const method = editId ? 'PUT' : 'POST';

            const token = localStorage.getItem('token');
            const res = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.success) {
                showAlert('สำเร็จ', editId ? 'บันทึกการแก้ไขใบสั่งซื้อเรียบร้อยแล้ว' : 'สร้างใบสั่งซื้อ (PO) เรียบร้อยแล้ว', 'success');
                if (onSave) onSave(json.data);
            } else {
                throw new Error(json.error || json.message || 'บันทึกไม่สำเร็จ');
            }
        } catch (err) {
            console.error('Error saving PO:', err);
            showAlert('บันทึกไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Print Handler ──
    const handlePrint = () => {
        window.print();
    };

    // ── Signatures & Buyer resolution ──
    const preparedBySig = signatures.find(s => s.KeyName === formData.preparedBy || s.FullName === formData.preparedBy)
        || (formData.preparedBy === 'thawat' || formData.preparedBy === 'ธวัช จรุงพิรวงศ์' || formData.preparedBy?.includes('ธวัช')
            ? { KeyName: 'thawat', FullName: 'ธวัช จรุงพิรวงศ์', ImagePath: '/images/signatures/sign-authorized.png' }
            : formData.preparedBy === 'jutharat' || formData.preparedBy === 'sig_mtlckaft' || formData.preparedBy?.includes('จุฑารัตน์')
            ? { KeyName: 'sig_mtlckaft', FullName: 'จุฑารัตน์ วงคำเหลา', ImagePath: '/api/uploads/signatures/sign-1788429189587-495787154.png' }
            : null);

    const approvedBySig = signatures.find(s => s.KeyName === formData.approvedBy || s.FullName === formData.approvedBy)
        || (formData.approvedBy === 'thawat' || formData.approvedBy === 'ธวัช จรุงพิรวงศ์' || formData.approvedBy?.includes('ธวัช')
            ? { KeyName: 'thawat', FullName: 'ธวัช จรุงพิรวงศ์', ImagePath: '/images/signatures/sign-authorized.png' }
            : formData.approvedBy === 'jutharat' || formData.approvedBy === 'sig_mtlckaft' || formData.approvedBy?.includes('จุฑารัตน์')
            ? { KeyName: 'sig_mtlckaft', FullName: 'จุฑารัตน์ วงคำเหลา', ImagePath: '/api/uploads/signatures/sign-1788429189587-495787154.png' }
            : null);

    const preparedSigPath = preparedBySig?.ImagePath || preparedBySig?.SignatureURL;
    const approvedSigPath = approvedBySig?.ImagePath || approvedBySig?.SignatureURL;
    const currentBuyer = BUYER_COMPANIES[formData.docType] || BUYER_COMPANIES.po_thc;

    // ── Render A4 Print Document Sheet ──
    const renderPrintSheet = () => (
        <div className="po-print-container" id="po-print-container">
            {/* Print Header */}
            <div className="po-print-header">
                <div className="po-print-logo-area">
                    <img 
                        src={currentBuyer.logo} 
                        alt={currentBuyer.name} 
                        className="po-print-logo" 
                        onError={(e) => { e.target.style.display = 'none'; }} 
                    />
                    <div>
                        <div className="po-print-company-th">{currentBuyer.headerName || formData.buyerName || currentBuyer.name}</div>
                        <div className="po-print-company-en">{currentBuyer.nameEn}</div>
                    </div>
                </div>
                <div className="po-print-title-area">
                    <div className="po-print-original" style={{ marginBottom: '14px', lineHeight: '1.2' }}>(ต้นฉบับ)</div>
                    <div className="po-print-title" style={{ marginTop: '4px', lineHeight: '1.25' }}>ใบสั่งซื้อ</div>
                </div>
            </div>

            {/* Print Buyer & Doc Card */}
            <div className="po-print-parties">
                <div className="po-print-info-left">
                    <div className="po-print-row">
                        <span className="po-print-label">ผู้ซื้อ :</span>
                        <span className="po-print-val" style={{ fontWeight: 600 }}>{formData.buyerName}</span>
                    </div>
                    <div className="po-print-row po-print-row-multiline" style={{ marginTop: '2px' }}>
                        <span className="po-print-label">ที่อยู่ :</span>
                        <span className="po-print-val po-print-val-wrap">{formData.buyerAddress}</span>
                    </div>
                    <div className="po-print-row" style={{ marginTop: '3px' }}>
                        <span className="po-print-label">Tax :</span>
                        <span className="po-print-val">{formData.buyerTaxId || '-'}</span>
                    </div>
                </div>

                <div className="po-print-info-mid">
                    <div className="po-print-row">
                        <span style={{ whiteSpace: 'nowrap' }}>Tel: {formatPhone(formData.buyerPhone)}</span>
                    </div>
                    <div className="po-print-row" style={{ marginTop: '2px' }}>
                        <span style={{ whiteSpace: 'nowrap' }}>Email: {formData.buyerEmail || '-'}</span>
                    </div>
                </div>

                <div className="po-print-doc-card">
                    <table className="po-print-doc-table">
                        <tbody>
                            <tr>
                                <td className="doc-label">เลขที่เอกสาร :</td>
                                <td className="doc-val">{formData.poNumber}</td>
                            </tr>
                            <tr>
                                <td className="doc-label">วันที่ออก :</td>
                                <td className="doc-val">{formatDate(formData.poDate)}</td>
                            </tr>
                            <tr>
                                <td className="doc-label">อ้างอิง :</td>
                                <td className="doc-val">{formData.refNumber || '-'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Divider Line across full page width */}
            <div className="po-print-divider" />

            {/* Print Supplier Section */}
            <div className="po-print-supplier">
                <div className="po-print-info-left">
                    <div className="po-print-row">
                        <span className="po-print-label">ผู้ขาย :</span>
                        <span className="po-print-val" style={{ fontWeight: 600 }}>{formData.supplierName || '-'}</span>
                    </div>
                    <div className="po-print-row po-print-row-multiline" style={{ marginTop: '2px' }}>
                        <span className="po-print-label">ที่อยู่ :</span>
                        <span className="po-print-val po-print-val-wrap">{formData.supplierAddress || '-'}</span>
                    </div>
                    <div className="po-print-row" style={{ marginTop: '3px' }}>
                        <span className="po-print-label">Tax :</span>
                        <span className="po-print-val">{formData.supplierTaxId || '-'}</span>
                    </div>
                </div>

                <div className="po-print-info-mid">
                    <div className="po-print-row">
                        <span style={{ whiteSpace: 'nowrap' }}>Tel: {formatPhone(formData.supplierPhone)}</span>
                    </div>
                    <div className="po-print-row" style={{ marginTop: '2px' }}>
                        <span style={{ whiteSpace: 'nowrap' }}>Email: {formData.supplierEmail || '-'}</span>
                    </div>
                </div>

                <div className="po-print-info-right" />
            </div>

            {/* Print Table */}
            <div className="po-print-table-wrap">
                <table className="po-print-table">
                    <thead>
                        <tr>
                            <th style={{ width: '45px', textAlign: 'center', whiteSpace: 'nowrap' }}>ลำดับที่</th>
                            <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>รายการ</th>
                            <th style={{ width: '65px', textAlign: 'center', whiteSpace: 'nowrap' }}>จำนวน</th>
                            <th style={{ width: '80px', textAlign: 'right', whiteSpace: 'nowrap' }}>ราคา (บาท)</th>
                            <th style={{ width: '70px', textAlign: 'center', whiteSpace: 'nowrap' }}>Vat {formData.vatRate}%</th>
                            <th style={{ width: '80px', textAlign: 'right', whiteSpace: 'nowrap' }}>รวม (บาท)</th>
                            <th style={{ width: '75px', textAlign: 'center', whiteSpace: 'nowrap' }}>หัก ณ ที่จ่าย</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.filter(it => it.name).map((it, idx) => {
                            const q = parseFloat(it.qty) || 0;
                            const p = parseFloat(it.price) || 0;
                            const lineSub = q * p;

                            return (
                                <tr key={idx}>
                                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                                    <td style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                        <div style={{ fontWeight: 500, wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: '1.35' }}>{it.name}</div>
                                        {it.code && <div style={{ fontSize: '8pt', color: '#475569', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{it.code}</div>}
                                    </td>
                                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        {q.toLocaleString('th-TH', { maximumFractionDigits: 4 })} {it.unit}
                                    </td>
                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {p.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        {parseFloat(formData.vatRate) > 0 ? `${formData.vatRate}%` : '-'}
                                    </td>
                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {lineSub.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        {parseFloat(formData.withholdingTaxRate) > 0 ? `${formData.withholdingTaxRate}%` : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Print Summary */}
            <div className="po-print-summary-wrap">
                <div className="po-print-summary-left">
                    <div style={{ marginBottom: '2px' }}><strong>สรุป</strong></div>
                    <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%' }}>
                        <span style={{ whiteSpace: 'nowrap' }}>มูลค่าก่อนคำนวณภาษี {formData.vatRate}%</span>
                        <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{subTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                    <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%' }}>
                        <span style={{ whiteSpace: 'nowrap' }}>ภาษีมูลค่าเพิ่ม {formData.vatRate}%</span>
                        <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                    <div style={{ marginTop: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%' }}>
                        <strong style={{ whiteSpace: 'nowrap' }}>จำนวนเงินทั้งสิ้น :</strong>
                        <span style={{ textAlign: 'right', fontWeight: 600, marginLeft: '12px', wordBreak: 'break-word' }}>{ThaiBaht(totalPayable)}</span>
                    </div>
                </div>

                <div className="po-print-summary-right">
                    <div className="po-print-highlight-box">
                        <span className="po-print-highlight-label">จำนวนเงินที่ชำระ</span>
                        <span className="po-print-highlight-value">{totalPayable.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                    <div style={{ fontSize: '9pt', color: '#000000', display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
                        <span>จำนวนเงินที่ถูกหัก ณ ที่จ่าย</span>
                        <span>{withholdingTaxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                    <div style={{ fontSize: '9pt', color: '#000000', display: 'flex', justifyContent: 'space-between', padding: '2px 4px 0 4px' }}>
                        <span>จำนวนเงินทั้งสิ้น</span>
                        <span>{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                </div>
            </div>

            {/* Print Notes */}
            <div className="po-print-notes">
                {formData.notes ? (
                    /หมายเหตุ|เงื่อนไข/i.test(formData.notes) ? (
                        <div 
                            className="print-notes-container" 
                            dangerouslySetInnerHTML={{ __html: formData.notes }} 
                        />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <strong style={{ flexShrink: 0, marginRight: '8px' }}>หมายเหตุ :</strong>
                            <div 
                                className="print-notes-container" 
                                style={{ flex: 1, minWidth: 0 }} 
                                dangerouslySetInnerHTML={{ __html: formData.notes }} 
                            />
                        </div>
                    )
                ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <strong style={{ flexShrink: 0, marginRight: '8px' }}>หมายเหตุ :</strong>
                        <span>-</span>
                    </div>
                )}
            </div>

            {/* Print Signatures (3 Columns) */}
            <div className="po-print-signatures">
                <div className="po-print-sig-col">
                    <div className="po-print-sig-space">
                        {preparedSigPath && (
                            <img 
                                src={getSignatureUrl(preparedSigPath)} 
                                alt="sig" 
                                className="po-print-sig-img" 
                                onError={(e) => { e.target.onerror = null; e.target.src = preparedSigPath; }}
                            />
                        )}
                    </div>
                    <div className="po-print-sig-line">( ................................................ )</div>
                    <div className="po-print-sig-title">ผู้ออกเอกสาร (ผู้ซื้อ)</div>
                    <div className="po-print-sig-date">วันที่ : ..... / ..... / .....</div>
                </div>

                <div className="po-print-sig-col">
                    <div className="po-print-sig-space">
                        {approvedSigPath && (
                            <img 
                                src={getSignatureUrl(approvedSigPath)} 
                                alt="sig" 
                                className="po-print-sig-img" 
                                onError={(e) => { e.target.onerror = null; e.target.src = approvedSigPath; }}
                            />
                        )}
                    </div>
                    <div className="po-print-sig-line">( ................................................ )</div>
                    <div className="po-print-sig-title">ผู้อนุมัติเอกสาร (ผู้ซื้อ)</div>
                    <div className="po-print-sig-date">วันที่ : ..... / ..... / .....</div>
                </div>

                <div className="po-print-sig-col">
                    <div className="po-print-sig-space"></div>
                    <div className="po-print-sig-line">( ................................................ )</div>
                    <div className="po-print-sig-title">ผู้รับเอกสาร</div>
                    <div className="po-print-sig-company">{formData.supplierName || '(ผู้ขาย)'}</div>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="po-container" style={{ textAlign: 'center', padding: '60px' }}>
                <p>กำลังโหลดข้อมูลใบสั่งซื้อ...</p>
            </div>
        );
    }

    if (viewOnly) {
        return (
            <div className="po-view-only-wrapper">
                {!hideControls && (
                    <div className="po-view-only-controls" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
                        <button className="po-back-btn" type="button" onClick={onBack}>
                            <ArrowLeft size={16} /> กลับไปหน้ารายการ
                        </button>
                        <button className="po-btn-print" type="button" onClick={handlePrint} style={{ background: '#16a34a', color: '#fff' }}>
                            <Printer size={16} /> พิมพ์ใบสั่งซื้อ (Print A4)
                        </button>
                    </div>
                )}
                {renderPrintSheet()}
            </div>
        );
    }

    return (
        <div className="po-container">
            {/* ── Back Button (Like Sales Forms / Image 2) ── */}
            <div style={{ marginBottom: '16px' }}>
                <button
                    type="button"
                    onClick={onBack}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        background: '#f59e0b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '15px',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                >
                    <ArrowLeft size={18} /> กลับสู่หน้าหลัก
                </button>
            </div>

            {/* ── Header Title (q-header matching Image 2) ── */}
            <div className="q-header" style={{ marginBottom: '20px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b', fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>
                    <FileText size={22} color="#4f46e5" /> {editId ? `แก้ไขใบสั่งซื้อ: ${formData.poNumber}` : 'ฟอร์มออกใบสั่งซื้อ (Purchase Order)'}
                </h1>
                <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
                    กรุณากรอกข้อมูลให้ครบถ้วนเพื่อออกใบสั่งซื้อและจัดการระบบฝ่ายจัดซื้อ
                </p>
            </div>

            {/* ── Main Form Layout (2 Columns) ── */}
            <div className="po-layout">
                {/* ── Left Column (60%) ── */}
                <div className="po-form-main">
                    {/* 1. ข้อมูลเอกสาร & หน่วยงานผู้ซื้อ */}
                    <div className="po-card">
                        <div className="po-card-header">
                            <span className="po-card-title">
                                <FileText size={18} color="#16a34a" /> ข้อมูลเอกสาร & หน่วยงานผู้ซื้อ
                            </span>
                        </div>

                        {/* ประเภทเอกสาร / บริษัทผู้ซื้อ (THC / PSF) */}
                        <div style={{
                            backgroundColor: '#f0fdf4',
                            border: '1.5px solid #86efac',
                            borderRadius: '10px',
                            padding: '14px 16px',
                            marginBottom: '16px'
                        }}>
                            <div className="po-form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: 600, color: '#166534', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <Building2 size={16} color="#16a34a" /> ประเภทเอกสาร / บริษัทผู้ซื้อ (Document Type) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <CustomSelect
                                    name="docType"
                                    value={formData.docType}
                                    onChange={handleDocTypeChange}
                                    disabled={viewOnly}
                                    style={{
                                        border: '1.5px solid #22c55e',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        color: '#15803d',
                                        background: '#fff'
                                    }}
                                >
                                    <option value="po_thc">ใบสั่งซื้อ (Purchase Order) - THC (วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์)</option>
                                    <option value="po_psf">ใบสั่งซื้อ (Purchase Order) - PSF (บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด)</option>
                                </CustomSelect>
                            </div>
                        </div>

                        <div className="po-grid-3">
                            <div className="po-form-group">
                                <label>เลขที่เอกสาร (PO No.)</label>
                                <input
                                    type="text"
                                    className="po-input"
                                    value={formData.poNumber}
                                    onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                                    placeholder="PO-YYYYMMDD-001"
                                    readOnly={viewOnly}
                                />
                            </div>

                            <div className="po-form-group">
                                <label>วันที่ออกเอกสาร</label>
                                <CustomDatePicker
                                    name="poDate"
                                    value={typeof formData.poDate === 'object' ? (formData.poDate?.target?.value || formData.poDate?.value || '') : formData.poDate}
                                    onChange={(e) => {
                                        const val = e?.target ? e.target.value : e;
                                        setFormData(prev => ({ ...prev, poDate: val }));
                                    }}
                                    disabled={viewOnly}
                                />
                            </div>

                            <div className="po-form-group">
                                <label>เอกสารอ้างอิง (Ref No. / QT / PR)</label>
                                <input
                                    type="text"
                                    className="po-input"
                                    value={formData.refNumber}
                                    onChange={(e) => setFormData(prev => ({ ...prev, refNumber: e.target.value }))}
                                    placeholder="เช่น QT20260422-001 หรือ PR-001"
                                    readOnly={viewOnly}
                                />
                            </div>
                        </div>

                        <div className="po-grid-2" style={{ marginTop: '14px' }}>
                            <div className="po-form-group">
                                <label>ชื่อผู้ซื้อ (Buyer Name)</label>
                                <input
                                    type="text"
                                    className="po-input"
                                    value={formData.buyerName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, buyerName: e.target.value }))}
                                    readOnly={viewOnly}
                                />
                            </div>

                            <div className="po-form-group">
                                <label>เลขประจำตัวผู้เสียภาษี (ผู้ซื้อ)</label>
                                <input
                                    type="text"
                                    className="po-input"
                                    value={formData.buyerTaxId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, buyerTaxId: e.target.value }))}
                                    readOnly={viewOnly}
                                />
                            </div>
                        </div>

                        <div className="po-form-group" style={{ marginTop: '14px' }}>
                            <label>ที่อยู่ผู้ซื้อ (Buyer Address)</label>
                            <input
                                type="text"
                                className="po-input"
                                value={formData.buyerAddress}
                                onChange={(e) => setFormData(prev => ({ ...prev, buyerAddress: e.target.value }))}
                                readOnly={viewOnly}
                            />
                        </div>
                    </div>

                    {/* 2. ข้อมูลผู้ขาย / ซัพพลายเออร์ */}
                    <div className="po-card">
                        <div className="po-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <span className="po-card-title">
                                <Building2 size={18} color="#16a34a" /> ข้อมูลผู้ขาย / ซัพพลายเออร์ (Supplier)
                            </span>
                            {!viewOnly && (
                                <button
                                    type="button"
                                    onClick={() => setShowSupplierModal(true)}
                                    className="btn-secondary"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        border: '1.5px solid #cbd5e1',
                                        background: '#fff',
                                        color: '#1e293b',
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.color = '#16a34a'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#1e293b'; }}
                                >
                                    <Search size={15} color="#16a34a" />
                                    {formData.supplierId ? 'เปลี่ยนผู้ขาย (Supplier DB)' : 'เลือกจากฐานข้อมูลผู้ขาย (Supplier DB)'}
                                </button>
                            )}
                        </div>

                        {/* สถานะการเลือกผู้ขาย: มีอยู่เดิม หรือ บันทึกรายใหม่ */}
                        {formData.supplierId ? (
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px',
                                padding: '6px 12px', marginBottom: '14px', fontSize: '12px'
                            }}>
                                <span style={{ color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <CheckCircle size={14} color="#16a34a" /> ใช้ข้อมูลผู้ขายในระบบ (รหัส: #{formData.supplierId})
                                </span>
                                {!viewOnly && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            supplierId: '',
                                            supplierName: '',
                                            supplierAddress: '',
                                            supplierPhone: '',
                                            supplierEmail: '',
                                            supplierTaxId: ''
                                        }))}
                                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                                    >
                                        ล้างข้อมูล / ระบุรายใหม่
                                    </button>
                                )}
                            </div>
                        ) : formData.supplierName.trim() ? (
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px',
                                padding: '6px 12px', marginBottom: '14px', fontSize: '12px', color: '#1d4ed8'
                            }}>
                                <span>ℹ️ <strong>ผู้ขายรายใหม่</strong>: ระบบจะบันทึกเข้าฐานข้อมูลทะเบียนผู้ขาย (Supplier DB) ให้อัตโนมัติเมื่อกดบันทึก PO</span>
                            </div>
                        ) : null}

                        <div className="po-grid-2">
                            <div className="po-form-group">
                                <label>ชื่อผู้ขาย / บริษัทคู่ค้า <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    className="po-input"
                                    value={formData.supplierName}
                                    onChange={(e) => handleSupplierNameChange(e.target.value)}
                                    placeholder="เช่น บริษัท สเปเชียลตี้ เนเชอรัล โปรดักส์ จำกัด (มหาชน)"
                                    required
                                    readOnly={viewOnly}
                                />
                            </div>

                            <div className="po-form-group">
                                <label>เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                                <input
                                    type="text"
                                    className="po-input"
                                    value={formData.supplierTaxId}
                                    onChange={(e) => handleSupplierTaxIdChange(e.target.value)}
                                    placeholder="0105555xxxxxx"
                                    readOnly={viewOnly}
                                />
                            </div>
                        </div>

                        <div className="po-form-group" style={{ marginTop: '14px' }}>
                            <label>ที่อยู่ผู้ขาย (Address)</label>
                            <input
                                type="text"
                                className="po-input"
                                value={formData.supplierAddress}
                                onChange={(e) => setFormData(prev => ({ ...prev, supplierAddress: e.target.value }))}
                                placeholder="ที่อยู่สำนักงาน / โรงงานผู้ขาย"
                                readOnly={viewOnly}
                            />
                        </div>

                        <div className="po-grid-2" style={{ marginTop: '14px' }}>
                            <div className="po-form-group">
                                <label>เบอร์โทรศัพท์ (Tel)</label>
                                <input
                                    type="text"
                                    className="po-input"
                                    value={formData.supplierPhone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, supplierPhone: e.target.value }))}
                                    placeholder="เช่น 02-xxxxxxx หรือ 08x-xxxxxxx"
                                    readOnly={viewOnly}
                                />
                            </div>

                            <div className="po-form-group">
                                <label>อีเมล (Email)</label>
                                <input
                                    type="email"
                                    className="po-input"
                                    value={formData.supplierEmail}
                                    onChange={(e) => setFormData(prev => ({ ...prev, supplierEmail: e.target.value }))}
                                    placeholder="sales@company.com"
                                    readOnly={viewOnly}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. รายการสินค้า & บริการ */}
                    <div className="po-card">
                        <div className="po-card-header">
                            <span className="po-card-title">
                                <DollarSign size={18} color="#16a34a" /> รายการสินค้า / บริการที่สั่งซื้อ
                            </span>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>
                                ทั้งหมด {items.length} รายการ
                            </span>
                        </div>

                        <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '6px' }}>
                            <table className="po-items-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '45px', minWidth: '45px', textAlign: 'center', whiteSpace: 'nowrap' }}>ลำดับ</th>
                                        <th style={{ minWidth: '260px', whiteSpace: 'nowrap' }}>รายการสินค้า / บริการ</th>
                                        <th style={{ width: '95px', minWidth: '95px', textAlign: 'center', whiteSpace: 'nowrap' }}>จำนวน</th>
                                        <th style={{ width: '120px', minWidth: '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>หน่วย</th>
                                        <th style={{ width: '130px', minWidth: '130px', textAlign: 'right', whiteSpace: 'nowrap' }}>ราคา/หน่วย (บาท)</th>
                                        <th style={{ width: '120px', minWidth: '120px', textAlign: 'right', whiteSpace: 'nowrap' }}>รวม (บาท)</th>
                                        {!viewOnly && <th style={{ width: '45px', minWidth: '45px', textAlign: 'center', whiteSpace: 'nowrap' }}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it, idx) => {
                                        const lineTotal = (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0);
                                        return (
                                            <tr key={it.id || idx}>
                                                <td style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: 500 }}>{idx + 1}</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="po-input"
                                                        style={{ width: '100%' }}
                                                        value={it.name}
                                                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                                        placeholder="เช่น Turmeric Dried Powder หรือ ค่าขนส่ง"
                                                        readOnly={viewOnly}
                                                    />
                                                </td>
                                                <td style={{ width: '95px', minWidth: '95px' }}>
                                                    <input
                                                        type="number"
                                                        className="po-input"
                                                        style={{ width: '100%', textAlign: 'center' }}
                                                        value={it.qty}
                                                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                                                        min="0.0001"
                                                        step="any"
                                                        readOnly={viewOnly}
                                                    />
                                                </td>
                                                <td style={{ width: '120px', minWidth: '120px' }}>
                                                    <CustomSelect
                                                        name={`unit-${idx}`}
                                                        usePortal={true}
                                                        typeable={true}
                                                        value={it.unit}
                                                        placeholder="ระบุหน่วย"
                                                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                                        disabled={viewOnly}
                                                        style={{
                                                            width: '100%',
                                                            minWidth: '110px',
                                                            padding: '7px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '13.5px',
                                                            border: '1.5px solid #cbd5e1'
                                                        }}
                                                    >
                                                        {COMMON_UNITS.map(u => (
                                                            <option key={u} value={u}>{u}</option>
                                                        ))}
                                                    </CustomSelect>
                                                </td>
                                                <td style={{ width: '130px', minWidth: '130px' }}>
                                                    <input
                                                        type="number"
                                                        className="po-input"
                                                        style={{ width: '100%', textAlign: 'right' }}
                                                        value={it.price}
                                                        onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                                                        min="0"
                                                        step="0.01"
                                                        readOnly={viewOnly}
                                                    />
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                    {formatCurrency(lineTotal)}
                                                </td>
                                                {!viewOnly && (
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            className="po-btn-del-item"
                                                            onClick={() => handleRemoveItem(idx)}
                                                            title="ลบรายการ"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {!viewOnly && (
                            <button type="button" className="po-btn-add-item" onClick={handleAddItem}>
                                <Plus size={16} /> เพิ่มรายการสินค้า / บริการ
                            </button>
                        )}
                    </div>

                    {/* 4. หมายเหตุ & ลายเซ็น */}
                    <div className="po-card">
                        <div className="po-card-header">
                            <span className="po-card-title">
                                <User size={18} color="#16a34a" /> หมายเหตุ & ลายเซ็นผู้รับผิดชอบ
                            </span>
                        </div>

                        <div className="po-form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                <label style={{ margin: 0, fontWeight: 600 }}>
                                    หมายเหตุท้ายใบสั่งซื้อ (ข้อความนี้จะแสดงท้ายบิล สามารถแก้ไขข้อความและจัดรูปแบบได้)
                                </label>
                                {!viewOnly && (
                                    <button
                                        type="button"
                                        onClick={handleResetNotesTemplate}
                                        style={{
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                            background: '#f1f5f9',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            color: '#475569',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                        title="คืนค่าข้อความเริ่มต้น"
                                    >
                                        <RotateCcw size={11} /> คืนค่าเริ่มต้น
                                    </button>
                                )}
                            </div>
                            <div style={{ 
                                border: '1px solid #cbd5e1', 
                                borderRadius: '8px', 
                                minHeight: '84px', 
                                padding: '8px 12px', 
                                background: viewOnly ? '#f8fafc' : '#ffffff',
                                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                            }}>
                                <TipTapCell
                                    value={formData.notes}
                                    onChange={(html) => {
                                        setFormData(prev => ({ ...prev, notes: html }));
                                        localStorage.setItem('TemplateNotes_PurchaseOrder', html);
                                    }}
                                    readOnly={viewOnly}
                                    style={{ minHeight: '68px', fontSize: '13px' }}
                                    placeholder="เช่น ขอใบรับรองฮาลาล และใบ COA ของรายการสินค้าที่สั่งซื้อ"
                                />
                            </div>
                        </div>

                        <div className="po-grid-3" style={{ marginTop: '16px' }}>
                            <div className="po-form-group">
                                <label>ผู้ออกเอกสาร (ผู้ซื้อ)</label>
                                <CustomSelect
                                    name="preparedBy"
                                    value={formData.preparedBy}
                                    onChange={(e) => {
                                        const val = e?.target ? e.target.value : e;
                                        setFormData(prev => ({ ...prev, preparedBy: val }));
                                    }}
                                    disabled={viewOnly}
                                >
                                    <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
                                    {(userSignatures && userSignatures.length > 0 ? userSignatures : signatures).map(s => (
                                        <option key={s.KeyName} value={s.KeyName}>{s.FullName}</option>
                                    ))}
                                </CustomSelect>
                                {preparedSigPath && (
                                    <div style={{ marginTop: '8px', padding: '4px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', textAlign: 'center', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img 
                                            src={getSignatureUrl(preparedSigPath)} 
                                            alt="sig preview" 
                                            style={{ maxHeight: '36px', maxWidth: '100%', objectFit: 'contain' }} 
                                            onError={(e) => { e.target.onerror = null; e.target.src = preparedSigPath; }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="po-form-group">
                                <label>ผู้อนุมัติเอกสาร (ผู้ซื้อ)</label>
                                <CustomSelect
                                    name="approvedBy"
                                    value={formData.approvedBy}
                                    onChange={(e) => {
                                        const val = e?.target ? e.target.value : e;
                                        setFormData(prev => ({ ...prev, approvedBy: val }));
                                    }}
                                    disabled={viewOnly}
                                >
                                    <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
                                    {(bossSignatures && bossSignatures.length > 0 ? bossSignatures : [{ KeyName: 'thawat', FullName: 'ธวัช จรุงพิรวงศ์' }]).map(s => (
                                        <option key={s.KeyName} value={s.KeyName}>{s.FullName}</option>
                                    ))}
                                </CustomSelect>
                                {approvedSigPath && (
                                    <div style={{ marginTop: '8px', padding: '4px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', textAlign: 'center', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img 
                                            src={getSignatureUrl(approvedSigPath)} 
                                            alt="sig preview" 
                                            style={{ maxHeight: '36px', maxWidth: '100%', objectFit: 'contain' }} 
                                            onError={(e) => { e.target.onerror = null; e.target.src = approvedSigPath; }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="po-form-group">
                                <label>ผู้รับเอกสาร (ผู้ขาย)</label>
                                <input
                                    type="text"
                                    className="po-input"
                                    value={formData.supplierRecipient}
                                    onChange={(e) => setFormData(prev => ({ ...prev, supplierRecipient: e.target.value }))}
                                    placeholder="ลายเซ็น / ชื่อผู้ขายรับเอกสาร"
                                    readOnly={viewOnly}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Right Column: Financial Summary Sidebar (40%) ── */}
                <div className="po-sidebar">
                    <div className="po-summary-card">
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                            💰 สรุปยอดเงิน (Financial Summary)
                        </h3>

                        <div className="po-summary-row">
                            <span>มูลค่าก่อนคำนวณภาษี:</span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(subTotal)} บาท</span>
                        </div>

                        {/* ส่วนลด */}
                        <div className="po-summary-row" style={{ alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>ส่วนลด:</span>
                                <div style={{ width: '70px' }}>
                                    <input
                                        type="number"
                                        className="po-input"
                                        style={{ padding: '3px 6px', fontSize: '12px', textAlign: 'center' }}
                                        value={formData.discountPercent}
                                        onChange={(e) => setFormData(prev => ({ ...prev, discountPercent: parseFloat(e.target.value) || 0 }))}
                                        min="0"
                                        max="100"
                                        readOnly={viewOnly}
                                    />
                                </div>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>%</span>
                            </div>
                            <span style={{ color: discountAmount > 0 ? '#ef4444' : '#64748b' }}>
                                {discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : '0.00'} บาท
                            </span>
                        </div>

                        {/* VAT 7% */}
                        <div className="po-summary-row" style={{ alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>ภาษีมูลค่าเพิ่ม (VAT):</span>
                                <div style={{ width: '85px' }}>
                                    <CustomSelect
                                        name="vatRate"
                                        usePortal={true}
                                        value={String(formData.vatRate)}
                                        onChange={(e) => {
                                            const val = e?.target ? e.target.value : e;
                                            setFormData(prev => ({ ...prev, vatRate: parseFloat(val) || 0 }));
                                        }}
                                        disabled={viewOnly}
                                        style={{ width: '100%', textAlign: 'center' }}
                                    >
                                        <option value="7">7%</option>
                                        <option value="0">0% (ไม่มี)</option>
                                    </CustomSelect>
                                </div>
                            </div>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(vatAmount)} บาท</span>
                        </div>

                        <div className="po-summary-row" style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                            <span>ยอดรวมทั้งสิ้น (Grand Total):</span>
                            <span>{formatCurrency(grandTotal)} บาท</span>
                        </div>

                        {/* Withholding Tax */}
                        <div className="po-summary-row" style={{ alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>หัก ณ ที่จ่าย (WHT):</span>
                                <div style={{ width: '100px' }}>
                                    <CustomSelect
                                        name="withholdingTaxRate"
                                        usePortal={true}
                                        value={String(formData.withholdingTaxRate)}
                                        onChange={(e) => {
                                            const val = e?.target ? e.target.value : e;
                                            setFormData(prev => ({ ...prev, withholdingTaxRate: parseFloat(val) || 0 }));
                                        }}
                                        disabled={viewOnly}
                                        style={{ width: '100%', textAlign: 'center' }}
                                    >
                                        <option value="0">0%</option>
                                        <option value="1">1% (ขนส่ง)</option>
                                        <option value="2">2%</option>
                                        <option value="3">3% (บริการ)</option>
                                    </CustomSelect>
                                </div>
                            </div>
                            <span style={{ color: withholdingTaxAmount > 0 ? '#ef4444' : '#64748b' }}>
                                {withholdingTaxAmount > 0 ? `-${formatCurrency(withholdingTaxAmount)}` : '0.00'} บาท
                            </span>
                        </div>

                        {/* Green Highlight Box (จำนวนเงินที่ชำระ) */}
                        <div className="po-highlight-box">
                            <div>
                                <div className="po-highlight-label">จำนวนเงินที่ชำระ</div>
                                <div style={{ fontSize: '11px', color: '#166534' }}>Net Amount Payable</div>
                            </div>
                            <div className="po-highlight-value">
                                {formatCurrency(totalPayable)} บาท
                            </div>
                        </div>

                        <div className="po-thai-words">
                            ({ThaiBaht(totalPayable) || '-'})
                        </div>

                        <div className="po-summary-divider" />

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                            <button type="button" className="po-btn-print" style={{ justifyContent: 'center', width: '100%' }} onClick={handlePrint}>
                                <Printer size={16} /> พิมพ์ใบสั่งซื้อ (Print A4)
                            </button>
                            {!viewOnly && (
                                <button type="button" className="po-btn-save" style={{ justifyContent: 'center', width: '100%' }} onClick={handleSave} disabled={saving}>
                                    <Save size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึกใบสั่งซื้อ'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Container (Hidden on Screen by default, printed by window.print()) */}
            {renderPrintSheet()}

            {/* ── Modal: เลือกผู้ขายจากฐานข้อมูล (Supplier DB) ── */}
            <SupplierSelectorModal
                show={showSupplierModal}
                onClose={() => setShowSupplierModal(false)}
                suppliers={suppliers}
                selectedSupplierId={formData.supplierId}
                onSelect={handleSelectSupplier}
            />
        </div>
    );
}

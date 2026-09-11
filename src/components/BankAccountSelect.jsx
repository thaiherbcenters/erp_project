import React, { useState, useEffect, useMemo } from 'react';
import { Pin, Plus, Trash2, Check, ChevronDown, Building2, Upload, RotateCcw } from 'lucide-react';
import { useAlert } from './CustomAlert';
import './BankAccountSelect.css';

// รายการบัญชีมาตรฐานของระบบ
export const SYSTEM_BANKS = [
    {
        id: 'ktb',
        bankName: 'ธนาคารกรุงไทย',
        accountNo: '016-074423-7',
        accountName: 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์',
        shortCode: 'KTB',
        badgeClass: 'bank-badge-ktb',
        logo: '/images/banks/bank-ktb.png',
        defaultCategory: 'thc'
    },
    {
        id: 'kbank',
        bankName: 'ธนาคารกสิกรไทย',
        accountNo: '201-3-35956-6',
        accountName: 'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด',
        shortCode: 'KBANK',
        badgeClass: 'bank-badge-kbank',
        logo: '/images/banks/bank-kbank.png',
        defaultCategory: 'psf'
    },
    {
        id: 'kbank_charan',
        bankName: 'ธนาคารกสิกรไทย',
        accountNo: '235-1-19734-2',
        accountName: 'นาย จรัญ วาสิกสูตร',
        shortCode: 'KBANK',
        badgeClass: 'bank-badge-kbank',
        logo: '/images/banks/bank-kbank.png',
        defaultCategory: 'psf'
    },
    {
        id: 'scb',
        bankName: 'ธนาคารไทยพาณิชย์',
        accountNo: '365-2-68039-3',
        accountName: 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์',
        shortCode: 'SCB',
        badgeClass: 'bank-badge-scb',
        logo: '/images/banks/bank-scb.png',
        defaultCategory: 'thc'
    }
];

// แยกหมวดหมู่บริษัทตามประเภทเอกสาร (THC, PSF, ELT)
export const getDocCategory = (docType) => {
    if (!docType) return 'thc';
    const lower = String(docType).toLowerCase();
    if (lower.includes('_psf') || lower.endsWith('psf')) return 'psf';
    if (lower.includes('_elt') || lower.endsWith('elt')) return 'elt';
    return 'thc';
};

// ดึงรายการบัญชีที่ถูกลบ/ซ่อนตามประเภทเอกสารและกลุ่มบริษัท
export const getDeletedBankIds = (docType) => {
    try {
        const category = getDocCategory(docType);
        const set = new Set();
        // 1. จาก docType โดยตรง
        if (docType) {
            const list = JSON.parse(localStorage.getItem(`deletedBanks_${docType}`)) || [];
            list.forEach(id => set.add(id));
        }
        // 2. จาก group category (thc, psf, elt)
        const groupList = JSON.parse(localStorage.getItem(`deletedBanks_group_${category}`)) || [];
        groupList.forEach(id => set.add(id));
        return Array.from(set);
    } catch {
        return [];
    }
};

// บันทึกบัญชีที่ถูกลบสำหรับประเภทเอกสารและกลุ่มบริษัท
export const addDeletedBankId = (docType, bankId) => {
    try {
        const category = getDocCategory(docType);
        const currentGroup = JSON.parse(localStorage.getItem(`deletedBanks_group_${category}`)) || [];
        if (!currentGroup.includes(bankId)) {
            currentGroup.push(bankId);
            localStorage.setItem(`deletedBanks_group_${category}`, JSON.stringify(currentGroup));
        }
        if (docType) {
            const currentDoc = JSON.parse(localStorage.getItem(`deletedBanks_${docType}`)) || [];
            if (!currentDoc.includes(bankId)) {
                currentDoc.push(bankId);
                localStorage.setItem(`deletedBanks_${docType}`, JSON.stringify(currentDoc));
            }
        }
    } catch (e) {
        console.error('Error saving deleted bank:', e);
    }
};

// คืนค่าบัญชีมาตรฐานที่ถูกลบ
export const restoreDeletedBanks = (docType) => {
    try {
        const category = getDocCategory(docType);
        localStorage.removeItem(`deletedBanks_group_${category}`);
        if (docType) {
            localStorage.removeItem(`deletedBanks_${docType}`);
        }
    } catch (e) {
        console.error('Error restoring deleted banks:', e);
    }
};

// ดึงบัญชีที่สร้างเอง (Custom Banks) แยกตามกลุ่มประเภทเอกสาร
export const getCustomBanksForDocType = (docType) => {
    try {
        const category = getDocCategory(docType);
        const key = `customBanks_group_${category}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            return JSON.parse(stored) || [];
        }
        // Fallback: ตรวจสอบ customBanks เดิมถ้ายังไม่แยก
        const legacy = localStorage.getItem('customBanks');
        if (legacy) {
            const parsed = JSON.parse(legacy) || [];
            return parsed.filter(b => (!b.category && category === 'thc') || b.category === category);
        }
        return [];
    } catch {
        return [];
    }
};

// บันทึกบัญชีที่สร้างเอง (Custom Banks) แยกตามกลุ่มประเภทเอกสาร
export const saveCustomBanksForDocType = (docType, customList) => {
    try {
        const category = getDocCategory(docType);
        localStorage.setItem(`customBanks_group_${category}`, JSON.stringify(customList));
        if (docType) {
            localStorage.setItem(`customBanks_${docType}`, JSON.stringify(customList));
        }
    } catch (e) {
        console.error('Error saving custom banks:', e);
    }
};

// บัญชีเริ่มต้นตามกลุ่มบริษัท
export const getDefaultBankForDocType = (docType) => {
    const category = getDocCategory(docType);
    const deleted = getDeletedBankIds(docType);

    let candidate = category === 'psf' ? 'kbank' : 'ktb';
    if (!deleted.includes(candidate)) return candidate;

    // ถ้า candidate โดนลบ ให้หาบัญชีมาตรฐานแรกที่ไม่โดนลบ
    const available = SYSTEM_BANKS.find(b => !deleted.includes(b.id));
    return available ? available.id : 'ktb';
};

// ดึง ID บัญชีที่ปักหมุดไว้ตามประเภทเอกสาร / กลุ่มบริษัท
export const getPinnedBankAccount = (docType) => {
    try {
        const category = getDocCategory(docType);
        const deleted = getDeletedBankIds(docType);

        // 1. ตรวจสอบการปักหมุดเฉพาะประเภทเอกสารนี้ (เช่น quotation_psf)
        if (docType) {
            const specificPin = localStorage.getItem(`pinnedBank_${docType}`);
            if (specificPin && !deleted.includes(specificPin)) return specificPin;
        }
        // 2. ตรวจสอบการปักหมุดตามกลุ่มบริษัท (เช่น psf, thc, elt)
        const groupPin = localStorage.getItem(`pinnedBank_group_${category}`);
        if (groupPin && !deleted.includes(groupPin)) return groupPin;

        // 3. Fallback สำหรับ THC ให้ดู legacy key เดิม (ถ้ามี)
        if (category === 'thc') {
            const legacyPin = localStorage.getItem('pinnedBankAccount');
            if (legacyPin && legacyPin !== 'kbank' && !deleted.includes(legacyPin)) return legacyPin;
        }

        return getDefaultBankForDocType(docType);
    } catch {
        return getDefaultBankForDocType(docType);
    }
};

export default function BankAccountSelect({ value, onChange, label, required = true, docType }) {
    const { showAlert, showConfirm } = useAlert();
    const [isOpen, setIsOpen] = useState(false);
    
    // บัญชีที่ปักหมุดไว้ (สัมพันธ์กับประเภทเอกสาร)
    const [pinnedId, setPinnedId] = useState(() => getPinnedBankAccount(docType));

    // รายการบัญชีที่สร้างเองสำหรับเอกสารกลุ่มนี้
    const [customBanks, setCustomBanks] = useState(() => getCustomBanksForDocType(docType));

    // รายการ ID บัญชีที่ถูกลบสำหรับเอกสารกลุ่มนี้
    const [deletedBankIds, setDeletedBankIds] = useState(() => getDeletedBankIds(docType));

    // ซิงก์ข้อมูลเมื่อประเภทเอกสารเปลี่ยน
    useEffect(() => {
        setPinnedId(getPinnedBankAccount(docType));
        setCustomBanks(getCustomBanksForDocType(docType));
        setDeletedBankIds(getDeletedBankIds(docType));
    }, [docType]);

    // Modal เพิ่มบัญชีใหม่
    const [addModal, setAddModal] = useState({
        open: false,
        bankName: '',
        accountName: '',
        accountNo: '',
        logo: null,
        setAsPinned: false
    });

    // รวมบัญชีทั้งหมดที่ยังไม่ถูกลบ
    const allBanks = useMemo(() => {
        // กรองบัญชีระบบที่ไม่ถูกลบในประเภทเอกสารนี้
        const activeSystemBanks = SYSTEM_BANKS.filter(b => !deletedBankIds.includes(b.id));

        const formattedCustom = customBanks.map((b, idx) => ({
            id: b.id || `custom_${idx}_${b.accountNo}`,
            isCustom: true,
            customIndex: idx,
            bankName: b.bankName,
            accountNo: b.accountNo,
            accountName: b.accountName || '—',
            shortCode: (b.bankName || 'BANK').substring(0, 4).toUpperCase(),
            badgeClass: 'bank-badge-custom',
            logo: b.logo || null,
            rawObject: b
        }));

        const list = [...activeSystemBanks, ...formattedCustom];

        // จัดลำดับ: บัญชีที่ถูกปักหมุดขึ้นอันดับ 1 เสมอ
        return list.sort((a, b) => {
            const aIsPinned = (a.id === pinnedId || (a.isCustom && (JSON.stringify(a.rawObject) === pinnedId || a.id === pinnedId)));
            const bIsPinned = (b.id === pinnedId || (b.isCustom && (JSON.stringify(b.rawObject) === pinnedId || b.id === pinnedId)));
            if (aIsPinned && !bIsPinned) return -1;
            if (!aIsPinned && bIsPinned) return 1;
            return 0;
        });
    }, [customBanks, deletedBankIds, pinnedId]);

    // ค้นหาบัญชีที่เลือกอยู่ในปัจจุบัน
    const selectedBank = useMemo(() => {
        if (!value) return allBanks[0] || SYSTEM_BANKS[0];
        
        // ตรวจสอบแบบ ID ตรงๆ (เช่น 'ktb', 'kbank_charan')
        const foundById = allBanks.find(b => b.id === value);
        if (foundById) return foundById;

        // ตรวจสอบแบบ JSON object
        try {
            const parsed = typeof value === 'object' ? value : JSON.parse(value);
            const foundByData = allBanks.find(b => 
                b.accountNo === parsed.accountNo && b.bankName === parsed.bankName
            );
            if (foundByData) return foundByData;

            // ถ้าไม่มีในลิสต์แต่ parse ได้ ให้แสดงผลข้อมูลนั้น
            return {
                id: 'custom_runtime',
                bankName: parsed.bankName,
                accountNo: parsed.accountNo,
                accountName: parsed.accountName || '—',
                shortCode: (parsed.bankName || 'BANK').substring(0, 4).toUpperCase(),
                badgeClass: 'bank-badge-custom',
                logo: parsed.logo || null
            };
        } catch {
            return allBanks[0] || SYSTEM_BANKS[0];
        }
    }, [value, allBanks]);

    // ตรวจสอบว่าบัญชีนี้เป็นบัญชีที่ปักหมุดหรือไม่
    const isBankPinned = (bank) => {
        if (!bank) return false;
        if (bank.id === pinnedId) return true;
        if (bank.isCustom) {
            if (JSON.stringify(bank.rawObject) === pinnedId) return true;
            if (bank.id === pinnedId) return true;
        }
        return false;
    };

    // ปักหมุดบัญชี
    const handleTogglePin = (e, bank) => {
        e.stopPropagation();
        const pinKey = bank.isCustom ? JSON.stringify(bank.rawObject) : bank.id;
        const category = getDocCategory(docType);
        const categoryUpper = category.toUpperCase();
        
        try {
            if (docType) {
                localStorage.setItem(`pinnedBank_${docType}`, pinKey);
            }
            if (category) {
                localStorage.setItem(`pinnedBank_group_${category}`, pinKey);
            }
            if (category === 'thc') {
                localStorage.setItem('pinnedBankAccount', pinKey);
            }
            setPinnedId(pinKey);
            showAlert('ปักหมุดสำเร็จ', `ตั้งให้ "${bank.bankName} (${bank.accountNo})" เป็นบัญชีเริ่มต้นสำหรับเอกสารกลุ่ม ${categoryUpper} แล้ว`, 'success');
        } catch (err) {
            console.error(err);
        }
    };

    // เลือกบัญชี
    const handleSelect = (bank) => {
        if (bank.isCustom) {
            onChange(JSON.stringify(bank.rawObject));
        } else {
            onChange(bank.id);
        }
        setIsOpen(false);
    };

    // ลบบัญชี (แยกตามประเภทเอกสารและกลุ่มบริษัท)
    const handleDeleteBank = async (e, bank) => {
        e.stopPropagation();
        const category = getDocCategory(docType);
        const categoryUpper = category.toUpperCase();

        if (allBanks.length <= 1) {
            showAlert('ไม่สามารถลบได้', `ต้องมีบัญชีธนาคารอย่างน้อย 1 บัญชีสำหรับเอกสารกลุ่ม ${categoryUpper}`, 'warning');
            return;
        }

        const ok = await showConfirm(
            'ยืนยันการลบบัญชี',
            `คุณต้องการลบบัญชี "${bank.bankName} (${bank.accountNo})" ออกจากเอกสารกลุ่ม ${categoryUpper} ใช่หรือไม่?\n(จะไม่ส่งผลกระทบต่อเอกสารประเภทอื่น)`,
            'warning'
        );
        if (!ok) return;

        // คำนวณบัญชีสำรองที่จะเลือกแทนที่
        const remaining = allBanks.filter(b => b.id !== bank.id);
        const fallbackBank = remaining[0];

        if (bank.isCustom) {
            // ลบจากรายการ custom banks สำหรับกลุ่มนี้
            const updated = customBanks.filter(b => (b.accountNo !== bank.accountNo || b.bankName !== bank.bankName));
            setCustomBanks(updated);
            saveCustomBanksForDocType(docType, updated);
        } else {
            // เพิ่มเข้า deletedBankIds สำหรับประเภทเอกสารนี้
            addDeletedBankId(docType, bank.id);
            setDeletedBankIds(getDeletedBankIds(docType));
        }

        // ถ้าลบบัญชีที่ปักหมุดอยู่ ให้ล้างหมุดและปักหมุดตัวสำรอง
        if (isBankPinned(bank)) {
            if (docType) localStorage.removeItem(`pinnedBank_${docType}`);
            localStorage.removeItem(`pinnedBank_group_${category}`);
            if (category === 'thc') localStorage.removeItem('pinnedBankAccount');

            if (fallbackBank) {
                const newPinKey = fallbackBank.isCustom ? JSON.stringify(fallbackBank.rawObject) : fallbackBank.id;
                if (docType) localStorage.setItem(`pinnedBank_${docType}`, newPinKey);
                localStorage.setItem(`pinnedBank_group_${category}`, newPinKey);
                setPinnedId(newPinKey);
            }
        }

        // ถ้าลบบัญชีที่เลือกใช้อยู่ ให้เปลี่ยนไปเลือกบัญชีสำรอง
        const isCurrentlySelected = selectedBank.id === bank.id || 
            (bank.isCustom && selectedBank.accountNo === bank.accountNo);
        if (isCurrentlySelected && fallbackBank) {
            if (fallbackBank.isCustom) {
                onChange(JSON.stringify(fallbackBank.rawObject));
            } else {
                onChange(fallbackBank.id);
            }
        }

        showAlert('สำเร็จ', `ลบบัญชีออกจากเอกสารกลุ่ม ${categoryUpper} เรียบร้อยแล้ว`, 'success');
    };

    // คืนค่าบัญชีมาตรฐานทั้งหมดสำหรับเอกสารกลุ่มนี้
    const handleRestoreDefaults = async (e) => {
        e.stopPropagation();
        const category = getDocCategory(docType);
        const categoryUpper = category.toUpperCase();

        const ok = await showConfirm(
            'คืนค่าบัญชีมาตรฐาน',
            `คุณต้องการคืนค่าบัญชีมาตรฐานทั้งหมดสำหรับเอกสารกลุ่ม ${categoryUpper} ใช่หรือไม่?`,
            'info'
        );
        if (!ok) return;

        restoreDeletedBanks(docType);
        setDeletedBankIds([]);
        showAlert('สำเร็จ', `คืนค่าบัญชีมาตรฐานสำหรับเอกสารกลุ่ม ${categoryUpper} เรียบร้อยแล้ว`, 'success');
    };

    // บันทึกบัญชีใหม่ (ผูกกับกลุ่มเอกสารปัจจุบัน)
    const handleSaveNewBank = () => {
        const { bankName, accountName, accountNo, logo, setAsPinned } = addModal;
        if (!bankName.trim() || !accountName.trim() || !accountNo.trim()) {
            showAlert('แจ้งเตือน', 'กรุณากรอกชื่อธนาคาร ชื่อบัญชี และเลขที่บัญชีให้ครบถ้วน', 'warning');
            return;
        }

        const category = getDocCategory(docType);
        const categoryUpper = category.toUpperCase();

        const newBank = {
            id: `custom_${Date.now()}_${accountNo.trim().replace(/\D/g, '')}`,
            bankName: bankName.trim(),
            accountName: accountName.trim(),
            accountNo: accountNo.trim(),
            logo: logo || null,
            category: category,
            docType: docType || null
        };

        const updated = [...customBanks, newBank];
        setCustomBanks(updated);
        saveCustomBanksForDocType(docType, updated);

        const newBankJson = JSON.stringify(newBank);
        if (setAsPinned) {
            try {
                if (docType) localStorage.setItem(`pinnedBank_${docType}`, newBankJson);
                if (category) localStorage.setItem(`pinnedBank_group_${category}`, newBankJson);
                if (category === 'thc') localStorage.setItem('pinnedBankAccount', newBankJson);
                setPinnedId(newBankJson);
            } catch {}
        }

        onChange(newBankJson);
        setAddModal({ open: false, bankName: '', accountName: '', accountNo: '', logo: null, setAsPinned: false });
        showAlert('สำเร็จ', `เพิ่มบัญชีธนาคารสำหรับเอกสารกลุ่ม ${categoryUpper} เรียบร้อยแล้ว`, 'success');
    };

    const currentCategory = getDocCategory(docType).toUpperCase();

    return (
        <div className="bank-select-wrapper">
            {label && (
                <label className="bank-select-label">
                    {label} {required && <span className="bank-select-required">*</span>}
                </label>
            )}

            {/* กล่องแสดงผล (สถานะปิด) */}
            <div 
                className={`bank-select-box ${isOpen ? 'is-open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="คลิกเพื่อเลือกบัญชีธนาคาร"
            >
                <div className="bank-select-content-left">
                    <div className={`bank-badge-box ${selectedBank.badgeClass || 'bank-badge-custom'}`}>
                        {selectedBank.logo ? (
                            <img src={selectedBank.logo} alt={selectedBank.shortCode} />
                        ) : (
                            <span>{selectedBank.shortCode}</span>
                        )}
                    </div>
                    <div className="bank-text-group">
                        <div className="bank-title-row">
                            <span className="bank-title-text">{selectedBank.bankName} ({selectedBank.accountNo})</span>
                        </div>
                        <div className="bank-account-name">
                            ชื่อบัญชี: <strong>{selectedBank.accountName}</strong>
                        </div>
                    </div>
                </div>
                <div className="bank-right-meta">
                    {isBankPinned(selectedBank) && (
                        <span className="bank-pin-tag" title="บัญชีเริ่มต้น (ปักหมุดแล้ว)">📌</span>
                    )}
                    <div className="bank-select-chevron">
                        <ChevronDown size={14} />
                    </div>
                </div>
            </div>

            {/* Dropdown Options */}
            {isOpen && (
                <>
                    <div className="bank-select-backdrop" onClick={() => setIsOpen(false)} />
                    <div className="bank-dropdown-menu">
                        <div className="bank-dropdown-header">
                            <span>รายการบัญชี ({currentCategory})</span>
                            <span>📌 ปักหมุด &nbsp; 🗑️ ลบเฉพาะกลุ่มนี้</span>
                        </div>

                        <div className="bank-dropdown-list">
                            {allBanks.map((bank) => {
                                const pinned = isBankPinned(bank);
                                const selected = selectedBank.id === bank.id || 
                                    (bank.isCustom && selectedBank.accountNo === bank.accountNo);

                                return (
                                    <div
                                        key={bank.id}
                                        className={`bank-dropdown-item ${pinned ? 'is-pinned' : ''} ${selected ? 'is-selected' : ''}`}
                                        onClick={() => handleSelect(bank)}
                                    >
                                        <div className="bank-dropdown-item-left">
                                            <div className={`bank-badge-box ${bank.badgeClass || 'bank-badge-custom'}`}>
                                                {bank.logo ? (
                                                    <img src={bank.logo} alt={bank.shortCode} />
                                                ) : (
                                                    <span>{bank.shortCode}</span>
                                                )}
                                            </div>
                                            <div className="bank-text-group">
                                                <div className="bank-title-row">
                                                    <span className="bank-title-text">{bank.bankName} ({bank.accountNo})</span>
                                                    {pinned && (
                                                        <span className="bank-pin-tag-inline">📌 บัญชีเริ่มต้น</span>
                                                    )}
                                                </div>
                                                <div className="bank-account-name">
                                                    ชื่อบัญชี: <strong>{bank.accountName}</strong>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bank-dropdown-item-actions">
                                            <button
                                                type="button"
                                                className={`bank-action-pin-btn ${pinned ? 'is-active' : ''}`}
                                                onClick={(e) => handleTogglePin(e, bank)}
                                                title={pinned ? `เป็นบัญชีเริ่มต้นสำหรับ ${currentCategory} แล้ว (คลิกเพื่อต่อหมุด)` : `คลิกเพื่อปักหมุดเป็นบัญชีเริ่มต้นสำหรับ ${currentCategory}`}
                                            >
                                                <Pin size={12} style={{ fill: pinned ? '#f59e0b' : 'none' }} />
                                            </button>

                                            <button
                                                type="button"
                                                className="bank-action-del-btn"
                                                onClick={(e) => handleDeleteBank(e, bank)}
                                                title={`ลบบัญชีนี้ออกจากเอกสารกลุ่ม ${currentCategory}`}
                                            >
                                                <Trash2 size={13} />
                                            </button>

                                            {selected && (
                                                <div className="bank-selected-check" title="เลือกใช้อยู่">
                                                    <Check size={12} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* เมนูด้านล่าง: เพิ่มบัญชีใหม่ + กู้คืนบัญชีมาตรฐานที่ลบ */}
                        <div className="bank-dropdown-footer-actions">
                            <button 
                                type="button"
                                className="bank-add-footer-btn"
                                onClick={() => {
                                    setIsOpen(false);
                                    setAddModal({ open: true, bankName: '', accountName: '', accountNo: '', logo: null, setAsPinned: false });
                                }}
                            >
                                <Plus size={14} /> เพิ่มบัญชีใหม่
                            </button>

                            {deletedBankIds.length > 0 && (
                                <button 
                                    type="button"
                                    className="bank-restore-footer-btn"
                                    onClick={handleRestoreDefaults}
                                    title={`กู้คืนบัญชีมาตรฐานที่ถูกลบสำหรับ ${currentCategory} (${deletedBankIds.length} บัญชี)`}
                                >
                                    <RotateCcw size={12} /> คืนค่าบัญชีมาตรฐาน ({deletedBankIds.length})
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Modal เพิ่มบัญชีใหม่ */}
            {addModal.open && (
                <div className="custom-alert-overlay" onClick={() => setAddModal({ ...addModal, open: false })}>
                    <div className="custom-alert-modal custom-alert-info" onClick={(e) => e.stopPropagation()} style={{ width: '420px', maxWidth: '92vw' }}>
                        <div className="custom-alert-content" style={{ textAlign: 'left', padding: '10px' }}>
                            <h3 className="custom-alert-title" style={{ textAlign: 'center', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <Building2 size={20} color="#2563eb" /> เพิ่มบัญชีธนาคารใหม่ ({currentCategory})
                            </h3>

                            <div className="form-group" style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '6px', display: 'block', fontWeight: 'bold' }}>
                                    ชื่อธนาคาร <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={addModal.bankName}
                                    onChange={(e) => setAddModal({ ...addModal, bankName: e.target.value })}
                                    autoFocus
                                    placeholder="เช่น ธนาคารไทยพาณิชย์, ธนาคารกรุงเทพ..."
                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '6px', display: 'block', fontWeight: 'bold' }}>
                                    ชื่อบัญชี (บริษัท/บุคคล) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={addModal.accountName}
                                    onChange={(e) => setAddModal({ ...addModal, accountName: e.target.value })}
                                    placeholder="เช่น บจก. พรีเมียร์ สมาร์ท ฟาร์ม, วิสาหกิจชุมชน..."
                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '6px', display: 'block', fontWeight: 'bold' }}>
                                    เลขที่บัญชี <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={addModal.accountNo}
                                    onChange={(e) => setAddModal({ ...addModal, accountNo: e.target.value })}
                                    placeholder="เช่น 123-4-56789-0..."
                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '6px', display: 'block', fontWeight: 'bold' }}>
                                    โลโก้ธนาคาร (ทางเลือก)
                                </label>
                                <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: '8px', padding: '12px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        id="modalNewBankLogo"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (re) => setAddModal(prev => ({ ...prev, logo: re.target.result }));
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    <label htmlFor="modalNewBankLogo" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                                        {addModal.logo ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <img src={addModal.logo} alt="Preview" style={{ height: '32px', objectFit: 'contain' }} />
                                                <span style={{ color: '#10b981', fontWeight: 600 }}>เลือกรูปแล้ว (คลิกเพื่อเปลี่ยน)</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload size={18} color="#94a3b8" />
                                                <span>คลิกเพื่ออัปโหลดไฟล์รูปภาพโลโก้</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {/* ตัวเลือกปักหมุดทันที */}
                            <div style={{ marginBottom: '20px', padding: '10px 12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#92400e', fontWeight: 600, cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox"
                                        checked={addModal.setAsPinned}
                                        onChange={(e) => setAddModal({ ...addModal, setAsPinned: e.target.checked })}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <span>📌 ปักหมุดให้บัญชีนี้เป็นค่าเริ่มต้นสำหรับ ${currentCategory} ทันที</span>
                                </label>
                            </div>
                        </div>

                        <div className="custom-alert-actions" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                type="button"
                                className="custom-alert-btn custom-alert-btn-cancel"
                                onClick={() => setAddModal({ ...addModal, open: false })}
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                className="custom-alert-btn custom-alert-btn-confirm"
                                onClick={handleSaveNewBank}
                            >
                                บันทึกบัญชี
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * =============================================================================
 * ChequeForm.jsx — ระบบเขียนและพิมพ์เช็คธนาคาร (ELITE) ในโครงสร้าง ERP Layout
 * =============================================================================
 * 
 * ทำงานร่วมกับ Sidebar และ Top Navbar ของระบบ ERP (เหมือนกับ THC):
 *   1. แท็บ 'form'        : หน้าเขียนและพิมพ์เช็ค พร้อมตัวอย่างจำลองเช็คกสิกรไทยจริง
 *   2. แท็บ 'history'     : หน้าดูประวัติการสั่งจ่ายเช็ค ค้นหา และโหลดมาพิมพ์ซ้ำ
 *   3. โหมดพิมพ์ลงบน "ใบเช็คจริง" (ซ่อนกราฟิกพิมพ์เฉพาะข้อมูล)
 *   4. โหมดพิมพ์ "ใบสำคัญจ่าย A4 (Payment Voucher)"
 * =============================================================================
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from './CustomAlert';
import { numberToThaiBaht, formatChequeAmount } from '../utils/thaiBahtConverter';
import {
    Printer, Save, RotateCcw, History, FileSpreadsheet,
    Calendar, CreditCard, DollarSign, User, FileText, Trash2, Eye,
    CheckCircle2, ChevronRight, Search, Plus, Image, ArrowLeft, Pencil, X,
    Sliders, ChevronDown, Lock, Unlock
} from 'lucide-react';
import '../pages/PageCommon.css';
import './ChequeForm.css';
import CustomSelect from './CustomSelect';

// ข้อมูลตั้งต้นของเช็คกสิกรไทย (อ้างอิงจากรูปถ่ายจริง)
const DEFAULT_KBANK_CONFIG = {
    bankName: 'ธนาคารกสิกรไทย',
    bankNameEN: 'KASIKORNBANK',
    branchText: '0312-สาขาสนามบินน้ำ 347 ชั้น 1 ห้องเลขที่ 101 ถนนนนทบุรี ตำบลท่าทราย อำเภอเมือง จังหวัดนนทบุรี',
    branchNo: '0312',
    accountNo: '0681758488',
    chequeNo: '59840064',
    micrCode: '⑆69 ⑈59840064⑈004⑉0312⑆ 0681758488⑈'
};

// พิกัดมิลลิเมตรสำหรับการพิมพ์ลงใบเช็คจริง (ปรับจูนตามระยะจริงของเครื่องพิมพ์และใบเช็ค 17.7 x 9.0 cm)
const DEFAULT_PRINT_CONFIG = {
    paperWidth: 177, // mm
    paperHeight: 90,  // mm
    offsetX: 0,       // mm ชดเชยแนวนอน
    offsetY: 0,       // mm ชดเชยแนวตั้ง
    feedMode: 'custom-slip', // 'custom-slip' (ขนาดกำหนดเอง 17.7 × 9 ซม.) | 'a4-center' | 'a4-left' | 'a4-right'
    dateX: 120,       // mm ช่องวันที่ช่องแรก (120 mm จากขอบซ้าย)
    dateY: 3.5,       // mm แนววันที่ (3.5 mm จากขอบบน)
    dateStep: 6.3,    // mm ระยะห่างแต่ละช่องวันที่ (6.3 mm ต่อช่อง)
    payeeX: 35,       // mm สั่งจ่ายให้ (35 mm จากขอบซ้าย)
    payeeY: 20.5,     // mm บรรทัดจ่าย (20.5 mm จากขอบบน)
    bahtX: 35,        // mm บาทตัวอักษร (35 mm จากขอบซ้าย)
    bahtY: 29,        // mm บรรทัดบาท (29 mm จากขอบบน)
    amountX: 116,     // mm ช่องตัวเลข ฿ (116 mm จากขอบซ้าย)
    amountY: 38,      // mm แนวตัวเลข (38 mm จากขอบบน)
    crossX: 0,        // mm ขีดคร่อม
    crossY: 0,        // mm ขีดคร่อม
    fontSizePayee: 11,// pt — ชื่อผู้รับเงินบนใบเช็คจริง
    fontSizeBaht: 11, // pt — จำนวนเงินตัวอักษร
    fontSizeAmount: 10.5,// pt — ช่องตัวเลข ฿
    fontSizeDate: 8.5, // pt — ตัวเลขในช่องวันที่
    rotate180: true,   // boolean — หมุนพิมพ์ 180° อัตโนมัติ (เอาฝั่งวันที่เข้าก่อน แก้ปัญหา HP กินขอบท้าย)
};

/**
 * ลบเครื่องหมายดอกจัน * ออกจากข้อความตัวอักษร
 */
const cleanBahtText = (str) => {
    if (!str) return '';
    return String(str).replace(/\*/g, '').trim();
};

/**
 * จัดรูปแบบเครื่องหมายดอกจัน ** กำกับหัวท้าย (ป้องกันไม่ให้ซ้ำซ้อนเป็น ****)
 */
const ensureAsterisks = (str) => {
    if (!str) return '';
    let clean = String(str).trim();
    clean = clean.replace(/^\*+/, '').replace(/\*+$/, '').trim();
    return `**${clean}**`;
};

/**
 * คำนวณขนาดตัวอักษร (pt) อัตโนมัติไม่ให้ข้อความล้นความกว้างสูงสุด (mm)
 * โดยใช้ HTML5 Canvas วัดความกว้างจริงของฟอนต์ Sarabun
 */
const calculateAutoFitPt = (text, basePt = 8.5, maxMm = 135, minPt = 6.0) => {
    if (!text) return basePt;
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // 96 DPI: 1 pt = 96/72 px = 1.3333 px. 1 mm = 96 / 25.4 px = 3.7795 px.
            const ptToPx = 96 / 72;
            const mmToPx = 96 / 25.4;
            const maxPx = maxMm * mmToPx;

            ctx.font = `bold ${basePt * ptToPx}px 'Sarabun', sans-serif`;
            const measuredWidth = ctx.measureText(text).width;

            if (measuredWidth > maxPx && maxPx > 0) {
                const ratio = maxPx / measuredWidth;
                const fittedPt = basePt * ratio * 0.96; // เผื่อระยะขอบปลอดภัย 4%
                return Math.max(minPt, Number(fittedPt.toFixed(1)));
            }
        }
    } catch (e) {
        console.error('Error measuring text width:', e);
    }
    return basePt;
};

export default function ChequeForm() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentTab = searchParams.get('tab') || 'history'; // Default to history table (หน้าหลัก)

    const chequePrintRef = useRef(null);
    const voucherPrintRef = useRef(null);

    // พิกัดการพิมพ์ใบเช็คจริง (โหลดจาก LocalStorage ถ้ามีบันทึกไว้ และจำค่าล่าสุดเสมอ)
    const [printConfig, setPrintConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('kbank_cheque_print_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                return { 
                    ...DEFAULT_PRINT_CONFIG, 
                    ...parsed,
                    rotate180: parsed.rotate180 !== undefined ? parsed.rotate180 : true
                };
            }
        } catch (e) {
            console.error('Error loading print config:', e);
        }
        return { ...DEFAULT_PRINT_CONFIG, rotate180: true };
    });

    // สถานะการล็อกพิกัด (ล็อกไว้เสมอเป็นค่าเริ่มต้นเพื่อป้องกันการกดโดน ถ้าจะแก้ต้องกดปลดล็อกก่อน)
    const [isConfigLocked, setIsConfigLocked] = useState(true);

    const [previewTab, setPreviewTab] = useState('real'); // 'real' (พิมพ์ลงใบจริง) | 'mockup' (ตัวอย่างหน้าเช็ค)
    // จำสถานะการเปิดแผงตั้งค่าละเอียดไว้ เข้ามาใหม่ให้เปิดค้างไว้ตามที่เคยเปิด
    const [showAdvancedConfig, setShowAdvancedConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('kbank_cheque_show_advanced');
            return saved !== null ? saved === 'true' : true; // ค่าเริ่มต้นเปิดค้างไว้เพื่อให้ผู้ใช้เห็นทันที
        } catch (e) {
            return true;
        }
    });
    const [isConfigSavedNotice, setIsConfigSavedNotice] = useState(false);

    const { currentUser, canCreate, canDelete } = useAuth();
    const { showAlert } = useAlert();

    // ── Form State ──
    const [chequeNo, setChequeNo] = useState(DEFAULT_KBANK_CONFIG.chequeNo);
    const [issueDate, setIssueDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [isBuddhistYear, setIsBuddhistYear] = useState(false); // พ.ศ. (บวก 543)
    const [payee, setPayee] = useState('');
    const [amount, setAmount] = useState('');
    const [manualBahtText, setManualBahtText] = useState('');
    const [isManualBaht, setIsManualBaht] = useState(false);
    
    // Checkbox toggles (เริ่มต้นติ๊กออกไว้ก่อนตามคำขอ)
    const [isCrossed, setIsCrossed] = useState(false); // // A/C PAYEE ONLY //
    const [isStrikeBearer, setIsStrikeBearer] = useState(false); // ขีดฆ่า หรือผู้ถือ
    
    // Additional Document Details
    const [refDocNo, setRefDocNo] = useState('');
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState(issueDate);
    const [voucherNo, setVoucherNo] = useState(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        return `PV-${y}${m}-001`;
    });


    // Modal State
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [searchHistory, setSearchHistory] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingChequeId, setEditingChequeId] = useState(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [chequeHistoryList, setChequeHistoryList] = useState([]);
    const [loadingChequeHistory, setLoadingChequeHistory] = useState(false);
    const [selectedHistoryCheque, setSelectedHistoryCheque] = useState(null);

    // คำนวณจำนวนเงินตัวอักษรภาษาไทยแบบเรียลไทม์ (ไม่มีดอกจัน *)
    const autoBahtText = useMemo(() => {
        if (!amount || isNaN(parseFloat(amount))) return '';
        return numberToThaiBaht(amount, { prefix: '', suffix: '' });
    }, [amount]);

    const activeBahtText = isManualBaht ? manualBahtText : autoBahtText;

    // คำนวณตัวเลขใน 8 ช่องวันที่
    const dateDigits = useMemo(() => {
        if (!issueDate) return Array(8).fill('');
        const [yearStr, monthStr, dayStr] = issueDate.split('-');
        let yearNum = parseInt(yearStr, 10);
        if (isBuddhistYear) {
            yearNum += 543;
        }
        const fullYearStr = String(yearNum).padStart(4, '0');
        const fullMonthStr = String(monthStr).padStart(2, '0');
        const fullDayStr = String(dayStr).padStart(2, '0');

        return [
            fullDayStr[0] || '', fullDayStr[1] || '',
            fullMonthStr[0] || '', fullMonthStr[1] || '',
            fullYearStr[0] || '', fullYearStr[1] || '', fullYearStr[2] || '', fullYearStr[3] || ''
        ];
    }, [issueDate, isBuddhistYear]);

    // จัดรูปแบบจำนวนเงินตัวเลขในช่องเช็ค (เช่น **150,000.00**)
    const formattedAmount = useMemo(() => {
        if (!amount || isNaN(parseFloat(amount))) return '';
        return formatChequeAmount(amount);
    }, [amount]);

    // คำนวณขนาดย่อฟอนต์อัตโนมัติ (Auto-shrink font size) ไม่ให้ข้อความล้นช่องหรือตกขอบเช็ค
    const autoFitSizes = useMemo(() => {
        const maxBahtWidthMm = Math.max(40, 177 - Number(printConfig.bahtX || 35) - 6);
        const maxPayeeWidthMm = Math.max(40, 150 - Number(printConfig.payeeX || 30));
        const maxAmountWidthMm = Math.max(30, 172 - Number(printConfig.amountX || 115));

        const bahtText = cleanBahtText(activeBahtText || 'หนึ่งแสนบาทถ้วน');
        const amountText = ensureAsterisks(formattedAmount || '0.00');

        const bahtPt = calculateAutoFitPt(bahtText, Number(printConfig.fontSizeBaht || 8.5), maxBahtWidthMm, 6.0);
        const payeePt = calculateAutoFitPt(payee || '', Number(printConfig.fontSizePayee || 9.5), maxPayeeWidthMm, 6.5);
        const amountPt = calculateAutoFitPt(amountText, Number(printConfig.fontSizeAmount || 9.5), maxAmountWidthMm, 7.0);

        return {
            bahtPt,
            payeePt,
            amountPt,
            maxBahtWidthMm,
            maxPayeeWidthMm,
            maxAmountWidthMm,
            isBahtShrunk: bahtPt < Number(printConfig.fontSizeBaht || 8.5),
            isPayeeShrunk: payeePt < Number(printConfig.fontSizePayee || 9.5),
            isAmountShrunk: amountPt < Number(printConfig.fontSizeAmount || 9.5)
        };
    }, [activeBahtText, formattedAmount, payee, printConfig.bahtX, printConfig.payeeX, printConfig.amountX, printConfig.fontSizeBaht, printConfig.fontSizePayee, printConfig.fontSizeAmount]);

    // โหลดประวัติ
    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/cheque-forms?limit=50', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistoryList(data);
            }
        } catch (err) {
            console.error('Error fetching cheque history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    // ล้างสถานะ print-mode บน body เมื่อเปิดหน้า/ปิดหน้า
    useEffect(() => {
        document.body.classList.remove('print-mode-mockup-a4', 'print-mode-voucher', 'print-mode-real-cheque');
        return () => {
            document.body.classList.remove('print-mode-mockup-a4', 'print-mode-voucher', 'print-mode-real-cheque');
        };
    }, []);

    useEffect(() => {
        setShowVoucherModal(false);
        setShowPreviewModal(false);
        setShowHistoryModal(false);
        document.body.classList.remove('print-mode-mockup-a4', 'print-mode-voucher', 'print-mode-real-cheque');
        if (currentTab === 'history') {
            fetchHistory();
        }
    }, [currentTab]);

    const filteredHistory = historyList.filter(item => {
        if (!searchHistory) return true;
        const s = searchHistory.toLowerCase();
        return (item.ChequeNo && item.ChequeNo.toLowerCase().includes(s)) ||
               (item.PayeeOrPayer && item.PayeeOrPayer.toLowerCase().includes(s));
    });

    // บันทึกข้อมูลเช็ค
    const handleSaveCheque = async () => {
        if (!payee || !amount) {
            showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุชื่อผู้รับเงินและจำนวนเงินก่อนบันทึก', 'warning');
            return;
        }

        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            
            const payload = {
                chequeNo: chequeNo,
                chequeType: 'issued',
                bankName: 'ธนาคารกสิกรไทย',
                payeeOrPayer: payee,
                amount: parseFloat(amount) || 0,
                issueDate: issueDate,
                dueDate: dueDate,
                refDocNo: refDocNo,
                notes: notes,
                companyId: 2
            };

            const endpoint = editingChequeId ? `/api/cheque-forms/${editingChequeId}` : '/api/cheque-forms';
            const method = editingChequeId ? 'PUT' : 'POST';

            const res = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showAlert('บันทึกสำเร็จ', `บันทึกข้อมูลเช็คเลขที่ ${chequeNo} เรียบร้อยแล้ว`, 'success');
                // Auto switch to history to see the new record
                setEditingChequeId(null);
                setSearchParams({ tab: 'history' });
            } else {
                const errData = await res.json();
                showAlert('ผิดพลาด', errData.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            }

        } catch (err) {
            showAlert('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ล้างฟอร์มสร้างเช็คใหม่
    const handleResetForm = () => {
        setPayee('');
        setAmount('');
        setManualBahtText('');
        setIsManualBaht(false);
        setRefDocNo('');
        setNotes('');
        const today = new Date().toISOString().split('T')[0];
        setIssueDate(today);
        setDueDate(today);
        setSearchParams({ tab: 'form' });
        showAlert('ล้างฟอร์ม', 'พร้อมสำหรับการเขียนเช็คใบใหม่แล้ว', 'info');
    };

    // โหลดข้อมูลจากประวัติกลับมาในฟอร์ม
    const handleLoadFromHistory = (item) => {
        setChequeNo(item.ChequeNo || DEFAULT_KBANK_CONFIG.chequeNo);
        setPayee(item.PayeeOrPayer || '');
        setAmount(item.Amount !== undefined ? String(item.Amount) : '');
        if (item.IssueDate) {
            const formatted = new Date(item.IssueDate).toISOString().split('T')[0];
            setIssueDate(formatted);
            setDueDate(formatted);
        }
        setRefDocNo(item.RefDocNo || '');
        setNotes(item.Notes || '');
        setEditingChequeId(item.ChequeID);
        setSearchParams({ tab: 'form' });
    };

    const handlePreviewFromHistory = (item) => {
        setChequeNo(item.ChequeNo || DEFAULT_KBANK_CONFIG.chequeNo);
        setPayee(item.PayeeOrPayer || '');
        setAmount(item.Amount !== undefined ? String(item.Amount) : '');
        if (item.IssueDate) {
            const formatted = new Date(item.IssueDate).toISOString().split('T')[0];
            setIssueDate(formatted);
            setDueDate(formatted);
        }
        setRefDocNo(item.RefDocNo || '');
        setNotes(item.Notes || '');
        setShowPreviewModal(true);
    };

    // เขียนเช็คใบใหม่ (ล้างฟอร์มและตั้งค่าเริ่มต้น)
    const handleNewCheque = () => {
        setPayee('');
        setAmount('');
        setManualBahtText('');
        setIsManualBaht(false);
        setIsCrossed(false);
        setIsStrikeBearer(false);
        setIsBuddhistYear(false);
        setRefDocNo('');
        setNotes('');
        const today = new Date();
        const formatted = today.toISOString().split('T')[0];
        setIssueDate(formatted);
        setDueDate(formatted);
        setEditingChequeId(null);
        setSearchParams({ tab: 'form' });
    };

    // ลบรายการเช็ค
    const handleDeleteHistoryItem = async (id, chqNo) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/cheque-forms/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                showAlert('สำเร็จ', `ลบข้อมูลเช็คเลขที่ ${chqNo} เรียบร้อยแล้ว`, 'success');
                fetchHistory();
            } else {
                showAlert('ผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
            }
        } catch (err) {
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ หรือเกิดข้อผิดพลาดรุนแรง', 'error');
        }
    };

    const handleViewChequeHistory = async (id) => {
        try {
            setLoadingChequeHistory(true);
            setShowHistoryModal(true);
            setChequeHistoryList([]);
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/cheque-forms/${id}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setChequeHistoryList(data.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingChequeHistory(false);
        }
    };





    // ── ระบบพิมพ์ผ่าน Isolated Hidden Iframe ไม่กระทบ DOM / CSS บนหน้าจอ ──
    const printElementViaIframe = (element, title = 'Cheque', extraStyles = '') => {
        if (!element) return;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(el => el.outerHTML)
            .join('\n');

        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                ${headStyles}
                <style>
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        font-family: 'Sarabun', sans-serif;
                    }
                    ${extraStyles}
                </style>
            </head>
            <body>
                ${element.outerHTML}
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.error('Print iframe error:', err);
            } finally {
                setTimeout(() => {
                    if (iframe.parentNode) {
                        iframe.parentNode.removeChild(iframe);
                    }
                }, 1000);
            }
        }, 400);
    };

    // พิมพ์เฉพาะรูปหน้าเช็คจำลอง (Cheque Mockup A4)
    const handlePrintChequeMockup = () => {
        if (!payee || !amount) {
            showAlert('ข้อมูลไม่ครบ', 'กรุณาระบุชื่อผู้รับเงินและจำนวนเงินก่อนพิมพ์', 'warning');
            return;
        }
        const node = chequePrintRef.current;
        if (!node) return;

        printElementViaIframe(node, `ใบเช็ค_${chequeNo || 'kasikorn'}`, `
            @page {
                size: A4 portrait;
                margin: 15mm;
            }
            body {
                display: flex;
                justify-content: center;
                align-items: flex-start;
                padding-top: 25mm;
                background: #ffffff !important;
            }
            .cheque-canvas-container {
                width: 100% !important;
                max-width: 180mm !important;
                margin: 0 auto !important;
                padding: 0 !important;
            }
            .cheque-canvas {
                width: 180mm !important;
                height: 90mm !important;
                min-height: 90mm !important;
                margin: 0 auto !important;
                box-shadow: none !important;
                border: 1px solid #cbd5e1 !important;
            }
            .cheque-date-sublabels, .cheque-sublbl-group, .cheque-sublbl-sep {
                font-size: 4.2pt !important;
            }
        `);
    };

    // พิมพ์ใบสำคัญจ่าย A4 (Cheque Payment Voucher A4)
    const handlePrintVoucher = () => {
        if (!payee || !amount) {
            showAlert('ข้อมูลไม่ครบ', 'กรุณาระบุชื่อผู้รับเงินและจำนวนเงินก่อนพิมพ์', 'warning');
            return;
        }
        const node = voucherPrintRef.current;
        if (!node) return;

        printElementViaIframe(node, `ใบสำคัญจ่าย_${voucherNo || chequeNo}`, `
            @page {
                size: A4 portrait;
                margin: 10mm 15mm;
            }
            body {
                padding: 0;
                background: #ffffff !important;
            }
            .voucher-wrapper {
                width: 100% !important;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
            }
            .cheque-date-sublabels, .cheque-sublbl-group, .cheque-sublbl-sep {
                font-size: 3.8pt !important;
            }
        `);
    };

    const updatePrintConfig = (keyOrUpdates, value) => {
        setPrintConfig(prev => {
            const updates = typeof keyOrUpdates === 'string' ? { [keyOrUpdates]: value } : keyOrUpdates;
            const next = { ...prev, ...updates };
            try {
                localStorage.setItem('kbank_cheque_print_config', JSON.stringify(next));
            } catch (e) {
                console.error('Error saving print config:', e);
            }
            return next;
        });
        setIsConfigSavedNotice(true);
        setTimeout(() => setIsConfigSavedNotice(false), 2000);
    };

    const handleSavePrintConfig = () => {
        try {
            localStorage.setItem('kbank_cheque_print_config', JSON.stringify(printConfig));
            setIsConfigLocked(true);
            showAlert('บันทึกค่าสำเร็จ', 'บันทึกพิกัดและขนาดตัวอักษรไว้ถาวรแล้ว (พร้อมล็อกค่าเพื่อความปลอดภัย)', 'success');
        } catch (e) {
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกลงหน่วยความจำได้: ' + e.message, 'error');
        }
    };

    const handleResetPrintConfig = () => {
        setPrintConfig(DEFAULT_PRINT_CONFIG);
        try {
            localStorage.setItem('kbank_cheque_print_config', JSON.stringify(DEFAULT_PRINT_CONFIG));
        } catch (e) {}
        setIsConfigLocked(true);
        showAlert('คืนค่าเริ่มต้น', 'รีเซ็ตพิกัดตำแหน่งการพิมพ์เป็นค่ามาตรฐานที่ลงตัวแล้ว', 'info');
    };

    const handleToggleAdvancedConfig = () => {
        setShowAdvancedConfig(prev => {
            const next = !prev;
            try {
                localStorage.setItem('kbank_cheque_show_advanced', String(next));
            } catch (e) {}
            return next;
        });
    };

    const getDateDigitOffset = (index) => {
        // 8 boxes: [0,1] (Day), [2,3] (Month), [4,5,6,7] (Year)
        // ระยะห่างระหว่างแต่ละช่องวันที่ (วัดจริง 6.2 mm ต่อช่อง)
        const boxStep = parseFloat(printConfig.dateStep) > 0 ? parseFloat(printConfig.dateStep) : 6.2;
        return index * boxStep;
    };

    // ── พิมพ์ลงใบเช็คจริง (Real Cheque Printing) หรือ พิมพ์แผ่นทดสอบทาบ A4 ──
    const printRealCheque = (isTest = false) => {
        if (!payee || !amount) {
            showAlert('ข้อมูลไม่ครบ', 'กรุณาระบุชื่อผู้รับเงินและจำนวนเงินก่อนพิมพ์', 'warning');
            return;
        }

        const {
            offsetX, offsetY, feedMode,
            dateX, dateY, payeeX, payeeY, bahtX, bahtY, amountX, amountY,
            fontSizePayee, fontSizeBaht, fontSizeAmount, fontSizeDate
        } = printConfig;

        let pageCss = '';
        let containerMarginCss = '';

        if (feedMode === 'custom-slip') {
            pageCss = `@page { size: 177mm 90mm; margin: 0; }`;
            containerMarginCss = `margin: 0;`;
        } else if (feedMode === 'a4-left') {
            pageCss = `@page { size: A4 portrait; margin: 0; }`;
            containerMarginCss = `margin-left: 0mm; margin-top: 0mm;`;
        } else if (feedMode === 'a4-right') {
            pageCss = `@page { size: A4 portrait; margin: 0; }`;
            containerMarginCss = `margin-left: 33mm; margin-top: 0mm;`;
        } else {
            // a4-center (default)
            pageCss = `@page { size: A4 portrait; margin: 0; }`;
            containerMarginCss = `margin-left: 16.5mm; margin-top: 0mm;`;
        }

        const finalX = (base) => (Number(base) + Number(offsetX || 0)).toFixed(1);
        const finalY = (base) => (Number(base) + Number(offsetY || 0)).toFixed(1);

        const formattedAmountNum = parseFloat(amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        const activeBoxStep = parseFloat(printConfig.dateStep) > 0 ? parseFloat(printConfig.dateStep) : 6.2;
        const dateDigitsHtml = dateDigits.map((digit, idx) => {
            const leftMm = (Number(finalX(dateX)) + getDateDigitOffset(idx)).toFixed(1);
            const topMm = finalY(dateY);
            return `
                <div style="
                    position: absolute;
                    left: ${leftMm}mm;
                    top: ${topMm}mm;
                    width: ${activeBoxStep}mm;
                    height: 6.5mm;
                    line-height: 6.5mm;
                    text-align: center;
                    font-family: 'Sarabun', sans-serif;
                    font-size: ${fontSizeDate}pt;
                    font-weight: 700;
                    color: #000000;
                    ${isTest ? 'border: 0.5px solid #94a3b8; background: rgba(226, 232, 240, 0.4);' : ''}
                ">${digit}</div>
            `;
        }).join('');

        const crossedSvgHtml = isCrossed ? `
            <svg style="position: absolute; left: ${finalX(0)}mm; top: ${finalY(0)}mm; width: 38mm; height: 32mm;" viewBox="0 0 100 80">
                <line x1="0" y1="54" x2="54" y2="0" stroke="#000000" stroke-width="2.2" />
                <line x1="0" y1="78" x2="78" y2="0" stroke="#000000" stroke-width="2.2" />
                <rect x="8" y="27" width="50" height="12" rx="2" fill="#ffffff" transform="rotate(-45 33 33)" />
                <text x="33" y="35.5" text-anchor="middle" fill="#000000" font-size="6.8" font-weight="bold" font-family="'Sarabun', sans-serif" letter-spacing="0.05em" transform="rotate(-45 33 33)">
                    A/C PAYEE ONLY
                </text>
            </svg>
        ` : '';

        const testGuideOverlay = isTest ? `
            <div style="position: absolute; top: 2mm; left: 4mm; font-size: 8pt; color: #64748b; font-family: 'Sarabun', sans-serif;">
                แผ่นทดสอบทาบพิมพ์เช็ค (17.7 × 9.0 cm) — วางใบเช็คจริงทาบตามกรอบเส้นประ
            </div>
            <div style="position: absolute; left: 115mm; top: 41mm; width: 56mm; height: 9mm; border: 0.8px dashed #94a3b8; border-radius: 2px;"></div>
        ` : '';

        const rotateCss = printConfig.rotate180 ? 'transform: rotate(180deg); transform-origin: center center;' : '';
        const slipContainerStyle = `
            width: 177mm;
            height: 90mm;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
            background: transparent;
            ${containerMarginCss}
            ${rotateCss}
            ${isTest ? 'border: 1.5px dashed #475569; background: #ffffff;' : 'border: none;'}
        `;

        const htmlContent = `
            <div style="${slipContainerStyle}">
                ${testGuideOverlay}
                ${crossedSvgHtml}
                ${dateDigitsHtml}
                
                <!-- Payee -->
                <div style="
                    position: absolute;
                    left: ${finalX(payeeX)}mm;
                    top: ${finalY(payeeY)}mm;
                    max-width: ${autoFitSizes.maxPayeeWidthMm}mm;
                    font-family: 'Sarabun', sans-serif;
                    font-size: ${autoFitSizes.payeePt}pt;
                    font-weight: 700;
                    color: #000000;
                    white-space: nowrap;
                    line-height: 1.35;
                ">
                    ${payee}
                </div>

                <!-- Baht Text -->
                <div style="
                    position: absolute;
                    left: ${finalX(bahtX)}mm;
                    top: ${finalY(bahtY)}mm;
                    max-width: ${autoFitSizes.maxBahtWidthMm}mm;
                    font-family: 'Sarabun', sans-serif;
                    font-size: ${autoFitSizes.bahtPt}pt;
                    font-weight: 700;
                    color: #000000;
                    white-space: nowrap;
                    line-height: 1.35;
                ">
                    ${cleanBahtText(activeBahtText)}
                </div>

                <!-- Amount Number -->
                <div style="
                    position: absolute;
                    left: ${finalX(amountX)}mm;
                    top: ${finalY(amountY)}mm;
                    max-width: ${autoFitSizes.maxAmountWidthMm}mm;
                    font-family: 'Sarabun', sans-serif;
                    font-size: ${autoFitSizes.amountPt}pt;
                    font-weight: 700;
                    color: #000000;
                    white-space: nowrap;
                    line-height: 1.35;
                ">
                    ${ensureAsterisks(formattedAmountNum)}
                </div>
            </div>
        `;

        const title = isTest ? `Test_Cheque_A4_${chequeNo}` : `Real_Cheque_${chequeNo}`;
        
        printElementViaIframe({ outerHTML: htmlContent }, title, `
            ${pageCss}
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                font-family: 'Sarabun', sans-serif;
            }
        `);
    };



    return (
        <div className="cheque-page-wrapper">
            <div className="cheque-split-layout">
                {/* ── Left Side: Main Content ── */}
                <div className="cheque-main-content">
            {/* ── TAB 1: FORM (หน้าเขียนและสั่งจ่ายเช็ค) ── */}
            {currentTab === 'form' && (
                <>
                    {/* Header and Back Button */}
                    <div className="cheque-form-header no-print">
                        <button 
                            className="cq-btn-back" 
                            onClick={() => setSearchParams({ tab: 'history' })}
                        >
                            <ArrowLeft size={16} strokeWidth={2.5} /> กลับสู่หน้าหลัก
                        </button>
                        <div className="cheque-form-title">
                            <FileText size={20} color="#4f46e5" />
                            <span>ฟอร์มเขียนและพิมพ์เช็ค</span>
                        </div>
                        <p className="cheque-form-subtitle">กรุณากรอกข้อมูลให้ครบถ้วนเพื่อพิมพ์เช็คและบันทึกประวัติ</p>
                    </div>



                    {/* ── Input Controls Form ── */}
                    <div className="cheque-input-grid no-print">
                        {/* วันที่สั่งจ่าย */}
                        <div className="cq-form-group">
                            <label>
                                <span>วันที่สั่งจ่าย (Issue Date)</span>
                                <Calendar size={15} color="#64748b" />
                            </label>
                            <input 
                                type="date" 
                                className="cq-input" 
                                value={issueDate} 
                                onChange={(e) => {
                                    setIssueDate(e.target.value);
                                    if (!dueDate) setDueDate(e.target.value);
                                }}
                            />
                        </div>

                        {/* เลขที่เช็ค */}
                        <div className="cq-form-group">
                            <label>
                                <span>เลขที่เช็ค (Cheque No.)</span>
                                <CreditCard size={15} color="#64748b" />
                            </label>
                            <input 
                                type="text" 
                                className="cq-input" 
                                value={chequeNo} 
                                onChange={(e) => setChequeNo(e.target.value)}
                                placeholder="ระบุเลขที่เช็ค 8 หลัก"
                            />
                        </div>

                        {/* ผู้รับเงิน */}
                        <div className="cq-form-group" style={{ gridColumn: 'span 2' }}>
                            <label>
                                <span>สั่งจ่ายให้ (Payee Name) *</span>
                                <User size={15} color="#64748b" />
                            </label>
                            <input 
                                type="text" 
                                className="cq-input" 
                                value={payee} 
                                onChange={(e) => setPayee(e.target.value)}
                                placeholder="ระบุชื่อบุคคล, นิติบุคคล, หรือบริษัทผู้รับเงิน"
                            />
                        </div>

                        {/* จำนวนเงินตัวเลข */}
                        <div className="cq-form-group">
                            <label>
                                <span>จำนวนเงิน (บาท) *</span>
                                <DollarSign size={15} color="#059669" />
                            </label>
                            <input 
                                type="number" 
                                step="0.01" 
                                min="0"
                                className="cq-input cq-input-amount" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>

                        {/* จำนวนเงินตัวอักษร */}
                        <div className="cq-form-group" style={{ gridColumn: 'span 2' }}>
                            <label>
                                <span>จำนวนเงินตัวหนังสือ (Thai Baht Text)</span>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setIsManualBaht(!isManualBaht);
                                        if (!isManualBaht) setManualBahtText(autoBahtText);
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                                >
                                    {isManualBaht ? 'สลับเป็นคำนวณอัตโนมัติ' : 'แก้ไขด้วยตนเอง'}
                                </button>
                            </label>
                            <input 
                                type="text" 
                                className="cq-input" 
                                value={activeBahtText} 
                                readOnly={!isManualBaht}
                                onChange={(e) => setManualBahtText(e.target.value)}
                                style={{ background: isManualBaht ? '#ffffff' : '#f1f5f9' }}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* ── TAB 2: HISTORY (ตารางประวัติการสั่งจ่าย) ── */}
            {currentTab === 'history' && (
                <div className="page-container page-enter no-print" style={{ padding: '0', background: 'transparent', minHeight: 'auto' }}>
                    <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                        <h1>ประวัติการสั่งจ่ายเช็ค</h1>
                        <p>จัดการรายการและประวัติการสั่งจ่ายเช็คธนาคาร</p>
                    </div>

                    <div className="subpage-content" style={{ margin: 0, padding: 0 }}>
                        <div className="toolbar">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
                                <div className="search-group">
                                    <div className="search-input-wrap">
                                        <Search size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="ค้นหาตามเลขที่เช็ค หรือชื่อผู้รับเงิน..."
                                            value={searchHistory}
                                            onChange={(e) => setSearchHistory(e.target.value)}
                                        />
                                    </div>
                                    <button className="search-btn">ค้นหา</button>
                                </div>
                            </div>
                            <button className="btn-primary" onClick={handleNewCheque}>
                                + เขียนเช็คใหม่
                            </button>
                        </div>

                        {loadingHistory ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                กำลังโหลดข้อมูลประวัติเช็ค...
                            </div>
                        ) : historyList.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                ไม่พบรายการสั่งจ่ายเช็คในระบบ
                            </div>
                        ) : (
                            <div className="table-card card">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>วันที่สั่งจ่าย</th>
                                            <th>เลขที่เช็ค</th>
                                            <th>สั่งจ่ายให้ (Payee)</th>
                                            <th style={{ textAlign: 'right' }}>จำนวนเงิน</th>
                                            <th>อ้างอิงเอกสาร</th>
                                            <th>ผู้จัดทำ</th>
                                            <th>สถานะ</th>
                                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyList
                                            .filter(item => {
                                                if (!searchHistory) return true;
                                                const q = searchHistory.toLowerCase();
                                                return (item.ChequeNo && item.ChequeNo.toLowerCase().includes(q)) ||
                                                       (item.PayeeOrPayer && item.PayeeOrPayer.toLowerCase().includes(q));
                                            })
                                            .map(item => (
                                                <tr key={item.ChequeID}>
                                                    <td>{item.IssueDate ? new Date(item.IssueDate).toLocaleDateString('th-TH') : '-'}</td>
                                                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.ChequeNo}</td>
                                                    <td className="text-bold">{item.PayeeOrPayer}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                                                        {Number(item.Amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                                                    </td>
                                                    <td>{item.RefDocNo || '-'}</td>
                                                    <td>{item.CreatedByName || 'เจ้าหน้าที่'}</td>
                                                    <td>
                                                        <span className={`badge ${item.Status === 'cleared' ? 'badge-success' : item.Status === 'bounced' ? 'badge-danger' : 'badge-warning'}`}>
                                                            {item.Status === 'cleared' ? 'ตัดยอดแล้ว' : item.Status === 'bounced' ? 'เช็คคืน' : 'รอขึ้นเงิน'}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0' }}>
                                                            <button 
                                                                className="doc-action-btn" 
                                                                style={{ margin: 0, color: '#3b82f6' }}
                                                                onClick={() => handlePreviewFromHistory(item)}
                                                                title="พรีวิวหน้าเช็ค"
                                                            >
                                                                <Eye size={15} />
                                                            </button>
                                                            <button 
                                                                className="doc-action-btn" 
                                                                style={{ margin: 0, color: '#eab308' }}
                                                                onClick={() => handleLoadFromHistory(item)}
                                                                title="แก้ไขข้อมูล"
                                                            >
                                                                <Pencil size={15} />
                                                            </button>
                                                            {((item.HistoryCount || 0) > 0 || (item.Revision || 1) > 1) && (
                                                                <button 
                                                                    className="doc-action-btn" 
                                                                    style={{ margin: 0, color: '#8b5cf6' }}
                                                                    onClick={() => handleViewChequeHistory(item.ChequeID)}
                                                                    title="ดูประวัติแก้ไข"
                                                                >
                                                                    <History size={15} />
                                                                </button>
                                                            )}
                                                            <button 
                                                                className="doc-action-btn doc-action-btn-danger" 
                                                                style={{ margin: 0 }}
                                                                onClick={() => handleDeleteHistoryItem(item.ChequeID, item.ChequeNo)}
                                                                title="ลบข้อมูล"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
            </div> {/* End cheque-main-content */}

                {/* ── Right Side: Action Panel (Sidebar) ── */}
                {currentTab === 'form' && (
                    <div className="cheque-sidebar-panel no-print">
                        <div className="cheque-sidebar-box" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                            <h4 className="sidebar-box-title" style={{ color: '#d97706', borderBottomColor: '#fde68a' }}>
                                <span className="sidebar-title-icon">🖨️</span>
                                การพิมพ์ (Print Actions)
                            </h4>
                            <div className="sidebar-action-grid single-col">
                                {/* พรีวิวเช็คและตัวเลือก */}
                                <button 
                                    className="cq-btn cq-btn-preview" 
                                    onClick={() => setShowPreviewModal(true)}
                                    style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                                >
                                    <Eye size={18} />
                                    <span>พรีวิวหน้าเช็ค</span>
                                </button>
                                
                                <button 
                                    className="cq-btn cq-btn-save-action" 
                                    onClick={handleSaveCheque}
                                    disabled={saving}
                                    style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.5rem' }}
                                >
                                    <Save size={16} />
                                    <span>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลเช็ค'}</span>
                                </button>
                            </div>
                        </div>
                    </div> /* End cheque-sidebar-panel */
                )}
            </div> {/* End cheque-split-layout */}




                    {/* ── Cheque Preview Modal (Popup) ── */}
                    {showPreviewModal && (
                        <div className="cq-modal-overlay no-print" onClick={() => setShowPreviewModal(false)}>
                            <div className="cq-modal-card cq-preview-modal" style={{ maxWidth: '880px' }} onClick={(e) => e.stopPropagation()}>
                                <div className="cq-modal-header no-print" style={{ flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <h3 className="cq-modal-title" style={{ margin: 0 }}>
                                            <CreditCard size={20} color="#059669" />
                                            <span>พิมพ์เช็คธนาคารกสิกรไทย</span>
                                        </h3>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <button 
                                            type="button"
                                            onClick={() => printRealCheque(false)}
                                            style={{ background: '#059669', color: 'white', border: 'none', padding: '0.45rem 1.1rem', borderRadius: '7px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 4px rgba(5,150,105,0.25)' }}
                                        >
                                            <Printer size={15} /> สั่งพิมพ์ลงใบเช็คจริง
                                        </button>
                                        <button className="cq-modal-close" onClick={() => setShowPreviewModal(false)}>✕</button>
                                    </div>
                                </div>
                                <div className="cq-modal-body" style={{ background: '#f8fafc', padding: '1.5rem', overflowY: 'auto', overflowX: 'auto' }}>
                                    {previewTab === 'real' ? (
                                        <div className="real-cheque-viewport">
                                            {/* คำแนะนำ */}
                                            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 16px', borderRadius: '8px', width: '100%', maxWidth: '708px', fontSize: '13px', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <CheckCircle2 size={16} color="#059669" />
                                                    <span><strong>โหมดพิมพ์ลงใบเช็คจริง</strong>: ระบบจะพิมพ์เฉพาะตัวหนังสือและตัวเลขลงในช่องของใบเช็คกสิกรไทย</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {(autoFitSizes.isBahtShrunk || autoFitSizes.isPayeeShrunk || autoFitSizes.isAmountShrunk) && (
                                                        <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', border: '1px solid #86efac', fontWeight: 600 }}>
                                                            ✨ ย่อขนาดฟอนต์อัตโนมัติ ({autoFitSizes.isBahtShrunk ? `บาท: ${autoFitSizes.bahtPt}pt` : ''}{autoFitSizes.isPayeeShrunk ? ` ผู้รับ: ${autoFitSizes.payeePt}pt` : ''})
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>ขนาด 17.7 × 9.0 ซม.</span>
                                                </div>
                                            </div>

                                            {/* จำลองแผ่นเช็คจริงพร้อมตำแหน่งตัวอักษร */}
                                            <div className="real-cheque-slip-wrapper">
                                                {/* ไกด์ไลน์จางๆ อ้างอิงสัดส่วนเช็คจริง */}
                                                <div style={{ position: 'absolute', inset: 0, opacity: 0.18, pointerEvents: 'none', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)' }}>
                                                    <div style={{ position: 'absolute', left: '16.9%', top: '7.7%', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534' }}>ธนาคารกสิกรไทย KASIKORNBANK</span>
                                                    </div>
                                                    <div style={{ position: 'absolute', left: '16.9%', top: '33%', right: '12%', borderBottom: '1px dashed #94a3b8' }}></div>
                                                    <div style={{ position: 'absolute', left: '19.7%', top: '42%', right: '5%', borderBottom: '1px dashed #94a3b8' }}></div>
                                                    <div style={{ position: 'absolute', left: '65%', top: '46%', width: '31%', height: '14%', border: '1px dashed #94a3b8', borderRadius: '2px' }}></div>
                                                </div>

                                                <div className="real-cheque-slip-watermark">
                                                    ✦ สัดส่วนใบเช็คจริง (17.7 × 9.0 ซม.)
                                                </div>

                                                {/* ขีดคร่อม (ถ้าเลือก) */}
                                                {isCrossed && (
                                                    <div style={{ 
                                                        position: 'absolute', 
                                                        left: `${((0 + Number(printConfig.offsetX || 0)) / 177 * 100)}%`, 
                                                        top: `${((0 + Number(printConfig.offsetY || 0)) / 90 * 100)}%`, 
                                                        width: '18%', 
                                                        height: '35%' 
                                                    }}>
                                                        <svg viewBox="0 0 100 80" style={{ width: '100%', height: '100%' }}>
                                                            <line x1="0" y1="54" x2="54" y2="0" stroke="#000000" strokeWidth="2.2" />
                                                            <line x1="0" y1="78" x2="78" y2="0" stroke="#000000" strokeWidth="2.2" />
                                                            <rect x="8" y="27" width="50" height="12" rx="2" fill="#ffffff" stroke="#000000" strokeWidth="0.5" transform="rotate(-45 33 33)" />
                                                            <text x="33" y="35.5" textAnchor="middle" fill="#000000" fontSize="6.8" fontWeight="bold" transform="rotate(-45 33 33)">
                                                                A/C PAYEE ONLY
                                                            </text>
                                                        </svg>
                                                    </div>
                                                )}

                                                {/* วันที่ 8 หลัก */}
                                                {dateDigits.map((digit, idx) => {
                                                    const leftMm = Number(printConfig.dateX) + getDateDigitOffset(idx) + Number(printConfig.offsetX || 0);
                                                    const topMm = Number(printConfig.dateY) + Number(printConfig.offsetY || 0);
                                                    return (
                                                        <div 
                                                            key={idx}
                                                            style={{
                                                                position: 'absolute',
                                                                left: `${(leftMm / 177 * 100)}%`,
                                                                top: `${(topMm / 90 * 100)}%`,
                                                                width: `${((parseFloat(printConfig.dateStep) || 6.5) / 177 * 100)}%`,
                                                                height: `${(6.5 / 90 * 100)}%`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontFamily: "'Sarabun', sans-serif",
                                                                fontSize: `clamp(9px, ${((Number(printConfig.fontSizeDate || 8.5)) * 0.20).toFixed(2)}cqi, 13px)`,
                                                                fontWeight: 700,
                                                                color: '#000000',
                                                                border: '1px dashed #cbd5e1',
                                                                background: 'rgba(255, 255, 255, 0.85)',
                                                                borderRadius: '2px',
                                                                lineHeight: 1
                                                            }}
                                                        >
                                                            {digit}
                                                        </div>
                                                    );
                                                })}

                                                {/* ชื่อผู้รับเงิน (Payee) */}
                                                <div 
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${((Number(printConfig.payeeX) + Number(printConfig.offsetX || 0)) / 177 * 100)}%`,
                                                        top: `${((Number(printConfig.payeeY) + Number(printConfig.offsetY || 0)) / 90 * 100)}%`,
                                                        maxWidth: `${(autoFitSizes.maxPayeeWidthMm / 177 * 100)}%`,
                                                        fontFamily: "'Sarabun', sans-serif",
                                                        fontSize: `clamp(10px, ${(autoFitSizes.payeePt * 0.20).toFixed(2)}cqi, 15px)`,
                                                        fontWeight: 700,
                                                        color: '#000000',
                                                        whiteSpace: 'nowrap',
                                                        lineHeight: 1.35,
                                                        overflow: 'visible'
                                                    }}
                                                    title={autoFitSizes.isPayeeShrunk ? `ย่อขนาดอัตโนมัติเป็น ${autoFitSizes.payeePt}pt เพื่อไม่ให้ล้น` : undefined}
                                                >
                                                    {payee || <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>ระบุชื่อผู้รับเงิน...</span>}
                                                </div>

                                                {/* จำนวนเงินตัวอักษร (Baht Text) */}
                                                <div 
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${((Number(printConfig.bahtX) + Number(printConfig.offsetX || 0)) / 177 * 100)}%`,
                                                        top: `${((Number(printConfig.bahtY) + Number(printConfig.offsetY || 0)) / 90 * 100)}%`,
                                                        maxWidth: `${(autoFitSizes.maxBahtWidthMm / 177 * 100)}%`,
                                                        fontFamily: "'Sarabun', sans-serif",
                                                        fontSize: `clamp(8px, ${(autoFitSizes.bahtPt * 0.20).toFixed(2)}cqi, 14px)`,
                                                        fontWeight: 700,
                                                        color: '#000000',
                                                        whiteSpace: 'nowrap',
                                                        lineHeight: 1.35,
                                                        overflow: 'visible'
                                                    }}
                                                    title={autoFitSizes.isBahtShrunk ? `ย่อขนาดอัตโนมัติเป็น ${autoFitSizes.bahtPt}pt เพื่อไม่ให้ล้นใบเช็ค` : undefined}
                                                >
                                                    {cleanBahtText(activeBahtText) || 'หนึ่งแสนบาทถ้วน'}
                                                </div>

                                                {/* ช่องจำนวนเงินตัวเลข (฿) */}
                                                <div 
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${((Number(printConfig.amountX) + Number(printConfig.offsetX || 0)) / 177 * 100)}%`,
                                                        top: `${((Number(printConfig.amountY) + Number(printConfig.offsetY || 0)) / 90 * 100)}%`,
                                                        maxWidth: `${(autoFitSizes.maxAmountWidthMm / 177 * 100)}%`,
                                                        fontFamily: "'Sarabun', sans-serif",
                                                        fontSize: `clamp(9px, ${(autoFitSizes.amountPt * 0.20).toFixed(2)}cqi, 15px)`,
                                                        fontWeight: 700,
                                                        color: '#000000',
                                                        whiteSpace: 'nowrap',
                                                        lineHeight: 1.35,
                                                        overflow: 'visible',
                                                        padding: '2px 6px',
                                                        border: '1px dashed #94a3b8',
                                                        borderRadius: '3px',
                                                        background: 'rgba(255, 255, 255, 0.9)'
                                                    }}
                                                    title={autoFitSizes.isAmountShrunk ? `ย่อขนาดอัตโนมัติเป็น ${autoFitSizes.amountPt}pt เพื่อไม่ให้ล้นช่องตัวเลข` : undefined}
                                                >
                                                    {ensureAsterisks(formattedAmount)}
                                                </div>
                                            </div>

                                             {/* แผงปรับตำแหน่งและการป้อนกระดาษ (แสดงเฉพาะหน้าเขียนเช็ค ไม่แสดงตอนพรีวิวจากหน้าหลัก) */}
                                             {currentTab !== 'history' && (
                                                 <div className="cheque-calibration-box">
                                                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                         <Sliders size={18} color="#059669" />
                                                         <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>ตั้งค่าการพิมพ์และตำแหน่งระยะชดเชย (Print Calibration)</span>
                                                         {isConfigSavedNotice && (
                                                             <span style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                                                 ✓ จำค่าอัตโนมัติแล้ว
                                                             </span>
                                                         )}
                                                     </div>
                                                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                         <button 
                                                             type="button" 
                                                             onClick={() => {
                                                                 const nextLocked = !isConfigLocked;
                                                                 setIsConfigLocked(nextLocked);
                                                                 if (!nextLocked) {
                                                                     showAlert('ปลดล็อกแล้ว', 'สามารถแก้ไขตัวเลขพิกัดการพิมพ์ได้แล้ว (แก้ไขเสร็จอย่าลืมกดบันทึกหรือล็อกค่า)', 'info');
                                                                 } else {
                                                                     showAlert('ล็อกพิกัดแล้ว', 'ล็อกตัวเลขพิกัดเรียบร้อย ป้องกันการเลื่อนหลุดตำแหน่ง', 'success');
                                                                 }
                                                             }}
                                                             style={{ 
                                                                 background: isConfigLocked ? '#f8fafc' : '#fef3c7', 
                                                                 border: isConfigLocked ? '1.5px solid #cbd5e1' : '1.5px solid #f59e0b', 
                                                                 color: isConfigLocked ? '#334155' : '#b45309', 
                                                                 padding: '5px 12px', 
                                                                 borderRadius: '6px', 
                                                                 fontSize: '12px', 
                                                                 fontWeight: 700, 
                                                                 cursor: 'pointer', 
                                                                 display: 'flex', 
                                                                 alignItems: 'center', 
                                                                 gap: '6px' 
                                                             }}
                                                             title={isConfigLocked ? 'คลิกเพื่อปลดล็อกแก้ไขพิกัด' : 'คลิกเพื่อล็อกพิกัด'}
                                                         >
                                                             {isConfigLocked ? <Lock size={13} color="#059669" /> : <Unlock size={13} color="#d97706" />}
                                                             <span>{isConfigLocked ? '🔒 ล็อกพิกัดไว้แล้ว (คลิกปลดล็อก)' : '🔓 ปลดล็อกอยู่ (คลิกเพื่อล็อก)'}</span>
                                                         </button>
                                                         <button 
                                                             type="button"
                                                             onClick={handleSavePrintConfig}
                                                             style={{ background: '#059669', border: 'none', color: '#ffffff', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                                             title="บันทึกค่าพิกัดทั้งหมดนี้ไว้ถาวร (เปิดเข้าใหม่จะแสดงค่านี้เสมอ)"
                                                         >
                                                             <Save size={13} /> บันทึกค่านี้ไว้ถาวร
                                                         </button>
                                                         {!isConfigLocked && (
                                                             <button 
                                                                 type="button"
                                                                 onClick={handleResetPrintConfig}
                                                                 style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                                 title="รีเซ็ตค่าพิกัดทั้งหมดเป็นค่ามาตรฐาน"
                                                             >
                                                                 <RotateCcw size={13} /> คืนค่าเริ่มต้น
                                                             </button>
                                                         )}
                                                     </div>
                                                 </div>

                                                 <div style={{ maxWidth: '360px' }}>
                                                     {/* Feed Mode */}
                                                     <div className="calib-group">
                                                         <label className="calib-label">ตำแหน่งการใส่เช็คเข้าถาดพิมพ์:</label>
                                                         <CustomSelect 
                                                             value={printConfig.feedMode || 'custom-slip'}
                                                             onChange={(e) => updatePrintConfig('feedMode', e.target.value)}
                                                             usePortal={true}
                                                         >
                                                             <option value="custom-slip">ขนาดกำหนดเอง 17.7 × 9 ซม. (Slip Printer)</option>
                                                             <option value="a4-center">กึ่งกลางถาด A4 (Center Feed - ทั่วไป)</option>
                                                             <option value="a4-left">ชิดซ้ายถาด A4 (Left Feed)</option>
                                                             <option value="a4-right">ชิดขวาถาด A4 (Right Feed)</option>
                                                         </CustomSelect>
                                                     </div>
                                                 </div>

                                                 {/* Toggle Advanced Fine-Tuning */}
                                                 <div style={{ borderTop: '1px dashed #a7f3d0', paddingTop: '10px' }}>
                                                     <button 
                                                         type="button"
                                                         onClick={handleToggleAdvancedConfig}
                                                         style={{ background: 'transparent', border: 'none', color: '#059669', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: 0 }}
                                                     >
                                                         <ChevronDown size={16} style={{ transform: showAdvancedConfig ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                                         <span>{showAdvancedConfig ? 'ซ่อนการตั้งค่าพิกัดรายช่อง (Advanced)' : 'ปรับแต่งพิกัดรายช่องแบบละเอียด (คลิกขยาย)'}</span>
                                                     </button>

                                                     {showAdvancedConfig && (
                                                         <div className="calib-advanced-grid">
                                                             {isConfigLocked && (
                                                                 <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', gridColumn: '1 / -1' }}>
                                                                     <Lock size={14} color="#059669" />
                                                                     <span>พิกัดนี้ปรับจูนลงตัวแล้วและถูก<strong>ล็อกไว้</strong>เพื่อป้องกันการกดโดน (หากต้องการแก้ไข ให้กดปุ่ม <strong>"🔒 ล็อกพิกัดไว้แล้ว (คลิกปลดล็อก)"</strong> ด้านบน)</span>
                                                                 </div>
                                                             )}
                                                             {/* Date */}
                                                             <div className="calib-field-group">
                                                                 <span className="calib-field-title">📅 ช่องวันที่ (8 หลัก)</span>
                                                                 <div className="calib-field-inputs" style={{ flexWrap: 'wrap', gap: '8px' }}>
                                                                     <label title="ตำแหน่งแนวนอนจากขอบซ้ายของใบเช็ค">Left: 
                                                                         <input 
                                                                             type="number" 
                                                                             step="0.5" 
                                                                             disabled={isConfigLocked}
                                                                             value={printConfig.dateX !== undefined && printConfig.dateX !== '' ? printConfig.dateX : ''} 
                                                                             onChange={(e) => updatePrintConfig('dateX', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} 
                                                                             onBlur={(e) => { if (e.target.value === '') updatePrintConfig('dateX', DEFAULT_PRINT_CONFIG.dateX); }}
                                                                         /> 
                                                                         <span className="calib-unit">mm</span>
                                                                     </label>
                                                                     <label title="ตำแหน่งแนวตั้งจากขอบบนของใบเช็ค">Top: 
                                                                         <input 
                                                                             type="number" 
                                                                             step="0.5" 
                                                                             disabled={isConfigLocked}
                                                                             value={printConfig.dateY !== undefined && printConfig.dateY !== '' ? printConfig.dateY : ''} 
                                                                             onChange={(e) => updatePrintConfig('dateY', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} 
                                                                             onBlur={(e) => { if (e.target.value === '') updatePrintConfig('dateY', DEFAULT_PRINT_CONFIG.dateY); }}
                                                                         /> 
                                                                         <span className="calib-unit">mm</span>
                                                                     </label>
                                                                     <label title="ระยะห่างระหว่างแต่ละช่อง (Pitch / Box Step)">ห่าง: 
                                                                         <input 
                                                                             type="number" 
                                                                             step="0.1" 
                                                                             disabled={isConfigLocked}
                                                                             value={printConfig.dateStep !== undefined && printConfig.dateStep !== '' ? printConfig.dateStep : ''} 
                                                                             onChange={(e) => updatePrintConfig('dateStep', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} 
                                                                             onBlur={(e) => { if (e.target.value === '') updatePrintConfig('dateStep', DEFAULT_PRINT_CONFIG.dateStep); }}
                                                                         /> 
                                                                         <span className="calib-unit">mm</span>
                                                                     </label>
                                                                     <label title="ขนาดตัวอักษรวันที่">ขนาด: 
                                                                         <input 
                                                                             type="number" 
                                                                             step="0.5" 
                                                                             min="5" 
                                                                             max="18" 
                                                                             disabled={isConfigLocked}
                                                                             value={printConfig.fontSizeDate !== undefined && printConfig.fontSizeDate !== '' ? printConfig.fontSizeDate : ''} 
                                                                             onChange={(e) => updatePrintConfig('fontSizeDate', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} 
                                                                             onBlur={(e) => { if (e.target.value === '') updatePrintConfig('fontSizeDate', DEFAULT_PRINT_CONFIG.fontSizeDate); }}
                                                                         /> 
                                                                         <span className="calib-unit">pt</span>
                                                                     </label>
                                                                 </div>
                                                             </div>

                                                             {/* Payee */}
                                                             <div className="calib-field-group">
                                                                 <span className="calib-field-title">👤 ชื่อผู้รับเงิน (Payee)</span>
                                                                 <div className="calib-field-inputs" style={{ flexWrap: 'wrap', gap: '8px' }}>
                                                                     <label title="ตำแหน่งแนวนอน">Left: 
                                                                         <input 
                                                                             type="number" 
                                                                             step="0.5" 
                                                                             disabled={isConfigLocked}
                                                                             value={printConfig.payeeX !== undefined && printConfig.payeeX !== '' ? printConfig.payeeX : ''} 
                                                                             onChange={(e) => updatePrintConfig('payeeX', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} 
                                                                             onBlur={(e) => { if (e.target.value === '') updatePrintConfig('payeeX', DEFAULT_PRINT_CONFIG.payeeX); }}
                                                                         /> 
                                                                         <span className="calib-unit">mm</span>
                                                                     </label>
                                                                     <label title="ตำแหน่งแนวตั้ง">Top: 
                                                                         <input 
                                                                             type="number" 
                                                                             step="0.5" 
                                                                             disabled={isConfigLocked}
                                                                             value={printConfig.payeeY !== undefined && printConfig.payeeY !== '' ? printConfig.payeeY : ''} 
                                                                             onChange={(e) => updatePrintConfig('payeeY', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} 
                                                                             onBlur={(e) => { if (e.target.value === '') updatePrintConfig('payeeY', DEFAULT_PRINT_CONFIG.payeeY); }}
                                                                         /> 
                                                                         <span className="calib-unit">mm</span>
                                                                     </label>
                                                                     <label title="ขนาดตัวอักษรชื่อผู้รับเงิน">ขนาด: 
                                                                         <input 
                                                                             type="number" 
                                                                             step="0.5" 
                                                                             min="5" 
                                                                             max="18" 
                                                                             disabled={isConfigLocked}
                                                                             value={printConfig.fontSizePayee !== undefined && printConfig.fontSizePayee !== '' ? printConfig.fontSizePayee : ''} 
                                                                             onChange={(e) => updatePrintConfig('fontSizePayee', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} 
                                                                             onBlur={(e) => { if (e.target.value === '') updatePrintConfig('fontSizePayee', DEFAULT_PRINT_CONFIG.fontSizePayee); }}
                                                                         /> 
                                                                         <span className="calib-unit">pt</span>
                                                                     </label>
                                                                 </div>
                                                             </div>

                                                             {/* Baht text */}
                                                             <div className="calib-field-group">
                                                                 <span className="calib-field-title">📝 จำนวนเงินตัวอักษร</span>
                                                                 <div className="calib-field-inputs" style={{ flexWrap: 'wrap', gap: '8px' }}>
                                                                     <label title="ตำแหน่งแนวนอน">Left: 
                                                                         <input 
                                                                             type="number" 
                                                                             step="0.5" 
                                                                             disabled={isConfigLocked}
                                                                             value={printConfig.bahtX !== undefined && printConfig.bahtX !== '' ? printConfig.bahtX : ''} 
                                                                             onChange={(e) => updatePrintConfig('bahtX', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} 
                                                                             onBlur={(e) => { if (e.target.value === '') updatePrintConfig('bahtX', DEFAULT_PRINT_CONFIG.bahtX); }}
                                                                         /> 
                                                                         <span className="calib-unit">mm</span>
                                                                     </label>
                                                                     <label title="ตำแหน่งแนวตั้ง">Top: 
                                                                         <input 
                                                                             type="number" 
                                                                             step="0.5" 
                                                                             disabled={isConfigLocked}
                                                                             value={printConfig.bahtY !== undefined && printConfig.bahtY !== '' ? printConfig.bahtY : ''} 
                                                                             onChange={(e) => updatePrintConfig('bahtY', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} 
                                                                             onBlur={(e) => { if (e.target.value === '') updatePrintConfig('bahtY', DEFAULT_PRINT_CONFIG.bahtY); }}
                                                                         /> 
                                                                         <span className="calib-unit">mm</span>
                                                                     </label>
                                                                     <label title="ขนาดตัวอักษรจำนวนเงินภาษาไทย">ขนาด: 
                                                                         <input 
                                                                             type="number" 
                                                                             step="0.5" 
                                                                             min="5" 
                                                                             max="18" 
                                                                             disabled={isConfigLocked}
                                                                             value={printConfig.fontSizeBaht !== undefined && printConfig.fontSizeBaht !== '' ? printConfig.fontSizeBaht : ''} 
                                                                             onChange={(e) => updatePrintConfig('fontSizeBaht', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} 
                                                                             onBlur={(e) => { if (e.target.value === '') updatePrintConfig('fontSizeBaht', DEFAULT_PRINT_CONFIG.fontSizeBaht); }}
                                                                         /> 
                                                                         <span className="calib-unit">pt</span>
                                                                     </label>
                                                                 </div>
                                                             </div>

                                                             {/* Amount */}
                                                             <div className="calib-field-group">
                                                                 <span className="calib-field-title">💰 จำนวนเงินตัวเลข (฿)</span>
                                                                 <div className="calib-field-inputs" style={{ flexWrap: 'wrap', gap: '8px' }}>
                                                                     <label title="ตำแหน่งแนวนอน">Left: 
                                                                         <input 
                                                                             type="number" 
                                                                             step="0.5" 
                                                                             disabled={isConfigLocked}
                                                                             value={printConfig.amountX !== undefined && printConfig.amountX !== '' ? printConfig.amountX : ''} 
                                                                             onChange={(e) => updatePrintConfig('amountX', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} 
                                                                             onBlur={(e) => { if (e.target.value === '') updatePrintConfig('amountX', DEFAULT_PRINT_CONFIG.amountX); }}
                                                                         /> 
                                                                         <span className="calib-unit">mm</span>
                                                                     </label>
                                                                     <label title="ตำแหน่งแนวตั้ง">Top: 
                                                                         <input 
                                                                             type="number" 
                                                                             step="0.5" 
                                                                             disabled={isConfigLocked}
                                                                             value={printConfig.amountY !== undefined && printConfig.amountY !== '' ? printConfig.amountY : ''} 
                                                                             onChange={(e) => updatePrintConfig('amountY', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} 
                                                                             onBlur={(e) => { if (e.target.value === '') updatePrintConfig('amountY', DEFAULT_PRINT_CONFIG.amountY); }}
                                                                         /> 
                                                                         <span className="calib-unit">mm</span>
                                                                     </label>
                                                                     <label title="ขนาดตัวเลขอารบิก">ขนาด: 
                                                                         <input 
                                                                             type="number" 
                                                                             step="0.5" 
                                                                             min="5" 
                                                                             max="18" 
                                                                             disabled={isConfigLocked}
                                                                             value={printConfig.fontSizeAmount !== undefined && printConfig.fontSizeAmount !== '' ? printConfig.fontSizeAmount : ''} 
                                                                             onChange={(e) => updatePrintConfig('fontSizeAmount', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} 
                                                                             onBlur={(e) => { if (e.target.value === '') updatePrintConfig('fontSizeAmount', DEFAULT_PRINT_CONFIG.fontSizeAmount); }}
                                                                         /> 
                                                                         <span className="calib-unit">pt</span>
                                                                     </label>
                                                                 </div>
                                                             </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                        <div className="cheque-canvas-container" ref={chequePrintRef} style={{ margin: '0 auto' }}>
                                        <div className="cheque-canvas">
                                            {/* ขีดคร่อมมุมบนซ้าย */}
                                            {isCrossed && (
                                                <div className="cheque-cross-svg-wrapper">
                                                    <svg className="cheque-cross-svg" viewBox="0 0 100 80" preserveAspectRatio="none">
                                                        <line x1="0" y1="54" x2="54" y2="0" stroke="#047857" strokeWidth="2.2" />
                                                        <line x1="0" y1="78" x2="78" y2="0" stroke="#047857" strokeWidth="2.2" />
                                                        <rect x="8" y="27" width="50" height="12" rx="2" fill="rgba(255,255,255,0.92)" transform="rotate(-45 33 33)" />
                                                        <text x="33" y="35.5" textAnchor="middle" fill="#047857" fontSize="6.5" fontWeight="800" letterSpacing="0.05em" transform="rotate(-45 33 33)">
                                                            A/C PAYEE ONLY
                                                        </text>
                                                    </svg>
                                                </div>
                                            )}
                                            {/* ── Cheque Header ── */}
                                            <div className="cheque-header">
                                                <div className="cheque-bank-info">
                                                    <div className="cheque-bank-brand">
                                                        <div className="cheque-bank-titles">
                                                            <span className="cheque-bank-th">ธนาคารกสิกรไทย</span>
                                                            <div className="cheque-bank-divider-line" />
                                                            <span className="cheque-bank-en">开泰银行 KASIKORNBANK</span>
                                                        </div>
                                                        <div className="cheque-kbank-logo-box">
                                                            <img 
                                                                src="/images/banks/bank-kbank.png" 
                                                                alt="KASIKORNBANK" 
                                                                className="cheque-kbank-logo-img"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="cheque-branch-text">
                                                        {DEFAULT_KBANK_CONFIG.branchText}
                                                    </div>
                                                </div>

                                                {/* ── วันที่ 8 ช่อง ── */}
                                                <div className="cheque-date-section">
                                                    <div className="cheque-date-row">
                                                        <span className="cheque-date-label">วันที่ 日期 Date</span>
                                                        <div className="cheque-date-boxes">
                                                            {/* วัน */}
                                                            <div className="cheque-date-group">
                                                                <div className="cheque-digit-box">{dateDigits[0]}</div>
                                                                <div className="cheque-digit-box">{dateDigits[1]}</div>
                                                            </div>
                                                            {/* เดือน */}
                                                            <div className="cheque-date-group">
                                                                <div className="cheque-digit-box">{dateDigits[2]}</div>
                                                                <div className="cheque-digit-box">{dateDigits[3]}</div>
                                                            </div>
                                                            {/* ปี */}
                                                            <div className="cheque-date-group">
                                                                <div className="cheque-digit-box">{dateDigits[4]}</div>
                                                                <div className="cheque-digit-box">{dateDigits[5]}</div>
                                                                <div className="cheque-digit-box">{dateDigits[6]}</div>
                                                                <div className="cheque-digit-box">{dateDigits[7]}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="cheque-date-sublabels">
                                                        <span className="cheque-sublbl-group day">วัน 日 Date</span>
                                                        <span className="cheque-sublbl-sep">|</span>
                                                        <span className="cheque-sublbl-group month">เดือน 月 Month</span>
                                                        <span className="cheque-sublbl-sep">|</span>
                                                        <span className="cheque-sublbl-group year">ปี 年 Year</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Cheque Body Lines ── */}
                                            <div className="cheque-body">
                                                {/* แถว 1: จ่าย (Payee) */}
                                                <div className="cheque-line-payee">
                                                    <div className="cheque-line-start">
                                                        <span className="cheque-line-tick" />
                                                        <span className="cheque-line-label">จ่าย 付给 Pay</span>
                                                    </div>
                                                    <div className="cheque-payee-line-wrapper">
                                                        <span className="cheque-payee-value">{payee || ''}</span>
                                                    </div>
                                                    <div 
                                                        className="cheque-bearer-box" 
                                                        onClick={() => setIsStrikeBearer(!isStrikeBearer)}
                                                        title="คลิกเพื่อสลับขีดฆ่าหรือผู้ถือ"
                                                    >
                                                        <span className="cheque-bearer-th">หรือผู้ถือ</span>
                                                        <span className="cheque-bearer-en">或来人 or bearer</span>
                                                        {isStrikeBearer && <div className="cheque-bearer-strikethrough" />}
                                                    </div>
                                                </div>

                                                {/* แถว 2: บาท (Baht Text) — วิ่งยาวไปสุดขอบขวา 100% ตามเช็คจริง */}
                                                <div className="cheque-line-baht">
                                                    <span className="cheque-left-stamp">ชำระอากรแล้ว</span>
                                                    <div className="cheque-line-start">
                                                        <span className="cheque-line-tick" />
                                                        <span className="cheque-line-label">บาท 泰铢 Baht</span>
                                                    </div>
                                                    <div className="cheque-baht-text-wrapper">
                                                        <span className="cheque-baht-text-value">{activeBahtText}</span>
                                                    </div>
                                                </div>

                                                {/* แถว 3: เส้นบรรทัดที่สาม (ว่าง) + ช่องจำนวนเงินตัวเลข ฿ */}
                                                <div className="cheque-amount-section">
                                                    <div className="cheque-baht-line-2" />
                                                    <div className="cheque-amount-box">
                                                        <span className="cheque-amount-symbol">฿</span>
                                                        <span className="cheque-amount-val">{formattedAmount}</span>
                                                    </div>
                                                </div>

                                                {/* เส้นลายมือชื่อผู้สั่งจ่าย (Signature Line) ตรงตำแหน่งเส้นแดง */}
                                                <div className="cheque-signature-row">
                                                    <div className="cheque-signature-line" />
                                                </div>
                                            </div>

                                            {/* ── Cheque Footer (ก่อนแถบขาว MICR) ── */}
                                            <div className="cheque-footer-area">
                                                <div className="cheque-footer-chq-row">
                                                    <span className="cheque-bottom-left-code">TBSP .09-20</span>
                                                    <span className="cheque-chq-prefix">CHQ. {chequeNo ? chequeNo.split('').join(' ') : ''}</span>
                                                </div>
                                                <div className="cheque-footer-labels-row">
                                                    <div className="cheque-footer-col col-cheque-no">
                                                        <span>เช็คเลขที่ 支票号码 Cheque No.</span>
                                                    </div>
                                                    <div className="cheque-footer-col col-branch-no">
                                                        <span>หมายเลขประจำสำนักงาน 分行代码 Branch No.</span>
                                                    </div>
                                                    <div className="cheque-footer-col col-account-no">
                                                        <span>เลขที่บัญชี 帐户号码 Account No.</span>
                                                    </div>
                                                    <div className="cheque-footer-col col-official">
                                                        <span>สำหรับเจ้าหน้าที่ 银行专用 For Official Only</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Bottom MICR White Band ── */}
                                            <div className="cheque-micr-band">
                                                <span>⑆69 ⑈{chequeNo}⑈ 004⑉{DEFAULT_KBANK_CONFIG.branchNo}⑆ {DEFAULT_KBANK_CONFIG.accountNo}⑈</span>
                                            </div>
                                        </div>
                                    </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

            {/* ── Payment Voucher A4 Modal / Print Sheet ── */}
            {showVoucherModal && (
                <div className="cq-modal-overlay no-print" onClick={() => setShowVoucherModal(false)}>
                    <div className="cq-modal-card" style={{ maxWidth: '880px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="cq-modal-header no-print">
                            <h3 className="cq-modal-title">
                                <FileSpreadsheet size={20} color="#7c3aed" />
                                <span>พิมพ์ใบสำคัญจ่ายเช็ค (Cheque Payment Voucher A4)</span>
                            </h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    onClick={handlePrintVoucher}
                                    style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500 }}
                                >
                                    <Printer size={15} /> พิมพ์ใบสำคัญจ่าย
                                </button>
                                <button className="cq-modal-close" onClick={() => setShowVoucherModal(false)}>✕</button>
                            </div>
                        </div>

                        <div className="cq-modal-body" style={{ background: '#f8fafc', padding: '1.5rem' }}>
                            {/* A4 Printable Sheet */}
                            <div className="voucher-wrapper" ref={voucherPrintRef}>
                                <div className="voucher-header">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h2 className="voucher-company-name">บริษัท อิลิท เทรดดิ้ง 2020 จำกัด</h2>
                                            <p className="voucher-company-sub">ELITE TRADING 2020 CO., LTD.</p>
                                            <p className="voucher-company-sub" style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                                                เลขประจำตัวผู้เสียภาษี: 0105550000000 | สำนักงานใหญ่ นนทบุรี
                                            </p>
                                        </div>
                                        <img 
                                            src="/images/logos/logo-elite.png" 
                                            alt="ELITE" 
                                            style={{ height: '48px', objectFit: 'contain' }}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    </div>

                                    <div className="voucher-title-badge">
                                        <span className="voucher-title-text">ใบสำคัญจ่ายเช็ค / CHEQUE PAYMENT VOUCHER</span>
                                        <span className="voucher-no-text">เลขที่: <strong>{voucherNo}</strong></span>
                                    </div>
                                </div>

                                <div className="voucher-info-grid">
                                    <div className="voucher-info-item">
                                        <span className="lbl">วันที่ (Date):</span>
                                        <span className="val">{new Date(issueDate).toLocaleDateString('th-TH')}</span>
                                    </div>
                                    <div className="voucher-info-item">
                                        <span className="lbl">เลขที่เช็ค (Cheque No):</span>
                                        <span className="val"><strong>{chequeNo}</strong></span>
                                    </div>
                                    <div className="voucher-info-item">
                                        <span className="lbl">สั่งจ่ายให้ (Payee):</span>
                                        <span className="val"><strong>{payee}</strong></span>
                                    </div>
                                    <div className="voucher-info-item">
                                        <span className="lbl">ธนาคาร / สาขา:</span>
                                        <span className="val">{DEFAULT_KBANK_CONFIG.bankName} (สาขาสนามบินน้ำ)</span>
                                    </div>
                                    <div className="voucher-info-item">
                                        <span className="lbl">ยอดเงิน (Amount):</span>
                                        <span className="val" style={{ color: '#059669', fontSize: '1.05rem', fontWeight: 800 }}>
                                            {formattedAmount || `${amount} ฿`}
                                        </span>
                                    </div>
                                    <div className="voucher-info-item">
                                        <span className="lbl">เลขที่บัญชีสั่งจ่าย:</span>
                                        <span className="val">{DEFAULT_KBANK_CONFIG.accountNo}</span>
                                    </div>
                                    <div className="voucher-info-item" style={{ gridColumn: 'span 2' }}>
                                        <span className="lbl">จำนวนเงินตัวอักษร:</span>
                                        <span className="val">{activeBahtText}</span>
                                    </div>
                                    <div className="voucher-info-item">
                                        <span className="lbl">อ้างอิงเอกสาร:</span>
                                        <span className="val">{refDocNo || '-'}</span>
                                    </div>
                                    <div className="voucher-info-item">
                                        <span className="lbl">วันที่ครบกำหนด:</span>
                                        <span className="val">{new Date(dueDate || issueDate).toLocaleDateString('th-TH')}</span>
                                    </div>
                                    <div className="voucher-info-item" style={{ gridColumn: 'span 2' }}>
                                        <span className="lbl">คำอธิบายการสั่งจ่าย:</span>
                                        <span className="val">{notes || 'ชำระค่าสินค้า/บริการ'}</span>
                                    </div>
                                </div>

                                {/* สำเนาภาพเช็คประกอบในใบสำคัญจ่าย */}
                                <div className="voucher-cheque-preview-container">
                                    <span className="voucher-cheque-caption">สำเนาภาพเช็ค (Copy of Issued Cheque)</span>
                                    
                                    {/* Visual Cheque Box */}
                                    <div className="cheque-canvas in-voucher">
                                        {isCrossed && (
                                            <div className="cheque-cross-svg-wrapper">
                                                <svg className="cheque-cross-svg" viewBox="0 0 100 80" preserveAspectRatio="none">
                                                    <line x1="0" y1="54" x2="54" y2="0" stroke="#047857" strokeWidth="2.2" />
                                                    <line x1="0" y1="78" x2="78" y2="0" stroke="#047857" strokeWidth="2.2" />
                                                    <rect x="8" y="27" width="50" height="12" rx="2" fill="rgba(255,255,255,0.92)" transform="rotate(-45 33 33)" />
                                                    <text x="33" y="35.5" textAnchor="middle" fill="#047857" fontSize="6.5" fontWeight="800" letterSpacing="0.05em" transform="rotate(-45 33 33)">
                                                        A/C PAYEE ONLY
                                                    </text>
                                                </svg>
                                            </div>
                                        )}

                                        <div className="cheque-header">
                                            <div className="cheque-bank-info">
                                                <div className="cheque-bank-brand">
                                                    <div className="cheque-bank-titles">
                                                        <span className="cheque-bank-th">ธนาคารกสิกรไทย</span>
                                                        <div className="cheque-bank-divider-line" />
                                                        <span className="cheque-bank-en">开泰银行 KASIKORNBANK</span>
                                                    </div>
                                                    <div className="cheque-kbank-logo-box">
                                                        <img 
                                                            src="/images/banks/bank-kbank.png" 
                                                            alt="KASIKORNBANK" 
                                                            className="cheque-kbank-logo-img"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="cheque-branch-text">{DEFAULT_KBANK_CONFIG.branchText}</div>
                                            </div>

                                            <div className="cheque-date-section">
                                                <div className="cheque-date-row">
                                                    <span className="cheque-date-label">วันที่ 日期 Date</span>
                                                    <div className="cheque-date-boxes">
                                                        <div className="cheque-date-group">
                                                            <div className="cheque-digit-box">{dateDigits[0]}</div>
                                                            <div className="cheque-digit-box">{dateDigits[1]}</div>
                                                        </div>
                                                        <div className="cheque-date-group">
                                                            <div className="cheque-digit-box">{dateDigits[2]}</div>
                                                            <div className="cheque-digit-box">{dateDigits[3]}</div>
                                                        </div>
                                                        <div className="cheque-date-group">
                                                            <div className="cheque-digit-box">{dateDigits[4]}</div>
                                                            <div className="cheque-digit-box">{dateDigits[5]}</div>
                                                            <div className="cheque-digit-box">{dateDigits[6]}</div>
                                                            <div className="cheque-digit-box">{dateDigits[7]}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="cheque-date-sublabels">
                                                    <span className="cheque-sublbl-group day">วัน 日 Date</span>
                                                    <span className="cheque-sublbl-sep">|</span>
                                                    <span className="cheque-sublbl-group month">เดือน 月 Month</span>
                                                    <span className="cheque-sublbl-sep">|</span>
                                                    <span className="cheque-sublbl-group year">ปี 年 Year</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Cheque Body Lines ── */}
                                        <div className="cheque-body">
                                            {/* แถว 1: จ่าย (Payee) */}
                                            <div className="cheque-line-payee">
                                                <div className="cheque-line-start">
                                                    <span className="cheque-line-tick" />
                                                    <span className="cheque-line-label">จ่าย 付给 Pay</span>
                                                </div>
                                                <div className="cheque-payee-line-wrapper">
                                                    <span className="cheque-payee-value">{payee || ''}</span>
                                                </div>
                                                <div className="cheque-bearer-box">
                                                    <span className="cheque-bearer-th">หรือผู้ถือ</span>
                                                    <span className="cheque-bearer-en">或来人 or bearer</span>
                                                    {isStrikeBearer && <div className="cheque-bearer-strikethrough" />}
                                                </div>
                                            </div>

                                            {/* แถว 2: บาท (Baht Text) — วิ่งยาวไปสุดขอบขวา 100% ตามเช็คจริง */}
                                            <div className="cheque-line-baht">
                                                <span className="cheque-left-stamp">ชำระอากรแล้ว</span>
                                                <div className="cheque-line-start">
                                                    <span className="cheque-line-tick" />
                                                    <span className="cheque-line-label">บาท 泰铢 Baht</span>
                                                </div>
                                                <div className="cheque-baht-text-wrapper">
                                                    <span className="cheque-baht-text-value">{activeBahtText}</span>
                                                </div>
                                            </div>

                                            {/* แถว 3: เส้นบรรทัดที่สาม (ว่าง) + ช่องจำนวนเงินตัวเลข ฿ */}
                                            <div className="cheque-amount-section">
                                                <div className="cheque-baht-line-2" />
                                                <div className="cheque-amount-box">
                                                    <span className="cheque-amount-symbol">฿</span>
                                                    <span className="cheque-amount-val">{formattedAmount}</span>
                                                </div>
                                            </div>

                                            {/* เส้นลายมือชื่อผู้สั่งจ่าย (Signature Line) ตรงตำแหน่งเส้นแดง */}
                                            <div className="cheque-signature-row">
                                                <div className="cheque-signature-line" />
                                            </div>
                                        </div>

                                        {/* ── Cheque Footer (ก่อนแถบขาว MICR) ── */}
                                        <div className="cheque-footer-area">
                                            <div className="cheque-footer-chq-row">
                                                <span className="cheque-bottom-left-code">TBSP .09-20</span>
                                                <span className="cheque-chq-prefix">CHQ. {chequeNo ? chequeNo.split('').join(' ') : ''}</span>
                                            </div>
                                            <div className="cheque-footer-labels-row">
                                                <div className="cheque-footer-col col-cheque-no">
                                                    <span>เช็คเลขที่ 支票号码 Cheque No.</span>
                                                </div>
                                                <div className="cheque-footer-col col-branch-no">
                                                    <span>หมายเลขประจำสำนักงาน 分行代码 Branch No.</span>
                                                </div>
                                                <div className="cheque-footer-col col-account-no">
                                                    <span>เลขที่บัญชี 帐户号码 Account No.</span>
                                                </div>
                                                <div className="cheque-footer-col col-official">
                                                    <span>สำหรับเจ้าหน้าที่ 银行专用 For Official Only</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Bottom MICR White Band ── */}
                                        <div className="cheque-micr-band">
                                            <span>⑆69 ⑈{chequeNo}⑈ 004⑉{DEFAULT_KBANK_CONFIG.branchNo}⑆ {DEFAULT_KBANK_CONFIG.accountNo}⑈</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 4 Signature Blocks */}
                                <div className="voucher-signatures-grid">
                                    <div className="voucher-sig-box">
                                        <div className="voucher-sig-line" />
                                        <span className="voucher-sig-role">ผู้จัดทำ (Prepared By)</span>
                                        <span className="voucher-sig-date">วันที่ ......./......./.......</span>
                                    </div>
                                    <div className="voucher-sig-box">
                                        <div className="voucher-sig-line" />
                                        <span className="voucher-sig-role">ผู้ตรวจสอบ (Checked By)</span>
                                        <span className="voucher-sig-date">วันที่ ......./......./.......</span>
                                    </div>
                                    <div className="voucher-sig-box">
                                        <div className="voucher-sig-line" />
                                        <span className="voucher-sig-role">ผู้อนุมัติจ่าย (Authorized By)</span>
                                        <span className="voucher-sig-date">วันที่ ......./......./.......</span>
                                    </div>
                                    <div className="voucher-sig-box">
                                        <div className="voucher-sig-line" />
                                        <span className="voucher-sig-role">ผู้รับเช็ค (Received By)</span>
                                        <span className="voucher-sig-date">วันที่ ......./......./.......</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Cheque History Modal (Popup) ── */}
            {showHistoryModal && (
                <div className="pdf-preview-overlay" onClick={() => setShowHistoryModal(false)} style={{ zIndex: 3000, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', height: 'auto', padding: '24px', maxHeight: '80vh', overflowY: 'auto', background: '#fff', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                                <History size={18} /> ประวัติการแก้ไข (Revision History)
                            </h3>
                            <button onClick={() => setShowHistoryModal(false)} className="doc-action-btn" style={{ width: '30px', height: '30px', background: '#f1f5f9', borderRadius: '6px' }}>
                                <X size={16} />
                            </button>
                        </div>
                        {loadingChequeHistory ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}><div className="loading-spinner"></div></div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {chequeHistoryList.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>ไม่มีประวัติการแก้ไขสำหรับรายการนี้</p>
                                ) : (
                                    chequeHistoryList.map((h, i) => (
                                        <div key={h.HistoryID} style={{
                                            padding: '14px 16px',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            background: '#f8fafc',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                                                    Revision {h.Revision} {i === 0 && <span style={{ fontSize: '12px', background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 500 }}>Current</span>}
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                                    ผู้รับเงิน: {h.PayeeOrPayer}
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                                                    ยอดเงิน: {h.Amount !== undefined ? String(h.Amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '-'}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                                                    บันทึกเมื่อ: {new Date(h.ArchivedAt).toLocaleString('th-TH')}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    background: h.Status === 'voided' ? '#fee2e2' : '#dcfce7',
                                                    color: h.Status === 'voided' ? '#ef4444' : '#16a34a'
                                                }}>
                                                    #{h.HistoryID}
                                                </span>
                                                <button 
                                                    className="doc-action-btn"
                                                    style={{ margin: 0, padding: '4px', color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe' }}
                                                    onClick={async () => {
                                                        try {
                                                            const token = localStorage.getItem('token');
                                                            const res = await fetch(`/api/cheque-forms/history/${h.HistoryID}`, {
                                                                headers: { 'Authorization': `Bearer ${token}` }
                                                            });
                                                            if (res.ok) {
                                                                const data = await res.json();
                                                                setShowHistoryModal(false);
                                                                handlePreviewFromHistory(data.data);
                                                            }
                                                        } catch (err) {
                                                            console.error('Error fetching history detail', err);
                                                        }
                                                    }}
                                                    title="ดูตัวอย่างเช็คเวอร์ชันนี้"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

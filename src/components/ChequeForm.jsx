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

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from './CustomAlert';
import { numberToThaiBaht, formatChequeAmount } from '../utils/thaiBahtConverter';
import {
    Printer, Save, RotateCcw, History, FileSpreadsheet,
    Calendar, CreditCard, DollarSign, User, FileText, Trash2, Eye,
    CheckCircle2, ChevronRight, Search, Plus, Image, ArrowLeft, Pencil, X
} from 'lucide-react';
import '../pages/PageCommon.css';
import './ChequeForm.css';

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

export default function ChequeForm() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentTab = searchParams.get('tab') || 'history'; // Default to history table (หน้าหลัก)

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

    // คำนวณจำนวนเงินตัวอักษรภาษาไทยแบบเรียลไทม์
    const autoBahtText = useMemo(() => {
        if (!amount || isNaN(parseFloat(amount))) return '';
        return numberToThaiBaht(amount, { prefix: '**', suffix: '**' });
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

    useEffect(() => {
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





    // พิมพ์เฉพาะรูปหน้าเช็คจำลอง (Mockup A4)
    const handlePrintMockup = () => {
        if (!payee || !amount) {
            showAlert('ข้อมูลไม่ครบ', 'กรุณาระบุชื่อผู้รับเงินและจำนวนเงินก่อนพิมพ์', 'warning');
            return;
        }
        setShowPreviewModal(false);
        setShowVoucherModal(true);
        
        setTimeout(() => {
            document.body.classList.add('print-mode-mockup-a4');
            window.print();
            
            const cleanUp = () => {
                document.body.classList.remove('print-mode-mockup-a4');
                setShowVoucherModal(false);
                window.removeEventListener('afterprint', cleanUp);
            };
            window.addEventListener('afterprint', cleanUp);
        }, 150);
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

                        {/* อ้างอิงเอกสาร */}
                        <div className="cq-form-group">
                            <label>
                                <span>อ้างอิงเอกสาร (Ref Invoice / PO)</span>
                                <FileText size={15} color="#64748b" />
                            </label>
                            <input 
                                type="text" 
                                className="cq-input" 
                                value={refDocNo} 
                                onChange={(e) => setRefDocNo(e.target.value)}
                                placeholder="เช่น INV-2026-008, PO-102"
                            />
                        </div>

                        {/* วันที่ครบกำหนดเช็ค */}
                        <div className="cq-form-group">
                            <label>
                                <span>วันที่ครบกำหนดเช็ค (Due Date)</span>
                                <Calendar size={15} color="#64748b" />
                            </label>
                            <input 
                                type="date" 
                                className="cq-input" 
                                value={dueDate} 
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>

                        {/* หมายเหตุ / วัตถุประสงค์ */}
                        <div className="cq-form-group" style={{ gridColumn: 'span 2' }}>
                            <label>
                                <span>รายละเอียด / วัตถุประสงค์ในการจ่าย</span>
                            </label>
                            <input 
                                type="text" 
                                className="cq-input" 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="เช่น ชำระค่าสินค้าและวัตถุดิบรอบมีนาคม 2569"
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
                                

                                
                                <div className="cheque-stage-quick-switches" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.5rem', background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                    <label className="cq-switch-label" style={{ fontSize: '0.75rem' }}>
                                        <input type="checkbox" checked={isCrossed} onChange={(e) => setIsCrossed(e.target.checked)} />
                                        <span>ขีดคร่อม (// A/C PAYEE ONLY //)</span>
                                    </label>
                                    <label className="cq-switch-label" style={{ fontSize: '0.75rem' }}>
                                        <input type="checkbox" checked={isStrikeBearer} onChange={(e) => setIsStrikeBearer(e.target.checked)} />
                                        <span>ขีดฆ่า "หรือผู้ถือ"</span>
                                    </label>
                                    <label className="cq-switch-label" style={{ fontSize: '0.75rem' }}>
                                        <input type="checkbox" checked={isBuddhistYear} onChange={(e) => setIsBuddhistYear(e.target.checked)} />
                                        <span>ปี พ.ศ. (บวก 543)</span>
                                    </label>
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px dashed #fcd34d', margin: '0.25rem 0' }} />
                                
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
                            <div className="cq-modal-card cq-preview-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="cq-modal-header no-print">
                                    <h3 className="cq-modal-title">
                                        <CreditCard size={20} color="#059669" />
                                        <span>ตัวอย่างหน้าเช็ค (Kasikornbank Cheque Preview)</span>
                                    </h3>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={handlePrintMockup}
                                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500 }}
                                        >
                                            <Printer size={15} /> พิมพ์ใบเช็ค
                                        </button>
                                        <button className="cq-modal-close" onClick={() => setShowPreviewModal(false)}>✕</button>
                                    </div>
                                </div>
                                <div className="cq-modal-body" style={{ background: '#f1f5f9', padding: '1.5rem', overflowY: 'auto', overflowX: 'auto' }}>
                                    <div className="cheque-canvas-container" style={{ margin: '0 auto' }}>
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
                                </div>
                            </div>
                        </div>
                    )}

            {/* ── Payment Voucher A4 Modal / Print Sheet ── */}
            {showVoucherModal && (
                <div className="cq-modal-overlay" onClick={() => setShowVoucherModal(false)}>
                    <div className="cq-modal-card" style={{ maxWidth: '880px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="cq-modal-header no-print">
                            <h3 className="cq-modal-title">
                                <FileSpreadsheet size={20} color="#7c3aed" />
                                <span>พิมพ์ใบสำคัญจ่ายเช็ค (Cheque Payment Voucher A4)</span>
                            </h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="cq-modal-close" onClick={() => setShowVoucherModal(false)}>✕</button>
                            </div>
                        </div>

                        <div className="cq-modal-body" style={{ background: '#f8fafc', padding: '1.5rem' }}>
                            {/* A4 Printable Sheet */}
                            <div className="voucher-wrapper">
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

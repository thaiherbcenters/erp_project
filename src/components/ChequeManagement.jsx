import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from './CustomAlert';
import {
    CreditCard,
    ArrowDownLeft,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    AlertTriangle,
    XCircle,
    Search,
    Filter,
    Plus,
    Edit3,
    Trash2,
    Calendar,
    Building2,
    RefreshCw,
    ChevronDown,
    FileText,
    Check,
    X,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    FileSpreadsheet,
} from 'lucide-react';
import './ChequeManagement.css';

const THAI_BANKS = [
    { code: 'KBANK', name: 'ธนาคารกสิกรไทย', color: '#00a950' },
    { code: 'SCB', name: 'ธนาคารไทยพาณิชย์', color: '#4e2e80' },
    { code: 'BBL', name: 'ธนาคารกรุงเทพ', color: '#1e3a8a' },
    { code: 'KTB', name: 'ธนาคารกรุงไทย', color: '#00a3e0' },
    { code: 'TTB', name: 'ธนาคารทหารไทยธนชาต', color: '#002d63' },
    { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา', color: '#ffcb05' },
    { code: 'GSB', name: 'ธนาคารออมสิน', color: '#eb1985' },
    { code: 'UOB', name: 'ธนาคารยูโอบี', color: '#00205b' },
    { code: 'BAAC', name: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)', color: '#006c35' },
    { code: 'OTHER', name: 'ธนาคารอื่นๆ', color: '#64748b' }
];

export default function ChequeManagement() {
    const { activeCompany, canCreate, canUpdate, canDelete } = useAuth();
    const { showAlert, showConfirm } = useAlert();
    const [searchParams, setSearchParams] = useSearchParams();

    // ── Data states ──
    const [cheques, setCheques] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    // ── Tab & Filter states ──
    // Tab options: 'all', 'received', 'issued'
    const tabParam = searchParams.get('tab');
    const initialTab = tabParam === 'cheques_received' ? 'received' : (tabParam === 'cheques_issued' ? 'issued' : 'all');
    const [activeTab, setActiveTab] = useState(initialTab);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Synchronize tab with URL search parameter
    useEffect(() => {
        if (tabParam === 'cheques_received') setActiveTab('received');
        else if (tabParam === 'cheques_issued') setActiveTab('issued');
        else if (tabParam === 'cheques_overview') setActiveTab('all');
    }, [tabParam]);

    // ── Modal states ──
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCheque, setEditingCheque] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form data state
    const [formData, setFormData] = useState({
        chequeNo: '',
        chequeType: 'received',
        bankName: 'ธนาคารกสิกรไทย',
        bankBranch: '',
        accountNo: '',
        payeeOrPayer: '',
        amount: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        depositDate: '',
        clearedDate: '',
        status: 'pending',
        refDocNo: '',
        notes: ''
    });

    // ── Fetch Data ──
    const fetchCheques = async () => {
        setLoading(true);
        try {
            const compId = activeCompany?.CompanyID || 2;
            const [listRes, sumRes] = await Promise.all([
                fetch(`/api/cheques?companyId=${compId}`),
                fetch(`/api/cheques/summary?companyId=${compId}`)
            ]);

            if (listRes.ok) {
                const listData = await listRes.json();
                setCheques(Array.isArray(listData) ? listData : []);
            }
            if (sumRes.ok) {
                const sumData = await sumRes.json();
                setSummary(sumData);
            }
        } catch (err) {
            console.error('Error loading cheques:', err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลทะเบียนเช็คได้', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCheques();
    }, [activeCompany]);

    // ── Helpers ──
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    const getBankColor = (bankName) => {
        const found = THAI_BANKS.find(b => bankName && (bankName.includes(b.name) || bankName.includes(b.code)));
        return found ? found.color : '#64748b';
    };

    // ── Filtered List ──
    const filteredCheques = useMemo(() => {
        return cheques.filter(item => {
            // Filter by Tab (Type)
            if (activeTab === 'received' && item.ChequeType !== 'received') return false;
            if (activeTab === 'issued' && item.ChequeType !== 'issued') return false;

            // Filter by Status
            if (statusFilter !== 'all' && item.Status !== statusFilter) return false;

            // Filter by Search term
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                const matchNo = item.ChequeNo?.toLowerCase().includes(term);
                const matchPerson = item.PayeeOrPayer?.toLowerCase().includes(term);
                const matchBank = item.BankName?.toLowerCase().includes(term);
                const matchRef = item.RefDocNo?.toLowerCase().includes(term);
                if (!matchNo && !matchPerson && !matchBank && !matchRef) return false;
            }

            return true;
        });
    }, [cheques, activeTab, statusFilter, searchTerm]);

    // ── Modal Actions ──
    const handleOpenCreateModal = (defaultType = 'received') => {
        setEditingCheque(null);
        setFormData({
            chequeNo: '',
            chequeType: activeTab === 'all' ? defaultType : activeTab,
            bankName: 'ธนาคารกสิกรไทย',
            bankBranch: '',
            accountNo: '',
            payeeOrPayer: '',
            amount: '',
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: '',
            depositDate: '',
            clearedDate: '',
            status: 'pending',
            refDocNo: '',
            notes: ''
        });
        setModalOpen(true);
    };

    const handleOpenEditModal = (cheque) => {
        setEditingCheque(cheque);
        setFormData({
            chequeNo: cheque.ChequeNo || '',
            chequeType: cheque.ChequeType || 'received',
            bankName: cheque.BankName || 'ธนาคารกสิกรไทย',
            bankBranch: cheque.BankBranch || '',
            accountNo: cheque.AccountNo || '',
            payeeOrPayer: cheque.PayeeOrPayer || '',
            amount: cheque.Amount || '',
            issueDate: cheque.IssueDate ? cheque.IssueDate.split('T')[0] : '',
            dueDate: cheque.DueDate ? cheque.DueDate.split('T')[0] : '',
            depositDate: cheque.DepositDate ? cheque.DepositDate.split('T')[0] : '',
            clearedDate: cheque.ClearedDate ? cheque.ClearedDate.split('T')[0] : '',
            status: cheque.Status || 'pending',
            refDocNo: cheque.RefDocNo || '',
            notes: cheque.Notes || ''
        });
        setModalOpen(true);
    };

    const handleSaveCheque = async (e) => {
        e.preventDefault();
        if (!formData.chequeNo.trim()) {
            showAlert('กรุณากรอกข้อมูล', 'กรุณาระบุเลขที่เช็ค', 'warning');
            return;
        }
        if (!formData.payeeOrPayer.trim()) {
            showAlert('กรุณากรอกข้อมูล', formData.chequeType === 'received' ? 'กรุณาระบุชื่อผู้สั่งจ่าย (ลูกค้า)' : 'กรุณาระบุชื่อผู้รับเงิน (เจ้าหนี้/คู่ค้า)', 'warning');
            return;
        }
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            showAlert('กรุณากรอกข้อมูล', 'กรุณาระบุจำนวนเงินที่ถูกต้อง', 'warning');
            return;
        }
        if (!formData.dueDate) {
            showAlert('กรุณากรอกข้อมูล', 'กรุณาระบุวันที่บนหน้าเช็ค / วันที่ครบกำหนด', 'warning');
            return;
        }

        setSaving(true);
        try {
            const url = editingCheque ? `/api/cheques/${editingCheque.ChequeID}` : '/api/cheques';
            const method = editingCheque ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (res.ok) {
                showAlert('สำเร็จ', editingCheque ? 'แก้ไขข้อมูลเช็คเรียบร้อยแล้ว' : 'บันทึกเช็คใหม่เรียบร้อยแล้ว', 'success');
                setModalOpen(false);
                fetchCheques();
            } else {
                showAlert('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            }
        } catch (err) {
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Quick Status Change ──
    const handleQuickStatus = async (cheque, newStatus) => {
        const statusLabel = {
            cleared: 'ขึ้นเงินแล้ว (Cleared)',
            deposited: 'นำฝากเรียกเก็บแล้ว',
            bounced: 'เช็คคืน / เช็คเด้ง (Bounced)',
            cancelled: 'ยกเลิกเช็ค'
        }[newStatus] || newStatus;

        showConfirm(
            'ยืนยันเปลี่ยนสถานะเช็ค',
            `คุณต้องการเปลี่ยนสถานะเช็คเลขที่ "${cheque.ChequeNo}" เป็น "${statusLabel}" ใช่หรือไม่?`,
            async () => {
                try {
                    const res = await fetch(`/api/cheques/${cheque.ChequeID}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });
                    if (res.ok) {
                        showAlert('สำเร็จ', `อัปเดตสถานะเช็คเป็น "${statusLabel}" แล้ว`, 'success');
                        fetchCheques();
                    } else {
                        const d = await res.json();
                        showAlert('เกิดข้อผิดพลาด', d.message || 'ไม่สามารถเปลี่ยนสถานะได้', 'error');
                    }
                } catch (err) {
                    showAlert('เกิดข้อผิดพลาด', err.message, 'error');
                }
            }
        );
    };

    // ── Delete Cheque ──
    const handleDeleteCheque = (cheque) => {
        showConfirm(
            'ยืนยันการลบเช็ค',
            `คุณต้องการลบเช็คเลขที่ "${cheque.ChequeNo}" จำนวนเงิน ${formatCurrency(cheque.Amount)} ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
            async () => {
                try {
                    const res = await fetch(`/api/cheques/${cheque.ChequeID}`, { method: 'DELETE' });
                    if (res.ok) {
                        showAlert('สำเร็จ', 'ลบเช็คเรียบร้อยแล้ว', 'success');
                        fetchCheques();
                    } else {
                        const d = await res.json();
                        showAlert('เกิดข้อผิดพลาด', d.message || 'ไม่สามารถลบเช็คได้', 'error');
                    }
                } catch (err) {
                    showAlert('เกิดข้อผิดพลาด', err.message, 'error');
                }
            },
            'danger'
        );
    };

    // Status badge component
    const renderStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <span className="ch-badge ch-badge-pending"><Clock size={13} /> รอขึ้นเงิน</span>;
            case 'deposited':
                return <span className="ch-badge ch-badge-deposited"><CreditCard size={13} /> นำฝากแล้ว</span>;
            case 'cleared':
                return <span className="ch-badge ch-badge-cleared"><CheckCircle2 size={13} /> ขึ้นเงินแล้ว</span>;
            case 'bounced':
                return <span className="ch-badge ch-badge-bounced"><AlertTriangle size={13} /> เช็คคืน/เด้ง</span>;
            case 'cancelled':
                return <span className="ch-badge ch-badge-cancelled"><XCircle size={13} /> ยกเลิก</span>;
            default:
                return <span className="ch-badge ch-badge-default">{status}</span>;
        }
    };

    return (
        <div className="page-container cheque-management-page page-enter">
            {/* ── Page Header ── */}
            <div className="ch-header">
                <div className="ch-header-info">
                    <div className="ch-title-wrap">
                        <div className="ch-icon-badge">
                            <CreditCard size={26} strokeWidth={2} />
                        </div>
                        <div>
                            <h1 className="ch-title">ระบบทะเบียนเช็ค (Cheque Management)</h1>
                            <p className="ch-subtitle">
                                ทะเบียนเช็ครับ - เช็คจ่าย และติดตามสถานะการเรียกเก็บเงินของ {activeCompany?.CompanyNameTH || activeCompany?.CompanyName || 'บริษัท อิลิท เทรดดิ้ง 2020 จำกัด'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="ch-header-actions">
                    <button className="ch-btn ch-btn-secondary" onClick={fetchCheques} title="รีเฟรชข้อมูล">
                        <RefreshCw size={16} className={loading ? 'ch-spin' : ''} />
                        <span>รีเฟรช</span>
                    </button>
                    <button className="ch-btn ch-btn-primary" onClick={() => handleOpenCreateModal('received')}>
                        <Plus size={18} />
                        <span>+ บันทึกเช็คใหม่</span>
                    </button>
                </div>
            </div>

            {/* ── Summary KPI Cards ── */}
            <div className="ch-kpi-grid">
                {/* 1. เช็ครอขึ้นเงิน */}
                <div className="ch-kpi-card ch-kpi-pending">
                    <div className="ch-kpi-icon">
                        <Clock size={24} />
                    </div>
                    <div className="ch-kpi-content">
                        <span className="ch-kpi-label">เช็ครอขึ้นเงิน / รอเคลียริ่ง</span>
                        <div className="ch-kpi-val">{formatCurrency(summary?.pendingAmount || 0)}</div>
                        <div className="ch-kpi-sub">
                            <span>รวมทั้งหมด <strong>{summary?.pendingCount || 0}</strong> ฉบับ</span>
                            <span className="ch-kpi-dot">·</span>
                            <span className="ch-kpi-received">รับ: {formatCurrency(summary?.receivedPendingAmount || 0)}</span>
                            <span className="ch-kpi-dot">·</span>
                            <span className="ch-kpi-issued">จ่าย: {formatCurrency(summary?.issuedPendingAmount || 0)}</span>
                        </div>
                    </div>
                </div>

                {/* 2. เช็คขึ้นเงินแล้ว */}
                <div className="ch-kpi-card ch-kpi-cleared">
                    <div className="ch-kpi-icon">
                        <CheckCircle2 size={24} />
                    </div>
                    <div className="ch-kpi-content">
                        <span className="ch-kpi-label">เช็คผ่านแล้ว / ขึ้นเงินสำเร็จ</span>
                        <div className="ch-kpi-val">{formatCurrency(summary?.clearedAmount || 0)}</div>
                        <div className="ch-kpi-sub">
                            <span>ผ่านแล้ว <strong>{summary?.clearedCount || 0}</strong> ฉบับ</span>
                            <span className="ch-kpi-dot">·</span>
                            <span className="ch-kpi-received">รับ: {formatCurrency(summary?.receivedClearedAmount || 0)}</span>
                        </div>
                    </div>
                </div>

                {/* 3. เช็คคืน / เช็คเด้ง */}
                <div className="ch-kpi-card ch-kpi-bounced">
                    <div className="ch-kpi-icon">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="ch-kpi-content">
                        <span className="ch-kpi-label">เช็คคืน / เช็คเด้ง (ความเสี่ยง)</span>
                        <div className="ch-kpi-val">{formatCurrency(summary?.bouncedAmount || 0)}</div>
                        <div className="ch-kpi-sub">
                            <span className="ch-kpi-warn">มีปัญหา <strong>{summary?.bouncedCount || 0}</strong> ฉบับ (ต้องติดตาม)</span>
                        </div>
                    </div>
                </div>

                {/* 4. เช็คใกล้ครบกำหนด */}
                <div className="ch-kpi-card ch-kpi-due">
                    <div className="ch-kpi-icon">
                        <Calendar size={24} />
                    </div>
                    <div className="ch-kpi-content">
                        <span className="ch-kpi-label">เช็คใกล้ครบกำหนด (7 วันนี้)</span>
                        <div className="ch-kpi-val">{summary?.dueSoonCount || 0} <span className="ch-kpi-unit">ฉบับ</span></div>
                        <div className="ch-kpi-sub">
                            <span>มูลค่ารวม: <strong>{formatCurrency(summary?.dueSoonAmount || 0)}</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Workspace Card ── */}
            <div className="ch-main-card">
                {/* ── Tabs & Filter Bar ── */}
                <div className="ch-controls">
                    {/* Tab Selection */}
                    <div className="ch-tabs">
                        <button 
                            className={`ch-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('all');
                                setSearchParams({ tab: 'cheques_overview' });
                            }}
                        >
                            <CreditCard size={16} />
                            <span>เช็คทั้งหมด ({cheques.length})</span>
                        </button>
                        <button 
                            className={`ch-tab-btn ${activeTab === 'received' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('received');
                                setSearchParams({ tab: 'cheques_received' });
                            }}
                        >
                            <ArrowDownLeft size={16} className="text-emerald" />
                            <span>ทะเบียนเช็ครับ (ลูกหนี้)</span>
                        </button>
                        <button 
                            className={`ch-tab-btn ${activeTab === 'issued' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('issued');
                                setSearchParams({ tab: 'cheques_issued' });
                            }}
                        >
                            <ArrowUpRight size={16} className="text-blue" />
                            <span>ทะเบียนเช็คจ่าย (เจ้าหนี้)</span>
                        </button>
                    </div>

                    {/* Filter controls */}
                    <div className="ch-filters">
                        <div className="ch-search-wrap">
                            <Search size={16} className="ch-search-icon" />
                            <input
                                type="text"
                                className="ch-search-input"
                                placeholder="ค้นหาเลขที่เช็ค, ชื่อบริษัท/ลูกค้า, ธนาคาร, เอกสารอ้างอิง..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button className="ch-clear-search" onClick={() => setSearchTerm('')}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="ch-status-select-wrap">
                            <select
                                className="ch-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">ทุกสถานะ</option>
                                <option value="pending">รอขึ้นเงิน (Pending)</option>
                                <option value="deposited">นำฝากแล้ว (Deposited)</option>
                                <option value="cleared">ขึ้นเงินแล้ว (Cleared)</option>
                                <option value="bounced">เช็คคืน/เด้ง (Bounced)</option>
                                <option value="cancelled">ยกเลิก (Cancelled)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="ch-table-wrapper">
                    <table className="ch-table">
                        <thead>
                            <tr>
                                <th>ประเภท</th>
                                <th>เลขที่เช็ค</th>
                                <th>ธนาคาร & สาขา</th>
                                <th>ผู้สั่งจ่าย / ผู้รับเงิน</th>
                                <th style={{ textAlign: 'right' }}>จำนวนเงิน (บาท)</th>
                                <th>วันที่ครบกำหนด</th>
                                <th>เอกสารอ้างอิง</th>
                                <th>สถานะ</th>
                                <th style={{ textAlign: 'center' }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="ch-empty-cell">
                                        <div className="ch-loading-state">
                                            <RefreshCw size={24} className="ch-spin" />
                                            <span>กำลังโหลดข้อมูลทะเบียนเช็ค...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCheques.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="ch-empty-cell">
                                        <div className="ch-empty-state">
                                            <CreditCard size={40} strokeWidth={1.2} />
                                            <p className="ch-empty-title">ไม่พบรายการเช็ค</p>
                                            <p className="ch-empty-desc">
                                                {searchTerm || statusFilter !== 'all' 
                                                    ? 'ลองปรับเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง' 
                                                    : 'ยังไม่มีข้อมูลเช็คในระบบ กดปุ่ม "+ บันทึกเช็คใหม่" เพื่อเริ่มต้น'}
                                            </p>
                                            {(!searchTerm && statusFilter === 'all') && (
                                                <button className="ch-btn ch-btn-primary ch-mt-2" onClick={() => handleOpenCreateModal('received')}>
                                                    <Plus size={16} /> บันทึกเช็คแรก
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCheques.map((item) => {
                                    const isReceived = item.ChequeType === 'received';
                                    const bankColor = getBankColor(item.BankName);
                                    const isPending = item.Status === 'pending';

                                    return (
                                        <tr key={item.ChequeID} className={`ch-row ${item.Status === 'bounced' ? 'ch-row-bounced' : ''}`}>
                                            {/* ประเภท */}
                                            <td>
                                                <span className={`ch-type-badge ${isReceived ? 'received' : 'issued'}`}>
                                                    {isReceived ? (
                                                        <><ArrowDownLeft size={13} /> เช็ครับ</>
                                                    ) : (
                                                        <><ArrowUpRight size={13} /> เช็คจ่าย</>
                                                    )}
                                                </span>
                                            </td>

                                            {/* เลขที่เช็ค */}
                                            <td>
                                                <div className="ch-no-cell">
                                                    <span className="ch-no">{item.ChequeNo}</span>
                                                    {item.AccountNo && <span className="ch-acc">บ/ช: {item.AccountNo}</span>}
                                                </div>
                                            </td>

                                            {/* ธนาคาร & สาขา */}
                                            <td>
                                                <div className="ch-bank-cell">
                                                    <span className="ch-bank-dot" style={{ backgroundColor: bankColor }}></span>
                                                    <div>
                                                        <div className="ch-bank-name">{item.BankName}</div>
                                                        {item.BankBranch && <div className="ch-bank-branch">{item.BankBranch}</div>}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* ผู้สั่งจ่าย / รับเงิน */}
                                            <td>
                                                <div className="ch-person-cell">
                                                    <span className="ch-person-name">{item.PayeeOrPayer}</span>
                                                    {item.Notes && <span className="ch-notes-text" title={item.Notes}>{item.Notes}</span>}
                                                </div>
                                            </td>

                                            {/* จำนวนเงิน */}
                                            <td style={{ textAlign: 'right' }}>
                                                <span className={`ch-amount-val ${isReceived ? 'text-emerald' : 'text-blue'}`}>
                                                    {formatCurrency(item.Amount)}
                                                </span>
                                            </td>

                                            {/* วันที่ครบกำหนด */}
                                            <td>
                                                <div className="ch-date-cell">
                                                    <span className="ch-date-main">{formatDate(item.DueDate)}</span>
                                                    {item.IssueDate && (
                                                        <span className="ch-date-sub">ออก: {formatDate(item.IssueDate)}</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* เอกสารอ้างอิง */}
                                            <td>
                                                {item.RefDocNo ? (
                                                    <span className="ch-ref-tag"><FileText size={12} /> {item.RefDocNo}</span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>

                                            {/* สถานะ */}
                                            <td>
                                                {renderStatusBadge(item.Status)}
                                                {item.Status === 'cleared' && item.ClearedDate && (
                                                    <div className="ch-cleared-date">ผ่าน: {formatDate(item.ClearedDate)}</div>
                                                )}
                                            </td>

                                            {/* จัดการ */}
                                            <td>
                                                <div className="ch-actions-cell">
                                                    {/* Quick status button */}
                                                    {isPending && (
                                                        <button 
                                                            className="ch-quick-btn ch-quick-clear" 
                                                            title="บันทึกขึ้นเงินแล้ว (Cleared)"
                                                            onClick={() => handleQuickStatus(item, 'cleared')}
                                                        >
                                                            <Check size={14} />
                                                            <span>ขึ้นเงิน</span>
                                                        </button>
                                                    )}

                                                    {isPending && (
                                                        <button 
                                                            className="ch-quick-btn ch-quick-bounce" 
                                                            title="บันทึกเป็นเช็คเด้ง (Bounced)"
                                                            onClick={() => handleQuickStatus(item, 'bounced')}
                                                        >
                                                            <AlertTriangle size={14} />
                                                        </button>
                                                    )}

                                                    {/* Edit */}
                                                    <button 
                                                        className="ch-icon-btn" 
                                                        title="แก้ไขข้อมูลเช็ค"
                                                        onClick={() => handleOpenEditModal(item)}
                                                    >
                                                        <Edit3 size={15} />
                                                    </button>

                                                    {/* Delete */}
                                                    <button 
                                                        className="ch-icon-btn ch-delete-btn" 
                                                        title="ลบเช็ค"
                                                        onClick={() => handleDeleteCheque(item)}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Count */}
                <div className="ch-table-footer">
                    <span>แสดง {filteredCheques.length} รายการ จากทั้งหมด {cheques.length} รายการ</span>
                </div>
            </div>

            {/* ============================================================ */}
            {/* Modal: บันทึก / แก้ไขข้อมูลเช็ค                                 */}
            {/* ============================================================ */}
            {modalOpen && (
                <div className="ch-modal-backdrop" onClick={() => !saving && setModalOpen(false)}>
                    <div className="ch-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ch-modal-header">
                            <div className="ch-modal-title">
                                <CreditCard size={20} className="text-primary" />
                                <h3>{editingCheque ? 'แก้ไขข้อมูลเช็ค' : 'บันทึกเช็คใหม่'}</h3>
                            </div>
                            <button className="ch-modal-close" onClick={() => setModalOpen(false)} disabled={saving}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCheque}>
                            <div className="ch-modal-body">
                                {/* Type Selector */}
                                <div className="ch-form-group">
                                    <label className="ch-form-label">ประเภทรายการเช็ค <span className="text-danger">*</span></label>
                                    <div className="ch-type-selector">
                                        <label className={`ch-type-option ${formData.chequeType === 'received' ? 'selected-received' : ''}`}>
                                            <input
                                                type="radio"
                                                name="chequeType"
                                                value="received"
                                                checked={formData.chequeType === 'received'}
                                                onChange={(e) => setFormData({ ...formData, chequeType: e.target.value })}
                                            />
                                            <ArrowDownLeft size={16} />
                                            <span>เช็ครับ (ลูกหนี้/ลูกค้า จ่ายเงินให้เรา)</span>
                                        </label>
                                        <label className={`ch-type-option ${formData.chequeType === 'issued' ? 'selected-issued' : ''}`}>
                                            <input
                                                type="radio"
                                                name="chequeType"
                                                value="issued"
                                                checked={formData.chequeType === 'issued'}
                                                onChange={(e) => setFormData({ ...formData, chequeType: e.target.value })}
                                            />
                                            <ArrowUpRight size={16} />
                                            <span>เช็คจ่าย (บริษัทสั่งจ่ายให้เจ้าหนี้/คู่ค้า)</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="ch-form-row-2">
                                    {/* เลขที่เช็ค */}
                                    <div className="ch-form-group">
                                        <label className="ch-form-label">เลขที่เช็ค (Cheque No.) <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="ch-input"
                                            placeholder="เช่น 0482910"
                                            value={formData.chequeNo}
                                            onChange={(e) => setFormData({ ...formData, chequeNo: e.target.value })}
                                            required
                                        />
                                    </div>

                                    {/* จำนวนเงิน */}
                                    <div className="ch-form-group">
                                        <label className="ch-form-label">จำนวนเงิน (บาท) <span className="text-danger">*</span></label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="ch-input ch-input-currency"
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="ch-form-row-2">
                                    {/* ธนาคาร */}
                                    <div className="ch-form-group">
                                        <label className="ch-form-label">ธนาคาร <span className="text-danger">*</span></label>
                                        <select
                                            className="ch-input"
                                            value={formData.bankName}
                                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                            required
                                        >
                                            {THAI_BANKS.map((b) => (
                                                <option key={b.code} value={b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* สาขา */}
                                    <div className="ch-form-group">
                                        <label className="ch-form-label">สาขาธนาคาร</label>
                                        <input
                                            type="text"
                                            className="ch-input"
                                            placeholder="เช่น สาขาสาทร, สาขาพระราม 9"
                                            value={formData.bankBranch}
                                            onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="ch-form-row-2">
                                    {/* ผู้สั่งจ่าย / รับเงิน */}
                                    <div className="ch-form-group">
                                        <label className="ch-form-label">
                                            {formData.chequeType === 'received' ? 'ผู้สั่งจ่าย (สั่งจ่ายโดย / ลูกค้า)' : 'สั่งจ่ายถึง (ผู้รับเงิน / เจ้าหนี้)'}
                                            <span className="text-danger"> *</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="ch-input"
                                            placeholder="เช่น บริษัท สยามเทรดดิ้ง จำกัด"
                                            value={formData.payeeOrPayer}
                                            onChange={(e) => setFormData({ ...formData, payeeOrPayer: e.target.value })}
                                            required
                                        />
                                    </div>

                                    {/* เลขที่บัญชีบนเช็ค */}
                                    <div className="ch-form-group">
                                        <label className="ch-form-label">เลขที่บัญชีบนเช็ค</label>
                                        <input
                                            type="text"
                                            className="ch-input"
                                            placeholder="เช่น 026-2-84910-1"
                                            value={formData.accountNo}
                                            onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="ch-form-row-2">
                                    {/* วันที่ออกเช็ค */}
                                    <div className="ch-form-group">
                                        <label className="ch-form-label">วันที่ลงบันทึก / วันที่ออกเช็ค</label>
                                        <input
                                            type="date"
                                            className="ch-input"
                                            value={formData.issueDate}
                                            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                                        />
                                    </div>

                                    {/* วันที่ครบกำหนด (Due Date) */}
                                    <div className="ch-form-group">
                                        <label className="ch-form-label">วันที่บนหน้าเช็ค / วันที่ครบกำหนด <span className="text-danger">*</span></label>
                                        <input
                                            type="date"
                                            className="ch-input"
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="ch-form-row-2">
                                    {/* สถานะ */}
                                    <div className="ch-form-group">
                                        <label className="ch-form-label">สถานะเช็ค</label>
                                        <select
                                            className="ch-input"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="pending">รอขึ้นเงิน (Pending)</option>
                                            <option value="deposited">นำฝากเรียกเก็บแล้ว (Deposited)</option>
                                            <option value="cleared">ขึ้นเงินสำเร็จแล้ว (Cleared)</option>
                                            <option value="bounced">เช็คคืน / เช็คเด้ง (Bounced)</option>
                                            <option value="cancelled">ยกเลิก (Cancelled)</option>
                                        </select>
                                    </div>

                                    {/* เอกสารอ้างอิง */}
                                    <div className="ch-form-group">
                                        <label className="ch-form-label">เอกสารอ้างอิง</label>
                                        <input
                                            type="text"
                                            className="ch-input"
                                            placeholder="เช่น INV-2026-0042, PO-2026-001"
                                            value={formData.refDocNo}
                                            onChange={(e) => setFormData({ ...formData, refDocNo: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* หมายเหตุ */}
                                <div className="ch-form-group">
                                    <label className="ch-form-label">หมายเหตุ</label>
                                    <textarea
                                        className="ch-input ch-textarea"
                                        rows="2"
                                        placeholder="รายละเอียดเพิ่มเติม หรือเหตุผลกรณีเช็คคืน..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="ch-modal-footer">
                                <button type="button" className="ch-btn ch-btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>
                                    ยกเลิก
                                </button>
                                <button type="submit" className="ch-btn ch-btn-primary" disabled={saving}>
                                    {saving ? 'กำลังบันทึก...' : (editingCheque ? 'บันทึกการแก้ไข' : 'บันทึกเช็ค')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * =============================================================================
 * Accounts.jsx — หน้าบัญชี (Accounts)
 * =============================================================================
 *
 * แสดงข้อมูลบัญชี:
 *   - Tab accounts_dashboard : Accounts Dashboard (AR, AP, กำไร/ขาดทุน, มัดจำคงค้างรับ)
 *   - Tab accounts_ar        : Accounts Receivable — ติดตามเงินมัดจำใบเสนอราคา & ลูกหนี้การค้า
 *   - Tab accounts_ap        : Accounts Payable — เจ้าหนี้การค้า
 *   - Tab accounts_reports   : Reports — รายงานบัญชี
 *
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import API_BASE from '../config';
import { MOCK_AR, MOCK_AP } from '../data/mockData';
import {
    Search,
    DollarSign,
    FileText,
    RefreshCw,
    CheckCircle,
    Clock,
    AlertCircle,
    X,
    Edit3,
    Eye,
    Plus,
    Receipt,
    ChevronRight
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import BillingInvoiceForm from '../components/BillingInvoiceForm';
import ReceiptForm from '../components/ReceiptForm';
import QuotationForm from '../components/QuotationForm';
import { FilterToggleButton, AccountsARFilterDrawer } from '../components/SalesDocFilter';

import './PageCommon.css';

export default function Accounts() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages, canCreate, canUpdate } = useAuth();
    const { showAlert } = useAlert();
    const visibleSubPages = getVisibleSubPages('accounts');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'accounts_dashboard';

    // ── State: ค้นหาแยกตาม tab ──
    const [apSearch, setApSearch] = useState('');

    // ── State: กรอง docType (invoice / payment / credit_note / all) ──
    const [apFilter, setApFilter] = useState('all');

    // ── State: ติดตามเงินมัดจำจากใบเสนอราคา (Quotation Deposits) ──
    const [depositsList, setDepositsList] = useState([]);
    const [depositSummary, setDepositSummary] = useState(null);
    const [loadingDeposits, setLoadingDeposits] = useState(false);
    const [depositSearch, setDepositSearch] = useState('');
    
    // ── State: ตัวกรองเงินมัดจำใบเสนอราคา (AR Deposit Filter ตรงตามข้อมูลลูกหนี้การค้า) ──
    const [depositFilter, setDepositFilter] = useState({
        status: '',
        billingStatus: '',
        receiptStatus: '',
        createdBy: '',
        dateFrom: '',
        dateTo: ''
    });
    const [showDepositFilter, setShowDepositFilter] = useState(false);
    const [usersList, setUsersList] = useState([]);

    // ── Fetch ข้อมูล Users สำหรับ Dropdown ผู้สร้างเอกสาร ──
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE}/users`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                const data = await res.json();
                if (Array.isArray(data)) {
                    setUsersList(data);
                } else if (data.success && Array.isArray(data.users || data.data)) {
                    setUsersList(data.users || data.data);
                }
            } catch (err) {
                console.error('Error fetching users:', err);
            }
        };
        fetchUsers();
    }, []);

    // ── Handlers สำหรับตัวกรองเงินมัดจำ ──
    const handleDepositFilterChange = (field, value) => {
        setDepositFilter(prev => ({ ...prev, [field]: value }));
    };

    const handleResetDepositFilter = () => {
        setDepositFilter({
            status: '',
            billingStatus: '',
            receiptStatus: '',
            createdBy: '',
            dateFrom: '',
            dateTo: ''
        });
        setDepositSearch('');
    };

    const handleQuickDate = (type) => {
        const now = new Date();
        const format = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const todayStr = format(now);
        if (type === 'today') {
            setDepositFilter(prev => ({ ...prev, dateFrom: todayStr, dateTo: todayStr }));
        } else if (type === '7days') {
            const d7 = new Date();
            d7.setDate(d7.getDate() - 6);
            setDepositFilter(prev => ({ ...prev, dateFrom: format(d7), dateTo: todayStr }));
        } else if (type === 'thisMonth') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setDepositFilter(prev => ({ ...prev, dateFrom: format(startOfMonth), dateTo: format(endOfMonth) }));
        }
    };

    const activeDepositFilterCount = [
        Boolean(depositFilter.status),
        Boolean(depositFilter.billingStatus),
        Boolean(depositFilter.receiptStatus),
        Boolean(depositFilter.createdBy),
        Boolean(depositFilter.dateFrom || depositFilter.dateTo)
    ].filter(Boolean).length;

    // ── State: ฟอร์มสร้าง/ดูใบวางบิลจากใบเสนอราคา ──
    const [showBillingForm, setShowBillingForm] = useState(false);
    const [billingInitialData, setBillingInitialData] = useState(null);
    const [billingEditId, setBillingEditId] = useState(null);
    const [previewBillingId, setPreviewBillingId] = useState(null);

    // ── State: ฟอร์มสร้าง/ดูใบเสร็จรับเงินจากใบเสนอราคา ──
    const [showReceiptForm, setShowReceiptForm] = useState(false);
    const [receiptInitialData, setReceiptInitialData] = useState(null);
    const [receiptEditId, setReceiptEditId] = useState(null);
    const [previewReceiptId, setPreviewReceiptId] = useState(null);

    // ── State: พรีวิวใบเสนอราคา ──
    const [previewQuotationId, setPreviewQuotationId] = useState(null);

    // ── State: Modal อัปเดตสถานะ/บันทึกการชำระมัดจำ ──
    const [statusModal, setStatusModal] = useState({
        visible: false,
        item: null,
        status: '',
        paidAmount: 0
    });

    // ── ฟังก์ชันโหลดข้อมูลเงินมัดจำจาก API ──
    const fetchDeposits = useCallback(async () => {
        setLoadingDeposits(true);
        try {
            const params = new URLSearchParams();
            if (depositSearch.trim()) params.append('search', depositSearch.trim());
            if (depositFilter.status && depositFilter.status !== 'all' && depositFilter.status !== 'ทั้งหมด') {
                params.append('status', depositFilter.status);
            }
            if (depositFilter.billingStatus) params.append('billingStatus', depositFilter.billingStatus);
            if (depositFilter.receiptStatus) params.append('receiptStatus', depositFilter.receiptStatus);
            if (depositFilter.createdBy) params.append('createdBy', depositFilter.createdBy);
            if (depositFilter.dateFrom) params.append('dateFrom', depositFilter.dateFrom);
            if (depositFilter.dateTo) params.append('dateTo', depositFilter.dateTo);

            const res = await fetch(`${API_BASE}/accounts/deposits?${params.toString()}`);
            const json = await res.json();
            if (json.success) {
                setDepositsList(json.data || []);
                setDepositSummary(json.summary || null);
            } else {
                showAlert('แจ้งเตือน', json.message || 'ไม่สามารถโหลดข้อมูลเงินมัดจำได้', 'error');
            }
        } catch (err) {
            console.error('Error fetching deposits:', err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อโหลดข้อมูลมัดจำได้', 'error');
        } finally {
            setLoadingDeposits(false);
        }
    }, [depositSearch, depositFilter, showAlert]);

    useEffect(() => {
        if (activeTab === 'accounts_ar' || activeTab === 'accounts_dashboard') {
            fetchDeposits();
        }
    }, [activeTab, fetchDeposits]);

    // ── กรองรายการมัดจำ (Search & Filter) ฝั่ง Client ──
    const filteredDeposits = depositsList.filter((d) => {
        if (depositSearch.trim()) {
            const term = depositSearch.toLowerCase();
            const matches = (
                (d.QuotationNo || '').toLowerCase().includes(term) ||
                (d.CustomerName || '').toLowerCase().includes(term) ||
                (d.Phone || '').toLowerCase().includes(term) ||
                (d.BillingInvoiceNo || '').toLowerCase().includes(term) ||
                (d.CreatedByName || '').toLowerCase().includes(term)
            );
            if (!matches) return false;
        }
        if (depositFilter.status && depositFilter.status !== 'all' && depositFilter.status !== 'ทั้งหมด') {
            if (d.DepositStatus !== depositFilter.status) return false;
        }
        if (depositFilter.billingStatus) {
            if (depositFilter.billingStatus === 'pending' && Boolean(d.BillingInvoiceID)) return false;
            if (depositFilter.billingStatus === 'completed' && !d.BillingInvoiceID) return false;
        }
        if (depositFilter.receiptStatus) {
            if (depositFilter.receiptStatus === 'pending' && (d.DepositReceiptID || d.FinalReceiptID)) return false;
            if (depositFilter.receiptStatus === 'deposit_paid' && !d.DepositReceiptID) return false;
            if (depositFilter.receiptStatus === 'fully_paid' && !d.FinalReceiptID) return false;
        }
        if (depositFilter.createdBy) {
            if (String(d.CreatedBy) !== String(depositFilter.createdBy)) return false;
        }
        if (depositFilter.dateFrom) {
            const docDate = (d.BillDate || '').split('T')[0];
            if (docDate && docDate < depositFilter.dateFrom) return false;
        }
        if (depositFilter.dateTo) {
            const docDate = (d.BillDate || '').split('T')[0];
            if (docDate && docDate > depositFilter.dateTo) return false;
        }
        return true;
    });

    // ── ฟังก์ชันเปิดฟอร์มสร้างใบวางบิล/ใบแจ้งหนี้จากใบเสนอราคา ──
    const handleCreateBillingInvoice = async (quotationId) => {
        try {
            const res = await fetch(`${API_BASE}/accounts/quotation-for-billing/${quotationId}`);
            const json = await res.json();
            if (json.success && json.data) {
                setBillingInitialData(json.data);
                setBillingEditId(null);
                setShowBillingForm(true);
            } else {
                showAlert('ข้อผิดพลาด', json.message || 'ไม่พบข้อมูลใบเสนอราคา', 'error');
            }
        } catch (err) {
            console.error('Error preparing billing invoice:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการโหลดข้อมูลใบเสนอราคาเพื่อสร้างใบวางบิล', 'error');
        }
    };

    // ── ฟังก์ชันเปิดดูเอกสารพรีวิวใบวางบิล (A4 Document Preview) ──
    const handleViewBillingInvoice = (billingInvoiceId) => {
        setPreviewBillingId(billingInvoiceId);
    };

    // ── ฟังก์ชันเปิดฟอร์มสร้างใบเสร็จรับเงินจากใบเสนอราคา ──
    const handleCreateReceipt = async (quotationId, type = 'deposit') => {
        try {
            const res = await fetch(`${API_BASE}/accounts/quotation-for-receipt/${quotationId}?type=${type}`);
            const json = await res.json();
            if (json.success && json.data) {
                setReceiptInitialData(json.data);
                setReceiptEditId(null);
                setShowReceiptForm(true);
            } else {
                showAlert('ข้อผิดพลาด', json.message || 'ไม่พบข้อมูลใบเสนอราคาเพื่อสร้างใบเสร็จรับเงิน', 'error');
            }
        } catch (err) {
            console.error('Error preparing receipt:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการโหลดข้อมูลเพื่อสร้างใบเสร็จรับเงิน', 'error');
        }
    };

    // ── ฟังก์ชันเปิด Modal ปรับปรุงสถานะ / บันทึกการชำระ ──
    const handleOpenStatusModal = (item) => {
        setStatusModal({
            visible: true,
            item,
            status: item.DepositStatus || 'รอมัดจำ',
            paidAmount: item.PaidDepositAmount || 0
        });
    };

    // ── ฟังก์ชันบันทึกการอัปเดตสถานะมัดจำ ──
    const handleSaveStatusModal = async () => {
        if (!statusModal.item) return;
        try {
            const res = await fetch(`${API_BASE}/accounts/deposits/${statusModal.item.QuotationID}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: statusModal.status,
                    paidAmount: statusModal.paidAmount
                })
            });
            const json = await res.json();
            if (json.success) {
                showAlert('สำเร็จ', 'บันทึกสถานะการชำระมัดจำเรียบร้อยแล้ว', 'success');
                setStatusModal({ visible: false, item: null, status: '', paidAmount: 0 });
                fetchDeposits();
            } else {
                showAlert('ข้อผิดพลาด', json.message || 'ไม่สามารถบันทึกได้', 'error');
            }
        } catch (err) {
            console.error('Error updating status:', err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        }
    };

    // ── Badge helper สำหรับสถานะมัดจำ ──
    const getDepositStatusBadge = (status) => {
        switch (status) {
            case 'ชำระครบถ้วน':
                return (
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={12} /> ชำระครบถ้วน
                    </span>
                );
            case 'ชำระมัดจำแล้ว':
                return (
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={12} /> ชำระมัดจำแล้ว
                    </span>
                );
            case 'รอมัดจำ':
            default:
                return (
                    <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} /> รอมัดจำ
                    </span>
                );
        }
    };

    // ── คำนวณ Dashboard stats ──
    const arInvoiceTotal = MOCK_AR
        .filter((d) => d.docType === 'invoice')
        .reduce((sum, d) => sum + d.amount, 0);
    const apInvoiceTotal = MOCK_AP
        .filter((d) => d.docType === 'invoice')
        .reduce((sum, d) => sum + d.amount, 0);
    const profit = arInvoiceTotal - apInvoiceTotal;


    // ── กรอง AP ──
    const filteredAP = MOCK_AP.filter((d) => {
        const matchSearch =
            d.number.toLowerCase().includes(apSearch.toLowerCase()) ||
            d.supplier.toLowerCase().includes(apSearch.toLowerCase());
        const matchFilter = apFilter === 'all' || d.docType === apFilter;
        return matchSearch && matchFilter;
    });

    // ── Badge class helpers ──
    const getDocStatusClass = (status) => {
        switch (status) {
            case 'ชำระแล้ว': case 'สำเร็จ': return 'badge-success';
            case 'ค้างชำระ': return 'badge-danger';
            case 'อนุมัติ': return 'badge-info';
            default: return 'badge-neutral';
        }
    };

    const getDocTypeLabel = (docType) => {
        switch (docType) {
            case 'invoice': return 'Invoice';
            case 'payment': return 'Payment';
            case 'credit_note': return 'Credit Note';
            default: return docType;
        }
    };

    // ── รายงานบัญชี (mock) ──
    const accountReports = [
        { name: 'งบกำไรขาดทุน', type: 'การเงิน', date: '2026-02-28', status: 'พร้อม' },
        { name: 'รายงานลูกหนี้คงค้าง', type: 'AR', date: '2026-03-01', status: 'พร้อม' },
        { name: 'รายงานเจ้าหนี้คงค้าง', type: 'AP', date: '2026-03-01', status: 'พร้อม' },
        { name: 'งบดุล', type: 'การเงิน', date: '2026-02-28', status: 'กำลังประมวลผล' },
        { name: 'ภาษีมูลค่าเพิ่ม', type: 'ภาษี', date: '2026-02-28', status: 'พร้อม' },
    ];

    // ── กำหนดชื่อหน้าตาม Tab ที่เลือก ──
    const getPageTitle = () => {
        switch (activeTab) {
            case 'accounts_dashboard': return 'ภาพรวมบัญชี';
            case 'accounts_ar': return 'ลูกหนี้การค้า (AR)';
            case 'accounts_ap': return 'เจ้าหนี้การค้า (AP)';
            case 'accounts_reports': return 'รายงานบัญชี';
            default: return 'บัญชี';
        }
    };

    const getPageDesc = () => {
        switch (activeTab) {
            case 'accounts_dashboard': return 'ภาพรวมลูกหนี้ เจ้าหนี้ กำไรขาดทุน และเงินมัดจำคงค้าง';
            case 'accounts_ar': return 'ติดตามเงินมัดจำจากใบเสนอราคา เรียกเก็บเงิน และจัดการลูกหนี้การค้า';
            case 'accounts_ap': return 'จัดการข้อมูลเจ้าหนี้การค้าและการจ่ายชำระเงิน';
            case 'accounts_reports': return 'รายงานงบการเงินและเอกสารทางบัญชี';
            default: return 'จัดการลูกหนี้ เจ้าหนี้ และรายงานการเงิน';
        }
    };

    // ── หากอยู่ในโหมดสร้างใบวางบิลจากใบเสนอราคา ให้เรนเดอร์ BillingInvoiceForm ──
    if (showBillingForm) {
        return (
            <div className="page-container accounts-page page-enter">
                <BillingInvoiceForm
                    initialFromQuotation={billingInitialData}
                    editId={billingEditId}
                    onBack={() => {
                        setShowBillingForm(false);
                        setBillingInitialData(null);
                        setBillingEditId(null);
                    }}
                    onSave={() => {
                        setShowBillingForm(false);
                        setBillingInitialData(null);
                        setBillingEditId(null);
                        showAlert('สำเร็จ', 'บันทึกใบวางบิล/ใบแจ้งหนี้เรียบร้อยแล้ว', 'success');
                        fetchDeposits();
                    }}
                />
            </div>
        );
    }

    // ── หากอยู่ในโหมดสร้าง/แก้ไขใบเสร็จรับเงินจากใบเสนอราคา ให้เรนเดอร์ ReceiptForm ──
    if (showReceiptForm) {
        return (
            <div className="page-container accounts-page page-enter">
                <ReceiptForm
                    initialFromQuotation={receiptInitialData}
                    editId={receiptEditId}
                    onBack={() => {
                        setShowReceiptForm(false);
                        setReceiptInitialData(null);
                        setReceiptEditId(null);
                    }}
                    onSave={() => {
                        setShowReceiptForm(false);
                        setReceiptInitialData(null);
                        setReceiptEditId(null);
                        showAlert('สำเร็จ', 'บันทึกใบเสร็จรับเงินเรียบร้อยแล้ว', 'success');
                        fetchDeposits();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="page-container accounts-page page-enter">
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <h1>{getPageTitle()}</h1>
                <p>{getPageDesc()}</p>
            </div>

            {/* ── Tab: Accounts Dashboard ── */}
            {(activeTab === 'accounts_dashboard' && hasSubPermission('accounts_dashboard')) && (
                <div className="subpage-content" key="accounts_dashboard">
                    <div className="summary-row">
                        {hasSectionPermission('accounts_dashboard_ar_total') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#2d9e5a' }}>↓</div>
                                <div>
                                    <span className="summary-label">ลูกหนี้การค้ารวม (AR)</span>
                                    <span className="summary-value" style={{ color: '#2d9e5a' }}>
                                        ฿{arInvoiceTotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('accounts_dashboard_ap_total') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#c04040' }}>↑</div>
                                <div>
                                    <span className="summary-label">เจ้าหนี้การค้ารวม (AP)</span>
                                    <span className="summary-value" style={{ color: '#c04040' }}>
                                        ฿{apInvoiceTotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('accounts_dashboard_profit') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: profit >= 0 ? '#2d9e5a' : '#c04040' }}>
                                    {profit >= 0 ? '▲' : '▼'}
                                </div>
                                <div>
                                    <span className="summary-label">กำไร/ขาดทุน</span>
                                    <span className="summary-value" style={{ color: profit >= 0 ? '#2d9e5a' : '#c04040' }}>
                                        ฿{Math.abs(profit).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                        {depositSummary && (
                            <div className="summary-card card" style={{ borderLeft: '4px solid #f59e0b' }}>
                                <div className="summary-icon" style={{ color: '#f59e0b' }}>
                                    <DollarSign size={22} />
                                </div>
                                <div>
                                    <span className="summary-label">มัดจำคงค้างรับ (ใบเสนอราคา)</span>
                                    <span className="summary-value" style={{ color: '#d97706' }}>
                                        ฿{Math.max(0, depositSummary.totalDepositRequired - depositSummary.totalPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab: Accounts Receivable (AR) ── */}
            {(activeTab === 'accounts_ar' && hasSubPermission('accounts_ar')) && (
                <div className="subpage-content" key="accounts_ar">
                    {/* Toolbar สำหรับตารางมัดจำ */}
                    <div className="toolbar">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="ค้นหาเลขที่ QT หรือชื่อลูกค้า..."
                                        value={depositSearch}
                                        onChange={(e) => setDepositSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* ปุ่ม Icon Filter Toggle แบบฝ่ายขาย */}
                            <FilterToggleButton
                                isOpen={showDepositFilter}
                                onClick={() => setShowDepositFilter(prev => !prev)}
                                activeCount={activeDepositFilterCount}
                            />
                        </div>
                    </div>

                            {/* ── Quotation Deposit Advanced Filter Panel (ตรงตามข้อมูลลูกหนี้การค้า) ── */}
                            <AccountsARFilterDrawer
                                isOpen={showDepositFilter}
                                onClose={() => setShowDepositFilter(false)}
                                filter={depositFilter}
                                onFilterChange={handleDepositFilterChange}
                                onReset={handleResetDepositFilter}
                                onQuickDate={handleQuickDate}
                                usersList={usersList}
                            />

                            {/* ตารางรายการมัดจำ */}
                            <div className="table-card card">
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '50px', textAlign: 'center' }}>ลำดับ</th>
                                                <th style={{ width: '130px' }}>เลขที่ใบเสนอราคา</th>
                                                <th style={{ width: '100px' }}>วันที่</th>
                                                <th>ลูกค้า</th>
                                                <th style={{ width: '130px' }}>ผู้สร้าง</th>
                                                <th style={{ textAlign: 'right', width: '130px' }}>ยอดรวมทั้งสิ้น</th>
                                                <th style={{ textAlign: 'right', width: '130px' }}>ยอดมัดจำ</th>
                                                <th style={{ textAlign: 'right', width: '120px' }}>ชำระมัดจำแล้ว</th>
                                                <th style={{ textAlign: 'right', width: '130px' }}>คงเหลือเรียกเก็บ</th>
                                                <th style={{ textAlign: 'center', width: '130px' }}>สถานะมัดจำ</th>
                                                <th style={{ textAlign: 'center', width: '380px', minWidth: '380px' }}>การจัดการเอกสาร (Workflow)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadingDeposits ? (
                                                <tr>
                                                    <td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                                        <RefreshCw size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
                                                        กำลังโหลดข้อมูลเงินมัดจำ...
                                                    </td>
                                                </tr>
                                            ) : filteredDeposits.length === 0 ? (
                                                <tr>
                                                    <td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                                        ไม่พบรายการใบเสนอราคาที่มีการตั้งมัดจำ
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredDeposits.map((row, idx) => {
                                                    const grandTotal = Number(row.GrandTotal || 0);
                                                    const depositAmount = Number(row.DepositAmount || 0);
                                                    const paid = Number(row.PaidDepositAmount || 0);
                                                    const remaining = Number(row.RemainingAmount || 0);

                                                    return (
                                                        <tr key={row.QuotationID}>
                                                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                            <td className="text-bold" style={{ color: 'var(--primary)' }}>
                                                                {row.QuotationNo}
                                                            </td>
                                                            <td>{row.BillDate ? row.BillDate.split('T')[0] : '—'}</td>
                                                            <td>
                                                                <div style={{ fontWeight: 600 }}>{row.CustomerName || '—'}</div>
                                                            </td>
                                                            <td>
                                                                <div style={{ fontSize: '13px', color: '#334155' }}>
                                                                    {row.CreatedByName || '—'}
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                                ฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                            <td style={{ textAlign: 'right', color: '#d97706', fontWeight: 600 }}>
                                                                ฿{depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                            <td style={{ textAlign: 'right', color: paid > 0 ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                                                                ฿{paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                            <td style={{ textAlign: 'right', color: remaining > 0 ? '#dc2626' : '#10b981', fontWeight: 700 }}>
                                                                ฿{remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {getDepositStatusBadge(row.DepositStatus)}
                                                            </td>
                                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                <div style={{ display: 'inline-flex', gap: '4px', justifyContent: 'center', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                                                                    {/* 1. ใบเสนอราคา (Quotation: QT) */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreviewQuotationId(row.QuotationID)}
                                                                        title={`พรีวิวใบเสนอราคา: ${row.QuotationNo}`}
                                                                        style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '3px',
                                                                            padding: '4px 8px',
                                                                            borderRadius: '6px',
                                                                            fontSize: '11px',
                                                                            fontWeight: 600,
                                                                            border: '1px solid #bfdbfe',
                                                                            background: '#eff6ff',
                                                                            color: '#1d4ed8',
                                                                            cursor: 'pointer',
                                                                            whiteSpace: 'nowrap',
                                                                            flexShrink: 0
                                                                        }}
                                                                    >
                                                                        <Eye size={12} /> QT
                                                                    </button>

                                                                    {/* Connector หรือ สเต็ป 2: RE มัดจำ */}
                                                                    {depositAmount > 0 ? (
                                                                        <>
                                                                            <ChevronRight size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                                            {row.DepositReceiptID ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setPreviewReceiptId(row.DepositReceiptID)}
                                                                                    title={`พรีวิวใบเสร็จรับเงินมัดจำ: ${row.DepositReceiptNo}`}
                                                                                    style={{
                                                                                        display: 'inline-flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '3px',
                                                                                        padding: '4px 8px',
                                                                                        borderRadius: '6px',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: 600,
                                                                                        border: '1px solid #fde68a',
                                                                                        background: '#fffbeb',
                                                                                        color: '#b45309',
                                                                                        cursor: 'pointer',
                                                                                        whiteSpace: 'nowrap',
                                                                                        flexShrink: 0
                                                                                    }}
                                                                                >
                                                                                    <Eye size={12} /> RE มัดจำ
                                                                                </button>
                                                                            ) : (
                                                                                (canCreate('sales_receipt') || canCreate('accounts_ar')) && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleCreateReceipt(row.QuotationID, 'deposit')}
                                                                                        title="ออกใบเสร็จรับเงินมัดจำให้ลูกค้า (RE มัดจำ)"
                                                                                        style={{
                                                                                            display: 'inline-flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '3px',
                                                                                            padding: '4px 8px',
                                                                                            borderRadius: '6px',
                                                                                            fontSize: '11px',
                                                                                            fontWeight: 600,
                                                                                            border: '1px dashed #f59e0b',
                                                                                            background: '#ffffff',
                                                                                            color: '#b45309',
                                                                                            cursor: 'pointer',
                                                                                            whiteSpace: 'nowrap',
                                                                                            flexShrink: 0
                                                                                        }}
                                                                                    >
                                                                                        <Plus size={12} /> RE มัดจำ
                                                                                    </button>
                                                                                )
                                                                            )}
                                                                            <ChevronRight size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                                        </>
                                                                    ) : (
                                                                        <ChevronRight size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                                    )}

                                                                    {/* 3. ใบวางบิล (Billing Invoice: BI) */}
                                                                    {row.BillingInvoiceID ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPreviewBillingId(row.BillingInvoiceID)}
                                                                            title={`พรีวิวใบวางบิล: ${row.BillingInvoiceNo}`}
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '3px',
                                                                                padding: '4px 8px',
                                                                                borderRadius: '6px',
                                                                                fontSize: '11px',
                                                                                fontWeight: 600,
                                                                                border: '1px solid #ddd6fe',
                                                                                background: '#f5f3ff',
                                                                                color: '#6d28d9',
                                                                                cursor: 'pointer',
                                                                                whiteSpace: 'nowrap',
                                                                                flexShrink: 0
                                                                            }}
                                                                        >
                                                                            <Eye size={12} /> BI
                                                                        </button>
                                                                    ) : (
                                                                        (canCreate('sales_billing_invoice') || canCreate('accounts_ar')) && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleCreateBillingInvoice(row.QuotationID)}
                                                                                title="สร้างใบวางบิลเรียกเก็บเงินส่วนที่เหลือ"
                                                                                style={{
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '3px',
                                                                                    padding: '4px 8px',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '11px',
                                                                                    fontWeight: 600,
                                                                                    border: '1px dashed #c4b5fd',
                                                                                    background: '#ffffff',
                                                                                    color: '#6d28d9',
                                                                                    cursor: 'pointer',
                                                                                    whiteSpace: 'nowrap',
                                                                                    flexShrink: 0
                                                                                }}
                                                                            >
                                                                                <Plus size={12} /> BI
                                                                            </button>
                                                                        )
                                                                    )}

                                                                    <ChevronRight size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />

                                                                    {/* 4. ใบเสร็จรับเงินส่วนที่เหลือ (Final Receipt: RE ปิดยอด) */}
                                                                    {row.FinalReceiptID ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPreviewReceiptId(row.FinalReceiptID)}
                                                                            title={`พรีวิวใบเสร็จรับเงินปิดยอด: ${row.FinalReceiptNo}`}
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '3px',
                                                                                padding: '4px 8px',
                                                                                borderRadius: '6px',
                                                                                fontSize: '11px',
                                                                                fontWeight: 600,
                                                                                border: '1px solid #a7f3d0',
                                                                                background: '#ecfdf5',
                                                                                color: '#047857',
                                                                                cursor: 'pointer',
                                                                                whiteSpace: 'nowrap',
                                                                                flexShrink: 0
                                                                            }}
                                                                        >
                                                                            <Eye size={12} /> {depositAmount > 0 ? 'RE ปิดยอด' : 'RE'}
                                                                        </button>
                                                                    ) : (
                                                                        (canCreate('sales_receipt') || canCreate('accounts_ar')) && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleCreateReceipt(row.QuotationID, 'final')}
                                                                                title={depositAmount > 0 ? "ออกใบเสร็จรับเงินส่วนที่เหลือ (ปิดยอด)" : "ออกใบเสร็จรับเงิน"}
                                                                                style={{
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '3px',
                                                                                    padding: '4px 8px',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '11px',
                                                                                    fontWeight: 600,
                                                                                    border: '1px dashed #6ee7b7',
                                                                                    background: '#ffffff',
                                                                                    color: '#047857',
                                                                                    cursor: 'pointer',
                                                                                    whiteSpace: 'nowrap',
                                                                                    flexShrink: 0
                                                                                }}
                                                                            >
                                                                                <Plus size={12} /> {depositAmount > 0 ? 'RE ปิดยอด' : 'RE'}
                                                                            </button>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                </div>
            )}

            {/* ── Tab: Accounts Payable (AP) ── */}
            {(activeTab === 'accounts_ap' && hasSubPermission('accounts_ap')) && (
                <div className="subpage-content" key="accounts_ap">
                    {hasSectionPermission('accounts_ap_invoice') && (
                        <div className="toolbar">
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="พิมพ์เลขที่เอกสาร หรือชื่อซัพพลายเออร์..."
                                        value={apSearch}
                                        onChange={(e) => setApSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <CustomSelect
                                className="filter-select"
                                value={apFilter}
                                onChange={(e) => setApFilter(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '14px' }}
                            >
                                <option value="all">ทั้งหมด</option>
                                <option value="invoice">Invoice</option>
                                <option value="payment">Payment</option>
                                <option value="credit_note">Credit Note</option>
                            </CustomSelect>
                            {canCreate('accounts_ap') && (
                                <button className="btn-primary">+ สร้าง Bill</button>
                            )}
                        </div>
                    )}

                    {hasSectionPermission('accounts_ap_invoice') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ลำดับ</th>
                                        <th>เลขที่เอกสาร</th>
                                        <th>ซัพพลายเออร์</th>
                                        <th>ประเภท</th>
                                        <th>จำนวนเงิน (บาท)</th>
                                        <th>วันที่</th>
                                        <th>ครบกำหนด</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAP.map((d) => (
                                        <tr key={d.id}>
                                            <td>{d.id}</td>
                                            <td className="text-bold">{d.number}</td>
                                            <td>{d.supplier}</td>
                                            <td>
                                                <span className="badge badge-neutral">{getDocTypeLabel(d.docType)}</span>
                                            </td>
                                            <td style={{ color: d.amount < 0 ? '#c04040' : 'inherit' }}>
                                                {d.amount < 0 ? '-' : ''}฿{Math.abs(d.amount).toLocaleString()}
                                            </td>
                                            <td>{d.date}</td>
                                            <td>{d.dueDate || '—'}</td>
                                            <td>
                                                <span className={`badge ${getDocStatusClass(d.status)}`}>
                                                    {d.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Reports ── */}
            {(activeTab === 'accounts_reports' && hasSubPermission('accounts_reports')) && (
                <div className="subpage-content" key="accounts_reports">
                    {hasSectionPermission('accounts_reports_list') && (
                        <div className="card-grid">
                            {accountReports.map((report, i) => (
                                <div className="report-card" key={i}>
                                    <div className="report-type">{report.type}</div>
                                    <h3>{report.name}</h3>
                                    <div className="report-meta">
                                        <span className="report-date">วันที่: {report.date}</span>
                                    </div>
                                    <div className="report-footer">
                                        <span className={`badge ${report.status === 'พร้อม' ? 'badge-success' : 'badge-warning'}`}>
                                            {report.status}
                                        </span>
                                        <button className="btn-sm">ดาวน์โหลด</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ Modal: บันทึกการชำระมัดจำ / ปรับปรุงสถานะ ═══ */}
            {statusModal.visible && statusModal.item && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                    }}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: '12px',
                            width: '100%',
                            maxWidth: '480px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            overflow: 'hidden'
                        }}
                    >
                        <div
                            style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <DollarSign size={20} style={{ color: 'var(--primary, #4f46e5)' }} />
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                                    บันทึกการชำระมัดจำ / ปรับปรุงสถานะ
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStatusModal({ visible: false, item: null, status: '', paidAmount: 0 })}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ background: '#f1f5f9', padding: '12px 16px', borderRadius: '8px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: '#64748b' }}>เลขที่ใบเสนอราคา:</span>
                                    <strong style={{ color: '#1e293b' }}>{statusModal.item.QuotationNo}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: '#64748b' }}>ลูกค้า:</span>
                                    <strong style={{ color: '#1e293b' }}>{statusModal.item.CustomerName}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: '#64748b' }}>ยอดรวมทั้งสิ้น:</span>
                                    <strong>฿{Number(statusModal.item.GrandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>ยอดมัดจำตามสัญญา:</span>
                                    <strong style={{ color: '#d97706' }}>฿{Number(statusModal.item.DepositAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                    สถานะมัดจำ
                                </label>
                                <CustomSelect
                                    value={statusModal.status}
                                    onChange={(e) => setStatusModal((prev) => ({ ...prev, status: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                >
                                    <option value="รอมัดจำ">รอมัดจำ</option>
                                    <option value="ชำระมัดจำแล้ว">ชำระมัดจำแล้ว</option>
                                    <option value="ชำระครบถ้วน">ชำระครบถ้วน</option>
                                </CustomSelect>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                        ยอดเงินมัดจำที่ชำระแล้ว (บาท)
                                    </label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setStatusModal((prev) => ({
                                                ...prev,
                                                paidAmount: Number(prev.item.DepositAmount || 0),
                                                status: 'ชำระมัดจำแล้ว'
                                            }))}
                                            style={{
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                background: '#eff6ff',
                                                border: '1px solid #bfdbfe',
                                                color: '#1d4ed8',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ชำระมัดจำครบ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStatusModal((prev) => ({
                                                ...prev,
                                                paidAmount: Number(prev.item.GrandTotal || 0),
                                                status: 'ชำระครบถ้วน'
                                            }))}
                                            style={{
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                background: '#ecfdf5',
                                                border: '1px solid #a7f3d0',
                                                color: '#047857',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ชำระครบ 100%
                                        </button>
                                    </div>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={statusModal.paidAmount}
                                    onChange={(e) => setStatusModal((prev) => ({ ...prev, paidAmount: parseFloat(e.target.value) || 0 }))}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: '#1e293b'
                                    }}
                                />
                            </div>
                        </div>

                        <div
                            style={{
                                padding: '12px 20px',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '10px',
                                background: '#f8fafc'
                            }}
                        >
                            <button
                                type="button"
                                className="btn-sm"
                                style={{ padding: '8px 16px', background: '#fff' }}
                                onClick={() => setStatusModal({ visible: false, item: null, status: '', paidAmount: 0 })}
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                style={{ height: '36px', padding: '0 18px' }}
                                onClick={handleSaveStatusModal}
                            >
                                บันทึกข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal พรีวิวเอกสารใบเสนอราคา (Quotation A4 Preview) ── */}
            {previewQuotationId && (
                <div
                    className="pdf-preview-overlay"
                    onClick={() => setPreviewQuotationId(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.65)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: '12px',
                            width: '95%',
                            maxWidth: '960px',
                            height: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
                        }}
                    >
                        {/* Header ของ Preview Modal */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '14px 20px',
                                borderBottom: '1px solid #e2e8f0',
                                background: '#f8fafc'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                    style={{
                                        background: '#eff6ff',
                                        color: '#1d4ed8',
                                        padding: '6px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                                        พรีวิวเอกสารใบเสนอราคา (Quotation)
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                        ตัวอย่างเอกสารขนาด A4 เสมือนจริง พร้อมสั่งพิมพ์ส่งลูกค้า
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => setPreviewQuotationId(null)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: '#ef4444',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    ✕ ปิด
                                </button>
                            </div>
                        </div>

                        {/* พื้นที่แสดงเอกสาร A4 พรีวิว */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '24px 0', background: '#525659' }}>
                            <QuotationForm
                                editId={previewQuotationId}
                                viewOnly={true}
                                onBack={() => setPreviewQuotationId(null)}
                                onSave={() => setPreviewQuotationId(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal พรีวิวเอกสารใบวางบิล (A4 Document Preview) ── */}
            {previewBillingId && (
                <div
                    className="pdf-preview-overlay"
                    onClick={() => setPreviewBillingId(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.65)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: '12px',
                            width: '95%',
                            maxWidth: '960px',
                            height: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
                        }}
                    >
                        {/* Header ของ Preview Modal */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '14px 20px',
                                borderBottom: '1px solid #e2e8f0',
                                background: '#f8fafc'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                    style={{
                                        background: '#f5f3ff',
                                        color: '#6d28d9',
                                        padding: '6px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                                        พรีวิวเอกสารใบวางบิล / ใบแจ้งหนี้
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                        ตัวอย่างเอกสารขนาด A4 เสมือนจริง พร้อมสั่งพิมพ์ส่งลูกค้า
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {(canUpdate('sales_billing_invoice') || canUpdate('accounts_ar')) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const idToEdit = previewBillingId;
                                            setPreviewBillingId(null);
                                            setBillingInitialData(null);
                                            setBillingEditId(idToEdit);
                                            setShowBillingForm(true);
                                        }}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            background: '#fff',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            color: '#334155',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontWeight: 500
                                        }}
                                        title="สลับไปยังแบบฟอร์มเพื่อแก้ไขข้อมูล"
                                    >
                                        <Edit3 size={14} /> แก้ไขข้อมูล
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setPreviewBillingId(null)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: '#ef4444',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    ✕ ปิด
                                </button>
                            </div>
                        </div>

                        {/* พื้นที่แสดงเอกสาร A4 พรีวิว */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '24px 0', background: '#525659' }}>
                            <BillingInvoiceForm
                                editId={previewBillingId}
                                viewOnly={true}
                                onBack={() => setPreviewBillingId(null)}
                                onSave={() => setPreviewBillingId(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal พรีวิวเอกสารใบเสร็จรับเงิน (Receipt A4 Preview) ── */}
            {previewReceiptId && (
                <div
                    className="pdf-preview-overlay"
                    onClick={() => setPreviewReceiptId(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.65)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: '12px',
                            width: '95%',
                            maxWidth: '960px',
                            height: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
                        }}
                    >
                        {/* Header ของ Preview Modal */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '14px 20px',
                                borderBottom: '1px solid #e2e8f0',
                                background: '#f8fafc'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                    style={{
                                        background: '#ecfdf5',
                                        color: '#047857',
                                        padding: '6px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Receipt size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                                        พรีวิวเอกสารใบเสร็จรับเงิน (Receipt)
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                        ตัวอย่างเอกสารขนาด A4 เสมือนจริง พร้อมสั่งพิมพ์ส่งลูกค้า
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {(canUpdate('sales_receipt') || canUpdate('accounts_ar')) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const idToEdit = previewReceiptId;
                                            setPreviewReceiptId(null);
                                            setReceiptInitialData(null);
                                            setReceiptEditId(idToEdit);
                                            setShowReceiptForm(true);
                                        }}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            background: '#fff',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            color: '#334155',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontWeight: 500
                                        }}
                                        title="สลับไปยังแบบฟอร์มเพื่อแก้ไขข้อมูล"
                                    >
                                        <Edit3 size={14} /> แก้ไขข้อมูล
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setPreviewReceiptId(null)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: '#ef4444',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    ✕ ปิด
                                </button>
                            </div>
                        </div>

                        {/* พื้นที่แสดงเอกสาร A4 พรีวิว */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '24px 0', background: '#525659' }}>
                            <ReceiptForm
                                editId={previewReceiptId}
                                viewOnly={true}
                                onBack={() => setPreviewReceiptId(null)}
                                onSave={() => setPreviewReceiptId(null)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

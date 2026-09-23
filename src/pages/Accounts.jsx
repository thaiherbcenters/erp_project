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

import { useState, useEffect, useCallback, useMemo } from 'react';
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
    ChevronRight,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    CreditCard,
    Calendar,
    BarChart3,
    PieChart as PieChartIcon,
    Layers,
    Filter,
    CheckCircle2,
    Coins,
    ShieldCheck,
    Building2,
    ArrowRight,
    Printer,
    Download,
    ChevronDown,
    FileSpreadsheet
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import PaginationControl from '../components/PaginationControl';
import BillingInvoiceForm from '../components/BillingInvoiceForm';
import ReceiptForm from '../components/ReceiptForm';
import QuotationForm from '../components/QuotationForm';
import { FilterToggleButton, AccountsARFilterDrawer } from '../components/SalesDocFilter';

import './PageCommon.css';

const THAI_MONTH_NAMES_LIST = [
    { value: 1, label: 'มกราคม' },
    { value: 2, label: 'กุมภาพันธ์' },
    { value: 3, label: 'มีนาคม' },
    { value: 4, label: 'เมษายน' },
    { value: 5, label: 'พฤษภาคม' },
    { value: 6, label: 'มิถุนายน' },
    { value: 7, label: 'กรกฎาคม' },
    { value: 8, label: 'สิงหาคม' },
    { value: 9, label: 'กันยายน' },
    { value: 10, label: 'ตุลาคม' },
    { value: 11, label: 'พฤศจิกายน' },
    { value: 12, label: 'ธันวาคม' }
];

export default function Accounts() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages, canCreate, canUpdate, activeCompany, currentUser } = useAuth();
    const { showAlert } = useAlert();
    const visibleSubPages = getVisibleSubPages('accounts');
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'accounts_dashboard';

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const initialPadM = String(currentMonth).padStart(2, '0');
    const initialLastDay = new Date(currentYear, currentMonth, 0).getDate();

    // ── State: Accounts Financial Dashboard ──
    const [dashboardStats, setDashboardStats] = useState(null);
    const [loadingDashboard, setLoadingDashboard] = useState(false);
    const [dashboardFilterMode, setDashboardFilterMode] = useState('month'); // 'month' | 'year' | 'custom'
    const [dashboardSelectedYear, setDashboardSelectedYear] = useState(currentYear);
    const [dashboardSelectedMonth, setDashboardSelectedMonth] = useState(currentMonth);
    const [dashboardTimeRange, setDashboardTimeRange] = useState('');
    const [dashboardDateFrom, setDashboardDateFrom] = useState(`${currentYear}-${initialPadM}-01`);
    const [dashboardDateTo, setDashboardDateTo] = useState(`${currentYear}-${initialPadM}-${String(initialLastDay).padStart(2, '0')}`);
    const [dashboardTrendMode, setDashboardTrendMode] = useState('daily'); // 'daily' | 'monthly' | 'yearly'
    const [showExecutiveReportModal, setShowExecutiveReportModal] = useState(false);

    const yearOptions = useMemo(() => {
        const curYear = new Date().getFullYear();
        const set = new Set();
        // แสดงปีล่วงหน้า 1 ปี และย้อนหลังอย่างน้อย 10 ปี เพื่อให้สามารถเลือกดูข้อมูลย้อนหลังได้สะดวก
        for (let y = curYear + 1; y >= curYear - 9; y--) {
            set.add(y);
        }
        if (dashboardStats?.availableYears && Array.isArray(dashboardStats.availableYears)) {
            dashboardStats.availableYears.forEach(y => set.add(Number(y)));
        }
        if (dashboardSelectedYear) {
            set.add(Number(dashboardSelectedYear));
        }
        return Array.from(set).sort((a, b) => b - a);
    }, [dashboardStats?.availableYears, dashboardSelectedYear]);

    const handleFilterModeChange = useCallback((mode) => {
        setDashboardFilterMode(mode);
        if (mode === 'year') {
            setDashboardDateFrom('');
            setDashboardDateTo('');
            setDashboardTimeRange('year');
            setDashboardTrendMode('monthly');
        } else if (mode === 'month') {
            const y = dashboardSelectedYear || currentYear;
            const m = dashboardSelectedMonth || currentMonth;
            const padM = String(m).padStart(2, '0');
            const lastDay = new Date(y, m, 0).getDate();
            setDashboardDateFrom(`${y}-${padM}-01`);
            setDashboardDateTo(`${y}-${padM}-${String(lastDay).padStart(2, '0')}`);
            setDashboardTimeRange('');
            setDashboardTrendMode('daily');
        } else if (mode === 'custom') {
            setDashboardTimeRange('');
            setDashboardTrendMode('daily');
        }
    }, [dashboardSelectedYear, dashboardSelectedMonth, currentYear, currentMonth]);

    const handleMonthChange = useCallback((newMonth) => {
        const m = parseInt(newMonth, 10);
        setDashboardSelectedMonth(m);
        const y = dashboardSelectedYear || currentYear;
        const padM = String(m).padStart(2, '0');
        const lastDay = new Date(y, m, 0).getDate();
        setDashboardDateFrom(`${y}-${padM}-01`);
        setDashboardDateTo(`${y}-${padM}-${String(lastDay).padStart(2, '0')}`);
        setDashboardTimeRange('');
        setDashboardTrendMode('daily');
    }, [dashboardSelectedYear, currentYear]);

    const handleYearChange = useCallback((newYear) => {
        const y = parseInt(newYear, 10);
        setDashboardSelectedYear(y);
        if (dashboardFilterMode === 'year') {
            setDashboardDateFrom('');
            setDashboardDateTo('');
            setDashboardTimeRange('year');
            setDashboardTrendMode('monthly');
        } else if (dashboardFilterMode === 'month') {
            const m = dashboardSelectedMonth || currentMonth;
            const padM = String(m).padStart(2, '0');
            const lastDay = new Date(y, m, 0).getDate();
            setDashboardDateFrom(`${y}-${padM}-01`);
            setDashboardDateTo(`${y}-${padM}-${String(lastDay).padStart(2, '0')}`);
            setDashboardTimeRange('');
            setDashboardTrendMode('daily');
        }
    }, [dashboardFilterMode, dashboardSelectedMonth, currentMonth]);

    // ── Helper: สร้างข้อความอธิบายช่วงเวลาภาษาไทย ──
    const getPeriodDescription = useCallback((fromDate, toDate, selectedYear, timeRange) => {
        const THAI_MONTH_NAMES = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const start = fromDate;
        const end = toDate || fromDate;

        if (start && end) {
            if (start === end) {
                const [y, m, d] = start.split('-');
                const mIdx = parseInt(m, 10);
                return `ประจำวันที่ ${parseInt(d, 10)} ${THAI_MONTH_NAMES[mIdx]} พ.ศ. ${parseInt(y, 10) + 543} (${d}/${m}/${parseInt(y, 10) + 543})`;
            }
            const [y1, m1, d1] = start.split('-');
            const [y2, m2, d2] = end.split('-');
            const lastDayOfM1 = new Date(parseInt(y1, 10), parseInt(m1, 10), 0).getDate();
            const isWholeMonth = y1 === y2 && m1 === m2 && d1 === '01' && parseInt(d2, 10) === lastDayOfM1;
            if (isWholeMonth) {
                const mIdx = parseInt(m1, 10);
                return `ประจำเดือน${THAI_MONTH_NAMES[mIdx]} พ.ศ. ${parseInt(y1, 10) + 543} (${d1}/${m1}/${parseInt(y1, 10) + 543} - ${d2}/${m2}/${parseInt(y2, 10) + 543})`;
            }
            return `ช่วงวันที่ ${d1}/${m1}/${parseInt(y1, 10) + 543} ถึง ${d2}/${m2}/${parseInt(y2, 10) + 543}`;
        }

        if (timeRange === 'today') return 'ประจำวันนี้';
        if (timeRange === '7days') return 'ประจำ 7 วันล่าสุด';
        if (timeRange === 'thisMonth') return 'ประจำเดือนนี้';
        return `ประจำปี พ.ศ. ${Number(selectedYear) + 543} (ค.ศ. ${selectedYear})`;
    }, []);

    // ── Helper: ฟอร์แมตวันที่เป็นรูปแบบไทย dd/mm/yyyy (พ.ศ.) ──
    const formatReceiptDate = useCallback((dStr) => {
        if (!dStr) return '-';
        try {
            const parts = dStr.split('T')[0].split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10) + 543;
                return `${parts[2]}/${parts[1]}/${y}`;
            }
        } catch (_) {}
        return dStr;
    }, []);

    const fetchDashboardStats = useCallback(async () => {
        setLoadingDashboard(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            
            const effectiveFrom = dashboardDateFrom;
            const effectiveTo = dashboardDateTo || dashboardDateFrom;

            if (effectiveFrom) {
                params.append('dateFrom', effectiveFrom);
                params.append('dateTo', effectiveTo);
            } else if (dashboardTimeRange) {
                params.append('timeRange', dashboardTimeRange);
            }
            if (dashboardSelectedYear) params.append('year', dashboardSelectedYear);
            if (activeCompany?.CompanyID) {
                params.append('companyId', activeCompany.CompanyID);
            }

            const res = await fetch(`${API_BASE}/accounts/dashboard-stats?${params.toString()}`, {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    ...(activeCompany?.CompanyID ? { 'x-company-id': String(activeCompany.CompanyID) } : {})
                }
            });
            const json = await res.json();
            if (json.success) {
                setDashboardStats(json.data);
            } else {
                showAlert('ข้อผิดพลาด', json.message || 'ไม่สามารถโหลดข้อมูลสถิติบัญชีได้', 'error');
            }
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อโหลดข้อมูลสถิติบัญชีได้', 'error');
        } finally {
            setLoadingDashboard(false);
        }
    }, [dashboardTimeRange, dashboardSelectedYear, dashboardDateFrom, dashboardDateTo, activeCompany, showAlert]);

    useEffect(() => {
        if (activeTab === 'accounts_dashboard') {
            fetchDashboardStats();
        }
    }, [activeTab, fetchDashboardStats]);

    // ── ฟังก์ชันส่งออก CSV รายงานสรุปผู้บริหาร (กรองตามวันที่/เดือนที่เลือกตรงกัน 100%) ──
    const handleExportCSV = useCallback(() => {
        if (!dashboardStats) return;
        const { kpi, monthlyTrend, allReceiptsForExport } = dashboardStats;

        const effectiveFrom = dashboardDateFrom;
        const effectiveTo = dashboardDateTo || dashboardDateFrom;
        const periodText = getPeriodDescription(effectiveFrom, effectiveTo, dashboardSelectedYear, dashboardTimeRange);

        let filename = `Executive_Financial_Report_${dashboardSelectedYear}.csv`;
        if (effectiveFrom) {
            filename = effectiveFrom === effectiveTo 
                ? `Executive_Report_${effectiveFrom}.csv` 
                : `Executive_Report_${effectiveFrom}_to_${effectiveTo}.csv`;
        }

        let csv = '\uFEFF'; // UTF-8 BOM สำหรับ Excel รองรับภาษาไทย
        csv += `รายงานสรุปภาพรวมทางการเงิน\n`;
        csv += `ช่วงเวลาที่เลือก,${periodText}\n`;
        csv += `วันที่ออกรายงาน,${new Date().toLocaleDateString('th-TH')}\n`;
        csv += `ผู้ออกรายงาน,${currentUser?.display_name || 'ผู้ดูแลระบบ'}\n\n`;

        csv += `=== ตัวชี้วัดสำคัญทางการเงินสำหรับช่วงเวลาที่เลือก (Executive KPIs) ===\n`;
        csv += `ตัวชี้วัด,จำนวนเงิน (บาท),คำอธิบาย\n`;
        csv += `รายรับจริงสะสม (Total Cash Inflow),${kpi?.totalCashInflow || 0},จากใบเสร็จรับเงิน ${kpi?.totalReceiptsCount || 0} ฉบับ\n`;
        csv += `เงินมัดจำรับแล้ว (Total Deposits),${kpi?.totalDepositInflow || 0},มัดจำจากลูกค้า\n`;
        csv += `เงินปิดยอดรับแล้ว (Total Final Payments),${kpi?.totalFinalInflow || 0},ชำระงวดสุดท้าย\n`;
        csv += `ลูกหนี้การค้าคงค้าง (Outstanding AR),${kpi?.totalOutstandingAR || 0},รอเรียกเก็บ ${kpi?.pendingARCount || 0} รายการ\n`;
        csv += `เจ้าหนี้การค้า (AP),${kpi?.totalAP || 0},ภาระหนี้จากการจัดซื้อ (PO)\n\n`;

        if (effectiveFrom) {
            csv += `=== สรุปรายรับแยกตามวัน (${periodText}) ===\n`;
            csv += `วันที่,เงินมัดจำ (บาท),เงินปิดยอด (บาท),ชำระเต็ม (บาท),รายรับรวม (บาท),จำนวนบิล\n`;
            (dashboardStats?.dailyTrend || []).forEach(d => {
                csv += `"${formatReceiptDate(d.date)}",${d.deposit},${d.final},${d.full},${d.amount},${d.count}\n`;
            });
            csv += `"รวมทั้งสิ้น",${kpi?.totalDepositInflow || 0},${kpi?.totalFinalInflow || 0},${kpi?.totalFullInflow || 0},${kpi?.totalCashInflow || 0},${kpi?.totalReceiptsCount || 0}\n\n`;
        } else {
            csv += `=== สรุปรายรับแยกตามเดือน ประจำปี พ.ศ. ${Number(dashboardSelectedYear) + 543} ===\n`;
            csv += `เดือน,เงินมัดจำ (บาท),เงินปิดยอด (บาท),ชำระเต็ม (บาท),รายรับรวม (บาท),จำนวนบิล\n`;
            (monthlyTrend || []).forEach(m => {
                csv += `"${m.label}",${m.deposit},${m.final},${m.full},${m.amount},${m.count}\n`;
            });
            csv += `"รวมทั้งสิ้น",${kpi?.totalDepositInflow || 0},${kpi?.totalFinalInflow || 0},${kpi?.totalFullInflow || 0},${kpi?.totalCashInflow || 0},${kpi?.totalReceiptsCount || 0}\n\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showAlert('สำเร็จ', `ส่งออกข้อมูลรายงานผู้บริหาร (${periodText}) เรียบร้อยแล้ว`, 'success');
    }, [dashboardStats, activeCompany, dashboardTimeRange, dashboardSelectedYear, dashboardDateFrom, dashboardDateTo, currentUser, getPeriodDescription, showAlert]);

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

            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/accounts/deposits?${params.toString()}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
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

    // ── Pagination State for Deposits ──
    const [depositPage, setDepositPage] = useState(1);
    const [depositPageSize, setDepositPageSize] = useState(10);

    useEffect(() => {
        setDepositPage(1);
    }, [depositSearch, depositFilter, depositPageSize]);

    const paginatedDeposits = useMemo(() => {
        const start = (depositPage - 1) * depositPageSize;
        return filteredDeposits.slice(start, start + depositPageSize);
    }, [filteredDeposits, depositPage, depositPageSize]);

    // ── ฟังก์ชันเปิดฟอร์มสร้างใบวางบิล/ใบแจ้งหนี้จากใบเสนอราคา ──
    // ── ฟังก์ชันเปิดฟอร์มสร้างใบวางบิล/ใบแจ้งหนี้จากใบเสนอราคา ──
    const handleCreateBillingInvoice = async (quotationId, rowData = null) => {
        try {
            const token = localStorage.getItem('token');
            const receiptParam = (rowData && (rowData.DepositReceiptID || rowData.ReceiptID))
                ? `?receiptId=${rowData.DepositReceiptID || rowData.ReceiptID}`
                : '';
            const res = await fetch(`${API_BASE}/accounts/quotation-for-billing/${quotationId}${receiptParam}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const json = await res.json();
            if (json.success && json.data) {
                if (rowData) {
                    const paidDep = Number(rowData.PaidDepositAmount !== null && rowData.PaidDepositAmount !== undefined
                        ? rowData.PaidDepositAmount
                        : (rowData.DepositAmount || 0));
                    if (paidDep > 0) {
                        json.data.paidDepositAmount = paidDep;
                        json.data.depositAmount = paidDep;
                        json.data.customDepositAmount = paidDep;
                        json.data.depositPercent = 'custom';
                        json.data.showDepositInPrint = true;
                        const gTotal = Number(json.data.grandTotal || rowData.GrandTotal || 0);
                        json.data.remainingAmount = Math.max(0, gTotal - paidDep);
                    }
                }
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
    const handleCreateReceipt = async (quotationId, type = 'deposit', rowData = null) => {
        try {
            const token = localStorage.getItem('token');
            const receiptParam = (rowData && (rowData.DepositReceiptID || rowData.ReceiptID))
                ? `&receiptId=${rowData.DepositReceiptID || rowData.ReceiptID}`
                : '';
            const res = await fetch(`${API_BASE}/accounts/quotation-for-receipt/${quotationId}?type=${type}${receiptParam}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const json = await res.json();
            if (json.success && json.data) {
                if (type === 'final' && rowData) {
                    const paidDep = Number(rowData.PaidDepositAmount !== null && rowData.PaidDepositAmount !== undefined
                        ? rowData.PaidDepositAmount
                        : (rowData.DepositAmount || 0));
                    if (paidDep > 0) {
                        json.data.paidDepositAmount = paidDep;
                        json.data.depositAmount = paidDep;
                        json.data.customDepositAmount = paidDep;
                        json.data.depositPercent = 'custom';
                        json.data.showDepositInPrint = true;
                        const gTotal = Number(json.data.grandTotal || rowData.GrandTotal || 0);
                        json.data.remainingAmount = Math.max(0, gTotal - paidDep);
                    }
                }
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
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/accounts/deposits/${statusModal.item.QuotationID}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
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

    // ── Pagination State for AP ──
    const [apPage, setApPage] = useState(1);
    const [apPageSize, setApPageSize] = useState(10);

    useEffect(() => {
        setApPage(1);
    }, [apSearch, apFilter, apPageSize]);

    const paginatedAP = useMemo(() => {
        const start = (apPage - 1) * apPageSize;
        return filteredAP.slice(start, start + apPageSize);
    }, [filteredAP, apPage, apPageSize]);

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
                <div className="subpage-content" key="accounts_dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 1. Control & Filter Bar */}
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}>
                        {/* Filter Mode Selector & Inputs */}
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            {/* Segmented Control Buttons */}
                            <div style={{
                                display: 'inline-flex',
                                background: '#f1f5f9',
                                padding: '3px',
                                borderRadius: '9px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => handleFilterModeChange('month')}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 14px',
                                        borderRadius: '7px',
                                        fontSize: '13px',
                                        fontWeight: dashboardFilterMode === 'month' ? 700 : 500,
                                        border: 'none',
                                        background: dashboardFilterMode === 'month' ? '#ffffff' : 'transparent',
                                        color: dashboardFilterMode === 'month' ? '#0f172a' : '#64748b',
                                        boxShadow: dashboardFilterMode === 'month' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Calendar size={14} color={dashboardFilterMode === 'month' ? '#059669' : '#64748b'} />
                                    รายเดือน
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFilterModeChange('year')}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 14px',
                                        borderRadius: '7px',
                                        fontSize: '13px',
                                        fontWeight: dashboardFilterMode === 'year' ? 700 : 500,
                                        border: 'none',
                                        background: dashboardFilterMode === 'year' ? '#ffffff' : 'transparent',
                                        color: dashboardFilterMode === 'year' ? '#0f172a' : '#64748b',
                                        boxShadow: dashboardFilterMode === 'year' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <TrendingUp size={14} color={dashboardFilterMode === 'year' ? '#0284c7' : '#64748b'} />
                                    รายปี
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFilterModeChange('custom')}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 14px',
                                        borderRadius: '7px',
                                        fontSize: '13px',
                                        fontWeight: dashboardFilterMode === 'custom' ? 700 : 500,
                                        border: 'none',
                                        background: dashboardFilterMode === 'custom' ? '#ffffff' : 'transparent',
                                        color: dashboardFilterMode === 'custom' ? '#0f172a' : '#64748b',
                                        boxShadow: dashboardFilterMode === 'custom' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Calendar size={14} color={dashboardFilterMode === 'custom' ? '#d97706' : '#64748b'} />
                                    กำหนดช่วงวัน
                                </button>
                            </div>

                            {/* Controls based on filter mode */}
                            {dashboardFilterMode === 'month' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CustomSelect
                                        value={dashboardSelectedMonth}
                                        onChange={(e) => handleMonthChange(e.target.value)}
                                        style={{
                                            minWidth: '130px',
                                            height: '38px',
                                            fontSize: '13px'
                                        }}
                                    >
                                        {THAI_MONTH_NAMES_LIST.map(m => (
                                            <option key={m.value} value={m.value}>
                                                เดือน{m.label}
                                            </option>
                                        ))}
                                    </CustomSelect>

                                    <CustomSelect
                                        value={dashboardSelectedYear}
                                        onChange={(e) => handleYearChange(e.target.value)}
                                        style={{
                                            minWidth: '140px',
                                            height: '38px',
                                            fontSize: '13px'
                                        }}
                                    >
                                        {yearOptions.map(y => (
                                            <option key={y} value={y}>
                                                พ.ศ. {y + 543} ({y})
                                            </option>
                                        ))}
                                    </CustomSelect>
                                </div>
                            )}

                            {dashboardFilterMode === 'year' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>ปีที่เลือก:</span>
                                    <CustomSelect
                                        value={dashboardSelectedYear}
                                        onChange={(e) => handleYearChange(e.target.value)}
                                        style={{
                                            minWidth: '150px',
                                            height: '38px',
                                            fontSize: '13px'
                                        }}
                                    >
                                        {yearOptions.map(y => (
                                            <option key={y} value={y}>
                                                พ.ศ. {y + 543} ({y})
                                            </option>
                                        ))}
                                    </CustomSelect>
                                </div>
                            )}

                            {dashboardFilterMode === 'custom' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CustomDatePicker
                                        selectsRange={true}
                                        startDate={dashboardDateFrom}
                                        endDate={dashboardDateTo}
                                        onChange={([start, end]) => {
                                            setDashboardDateFrom(start);
                                            setDashboardDateTo(end);
                                            if (start) {
                                                setDashboardTimeRange('');
                                                const yr = parseInt(start.substring(0, 4), 10);
                                                if (!isNaN(yr)) setDashboardSelectedYear(yr);
                                            }
                                        }}
                                        placeholderText="เลือกช่วงวันที่ (วว/ดด/ปปปป - วว/ดด/ปปปป)"
                                        style={{
                                            width: '260px',
                                            height: '38px',
                                            minHeight: '38px',
                                            fontSize: '13px',
                                            borderRadius: '8px',
                                            border: '1.5px solid #cbd5e1',
                                            background: '#ffffff',
                                            padding: '6px 32px 6px 12px'
                                        }}
                                    />
                                    {(dashboardDateFrom || dashboardDateTo) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDashboardDateFrom('');
                                                setDashboardDateTo('');
                                                setDashboardTimeRange('all');
                                            }}
                                            style={{
                                                background: '#f1f5f9',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '6px',
                                                color: '#64748b',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '28px',
                                                height: '28px',
                                                padding: 0
                                            }}
                                            title="ล้างช่วงวันที่"
                                        >
                                            <X size={15} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Executive Report Export (PDF) Button */}
                        <button
                            type="button"
                            onClick={() => setShowExecutiveReportModal(true)}
                            title="พิมพ์หรือบันทึกรายงานสรุปภาพรวมทางการเงินเป็น PDF (A4)"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 20px',
                                height: '38px',
                                background: '#0284c7',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13.5px',
                                fontWeight: 600,
                                color: '#ffffff',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#0369a1';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(2, 132, 199, 0.35)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#0284c7';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(2, 132, 199, 0.25)';
                            }}
                        >
                            <Printer size={16} />
                            <span>Export รายงานผู้บริหาร (PDF)</span>
                        </button>
                        </div>

                    {/* 2. Top Executive KPI Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                        gap: '16px'
                    }}>
                        {/* KPI 1: รายรับจริงสะสม (Authoritative Cash Inflow) */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            padding: '18px 20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            borderTop: '4px solid #10b981',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>รายรับจริงสะสม (Cash Inflow)</span>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: '#ecfdf5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#059669'
                                }}>
                                    <Wallet size={19} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f766e', letterSpacing: '-0.5px' }}>
                                    ฿{(dashboardStats?.kpi?.totalCashInflow ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 size={12} color="#10b981" />
                                    <span>จากใบเสร็จ {dashboardStats?.kpi?.totalReceiptsCount || 0} ฉบับ</span>
                                </div>
                            </div>
                        </div>

                        {/* KPI 2: รายรับเดือนนี้ */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            padding: '18px 20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            borderTop: '4px solid #3b82f6',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>รายรับเดือนนี้ (This Month)</span>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: '#eff6ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#2563eb'
                                }}>
                                    <Calendar size={19} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e40af', letterSpacing: '-0.5px' }}>
                                    ฿{(dashboardStats?.kpi?.thisMonthInflow ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: (dashboardStats?.kpi?.momGrowth || 0) >= 0 ? '#dcfce7' : '#fee2e2',
                                        color: (dashboardStats?.kpi?.momGrowth || 0) >= 0 ? '#15803d' : '#b91c1c'
                                    }}>
                                        {(dashboardStats?.kpi?.momGrowth || 0) >= 0 ? '▲ +' : '▼ '}
                                        {dashboardStats?.kpi?.momGrowth || 0}% MoM
                                    </span>
                                    <span>เทียบเดือนก่อน</span>
                                </div>
                            </div>
                        </div>

                        {/* KPI 3: รายรับวันนี้ */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            padding: '18px 20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            borderTop: '4px solid #f59e0b',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>รายรับวันนี้ (Today Inflow)</span>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: '#fffbeb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#d97706'
                                }}>
                                    <Coins size={19} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#b45309', letterSpacing: '-0.5px' }}>
                                    ฿{(dashboardStats?.kpi?.todayInflow ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    ยอดเงินสด/โอนรับเข้าวันปัจจุบัน
                                </div>
                            </div>
                        </div>

                        {/* KPI 4: ลูกหนี้การค้าคงค้าง (Outstanding AR) */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            padding: '18px 20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            borderTop: '4px solid #ea580c',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>ลูกหนี้คงค้าง (Outstanding AR)</span>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: '#fff7ed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ea580c'
                                }}>
                                    <Clock size={19} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#c2410c', letterSpacing: '-0.5px' }}>
                                    ฿{(dashboardStats?.kpi?.totalOutstandingAR ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    ค้างชำระ/รอปิดยอด {dashboardStats?.kpi?.pendingARCount || 0} รายการ
                                </div>
                            </div>
                        </div>

                        {/* KPI 5: เจ้าหนี้การค้า (AP) */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            padding: '18px 20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            borderTop: '4px solid #e11d48',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>เจ้าหนี้การค้า (AP)</span>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: '#fff1f2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#e11d48'
                                }}>
                                    <ArrowUpRight size={19} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#be123c', letterSpacing: '-0.5px' }}>
                                    ฿{(dashboardStats?.kpi?.totalAP ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    ภาระหนี้จากการจัดซื้อ (PO)
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Charts Row */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '20px',
                        alignItems: 'stretch'
                    }}>
                        {/* Chart 1: Cash Inflow Trend */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            padding: '22px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 0
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '16px',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                        แนวโน้มรายรับทางการเงิน (Cash Inflow Trend)
                                    </h3>
                                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                                        แสดงการรับชำระเงินจริงจากใบเสร็จรับเงิน
                                    </p>
                                </div>
                                <div style={{
                                    display: 'inline-flex',
                                    background: '#f1f5f9',
                                    padding: '3px',
                                    borderRadius: '8px'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => setDashboardTrendMode('daily')}
                                        style={{
                                            border: 'none',
                                            background: dashboardTrendMode === 'daily' ? '#ffffff' : 'transparent',
                                            color: dashboardTrendMode === 'daily' ? '#0f172a' : '#64748b',
                                            fontWeight: dashboardTrendMode === 'daily' ? 700 : 500,
                                            fontSize: '12px',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            boxShadow: dashboardTrendMode === 'daily' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        รายวัน
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDashboardTrendMode('monthly')}
                                        style={{
                                            border: 'none',
                                            background: dashboardTrendMode === 'monthly' ? '#ffffff' : 'transparent',
                                            color: dashboardTrendMode === 'monthly' ? '#0f172a' : '#64748b',
                                            fontWeight: dashboardTrendMode === 'monthly' ? 700 : 500,
                                            fontSize: '12px',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            boxShadow: dashboardTrendMode === 'monthly' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        รายเดือน ({dashboardSelectedYear ? `ปี ${Number(dashboardSelectedYear) + 543}` : 'ปีนี้'})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDashboardTrendMode('yearly')}
                                        style={{
                                            border: 'none',
                                            background: dashboardTrendMode === 'yearly' ? '#ffffff' : 'transparent',
                                            color: dashboardTrendMode === 'yearly' ? '#0f172a' : '#64748b',
                                            fontWeight: dashboardTrendMode === 'yearly' ? 700 : 500,
                                            fontSize: '12px',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            boxShadow: dashboardTrendMode === 'yearly' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        รายปี (เปรียบเทียบ)
                                    </button>
                                </div>
                            </div>

                            <div style={{ height: '300px', width: '100%', marginTop: '10px' }}>
                                {dashboardTrendMode === 'daily' ? (
                                    (dashboardStats?.dailyTrend && dashboardStats.dailyTrend.length > 0) ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={dashboardStats.dailyTrend} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} />
                                                <Tooltip
                                                    formatter={(val, name) => [`฿${Number(val).toLocaleString()}`, name === 'amount' ? 'ยอดรับเงินจริง' : name]}
                                                    labelFormatter={(label) => `วันที่: ${label}`}
                                                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                                />
                                                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#inflowGradient)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                            <FileText size={36} strokeWidth={1.5} style={{ marginBottom: '8px', color: '#cbd5e1' }} />
                                            <span style={{ fontSize: '14px' }}>ไม่มีข้อมูลรายรับในช่วงเวลานี้</span>
                                        </div>
                                    )
                                ) : dashboardTrendMode === 'yearly' ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dashboardStats?.yearlyTrend || []} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                                            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} />
                                            <Tooltip
                                                formatter={(val) => [`฿${Number(val).toLocaleString()}`, 'ยอดรับเงินจริงรวม']}
                                                labelFormatter={(label) => `ปี: ${label}`}
                                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                            />
                                            <Bar dataKey="amount" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={36} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dashboardStats?.monthlyTrend || []} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                                            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} />
                                            <Tooltip
                                                formatter={(val) => [`฿${Number(val).toLocaleString()}`, 'ยอดรับเงินจริง']}
                                                labelFormatter={(label) => `เดือน: ${label}`}
                                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                            />
                                            <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Chart 2: Payment Type Breakdown */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            padding: '22px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minWidth: 0
                        }}>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                    สัดส่วนประเภทการรับเงิน
                                </h3>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 16px' }}>
                                    แบ่งตามประเภทใบเสร็จรับเงิน
                                </p>
                            </div>

                            <div style={{ height: '200px', width: '100%', position: 'relative' }}>
                                {dashboardStats?.paymentTypeBreakdown && dashboardStats.paymentTypeBreakdown.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={dashboardStats.paymentTypeBreakdown}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={85}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {dashboardStats.paymentTypeBreakdown.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value, name) => [`฿${Number(value).toLocaleString()}`, name]}
                                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                        ไม่มีข้อมูลสัดส่วน
                                    </div>
                                )}
                            </div>

                            {/* Legend Chips */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                {(dashboardStats?.paymentTypeBreakdown || []).map((item, idx) => {
                                    const total = dashboardStats?.kpi?.totalCashInflow || 1;
                                    const pct = ((item.value / total) * 100).toFixed(1);
                                    return (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                                                <span style={{ color: '#334155', fontWeight: 500 }}>{item.name}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: 700, color: '#0f172a' }}>฿{item.value.toLocaleString()}</span>
                                                <span style={{ color: '#94a3b8', fontSize: '11px' }}>({pct}%)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 4. Bottom Analytics & Recent Collections Feed */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '20px',
                        alignItems: 'stretch'
                    }}>
                        {/* Payment Channels Card */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            padding: '22px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                    ช่องทางการรับเงิน (Payment Methods)
                                </h3>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 16px' }}>
                                    สัดส่วนยอดเงินแยกตามวิธีชำระ
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {(dashboardStats?.paymentMethodBreakdown && dashboardStats.paymentMethodBreakdown.length > 0) ? (
                                        dashboardStats.paymentMethodBreakdown.map((pm, idx) => {
                                            const total = dashboardStats?.kpi?.totalCashInflow || 1;
                                            const pct = Math.min(100, Math.round((pm.value / total) * 100));
                                            return (
                                                <div key={idx}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                                        <span style={{ fontWeight: 600, color: '#334155' }}>{pm.name}</span>
                                                        <span style={{ fontWeight: 700, color: '#0f766e' }}>฿{pm.value.toLocaleString()} ({pct}%)</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${pct}%`, height: '100%', background: '#10b981', borderRadius: '4px' }} />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                                            ยังไม่มีข้อมูลช่องทางการชำระ
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                marginTop: '20px',
                                padding: '14px',
                                background: '#f8fafc',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: '#64748b' }}>เฉลี่ยต่อบิล (Avg Ticket):</span>
                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                        ฿{dashboardStats?.kpi?.totalReceiptsCount > 0 
                                            ? Math.round(dashboardStats.kpi.totalCashInflow / dashboardStats.kpi.totalReceiptsCount).toLocaleString() 
                                            : '0'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: '#64748b' }}>สัดส่วนมัดจำรับแล้ว:</span>
                                    <span style={{ fontWeight: 700, color: '#d97706' }}>
                                        ฿{(dashboardStats?.kpi?.totalDepositInflow || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: '#64748b' }}>สัดส่วนเงินปิดยอด:</span>
                                    <span style={{ fontWeight: 700, color: '#059669' }}>
                                        ฿{(dashboardStats?.kpi?.totalFinalInflow || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Collections Table Card */}
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            padding: '22px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 0
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '16px',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                        รายการรับเงินล่าสุดจากใบเสร็จรับเงิน
                                    </h3>
                                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                                        ฟีดรายการบันทึกรับเงินจริงในระบบ
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSearchParams({ tab: 'accounts_ar' })}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#2563eb',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <span>ดูลูกหนี้การค้า (AR) ทั้งหมด</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>เลขที่ใบเสร็จ</th>
                                            <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>วันที่</th>
                                            <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>ลูกค้า</th>
                                            <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>ประเภท</th>
                                            <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>ยอดเงินรับจริง</th>
                                            <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>ดูบิล</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(dashboardStats?.recentReceipts && dashboardStats.recentReceipts.length > 0) ? (
                                            dashboardStats.recentReceipts.map((r, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                                                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                                                        {r.receiptNo}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', color: '#64748b' }}>
                                                        {r.billDate || '-'}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', color: '#334155' }}>
                                                        {r.customerName || '-'}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                        {r.paymentType === 'deposit' ? (
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '2px 8px',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                                background: '#fef3c7',
                                                                color: '#b45309'
                                                            }}>
                                                                เงินมัดจำ
                                                            </span>
                                                        ) : r.paymentType === 'final' ? (
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '2px 8px',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                                background: '#dcfce7',
                                                                color: '#15803d'
                                                            }}>
                                                                เงินปิดยอด
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '2px 8px',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                                background: '#e0f2fe',
                                                                color: '#0369a1'
                                                            }}>
                                                                ชำระเต็ม
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                                                        ฿{r.cashInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setReceiptEditId(r.receiptId);
                                                                setShowReceiptForm(true);
                                                            }}
                                                            style={{
                                                                background: 'none',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '6px',
                                                                padding: '4px 8px',
                                                                cursor: 'pointer',
                                                                color: '#475569',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                fontSize: '11px'
                                                            }}
                                                            title="ดูรายละเอียดใบเสร็จ"
                                                        >
                                                            <Eye size={12} /> ดู
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                                                    ไม่มีรายการรับเงินในระบบ
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* ── Executive Report Printable Preview Modal (A4) ── */}
                    {showExecutiveReportModal && (
                        <div
                            className="executive-report-overlay"
                            style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 9999,
                                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                overflowY: 'auto',
                                padding: '24px 16px'
                            }}
                            onClick={(e) => {
                                if (e.target === e.currentTarget) setShowExecutiveReportModal(false);
                            }}
                        >
                            <style>{`
                                @media print {
                                    @page {
                                        size: A4 portrait;
                                        margin: 8mm 10mm;
                                    }
                                    *, *::before, *::after {
                                        -webkit-print-color-adjust: exact !important;
                                        print-color-adjust: exact !important;
                                    }
                                    html, body {
                                        margin: 0 !important;
                                        padding: 0 !important;
                                        background: #ffffff !important;
                                        width: 100% !important;
                                        height: auto !important;
                                    }
                                    body > div, body > div > div, .app-container, main {
                                        position: static !important;
                                        margin: 0 !important;
                                        padding: 0 !important;
                                        transform: none !important;
                                    }
                                    body * {
                                        visibility: hidden !important;
                                    }
                                    .executive-report-overlay {
                                        position: static !important;
                                        display: block !important;
                                        padding: 0 !important;
                                        margin: 0 !important;
                                        background: transparent !important;
                                        overflow: visible !important;
                                    }
                                    #executive-report-sheet, #executive-report-sheet * {
                                        visibility: visible !important;
                                    }
                                    #executive-report-sheet {
                                        position: absolute !important;
                                        left: 0 !important;
                                        top: 0 !important;
                                        width: 100% !important;
                                        max-width: 100% !important;
                                        margin: 0 !important;
                                        padding: 0 !important;
                                        box-sizing: border-box !important;
                                        box-shadow: none !important;
                                        border: none !important;
                                        background: #ffffff !important;
                                        color: #000000 !important;
                                    }
                                    .no-print {
                                        display: none !important;
                                    }
                                    tr {
                                        page-break-inside: avoid;
                                    }
                                }
                            `}</style>

                            {/* Modal Floating Action Bar (Not printed) */}
                            <div
                                className="no-print"
                                style={{
                                    width: '100%',
                                    maxWidth: '1000px',
                                    marginBottom: '16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: '#ffffff',
                                    padding: '12px 20px',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileSpreadsheet size={20} color="#0284c7" />
                                    <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                                        พรีวิวรายงานสรุปภาพรวมทางการเงิน ({getPeriodDescription(dashboardDateFrom, dashboardDateTo, dashboardSelectedYear, dashboardTimeRange)})
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 18px',
                                            background: '#0284c7',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: '#ffffff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Printer size={15} /> พิมพ์ / บันทึก PDF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowExecutiveReportModal(false)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 16px',
                                            background: '#f1f5f9',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: '#475569',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <X size={15} /> ปิด
                                    </button>
                                </div>
                            </div>

                            {/* Printable A4 Document Sheet */}
                            <div
                                id="executive-report-sheet"
                                style={{
                                    width: '100%',
                                    maxWidth: '1000px',
                                    background: '#ffffff',
                                    color: '#1e293b',
                                    borderRadius: '8px',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                                    padding: '36px 44px',
                                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                                    fontSize: '12px',
                                    lineHeight: 1.5
                                }}
                            >
                                {/* Header */}
                                <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '22px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                                            พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                            รายงานสรุปภาพรวมทางการเงิน
                                        </h2>
                                        <div style={{ fontSize: '13px', color: '#0369a1', marginTop: '6px', fontWeight: 700 }}>
                                            {getPeriodDescription(dashboardDateFrom, dashboardDateTo, dashboardSelectedYear, dashboardTimeRange)}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 1: Executive KPI Highlights */}
                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                                        1. สรุปตัวชี้วัดสำคัญทางการเงิน (Executive Financial Highlights)
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', background: '#f8fafc' }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>รายรับจริงสะสมรวม</div>
                                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                                                ฿{Number(dashboardStats?.kpi?.totalCashInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>จาก {dashboardStats?.kpi?.totalReceiptsCount || 0} ใบเสร็จ</div>
                                        </div>
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', background: '#f8fafc' }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>เงินมัดจำรับแล้ว</div>
                                            <div style={{ fontSize: '17px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
                                                ฿{Number(dashboardStats?.kpi?.totalDepositInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
                                                สัดส่วน {dashboardStats?.kpi?.totalCashInflow > 0 ? Math.round(((dashboardStats?.kpi?.totalDepositInflow || 0) / dashboardStats.kpi.totalCashInflow) * 100) : 0}%
                                            </div>
                                        </div>
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', background: '#f8fafc' }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>เงินปิดยอดรับแล้ว</div>
                                            <div style={{ fontSize: '17px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                                                ฿{Number(dashboardStats?.kpi?.totalFinalInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
                                                สัดส่วน {dashboardStats?.kpi?.totalCashInflow > 0 ? Math.round(((dashboardStats?.kpi?.totalFinalInflow || 0) / dashboardStats.kpi.totalCashInflow) * 100) : 0}%
                                            </div>
                                        </div>
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', background: '#f8fafc' }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ลูกหนี้การค้าคงค้าง (AR)</div>
                                            <div style={{ fontSize: '17px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                                                ฿{Number(dashboardStats?.kpi?.totalOutstandingAR || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>รอรับชำระ {dashboardStats?.kpi?.pendingARCount || 0} บิล</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Breakdown Table (Dynamic based on selected period) */}
                                {dashboardDateFrom ? (
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                                            2. รายละเอียดรายรับจำแนกตามวัน (Daily Cash Inflow Breakdown)
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                            <thead>
                                                <tr style={{ background: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>วันที่</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>เงินมัดจำ (฿)</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>เงินปิดยอด (฿)</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>ชำระเต็ม (฿)</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>รายรับรวม (฿)</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>สัดส่วน (%)</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>จำนวนบิล</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(dashboardStats?.dailyTrend && dashboardStats.dailyTrend.length > 0) ? (
                                                    dashboardStats.dailyTrend.map((d, idx) => {
                                                        const tot = dashboardStats?.kpi?.totalCashInflow || 1;
                                                        const pct = tot > 0 ? ((d.amount / tot) * 100).toFixed(1) : '0.0';
                                                        return (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                                                                <td style={{ padding: '8px 10px', fontWeight: 600 }}>{formatReceiptDate(d.date)}</td>
                                                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#b45309' }}>
                                                                    {d.deposit > 0 ? d.deposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                                </td>
                                                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#15803d' }}>
                                                                    {d.final > 0 ? d.final.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                                </td>
                                                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0369a1' }}>
                                                                    {d.full > 0 ? d.full.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                                </td>
                                                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                                                                    {d.amount > 0 ? d.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                                </td>
                                                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>
                                                                    {d.amount > 0 ? `${pct}%` : '-'}
                                                                </td>
                                                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                                    {d.count > 0 ? d.count : '-'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr>
                                                        <td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                                                            ไม่มีข้อมูลรายรับในช่วงเวลาที่เลือก
                                                        </td>
                                                    </tr>
                                                )}
                                                {/* Summary Row */}
                                                <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', fontWeight: 800 }}>
                                                    <td style={{ padding: '10px 10px' }}>รวมทั้งสิ้น</td>
                                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#b45309' }}>
                                                        ฿{Number(dashboardStats?.kpi?.totalDepositInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#15803d' }}>
                                                        ฿{Number(dashboardStats?.kpi?.totalFinalInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#0369a1' }}>
                                                        ฿{Number(dashboardStats?.kpi?.totalFullInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#059669', fontSize: '13px' }}>
                                                        ฿{Number(dashboardStats?.kpi?.totalCashInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '10px 10px', textAlign: 'right' }}>100%</td>
                                                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                                        {dashboardStats?.kpi?.totalReceiptsCount || 0}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                                            2. รายละเอียดรายรับจำแนกตามเดือน (Monthly Cash Inflow Breakdown)
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                            <thead>
                                                <tr style={{ background: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>เดือน</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>เงินมัดจำ (฿)</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>เงินปิดยอด (฿)</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>ชำระเต็ม (฿)</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>รายรับรวม (฿)</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>สัดส่วน (%)</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>จำนวนบิล</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(dashboardStats?.monthlyTrend && dashboardStats.monthlyTrend.length > 0) ? (
                                                    dashboardStats.monthlyTrend.map((m, idx) => {
                                                        const tot = dashboardStats?.kpi?.totalCashInflow || 1;
                                                        const pct = tot > 0 ? ((m.amount / tot) * 100).toFixed(1) : '0.0';
                                                        return (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                                                                <td style={{ padding: '8px 10px', fontWeight: 600 }}>{m.label}</td>
                                                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#b45309' }}>
                                                                    {m.deposit > 0 ? m.deposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                                </td>
                                                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#15803d' }}>
                                                                    {m.final > 0 ? m.final.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                                </td>
                                                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0369a1' }}>
                                                                    {m.full > 0 ? m.full.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                                </td>
                                                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                                                                    {m.amount > 0 ? m.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                                </td>
                                                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>
                                                                    {m.amount > 0 ? `${pct}%` : '-'}
                                                                </td>
                                                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                                    {m.count > 0 ? m.count : '-'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr>
                                                        <td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                                                            ไม่มีข้อมูลรายรับประจำปีนี้
                                                        </td>
                                                    </tr>
                                                )}
                                                {/* Summary Row */}
                                                <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', fontWeight: 800 }}>
                                                    <td style={{ padding: '10px 10px' }}>รวมทั้งสิ้น</td>
                                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#b45309' }}>
                                                        ฿{Number(dashboardStats?.kpi?.totalDepositInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#15803d' }}>
                                                        ฿{Number(dashboardStats?.kpi?.totalFinalInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#0369a1' }}>
                                                        ฿{Number(dashboardStats?.kpi?.totalFullInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#059669', fontSize: '13px' }}>
                                                        ฿{Number(dashboardStats?.kpi?.totalCashInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '10px 10px', textAlign: 'right' }}>100%</td>
                                                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                                        {dashboardStats?.kpi?.totalReceiptsCount || 0}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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
                                                        ไม่พบรายการใบเสร็จรับเงินมัดจำ
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedDeposits.map((row, idx) => {
                                                    const grandTotal = Number(row.GrandTotal || 0);
                                                    const depositAmount = Number(row.DepositAmount || 0);
                                                    const paid = Number(row.PaidDepositAmount || 0);
                                                    const remaining = Number(row.RemainingAmount || 0);

                                                    return (
                                                        <tr key={row.ReceiptID || row.QuotationID}>
                                                            <td style={{ textAlign: 'center' }}>{(depositPage - 1) * depositPageSize + idx + 1}</td>
                                                            <td className="text-bold" style={{ color: 'var(--primary)' }}>
                                                                <div>{row.QuotationNo || row.ReceiptNo}</div>
                                                                {row.ReceiptNo && row.QuotationNo && row.QuotationNo !== row.ReceiptNo && (
                                                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                                                                        ใบเสร็จ: {row.ReceiptNo}
                                                                    </div>
                                                                )}
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
                                                                    {/* 1. ใบเสนอราคา (Quotation: QT) — แสดงเมื่อมีการอ้างอิงใบเสนอราคา */}
                                                                    {row.QuotationID && (
                                                                        <>
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
                                                                            <ChevronRight size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                                        </>
                                                                    )}

                                                                    {/* สเต็ป 2: RE มัดจำ (แสดงใบเสร็จรับเงินมัดจำใบนี้เสมอ) */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreviewReceiptId(row.DepositReceiptID || row.ReceiptID)}
                                                                        title={`พรีวิวใบเสร็จรับเงินมัดจำ: ${row.DepositReceiptNo || row.ReceiptNo}`}
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

                                                                    {/* สเต็ป 3: ใบวางบิล (BI) */}
                                                                    {(remaining > 0 || Boolean(row.BillingInvoiceID)) && (
                                                                        <>
                                                                            <ChevronRight size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
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
                                                                                        onClick={() => handleCreateBillingInvoice(row.QuotationID || row.ReceiptID, row)}
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
                                                                        </>
                                                                    )}

                                                                    {/* สเต็ป 4: ใบเสร็จรับเงินส่วนที่เหลือ (RE ปิดยอด) - แสดงเมื่อทำ BI แล้ว หรือมี Final Receipt แล้ว */}
                                                                    {(Boolean(row.BillingInvoiceID) || Boolean(row.FinalReceiptID)) && (
                                                                        <>
                                                                            <ChevronRight size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
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
                                                                                    <Eye size={12} /> RE ปิดยอด
                                                                                </button>
                                                                            ) : (
                                                                                (canCreate('sales_receipt') || canCreate('accounts_ar')) && remaining > 0 && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleCreateReceipt(row.QuotationID || row.ReceiptID, 'final', row)}
                                                                                        title="ออกใบเสร็จรับเงินปิดยอดคงเหลือให้ลูกค้า (RE ปิดยอด)"
                                                                                        style={{
                                                                                            display: 'inline-flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '3px',
                                                                                            padding: '4px 8px',
                                                                                            borderRadius: '6px',
                                                                                            fontSize: '11px',
                                                                                            fontWeight: 600,
                                                                                            border: '1px dashed #10b981',
                                                                                            background: '#ffffff',
                                                                                            color: '#047857',
                                                                                            cursor: 'pointer',
                                                                                            whiteSpace: 'nowrap',
                                                                                            flexShrink: 0
                                                                                        }}
                                                                                    >
                                                                                        <Plus size={12} /> RE ปิดยอด
                                                                                    </button>
                                                                                )
                                                                            )}
                                                                        </>
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
                                <PaginationControl
                                    currentPage={depositPage}
                                    totalPages={Math.ceil(filteredDeposits.length / depositPageSize) || 1}
                                    totalItems={filteredDeposits.length}
                                    pageSize={depositPageSize}
                                    onPageChange={setDepositPage}
                                    onPageSizeChange={setDepositPageSize}
                                />
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
                                    {paginatedAP.map((d, idx) => (
                                        <tr key={d.id}>
                                            <td>{(apPage - 1) * apPageSize + idx + 1}</td>
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
                            <PaginationControl
                                currentPage={apPage}
                                totalPages={Math.ceil(filteredAP.length / apPageSize) || 1}
                                totalItems={filteredAP.length}
                                pageSize={apPageSize}
                                onPageChange={setApPage}
                                onPageSizeChange={setApPageSize}
                            />
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
                        <div style={{ flex: 1, overflow: 'auto', padding: '24px 0', background: '#ffffff' }}>
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
                        <div style={{ flex: 1, overflow: 'auto', padding: '24px 0', background: '#ffffff' }}>
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
                        <div style={{ flex: 1, overflow: 'auto', padding: '24px 0', background: '#ffffff' }}>
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

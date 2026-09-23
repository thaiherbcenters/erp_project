import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import {
    Plus,
    Trash2,
    Save,
    RefreshCw,
    Printer,
    ArrowLeft,
    Search,
    Eye,
    Pencil,
    FileText,
    History,
    Check,
    X,
    Settings,
    RotateCcw
} from 'lucide-react';
import EliteBookingOrderPrint from '../components/EliteBookingOrderPrint';
import { useSignatures } from '../hooks/useSignatures';
import PaginationControl from '../components/PaginationControl';
import CustomDatePicker from '../components/CustomDatePicker';
import TaxIdInput from '../components/TaxIdInput';
import { TipTapCell } from '../components/TipTapCell';
import CustomSelect from '../components/CustomSelect';
import BankAccountSelect, { getPinnedBankAccount } from '../components/BankAccountSelect';
import { searchThaiAddress } from '../utils/thaiAddress';
import { numberToThaiBaht } from '../utils/thaiBahtConverter';
import { parseAddressStringToSplit } from '../utils/formatters';
import { FilterToggleButton, SalesDocFilterDrawer } from '../components/SalesDocFilter';
import './PageCommon.css';

const DEFAULT_BOOKING_REMARKS = `<p><strong>หมายเหตุ:</strong></p><p>1. เอกสารฉบับนี้ใช้เป็นหลักฐานการสั่งจองพื้นที่/สินค้าตามรายการที่ระบุไว้ข้างต้น</p><p>2. กรุณาชำระเงินมัดจำตามกำหนดเวลาเพื่อยืนยันสิทธิ์การจอง</p><p>3. ยอดคงเหลือที่ต้องชำระ ให้ชำระก่อนหรือในวันส่งมอบพื้นที่/สินค้า</p><p>4. การจองจะสมบูรณ์เมื่อ บริษัท อิลิท เทรดดิ้ง 2020 จำกัด ได้รับเงินมัดจำเรียบร้อยแล้ว</p>`;

const DEFAULT_SPACE_DATA = `ออฟฟิศ|ออฟฟิศ|140|ว่าง
โซน A|A1|60|ว่าง
โซน A|A2|60|ว่าง
โซน A|ร้านขายอาหารสัตว์|60|จองแล้ว: ร้านขายอาหารสัตว์
โซน A|A4|60|ว่าง
โซน A|A5|60|ว่าง
โซน A|A6|84|ว่าง
โซน B|กาแฟพันธุ์ไทย|551|จองแล้ว: พันธุ์ไทย
โซน B|B2|30|ว่าง
โซน B|B3|30|ว่าง
โซน B|B4|30|ว่าง
โซน B|B5|30|ว่าง
โซน B|B6|30|ว่าง
โซน B|B7|42|ว่าง
โซน B|ร้านส้มตำ|84|จองแล้ว: ร้านส้มตำ
โซน B|B9|60|ว่าง
โซน B|B10|60|ว่าง
โซน B|B11|60|ว่าง
โซน B|B12|60|ว่าง
โซน B|ร้านขายผลไม้|60|จองแล้ว: ร้านขายผลไม้
โซน W|W1 ร้านไวน์|96|จองแล้ว: ร้านไวน์
โซน W|W2 ร้านไวน์|96|จองแล้ว: ร้านไวน์
โซน C|C1|112|ว่าง
โซน C|C2|112|ว่าง
โซน C|C3|112|ว่าง
โซน C|C4|112|ว่าง
โซน C|C5|112|ว่าง
โซน C|C6|112|ว่าง
โซน C|C7|112|ว่าง
โซน C|C8|120|ว่าง
โซน C|C9|120|ว่าง
โซน C|C10|120|ว่าง
โซน C|C11|120|ว่าง
โซน C|C12|120|ว่าง
โซน C|คาร์แคร์|240|จองแล้ว: คาร์แคร์
โซน D|ซาวน่า|1680|ว่าง`;

const parseSpaceData = (rawText) => {
    const raw = rawText || DEFAULT_SPACE_DATA;
    return raw.split('\n')
        .map(l => l.trim())
        .filter(l => l !== '')
        .map((line, idx) => {
            const parts = line.split('|');
            const zone = parts[0] ? parts[0].trim() : '-';
            const name = parts[1] ? parts[1].trim() : '-';
            const size = parseFloat(parts[2]) || 0;
            const statusRaw = parts[3] ? parts[3].trim() : 'ว่าง';
            const isBooked = statusRaw.includes('จองแล้ว') || statusRaw.includes('ขายแล้ว');
            const booker = isBooked && statusRaw.includes(':') ? statusRaw.split(':')[1].trim() : '';
            return {
                id: `sp_${idx}_${name}`,
                zone,
                name,
                size,
                status: isBooked ? 'จองแล้ว' : 'ว่าง',
                booker,
                rawStatus: statusRaw,
                key: `${zone}|${name}|${size}|${booker}`
            };
        });
};

export default function EliteBookingOrder() {
    const { token, canCreate, canUpdate, canDelete } = useAuth();
    const { showAlert } = useAlert();
    const { signatures: availableSignatures, userSignatures, getSignatureUrl, defaultSignerKey } = useSignatures();

    // View state: 'list' | 'form'
    const [viewMode, setViewMode] = useState('list');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(false);

    // List & Filters
    const [bookingOrders, setBookingOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showFilter, setShowFilter] = useState(false);
    const [usersList, setUsersList] = useState([]);
    const [filter, setFilter] = useState({
        status: '',
        createdBy: '',
        dateFrom: '',
        dateTo: ''
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPagination(prev => ({ ...prev, page: 1 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Load users list for creator filter
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const authToken = token || localStorage.getItem('erp_token') || localStorage.getItem('token');
                const res = await fetch('/api/users', {
                    headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
                });
                const data = await res.json();
                if (Array.isArray(data)) {
                    setUsersList(data);
                } else if (data.success && Array.isArray(data.users || data.data)) {
                    setUsersList(data.users || data.data);
                }
            } catch (err) {
                console.error('Error loading users:', err);
            }
        };
        fetchUsers();
    }, [token]);

    const activeFilterCount = [
        Boolean(filter.status && filter.status !== 'all'),
        Boolean(filter.createdBy && filter.createdBy !== 'all'),
        Boolean(filter.dateFrom || filter.dateTo)
    ].filter(Boolean).length;

    const handleFilterChange = (field, value) => {
        setFilter(prev => ({ ...prev, [field]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleResetFilter = () => {
        setFilter({
            status: '',
            createdBy: '',
            dateFrom: '',
            dateTo: ''
        });
        setPagination(prev => ({ ...prev, page: 1 }));
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
        setPagination(prev => ({ ...prev, page: 1 }));
        if (type === 'today') {
            setFilter(prev => ({ ...prev, dateFrom: todayStr, dateTo: todayStr }));
        } else if (type === '7days') {
            const d7 = new Date();
            d7.setDate(d7.getDate() - 6);
            setFilter(prev => ({ ...prev, dateFrom: format(d7), dateTo: todayStr }));
        } else if (type === 'thisMonth') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setFilter(prev => ({ ...prev, dateFrom: format(startOfMonth), dateTo: format(endOfMonth) }));
        } else if (type === 'thisYear') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const endOfYear = new Date(now.getFullYear(), 11, 31);
            setFilter(prev => ({ ...prev, dateFrom: format(startOfYear), dateTo: format(endOfYear) }));
        }
    };

    // Form data
    const [editingId, setEditingId] = useState(null);
    const [docNo, setDocNo] = useState('');
    const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
    const [deliverTo, setDeliverTo] = useState('-');
    const [contactPerson, setContactPerson] = useState('-');
    const [reference, setReference] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [address, setAddress] = useState({
        no: '', soi: '', road: '', subdistrict: '', district: '', province: '', zipcode: ''
    });
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerTaxId, setCustomerTaxId] = useState('');

    const getDefaultItems = () => [
        { id: 1, desc: 'ค่าจองพื้นที่ โซน/ล็อก ........', qty: 1, unit: 'รายการ', price: 0, amount: 0 }
    ];

    const [items, setItems] = useState(getDefaultItems);

    // Extra Calculation States (Discount, VAT, Deposit)
    const [enableDiscount, setEnableDiscount] = useState(false);
    const [discountPercent, setDiscountPercent] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);

    const [enableVat, setEnableVat] = useState(false);
    const [vatType, setVatType] = useState('none');

    const [enableDeposit, setEnableDeposit] = useState(false);
    const [depositPercent, setDepositPercent] = useState('50');
    const [depositAmount, setDepositAmount] = useState(0);

    const getInitialRemarks = () => {
        try {
            const saved = localStorage.getItem('TemplateNotes_EliteBookingOrder');
            if (saved && saved.trim()) {
                let html = saved;
                if (!/<[a-z][\s\S]*>/i.test(html)) {
                    html = html.split('\n').filter(line => line.trim()).map(line => `<p>${line.trim()}</p>`).join('');
                }
                if (!/หมายเหตุ|เงื่อนไข/i.test(html)) {
                    html = `<p><strong>หมายเหตุ:</strong></p>${html}`;
                    localStorage.setItem('TemplateNotes_EliteBookingOrder', html);
                }
                return html;
            }
        } catch (e) {
            console.error('Error reading TemplateNotes_EliteBookingOrder:', e);
        }
        return DEFAULT_BOOKING_REMARKS;
    };

    const [remarks, setRemarks] = useState(getInitialRemarks);
    const [isRemarksAutoSaved, setIsRemarksAutoSaved] = useState(false);
    const autoSaveTimerRef = useRef(null);

    const handleRemarksChange = (html) => {
        setRemarks(html);
        localStorage.setItem('TemplateNotes_EliteBookingOrder', html);
        setIsRemarksAutoSaved(true);
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            setIsRemarksAutoSaved(false);
        }, 2500);
    };

    const handleResetRemarks = () => {
        if (window.confirm('คุณต้องการคืนค่าหมายเหตุเป็นข้อความเริ่มต้นใช่หรือไม่?')) {
            setRemarks(DEFAULT_BOOKING_REMARKS);
            localStorage.setItem('TemplateNotes_EliteBookingOrder', DEFAULT_BOOKING_REMARKS);
            setIsRemarksAutoSaved(true);
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(() => {
                setIsRemarksAutoSaved(false);
            }, 2500);
            showAlert('สำเร็จ', 'คืนค่าหมายเหตุเริ่มต้นเรียบร้อยแล้ว', 'info');
        }
    };
    const [signer, setSigner] = useState('none');

    // Auto-select user signature when creating a new booking order
    useEffect(() => {
        if (!editingId && defaultSignerKey) {
            setSigner(prev => (prev === 'none' || !prev ? defaultSignerKey : prev));
        }
    }, [defaultSignerKey, editingId]);

    // Available signatures for dropdown (own signatures for normal users, all for admin, plus current signer if editing)
    const displaySignatures = useMemo(() => {
        const list = [...(userSignatures && userSignatures.length > 0 ? userSignatures : availableSignatures)];
        if (signer && signer !== 'none' && !list.some(s => s.KeyName === signer)) {
            const found = availableSignatures.find(s => s.KeyName === signer);
            if (found) list.push(found);
        }
        return list;
    }, [userSignatures, availableSignatures, signer]);

    // Helper to retrieve signer image and signer name
    const getSignerInfo = useCallback((signerKey) => {
        if (!signerKey || signerKey === 'none') {
            return { signerImage: null, signerName: '' };
        }
        const sigObj = (availableSignatures || []).find(s => s.KeyName === signerKey);
        if (sigObj) {
            return {
                signerImage: getSignatureUrl(sigObj.ImagePath || sigObj.SignatureImg),
                signerName: sigObj.FullName || ''
            };
        }
        if (signerKey === 'authorized') {
            return {
                signerImage: null,
                signerName: 'ผู้มีอำนาจลงนาม บจก. อิลิท เทรดดิ้ง 2020'
            };
        }
        return { signerImage: null, signerName: '' };
    }, [availableSignatures, getSignatureUrl]);

    const [bankAccount, setBankAccount] = useState(() => getPinnedBankAccount('booking_order_elt') || 'kbank_elite_2020');

    // Preview data container
    const [previewData, setPreviewData] = useState(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const printContainerRef = useRef(null);

    // Revision & History State
    const [revision, setRevision] = useState(0);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historyDocNo, setHistoryDocNo] = useState('');

    // Space Management State
    const [spaceDataRaw, setSpaceDataRaw] = useState(() => {
        return localStorage.getItem('elite_space_data') || localStorage.getItem('elite_spaces_data') || localStorage.getItem('psf_spaces_data') || DEFAULT_SPACE_DATA;
    });
    const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
    const [editingSpaces, setEditingSpaces] = useState([]);

    const spaceList = useMemo(() => parseSpaceData(spaceDataRaw), [spaceDataRaw]);
    const groupedSpaces = useMemo(() => {
        const groups = {};
        spaceList.forEach(s => {
            const z = s.zone || 'ทั่วไป';
            if (!groups[z]) groups[z] = [];
            groups[z].push(s);
        });
        return groups;
    }, [spaceList]);

    // Address auto-suggest
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [activeAddressField, setActiveAddressField] = useState(null);

    const handleAddressChange = (field, value) => {
        setAddress(prev => ({ ...prev, [field]: value }));
    };

    const handleAddressSearch = (field, searchType, val) => {
        handleAddressChange(field, val);
        if (val && val.trim().length >= 2) {
            const res = searchThaiAddress(searchType, val, 30);
            setAddressSuggestions(res);
            setActiveAddressField(searchType);
        } else {
            setAddressSuggestions([]);
            setActiveAddressField(null);
        }
    };

    const handleSelectThaiAddress = (item) => {
        setAddress(prev => ({
            ...prev,
            subdistrict: item.district || '',
            district: item.amphoe || '',
            province: item.province || '',
            zipcode: item.zipcode || ''
        }));
        setAddressSuggestions([]);
        setActiveAddressField(null);
    };

    const renderAddressSuggestions = (searchType, currentVal) => {
        if (activeAddressField !== searchType) return null;
        if (!currentVal || currentVal.trim().length < 2) return null;

        return (
            <ul
                onMouseDown={(e) => e.preventDefault()}
                style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    width: '100%',
                    minWidth: '280px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    zIndex: 1000,
                    margin: 0,
                    padding: '4px',
                    listStyle: 'none',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)'
                }}
            >
                {addressSuggestions.length > 0 ? (
                    addressSuggestions.map((item, i) => (
                        <li
                            key={i}
                            onClick={() => handleSelectThaiAddress(item)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                marginBottom: '2px',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>
                                ต.{item.district} อ.{item.amphoe}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>จ.{item.province}</span>
                                <span style={{
                                    background: '#e2e8f0',
                                    color: '#334155',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 500,
                                    fontSize: '11px'
                                }}>
                                    {item.zipcode}
                                </span>
                            </div>
                        </li>
                    ))
                ) : (
                    <li style={{ padding: '10px 12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                        ไม่พบที่อยู่ที่ตรงกับ "{currentVal}"
                    </li>
                )}
            </ul>
        );
    };

    const fullCustomerAddress = useMemo(() => {
        const parts = [];
        if (address.no) parts.push(address.no);
        if (address.soi) parts.push(`ซอย${address.soi}`);
        if (address.road) parts.push(`ถนน${address.road}`);
        if (address.subdistrict) parts.push(`ต.${address.subdistrict}`);
        if (address.district) parts.push(`อ.${address.district}`);
        if (address.province) parts.push(`จ.${address.province}`);
        if (address.zipcode) parts.push(address.zipcode);
        return parts.join(' ');
    }, [address]);

    // ── Calculations ──
    const subtotal = useMemo(() => {
        return items.reduce((sum, it) => {
            if (it.isHeading) return sum;
            if (it.amount !== undefined && it.amount !== null && it.amount !== '') {
                return sum + (parseFloat(it.amount) || 0);
            }
            if (it.amount === '') {
                return sum;
            }
            const q = parseFloat(it.qty) || 0;
            const p = parseFloat(it.price) || 0;
            return sum + (q * p);
        }, 0);
    }, [items]);

    useEffect(() => {
        if (!enableDiscount) {
            setDiscountAmount(0);
            return;
        }
        if (discountPercent !== '' && !isNaN(discountPercent)) {
            const pct = parseFloat(discountPercent) || 0;
            setDiscountAmount((subtotal * pct) / 100);
        }
    }, [enableDiscount, discountPercent, subtotal]);

    const afterDiscount = useMemo(() => {
        const val = subtotal - (enableDiscount ? discountAmount : 0);
        return val > 0 ? val : 0;
    }, [subtotal, enableDiscount, discountAmount]);

    const vat = useMemo(() => {
        if (!enableVat || vatType !== '7') return 0;
        return afterDiscount * 0.07;
    }, [enableVat, vatType, afterDiscount]);

    const grandTotal = useMemo(() => {
        return afterDiscount + vat;
    }, [afterDiscount, vat]);

    useEffect(() => {
        if (!enableDeposit) {
            setDepositAmount(0);
            return;
        }
        if (depositPercent !== '' && !isNaN(depositPercent)) {
            const pct = parseFloat(depositPercent) || 0;
            setDepositAmount((grandTotal * pct) / 100);
        }
    }, [enableDeposit, depositPercent, grandTotal]);

    const remainingBalance = useMemo(() => {
        if (!enableDeposit) return 0;
        const bal = grandTotal - depositAmount;
        return bal > 0 ? bal : 0;
    }, [enableDeposit, grandTotal, depositAmount]);

    // ── Format Date Thai ──
    const formatDateThai = (dateStr) => {
        if (!dateStr) return '-';
        if (typeof dateStr === 'object') {
            dateStr = dateStr.target?.value || dateStr.value || '';
        }
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = d.getFullYear() + 543;
        return `${day}/${month}/${year}`;
    };

    // ── Fetch Booking Orders List ──
    const fetchBookingOrders = useCallback(async (page = 1, query = '', filters = {}, limit = 10) => {
        setIsLoadingList(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });
            if (query && query.trim()) params.append('search', query.trim());
            if (filters.status && filters.status !== 'all') params.append('status', filters.status);
            if (filters.createdBy && filters.createdBy !== 'all') params.append('createdBy', filters.createdBy);
            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.append('dateTo', filters.dateTo);

            const authToken = token || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const res = await fetch(`/api/elite-booking-orders?${params.toString()}`, {
                headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
            });
            const data = await res.json();
            if (data.success) {
                setBookingOrders(data.data || []);
                if (data.pagination) {
                    setPagination(data.pagination);
                }
            } else {
                showAlert('แจ้งเตือน', data.message || 'ไม่สามารถโหลดข้อมูลได้', 'error');
            }
        } catch (err) {
            console.error('Error loading booking orders:', err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อโหลดข้อมูลรายการได้', 'error');
        } finally {
            setIsLoadingList(false);
        }
    }, [token, showAlert]);

    useEffect(() => {
        fetchBookingOrders(pagination.page, debouncedSearch, filter, pagination.limit);
    }, [fetchBookingOrders, pagination.page, debouncedSearch, filter]);

    // ── Fetch Next Doc Number ──
    const fetchNextNumber = async (date) => {
        try {
            const dateStr = typeof date === 'string' ? date : (date?.target?.value || date?.value || docDate);
            const res = await fetch(`/api/elite-booking-orders/next-number?date=${dateStr || ''}`);
            const data = await res.json();
            if (data.success && data.nextNumber) {
                setDocNo(data.nextNumber);
            }
        } catch (err) {
            console.error('Error getting next number:', err);
        }
    };

    // ── Open Create Form ──
    const handleCreateNew = () => {
        setEditingId(null);
        setRevision(0);
        const today = new Date().toISOString().split('T')[0];
        setDocDate(today);
        setDeliverTo('-');
        setContactPerson('-');
        setReference('');
        setCustomerName('');
        setAddress({ no: '', soi: '', road: '', subdistrict: '', district: '', province: '', zipcode: '' });
        setCustomerPhone('');
        setCustomerTaxId('');
        setItems(getDefaultItems());

        setEnableDiscount(false);
        setDiscountPercent('');
        setDiscountAmount(0);
        setEnableVat(false);
        setVatType('none');
        setEnableDeposit(false);
        setDepositPercent('50');
        setDepositAmount(0);

        setRemarks(getInitialRemarks());
        setSigner(defaultSignerKey || 'none');
        setBankAccount(getPinnedBankAccount('booking_order_elt') || 'kbank_elite_2020');
        fetchNextNumber(today);
        setViewMode('form');
    };

    // ── Open Edit Form ──
    const handleEdit = (bo) => {
        setEditingId(bo.id);
        setRevision(bo.Revision || 0);
        setDocNo(bo.DocNo || '');
        setDocDate(bo.DocDate ? bo.DocDate.split('T')[0] : new Date().toISOString().split('T')[0]);
        setDeliverTo(bo.DeliverTo || '-');
        setContactPerson(bo.ContactPerson || '-');
        setReference(bo.Reference || '');
        setCustomerName(bo.CustomerName || '');

        const parsedAddr = parseAddressStringToSplit(bo.CustomerAddress || '');
        if (parsedAddr.addr_subdistrict || parsedAddr.addr_district || parsedAddr.addr_province) {
            setAddress({
                no: parsedAddr.addr_no || '',
                soi: parsedAddr.addr_soi || '',
                road: parsedAddr.addr_road || '',
                subdistrict: parsedAddr.addr_subdistrict || '',
                district: parsedAddr.addr_district || '',
                province: parsedAddr.addr_province || '',
                zipcode: parsedAddr.addr_zip || ''
            });
        } else {
            setAddress({
                no: bo.CustomerAddress || '',
                soi: '',
                road: '',
                subdistrict: '',
                district: '',
                province: '',
                zipcode: ''
            });
        }

        setCustomerPhone(bo.CustomerPhone || '');
        setCustomerTaxId(bo.CustomerTaxId || '');

        let loadedItems = getDefaultItems();
        try {
            const parsed = JSON.parse(bo.ItemsJSON || '[]');
            if (parsed.length > 0) {
                loadedItems = parsed.map(item => ({
                    ...item,
                    amount: item.amount !== undefined && item.amount !== null
                        ? item.amount
                        : parseFloat(((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)).toFixed(2))
                }));
            }
        } catch {}
        setItems(loadedItems);

        if (bo.Discount && Number(bo.Discount) > 0) {
            setEnableDiscount(true);
            setDiscountAmount(Number(bo.Discount));
            setDiscountPercent(bo.DiscountPercent || '');
        } else {
            setEnableDiscount(false);
            setDiscountPercent('');
            setDiscountAmount(0);
        }

        setEnableVat(Boolean(bo.IncludeVat));
        setVatType(Boolean(bo.IncludeVat) ? '7' : 'none');

        if (bo.DepositAmount && Number(bo.DepositAmount) > 0) {
            setEnableDeposit(true);
            setDepositAmount(Number(bo.DepositAmount));
            setDepositPercent(bo.DepositPercent || '');
        } else {
            setEnableDeposit(false);
            setDepositPercent('');
            setDepositAmount(0);
        }

        let loadedRemarks = bo.Remarks;
        if (!loadedRemarks || !loadedRemarks.trim()) {
            loadedRemarks = getInitialRemarks();
        } else {
            if (!/<[a-z][\s\S]*>/i.test(loadedRemarks)) {
                loadedRemarks = loadedRemarks.split('\n').filter(line => line.trim()).map(line => `<p>${line.trim()}</p>`).join('');
            }
            if (!/หมายเหตุ|เงื่อนไข/i.test(loadedRemarks)) {
                loadedRemarks = `<p><strong>หมายเหตุ:</strong></p>${loadedRemarks}`;
            }
        }
        setRemarks(loadedRemarks);
        setSigner(bo.Signer || 'none');
        setBankAccount(bo.BankAccount || getPinnedBankAccount('booking_order_elt') || 'kbank_elite_2020');
        setViewMode('form');
    };

    // ── Open Preview From Table List ──
    const handleViewPreview = (bo) => {
        let parsedItems = [];
        try {
            parsedItems = JSON.parse(bo.ItemsJSON || '[]');
        } catch {
            parsedItems = [];
        }

        const { signerImage, signerName } = getSignerInfo(bo.Signer);

        setPreviewData({
            docNo: bo.DocNo,
            docDate: bo.DocDate,
            revision: bo.Revision || 0,
            deliverTo: bo.DeliverTo || '-',
            contactPerson: bo.ContactPerson || '-',
            reference: bo.Reference,
            customerName: bo.CustomerName,
            customerAddress: bo.CustomerAddress,
            customerPhone: bo.CustomerPhone,
            customerTaxId: bo.CustomerTaxId,
            items: parsedItems,
            subtotal: bo.Subtotal,
            discount: bo.Discount,
            discountPercent: bo.DiscountPercent || 0,
            vat: bo.Vat,
            grandTotal: bo.GrandTotal,
            depositPercent: bo.DepositPercent || 0,
            depositAmount: bo.DepositAmount || 0,
            remainingBalance: bo.RemainingBalance !== undefined ? bo.RemainingBalance : ((bo.GrandTotal || 0) - (bo.DepositAmount || 0)),
            remarks: bo.Remarks,
            signer: bo.Signer,
            signerImage,
            signerName,
            bankAccount: bo.BankAccount,
            includeVat: Boolean(bo.IncludeVat)
        });
        setIsPreviewModalOpen(true);
    };

    // ── Open Live Preview From Form ──
    const handleFormPreview = () => {
        const preparedItems = items.map(it => {
            if (it.isHeading) return it;
            const q = parseFloat(it.qty) || 0;
            const p = parseFloat(it.price) || 0;
            const amt = it.amount !== undefined && it.amount !== null && it.amount !== ''
                ? (parseFloat(it.amount) || 0)
                : (q * p);
            return {
                ...it,
                qty: it.qty !== '' ? (parseFloat(it.qty) || 0) : 0,
                price: it.price !== '' ? (parseFloat(it.price) || 0) : 0,
                amount: amt
            };
        });

        const { signerImage, signerName } = getSignerInfo(signer);

        setPreviewData({
            docNo,
            docDate,
            revision,
            deliverTo: deliverTo || '-',
            contactPerson: contactPerson || '-',
            reference,
            customerName,
            customerAddress: fullCustomerAddress,
            customerPhone,
            customerTaxId,
            items: preparedItems,
            subtotal,
            discount: enableDiscount ? discountAmount : 0,
            discountPercent: enableDiscount ? (parseFloat(discountPercent) || 0) : 0,
            vat: enableVat ? vat : 0,
            grandTotal,
            depositPercent: enableDeposit ? (parseFloat(depositPercent) || 0) : 0,
            depositAmount: enableDeposit ? depositAmount : 0,
            remainingBalance: enableDeposit ? remainingBalance : 0,
            remarks,
            signer,
            signerImage,
            signerName,
            bankAccount,
            includeVat: enableVat
        });
        setIsPreviewModalOpen(true);
    };

    // ── Open History Modal ──
    const handleOpenHistory = async (bo) => {
        setHistoryDocNo(bo.DocNo);
        setIsHistoryModalOpen(true);
        setIsLoadingHistory(true);
        try {
            const authToken = token || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const res = await fetch(`/api/elite-booking-orders/${bo.id}/history`, {
                headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
            });
            const data = await res.json();
            if (data.success) {
                setHistoryList(data.data || []);
            } else {
                showAlert('แจ้งเตือน', data.message || 'ไม่สามารถดึงประวัติได้', 'error');
            }
        } catch (err) {
            console.error('Error fetching history:', err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ประวัติได้', 'error');
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // ── View History Record Detail ──
    const handleViewHistoryDetail = async (historyId) => {
        try {
            const authToken = token || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const res = await fetch(`/api/elite-booking-orders/history/${historyId}`, {
                headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
            });
            const data = await res.json();
            if (data.success && data.data) {
                const h = data.data;
                let parsedItems = [];
                try {
                    parsedItems = JSON.parse(h.ItemsJSON || '[]');
                } catch {
                    parsedItems = [];
                }

                const { signerImage, signerName } = getSignerInfo(h.Signer);

                setPreviewData({
                    docNo: h.DocNo,
                    docDate: h.DocDate,
                    revision: h.Revision,
                    deliverTo: h.DeliverTo || '-',
                    contactPerson: h.ContactPerson || '-',
                    reference: h.Reference,
                    customerName: h.CustomerName,
                    customerAddress: h.CustomerAddress,
                    customerPhone: h.CustomerPhone,
                    customerTaxId: h.CustomerTaxId,
                    items: parsedItems,
                    subtotal: h.Subtotal,
                    discount: h.Discount,
                    discountPercent: h.DiscountPercent || 0,
                    vat: h.Vat,
                    grandTotal: h.GrandTotal,
                    depositPercent: h.DepositPercent || 0,
                    depositAmount: h.DepositAmount || 0,
                    remainingBalance: h.RemainingBalance !== undefined ? h.RemainingBalance : ((h.GrandTotal || 0) - (h.DepositAmount || 0)),
                    remarks: h.Remarks,
                    signer: h.Signer,
                    signerImage,
                    signerName,
                    bankAccount: h.BankAccount,
                    includeVat: Boolean(h.IncludeVat)
                });
                setIsPreviewModalOpen(true);
            }
        } catch (err) {
            console.error('Error loading history detail:', err);
        }
    };

    // ── Restore History Record ──
    const handleRestoreHistory = async (bookingId, historyId, rev) => {
        if (!window.confirm(`ยืนยันการกู้คืนข้อมูลใบสั่งจองเป็นเวอร์ชัน v.${rev} ใช่หรือไม่?`)) return;
        try {
            const authToken = token || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const res = await fetch(`/api/elite-booking-orders/${bookingId}/restore/${historyId}`, {
                method: 'POST',
                headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
            });
            const data = await res.json();
            if (data.success) {
                showAlert('สำเร็จ', data.message || `กู้คืนเป็นเวอร์ชัน v.${rev} เรียบร้อยแล้ว`, 'success');
                setIsHistoryModalOpen(false);
                fetchBookingOrders(pagination.page, debouncedSearch, filter, pagination.limit);
            } else {
                showAlert('ข้อผิดพลาด', data.message || 'ไม่สามารถกู้คืนได้', 'error');
            }
        } catch (err) {
            console.error('Restore error:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    };

    // ── Print Iframe Trigger ──
    const handlePrintDocument = () => {
        const printContent = printContainerRef.current;
        if (!printContent) {
            window.print();
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${previewData?.docNo ? `ใบสั่งจอง_${previewData.docNo}` : 'ใบสั่งจอง'}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    * { 
                        margin: 0; 
                        padding: 0; 
                        box-sizing: border-box; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    @page { 
                        size: A4 portrait; 
                        margin: 5mm 9.5mm; 
                    }
                    html, body { 
                        width: 100% !important; 
                        height: auto !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background: #ffffff !important; 
                        font-family: 'Sarabun', sans-serif; 
                    }
                    .elite-print-paper { 
                        width: 100% !important; 
                        max-width: 100% !important; 
                        min-height: auto !important; 
                        margin: 0 !important; 
                        padding: 2mm 1.5mm !important; 
                        box-shadow: none !important; 
                        border: none !important; 
                        box-sizing: border-box !important;
                        page-break-inside: avoid !important;
                        page-break-after: avoid !important;
                    }
                    .booking-items-table-container {
                        border: 1.5px solid #1a7a3a !important;
                        border-radius: 8px !important;
                        overflow: hidden !important;
                        margin-bottom: 8px !important;
                        box-sizing: border-box !important;
                    }
                    .customer-info-box,
                    .doc-info-box,
                    .signature-box {
                        border: 1.5px solid #1a7a3a !important;
                        border-radius: 8px !important;
                        box-sizing: border-box !important;
                    }
                    .print-remarks-content p {
                        margin: 0 0 2px 0 !important;
                    }
                </style>
            </head>
            <body>
                ${printContent.outerHTML || printContent.innerHTML}
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    };

    // ── Delete Booking Order ──
    const handleDelete = async (id, no) => {
        if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบใบสั่งจองเลขที่ "${no}" ?`)) {
            return;
        }

        try {
            const authToken = token || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const res = await fetch(`/api/elite-booking-orders/${id}`, {
                method: 'DELETE',
                headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
            });
            const data = await res.json();
            if (data.success) {
                showAlert('สำเร็จ', `ลบเอกสารเลขที่ ${no} เรียบร้อยแล้ว`, 'success');
                fetchBookingOrders(pagination.page, debouncedSearch, filter, pagination.limit);
            } else {
                showAlert('ข้อผิดพลาด', data.message || 'ไม่สามารถลบเอกสารได้', 'error');
            }
        } catch (err) {
            console.error('Delete error:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    };

    // ── Form helpers ──
    const addItem = () => {
        setItems([...items, { id: Date.now(), desc: '', qty: 1, unit: 'รายการ', price: 0, amount: 0 }]);
    };

    const addHeading = () => {
        setItems([...items, { id: Date.now(), desc: '', isHeading: true }]);
    };

    const removeItem = (id) => {
        if (items.length <= 1) {
            setItems([{ id: Date.now(), desc: '', qty: 1, unit: 'รายการ', price: 0, amount: 0 }]);
            return;
        }
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            if (field === 'qty' || field === 'price') {
                const rawQ = field === 'qty' ? value : item.qty;
                const rawP = field === 'price' ? value : item.price;
                const q = parseFloat(rawQ);
                const p = parseFloat(rawP);
                if (!isNaN(q) && !isNaN(p)) {
                    updated.amount = parseFloat((q * p).toFixed(2));
                } else if (rawQ === '' || rawP === '') {
                    updated.amount = '';
                }
            } else if (field === 'amount') {
                const amt = parseFloat(value);
                const q = parseFloat(item.qty) || 0;
                if (!isNaN(amt) && q > 0) {
                    updated.price = parseFloat((amt / q).toFixed(2));
                }
            }
            return updated;
        }));
    };

    const moveItem = (index, direction) => {
        const newItems = [...items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newItems.length) return;
        const temp = newItems[index];
        newItems[index] = newItems[targetIndex];
        newItems[targetIndex] = temp;
        setItems(newItems);
    };

    // ── Save Form ──
    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!customerName.trim()) {
            showAlert('กรุณากรอกข้อมูล', 'กรุณาระบุชื่อลูกค้าหรือบริษัท', 'warning');
            return;
        }

        setIsLoading(true);
        try {
            const preparedItems = items.map(it => {
                if (it.isHeading) return it;
                const q = parseFloat(it.qty) || 0;
                const p = parseFloat(it.price) || 0;
                const amt = it.amount !== undefined && it.amount !== null && it.amount !== ''
                    ? (parseFloat(it.amount) || 0)
                    : (q * p);
                return {
                    ...it,
                    qty: it.qty !== '' ? (parseFloat(it.qty) || 0) : 0,
                    price: it.price !== '' ? (parseFloat(it.price) || 0) : 0,
                    amount: amt
                };
            });

            const payload = {
                docDate,
                deliverTo,
                contactPerson,
                reference,
                customerName: customerName.trim(),
                customerAddress: fullCustomerAddress,
                customerPhone,
                customerTaxId,
                items: preparedItems,
                subtotal,
                discount: enableDiscount ? discountAmount : 0,
                discountPercent: enableDiscount ? (parseFloat(discountPercent) || 0) : 0,
                vat: enableVat ? vat : 0,
                grandTotal,
                depositPercent: enableDeposit ? (parseFloat(depositPercent) || 0) : 0,
                depositAmount: enableDeposit ? depositAmount : 0,
                remainingBalance: enableDeposit ? remainingBalance : 0,
                remarks,
                signer,
                bankAccount,
                includeVat: enableVat,
                status: 'พร้อมใช้'
            };

            const authToken = token || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const url = editingId ? `/api/elite-booking-orders/${editingId}` : '/api/elite-booking-orders';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                showAlert('สำเร็จ', editingId ? 'บันทึกการแก้ไขใบสั่งจองเรียบร้อยแล้ว' : 'สร้างใบสั่งจองใหม่เรียบร้อยแล้ว', 'success');
                setViewMode('list');
                fetchBookingOrders(pagination.page, debouncedSearch, filter, pagination.limit);
            } else {
                showAlert('ข้อผิดพลาด', data.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            }
        } catch (err) {
            console.error('Save error:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Space Selector Integration ──
    const handleSpaceSelect = (e) => {
        const selectedKey = e.target.value;
        if (!selectedKey) return;

        const target = spaceList.find(s => s.key === selectedKey);
        if (target) {
            const desc = `ค่าจองพื้นที่ ${target.zone} - ${target.name} (ขนาด ${target.size} ตร.ม.)`;
            setItems(prev => {
                if (prev.length === 1 && (prev[0].desc === 'ค่าจองพื้นที่ โซน/ล็อก ........' || !prev[0].desc?.trim()) && Number(prev[0].price || 0) === 0) {
                    return [{ ...prev[0], desc, qty: 1, unit: 'รายการ', price: 0, amount: 0 }];
                }
                return [
                    ...prev,
                    { id: Date.now(), desc, qty: 1, unit: 'รายการ', price: 0, amount: 0 }
                ];
            });
            showAlert('เพิ่มรายการสำเร็จ', `เพิ่ม "${target.name}" เข้าสู่รายการแล้ว`, 'info');
        }
        e.target.value = '';
    };

    const handleOpenSpaceEditor = () => {
        setEditingSpaces(parseSpaceData(spaceDataRaw));
        setIsSpaceModalOpen(true);
    };

    const handleSaveSpaceEditor = () => {
        const rawLines = editingSpaces.map(sp => {
            const statusStr = sp.status === 'จองแล้ว' && sp.booker ? `จองแล้ว: ${sp.booker}` : sp.status;
            return `${sp.zone}|${sp.name}|${sp.size}|${statusStr}`;
        });
        const finalRaw = rawLines.join('\n');
        setSpaceDataRaw(finalRaw);
        localStorage.setItem('elite_space_data', finalRaw);
        localStorage.setItem('elite_spaces_data', finalRaw);
        localStorage.setItem('psf_spaces_data', finalRaw);
        setIsSpaceModalOpen(false);
        showAlert('สำเร็จ', 'บันทึกข้อมูลล็อกพื้นที่เรียบร้อยแล้ว', 'success');
    };

    // ── Render ──
    return (
        <div className="page-container" style={{ padding: '20px 24px', background: '#f8fafc', minHeight: '100vh' }}>
            
            {/* ══════════════════════════════════════════════════════════════════
                VIEW 1: DATA TABLE LIST
            ══════════════════════════════════════════════════════════════════ */}
            {viewMode === 'list' && (
                <div>
                    {/* Header */}
                    <div className="page-header" style={{ marginBottom: '20px' }}>
                        <div className="header-left">
                            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                                <FileText size={28} color="#10b981" /> ใบสั่งจอง (Booking Order)
                            </h1>
                            <p className="page-subtitle" style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                                สร้างและจัดการข้อมูลเอกสารใบสั่งจอง (ELITE)
                            </p>
                        </div>
                    </div>

                    {/* Search & Actions Toolbar */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                        gap: '12px',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: '1 1 360px', maxWidth: '560px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="พิมพ์เลขที่ใบสั่งจอง / ชื่อลูกค้า / อ้างอิง..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        paddingLeft: '38px',
                                        paddingRight: searchQuery ? '32px' : '12px',
                                        width: '100%',
                                        height: '40px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        outline: 'none',
                                        fontSize: '14px',
                                        background: '#fff',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#94a3b8',
                                            padding: '2px',
                                            display: 'flex'
                                        }}
                                        title="ล้างข้อความค้นหา"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <FilterToggleButton
                                isOpen={showFilter}
                                onClick={() => setShowFilter(prev => !prev)}
                                activeCount={activeFilterCount}
                            />
                        </div>

                        {canCreate('elite_doc_sales_order') && (
                            <button
                                type="button"
                                onClick={handleCreateNew}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: '#10b981',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}
                            >
                                <Plus size={18} /> สร้างใบสั่งจอง
                            </button>
                        )}
                    </div>

                    {/* Advanced Filter Drawer */}
                    <SalesDocFilterDrawer
                        isOpen={showFilter}
                        onClose={() => setShowFilter(false)}
                        filter={filter}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilter}
                        onQuickDate={handleQuickDate}
                        usersList={usersList}
                        docTypeLabel="ใบสั่งจอง"
                        statusOptions={['พร้อมใช้', 'ยกเลิก']}
                    />

                    {/* Table Card */}
                    <div className="table-card card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '60px', color: '#64748b', fontSize: '13px' }}>ลำดับ</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '80px', color: '#64748b', fontSize: '13px' }}>เวอร์ชั่น</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'left', width: '130px', color: '#64748b', fontSize: '13px' }}>เลขที่</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>ลูกค้า</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>มัดจำ (บาท)</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>ยอดรวม (บาท)</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>วันที่</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>สถานะ</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>ผู้สร้าง</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '120px', color: '#64748b', fontSize: '13px' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingList ? (
                                    <tr>
                                        <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                            <RefreshCw className="spin" size={24} style={{ display: 'inline-block', marginBottom: '8px' }} />
                                            <div>กำลังโหลดข้อมูล...</div>
                                        </td>
                                    </tr>
                                ) : bookingOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                            <FileText size={40} color="#cbd5e1" style={{ display: 'inline-block', marginBottom: '10px' }} />
                                            <div>ไม่มีข้อมูลใบสั่งจอง</div>
                                            <p style={{ fontSize: '13px', marginTop: '4px' }}>กดปุ่ม "สร้างใบสั่งจอง" ด้านบนเพื่อเริ่มออกเอกสาร</p>
                                        </td>
                                    </tr>
                                ) : (
                                    bookingOrders.map((bo, idx) => (
                                        <tr key={bo.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>
                                                {(pagination.page - 1) * pagination.limit + idx + 1}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                {(bo.Revision || 0) > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenHistory(bo)}
                                                        title="คลิกเพื่อดูประวัติการแก้ไข (Revision History)"
                                                        style={{
                                                            background: '#e0e7ff',
                                                            color: '#4338ca',
                                                            border: '1px solid #c7d2fe',
                                                            padding: '3px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        v.{bo.Revision}
                                                        <History size={12} />
                                                    </button>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>-</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 14px', fontWeight: '600', color: '#1e293b' }}>
                                                {bo.DocNo}
                                            </td>
                                            <td style={{ padding: '12px 14px', color: '#334155' }}>
                                                {bo.CustomerName}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '600', color: '#0369a1' }}>
                                                {Number(bo.DepositAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>
                                                {Number(bo.GrandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center', color: '#475569' }}>
                                                {formatDateThai(bo.DocDate)}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                <span style={{
                                                    background: bo.Status === 'ยกเลิก' ? '#fee2e2' : '#ecfdf5',
                                                    color: bo.Status === 'ยกเลิก' ? '#b91c1c' : '#047857',
                                                    border: `1px solid ${bo.Status === 'ยกเลิก' ? '#fecaca' : '#a7f3d0'}`,
                                                    padding: '3px 10px',
                                                    borderRadius: '16px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    display: 'inline-block'
                                                }}>
                                                    {bo.Status || 'พร้อมใช้'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 14px', color: '#475569' }}>
                                                {bo.CreatedByName || '-'}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewPreview(bo)}
                                                        title="ดู / พิมพ์เอกสาร"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#2563eb', borderRadius: '4px' }}
                                                    >
                                                        <Eye size={17} />
                                                    </button>
                                                    {(bo.Revision || 0) > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenHistory(bo)}
                                                            title="ประวัติการแก้ไข (Revision History)"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#6366f1', borderRadius: '4px' }}
                                                        >
                                                            <History size={17} />
                                                        </button>
                                                    )}
                                                    {canUpdate('elite_doc_sales_order') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEdit(bo)}
                                                            title="แก้ไขเอกสาร"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#7c3aed', borderRadius: '4px' }}
                                                        >
                                                            <Pencil size={17} />
                                                        </button>
                                                    )}
                                                    {canDelete('elite_doc_sales_order') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(bo.id, bo.DocNo)}
                                                            title="ลบเอกสาร"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#ef4444', borderRadius: '4px' }}
                                                        >
                                                            <Trash2 size={17} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <PaginationControl
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages || 1}
                            totalItems={pagination.total || 0}
                            pageSize={pagination.limit}
                            onPageChange={(newPage) => {
                                setPagination(prev => ({ ...prev, page: newPage }));
                            }}
                        />
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                VIEW 2: FORM VIEW (CREATE / EDIT)
            ══════════════════════════════════════════════════════════════════ */}
            {viewMode === 'form' && (
                <div>
                    {/* Top action / Back button */}
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: '#f59e0b',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)'
                                }}
                            >
                                <ArrowLeft size={16} /> กลับสู่หน้าหลัก
                            </button>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontSize: '20px', fontWeight: '700', margin: '12px 0 4px 0', flexWrap: 'wrap' }}>
                                <FileText size={24} color="#10b981" /> {editingId ? `แก้ไขใบสั่งจอง (${docNo})` : 'ฟอร์มออกใบสั่งจอง'}
                                {editingId && (
                                    <span style={{ fontSize: '13px', background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '3px 10px', borderRadius: '16px', fontWeight: '600', marginLeft: '6px' }}>
                                        {revision > 0 ? `เวอร์ชั่นปัจจุบัน: v.${revision} → เมื่อบันทึกจะเป็น v.${revision + 1}` : 'เมื่อบันทึกจะเป็น v.1'}
                                    </span>
                                )}
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                                {editingId ? 'แก้ไขข้อมูลใบสั่งจอง ระบบจะสำรองประวัติเดิมและปรับเวอร์ชั่นให้อัตโนมัติ' : 'กรุณากรอกข้อมูลเพื่อออกใบสั่งจอง (ELITE)'}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSave}>
                        <div className="elite-form-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) 420px',
                            gap: '24px',
                            alignItems: 'start'
                        }}>
                            {/* ── LEFT COLUMN: Form Inputs ── */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Section 1: ข้อมูลเอกสาร */}
                        <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#15803d', margin: 0, paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                ข้อมูลเอกสาร
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                        เลขที่ใบสั่งจอง
                                    </label>
                                    <input
                                        type="text"
                                        value={docNo}
                                        readOnly
                                        placeholder="(สร้างอัตโนมัติ)"
                                        style={{ width: '100%', height: '38px', padding: '0 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', color: '#15803d', fontSize: '14px' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                        วันที่เอกสาร <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <CustomDatePicker
                                        required
                                        value={docDate}
                                        onChange={(e) => {
                                            const nextDate = e?.target ? e.target.value : (e?.value || e);
                                            setDocDate(nextDate);
                                            if (!editingId) fetchNextNumber(nextDate);
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                        สถานที่ส่ง (Deliver To)
                                    </label>
                                    <input
                                        type="text"
                                        value={deliverTo}
                                        onChange={(e) => setDeliverTo(e.target.value)}
                                        placeholder="เช่น สำนักงาน, หน้าร้าน, ขนส่ง..."
                                        style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                        ผู้ติดต่อ (Contact)
                                    </label>
                                    <input
                                        type="text"
                                        value={contactPerson}
                                        onChange={(e) => setContactPerson(e.target.value)}
                                        placeholder="ชื่อผู้ติดต่อ..."
                                        style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: ข้อมูลลูกค้า */}
                        <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#15803d', margin: 0, paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                ข้อมูลลูกค้า
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                                        ชื่อลูกค้า / บริษัท <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="กรอกชื่อลูกค้าหรือบริษัท..."
                                        style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                        ที่อยู่
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                        <input
                                            type="text"
                                            placeholder="บ้านเลขที่, อาคาร, หมู่"
                                            value={address.no}
                                            onChange={(e) => handleAddressChange('no', e.target.value)}
                                            style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="ซอย (ถ้ามี)"
                                            value={address.soi}
                                            onChange={(e) => handleAddressChange('soi', e.target.value)}
                                            style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="ถนน (ถ้ามี)"
                                            value={address.road}
                                            onChange={(e) => handleAddressChange('road', e.target.value)}
                                            style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                placeholder="แขวง/ตำบล"
                                                value={address.subdistrict}
                                                onChange={(e) => handleAddressSearch('subdistrict', 'subDistrict', e.target.value)}
                                                onFocus={() => {
                                                    if (address.subdistrict?.trim().length >= 2) {
                                                        handleAddressSearch('subdistrict', 'subDistrict', address.subdistrict);
                                                    }
                                                }}
                                                onBlur={() => setTimeout(() => setActiveAddressField(null), 250)}
                                                style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                            />
                                            {renderAddressSuggestions('subDistrict', address.subdistrict)}
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                placeholder="เขต/อำเภอ"
                                                value={address.district}
                                                onChange={(e) => handleAddressSearch('district', 'district', e.target.value)}
                                                onFocus={() => {
                                                    if (address.district?.trim().length >= 2) {
                                                        handleAddressSearch('district', 'district', address.district);
                                                    }
                                                }}
                                                onBlur={() => setTimeout(() => setActiveAddressField(null), 250)}
                                                style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                            />
                                            {renderAddressSuggestions('district', address.district)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                placeholder="จังหวัด"
                                                value={address.province}
                                                onChange={(e) => handleAddressSearch('province', 'province', e.target.value)}
                                                onFocus={() => {
                                                    if (address.province?.trim().length >= 2) {
                                                        handleAddressSearch('province', 'province', address.province);
                                                    }
                                                }}
                                                onBlur={() => setTimeout(() => setActiveAddressField(null), 250)}
                                                style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                            />
                                            {renderAddressSuggestions('province', address.province)}
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                placeholder="รหัสไปรษณีย์"
                                                maxLength={5}
                                                value={address.zipcode}
                                                onChange={(e) => handleAddressSearch('zipcode', 'zipCode', e.target.value)}
                                                onFocus={() => {
                                                    if (address.zipcode?.trim().length >= 2) {
                                                        handleAddressSearch('zipcode', 'zipCode', address.zipcode);
                                                    }
                                                }}
                                                onBlur={() => setTimeout(() => setActiveAddressField(null), 250)}
                                                style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                            />
                                            {renderAddressSuggestions('zipCode', address.zipcode)}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                            เบอร์โทรศัพท์
                                        </label>
                                        <input
                                            type="text"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            placeholder="081-xxx-xxxx"
                                            style={{ width: '100%', maxWidth: '320px', height: '38px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                            เลขประจำตัวผู้เสียภาษี
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', maxWidth: '100%' }}>
                                            <TaxIdInput
                                                value={customerTaxId}
                                                onChange={setCustomerTaxId}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: รายการสินค้า/พื้นที่จอง */}
                        <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#15803d', margin: 0 }}>
                                        รายการจอง / สินค้า / บริการ
                                    </h3>
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        background: '#dcfce7',
                                        color: '#15803d',
                                        padding: '2px 8px',
                                        borderRadius: '12px'
                                    }}>
                                        {items.length} รายการ
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleOpenSpaceEditor}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f8fafc',
                                        border: '1px solid #cbd5e1', color: '#475569', padding: '6px 12px', borderRadius: '6px',
                                        fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                                >
                                    <Settings size={14} /> จัดการล็อก/การจอง (Database)
                                </button>
                            </div>

                            {/* Space Selector Toolbar */}
                            <div style={{
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '8px',
                                padding: '10px 14px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#166534' }}>
                                        เลือกพื้นที่/ล็อกด่วน:
                                    </span>
                                </div>
                                <select
                                    onChange={handleSpaceSelect}
                                    defaultValue=""
                                    style={{
                                        flex: 1,
                                        minWidth: '220px',
                                        height: '38px',
                                        padding: '0 12px',
                                        borderRadius: '6px',
                                        border: '1.5px solid #86efac',
                                        background: '#ffffff',
                                        color: '#1e293b',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="" disabled>-- เลือกพื้นที่/ล็อกเพื่อแทรกลงในรายการ --</option>
                                    {Object.entries(groupedSpaces).map(([zone, sps]) => (
                                        <optgroup key={zone} label={`โซน: ${zone}`}>
                                            {sps.map(s => (
                                                <option key={s.key} value={s.key}>
                                                    {s.name} ({s.size} ตร.ม.) - [{s.status}]{s.booker ? ` (ผู้จอง: ${s.booker})` : ''}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            {/* Items Table Container */}
                            <div style={{
                                overflowX: 'auto',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                marginBottom: '16px',
                                background: '#fff'
                            }}>
                                <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '10px 8px', width: '46px', textAlign: 'center', color: '#475569', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>#</th>
                                            <th style={{ padding: '10px 10px', textAlign: 'left', minWidth: '260px', color: '#475569', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>รายละเอียด / รายการ</th>
                                            <th style={{ padding: '10px 8px', width: '85px', textAlign: 'center', color: '#475569', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>จำนวน</th>
                                            <th style={{ padding: '10px 8px', width: '85px', textAlign: 'center', color: '#475569', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>หน่วย</th>
                                            <th style={{ padding: '10px 8px', width: '115px', textAlign: 'right', color: '#475569', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>ราคา/หน่วย</th>
                                            <th style={{ padding: '10px 8px', width: '135px', textAlign: 'right', color: '#475569', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>รวมเป็นเงิน</th>
                                            <th style={{ padding: '10px 8px', width: '60px', textAlign: 'center', color: '#475569', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((it, idx) => {
                                            if (it.isHeading) {
                                                return (
                                                    <tr key={it.id} style={{ borderBottom: '1px solid #fed7aa', backgroundColor: '#fff7ed' }}>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                            <span style={{ background: '#ea580c', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px' }}>
                                                                หัวข้อ
                                                            </span>
                                                        </td>
                                                        <td colSpan="5" style={{ padding: '8px 10px' }}>
                                                            <input
                                                                type="text"
                                                                value={it.desc}
                                                                onChange={(e) => updateItem(it.id, 'desc', e.target.value)}
                                                                placeholder="ระบุชื่อหัวข้อ / หมวดหมู่งาน..."
                                                                style={{ width: '100%', height: '36px', padding: '0 10px', border: '1.5px solid #fdba74', borderRadius: '6px', fontWeight: '700', color: '#c2410c', background: '#fff', fontSize: '13px' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(it.id)}
                                                                title="ลบหัวข้อ"
                                                                style={{
                                                                    background: '#ef4444',
                                                                    color: '#ffffff',
                                                                    border: 'none',
                                                                    padding: '6px 10px',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            const q = parseFloat(it.qty) || 0;
                                            const p = parseFloat(it.price) || 0;
                                            const rowAmount = it.amount !== undefined && it.amount !== null ? it.amount : (q * p);

                                            return (
                                                <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>
                                                        {idx + 1}
                                                    </td>
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <input
                                                            type="text"
                                                            value={it.desc}
                                                            onChange={(e) => updateItem(it.id, 'desc', e.target.value)}
                                                            placeholder="รายละเอียดรายการ / บริการ..."
                                                            style={{ width: '100%', height: '36px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            value={it.qty}
                                                            onChange={(e) => updateItem(it.id, 'qty', e.target.value)}
                                                            style={{ width: '100%', height: '36px', padding: '0 6px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontSize: '13px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <input
                                                            type="text"
                                                            value={it.unit}
                                                            onChange={(e) => updateItem(it.id, 'unit', e.target.value)}
                                                            placeholder="หน่วย"
                                                            style={{ width: '100%', height: '36px', padding: '0 6px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontSize: '13px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            value={it.price}
                                                            onChange={(e) => updateItem(it.id, 'price', e.target.value)}
                                                            style={{ width: '100%', height: '36px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'right', fontSize: '13px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            value={rowAmount}
                                                            onChange={(e) => updateItem(it.id, 'amount', e.target.value)}
                                                            placeholder="0.00"
                                                            style={{
                                                                width: '100%',
                                                                height: '36px',
                                                                padding: '0 8px',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '6px',
                                                                textAlign: 'right',
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                color: '#0f172a'
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(it.id)}
                                                            title="ลบรายการ"
                                                            style={{
                                                                background: '#ef4444',
                                                                color: '#ffffff',
                                                                border: 'none',
                                                                padding: '6px 10px',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#16a34a',
                                        color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '6px',
                                        fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#15803d'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#16a34a'}
                                >
                                    <Plus size={16} /> เพิ่มรายการ
                                </button>
                            </div>
                        </div>

                        {/* Section 4: หมายเหตุ และ ช่องทางการชำระเงิน */}
                        <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#15803d', margin: 0, paddingBottom: '12px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                หมายเหตุ และ ช่องทางการชำระเงิน
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', margin: 0 }}>
                                            หมายเหตุท้ายเอกสาร
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {isRemarksAutoSaved && (
                                                <span style={{ fontSize: '11px', color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                                    <Check size={13} /> บันทึกอัตโนมัติแล้ว
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleResetRemarks}
                                                style={{
                                                    fontSize: '11px',
                                                    padding: '2px 8px',
                                                    background: '#f1f5f9',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    color: '#475569',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                                title="คืนค่าหมายเหตุเริ่มต้น"
                                            >
                                                <RotateCcw size={11} /> คืนค่าเริ่มต้น
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '10px 12px',
                                        background: '#fff',
                                        minHeight: '120px',
                                        cursor: 'text'
                                    }}>
                                        <TipTapCell
                                            value={remarks}
                                            onChange={handleRemarksChange}
                                            placeholder="ระบุหมายเหตุท้ายเอกสาร..."
                                            alignTop={true}
                                            style={{ minHeight: '100px', fontSize: '13px' }}
                                        />
                                    </div>
                                    <small style={{ color: '#64748b', fontSize: '11px', marginTop: '6px', display: 'block' }}>
                                        💡 คลุมดำ (ไฮไลต์) ข้อความเพื่อปรับแต่งสี ขนาด ตัวหนา/ตัวเอียง หรือขีดเส้นใต้ (บันทึกแม่แบบอัตโนมัติ)
                                    </small>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <BankAccountSelect
                                            docType="booking_order_elt"
                                            label="ช่องทางการชำระเงิน"
                                            value={bankAccount}
                                            onChange={(val) => setBankAccount(val)}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                            ผู้รับจอง (ผู้ลงนามบริษัท)
                                        </label>
                                        <CustomSelect
                                            name="signer"
                                            value={signer}
                                            onChange={(e) => setSigner(e.target.value)}
                                            usePortal={true}
                                            style={{ width: '100%', minHeight: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px' }}
                                        >
                                            <option value="none">-- ไม่มีลายเซ็นดิจิทัล (ลงนามด้วยมือ) --</option>
                                            {signer === 'authorized' && !displaySignatures.some(s => s.KeyName === 'authorized') && (
                                                <option value="authorized">ผู้มีอำนาจลงนาม บจก. อิลิท เทรดดิ้ง 2020</option>
                                            )}
                                            {displaySignatures.map(sig => (
                                                <option key={sig.KeyName} value={sig.KeyName}>
                                                    {sig.FullName} {sig.Position ? `(${sig.Position})` : ''}
                                                </option>
                                            ))}
                                        </CustomSelect>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN: Calculation Summary & Actions (Sticky 420px) ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '88px' }}>
                        <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#15803d', margin: 0, paddingBottom: '12px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                สรุปยอดเงิน (บาท)
                            </h3>

                            {/* Calculation Options Box */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '14px',
                                marginBottom: '20px',
                                background: '#f8fafc',
                                padding: '16px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0'
                            }}>
                                {/* Discount */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: enableDiscount ? '10px' : '0' }}>
                                        <input
                                            type="checkbox"
                                            id="cb_discount"
                                            checked={enableDiscount}
                                            onChange={(e) => {
                                                setEnableDiscount(e.target.checked);
                                                if (!e.target.checked) {
                                                    setDiscountPercent('');
                                                    setDiscountAmount(0);
                                                }
                                            }}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="cb_discount" style={{ fontWeight: 'bold', cursor: 'pointer', margin: 0, fontSize: '13.5px', color: '#1e293b' }}>
                                            หักส่วนลด (Discount)
                                        </label>
                                    </div>
                                    {enableDiscount && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '28px', flexWrap: 'wrap' }}>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={discountPercent}
                                                onChange={(e) => {
                                                    setDiscountPercent(e.target.value);
                                                    const p = parseFloat(e.target.value) || 0;
                                                    setDiscountAmount((subtotal * p) / 100);
                                                }}
                                                placeholder="%"
                                                style={{ width: '60px', height: '34px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontSize: '13px' }}
                                            />
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>% หรือ</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={discountAmount}
                                                onChange={(e) => {
                                                    setDiscountAmount(parseFloat(e.target.value) || 0);
                                                    setDiscountPercent('');
                                                }}
                                                placeholder="จำนวนเงิน (บาท)"
                                                style={{ width: '110px', height: '34px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right', fontSize: '13px' }}
                                            />
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>บาท</span>
                                        </div>
                                    )}
                                </div>

                                {/* VAT */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="checkbox"
                                            id="cb_vat"
                                            checked={enableVat}
                                            onChange={(e) => {
                                                setEnableVat(e.target.checked);
                                                setVatType(e.target.checked ? '7' : 'none');
                                            }}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="cb_vat" style={{ fontWeight: 'bold', cursor: 'pointer', margin: 0, fontSize: '13.5px', color: '#1e293b' }}>
                                            ภาษีมูลค่าเพิ่ม 7% (VAT 7%)
                                        </label>
                                    </div>
                                </div>

                                {/* Deposit */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: enableDeposit ? '10px' : '0' }}>
                                        <input
                                            type="checkbox"
                                            id="cb_deposit"
                                            checked={enableDeposit}
                                            onChange={(e) => {
                                                setEnableDeposit(e.target.checked);
                                                if (e.target.checked) {
                                                    if (!depositPercent || Number(depositPercent) === 0) {
                                                        setDepositPercent(50);
                                                        const amt = (grandTotal * 50) / 100;
                                                        setDepositAmount(parseFloat(amt.toFixed(2)));
                                                    }
                                                } else {
                                                    setDepositPercent('');
                                                    setDepositAmount(0);
                                                }
                                            }}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="cb_deposit" style={{ fontWeight: 'bold', cursor: 'pointer', margin: 0, fontSize: '13.5px', color: '#0369a1' }}>
                                            ยอดชำระมัดจำ (Deposit)
                                        </label>
                                    </div>
                                    {enableDeposit && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '28px', flexWrap: 'wrap' }}>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={depositPercent}
                                                onChange={(e) => {
                                                    setDepositPercent(e.target.value);
                                                    const p = parseFloat(e.target.value) || 0;
                                                    setDepositAmount((grandTotal * p) / 100);
                                                }}
                                                placeholder="%"
                                                style={{ width: '60px', height: '34px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontSize: '13px' }}
                                            />
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>% หรือ</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={depositAmount}
                                                onChange={(e) => {
                                                    setDepositAmount(parseFloat(e.target.value) || 0);
                                                    setDepositPercent('');
                                                }}
                                                placeholder="จำนวนเงิน (บาท)"
                                                style={{ width: '110px', height: '34px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold', color: '#0369a1', textAlign: 'right', fontSize: '13px' }}
                                            />
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>บาท</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Summary Rows */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14.5px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                    <span>รวมเป็นเงิน:</span>
                                    <span style={{ fontWeight: '600' }}>{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                </div>
                                {enableDiscount && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                                            <span>หักส่วนลด:</span>
                                            <span>- {discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                            <span>จำนวนเงินหลังหักส่วนลด:</span>
                                            <span style={{ fontWeight: '600' }}>{afterDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                        </div>
                                    </>
                                )}
                                {enableVat && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                        <span>ภาษีมูลค่าเพิ่ม 7%:</span>
                                        <span style={{ fontWeight: '600' }}>{vat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                    </div>
                                )}

                                {enableDeposit && (
                                    <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1', fontWeight: 'bold' }}>
                                            <span>ยอดชำระมัดจำ {depositPercent ? `(${depositPercent}%)` : ''}:</span>
                                            <span>{depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 'bold', marginTop: '6px' }}>
                                            <span>ยอดคงเหลือที่ต้องชำระ:</span>
                                            <span>{remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                        </div>
                                    </div>
                                )}

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    marginTop: '4px',
                                    paddingTop: '12px',
                                    borderTop: '2px solid #e2e8f0'
                                }}>
                                    <span style={{ color: '#15803d', fontWeight: '700', fontSize: '16px' }}>รวมเงินทั้งสิ้น:</span>
                                    <span style={{ color: '#15803d', fontWeight: '800', fontSize: '20px' }}>
                                        {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                                    </span>
                                </div>

                                <div style={{
                                    background: '#f8fafc',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    fontSize: '12.5px',
                                    fontWeight: '500',
                                    color: '#475569',
                                    textAlign: 'center',
                                    lineHeight: 1.4,
                                    marginTop: '4px'
                                }}>
                                    ({numberToThaiBaht(grandTotal)})
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '22px' }}>
                                <button
                                    type="button"
                                    onClick={handleFormPreview}
                                    style={{
                                        width: '100%',
                                        height: '42px',
                                        borderRadius: '8px',
                                        border: '1px solid #0284c7',
                                        background: '#fff',
                                        color: '#0284c7',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        boxShadow: '0 1px 2px rgba(2, 132, 199, 0.1)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Printer size={16} /> พรีวิว / พิมพ์
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    style={{
                                        width: '100%',
                                        height: '42px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: '#10b981',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Save size={16} /> {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลใบสั่งจอง'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    style={{
                                        width: '100%',
                                        height: '38px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        background: '#fff',
                                        color: '#64748b',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        fontSize: '13px'
                                    }}
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MODAL 1: PRINT PREVIEW MODAL
            ══════════════════════════════════════════════════════════════════ */}
            {isPreviewModalOpen && previewData && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        width: '100%',
                        maxWidth: '920px',
                        maxHeight: '92vh',
                        borderRadius: '12px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '14px 20px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#ffffff'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={18} color="#10b981" /> ตัวอย่างก่อนพิมพ์: ใบสั่งจอง {previewData.docNo}
                                </h3>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                    เลขที่: <span style={{ fontWeight: 600, color: '#0f766e' }}>{previewData.docNo || '-'}</span> | ลูกค้า: {previewData.customerName || '-'}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={handlePrintDocument}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: '#10b981',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                                    }}
                                >
                                    <Printer size={16} /> สั่งพิมพ์ (Print)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewModalOpen(false)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        color: '#64748b',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <X size={16} /> ปิด
                                </button>
                            </div>
                        </div>

                        {/* Modal Body Preview - White Background */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '24px 16px',
                            background: '#ffffff',
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <div style={{
                                width: '100%',
                                maxWidth: '210mm',
                                margin: '0 auto',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                background: '#ffffff',
                                borderRadius: '4px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <EliteBookingOrderPrint ref={printContainerRef} data={previewData} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MODAL 2: REVISION HISTORY MODAL
            ══════════════════════════════════════════════════════════════════ */}
            {isHistoryModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '750px',
                        maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
                    }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <History size={20} style={{ color: '#0284c7' }} /> ประวัติการแก้ไข (Revision History): {historyDocNo}
                            </div>
                            <button onClick={() => setIsHistoryModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '20px', overflowY: 'auto' }}>
                            {isLoadingHistory ? (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                                    <RefreshCw className="spin" size={24} style={{ display: 'inline-block', marginBottom: '8px' }} />
                                    <div>กำลังโหลดประวัติ...</div>
                                </div>
                            ) : historyList.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                    ยังไม่มีประวัติการแก้ไขสำหรับเอกสารนี้
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                            <th style={{ padding: '10px', textAlign: 'center' }}>เวอร์ชัน</th>
                                            <th style={{ padding: '10px' }}>วันที่บันทึกสำรอง</th>
                                            <th style={{ padding: '10px' }}>ผู้แก้ไข</th>
                                            <th style={{ padding: '10px', textAlign: 'right' }}>ยอดรวม (บาท)</th>
                                            <th style={{ padding: '10px', textAlign: 'center' }}>การกระทำ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyList.map(h => (
                                            <tr key={h.HistoryID} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#0284c7' }}>
                                                    v.{h.Revision}
                                                </td>
                                                <td style={{ padding: '10px' }}>
                                                    {h.ArchivedAt ? new Date(h.ArchivedAt).toLocaleString('th-TH') : '-'}
                                                </td>
                                                <td style={{ padding: '10px' }}>
                                                    {h.ArchivedByName || '-'}
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                                                    {Number(h.GrandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => handleViewHistoryDetail(h.HistoryID)}
                                                            style={{
                                                                background: '#f8fafc', border: '1px solid #cbd5e1', padding: '3px 8px',
                                                                borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                            }}
                                                        >
                                                            <Eye size={13} /> ดู
                                                        </button>
                                                        {canUpdate('elite_doc_sales_order') && (
                                                            <button
                                                                onClick={() => handleRestoreHistory(h.BookingOrderId, h.HistoryID, h.Revision)}
                                                                style={{
                                                                    background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '3px 8px',
                                                                    borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                                                                }}
                                                            >
                                                                กู้คืน
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MODAL 3: SPACE DATABASE EDITOR MODAL
            ══════════════════════════════════════════════════════════════════ */}
            {isSpaceModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '850px',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
                    }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Settings size={20} /> จัดการข้อมูลล็อก/การจอง (Database)
                            </div>
                            <button onClick={() => setIsSpaceModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                        <th style={{ padding: '8px', width: '15%' }}>โซน</th>
                                        <th style={{ padding: '8px', width: '22%' }}>ชื่อล็อก/จุด</th>
                                        <th style={{ padding: '8px', width: '15%' }}>ขนาด (ตร.ม.)</th>
                                        <th style={{ padding: '8px', width: '18%' }}>สถานะ</th>
                                        <th style={{ padding: '8px', width: '24%' }}>ผู้จอง (ถ้ามี)</th>
                                        <th style={{ padding: '8px', width: '6%', textAlign: 'center' }}>ลบ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editingSpaces.map((sp, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '5px' }}>
                                                <input
                                                    type="text"
                                                    value={sp.zone}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setEditingSpaces(prev => prev.map((s, idx) => idx === i ? { ...s, zone: val } : s));
                                                    }}
                                                    style={{ width: '100%', padding: '5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '5px' }}>
                                                <input
                                                    type="text"
                                                    value={sp.name}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setEditingSpaces(prev => prev.map((s, idx) => idx === i ? { ...s, name: val } : s));
                                                    }}
                                                    style={{ width: '100%', padding: '5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '5px' }}>
                                                <input
                                                    type="number"
                                                    value={sp.size}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setEditingSpaces(prev => prev.map((s, idx) => idx === i ? { ...s, size: val } : s));
                                                    }}
                                                    style={{ width: '100%', padding: '5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '5px' }}>
                                                <select
                                                    value={sp.status}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setEditingSpaces(prev => prev.map((s, idx) => idx === i ? { ...s, status: val } : s));
                                                    }}
                                                    style={{ width: '100%', padding: '5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                >
                                                    <option value="ว่าง">ว่าง</option>
                                                    <option value="จองแล้ว">จองแล้ว</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '5px' }}>
                                                <input
                                                    type="text"
                                                    value={sp.booker || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setEditingSpaces(prev => prev.map((s, idx) => idx === i ? { ...s, booker: val } : s));
                                                    }}
                                                    placeholder="ชื่อผู้จอง"
                                                    style={{ width: '100%', padding: '5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '5px', textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingSpaces(prev => prev.filter((_, idx) => idx !== i))}
                                                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ marginTop: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditingSpaces(prev => [...prev, { zone: 'โซนใหม่', name: '', size: 0, status: 'ว่าง', booker: '' }])}
                                    style={{
                                        fontSize: '12px', border: '1px solid #16a34a', color: '#16a34a', background: '#fff',
                                        padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
                                    }}
                                >
                                    <Plus size={14} /> เพิ่มแถวล็อกพื้นที่
                                </button>
                            </div>
                        </div>

                        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
                            <button
                                type="button"
                                onClick={() => setIsSpaceModalOpen(false)}
                                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveSpaceEditor}
                                style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                            >
                                บันทึกการเปลี่ยนแปลง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Responsive grid styles */}
            <style>{`
                @media (max-width: 1024px) {
                    .elite-form-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}

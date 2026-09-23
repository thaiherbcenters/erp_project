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
    User,
    ListFilter,
    Settings,
    ChevronDown,
    Check,
    X,
    ArrowUp,
    ArrowDown,
    History
} from 'lucide-react';
import EliteTaxInvoicePrint from '../components/EliteTaxInvoicePrint';
import PaginationControl from '../components/PaginationControl';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import TaxIdInput from '../components/TaxIdInput';
import { TipTapCell } from '../components/TipTapCell';
import { searchThaiAddress } from '../utils/thaiAddress';
import { FilterToggleButton, EliteTaxInvoiceFilterDrawer } from '../components/SalesDocFilter';
import './PageCommon.css';

const DEFAULT_INVOICE_REMARKS = '<p>*** โปรดชำระเงินด้วยเช็คขีดคร่อม และสั่งจ่ายในนาม "บริษัท อิลิท เทรดดิ้ง 2020 จำกัด" เท่านั้น</p><p>*** หากไม่มีการทักท้วงใดๆ เกี่ยวกับใบแจ้งหนี้ฉบับนี้ภายใน 7 วันนับแต่ได้รับใบแจ้งหนี้/ใบวางบิล บริษัทฯ จะถือว่าใบแจ้งหนี้/ใบวางบิลฉบับนี้ถูกต้อง</p>';

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

export default function EliteTaxInvoice() {
    const { token, canCreate, canUpdate, canDelete } = useAuth();
    const { showAlert } = useAlert();

    // View state: 'list' | 'form' | 'preview'
    const [viewMode, setViewMode] = useState('list');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(false);

    // List & Filters
    const [invoices, setInvoices] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showFilter, setShowFilter] = useState(false);
    const [usersList, setUsersList] = useState([]);
    const [filter, setFilter] = useState({
        status: 'all',
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
            status: 'all',
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
    const [paymentTerm, setPaymentTerm] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [reference, setReference] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [address, setAddress] = useState({
        no: '', soi: '', road: '', subdistrict: '', district: '', province: '', zipcode: ''
    });
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerTaxId, setCustomerTaxId] = useState('');
    const getDefaultItems = () => [
        { id: 1, desc: 'ค่าเช่าพื้นที่ โซน/ล็อก ........', qty: 1, unit: 'เดือน', price: 0 },
        { id: 2, desc: 'ค่าส่วนกลาง', qty: 1, unit: 'ตร.ม.', price: 35 },
        { id: 3, desc: 'ค่าน้ำประปา 17 บาท/หน่วย', qty: 17, unit: 'หน่วย', price: 0 },
        { id: 4, desc: 'ค่าไฟฟ้า 7 บาท/หน่วย', qty: 7, unit: 'หน่วย', price: 0 }
    ];

    const [items, setItems] = useState(getDefaultItems);

    // Extra Calculation States (Discount, VAT, Deposit)
    const [enableDiscount, setEnableDiscount] = useState(false);
    const [discountPercent, setDiscountPercent] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);

    const [enableVat, setEnableVat] = useState(true);
    const [vatType, setVatType] = useState('7');

    const [enableDeposit, setEnableDeposit] = useState(false);
    const [depositPercent, setDepositPercent] = useState('');
    const [depositAmount, setDepositAmount] = useState(0);
    
    const [remarks, setRemarks] = useState(DEFAULT_INVOICE_REMARKS);
    const [signer, setSigner] = useState('none');
    const [bankAccount, setBankAccount] = useState('kbank_elite_2020');

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

    // ── Calculations ──
    const subtotal = items.reduce((acc, item) => acc + (Number(item.qty || 0) * Number(item.price || 0)), 0);
    const effectiveDiscount = enableDiscount ? Number(discountAmount || 0) : 0;
    const afterDiscount = Math.max(0, subtotal - effectiveDiscount);
    const effectiveVat = (enableVat && vatType === '7') ? (afterDiscount * 0.07) : 0;
    const grandTotal = afterDiscount + effectiveVat;
    const effectiveDeposit = enableDeposit ? Number(depositAmount || 0) : 0;
    const remainingBalance = Math.max(0, grandTotal - effectiveDeposit);

    // ── Calculation Change Handlers ──
    const handleDiscountPercentChange = (val) => {
        setDiscountPercent(val);
        const p = parseFloat(val) || 0;
        const amt = (subtotal * p) / 100;
        setDiscountAmount(amt > 0 ? parseFloat(amt.toFixed(2)) : 0);
    };

    const handleDiscountAmountChange = (val) => {
        setDiscountAmount(val);
        const amt = parseFloat(val) || 0;
        const p = subtotal > 0 ? (amt / subtotal) * 100 : 0;
        setDiscountPercent(p > 0 ? parseFloat(p.toFixed(2)) : '');
    };

    const handleDepositPercentChange = (val) => {
        setDepositPercent(val);
        const p = parseFloat(val) || 0;
        const amt = (grandTotal * p) / 100;
        setDepositAmount(amt > 0 ? parseFloat(amt.toFixed(2)) : 0);
    };

    const handleDepositAmountChange = (val) => {
        setDepositAmount(val);
        const amt = parseFloat(val) || 0;
        const p = grandTotal > 0 ? (amt / grandTotal) * 100 : 0;
        setDepositPercent(p > 0 ? parseFloat(p.toFixed(2)) : '');
    };

    // ── Spaces Management State ──
    const [spacesList, setSpacesList] = useState(() => {
        const saved = localStorage.getItem('elite_spaces_data') || localStorage.getItem('elite_space_data') || localStorage.getItem('psf_spaces_data');
        return parseSpaceData(saved);
    });
    const [selectedSpaceKeys, setSelectedSpaceKeys] = useState([]);
    const [isSpaceDropdownOpen, setIsSpaceDropdownOpen] = useState(false);
    const [spaceSearch, setSpaceSearch] = useState('');
    const spaceDropdownRef = useRef(null);

    // Modal state for Space Editor
    const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
    const [tempSpaces, setTempSpaces] = useState([]);

    // Click outside to close space dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (spaceDropdownRef.current && !spaceDropdownRef.current.contains(event.target)) {
                setIsSpaceDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Grouped spaces for dropdown
    const filteredGroupedSpaces = useMemo(() => {
        const groups = {};
        const searchLower = spaceSearch.toLowerCase().trim();
        spacesList.forEach(sp => {
            const matchesSearch = !searchLower || 
                sp.name.toLowerCase().includes(searchLower) || 
                sp.zone.toLowerCase().includes(searchLower) ||
                sp.booker.toLowerCase().includes(searchLower);
            if (matchesSearch) {
                if (!groups[sp.zone]) {
                    groups[sp.zone] = [];
                }
                groups[sp.zone].push(sp);
            }
        });
        return groups;
    }, [spacesList, spaceSearch]);

    // Sync rental items with selected spaces
    const syncRentalItems = useCallback((keys, spaces, forceOverwrite = false) => {
        const currentSpaces = spaces || spacesList;
        const selectedSpaces = currentSpaces.filter(sp => keys.includes(sp.key));

        let totalSqm = 0;
        const spaceDescs = [];

        selectedSpaces.forEach(sp => {
            const z = sp.zone || '';
            const zoneChar = z.replace('โซน', '').trim().charAt(0).toUpperCase();
            let rate = 450;
            if (zoneChar === 'C') rate = 350;

            const sizeNum = parseFloat(sp.size) || 0;
            totalSqm += sizeNum;

            const zoneLabel = z.startsWith('โซน') ? z : `โซน ${z}`;
            let descName = `ค่าเช่าพื้นที่ ${zoneLabel} ล็อก ${sp.name || '-'}`;
            if (sp.booker && sp.booker !== sp.name) {
                descName += ` (${sp.booker})`;
            }
            descName += ` (ขนาด ${sizeNum} ตร.ม.)`;

            spaceDescs.push({
                name: descName,
                qty: sizeNum,
                unit: 'ตร.ม.',
                price: rate,
                baseName: `ค่าเช่าพื้นที่ ${zoneLabel} ล็อก ${sp.name || '-'}`
            });
        });

        const standardItems = [];
        if (totalSqm > 0) {
            standardItems.push({
                name: 'ค่าส่วนกลาง',
                baseName: 'ค่าส่วนกลาง',
                qty: totalSqm,
                unit: 'ตร.ม.',
                price: 35
            });

            // Single standard rows for water and electricity
            standardItems.push({
                name: 'ค่าน้ำประปา 17 บาท/หน่วย',
                baseName: 'ค่าน้ำประปา',
                qty: 17,
                unit: 'หน่วย',
                price: 0
            });
            standardItems.push({
                name: 'ค่าไฟฟ้า 7 บาท/หน่วย',
                baseName: 'ค่าไฟฟ้า',
                qty: 7,
                unit: 'หน่วย',
                price: 0
            });
        } else {
            spaceDescs.push({
                name: 'ค่าเช่าพื้นที่ โซน/ล็อก ........',
                qty: 1,
                unit: 'เดือน',
                price: 0,
                baseName: 'ค่าเช่าพื้นที่ โซน/ล็อก'
            });
            standardItems.push({ name: 'ค่าส่วนกลาง', baseName: 'ค่าส่วนกลาง', qty: 1, unit: 'ตร.ม.', price: 35 });
            standardItems.push({ name: 'ค่าน้ำประปา 17 บาท/หน่วย', baseName: 'ค่าน้ำประปา', qty: 17, unit: 'หน่วย', price: 0 });
            standardItems.push({ name: 'ค่าไฟฟ้า 7 บาท/หน่วย', baseName: 'ค่าไฟฟ้า', qty: 7, unit: 'หน่วย', price: 0 });
        }

        setItems(prevItems => {
            if (forceOverwrite) {
                const list = [];
                spaceDescs.forEach((sp, idx) => {
                    list.push({
                        id: Date.now() + idx + Math.random(),
                        desc: sp.name,
                        qty: sp.qty,
                        unit: sp.unit,
                        price: sp.price
                    });
                });
                standardItems.forEach((std, idx) => {
                    list.push({
                        id: Date.now() + 100 + idx + Math.random(),
                        desc: std.name,
                        qty: std.qty,
                        unit: std.unit,
                        price: std.price
                    });
                });
                return list;
            }

            const currentData = (prevItems || []).map(item => ({
                id: item.id || (Date.now() + Math.random()),
                desc: item.desc || '',
                qty: item.qty !== undefined ? item.qty : 1,
                unit: item.unit || '',
                price: item.price !== undefined ? item.price : 0,
                used: false
            }));

            const newItemsList = [];

            // 1. Add selected spaces
            spaceDescs.forEach(spaceObj => {
                const existing = currentData.find(d => !d.used && (
                    (d.desc || '').startsWith(spaceObj.baseName) || 
                    (d.desc || '').startsWith('ค่าเช่าพื้นที่ โซน/ล็อก') ||
                    (!(d.desc || '').trim() && Number(d.price || 0) === 0)
                ));
                if (existing) {
                    newItemsList.push({
                        id: existing.id,
                        desc: spaceObj.name,
                        qty: spaceObj.qty,
                        unit: spaceObj.unit,
                        price: Number(existing.price) !== 0 ? existing.price : spaceObj.price
                    });
                    existing.used = true;
                } else {
                    newItemsList.push({
                        id: Date.now() + Math.random(),
                        desc: spaceObj.name,
                        qty: spaceObj.qty,
                        unit: spaceObj.unit,
                        price: spaceObj.price
                    });
                }
            });

            // 2. Add other non-space, non-standard items
            currentData.forEach(d => {
                const descStr = (d.desc || '').trim();
                const isStandard = descStr.startsWith('ค่าเช่าพื้นที่') ||
                                   descStr.startsWith('ค่าส่วนกลาง') ||
                                   descStr.startsWith('ค่าน้ำประปา') ||
                                   descStr.startsWith('ค่าไฟฟ้า') ||
                                   ['เงินประกันความเสียหาย', 'ค่าประกันมิเตอร์น้ำ / ไฟฟ้า'].includes(descStr);
                const isEmpty = (descStr === '' && Number(d.price || 0) === 0);
                if (!d.used && !isStandard && !isEmpty) {
                    newItemsList.push(d);
                    d.used = true;
                }
            });

            // 3. Add standard items
            standardItems.forEach(stdObj => {
                const existing = currentData.find(d => !d.used && (d.desc || '').startsWith(stdObj.baseName));
                if (existing) {
                    newItemsList.push({
                        id: existing.id,
                        desc: stdObj.name,
                        qty: stdObj.qty,
                        unit: stdObj.unit,
                        price: Number(existing.price) !== 0 ? existing.price : stdObj.price
                    });
                    existing.used = true;
                } else {
                    newItemsList.push({
                        id: Date.now() + Math.random(),
                        desc: stdObj.name,
                        qty: stdObj.qty,
                        unit: stdObj.unit,
                        price: stdObj.price
                    });
                }
            });

            return newItemsList;
        });
    }, [spacesList]);

    const handleApplyStandardRentalItems = () => {
        if (selectedSpaceKeys.length === 0) {
            showAlert('แจ้งเตือน', 'กรุณาเลือกล็อกพื้นที่ให้เช่าด้านบนก่อน เพื่อดึงรายการเช่ามาตรฐาน', 'warning');
            return;
        }
        syncRentalItems(selectedSpaceKeys, spacesList, true);
        showAlert('สำเร็จ', 'ดึงรายการเช่ามาตรฐานตามล็อกที่เลือกลงในตารางเรียบร้อยแล้ว', 'success');
    };

    const handleToggleSpace = (spaceKey) => {
        let newSelected;
        if (selectedSpaceKeys.includes(spaceKey)) {
            newSelected = selectedSpaceKeys.filter(k => k !== spaceKey);
        } else {
            newSelected = [...selectedSpaceKeys, spaceKey];
        }
        setSelectedSpaceKeys(newSelected);
        syncRentalItems(newSelected, spacesList);
    };

    const handleRemoveSpace = (e, spaceKey) => {
        e.stopPropagation();
        const newSelected = selectedSpaceKeys.filter(k => k !== spaceKey);
        setSelectedSpaceKeys(newSelected);
        syncRentalItems(newSelected, spacesList);
    };

    // Modal Handlers
    const handleOpenSpaceModal = () => {
        setTempSpaces(spacesList.map((sp, idx) => ({ ...sp, tempId: idx + 1 })));
        setIsSpaceModalOpen(true);
    };

    const handleCloseSpaceModal = () => {
        setIsSpaceModalOpen(false);
    };

    const handleAddSpaceRow = () => {
        setTempSpaces(prev => [
            ...prev,
            {
                tempId: Date.now(),
                zone: 'โซน A',
                name: '',
                size: 0,
                status: 'ว่าง',
                booker: '',
                rawStatus: 'ว่าง',
                key: ''
            }
        ]);
    };

    const handleUpdateSpaceRow = (idx, field, value) => {
        setTempSpaces(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            if (field === 'status' && value === 'ว่าง') {
                next[idx].booker = '';
            }
            return next;
        });
    };

    const handleRemoveSpaceRow = (idx) => {
        setTempSpaces(prev => prev.filter((_, i) => i !== idx));
    };

    const handleMoveSpaceRow = (idx, direction) => {
        setTempSpaces(prev => {
            const targetIdx = idx + direction;
            if (targetIdx < 0 || targetIdx >= prev.length) return prev;
            const next = [...prev];
            const [moved] = next.splice(idx, 1);
            next.splice(targetIdx, 0, moved);
            return next;
        });
    };

    const handleSaveSpaces = () => {
        const serializedLines = tempSpaces.map(sp => {
            const zone = (sp.zone || '').trim() || '-';
            const name = (sp.name || '').trim() || '-';
            const size = parseFloat(sp.size) || 0;
            let finalStatus = 'ว่าง';
            if (sp.status === 'จองแล้ว') {
                finalStatus = sp.booker && sp.booker.trim() ? `จองแล้ว: ${sp.booker.trim()}` : 'จองแล้ว';
            }
            return `${zone}|${name}|${size}|${finalStatus}`;
        });

        const rawText = serializedLines.join('\n');
        localStorage.setItem('elite_spaces_data', rawText);
        localStorage.setItem('elite_space_data', rawText);
        localStorage.setItem('psf_spaces_data', rawText);

        const parsed = parseSpaceData(rawText);
        setSpacesList(parsed);
        setIsSpaceModalOpen(false);
        showAlert('สำเร็จ', 'บันทึกข้อมูลล็อกเรียบร้อยแล้ว', 'success');

        if (selectedSpaceKeys.length > 0) {
            syncRentalItems(selectedSpaceKeys, parsed);
        }
    };

    // ── Fetch Invoices List ──
    const fetchInvoices = useCallback(async (page = 1, search = debouncedSearch, currentFilter = filter, limit = pagination.limit) => {
        setIsLoadingList(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: search || ''
            });

            if (currentFilter.status && currentFilter.status !== 'all') queryParams.append('status', currentFilter.status);
            if (currentFilter.createdBy && currentFilter.createdBy !== 'all') queryParams.append('createdBy', currentFilter.createdBy);
            if (currentFilter.dateFrom) queryParams.append('dateFrom', currentFilter.dateFrom);
            if (currentFilter.dateTo) queryParams.append('dateTo', currentFilter.dateTo);

            const res = await fetch(`/api/elite-tax-invoices?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setInvoices(data.data || []);
                if (data.pagination) {
                    setPagination(data.pagination);
                }
            } else {
                showAlert('แจ้งเตือน', data.message || 'ไม่สามารถโหลดข้อมูลได้', 'error');
            }
        } catch (err) {
            console.error('Error loading invoices:', err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อโหลดข้อมูลรายการได้', 'error');
        } finally {
            setIsLoadingList(false);
        }
    }, [token, debouncedSearch, filter, pagination.limit, showAlert]);

    useEffect(() => {
        fetchInvoices(pagination.page, debouncedSearch, filter, pagination.limit);
    }, [fetchInvoices, pagination.page, debouncedSearch, filter]);

    // ── Fetch Next Doc Number ──
    const fetchNextNumber = async (date) => {
        try {
            const res = await fetch(`/api/elite-tax-invoices/next-number?date=${date || docDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
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
        setPaymentTerm('');
        setContactPerson('');
        setReference('');
        setCustomerName('');
        setAddress({ no: '', soi: '', road: '', subdistrict: '', district: '', province: '', zipcode: '' });
        setCustomerPhone('');
        setCustomerTaxId('');
        setSelectedSpaceKeys([]);
        setItems(getDefaultItems());
        
        // Reset calculations
        setEnableDiscount(false);
        setDiscountPercent('');
        setDiscountAmount(0);
        setEnableVat(true);
        setVatType('7');
        setEnableDeposit(false);
        setDepositPercent('');
        setDepositAmount(0);

        setRemarks(DEFAULT_INVOICE_REMARKS);
        setSigner('none');
        setBankAccount('kbank_elite_2020');
        fetchNextNumber(today);
        setViewMode('form');
    };

    // ── Open Edit Form ──
    const handleEdit = (inv) => {
        setEditingId(inv.id);
        setRevision(inv.Revision || 0);
        setDocNo(inv.DocNo || '');
        setDocDate(inv.DocDate ? inv.DocDate.split('T')[0] : new Date().toISOString().split('T')[0]);
        setPaymentTerm(inv.PaymentTerm || '');
        setContactPerson(inv.ContactPerson || '');
        setReference(inv.Reference || '');
        setCustomerName(inv.CustomerName || '');
        
        // Parse address
        const rawAddr = inv.CustomerAddress || '';
        setAddress({
            no: rawAddr,
            soi: '',
            road: '',
            subdistrict: '',
            district: '',
            province: '',
            zipcode: ''
        });
        
        setCustomerPhone(inv.CustomerPhone || '');
        setCustomerTaxId(inv.CustomerTaxId || '');
        setSelectedSpaceKeys([]);
        
        // Parse items
        let loadedItems = [{ id: Date.now(), desc: '', qty: 1, unit: '', price: 0 }];
        try {
            const parsed = JSON.parse(inv.ItemsJSON || '[]');
            if (parsed.length > 0) loadedItems = parsed;
        } catch {}
        setItems(loadedItems);

        // Load calculations
        if (inv.Discount && Number(inv.Discount) > 0) {
            setEnableDiscount(true);
            setDiscountAmount(Number(inv.Discount));
            setDiscountPercent(inv.DiscountPercent || '');
        } else {
            setEnableDiscount(false);
            setDiscountPercent('');
            setDiscountAmount(0);
        }

        setEnableVat(Boolean(inv.IncludeVat));
        setVatType(Boolean(inv.IncludeVat) ? '7' : 'none');

        if (inv.DepositAmount && Number(inv.DepositAmount) > 0) {
            setEnableDeposit(true);
            setDepositAmount(Number(inv.DepositAmount));
            setDepositPercent(inv.DepositPercent || '');
        } else {
            setEnableDeposit(false);
            setDepositPercent('');
            setDepositAmount(0);
        }

        setRemarks(inv.Remarks || '');
        setSigner(inv.Signer || 'none');
        setBankAccount(inv.BankAccount || 'kbank_elite_2020');
        setViewMode('form');
    };

    // ── Open Preview From Table List ──
    const handleViewPreview = (inv) => {
        let parsedItems = [];
        try {
            parsedItems = JSON.parse(inv.ItemsJSON || '[]');
        } catch {
            parsedItems = [];
        }

        setPreviewData({
            docNo: inv.DocNo,
            docDate: inv.DocDate,
            revision: inv.Revision || 0,
            paymentTerm: inv.PaymentTerm,
            contactPerson: inv.ContactPerson,
            reference: inv.Reference,
            customerName: inv.CustomerName,
            customerAddress: inv.CustomerAddress,
            customerPhone: inv.CustomerPhone,
            customerTaxId: inv.CustomerTaxId,
            items: parsedItems,
            subtotal: inv.Subtotal,
            discount: inv.Discount,
            discountPercent: inv.DiscountPercent || 0,
            vat: inv.Vat,
            grandTotal: inv.GrandTotal,
            depositPercent: inv.DepositPercent || 0,
            depositAmount: inv.DepositAmount || 0,
            remainingBalance: inv.RemainingBalance !== undefined ? inv.RemainingBalance : ((inv.GrandTotal || 0) - (inv.DepositAmount || 0)),
            remarks: inv.Remarks,
            signer: inv.Signer,
            bankAccount: inv.BankAccount,
            includeVat: Boolean(inv.IncludeVat)
        });
        setIsPreviewModalOpen(true);
    };

    // ── Open History Modal ──
    const handleOpenHistory = async (inv) => {
        setHistoryDocNo(inv.DocNo);
        setIsHistoryModalOpen(true);
        setIsLoadingHistory(true);
        try {
            const res = await fetch(`/api/elite-tax-invoices/${inv.id}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setHistoryList(data.data || []);
            } else {
                showAlert('แจ้งเตือน', data.message || 'ไม่สามารถโหลดประวัติได้', 'error');
            }
        } catch (err) {
            console.error('Error fetching history:', err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อโหลดประวัติได้', 'error');
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // ── Open History Snapshot Preview ──
    const handleViewHistorySnapshot = async (historyId) => {
        try {
            const res = await fetch(`/api/elite-tax-invoices/history/${historyId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
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

                setPreviewData({
                    docNo: h.DocNo,
                    docDate: h.DocDate,
                    revision: h.Revision,
                    paymentTerm: h.PaymentTerm,
                    contactPerson: h.ContactPerson,
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
                    bankAccount: h.BankAccount,
                    includeVat: Boolean(h.IncludeVat)
                });
                setIsPreviewModalOpen(true);
            }
        } catch (err) {
            console.error('Error loading history detail:', err);
        }
    };

    // ── Delete Invoice ──
    const handleDelete = async (id, no) => {
        if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารเลขที่ "${no}" ?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/elite-tax-invoices/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                showAlert('สำเร็จ', `ลบเอกสารเลขที่ ${no} เรียบร้อยแล้ว`, 'success');
                fetchInvoices(pagination.page);
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
        setItems([...items, { id: Date.now(), desc: '', qty: 1, unit: '', price: 0 }]);
    };

    const removeItem = (id) => {
        if (items.length <= 1) {
            setItems([{ id: Date.now(), desc: '', qty: 1, unit: '', price: 0 }]);
            return;
        }
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

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

    const getFormData = () => {
        const formattedAddress = (address.subdistrict || address.district || address.province)
            ? `${address.no} ${address.soi ? 'ซอย' + address.soi : ''} ${address.road ? 'ถนน' + address.road : ''} แขวง/ตำบล${address.subdistrict} เขต/อำเภอ${address.district} จ.${address.province} ${address.zipcode}`.trim().replace(/\s+/g, ' ')
            : address.no;

        return {
            docNo,
            docDate,
            revision,
            paymentTerm,
            contactPerson,
            reference,
            customerName,
            customerAddress: formattedAddress,
            customerPhone,
            customerTaxId,
            items,
            subtotal,
            discount: effectiveDiscount,
            discountPercent: enableDiscount ? Number(discountPercent || 0) : 0,
            vat: effectiveVat,
            grandTotal,
            depositPercent: enableDeposit ? Number(depositPercent || 0) : 0,
            depositAmount: effectiveDeposit,
            remainingBalance,
            remarks,
            signer,
            bankAccount,
            includeVat: enableVat && vatType === '7'
        };
    };

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
                <title>${previewData?.docNo ? `ใบแจ้งหนี้_${previewData.docNo}` : 'ใบแจ้งหนี้'}</title>
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
                        margin: 6mm 8mm; 
                    }
                    html, body { 
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background: #ffffff !important; 
                        font-family: 'Sarabun', sans-serif;
                    }
                    /* Ensure print paper fills 100% of printable A4 width without downscaling */
                    .elite-print-paper,
                    body > div {
                        width: 100% !important;
                        max-width: 100% !important;
                        min-height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-sizing: border-box !important;
                        page-break-after: avoid !important;
                    }
                    .print-notes-container {
                        word-break: break-word;
                    }
                    .print-notes-container p {
                        margin: 0;
                        white-space: pre-wrap !important;
                    }
                    .print-notes-container hr {
                        border: none !important;
                        border-top: 1.5px solid #333 !important;
                        margin: 6px 0 !important;
                        width: 100%;
                    }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.error('Print iframe error, fallback to window.print:', err);
                window.print();
            } finally {
                setTimeout(() => {
                    iframe.remove();
                }, 1000);
            }
        }, 350);
    };

    const handlePreviewFromForm = () => {
        if (!customerName || !address.no) {
            showAlert('ข้อผิดพลาด', 'กรุณากรอกชื่อลูกค้าและที่อยู่ก่อนพรีวิว', 'warning');
            return;
        }
        setPreviewData(getFormData());
        setIsPreviewModalOpen(true);
    };

    // ── Submit Form (Save / Update) ──
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!customerName || !address.no) {
            showAlert('ข้อผิดพลาด', 'กรุณากรอกชื่อลูกค้าและที่อยู่ให้ครบถ้วน', 'error');
            return;
        }

        const formData = getFormData();
        setIsLoading(true);

        try {
            const url = editingId ? `/api/elite-tax-invoices/${editingId}` : '/api/elite-tax-invoices';
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (data.success) {
                showAlert('สำเร็จ', editingId ? `อัปเดตข้อมูลเอกสารเรียบร้อยแล้ว (เวอร์ชั่นใหม่ v.${data.revision ?? (revision + 1)})` : 'บันทึกใบแจ้งหนี้/ใบกำกับภาษีเรียบร้อยแล้ว', 'success');
                setIsPreviewModalOpen(false);
                setViewMode('list');
                fetchInvoices(1);
            } else {
                showAlert('ข้อผิดพลาด', data.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            }
        } catch (err) {
            console.error('Submit error:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Format date for list
    const formatDateThai = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = d.getFullYear() + 543;
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="page-container" style={{ padding: '20px 24px', background: '#f8fafc', minHeight: '100vh' }}>
            
            {/* ═══════════════════════════════════════════════════════════ */}
            {/* VIEW 1: DATA TABLE LIST                                  */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {viewMode === 'list' && (
                <div>
                    {/* Header */}
                    <div className="page-header" style={{ marginBottom: '20px' }}>
                        <div className="header-left">
                            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                                <FileText size={28} color="#10b981" /> ใบแจ้งหนี้/ใบกำกับภาษี (Tax Invoice)
                            </h1>
                            <p className="page-subtitle" style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                                สร้างและจัดการข้อมูลเอกสารใบแจ้งหนี้/ใบกำกับภาษี (ELITE)
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
                                    placeholder="พิมพ์เลขที่ใบแจ้งหนี้ / ชื่อลูกค้า / อ้างถึง..." 
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

                            {/* ปุ่ม Icon Filter Toggle */}
                            <FilterToggleButton
                                isOpen={showFilter}
                                onClick={() => setShowFilter(prev => !prev)}
                                activeCount={activeFilterCount}
                            />
                        </div>

                        {canCreate('elite_doc_tax_invoice') && (
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
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}
                            >
                                <Plus size={18} /> สร้างใบแจ้งหนี้/ใบกำกับภาษี
                            </button>
                        )}
                    </div>

                    {/* ── Advanced Filter Drawer ── */}
                    <EliteTaxInvoiceFilterDrawer
                        isOpen={showFilter}
                        onClose={() => setShowFilter(false)}
                        filter={filter}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilter}
                        onQuickDate={handleQuickDate}
                        usersList={usersList}
                    />

                    {/* Table Card */}
                    <div className="table-card card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '60px', color: '#64748b', fontSize: '13px' }}>ลำดับ</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '80px', color: '#64748b', fontSize: '13px' }}>เวอร์ชั่น</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>เลขที่</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>ลูกค้า</th>
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
                                        <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                            <RefreshCw className="spin" size={24} style={{ display: 'inline-block', marginBottom: '8px' }} />
                                            <div>กำลังโหลดข้อมูล...</div>
                                        </td>
                                    </tr>
                                ) : invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                            <FileText size={40} color="#cbd5e1" style={{ display: 'inline-block', marginBottom: '10px' }} />
                                            <div>ไม่มีข้อมูลใบแจ้งหนี้/ใบกำกับภาษี</div>
                                            <p style={{ fontSize: '13px', marginTop: '4px' }}>กดปุ่ม "สร้างใบแจ้งหนี้/ใบกำกับภาษี" ด้านบนเพื่อเริ่มออกเอกสาร</p>
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((inv, idx) => (
                                        <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>
                                                {(pagination.page - 1) * pagination.limit + idx + 1}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                {(inv.Revision || 0) > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenHistory(inv)}
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
                                                        v.{inv.Revision}
                                                        <History size={12} />
                                                    </button>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>-</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 14px', fontWeight: '600', color: '#1e293b' }}>
                                                {inv.DocNo}
                                            </td>
                                            <td style={{ padding: '12px 14px', color: '#334155' }}>
                                                {inv.CustomerName}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>
                                                {Number(inv.GrandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center', color: '#475569' }}>
                                                {formatDateThai(inv.DocDate)}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                <span style={{
                                                    background: inv.Status === 'ยกเลิก' ? '#fee2e2' : '#ecfdf5',
                                                    color: inv.Status === 'ยกเลิก' ? '#b91c1c' : '#047857',
                                                    border: `1px solid ${inv.Status === 'ยกเลิก' ? '#fecaca' : '#a7f3d0'}`,
                                                    padding: '3px 10px',
                                                    borderRadius: '16px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    display: 'inline-block'
                                                }}>
                                                    {inv.Status || 'พร้อมใช้'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 14px', color: '#475569' }}>
                                                {inv.CreatedByName || '-'}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleViewPreview(inv)}
                                                        title="ดู / พิมพ์เอกสาร"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#2563eb', borderRadius: '4px' }}
                                                    >
                                                        <Eye size={17} />
                                                    </button>
                                                    {(inv.Revision || 0) > 0 && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleOpenHistory(inv)}
                                                            title="ประวัติการแก้ไข (Revision History)"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#6366f1', borderRadius: '4px' }}
                                                        >
                                                            <History size={17} />
                                                        </button>
                                                    )}
                                                    {canUpdate('elite_doc_tax_invoice') && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleEdit(inv)}
                                                            title="แก้ไขเอกสาร"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#7c3aed', borderRadius: '4px' }}
                                                        >
                                                            <Pencil size={17} />
                                                        </button>
                                                    )}
                                                    {canDelete('elite_doc_tax_invoice') && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleDelete(inv.id, inv.DocNo)}
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
                                fetchInvoices(newPage, debouncedSearch, filter, pagination.limit);
                            }}
                            onPageSizeChange={(newSize) => {
                                setPagination(prev => ({ ...prev, limit: newSize, page: 1 }));
                                fetchInvoices(1, debouncedSearch, filter, newSize);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* VIEW 2: TWO-COLUMN FORM (LEFT: DETAILS, RIGHT: SUMMARY)   */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {viewMode === 'form' && (
                <div>
                    {/* Top action / Back button */}
                    <div style={{ marginBottom: '16px' }}>
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
                            <FileText size={24} color="#4f46e5" /> {editingId ? `แก้ไขใบแจ้งหนี้/ใบกำกับภาษี (${docNo})` : 'ฟอร์มออกใบแจ้งหนี้/ใบกำกับภาษี'}
                            {editingId && (
                                <span style={{ fontSize: '13px', background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '3px 10px', borderRadius: '16px', fontWeight: '600', marginLeft: '6px' }}>
                                    {revision > 0 ? `เวอร์ชั่นปัจจุบัน: v.${revision} → เมื่อบันทึกจะเป็น v.${revision + 1}` : `เมื่อบันทึกจะเป็น v.1`}
                                </span>
                            )}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                            {editingId ? 'แก้ไขข้อมูลใบแจ้งหนี้/ใบกำกับภาษี ระบบจะบันทึกประวัติเวอร์ชั่นเดิมและปรับขึ้นเป็นเวอร์ชั่นใหม่ให้อัตโนมัติ' : 'กรุณากรอกข้อมูลให้ครบถ้วนเพื่อออกใบแจ้งหนี้/ใบกำกับภาษีและเชื่อมต่อข้อมูล (ELITE)'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* ── Two-Column Grid ── */}
                        <div className="elite-form-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) 420px',
                            gap: '24px',
                            alignItems: 'start'
                        }}>
                            
                            {/* ── LEFT COLUMN: Form Inputs ── */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                
                                {/* Section 1: ข้อมูลเอกสาร */}
                                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>ข้อมูลเอกสาร</h3>
                                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>ตั้งค่าบัญชีธนาคาร ผู้มีอำนาจลงนาม และเลขที่เอกสาร</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                                                บัญชีธนาคาร (บริษัทรับเงิน) <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <CustomSelect 
                                                value={bankAccount} 
                                                onChange={(e) => setBankAccount(e.target.value)} 
                                                usePortal={true}
                                                style={{ width: '100%', minHeight: '42px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#fff', fontSize: '14px' }}
                                            >
                                                <option value="kbank_elite_2020">ธนาคารกสิกรไทย (083-3-95366-4)</option>
                                                <option value="kbank_company">ธนาคารกสิกรไทย (201-3-35956-6)</option>
                                                <option value="kbank_charan">ธนาคารกสิกรไทย (235-1-19734-2)</option>
                                            </CustomSelect>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                                                ผู้เสนอราคา / ผู้วางบิล (ลายเซ็น)
                                            </label>
                                            <CustomSelect 
                                                value={signer} 
                                                onChange={(e) => setSigner(e.target.value)} 
                                                usePortal={true}
                                                style={{ width: '100%', minHeight: '42px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#fff', fontSize: '14px' }}
                                            >
                                                <option value="none">-- ไม่ระบุ (เว้นว่าง) --</option>
                                                <option value="jutarat">จุฑารัตน์ วงค์คำเหลา</option>
                                                <option value="kwanarak">ขวัญอารักษ์ อนุภัทรเหมรัตน์</option>
                                                <option value="weena">วีณา มั่นคง</option>
                                            </CustomSelect>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                                                เลขที่ / No. <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                disabled 
                                                value={docNo} 
                                                placeholder="(สร้างอัตโนมัติเมื่อบันทึก)" 
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#f1f5f9', fontWeight: '600', fontSize: '14px' }} 
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                                                วันที่ / Date <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <CustomDatePicker 
                                                required 
                                                value={docDate} 
                                                onChange={(e) => {
                                                    setDocDate(e.target.value);
                                                    if (!editingId) fetchNextNumber(e.target.value);
                                                }} 
                                                style={{ 
                                                    width: '100%', 
                                                    height: '42px', 
                                                    borderRadius: '8px', 
                                                    border: '1.5px solid #cbd5e1', 
                                                    background: '#fff', 
                                                    fontSize: '14px' 
                                                }} 
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                                                เงื่อนไขการชำระเงิน
                                            </label>
                                            <input 
                                                type="text" 
                                                placeholder="เช่น เงินสด, เครดิต 30 วัน" 
                                                value={paymentTerm} 
                                                onChange={(e) => setPaymentTerm(e.target.value)} 
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px' }} 
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                                                ผู้ติดต่อ
                                            </label>
                                            <input 
                                                type="text" 
                                                placeholder="ชื่อผู้ติดต่อ (ถ้ามี)" 
                                                value={contactPerson} 
                                                onChange={(e) => setContactPerson(e.target.value)} 
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px' }} 
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                                                อ้างถึง
                                            </label>
                                            <input 
                                                type="text" 
                                                placeholder="เอกสารอ้างถึง (ถ้ามี)" 
                                                value={reference} 
                                                onChange={(e) => setReference(e.target.value)} 
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px' }} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: ข้อมูลลูกค้า */}
                                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>ข้อมูลลูกค้า</h3>
                                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>ชื่อ ที่อยู่ เบอร์โทร และเลขประจำตัวผู้เสียภาษีของลูกค้า</p>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                                            ชื่อลูกค้า / บริษัท <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            required 
                                            placeholder="กรอกชื่อลูกค้าหรือบริษัท" 
                                            value={customerName} 
                                            onChange={(e) => setCustomerName(e.target.value)} 
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px' }} 
                                        />
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                                            ที่อยู่ <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                            <input type="text" required placeholder="บ้านเลขที่, อาคาร, หมู่" value={address.no} onChange={(e) => handleAddressChange('no', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }} />
                                            <input type="text" placeholder="ซอย (ถ้ามี)" value={address.soi} onChange={(e) => handleAddressChange('soi', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }} />
                                            <input type="text" placeholder="ถนน (ถ้ามี)" value={address.road} onChange={(e) => handleAddressChange('road', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }} />
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
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }} 
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
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }} 
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
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }} 
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
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }} 
                                                />
                                                {renderAddressSuggestions('zipCode', address.zipcode)}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>โทรศัพท์</label>
                                            <input type="text" placeholder="เช่น 0812345678" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>เลขประจำตัวผู้เสียภาษี</label>
                                            <div style={{ display: 'flex', alignItems: 'center', height: '42px', overflowX: 'auto' }}>
                                                <TaxIdInput value={customerTaxId} onChange={(e) => setCustomerTaxId(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: รายการ */}
                                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                    
                                    {/* Space / Lock Rental Selector */}
                                    <div style={{
                                        marginBottom: '20px',
                                        padding: '16px',
                                        background: '#f8fafc',
                                        borderRadius: '10px',
                                        border: '1px solid #cbd5e1'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: '10px',
                                            marginBottom: '10px'
                                        }}>
                                            <label style={{
                                                fontWeight: '700',
                                                color: '#1a7a3a',
                                                fontSize: '14px',
                                                margin: 0
                                            }}>
                                                เลือกพื้นที่ให้เช่า (ระบบจะซิงค์รายการลงในตารางให้อัตโนมัติ หรือกดปุ่มดึงรายการเช่า)
                                            </label>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <button 
                                                    type="button"
                                                    onClick={handleApplyStandardRentalItems}
                                                    style={{
                                                        backgroundColor: '#16a34a',
                                                        color: '#ffffff',
                                                        fontSize: '12px',
                                                        padding: '5px 12px',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        fontWeight: '600'
                                                    }}
                                                    title="ดึงรายการเช่าและส่วนกลางตามล็อกที่เลือกลงในตารางรายการ"
                                                >
                                                    <Plus size={13} />
                                                    ดึงรายการเช่าลงตาราง {selectedSpaceKeys.length > 0 ? `(${selectedSpaceKeys.length})` : ''}
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={handleOpenSpaceModal}
                                                    style={{
                                                        backgroundColor: '#64748b',
                                                        color: '#ffffff',
                                                        fontSize: '12px',
                                                        padding: '5px 12px',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        fontWeight: '500'
                                                    }}
                                                    title="จัดการล็อกและพื้นที่"
                                                >
                                                    <Settings size={13} />
                                                    จัดการล็อก/การจอง
                                                </button>
                                            </div>
                                        </div>

                                        {/* Multi-select Dropdown Container */}
                                        <div ref={spaceDropdownRef} style={{ position: 'relative' }}>
                                            <div 
                                                onClick={() => setIsSpaceDropdownOpen(prev => !prev)}
                                                style={{
                                                    width: '100%',
                                                    minHeight: '44px',
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    border: '1.5px solid #cbd5e1',
                                                    background: '#ffffff',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    flexWrap: 'wrap',
                                                    gap: '6px',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', flex: 1 }}>
                                                    {selectedSpaceKeys.length === 0 ? (
                                                        <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                                                            -- กรุณาเลือกล็อก (เลือกได้หลายล็อก) --
                                                        </span>
                                                    ) : (
                                                        selectedSpaceKeys.map(key => {
                                                            const sp = spacesList.find(s => s.key === key);
                                                            if (!sp) return null;
                                                            return (
                                                                <span 
                                                                    key={key}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        background: sp.status === 'จองแล้ว' ? '#fef2f2' : '#f0fdf4',
                                                                        color: sp.status === 'จองแล้ว' ? '#dc2626' : '#15803d',
                                                                        border: `1px solid ${sp.status === 'จองแล้ว' ? '#fca5a5' : '#bbf7d0'}`,
                                                                        padding: '3px 8px',
                                                                        borderRadius: '14px',
                                                                        fontSize: '12px',
                                                                        fontWeight: '500'
                                                                    }}
                                                                >
                                                                    {sp.name} ({sp.size} ตร.ม.)
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => handleRemoveSpace(e, key)}
                                                                        style={{
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            color: 'inherit',
                                                                            cursor: 'pointer',
                                                                            padding: 0,
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            marginLeft: '3px'
                                                                        }}
                                                                    >
                                                                        <X size={13} />
                                                                    </button>
                                                                </span>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                                <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', paddingLeft: '6px' }}>
                                                    <ChevronDown size={18} style={{ transform: isSpaceDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                                </div>
                                            </div>

                                            {/* Dropdown Options List */}
                                            {isSpaceDropdownOpen && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 'calc(100% + 4px)',
                                                    left: 0,
                                                    right: 0,
                                                    background: '#ffffff',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.08)',
                                                    zIndex: 100,
                                                    maxHeight: '340px',
                                                    overflowY: 'auto'
                                                }}>
                                                    {/* Search input in dropdown */}
                                                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 2 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px' }}>
                                                            <Search size={14} style={{ color: '#94a3b8', marginRight: '6px' }} />
                                                            <input 
                                                                type="text" 
                                                                placeholder="ค้นหาล็อกหรือโซน..."
                                                                value={spaceSearch}
                                                                onChange={(e) => setSpaceSearch(e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px' }}
                                                            />
                                                            {spaceSearch && (
                                                                <button 
                                                                    type="button" 
                                                                    onClick={(e) => { e.stopPropagation(); setSpaceSearch(''); }}
                                                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Grouped items */}
                                                    {Object.keys(filteredGroupedSpaces).length === 0 ? (
                                                        <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                                            ไม่พบข้อมูลล็อก
                                                        </div>
                                                    ) : (
                                                        Object.entries(filteredGroupedSpaces).map(([zone, spList]) => (
                                                            <div key={zone}>
                                                                <div style={{
                                                                    backgroundColor: '#f1f5f9',
                                                                    color: '#1a7a3a',
                                                                    fontWeight: '700',
                                                                    padding: '6px 12px',
                                                                    borderBottom: '1px solid #e2e8f0',
                                                                    fontSize: '13px',
                                                                    position: 'sticky',
                                                                    top: '45px',
                                                                    zIndex: 1
                                                                }}>
                                                                    {zone}
                                                                </div>
                                                                {spList.map(sp => {
                                                                    const isSelected = selectedSpaceKeys.includes(sp.key);
                                                                    const isBooked = sp.status === 'จองแล้ว';
                                                                    return (
                                                                        <div
                                                                            key={sp.key}
                                                                            onClick={() => handleToggleSpace(sp.key)}
                                                                            style={{
                                                                                padding: '8px 14px',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'space-between',
                                                                                backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                                                                                borderBottom: '1px solid #f8fafc',
                                                                                transition: 'background-color 0.15s'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                                                            }}
                                                                        >
                                                                            <div style={{
                                                                                color: isBooked ? '#ef4444' : '#1e293b',
                                                                                fontWeight: isBooked ? '600' : 'normal',
                                                                                fontSize: '13px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '8px'
                                                                            }}>
                                                                                <input 
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={() => {}} // handled by parent div
                                                                                    style={{ cursor: 'pointer' }}
                                                                                />
                                                                                <span>
                                                                                    {isBooked ? `[จองแล้ว] ${sp.name} (${sp.size} ตร.ม.) - ${sp.booker || 'จองแล้ว'}` : `${sp.name} (${sp.size} ตร.ม.)`}
                                                                                </span>
                                                                            </div>
                                                                            {isSelected && (
                                                                                <Check size={16} style={{ color: '#16a34a' }} />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        color: '#1a7a3a',
                                        borderBottom: '2px solid #e2e8f0',
                                        paddingBottom: '10px',
                                        marginBottom: '16px'
                                    }}>
                                        รายการ
                                    </div>

                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                <th style={{ padding: '10px', textAlign: 'center', width: '50px', color: '#475569', fontSize: '13px' }}>ลำดับ</th>
                                                <th style={{ padding: '10px', textAlign: 'left', color: '#475569', fontSize: '13px' }}>รายละเอียด / รายการ</th>
                                                <th style={{ padding: '10px', textAlign: 'center', width: '80px', color: '#475569', fontSize: '13px' }}>จำนวน</th>
                                                <th style={{ padding: '10px', textAlign: 'center', width: '80px', color: '#475569', fontSize: '13px' }}>หน่วย</th>
                                                <th style={{ padding: '10px', textAlign: 'right', width: '110px', color: '#475569', fontSize: '13px' }}>ราคา/หน่วย</th>
                                                <th style={{ padding: '10px', textAlign: 'right', width: '120px', color: '#475569', fontSize: '13px' }}>รวมเป็นเงิน</th>
                                                <th style={{ padding: '10px', textAlign: 'center', width: '60px', color: '#475569', fontSize: '13px' }}>จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                                                    <td style={{ padding: '8px' }}>
                                                        <input type="text" required placeholder="รายละเอียดรายการ..." value={item.desc} onChange={(e) => updateItem(item.id, 'desc', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <input type="number" required min="0" step="any" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} style={{ width: '100%', padding: '8px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '13px' }} />
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <input type="text" required placeholder="หน่วย" value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} style={{ width: '100%', padding: '8px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '13px' }} />
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <input type="number" required min="0" step="any" value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} style={{ width: '100%', padding: '8px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', fontSize: '13px' }} />
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>
                                                        {((Number(item.qty) || 0) * (Number(item.price) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeItem(item.id)} 
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
                                                            title="ลบรายการ"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <button 
                                            type="button" 
                                            onClick={addItem} 
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                background: '#16a34a',
                                                color: '#ffffff',
                                                border: 'none',
                                                padding: '8px 16px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '13px'
                                            }}
                                        >
                                            <Plus size={16} />
                                            เพิ่มรายการ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleApplyStandardRentalItems}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                background: '#f0fdf4',
                                                color: '#16a34a',
                                                border: '1.5px solid #86efac',
                                                padding: '8px 16px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '13px'
                                            }}
                                            title="ดึงรายการเช่ามาตรฐานตามล็อกที่เลือกด้านบนลงในตาราง"
                                        >
                                            <RefreshCw size={14} />
                                            ดึงรายการเช่ามาตรฐานตามล็อกที่เลือก {selectedSpaceKeys.length > 0 ? `(${selectedSpaceKeys.length})` : ''}
                                        </button>
                                    </div>
                                </div>

                                {/* Section 4: หมายเหตุ */}
                                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                    <h3 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>หมายเหตุ (ถ้ามี)</h3>
                                    <div style={{
                                        border: '1.5px solid #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '10px 12px',
                                        background: '#fff',
                                        minHeight: '100px',
                                        cursor: 'text'
                                    }}>
                                        <TipTapCell 
                                            value={remarks} 
                                            onChange={(val) => setRemarks(val)} 
                                            placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                                            alignTop={true}
                                            style={{ minHeight: '80px', fontSize: '13px' }}
                                        />
                                    </div>
                                    <small style={{ color: '#64748b', fontSize: '11px', marginTop: '6px', display: 'block' }}>
                                        💡 คลุมดำ (ไฮไลต์) ข้อความเพื่อปรับแต่งสี ขนาด ตัวหนา/ตัวเอียง หรือขีดเส้นใต้
                                    </small>
                                </div>

                            </div>

                            {/* ── RIGHT COLUMN: Extra Calculations (Sidebar Matching Image) ── */}
                            <div style={{
                                position: 'sticky',
                                top: '80px',
                                background: '#fff',
                                borderRadius: '12px',
                                padding: '22px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                            }}>
                                
                                {/* Title: การคำนวณเพิ่มเติม (ติ๊กเพื่อใช้งาน) */}
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: '700',
                                    color: '#1a7a3a',
                                    borderBottom: '2px solid #e2e8f0',
                                    paddingBottom: '10px',
                                    marginBottom: '16px'
                                }}>
                                    การคำนวณเพิ่มเติม (ติ๊กเพื่อใช้งาน)
                                </div>

                                {/* Calculation Checkboxes Box */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px',
                                    marginBottom: '20px',
                                    background: '#fff',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1'
                                }}>
                                    
                                    {/* 1. หักส่วนลด */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        <input 
                                            type="checkbox" 
                                            id="enableDiscount" 
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
                                        <label htmlFor="enableDiscount" style={{ margin: 0, fontWeight: 'bold', width: '110px', cursor: 'pointer', fontSize: '14px', color: '#1e293b' }}>
                                            หักส่วนลด
                                        </label>
                                        {enableDiscount && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max="100" 
                                                    step="0.01" 
                                                    placeholder="%" 
                                                    value={discountPercent} 
                                                    onChange={(e) => handleDiscountPercentChange(e.target.value)} 
                                                    style={{ width: '60px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontSize: '13px' }} 
                                                />
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>% หรือ</span>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    step="0.01" 
                                                    placeholder="จำนวนเงิน" 
                                                    value={discountAmount || ''} 
                                                    onChange={(e) => handleDiscountAmountChange(e.target.value)} 
                                                    style={{ width: '90px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right', fontSize: '13px' }} 
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. ภาษีมูลค่าเพิ่ม */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        <input 
                                            type="checkbox" 
                                            id="enableVat" 
                                            checked={enableVat} 
                                            onChange={(e) => {
                                                setEnableVat(e.target.checked);
                                                if (e.target.checked) {
                                                    setVatType('7');
                                                } else {
                                                    setVatType('none');
                                                }
                                            }} 
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="enableVat" style={{ margin: 0, fontWeight: 'bold', width: '110px', cursor: 'pointer', fontSize: '14px', color: '#1e293b' }}>
                                            ภาษีมูลค่าเพิ่ม
                                        </label>
                                        {enableVat && (
                                            <div>
                                                <CustomSelect 
                                                    value={vatType} 
                                                    onChange={(e) => setVatType(e.target.value)} 
                                                    usePortal={true}
                                                    style={{ width: '135px', minHeight: '34px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px' }}
                                                >
                                                    <option value="7">รวม VAT 7%</option>
                                                    <option value="none">ไม่มี VAT</option>
                                                </CustomSelect>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. ยอดเงินมัดจำ */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        <input 
                                            type="checkbox" 
                                            id="enableDeposit" 
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
                                        <label htmlFor="enableDeposit" style={{ margin: 0, fontWeight: 'bold', width: '110px', cursor: 'pointer', fontSize: '14px', color: '#1e293b' }}>
                                            ยอดเงินมัดจำ
                                        </label>
                                        {enableDeposit && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max="100" 
                                                    step="1" 
                                                    placeholder="%" 
                                                    value={depositPercent} 
                                                    onChange={(e) => handleDepositPercentChange(e.target.value)} 
                                                    style={{ width: '55px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontSize: '13px' }} 
                                                />
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>% (มัดจำ:</span>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    step="0.01" 
                                                    placeholder="บาท" 
                                                    value={depositAmount || ''} 
                                                    onChange={(e) => handleDepositAmountChange(e.target.value)} 
                                                    style={{ width: '85px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right', fontSize: '13px' }} 
                                                />
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>บาท)</span>
                                            </div>
                                        )}
                                    </div>

                                </div>

                                {/* Summary Rows */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', color: '#1e293b' }}>
                                        <span>รวมเป็นเงิน:</span>
                                        <span>{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', color: '#1e293b' }}>
                                        <span>หักส่วนลด:</span>
                                        <span>{effectiveDiscount > 0 ? effectiveDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'} บาท</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', color: '#1e293b' }}>
                                        <span>จำนวนเงินหลังหักส่วนลด:</span>
                                        <span>{afterDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', color: '#1e293b' }}>
                                        <span>ภาษีมูลค่าเพิ่ม 7%:</span>
                                        <span>{effectiveVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                    </div>

                                    {enableDeposit && Number(effectiveDeposit) > 0 && (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', color: '#0369a1', fontWeight: 'bold', marginTop: '6px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                                                <span>ยอดชำระมัดจำ:</span>
                                                <span>{effectiveDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', color: '#dc2626', fontWeight: 'bold' }}>
                                                <span>ยอดคงเหลือที่ต้องชำระ:</span>
                                                <span>{remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท</span>
                                            </div>
                                        </>
                                    )}

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'baseline',
                                        marginTop: '6px',
                                        paddingTop: '12px',
                                        borderTop: '2px solid #e2e8f0'
                                    }}>
                                        <span style={{ color: '#1a7a3a', fontWeight: '700', fontSize: '16px' }}>จำนวนเงินรวมทั้งสิ้น:</span>
                                        <span style={{ color: '#1a7a3a', fontWeight: '800', fontSize: '20px' }}>
                                            {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                                    <button 
                                        type="button" 
                                        onClick={handlePreviewFromForm} 
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            background: '#3b82f6',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '12px 14px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '15px',
                                            fontWeight: '600',
                                            boxShadow: '0 2px 6px rgba(59, 130, 246, 0.25)',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <Printer size={18} /> พิมพ์บิล
                                    </button>
                                    
                                    <button 
                                        type="submit" 
                                        disabled={isLoading} 
                                        style={{
                                            flex: 1.2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            background: '#10b981',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '12px 14px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '15px',
                                            fontWeight: '600',
                                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                                            opacity: isLoading ? 0.7 : 1,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {isLoading ? <RefreshCw className="spin" size={18} /> : <Save size={18} />} {editingId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                                    </button>
                                </div>

                            </div>

                        </div>
                    </form>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* PREVIEW MODAL POPUP                                       */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {isPreviewModalOpen && previewData && (
                <div 
                    className="pdf-preview-overlay"
                    onClick={() => setIsPreviewModalOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            width: '100%',
                            maxWidth: '960px',
                            height: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 20px',
                            borderBottom: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                                        พรีวิวเอกสารใบแจ้งหนี้ / ใบกำกับภาษี
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                        เลขที่: <span style={{ fontWeight: 600, color: '#0f766e' }}>{previewData.docNo || '-'}</span> | ผู้รับ: {previewData.customerName || '-'}
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={handlePrintDocument}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: '#f59e0b',
                                        color: '#ffffff',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(245, 158, 11, 0.25)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Printer size={16} /> พิมพ์เอกสาร
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
                                        gap: '4px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <X size={16} /> ปิด
                                </button>
                            </div>
                        </div>

                        {/* Modal Body - Scrollable A4 Container */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '24px 16px',
                            background: '#f1f5f9',
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <div 
                                ref={printContainerRef}
                                className="print-area" 
                                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1)', background: '#fff' }}
                            >
                                <EliteTaxInvoicePrint data={previewData} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Revision History Modal */}
            {isHistoryModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    backdropFilter: 'blur(2px)'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        width: '100%',
                        maxWidth: '650px',
                        maxHeight: '85vh',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <History size={19} color="#4f46e5" />
                                    ประวัติการแก้ไขเอกสาร (Revision History)
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                                    เลขที่เอกสาร: <span style={{ fontWeight: '600', color: '#0f172a' }}>{historyDocNo}</span>
                                </p>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsHistoryModalOpen(false)}
                                style={{
                                    background: '#f1f5f9',
                                    border: 'none',
                                    fontSize: '18px',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                            {isLoadingHistory ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                    <RefreshCw className="spin" size={24} style={{ display: 'inline-block', marginBottom: '8px' }} />
                                    <div>กำลังโหลดประวัติ...</div>
                                </div>
                            ) : historyList.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                    <History size={36} color="#cbd5e1" style={{ display: 'inline-block', marginBottom: '8px' }} />
                                    <p style={{ margin: 0, fontSize: '14px' }}>ยังไม่มีประวัติการแก้ไขสำหรับเอกสารนี้ (เป็นเวอร์ชั่นแรก)</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {historyList.map((h) => (
                                        <div key={h.HistoryID} style={{
                                            padding: '12px 16px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            background: '#ffffff',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        background: '#e0e7ff',
                                                        color: '#4338ca',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: '700'
                                                    }}>
                                                        v.{h.Revision}
                                                    </span>
                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                                                        {h.CustomerName}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                                    ยอดรวม: <strong>{Number(h.GrandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท</strong>
                                                    {h.ArchivedByName && <span> &bull; โดย: {h.ArchivedByName}</span>}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                                    บันทึกประวัติเมื่อ: {new Date(h.ArchivedAt).toLocaleString('th-TH')}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsHistoryModalOpen(false);
                                                    handleViewHistorySnapshot(h.HistoryID);
                                                }}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    background: '#f8fafc',
                                                    border: '1px solid #cbd5e1',
                                                    color: '#2563eb',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Eye size={14} /> ดูเอกสารฉบับนี้
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Space Editor Modal */}
            {isSpaceModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        width: '100%',
                        maxWidth: '850px',
                        maxHeight: '90vh',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1a7a3a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Settings size={20} />
                                ⚙️ จัดการล็อกและพื้นที่ (Database)
                            </h3>
                            <button 
                                type="button" 
                                onClick={handleCloseSpaceModal}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '22px',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    padding: '4px',
                                    lineHeight: 1
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Modal Body: Scrollable Table */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                                        <th style={{ padding: '8px 4px', width: '50px', textAlign: 'center', color: '#475569' }}>ลำดับ</th>
                                        <th style={{ padding: '8px 6px', width: '120px', textAlign: 'left', color: '#475569' }}>โซน</th>
                                        <th style={{ padding: '8px 6px', width: '160px', textAlign: 'left', color: '#475569' }}>ชื่อล็อก</th>
                                        <th style={{ padding: '8px 6px', width: '100px', textAlign: 'center', color: '#475569' }}>ขนาด (ตร.ม.)</th>
                                        <th style={{ padding: '8px 6px', width: '110px', textAlign: 'center', color: '#475569' }}>สถานะ</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'left', color: '#475569' }}>ชื่อคนจอง (ถ้ามี)</th>
                                        <th style={{ padding: '8px 4px', width: '70px', textAlign: 'center', color: '#475569' }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tempSpaces.map((sp, idx) => (
                                        <tr key={sp.tempId || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                    <button
                                                        type="button"
                                                        disabled={idx === 0}
                                                        onClick={() => handleMoveSpaceRow(idx, -1)}
                                                        style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#cbd5e1' : '#64748b', padding: 0 }}
                                                        title="เลื่อนขึ้น"
                                                    >
                                                        <ArrowUp size={12} />
                                                    </button>
                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{idx + 1}</span>
                                                    <button
                                                        type="button"
                                                        disabled={idx === tempSpaces.length - 1}
                                                        onClick={() => handleMoveSpaceRow(idx, 1)}
                                                        style={{ background: 'none', border: 'none', cursor: idx === tempSpaces.length - 1 ? 'default' : 'pointer', color: idx === tempSpaces.length - 1 ? '#cbd5e1' : '#64748b', padding: 0 }}
                                                        title="เลื่อนลง"
                                                    >
                                                        <ArrowDown size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px' }}>
                                                <input 
                                                    type="text" 
                                                    value={sp.zone} 
                                                    onChange={(e) => handleUpdateSpaceRow(idx, 'zone', e.target.value)}
                                                    placeholder="เช่น โซน A"
                                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
                                                />
                                            </td>
                                            <td style={{ padding: '6px' }}>
                                                <input 
                                                    type="text" 
                                                    value={sp.name} 
                                                    onChange={(e) => handleUpdateSpaceRow(idx, 'name', e.target.value)}
                                                    placeholder="เช่น A1"
                                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
                                                />
                                            </td>
                                            <td style={{ padding: '6px' }}>
                                                <input 
                                                    type="number" 
                                                    value={sp.size} 
                                                    onChange={(e) => handleUpdateSpaceRow(idx, 'size', e.target.value)}
                                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '13px' }} 
                                                />
                                            </td>
                                            <td style={{ padding: '6px' }}>
                                                <select 
                                                    value={sp.status} 
                                                    onChange={(e) => handleUpdateSpaceRow(idx, 'status', e.target.value)}
                                                    style={{ 
                                                        width: '100%', 
                                                        padding: '6px 8px', 
                                                        borderRadius: '4px', 
                                                        border: '1px solid #cbd5e1', 
                                                        fontSize: '13px',
                                                        color: sp.status === 'จองแล้ว' ? '#dc2626' : '#15803d',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    <option value="ว่าง">ว่าง</option>
                                                    <option value="จองแล้ว">จองแล้ว</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '6px' }}>
                                                <input 
                                                    type="text" 
                                                    value={sp.booker || ''} 
                                                    onChange={(e) => handleUpdateSpaceRow(idx, 'booker', e.target.value)}
                                                    placeholder={sp.status === 'จองแล้ว' ? 'ชื่อผู้จอง/ร้านค้า' : '-'}
                                                    disabled={sp.status !== 'จองแล้ว'}
                                                    style={{ 
                                                        width: '100%', 
                                                        padding: '6px 8px', 
                                                        borderRadius: '4px', 
                                                        border: '1px solid #cbd5e1', 
                                                        fontSize: '13px',
                                                        background: sp.status === 'จองแล้ว' ? '#ffffff' : '#f1f5f9'
                                                    }} 
                                                />
                                            </td>
                                            <td style={{ padding: '6px', textAlign: 'center' }}>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveSpaceRow(idx)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                    title="ลบแถวนี้"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '14px 20px',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <button 
                                type="button" 
                                onClick={handleAddSpaceRow}
                                style={{
                                    padding: '8px 14px',
                                    border: '1px solid #1a7a3a',
                                    background: '#ffffff',
                                    color: '#1a7a3a',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontWeight: '600',
                                    fontSize: '13px'
                                }}
                            >
                                <Plus size={15} />
                                เพิ่มล็อกใหม่
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    type="button" 
                                    onClick={handleCloseSpaceModal}
                                    style={{
                                        padding: '8px 16px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        color: '#475569',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '13px'
                                    }}
                                >
                                    ยกเลิก
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleSaveSpaces}
                                    style={{
                                        padding: '8px 18px',
                                        border: 'none',
                                        background: '#1a7a3a',
                                        color: '#ffffff',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '13px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Save size={15} />
                                    บันทึกข้อมูล
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @media (max-width: 1024px) {
                    .elite-form-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    html, body {
                        background-color: #ffffff !important;
                        height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Reset application containers so page boundaries don't clip the document */
                    body > div, body > div > div, .app-container, main, .main-content, .page-wrapper, .page-container {
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        display: block !important;
                    }
                    /* Hide UI chrome, sidebar, navigation, buttons, and form controls */
                    .sidebar, .top-navbar, .page-title, .toolbar, .elite-form-grid, form, button, .top-company-selector {
                        display: none !important;
                    }
                    .pdf-preview-overlay {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        min-height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        backdrop-filter: none !important;
                        display: block !important;
                        overflow: visible !important;
                        z-index: 999999 !important;
                    }
                    .pdf-preview-overlay > div {
                        position: static !important;
                        width: 100% !important;
                        max-width: none !important;
                        height: auto !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        overflow: visible !important;
                        display: block !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: transparent !important;
                    }
                    .pdf-preview-overlay > div > div:first-child {
                        display: none !important;
                    }
                    .pdf-preview-overlay > div > div:last-child {
                        position: static !important;
                        height: auto !important;
                        overflow: visible !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: #ffffff !important;
                        display: block !important;
                    }
                    .print-area {
                        position: static !important;
                        width: 210mm !important;
                        margin: 0 auto !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: #ffffff !important;
                    }
                }
            `}</style>
        </div>
    );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import {
    Plus, Search, Pencil, Trash2, Eye, Printer, FileText, ArrowLeft,
    RefreshCw, Save, X, History, CreditCard
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import PaginationControl from '../components/PaginationControl';
import EliteReceiptPrint from '../components/EliteReceiptPrint';
import TaxIdInput from '../components/TaxIdInput';
import CustomDatePicker from '../components/CustomDatePicker';
import { TipTapCell } from '../components/TipTapCell';
import { numberToThaiBaht } from '../utils/thaiBahtConverter';
import { searchThaiAddress } from '../utils/thaiAddress';

const DEFAULT_RECEIPT_REMARKS = '<p>ใบเสร็จรับเงินฉบับนี้จะสมบูรณ์เมื่อมีลายเซ็นของพนักงานการเงินและผู้รับมอบอำนาจ หากชำระเงินด้วยเช็ค</p><p>ใบเสร็จรับเงินจะสมบูรณ์เมื่อ บริษัท อิลิท เทรดดิ้ง 2020 จำกัด ได้รับเงินตามเช็คเรียบร้อยแล้ว</p>';

export default function EliteReceipt() {
    const { token, canCreate, canUpdate, canDelete } = useAuth();
    const { showAlert } = useAlert();

    // View mode: 'list' | 'form'
    const [viewMode, setViewMode] = useState('list');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(false);

    // List & Filters
    const [receipts, setReceipts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    // Form data
    const [editingId, setEditingId] = useState(null);
    const [docNo, setDocNo] = useState('');
    const [bookNo, setBookNo] = useState('');
    const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
    const [docType, setDocType] = useState('receipt'); // 'receipt' | 'receipt_tax'
    const [customerName, setCustomerName] = useState('');
    const [address, setAddress] = useState({
        no: '', soi: '', road: '', subdistrict: '', district: '', province: '', zipcode: ''
    });
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerTaxId, setCustomerTaxId] = useState('');
    const [itemsDesc, setItemsDesc] = useState('');
    const [amount, setAmount] = useState('');
    const grandTotal = parseFloat(amount) || 0;
    const subtotal = grandTotal;

    // Payment method
    const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'check' | 'transfer'
    const [bankName, setBankName] = useState('');
    const [bankBranch, setBankBranch] = useState('');
    const [checkNo, setCheckNo] = useState('');
    const [checkDate, setCheckDate] = useState('');

    const [remarks, setRemarks] = useState(DEFAULT_RECEIPT_REMARKS);
    const [signer, setSigner] = useState('');
    const [invoiceId, setInvoiceId] = useState(null);

    // Preview Container State
    const [previewData, setPreviewData] = useState(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const printContainerRef = useRef(null);

    // Revision & History State
    const [revision, setRevision] = useState(0);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historyDocNo, setHistoryDocNo] = useState('');

    // ── Amount Change Handler ──
    const handleAmountChange = (val) => {
        setAmount(val);
    };

    // ── Fetch Receipts List ──
    const fetchReceipts = useCallback(async (page = 1, search = searchQuery, status = statusFilter, limit = pagination.limit) => {
        setIsLoadingList(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: search || '',
                status: status || 'all'
            });

            const res = await fetch(`/api/elite-receipts?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setReceipts(data.data || []);
                if (data.pagination) {
                    setPagination(data.pagination);
                }
            } else {
                showAlert('แจ้งเตือน', data.message || 'ไม่สามารถโหลดข้อมูลใบเสร็จได้', 'error');
            }
        } catch (err) {
            console.error('Error loading receipts:', err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อโหลดข้อมูลรายการใบเสร็จได้', 'error');
        } finally {
            setIsLoadingList(false);
        }
    }, [token, searchQuery, statusFilter, pagination.limit, showAlert]);

    useEffect(() => {
        fetchReceipts(pagination.page, searchQuery, statusFilter, pagination.limit);
    }, [fetchReceipts, pagination.page, statusFilter]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchReceipts(1, searchQuery, statusFilter, pagination.limit);
    };

    // ── Fetch Next Doc Number & Book No ──
    const fetchNextNumber = async (date) => {
        try {
            const res = await fetch(`/api/elite-receipts/next-number?date=${date || docDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                if (data.nextNumber) setDocNo(data.nextNumber);
                if (data.bookNo) setBookNo(data.bookNo);
            }
        } catch (err) {
            console.error('Error getting next receipt number:', err);
        }
    };

    // ── Open Create Form ──
    const handleCreateNew = () => {
        setEditingId(null);
        setRevision(0);
        const today = new Date().toISOString().split('T')[0];
        setDocDate(today);
        setDocType('receipt');
        setCustomerName('');
        setAddress({ no: '', soi: '', road: '', subdistrict: '', district: '', province: '', zipcode: '' });
        setCustomerPhone('');
        setCustomerTaxId('');
        setItemsDesc('');
        setAmount('');
        setPaymentMethod('cash');
        setBankName('');
        setBankBranch('');
        setCheckNo('');
        setCheckDate('');
        setRemarks(DEFAULT_RECEIPT_REMARKS);
        setSigner('');
        setInvoiceId(null);
        fetchNextNumber(today);
        setViewMode('form');
    };

    // ── Open Edit Form ──
    const handleEdit = (rec) => {
        setEditingId(rec.id);
        setRevision(rec.Revision || 0);
        setDocNo(rec.DocNo || '');
        setBookNo(rec.BookNo || '');
        setDocDate(rec.DocDate ? rec.DocDate.split('T')[0] : new Date().toISOString().split('T')[0]);
        setDocType(rec.DocType || 'receipt');
        setCustomerName(rec.CustomerName || '');
        setAddress({
            no: rec.CustomerAddress || '',
            soi: '', road: '', subdistrict: '', district: '', province: '', zipcode: ''
        });
        setCustomerPhone(rec.CustomerPhone || '');
        setCustomerTaxId(rec.CustomerTaxId || '');

        let parsedItems = [];
        try {
            parsedItems = JSON.parse(rec.ItemsJSON || '[]');
        } catch {
            parsedItems = [];
        }
        setItemsDesc(rec.ItemsDesc || (parsedItems[0]?.desc) || '');

        const initialAmt = rec.GrandTotal != null ? rec.GrandTotal : (rec.Subtotal != null ? rec.Subtotal : (parsedItems[0]?.price || ''));
        setAmount(initialAmt !== '' && initialAmt != null ? String(initialAmt) : '');

        setPaymentMethod(rec.PaymentMethod || 'cash');
        setBankName(rec.BankName || '');
        setBankBranch(rec.BankBranch || '');
        setCheckNo(rec.CheckNo || '');
        setCheckDate(rec.CheckDate ? rec.CheckDate.split('T')[0] : '');
        setRemarks(rec.Remarks !== undefined && rec.Remarks !== null && rec.Remarks !== '' ? rec.Remarks : DEFAULT_RECEIPT_REMARKS);
        setSigner(rec.Signer || '');
        setInvoiceId(rec.InvoiceID || null);

        setViewMode('form');
    };

    // ── Open Print Preview Modal ──
    const handleViewPreview = (rec) => {
        let parsedItems = [];
        try {
            parsedItems = JSON.parse(rec.ItemsJSON || '[]');
        } catch {
            parsedItems = [];
        }

        setPreviewData({
            docNo: rec.DocNo,
            bookNo: rec.BookNo,
            docDate: rec.DocDate,
            docType: rec.DocType,
            revision: rec.Revision || 0,
            customerName: rec.CustomerName,
            customerAddress: rec.CustomerAddress,
            customerPhone: rec.CustomerPhone,
            customerTaxId: rec.CustomerTaxId,
            items: parsedItems,
            itemsDesc: rec.ItemsDesc,
            subtotal: rec.Subtotal,
            discount: rec.Discount,
            vat: rec.Vat,
            grandTotal: rec.GrandTotal,
            includeVat: Boolean(rec.IncludeVat),
            paymentMethod: rec.PaymentMethod,
            bankName: rec.BankName,
            bankBranch: rec.BankBranch,
            checkNo: rec.CheckNo,
            checkDate: rec.CheckDate,
            remarks: rec.Remarks,
            signer: rec.Signer
        });
        setIsPreviewModalOpen(true);
    };

    // ── Open History Modal ──
    const handleOpenHistory = async (rec) => {
        setHistoryDocNo(rec.DocNo);
        setIsHistoryModalOpen(true);
        setIsLoadingHistory(true);
        try {
            const res = await fetch(`/api/elite-receipts/${rec.id}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setHistoryList(data.data || []);
            } else {
                showAlert('แจ้งเตือน', data.message || 'ไม่สามารถโหลดประวัติได้', 'error');
            }
        } catch (err) {
            console.error('Error fetching receipt history:', err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อโหลดประวัติได้', 'error');
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // ── View Historical Snapshot ──
    const handleViewHistorySnapshot = async (historyId) => {
        try {
            const res = await fetch(`/api/elite-receipts/history/${historyId}`, {
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
                    bookNo: h.BookNo,
                    docDate: h.DocDate,
                    docType: h.DocType,
                    revision: h.Revision,
                    customerName: h.CustomerName,
                    customerAddress: h.CustomerAddress,
                    customerPhone: h.CustomerPhone,
                    customerTaxId: h.CustomerTaxId,
                    items: parsedItems,
                    itemsDesc: h.ItemsDesc,
                    subtotal: h.Subtotal,
                    discount: h.Discount,
                    vat: h.Vat,
                    grandTotal: h.GrandTotal,
                    includeVat: Boolean(h.IncludeVat),
                    paymentMethod: h.PaymentMethod,
                    bankName: h.BankName,
                    bankBranch: h.BankBranch,
                    checkNo: h.CheckNo,
                    checkDate: h.CheckDate,
                    remarks: h.Remarks,
                    signer: h.Signer
                });
                setIsPreviewModalOpen(true);
            }
        } catch (err) {
            console.error('Error loading history detail:', err);
        }
    };

    // ── Delete Receipt ──
    const handleDelete = async (id, no) => {
        if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบใบเสร็จรับเงินเลขที่ "${no}" ?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/elite-receipts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                showAlert('สำเร็จ', `ลบเอกสารเลขที่ ${no} เรียบร้อยแล้ว`, 'success');
                fetchReceipts(pagination.page);
            } else {
                showAlert('ข้อผิดพลาด', data.message || 'ไม่สามารถลบเอกสารได้', 'error');
            }
        } catch (err) {
            console.error('Delete error:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    };
    // ── Address Auto-complete ──
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [activeAddressField, setActiveAddressField] = useState(null);

    const handleAddressChange = (field, value) => {
        setAddress(prev => ({ ...prev, [field]: value }));
    };

    const handleAddressSearch = (field, searchType, val) => {
        handleAddressChange(field, val);
        if (val && val.trim().length >= 2) {
            const res = searchThaiAddress(searchType, val, 20);
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

        const singleItem = [{
            id: 1,
            desc: itemsDesc,
            qty: 1,
            unit: '',
            price: subtotal
        }];

        return {
            docNo,
            bookNo,
            docDate,
            docType,
            revision,
            customerName,
            customerAddress: formattedAddress,
            customerPhone,
            customerTaxId,
            items: singleItem,
            itemsDesc,
            subtotal: grandTotal,
            discount: 0,
            discountPercent: 0,
            vat: 0,
            grandTotal,
            includeVat: false,
            paymentMethod,
            bankName,
            bankBranch,
            checkNo,
            checkDate,
            remarks,
            signer,
            invoiceId
        };
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
            const url = editingId ? `/api/elite-receipts/${editingId}` : '/api/elite-receipts';
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
                showAlert('สำเร็จ', editingId ? `อัปเดตใบเสร็จเรียบร้อยแล้ว (เวอร์ชั่นใหม่ v.${data.revision ?? (revision + 1)})` : 'บันทึกใบเสร็จรับเงินเรียบร้อยแล้ว', 'success');
                setIsPreviewModalOpen(false);
                setViewMode('list');
                fetchReceipts(1);
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
                <title>${previewData?.docNo ? `ใบเสร็จ_${previewData.docNo}` : 'ใบเสร็จ'}</title>
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
                    /* Ensure print paper fills printable A4 width cleanly with subtle comfortable margin */
                    .elite-receipt-paper,
                    body > div { 
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
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    };

    // Format Date for Table
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
                                <CreditCard size={28} color="#10b981" /> ใบเสร็จรับเงิน (Receipt)
                            </h1>
                            <p className="page-subtitle" style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                                สร้างและจัดการข้อมูลเอกสารใบเสร็จรับเงิน (ELITE)
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
                        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, maxWidth: '520px' }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input 
                                    type="text" 
                                    placeholder="พิมพ์เลขที่ใบเสร็จ / ชื่อลูกค้า..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        paddingLeft: '38px',
                                        width: '100%',
                                        height: '40px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        outline: 'none',
                                        fontSize: '14px',
                                        background: '#fff'
                                    }}
                                />
                            </div>
                            <CustomSelect 
                                value={statusFilter} 
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    fetchReceipts(1, searchQuery, e.target.value);
                                }}
                                usePortal={true}
                                style={{
                                    width: '130px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#fff',
                                    color: '#475569',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">ทุกสถานะ</option>
                                <option value="พร้อมใช้">พร้อมใช้</option>
                                <option value="ยกเลิก">ยกเลิก</option>
                            </CustomSelect>
                            <button 
                                type="submit" 
                                className="btn-secondary" 
                                style={{ height: '40px', padding: '0 16px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #cbd5e1', background: '#fff' }}
                            >
                                ค้นหา
                            </button>
                        </form>

                        {canCreate('elite_doc_receipt') && (
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
                                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                                }}
                            >
                                <Plus size={18} /> สร้างใบเสร็จรับเงิน
                            </button>
                        )}
                    </div>

                    {/* Table Card */}
                    <div className="table-card card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '60px', color: '#64748b', fontSize: '13px' }}>ลำดับ</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '80px', color: '#64748b', fontSize: '13px' }}>เวอร์ชั่น</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'left', width: '90px', color: '#64748b', fontSize: '13px' }}>เล่มที่</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>เลขที่</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>ลูกค้า</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>ยอดรวม (บาท)</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>วันที่</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>การชำระ</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>สถานะ</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>ผู้สร้าง</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '120px', color: '#64748b', fontSize: '13px' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingList ? (
                                    <tr>
                                        <td colSpan="11" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                            <RefreshCw className="spin" size={24} style={{ display: 'inline-block', marginBottom: '8px' }} />
                                            <div>กำลังโหลดข้อมูล...</div>
                                        </td>
                                    </tr>
                                ) : receipts.length === 0 ? (
                                    <tr>
                                        <td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                            <FileText size={40} color="#cbd5e1" style={{ display: 'inline-block', marginBottom: '10px' }} />
                                            <div>ไม่มีข้อมูลใบเสร็จรับเงิน</div>
                                            <p style={{ fontSize: '13px', marginTop: '4px' }}>กดปุ่ม "สร้างใบเสร็จรับเงิน" ด้านบนเพื่อเริ่มออกเอกสาร</p>
                                        </td>
                                    </tr>
                                ) : (
                                    receipts.map((rec, idx) => (
                                        <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>
                                                {(pagination.page - 1) * pagination.limit + idx + 1}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                {(rec.Revision || 0) > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenHistory(rec)}
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
                                                        v.{rec.Revision}
                                                        <History size={12} />
                                                    </button>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>-</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 14px', color: '#64748b' }}>
                                                {rec.BookNo || '-'}
                                            </td>
                                            <td style={{ padding: '12px 14px', fontWeight: '600', color: '#1e293b' }}>
                                                {rec.DocNo}
                                            </td>
                                            <td style={{ padding: '12px 14px', color: '#334155' }}>
                                                {rec.CustomerName}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>
                                                {Number(rec.GrandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center', color: '#475569' }}>
                                                {formatDateThai(rec.DocDate)}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    background: rec.PaymentMethod === 'cash' ? '#fef3c7' : (rec.PaymentMethod === 'check' ? '#f3e8ff' : '#e0f2fe'),
                                                    color: rec.PaymentMethod === 'cash' ? '#92400e' : (rec.PaymentMethod === 'check' ? '#6b21a8' : '#0369a1')
                                                }}>
                                                    {rec.PaymentMethod === 'cash' ? 'เงินสด' : (rec.PaymentMethod === 'check' ? 'เช็ค' : 'โอนเงิน')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                <span style={{
                                                    background: rec.Status === 'ยกเลิก' ? '#fee2e2' : '#ecfdf5',
                                                    color: rec.Status === 'ยกเลิก' ? '#b91c1c' : '#047857',
                                                    border: `1px solid ${rec.Status === 'ยกเลิก' ? '#fecaca' : '#a7f3d0'}`,
                                                    padding: '3px 10px',
                                                    borderRadius: '16px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    display: 'inline-block'
                                                }}>
                                                    {rec.Status || 'พร้อมใช้'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 14px', color: '#475569' }}>
                                                {rec.CreatedByName || '-'}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleViewPreview(rec)}
                                                        title="ดู / พิมพ์เอกสาร"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#2563eb', borderRadius: '4px' }}
                                                    >
                                                        <Eye size={17} />
                                                    </button>
                                                    {(rec.Revision || 0) > 0 && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleOpenHistory(rec)}
                                                            title="ประวัติการแก้ไข (Revision History)"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#6366f1', borderRadius: '4px' }}
                                                        >
                                                            <History size={17} />
                                                        </button>
                                                    )}
                                                    {canUpdate('elite_doc_receipt') && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleEdit(rec)}
                                                            title="แก้ไขเอกสาร"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#7c3aed', borderRadius: '4px' }}
                                                        >
                                                            <Pencil size={17} />
                                                        </button>
                                                    )}
                                                    {canDelete('elite_doc_receipt') && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleDelete(rec.id, rec.DocNo)}
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
                                fetchReceipts(newPage, searchQuery, statusFilter, pagination.limit);
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
                                <CreditCard size={24} color="#10b981" /> {editingId ? `แก้ไขใบเสร็จรับเงิน (${docNo})` : 'ฟอร์มออกใบเสร็จรับเงิน'}
                                {editingId && (
                                    <span style={{ fontSize: '13px', background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '3px 10px', borderRadius: '16px', fontWeight: '600', marginLeft: '6px' }}>
                                        {revision > 0 ? `เวอร์ชั่นปัจจุบัน: v.${revision} → เมื่อบันทึกจะเป็น v.${revision + 1}` : 'เมื่อบันทึกจะเป็น v.1'}
                                    </span>
                                )}
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                                {editingId ? 'แก้ไขข้อมูลใบเสร็จรับเงิน ระบบจะสำรองประวัติเดิมและปรับเวอร์ชั่นให้อัตโนมัติ' : 'กรุณากรอกข้อมูลเพื่อออกใบเสร็จรับเงิน (ELITE)'}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="elite-form-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) 420px',
                            gap: '24px',
                            alignItems: 'start'
                        }}>
                            {/* ── LEFT COLUMN: Form Inputs ── */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                
                                {/* 1. Document Info Card */}
                                <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>
                                        ข้อมูลเอกสาร
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                                เล่มที่
                                            </label>
                                            <input 
                                                type="text" 
                                                value={bookNo} 
                                                onChange={(e) => setBookNo(e.target.value)}
                                                placeholder="เช่น 2569/09"
                                                style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                                เลขที่ใบเสร็จ <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                value={docNo} 
                                                onChange={(e) => setDocNo(e.target.value)}
                                                required
                                                style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', background: '#f8fafc' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                                วันที่ <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <CustomDatePicker 
                                                required 
                                                value={docDate} 
                                                onChange={(e) => {
                                                    setDocDate(e.target.value);
                                                    if (!editingId) fetchNextNumber(e.target.value);
                                                }}
                                                style={{ width: '100%', height: '38px', borderRadius: '6px', fontSize: '13px' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Customer Info Card */}
                                <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>
                                        ข้อมูลผู้ชำระเงิน (ลูกค้า)
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                                ได้รับเงินจาก (ชื่อลูกค้า / บริษัท) <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                value={customerName} 
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="เช่น บริษัท ตัวอย่าง จำกัด"
                                                required
                                                style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                                ที่อยู่ <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                                <input 
                                                    type="text" 
                                                    required 
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

                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                                เลขประจำตัวผู้เสียภาษี
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', height: '42px', overflowX: 'auto' }}>
                                                <TaxIdInput value={customerTaxId} onChange={(e) => setCustomerTaxId(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. รายการชำระเงิน Card */}
                                <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#15803d', margin: 0, paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                        รายการชำระเงิน
                                    </h3>

                                    <div style={{ marginTop: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                                            เป็นการชำระค่า <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            value={itemsDesc} 
                                            onChange={(e) => setItemsDesc(e.target.value)}
                                            placeholder="เช่น ค่าไฟฟ้า โกดัง 28..."
                                            required
                                            style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                        />
                                    </div>

                                    <div style={{ marginTop: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                                            จำนวนเงิน (บาท) <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={amount} 
                                            onChange={(e) => handleAmountChange(e.target.value)}
                                            placeholder="0.00"
                                            required
                                            style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                        />
                                    </div>
                                </div>

                                {/* 4. ข้อมูลการรับเงิน Card */}
                                <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#15803d', margin: 0, paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                        ข้อมูลการรับเงิน
                                    </h3>

                                    <div style={{ marginTop: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
                                            รูปแบบการชำระเงิน
                                        </label>
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                                                <input 
                                                    type="radio" 
                                                    name="paymentMethod" 
                                                    value="cash" 
                                                    checked={paymentMethod === 'cash'}
                                                    onChange={() => setPaymentMethod('cash')}
                                                />
                                                เงินสด
                                            </label>
                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                                                <input 
                                                    type="radio" 
                                                    name="paymentMethod" 
                                                    value="check" 
                                                    checked={paymentMethod === 'check'}
                                                    onChange={() => setPaymentMethod('check')}
                                                />
                                                เช็คธนาคาร
                                            </label>
                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                                                <input 
                                                    type="radio" 
                                                    name="paymentMethod" 
                                                    value="transfer" 
                                                    checked={paymentMethod === 'transfer'}
                                                    onChange={() => setPaymentMethod('transfer')}
                                                />
                                                โอนเงิน
                                            </label>
                                        </div>
                                    </div>

                                    {paymentMethod === 'check' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>เช็คธนาคาร</label>
                                                <input 
                                                    type="text" 
                                                    value={bankName} 
                                                    onChange={(e) => setBankName(e.target.value)}
                                                    placeholder="เช่น กสิกรไทย"
                                                    style={{ width: '100%', height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>สาขา</label>
                                                <input 
                                                    type="text" 
                                                    value={bankBranch} 
                                                    onChange={(e) => setBankBranch(e.target.value)}
                                                    placeholder="เช่น สาขารัตนาธิเบศร์"
                                                    style={{ width: '100%', height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>เลขที่เช็ค</label>
                                                <input 
                                                    type="text" 
                                                    value={checkNo} 
                                                    onChange={(e) => setCheckNo(e.target.value)}
                                                    placeholder="เลขที่เช็ค"
                                                    style={{ width: '100%', height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>ลงวันที่</label>
                                                <CustomDatePicker 
                                                    value={checkDate} 
                                                    onChange={(e) => setCheckDate(e.target.value)}
                                                    style={{ width: '100%', height: '34px', borderRadius: '6px', fontSize: '12px' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 5. หมายเหตุ Card */}
                                <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
                                        หมายเหตุ (ถ้ามี)
                                    </h3>
                                    <div style={{
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        padding: '10px 12px',
                                        background: '#fff',
                                        minHeight: '90px',
                                        cursor: 'text'
                                    }}>
                                        <TipTapCell 
                                            value={remarks} 
                                            onChange={(val) => setRemarks(val)} 
                                            placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                                            alignTop={true}
                                            style={{ minHeight: '70px', fontSize: '13px' }}
                                        />
                                    </div>
                                    <small style={{ color: '#64748b', fontSize: '11px', marginTop: '6px', display: 'block' }}>
                                        💡 คลุมดำ (ไฮไลต์) ข้อความเพื่อปรับแต่งสี ขนาด ตัวหนา/ตัวเอียง หรือขีดเส้นใต้
                                    </small>
                                </div>
                            </div>

                            {/* ── RIGHT COLUMN: Calculation Summary & Actions ── */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '88px' }}>
                                <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>
                                        สรุปยอดเงิน (บาท)
                                    </h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {/* Grand Total Display */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'baseline',
                                            padding: '6px 0'
                                        }}>
                                            <span style={{ fontSize: '15px', fontWeight: '700', color: '#15803d' }}>
                                                รวมเป็นเงินทั้งสิ้น:
                                            </span>
                                            <span style={{ fontSize: '20px', fontWeight: '700', color: '#15803d' }}>
                                                {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                                            </span>
                                        </div>

                                        {/* Thai Baht text */}
                                        <div style={{
                                            background: '#f8fafc',
                                            padding: '10px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12.5px',
                                            fontWeight: '500',
                                            color: '#475569',
                                            textAlign: 'center',
                                            lineHeight: 1.4
                                        }}>
                                            ({numberToThaiBaht(grandTotal)})
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                                        <button 
                                            type="button"
                                            onClick={handlePreviewFromForm}
                                            style={{
                                                width: '100%',
                                                height: '42px',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                background: '#ffffff',
                                                color: '#334155',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <Eye size={16} /> พรีวิวใบเสร็จรับเงิน
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
                                                color: '#ffffff',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
                                            }}
                                        >
                                            {isLoading ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
                                            {editingId ? 'บันทึกการแก้ไข' : 'บันทึกใบเสร็จรับเงิน'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* MODAL 1: A5 LANDSCAPE PRINT PREVIEW                       */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {isPreviewModalOpen && previewData && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        width: '100%',
                        maxWidth: '860px',
                        maxHeight: '92vh',
                        borderRadius: '12px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
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
                                    <FileText size={18} color="#10b981" /> พรีวิวใบเสร็จรับเงิน
                                </h3>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                    เลขที่: <span style={{ fontWeight: 600, color: '#0f766e' }}>{previewData.docNo || '-'}</span> | เล่มที่: {previewData.bookNo || '-'} | ผู้รับ: {previewData.customerName || '-'}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
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
                                        gap: '6px'
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
                                        fontWeight: 600
                                    }}
                                >
                                    <X size={16} /> ปิด
                                </button>
                            </div>
                        </div>

                        {/* Body - Scrollable */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px 14px',
                            background: '#f1f5f9',
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <div 
                                ref={printContainerRef}
                                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)', background: '#fff', borderRadius: '4px' }}
                            >
                                <EliteReceiptPrint data={previewData} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* MODAL 2: REVISION HISTORY MODAL                           */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {isHistoryModalOpen && (
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
                        maxWidth: '680px',
                        maxHeight: '85vh',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <History size={19} color="#4f46e5" /> ประวัติการแก้ไขใบเสร็จ (Revision History)
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                                    เลขที่เอกสาร: <span style={{ fontWeight: '600', color: '#0f172a' }}>{historyDocNo}</span>
                                </p>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsHistoryModalOpen(false)}
                                style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                            {isLoadingHistory ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                    <RefreshCw className="spin" size={24} style={{ display: 'inline-block', marginBottom: '8px' }} />
                                    <div>กำลังโหลดประวัติ...</div>
                                </div>
                            ) : historyList.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                    <History size={36} color="#cbd5e1" style={{ display: 'inline-block', marginBottom: '8px' }} />
                                    <p style={{ margin: 0, fontSize: '14px' }}>ยังไม่มีประวัติการแก้ไขสำหรับเอกสารนี้</p>
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
                                            alignItems: 'center'
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
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @media (max-width: 1024px) {
                    .elite-form-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}

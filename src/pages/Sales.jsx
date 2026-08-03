/**
 * =============================================================================
 * Sales.jsx — หน้าฝ่ายขาย (Sales Department)
 * =============================================================================
 *
 * แสดงข้อมูลฝ่ายขาย:
 *   - Tab sales_dashboard : Sales Dashboard (ยอดขาย, คำสั่งซื้อ, ลูกค้า, ใบเสนอราคา)
 *   - Tab sales_customers : Customer Management (ค้นหา + ตารางลูกค้า)
 *   - Tab sales_quotation : Quotation (ค้นหา + ตารางใบเสนอราคา)
 *   - Tab sales_orders    : Sales Order (ค้นหา + ตารางคำสั่งซื้อ)
 *
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import { Eye, Edit, Trash2, Clock, History, X, Send, Plus, FileText, LayoutDashboard, Users, FileSpreadsheet, ShoppingCart, Receipt, Briefcase, UserCheck, Search, Copy, Upload, Download, UploadCloud, RotateCcw } from 'lucide-react';
import { MOCK_CUSTOMERS } from '../data/mockData';
import QuotationForm from '../components/QuotationForm';
import SalesOrderForm from '../components/SalesOrderForm';
import BillingInvoiceForm from '../components/BillingInvoiceForm';
import TaxInvoiceForm from '../components/TaxInvoiceForm';
import DeliveryOrderForm from '../components/DeliveryOrderForm';
import ReceiptForm from '../components/ReceiptForm';
import PowerOfAttorneyForm from '../components/PowerOfAttorneyForm';
import RegistrationDocCreator from '../components/RegistrationDocCreator';
import ContractManagement from '../components/ContractManagement';
import API_BASE from '../config';
import CustomSelect from '../components/CustomSelect';
import './PageCommon.css';
import './DocumentControl.css';


const InlineStatusDropdown = ({ value, onChange, options, badgeClassFn, fallbackClass = 'status-badge status-approved' }) => {
    let computedClass = fallbackClass;
    if (badgeClassFn) {
        computedClass = `badge ${badgeClassFn(value || '')}`;
    } else {
        // Simple heuristic for fallback class
        const v = value || '';
        if (v === 'ร่าง' || v.includes('รอ')) computedClass = 'badge badge-neutral';
        else if (v === 'พร้อมใช้' || v.includes('อนุมัติ') || v.includes('เสร็จ') || v.includes('ส่ง')) computedClass = 'badge badge-success';
        else if (v.includes('ยกเลิก')) computedClass = 'badge badge-danger';
        else computedClass = 'badge badge-info';
    }

    // Determine colors based on computedClass to style CustomSelect directly
    let customStyles = {};
    if (computedClass.includes('badge-success') || computedClass.includes('status-approved')) {
        customStyles = { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' };
    } else if (computedClass.includes('badge-danger') || computedClass.includes('status-rejected')) {
        customStyles = { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' };
    } else if (computedClass.includes('badge-info')) {
        customStyles = { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' };
    } else if (computedClass.includes('badge-warning')) {
        customStyles = { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' };
    } else {
        customStyles = { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
    }

    return (
        <div onClick={(e) => e.stopPropagation()} style={{ minWidth: '130px', display: 'inline-block' }}>
            <CustomSelect
                value={value || 'ร่าง'}
                onChange={(e) => onChange(e.target.value)}
                usePortal={true}
                style={{
                    padding: '2px 8px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    minHeight: '26px',
                    ...customStyles
                }}
            >
                {options.map(s => <option key={s} value={s}>{s}</option>)}
            </CustomSelect>
        </div>
    );
};

export default function Sales() {
    const { showAlert, showConfirm, showLoading, hideLoading } = useAlert();
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('sales');
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'sales_dashboard';

    // ── State: ค้นหาแยกแต่ละ tab ──
    const [customerSearch, setCustomerSearch] = useState('');
    const [quotationSearch, setQuotationSearch] = useState('');
    const [orderSearch, setOrderSearch] = useState('');

    // ── State: การแสดงฟอร์ม ──
    const [showQuotationForm, setShowQuotationForm] = useState(false);
    const [localQuotations, setLocalQuotations] = useState([]);
    const [quotationPagination, setQuotationPagination] = useState({ page: 1, limit: 50, totalPages: 1 });
    const [appliedQuotationSearch, setAppliedQuotationSearch] = useState('');
    const [editingQuotationId, setEditingQuotationId] = useState(null);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [isHistoryView, setIsHistoryView] = useState(false); // To pass to form
    const [previewQuotationId, setPreviewQuotationId] = useState(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [historyItemNo, setHistoryItemNo] = useState('');
    const [historyDocType, setHistoryDocType] = useState('Quotation');
    
    // ── States สำหรับ Doc History (POA/Herbal) ──
    const [showDocHistoryModal, setShowDocHistoryModal] = useState(false);
    const [docHistoryList, setDocHistoryList] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyDocumentNo, setHistoryDocumentNo] = useState('');
    const [historyTab, setHistoryTab] = useState('versions'); // 'versions' | 'attachments'
    const [docAttachments, setDocAttachments] = useState([]);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
    const [uploadReceiver, setUploadReceiver] = useState('');
    const [uploadRemarks, setUploadRemarks] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [returnTab, setReturnTab] = useState(null); // Track where to return after closing a form

    // ── State: Sales Order ──
    const [showSOForm, setShowSOForm] = useState(false);
    const [localSalesOrders, setLocalSalesOrders] = useState([]);
    const [editingSOId, setEditingSOId] = useState(null);
    const [isSOViewOnly, setIsSOViewOnly] = useState(false);
    const [previewSOId, setPreviewSOId] = useState(null);

    // ── State: POA ──
    const [showPOAForm, setShowPOAForm] = useState(false);
    const [localPOAs, setLocalPOAs] = useState([]);
    const [editingPOAId, setEditingPOAId] = useState(null);
    const [editingPOAType, setEditingPOAType] = useState(null);
    const [poaPagination, setPoaPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
    const [poaSearch, setPoaSearch] = useState('');
    const [appliedPoaSearch, setAppliedPoaSearch] = useState('');

    // ── State: Billing ──
    const [showBillingForm, setShowBillingForm] = useState(false);
    const [localBillings, setLocalBillings] = useState([]);
    const [editingBillingId, setEditingBillingId] = useState(null);
    const [previewBillingId, setPreviewBillingId] = useState(null);
    const [billingPagination, setBillingPagination] = useState({ page: 1, limit: 50, totalPages: 1 });
    const [billingSearch, setBillingSearch] = useState('');
    const [appliedBillingSearch, setAppliedBillingSearch] = useState('');

    // ── State: Tax Invoice ──
    const [showTaxInvoiceForm, setShowTaxInvoiceForm] = useState(false);
    const [localTaxInvoices, setLocalTaxInvoices] = useState([]);
    const [editingTaxInvoiceId, setEditingTaxInvoiceId] = useState(null);
    const [taxInvoicePagination, setTaxInvoicePagination] = useState({ page: 1, limit: 50, totalPages: 1 });
    const [taxInvoiceSearch, setTaxInvoiceSearch] = useState('');
    const [appliedTaxInvoiceSearch, setAppliedTaxInvoiceSearch] = useState('');

    // ── State: Delivery Order ──
    const [showDeliveryOrderForm, setShowDeliveryOrderForm] = useState(false);
    const [localDeliveryOrders, setLocalDeliveryOrders] = useState([]);
    const [editingDeliveryOrderId, setEditingDeliveryOrderId] = useState(null);
    const [deliveryOrderPagination, setDeliveryOrderPagination] = useState({ page: 1, limit: 50, totalPages: 1 });
    const [deliveryOrderSearch, setDeliveryOrderSearch] = useState('');
    const [appliedDeliveryOrderSearch, setAppliedDeliveryOrderSearch] = useState('');

    // ── State: Receipt ──
    const [showReceiptForm, setShowReceiptForm] = useState(false);
    const [receipts, setReceipts] = useState([]);
    const [editDocId, setEditDocId] = useState(null);
    const [receiptPagination, setReceiptPagination] = useState({ page: 1, limit: 50, totalPages: 1 });
    const [receiptSearch, setReceiptSearch] = useState('');
    const [appliedReceiptSearch, setAppliedReceiptSearch] = useState('');

    const [previewDocModal, setPreviewDocModal] = useState(null);

    // ── Auto-search Debounce ──
    useEffect(() => {
        const t = setTimeout(() => { setAppliedQuotationSearch(quotationSearch); setQuotationPagination(p => ({...p, page: 1})); }, 400);
        return () => clearTimeout(t);
    }, [quotationSearch]);

    useEffect(() => {
        const t = setTimeout(() => { setAppliedBillingSearch(billingSearch); setBillingPagination(p => ({...p, page: 1})); }, 400);
        return () => clearTimeout(t);
    }, [billingSearch]);

    useEffect(() => {
        const t = setTimeout(() => { setAppliedTaxInvoiceSearch(taxInvoiceSearch); setTaxInvoicePagination(p => ({...p, page: 1})); }, 400);
        return () => clearTimeout(t);
    }, [taxInvoiceSearch]);

    useEffect(() => {
        const t = setTimeout(() => { setAppliedDeliveryOrderSearch(deliveryOrderSearch); setDeliveryOrderPagination(p => ({...p, page: 1})); }, 400);
        return () => clearTimeout(t);
    }, [deliveryOrderSearch]);

    useEffect(() => {
        const t = setTimeout(() => { setAppliedReceiptSearch(receiptSearch); setReceiptPagination(p => ({...p, page: 1})); }, 400);
        return () => clearTimeout(t);
    }, [receiptSearch]);

    useEffect(() => {
        const t = setTimeout(() => { setAppliedPoaSearch(poaSearch); setPoaPagination(p => ({...p, page: 1})); }, 400);
        return () => clearTimeout(t);
    }, [poaSearch]);

    // ── Fetch ข้อมูล Quotations (with Pagination) ──
    useEffect(() => {
        const fetchQuotations = async () => {
            if (activeTab !== 'sales_quotation' && activeTab !== 'sales_dashboard') return;
            try {
                const res = await fetch(`${API_BASE}/quotations?page=${quotationPagination.page}&limit=${quotationPagination.limit}&search=${encodeURIComponent(appliedQuotationSearch)}`);
                const json = await res.json();
                if (json.success) {
                    setLocalQuotations(json.data || []);
                    if (json.pagination) setQuotationPagination(prev => ({ ...prev, totalPages: json.pagination.totalPages }));
                }
            } catch (err) { console.error('Error fetching quotations:', err); }
        };
        fetchQuotations();
    }, [activeTab, quotationPagination.page, appliedQuotationSearch, showQuotationForm]);

    // ── Fetch ข้อมูล Sales Orders ──
    useEffect(() => {
        const fetchSalesOrders = async () => {
            try {
                const res = await fetch(`${API_BASE}/sales-orders`);
                const json = await res.json();
                if (json.success) setLocalSalesOrders(json.data || []);
            } catch (err) { console.error('Error fetching sales orders:', err); }
        };
        fetchSalesOrders();
    }, [showSOForm]);

    // ── Fetch ข้อมูล Billing ──
    useEffect(() => {
        const fetchBillings = async () => {
            if (activeTab !== 'sales_billing_invoice') return;
            try {
                const res = await fetch(`${API_BASE}/billing-invoices?page=${billingPagination.page}&limit=${billingPagination.limit}&search=${encodeURIComponent(appliedBillingSearch)}`);
                const json = await res.json();
                if (json.success) {
                    setLocalBillings(json.data || []);
                    if (json.pagination) setBillingPagination(prev => ({ ...prev, totalPages: json.pagination.totalPages }));
                }
            } catch (err) { console.error('Error fetching billings:', err); }
        };
        fetchBillings();
    }, [activeTab, billingPagination.page, appliedBillingSearch, showBillingForm]);

    // ── Fetch ข้อมูล Tax Invoice ──
    useEffect(() => {
        const fetchTaxInvoices = async () => {
            if (activeTab !== 'sales_tax_invoice') return;
            try {
                const res = await fetch(`${API_BASE}/tax-invoices?page=${taxInvoicePagination.page}&limit=${taxInvoicePagination.limit}&search=${encodeURIComponent(appliedTaxInvoiceSearch)}`);
                const json = await res.json();
                if (json.success) {
                    setLocalTaxInvoices(json.data || []);
                    if (json.pagination) setTaxInvoicePagination(prev => ({ ...prev, totalPages: json.pagination.totalPages }));
                }
            } catch (err) { console.error('Error fetching tax invoices:', err); }
        };
        fetchTaxInvoices();
    }, [activeTab, taxInvoicePagination.page, appliedTaxInvoiceSearch, showTaxInvoiceForm]);

    // ── Fetch ข้อมูล Delivery Order ──
    useEffect(() => {
        const fetchDeliveryOrders = async () => {
            if (activeTab !== 'sales_delivery_order') return;
            try {
                const res = await fetch(`${API_BASE}/delivery-orders?page=${deliveryOrderPagination.page}&limit=${deliveryOrderPagination.limit}&search=${encodeURIComponent(appliedDeliveryOrderSearch)}`);
                const json = await res.json();
                if (json.success) {
                    setLocalDeliveryOrders(json.data || []);
                    if (json.pagination) setDeliveryOrderPagination(prev => ({ ...prev, totalPages: json.pagination.totalPages }));
                }
            } catch (err) { console.error('Error fetching delivery orders:', err); }
        };
        fetchDeliveryOrders();
    }, [activeTab, deliveryOrderPagination.page, appliedDeliveryOrderSearch, showDeliveryOrderForm]);

    // ── Fetch ข้อมูล Receipt ──
    useEffect(() => {
        const fetchReceipts = async () => {
            if (activeTab !== 'sales_receipt') return;
            try {
                const res = await fetch(`${API_BASE}/receipts?page=${receiptPagination.page}&limit=${receiptPagination.limit}&search=${encodeURIComponent(appliedReceiptSearch)}`);
                const json = await res.json();
                if (json.success) {
                    setReceipts(json.data || []);
                    if (json.pagination) setReceiptPagination(prev => ({ ...prev, totalPages: json.pagination.totalPages }));
                }
            } catch (err) { console.error('Error fetching receipts:', err); }
        };
        fetchReceipts();
    }, [activeTab, receiptPagination.page, appliedReceiptSearch, showReceiptForm]);

    // ── Fetch ข้อมูล POA ──
    useEffect(() => {
        const fetchPOAs = async () => {
            if (activeTab !== 'sales_poa') return;
            try {
                const [poaRes, herbalRes, torbor1Res] = await Promise.all([
                    fetch(`${API_BASE}/legal-documents?type=poa&page=${poaPagination.page}&limit=${poaPagination.limit}`),
                    fetch(`${API_BASE}/herbal-cert-documents?page=${poaPagination.page}&limit=${poaPagination.limit}`),
                    fetch(`${API_BASE}/torbor1-documents?page=${poaPagination.page}&limit=${poaPagination.limit}`)
                ]);
                
                const poaJson = await poaRes.json();
                const herbalJson = await herbalRes.json();
                const torbor1Json = await torbor1Res.json();
                
                let combined = [];
                if (poaJson.success) {
                    combined = [...combined, ...(poaJson.data || [])];
                }
                if (herbalJson.success) {
                    const herbalMapped = (herbalJson.data || []).map(d => ({
                        ...d,
                        GrantorName: d.ApplicantName,
                        GranteeName: d.ProductName,
                        documentTypeLabel: 'คำรับรอง'
                    }));
                    combined = [...combined, ...herbalMapped];
                }
                if (torbor1Json.success) {
                    const torbor1Mapped = (torbor1Json.data || []).map(d => ({
                        ...d,
                        GrantorName: d.AppNaturalName || d.AppJuristicName || 'ต่างด้าว',
                        GranteeName: d.ProductNameThai,
                        documentTypeLabel: 'แบบ ทบ.๑'
                    }));
                    combined = [...combined, ...torbor1Mapped];
                }
                
                // Sort by CreatedAt desc
                combined.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
                
                setLocalPOAs(combined);
                // Simplify pagination for combined list (just use poa's for now, ideally backend should aggregate)
                if (poaJson.pagination) setPoaPagination(prev => ({ ...prev, totalPages: Math.max(poaJson.pagination.totalPages, herbalJson.pagination?.totalPages || 1, torbor1Json.pagination?.totalPages || 1) }));
            } catch (err) { console.error('Error fetching POAs:', err); }
        };
        fetchPOAs();
    }, [activeTab, poaPagination.page, showPOAForm]);

    // ── Delete Registration Doc ──
    const handleDeletePOA = async (id, docType) => {
        const confirmed = await showConfirm('ยืนยันการลบ', 'คุณต้องการลบเอกสารขึ้นทะเบียนนี้ใช่หรือไม่?');
        if (!confirmed) return;
        try {
            let endpoint = `${API_BASE}/legal-documents/${id}`;
            if (docType === 'herbal_cert') endpoint = `${API_BASE}/herbal-cert-documents/${id}`;
            else if (docType === 'torbor1') endpoint = `${API_BASE}/torbor1-documents/${id}`;
            
            const res = await fetch(endpoint, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                showAlert('สำเร็จ', 'ลบเอกสารเรียบร้อยแล้ว', 'success');
                // The fetchPOAs effect will not re-trigger automatically just from this, 
                // but we can manually trigger a re-fetch by flipping a state or just calling fetchPOAs logic again.
                // For simplicity, we just reload window or we can force update:
                setPoaPagination(prev => ({ ...prev })); // trigger effect
                
                // If the modal was open and we deleted a document from it, we should refresh the modal
                if (showDocHistoryModal && historyDocumentNo) {
                    handleViewDocHistory(historyDocumentNo, docType);
                }
            } else {
                showAlert('ข้อผิดพลาด', json.message, 'error');
            }
        } catch (err) {
            showAlert('ข้อผิดพลาด', 'ไม่สามารถลบเอกสารได้', 'error');
        }
    };

    const handleCreateVersionPOA = async (id, docType) => {
        const confirmed = await showConfirm('สร้างเวอร์ชันใหม่', 'คุณต้องการสร้างเอกสารนี้เป็นเวอร์ชันใหม่ (สถานะร่าง) ใช่หรือไม่?');
        if (!confirmed) return;
        try {
            let endpoint = `${API_BASE}/legal-documents/${id}/version`;
            if (docType === 'herbal_cert') endpoint = `${API_BASE}/herbal-cert-documents/${id}/version`;
            else if (docType === 'torbor1') endpoint = `${API_BASE}/torbor1-documents/${id}/version`;

            const res = await fetch(endpoint, { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                showAlert('สำเร็จ', 'สร้างเวอร์ชันใหม่เรียบร้อยแล้ว', 'success');
                setPoaPagination(prev => ({ ...prev, page: 1 }));
                setEditingPOAId(json.documentId);
                setEditingPOAType(docType || 'poa');
                setShowPOAForm(true);
            } else {
                showAlert('ข้อผิดพลาด', json.message, 'error');
            }
        } catch (err) {
            showAlert('ข้อผิดพลาด', 'ไม่สามารถสร้างเวอร์ชันใหม่ได้', 'error');
        }
    };

    const handlePrintPOA = async (documentId, docType = 'poa') => {
        try {
            showAlert('รอสักครู่', 'กำลังสร้างเอกสาร PDF...', 'info');
            const printPayload = { documentType: docType, documentId };
            const printResponse = await fetch(`${API_BASE}/print`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(printPayload)
            });

            if (printResponse.ok) {
                const blob = await printResponse.blob();
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                showAlert('สำเร็จ', 'เปิดเอกสาร PDF แล้ว', 'success');
            } else {
                showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างเอกสาร PDF ได้', 'error');
            }
        } catch (error) {
            console.error('Error printing POA:', error);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับระบบได้', 'error');
        }
    };

    // ── Fetch History List ──
    const handleViewHistory = async (id, docType = 'Quotation') => {
        try {
            let endpoint = `${API_BASE}/quotations/${id}/history`;
            if (docType === 'BillingInvoice') endpoint = `${API_BASE}/billing-invoices/${id}/history`;
            else if (docType === 'TaxInvoice') endpoint = `${API_BASE}/tax-invoices/${id}/history`;
            else if (docType === 'Receipt') endpoint = `${API_BASE}/receipts/${id}/history`;
            else if (docType === 'DeliveryOrder') endpoint = `${API_BASE}/delivery-orders/${id}/history`;
            else if (docType === 'SalesOrder') endpoint = `${API_BASE}/sales-orders/${id}/history`;
            
            const res = await fetch(endpoint);
            const json = await res.json();
            if (json.success) {
                setHistoryDocType(docType);
                setHistoryList(json.data);
                setShowHistoryModal(true);
            } else {
                showAlert('ข้อผิดพลาด', 'ไม่สามารถดึงประวัติได้: ' + json.message, 'error');
            }
        } catch (err) {
            console.error('Error fetching history:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    };

    // ── กำหนดสถานะที่เป็นไปได้ของเอกสารฝ่ายขาย ──
    const SALES_DOC_STATUSES = ['ร่าง', 'พร้อมใช้'];

    // ── อัปเดตสถานะแบบด่วนจากหน้าตาราง ──
    const handleUpdateDocStatus = async (id, docType, newStatus) => {
        if (!id || !newStatus) return;
        try {
            let endpoint = '';
            switch (docType) {
                case 'Quotation': endpoint = `${API_BASE}/quotations/${id}/status`; break;
                case 'Billing': endpoint = `${API_BASE}/billing-invoices/${id}/status`; break;
                case 'TaxInvoice': endpoint = `${API_BASE}/tax-invoices/${id}/status`; break;
                case 'DeliveryOrder': endpoint = `${API_BASE}/delivery-orders/${id}/status`; break;
                case 'Receipt': endpoint = `${API_BASE}/receipts/${id}/status`; break;
                default: return;
            }
            
            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                showAlert('สำเร็จ', `อัปเดตสถานะเป็น "${newStatus}" เรียบร้อยแล้ว`, 'success');
                // อัปเดต state ตัวแปร local โดยตรงเพื่อไม่ต้อง fetch ใหม่หมด
                switch (docType) {
                    case 'Quotation':
                        setLocalQuotations(prev => prev.map(item => item.QuotationID === id ? { ...item, Status: newStatus } : item));
                        break;
                    case 'Billing':
                        setLocalBillings(prev => prev.map(item => item.BillingID === id ? { ...item, Status: newStatus } : item));
                        break;
                    case 'TaxInvoice':
                        setLocalTaxInvoices(prev => prev.map(item => item.TaxInvoiceID === id ? { ...item, Status: newStatus } : item));
                        break;
                    case 'DeliveryOrder':
                        setLocalDeliveryOrders(prev => prev.map(item => item.DeliveryOrderID === id ? { ...item, Status: newStatus } : item));
                        break;
                    case 'Receipt':
                        setReceipts(prev => prev.map(item => item.ReceiptID === id ? { ...item, Status: newStatus } : item));
                        break;
                }
            } else {
                showAlert('ข้อผิดพลาด', data.message || 'ไม่สามารถอัปเดตสถานะได้', 'error');
            }
        } catch (err) {
            console.error('Error updating status:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    };


    const handleViewDocHistory = async (documentNo, type = 'poa', defaultTab = 'versions') => {
        setHistoryDocumentNo(documentNo);
        setShowDocHistoryModal(true);
        setHistoryLoading(true);
        setDocHistoryList([]);
        setDocAttachments([]);
        setHistoryTab(defaultTab);
        try {
            let endpoint = `${API_BASE}/legal-documents/history/${encodeURIComponent(documentNo)}`;
            if (type === 'herbal_cert') endpoint = `${API_BASE}/herbal-cert-documents/history/${encodeURIComponent(documentNo)}`;
            else if (type === 'torbor1') endpoint = `${API_BASE}/torbor1-documents/${encodeURIComponent(documentNo)}/versions`;
            
            const res = await fetch(endpoint);
            const json = await res.json();
            if (json.success) {
                setDocHistoryList(json.data || []);
            } else {
                showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถดึงประวัติเอกสารได้', 'error');
            }
            
            // Fetch attachments
            const attRes = await fetch(`${API_BASE}/legal-documents/attachments/${encodeURIComponent(documentNo)}`);
            const attJson = await attRes.json();
            if (attJson.success) {
                setDocAttachments(attJson.data || []);
            }
        } catch (err) {
            console.error('Error fetching doc history:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleUploadAttachment = async (e) => {
        e.preventDefault();
        if (!uploadFile) {
            showAlert('ข้อผิดพลาด', 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด', 'warning');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('receivedDate', uploadDate);
        formData.append('receiverName', uploadReceiver);
        formData.append('remarks', uploadRemarks);

        try {
            const res = await fetch(`${API_BASE}/legal-documents/upload/${encodeURIComponent(historyDocumentNo)}`, {
                method: 'POST',
                body: formData
            });
            const json = await res.json();
            
            if (json.success) {
                showAlert('สำเร็จ', 'อัปโหลดเอกสารและอัปเดตสถานะเป็น "ลูกค้าลงนามแล้ว" เรียบร้อย', 'success');
                setUploadFile(null);
                setUploadReceiver('');
                setUploadRemarks('');
                const fileInput = document.getElementById('upload-file-input');
                if (fileInput) fileInput.value = '';
                
                // Keep the attachments popup open after successful upload
                handleViewDocHistory(historyDocumentNo, 'poa', 'attachments');
                setLocalPOAs(prev => prev.map(p => 
                    p.DocumentNo === historyDocumentNo ? { ...p, Status: 'ลูกค้าลงนามแล้ว' } : p
                ));
            } else {
                showAlert('เกิดข้อผิดพลาด', json.message || 'ไม่สามารถอัปโหลดไฟล์ได้', 'error');
            }
        } catch (err) {
            console.error('Error uploading file:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAttachment = async (attachmentId) => {
        const ok = await showConfirm('ยืนยันการลบไฟล์แนบ', 'คุณต้องการลบไฟล์แนบนี้ใช่หรือไม่?', 'warning');
        if (!ok) return;
        
        try {
            const res = await fetch(`${API_BASE}/legal-documents/attachments/${attachmentId}`, { method: 'DELETE' });
            const json = await res.json();
            
            if (json.success) {
                showAlert('สำเร็จ', 'ลบไฟล์แนบเรียบร้อยแล้ว', 'success');
                // Refresh attachments list
                setDocAttachments(prev => prev.filter(a => a.AttachmentID !== attachmentId));
            } else {
                showAlert('เกิดข้อผิดพลาด', json.message || 'ไม่สามารถลบไฟล์แนบได้', 'error');
            }
        } catch (err) {
            console.error('Error deleting attachment:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    };

    const handleDeleteQuotation = async (id) => {
        const ok = await showConfirm('ยืนยันการลบ', 'คุณต้องการลบใบเสนอราคานี้ใช่หรือไม่?', 'warning');
        if (!ok) return;
        try {
            const res = await fetch(`${API_BASE}/quotations/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                setLocalQuotations(prev => prev.filter(q => (q.QuotationID || q.id) !== id));
                showAlert('ลบสำเร็จ', 'ลบใบเสนอราคาเรียบร้อยแล้ว', 'success');
            } else { showAlert('ข้อผิดพลาด', 'ลบไม่สำเร็จ: ' + json.message, 'error'); }
        } catch (err) { console.error('Error deleting quotation:', err); showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบ', 'error'); }
    };

    const handleDeleteBilling = async (id) => {
        const ok = await showConfirm('ยืนยันการลบ', 'คุณต้องการลบใบวางบิล/ใบแจ้งหนี้นี้ใช่หรือไม่?', 'warning');
        if (!ok) return;
        try {
            const res = await fetch(`${API_BASE}/billing-invoices/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                setLocalBillings(prev => prev.filter(b => (b.BillingInvoiceID || b.id) !== id));
                showAlert('ลบสำเร็จ', 'ลบใบวางบิล/ใบแจ้งหนี้เรียบร้อยแล้ว', 'success');
            } else { showAlert('ข้อผิดพลาด', 'ลบไม่สำเร็จ: ' + json.message, 'error'); }
        } catch (err) { console.error('Error deleting billing:', err); showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบ', 'error'); }
    };

    const handleDelete = async (id, docType) => {
        const ok = await showConfirm('ยืนยันการลบ', 'คุณต้องการลบเอกสารนี้ใช่หรือไม่?', 'warning');
        if (!ok) return;
        
        let endpoint = '';
        if (docType === 'TaxInvoice') endpoint = `${API_BASE}/tax-invoices/${id}`;
        else if (docType === 'DeliveryOrder') endpoint = `${API_BASE}/delivery-orders/${id}`;
        else if (docType === 'Receipt') endpoint = `${API_BASE}/receipts/${id}`;
        
        if (!endpoint) return;

        try {
            const res = await fetch(endpoint, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                if (docType === 'TaxInvoice') setLocalTaxInvoices(prev => prev.filter(item => (item.TaxInvoiceID || item.id) !== id));
                else if (docType === 'DeliveryOrder') setLocalDeliveryOrders(prev => prev.filter(item => (item.DeliveryOrderID || item.id) !== id));
                else if (docType === 'Receipt') setReceipts(prev => prev.filter(item => (item.ReceiptID || item.id) !== id));
                showAlert('ลบสำเร็จ', 'ลบเอกสารเรียบร้อยแล้ว', 'success');
            } else { showAlert('ข้อผิดพลาด', 'ลบไม่สำเร็จ: ' + json.message, 'error'); }
        } catch (err) { console.error(`Error deleting ${docType}:`, err); showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบ', 'error'); }
    };

    const handleDeleteSO = async (id) => {
        const ok = await showConfirm('ยืนยันการลบ', 'คุณต้องการลบ Sales Order นี้ใช่หรือไม่?', 'warning');
        if (!ok) return;
        try {
            const res = await fetch(`${API_BASE}/sales-orders/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                setLocalSalesOrders(prev => prev.filter(so => so.SalesOrderID !== id));
            } else { showAlert('ข้อผิดพลาด', 'ลบไม่สำเร็จ: ' + json.message, 'error'); }
        } catch (err) { console.error('Error deleting SO:', err); showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบ', 'error'); }
    };

    const handleSendToPlanner = async (so) => {
        const ok = await showConfirm('ยืนยันการส่ง', `ส่งคำสั่งขาย ${so.SalesOrderNo} ไปให้ Planner วางแผนผลิตใช่หรือไม่?`, 'info');
        if (!ok) return;
        try {
            const res = await fetch(`${API_BASE}/sales-orders/${so.SalesOrderID}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ส่ง Planner แล้ว' })
            });
            const json = await res.json();
            if (json.success) {
                setLocalSalesOrders(prev => prev.map(s => s.SalesOrderID === so.SalesOrderID ? { ...s, Status: 'ส่ง Planner แล้ว' } : s));
                showAlert('สำเร็จ', `ส่ง ${so.SalesOrderNo} ไปให้ Planner เรียบร้อยแล้ว!`, 'success');
            } else {
                showAlert('ข้อผิดพลาด', json.message, 'error');
            }
        } catch (err) {
            console.error('Error sending to planner:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการส่งข้อมูล', 'error');
        }
    };

    const handleRevertSOToDraft = async (so) => {
        const ok = await showConfirm(
            'ยืนยันดึงกลับเป็นร่าง',
            `คุณต้องการดึงคำสั่งขาย ${so.SalesOrderNo} กลับมาเป็นสถานะ 'ร่าง' เพื่อแก้ไขใช่หรือไม่?`,
            'warning'
        );
        if (!ok) return;
        try {
            const res = await fetch(`${API_BASE}/sales-orders/${so.SalesOrderID}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ร่าง' })
            });
            const json = await res.json();
            if (json.success) {
                setLocalSalesOrders(prev => prev.map(s => s.SalesOrderID === so.SalesOrderID ? { ...s, Status: 'ร่าง' } : s));
                showAlert('สำเร็จ', `ดึง ${so.SalesOrderNo} กลับมาเป็นสถานะ 'ร่าง' เรียบร้อยแล้ว สามารถแก้ไขข้อมูลได้ทันที`, 'success');
            } else {
                showAlert('ข้อผิดพลาด', json.message, 'error');
            }
        } catch (err) {
            console.error('Error reverting SO to draft:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการดึงเอกสารกลับ', 'error');
        }
    };

    // ── คำนวณสถิติ Dashboard ──
    const totalRevenue = localSalesOrders.reduce((sum, o) => sum + (o.GrandTotal || 0), 0);
    const totalOrders = localSalesOrders.length;
    const totalCustomers = MOCK_CUSTOMERS.length;
    const totalQuotations = localQuotations.length;

    // ── กรองข้อมูลแต่ละ tab ──
    const filteredCustomers = MOCK_CUSTOMERS.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.contact.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.type.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const filteredQuotations = localQuotations;

    const filteredOrders = localSalesOrders.filter((o) => {
        const soNo = o.SalesOrderNo || '';
        const customer = o.CustomerName || '';
        const qtNo = o.QuotationNo || '';
        return soNo.toLowerCase().includes(orderSearch.toLowerCase()) ||
               customer.toLowerCase().includes(orderSearch.toLowerCase()) ||
               qtNo.toLowerCase().includes(orderSearch.toLowerCase());
    });

    // ── เลือก badge class ตามสถานะ ──
    const getCustomerStatusClass = (status) => {
        return status === 'ใช้งาน' ? 'badge-success' : 'badge-danger';
    };

    const getQuotationStatusClass = (status) => {
        switch (status) {
            case 'พร้อมใช้': return 'badge-success';
            case 'สร้าง SO แล้ว': return 'badge-info';
            case 'อนุมัติ': return 'badge-success';
            case 'ส่งแล้ว': return 'badge-info';
            case 'ร่าง': return 'badge-neutral';
            case 'ปฏิเสธ': return 'badge-danger';
            default: return '';
        }
    };

    const getOrderStatusClass = (status) => {
        switch (status) {
            case 'เสร็จสิ้น': return 'badge-success';
            case 'สร้างแล้ว': return 'badge-success';
            case 'กำลังดำเนินการ': return 'badge-info';
            case 'ส่ง Planner แล้ว': return 'badge-info';
            case 'จัดส่งแล้ว': return 'badge-warning';
            case 'รอดำเนินการ': return 'badge-neutral';
            case 'ร่าง': return 'badge-neutral';
            case 'ยกเลิก': return 'badge-danger';
            default: return '';
        }
    };

    const getRegistrationStatusClass = (status) => {
        switch (status) {
            case 'ร่าง': return 'badge-neutral';
            case 'สร้างแล้ว': return 'badge-info';
            case 'ส่งให้ลูกค้าแล้ว': return 'badge-danger';
            case 'ลูกค้าขอแก้ไข': return 'badge-warning';
            case 'ลูกค้าลงนามแล้ว': return 'badge-success';
            default: return 'badge-neutral';
        }
    };

    // ── กำหนดชื่อหน้าตาม Tab ที่เลือก ──
    const getPageTitle = () => {
        switch (activeTab) {
            case 'sales_dashboard': return 'ภาพรวมยอดขาย';
            case 'sales_customers': return 'จัดการข้อมูลลูกค้า';
            case 'sales_quotation': return 'ใบเสนอราคา';
            case 'sales_orders': return 'คำสั่งขาย';
            case 'sales_poa': return 'ขึ้นทะเบียน';
            case 'sales_contracts': return 'จัดการสัญญา';
            case 'sales_corp_rep': return 'หนังสือแต่งตั้งผู้แทนนิติบุคคล';
            default: return 'ฝ่ายขาย';
        }
    };

    const getPageDesc = () => {
        switch (activeTab) {
            case 'sales_dashboard': return 'ภาพรวมข้อมูลยอดขาย ลูกค้า และเอกสารทั้งหมดของฝ่ายขาย';
            case 'sales_customers': return 'จัดการข้อมูลและรายชื่อลูกค้าทั้งหมดในระบบ';
            case 'sales_quotation': return 'สร้างและจัดการข้อมูลเอกสารใบเสนอราคา (Quotation)';
            case 'sales_orders': return 'สร้างและจัดการข้อมูลคำสั่งขาย (Sales Order)';
            case 'sales_poa': return 'สร้างและจัดการเอกสารขึ้นทะเบียน';
            case 'sales_contracts': return 'เพิ่มและลบสัญญาระหว่างบริษัทกับลูกค้า';
            case 'sales_corp_rep': return 'สร้างและจัดการหนังสือแต่งตั้งผู้แทนนิติบุคคล';
            default: return 'จัดการข้อมูลลูกค้า ใบเสนอราคา และคำสั่งขาย';
        }
    };

    // คำนวณเวอร์ชันล่าสุดของแต่ละเอกสาร
    const poaMaxVersions = {};
    localPOAs.forEach(p => {
        if (!poaMaxVersions[p.DocumentNo] || p.Version > poaMaxVersions[p.DocumentNo]) {
            poaMaxVersions[p.DocumentNo] = p.Version;
        }
    });

    return (
        <div className="page-container sales-page page-enter">

            {/* ── Tab: Sales Dashboard ── */}
            {(activeTab === 'sales_dashboard' && hasSubPermission('sales_dashboard')) && (
                <div className="subpage-content" key="sales_dashboard">
                    <div className="contract-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                            <h1 className="contract-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                                <LayoutDashboard size={24} color="#1e40af" />
                                ภาพรวมยอดขาย
                            </h1>
                            <p className="contract-subtitle" style={{ margin: '0', color: '#64748b', fontSize: '14px' }}>ภาพรวมข้อมูลยอดขาย ลูกค้า และเอกสารทั้งหมดของฝ่ายขาย</p>
                        </div>
                    </div>
                    <div className="summary-row">
                        {hasSectionPermission('sales_dashboard_revenue') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                </div>
                                <div>
                                    <span className="summary-label">ยอดขายรวม</span>
                                    <span className="summary-value">฿{totalRevenue.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('sales_dashboard_orders') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                </div>
                                <div>
                                    <span className="summary-label">คำสั่งขาย</span>
                                    <span className="summary-value">{totalOrders}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('sales_dashboard_customers') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ background: '#faf5ff', borderColor: '#e9d5ff', color: '#7c3aed' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                </div>
                                <div>
                                    <span className="summary-label">ลูกค้า</span>
                                    <span className="summary-value">{totalCustomers}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('sales_dashboard_quotations') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ background: '#fff7ed', borderColor: '#fed7aa', color: '#ea580c' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                </div>
                                <div>
                                    <span className="summary-label">ใบเสนอราคา</span>
                                    <span className="summary-value">{totalQuotations}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Recent Activity Tables */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* Recent Sales Orders */}
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>คำสั่งขายล่าสุด</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sales Orders</span>
                            </div>
                            <div style={{ padding: '0' }}>
                                <table className="data-table" style={{ minWidth: 'auto' }}>
                                    <thead>
                                        <tr>
                                            <th>เลขที่ SO</th>
                                            <th>ลูกค้า</th>
                                            <th>ยอดรวม</th>
                                            <th>สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {localSalesOrders.slice(0, 5).map((o) => (
                                            <tr key={o.SalesOrderNo || o.SalesOrderID}>
                                                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{o.SalesOrderNo}</td>
                                                <td>{o.CustomerName}</td>
                                                <td>฿{(o.GrandTotal || 0).toLocaleString()}</td>
                                                <td><span className={`badge ${getOrderStatusClass(o.Status)}`}>{o.Status}</span></td>
                                            </tr>
                                        ))}
                                        {localSalesOrders.length === 0 && (
                                            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>ยังไม่มีข้อมูล</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Quotations */}
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>ใบเสนอราคาล่าสุด</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quotations</span>
                            </div>
                            <div style={{ padding: '0' }}>
                                <table className="data-table" style={{ minWidth: 'auto' }}>
                                    <thead>
                                        <tr>
                                            <th>เลขที่ QT</th>
                                            <th>ลูกค้า</th>
                                            <th>ยอดรวม</th>
                                            <th>สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {localQuotations.slice(0, 5).map((q) => (
                                            <tr key={q.QuotationNo || q.QuotationID}>
                                                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{q.QuotationNo}</td>
                                                <td>{q.CustomerName}</td>
                                                <td>฿{(q.GrandTotal || 0).toLocaleString()}</td>
                                                <td>
                                                    <InlineStatusDropdown
                                                        value={q.Status}
                                                        options={SALES_DOC_STATUSES}
                                                        badgeClassFn={getQuotationStatusClass}
                                                        onChange={(newVal) => handleUpdateDocStatus(q.QuotationID, 'Quotation', newVal)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                        {localQuotations.length === 0 && (
                                            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>ยังไม่มีข้อมูล</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* ── Tab: Quotation ── */}
            {(activeTab === 'sales_quotation' && hasSubPermission('sales_quotation')) && (
                showQuotationForm ? (
                    <QuotationForm 
                        editId={editingQuotationId}
                        viewOnly={isViewOnly}
                        isHistory={isHistoryView}
                        onBack={() => {
                            setShowQuotationForm(false);
                            setEditingQuotationId(null);
                            setIsViewOnly(false);
                            if (returnTab) {
                                setSearchParams({ tab: returnTab });
                                setReturnTab(null);
                            }
                        }} 
                        onSave={() => {
                            setShowQuotationForm(false);
                            setEditingQuotationId(null);
                            setIsViewOnly(false);
                            if (returnTab) {
                                setSearchParams({ tab: returnTab });
                                setReturnTab(null);
                            }
                        }}
                    />
                ) : (
                    <div className="subpage-content" key="sales_quotation">
                        <div className="contract-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h1 className="contract-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                                    <FileSpreadsheet size={24} color="#1e40af" />
                                    ใบเสนอราคา (Quotation)
                                </h1>
                                <p className="contract-subtitle" style={{ margin: '0', color: '#64748b', fontSize: '14px' }}>สร้างและจัดการข้อมูลเอกสารใบเสนอราคา</p>
                            </div>
                        </div>
                        {hasSectionPermission('sales_quotation_search') && (
                            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                                <div className="search-group">
                                    <div className="search-input-wrap">
                                        <Search size={18} />
                                        <input
                                            type="text"
                                            placeholder="พิมพ์เลขที่ใบเสนอราคา..."
                                            value={quotationSearch}
                                            onChange={(e) => setQuotationSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setQuotationPagination(prev => ({ ...prev, page: 1 }));
                                                    setAppliedQuotationSearch(quotationSearch);
                                                }
                                            }}
                                        />
                                    </div>
                                    <button className="search-btn" onClick={() => {
                                        setQuotationPagination(prev => ({ ...prev, page: 1 }));
                                        setAppliedQuotationSearch(quotationSearch);
                                    }}>ค้นหา</button>
                                </div>
                                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => {
                                    setEditingQuotationId(null);
                                    setIsViewOnly(false);
                                    setShowQuotationForm(true);
                                }}>
                                    <Plus size={16} /> สร้างใบเสนอราคา
                                </button>
                            </div>
                        )}

                        {hasSectionPermission('sales_quotation_table') && (
                            <div className="table-card card">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ลำดับ</th>
                                            <th>เวอร์ชั่น</th>
                                            <th>เลขที่</th>
                                            <th>ลูกค้า</th>
                                            <th>ยอดรวม (บาท)</th>
                                            <th>วันที่</th>
                                            <th>สถานะ</th>
                                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredQuotations.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                                                    ไม่มีข้อมูลใบเสนอราคา
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredQuotations.map((q, idx) => (
                                            <tr key={q.QuotationID || q.id}>
                                                <td>{idx + 1}</td>
                                                <td>v.{q.Revision || 0}</td>
                                                <td className="text-bold">{q.QuotationNo || q.number}</td>
                                                <td>{q.CustomerName || q.customer}</td>
                                                <td>{(q.GrandTotal || q.total || 0).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                                                <td>{q.BillDate ? new Date(q.BillDate).toLocaleDateString('th-TH') : q.date}</td>
                                                <td>
<InlineStatusDropdown
                                                        value={q.Status || q.status}
                                                        options={SALES_DOC_STATUSES}
                                                        badgeClassFn={getQuotationStatusClass}
                                                        onChange={(newVal) => handleUpdateDocStatus(q.QuotationID || q.id, 'Quotation', newVal)}
                                                    />
</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                        <button 
                                                            className="btn-icon text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                            title="ดูรายละเอียด"
                                                            onClick={() => setPreviewQuotationId(q.QuotationID || q.id)}
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        {q.Revision > 0 && (
                                                            <button 
                                                                className="btn-icon text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                                                                title="ประวัติ"
                                                                onClick={() => handleViewHistory(q.QuotationID || q.id)}
                                                            >
                                                                <Clock size={16} />
                                                            </button>
                                                        )}
                                                        <button 
                                                            className="btn-icon text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                                                            title="แก้ไข"
                                                            onClick={() => {
                                                                setEditingQuotationId(q.QuotationID || q.id);
                                                                setIsViewOnly(false);
                                                                setIsHistoryView(false);
                                                                setShowQuotationForm(true);
                                                            }}
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button 
                                                            className="btn-icon text-red-600 hover:bg-red-50 hover:text-red-700"
                                                            title="ลบ"
                                                            onClick={() => handleDeleteQuotation(q.QuotationID || q.id)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                        )}
                                    </tbody>
                                </table>

                                {/* Pagination Controls */}
                                {quotationPagination.totalPages > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 20, padding: '10px 0' }}>
                                        <button 
                                            className="btn-outline" 
                                            disabled={quotationPagination.page === 1}
                                            onClick={() => setQuotationPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        >
                                            ก่อนหน้า
                                        </button>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563' }}>
                                            หน้า {quotationPagination.page} จาก {quotationPagination.totalPages}
                                        </span>
                                        <button 
                                            className="btn-outline" 
                                            disabled={quotationPagination.page === quotationPagination.totalPages}
                                            onClick={() => setQuotationPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        >
                                            ถัดไป
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            )}

            {/* ── Tab: ใบแจ้งหนี้/ใบส่งสินค้า (Tax Invoice/Delivery Order) ── */}
            {(activeTab === 'sales_tax_invoice' && hasSubPermission('sales_tax_invoice')) && (
                showTaxInvoiceForm ? (
                    <div className="subpage-content" key="sales_tax_invoice_form">
                        <TaxInvoiceForm
                            editId={editingTaxInvoiceId}
                            onBack={() => {
                                setShowTaxInvoiceForm(false);
                                setEditingTaxInvoiceId(null);
                            }}
                            onSave={() => {
                                setShowTaxInvoiceForm(false);
                                setEditingTaxInvoiceId(null);
                            }}
                        />
                    </div>
                ) : (
                    <div className="subpage-content" key="sales_tax_invoice">
                        <div className="contract-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h1 className="contract-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                                    <FileText size={24} color="#1e40af" />
                                    ใบแจ้งหนี้/ใบส่งสินค้า
                                </h1>
                                <p className="contract-subtitle" style={{ margin: '0', color: '#64748b', fontSize: '14px' }}>สร้างและจัดการข้อมูลเอกสารใบแจ้งหนี้/ใบส่งสินค้า</p>
                            </div>
                        </div>
                        
                        {hasSectionPermission('sales_tax_invoice_search') && (
                            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                                <div className="search-group">
                                    <div className="search-input-wrap">
                                        <Search size={18} />
                                        <input
                                            type="text"
                                            placeholder="ค้นหาใบแจ้งหนี้/ใบส่งสินค้า..."
                                            value={taxInvoiceSearch}
                                            onChange={(e) => setTaxInvoiceSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setTaxInvoicePagination(prev => ({ ...prev, page: 1 }));
                                                    setAppliedTaxInvoiceSearch(taxInvoiceSearch);
                                                }
                                            }}
                                        />
                                    </div>
                                    <button className="search-btn" onClick={() => {
                                        setTaxInvoicePagination(prev => ({ ...prev, page: 1 }));
                                        setAppliedTaxInvoiceSearch(taxInvoiceSearch);
                                    }}>ค้นหา</button>
                                </div>
                                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => {
                                    setEditingTaxInvoiceId(null);
                                    setShowTaxInvoiceForm(true);
                                }}>
                                    <Plus size={16} /> สร้างใบแจ้งหนี้/ใบส่งสินค้า
                                </button>
                            </div>
                        )}
                        {hasSectionPermission('sales_tax_invoice_table') && (
                            <div className="table-card card">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ลำดับ</th>
                                            <th>เวอร์ชั่น</th>
                                            <th>เลขที่</th>
                                            <th>ลูกค้า</th>
                                            <th>ยอดเงินรวม</th>
                                            <th>วันที่</th>
                                            <th style={{ textAlign: 'center' }}>สถานะ</th>
                                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {localTaxInvoices.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)' }}>
                                                    ไม่มีข้อมูลใบแจ้งหนี้/ใบส่งสินค้า
                                                </td>
                                            </tr>
                                        ) : (
                                            localTaxInvoices.map((q, idx) => (
                                                <tr key={q.TaxInvoiceID}>
                                                    <td>{idx + 1}</td>
                                                    <td>v.{q.Revision || 0}</td>
                                                    <td className="text-bold">{q.TaxInvoiceNo || '-'}</td>
                                                    <td>{q.CustomerName}</td>
                                                    <td>{Number(q.GrandTotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                    <td>{q.BillDate ? new Date(q.BillDate).toLocaleDateString('th-TH') : '-'}</td>
                                                    <td style={{ textAlign: 'center' }}>
<InlineStatusDropdown
                                                        value={q.Status || q.status}
                                                        options={SALES_DOC_STATUSES}
                                                        
                                                        onChange={(newVal) => handleUpdateDocStatus(q.TaxInvoiceID || q.id, 'TaxInvoice', newVal)}
                                                    />
</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                            <button
                                                                onClick={() => setPreviewDocModal({ type: 'TaxInvoice', id: q.TaxInvoiceID })}
                                                                className="doc-action-btn"
                                                                title="ดูรายละเอียด"
                                                            >
                                                                <Eye size={15} />
                                                            </button>
                                                            {(q.Revision > 0) && (
                                                                <button
                                                                    onClick={() => handleViewHistory(q.TaxInvoiceID, 'TaxInvoice')}
                                                                    className="doc-action-btn"
                                                                    title="ประวัติ"
                                                                >
                                                                    <Clock size={15} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    setEditingTaxInvoiceId(q.TaxInvoiceID);
                                                                    setShowTaxInvoiceForm(true);
                                                                }}
                                                                className="doc-action-btn"
                                                                title="แก้ไข"
                                                            >
                                                                <Edit size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(q.TaxInvoiceID, 'TaxInvoice')}
                                                                className="doc-action-btn doc-action-btn-danger"
                                                                title="ลบ"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                            {taxInvoicePagination.totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px', borderTop: '1px solid var(--border)', gap: '12px', alignItems: 'center' }}>
                                    <button
                                        className="btn-secondary"
                                        disabled={taxInvoicePagination.page === 1}
                                        onClick={() => setTaxInvoicePagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        style={{ padding: '6px 12px' }}
                                    >
                                        ก่อนหน้า
                                    </button>
                                    <span style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                                        หน้า {taxInvoicePagination.page} จาก {taxInvoicePagination.totalPages}
                                    </span>
                                    <button
                                        className="btn-secondary"
                                        disabled={taxInvoicePagination.page === taxInvoicePagination.totalPages}
                                        onClick={() => setTaxInvoicePagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        style={{ padding: '6px 12px' }}
                                    >
                                        ถัดไป
                                    </button>
                                </div>
                            )}
                    </div>
                )
            )}

            {/* ── Tab: Delivery Order (ใบส่งสินค้า) ── */}
            {(activeTab === 'sales_delivery_order' && hasSubPermission('sales_delivery_order')) && (
                showDeliveryOrderForm ? (
                    <div className="subpage-content" key="sales_delivery_order_form">
                        <DeliveryOrderForm
                            editId={editingDeliveryOrderId}
                            onBack={() => {
                                setShowDeliveryOrderForm(false);
                                setEditingDeliveryOrderId(null);
                            }}
                            onSave={() => {
                                setShowDeliveryOrderForm(false);
                                setEditingDeliveryOrderId(null);
                            }}
                        />
                    </div>
                ) : (
                    <div className="subpage-content" key="sales_delivery_order">
                        <div className="contract-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h1 className="contract-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                                    <FileText size={24} color="#1e40af" />
                                    ใบส่งสินค้า (Delivery Order)
                                </h1>
                                <p className="contract-subtitle" style={{ margin: '0', color: '#64748b', fontSize: '14px' }}>สร้างและจัดการข้อมูลเอกสารใบส่งสินค้า</p>
                            </div>
                        </div>
                        
                        {hasSectionPermission('sales_delivery_order_search') && (
                            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                                <div className="search-group">
                                    <div className="search-input-wrap">
                                        <Search size={18} />
                                        <input
                                            type="text"
                                            placeholder="ค้นหาใบส่งสินค้า..."
                                            value={deliveryOrderSearch}
                                            onChange={(e) => setDeliveryOrderSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setDeliveryOrderPagination(prev => ({ ...prev, page: 1 }));
                                                    setAppliedDeliveryOrderSearch(deliveryOrderSearch);
                                                }
                                            }}
                                        />
                                    </div>
                                    <button className="search-btn" onClick={() => {
                                        setDeliveryOrderPagination(prev => ({ ...prev, page: 1 }));
                                        setAppliedDeliveryOrderSearch(deliveryOrderSearch);
                                    }}>ค้นหา</button>
                                </div>
                                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => {
                                    setEditingDeliveryOrderId(null);
                                    setShowDeliveryOrderForm(true);
                                }}>
                                    <Plus size={16} /> สร้างใบส่งสินค้า
                                </button>
                            </div>
                        )}
                        {hasSectionPermission('sales_delivery_order_table') && (
                            <div className="table-card card">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ลำดับ</th>
                                            <th>เวอร์ชั่น</th>
                                            <th>เลขที่</th>
                                            <th>เลขที่สัญญา</th>
                                            <th>ลูกค้า</th>
                                            <th>ยอดรวม (บาท)</th>
                                            <th>วันที่</th>
                                            <th style={{ textAlign: 'center' }}>สถานะ</th>
                                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {localDeliveryOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)' }}>
                                                    ไม่มีข้อมูลใบส่งสินค้า
                                                </td>
                                            </tr>
                                        ) : (
                                            localDeliveryOrders.map((q, idx) => (
                                                <tr key={q.DeliveryOrderID}>
                                                    <td>{idx + 1}</td>
                                                    <td>v.{q.Revision || 0}</td>
                                                    <td className="text-bold">{q.DeliveryOrderNo || '-'}</td>
                                                    <td>{q.ContractID || '-'}</td>
                                                    <td>{q.CustomerName}</td>
                                                    <td>{Number(q.GrandTotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                    <td>{q.BillDate ? new Date(q.BillDate).toLocaleDateString('th-TH') : '-'}</td>
                                                    <td style={{ textAlign: 'center' }}>
<InlineStatusDropdown
                                                        value={q.Status || q.status}
                                                        options={SALES_DOC_STATUSES}
                                                        
                                                        onChange={(newVal) => handleUpdateDocStatus(q.DeliveryOrderID || q.id, 'DeliveryOrder', newVal)}
                                                    />
</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                            <button
                                                                onClick={() => setPreviewDocModal({ type: 'DeliveryOrder', id: q.DeliveryOrderID })}
                                                                className="doc-action-btn"
                                                                title="ดูรายละเอียด"
                                                            >
                                                                <Eye size={15} />
                                                            </button>
                                                            {(q.Revision > 0) && (
                                                                <button
                                                                    onClick={() => handleViewHistory(q.DeliveryOrderID, 'DeliveryOrder')}
                                                                    className="doc-action-btn"
                                                                    title="ประวัติ"
                                                                >
                                                                    <Clock size={15} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    setEditingDeliveryOrderId(q.DeliveryOrderID);
                                                                    setShowDeliveryOrderForm(true);
                                                                }}
                                                                className="doc-action-btn"
                                                                title="แก้ไข"
                                                            >
                                                                <Edit size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(q.DeliveryOrderID, 'DeliveryOrder')}
                                                                className="doc-action-btn doc-action-btn-danger"
                                                                title="ลบ"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                            {deliveryOrderPagination.totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px', borderTop: '1px solid var(--border)', gap: '12px', alignItems: 'center' }}>
                                    <button
                                        className="btn-secondary"
                                        disabled={deliveryOrderPagination.page === 1}
                                        onClick={() => setDeliveryOrderPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        style={{ padding: '6px 12px' }}
                                    >
                                        ก่อนหน้า
                                    </button>
                                    <span style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                                        หน้า {deliveryOrderPagination.page} จาก {deliveryOrderPagination.totalPages}
                                    </span>
                                    <button
                                        className="btn-secondary"
                                        disabled={deliveryOrderPagination.page === deliveryOrderPagination.totalPages}
                                        onClick={() => setDeliveryOrderPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        style={{ padding: '6px 12px' }}
                                    >
                                        ถัดไป
                                    </button>
                                </div>
                            )}
                    </div>
                )
            )}

            {/* ── Tab: ใบเสร็จรับเงิน (Receipt) ── */}
            {(activeTab === 'sales_receipt' && hasSubPermission('sales_receipt')) && (
                showReceiptForm ? (
                    <ReceiptForm
                        editId={editDocId}
                        onBack={() => {
                            setShowReceiptForm(false);
                            setEditDocId(null);
                        }}
                        onSave={() => {
                            setShowReceiptForm(false);
                            setEditDocId(null);
                        }}
                    />
                ) : (
                    <div className="subpage-content" key="sales_receipt">
                        <div className="contract-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h1 className="contract-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                                    <FileText size={24} color="#1e40af" />
                                    ใบเสร็จรับเงิน (Receipt)
                                </h1>
                                <p className="contract-subtitle" style={{ margin: '0', color: '#64748b', fontSize: '14px' }}>สร้างและจัดการข้อมูลเอกสารใบเสร็จรับเงิน</p>
                            </div>
                        </div>
                        
                        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="ค้นหาใบเสร็จรับเงิน..."
                                        value={receiptSearch}
                                        onChange={(e) => setReceiptSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setReceiptPagination(prev => ({ ...prev, page: 1 }));
                                                setAppliedReceiptSearch(receiptSearch);
                                            }
                                        }}
                                    />
                                </div>
                                <button className="search-btn" onClick={() => {
                                    setReceiptPagination(prev => ({ ...prev, page: 1 }));
                                    setAppliedReceiptSearch(receiptSearch);
                                }}>ค้นหา</button>
                            </div>
                            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => {
                                setEditDocId(null);
                                setShowReceiptForm(true);
                            }}>
                                <Plus size={16} /> สร้างใบเสร็จรับเงิน
                            </button>
                        </div>

                        <div className="table-card card">
                            <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ลำดับ</th>
                                            <th>เวอร์ชั่น</th>
                                            <th>เลขที่</th>
                                            <th>ลูกค้า</th>
                                            <th>ยอดเงินรวม</th>
                                            <th>วันที่</th>
                                            <th style={{ textAlign: 'center' }}>สถานะ</th>
                                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {receipts.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)' }}>
                                                    ไม่มีข้อมูลใบเสร็จรับเงิน
                                                </td>
                                            </tr>
                                        ) : (
                                            receipts.map((q, idx) => (
                                                <tr key={q.ReceiptID}>
                                                    <td>{idx + 1}</td>
                                                    <td>v.{q.Revision || 0}</td>
                                                    <td className="text-bold">{q.ReceiptNo || '-'}</td>
                                                    <td>{q.CustomerName}</td>
                                                    <td>{Number(q.GrandTotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                    <td>{q.BillDate ? new Date(q.BillDate).toLocaleDateString('th-TH') : '-'}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                    <InlineStatusDropdown
                                                        value={q.Status || q.status}
                                                        options={SALES_DOC_STATUSES}
                                                        onChange={(newVal) => handleUpdateDocStatus(q.ReceiptID, 'Receipt', newVal)}
                                                    />
                                                </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                            <button
                                                                onClick={() => setPreviewDocModal({ type: 'Receipt', id: q.ReceiptID })}
                                                                className="doc-action-btn"
                                                                title="ดูรายละเอียด"
                                                            >
                                                                <Eye size={15} />
                                                            </button>
                                                            {(q.Revision > 0) && (
                                                                <button
                                                                    onClick={() => handleViewHistory(q.ReceiptID, 'Receipt')}
                                                                    className="doc-action-btn"
                                                                    title="ประวัติ"
                                                                >
                                                                    <Clock size={15} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    setEditDocId(q.ReceiptID);
                                                                    setShowReceiptForm(true);
                                                                }}
                                                                className="doc-action-btn"
                                                                title="แก้ไข"
                                                            >
                                                                <Edit size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(q.ReceiptID, 'Receipt')}
                                                                className="doc-action-btn doc-action-btn-danger"
                                                                title="ลบ"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {receiptPagination.totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px', borderTop: '1px solid var(--border)', gap: '12px', alignItems: 'center' }}>
                                    <button
                                        className="btn-secondary"
                                        disabled={receiptPagination.page === 1}
                                        onClick={() => setReceiptPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        style={{ padding: '6px 12px' }}
                                    >
                                        ก่อนหน้า
                                    </button>
                                    <span style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                                        หน้า {receiptPagination.page} จาก {receiptPagination.totalPages}
                                    </span>
                                    <button
                                        className="btn-secondary"
                                        disabled={receiptPagination.page === receiptPagination.totalPages}
                                        onClick={() => setReceiptPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        style={{ padding: '6px 12px' }}
                                    >
                                        ถัดไป
                                    </button>
                                </div>
                            )}
                    </div>
                )
            )}

            {/* ── Tab: Sales Order ── */}
            {(activeTab === 'sales_orders' && hasSubPermission('sales_orders')) && (
                showSOForm ? (
                    <SalesOrderForm
                        editId={editingSOId}
                        viewOnly={isSOViewOnly}
                        onBack={() => { 
                            setShowSOForm(false); 
                            setEditingSOId(null); 
                            setIsSOViewOnly(false);
                            if (returnTab) {
                                setSearchParams({ tab: returnTab });
                                setReturnTab(null);
                            }
                        }}
                        onSave={() => { 
                            setShowSOForm(false); 
                            setEditingSOId(null); 
                            setIsSOViewOnly(false);
                            if (returnTab) {
                                setSearchParams({ tab: returnTab });
                                setReturnTab(null);
                            }
                        }}
                    />
                ) : (
                    <div className="subpage-content" key="sales_orders">
                        <div className="contract-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h1 className="contract-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                                    <ShoppingCart size={24} color="#1e40af" />
                                    คำสั่งขาย (Sales Order)
                                </h1>
                                <p className="contract-subtitle" style={{ margin: '0', color: '#64748b', fontSize: '14px' }}>สร้างและจัดการข้อมูลคำสั่งขาย</p>
                            </div>
                        </div>
                        {hasSectionPermission('sales_orders_search') && (
                            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                                <div className="search-group">
                                    <div className="search-input-wrap">
                                        <Search size={18} />
                                        <input type="text" placeholder="พิมพ์เลขที่ SO, ลูกค้า..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} />
                                    </div>
                                    <button className="search-btn">ค้นหา</button>
                                </div>
                                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowSOForm(true)}>
                                    <Plus size={16} /> สร้าง Sales Order
                                </button>
                            </div>
                        )}

                        {hasSectionPermission('sales_orders_table') && (
                            <div className="table-card card">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ลำดับ</th>
                                            <th>เลขที่ SO</th>
                                            <th>อ้างอิง QT</th>
                                            <th>ลูกค้า</th>
                                            <th>PO ลูกค้า</th>
                                            <th>ยอดรวม (บาท)</th>
                                            <th>วันที่สั่ง</th>
                                            <th>สถานะ</th>
                                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOrders.length === 0 ? (
                                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ยังไม่มีรายการ Sales Order</td></tr>
                                        ) : filteredOrders.map((o, idx) => (
                                            <tr key={o.SalesOrderID}>
                                                <td>{idx + 1}</td>
                                                <td className="text-bold">
                                                    {o.SalesOrderNo}
                                                    {o.Revision > 0 && (
                                                        <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 600 }}>
                                                            v.{o.Revision + 1}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>{o.QuotationNo || '—'}</td>
                                                <td>{o.CustomerName}</td>
                                                <td>{o.CustomerPONumber || '—'}</td>
                                                <td>{(o.GrandTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                <td>{o.OrderDate ? new Date(o.OrderDate).toLocaleDateString('th-TH') : ''}</td>
                                                <td><span className={`badge ${getOrderStatusClass(o.Status)}`}>{o.Status}</span></td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                        {o.Revision > 0 && (
                                                            <button className="btn-icon text-purple-600 hover:bg-purple-50 hover:text-purple-700" style={{ color: '#9333ea', background: '#faf5ff' }} title="ดูประวัติการแก้ไข (History)" onClick={() => handleViewHistory(o.SalesOrderID, 'SalesOrder')}>
                                                                <History size={16} />
                                                            </button>
                                                        )}
                                                        {o.Status === 'ร่าง' ? (
                                                            <>
                                                                <button className="btn-icon text-slate-600 hover:bg-slate-50 hover:text-slate-700" title="ส่งให้ Planner" style={{ background: '#dbeafe', color: '#2563eb' }} onClick={() => handleSendToPlanner(o)}>
                                                                    <Send size={16} />
                                                                </button>
                                                                <button className="btn-icon text-blue-600 hover:bg-blue-50 hover:text-blue-700" title="ดูรายละเอียด" onClick={() => setPreviewSOId(o.SalesOrderID)}>
                                                                    <Eye size={16} />
                                                                </button>
                                                                <button className="btn-icon text-amber-500 hover:bg-amber-50 hover:text-amber-600" title="แก้ไข" onClick={() => { setEditingSOId(o.SalesOrderID); setIsSOViewOnly(false); setShowSOForm(true); }}>
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button className="btn-icon text-red-600 hover:bg-red-50 hover:text-red-700" title="ลบ" onClick={() => handleDeleteSO(o.SalesOrderID)}>
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button className="btn-icon text-blue-600 hover:bg-blue-50 hover:text-blue-700" title="ดูรายละเอียด" onClick={() => setPreviewSOId(o.SalesOrderID)}>
                                                                    <Eye size={16} />
                                                                </button>
                                                                {o.Status === 'ส่ง Planner แล้ว' && (
                                                                    <button className="btn-icon text-amber-600 hover:bg-amber-50 hover:text-amber-700" title="ดึงกลับมาเป็นร่างเพื่อแก้ไข" style={{ background: '#fef3c7', color: '#d97706' }} onClick={() => handleRevertSOToDraft(o)}>
                                                                        <RotateCcw size={16} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
            )}

            {/* ── Tab: Billing ── */}
            {(activeTab === 'sales_billing_invoice' && hasSubPermission('sales_billing_invoice')) && (
                showBillingForm ? (
                    <div className="subpage-content" key="sales_billing_form">
                        <BillingInvoiceForm 
                            editId={editingBillingId}
                            onBack={() => { 
                            setShowBillingForm(false); 
                            setEditingBillingId(null);
                            if (returnTab) {
                                setSearchParams({ tab: returnTab });
                                setReturnTab(null);
                            }
                        }}
                        onSave={() => {
                            setShowBillingForm(false);
                            setEditingBillingId(null);
                        }} 
                        />
                    </div>
                ) : (
                    <div className="subpage-content" key="sales_billing">
                        <div className="contract-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h1 className="contract-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                                    <Receipt size={24} color="#1e40af" />
                                    ใบวางบิล/ใบแจ้งหนี้ (Billing Note/Invoice)
                                </h1>
                                <p className="contract-subtitle" style={{ margin: '0', color: '#64748b', fontSize: '14px' }}>จัดการใบวางบิลและใบแจ้งหนี้ฝ่ายขาย</p>
                            </div>
                        </div>
                        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="พิมพ์เลขที่บิล, ลูกค้า..."
                                        value={billingSearch}
                                        onChange={(e) => setBillingSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setBillingPagination(prev => ({ ...prev, page: 1 }));
                                                setAppliedBillingSearch(billingSearch);
                                            }
                                        }}
                                    />
                                </div>
                                <button className="search-btn" onClick={() => {
                                    setBillingPagination(prev => ({ ...prev, page: 1 }));
                                    setAppliedBillingSearch(billingSearch);
                                }}>ค้นหา</button>
                            </div>
                            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setEditingBillingId(null); setShowBillingForm(true); }}>
                                <Plus size={16} /> สร้างบิล/เอกสาร
                            </button>
                        </div>

                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ลำดับ</th>
                                        <th>เวอร์ชั่น</th>
                                        <th>เลขที่บิล</th>
                                        <th>ลูกค้า</th>
                                        <th>ยอดรวม (บาท)</th>
                                        <th>วันที่บิล</th>
                                        <th>สถานะ</th>
                                        <th style={{ textAlign: 'center' }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {localBillings.length === 0 ? (
                                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>ไม่มีข้อมูลใบวางบิล/ใบแจ้งหนี้</td></tr>
                                    ) : localBillings.map((b, idx) => (
                                        <tr key={b.BillingInvoiceID || b.id}>
                                            <td>{idx + 1}</td>
                                            <td>v.{b.Revision || 0}</td>
                                            <td className="text-bold">{b.BillingInvoiceNo || '-'}</td>
                                            <td>{b.CustomerName || '-'}</td>
                                            <td>{((b.GrandTotal) || 0).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                                            <td>{b.BillDate ? new Date(b.BillDate).toLocaleDateString('th-TH') : '-'}</td>
                                            <td>
                                                <InlineStatusDropdown
                                                    value={b.Status || b.status}
                                                    options={SALES_DOC_STATUSES}
                                                    onChange={(newVal) => handleUpdateDocStatus(b.BillingInvoiceID || b.id, 'BillingInvoice', newVal)}
                                                />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                    <button 
                                                        className="btn-icon text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                        title="ดูรายละเอียด"
                                                        onClick={() => setPreviewBillingId(b.BillingInvoiceID)}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {(b.Revision > 0) && (
                                                        <button 
                                                            className="btn-icon text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                                                            title="ประวัติ"
                                                            onClick={() => handleViewHistory(b.BillingInvoiceID, 'BillingInvoice')}
                                                        >
                                                            <Clock size={16} />
                                                        </button>
                                                    )}
                                                    <button 
                                                        className="btn-icon text-amber-500 hover:bg-amber-50 hover:text-amber-600"
                                                        title="แก้ไข"
                                                        onClick={() => { setEditingBillingId(b.BillingInvoiceID); setShowBillingForm(true); }}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button 
                                                        className="btn-icon text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        title="ลบ"
                                                        onClick={() => handleDeleteBilling(b.BillingInvoiceID)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Controls */}
                        {billingPagination.totalPages > 1 && (
                            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '15px 0' }}>
                                <button 
                                    className="btn-secondary"
                                    disabled={billingPagination.page === 1}
                                    onClick={() => setBillingPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                >
                                    ก่อนหน้า
                                </button>
                                <span>หน้า {billingPagination.page} / {billingPagination.totalPages}</span>
                                <button 
                                    className="btn-secondary"
                                    disabled={billingPagination.page === billingPagination.totalPages}
                                    onClick={() => setBillingPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                >
                                    ถัดไป
                                </button>
                            </div>
                        )}
                    </div>
                )
            )}

            {/* ── Tab: ขึ้นทะเบียน ── */}
            {(activeTab === 'sales_poa' && hasSubPermission('sales_poa')) && (
                showPOAForm ? (
                    <div className="subpage-content" key="sales_poa_form">
                        <RegistrationDocCreator
                            onBack={() => { setShowPOAForm(false); setEditingPOAId(null); setEditingPOAType(null); }}
                            editingDocId={editingPOAId}
                            editingDocType={editingPOAType}
                        />
                    </div>
                ) : (
                    <div className="subpage-content" key="sales_poa_list">
                        <div className="contract-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h1 className="contract-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                                    <Briefcase size={24} color="#1e40af" />
                                    ขึ้นทะเบียน (POA)
                                </h1>
                                <p className="contract-subtitle" style={{ margin: '0', color: '#64748b', fontSize: '14px' }}>สร้างและจัดการเอกสารขึ้นทะเบียน</p>
                            </div>
                        </div>
                        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="พิมพ์เลขที่เอกสาร, ผู้มอบ, ผู้รับมอบ..."
                                        value={poaSearch}
                                        onChange={(e) => setPoaSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setPoaPagination(prev => ({ ...prev, page: 1 }));
                                                setAppliedPoaSearch(poaSearch);
                                            }
                                        }}
                                    />
                                </div>
                                <button className="search-btn" onClick={() => {
                                    setPoaPagination(prev => ({ ...prev, page: 1 }));
                                    setAppliedPoaSearch(poaSearch);
                                }}>ค้นหา</button>
                            </div>
                            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setEditingPOAId(null); setShowPOAForm(true); }}>
                                <Plus size={16} /> สร้างเอกสารขึ้นทะเบียน
                            </button>
                        </div>
                        <div className="table-card card">
                            <div className="table-responsive">
                                <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>เลขที่เอกสาร</th>
                                        <th>เวอร์ชัน</th>
                                        <th>วันที่เอกสาร</th>
                                        <th>ผู้มอบอำนาจ</th>
                                        <th>ผู้รับมอบอำนาจ</th>
                                        <th>สถานะ</th>
                                        <th style={{ textAlign: 'center' }}>การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {localPOAs.filter(p => !appliedPoaSearch || 
                                        p.DocumentNo?.toLowerCase().includes(appliedPoaSearch.toLowerCase()) || 
                                        p.GrantorName?.toLowerCase().includes(appliedPoaSearch.toLowerCase()) || 
                                        p.GranteeName?.toLowerCase().includes(appliedPoaSearch.toLowerCase())
                                    ).length === 0 ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>ไม่มีข้อมูลเอกสารขึ้นทะเบียน</td></tr>
                                    ) : localPOAs.filter(p => !appliedPoaSearch || 
                                        p.DocumentNo?.toLowerCase().includes(appliedPoaSearch.toLowerCase()) || 
                                        p.GrantorName?.toLowerCase().includes(appliedPoaSearch.toLowerCase()) || 
                                        p.GranteeName?.toLowerCase().includes(appliedPoaSearch.toLowerCase())
                                    ).map(p => (
                                        <tr key={p.DocumentID}>
                                            <td>{p.DocumentNo || '-'}</td>
                                            <td>{p.Version > 1 ? `V${p.Version}` : '-'}</td>
                                            <td>{p.DocumentDate ? new Date(p.DocumentDate).toLocaleDateString('th-TH') : '-'}</td>
                                            <td>{p.GrantorName || '-'}</td>
                                            <td>{p.GranteeName || '-'}</td>
                                            <td>
                                                <span className={`badge ${getRegistrationStatusClass(p.Status)}`}>
                                                    {p.Status || 'ร่าง'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="action-buttons justify-center">
                                                    <button className="btn-icon text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700" style={{ color: '#4f46e5' }} title="ไฟล์แนบ/อัปโหลด" onClick={() => handleViewDocHistory(p.DocumentNo, 'poa', 'attachments')}>
                                                        <Upload size={16} />
                                                    </button>
                                                    {p.Version > 1 && (
                                                        <button className="btn-icon text-purple-600 hover:bg-purple-50 hover:text-purple-700" style={{ color: '#9333ea' }} title="ประวัติการแก้ไข" onClick={() => handleViewDocHistory(p.DocumentNo, 'poa', 'versions')}>
                                                            <History size={16} />
                                                        </button>
                                                    )}
                                                    <button className="btn-icon text-blue-600 hover:bg-blue-50 hover:text-blue-700" style={{ color: '#2563eb' }} title="ดู/พิมพ์ PDF" onClick={() => handlePrintPOA(p.DocumentID, p.DocumentType || 'poa')}>
                                                        <FileText size={16} />
                                                    </button>
                                                    <button className="btn-icon" style={{ color: '#f59e0b' }} title="แก้ไข" onClick={() => { setEditingPOAId(p.DocumentID); setEditingPOAType(p.DocumentType || 'poa'); setShowPOAForm(true); }}>
                                                        <Edit size={16} />
                                                    </button>
                                                    <button className="btn-icon text-red-600 hover:bg-red-50 hover:text-red-700" style={{ color: '#dc2626' }} title="ลบ" onClick={() => handleDeletePOA(p.DocumentID, p.DocumentType || 'poa')}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Controls */}
                        {poaPagination.totalPages > 1 && (
                            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '15px 0' }}>
                                <button 
                                    className="btn-secondary"
                                    disabled={poaPagination.page === 1}
                                    onClick={() => setPoaPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                >
                                    ก่อนหน้า
                                </button>
                                <span>หน้า {poaPagination.page} / {poaPagination.totalPages}</span>
                                <button 
                                    className="btn-secondary"
                                    disabled={poaPagination.page === poaPagination.totalPages}
                                    onClick={() => setPoaPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                >
                                    ถัดไป
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                )
            )}

            {/* ── Tab: หนังสือแต่งตั้งผู้แทนนิติบุคคล ── */}
            {(activeTab === 'sales_corp_rep' && hasSubPermission('sales_corp_rep')) && (
                <div className="subpage-content" key="sales_corp_rep">
                    <div className="contract-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                            <h1 className="contract-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                                <UserCheck size={24} color="#1e40af" />
                                หนังสือแต่งตั้งผู้แทนนิติบุคคล
                            </h1>
                            <p className="contract-subtitle" style={{ margin: '0', color: '#64748b', fontSize: '14px' }}>สร้างและจัดการหนังสือแต่งตั้งผู้แทนนิติบุคคล</p>
                        </div>
                    </div>
                    <CorporateRepresentativeForm onBack={() => {}} />
                </div>
            )}

            {/* ── Tab: จัดการสัญญา ── */}
            {(activeTab === 'sales_contracts' && hasSubPermission('sales_contracts')) && (
                <div className="subpage-content" key="sales_contracts">
                    <ContractManagement onViewDocument={(docType, docId) => {
                        if (docType === 'Quotation' || docType === 'ใบเสนอราคา') {
                            setPreviewQuotationId({ id: docId, hideEdit: true });
                        } else if (docType === 'Billing' || docType === 'ใบวางบิล' || docType === 'ใบวางบิล/ใบแจ้งหนี้') {
                            setPreviewBillingId({ id: docId, hideEdit: true });
                        } else if (docType === 'TaxInvoice' || docType === 'ใบแจ้งหนี้/ใบส่งสินค้า') {
                            setPreviewDocModal({ type: 'TaxInvoice', id: docId, hideEdit: true });
                        } else if (docType === 'DeliveryOrder' || docType === 'ใบส่งสินค้า') {
                            setPreviewDocModal({ type: 'DeliveryOrder', id: docId, hideEdit: true });
                        } else if (docType === 'Receipt' || docType === 'ใบเสร็จรับเงิน') {
                            setPreviewDocModal({ type: 'Receipt', id: docId, hideEdit: true });
                        } else if (docType === 'Sales Order' || docType === 'ใบสั่งขาย' || docType === 'ใบสั่งซื้อ') {
                            setPreviewSOId({ id: docId, hideEdit: true });
                        } else if (['poa', 'corp_rep', 'herbal_cert', 'torbor1', 'contract_mfg', 'pdpa_consent', 'safety_cert'].includes(docType)) {
                            // สำหรับเอกสารทางกฎหมาย ให้ดึง PDF มาพรีวิว
                            showLoading('กำลังเปิดเอกสาร...', 'กรุณารอสักครู่ ระบบกำลังสร้าง PDF');
                            fetch(`${API_BASE}/print`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ documentType: docType, documentId: docId })
                            })
                            .then(res => {
                                if (res.ok) return res.blob();
                                throw new Error('ไม่สามารถสร้าง PDF ได้');
                            })
                            .then(blob => {
                                hideLoading();
                                const url = window.URL.createObjectURL(blob);
                                window.open(url, '_blank');
                            })
                            .catch(err => {
                                hideLoading();
                                console.error('Print Error:', err);
                                showAlert('ข้อผิดพลาด', 'ไม่สามารถเปิดเอกสาร PDF ได้: ' + err.message, 'error');
                            });
                        } else {
                            showAlert('ข้อผิดพลาด', `ไม่สามารถเปิดเอกสารประเภท "${docType}" ได้จากหน้านี้`, 'error');
                        }
                    }} />
                </div>
            )}

            {/* Doc History Modal */}
            {showDocHistoryModal && (
                <div className="pdf-preview-overlay" onClick={() => setShowDocHistoryModal(false)}>
                    <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', height: 'auto', padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {historyTab === 'versions' ? (
                                    <><History size={18} /> ประวัติเวอร์ชันเอกสาร {historyDocumentNo}</>
                                ) : (
                                    <><UploadCloud size={18} /> อัปโหลดไฟล์สแกน {historyDocumentNo}</>
                                )}
                            </h3>
                            <button onClick={() => setShowDocHistoryModal(false)} className="doc-action-btn" style={{ width: '30px', height: '30px', background: '#f1f5f9', borderRadius: '6px' }}>
                                <X size={16} />
                            </button>
                        </div>
                        
                        {historyLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}><div className="loading-spinner"></div></div>
                        ) : (
                            <div>
                                {/* Tab buttons removed to separate popups */}

                                {historyTab === 'versions' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {docHistoryList.length === 0 ? (
                                            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>ไม่มีประวัติการแก้ไข</p>
                                        ) : (
                                            docHistoryList.map((h, i) => (
                                                <div key={h.DocumentID} style={{
                                                    padding: '14px 16px',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '8px',
                                                    background: i === 0 ? '#f0fdf4' : 'var(--bg)',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '13px' }}>
                                                                {h.Version === 1 ? 'ต้นฉบับ (V1)' : `V${h.Version}`}
                                                            </span>
                                                            {i > 0 && (
                                                                <span style={{ fontSize: '10px', color: '#64748b' }}>ถูกแทนที่</span>
                                                            )}
                                                            <span className={`badge ${getRegistrationStatusClass(h.Status)}`} style={{ fontSize: '10px' }}>
                                                                {h.Status || 'ร่าง'}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button className="btn-icon" style={{ color: '#2563eb' }} title="ดู PDF" onClick={() => handlePrintPOA(h.DocumentID)}>
                                                                <FileText size={16} />
                                                            </button>
                                                            {i === 0 && (
                                                                <button className="btn-icon" style={{ color: '#dc2626' }} title="ลบเวอร์ชันนี้" onClick={() => handleDeletePOA(h.DocumentID)}>
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '16px' }}>
                                                        <span>วันที่เอกสาร: {h.DocumentDate ? new Date(h.DocumentDate).toLocaleDateString('th-TH') : '-'}</span>
                                                        <span>สร้างเมื่อ: {new Date(h.CreatedAt).toLocaleDateString('th-TH')}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <form onSubmit={handleUploadAttachment} style={{ padding: '24px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                                <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '8px', color: '#10b981' }}>
                                                    <UploadCloud size={20} />
                                                </div>
                                                <h4 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: '600' }}>อัปโหลดเอกสารที่มีลายเซ็นลูกค้าแล้ว</h4>
                                            </div>
                                            
                                            <div style={{ 
                                                border: '2px dashed #cbd5e1', 
                                                borderRadius: '8px', 
                                                padding: '20px', 
                                                textAlign: 'center',
                                                background: '#f8fafc',
                                                transition: 'all 0.2s ease',
                                                cursor: 'pointer',
                                                position: 'relative'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                            >
                                                <input 
                                                    type="file" 
                                                    id="upload-file-input" 
                                                    accept=".pdf,.jpg,.jpeg,.png" 
                                                    onChange={(e) => setUploadFile(e.target.files[0])} 
                                                    style={{ 
                                                        position: 'absolute',
                                                        top: 0, left: 0, width: '100%', height: '100%',
                                                        opacity: 0, cursor: 'pointer'
                                                    }} 
                                                    required 
                                                />
                                                <div style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                    <Upload size={24} color={uploadFile ? '#10b981' : '#64748b'} />
                                                    <span style={{ fontSize: '14px', color: uploadFile ? '#10b981' : '#334155', fontWeight: uploadFile ? '600' : '500' }}>
                                                        {uploadFile ? `เลือกไฟล์แล้ว: ${uploadFile.name}` : 'คลิกหรือลากไฟล์มาวางที่นี่เพื่ออัปโหลด'}
                                                    </span>
                                                    {!uploadFile && <span style={{ fontSize: '12px', color: '#64748b' }}>รองรับไฟล์ PDF, JPG, PNG ขนาดไม่เกิน 10MB</span>}
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>วันที่รับเอกสารคืน</label>
                                                    <input type="date" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} className="form-input" style={{ padding: '8px 12px', borderRadius: '6px' }} required />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>ชื่อผู้รับเอกสาร</label>
                                                    <input type="text" value={uploadReceiver} onChange={(e) => setUploadReceiver(e.target.value)} placeholder="เช่น สมชาย เซลส์แมน" className="form-input" style={{ padding: '8px 12px', borderRadius: '6px' }} />
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                                                <input type="text" value={uploadRemarks} onChange={(e) => setUploadRemarks(e.target.value)} placeholder="พิมพ์หมายเหตุเพิ่มเติม..." className="form-input" style={{ padding: '8px 12px', borderRadius: '6px' }} />
                                            </div>
                                            
                                            <button type="submit" disabled={isUploading || !uploadFile} className="btn btn-primary" style={{ 
                                                marginTop: '8px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                gap: '8px',
                                                padding: '10px 16px',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s',
                                                boxShadow: isUploading || !uploadFile ? 'none' : '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                                                background: isUploading || !uploadFile ? '#cbd5e1' : '#10b981',
                                                border: 'none'
                                            }}>
                                                {isUploading ? <div className="loading-spinner" style={{ width: '16px', height: '16px', borderTopColor: '#fff' }}></div> : <UploadCloud size={18} />}
                                                อัปโหลดและอัปเดตสถานะเป็น "ลูกค้าลงนามแล้ว"
                                            </button>
                                        </form>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <h4 style={{ margin: '8px 0', fontSize: '14px', color: '#334155' }}>รายการไฟล์แนบ</h4>
                                            {docAttachments.length === 0 ? (
                                                <p style={{ textAlign: 'center', color: '#64748b', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>ยังไม่มีไฟล์แนบสำหรับเอกสารนี้</p>
                                            ) : (
                                                docAttachments.map((att) => (
                                                    <div key={att.AttachmentID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <FileText size={14} color="#64748b" />
                                                                <span style={{ fontWeight: 500, fontSize: '14px', color: '#334155' }}>{att.FileName}</span>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '16px' }}>
                                                                <span>รับเมื่อ: {att.ReceivedDate ? new Date(att.ReceivedDate).toLocaleDateString('th-TH') : '-'}</span>
                                                                {att.ReceiverName && <span>ผู้รับ: {att.ReceiverName}</span>}
                                                            </div>
                                                            {att.Remarks && <div style={{ fontSize: '12px', color: '#64748b' }}>หมายเหตุ: {att.Remarks}</div>}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <a href={`${API_BASE}${att.FilePath}`} target="_blank" rel="noreferrer" className="btn-icon" style={{ color: '#10b981', background: '#ecfdf5', padding: '8px', borderRadius: '6px' }} title="พรีวิวไฟล์">
                                                                <Eye size={16} />
                                                            </a>
                                                            <a href={`${API_BASE}${att.FilePath}`} download target="_blank" rel="noreferrer" className="btn-icon" style={{ color: '#2563eb', background: '#eff6ff', padding: '8px', borderRadius: '6px' }} title="ดาวน์โหลดไฟล์">
                                                                <Download size={16} />
                                                            </a>
                                                            <button className="btn-icon" style={{ color: '#ef4444', background: '#fef2f2', padding: '8px', borderRadius: '6px' }} title="ลบไฟล์" onClick={() => handleDeleteAttachment(att.AttachmentID)}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* ── Global History Modal ── */}
            {showHistoryModal && (
                <div className="pdf-preview-overlay" onClick={() => setShowHistoryModal(false)} style={{ zIndex: 3000, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', height: 'auto', padding: '24px', maxHeight: '80vh', overflowY: 'auto', background: '#fff', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <History size={18} /> ประวัติการแก้ไข
                            </h3>
                            <button onClick={() => setShowHistoryModal(false)} className="doc-action-btn" style={{ width: '30px', height: '30px', background: '#f1f5f9', borderRadius: '6px' }}>
                                <X size={16} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {historyList.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>ไม่มีประวัติการแก้ไขสำหรับเอกสารนี้</p>
                            ) : (
                                historyList.map((h, i) => (
                                    <div key={h.HistoryID} style={{
                                        padding: '14px 16px',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        background: i === 0 ? '#f0fdf4' : 'var(--bg)',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: 600, fontSize: '13px' }}>
                                                    {h.Revision === 0 ? 'ต้นฉบับ' : `v.${h.Revision}`}
                                                </span>
                                                {i === 0 && h.Revision > 0 && (
                                                    <span style={{ fontSize: '10px', color: '#64748b' }}>ถูกแทนที่ (v.{h.Revision + 1})</span>
                                                )}
                                                <span className={`badge ${getQuotationStatusClass(h.Status)}`} style={{ fontSize: '10px' }}>
                                                    {h.Status}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    #{h.HistoryID}
                                                </span>
                                                <button
                                                    className="btn-icon text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                    title="ดูเอกสาร"
                                                    style={{ background: '#e0f2fe', color: '#0284c7', width: '24px', height: '24px' }}
                                                    onClick={() => {
                                                        setShowHistoryModal(false);
                                                        if (historyDocType === 'BillingInvoice') {
                                                            setPreviewBillingId(`history-${h.HistoryID}`);
                                                        } else if (historyDocType === 'SalesOrder') {
                                                            setPreviewSOId(`history-${h.HistoryID}`);
                                                        } else if (historyDocType === 'TaxInvoice' || historyDocType === 'DeliveryOrder' || historyDocType === 'Receipt') {
                                                            setPreviewDocModal({ type: historyDocType, id: `history-${h.HistoryID}` });
                                                        } else {
                                                            setPreviewQuotationId(`history-${h.HistoryID}`);
                                                        }
                                                    }}
                                                >
                                                    <Eye size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            ยอดรวมสุทธิ ฿{(h.GrandTotal || 0).toLocaleString('th-TH', {minimumFractionDigits: 2})} — {new Date(h.ArchivedAt).toLocaleString('th-TH')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Preview Quotation Popup Modal ── */}
            {previewQuotationId && (
                <div className="pdf-preview-overlay" onClick={() => setPreviewQuotationId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '95%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Eye size={18} /> พรีวิวใบเสนอราคา
                            </h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {(() => {
                                    const qId = typeof previewQuotationId === 'object' && previewQuotationId !== null ? previewQuotationId.id : previewQuotationId;
                                    const qHideEdit = typeof previewQuotationId === 'object' && previewQuotationId !== null ? previewQuotationId.hideEdit : false;
                                    return !String(qId).startsWith('history-') && !qHideEdit && (
                                    <button
                                        onClick={() => {
                                            setPreviewQuotationId(null);
                                            setEditingQuotationId(qId);
                                            setIsViewOnly(false);
                                            setIsHistoryView(false);
                                            setShowQuotationForm(true);
                                        }}
                                        style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Edit size={14} /> แก้ไข
                                    </button>
                                    );
                                })()}
                                <button
                                    onClick={() => setPreviewQuotationId(null)}
                                    style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
                                >
                                    ✕ ปิด
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                            <QuotationForm
                                editId={typeof previewQuotationId === 'object' && previewQuotationId !== null ? previewQuotationId.id : previewQuotationId}
                                viewOnly={true}
                                isHistory={String(typeof previewQuotationId === 'object' && previewQuotationId !== null ? previewQuotationId.id : previewQuotationId).startsWith('history-')}
                                hideControls={true}
                                onBack={() => setPreviewQuotationId(null)}
                                onSave={() => setPreviewQuotationId(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Preview Sales Order Popup Modal ── */}
            {previewSOId && (
                <div className="pdf-preview-overlay" onClick={() => setPreviewSOId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '95%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Eye size={18} /> พรีวิวใบสั่งขาย
                            </h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {(() => {
                                    const soId = typeof previewSOId === 'object' && previewSOId !== null ? previewSOId.id : previewSOId;
                                    const soHideEdit = typeof previewSOId === 'object' && previewSOId !== null ? previewSOId.hideEdit : false;
                                    const currentSO = localSalesOrders.find(s => s.SalesOrderID === soId || s.SalesOrderNo === soId);
                                    const isDraft = !currentSO || currentSO.Status === 'ร่าง';

                                    return !String(soId).startsWith('history-') && !soHideEdit && (
                                        isDraft ? (
                                            <button
                                                onClick={() => {
                                                    setPreviewSOId(null);
                                                    setEditingSOId(soId);
                                                    setIsSOViewOnly(false);
                                                    setShowSOForm(true);
                                                }}
                                                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <Edit size={14} /> แก้ไข
                                            </button>
                                        ) : (currentSO?.Status === 'ส่ง Planner แล้ว' && (
                                            <button
                                                onClick={async () => {
                                                    setPreviewSOId(null);
                                                    await handleRevertSOToDraft(currentSO);
                                                }}
                                                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #fcd34d', background: '#fffbeb', cursor: 'pointer', fontSize: '13px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <RotateCcw size={14} /> ดึงกลับเป็นร่าง
                                            </button>
                                        ))
                                    );
                                })()}
                                <button
                                    onClick={() => setPreviewSOId(null)}
                                    style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
                                >
                                    ✕ ปิด
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                            <SalesOrderForm
                                editId={typeof previewSOId === 'object' && previewSOId !== null ? previewSOId.id : previewSOId}
                                viewOnly={true}
                                onBack={() => setPreviewSOId(null)}
                                onSave={() => setPreviewSOId(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Preview Billing Popup Modal ── */}
            {previewBillingId && (
                <div className="pdf-preview-overlay" onClick={() => setPreviewBillingId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '95%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Eye size={18} /> พรีวิวใบวางบิล
                            </h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {(() => {
                                    const bId = typeof previewBillingId === 'object' && previewBillingId !== null ? previewBillingId.id : previewBillingId;
                                    const bHideEdit = typeof previewBillingId === 'object' && previewBillingId !== null ? previewBillingId.hideEdit : false;
                                    return !String(bId).startsWith('history-') && !bHideEdit && (
                                    <button
                                        onClick={() => {
                                            setPreviewBillingId(null);
                                            setEditingBillingId(bId);
                                            setShowBillingForm(true);
                                        }}
                                        style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Edit size={14} /> แก้ไข
                                    </button>
                                    );
                                })()}
                                <button
                                    onClick={() => setPreviewBillingId(null)}
                                    style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
                                >
                                    ✕ ปิด
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                            <BillingInvoiceForm
                                editId={typeof previewBillingId === 'object' && previewBillingId !== null ? previewBillingId.id : previewBillingId}
                                viewOnly={true}
                                isHistory={String(typeof previewBillingId === 'object' && previewBillingId !== null ? previewBillingId.id : previewBillingId).startsWith('history-')}
                                hideControls={true}
                                onBack={() => setPreviewBillingId(null)}
                                onSave={() => setPreviewBillingId(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Preview Other Docs Popup Modal ── */}
            {previewDocModal && (
                <div className="pdf-preview-overlay" onClick={() => setPreviewDocModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '95%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Eye size={18} /> พรีวิวเอกสาร
                            </h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {!String(previewDocModal.id).startsWith('history-') && !previewDocModal.hideEdit && (
                                <button
                                    onClick={() => {
                                        const type = previewDocModal.type;
                                        const id = previewDocModal.id;
                                        setPreviewDocModal(null);
                                        if (type === 'TaxInvoice') {
                                            setEditingTaxInvoiceId(id);
                                            setShowTaxInvoiceForm(true);
                                        } else if (type === 'DeliveryOrder') {
                                            setEditingDeliveryOrderId(id);
                                            setShowDeliveryOrderForm(true);
                                        } else if (type === 'Receipt') {
                                            setEditDocId(id);
                                            setShowReceiptForm(true);
                                        }
                                    }}
                                    style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <Edit size={14} /> แก้ไข
                                </button>
                                )}
                                <button
                                    onClick={() => setPreviewDocModal(null)}
                                    style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
                                >
                                    ✕ ปิด
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                            {previewDocModal.type === 'TaxInvoice' && (
                                <TaxInvoiceForm
                                    editId={previewDocModal.id}
                                    viewOnly={true}
                                    isHistory={String(previewDocModal.id).startsWith('history-')}
                                    hideControls={true}
                                    onBack={() => setPreviewDocModal(null)}
                                    onSave={() => setPreviewDocModal(null)}
                                />
                            )}
                            {previewDocModal.type === 'DeliveryOrder' && (
                                <DeliveryOrderForm
                                    editId={previewDocModal.id}
                                    viewOnly={true}
                                    isHistory={String(previewDocModal.id).startsWith('history-')}
                                    hideControls={true}
                                    onBack={() => setPreviewDocModal(null)}
                                    onSave={() => setPreviewDocModal(null)}
                                />
                            )}
                            {previewDocModal.type === 'Receipt' && (
                                <ReceiptForm
                                    editId={previewDocModal.id}
                                    viewOnly={true}
                                    isHistory={String(previewDocModal.id).startsWith('history-')}
                                    hideControls={true}
                                    onBack={() => setPreviewDocModal(null)}
                                    onSave={() => setPreviewDocModal(null)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

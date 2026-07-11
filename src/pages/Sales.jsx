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
import { Eye, Edit, Trash2, Clock, History, X, Send, Plus, FileText, LayoutDashboard, Users, FileSpreadsheet, ShoppingCart, Receipt, Briefcase, UserCheck, Search, Copy, Upload, Download, UploadCloud } from 'lucide-react';
import { MOCK_CUSTOMERS } from '../data/mockData';
import QuotationForm from '../components/QuotationForm';
import SalesOrderForm from '../components/SalesOrderForm';
import BillingForm from '../components/BillingForm';
import PowerOfAttorneyForm from '../components/PowerOfAttorneyForm';
import RegistrationDocCreator from '../components/RegistrationDocCreator';
import ContractManagement from '../components/ContractManagement';
import API_BASE from '../config';
import './PageCommon.css';
import './DocumentControl.css';

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
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [historyItemNo, setHistoryItemNo] = useState('');
    
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
    const [billingPagination, setBillingPagination] = useState({ page: 1, limit: 50, totalPages: 1 });
    const [billingSearch, setBillingSearch] = useState('');
    const [appliedBillingSearch, setAppliedBillingSearch] = useState('');

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
            if (activeTab !== 'sales_billing') return;
            try {
                const res = await fetch(`${API_BASE}/quotations?category=billing&page=${billingPagination.page}&limit=${billingPagination.limit}&search=${encodeURIComponent(appliedBillingSearch)}`);
                const json = await res.json();
                if (json.success) {
                    setLocalBillings(json.data || []);
                    if (json.pagination) setBillingPagination(prev => ({ ...prev, totalPages: json.pagination.totalPages }));
                }
            } catch (err) { console.error('Error fetching billings:', err); }
        };
        fetchBillings();
    }, [activeTab, billingPagination.page, appliedBillingSearch, showBillingForm]);

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
    const handleViewHistory = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/quotations/${id}/history`);
            const json = await res.json();
            if (json.success) {
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
            } else { alert('ลบไม่สำเร็จ: ' + json.message); }
        } catch (err) { console.error('Error deleting quotation:', err); alert('เกิดข้อผิดพลาดในการลบ'); }
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
                                                <td><span className={`badge ${getQuotationStatusClass(q.Status)}`}>{q.Status}</span></td>
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
                                            <th>ใช้ได้ถึง</th>
                                            <th>สถานะ</th>
                                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredQuotations.map((q, idx) => (
                                            <tr key={q.QuotationID || q.id}>
                                                <td>{idx + 1}</td>
                                                <td>v.{q.Revision || 0}</td>
                                                <td className="text-bold">{q.QuotationNo || q.number}</td>
                                                <td>{q.CustomerName || q.customer}</td>
                                                <td>{(q.GrandTotal || q.total || 0).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                                                <td>{q.BillDate ? new Date(q.BillDate).toLocaleDateString('th-TH') : q.date}</td>
                                                <td>{q.ValidUntil ? new Date(q.ValidUntil).toLocaleDateString('th-TH') : q.validUntil}</td>
                                                <td>
                                                    <span className={`badge ${getQuotationStatusClass(q.Status || q.status)}`}>
                                                        {q.Status || q.status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                        <button 
                                                            className="doc-action-btn"
                                                            title="ดูรายละเอียด"
                                                            onClick={() => {
                                                                setEditingQuotationId(q.QuotationID || q.id);
                                                                setIsViewOnly(true);
                                                                setIsHistoryView(false);
                                                                setShowQuotationForm(true);
                                                            }}
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                        {q.Revision > 0 && (
                                                            <button 
                                                                className="doc-action-btn"
                                                                title="ประวัติ"
                                                                onClick={() => handleViewHistory(q.QuotationID || q.id)}
                                                            >
                                                                <Clock size={15} />
                                                            </button>
                                                        )}
                                                        <button 
                                                            className="doc-action-btn"
                                                            title="แก้ไข"
                                                            onClick={() => {
                                                                setEditingQuotationId(q.QuotationID || q.id);
                                                                setIsViewOnly(false);
                                                                setIsHistoryView(false);
                                                                setShowQuotationForm(true);
                                                            }}
                                                        >
                                                            <Edit size={15} />
                                                        </button>
                                                        <button 
                                                            className="doc-action-btn doc-action-btn-danger"
                                                            title="ลบ"
                                                            onClick={() => handleDeleteQuotation(q.QuotationID || q.id)}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
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

                        {/* History Modal */}
                        {showHistoryModal && (
                            <div className="pdf-preview-overlay" onClick={() => setShowHistoryModal(false)}>
                                <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', height: 'auto', padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
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
                                                                className="doc-action-btn"
                                                                title="ดูเอกสาร"
                                                                style={{ background: '#e0f2fe', color: '#0284c7', width: '24px', height: '24px' }}
                                                                onClick={() => {
                                                                    setShowHistoryModal(false);
                                                                    setEditingQuotationId(`history-${h.HistoryID}`);
                                                                    setIsViewOnly(true);
                                                                    setIsHistoryView(true);
                                                                    setShowQuotationForm(true);
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
                                                <td className="text-bold">{o.SalesOrderNo}</td>
                                                <td>{o.QuotationNo || '—'}</td>
                                                <td>{o.CustomerName}</td>
                                                <td>{o.CustomerPONumber || '—'}</td>
                                                <td>{(o.GrandTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                <td>{o.OrderDate ? new Date(o.OrderDate).toLocaleDateString('th-TH') : ''}</td>
                                                <td><span className={`badge ${getOrderStatusClass(o.Status)}`}>{o.Status}</span></td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                        {o.Status === 'ร่าง' && (
                                                            <button className="doc-action-btn" title="ส่งให้ Planner" style={{ background: '#dbeafe', color: '#2563eb' }} onClick={() => handleSendToPlanner(o)}>
                                                                <Send size={15} />
                                                            </button>
                                                        )}
                                                        <button className="doc-action-btn" title="ดูรายละเอียด" onClick={() => { setEditingSOId(o.SalesOrderID); setIsSOViewOnly(true); setShowSOForm(true); }}>
                                                            <Eye size={15} />
                                                        </button>
                                                        <button className="doc-action-btn" title="แก้ไข" onClick={() => { setEditingSOId(o.SalesOrderID); setIsSOViewOnly(false); setShowSOForm(true); }}>
                                                            <Edit size={15} />
                                                        </button>
                                                        <button className="doc-action-btn doc-action-btn-danger" title="ลบ" onClick={() => handleDeleteSO(o.SalesOrderID)}>
                                                            <Trash2 size={15} />
                                                        </button>
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
            {(activeTab === 'sales_billing' && hasSubPermission('sales_billing')) && (
                showBillingForm ? (
                    <div className="subpage-content" key="sales_billing_form">
                        <BillingForm onBack={() => { 
                            setShowBillingForm(false); 
                            setEditingBillingId(null);
                            if (returnTab) {
                                setSearchParams({ tab: returnTab });
                                setReturnTab(null);
                            }
                        }} />
                    </div>
                ) : (
                    <div className="subpage-content" key="sales_billing">
                        <div className="contract-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h1 className="contract-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                                    <Receipt size={24} color="#1e40af" />
                                    ออกบิล/เอกสาร (Billing)
                                </h1>
                                <p className="contract-subtitle" style={{ margin: '0', color: '#64748b', fontSize: '14px' }}>จัดการบิลและเอกสารฝ่ายขาย</p>
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
                                        <th>เลขที่บิล</th>
                                        <th>วันที่บิล</th>
                                        <th>ลูกค้า</th>
                                        <th>ยอดรวม</th>
                                        <th>สถานะ</th>
                                        <th style={{ textAlign: 'center' }}>การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {localBillings.length === 0 ? (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>ไม่มีข้อมูลบิล/เอกสาร</td></tr>
                                    ) : localBillings.map(b => (
                                        <tr key={b.QuotationID || b.id}>
                                            <td>{b.QuotationNo || '-'}</td>
                                            <td>{b.BillDate ? new Date(b.BillDate).toLocaleDateString('th-TH') : '-'}</td>
                                            <td>{b.CustomerName || '-'}</td>
                                            <td>฿{((b.GrandTotal) || 0).toLocaleString()}</td>
                                            <td>
                                                <span className={`badge ${b.Status === 'อนุมัติ' ? 'badge-success' : b.Status === 'รอตรวจสอบ' ? 'badge-info' : 'badge-neutral'}`}>
                                                    {b.Status || 'ร่าง'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="action-buttons justify-center">
                                                    <button className="btn-icon text-blue-600 hover:bg-blue-50 hover:text-blue-700" title="ดูเอกสาร" onClick={() => { setEditingBillingId(b.QuotationID); setShowBillingForm(true); }}>
                                                        <Eye size={16} />
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
                            setEditingQuotationId(docId);
                            setIsViewOnly(true);
                            setShowQuotationForm(true);
                            setReturnTab('sales_contracts');
                            setSearchParams({ tab: 'sales_quotation' });
                        } else if (docType === 'Billing' || docType === 'ใบวางบิล' || docType === 'ใบแจ้งหนี้') {
                            setEditingBillingId(docId);
                            setIsViewOnly(true);
                            setShowBillingForm(true);
                            setReturnTab('sales_contracts');
                            setSearchParams({ tab: 'sales_billing' });
                        } else if (docType === 'Sales Order' || docType === 'ใบสั่งขาย' || docType === 'ใบสั่งซื้อ') {
                            setEditingSOId(docId);
                            setIsSOViewOnly(true);
                            setShowSOForm(true);
                            setReturnTab('sales_contracts');
                            setSearchParams({ tab: 'sales_orders' });
                        } else if (docType === 'poa' || docType === 'corp_rep' || docType === 'herbal_cert') {
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
        </div>
    );
};

/**
 * =============================================================================
 * Procurement.jsx — หน้าจัดซื้อ (Procurement)
 * =============================================================================
 *
 * แสดงข้อมูลฝ่ายจัดซื้อ:
 *   - Tab procurement_dashboard : Dashboard ยอดสั่งซื้อ จำนวน PR/PO และการรับสินค้า
 *   - Tab procurement_pr        : Purchase Requisition (ใบขอซื้อ)
 *   - Tab procurement_po        : Purchase Order (ใบสั่งซื้อ)
 *   - Tab procurement_recv      : Receiving (รายการรับสินค้าเข้าคลัง)
 *
 * =============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import { useSignatures } from '../hooks/useSignatures';
import API_BASE from '../config';
import { Search, Plus, Eye, Edit, Trash2, Building2, X, Clock, Printer, FileText, CheckCircle, ShoppingBag, Package } from 'lucide-react';
import PurchaseOrderForm from '../components/PurchaseOrderForm';
import PurchaseRequisitionDoc from '../components/PurchaseRequisitionDoc';
import CustomSelect from '../components/CustomSelect';
import PaginationControl from '../components/PaginationControl';
import { FilterToggleButton, ProcurementPOFilterDrawer } from '../components/SalesDocFilter';
import './PageCommon.css';

export default function Procurement() {
    const { currentUser, hasSubPermission, hasSectionPermission, getVisibleSubPages, canCreate, canUpdate, canDelete } = useAuth();
    const { signatures, userSignatures } = useSignatures();
    const { showAlert, showConfirm } = useAlert();
    const visibleSubPages = getVisibleSubPages('procurement');
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'procurement_dashboard';

    // ── State: ค้นหาแยกตาม tab ──
    const [prSearch, setPrSearch] = useState('');
    const [prStatusFilter, setPrStatusFilter] = useState('ทั้งหมด');
    const [poSearch, setPoSearch] = useState('');
    const [supplierSearch, setSupplierSearch] = useState('');
    const [supplierStatusFilter, setSupplierStatusFilter] = useState('ทั้งหมด');

    // ── State: ทะเบียนผู้ขาย (Suppliers) ──
    const [suppliersList, setSuppliersList] = useState([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [supplierForm, setSupplierForm] = useState({
        supplierName: '',
        supplierCode: '',
        taxId: '',
        address: '',
        phone: '',
        email: '',
        contactPerson: '',
        paymentTerms: 'Net 30',
        creditLimit: '',
        certification: '',
        leadTimeDays: '',
        activeStatus: 'Active'
    });
    const [savingSupplier, setSavingSupplier] = useState(false);

    // ── State: ใบสั่งซื้อ (PO) จริงจาก Database ──
    const [poList, setPoList] = useState([]);
    const [loadingPO, setLoadingPO] = useState(false);
    const [showPOForm, setShowPOForm] = useState(false);
    const [editingPOId, setEditingPOId] = useState(null);
    const [viewOnlyPO, setViewOnlyPO] = useState(false);
    const [previewPOId, setPreviewPOId] = useState(null);
    const [creatingPOFromPR, setCreatingPOFromPR] = useState(null);

    const handleCreatePOFromPR = (pr) => {
        setCreatingPOFromPR(pr);
        setEditingPOId(null);
        setViewOnlyPO(false);
        setSearchParams({ tab: 'procurement_po' });
        setShowPOForm(true);
    };

    const [showPOHistoryModal, setShowPOHistoryModal] = useState(false);
    const [poHistoryList, setPoHistoryList] = useState([]);
    const [loadingPOHistory, setLoadingPOHistory] = useState(false);
    const [historyTargetPONumber, setHistoryTargetPONumber] = useState('');

    const handleViewPOHistory = async (poId, poNumber) => {
        setHistoryTargetPONumber(poNumber || '');
        setLoadingPOHistory(true);
        setShowPOHistoryModal(true);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch(`${API_BASE}/purchase-orders/${poId}/history`, { headers });
            const json = await res.json();
            if (json.success) {
                setPoHistoryList(json.data || []);
            } else {
                setPoHistoryList([]);
            }
        } catch (err) {
            console.error('Error fetching PO history:', err);
            setPoHistoryList([]);
        } finally {
            setLoadingPOHistory(false);
        }
    };

    // ── State: ใบขอซื้อ (PR) จริงจาก Database ──
    const [prList, setPrList] = useState([]);
    const [loadingPR, setLoadingPR] = useState(false);
    const [viewingPR, setViewingPR] = useState(null);
    const [showCreatePRModal, setShowCreatePRModal] = useState(false);
    const [prForm, setPrForm] = useState({
        department: 'ฝ่ายจัดซื้อ',
        notes: '',
        items: [{ itemName: '', itemCode: '', requestQty: 1, unit: 'กก.', estimatedPrice: 0 }]
    });
    const [savingPR, setSavingPR] = useState(false);

    // ── ฟังก์ชันโหลดรายการ PR จาก API ──
    const fetchPurchaseRequisitions = useCallback(async () => {
        setLoadingPR(true);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const params = new URLSearchParams();
            if (prSearch.trim()) params.append('search', prSearch.trim());

            const res = await fetch(`${API_BASE}/purchase-requisitions?${params.toString()}`, { headers, credentials: 'omit' });
            const data = await res.json();
            if (data.success) {
                setPrList(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching PRs:', err);
        } finally {
            setLoadingPR(false);
        }
    }, [prSearch]);

    useEffect(() => {
        if (activeTab === 'procurement_pr' || activeTab === 'procurement_dashboard') {
            const timer = setTimeout(() => {
                fetchPurchaseRequisitions();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [activeTab, prSearch, fetchPurchaseRequisitions]);

    const handleUpdatePRStatus = async (prId, newStatus) => {
        try {
            const token = localStorage.getItem('token');

            let purchaserName = null;
            let purchaserSigPath = null;
            if (newStatus === 'อนุมัติแล้ว' || newStatus === 'สั่งซื้อแล้ว') {
                // Find matching user signature
                const mySig = (userSignatures && userSignatures.length > 0)
                    ? userSignatures[0]
                    : signatures?.find(s => (s.user_id && s.user_id == currentUser?.id) || (s.FullName && s.FullName === (currentUser?.name || currentUser?.displayName)));
                purchaserName = mySig?.FullName || currentUser?.name || currentUser?.displayName || currentUser?.username || 'เจ้าหน้าที่ฝ่ายจัดซื้อ';
                purchaserSigPath = mySig?.ImagePath || null;
            }

            const res = await fetch(`${API_BASE}/purchase-requisitions/${prId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ 
                    status: newStatus,
                    purchaser: (newStatus === 'อนุมัติแล้ว' || newStatus === 'สั่งซื้อแล้ว') ? purchaserName : null,
                    purchaserSignature: (newStatus === 'อนุมัติแล้ว' || newStatus === 'สั่งซื้อแล้ว') ? purchaserSigPath : null
                }),
                credentials: 'omit'
            });
            const result = await res.json();
            if (result.success) {
                showAlert('สำเร็จ', `อัปเดตสถานะ PR เป็น "${newStatus}" เรียบร้อยแล้ว`, 'success');
                const finalPurchaser = (newStatus === 'รอจัดซื้อ') ? null : (result.purchaser || purchaserName);
                const finalSig = (newStatus === 'รอจัดซื้อ') ? null : (result.purchaserSignature || purchaserSigPath);
                const finalPurchasedAt = (newStatus === 'รอจัดซื้อ') ? null : (result.purchasedAt || new Date().toISOString());

                setPrList(prev => prev.map(item => (item.id === prId || item.prNumber === prId) ? { 
                    ...item, 
                    status: newStatus,
                    purchaser: finalPurchaser,
                    purchaserSignature: finalSig,
                    purchasedAt: finalPurchasedAt
                } : item));

                if (viewingPR && (viewingPR.id === prId || viewingPR.prNumber === prId)) {
                    setViewingPR(prev => ({ 
                        ...prev, 
                        status: newStatus,
                        purchaser: finalPurchaser,
                        purchaserSignature: finalSig,
                        purchasedAt: finalPurchasedAt
                    }));
                }
            } else {
                showAlert('ข้อผิดพลาด', result.message || 'ไม่สามารถเปลี่ยนสถานะได้', 'error');
            }
        } catch (err) {
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    };

    const handleDeletePR = async (prId, prNumber) => {
        const confirmed = await showConfirm(
            'ยืนยันการยกเลิกใบขอซื้อ',
            `คุณแน่ใจหรือไม่ว่าต้องการยกเลิกใบขอซื้อ "${prNumber}"?`,
            'warning'
        );
        if (!confirmed) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/purchase-requisitions/${prId}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                credentials: 'omit'
            });
            const result = await res.json();
            if (result.success) {
                showAlert('สำเร็จ', `ยกเลิกใบขอซื้อ ${prNumber} เรียบร้อยแล้ว`, 'success');
                fetchPurchaseRequisitions();
                if (viewingPR && (viewingPR.id === prId || viewingPR.prNumber === prId)) {
                    setViewingPR(null);
                }
            } else {
                showAlert('ข้อผิดพลาด', result.message || 'ไม่สามารถยกเลิกได้', 'error');
            }
        } catch (err) {
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    };

    const handleSaveManualPR = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const validItems = prForm.items.filter(it => it.itemName && it.itemName.trim());
        if (validItems.length === 0) {
            showAlert('กรุณากรอกข้อมูล', 'กรุณาระบุรายการสินค้า/วัตถุดิบอย่างน้อย 1 รายการ', 'warning');
            return;
        }

        setSavingPR(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/purchase-requisitions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    department: prForm.department || 'ฝ่ายจัดซื้อ',
                    notes: prForm.notes,
                    items: validItems.map(it => ({
                        itemName: it.itemName.trim(),
                        itemCode: it.itemCode || '',
                        requestQty: Number(it.requestQty) || 1,
                        unit: it.unit || 'กก.',
                        estimatedPrice: Number(it.estimatedPrice) || 0
                    })),
                    estimatedTotal: validItems.reduce((sum, it) => sum + ((Number(it.requestQty) || 0) * (Number(it.estimatedPrice) || 0)), 0)
                }),
                credentials: 'omit'
            });
            const json = await res.json();
            if (json.success) {
                showAlert('สำเร็จ', json.message || 'สร้างใบขอซื้อ (PR) เรียบร้อยแล้ว', 'success');
                setShowCreatePRModal(false);
                setPrForm({
                    department: 'ฝ่ายจัดซื้อ',
                    notes: '',
                    items: [{ itemName: '', itemCode: '', requestQty: 1, unit: 'กก.', estimatedPrice: 0 }]
                });
                await fetchPurchaseRequisitions();
                if (json.prNumber) {
                    try {
                        const token = localStorage.getItem('token');
                        const resDet = await fetch(`${API_BASE}/purchase-requisitions/${json.prNumber}`, {
                            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                        });
                        const detJson = await resDet.json();
                        if (detJson.success && detJson.data) {
                            setViewingPR(detJson.data);
                        }
                    } catch (e) {
                        console.error('Error opening created PR:', e);
                    }
                }
            } else {
                throw new Error(json.message || 'สร้างไม่สำเร็จ');
            }
        } catch (err) {
            console.error('Error creating PR:', err);
            showAlert('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถสร้างใบขอซื้อได้', 'error');
        } finally {
            setSavingPR(false);
        }
    };

    // ── State: ตัวกรองใบสั่งซื้อ (PO Filter) ──
    const [poFilter, setPoFilter] = useState({
        status: '',
        supplierId: '',
        createdBy: '',
        dateFrom: '',
        dateTo: ''
    });
    const [showPOFilter, setShowPOFilter] = useState(false);
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

    const handlePOFilterChange = (field, value) => {
        setPoFilter(prev => ({ ...prev, [field]: value }));
    };

    const handleResetPOFilter = () => {
        setPoFilter({
            status: '',
            supplierId: '',
            createdBy: '',
            dateFrom: '',
            dateTo: ''
        });
        setPoSearch('');
    };

    const handlePOQuickDate = (type) => {
        const now = new Date();
        const format = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const todayStr = format(now);
        if (type === 'today') {
            setPoFilter(prev => ({ ...prev, dateFrom: todayStr, dateTo: todayStr }));
        } else if (type === '7days') {
            const d7 = new Date();
            d7.setDate(d7.getDate() - 6);
            setPoFilter(prev => ({ ...prev, dateFrom: format(d7), dateTo: todayStr }));
        } else if (type === 'thisMonth') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setPoFilter(prev => ({ ...prev, dateFrom: format(startOfMonth), dateTo: format(endOfMonth) }));
        }
    };

    const activePOFilterCount = [
        Boolean(poFilter.status),
        Boolean(poFilter.supplierId),
        Boolean(poFilter.createdBy),
        Boolean(poFilter.dateFrom || poFilter.dateTo)
    ].filter(Boolean).length;

    // ── Client-side fallback filtering สำหรับ PO เพื่อความรวดเร็วและตอบสนองทันที ──
    const filteredPOs = useMemo(() => {
        return poList.filter((po) => {
            if (poSearch.trim()) {
                const term = poSearch.toLowerCase();
                const matches = (
                    (po.PONumber || '').toLowerCase().includes(term) ||
                    (po.SupplierName || '').toLowerCase().includes(term) ||
                    (po.RefNumber || '').toLowerCase().includes(term) ||
                    (po.PRNumber || '').toLowerCase().includes(term) ||
                    (po.PrimaryItemName || '').toLowerCase().includes(term) ||
                    (po.CreatedByName || '').toLowerCase().includes(term)
                );
                if (!matches) return false;
            }
            if (poFilter.status && poFilter.status !== 'ทั้งหมด' && poFilter.status !== 'all') {
                if (po.Status !== poFilter.status) return false;
            }
            if (poFilter.supplierId) {
                if (String(po.SupplierID) !== String(poFilter.supplierId)) return false;
            }
            if (poFilter.createdBy) {
                if (String(po.CreatedBy) !== String(poFilter.createdBy)) return false;
            }
            if (poFilter.dateFrom) {
                const docDate = (po.PODate || po.OrderDate || '').split('T')[0];
                if (docDate && docDate < poFilter.dateFrom) return false;
            }
            if (poFilter.dateTo) {
                const docDate = (po.PODate || po.OrderDate || '').split('T')[0];
                if (docDate && docDate > poFilter.dateTo) return false;
            }
            return true;
        });
    }, [poList, poSearch, poFilter]);

    // ── Pagination State for PO ──
    const [poPage, setPoPage] = useState(1);
    const [poPageSize, setPoPageSize] = useState(10);

    useEffect(() => {
        setPoPage(1);
    }, [poSearch, poFilter, poPageSize]);

    const paginatedPOs = useMemo(() => {
        const start = (poPage - 1) * poPageSize;
        return filteredPOs.slice(start, start + poPageSize);
    }, [filteredPOs, poPage, poPageSize]);

    // ── Pagination State for Suppliers ──
    const [supPage, setSupPage] = useState(1);
    const [supPageSize, setSupPageSize] = useState(10);

    useEffect(() => {
        setSupPage(1);
    }, [supplierSearch, supPageSize]);

    const paginatedSuppliers = useMemo(() => {
        const start = (supPage - 1) * supPageSize;
        return suppliersList.slice(start, start + supPageSize);
    }, [suppliersList, supPage, supPageSize]);

    // ── ฟังก์ชันโหลดรายการ PO จาก API ──
    const fetchPurchaseOrders = useCallback(async () => {
        setLoadingPO(true);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const params = new URLSearchParams();
            if (poSearch.trim()) params.append('search', poSearch.trim());
            if (poFilter.status && poFilter.status !== 'ทั้งหมด' && poFilter.status !== 'all') {
                params.append('status', poFilter.status);
            }
            if (poFilter.supplierId) params.append('supplierId', poFilter.supplierId);
            if (poFilter.createdBy) params.append('createdBy', poFilter.createdBy);
            if (poFilter.dateFrom) params.append('dateFrom', poFilter.dateFrom);
            if (poFilter.dateTo) params.append('dateTo', poFilter.dateTo);

            const url = `${API_BASE}/purchase-orders?${params.toString()}`;
            const res = await fetch(url, { headers, credentials: 'omit' });
            const data = await res.json();
            if (data.success) {
                setPoList(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching POs:', err);
        } finally {
            setLoadingPO(false);
        }
    }, [poSearch, poFilter]);

    useEffect(() => {
        if (activeTab === 'procurement_po' || activeTab === 'procurement_dashboard') {
            const timer = setTimeout(() => {
                fetchPurchaseOrders();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [activeTab, poSearch, poFilter, fetchPurchaseOrders]);

    // ── ฟังก์ชันโหลดรายการผู้ขาย (Suppliers) จาก API ──
    const fetchSuppliers = useCallback(async () => {
        setLoadingSuppliers(true);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const params = new URLSearchParams();
            if (supplierSearch.trim()) params.append('search', supplierSearch.trim());
            if (supplierStatusFilter && supplierStatusFilter !== 'ทั้งหมด') params.append('status', supplierStatusFilter);

            const res = await fetch(`${API_BASE}/suppliers?${params.toString()}`, { headers, credentials: 'omit' });
            const data = await res.json();
            if (data.success) {
                setSuppliersList(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching suppliers:', err);
        } finally {
            setLoadingSuppliers(false);
        }
    }, [supplierSearch, supplierStatusFilter]);

    useEffect(() => {
        if (activeTab === 'procurement_supplier' || activeTab === 'procurement_po') {
            const timer = setTimeout(() => {
                fetchSuppliers();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [activeTab, supplierSearch, supplierStatusFilter, fetchSuppliers]);

    // ── Handlers สำหรับจัดการผู้ขาย ──
    const handleOpenCreateSupplier = () => {
        setEditingSupplier(null);
        setSupplierForm({
            supplierName: '',
            supplierCode: '',
            taxId: '',
            address: '',
            phone: '',
            email: '',
            contactPerson: '',
            paymentTerms: 'Net 30',
            creditLimit: '',
            certification: '',
            leadTimeDays: '',
            activeStatus: 'Active'
        });
        setShowSupplierModal(true);
    };

    const handleOpenEditSupplier = (sup) => {
        setEditingSupplier(sup);
        setSupplierForm({
            supplierName: sup.SupplierName || '',
            supplierCode: sup.SupplierCode || '',
            taxId: sup.TaxID || '',
            address: sup.Address || '',
            phone: sup.Phone || '',
            email: sup.Email || '',
            contactPerson: sup.ContactPerson || '',
            paymentTerms: sup.PaymentTerms || 'Net 30',
            creditLimit: sup.CreditLimit !== null && sup.CreditLimit !== undefined ? String(sup.CreditLimit) : '',
            certification: sup.Certification || '',
            leadTimeDays: sup.LeadTimeDays !== null && sup.LeadTimeDays !== undefined ? String(sup.LeadTimeDays) : '',
            activeStatus: sup.ActiveStatus || 'Active'
        });
        setShowSupplierModal(true);
    };

    const handleSaveSupplier = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!supplierForm.supplierName || !supplierForm.supplierName.trim()) {
            showAlert('กรุณากรอกข้อมูล', 'กรุณาระบุชื่อผู้ขาย / ซัพพลายเออร์', 'warning');
            return;
        }

        setSavingSupplier(true);
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            const endpoint = editingSupplier ? `${API_BASE}/suppliers/${editingSupplier.SupplierID}` : `${API_BASE}/suppliers`;
            const method = editingSupplier ? 'PUT' : 'POST';

            const res = await fetch(endpoint, {
                method,
                headers,
                body: JSON.stringify(supplierForm)
            });
            const json = await res.json();
            if (json.success) {
                showAlert('สำเร็จ', editingSupplier ? 'บันทึกการแก้ไขข้อมูลผู้ขายแล้ว' : 'เพิ่มผู้ขายรายใหม่เรียบร้อยแล้ว', 'success');
                setShowSupplierModal(false);
                fetchSuppliers();
            } else {
                throw new Error(json.message || 'บันทึกข้อมูลไม่สำเร็จ');
            }
        } catch (err) {
            console.error('Error saving supplier:', err);
            showAlert('เกิดข้อผิดพลาด', err.message || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
        } finally {
            setSavingSupplier(false);
        }
    };

    const handleDeleteSupplier = async (sup) => {
        const confirmed = await showConfirm(
            'ยืนยันการลบ',
            `ต้องการลบผู้ขาย "${sup.SupplierName}" ใช่หรือไม่? หากมีประวัติใบสั่งซื้อระบบจะปรับเป็นไม่ใช้งานแทน`
        );
        if (!confirmed) return;

        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch(`${API_BASE}/suppliers/${sup.SupplierID}`, {
                method: 'DELETE',
                headers
            });
            const json = await res.json();
            if (json.success) {
                showAlert('สำเร็จ', json.message || 'ลบข้อมูลผู้ขายเรียบร้อยแล้ว', 'success');
                fetchSuppliers();
            } else {
                throw new Error(json.message || 'ลบไม่สำเร็จ');
            }
        } catch (err) {
            console.error('Error deleting supplier:', err);
            showAlert('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถลบข้อมูลผู้ขายได้', 'error');
        }
    };

    // ── Status Options & Helpers สำหรับ PO ──
    const PO_STATUS_OPTIONS = [
        { value: 'รออนุมัติ', label: 'รออนุมัติ' },
        { value: 'อนุมัติแล้ว', label: 'อนุมัติแล้ว' },
        { value: 'รับสินค้าแล้ว', label: 'รับสินค้าแล้ว' },
        { value: 'ยกเลิก', label: 'ยกเลิก' },
    ];

    const getPOStatusClass = (status) => {
        switch (status) {
            case 'อนุมัติแล้ว':
            case 'รับสินค้าแล้ว': return 'badge-success';
            case 'รออนุมัติ': return 'badge-warning';
            case 'ยกเลิก': return 'badge-danger';
            default: return 'badge-neutral';
        }
    };

    const getPOStatusStyle = (status) => {
        switch (status) {
            case 'อนุมัติแล้ว':
            case 'รับสินค้าแล้ว':
                return { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' };
            case 'รออนุมัติ':
                return { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' };
            case 'ยกเลิก':
                return { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' };
            default:
                return { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
        }
    };

    const handleUpdatePOStatus = async (poId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/purchase-orders/${poId}/status`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ status: newStatus }),
                credentials: 'omit'
            });
            const result = await res.json();
            if (result.success) {
                if (newStatus === 'รับสินค้าแล้ว') {
                    showAlert('สำเร็จ', result.message || 'อัปเดตสถานะเป็น "รับสินค้าแล้ว" เรียบร้อยแล้ว ระบบได้ส่งรายการเข้าฝ่าย QC เพื่อ "ตรวจรับวัตถุดิบ (Incoming QC)" ก่อนส่งเข้าคลัง', 'success');
                } else {
                    showAlert('สำเร็จ', `อัปเดตสถานะเป็น "${newStatus}" เรียบร้อยแล้ว`, 'success');
                }
                setPoList(prev => prev.map(item => (item.PurchaseOrderID === poId || item.POID === poId) ? { ...item, Status: newStatus } : item));
            } else {
                showAlert('ข้อผิดพลาด', result.message || 'ไม่สามารถเปลี่ยนสถานะได้', 'error');
            }
        } catch (err) {
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    };

    const handleDeletePO = async (poId, poNumber) => {
        const confirmed = await showConfirm(
            'ยืนยันการลบใบสั่งซื้อ',
            `คุณแน่ใจหรือไม่ว่าต้องการลบใบสั่งซื้อ "${poNumber}"? การกระทำนี้ไม่สามารถย้อนกลับได้`,
            'warning'
        );
        if (!confirmed) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/purchase-orders/${poId}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                credentials: 'omit'
            });
            const result = await res.json();
            if (result.success) {
                showAlert('สำเร็จ', `ลบใบสั่งซื้อ ${poNumber} เรียบร้อยแล้ว`, 'success');
                fetchPurchaseOrders();
            } else {
                showAlert('ข้อผิดพลาด', result.message || 'ไม่สามารถลบใบสั่งซื้อได้', 'error');
            }
        } catch (err) {
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    };

    // ── คำนวณ Dashboard stats ──
    const totalOrderedAmount = poList.length > 0 
        ? poList.reduce((sum, po) => sum + (Number(po.TotalPayable) || Number(po.NetPayable) || Number(po.GrandTotal) || 0), 0)
        : 0;

    const allPRs = prList;

    const totalPRs = allPRs.length;
    const pendingPRCards = useMemo(() => allPRs.filter(p => p.status === 'รอจัดซื้อ' || p.status === 'รออนุมัติ'), [allPRs]);
    const pendingPRCount = pendingPRCards.length;
    const approvedPRCount = useMemo(() => allPRs.filter(p => p.status === 'อนุมัติแล้ว').length, [allPRs]);
    const orderedPRCount = useMemo(() => allPRs.filter(p => p.status === 'สั่งซื้อแล้ว').length, [allPRs]);

    const totalPOs = poList.length;
    const completedReceives = useMemo(() => poList.filter(p => p.Status === 'รับสินค้าแล้ว').length, [poList]);

    // ── กรองข้อมูลแต่ละ tab ──
    const filteredPR = useMemo(() => {
        return allPRs.filter((pr) => {
            // กรองสถานะจากการ์ด
            if (prStatusFilter !== 'ทั้งหมด') {
                if (prStatusFilter === 'รอจัดซื้อ') {
                    if (pr.status !== 'รอจัดซื้อ' && pr.status !== 'รออนุมัติ') return false;
                } else if (pr.status !== prStatusFilter) {
                    return false;
                }
            }

            if (!prSearch.trim()) return true;
            const term = prSearch.toLowerCase();
            const prNum = (pr.prNumber || pr.number || '').toLowerCase();
            const req = (pr.requestor || '').toLowerCase();
            const dept = (pr.department || '').toLowerCase();
            const task = (pr.taskId || '').toLowerCase();
            const formula = (pr.formulaName || '').toLowerCase();
            const notes = (pr.notes || '').toLowerCase();
            const itemNames = (pr.items || []).map(i => (i.itemName || i.name || i.item || '').toLowerCase()).join(' ');
            return prNum.includes(term) || req.includes(term) || dept.includes(term) || task.includes(term) || formula.includes(term) || notes.includes(term) || itemNames.includes(term);
        });
    }, [allPRs, prSearch, prStatusFilter]);

    // ── Badge class helpers ──
    const getPRStatusClass = (status) => {
        switch (status) {
            case 'อนุมัติแล้ว': return 'badge-success';
            case 'สั่งซื้อแล้ว': return 'badge-info';
            case 'รอจัดซื้อ':
            case 'รออนุมัติ': return 'badge-warning';
            case 'ยกเลิก':
            case 'ไม่อนุมัติ': return 'badge-danger';
            default: return 'badge-neutral';
        }
    };

    const getPRStatusStyle = (status) => {
        switch (status) {
            case 'อนุมัติแล้ว':
                return { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' };
            case 'สั่งซื้อแล้ว':
                return { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' };
            case 'รอจัดซื้อ':
            case 'รออนุมัติ':
                return { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' };
            case 'ยกเลิก':
            case 'ไม่อนุมัติ':
                return { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' };
            default:
                return { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
        }
    };

    const PR_STATUS_OPTIONS = [
        { value: 'รอจัดซื้อ', label: 'รอจัดซื้อ' },
        { value: 'รออนุมัติ', label: 'รออนุมัติ' },
        { value: 'อนุมัติแล้ว', label: 'อนุมัติแล้ว' },
        { value: 'สั่งซื้อแล้ว', label: 'สั่งซื้อแล้ว' },
        { value: 'ยกเลิก', label: 'ยกเลิก' },
    ];

    // ── Pagination State for PR ──
    const [prPage, setPrPage] = useState(1);
    const [prPageSize, setPrPageSize] = useState(10);

    useEffect(() => {
        setPrPage(1);
    }, [prSearch, prStatusFilter, prPageSize]);

    const paginatedPRs = useMemo(() => {
        const start = (prPage - 1) * prPageSize;
        return filteredPR.slice(start, start + prPageSize);
    }, [filteredPR, prPage, prPageSize]);

    // ── กำหนดชื่อหน้าตาม Tab ที่เลือก ──
    const getPageTitle = () => {
        switch (activeTab) {
            case 'procurement_dashboard': return 'ภาพรวมจัดซื้อ';
            case 'procurement_pr': return 'ใบขอซื้อ (PR)';
            case 'procurement_po': return 'ใบสั่งซื้อ (PO)';
            case 'procurement_supplier': return 'ทะเบียนผู้ขาย (Suppliers)';
            default: return 'จัดซื้อ (Procurement)';
        }
    };

    const getPageDesc = () => {
        switch (activeTab) {
            case 'procurement_dashboard': return 'ภาพรวมยอดสั่งซื้อ และจำนวน PR/PO';
            case 'procurement_pr': return 'จัดการคำขอซื้อสินค้าหรือวัตถุดิบ (Purchase Requisition)';
            case 'procurement_po': return 'จัดการใบสั่งซื้อสินค้าและบริการ (Purchase Order)';
            case 'procurement_supplier': return 'จัดการข้อมูลรายชื่อผู้ขาย ซัพพลายเออร์ และเงื่อนไขการค้า';
            default: return 'จัดการคำขอซื้อ สั่งซื้อ และทะเบียนผู้ขาย';
        }
    };

    return (
        <div className="page-container procurement-page page-enter">
            {!showPOForm && (
                <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                    <h1>{getPageTitle()}</h1>
                    <p>{getPageDesc()}</p>
                </div>
            )}

            {/* ── Tab: Procurement Dashboard ── */}
            {(activeTab === 'procurement_dashboard' && hasSubPermission('procurement_dashboard')) && (
                <div className="subpage-content" key="procurement_dashboard">
                    <div className="summary-row">
                        {hasSectionPermission('procurement_dashboard_total') && (
                            <div className="summary-card card">
                                <div className="summary-icon">฿</div>
                                <div>
                                    <span className="summary-label">ยอดสั่งซื้อ (บาท)</span>
                                    <span className="summary-value">฿{totalOrderedAmount.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('procurement_dashboard_orders') && (
                            <div className="summary-card card">
                                <div className="summary-icon">📄</div>
                                <div>
                                    <span className="summary-label">จำนวน PR / PO</span>
                                    <span className="summary-value">{totalPRs} / {totalPOs}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('procurement_dashboard_receiving') && (
                            <div className="summary-card card">
                                <div className="summary-icon">📦</div>
                                <div>
                                    <span className="summary-label">รับสินค้าแล้ว (PO)</span>
                                    <span className="summary-value">{completedReceives} รายการ</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab: PR (Purchase Requisition) ── */}
            {(activeTab === 'procurement_pr' && hasSubPermission('procurement_pr')) && (
                <div className="subpage-content" key="procurement_pr">
                    {/* ── ส่วนการ์ดใบงานคำขอซื้อที่รอจัดซื้อ (Pending Purchase Requisition Job Cards) ── */}
                    <div style={{ marginBottom: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Package size={20} color="#f59e0b" /> รายการคำขอซื้อที่รอจัดซื้อ ({pendingPRCards.length})
                            </h3>
                            <span style={{ fontSize: 13, color: '#64748b' }}>
                                รายการที่ส่งมาจากคลังสินค้า หรือแผนกต่าง ๆ เพื่อรอการจัดซื้อ
                            </span>
                        </div>

                        {loadingPR ? (
                            <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>กำลังโหลดข้อมูลใบขอซื้อ...</div>
                        ) : pendingPRCards.length === 0 ? (
                            <div style={{ 
                                padding: '36px 20px', 
                                textAlign: 'center', 
                                background: '#f8fafc', 
                                borderRadius: 12, 
                                border: '1px dashed #cbd5e1', 
                                color: '#64748b' 
                            }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                                    ไม่มีรายการคำขอซื้อใหม่ที่รอจัดซื้อ
                                </div>
                                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                    เมื่อฝ่ายคลังสินค้ากดปุ่ม "ส่งใบขอซื้อ (PR)" หรือมีแผนกส่งคำขอเข้ามา การ์ดใบงานจะปรากฏที่นี่
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                                {pendingPRCards.map(pr => (
                                    <div 
                                        key={pr.id || pr.prNumber} 
                                        style={{ 
                                            background: '#fff', 
                                            borderRadius: 12, 
                                            border: '1px solid #e2e8f0', 
                                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', 
                                            overflow: 'hidden', 
                                            display: 'flex', 
                                            flexDirection: 'column' 
                                        }}
                                    >
                                        {/* Card Header */}
                                        <div style={{ 
                                            padding: '12px 16px', 
                                            borderBottom: '1px solid #f1f5f9', 
                                            background: '#f8fafc', 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center' 
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{pr.prNumber}</div>
                                                <div style={{ fontSize: 12, color: '#64748b' }}>วันที่: {pr.date || (pr.requestDate ? new Date(pr.requestDate).toLocaleDateString('th-TH') : '-')}</div>
                                            </div>
                                            <span style={{ 
                                                fontSize: 12, 
                                                padding: '4px 10px', 
                                                borderRadius: 12, 
                                                background: '#fef3c7', 
                                                color: '#b45309', 
                                                fontWeight: 600,
                                                border: '1px solid #fde68a'
                                            }}>
                                                {pr.status || 'รอจัดซื้อ'}
                                            </span>
                                        </div>

                                        {/* Card Body */}
                                        <div style={{ padding: 16, flex: 1 }}>
                                            {pr.formulaName && (
                                                <div style={{ fontSize: 14, color: '#475569', marginBottom: 4 }}>
                                                    สูตร: <strong style={{ color: '#0f172a' }}>{pr.formulaName}</strong>
                                                </div>
                                            )}
                                            {pr.taskId && (
                                                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                                                    อ้างอิงงานผลิต: <strong style={{ color: '#4338ca' }}>{pr.taskId}</strong>
                                                </div>
                                            )}
                                            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
                                                ผู้ขอ: <span style={{ color: '#334155', fontWeight: 500 }}>{pr.requestor || '-'}</span> 
                                                <span style={{ color: '#cbd5e1', margin: '0 6px' }}>|</span> 
                                                แผนก: <span style={{ color: '#334155', fontWeight: 500 }}>{pr.department || '-'}</span>
                                            </div>

                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                                                <span>รายการที่ขอซื้อ:</span>
                                                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>{(pr.items || []).length} รายการ</span>
                                            </div>

                                            <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9', padding: 8, maxHeight: 150, overflowY: 'auto' }}>
                                                {(pr.items && pr.items.length > 0) ? (
                                                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                                                        <tbody>
                                                            {pr.items.map((it, idx) => (
                                                                <tr key={idx} style={{ borderBottom: idx < pr.items.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                                                    <td style={{ padding: '6px 4px', color: '#334155', fontWeight: 500 }}>
                                                                        {it.itemName || it.item || it.name}
                                                                        {it.currentStock !== undefined && (
                                                                            <span style={{ marginLeft: 6, fontSize: 11, color: '#dc2626', background: '#fef2f2', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                                                                                คงเหลือ: {it.currentStock}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600, color: '#0369a1', whiteSpace: 'nowrap' }}>
                                                                        {(Number(it.requestQty) || Number(it.qty) || Number(it.deductQty) || 0).toLocaleString()} {it.unit || 'กก.'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>ไม่มีรายการสินค้า</div>
                                                )}
                                            </div>

                                            {pr.notes && (
                                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 10, background: '#fffbeb', padding: '6px 10px', borderRadius: 6, border: '1px solid #fef3c7' }}>
                                                    <span style={{ fontWeight: 600, color: '#92400e' }}>หมายเหตุ: </span>{pr.notes}
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Footer Actions */}
                                        <div style={{ padding: 12, borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', gap: 8, flexDirection: 'column' }}>
                                            <button
                                                type="button"
                                                onClick={() => setViewingPR(pr)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    background: '#ffffff',
                                                    color: '#334155',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: 8,
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 6
                                                }}
                                            >
                                                <Eye size={15} /> ดูรายละเอียดใบขอซื้อ
                                            </button>

                                            {canCreate('procurement_po') && pr.status !== 'ยกเลิก' && pr.status !== 'สั่งซื้อแล้ว' && !pr.poNumber && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCreatePOFromPR(pr)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        background: '#059669',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: 8,
                                                        fontSize: 12.5,
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 6,
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                    }}
                                                >
                                                    <ShoppingBag size={14} /> เปิดใบสั่งซื้อ (PO) จากใบนี้
                                                </button>
                                            )}

                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {canUpdate('procurement_pr') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdatePRStatus(pr.id || pr.prNumber, 'อนุมัติแล้ว')}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px 10px',
                                                            background: '#ecfdf5',
                                                            color: '#065f46',
                                                            border: '1px solid #a7f3d0',
                                                            borderRadius: 8,
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 4
                                                        }}
                                                    >
                                                        <CheckCircle size={14} /> อนุมัติแล้ว
                                                    </button>
                                                )}

                                                {canUpdate('procurement_pr') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdatePRStatus(pr.id || pr.prNumber, 'สั่งซื้อแล้ว')}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px 10px',
                                                            background: '#eff6ff',
                                                            color: '#1d4ed8',
                                                            border: '1px solid #bfdbfe',
                                                            borderRadius: 8,
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 4
                                                        }}
                                                    >
                                                        <ShoppingBag size={14} /> สั่งซื้อแล้ว
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── ส่วนตารางด้านล่าง: ประวัติและรายการใบขอซื้อทั้งหมด ── */}
                    <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: 24, marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FileText size={18} color="#3b82f6" /> ประวัติและรายการใบขอซื้อทั้งหมด
                            </h3>
                        </div>

                    {hasSectionPermission('procurement_pr_search') && (
                        <div className="toolbar">
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div className="search-group">
                                    <div className="search-input-wrap">
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder="พิมพ์เลขที่ PR, รายการ, งานผลิต หรือผู้ขอ..."
                                            value={prSearch}
                                            onChange={(e) => setPrSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') fetchPurchaseRequisitions();
                                            }}
                                        />
                                    </div>
                                    <button className="search-btn" onClick={fetchPurchaseRequisitions}>ค้นหา</button>
                                </div>

                                {prStatusFilter !== 'ทั้งหมด' && (
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: '#eff6ff',
                                        color: '#1d4ed8',
                                        border: '1px solid #bfdbfe',
                                        padding: '4px 10px',
                                        borderRadius: 20,
                                        fontSize: 12,
                                        fontWeight: 500
                                    }}>
                                        <span>สถานะ: <strong>{prStatusFilter}</strong></span>
                                        <button
                                            type="button"
                                            onClick={() => setPrStatusFilter('ทั้งหมด')}
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: 0,
                                                color: '#1d4ed8'
                                            }}
                                            title="ล้างตัวกรองสถานะ"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            {canCreate('procurement_pr') && (
                                <button 
                                    className="btn-primary" 
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                    onClick={() => setShowCreatePRModal(true)}
                                >
                                    <Plus size={16} /> สร้างใบขอซื้อ (PR)
                                </button>
                            )}
                        </div>
                    )}

                    {hasSectionPermission('procurement_pr_table') && (
                        <div className="table-card card">
                            <table className="data-table" style={{ minWidth: '880px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px', textAlign: 'center' }}>ลำดับ</th>
                                        <th>เลขที่ PR</th>
                                        <th>วันที่ขอ</th>
                                        <th>ผู้ขอ / แผนก</th>
                                        <th>งานผลิต / อ้างอิง</th>
                                        <th style={{ textAlign: 'right' }}>จำนวนรวม</th>
                                        <th style={{ textAlign: 'right' }}>ยอดประเมิน (บาท)</th>
                                        <th>สถานะ</th>
                                        <th style={{ textAlign: 'center', width: '100px' }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingPR ? (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                                กำลังโหลดข้อมูลใบขอซื้อ...
                                            </td>
                                        </tr>
                                    ) : filteredPR.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                                ไม่มีข้อมูลใบขอซื้อ {prSearch ? '(ที่ตรงกับเงื่อนไขการค้นหา)' : ''}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedPRs.map((pr, idx) => {
                                            const prNum = pr.prNumber || pr.number;
                                            const prId = pr.id || prNum;
                                            const totalQty = (pr.items || []).reduce((s, i) => s + (Number(i.requestQty) || 0), 0);
                                            const docDate = pr.date || (pr.createdAt ? new Date(pr.createdAt).toLocaleDateString('th-TH') : '-');
                                            const estimatedTotal = Number(pr.estimatedPrice || pr.estimatedTotal || 0);

                                            return (
                                                <tr key={prId || idx}>
                                                    <td style={{ textAlign: 'center' }}>{(prPage - 1) * prPageSize + idx + 1}</td>
                                                    <td 
                                                        className="text-bold" 
                                                        style={{ color: '#2563eb', cursor: 'pointer' }}
                                                        onClick={() => setViewingPR(pr)}
                                                        title="คลิกเพื่อดูเอกสารใบขอซื้อ"
                                                    >
                                                        {prNum}
                                                    </td>
                                                    <td>{docDate}</td>
                                                    <td>
                                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{pr.requestor || '-'}</span>
                                                        {pr.department && <small className="text-muted" style={{ display: 'block', fontSize: '11px' }}>{pr.department}</small>}
                                                    </td>
                                                    <td>
                                                        {pr.taskId ? (
                                                            <div>
                                                                <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: '4px', background: '#e0e7ff', color: '#3730a3', fontSize: '11px', fontWeight: 600 }}>
                                                                    {pr.taskId}
                                                                </span>
                                                                {pr.formulaName && <small className="text-muted" style={{ display: 'block', fontSize: '11px', marginTop: '1px' }}>{pr.formulaName}</small>}
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: '13px', color: '#64748b' }}>{pr.notes || 'ขอซื้อทั่วไป'}</span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                                        {totalQty > 0 ? totalQty.toLocaleString() : (pr.qty || '-')}
                                                        <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>
                                                            {pr.items && pr.items[0]?.unit ? (pr.items[0].unit || pr.items[0].displayUnit) : ''}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                                                        {estimatedTotal > 0 ? `฿${estimatedTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                    </td>
                                                    <td>
                                                        {canUpdate('procurement_pr') ? (
                                                            <div onClick={(e) => e.stopPropagation()} style={{ minWidth: '125px', display: 'inline-block' }}>
                                                                <CustomSelect
                                                                    value={pr.status || 'รอจัดซื้อ'}
                                                                    onChange={(e) => handleUpdatePRStatus(prId, e.target.value)}
                                                                    usePortal={true}
                                                                    style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '20px',
                                                                        fontSize: '12px',
                                                                        fontWeight: 600,
                                                                        minHeight: '28px',
                                                                        ...(getPRStatusStyle(pr.status))
                                                                    }}
                                                                >
                                                                    {PR_STATUS_OPTIONS.map(opt => (
                                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                    ))}
                                                                </CustomSelect>
                                                            </div>
                                                        ) : (
                                                            <span className={`badge ${getPRStatusClass(pr.status)}`} style={getPRStatusStyle(pr.status)}>
                                                                {pr.status || 'รอจัดซื้อ'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                            {canCreate('procurement_po') && pr.status !== 'ยกเลิก' && pr.status !== 'สั่งซื้อแล้ว' && !pr.poNumber && (
                                                                <button
                                                                    className="doc-action-btn"
                                                                    title="เปิดใบสั่งซื้อ (PO) จากใบขอซื้อนี้"
                                                                    style={{ color: '#059669' }}
                                                                    onClick={() => handleCreatePOFromPR(pr)}
                                                                >
                                                                    <ShoppingBag size={16} />
                                                                </button>
                                                            )}
                                                            <button
                                                                className="doc-action-btn"
                                                                title="ดูรายละเอียดใบขอซื้อ"
                                                                style={{ color: '#2563eb' }}
                                                                onClick={() => setViewingPR(pr)}
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            {canDelete('procurement_pr') && pr.status !== 'ยกเลิก' && (
                                                                <button
                                                                    className="doc-action-btn doc-action-btn-danger"
                                                                    title="ยกเลิก/ลบ"
                                                                    style={{ color: '#dc2626' }}
                                                                    onClick={() => handleDeletePR(prId, prNum)}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                            <PaginationControl
                                currentPage={prPage}
                                totalPages={Math.ceil(filteredPR.length / prPageSize) || 1}
                                totalItems={filteredPR.length}
                                pageSize={prPageSize}
                                onPageChange={setPrPage}
                                onPageSizeChange={setPrPageSize}
                            />
                        </div>
                    )}
                    </div>
                </div>
            )}

            {/* ── Tab: PO (Purchase Order) ── */}
            {(activeTab === 'procurement_po' && hasSubPermission('procurement_po')) && (
                showPOForm ? (
                    <PurchaseOrderForm
                        editId={editingPOId}
                        initialPR={creatingPOFromPR}
                        viewOnly={viewOnlyPO}
                        onBack={() => {
                            setShowPOForm(false);
                            setEditingPOId(null);
                            setViewOnlyPO(false);
                            setCreatingPOFromPR(null);
                            fetchPurchaseOrders();
                        }}
                        onSave={() => {
                            setShowPOForm(false);
                            setEditingPOId(null);
                            setViewOnlyPO(false);
                            setCreatingPOFromPR(null);
                            fetchPurchaseOrders();
                            fetchPurchaseRequisitions();
                        }}
                    />
                ) : (
                    <div className="subpage-content" key="procurement_po">
                        {hasSectionPermission('procurement_po_search') && (
                            <div className="toolbar">
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div className="search-group">
                                        <div className="search-input-wrap">
                                            <Search size={16} />
                                            <input
                                                type="text"
                                                placeholder="พิมพ์เลขที่ PO, ซัพพลายเออร์ หรือหมายเลขอ้างอิง..."
                                                value={poSearch}
                                                onChange={(e) => setPoSearch(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') fetchPurchaseOrders();
                                                }}
                                            />
                                        </div>
                                        <button className="search-btn" onClick={fetchPurchaseOrders}>ค้นหา</button>
                                    </div>

                                    {/* ปุ่ม Icon Filter Toggle แบบฝ่ายขาย/บัญชี */}
                                    <FilterToggleButton
                                        isOpen={showPOFilter}
                                        onClick={() => setShowPOFilter(prev => !prev)}
                                        activeCount={activePOFilterCount}
                                    />
                                </div>
                                {canCreate('procurement_po') && (
                                    <button 
                                        className="btn-primary" 
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                        onClick={() => {
                                            setEditingPOId(null);
                                            setViewOnlyPO(false);
                                            setCreatingPOFromPR(null);
                                            setShowPOForm(true);
                                        }}
                                    >
                                        <Plus size={16} /> สร้างใบสั่งซื้อ (PO)
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ── Procurement PO Advanced Filter Panel (ตรงตามข้อมูลจัดซื้อ) ── */}
                        {hasSectionPermission('procurement_po_search') && (
                            <ProcurementPOFilterDrawer
                                isOpen={showPOFilter}
                                onClose={() => setShowPOFilter(false)}
                                filter={poFilter}
                                onFilterChange={handlePOFilterChange}
                                onReset={handleResetPOFilter}
                                onQuickDate={handlePOQuickDate}
                                suppliersList={suppliersList}
                                usersList={usersList}
                            />
                        )}

                        {hasSectionPermission('procurement_po_table') && (
                            <div className="table-card card">
                                <table className="data-table" style={{ minWidth: '1000px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '50px', textAlign: 'center' }}>ลำดับ</th>
                                            <th style={{ width: '65px', textAlign: 'center' }}>เวอร์ชั่น</th>
                                            <th>เลขที่ PO</th>
                                            <th>วันที่สั่ง</th>
                                            <th>ซัพพลายเออร์</th>
                                            <th>รายการสินค้า</th>
                                            <th>อ้างอิง PR</th>
                                            <th style={{ textAlign: 'right' }}>ยอดสุทธิ (บาท)</th>
                                            <th>สถานะ</th>
                                            <th>ผู้สร้าง</th>
                                            <th style={{ textAlign: 'center', width: '130px' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingPO ? (
                                            <tr>
                                                <td colSpan="11" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                                    กำลังโหลดข้อมูลใบสั่งซื้อ...
                                                </td>
                                            </tr>
                                        ) : filteredPOs.length === 0 ? (
                                            <tr>
                                                <td colSpan="11" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                                    ไม่มีข้อมูลใบสั่งซื้อ {poSearch || activePOFilterCount > 0 ? '(ที่ตรงกับเงื่อนไขการค้นหา/ตัวกรอง)' : ''}
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedPOs.map((po, idx) => {
                                                const currentPoId = po.PurchaseOrderID || po.POID;
                                                const currentOrderDate = po.PODate || po.OrderDate;
                                                const currentTotal = Number(po.TotalPayable || po.NetPayable || po.GrandTotal || 0);
                                                const itemSummary = po.PrimaryItemName 
                                                    ? `${po.PrimaryItemName}${po.ItemCount > 1 ? ` (+${po.ItemCount - 1} รายการ)` : ''}`
                                                    : (po.item || '-');
                                                return (
                                                    <tr key={currentPoId || idx}>
                                                        <td style={{ textAlign: 'center' }}>{(poPage - 1) * poPageSize + idx + 1}</td>
                                                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569' }}>v.{po.Revision || 0}</td>
                                                        <td className="text-bold">{po.PONumber}</td>
                                                        <td>{currentOrderDate ? new Date(currentOrderDate).toLocaleDateString('th-TH') : '-'}</td>
                                                        <td>
                                                            <span>{po.SupplierName || '-'}</span>
                                                            {po.SupplierTaxID && <small className="text-muted" style={{ marginLeft: '6px' }}>(Tax ID: {po.SupplierTaxID})</small>}
                                                        </td>
                                                        <td>{itemSummary}</td>
                                                        <td>{po.PRNumber || po.ReferencePR || '-'}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                                                            ฿{currentTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td>
                                                            {canUpdate('procurement_po') ? (
                                                                <div onClick={(e) => e.stopPropagation()} style={{ minWidth: '130px', display: 'inline-block' }}>
                                                                    <CustomSelect
                                                                        value={po.Status || 'รออนุมัติ'}
                                                                        onChange={(e) => handleUpdatePOStatus(currentPoId, e.target.value)}
                                                                        usePortal={true}
                                                                        style={{
                                                                            padding: '2px 8px',
                                                                            borderRadius: '20px',
                                                                            fontSize: '12px',
                                                                            fontWeight: 600,
                                                                            minHeight: '28px',
                                                                            ...(getPOStatusStyle(po.Status))
                                                                        }}
                                                                    >
                                                                        {PO_STATUS_OPTIONS.map(opt => (
                                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                        ))}
                                                                    </CustomSelect>
                                                                </div>
                                                            ) : (
                                                                <span className={`badge ${getPOStatusClass(po.Status)}`}>
                                                                    {po.Status || 'รออนุมัติ'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>{po.CreatedByName || '-'}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                                <button
                                                                    className="doc-action-btn"
                                                                    title="ดูรายละเอียด / พรีวิวเอกสาร"
                                                                    style={{ color: '#2563eb' }}
                                                                    onClick={() => setPreviewPOId(currentPoId)}
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                {po.Revision > 0 && (
                                                                    <button
                                                                        className="doc-action-btn"
                                                                        title="ประวัติการแก้ไข"
                                                                        style={{ color: '#7c3aed' }}
                                                                        onClick={() => handleViewPOHistory(currentPoId, po.PONumber)}
                                                                    >
                                                                        <Clock size={16} />
                                                                    </button>
                                                                )}
                                                                {canUpdate('procurement_po') && (
                                                                    <button
                                                                        className="doc-action-btn"
                                                                        title="แก้ไข"
                                                                        style={{ color: '#059669' }}
                                                                        onClick={() => {
                                                                            setEditingPOId(currentPoId);
                                                                            setViewOnlyPO(false);
                                                                            setShowPOForm(true);
                                                                        }}
                                                                    >
                                                                        <Edit size={16} />
                                                                    </button>
                                                                )}
                                                                {canDelete('procurement_po') && (
                                                                    <button
                                                                        className="doc-action-btn doc-action-btn-danger"
                                                                        title="ลบ"
                                                                        style={{ color: '#dc2626' }}
                                                                        onClick={() => handleDeletePO(currentPoId, po.PONumber)}
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }))}
                                        </tbody>
                                    </table>
                                    <PaginationControl
                                        currentPage={poPage}
                                        totalPages={Math.ceil(filteredPOs.length / poPageSize) || 1}
                                        totalItems={filteredPOs.length}
                                        pageSize={poPageSize}
                                        onPageChange={setPoPage}
                                        onPageSizeChange={setPoPageSize}
                                    />
                            </div>
                        )}
                    </div>
                )
            )}


            {/* ── Tab: ทะเบียนผู้ขาย (Suppliers) ── */}
            {(activeTab === 'procurement_supplier' && hasSubPermission('procurement_supplier')) && (
                <div className="subpage-content" key="procurement_supplier">
                    {hasSectionPermission('procurement_supplier_search') && (
                        <div className="toolbar">
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="ค้นหาชื่อผู้ขาย, เลขผู้เสียภาษี, เบอร์โทร..."
                                        value={supplierSearch}
                                        onChange={(e) => setSupplierSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') fetchSuppliers();
                                        }}
                                    />
                                </div>
                                <button className="search-btn" onClick={fetchSuppliers}>ค้นหา</button>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div style={{ minWidth: '160px' }}>
                                    <CustomSelect
                                        value={supplierStatusFilter}
                                        onChange={(e) => setSupplierStatusFilter(e.target.value)}
                                        usePortal={true}
                                        style={{
                                            width: '100%',
                                            height: '38px',
                                            minHeight: '38px',
                                            padding: '0 12px',
                                            borderRadius: '8px',
                                            border: '1.5px solid #e2e8f0',
                                            fontSize: '13px',
                                            background: '#fff',
                                            color: '#334155',
                                            fontWeight: 500,
                                            boxSizing: 'border-box',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="ทั้งหมด">สถานะ: ทั้งหมด</option>
                                        <option value="Active">ใช้งาน (Active)</option>
                                        <option value="Inactive">ไม่ใช้งาน (Inactive)</option>
                                    </CustomSelect>
                                </div>
                                {canCreate('procurement_supplier') && (
                                    <button 
                                        className="btn-primary" 
                                        style={{ 
                                            height: '38px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '8px', 
                                            padding: '0 16px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap'
                                        }}
                                        onClick={handleOpenCreateSupplier}
                                    >
                                        <Plus size={16} /> เพิ่มผู้ขายรายใหม่
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {hasSectionPermission('procurement_supplier_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>ลำดับ</th>
                                        <th>ชื่อผู้ขาย / ซัพพลายเออร์</th>
                                        <th>เลขผู้เสียภาษี</th>
                                        <th>เบอร์โทรศัพท์</th>
                                        <th>อีเมล</th>
                                        <th>ผู้ติดต่อ</th>
                                        <th>เครดิตเทอม</th>
                                        <th>สถานะ</th>
                                        <th style={{ textAlign: 'center', width: '100px' }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingSuppliers ? (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                                กำลังโหลดข้อมูลผู้ขาย...
                                            </td>
                                        </tr>
                                    ) : suppliersList.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                                ไม่พบข้อมูลผู้ขาย {supplierSearch ? `(ที่ตรงกับคำค้นหา "${supplierSearch}")` : ''}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedSuppliers.map((sup, idx) => (
                                            <tr key={sup.SupplierID}>
                                                <td>{(supPage - 1) * supPageSize + idx + 1}</td>
                                                <td>
                                                    <div className="text-bold" style={{ color: '#0f172a' }}>{sup.SupplierName}</div>
                                                    {sup.SupplierCode && <small className="text-muted">รหัส: {sup.SupplierCode}</small>}
                                                </td>
                                                <td>{sup.TaxID || '-'}</td>
                                                <td>{sup.Phone || '-'}</td>
                                                <td>{sup.Email || '-'}</td>
                                                <td>{sup.ContactPerson || '-'}</td>
                                                <td>{sup.PaymentTerms || '-'}</td>
                                                <td>
                                                    <span className={`badge ${sup.ActiveStatus === 'Inactive' ? 'badge-danger' : 'badge-success'}`}>
                                                        {sup.ActiveStatus === 'Inactive' ? 'ไม่ใช้งาน' : 'ใช้งาน'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                        {canUpdate('procurement_supplier') && (
                                                             <button
                                                                className="doc-action-btn"
                                                                title="แก้ไข"
                                                                style={{ color: '#059669' }}
                                                                onClick={() => handleOpenEditSupplier(sup)}
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                        )}
                                                        {canDelete('procurement_supplier') && (
                                                            <button
                                                                className="doc-action-btn"
                                                                title="ลบ"
                                                                style={{ color: '#dc2626' }}
                                                                onClick={() => handleDeleteSupplier(sup)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            <PaginationControl
                                currentPage={supPage}
                                totalPages={Math.ceil(suppliersList.length / supPageSize) || 1}
                                totalItems={suppliersList.length}
                                pageSize={supPageSize}
                                onPageChange={setSupPage}
                                onPageSizeChange={setSupPageSize}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ── Modal: เพิ่ม / แก้ไข ข้อมูลผู้ขาย (Supplier) ── */}
            {showSupplierModal && (
                <div className="rnd-modal-overlay" onClick={() => setShowSupplierModal(false)}>
                    <div className="rnd-modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="rnd-modal-header">
                            <div>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Building2 size={20} color="#16a34a" />
                                    {editingSupplier ? 'แก้ไขข้อมูลผู้ขาย' : 'เพิ่มผู้ขายรายใหม่'}
                                </h2>
                                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                    {editingSupplier ? `รหัสอ้างอิง: #${editingSupplier.SupplierID}` : 'บันทึกข้อมูลเข้าฐานข้อมูลผู้ขายหลัก (Supplier DB)'}
                                </p>
                            </div>
                            <button className="rnd-modal-close" onClick={() => setShowSupplierModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSupplier}>
                            <div className="rnd-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                        ชื่อบริษัท / ผู้ขาย (Supplier Name) <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="เช่น บริษัท สยามสมุนไพร จำกัด"
                                        value={supplierForm.supplierName}
                                        onChange={(e) => setSupplierForm(p => ({ ...p, supplierName: e.target.value }))}
                                        required
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            รหัสผู้ขาย (Supplier Code)
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="เช่น SUP-001"
                                            value={supplierForm.supplierCode}
                                            onChange={(e) => setSupplierForm(p => ({ ...p, supplierCode: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            เลขประจำตัวผู้เสียภาษี (Tax ID)
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="เลข 13 หลัก"
                                            value={supplierForm.taxId}
                                            onChange={(e) => setSupplierForm(p => ({ ...p, taxId: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            เบอร์โทรศัพท์ (Phone)
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="02-xxx-xxxx หรือ 08x-xxx-xxxx"
                                            value={supplierForm.phone}
                                            onChange={(e) => setSupplierForm(p => ({ ...p, phone: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            อีเมล (Email)
                                        </label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            placeholder="supplier@example.com"
                                            value={supplierForm.email}
                                            onChange={(e) => setSupplierForm(p => ({ ...p, email: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                        ที่อยู่ (Address)
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows={2}
                                        placeholder="ที่อยู่สำนักงาน / โรงงานผู้ขาย..."
                                        value={supplierForm.address}
                                        onChange={(e) => setSupplierForm(p => ({ ...p, address: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            ผู้ติดต่อ (Contact)
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="ชื่อผู้ประสานงาน"
                                            value={supplierForm.contactPerson}
                                            onChange={(e) => setSupplierForm(p => ({ ...p, contactPerson: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            เงื่อนไขชำระเงิน
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="เช่น Net 30, เงินสด"
                                            value={supplierForm.paymentTerms}
                                            onChange={(e) => setSupplierForm(p => ({ ...p, paymentTerms: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            สถานะการใช้งาน
                                        </label>
                                        <CustomSelect
                                            value={supplierForm.activeStatus}
                                            onChange={(e) => setSupplierForm(p => ({ ...p, activeStatus: e.target.value }))}
                                            usePortal={true}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
                                        >
                                            <option value="Active">ใช้งาน (Active)</option>
                                            <option value="Inactive">ไม่ใช้งาน (Inactive)</option>
                                        </CustomSelect>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowSupplierModal(false)}
                                    disabled={savingSupplier}
                                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={savingSupplier}
                                    style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    {savingSupplier ? 'กำลังบันทึก...' : (editingSupplier ? 'บันทึกการแก้ไข' : 'บันทึกผู้ขาย')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Preview Purchase Order Popup Modal ── */}
            {previewPOId && (
                <div 
                    className="pdf-preview-overlay po-preview-modal-overlay" 
                    onClick={() => setPreviewPOId(null)} 
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()} 
                        style={{ background: '#fff', borderRadius: '12px', width: '95%', maxWidth: '960px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
                    >
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Eye size={18} /> พรีวิวใบสั่งซื้อ (Purchase Order)
                            </h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => window.print()}
                                    style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                                >
                                    <Printer size={14} /> พิมพ์
                                </button>
                                {canUpdate('procurement_po') && !String(previewPOId).startsWith('history-') && (
                                    <button
                                        onClick={() => {
                                            const targetId = previewPOId;
                                            setPreviewPOId(null);
                                            setEditingPOId(targetId);
                                            setViewOnlyPO(false);
                                            setShowPOForm(true);
                                        }}
                                        style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Edit size={14} /> แก้ไข
                                    </button>
                                )}
                                <button
                                    onClick={() => setPreviewPOId(null)}
                                    style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
                                >
                                    ✕ ปิด
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '0', background: '#f1f5f9' }}>
                            <PurchaseOrderForm
                                editId={previewPOId}
                                viewOnly={true}
                                hideControls={true}
                                isHistory={String(previewPOId).startsWith('history-')}
                                onBack={() => setPreviewPOId(null)}
                                onSave={() => setPreviewPOId(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── PO Revision History Modal ── */}
            {showPOHistoryModal && (
                <div 
                    className="pdf-preview-overlay" 
                    onClick={() => setShowPOHistoryModal(false)} 
                    style={{ zIndex: 3000, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <div 
                        className="pdf-preview-modal" 
                        onClick={(e) => e.stopPropagation()} 
                        style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                                <Clock size={18} /> ประวัติการแก้ไข PO: {historyTargetPONumber}
                            </h3>
                            <button onClick={() => setShowPOHistoryModal(false)} className="doc-action-btn" style={{ width: '30px', height: '30px', background: '#f1f5f9', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                                <X size={16} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {loadingPOHistory ? (
                                <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>กำลังโหลดประวัติ...</p>
                            ) : poHistoryList.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>ไม่มีประวัติการแก้ไขสำหรับเอกสารนี้</p>
                            ) : (
                                poHistoryList.map((h, i) => (
                                    <div key={h.HistoryID} style={{
                                        padding: '14px 16px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        background: i === 0 ? '#f0fdf4' : '#f8fafc',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                                                    {h.Revision === 0 ? 'ต้นฉบับ (v.0)' : `v.${h.Revision}`}
                                                </span>
                                                {i === 0 && h.Revision > 0 && (
                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>ถูกแทนที่ (v.{h.Revision + 1})</span>
                                                )}
                                                <span className={`badge ${getPOStatusClass(h.Status)}`} style={{ fontSize: '11px' }}>
                                                    {h.Status}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button
                                                    className="doc-action-btn"
                                                    title="ดูเอกสารเวอร์ชั่นนี้"
                                                    style={{ background: '#e0f2fe', color: '#0284c7', width: '28px', height: '28px' }}
                                                    onClick={() => {
                                                        setShowPOHistoryModal(false);
                                                        setPreviewPOId(`history-${h.HistoryID}`);
                                                    }}
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                            ยอดรวมสุทธิ ฿{(h.TotalPayable || h.GrandTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} — {h.ArchivedAt ? new Date(h.ArchivedAt).toLocaleString('th-TH') : '-'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── PR Detail View & Print Modal ── */}
            {viewingPR && (
                <PurchaseRequisitionDoc
                    pr={viewingPR}
                    onClose={() => setViewingPR(null)}
                    onStatusUpdate={handleUpdatePRStatus}
                    canUpdate={canUpdate('procurement_pr')}
                    onCreatePO={canCreate('procurement_po') ? (pr) => {
                        setViewingPR(null);
                        handleCreatePOFromPR(pr);
                    } : null}
                />
            )}

            {/* ── Create Manual PR Modal ── */}
            {showCreatePRModal && (
                <div 
                    className="pdf-preview-overlay" 
                    onClick={() => setShowCreatePRModal(false)}
                    style={{ zIndex: 3000, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <div 
                        className="pdf-preview-modal" 
                        onClick={(e) => e.stopPropagation()} 
                        style={{ maxWidth: '700px', width: '92%', maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                                <Plus size={20} color="#2563eb" /> สร้างใบขอซื้อใหม่ (Purchase Requisition)
                            </h3>
                            <button onClick={() => setShowCreatePRModal(false)} className="doc-action-btn" style={{ width: '32px', height: '32px', background: '#f1f5f9', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveManualPR}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                        แผนกที่ขอซื้อ
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={prForm.department}
                                        onChange={(e) => setPrForm(p => ({ ...p, department: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                        placeholder="เช่น ฝ่ายจัดซื้อ, ฝ่ายคลังสินค้า"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                        หมายเหตุ / วัตถุประสงค์
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={prForm.notes}
                                        onChange={(e) => setPrForm(p => ({ ...p, notes: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                        placeholder="เช่น สั่งซื้อเติมสต็อกประจำสัปดาห์"
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                        📦 รายการสินค้า/วัตถุดิบ
                                    </label>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ padding: '3px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        onClick={() => setPrForm(p => ({
                                            ...p,
                                            items: [...p.items, { itemName: '', itemCode: '', requestQty: 1, unit: 'กก.', estimatedPrice: 0 }]
                                        }))}
                                    >
                                        <Plus size={14} /> เพิ่มแถว
                                    </button>
                                </div>

                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                    <table className="data-table" style={{ margin: 0, width: '100%' }}>
                                        <thead style={{ background: '#f8fafc' }}>
                                            <tr>
                                                <th>ชื่อสินค้า/วัตถุดิบ *</th>
                                                <th style={{ width: '110px' }}>รหัส (ถ้ามี)</th>
                                                <th style={{ width: '90px' }}>จำนวน</th>
                                                <th style={{ width: '90px' }}>หน่วย</th>
                                                <th style={{ width: '110px' }}>ราคาประเมิน</th>
                                                <th style={{ width: '40px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prForm.items.map((it, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="เช่น กระวาน, พริกไทยดำ"
                                                            value={it.itemName}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setPrForm(p => {
                                                                    const updated = [...p.items];
                                                                    updated[idx].itemName = val;
                                                                    return { ...p, items: updated };
                                                                });
                                                            }}
                                                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            placeholder="รหัส"
                                                            value={it.itemCode}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setPrForm(p => {
                                                                    const updated = [...p.items];
                                                                    updated[idx].itemCode = val;
                                                                    return { ...p, items: updated };
                                                                });
                                                            }}
                                                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="0.1"
                                                            step="any"
                                                            value={it.requestQty}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setPrForm(p => {
                                                                    const updated = [...p.items];
                                                                    updated[idx].requestQty = val;
                                                                    return { ...p, items: updated };
                                                                });
                                                            }}
                                                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', textAlign: 'right' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            placeholder="เช่น กก."
                                                            value={it.unit}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setPrForm(p => {
                                                                    const updated = [...p.items];
                                                                    updated[idx].unit = val;
                                                                    return { ...p, items: updated };
                                                                });
                                                            }}
                                                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            placeholder="฿"
                                                            value={it.estimatedPrice}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setPrForm(p => {
                                                                    const updated = [...p.items];
                                                                    updated[idx].estimatedPrice = val;
                                                                    return { ...p, items: updated };
                                                                });
                                                            }}
                                                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', textAlign: 'right' }}
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {prForm.items.length > 1 && (
                                                            <button
                                                                type="button"
                                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                                onClick={() => setPrForm(p => ({
                                                                    ...p,
                                                                    items: p.items.filter((_, i) => i !== idx)
                                                                }))}
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowCreatePRModal(false)}
                                    disabled={savingPR}
                                    style={{ padding: '8px 16px', fontSize: '13px' }}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={savingPR}
                                    style={{ padding: '8px 20px', fontSize: '13px' }}
                                >
                                    {savingPR ? 'กำลังบันทึก...' : 'สร้างใบขอซื้อ (PR)'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

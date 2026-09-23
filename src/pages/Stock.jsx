/**
 * =============================================================================
 * Stock.jsx — หน้าคลังสินค้า (Inventory) — ดึงข้อมูลจริงจาก Database
 * =============================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, Edit3, Trash2, XCircle, Package, Truck, ArrowDownCircle, ArrowUpCircle, Factory, FileText, Clock, TrendingUp, AlertTriangle, CheckCircle, Search, Plus, History, Tag } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAlert } from '../components/CustomAlert';
import API_BASE from '../config';
import CustomSelect from '../components/CustomSelect';
import PaginationControl from '../components/PaginationControl';
import PurchaseRequisitionDoc from '../components/PurchaseRequisitionDoc';
import './PageCommon.css';

export default function Stock() {
    const { user, hasSubPermission, hasSectionPermission, getVisibleSubPages, canCreate, canUpdate, canDelete } = useAuth();
    const { showAlert, showConfirm } = useAlert();
    const visibleSubPages = getVisibleSubPages('stock');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'stock_data';

    // ── State ──
    const [searchStock, setSearchStock] = useState('');
    const [searchLogs, setSearchLogs] = useState('');
    const [appliedSearchStock, setAppliedSearchStock] = useState('');
    const [appliedSearchLogs, setAppliedSearchLogs] = useState('');
    const [activeCategory, setActiveCategory] = useState('สินค้าสำเร็จรูป');
    const [stockItems, setStockItems] = useState([]);
    const [stockLogs, setStockLogs] = useState([]);
    const [stockPagination, setStockPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalItems: 0 });
    const [logsPagination, setLogsPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalItems: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [logDetailLoading, setLogDetailLoading] = useState(false);
    const [logDetail, setLogDetail] = useState(null);
    const [fgItems, setFgItems] = useState([]);

    // Logs Modal State
    const [showAllLogsModal, setShowAllLogsModal] = useState(false);
    const [logsSearchDate, setLogsSearchDate] = useState('');

    // ── Edit & Delete State ──
    const [editItem, setEditItem] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', nameEN: '', category: '', unit: '', location: '', minStock: 0, status: '', adjustQty: 0, adjustReason: '' });
    const [editSaving, setEditSaving] = useState(false);
    const [showAdjust, setShowAdjust] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // ── Add Item State ──
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', nameEN: '', category: 'สินค้าสำเร็จรูป', initialQty: 0, unit: 'ชิ้น', location: '', minStock: 0, status: 'มีสินค้า', adjustReason: '', labelConfigs: [] });
    const [addSaving, setAddSaving] = useState(false);
    const [nextItemId, setNextItemId] = useState("");
    const [nameDuplicate, setNameDuplicate] = useState(null);
    const [checkingName, setCheckingName] = useState(false);

    const closeAddModal = () => {
        setShowAddModal(false);
        setNameDuplicate(null);
        setCheckingName(false);
        setAddForm({ name: '', nameEN: '', category: 'สินค้าสำเร็จรูป', initialQty: 0, unit: 'ชิ้น', location: '', minStock: 0, status: 'มีสินค้า', adjustReason: '', labelConfigs: [] });
    };
    
    useEffect(() => { 
        if (showAddModal && addForm.category) {
            fetch(API_BASE + "/stock/next-id?category=" + encodeURIComponent(addForm.category), {
                headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
            })
            .then(r => r.json())
            .then(d => { if (d.nextId) setNextItemId(d.nextId); })
            .catch(err => console.error(err));
        }
    }, [showAddModal, addForm.category]);

    // Real-time duplicate name check
    useEffect(() => {
        if (!showAddModal || !addForm.name.trim()) {
            setNameDuplicate(null);
            setCheckingName(false);
            return;
        }

        setCheckingName(true);
        const timer = setTimeout(() => {
            fetch(`${API_BASE}/stock/check-name?name=${encodeURIComponent(addForm.name.trim())}`, {
                headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
            })
            .then(r => r.json())
            .then(d => {
                if (d.exists && d.item) {
                    setNameDuplicate(d.item);
                } else {
                    setNameDuplicate(null);
                }
            })
            .catch(err => {
                console.error('Error checking duplicate name:', err);
                setNameDuplicate(null);
            })
            .finally(() => {
                setCheckingName(false);
            });
        }, 350);

        return () => clearTimeout(timer);
    }, [showAddModal, addForm.name]);

    useEffect(() => {
        if ((showAddModal && addForm.category === 'ฉลาก/สิ่งพิมพ์') || (editItem && editForm.category === 'ฉลาก/สิ่งพิมพ์')) {
            if (fgItems.length === 0) {
                fetch(`${API_BASE}/stock?category=สินค้าสำเร็จรูป&limit=1000`)
                    .then(r => r.json())
                    .then(d => setFgItems(d.data || d))
                    .catch(e => console.error('Failed to fetch FG items for label config', e));
            }
        }
    }, [showAddModal, addForm.category, editItem, editForm?.category, fgItems.length]);

    // ── Dashboard State ──
    const [dashboardData, setDashboardData] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);

    const [requisitions, setRequisitions] = useState([]);
    const [requisitionsHistory, setRequisitionsHistory] = useState([]);
    const [reqLoading, setReqLoading] = useState(false);
    const [issuingTaskId, setIssuingTaskId] = useState(null);

    // ── Requisition History Pagination & Search ──
    const [searchReqHistory, setSearchReqHistory] = useState('');
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(10);

    // ── Purchase Requisition (PR) from Insufficient Stock Modal ──
    const [prModalReq, setPrModalReq] = useState(null);
    const [prItems, setPrItems] = useState([]);
    const [prNotes, setPrNotes] = useState('');
    const [prSubmitting, setPrSubmitting] = useState(false);
    const [viewingPr, setViewingPr] = useState(null);
    const [viewingPrLoading, setViewingPrLoading] = useState(false);
    const [nextPrNumber, setNextPrNumber] = useState('');

    // ── Auto-search Debounce ──
    useEffect(() => {
        const t = setTimeout(() => { setAppliedSearchStock(searchStock); setStockPagination(p => ({...p, page: 1})); }, 400);
        return () => clearTimeout(t);
    }, [searchStock]);

    useEffect(() => {
        const t = setTimeout(() => { setAppliedSearchLogs(searchLogs); setLogsPagination(p => ({...p, page: 1})); }, 400);
        return () => clearTimeout(t);
    }, [searchLogs]);

    // ── Fetch Dashboard Data ──
    useEffect(() => {
        if (activeTab === 'stock_dashboard') {
            const fetchDashboard = async () => {
                try {
                    setDashboardLoading(true);
                    const res = await fetch(`${API_BASE}/stock/dashboard`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setDashboardData(data);
                    }
                } catch (err) {
                    console.error("Failed to fetch dashboard", err);
                } finally {
                    setDashboardLoading(false);
                }
            };
            fetchDashboard();
        }
    }, [activeTab]);

    // ── Fetch real data from API (with Pagination & Search) ──
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Stock Data
                if (activeTab === 'stock_data' || activeTab === 'stock_dashboard') {
                    const res = await fetch(`${API_BASE}/stock?page=${stockPagination.page}&limit=${stockPagination.limit}&search=${encodeURIComponent(appliedSearchStock)}&category=${encodeURIComponent(activeCategory)}`);
                    if (res.ok) {
                        const json = await res.json();
                        setStockItems(json.data || json); // Support both old and new formats
                        if (json.pagination) setStockPagination(prev => ({ ...prev, totalPages: json.pagination.totalPages, totalItems: json.pagination.totalItems }));
                    }
                }
                
                // Fetch Stock Logs
                if (activeTab === 'stock_logs' || activeTab === 'stock_dashboard') {
                    const res = await fetch(`${API_BASE}/stock/logs?page=${logsPagination.page}&limit=${logsPagination.limit}&search=${encodeURIComponent(appliedSearchLogs)}`);
                    if (res.ok) {
                        const json = await res.json();
                        setStockLogs(json.data || json);
                        if (json.pagination) setLogsPagination(prev => ({ ...prev, totalPages: json.pagination.totalPages, totalItems: json.pagination.totalItems }));
                    }
                }

                // Fetch Requisitions
                if (activeTab === 'stock_requisitions') {
                    setReqLoading(true);
                    try {
                        const [reqRes, histRes] = await Promise.all([
                            fetch(`${API_BASE}/stock/requisitions`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
                            fetch(`${API_BASE}/stock/requisitions/history`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
                        ]);
                        if (reqRes.ok) {
                            const json = await reqRes.json();
                            setRequisitions(json.data || []);
                        }
                        if (histRes.ok) {
                            const json = await histRes.json();
                            setRequisitionsHistory(json.data || []);
                        }
                    } catch (e) {
                        console.error(e);
                    } finally {
                        setReqLoading(false);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch stock data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [activeTab, stockPagination.page, logsPagination.page, appliedSearchStock, appliedSearchLogs, activeCategory, refreshTrigger]);

    // --- Fetch detail for selected item ---
    const handlePrintRequisition = async (reqId) => {
        try {
            const res = await fetch(`${API_BASE}/print/requisition/${reqId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!res.ok) throw new Error('Failed to generate PDF');
            
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error(err);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถแสดงใบเบิกได้', 'error');
        }
    };

    const handleIssueRequisition = async (taskId) => {
        const targetReq = requisitions.find(r => r.id === taskId);
        if (targetReq && targetReq.items && targetReq.items.some(it => it.isSufficient === false)) {
            showAlert('ไม่สามารถจ่ายของได้', 'รายการวัตถุดิบยังไม่ครบในสต็อก กรุณารอรับเข้าคลังสินค้าให้ครบก่อนจึงจะสามารถอนุมัติจ่ายได้', 'warning');
            return;
        }

        const ok = await showConfirm('ยืนยันการจ่ายวัตถุดิบ', 'ยืนยันการจ่ายวัตถุดิบเข้างานผลิต ' + taskId + ' ใช่หรือไม่?', 'info');
        if (!ok) return;
        setIssuingTaskId(taskId);
        try {
            const res = await fetch(`${API_BASE}/stock/requisitions/${taskId}/issue`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (res.ok) {
                showAlert('สำเร็จ', data.message, 'success');
                setRefreshTrigger(p => p + 1);
            } else {
                showAlert('เกิดข้อผิดพลาด', data.message, 'error');
            }
        } catch (err) {
            console.error(err);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        } finally {
            setIssuingTaskId(null);
        }
    };

    // ── Handlers สำหรับใบขอซื้อ (PR) วัตถุดิบขาดสต็อก ──
    const openCreatePRModal = (req) => {
        const missing = (req.items || []).filter(it => it.isSufficient === false);
        setPrModalReq(req);
        setPrItems(missing.map((it, idx) => {
            const required = Number(it.displayQty || it.deductQty || 0);
            const current = Number(it.currentStock || 0);
            const shortfall = Math.max(0, required - current);
            return {
                id: it.id,
                code: it.code || it.item_code || it.ItemId || `RM-${String(idx + 1).padStart(3, '0')}`,
                name: it.name,
                currentStock: current,
                requiredQty: required,
                requestQty: Math.ceil(shortfall > 0 ? shortfall : required),
                unit: it.displayUnit || it.unit || 'กรัม',
                estimatedPrice: Number(it.estimatedPrice || it.cost || it.price || 0)
            };
        }));
        setPrNotes(`ขอซื้อวัตถุดิบเร่งด่วนสำหรับงานผลิต ${req.id} (สูตร: ${req.formulaName})`);

        // ดึงเลขที่ PR ลำดับถัดไปจากฐานข้อมูลอัตโนมัติ
        fetch(`${API_BASE}/purchase-requisitions/next-number`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.nextNumber) {
                    setNextPrNumber(data.nextNumber);
                }
            })
            .catch(err => console.error('Error fetching next PR number:', err));
    };

    const handlePreviewDraftPR = () => {
        if (!prModalReq) return;
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const fallbackPrNo = `PR${yyyy}${mm}${dd}-001`;

        const prNo = nextPrNumber || fallbackPrNo;
        const draftPr = {
            prNumber: prNo,
            requestDate: new Date().toISOString(),
            department: 'ฝ่ายผลิต / คลังสินค้า',
            requestor: user?.name || user?.FullName || user?.username || 'เจ้าหน้าที่คลังสินค้า',
            taskId: prModalReq.id,
            batchNo: prModalReq.batchNo,
            formulaName: prModalReq.formulaName,
            items: prItems.map((it, idx) => ({
                id: it.id,
                code: it.code || it.item_code || it.ItemId || `RM-${String(idx + 1).padStart(3, '0')}`,
                name: it.name,
                currentStock: it.currentStock,
                requiredQty: it.requiredQty,
                requestQty: Number(it.requestQty) || 0,
                unit: it.unit || 'กรัม',
                estimatedPrice: Number(it.estimatedPrice || it.cost || it.price || 0)
            })),
            notes: prNotes,
            status: 'ฉบับร่าง'
        };
        setViewingPr(draftPr);
    };

    const handleSendPR = async () => {
        if (!prModalReq || prItems.length === 0) return;
        setPrSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/purchase-requisitions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    taskId: prModalReq.id,
                    batchNo: prModalReq.batchNo,
                    formulaName: prModalReq.formulaName,
                    items: prItems,
                    notes: prNotes
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showAlert('สำเร็จ', `สร้างและส่งใบขอซื้อ ${data.prNumber} ไปยังฝ่ายจัดซื้อเรียบร้อยแล้ว`, 'success');
                setPrModalReq(null);
                setRefreshTrigger(p => p + 1);
            } else {
                showAlert('ผิดพลาด', data.message || 'ไม่สามารถส่งใบขอซื้อได้', 'error');
            }
        } catch (err) {
            console.error('Error sending PR:', err);
            showAlert('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        } finally {
            setPrSubmitting(false);
        }
    };

    const fetchAndOpenPR = async (prNumber) => {
        if (!prNumber) return;
        setViewingPrLoading(true);
        try {
            const res = await fetch(`${API_BASE}/purchase-requisitions/${prNumber}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const json = await res.json();
            if (json.success && json.data) {
                setViewingPr(json.data);
            } else {
                showAlert('ข้อผิดพลาด', 'ไม่พบข้อมูลใบขอซื้อ', 'warning');
            }
        } catch (err) {
            console.error(err);
            showAlert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลใบขอซื้อได้', 'error');
        } finally {
            setViewingPrLoading(false);
        }
    };

    const openDetail = async (item) => {
        setSelectedItem(item);
        setDetailLoading(true);
        try {
            const res = await fetch(`${API_BASE}/stock/${item.id}/detail`);
            if (res.ok) {
                setDetail(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch detail:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    // ── Fetch detail for selected log ──
    const openLogDetail = async (log) => {
        if (!log.ref) return;
        setSelectedLog(log);
        setLogDetailLoading(true);
        try {
            const res = await fetch(`${API_BASE}/stock/logs/${log.ref}/detail`);
            if (res.ok) {
                setLogDetail(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch log detail:', err);
        } finally {
            setLogDetailLoading(false);
        }
    };

    // ── Open Edit Modal ──
    const openEdit = async (item) => {
        setEditItem(item);
        setShowAdjust(false);
        let labelConfigs = [];
        if (item.category === 'ฉลาก/สิ่งพิมพ์') {
            try {
                const res = await fetch(`${API_BASE}/stock/${item.id}/detail`);
                if (res.ok) {
                    const data = await res.json();
                    labelConfigs = data.item.labelConfigs || [];
                }
            } catch (err) {
                console.error('Failed to fetch label configs:', err);
            }
        }
        setEditForm({
            name: item.name || '',
            nameEN: item.nameEN || '',
            category: item.category || '',
            unit: item.unit || '',
            location: item.location || '',
            minStock: item.minStock || 0,
            status: item.status || 'มีสินค้า',
            adjustQty: 0,
            adjustReason: '',
            labelConfigs
        });
    };

    // ── Save New Item ──
    const saveNewItem = async () => {
        if (!addForm.name.trim()) {
            showAlert('แจ้งเตือน', 'กรุณาระบุชื่อสินค้า', 'warning');
            return;
        }
        if (nameDuplicate) {
            showAlert('พบสินค้าซ้ำในระบบ', `มีสินค้าชื่อ "${nameDuplicate.name}" อยู่ในระบบแล้ว (รหัส: ${nameDuplicate.id}, หมวด: ${nameDuplicate.category}) กรุณาตรวจสอบหรือปรับปรุงสต็อกแทนการสร้างใหม่`, 'warning');
            return;
        }
        if (addForm.category === 'ฉลาก/สิ่งพิมพ์' && addForm._tempFgItemId) {
            showAlert('แจ้งเตือน', 'คุณเลือกสินค้า FG ไว้แต่ยังไม่ได้กดปุ่ม + (สีฟ้า) เพื่อเพิ่มเข้ารายการ กรุณากด + ก่อนบันทึกครับ', 'warning');
            return;
        }
        setAddSaving(true);
        try {
            const res = await fetch(`${API_BASE}/stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(addForm)
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                showAlert('สำเร็จ', 'เพิ่มรายการสินค้าสำเร็จ', 'success');
                setShowAddModal(false);
                setAddForm({ name: '', nameEN: '', category: 'สินค้าสำเร็จรูป', initialQty: 0, unit: 'ชิ้น', location: '', minStock: 0, status: 'มีสินค้า', adjustReason: '' });
                setNameDuplicate(null);
                // Force fetch
                setRefreshTrigger(prev => prev + 1);
            } else {
                showAlert('ผิดพลาด', data.message || 'ไม่สามารถเพิ่มสินค้าได้', 'error');
            }
        } catch (err) {
            console.error('Failed to add item:', err);
            showAlert('ผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        } finally {
            setAddSaving(false);
        }
    };

    // ── Save Edit ──
    const saveEdit = async () => {
        if (!editItem) return;

        if (Number(editForm.adjustQty) !== 0 && !editForm.adjustReason.trim()) {
            showAlert('แจ้งเตือน', 'กรุณาระบุสาเหตุหรือที่มาของการปรับปรุงจำนวนสินค้า', 'warning');
            return;
        }

        if (editForm.category === 'ฉลาก/สิ่งพิมพ์' && editForm._tempFgItemId) {
            showAlert('แจ้งเตือน', 'คุณเลือกสินค้า FG ไว้แต่ยังไม่ได้กดปุ่ม + (สีฟ้า) เพื่อเพิ่มเข้ารายการ กรุณากด + ก่อนบันทึกครับ', 'warning');
            return;
        }

        setEditSaving(true);
        try {
            const res = await fetch(`${API_BASE}/stock/${editItem.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(editForm)
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                // Update local state
                setStockItems(prev => prev.map(s => s.id === editItem.id ? { 
                    ...s, 
                    ...editForm, 
                    qty: s.qty + Number(editForm.adjustQty) 
                } : s));
                setEditItem(null);
                showAlert('สำเร็จ', 'บันทึกข้อมูลสินค้าเรียบร้อยแล้ว', 'success');
            } else {
                showAlert('ผิดพลาด', data.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            }
        } catch (err) {
            console.error('Failed to save edit:', err);
            showAlert('ผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        } finally {
            setEditSaving(false);
        }
    };

    // ── Soft Delete ──
    const softDelete = async (item) => {
        setDeleteLoading(true);
        try {
            const res = await fetch(`${API_BASE}/stock/${item.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (res.ok) {
                setDeleteConfirm(null);
                setRefreshTrigger(prev => prev + 1);
                showAlert('สำเร็จ', 'ลบสินค้าเรียบร้อยแล้ว', 'success');
            } else {
                showAlert('ผิดพลาด', 'ไม่สามารถลบสินค้าได้', 'error');
            }
        } catch (err) {
            console.error('Failed to soft delete:', err);
            showAlert('ผิดพลาด', 'เกิดข้อผิดพลาดในการลบสินค้า', 'error');
        } finally {
            setDeleteLoading(false);
        }
    };

    // ── กรองข้อมูลแต่ละ Tab ──
    // Server-side filtering, so we just use the items directly
    const filteredStock = stockItems;
    const filteredLogs = stockLogs;

    // ── Filter & Paginate Requisition History ──
    const filteredRequisitionsHistory = useMemo(() => {
        if (!searchReqHistory.trim()) return requisitionsHistory;
        const q = searchReqHistory.toLowerCase().trim();
        return requisitionsHistory.filter(h => 
            (h.id && h.id.toLowerCase().includes(q)) ||
            (h.jobOrderId && h.jobOrderId.toLowerCase().includes(q)) ||
            (h.formulaName && h.formulaName.toLowerCase().includes(q)) ||
            (h.status && h.status.toLowerCase().includes(q)) ||
            (h.createdAt && new Date(h.createdAt).toLocaleDateString('th-TH').includes(q))
        );
    }, [requisitionsHistory, searchReqHistory]);

    const historyTotalPages = Math.ceil(filteredRequisitionsHistory.length / historyPageSize) || 1;
    const paginatedRequisitionsHistory = useMemo(() => {
        const start = (historyPage - 1) * historyPageSize;
        return filteredRequisitionsHistory.slice(start, start + historyPageSize);
    }, [filteredRequisitionsHistory, historyPage, historyPageSize]);

    // ── เลือก badge class ตามสถานะ ──
    const getStockStatusClass = (status) => {
        if (status === 'มีสินค้า') return 'badge-success';
        if (status === 'สินค้าเหลือน้อย') return 'badge-warning';
        return 'badge-danger';
    };

    const getLogTypeLabel = (log) => {
        if (!log) return '';
        if (log.type === 'IN') return '📥 รับเข้า';
        if (log.type === 'ADJ_IN') return '📈 ปรับเพิ่ม';
        if (log.type === 'ADJ_OUT') return '📉 ปรับลด';
        if (log.refType === 'shipping' && (log.itemId === 'OEM-DIRECT' || log.itemId?.startsWith('FG-'))) return '🚚 จัดส่งสินค้า';
        if (log.refType === 'oem_direct') return '🚚 OEM ส่งตรง';
        return '📤 เบิกจ่าย';
    };

    const getLogTypeClass = (type, refType, itemId) => {
        if (type === 'IN' || type === 'ADJ_IN') return 'badge-success';
        if (refType === 'shipping' && (itemId === 'OEM-DIRECT' || itemId?.startsWith('FG-'))) return 'badge-info';
        return 'badge-warning';
    };

    const fmtDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // ── Label Config Section for Modal ──
    const renderLabelConfigSection = (formState, setFormState) => {
        if (formState.category !== 'ฉลาก/สิ่งพิมพ์') return null;
        return (
            <div style={{ marginTop: 20, marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag size={16} /> ตั้งค่าผูกสติ๊กเกอร์กับสินค้า (Label Configuration)
                </h4>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10, alignItems: 'end', marginBottom: 15 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 4, display: 'block' }}>เลือกสินค้า (FG)</label>
                            <CustomSelect
                                usePortal={true}
                                value={formState._tempFgItemId || ''}
                                onChange={e => {
                                    const fg = fgItems.find(f => f.id === e.target.value);
                                    setFormState(prev => ({ ...prev, _tempFgItemId: fg?.id, _tempFgProductName: fg?.name }));
                                }}
                                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff' }}
                            >
                                <option value="">-- เลือกสินค้า --</option>
                                {fgItems.map(fg => (
                                    <option key={fg.id} value={fg.id}>[{fg.id}] {fg.name}</option>
                                ))}
                            </CustomSelect>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 4, display: 'block' }}>ติดที่</label>
                            <CustomSelect
                                usePortal={true}
                                value={formState._tempApplyTo || 'ขวด'}
                                onChange={e => setFormState(prev => ({ ...prev, _tempApplyTo: e.target.value }))}
                                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff' }}
                            >
                                <option value="ขวด">ขวด</option>
                                <option value="ฝา">ฝา</option>
                                <option value="กล่อง">กล่อง</option>
                            </CustomSelect>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 4, display: 'block' }}>จำนวน/ชิ้น</label>
                            <input 
                                type="number" min="1"
                                value={formState._tempQtyPerUnit || 1}
                                onChange={e => setFormState(prev => ({ ...prev, _tempQtyPerUnit: parseInt(e.target.value) || 1 }))}
                                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6 }}
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={() => {
                                if (!formState._tempFgItemId) {
                                    showAlert('แจ้งเตือน', 'กรุณาเลือกสินค้า FG', 'warning');
                                    return;
                                }
                                const newConfig = {
                                    fgItemId: formState._tempFgItemId,
                                    fgProductName: formState._tempFgProductName,
                                    applyTo: formState._tempApplyTo || 'ขวด',
                                    qtyPerUnit: formState._tempQtyPerUnit || 1
                                };
                                setFormState(prev => ({
                                    ...prev,
                                    labelConfigs: [...(prev.labelConfigs || []), newConfig],
                                    _tempFgItemId: '',
                                    _tempFgProductName: '',
                                    _tempApplyTo: 'ขวด',
                                    _tempQtyPerUnit: 1
                                }));
                            }}
                            style={{ padding: '8px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', height: 35 }}
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {(formState.labelConfigs || []).length > 0 ? (
                        <table className="data-table" style={{ fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                    <th style={{ padding: '8px 10px' }}>รหัส FG</th>
                                    <th style={{ padding: '8px 10px' }}>ชื่อสินค้า</th>
                                    <th style={{ padding: '8px 10px' }}>ติดที่</th>
                                    <th style={{ padding: '8px 10px' }}>ใช้/ชิ้น</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>ลบ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formState.labelConfigs.map((cfg, idx) => (
                                    <tr key={idx}>
                                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#475569' }}>{cfg.fgItemId}</td>
                                        <td style={{ padding: '8px 10px' }}>{cfg.fgProductName}</td>
                                        <td style={{ padding: '8px 10px' }}>{cfg.applyTo}</td>
                                        <td style={{ padding: '8px 10px' }}>{cfg.qtyPerUnit}</td>
                                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                            <button 
                                                onClick={() => setFormState(prev => ({
                                                    ...prev,
                                                    labelConfigs: prev.labelConfigs.filter((_, i) => i !== idx)
                                                }))}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '15px', color: '#94a3b8', fontSize: 13, background: '#fff', borderRadius: 6, border: '1px dashed #cbd5e1' }}>
                            ยังไม่มีการตั้งค่าผูกสติ๊กเกอร์กับสินค้าใดๆ
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ── Detail Modal ──
    const renderDetailModal = () => {
        if (!selectedItem) return null;

        return (
            <div className="rnd-modal-overlay" onClick={() => { setSelectedItem(null); setDetail(null); }}>
                <div className="rnd-modal" style={{ maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="rnd-modal-header">
                        <div>
                            <h2>📦 {selectedItem.name}</h2>
                            <div className="rnd-modal-meta">
                                <span style={{ color: '#059669', fontWeight: 700 }}>{selectedItem.id}</span>
                                <span className={`badge ${getStockStatusClass(selectedItem.status)}`}>{selectedItem.status}</span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => { setSelectedItem(null); setDetail(null); }}>
                            <XCircle size={22} />
                        </button>
                    </div>

                    <div className="rnd-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {detailLoading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>
                        ) : detail ? (
                            <>
                                {/* Info Grid */}
                                <div className="rnd-modal-info-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                                    <div className="rnd-modal-info-item" style={{ background: '#ecfdf5', borderRadius: 10, padding: 14 }}>
                                        <label style={{ fontWeight: 700, color: '#059669', fontSize: 12 }}>ยอดคงเหลือ</label>
                                        <span style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>{detail.item.qty?.toLocaleString()}</span>
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>{detail.item.unit}</span>
                                    </div>
                                    <div className="rnd-modal-info-item" style={{ background: '#f0ebff', borderRadius: 10, padding: 14 }}>
                                        <label style={{ fontWeight: 700, color: '#7c3aed', fontSize: 12 }}>หมวดหมู่</label>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#5b21b6' }}>{detail.item.category}</span>
                                    </div>
                                    <div className="rnd-modal-info-item" style={{ background: '#fef3c7', borderRadius: 10, padding: 14 }}>
                                        <label style={{ fontWeight: 700, color: '#92400e', fontSize: 12 }}>Batch ที่เข้าคลัง</label>
                                        <span style={{ fontSize: 28, fontWeight: 800, color: '#d97706' }}>{detail.logs.filter(l => l.type === 'IN').length}</span>
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>ครั้ง</span>
                                    </div>
                                </div>

                                {/* Production Tasks */}
                                {detail.productionTasks.length > 0 && (
                                    <div style={{ marginBottom: 20 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Factory size={16} style={{ color: '#7c3aed' }} /> ข้อมูลการผลิตที่เกี่ยวข้อง
                                        </h4>
                                        <div style={{ background: '#fafaf9', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                                            <table className="data-table" style={{ fontSize: 13 }}>
                                                <thead>
                                                    <tr>
                                                        <th>Batch No.</th>
                                                        <th>ใบสั่งผลิต</th>
                                                        <th>Line</th>
                                                        <th>เป้าหมาย</th>
                                                        <th>ผลิตได้</th>
                                                        <th>ของเสีย</th>
                                                        <th>ประเภท</th>
                                                        <th>สถานะ</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {detail.productionTasks.map((t, i) => {
                                                        const isOEM = (t.plannerNotes || '').includes('ผลิตตามออเดอร์');
                                                        return (
                                                            <tr key={i}>
                                                                <td style={{ fontWeight: 700, color: '#1e40af' }}>{t.batchNo}</td>
                                                                <td>
                                                                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                                                        {t.jobOrderId}
                                                                    </span>
                                                                </td>
                                                                <td>{t.line}</td>
                                                                <td>{t.expectedQty?.toLocaleString()}</td>
                                                                <td style={{ fontWeight: 700, color: '#059669' }}>{t.producedQty?.toLocaleString()}</td>
                                                                <td style={{ color: t.defectQty > 0 ? '#ef4444' : '#9ca3af' }}>{t.defectQty || 0}</td>
                                                                <td>
                                                                    {isOEM ? (
                                                                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                                                            🚚 OEM
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ background: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                                                            📦 ผลิตตามแผน
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    <span className={`badge ${t.status === 'เสร็จสิ้น' ? 'badge-success' : 'badge-warning'}`}>
                                                                        {t.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                
                                {/* WIP Lots (ถ้าเป็นสินค้ากึ่งสำเร็จรูป) */}
                                {detail.wipLots && detail.wipLots.length > 0 && (
                                    <div style={{ marginBottom: 20 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Package size={16} style={{ color: '#f97316' }} /> ล็อตการผลิตกึ่งสำเร็จรูป (WIP Lots)
                                        </h4>
                                        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflowX: 'auto' }}>
                                            <table className="modern-table">
                                                <thead>
                                                    <tr>
                                                        <th>หมายเลขล็อต (Lot No)</th>
                                                        <th>วันที่ผลิต</th>
                                                        <th>วันหมดอายุ</th>
                                                        <th style={{ textAlign: 'right' }}>จำนวนเหลือ (หน่วย)</th>
                                                        <th style={{ textAlign: 'center' }}>สถานะ</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {detail.wipLots.map((wip, i) => (
                                                        <tr key={i}>
                                                            <td style={{ fontWeight: 600, color: '#4338ca' }}>{wip.LotNo}</td>
                                                            <td>{fmtDate(wip.ProductionDate).split(' ')[0]}</td>
                                                            <td>{wip.ExpiryDate ? fmtDate(wip.ExpiryDate).split(' ')[0] : '-'}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 700, color: wip.RemainingQty > 0 ? '#059669' : '#dc2626' }}>
                                                                {wip.RemainingQty?.toLocaleString()} {wip.Unit}
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <span className="badge" style={{ background: wip.Status === 'พร้อมใช้' ? '#dcfce7' : '#f3f4f6', color: wip.Status === 'พร้อมใช้' ? '#166534' : '#4b5563' }}>
                                                                    {wip.Status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Stock Logs */}
                                <div>
                                    <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <FileText size={16} style={{ color: '#2563eb' }} /> ประวัติรับเข้า-เบิกจ่าย ({detail.logs.length} รายการ)
                                    </h4>
                                    {detail.logs.length === 0 ? (
                                        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', background: '#fafaf9', borderRadius: 10 }}>ยังไม่มีประวัติ</div>
                                    ) : (
                                        <div style={{ background: '#fafaf9', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                                            {detail.logs.slice(0, 5).map((log, i) => (
                                                <div key={i} style={{ padding: '12px 16px', borderBottom: i < 4 && i < detail.logs.length - 1 ? '1px solid #e5e7eb' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        {['IN', 'ADJ_IN'].includes(log.type) ? (
                                                            <ArrowDownCircle size={20} style={{ color: '#059669' }} />
                                                        ) : (
                                                            <ArrowUpCircle size={20} style={{ color: '#f59e0b' }} />
                                                        )}
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                                                                {log.type === 'IN' ? '📥 รับเข้า' : log.type === 'ADJ_IN' ? '📈 ปรับเพิ่ม' : log.type === 'ADJ_OUT' ? '📉 ปรับลด' : log.refType === 'oem_direct' ? '🚚 OEM ส่งตรง' : '📤 เบิกจ่าย'}
                                                                {log.ref && (
                                                                    <span style={{ marginLeft: 8, background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                                                        {log.ref}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{log.notes}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 800, fontSize: 16, color: ['IN', 'ADJ_IN'].includes(log.type) ? '#059669' : '#ef4444' }}>
                                                            {['IN', 'ADJ_IN'].includes(log.type) ? '+' : '-'}{log.qty?.toLocaleString()}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Clock size={10} /> {fmtDate(log.date)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {detail.logs.length > 5 && (
                                                <div style={{ padding: '12px 16px', background: '#f3f4f6', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
                                                    <button 
                                                        className="btn-secondary" 
                                                        style={{ fontSize: 12, padding: '6px 16px', borderRadius: 20 }}
                                                        onClick={() => setShowAllLogsModal(true)}
                                                    >
                                                        ดูเพิ่มเติมทั้งหมด ({detail.logs.length} รายการ)
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    };

    // ── All Logs Modal ──
    const renderAllLogsModal = () => {
        if (!showAllLogsModal || !detail) return null;
        
        const filteredLogs = detail.logs.filter(log => {
            if (!logsSearchDate) return true;
            // Check if log.date starts with the search date (YYYY-MM-DD)
            const logDateStr = log.date ? log.date.split('T')[0] : '';
            return logDateStr === logsSearchDate;
        });

        return (
            <div className="rnd-modal-overlay" onClick={() => { setShowAllLogsModal(false); setLogsSearchDate(''); }} style={{ zIndex: 1100 }}>
                <div className="rnd-modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>📋 ประวัติรับเข้า-เบิกจ่ายทั้งหมด</h2>
                            <div className="rnd-modal-meta">
                                <span style={{ color: '#059669', fontWeight: 700 }}>{detail.item.id}</span>
                                <span>{detail.item.name}</span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={() => { setShowAllLogsModal(false); setLogsSearchDate(''); }}>
                            <XCircle size={22} />
                        </button>
                    </div>

                    <div className="rnd-modal-body" style={{ padding: '16px 24px' }}>
                        {/* Search Bar */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                            <div className="search-box" style={{ flex: 1, maxWidth: 300 }}>
                                <Calendar size={18} style={{ color: '#94a3b8' }} />
                                <input 
                                    type="date" 
                                    value={logsSearchDate}
                                    onChange={(e) => setLogsSearchDate(e.target.value)}
                                    style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', color: '#334155' }}
                                />
                                {logsSearchDate && (
                                    <XCircle size={16} style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => setLogsSearchDate('')} />
                                )}
                            </div>
                            {logsSearchDate && (
                                <div style={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: 13 }}>
                                    พบ {filteredLogs.length} รายการ
                                </div>
                            )}
                        </div>

                        {/* Logs List */}
                        <div style={{ background: '#fafaf9', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden', maxHeight: '60vh', overflowY: 'auto' }}>
                            {filteredLogs.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>ไม่พบประวัติในวันที่เลือก</div>
                            ) : (
                                filteredLogs.map((log, i) => (
                                    <div key={i} style={{ padding: '12px 16px', borderBottom: i < filteredLogs.length - 1 ? '1px solid #e5e7eb' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            {['IN', 'ADJ_IN'].includes(log.type) ? (
                                                <ArrowDownCircle size={20} style={{ color: '#059669' }} />
                                            ) : (
                                                <ArrowUpCircle size={20} style={{ color: '#f59e0b' }} />
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>
                                                    {getLogTypeLabel(log)}
                                                    {log.ref && (
                                                        <span style={{ marginLeft: 8, background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                                            {log.ref}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{log.notes}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, fontSize: 16, color: ['IN', 'ADJ_IN'].includes(log.type) ? '#059669' : '#ef4444' }}>
                                                {['IN', 'ADJ_IN'].includes(log.type) ? '+' : '-'}{log.qty?.toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={10} /> {fmtDate(log.date)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ── Log Detail Modal ──
    const renderLogDetailModal = () => {
        if (!selectedLog) return null;
        const close = () => { setSelectedLog(null); setLogDetail(null); };

        return (
            <div className="rnd-modal-overlay" onClick={close}>
                <div className="rnd-modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
                    <div className="rnd-modal-header">
                        <div>
                            <h2>📋 รายละเอียดรายการ</h2>
                            <div className="rnd-modal-meta">
                                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: 6, fontWeight: 700 }}>
                                    Batch: {selectedLog.ref}
                                </span>
                                <span className={`badge ${getLogTypeClass(selectedLog.type, selectedLog.refType, selectedLog.itemId)}`}>
                                    {getLogTypeLabel(selectedLog)}
                                </span>
                            </div>
                        </div>
                        <button className="rnd-modal-close" onClick={close}><XCircle size={22} /></button>
                    </div>

                    <div className="rnd-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {logDetailLoading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>
                        ) : logDetail ? (
                            <>
                                {/* ข้อมูลสินค้า */}
                                <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16, marginBottom: 16 }}>
                                    <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>📦 สินค้า: {selectedLog.item}</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                                        <div><span style={{ color: '#6b7280' }}>จำนวน:</span> <strong style={{ color: selectedLog.type === 'IN' ? '#059669' : '#ef4444', fontSize: 18 }}>{selectedLog.type === 'IN' ? '+' : '-'}{selectedLog.qty?.toLocaleString()}</strong></div>
                                        <div><span style={{ color: '#6b7280' }}>วัน-เวลา:</span> <strong>{fmtDate(selectedLog.date || new Date())}</strong></div>
                                    </div>
                                </div>

                                {/* ข้อมูลการผลิต */}
                                {logDetail.production && (
                                    <div style={{ background: '#faf5ff', borderRadius: 10, border: '1px solid #e9d5ff', padding: 16, marginBottom: 16 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Factory size={16} style={{ color: '#7c3aed' }} /> ข้อมูลการผลิต
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                                            <div><span style={{ color: '#6b7280' }}>รหัสงาน:</span> <strong>{logDetail.production.taskId}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>ใบสั่งผลิต:</span> <strong style={{ color: '#4f46e5' }}>{logDetail.production.jobOrderId}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>Batch No.:</span> <strong style={{ color: '#1e40af' }}>{logDetail.production.batchNo}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>สูตร:</span> <strong>{logDetail.production.formulaName}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>Line:</span> <strong>{logDetail.production.line}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>กระบวนการ:</span> <strong>{logDetail.production.process}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>เป้าหมาย:</span> <strong>{logDetail.production.expectedQty?.toLocaleString()}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>ผลิตได้จริง:</span> <strong style={{ color: '#059669' }}>{logDetail.production.producedQty?.toLocaleString()}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>ของเสีย:</span> <strong style={{ color: logDetail.production.defectQty > 0 ? '#ef4444' : '#9ca3af' }}>{logDetail.production.defectQty || 0}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>สถานะ:</span> <span className={`badge ${logDetail.production.status === 'เสร็จสิ้น' ? 'badge-success' : 'badge-warning'}`}>{logDetail.production.status}</span></div>
                                            <div><span style={{ color: '#6b7280' }}>เริ่มผลิต:</span> <strong>{fmtDate(logDetail.production.startTime)}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>เสร็จสิ้น:</span> <strong>{fmtDate(logDetail.production.endTime)}</strong></div>
                                        </div>
                                        {logDetail.production.customerName && (
                                            <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef3c7', borderRadius: 8, fontSize: 13 }}>
                                                <span style={{ fontWeight: 700, color: '#92400e' }}>🏢 ลูกค้า OEM:</span> {logDetail.production.customerName}
                                                {logDetail.production.customerPO && <span style={{ marginLeft: 8, color: '#78716c' }}>PO: {logDetail.production.customerPO}</span>}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ข้อมูล Packaging */}
                                {logDetail.packaging && (
                                    <div style={{ background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', padding: 16, marginBottom: 16 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Package size={16} style={{ color: '#059669' }} /> ข้อมูลบรรจุภัณฑ์
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 13 }}>
                                            <div><span style={{ color: '#6b7280' }}>ยอดบรรจุ:</span> <strong>{logDetail.packaging.packedQty?.toLocaleString()} / {logDetail.packaging.qty?.toLocaleString()}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>ปลายทาง:</span> <strong>{logDetail.packaging.destination}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>สถานะ:</span> <span className={`badge ${logDetail.packaging.status === 'QC ผ่าน' || logDetail.packaging.status === 'ส่งมอบแล้ว' ? 'badge-success' : 'badge-info'}`}>{logDetail.packaging.status}</span></div>
                                        </div>
                                    </div>
                                )}

                                {/* ข้อมูล QC */}
                                {logDetail.qcResults.length > 0 && (
                                    <div style={{ background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', padding: 16, marginBottom: 16 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            🔬 ผลตรวจสอบคุณภาพ ({logDetail.qcResults.length} รายการ)
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {logDetail.qcResults.map((qc, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                                                    <div style={{ fontSize: 13 }}>
                                                        <strong>{qc.type === 'qc_inprocess' ? '🔍 QC ระหว่างผลิต' : '🛡️ QC Final'}</strong>
                                                        <span style={{ marginLeft: 8, color: '#6b7280' }}>โดย: {qc.inspector || '-'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmtDate(qc.inspectedAt)}</span>
                                                        <span className={`badge ${qc.status === 'ผ่าน' ? 'badge-success' : qc.status === 'ไม่ผ่าน' ? 'badge-danger' : 'badge-warning'}`}>
                                                            {qc.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ข้อมูลการจัดส่ง (Shipping) */}
                                {logDetail.shipping && (
                                    <div style={{ background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd', padding: 16, marginBottom: 16 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#0369a1' }}>
                                            <Truck size={16} style={{ color: '#0284c7' }} /> ข้อมูลการจัดส่ง (Shipping)
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                                            <div><span style={{ color: '#6b7280' }}>เลขที่ใบจัดส่ง:</span> <strong style={{ color: '#0284c7' }}>{logDetail.shipping.ShipmentID}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>สถานะ:</span> <span className="badge badge-success">{logDetail.shipping.Status}</span></div>
                                            <div><span style={{ color: '#6b7280' }}>ผู้รับ:</span> <strong>{logDetail.shipping.CustomerName || '-'}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>เบอร์โทร:</span> <strong>{logDetail.shipping.CustomerPhone || '-'}</strong></div>
                                            <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#6b7280' }}>ที่อยู่จัดส่ง:</span> <strong>{logDetail.shipping.ShippingAddress || '-'}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>ขนส่ง:</span> <strong>{logDetail.shipping.Courier || '-'}</strong></div>
                                            <div><span style={{ color: '#6b7280' }}>Tracking No.:</span> <strong style={{ color: '#059669' }}>{logDetail.shipping.TrackingNo || '-'}</strong></div>
                                            {logDetail.shipping.ShippedAt && (
                                                <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#6b7280' }}>วันเวลาที่ส่ง:</span> <strong>{fmtDate(logDetail.shipping.ShippedAt)}</strong></div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    };

    // ── กำหนดชื่อหน้าตาม Tab ที่เลือก ──
    const getPageTitle = () => {
        switch (activeTab) {
            case 'stock_dashboard': return 'สถิติภาพรวมคลังสินค้า (Stock Dashboard)';
            case 'stock_data': return 'ยอดคงเหลือสินค้า (Inventory Data)';
            case 'stock_logs': return 'ประวัติเข้า-ออก (Stock Logs)';
            default: return 'คลังสินค้า (Inventory)';
        }
    };

    const getPageDesc = () => {
        switch (activeTab) {
            case 'stock_dashboard': return 'สรุปภาพรวมยอดคงเหลือและการเคลื่อนไหวของสินค้าในคลัง';
            case 'stock_data': return 'ตรวจสอบยอดคงเหลือ สถานะ และรายละเอียดของสินค้าในคลัง';
            case 'stock_logs': return 'ประวัติและรายละเอียดการรับเข้าหรือเบิกจ่ายสินค้า';
            default: return 'ข้อมูลสินค้าคงคลัง และประวัติรายการเข้า-ออก';
        }
    };

    return (
        <div className="page-container stock-page page-enter">
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <h1>{getPageTitle()}</h1>
                <p>{getPageDesc()}</p>
            </div>

            {/* ── Tab: Stock Dashboard ── */}
            {(activeTab === 'stock_dashboard' && hasSubPermission('stock_dashboard')) && (
                <div className="subpage-content" key="stock_dashboard">
                    {hasSectionPermission('stock_dashboard_stats') && (
                        <div className="dashboard-comprehensive" style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
                            {dashboardLoading ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>กำลังโหลดข้อมูล Dashboard...</div>
                            ) : !dashboardData ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>ไม่สามารถดึงข้อมูล Dashboard ได้</div>
                            ) : (
                                <>
                                    {/* 1. KPI Cards */}
                                    <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                            <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '50%', color: '#3b82f6' }}>
                                                <Package size={28} />
                                            </div>
                                            <div>
                                                <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>จำนวนรายการทั้งหมด</div>
                                                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{dashboardData.kpi?.totalItems?.toLocaleString() || 0}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                            <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '50%', color: '#22c55e' }}>
                                                <TrendingUp size={28} />
                                            </div>
                                            <div>
                                                <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>ยอดรวมสินค้าคงคลัง (ชิ้น/กก.)</div>
                                                <div style={{ fontSize: '28px', fontWeight: 800, color: '#166534' }}>{dashboardData.kpi?.totalQty?.toLocaleString() || 0}</div>
                                            </div>
                                        </div>

                                        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                            <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '50%', color: '#f59e0b' }}>
                                                <AlertTriangle size={28} />
                                            </div>
                                            <div>
                                                <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>สินค้าเหลือน้อย (Low Stock)</div>
                                                <div style={{ fontSize: '28px', fontWeight: 800, color: '#b45309' }}>{dashboardData.kpi?.lowStockCount?.toLocaleString() || 0}</div>
                                            </div>
                                        </div>

                                        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                            <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '50%', color: '#ef4444' }}>
                                                <XCircle size={28} />
                                            </div>
                                            <div>
                                                <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>สินค้าหมดสต็อก</div>
                                                <div style={{ fontSize: '28px', fontWeight: 800, color: '#991b1b' }}>{dashboardData.kpi?.outOfStockCount?.toLocaleString() || 0}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Charts Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                                        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minWidth: 0 }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>สัดส่วนประเภทสินค้า</h3>
                                            <div style={{ height: '280px', width: '100%' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={dashboardData.categoryDistribution || []}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={70}
                                                            outerRadius={100}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {(dashboardData.categoryDistribution || []).map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 4]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip formatter={(value, name, props) => [`${value} รายการ`, props.payload.name]} />
                                                        <Legend verticalAlign="bottom" height={36} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minWidth: 0 }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Top 5 สินค้าคงเหลือสูงสุด</h3>
                                            <div style={{ height: '280px', width: '100%' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={dashboardData.topItems || []} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="ProductName" type="category" width={180} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                                        <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value) => [`${value.toLocaleString()}`, 'ยอดคงเหลือ']} />
                                                        <Bar dataKey="Quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                                                            {(dashboardData.topItems || []).map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'][index % 5]} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Tables Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                                        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minWidth: 0 }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#b45309', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <AlertTriangle size={18} /> แจ้งเตือนจุดสั่งซื้อ (Low Stock)
                                            </h3>
                                            <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                                            <th style={{ padding: '12px 8px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>ชื่อสินค้า</th>
                                                            <th style={{ padding: '12px 8px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>คงเหลือ</th>
                                                            <th style={{ padding: '12px 8px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>จุดสั่งซื้อ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(!dashboardData.lowStockItems || dashboardData.lowStockItems.length === 0) ? (
                                                            <tr><td colSpan="3" style={{padding: '24px', textAlign: 'center', color: '#94a3b8'}}>ไม่มีรายการที่ต้องสั่งซื้อด่วน</td></tr>
                                                        ) : dashboardData.lowStockItems.map(item => (
                                                            <tr key={item.ItemID} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                                                                    <div style={{fontWeight: 600, color: '#1e293b'}}>{item.ItemID}</div>
                                                                    <div style={{fontSize: '12px', color: '#64748b'}}>{item.ProductName}</div>
                                                                </td>
                                                                <td style={{ padding: '12px 8px', textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>{item.Quantity}</td>
                                                                <td style={{ padding: '12px 8px', textAlign: 'right', color: '#94a3b8' }}>{item.MinStock}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minWidth: 0 }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Clock size={18} /> ความเคลื่อนไหวล่าสุด
                                            </h3>
                                            <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                                            <th style={{ padding: '12px 8px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>ประเภท</th>
                                                            <th style={{ padding: '12px 8px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>รายการ</th>
                                                            <th style={{ padding: '12px 8px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>จำนวน</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(!dashboardData.recentMovements || dashboardData.recentMovements.length === 0) ? (
                                                            <tr><td colSpan="3" style={{padding: '24px', textAlign: 'center', color: '#94a3b8'}}>ไม่มีประวัติล่าสุด</td></tr>
                                                        ) : dashboardData.recentMovements.map(log => (
                                                            <tr key={log.LogID} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                <td style={{ padding: '12px 8px' }}>
                                                                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: log.Type === 'IN' ? '#dcfce7' : '#fee2e2', color: log.Type === 'IN' ? '#166534' : '#991b1b' }}>
                                                                        {log.Type === 'IN' ? 'รับเข้า' : 'เบิกออก'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                                                                    <div style={{fontWeight: 500, color: '#1e293b'}}>{log.ItemID}</div>
                                                                    <div style={{fontSize: '12px', color: '#64748b', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={log.ProductName}>{log.ProductName}</div>
                                                                </td>
                                                                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: log.Type === 'IN' ? '#166534' : '#991b1b' }}>
                                                                    {log.Type === 'IN' ? '+' : '-'}{log.Quantity}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Requisitions (รอเบิกจ่าย) ── */}
            {(activeTab === 'stock_requisitions' && hasSubPermission('stock_requisitions')) && (
                <div className="subpage-content" key="stock_requisitions">
                    {/* Kanban Board for Pending Requisitions */}
                    <div style={{ marginBottom: 30 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Package size={20} color="#f59e0b" /> รายการรอเบิกจ่าย
                        </h3>
                        {reqLoading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>กำลังโหลดข้อมูล...</div>
                        ) : requisitions.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1', color: '#64748b' }}>
                                ไม่มีรายการรอเบิกจ่าย
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                                {requisitions.map(req => {
                                    const hasInsufficientStock = req.items && req.items.some(it => it.isSufficient === false);
                                    return (
                                        <div key={req.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{req.id}</div>
                                                <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 12, background: '#fef3c7', color: '#b45309', fontWeight: 600 }}>
                                                    {req.status}
                                                </span>
                                        </div>
                                        <div style={{ padding: 16, flex: 1 }}>
                                            <div style={{ fontSize: 14, color: '#475569', marginBottom: 4 }}>สูตร: <strong style={{ color: '#0f172a' }}>{req.formulaName}</strong></div>
                                            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>ต้องการผลิต: {Number(req.expectedQty).toLocaleString('th-TH', { maximumFractionDigits: 4 })} {req.unit}</div>
                                            
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>รายการที่ขอเบิก:</div>
                                            <div style={{ background: '#f1f5f9', borderRadius: 8, padding: 8, maxHeight: 150, overflowY: 'auto' }}>
                                                {req.items && req.items.length > 0 ? (
                                                    <table style={{ width: '100%', fontSize: 12 }}>
                                                        <tbody>
                                                            {req.items.map((it, idx) => (
                                                                <tr key={idx} style={{ borderBottom: idx < req.items.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                                                    <td style={{ padding: '6px 4px', color: '#334155' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                            <span style={{ fontWeight: 700, color: '#0369a1', fontSize: 11, background: '#e0f2fe', padding: '1px 6px', borderRadius: 4 }}>
                                                                                {it.code || it.id}
                                                                            </span>
                                                                            <span style={{ fontWeight: 500 }}>{it.name}</span>
                                                                            {it.applyTo && (
                                                                                <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', background: '#f3e8ff', border: '1px solid #e9d5ff', padding: '1px 6px', borderRadius: 4 }}>
                                                                                    ติด{it.applyTo.replace(/^ติด/, '')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                                                                        {it.isSufficient === false ? (
                                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#ef4444', background: '#fef2f2', padding: '2px 6px', borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                                <XCircle size={12} /> {Number(it.currentStock || 0).toLocaleString('th-TH', { maximumFractionDigits: 4 })}
                                                                            </span>
                                                                        ) : (
                                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#10b981', background: '#ecfdf5', padding: '2px 6px', borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                                <CheckCircle size={12} /> {Number(it.currentStock || 0).toLocaleString('th-TH', { maximumFractionDigits: 4 })}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600, color: '#0369a1' }}>{Number(it.displayQty || it.deductQty).toLocaleString('th-TH', { maximumFractionDigits: 4 })}</td>
                                                                    <td style={{ padding: '6px 4px', color: '#64748b' }}>{it.displayUnit || it.unit}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>ไม่มีรายการเบิก</div>}
                                            </div>
                                        </div>
                                        <div style={{ padding: 12, borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', gap: 8, flexDirection: 'column' }}>
                                            {/* PR section if any item has insufficient stock */}
                                            {req.items && req.items.some(it => it.isSufficient === false) && (
                                                <div style={{ marginBottom: 4 }}>
                                                    {req.prInfo ? (
                                                        <div style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            padding: '7px 10px', background: '#eff6ff', border: '1px solid #bfdbfe',
                                                            borderRadius: 8, fontSize: 11.5, color: '#1e40af',
                                                            whiteSpace: 'nowrap', overflow: 'hidden'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, whiteSpace: 'nowrap' }}>
                                                                <span style={{ fontWeight: 600, flexShrink: 0 }}>📦 ขอซื้อ:</span>
                                                                <strong style={{ color: '#1e3a8a', flexShrink: 0 }}>{req.prInfo.prNumber}</strong>
                                                                <span style={{
                                                                    fontSize: 10, padding: '1px 6px', borderRadius: 10,
                                                                    background: req.prInfo.status === 'อนุมัติแล้ว' ? '#dcfce7' : req.prInfo.status === 'สั่งซื้อแล้ว' ? '#e0f2fe' : '#fef3c7',
                                                                    color: req.prInfo.status === 'อนุมัติแล้ว' ? '#15803d' : req.prInfo.status === 'สั่งซื้อแล้ว' ? '#0369a1' : '#b45309',
                                                                    fontWeight: 600, flexShrink: 0
                                                                }}>
                                                                    {req.prInfo.status}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => fetchAndOpenPR(req.prInfo.prNumber)}
                                                                style={{
                                                                    background: 'none', border: 'none', color: '#2563eb',
                                                                    textDecoration: 'underline', cursor: 'pointer', fontSize: 11,
                                                                    fontWeight: 600, padding: 0, flexShrink: 0, marginLeft: 6,
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                ดูรายละเอียด
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => openCreatePRModal(req)}
                                                            style={{
                                                                width: '100%', padding: '9px 12px',
                                                                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                                                color: '#fff', border: 'none', borderRadius: 8,
                                                                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                                boxShadow: '0 2px 4px rgba(234, 88, 12, 0.25)'
                                                            }}
                                                        >
                                                            ส่งใบขอซื้อ (PR) ไปยังฝ่ายจัดซื้อ
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => handlePrintRequisition(req.id)}
                                                style={{
                                                    width: '100%', padding: '8px', background: '#ffffff', color: '#1e293b', 
                                                    border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6,
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                <FileText size={16} color="#64748b" /> ดู/พิมพ์ ใบเบิก
                                            </button>
                                            <button 
                                                onClick={() => handleIssueRequisition(req.id)}
                                                disabled={hasInsufficientStock || issuingTaskId === req.id || req.items.length === 0}
                                                title={hasInsufficientStock ? 'ไม่สามารถจ่ายของได้ เนื่องจากมีรายการวัตถุดิบยังไม่ครบในสต็อก' : 'อนุมัติจ่ายของและตัดสต็อกเข้างานผลิต'}
                                                style={{
                                                    width: '100%', padding: '10px',
                                                    background: hasInsufficientStock ? '#f1f5f9' : (issuingTaskId === req.id ? '#94a3b8' : '#10b981'),
                                                    color: hasInsufficientStock ? '#94a3b8' : '#fff', 
                                                    border: hasInsufficientStock ? '1px solid #cbd5e1' : 'none',
                                                    borderRadius: 8, fontWeight: 600,
                                                    cursor: (hasInsufficientStock || issuingTaskId === req.id) ? 'not-allowed' : 'pointer',
                                                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6,
                                                    boxShadow: (hasInsufficientStock || issuingTaskId === req.id) ? 'none' : '0 2px 4px rgba(16, 185, 129, 0.2)'
                                                }}
                                            >
                                                {hasInsufficientStock ? (
                                                    <>
                                                        <XCircle size={16} color="#ef4444" /> 
                                                        อนุมัติจ่ายของ (วัตถุดิบยังไม่ครบ)
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle size={16} /> 
                                                        {issuingTaskId === req.id ? 'กำลังดำเนินการ...' : 'อนุมัติจ่ายของ (ตัดสต็อก)'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                        )}
                    </div>

                    {/* History Table */}
                    <div style={{ marginTop: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <History size={20} color="#3b82f6" /> ประวัติการอนุมัติใบเบิก
                                <span style={{ fontSize: 12, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', padding: '2px 10px', borderRadius: 12 }}>
                                    {filteredRequisitionsHistory.length} รายการ
                                </span>
                            </h3>

                            <div className="search-group" style={{ maxWidth: 360, width: '100%' }}>
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="พิมพ์ค้นหาเลขที่งาน, สูตรที่เบิก หรือวันที่..."
                                        value={searchReqHistory}
                                        onChange={(e) => {
                                            setSearchReqHistory(e.target.value);
                                            setHistoryPage(1);
                                        }}
                                    />
                                    {searchReqHistory && (
                                        <button 
                                            type="button"
                                            onClick={() => { setSearchReqHistory(''); setHistoryPage(1); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
                                        >
                                            <XCircle size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="table-card card">
                            {reqLoading ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>
                            ) : filteredRequisitionsHistory.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                                    <p style={{ fontWeight: 600, color: '#475569' }}>ไม่พบประวัติการเบิกจ่าย</p>
                                    <p style={{ fontSize: 13 }}>{searchReqHistory ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา ลองค้นหาด้วยคำอื่น' : 'ระบบจะบันทึกประวัติอัตโนมัติเมื่อมีการอนุมัติจ่ายวัตถุดิบหรือบรรจุภัณฑ์'}</p>
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 180 }}>วันที่อนุมัติ</th>
                                            <th style={{ width: 200 }}>เลขที่งานผลิต (Ref)</th>
                                            <th>สูตรที่เบิก</th>
                                            <th style={{ width: 120 }}>สถานะงาน</th>
                                            <th style={{ width: 130, textAlign: 'center' }}>เอกสาร</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedRequisitionsHistory.map(hist => (
                                            <tr key={hist.id}>
                                                <td style={{ color: '#475569' }}>
                                                    {new Date(hist.createdAt).toLocaleString('th-TH')}
                                                </td>
                                                <td>
                                                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 9px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                                                        {hist.id}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 600, color: '#0f172a' }}>{hist.formulaName}</td>
                                                <td>
                                                    <span className="badge badge-success">
                                                        อนุมัติแล้ว
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button 
                                                        onClick={() => handlePrintRequisition(hist.id)}
                                                        className="btn-sm"
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                                            background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                                                            borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600,
                                                            cursor: 'pointer'
                                                        }}
                                                        title="พิมพ์ใบเบิก"
                                                    >
                                                        <FileText size={14} /> พิมพ์ใบเบิก
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Pagination Controls for Requisition History */}
                            {!reqLoading && filteredRequisitionsHistory.length > 0 && (
                                <PaginationControl
                                    currentPage={historyPage}
                                    totalPages={historyTotalPages}
                                    totalItems={filteredRequisitionsHistory.length}
                                    pageSize={historyPageSize}
                                    onPageChange={(p) => setHistoryPage(p)}
                                    onPageSizeChange={(size) => {
                                        setHistoryPageSize(size);
                                        setHistoryPage(1);
                                    }}
                                    pageSizeOptions={[10, 20, 50]}
                                    itemLabel="รายการ"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab: Data STOCK ── */}
            {(activeTab === 'stock_data' && hasSubPermission('stock_data')) && (
                <div className="subpage-content" key="stock_data">
                    {hasSectionPermission('stock_data_search') && (
                        <div className="toolbar">
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="พิมพ์ชื่อสินค้าหรือหมวดหมู่..."
                                        value={searchStock}
                                        onChange={(e) => setSearchStock(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setStockPagination(prev => ({ ...prev, page: 1 }));
                                                setAppliedSearchStock(searchStock);
                                            }
                                        }}
                                    />
                                </div>
                                <button className="search-btn" onClick={() => {
                                    setStockPagination(prev => ({ ...prev, page: 1 }));
                                    setAppliedSearchStock(searchStock);
                                }}>ค้นหา</button>
                            </div>
                            {canCreate('stock_data') && (
                                <button 
                                    onClick={() => setShowAddModal(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                                >
                                    <Plus size={18} /> เพิ่มสินค้า
                                </button>
                            )}
                        </div>
                    )}

                    {hasSectionPermission('stock_data_search') && (
                        <div className="sub-tabs-container" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 5, marginBottom: 20 }}>
                            {['สินค้าสำเร็จรูป', 'สินค้ากึ่งสำเร็จรูป', 'วัตถุดิบ', 'บรรจุภัณฑ์', 'ฉลาก/สิ่งพิมพ์', 'วัสดุสิ้นเปลือง'].map(cat => (
                                <button 
                                    key={cat} 
                                    className={`sub-tab-btn ${activeCategory === cat ? 'active' : ''}`}
                                    onClick={() => { setActiveCategory(cat); setStockPagination(p => ({...p, page: 1})); }}
                                    style={{
                                        padding: '8px 16px', borderRadius: 20, border: '1px solid #e5e7eb',
                                        background: activeCategory === cat ? '#eff6ff' : '#fff',
                                        color: activeCategory === cat ? '#1d4ed8' : '#6b7280',
                                        fontWeight: activeCategory === cat ? 700 : 500,
                                        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
                                    }}
                                >
                                    {cat === 'สินค้าสำเร็จรูป' ? '🟢 สินค้าสำเร็จรูป (FG)' : 
                                     cat === 'สินค้ากึ่งสำเร็จรูป' ? '🟠 สินค้ากึ่งสำเร็จรูป (WIP)' : 
                                     cat === 'วัตถุดิบ' ? '🟡 วัตถุดิบ (RM)' : 
                                     cat === 'บรรจุภัณฑ์' ? '🔵 บรรจุภัณฑ์ (PM)' : 
                                     cat === 'ฉลาก/สิ่งพิมพ์' ? '🏷️ ฉลาก/สิ่งพิมพ์ (LB)' : '🟤 วัสดุสิ้นเปลือง'}
                                </button>
                            ))}
                        </div>
                    )}

                    {hasSectionPermission('stock_data_table') && (
                        <div className="table-card card">
                            {loading ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>
                            ) : filteredStock.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                                    <p style={{ fontWeight: 600 }}>ยังไม่มีสินค้าในคลัง</p>
                                    <p style={{ fontSize: 13 }}>สินค้าจะเข้าคลังอัตโนมัติเมื่อกระบวนการผลิตเสร็จสิ้น</p>
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>รหัสสินค้า</th>
                                            <th>ชื่อสินค้า</th>
                                            <th>หมวดหมู่</th>
                                            {activeCategory === 'ฉลาก/สิ่งพิมพ์' && <th>สินค้าที่ผูก (FG)</th>}
                                            <th>ยอดคงเหลือ</th>
                                            <th>หน่วย</th>
                                            <th>สถานะ</th>
                                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStock.map((item) => (
                                            <tr key={item.id}>
                                                <td style={{ fontWeight: 600, color: '#1e40af' }}>{item.id}</td>
                                                <td className="text-bold">
                                                    <div>{item.name}</div>
                                                    {item.nameEN && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal', marginTop: '2px' }}>{item.nameEN}</div>}
                                                </td>
                                                <td>{item.category}</td>
                                                {activeCategory === 'ฉลาก/สิ่งพิมพ์' && (
                                                    <td style={{ fontSize: '12px', color: '#2563eb', fontWeight: 500, maxWidth: '200px', whiteSpace: 'normal' }}>
                                                        {item.mappedFGs ? (
                                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                                                <Tag size={12} style={{ marginTop: '2px', flexShrink: 0 }} />
                                                                <span>{item.mappedFGs}</span>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8', fontWeight: 400 }}>-</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td style={{ fontWeight: 700, color: item.qty > 0 ? '#059669' : '#ef4444' }}>
                                                    {item.qty?.toLocaleString()}
                                                </td>
                                                <td>{item.unit}</td>
                                                <td>
                                                    <span className={`badge ${getStockStatusClass(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                                                        <button onClick={() => openDetail(item)} title="ดูรายละเอียด"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, borderRadius: 6, transition: 'color 0.2s' }}
                                                            onMouseEnter={e => e.currentTarget.style.color = '#2563eb'}
                                                            onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}>
                                                            <Eye size={15} />
                                                        </button>
                                                        {canUpdate('stock_data') && (
                                                            <button onClick={() => openEdit(item)} title="แก้ไข"
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, borderRadius: 6, transition: 'color 0.2s' }}
                                                                onMouseEnter={e => e.currentTarget.style.color = '#2563eb'}
                                                                onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}>
                                                                <Edit3 size={15} />
                                                            </button>
                                                        )}
                                                        {canDelete('stock_data') && (
                                                            <button onClick={() => setDeleteConfirm(item)} title="ลบสินค้า"
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, borderRadius: 6, transition: 'color 0.2s' }}
                                                                onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                                                                onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}>
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Pagination Controls for Stock Data */}
                            {!loading && (
                                <PaginationControl
                                    currentPage={stockPagination.page}
                                    totalPages={stockPagination.totalPages || 1}
                                    totalItems={stockPagination.totalItems || stockItems.length}
                                    pageSize={stockPagination.limit}
                                    onPageChange={(p) => setStockPagination(prev => ({ ...prev, page: p }))}
                                    onPageSizeChange={(size) => setStockPagination(prev => ({ ...prev, limit: size, page: 1 }))}
                                />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: รายการของเข้า-ออก (Stock Logs) ── */}
            {(activeTab === 'stock_logs' && hasSubPermission('stock_logs')) && (
                <div className="subpage-content" key="stock_logs">
                    {hasSectionPermission('stock_logs_search') && (
                        <div className="toolbar">
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="พิมพ์เลขที่อ้างอิง, ชื่อสินค้า หรือหมายเหตุ..."
                                        value={searchLogs}
                                        onChange={(e) => setSearchLogs(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setLogsPagination(prev => ({ ...prev, page: 1 }));
                                                setAppliedSearchLogs(searchLogs);
                                            }
                                        }}
                                    />
                                </div>
                                <button className="search-btn" onClick={() => {
                                    setLogsPagination(prev => ({ ...prev, page: 1 }));
                                    setAppliedSearchLogs(searchLogs);
                                }}>ค้นหา</button>
                            </div>
                        </div>
                    )}

                    {hasSectionPermission('stock_logs_table') && (
                        <div className="table-card card">
                            {loading ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>
                            ) : filteredLogs.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                                    <p style={{ fontWeight: 600 }}>ยังไม่มีประวัติเข้า-ออก</p>
                                    <p style={{ fontSize: 13 }}>ระบบจะบันทึกประวัติอัตโนมัติเมื่อมีสินค้าเข้าหรือออกจากคลัง</p>
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>วัน-เวลา</th>
                                            <th>ประเภท</th>
                                            <th>ชื่อสินค้า</th>
                                            <th>จำนวน</th>
                                            <th>เลขที่อ้างอิง</th>
                                            <th>ผู้บันทึก</th>
                                            <th>หมายเหตุ</th>
                                            <th>จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td>{log.date}</td>
                                                <td>
                                                    <span className={`badge ${getLogTypeClass(log.type, log.refType, log.itemId)}`}>
                                                        {getLogTypeLabel(log)}
                                                    </span>
                                                </td>
                                                <td className="text-bold">{log.item}</td>
                                                <td>
                                                    <span className={['IN', 'ADJ_IN'].includes(log.type) ? 'text-success' : 'text-danger'} style={{ fontWeight: 700 }}>
                                                        {['IN', 'ADJ_IN'].includes(log.type) ? '+' : '-'}{log.qty?.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                                                        {log.ref}
                                                    </span>
                                                </td>
                                                <td>{log.user}</td>
                                                <td className="text-muted" style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.note}</td>
                                                <td>
                                                    {log.ref && (
                                                        <button className="btn-sm" onClick={() => openLogDetail(log)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Eye size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Pagination Controls for Stock Logs */}
                            {!loading && (
                                <PaginationControl
                                    currentPage={logsPagination.page}
                                    totalPages={logsPagination.totalPages || 1}
                                    totalItems={logsPagination.totalItems || stockLogs.length}
                                    pageSize={logsPagination.limit}
                                    onPageChange={(p) => setLogsPagination(prev => ({ ...prev, page: p }))}
                                    onPageSizeChange={(size) => setLogsPagination(prev => ({ ...prev, limit: size, page: 1 }))}
                                />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Detail Modal ── */}
            {renderDetailModal()}
            {renderAllLogsModal()}
            {renderLogDetailModal()}

            {/* ── Modal: ส่งใบขอซื้อ (PR) ไปยังฝ่ายจัดซื้อ ── */}
            {prModalReq && (
                <div className="rnd-modal-overlay" onClick={() => setPrModalReq(null)}>
                    <div className="rnd-modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
                        <div className="rnd-modal-header" style={{ borderBottom: '1px solid #d1fae5', background: '#f8fcf9' }}>
                            <div>
                                <h2 style={{ color: '#065f46', display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 18 }}>
                                    ส่งใบขอซื้อวัตถุดิบ (PR) ไปยังฝ่ายจัดซื้อ
                                </h2>
                                <div style={{ fontSize: 13, color: '#047857', marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <span>อ้างอิงงานผลิต: <strong>{prModalReq.id}</strong> | สูตร: <strong>{prModalReq.formulaName}</strong></span>
                                    {nextPrNumber && (
                                        <span style={{ 
                                            background: '#ecfdf5', 
                                            border: '1px solid #a7f3d0', 
                                            padding: '1px 8px', 
                                            borderRadius: 6, 
                                            color: '#065f46', 
                                            fontWeight: 600,
                                            fontSize: 12
                                        }}>
                                            เลขที่ใบขอซื้อ: <strong>{nextPrNumber}</strong>
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button className="rnd-modal-close" onClick={() => setPrModalReq(null)}>
                                <XCircle size={22} color="#059669" />
                            </button>
                        </div>
                        <div className="rnd-modal-body" style={{ padding: 20 }}>
                            <p style={{ fontSize: 13, color: '#475569', marginBottom: 16, lineHeight: 1.5 }}>
                                ระบบได้คัดแยกเฉพาะวัตถุดิบที่ <strong>สต็อกไม่เพียงพอ</strong> สำหรับงานนี้ กรุณาตรวจสอบและปรับจำนวนที่ต้องการขอซื้อก่อนส่งเรื่องไปยังฝ่ายจัดซื้อ:
                            </p>

                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                            <th style={{ padding: '10px 12px', textAlign: 'left' }}>วัตถุดิบ</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>ต้องการใช้</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>สต็อกปัจจุบัน</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right', width: 140 }}>จำนวนขอซื้อ</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', width: 60 }}>หน่วย</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {prItems.map((it, idx) => (
                                            <tr key={idx} style={{ borderBottom: idx < prItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{it.name}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                                                    {Number(it.requiredQty).toLocaleString('th-TH', { maximumFractionDigits: 4 })}
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>
                                                    {Number(it.currentStock).toLocaleString('th-TH', { maximumFractionDigits: 4 })}
                                                </td>
                                                <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={it.requestQty}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setPrItems(prev => prev.map((item, i) => i === idx ? { ...item, requestQty: val } : item));
                                                        }}
                                                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #a7f3d0', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#059669' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '10px 12px', color: '#64748b' }}>{it.unit}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                    หมายเหตุถึงฝ่ายจัดซื้อ
                                </label>
                                <textarea
                                    value={prNotes}
                                    onChange={(e) => setPrNotes(e.target.value)}
                                    rows={3}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                                    placeholder="ระบุความเร่งด่วน หรือข้อความถึงฝ่ายจัดซื้อ..."
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={handlePreviewDraftPR}
                                    style={{
                                        padding: '9px 16px', borderRadius: 8, border: '1px solid #a7f3d0',
                                        background: '#ecfdf5', color: '#065f46', fontWeight: 600, cursor: 'pointer', fontSize: 13,
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                    title="ดูตัวอย่างเอกสาร A4 ก่อนส่งเรื่อง"
                                >
                                    <Eye size={15} color="#059669" /> พรีวิวเอกสาร
                                </button>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button
                                        type="button"
                                        onClick={() => setPrModalReq(null)}
                                        style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSendPR}
                                        disabled={prSubmitting}
                                        style={{
                                            padding: '9px 20px', borderRadius: 8, border: 'none',
                                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                            color: '#fff', fontWeight: 600, cursor: prSubmitting ? 'not-allowed' : 'pointer', fontSize: 13,
                                            display: 'flex', alignItems: 'center', gap: 6, opacity: prSubmitting ? 0.7 : 1,
                                            boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
                                        }}
                                    >
                                        {prSubmitting ? 'กำลังส่งเรื่อง...' : 'ยืนยันส่งใบขอซื้อ (PR)'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: ดูรายละเอียดและพิมพ์ใบขอซื้อ (PR Document Preview & Print) ── */}
            {viewingPr && (
                <PurchaseRequisitionDoc
                    pr={viewingPr}
                    onClose={() => setViewingPr(null)}
                />
            )}

            {/* ── Add Modal ── */}
            {showAddModal && (
                <div className="rnd-modal-overlay" onClick={closeAddModal}>
                    <div className="rnd-modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
                        <div className="rnd-modal-header">
                            <div>
                                <h2>➕ เพิ่มรายการสินค้าใหม่</h2>
                                {nextItemId && (
                                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                                        รหัสสินค้าที่จะถูกสร้าง: <span style={{ fontWeight: "bold", color: "#3b82f6" }}>{nextItemId}</span>
                                    </div>
                                )}
                            </div>
                            <button className="rnd-modal-close" onClick={closeAddModal}>
                                <XCircle size={22} />
                            </button>
                        </div>
                        <div className="rnd-modal-body">
                            <div className="form-group" style={{ marginBottom: 15 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', margin: 0 }}>
                                        ชื่อสินค้า <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    {checkingName && (
                                        <span style={{ fontSize: 11, color: '#6b7280' }}>กำลังตรวจสอบชื่อ...</span>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={addForm.name}
                                    onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: nameDuplicate ? '2px solid #ef4444' : '1px solid #d1d5db',
                                        borderRadius: 8,
                                        fontSize: 14,
                                        backgroundColor: nameDuplicate ? '#fef2f2' : '#fff'
                                    }}
                                    placeholder="ระบุชื่อสินค้า (ภาษาไทย)..." autoComplete="off" name="new_item_name"
                                />
                                {nameDuplicate && (
                                    <div style={{
                                        marginTop: 8,
                                        padding: '10px 12px',
                                        background: '#fff1f2',
                                        border: '1px solid #fecdd3',
                                        borderRadius: 8,
                                        color: '#9f1239',
                                        fontSize: 12,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 4
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#be123c' }}>
                                            <span>⚠️ มีสินค้าชื่อนี้อยู่ในระบบแล้ว!</span>
                                        </div>
                                        <div style={{ color: '#4c0519', lineHeight: 1.4 }}>
                                            รหัสสินค้า: <strong>{nameDuplicate.id}</strong> | หมวดหมู่: <strong>{nameDuplicate.category}</strong>
                                            <br />
                                            ยอดคงเหลือ: <strong>{nameDuplicate.qty?.toLocaleString()} {nameDuplicate.unit}</strong> (สถานะ: {nameDuplicate.status || 'มีสินค้า'})
                                        </div>
                                        <div style={{ fontSize: 11, color: '#e11d48', marginTop: 2 }}>
                                            * กรุณาตรวจสอบหรือใช้การค้นหาเพื่อ <strong>"ปรับปรุงสต็อก (Adjust)"</strong> แทนการสร้างรายการใหม่ซ้ำซ้อน
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="form-group" style={{ marginBottom: 15 }}>
                                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>ชื่อภาษาอังกฤษ (English Name)</label>
                                <input
                                    type="text"
                                    value={addForm.nameEN}
                                    onChange={e => setAddForm(p => ({ ...p, nameEN: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                                    placeholder="ระบุชื่อภาษาอังกฤษ..."
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>หมวดหมู่</label>
                                    <CustomSelect
                                        usePortal={true}
                                        value={addForm.category}
                                        onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' }}
                                    >
                                        <option value="สินค้าสำเร็จรูป">สินค้าสำเร็จรูป (FG)</option>
                                        <option value="สินค้ากึ่งสำเร็จรูป">สินค้ากึ่งสำเร็จรูป (WIP)</option>
                                        <option value="วัตถุดิบ">วัตถุดิบ (RM)</option>
                                        <option value="บรรจุภัณฑ์">บรรจุภัณฑ์ (PM)</option>
                                        <option value="ฉลาก/สิ่งพิมพ์">ฉลาก/สิ่งพิมพ์ (LB)</option>
                                        <option value="วัสดุสิ้นเปลือง">วัสดุสิ้นเปลือง</option>
                                    </CustomSelect>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>หน่วยนับ</label>
                                    <CustomSelect
                                        usePortal={true}
                                        value={addForm.unit}
                                        onChange={e => setAddForm(p => ({ ...p, unit: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' }}
                                    >
                                        <option value="">- เลือกหน่วย -</option>
                                        <option value="ชิ้น">ชิ้น</option>
                                        <option value="ขวด">ขวด</option>
                                        <option value="กระปุก">กระปุก</option>
                                        <option value="หลอด">หลอด</option>
                                        <option value="กล่อง">กล่อง</option>
                                        <option value="กิโลกรัม">กิโลกรัม (kg)</option>
                                        <option value="กรัม">กรัม (g)</option>
                                        <option value="ลิตร">ลิตร (L)</option>
                                        <option value="มิลลิลิตร">มิลลิลิตร (ml)</option>
                                        <option value="ดวง">ดวง</option>
                                        <option value="ม้วน">ม้วน</option>
                                    </CustomSelect>
                                </div>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>จำนวนเริ่มต้น (ยกยอดมา)</label>
                                    <input
                                        type="number"
                                        value={addForm.initialQty === 0 ? '' : addForm.initialQty}
                                        onChange={e => setAddForm(p => ({ ...p, initialQty: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {renderLabelConfigSection(addForm, setAddForm)}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                                <button
                                    onClick={closeAddModal}
                                    style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={saveNewItem}
                                    disabled={addSaving || Boolean(nameDuplicate)}
                                    style={{ 
                                        padding: '10px 24px', 
                                        borderRadius: 8, 
                                        border: 'none', 
                                        background: nameDuplicate ? '#9ca3af' : '#059669', 
                                        color: '#fff', 
                                        fontWeight: 600, 
                                        cursor: (addSaving || nameDuplicate) ? 'not-allowed' : 'pointer', 
                                        fontSize: 14, 
                                        opacity: (addSaving || nameDuplicate) ? 0.7 : 1 
                                    }}
                                >
                                    {addSaving ? 'กำลังบันทึก...' : nameDuplicate ? '❌ มีชื่อสินค้านี้แล้ว' : '💾 บันทึกสินค้าใหม่'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ── */}
            {editItem && (
                <div className="rnd-modal-overlay" onClick={() => setEditItem(null)}>
                    <div className="rnd-modal" style={{ maxWidth: 550 }} onClick={(e) => e.stopPropagation()}>
                        <div className="rnd-modal-header">
                            <div>
                                <h2>✏️ แก้ไขข้อมูลสินค้า</h2>
                                <div className="rnd-modal-meta">
                                    <span style={{ color: '#059669', fontWeight: 700 }}>{editItem.id}</span>
                                </div>
                            </div>
                            <button className="rnd-modal-close" onClick={() => setEditItem(null)}>
                                <XCircle size={22} />
                            </button>
                        </div>
                        <div className="rnd-modal-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>ชื่อสินค้า</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', transition: 'border 0.2s' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>ชื่อภาษาอังกฤษ (English Name)</label>
                                    <input
                                        type="text"
                                        value={editForm.nameEN}
                                        onChange={(e) => setEditForm(f => ({ ...f, nameEN: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', transition: 'border 0.2s' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>หมวดหมู่</label>
                                    <CustomSelect
                                        usePortal={true}
                                        value={editForm.category}
                                        onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', background: '#fff' }}
                                    >
                                        <option value="สินค้าสำเร็จรูป">สินค้าสำเร็จรูป (FG)</option>
                                        <option value="สินค้ากึ่งสำเร็จรูป">สินค้ากึ่งสำเร็จรูป (WIP)</option>
                                        <option value="วัตถุดิบ">วัตถุดิบ (RM)</option>
                                        <option value="บรรจุภัณฑ์">บรรจุภัณฑ์ (PM)</option>
                                        <option value="ฉลาก/สิ่งพิมพ์">ฉลาก/สิ่งพิมพ์ (LB)</option>
                                        <option value="วัสดุสิ้นเปลือง">วัสดุสิ้นเปลือง</option>
                                    </CustomSelect>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>จำนวนปัจจุบัน</label>
                                        <div style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: '#f3f4f6', color: '#374151', fontWeight: 700 }}>
                                            {editItem.qty?.toLocaleString()} <span style={{ fontWeight: 400, color: '#6b7280' }}>{editItem.unit}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>หน่วย</label>
                                        <CustomSelect
                                            usePortal={true}
                                            value={editForm.unit}
                                            onChange={(e) => setEditForm(f => ({ ...f, unit: e.target.value }))}
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', background: '#fff' }}
                                        >
                                            <option value="">- เลือกหน่วย -</option>
                                            <option value="ชิ้น">ชิ้น</option>
                                            <option value="ขวด">ขวด</option>
                                            <option value="กระปุก">กระปุก</option>
                                            <option value="หลอด">หลอด</option>
                                            <option value="กล่อง">กล่อง</option>
                                            <option value="กิโลกรัม">กิโลกรัม (kg)</option>
                                            <option value="กรัม">กรัม (g)</option>
                                            <option value="ลิตร">ลิตร (L)</option>
                                            <option value="มิลลิลิตร">มิลลิลิตร (ml)</option>
                                            <option value="ดวง">ดวง</option>
                                            <option value="ม้วน">ม้วน</option>
                                        </CustomSelect>
                                    </div>
                                </div>

                                {/* ปุ่มเปิดช่องปรับปรุงจำนวน */}
                                {!showAdjust ? (
                                    <button
                                        onClick={() => setShowAdjust(true)}
                                        style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: '1px dashed #93c5fd', background: '#eff6ff', color: '#2563eb', fontWeight: 600, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                                    >
                                        ➕ ปรับปรุงจำนวนสินค้า
                                    </button>
                                ) : (
                                    <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <label style={{ fontWeight: 700, fontSize: 13, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>📦 ปรับปรุงจำนวนสินค้า</label>
                                            <button onClick={() => { setShowAdjust(false); setEditForm(f => ({ ...f, adjustQty: 0, adjustReason: '' })); }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, fontWeight: 600 }}
                                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
                                            >✕ ยกเลิก</button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 12, color: '#2563eb' }}>จำนวนที่ปรับ (+/-)</label>
                                                <input
                                                    type="number"
                                                    value={editForm.adjustQty}
                                                    onChange={(e) => setEditForm(f => ({ ...f, adjustQty: e.target.value }))}
                                                    placeholder="เช่น 10 หรือ -5"
                                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 14, outline: 'none', background: '#fff', color: '#1d4ed8', fontWeight: 600 }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                <div style={{ padding: '10px 14px', fontSize: 14, color: '#374151', fontWeight: 600 }}>
                                                    ผลลัพธ์: <span style={{ color: '#059669', fontSize: 16 }}>{(editItem.qty + Number(editForm.adjustQty || 0)).toLocaleString()}</span> {editForm.unit}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 12, color: '#b45309' }}>สาเหตุ / ที่มาของสินค้า <span style={{color: '#ef4444'}}>*</span></label>
                                            <input
                                                type="text"
                                                value={editForm.adjustReason}
                                                onChange={(e) => setEditForm(f => ({ ...f, adjustReason: e.target.value }))}
                                                placeholder="ระบุที่มา เช่น รับคืนจากลูกค้า, นับสต็อกใหม่, สินค้าทดสอบ ฯลฯ"
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #fcd34d', fontSize: 14, outline: 'none', background: '#fffbeb' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {renderLabelConfigSection(editForm, setEditForm)}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                                <button
                                    onClick={() => setEditItem(null)}
                                    style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={saveEdit}
                                    disabled={editSaving}
                                    style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: editSaving ? 'not-allowed' : 'pointer', fontSize: 14, opacity: editSaving ? 0.7 : 1 }}
                                >
                                    {editSaving ? 'กำลังบันทึก...' : '💾 บันทึก'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Dialog ── */}
            {deleteConfirm && (
                <div className="rnd-modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="rnd-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                        <div className="rnd-modal-header">
                            <div>
                                <h2>⚠️ ยืนยันการลบสินค้า</h2>
                            </div>
                            <button className="rnd-modal-close" onClick={() => setDeleteConfirm(null)}>
                                <XCircle size={22} />
                            </button>
                        </div>
                        <div className="rnd-modal-body">
                            <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
                                <p style={{ fontSize: 15, color: '#374151', fontWeight: 600, marginBottom: 6 }}>
                                    ต้องการลบสินค้า "{deleteConfirm.name}" ใช่หรือไม่?
                                </p>
                                <p style={{ fontSize: 13, color: '#6b7280' }}>
                                    รหัส: {deleteConfirm.id} — สินค้าจะถูกนำออกจากรายการ (กู้คืนได้ภายหลัง)
                                </p>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={() => softDelete(deleteConfirm)}
                                    disabled={deleteLoading}
                                    style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, cursor: deleteLoading ? 'not-allowed' : 'pointer', fontSize: 14, opacity: deleteLoading ? 0.7 : 1 }}
                                >
                                    {deleteLoading ? 'กำลังลบ...' : '🗑️ ลบสินค้า'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

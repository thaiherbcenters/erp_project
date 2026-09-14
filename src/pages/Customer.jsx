/**
 * Customer.jsx — หน้าจัดการข้อมูลลูกค้า (Real DB)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchThaiAddress } from '../utils/thaiAddress';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import { Eye, Edit2, Trash2, X, Search } from 'lucide-react';
import API_BASE from '../config';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import PaginationControl from '../components/PaginationControl';
import { FilterToggleButton, CustomerFilterDrawer } from '../components/SalesDocFilter';
import './PageCommon.css';

export default function Customer() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages, canCreate, canUpdate, canDelete } = useAuth();
    const { showAlert, showConfirm } = useAlert();
    const visibleSubPages = getVisibleSubPages('customer');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'customer_list';

    const [customers, setCustomers] = useState([]);
    const [types, setTypes] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [viewCustomer, setViewCustomer] = useState(null);
    const [viewOrders, setViewOrders] = useState([]);
    const [form, setForm] = useState({
        name: '', contactPerson: '', phone: '', email: '', address: '',
        houseNo: '', soi: '', road: '', subDistrict: '', district: '',
        province: '', zipCode: '', taxId: '', taxBranch: 'head_office',
        branchNo: '', typeId: 1, statusId: 1, projectName: '',
        createContract: false, contractName: '', contractStartDate: '', contractEndDate: '',
        contractNameManuallyEdited: false
    });

    // Fetch data
    useEffect(() => {
        fetchCustomers();
        fetchMeta();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await fetch(`${API_BASE}/customers`);
            const json = await res.json();
            if (json.success) setCustomers(json.data || []);
        } catch (err) { console.error('Error:', err); }
    };

    const fetchMeta = async () => {
        try {
            const [tRes, sRes] = await Promise.all([
                fetch(`${API_BASE}/customers/types`),
                fetch(`${API_BASE}/customers/statuses`)
            ]);
            const tJson = await tRes.json();
            const sJson = await sRes.json();
            if (tJson.success) setTypes(tJson.data);
            if (sJson.success) setStatuses(sJson.data);
        } catch (err) { console.error('Error:', err); }
    };

    // ── Filter State ──
    const [showFilter, setShowFilter] = useState(false);
    const [customerFilter, setCustomerFilter] = useState({
        customerType: '',
        status: '',
        dateFrom: '',
        dateTo: ''
    });

    const handleFilterChange = (field, value) => {
        setCustomerFilter(prev => ({ ...prev, [field]: value }));
    };

    const handleResetFilter = () => {
        setCustomerFilter({
            customerType: '',
            status: '',
            dateFrom: '',
            dateTo: ''
        });
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
            setCustomerFilter(prev => ({ ...prev, dateFrom: todayStr, dateTo: todayStr }));
        } else if (type === '7days') {
            const d7 = new Date();
            d7.setDate(d7.getDate() - 6);
            setCustomerFilter(prev => ({ ...prev, dateFrom: format(d7), dateTo: todayStr }));
        } else if (type === 'thisMonth') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setCustomerFilter(prev => ({ ...prev, dateFrom: format(startOfMonth), dateTo: format(endOfMonth) }));
        }
    };

    const activeFilterCount = [
        Boolean(customerFilter.customerType),
        Boolean(customerFilter.status),
        Boolean(customerFilter.dateFrom || customerFilter.dateTo)
    ].filter(Boolean).length;

    const filtered = customers.filter(c => {
        // 1. Text search
        const matchSearch =
            (c.CustomerName || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.CustomerCode || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.ContactPerson || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.Phone || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.CustomerTypeName || '').toLowerCase().includes(search.toLowerCase());
        if (!matchSearch) return false;

        // 2. Customer Type
        if (customerFilter.customerType) {
            if (String(c.CustomerTypeID) !== String(customerFilter.customerType)) return false;
        }

        // 3. Status
        if (customerFilter.status) {
            if (String(c.CustomerStatusID) !== String(customerFilter.status)) return false;
        }

        // 4. Date range (CreatedDate)
        if (customerFilter.dateFrom || customerFilter.dateTo) {
            const created = c.CreatedDate ? c.CreatedDate.split('T')[0] : '';
            if (customerFilter.dateFrom && created && created < customerFilter.dateFrom) return false;
            if (customerFilter.dateTo && created && created > customerFilter.dateTo) return false;
        }

        return true;
    });

    // ── Pagination State ──
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, pageSize, customerFilter]);

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filtered.length);
    const paginatedCustomers = filtered.slice(startIndex, endIndex);

    const openCreate = () => {
        setEditingCustomer(null);
        const today = new Date();
        const nextYear = new Date(today);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const todayStr = today.toISOString().split('T')[0];
        const nextYearStr = nextYear.toISOString().split('T')[0];

        setForm({
            name: '', contactPerson: '', phone: '', email: '', address: '',
            houseNo: '', soi: '', road: '', subDistrict: '', district: '',
            province: '', zipCode: '', taxId: '', taxBranch: 'head_office',
            branchNo: '', typeId: 1, statusId: 1, projectName: '',
            createContract: false,
            contractName: '',
            contractStartDate: todayStr,
            contractEndDate: nextYearStr,
            contractNameManuallyEdited: false
        });
        setShowModal(true);
    };

    const parseThaiAddress = (addr) => {
        if (!addr) return { houseNo: '', soi: '', road: '', subDistrict: '', district: '', province: '', zipCode: '' };
        let remaining = addr.trim();
        let houseNo = '', soi = '', road = '', subDistrict = '', district = '', province = '', zipCode = '';

        // Extract zipCode (5 digits at end)
        const zipMatch = remaining.match(/\s(\d{5})$/);
        if (zipMatch) { zipCode = zipMatch[1]; remaining = remaining.replace(/\s\d{5}$/, '').trim(); }

        // Extract จ.province
        const provMatch = remaining.match(/จ\.([^\s]+)/);
        if (provMatch) { province = provMatch[1]; remaining = remaining.replace(/จ\.[^\s]+/, '').trim(); }

        // Extract อ.district
        const distMatch = remaining.match(/อ\.([^\s]+)/);
        if (distMatch) { district = distMatch[1]; remaining = remaining.replace(/อ\.[^\s]+/, '').trim(); }

        // Extract ต.subDistrict
        const subMatch = remaining.match(/ต\.([^\s]+)/);
        if (subMatch) { subDistrict = subMatch[1]; remaining = remaining.replace(/ต\.[^\s]+/, '').trim(); }

        // Extract ถ.road
        const roadMatch = remaining.match(/ถ\.([^\s]+)/);
        if (roadMatch) { road = roadMatch[1]; remaining = remaining.replace(/ถ\.[^\s]+/, '').trim(); }

        // Extract ซ.soi
        const soiMatch = remaining.match(/ซ\.([^\s]+)/);
        if (soiMatch) { soi = soiMatch[1]; remaining = remaining.replace(/ซ\.[^\s]+/, '').trim(); }

        // Whatever is left is houseNo
        houseNo = remaining.trim();

        return { houseNo, soi, road, subDistrict, district, province, zipCode };
    };

    const openEdit = (c) => {
        setEditingCustomer(c);
        const parsed = parseThaiAddress(c.Address || '');
        const today = new Date();
        const nextYear = new Date(today);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const todayStr = today.toISOString().split('T')[0];
        const nextYearStr = nextYear.toISOString().split('T')[0];

        setForm({
            name: c.CustomerName || '', contactPerson: c.ContactPerson || '',
            phone: c.Phone || '', email: c.Email || '', address: c.Address || '',
            houseNo: parsed.houseNo, soi: parsed.soi, road: parsed.road,
            subDistrict: parsed.subDistrict, district: parsed.district,
            province: parsed.province, zipCode: parsed.zipCode,
            taxId: c.TaxID || '', taxBranch: c.TaxBranch || 'head_office', branchNo: c.BranchNo || '', 
            typeId: c.CustomerTypeID || 1, statusId: c.CustomerStatusID || 1,
            projectName: c.ProjectName || '',
            createContract: false,
            contractName: '',
            contractStartDate: todayStr,
            contractEndDate: nextYearStr,
            contractNameManuallyEdited: false
        });
        setShowModal(true);
    };

    const openView = async (c) => {
        try {
            const res = await fetch(`${API_BASE}/customers/${c.CustomerID}`);
            const json = await res.json();
            if (json.success) {
                setViewCustomer(json.data);
                setViewOrders(json.orders || []);
            }
        } catch (err) { console.error('Error:', err); }
    };

    const handleSave = async () => {
        if (!form.name.trim()) return showAlert('ข้อผิดพลาด', 'กรุณากรอกชื่อลูกค้า', 'error');

        // หากเลือกสร้างสัญญา ตรวจสอบชื่อสัญญา
        if (form.createContract) {
            const cName = (form.contractName?.trim()) || (form.name?.trim()) || (form.projectName?.trim());
            if (!cName) {
                return showAlert('ข้อผิดพลาด', 'กรุณาระบุชื่อบริษัท/ลูกค้า หรือชื่อสัญญา', 'warning');
            }
        }
        
        let finalAddress = form.address;
        if (form.houseNo || form.soi || form.road || form.subDistrict || form.district || form.province || form.zipCode) {
            const parts = [];
            if (form.houseNo) parts.push(form.houseNo);
            if (form.soi) parts.push(`ซ.${form.soi}`);
            if (form.road) parts.push(`ถ.${form.road}`);
            if (form.subDistrict) parts.push(`ต.${form.subDistrict}`);
            if (form.district) parts.push(`อ.${form.district}`);
            if (form.province) parts.push(`จ.${form.province}`);
            if (form.zipCode) parts.push(form.zipCode);
            finalAddress = parts.join(' ');
        }
        
        const payload = { ...form, address: finalAddress };

        try {
            const url = editingCustomer ? `${API_BASE}/customers/${editingCustomer.CustomerID}` : `${API_BASE}/customers`;
            const method = editingCustomer ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) {
                const targetCustomerId = editingCustomer ? editingCustomer.CustomerID : (json.data?.CustomerID || json.id || json.CustomerID);

                // ถ้าเลือกสร้างสัญญา
                if (form.createContract) {
                    try {
                        const cName = (form.contractName?.trim()) || (form.name?.trim()) || (form.projectName?.trim()) || 'สัญญาจ้างผลิต';
                        const contractRes = await fetch(`${API_BASE}/contracts`, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({
                                contractName: cName,
                                customerId: targetCustomerId,
                                startDate: form.contractStartDate || null,
                                endDate: form.contractEndDate || null,
                                status: 'กำลังดำเนินการ'
                            })
                        });
                        const contractJson = await contractRes.json();
                        const actionText = editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่';
                        if (contractJson.success) {
                            showAlert('สำเร็จ', `${actionText}และสร้างสัญญา "${cName}" (${contractJson.contractNo || 'เรียบร้อย'}) ให้พร้อมกันแล้ว`, 'success');
                        } else {
                            showAlert('สำเร็จ', `${actionText}เรียบร้อย แต่ไม่สามารถสร้างสัญญาได้: ` + contractJson.message, 'warning');
                        }
                    } catch (contractErr) {
                        console.error('Create contract error:', contractErr);
                        const actionText = editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่';
                        showAlert('สำเร็จ', `${actionText}เรียบร้อย แต่เกิดข้อผิดพลาดในการสร้างสัญญา`, 'warning');
                    }
                } else {
                    showAlert('สำเร็จ', editingCustomer ? 'แก้ไขข้อมูลลูกค้าเรียบร้อย' : 'เพิ่มลูกค้าใหม่เรียบร้อย', 'success');
                }
                setShowModal(false);
                fetchCustomers();
            } else {
                showAlert('ข้อผิดพลาด', json.message, 'error');
            }
        } catch (err) { showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึก', 'error'); }
    };

    const handleDelete = async (c) => {
        const ok = await showConfirm('ยืนยันการลบ', `ลบลูกค้า "${c.CustomerName}" ใช่หรือไม่?`, 'warning');
        if (!ok) return;
        try {
            const res = await fetch(`${API_BASE}/customers/${c.CustomerID}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) { fetchCustomers(); showAlert('สำเร็จ', 'ลบลูกค้าเรียบร้อย', 'success'); }
            else showAlert('ข้อผิดพลาด', json.message, 'error');
        } catch (err) { showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบ', 'error'); }
    };

    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [activeAddressField, setActiveAddressField] = useState(null);

    const handleAddressChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (value && value.trim().length >= 2) {
            const res = searchThaiAddress(field, value, 40);
            setAddressSuggestions(res);
            setActiveAddressField(field);
        } else {
            setAddressSuggestions([]);
            setActiveAddressField(null);
        }
    };

    const handleSelectAddress = (item, field) => {
        setForm(prev => {
            const next = { ...prev };
            if (field === 'subDistrict') {
                next.subDistrict = item.district || '';
                next.district = item.amphoe || '';
                next.province = item.province || '';
                next.zipCode = item.zipcode || '';
            } else if (field === 'district') {
                next.district = item.amphoe || '';
                next.province = item.province || '';
                if (!next.zipCode || next.zipCode.trim() === '') next.zipCode = item.zipcode || '';
            } else if (field === 'province') {
                next.province = item.province || '';
            } else if (field === 'zipCode') {
                next.zipCode = item.zipcode || '';
                next.province = item.province || '';
                if (!next.district) next.district = item.amphoe || '';
                if (!next.subDistrict) next.subDistrict = item.district || '';
            }
            return next;
        });
        setAddressSuggestions([]);
        setActiveAddressField(null);
    };

    const renderAddressDropdown = (field) => {
        if (activeAddressField !== field) return null;
        if (!form[field] || form[field].trim().length < 2) return null;

        return (
            <ul 
                onMouseDown={(e) => e.preventDefault()}
                style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    width: '100%',
                    minWidth: '280px',
                    maxHeight: '240px',
                    overflowY: 'auto',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    zIndex: 1000,
                    margin: 0,
                    padding: '4px',
                    listStyle: 'none',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                }}
            >
                {addressSuggestions.length > 0 ? (
                    addressSuggestions.map((item, i) => (
                        <li
                            key={i}
                            onClick={() => handleSelectAddress(item, activeAddressField)}
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
                    <li style={{ padding: '12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                        ไม่พบที่อยู่ที่ตรงกับ "{form[field]}"
                    </li>
                )}
            </ul>
        );
    };

    const getStatusClass = (s) => {
        if (s === 'Active') return 'badge-success';
        return 'badge-danger';
    };

    const getStatusThai = (s) => {
        const map = { Active: 'ใช้งาน', Inactive: 'ไม่ใช้งาน' };
        return map[s] || (s === 'Active' ? 'ใช้งาน' : 'ไม่ใช้งาน');
    };

    const getSourceThai = (s) => {
        const map = { manual: 'กรอกเอง', sales_order: 'จากใบสั่งขาย', quotation: 'จากใบเสนอราคา', online: 'ออนไลน์' };
        return map[s] || s || '-';
    };

    const getTypeClass = (t) => {
        if (!t) return 'badge-neutral';
        if (t.includes('OEM')) return 'badge-warning'; // สีส้ม
        if (t.includes('ขึ้นทะเบียน')) return 'badge-success'; // สีเขียว
        return 'badge-info'; // สีน้ำเงิน (ทั่วไป)
    };

    const getPageTitle = () => 'รายชื่อลูกค้า';
    const getPageDesc = () => 'จัดการฐานข้อมูลลูกค้า เพิ่มหรือแก้ไขข้อมูลการติดต่อ';

    return (
        <div className="page-container customer-page page-enter">
            <div className="page-title" style={{ padding: '0 0 20px 0' }}>
                <h1>{getPageTitle()}</h1>
                <p>{getPageDesc()}</p>
            </div>

            {/* ── Tab: Customer List ── */}
            {(activeTab === 'customer_list' && hasSubPermission('customer_list')) && (
                <div className="subpage-content" key="customer_list">
                    {hasSectionPermission('customer_list_search') && (
                        <>
                            <div className="toolbar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
                                    <div className="search-group">
                                        <div className="search-input-wrap">
                                            <Search size={16} />
                                            <input type="text" placeholder="พิมพ์ชื่อ รหัส หรือประเภทลูกค้า..." value={search} onChange={(e) => setSearch(e.target.value)} />
                                        </div>
                                        <button className="search-btn">ค้นหา</button>
                                    </div>
                                    <FilterToggleButton
                                        isOpen={showFilter}
                                        onClick={() => setShowFilter(prev => !prev)}
                                        activeCount={activeFilterCount}
                                    />
                                </div>
                                {canCreate('customer_list') && (
                                    <button className="btn-primary" onClick={openCreate}>+ เพิ่มลูกค้าใหม่</button>
                                )}
                            </div>

                            <CustomerFilterDrawer
                                isOpen={showFilter}
                                onClose={() => setShowFilter(false)}
                                filter={customerFilter}
                                onFilterChange={handleFilterChange}
                                onReset={handleResetFilter}
                                onQuickDate={handleQuickDate}
                                types={types}
                                statuses={statuses}
                            />
                        </>
                    )}

                    {hasSectionPermission('customer_list_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รหัสลูกค้า</th>
                                        <th>ชื่อบริษัท/ลูกค้า</th>
                                        <th>ผู้ติดต่อ</th>
                                        <th>โทรศัพท์</th>
                                        <th>อีเมล</th>
                                        <th>ประเภท</th>
                                        <th>วันที่เข้าร่วม</th>
                                        <th>สถานะ</th>
                                        <th style={{ textAlign: 'center' }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedCustomers.map((c) => (
                                        <tr key={c.CustomerID}>
                                            <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{c.CustomerCode}</td>
                                            <td className="text-bold">{c.CustomerName}</td>
                                            <td>{c.ContactPerson || '-'}</td>
                                            <td>{c.Phone || '-'}</td>
                                            <td>{c.Email || '-'}</td>
                                            <td><span className={`badge ${getTypeClass(c.CustomerTypeName)}`}>{c.CustomerTypeName || '-'}</span></td>
                                            <td><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.CreatedDate ? new Date(c.CreatedDate).toLocaleDateString('th-TH') : '-'}</span></td>
                                            <td><span className={`badge ${getStatusClass(c.StatusName)}`}>{getStatusThai(c.StatusName)}</span></td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0' }}>
                                                    <button className="doc-action-btn" style={{ margin: 0 }} title="ดูรายละเอียด" onClick={() => openView(c)}><Eye size={15} /></button>
                                                    {canUpdate('customer_list') && (
                                                        <button className="doc-action-btn" style={{ margin: 0 }} title="แก้ไข" onClick={() => openEdit(c)}><Edit2 size={15} /></button>
                                                    )}
                                                    {canDelete('customer_list') && (
                                                        <button className="doc-action-btn doc-action-btn-danger" style={{ margin: 0 }} title="ลบ" onClick={() => handleDelete(c)}><Trash2 size={15} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>ไม่พบข้อมูลลูกค้า</td></tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            <PaginationControl 
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filtered.length}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                                onPageSizeChange={setPageSize}
                            />
                        </div>
                    )}
                </div>
            )}



            {/* ── Modal: Create/Edit ── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '10px', width: '520px', maxHeight: '90vh', overflow: 'auto', padding: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'grid', gap: '14px' }}>
                            <div>
                                <label style={labelStyle}>ชื่อบริษัท/ลูกค้า *</label>
                                <input
                                    style={inputStyle}
                                    value={form.name}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setForm(prev => ({
                                            ...prev,
                                            name: val,
                                            contractName: !prev.contractNameManuallyEdited ? val : prev.contractName
                                        }));
                                    }}
                                    placeholder="เช่น บริษัท ABC จำกัด"
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>ผู้ติดต่อ</label>
                                <input style={inputStyle} value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} placeholder="เช่น คุณสมชาย" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>โทรศัพท์</label>
                                    <input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="02-xxx-xxxx" />
                                </div>
                                <div>
                                    <label style={labelStyle}>อีเมล</label>
                                    <input style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" />
                                </div>
                            </div>
                            
                            <div style={{ marginBottom: '10px' }}>
                                <label style={labelStyle}>บ้านเลขที่ / อาคาร / หมู่</label>
                                <input style={inputStyle} value={form.houseNo || ''} onChange={e => setForm({ ...form, houseNo: e.target.value })} placeholder="เช่น 123/45 ม.9" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                                <div>
                                    <label style={labelStyle}>ตรอก / ซอย</label>
                                    <input style={inputStyle} value={form.soi || ''} onChange={e => setForm({ ...form, soi: e.target.value })} placeholder="เช่น สุขุมวิท 1" />
                                </div>
                                <div>
                                    <label style={labelStyle}>ถนน</label>
                                    <input style={inputStyle} value={form.road || ''} onChange={e => setForm({ ...form, road: e.target.value })} placeholder="เช่น สุขุมวิท" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>ตำบล / แขวง</label>
                                    <input 
                                        style={inputStyle} 
                                        value={form.subDistrict || ''} 
                                        onChange={e => handleAddressChange('subDistrict', e.target.value)} 
                                        onFocus={() => { if(form.subDistrict?.length >= 2) handleAddressChange('subDistrict', form.subDistrict); }} 
                                        onBlur={() => setTimeout(() => setActiveAddressField(null), 250)} 
                                        placeholder="พิมพ์ตำบล หรือแขวง" 
                                    />
                                    {renderAddressDropdown('subDistrict')}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>อำเภอ / เขต</label>
                                    <input 
                                        style={inputStyle} 
                                        value={form.district || ''} 
                                        onChange={e => handleAddressChange('district', e.target.value)} 
                                        onFocus={() => { if(form.district?.length >= 2) handleAddressChange('district', form.district); }} 
                                        onBlur={() => setTimeout(() => setActiveAddressField(null), 250)} 
                                        placeholder="พิมพ์อำเภอ หรือเขต" 
                                    />
                                    {renderAddressDropdown('district')}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>จังหวัด</label>
                                    <input 
                                        style={inputStyle} 
                                        value={form.province || ''} 
                                        onChange={e => handleAddressChange('province', e.target.value)} 
                                        onFocus={() => { if(form.province?.length >= 2) handleAddressChange('province', form.province); }} 
                                        onBlur={() => setTimeout(() => setActiveAddressField(null), 250)} 
                                        placeholder="พิมพ์จังหวัด" 
                                    />
                                    {renderAddressDropdown('province')}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>รหัสไปรษณีย์</label>
                                    <input 
                                        style={inputStyle} 
                                        value={form.zipCode || ''} 
                                        onChange={e => handleAddressChange('zipCode', e.target.value)} 
                                        onFocus={() => { if(form.zipCode?.length >= 2) handleAddressChange('zipCode', form.zipCode); }} 
                                        onBlur={() => setTimeout(() => setActiveAddressField(null), 250)} 
                                        placeholder="เช่น 10110, 47110" 
                                        maxLength={5} 
                                    />
                                    {renderAddressDropdown('zipCode')}
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>เลขประจำตัวผู้เสียภาษี</label>
                                <input style={inputStyle} value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} placeholder="0-xxxx-xxxxx-xx-x" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>ประเภทลูกค้า *</label>
                                    <CustomSelect style={inputStyle} value={form.typeId} onChange={e => setForm({ ...form, typeId: parseInt(e.target.value) })}>
                                        {types.map(t => <option key={t.CustomerTypeID} value={t.CustomerTypeID}>{t.CustomerTypeName}</option>)}
                                    </CustomSelect>
                                </div>
                            </div>

                            {/* ช่องชื่อโปรเจ็ค — แสดงเฉพาะ OEM นิติบุคคล(2), OEM บุคคลธรรมดา(3), ลูกค้าขึ้นทะเบียน(4) */}
                            {[2, 3, 4].includes(form.typeId) && (
                                <div style={{ marginTop: '4px' }}>
                                    <label style={labelStyle}>ชื่อโปรเจ็ค / แบรนด์</label>
                                    <input style={inputStyle} value={form.projectName || ''} onChange={e => setForm({ ...form, projectName: e.target.value })} placeholder="เช่น แบรนด์ผลไพร, โปรเจ็คสมุนไพรไทย" />
                                </div>
                            )}
                            <div>
                                <label style={labelStyle}>สถานะ</label>
                                <CustomSelect style={inputStyle} value={form.statusId} onChange={e => setForm({ ...form, statusId: parseInt(e.target.value) })}>
                                    <option value={1}>ใช้งาน (Active)</option>
                                    <option value={2}>ไม่ใช้งาน (Inactive)</option>
                                </CustomSelect>
                            </div>

                            {/* ตัวเลือกสร้างสัญญา (Contract) */}
                            <div style={{
                                marginTop: '6px',
                                padding: '12px 14px',
                                background: form.createContract ? '#f0fdf4' : '#f8fafc',
                                border: `1.5px solid ${form.createContract ? '#86efac' : '#e2e8f0'}`,
                                borderRadius: '8px',
                                transition: 'all 0.2s ease'
                            }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    color: form.createContract ? '#15803d' : '#334155',
                                    fontSize: '13px',
                                    userSelect: 'none'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={form.createContract || false}
                                        onChange={e => {
                                            const checked = e.target.checked;
                                            setForm(prev => ({
                                                ...prev,
                                                createContract: checked,
                                                // นำชื่อบริษัท/ลูกค้าด้านบนมาใส่ให้อัตโนมัติ (หากยังไม่ได้พิมพ์แก้ชื่อสัญญาเอง)
                                                contractName: prev.contractNameManuallyEdited && prev.contractName
                                                    ? prev.contractName
                                                    : (prev.name?.trim() || prev.projectName?.trim() || '')
                                            }));
                                        }}
                                        style={{ width: '17px', height: '17px', accentColor: '#16a34a', cursor: 'pointer' }}
                                    />
                                    <span>สร้างสัญญา (Contract) สำหรับลูกค้านี้ทันที</span>
                                </label>

                                {form.createContract && (
                                    <div style={{
                                        marginTop: '12px',
                                        paddingTop: '12px',
                                        borderTop: '1px dashed #bbf7d0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px'
                                    }}>
                                        <div>
                                            <label style={{ ...labelStyle, fontSize: '12px', color: '#166534' }}>
                                                ชื่อสัญญา / โปรเจกต์ <span style={{ color: '#dc2626' }}>*</span>
                                            </label>
                                            <input
                                                style={inputStyle}
                                                value={form.contractName || ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setForm(prev => ({
                                                        ...prev,
                                                        contractName: val,
                                                        contractNameManuallyEdited: val.trim() !== ''
                                                    }));
                                                }}
                                                placeholder={form.name ? form.name : "เช่น บริษัท ABC จำกัด หรือ ชื่อโปรเจกต์"}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={{ ...labelStyle, fontSize: '12px', color: '#166534' }}>วันที่เริ่มต้นสัญญา</label>
                                                <CustomDatePicker
                                                    name="contractStartDate"
                                                    value={form.contractStartDate}
                                                    onChange={e => setForm({ ...form, contractStartDate: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ ...labelStyle, fontSize: '12px', color: '#166534' }}>วันที่สิ้นสุดสัญญา (1 ปี)</label>
                                                <CustomDatePicker
                                                    name="contractEndDate"
                                                    value={form.contractEndDate}
                                                    onChange={e => setForm({ ...form, contractEndDate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>ℹ️</span> เลขที่สัญญาจะถูกออกให้อัตโนมัติ (เช่น CT-YYMMDD-xxx) และแสดงในระบบ "จัดการสัญญา" ทันที
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
                            <button className="btn-primary" onClick={handleSave}>{editingCustomer ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: View Detail ── */}
            {viewCustomer && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '10px', width: '600px', maxHeight: '90vh', overflow: 'auto', padding: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>รายละเอียดลูกค้า</h2>
                            <button onClick={() => setViewCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <InfoRow label="รหัสลูกค้า" value={viewCustomer.CustomerCode} />
                            <InfoRow label="ชื่อ" value={viewCustomer.CustomerName} />
                            <InfoRow label="ผู้ติดต่อ" value={viewCustomer.ContactPerson} />
                            <InfoRow label="โทรศัพท์" value={viewCustomer.Phone} />
                            <InfoRow label="อีเมล" value={viewCustomer.Email} />
                            <InfoRow label="ประเภท" value={<span className={`badge ${getTypeClass(viewCustomer.CustomerTypeName)}`}>{viewCustomer.CustomerTypeName || '-'}</span>} />
                            <InfoRow label="สถานะ" value={getStatusThai(viewCustomer.StatusName)} />
                            <InfoRow label="วันที่เข้าร่วม" value={viewCustomer.CreatedDate ? new Date(viewCustomer.CreatedDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'} />
                            <InfoRow label="ที่มา" value={getSourceThai(viewCustomer.Source)} />
                        </div>
                        {viewCustomer.Address && <div style={{ marginBottom: '16px' }}><InfoRow label="ที่อยู่" value={viewCustomer.Address} /></div>}
                        {viewCustomer.TaxID && <div style={{ marginBottom: '16px' }}><InfoRow label="เลขผู้เสียภาษี" value={viewCustomer.TaxID} /></div>}

                        {/* Order History */}
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>ประวัติการสั่งซื้อ ({viewOrders.length} รายการ)</h3>
                            {viewOrders.length > 0 ? (
                                <table className="data-table" style={{ minWidth: 'auto' }}>
                                    <thead><tr><th>เลขที่ SO</th><th>อ้างอิง QT</th><th>ยอดรวม</th><th>สถานะ</th><th>วันที่</th></tr></thead>
                                    <tbody>
                                        {viewOrders.map(o => (
                                            <tr key={o.SalesOrderID}>
                                                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{o.SalesOrderNo}</td>
                                                <td>{o.QuotationNo || '-'}</td>
                                                <td>฿{(o.GrandTotal || 0).toLocaleString()}</td>
                                                <td><span className="badge badge-info">{o.Status}</span></td>
                                                <td>{o.CreatedDate ? new Date(o.CreatedDate).toLocaleDateString('th-TH') : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>ยังไม่มีประวัติการสั่งซื้อ</p>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button className="btn-secondary" onClick={() => setViewCustomer(null)}>ปิด</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const InfoRow = ({ label, value }) => (
    <div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{value || '-'}</div>
    </div>
);

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

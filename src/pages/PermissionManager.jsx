/**
 * =============================================================================
 * PermissionManager.jsx — หน้าจัดการสิทธิ์การเข้าถึง (Admin Only)
 * =============================================================================
 *
 * เฉพาะ admin เท่านั้นที่เข้าถึงได้ (ProtectedRoute adminOnly)
 *
 * ฟีเจอร์:
 *   1. Sidebar เลือก user ที่ต้องการจัดการสิทธิ์
 *   2. เปิด/ปิดสิทธิ์ 3 ระดับ: page → subPage → section
 *   3. ขยาย/ยุบเพื่อดูระดับย่อย
 *   4. ปุ่ม เปิดทั้งหมด / ปิดทั้งหมด
 *
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import { ALL_PAGES } from '../data/mockData';
import { ShieldCheck, Users, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, UserPlus, X, Trash2, Globe, Building2, User, Plus, Lock } from 'lucide-react';
import './PermissionManager.css';
import API_BASE from '../config';
import CustomSelect from '../components/CustomSelect';

// Scope options config
const SCOPE_OPTIONS = [
    { value: 'all', label: 'ดูทั้งหมด', icon: Globe, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
    { value: 'department', label: 'แผนกตัวเอง', icon: Building2, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { value: 'own', label: 'เฉพาะตัวเอง', icon: User, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
];

/** Custom Scope Chip Dropdown */
function ScopeChip({ value, onChange, small }) {
    const [open, setOpen] = useState(false);
    const current = SCOPE_OPTIONS.find(o => o.value === value) || SCOPE_OPTIONS[0];
    const IconComp = current.icon;

    return (
        <div className="scope-chip-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
            <button
                className={`scope-chip ${small ? 'scope-chip-sm' : ''}`}
                style={{ background: current.bg, color: current.color, borderColor: current.border }}
                onClick={() => setOpen(!open)}
            >
                <IconComp size={small ? 12 : 13} />
                <span>{current.label}</span>
                <ChevronDown size={small ? 10 : 11} style={{ opacity: 0.6, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
            </button>
            {open && (
                <>
                    <div className="scope-backdrop" onClick={() => setOpen(false)} />
                    <div className={`scope-menu ${small ? 'scope-menu-sm' : ''}`}>
                        {SCOPE_OPTIONS.map(opt => {
                            const OptIcon = opt.icon;
                            return (
                                <div
                                    key={opt.value}
                                    className={`scope-menu-item ${value === opt.value ? 'active' : ''}`}
                                    style={{ '--scope-color': opt.color, '--scope-bg': opt.bg }}
                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                >
                                    <OptIcon size={14} />
                                    <span>{opt.label}</span>
                                    {value === opt.value && <span className="scope-check">✓</span>}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

export default function PermissionManager({ isEmbed = false }) {
    const { updatePermissions, updateSubPermission, updateSectionPermission, updateCrudPermission, getUserPermissions, loadUserPermissions } = useAuth();
    const { showAlert, showConfirm } = useAlert();

    // ── State ──
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [expandedPages, setExpandedPages] = useState({});
    const [expandedSubPages, setExpandedSubPages] = useState({});

    // ── Company Access State ──
    const [companies, setCompanies] = useState([
        { CompanyID: 1, ShortName: 'THC', CompanyNameTH: 'บริษัท ไทยเฮิร์บเซ็นเตอร์ส', CompanyColor: '#16a34a', CompanyLogo: '/images/logos/logo-thc.png' },
        { CompanyID: 2, ShortName: 'ELITE', CompanyNameTH: 'บริษัท อิลิท เทรดดิ้ง 2020 จำกัด', CompanyColor: '#2563eb', CompanyLogo: '/images/logos/logo-elite.png' },
        { CompanyID: 3, ShortName: 'RIVERVIEW', CompanyNameTH: 'บริษัท ริเว่อร์วิว โพรเทคท์ แอนด์ คลีนนิ่ง จำกัด', CompanyColor: '#7c3aed', CompanyLogo: '/images/logos/logo-riv.png' },
        { CompanyID: 4, ShortName: 'PSF', CompanyNameTH: 'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด', CompanyColor: '#ea580c', CompanyLogo: '/images/logos/logo-psf.png' },
    ]);
    const [userCompanyIds, setUserCompanyIds] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(1);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
    const [isSavingCompany, setIsSavingCompany] = useState(null);

    // ── Modal State ──
    const [showModal, setShowModal] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        username: '', password: '', displayName: '', role: 'user', department: '', companyIds: [1]
    });
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // ── Fetch Users On Mount ──
    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const res = await fetch(`${API_BASE}/users`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data);

                // Load permissions for all non-admin users to correctly display badge counts
                const nonAdmins = data.filter((u) => u.role !== 'admin');
                await Promise.all(nonAdmins.map((user) => loadUserPermissions(user.id)));
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // Fetch departments from DB
        fetch(`${API_BASE}/departments`)
            .then(res => res.ok ? res.json() : [])
            .then(data => setDepartments(data))
            .catch(() => setDepartments([]));

        // Fetch companies from DB
        fetch(`${API_BASE}/companies`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                if (data && data.length > 0) setCompanies(data);
            })
            .catch(err => console.error('Failed to fetch companies:', err));
    }, []);

    // ── Load Company Access for Active User ──
    const loadUserCompanies = async (userId) => {
        if (!userId) return;
        setIsLoadingCompanies(true);
        try {
            const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/users/${userId}/companies`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (res.ok) {
                const data = await res.json();
                setUserCompanyIds(data.map(c => c.CompanyID));
            } else {
                setUserCompanyIds([1]);
            }
        } catch (err) {
            console.error('Failed to load user companies:', err);
            setUserCompanyIds([1]);
        } finally {
            setIsLoadingCompanies(false);
        }
    };

    // ── Toggle Single Company Access ──
    const handleToggleCompany = async (companyId) => {
        if (!activeUserId) return;
        const current = [...userCompanyIds];
        const isEnabling = !current.includes(companyId);
        let updated;
        if (current.includes(companyId)) {
            if (current.length === 1) {
                showAlert('แจ้งเตือน', 'ผู้ใช้งานต้องมีสิทธิ์เข้าถึงอย่างน้อย 1 บริษัท', 'warning');
                return;
            }
            updated = current.filter(id => id !== companyId);
        } else {
            updated = [...current, companyId];
        }

        setUserCompanyIds(updated);
        setIsSavingCompany(companyId);
        if (isEnabling) {
            setSelectedCompanyId(companyId);
        }
        try {
            const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/users/${activeUserId}/companies`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ companyIds: updated })
            });
            if (!res.ok) {
                const errData = await res.json();
                showAlert('เกิดข้อผิดพลาด', errData.message || 'ไม่สามารถบันทึกสิทธิ์บริษัทได้', 'error');
                setUserCompanyIds(current);
            } else {
                const comp = companies.find(c => c.CompanyID === companyId);
                const action = updated.includes(companyId) ? 'เปิดสิทธิ์' : 'ปิดสิทธิ์';
                showAlert('สำเร็จ', `${action}บริษัท ${comp?.ShortName || ''} เรียบร้อยแล้ว`, 'success');
            }
        } catch (err) {
            console.error('Failed to update company access:', err);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
            setUserCompanyIds(current);
        } finally {
            setIsSavingCompany(null);
        }
    };

    // ── Quick Set Company Access (All or THC only) ──
    const handleQuickSetCompanies = async (targetCompanyIds, label) => {
        if (!activeUserId) return;
        const current = [...userCompanyIds];
        setUserCompanyIds(targetCompanyIds);
        try {
            const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/users/${activeUserId}/companies`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ companyIds: targetCompanyIds })
            });
            if (!res.ok) {
                const errData = await res.json();
                showAlert('เกิดข้อผิดพลาด', errData.message || 'ไม่สามารถบันทึกสิทธิ์บริษัทได้', 'error');
                setUserCompanyIds(current);
            } else {
                showAlert('สำเร็จ', `ตั้งค่าสิทธิ์: ${label} เรียบร้อยแล้ว`, 'success');
            }
        } catch (err) {
            console.error('Failed to quick set company access:', err);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
            setUserCompanyIds(current);
        }
    };

    // ── Handle Modal Role Change ──
    const handleModalRoleChange = (newRole) => {
        let compIds = newUserForm.companyIds || [1];
        if (newRole === 'executive' || newRole === 'admin') {
            compIds = [1, 2, 3, 4];
        } else if (compIds.length === 4) {
            compIds = [1];
        }
        setNewUserForm(prev => ({ ...prev, role: newRole, companyIds: compIds }));
    };

    // ── Handle Create User ──
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateError('');
        setIsCreating(true);

        try {
            const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/users`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify(newUserForm),
            });
            const data = await res.json();

            if (res.ok) {
                await fetchUsers();
                setShowModal(false);
                setNewUserForm({ username: '', password: '', displayName: '', role: 'user', department: '', companyIds: [1] });
                showAlert('สำเร็จ', 'สร้างผู้ใช้งานและตั้งค่าสิทธิ์เรียบร้อยแล้ว', 'success');
            } else {
                setCreateError(data.message || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน');
            }
        } catch (err) {
            setCreateError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setIsCreating(false);
        }
    };

    // ── Handle Delete User ──
    const handleDeleteUser = async (userId, userName) => {
        const ok = await showConfirm('ยืนยันการลบ', `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${userName}"?`, 'warning');
        if (!ok) return;

        try {
            const res = await fetch(`${API_BASE}/users/${userId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                if (selectedUserId === userId) {
                    setSelectedUserId(null);
                }
                await fetchUsers();
            } else {
                const data = await res.json();
                showAlert('เกิดข้อผิดพลาด', data.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน', 'error');
            }
        } catch (err) {
            console.error('Error deleting user:', err);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error');
        }
    };

    // ── แสดงเฉพาะ user ที่ไม่ใช่ admin ──
    const nonAdminUsers = users.filter((u) => u.role !== 'admin');

    // ── เลือก user คนแรกเป็น default ถ้ายังไม่ได้เลือก ──
    const activeUserId = selectedUserId || nonAdminUsers[0]?.id;
    const activeUser = nonAdminUsers.find((u) => u.id === activeUserId);
    const userPerms = activeUserId ? getUserPermissions(activeUserId) : [];
    const currentCompany = companies.find(c => c.CompanyID === selectedCompanyId) || companies[0];
    const currentCompanyPages = ALL_PAGES.filter(p => (p.companyId || 1) === selectedCompanyId);
    const isCurrentCompanyEnabled = userCompanyIds.includes(selectedCompanyId);

    // ── โหลดสิทธิ์ของ user (หน้า + บริษัท) เมื่อ activeUserId เปลี่ยน ──
    useEffect(() => {
        if (activeUserId) {
            loadUserPermissions(activeUserId);
            loadUserCompanies(activeUserId);
        }
    }, [activeUserId]);

    // =================================================================
    // Toggle handlers
    // =================================================================
    const toggleExpand = (pageId) => {
        setExpandedPages((prev) => ({ ...prev, [pageId]: !prev[pageId] }));
    };

    const toggleSubExpand = (subId) => {
        setExpandedSubPages((prev) => ({ ...prev, [subId]: !prev[subId] }));
    };

    // =================================================================
    // Permission toggle handlers
    // =================================================================
    const handlePageToggle = (pageId) => {
        const isEnabled = userPerms.some((p) => p.page_id === pageId);
        updatePermissions(activeUserId, pageId, !isEnabled);
    };

    const handleSubToggle = (pageId, subId) => {
        const isEnabled = userPerms.some((p) => p.page_id === subId);
        updateSubPermission(activeUserId, pageId, subId, !isEnabled);
    };

    const handleSectionToggle = (pageId, subId, sectionId) => {
        if (!activeUser) return;
        const isEnabled = getUserPermissions(activeUser.id).some((p) => p.page_id === sectionId);
        updateSectionPermission(activeUser.id, pageId, subId, sectionId, !isEnabled);
    };

    const handleCrudToggle = (pageId, action, currentValue) => {
        if (!activeUser) return;
        updateCrudPermission(activeUser.id, pageId, action, !currentValue);
    };

    // For Data Scope select
    const handleDataScopeChange = (pageId, isSub, parentId, scope) => {
        if (isSub) {
            updateSubPermission(activeUserId, parentId, pageId, true, scope);
        } else {
            updatePermissions(activeUserId, pageId, true, scope);
        }
    };

    // =================================================================
    // Bulk actions — เปิด/ปิดสิทธิ์ทั้งหมด (เฉพาะบริษัทที่เลือกอยู่)
    // =================================================================
    const handleEnableAll = () => {
        currentCompanyPages.forEach((page) => {
            if (!userPerms.some((p) => p.page_id === page.id)) {
                updatePermissions(activeUserId, page.id, true);
            }
        });
    };

    const handleDisableAll = () => {
        currentCompanyPages.forEach((page) => {
            if (userPerms.some((p) => p.page_id === page.id)) {
                updatePermissions(activeUserId, page.id, false);
            }
        });
    };

    // =================================================================
    // Counter helpers
    // =================================================================
    const getSubCount = (page) => {
        if (!page.subPages) return { enabled: 0, total: 0 };
        const total = page.subPages.length;
        const enabled = page.subPages.filter((s) => userPerms.some((p) => p.page_id === s.id)).length;
        return { enabled, total };
    };

    const getSectionCount = (subPage) => {
        if (!subPage.sections) return { enabled: 0, total: 0 };
        const total = subPage.sections.length;
        const enabled = subPage.sections.filter((s) => userPerms.some((p) => p.page_id === s.id)).length;
        return { enabled, total };
    };

    // =================================================================
    // Render
    // =================================================================
    return (
        <div className={`perm-layout ${isEmbed ? 'perm-layout-embed' : ''}`}>

            {/* ============================================================ */}
            {/* Sidebar — รายชื่อผู้ใช้ */}
            {/* ============================================================ */}
            <aside className="perm-sidebar">
                <div className="perm-sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} />
                        <span>ผู้ใช้งาน ({nonAdminUsers.length})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="perm-btn-create-user"
                            style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                            onClick={() => activeUser && handleDeleteUser(activeUser.id, activeUser.displayName)}
                            title="ลบผู้ใช้งานที่กำลังเลือก"
                            disabled={!activeUser}
                        >
                            <Trash2 size={16} />
                        </button>
                        <button
                            className="perm-btn-create-user"
                            onClick={() => setShowModal(true)}
                            title="สร้างผู้ใช้งานใหม่"
                        >
                            <UserPlus size={16} />
                        </button>
                    </div>
                </div>
                <div className="perm-user-list">
                    {isLoadingUsers ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>กำลังโหลดข้อมูล...</div>
                    ) : nonAdminUsers.map((user) => {
                        const uPerms = getUserPermissions(user.id);
                        const pageCount = ALL_PAGES.filter((p) => uPerms.some((perm) => perm.page_id === p.id)).length;
                        const isActive = user.id === activeUserId;
                        return (
                            <button
                                key={user.id}
                                className={`perm-user-item ${isActive ? 'active' : ''}`}
                                onClick={async () => {
                                    setSelectedUserId(user.id);
                                    setExpandedPages({});
                                    setExpandedSubPages({});
                                    setSelectedCompanyId(1);
                                    // ดึงสิทธิ์จาก DB เมื่อเลือก user
                                    await Promise.all([
                                        loadUserPermissions(user.id),
                                        loadUserCompanies(user.id)
                                    ]);
                                }}
                            >
                                <span className="perm-avatar">{user.avatar}</span>
                                <div className="perm-user-meta">
                                    <div className="perm-user-name-line">
                                        <span className="perm-user-name">{user.displayName}</span>
                                        {user.role === 'executive' && <span className="perm-role-tag executive">ผู้บริหาร</span>}
                                        {user.role === 'manager' && <span className="perm-role-tag manager">ผู้จัดการ</span>}
                                    </div>
                                    <span className="perm-user-role">@{user.username} {user.department && `(${user.department})`}</span>
                                </div>
                                <span className="perm-user-badge">{pageCount}/{ALL_PAGES.length}</span>
                            </button>
                        );
                    })}
                </div>
            </aside>

            {/* ============================================================ */}
            {/* Main Content — จัดการสิทธิ์ */}
            {/* ============================================================ */}
            <main className="perm-main">
                {activeUser ? (
                    <>
                        {/* Header */}
                        <div className="perm-main-header">
                            <div className="perm-main-title">
                                <div className="perm-main-icon">
                                    <ShieldCheck size={22} />
                                </div>
                                <div>
                                    <h1>จัดการสิทธิ์ — {activeUser.displayName}</h1>
                                    <p>@{activeUser.username} {activeUser.department && `(${activeUser.department})`} · สิทธิ์เข้าถึงบริษัท: {userCompanyIds.length} จาก {companies.length} บริษัท</p>
                                </div>
                            </div>
                        </div>

                        {/* ============================================================ */}
                        {/* 1. สิทธิ์การเข้าถึงบริษัท (Multi-Company Access) */}
                        {/* ============================================================ */}
                        <div className="perm-company-section">
                            <div className="perm-company-header">
                                <div className="perm-company-header-info">
                                    <div className="perm-company-icon">
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <div className="perm-company-title-row">
                                            <h3>สิทธิ์การเข้าถึงบริษัท (Multi-Company Access)</h3>
                                            <span className="perm-company-count-badge">
                                                เข้าถึงได้ {userCompanyIds.length} จาก {companies.length} บริษัท
                                            </span>
                                        </div>
                                        <p>กำหนดว่าผู้ใช้งานนี้สามารถมองเห็นและสลับเข้าทำงานในบริษัทใดได้บ้าง (สำหรับผู้บริหารและพนักงาน)</p>
                                    </div>
                                </div>
                                <div className="perm-company-quick-actions">
                                    <button 
                                        type="button" 
                                        className="perm-comp-btn perm-comp-btn-all"
                                        onClick={() => handleQuickSetCompanies([1, 2, 3, 4], 'ทุกบริษัท (สำหรับผู้บริหาร)')}
                                        title="เปิดสิทธิ์ให้เข้าถึงได้ครบทั้ง 4 บริษัท"
                                    >
                                        ⚡ เปิดทุกบริษัท (ผู้บริหาร)
                                    </button>
                                    <button 
                                        type="button" 
                                        className="perm-comp-btn perm-comp-btn-thc"
                                        onClick={() => handleQuickSetCompanies([1], 'เฉพาะ THC (พนักงานทั่วไป)')}
                                        title="กำหนดสิทธิ์เฉพาะบริษัท THC"
                                    >
                                        🌿 เฉพาะ THC
                                    </button>
                                </div>
                            </div>

                            <div className="perm-company-grid">
                                {companies.map((comp) => {
                                    const isChecked = userCompanyIds.includes(comp.CompanyID);
                                    const isSaving = isSavingCompany === comp.CompanyID;
                                    return (
                                        <div 
                                            key={comp.CompanyID} 
                                            className={`perm-company-card ${isChecked ? 'active' : ''}`}
                                            style={{ '--comp-brand': comp.CompanyColor || '#4f46e5' }}
                                            onClick={() => !isSaving && handleToggleCompany(comp.CompanyID)}
                                        >
                                            <div className="perm-comp-card-left">
                                                <div className="perm-comp-logo-wrap">
                                                    {comp.CompanyLogo ? (
                                                        <img src={comp.CompanyLogo} alt={comp.ShortName} className="perm-comp-logo-img" />
                                                    ) : (
                                                        <Building2 size={22} style={{ color: comp.CompanyColor }} />
                                                    )}
                                                </div>
                                                <div className="perm-comp-details">
                                                    <div className="perm-comp-name-row">
                                                        <span className="perm-comp-short">{comp.ShortName}</span>
                                                        {isChecked && <span className="perm-comp-badge">เปิดใช้งาน</span>}
                                                    </div>
                                                    <span className="perm-comp-full">{comp.CompanyNameTH || comp.CompanyName}</span>
                                                </div>
                                            </div>
                                            <div className="perm-comp-card-right">
                                                <div className="perm-toggle-switch" style={{ pointerEvents: 'none' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        readOnly
                                                    />
                                                    <span className="perm-toggle-slider"></span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Section Divider & Title */}
                        <div className="perm-section-divider">
                            <div className="perm-section-title">
                                <ShieldCheck size={18} />
                                <span>สิทธิ์การเข้าถึงหน้าระบบและฟังก์ชันงาน (Page Permissions)</span>
                            </div>
                            {isCurrentCompanyEnabled && currentCompanyPages.length > 0 && (
                                <div className="perm-bulk-actions">
                                    <button className="perm-btn perm-btn-enable" onClick={handleEnableAll}>
                                        <ToggleRight size={16} />
                                        เปิดทั้งหมด ({currentCompany?.ShortName})
                                    </button>
                                    <button className="perm-btn perm-btn-disable" onClick={handleDisableAll}>
                                        <ToggleLeft size={16} />
                                        ปิดทั้งหมด ({currentCompany?.ShortName})
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Company Tabs for Page Permissions */}
                        <div className="perm-company-tabs-bar">
                            <div className="perm-comp-tabs-list">
                                {companies.map((comp) => {
                                    const isCompEnabled = userCompanyIds.includes(comp.CompanyID);
                                    const compPages = ALL_PAGES.filter(p => (p.companyId || 1) === comp.CompanyID);
                                    const compPermsCount = compPages.filter(p => userPerms.some(perm => perm.page_id === p.id)).length;
                                    const isSelected = selectedCompanyId === comp.CompanyID;

                                    return (
                                        <button
                                            key={comp.CompanyID}
                                            type="button"
                                            className={`perm-comp-tab-item ${isSelected ? 'active' : ''} ${!isCompEnabled ? 'disabled' : ''}`}
                                            style={{ '--comp-brand': comp.CompanyColor || '#4f46e5' }}
                                            onClick={() => setSelectedCompanyId(comp.CompanyID)}
                                        >
                                            <div className="perm-comp-tab-logo">
                                                {comp.CompanyLogo ? (
                                                    <img src={comp.CompanyLogo} alt={comp.ShortName} />
                                                ) : (
                                                    <Building2 size={16} />
                                                )}
                                            </div>
                                            <div className="perm-comp-tab-text">
                                                <div className="perm-comp-tab-name-row">
                                                    <span className="perm-comp-tab-title">{comp.ShortName}</span>
                                                    {!isCompEnabled && <span className="perm-comp-tab-lock-icon">🔒</span>}
                                                </div>
                                                <span className="perm-comp-tab-sub">
                                                    {isCompEnabled ? `${compPermsCount}/${compPages.length} หน้า` : 'ปิดสิทธิ์บริษัทนี้'}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Page Permissions Table or Locked Notice */}
                        {!isCurrentCompanyEnabled ? (
                            <div className="perm-comp-unauthorized-banner">
                                <div className="perm-comp-banner-icon" style={{ backgroundColor: `${currentCompany?.CompanyColor || '#2563eb'}18`, color: currentCompany?.CompanyColor || '#2563eb' }}>
                                    <Building2 size={32} />
                                </div>
                                <div className="perm-comp-banner-body">
                                    <h4>ยังไม่ได้เปิดสิทธิ์เข้าใช้งานบริษัท {currentCompany?.ShortName} ({currentCompany?.CompanyNameTH})</h4>
                                    <p>ผู้ใช้งาน <strong>@{activeUser.username} ({activeUser.displayName})</strong> ยังไม่ได้รับสิทธิ์เข้าทำงานในบริษัทนี้ในส่วน "สิทธิ์การเข้าถึงบริษัท" ด้านบน ทำให้หน้าระบบและฟังก์ชันงานถูกล็อกอยู่</p>
                                    <button 
                                        type="button" 
                                        className="perm-comp-banner-btn"
                                        style={{ backgroundColor: currentCompany?.CompanyColor || '#2563eb' }}
                                        onClick={() => handleToggleCompany(selectedCompanyId)}
                                    >
                                        <Plus size={16} />
                                        เปิดสิทธิ์บริษัท {currentCompany?.ShortName} เพื่อตั้งค่าหน้าระบบ
                                    </button>
                                </div>
                            </div>
                        ) : currentCompanyPages.length === 0 ? (
                            <div className="perm-empty-state-card">
                                <Building2 size={36} style={{ color: '#94a3b8' }} />
                                <p>ยังไม่มีหน้าและฟังก์ชันงานสำหรับบริษัท {currentCompany?.ShortName} ในระบบ</p>
                            </div>
                        ) : (
                            <div className="perm-table-wrap">
                                <table className="perm-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}></th>
                                            <th>ชื่อหน้า / หัวข้อ ({currentCompany?.ShortName})</th>
                                            <th style={{ width: '120px', textAlign: 'center' }}>ขอบเขตข้อมูล</th>
                                            <th style={{ width: '60px', textAlign: 'center', fontSize: '13px' }}>สร้าง</th>
                                            <th style={{ width: '60px', textAlign: 'center', fontSize: '13px' }}>ดู</th>
                                            <th style={{ width: '60px', textAlign: 'center', fontSize: '13px' }}>แก้ไข</th>
                                            <th style={{ width: '60px', textAlign: 'center', fontSize: '13px' }}>ลบ</th>
                                            <th style={{ width: '90px', textAlign: 'center' }}>หน้าย่อย</th>
                                            <th style={{ width: '90px', textAlign: 'center' }}>สิทธิ์</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentCompanyPages.map((page) => {
                                        const currPerm = userPerms.find((p) => p.page_id === page.id);
                                        const isPageEnabled = !!currPerm;
                                        const isExpanded = expandedPages[page.id];
                                        const { enabled: subEnabled, total: subTotal } = getSubCount(page);
                                        const hasSubPages = page.subPages && page.subPages.length > 0;

                                        return (
                                            <>
                                                {/* ── Page Row (ระดับ 1) ── */}
                                                <tr key={page.id} className={`perm-row-page ${isPageEnabled ? 'row-enabled' : ''}`}>
                                                    <td className="perm-td-expand">
                                                        {hasSubPages && (
                                                            <button
                                                                className="perm-expand-btn"
                                                                onClick={() => toggleExpand(page.id)}
                                                            >
                                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="perm-td-name">
                                                        <span className="perm-page-label">{page.name}</span>
                                                    </td>
                                                    <td className="perm-td-scope" style={{ textAlign: 'center' }}>
                                                        {isPageEnabled ? (
                                                            <ScopeChip
                                                                value={currPerm?.data_scope || 'all'}
                                                                onChange={(val) => handleDataScopeChange(page.id, false, null, val)}
                                                            />
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px' }}>—</span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {isPageEnabled ? (
                                                            <input type="checkbox" checked={currPerm?.can_create !== false} onChange={() => handleCrudToggle(page.id, 'create', currPerm?.can_create !== false)} />
                                                        ) : (
                                                            <span style={{ color: '#d1d5db' }}>-</span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {isPageEnabled ? (
                                                            <input type="checkbox" checked={currPerm?.can_read !== false} onChange={() => handleCrudToggle(page.id, 'read', currPerm?.can_read !== false)} />
                                                        ) : (
                                                            <span style={{ color: '#d1d5db' }}>-</span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {isPageEnabled ? (
                                                            <input type="checkbox" checked={currPerm?.can_update !== false} onChange={() => handleCrudToggle(page.id, 'update', currPerm?.can_update !== false)} />
                                                        ) : (
                                                            <span style={{ color: '#d1d5db' }}>-</span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {isPageEnabled ? (
                                                            <input type="checkbox" checked={currPerm?.can_delete !== false} onChange={() => handleCrudToggle(page.id, 'delete', currPerm?.can_delete !== false)} />
                                                        ) : (
                                                            <span style={{ color: '#d1d5db' }}>-</span>
                                                        )}
                                                    </td>
                                                    <td className="perm-td-count">
                                                        {hasSubPages && (
                                                            <span className={`perm-count-badge ${isPageEnabled ? 'badge-active' : ''}`}>
                                                                {subEnabled}/{subTotal}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="perm-td-toggle">
                                                        <label className="perm-switch">
                                                            <input
                                                                type="checkbox"
                                                                checked={isPageEnabled}
                                                                onChange={() => handlePageToggle(page.id)}
                                                            />
                                                            <span className="perm-slider"></span>
                                                        </label>
                                                    </td>
                                                </tr>

                                                {/* ── Sub-page Rows (ระดับ 2) ── */}
                                                {isExpanded && hasSubPages && page.subPages.map((sub) => {
                                                    const currSubPerm = userPerms.find((p) => p.page_id === sub.id);
                                                    const isSubEnabled = !!currSubPerm;
                                                    const isSubExpanded = expandedSubPages[sub.id];
                                                    const { enabled: secEnabled, total: secTotal } = getSectionCount(sub);
                                                    const hasSections = sub.sections && sub.sections.length > 0;

                                                    return (
                                                        <>
                                                            <tr key={sub.id} className={`perm-row-sub ${isSubEnabled ? 'row-sub-enabled' : ''}`}>
                                                                <td className="perm-td-expand">
                                                                    {hasSections && (
                                                                        <button
                                                                            className="perm-expand-btn perm-expand-sm"
                                                                            onClick={() => toggleSubExpand(sub.id)}
                                                                        >
                                                                            {isSubExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                        </button>
                                                                    )}
                                                                </td>
                                                                <td className="perm-td-name perm-indent-1">
                                                                    <span className="perm-sub-label">{sub.name}</span>
                                                                </td>
                                                                <td className="perm-td-scope" style={{ textAlign: 'center' }}>
                                                                    {isSubEnabled ? (
                                                                        <ScopeChip
                                                                            value={currSubPerm?.data_scope || 'all'}
                                                                            onChange={(val) => handleDataScopeChange(sub.id, true, page.id, val)}
                                                                            small
                                                                        />
                                                                    ) : (
                                                                        <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '11px' }}>—</span>
                                                                    )}
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    {isSubEnabled ? (
                                                                        <input type="checkbox" checked={currSubPerm?.can_create !== false} onChange={() => handleCrudToggle(sub.id, 'create', currSubPerm?.can_create !== false)} />
                                                                    ) : (
                                                                        <span style={{ color: '#d1d5db' }}>-</span>
                                                                    )}
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    {isSubEnabled ? (
                                                                        <input type="checkbox" checked={currSubPerm?.can_read !== false} onChange={() => handleCrudToggle(sub.id, 'read', currSubPerm?.can_read !== false)} />
                                                                    ) : (
                                                                        <span style={{ color: '#d1d5db' }}>-</span>
                                                                    )}
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    {isSubEnabled ? (
                                                                        <input type="checkbox" checked={currSubPerm?.can_update !== false} onChange={() => handleCrudToggle(sub.id, 'update', currSubPerm?.can_update !== false)} />
                                                                    ) : (
                                                                        <span style={{ color: '#d1d5db' }}>-</span>
                                                                    )}
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    {isSubEnabled ? (
                                                                        <input type="checkbox" checked={currSubPerm?.can_delete !== false} onChange={() => handleCrudToggle(sub.id, 'delete', currSubPerm?.can_delete !== false)} />
                                                                    ) : (
                                                                        <span style={{ color: '#d1d5db' }}>-</span>
                                                                    )}
                                                                </td>
                                                                <td className="perm-td-count">
                                                                    {hasSections && (
                                                                        <span className={`perm-count-badge perm-count-sm ${isSubEnabled ? 'badge-active' : ''}`}>
                                                                            {secEnabled}/{secTotal}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="perm-td-toggle">
                                                                    <label className="perm-checkbox-wrap">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSubEnabled}
                                                                            onChange={() => handleSubToggle(page.id, sub.id)}
                                                                        />
                                                                        <span className="perm-checkmark"></span>
                                                                    </label>
                                                                </td>
                                                            </tr>

                                                            {/* ── Section Rows (ระดับ 3) ── */}
                                                            {isSubExpanded && hasSections && sub.sections.map((sec) => {
                                                                const isSecEnabled = userPerms.some((p) => p.page_id === sec.id);
                                                                return (
                                                                    <tr key={sec.id} className={`perm-row-sec ${isSecEnabled ? 'row-sec-enabled' : ''}`}>
                                                                        <td></td>
                                                                        <td className="perm-td-name perm-indent-2">
                                                                            <span className="perm-sec-label">{sec.name}</span>
                                                                        </td>
                                                                        <td></td>
                                                                        <td></td>
                                                                        <td></td>
                                                                        <td></td>
                                                                        <td></td>
                                                                        <td></td>
                                                                        <td className="perm-td-toggle">
                                                                            <label className="perm-checkbox-wrap perm-checkbox-sm">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSecEnabled}
                                                                                    onChange={() => handleSectionToggle(page.id, sub.id, sec.id)}
                                                                                />
                                                                                <span className="perm-checkmark perm-checkmark-sm"></span>
                                                                            </label>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </>
                                                    );
                                                })}
                                            </>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
                ) : (
                    <div className="perm-empty">
                        <ShieldCheck size={48} />
                        <p>เลือกผู้ใช้งานเพื่อจัดการสิทธิ์</p>
                    </div>
                )}
            </main>

            {/* ============================================================ */}
            {/* Modal — สร้างผู้ใช้งานใหม่ */}
            {/* ============================================================ */}
            {showModal && (
                <div className="perm-modal-overlay">
                    <div className="perm-modal">
                        <div className="perm-modal-header">
                            <h2>สร้างผู้ใช้งานใหม่</h2>
                            <button className="perm-modal-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form className="perm-modal-form" onSubmit={handleCreateUser}>
                            {createError && <div className="perm-modal-error">{createError}</div>}

                            <div className="perm-form-group">
                                <label>Username (ชื่อเข้าสู่ระบบ)</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserForm.username}
                                    onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value })}
                                    placeholder="เช่น: user01"
                                />
                            </div>

                            <div className="perm-form-group">
                                <label>Password (รหัสผ่าน)</label>
                                <input
                                    type="password"
                                    required
                                    value={newUserForm.password}
                                    onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                                    placeholder="รหัสผ่านสำหรับล็อกอิน"
                                    autoComplete="new-password"
                                />
                            </div>

                            <div className="perm-form-group">
                                <label>Display Name (ชื่อที่แสดงผล)</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserForm.displayName}
                                    onChange={e => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                                    placeholder="เช่น: สมชาย เข็มกลัด"
                                />
                            </div>

                            <div className="perm-form-group">
                                <label>Department (แผนก)</label>
                                <CustomSelect
                                    value={newUserForm.department}
                                    onChange={e => setNewUserForm({ ...newUserForm, department: e.target.value })}
                                >
                                    <option value="">(ไม่ระบุแผนก)</option>
                                    {departments.map(dept => (
                                        <option key={dept.dept_code} value={dept.dept_code}>
                                            {dept.dept_name}
                                        </option>
                                    ))}
                                </CustomSelect>
                            </div>

                            <div className="perm-form-group">
                                <label>Role (ตำแหน่ง/กลุ่มสิทธิ์ประจำ)</label>
                                <CustomSelect
                                    value={newUserForm.role}
                                    onChange={e => handleModalRoleChange(e.target.value)}
                                >
                                    <option value="user">User (พนักงานทั่วไป)</option>
                                    <option value="manager">Manager (ผู้จัดการ)</option>
                                    <option value="executive">Executive (ผู้บริหาร)</option>
                                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                                </CustomSelect>
                            </div>

                            <div className="perm-form-group">
                                <div className="perm-modal-label-row">
                                    <label>สิทธิ์การเข้าถึงบริษัท</label>
                                    <span className="perm-modal-subhint">
                                        {(newUserForm.companyIds || []).length} / {companies.length} บริษัท
                                    </span>
                                </div>
                                <div className="perm-modal-comp-grid">
                                    {companies.map((comp) => {
                                        const isChecked = (newUserForm.companyIds || []).includes(comp.CompanyID);
                                        return (
                                            <label 
                                                key={comp.CompanyID} 
                                                className={`perm-modal-comp-item ${isChecked ? 'checked' : ''}`}
                                                style={{ '--comp-brand': comp.CompanyColor || '#4f46e5' }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        const current = newUserForm.companyIds || [];
                                                        let updated;
                                                        if (current.includes(comp.CompanyID)) {
                                                            if (current.length > 1) {
                                                                updated = current.filter(id => id !== comp.CompanyID);
                                                            } else {
                                                                updated = current;
                                                            }
                                                        } else {
                                                            updated = [...current, comp.CompanyID];
                                                        }
                                                        setNewUserForm(prev => ({ ...prev, companyIds: updated }));
                                                    }}
                                                />
                                                <span className="perm-modal-comp-dot"></span>
                                                <div className="perm-modal-comp-info">
                                                    <span className="perm-modal-comp-short">{comp.ShortName}</span>
                                                    <span className="perm-modal-comp-name">{comp.CompanyNameTH || comp.CompanyName}</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="perm-modal-footer">
                                <button type="button" className="perm-btn perm-btn-cancel" onClick={() => setShowModal(false)}>
                                    ยกเลิก
                                </button>
                                <button type="submit" className="perm-btn perm-btn-submit" disabled={isCreating}>
                                    {isCreating ? 'กำลังสร้าง...' : 'สร้างผู้ใช้งาน'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

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
import { ALL_PAGES } from '../data/mockData';
import { ShieldCheck, Users, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, UserPlus, X, Trash2, Globe, Building2, User } from 'lucide-react';
import './PermissionManager.css';

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

export default function PermissionManager() {
    const { updatePermissions, updateSubPermission, updateSectionPermission, getUserPermissions, loadUserPermissions } = useAuth();

    // ── State ──
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [expandedPages, setExpandedPages] = useState({});
    const [expandedSubPages, setExpandedSubPages] = useState({});

    // ── Modal State ──
    const [showModal, setShowModal] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        username: '', password: '', displayName: '', role: 'user', department: ''
    });
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // ── Fetch Users On Mount ──
    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const res = await fetch('http://localhost:5000/api/users');
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
        fetch('http://localhost:5000/api/departments')
            .then(res => res.ok ? res.json() : [])
            .then(data => setDepartments(data))
            .catch(() => setDepartments([]));
    }, []);

    // ── Handle Create User ──
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateError('');
        setIsCreating(true);

        try {
            const res = await fetch('http://localhost:5000/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUserForm),
            });
            const data = await res.json();

            if (res.ok) {
                await fetchUsers();
                setShowModal(false);
                setNewUserForm({ username: '', password: '', displayName: '', role: 'user', department: '' });
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
        if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${userName}"?`)) {
            return;
        }

        try {
            const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                if (selectedUserId === userId) {
                    setSelectedUserId(null);
                }
                await fetchUsers();
            } else {
                const data = await res.json();
                alert(data.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
            }
        } catch (err) {
            console.error('Error deleting user:', err);
            alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        }
    };

    // ── แสดงเฉพาะ user ที่ไม่ใช่ admin ──
    const nonAdminUsers = users.filter((u) => u.role !== 'admin');

    // ── เลือก user คนแรกเป็น default ถ้ายังไม่ได้เลือก ──
    const activeUserId = selectedUserId || nonAdminUsers[0]?.id;
    const activeUser = nonAdminUsers.find((u) => u.id === activeUserId);
    const userPerms = activeUserId ? getUserPermissions(activeUserId) : [];

    // ── โหลดสิทธิ์ของ user เริ่มต้น (คนแรกในรายการ) เมื่อหน้า mount ──
    useEffect(() => {
        if (activeUserId && !selectedUserId) {
            loadUserPermissions(activeUserId);
        }
    }, [activeUserId, selectedUserId]);

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
        const isEnabled = userPerms.some((p) => p.page_id === sectionId);
        updateSectionPermission(activeUserId, pageId, subId, sectionId, !isEnabled);
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
    // Bulk actions — เปิด/ปิดสิทธิ์ทั้งหมด
    // =================================================================
    const handleEnableAll = () => {
        ALL_PAGES.forEach((page) => {
            if (!userPerms.some((p) => p.page_id === page.id)) {
                updatePermissions(activeUserId, page.id, true);
            }
        });
    };

    const handleDisableAll = () => {
        ALL_PAGES.forEach((page) => {
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
        <div className="perm-layout">

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
                                    // ดึงสิทธิ์จาก DB เมื่อเลือก user
                                    await loadUserPermissions(user.id);
                                }}
                            >
                                <span className="perm-avatar">{user.avatar}</span>
                                <div className="perm-user-meta">
                                    <span className="perm-user-name">{user.displayName}</span>
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
                                    <p>@{activeUser.username} {activeUser.department && `(${activeUser.department})`} · เข้าถึงได้ {ALL_PAGES.filter((p) => userPerms.some((perm) => perm.page_id === p.id)).length} จาก {ALL_PAGES.length} หน้า</p>
                                </div>
                            </div>
                            <div className="perm-bulk-actions">
                                <button className="perm-btn perm-btn-enable" onClick={handleEnableAll}>
                                    <ToggleRight size={16} />
                                    เปิดทั้งหมด
                                </button>
                                <button className="perm-btn perm-btn-disable" onClick={handleDisableAll}>
                                    <ToggleLeft size={16} />
                                    ปิดทั้งหมด
                                </button>
                            </div>
                        </div>

                        {/* Permission Table */}
                        <div className="perm-table-wrap">
                            <table className="perm-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}></th>
                                        <th>ชื่อหน้า / หัวข้อ</th>
                                        <th style={{ width: '120px', textAlign: 'center' }}>ขอบเขตข้อมูล</th>
                                        <th style={{ width: '100px', textAlign: 'center' }}>หน้าย่อย</th>
                                        <th style={{ width: '100px', textAlign: 'center' }}>สิทธิ์</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ALL_PAGES.map((page) => {
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
                                    onChange={e => setNewUserForm({...newUserForm, username: e.target.value})}
                                    placeholder="เช่น: user01"
                                />
                            </div>
                            
                            <div className="perm-form-group">
                                <label>Password (รหัสผ่าน)</label>
                                <input 
                                    type="password" 
                                    required 
                                    value={newUserForm.password}
                                    onChange={e => setNewUserForm({...newUserForm, password: e.target.value})}
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
                                    onChange={e => setNewUserForm({...newUserForm, displayName: e.target.value})}
                                    placeholder="เช่น: สมชาย เข็มกลัด"
                                />
                            </div>

                            <div className="perm-form-group">
                                <label>Department (แผนก)</label>
                                <select 
                                    value={newUserForm.department}
                                    onChange={e => setNewUserForm({...newUserForm, department: e.target.value})}
                                >
                                    <option value="">(ไม่ระบุแผนก)</option>
                                    {departments.map(dept => (
                                        <option key={dept.dept_code} value={dept.dept_code}>
                                            {dept.dept_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="perm-form-group">
                                <label>Role (ตำแหน่ง/กลุ่มสิทธิ์ประจำ)</label>
                                <select 
                                    value={newUserForm.role}
                                    onChange={e => setNewUserForm({...newUserForm, role: e.target.value})}
                                >
                                    <option value="user">User (ผู้ใช้งานทั่วไป)</option>
                                    <option value="manager">Manager (ผู้จัดการ)</option>
                                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                                </select>
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

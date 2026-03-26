/**
 * =============================================================================
 * Settings.jsx — หน้าตั้งค่าระบบ (Admin Only)
 * =============================================================================
 *
 * 3 แท็บ:
 *   1. จัดการผู้ใช้     — CRUD + reset password + toggle active
 *   2. จัดการแผนก      — CRUD departments
 *   3. ตั้งค่าทั่วไป    — placeholder
 *
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Settings as SettingsIcon, Users, Building2, Wrench,
    Search, Plus, Pencil, Trash2, KeyRound, X, UserPlus
} from 'lucide-react';
import './Settings.css';
import API_BASE from '../config';


// Role labels (fallback if DB roles not loaded yet)
const ROLE_OPTIONS_FALLBACK = [
    { value: 'admin', label: 'ผู้ดูแลระบบ' },
    { value: 'executive', label: 'ผู้บริหาร' },
    { value: 'qc', label: 'เจ้าหน้าที่ QC' },
    { value: 'sales', label: 'ฝ่ายขาย' },
    { value: 'accountant', label: 'ฝ่ายบัญชี' },
    { value: 'procurement', label: 'ฝ่ายจัดซื้อ' },
    { value: 'hr', label: 'ฝ่ายบุคคล' },
    { value: 'stock', label: 'พนักงานคลังสินค้า' },
    { value: 'planner', label: 'ผู้วางแผนการผลิต' },
    { value: 'operator', label: 'พนักงานฝ่ายผลิต' },
    { value: 'rnd', label: 'นักวิจัยและพัฒนา' },
    { value: 'packaging', label: 'พนักงานบรรจุภัณฑ์' },
    { value: 'document_control', label: 'เจ้าหน้าที่ควบคุมเอกสาร' },
];

const getRoleLabelFromList = (role, rolesList) => {
    const found = rolesList.find(r => r.role_code === role || r.value === role);
    return found?.role_name || found?.label || role;
};

export default function Settings() {
    const [activeTab, setActiveTab] = useState('users');
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div>
            {/* Header */}
            <div className="settings-header">
                <h1><SettingsIcon size={24} /> ตั้งค่าระบบ</h1>
                <p>จัดการผู้ใช้งาน แผนก ตำแหน่ง และการตั้งค่าอื่นๆ ของระบบ</p>
            </div>

            {/* Tabs */}
            <div className="settings-tabs">
                <button className={`settings-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                    <Users size={16} /> ผู้ใช้งาน
                </button>
                <button className={`settings-tab ${activeTab === 'departments' ? 'active' : ''}`} onClick={() => setActiveTab('departments')}>
                    <Building2 size={16} /> แผนก
                </button>
                <button className={`settings-tab ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>
                    <Wrench size={16} /> ตำแหน่ง
                </button>
                <button className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
                    <SettingsIcon size={16} /> ทั่วไป
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'users' && <UsersTab showToast={showToast} />}
            {activeTab === 'departments' && <DepartmentsTab showToast={showToast} />}
            {activeTab === 'roles' && <RolesTab showToast={showToast} />}
            {activeTab === 'general' && <GeneralTab />}

            {/* Toast */}
            {toast && <div className={`settings-toast ${toast.type}`}>{toast.message}</div>}
        </div>
    );
}

// =============================================================================
// Users Tab
// =============================================================================
function UsersTab({ showToast }) {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [roles, setRoles] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);

    const loadData = useCallback(async () => {
        try {
            const [uRes, dRes, rRes] = await Promise.all([
                fetch(`${API}/users`),
                fetch(`${API}/departments`),
                fetch(`${API}/roles?all=true`)
            ]);
            setUsers(await uRes.json());
            setDepartments(await dRes.json());
            setRoles(await rRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filteredUsers = users.filter(u =>
        u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.department?.toLowerCase().includes(search.toLowerCase())
    );

    const handleToggle = async (user) => {
        try {
            const res = await fetch(`${API}/users/${user.id}/toggle`, { method: 'PUT' });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message);
                loadData();
            } else {
                showToast(data.message, 'error');
            }
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    };

    const handleDelete = async (user) => {
        if (!confirm(`ต้องการลบ "${user.displayName}" หรือไม่? การลบนี้ไม่สามารถยกเลิกได้`)) return;
        try {
            const res = await fetch(`${API}/users/${user.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message);
                loadData();
            } else {
                showToast(data.message, 'error');
            }
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    };

    const handleCreateUser = async (formData) => {
        try {
            const res = await fetch(`${API}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message);
                setModal(null);
                loadData();
            } else {
                showToast(data.message, 'error');
            }
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    };

    const handleEditUser = async (id, formData) => {
        try {
            const res = await fetch(`${API}/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message);
                setModal(null);
                loadData();
            } else {
                showToast(data.message, 'error');
            }
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    };

    const handleResetPassword = async (id, newPassword) => {
        try {
            const res = await fetch(`${API}/users/${id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message);
                setModal(null);
            } else {
                showToast(data.message, 'error');
            }
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    };

    if (loading) return <div className="settings-empty"><p>กำลังโหลด...</p></div>;

    return (
        <>
            <div className="settings-toolbar">
                <div className="settings-search">
                    <Search size={16} style={{ color: '#94a3b8' }} />
                    <input placeholder="ค้นหาชื่อ, username, แผนก..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className="settings-add-btn" onClick={() => setModal({ type: 'create' })}>
                    <UserPlus size={16} /> เพิ่มผู้ใช้ใหม่
                </button>
            </div>

            <div className="settings-table-wrap">
                <table className="settings-table">
                    <thead>
                        <tr>
                            <th>ผู้ใช้งาน</th>
                            <th>แผนก</th>
                            <th>ตำแหน่ง</th>
                            <th style={{ textAlign: 'center' }}>สถานะ</th>
                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr><td colSpan={5}><div className="settings-empty"><p>ไม่พบผู้ใช้งาน</p></div></td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className="settings-user-row">
                                        <div className="settings-avatar">{user.avatar || '??'}</div>
                                        <div className="settings-user-info">
                                            <span className="settings-user-name">{user.displayName}</span>
                                            <span className="settings-user-username">@{user.username}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    {user.department ? (
                                        <span className="settings-badge settings-badge-dept">{user.department}</span>
                                    ) : <span style={{ color: '#94a3b8' }}>—</span>}
                                </td>
                                <td>
                                    <span className="settings-badge settings-badge-role">{getRoleLabelFromList(user.role, roles.length > 0 ? roles : ROLE_OPTIONS_FALLBACK)}</span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <label className="settings-switch">
                                        <input type="checkbox" checked={user.is_active !== false && user.is_active !== 0} onChange={() => handleToggle(user)} />
                                        <span className="settings-switch-slider" />
                                    </label>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <div className="settings-actions" style={{ justifyContent: 'center' }}>
                                        <button className="settings-action-btn" title="แก้ไข" onClick={() => setModal({ type: 'edit', user })}>
                                            <Pencil size={14} />
                                        </button>
                                        <button className="settings-action-btn" title="รีเซ็ตรหัสผ่าน" onClick={() => setModal({ type: 'password', user })}>
                                            <KeyRound size={14} />
                                        </button>
                                        <button className="settings-action-btn danger" title="ลบ" onClick={() => handleDelete(user)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {modal?.type === 'create' && (
                <UserFormModal
                    title="เพิ่มผู้ใช้ใหม่"
                    departments={departments}
                    roles={roles}
                    onClose={() => setModal(null)}
                    onSave={(data) => handleCreateUser(data)}
                    isCreate
                />
            )}
            {modal?.type === 'edit' && (
                <UserFormModal
                    title={`แก้ไข — ${modal.user.displayName}`}
                    departments={departments}
                    roles={roles}
                    user={modal.user}
                    onClose={() => setModal(null)}
                    onSave={(data) => handleEditUser(modal.user.id, data)}
                />
            )}
            {modal?.type === 'password' && (
                <PasswordModal
                    user={modal.user}
                    onClose={() => setModal(null)}
                    onSave={(pw) => handleResetPassword(modal.user.id, pw)}
                />
            )}
        </>
    );
}

// =============================================================================
// Departments Tab
// =============================================================================
function DepartmentsTab({ showToast }) {
    const [departments, setDepartments] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);

    const loadData = useCallback(async () => {
        try {
            const res = await fetch(`${API}/departments?all=true`);
            setDepartments(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filtered = departments.filter(d =>
        d.dept_code?.toLowerCase().includes(search.toLowerCase()) ||
        d.dept_name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleToggle = async (dept) => {
        try {
            const res = await fetch(`${API}/departments/${dept.dept_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: dept.is_active ? 0 : 1 })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message);
                loadData();
            } else {
                showToast(data.message, 'error');
            }
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    };

    const handleDelete = async (dept) => {
        if (!confirm(`ต้องการลบแผนก "${dept.dept_name}" หรือไม่?`)) return;
        try {
            const res = await fetch(`${API}/departments/${dept.dept_id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message);
                loadData();
            } else {
                showToast(data.message, 'error');
            }
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    };

    const handleCreate = async (formData) => {
        try {
            const res = await fetch(`${API}/departments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message);
                setModal(null);
                loadData();
            } else {
                showToast(data.message, 'error');
            }
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    };

    const handleEdit = async (id, formData) => {
        try {
            const res = await fetch(`${API}/departments/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message);
                setModal(null);
                loadData();
            } else {
                showToast(data.message, 'error');
            }
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    };

    if (loading) return <div className="settings-empty"><p>กำลังโหลด...</p></div>;

    return (
        <>
            <div className="settings-toolbar">
                <div className="settings-search">
                    <Search size={16} style={{ color: '#94a3b8' }} />
                    <input placeholder="ค้นหารหัสหรือชื่อแผนก..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className="settings-add-btn" onClick={() => setModal({ type: 'create' })}>
                    <Plus size={16} /> เพิ่มแผนกใหม่
                </button>
            </div>

            <div className="settings-table-wrap">
                <table className="settings-table">
                    <thead>
                        <tr>
                            <th>รหัส</th>
                            <th>ชื่อแผนก</th>
                            <th style={{ textAlign: 'center' }}>จำนวนผู้ใช้</th>
                            <th style={{ textAlign: 'center' }}>สถานะ</th>
                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={5}><div className="settings-empty"><p>ไม่พบแผนก</p></div></td></tr>
                        ) : filtered.map(dept => (
                            <tr key={dept.dept_id}>
                                <td><span className="settings-dept-code">{dept.dept_code}</span></td>
                                <td style={{ fontWeight: 500, color: '#1e293b' }}>{dept.dept_name}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <span className="settings-badge settings-badge-dept">{dept.user_count || 0} คน</span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <label className="settings-switch">
                                        <input type="checkbox" checked={!!dept.is_active} onChange={() => handleToggle(dept)} />
                                        <span className="settings-switch-slider" />
                                    </label>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <div className="settings-actions" style={{ justifyContent: 'center' }}>
                                        <button className="settings-action-btn" title="แก้ไข" onClick={() => setModal({ type: 'edit', dept })}>
                                            <Pencil size={14} />
                                        </button>
                                        <button className="settings-action-btn danger" title="ลบ" onClick={() => handleDelete(dept)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {modal?.type === 'create' && (
                <DeptFormModal
                    title="เพิ่มแผนกใหม่"
                    onClose={() => setModal(null)}
                    onSave={(data) => handleCreate(data)}
                />
            )}
            {modal?.type === 'edit' && (
                <DeptFormModal
                    title={`แก้ไข — ${modal.dept.dept_name}`}
                    dept={modal.dept}
                    onClose={() => setModal(null)}
                    onSave={(data) => handleEdit(modal.dept.dept_id, data)}
                />
            )}
        </>
    );
}

// =============================================================================
// General Tab (Placeholder)
// =============================================================================
function GeneralTab() {
    return (
        <div className="settings-placeholder">
            <div className="settings-placeholder-icon">⚙️</div>
            <h3>กำลังพัฒนา</h3>
            <p>การตั้งค่าทั่วไป เช่น ชื่อบริษัท, โลโก้, ตั้งค่า email จะเพิ่มในเร็วๆ นี้</p>
        </div>
    );
}

// =============================================================================
// Roles Tab
// =============================================================================
function RolesTab({ showToast }) {
    const [roles, setRoles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);

    const loadData = useCallback(async () => {
        try {
            const [rRes, dRes] = await Promise.all([
                fetch(`${API}/roles?all=true`),
                fetch(`${API}/departments`)
            ]);
            setRoles(await rRes.json());
            setDepartments(await dRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filtered = roles.filter(r =>
        r.role_code?.toLowerCase().includes(search.toLowerCase()) ||
        r.role_name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleToggle = async (role) => {
        try {
            const res = await fetch(`${API}/roles/${role.role_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: role.is_active ? 0 : 1 })
            });
            const data = await res.json();
            if (res.ok) { showToast(data.message); loadData(); }
            else showToast(data.message, 'error');
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    };

    const handleDelete = async (role) => {
        if (!confirm(`ต้องการลบตำแหน่ง "${role.role_name}" หรือไม่?`)) return;
        try {
            const res = await fetch(`${API}/roles/${role.role_id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) { showToast(data.message); loadData(); }
            else showToast(data.message, 'error');
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    };

    const handleCreate = async (formData) => {
        try {
            const res = await fetch(`${API}/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) { showToast(data.message); setModal(null); loadData(); }
            else showToast(data.message, 'error');
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    };

    const handleEdit = async (id, formData) => {
        try {
            const res = await fetch(`${API}/roles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) { showToast(data.message); setModal(null); loadData(); }
            else showToast(data.message, 'error');
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    };

    if (loading) return <div className="settings-empty"><p>กำลังโหลด...</p></div>;

    return (
        <>
            <div className="settings-toolbar">
                <div className="settings-search">
                    <Search size={16} style={{ color: '#94a3b8' }} />
                    <input placeholder="ค้นหาตำแหน่ง..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className="settings-add-btn" onClick={() => setModal({ type: 'create' })}>
                    <Plus size={16} /> เพิ่มตำแหน่งใหม่
                </button>
            </div>

            <div className="settings-table-wrap">
                <table className="settings-table">
                    <thead>
                        <tr>
                            <th>รหัส</th>
                            <th>ชื่อตำแหน่ง</th>
                            <th>แผนกที่ใช้</th>
                            <th style={{ textAlign: 'center' }}>สถานะ</th>
                            <th style={{ textAlign: 'center' }}>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={5}><div className="settings-empty"><p>ไม่พบตำแหน่ง</p></div></td></tr>
                        ) : filtered.map(role => (
                            <tr key={role.role_id}>
                                <td><span className="settings-dept-code">{role.role_code}</span></td>
                                <td style={{ fontWeight: 500, color: '#1e293b' }}>{role.role_name}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {(role.dept_codes || []).map(dc => (
                                            <span key={dc} className="settings-badge settings-badge-dept" style={{ fontSize: '11px' }}>{dc}</span>
                                        ))}
                                        {(!role.dept_codes || role.dept_codes.length === 0) && <span style={{ color: '#94a3b8' }}>—</span>}
                                    </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <label className="settings-switch">
                                        <input type="checkbox" checked={!!role.is_active} onChange={() => handleToggle(role)} />
                                        <span className="settings-switch-slider" />
                                    </label>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <div className="settings-actions" style={{ justifyContent: 'center' }}>
                                        <button className="settings-action-btn" title="แก้ไข" onClick={() => setModal({ type: 'edit', role })}>
                                            <Pencil size={14} />
                                        </button>
                                        <button className="settings-action-btn danger" title="ลบ" onClick={() => handleDelete(role)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal?.type === 'create' && (
                <RoleFormModal
                    title="เพิ่มตำแหน่งใหม่"
                    departments={departments}
                    onClose={() => setModal(null)}
                    onSave={handleCreate}
                />
            )}
            {modal?.type === 'edit' && (
                <RoleFormModal
                    title={`แก้ไข — ${modal.role.role_name}`}
                    departments={departments}
                    role={modal.role}
                    onClose={() => setModal(null)}
                    onSave={(data) => handleEdit(modal.role.role_id, data)}
                />
            )}
        </>
    );
}

// =============================================================================
// User Form Modal (Create / Edit)
// =============================================================================
function UserFormModal({ title, departments, roles, user, onClose, onSave, isCreate }) {
    const [form, setForm] = useState({
        displayName: user?.displayName || '',
        username: user?.username || '',
        password: '',
        role: user?.role || '',
        department: user?.department || '',
    });
    const [saving, setSaving] = useState(false);

    // Filter roles by selected department (from DB data)
    const getAvailableRoles = (deptCode) => {
        if (!deptCode || !roles || roles.length === 0) return roles || [];
        return roles.filter(r => r.dept_codes && r.dept_codes.includes(deptCode));
    };

    const availableRoles = getAvailableRoles(form.department);

    const handleSubmit = async () => {
        if (!form.displayName) return;
        if (isCreate && (!form.username || !form.password)) return;
        setSaving(true);
        await onSave(form);
        setSaving(false);
    };

    return (
        <div className="settings-modal-backdrop" onClick={onClose}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
                <div className="settings-modal-header">
                    <h2>{title}</h2>
                    <button className="settings-modal-close" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="settings-modal-body">
                    <div className="settings-field">
                        <label>ชื่อ-นามสกุล</label>
                        <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="กรอกชื่อ-นามสกุล" />
                    </div>
                    {isCreate && (
                        <>
                            <div className="settings-field">
                                <label>Username</label>
                                <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="กรอก username" />
                            </div>
                            <div className="settings-field">
                                <label>รหัสผ่าน</label>
                                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="กรอกรหัสผ่าน" />
                            </div>
                        </>
                    )}
                    <div className="settings-field">
                        <label>แผนก</label>
                        <select value={form.department} onChange={e => {
                            const newDept = e.target.value;
                            const deptRoles = getAvailableRoles(newDept);
                            const newRole = deptRoles.some(r => r.role_code === form.role)
                                ? form.role
                                : (deptRoles[0]?.role_code || '');
                            setForm({ ...form, department: newDept, role: newRole });
                        }}>
                            <option value="">— ไม่ระบุ —</option>
                            {departments.map(d => (
                                <option key={d.dept_code} value={d.dept_code}>{d.dept_code} — {d.dept_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="settings-field">
                        <label>ตำแหน่ง (Role)</label>
                        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                            <option value="">— เลือกตำแหน่ง —</option>
                            {availableRoles.map(r => (
                                <option key={r.role_code} value={r.role_code}>{r.role_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="settings-modal-footer">
                    <button className="settings-btn-cancel" onClick={onClose}>ยกเลิก</button>
                    <button className="settings-btn-save" onClick={handleSubmit} disabled={saving}>
                        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Password Reset Modal
// =============================================================================
function PasswordModal({ user, onClose, onSave }) {
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!password || password.length < 4) return;
        setSaving(true);
        await onSave(password);
        setSaving(false);
    };

    return (
        <div className="settings-modal-backdrop" onClick={onClose}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
                <div className="settings-modal-header">
                    <h2>รีเซ็ตรหัสผ่าน — {user.displayName}</h2>
                    <button className="settings-modal-close" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="settings-modal-body">
                    <div className="settings-field">
                        <label>รหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="กรอกรหัสผ่านใหม่" autoFocus />
                    </div>
                </div>
                <div className="settings-modal-footer">
                    <button className="settings-btn-cancel" onClick={onClose}>ยกเลิก</button>
                    <button className="settings-btn-save settings-btn-danger" onClick={handleSubmit} disabled={saving || password.length < 4}>
                        {saving ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Department Form Modal (Create / Edit)
// =============================================================================
function DeptFormModal({ title, dept, onClose, onSave }) {
    const [form, setForm] = useState({
        dept_code: dept?.dept_code || '',
        dept_name: dept?.dept_name || '',
    });
    const [saving, setSaving] = useState(false);
    const isEdit = !!dept;

    const handleSubmit = async () => {
        if (!form.dept_name) return;
        if (!isEdit && !form.dept_code) return;
        setSaving(true);
        await onSave(isEdit ? { dept_name: form.dept_name } : form);
        setSaving(false);
    };

    return (
        <div className="settings-modal-backdrop" onClick={onClose}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
                <div className="settings-modal-header">
                    <h2>{title}</h2>
                    <button className="settings-modal-close" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="settings-modal-body">
                    <div className="settings-field">
                        <label>รหัสแผนก</label>
                        <input
                            value={form.dept_code}
                            onChange={e => setForm({ ...form, dept_code: e.target.value.toUpperCase() })}
                            placeholder="เช่น HR, QC, IT"
                            disabled={isEdit}
                            style={isEdit ? { background: '#f1f5f9', color: '#94a3b8' } : {}}
                            maxLength={10}
                        />
                    </div>
                    <div className="settings-field">
                        <label>ชื่อแผนก</label>
                        <input value={form.dept_name} onChange={e => setForm({ ...form, dept_name: e.target.value })} placeholder="เช่น ฝ่ายบุคคล" autoFocus />
                    </div>
                </div>
                <div className="settings-modal-footer">
                    <button className="settings-btn-cancel" onClick={onClose}>ยกเลิก</button>
                    <button className="settings-btn-save" onClick={handleSubmit} disabled={saving}>
                        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Role Form Modal (Create / Edit) — with multi-dept checkbox
// =============================================================================
function RoleFormModal({ title, departments, role, onClose, onSave }) {
    const [form, setForm] = useState({
        role_code: role?.role_code || '',
        role_name: role?.role_name || '',
        dept_codes: role?.dept_codes || [],
    });
    const [saving, setSaving] = useState(false);
    const isEdit = !!role;

    const toggleDept = (deptCode) => {
        setForm(prev => ({
            ...prev,
            dept_codes: prev.dept_codes.includes(deptCode)
                ? prev.dept_codes.filter(d => d !== deptCode)
                : [...prev.dept_codes, deptCode]
        }));
    };

    const handleSubmit = async () => {
        if (!form.role_name) return;
        if (!isEdit && !form.role_code) return;
        setSaving(true);
        await onSave(isEdit ? { role_name: form.role_name, dept_codes: form.dept_codes } : form);
        setSaving(false);
    };

    return (
        <div className="settings-modal-backdrop" onClick={onClose}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
                <div className="settings-modal-header">
                    <h2>{title}</h2>
                    <button className="settings-modal-close" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="settings-modal-body">
                    <div className="settings-field">
                        <label>รหัสตำแหน่ง</label>
                        <input
                            value={form.role_code}
                            onChange={e => setForm({ ...form, role_code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                            placeholder="เช่น supervisor, technician"
                            disabled={isEdit}
                            style={isEdit ? { background: '#f1f5f9', color: '#94a3b8' } : {}}
                            maxLength={50}
                        />
                    </div>
                    <div className="settings-field">
                        <label>ชื่อตำแหน่ง</label>
                        <input value={form.role_name} onChange={e => setForm({ ...form, role_name: e.target.value })} placeholder="เช่น ซูเปอร์ไวเซอร์" autoFocus />
                    </div>
                    <div className="settings-field">
                        <label>แผนกที่ใช้ตำแหน่งนี้ (เลือกได้หลายแผนก)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                            {departments.map(d => (
                                <label key={d.dept_code} style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    padding: '5px 10px', borderRadius: '8px', cursor: 'pointer',
                                    fontSize: '12.5px', fontWeight: 500,
                                    background: form.dept_codes.includes(d.dept_code) ? '#eff6ff' : '#f8fafc',
                                    border: `1.5px solid ${form.dept_codes.includes(d.dept_code) ? '#3b82f6' : '#e2e8f0'}`,
                                    color: form.dept_codes.includes(d.dept_code) ? '#2563eb' : '#64748b',
                                    transition: 'all 0.15s'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={form.dept_codes.includes(d.dept_code)}
                                        onChange={() => toggleDept(d.dept_code)}
                                        style={{ display: 'none' }}
                                    />
                                    {form.dept_codes.includes(d.dept_code) ? '✓' : ''} {d.dept_code}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="settings-modal-footer">
                    <button className="settings-btn-cancel" onClick={onClose}>ยกเลิก</button>
                    <button className="settings-btn-save" onClick={handleSubmit} disabled={saving}>
                        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
}

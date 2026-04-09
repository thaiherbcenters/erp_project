/**
 * =============================================================================
 * HR.jsx — หน้าบุคลากร (Human Resources)
 * =============================================================================
 *
 * Tab hr_profile: Employee Profile — ข้อมูลพนักงานจาก Database จริง
 * Tab hr_dashboard / hr_attendance: ยังคง mock (จะทำ phase ถัดไป)
 *
 * =============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Users, UserPlus, Search, Eye, Pencil, Trash2, X, Printer,
    User, Briefcase, GraduationCap, CreditCard, Phone, ShieldCheck, Building2,
    Clock, CalendarDays, CheckCircle2, XCircle, AlertTriangle, Timer, FileDown,
    Plus, Filter, ChevronDown
} from 'lucide-react';
import API_BASE from '../config';
import './PageCommon.css';
import './HR.css';

// ── Constants ──
const PREFIX_OPTIONS = ['นาย', 'นาง', 'นางสาว'];
const GENDER_OPTIONS = ['ชาย', 'หญิง', 'อื่นๆ'];
const EMPLOYMENT_TYPES = ['พนักงานประจำ', 'สัญญาจ้าง', 'ทดลองงาน', 'Part-time'];
const STATUS_OPTIONS = ['ปฏิบัติงาน', 'ลาออก', 'พักงาน', 'ให้ออก'];

const EMPTY_FORM = {
    prefix: '', first_name: '', last_name: '', nickname: '', gender: '',
    date_of_birth: '', national_id: '', phone: '', email: '', address: '',
    department_code: '', position: '', employment_type: 'พนักงานประจำ',
    start_date: '', end_date: '', probation_end_date: '', salary: '',
    education_level: '', education_institute: '', education_major: '',
    bank_name: '', bank_account_number: '', bank_account_name: '',
    social_security_id: '', tax_id: '',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
    status: 'ปฏิบัติงาน', CompanyID: '',
};

// ── Helper: format date for display ──
function fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return d; }
}

function fmtDateInput(d) {
    if (!d) return '';
    try { return new Date(d).toISOString().split('T')[0]; }
    catch { return ''; }
}

function getAvatar(emp) {
    if (!emp) return '??';
    if (emp.profile_image_url) {
        return <img src={`${API_BASE.replace('/api', '')}${emp.profile_image_url}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />;
    }
    const f = emp.first_name?.[0] || '';
    const l = emp.last_name?.[0] || '';
    return (f + l).toUpperCase() || '??';
}

function getStatusClass(status) {
    switch (status) {
        case 'ปฏิบัติงาน': return 'badge-success';
        case 'ลาออก': return 'badge-danger';
        case 'พักงาน': return 'badge-warning';
        case 'ให้ออก': return 'badge-danger';
        default: return 'badge-neutral';
    }
}

function getEmploymentBadge(type) {
    switch (type) {
        case 'พนักงานประจำ': return 'badge-permanent';
        case 'สัญญาจ้าง': return 'badge-contract';
        case 'ทดลองงาน': return 'badge-probation';
        case 'Part-time': return 'badge-parttime';
        default: return '';
    }
}

// =============================================================================
// EmployeeProfile Tab Component
// =============================================================================
function EmployeeProfileTab({ hasSectionPermission }) {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [modalMode, setModalMode] = useState(null); // null | 'add' | 'edit' | 'view'
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const fileInputRef = useRef(null);

    // ── Fetch employees ──
    const fetchEmployees = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/employees`);
            if (res.ok) {
                setEmployees(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch employees:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Fetch departments ──
    const fetchDepartments = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/departments`);
            if (res.ok) setDepartments(await res.json());
        } catch (err) {
            console.error('Failed to fetch departments:', err);
        }
    }, []);

    // ── Fetch companies ──
    const fetchCompanies = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/companies`);
            if (res.ok) setCompanies(await res.json());
        } catch (err) {
            console.error('Failed to fetch companies:', err);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
        fetchDepartments();
        fetchCompanies();
    }, [fetchEmployees, fetchDepartments, fetchCompanies]);

    // ── Search filter ──
    const filtered = employees.filter(emp => {
        const q = searchQuery.toLowerCase();
        return (
            emp.employee_code?.toLowerCase().includes(q) ||
            emp.first_name?.toLowerCase().includes(q) ||
            emp.last_name?.toLowerCase().includes(q) ||
            emp.nickname?.toLowerCase().includes(q) ||
            emp.position?.toLowerCase().includes(q) ||
            emp.department_name?.toLowerCase().includes(q) ||
            emp.department_code?.toLowerCase().includes(q) ||
            emp.CompanyName?.toLowerCase().includes(q)
        );
    });

    // ── Stats ──
    const totalActive = employees.filter(e => e.status === 'ปฏิบัติงาน').length;
    const totalProbation = employees.filter(e => e.employment_type === 'ทดลองงาน').length;
    const totalResigned = employees.filter(e => e.status === 'ลาออก').length;

    // ── Open modals ──
    const openAddModal = () => {
        setFormData({ ...EMPTY_FORM });
        setError('');
        setAvatarFile(null);
        setAvatarPreview(null);
        setModalMode('add');
    };

    const openEditModal = (emp) => {
        setFormData({
            prefix: emp.prefix || '',
            first_name: emp.first_name || '',
            last_name: emp.last_name || '',
            nickname: emp.nickname || '',
            gender: emp.gender || '',
            date_of_birth: fmtDateInput(emp.date_of_birth),
            national_id: emp.national_id || '',
            phone: emp.phone || '',
            email: emp.email || '',
            address: emp.address || '',
            department_code: emp.department_code || '',
            position: emp.position || '',
            employment_type: emp.employment_type || 'พนักงานประจำ',
            start_date: fmtDateInput(emp.start_date),
            end_date: fmtDateInput(emp.end_date),
            probation_end_date: fmtDateInput(emp.probation_end_date),
            salary: emp.salary || '',
            education_level: emp.education_level || '',
            education_institute: emp.education_institute || '',
            education_major: emp.education_major || '',
            bank_name: emp.bank_name || '',
            bank_account_number: emp.bank_account_number || '',
            bank_account_name: emp.bank_account_name || '',
            social_security_id: emp.social_security_id || '',
            tax_id: emp.tax_id || '',
            emergency_contact_name: emp.emergency_contact_name || '',
            emergency_contact_phone: emp.emergency_contact_phone || '',
            emergency_contact_relation: emp.emergency_contact_relation || '',
            status: emp.status || 'ปฏิบัติงาน',
            CompanyID: emp.CompanyID || '',
        });
        setSelectedEmployee(emp);
        setError('');
        setAvatarFile(null);
        setAvatarPreview(emp.profile_image_url ? `${API_BASE.replace('/api', '')}${emp.profile_image_url}` : null);
        setModalMode('edit');
    };

    const openViewModal = (emp) => {
        setSelectedEmployee(emp);
        setModalMode('view');
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedEmployee(null);
        setError('');
        setAvatarFile(null);
        setAvatarPreview(null);
    };

    // ── Avatar Handlers ──
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('ขนาดไฟล์ต้องไม่เกิน 5MB');
            return;
        }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        setError('');
    };

    const removeAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Save (Add / Edit) ──
    const handleSave = async () => {
        setError('');
        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            setError('กรุณากรอกชื่อและนามสกุล');
            return;
        }
        setSaving(true);
        try {
            const url = modalMode === 'add'
                ? `${API_BASE}/employees`
                : `${API_BASE}/employees/${selectedEmployee.employee_id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';

            const body = { ...formData };
            // Convert empty strings to null for date/number fields
            ['date_of_birth', 'start_date', 'end_date', 'probation_end_date', 'CompanyID'].forEach(k => {
                if (!body[k]) body[k] = null;
            });
            if (!body.salary) body.salary = null;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (res.ok) {
                const newEmpId = modalMode === 'add' ? data.employee.employee_id : selectedEmployee.employee_id;
                
                // Upload avatar if selected
                if (avatarFile) {
                    const avatarData = new FormData();
                    avatarData.append('avatar', avatarFile);
                    const avatarRes = await fetch(`${API_BASE}/employees/${newEmpId}/avatar`, {
                        method: 'POST',
                        body: avatarData,
                    });
                    if (!avatarRes.ok) {
                        const errData = await avatarRes.json();
                        alert(`บันทึกข้อมูลพนักงานสำเร็จ แต่มีปัญหาในการอัพโหลดรูป: ${errData.message}`);
                    }
                }

                await fetchEmployees();
                closeModal();
            } else {
                setError(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (err) {
            setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ──
    const handleDelete = async (emp) => {
        if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบพนักงาน "${emp.first_name} ${emp.last_name}" (${emp.employee_code})?`)) {
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/employees/${emp.employee_id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchEmployees();
            } else {
                const data = await res.json();
                alert(data.message || 'เกิดข้อผิดพลาดในการลบ');
            }
        } catch (err) {
            alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        }
    };

    // ── Form field helper ──
    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="subpage-content" key="hr_profile">

            {/* Stats Bar */}
            <div className="hr-stats-bar">
                <div className="hr-stat-chip">
                    <Users size={14} /> ทั้งหมด <span className="hr-stat-num">{employees.length}</span>
                </div>
                <div className="hr-stat-chip">
                    <span style={{ color: '#16a34a' }}>●</span> ปฏิบัติงาน <span className="hr-stat-num">{totalActive}</span>
                </div>
                <div className="hr-stat-chip">
                    <span style={{ color: '#d97706' }}>●</span> ทดลองงาน <span className="hr-stat-num">{totalProbation}</span>
                </div>
                <div className="hr-stat-chip">
                    <span style={{ color: '#dc2626' }}>●</span> ลาออก <span className="hr-stat-num">{totalResigned}</span>
                </div>
            </div>

            {/* Toolbar */}
            {hasSectionPermission('hr_profile_search') && (
                <div className="toolbar">
                    <div className="search-box">
                        <Search size={14} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ, รหัส, ตำแหน่ง, แผนก..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary" onClick={openAddModal}>
                        <UserPlus size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        เพิ่มพนักงาน
                    </button>
                </div>
            )}

            {/* Table */}
            {hasSectionPermission('hr_profile_table') && (
                <div className="table-card card">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                            กำลังโหลดข้อมูล...
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>รหัส</th>
                                    <th>ชื่อ-สกุล</th>
                                    <th>ชื่อเล่น</th>
                                    <th>บริษัท</th>
                                    <th>แผนก</th>
                                    <th>ตำแหน่ง</th>
                                    <th>ประเภท</th>
                                    <th>สถานะ</th>
                                    <th style={{ textAlign: 'center' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                                            {searchQuery ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา' : 'ยังไม่มีข้อมูลพนักงาน'}
                                        </td>
                                    </tr>
                                ) : filtered.map(emp => (
                                    <tr key={emp.employee_id}>
                                        <td>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#6366f1', fontSize: '12px', background: '#eef2ff', padding: '2px 8px', borderRadius: '4px' }}>
                                                {emp.employee_code}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="hr-employee-info">
                                                <span className="hr-employee-name">
                                                    {emp.prefix}{emp.first_name} {emp.last_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ color: emp.nickname ? '#475569' : '#cbd5e1' }}>
                                            {emp.nickname || '—'}
                                        </td>
                                        <td>{emp.CompanyName || '—'}</td>
                                        <td>{emp.department_name || emp.department_code || '—'}</td>
                                        <td>{emp.position || '—'}</td>
                                        <td>
                                            <span className={`badge-employment ${getEmploymentBadge(emp.employment_type)}`}>
                                                {emp.employment_type || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusClass(emp.status)}`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="hr-actions">
                                                <button className="hr-action-btn view" title="ดูรายละเอียด" onClick={() => openViewModal(emp)}>
                                                    <Eye size={14} />
                                                </button>
                                                <button className="hr-action-btn edit" title="แก้ไข" onClick={() => openEditModal(emp)}>
                                                    <Pencil size={14} />
                                                </button>
                                                <button className="hr-action-btn delete" title="ลบ" onClick={() => handleDelete(emp)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* Modal: Add / Edit Employee                               */}
            {/* ══════════════════════════════════════════════════════════ */}
            {(modalMode === 'add' || modalMode === 'edit') && (
                <div className="hr-modal-overlay" onClick={closeModal}>
                    <div className="hr-modal" onClick={e => e.stopPropagation()}>
                        <div className="hr-modal-header">
                            <h2>
                                {modalMode === 'add' ? <><UserPlus size={18} /> เพิ่มพนักงานใหม่</> : <><Pencil size={18} /> แก้ไขข้อมูลพนักงาน</>}
                            </h2>
                            <button className="hr-modal-close" onClick={closeModal}><X size={18} /></button>
                        </div>

                        <div className="hr-modal-body">
                            {error && <div className="hr-error">{error}</div>}

                            {/* ── Avatar Upload ── */}
                            <div className="hr-avatar-upload-container">
                                <div className={`hr-avatar-upload-preview ${avatarPreview ? 'has-image' : ''}`} onClick={() => fileInputRef.current?.click()}>
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Preview" />
                                    ) : (
                                        <User size={40} strokeWidth={1.5} />
                                    )}
                                    <div className="hr-avatar-upload-overlay">
                                        <Pencil size={18} style={{ marginBottom: 4 }} />
                                        เปลี่ยนรูป
                                    </div>
                                </div>
                                
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleAvatarChange} 
                                    accept="image/*" 
                                    className="hr-avatar-file-input"
                                />
                                
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" className="hr-avatar-upload-btn" onClick={() => fileInputRef.current?.click()}>
                                        เลือกไฟล์รูปภาพ
                                    </button>
                                    {avatarPreview && (
                                        <button type="button" className="hr-avatar-remove-btn" onClick={removeAvatar}>
                                            ลบรูป
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* ── ข้อมูลส่วนตัว ── */}
                            <div className="hr-form-section">
                                <div className="hr-form-section-title"><User size={14} /> ข้อมูลส่วนตัว</div>
                                <div className="hr-form-grid">
                                    <div className="hr-form-group">
                                        <label>คำนำหน้า</label>
                                        <select value={formData.prefix} onChange={e => updateField('prefix', e.target.value)}>
                                            <option value="">เลือก</option>
                                            {PREFIX_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div className="hr-form-group">
                                        <label>ชื่อ *</label>
                                        <input type="text" value={formData.first_name} onChange={e => updateField('first_name', e.target.value)} placeholder="ชื่อจริง" required />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>นามสกุล *</label>
                                        <input type="text" value={formData.last_name} onChange={e => updateField('last_name', e.target.value)} placeholder="นามสกุล" required />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>ชื่อเล่น</label>
                                        <input type="text" value={formData.nickname} onChange={e => updateField('nickname', e.target.value)} placeholder="ชื่อเล่น" />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>เพศ</label>
                                        <select value={formData.gender} onChange={e => updateField('gender', e.target.value)}>
                                            <option value="">เลือก</option>
                                            {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    <div className="hr-form-group">
                                        <label>วันเกิด</label>
                                        <input type="date" value={formData.date_of_birth} onChange={e => updateField('date_of_birth', e.target.value)} />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>เลขบัตรประชาชน</label>
                                        <input type="text" value={formData.national_id} onChange={e => updateField('national_id', e.target.value)} placeholder="1-xxxx-xxxxx-xx-x" maxLength={13} />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>เบอร์โทร</label>
                                        <input type="text" value={formData.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0xx-xxx-xxxx" />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>อีเมล</label>
                                        <input type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} placeholder="email@company.com" />
                                    </div>
                                    <div className="hr-form-group full-width">
                                        <label>ที่อยู่</label>
                                        <textarea value={formData.address} onChange={e => updateField('address', e.target.value)} placeholder="ที่อยู่ปัจจุบัน" />
                                    </div>
                                </div>
                            </div>

                            {/* ── ข้อมูลการจ้างงาน ── */}
                            <div className="hr-form-section">
                                <div className="hr-form-section-title"><Briefcase size={14} /> ข้อมูลการจ้างงาน</div>
                                <div className="hr-form-grid">
                                    <div className="hr-form-group">
                                        <label>บริษัท</label>
                                        <select value={formData.CompanyID} onChange={e => updateField('CompanyID', e.target.value)}>
                                            <option value="">เลือกบริษัท</option>
                                            {companies.map(c => (
                                                <option key={c.CompanyID} value={c.CompanyID}>{c.CompanyName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="hr-form-group">
                                        <label>แผนก</label>
                                        <select value={formData.department_code} onChange={e => updateField('department_code', e.target.value)}>
                                            <option value="">เลือกแผนก</option>
                                            {departments.map(d => (
                                                <option key={d.dept_code} value={d.dept_code}>{d.dept_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="hr-form-group">
                                        <label>ตำแหน่ง</label>
                                        <input type="text" value={formData.position} onChange={e => updateField('position', e.target.value)} placeholder="ตำแหน่งงาน" />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>ประเภทพนักงาน</label>
                                        <select value={formData.employment_type} onChange={e => updateField('employment_type', e.target.value)}>
                                            {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="hr-form-group">
                                        <label>วันเริ่มงาน</label>
                                        <input type="date" value={formData.start_date} onChange={e => updateField('start_date', e.target.value)} />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>วันสิ้นสุดสัญญา</label>
                                        <input type="date" value={formData.end_date} onChange={e => updateField('end_date', e.target.value)} />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>วันสิ้นสุดทดลองงาน</label>
                                        <input type="date" value={formData.probation_end_date} onChange={e => updateField('probation_end_date', e.target.value)} />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>เงินเดือน (บาท)</label>
                                        <input type="number" value={formData.salary} onChange={e => updateField('salary', e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>สถานะ</label>
                                        <select value={formData.status} onChange={e => updateField('status', e.target.value)}>
                                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* ── วุฒิการศึกษา ── */}
                            <div className="hr-form-section">
                                <div className="hr-form-section-title"><GraduationCap size={14} /> วุฒิการศึกษา</div>
                                <div className="hr-form-grid">
                                    <div className="hr-form-group">
                                        <label>ระดับการศึกษา</label>
                                        <select value={formData.education_level} onChange={e => updateField('education_level', e.target.value)}>
                                            <option value="">เลือก</option>
                                            <option value="ต่ำกว่า ม.6">ต่ำกว่า ม.6</option>
                                            <option value="ม.6 / ปวช.">ม.6 / ปวช.</option>
                                            <option value="ปวส.">ปวส.</option>
                                            <option value="ปริญญาตรี">ปริญญาตรี</option>
                                            <option value="ปริญญาโท">ปริญญาโท</option>
                                            <option value="ปริญญาเอก">ปริญญาเอก</option>
                                        </select>
                                    </div>
                                    <div className="hr-form-group">
                                        <label>สถาบันการศึกษา</label>
                                        <input type="text" value={formData.education_institute} onChange={e => updateField('education_institute', e.target.value)} placeholder="ชื่อสถาบัน" />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>สาขาวิชา</label>
                                        <input type="text" value={formData.education_major} onChange={e => updateField('education_major', e.target.value)} placeholder="สาขาวิชาเอก" />
                                    </div>
                                </div>
                            </div>

                            {/* ── บัญชีธนาคาร ── */}
                            <div className="hr-form-section">
                                <div className="hr-form-section-title"><CreditCard size={14} /> บัญชีธนาคาร</div>
                                <div className="hr-form-grid">
                                    <div className="hr-form-group">
                                        <label>ชื่อธนาคาร</label>
                                        <select value={formData.bank_name} onChange={e => updateField('bank_name', e.target.value)}>
                                            <option value="">เลือก</option>
                                            <option value="กรุงไทย">กรุงไทย</option>
                                            <option value="กสิกรไทย">กสิกรไทย</option>
                                            <option value="ไทยพาณิชย์">ไทยพาณิชย์</option>
                                            <option value="กรุงเทพ">กรุงเทพ</option>
                                            <option value="กรุงศรีอยุธยา">กรุงศรีอยุธยา</option>
                                            <option value="ทหารไทยธนชาต">ทหารไทยธนชาต</option>
                                            <option value="ออมสิน">ออมสิน</option>
                                            <option value="อื่นๆ">อื่นๆ</option>
                                        </select>
                                    </div>
                                    <div className="hr-form-group">
                                        <label>เลขบัญชี</label>
                                        <input type="text" value={formData.bank_account_number} onChange={e => updateField('bank_account_number', e.target.value)} placeholder="xxx-x-xxxxx-x" />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>ชื่อบัญชี</label>
                                        <input type="text" value={formData.bank_account_name} onChange={e => updateField('bank_account_name', e.target.value)} placeholder="ชื่อเจ้าของบัญชี" />
                                    </div>
                                </div>
                            </div>

                            {/* ── ประกันสังคม / ภาษี ── */}
                            <div className="hr-form-section">
                                <div className="hr-form-section-title"><ShieldCheck size={14} /> ประกันสังคม / ภาษี</div>
                                <div className="hr-form-grid hr-form-grid-2">
                                    <div className="hr-form-group">
                                        <label>เลขประกันสังคม</label>
                                        <input type="text" value={formData.social_security_id} onChange={e => updateField('social_security_id', e.target.value)} />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>เลขผู้เสียภาษี</label>
                                        <input type="text" value={formData.tax_id} onChange={e => updateField('tax_id', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* ── ผู้ติดต่อฉุกเฉิน ── */}
                            <div className="hr-form-section">
                                <div className="hr-form-section-title"><Phone size={14} /> ผู้ติดต่อฉุกเฉิน</div>
                                <div className="hr-form-grid">
                                    <div className="hr-form-group">
                                        <label>ชื่อผู้ติดต่อ</label>
                                        <input type="text" value={formData.emergency_contact_name} onChange={e => updateField('emergency_contact_name', e.target.value)} />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>เบอร์โทร</label>
                                        <input type="text" value={formData.emergency_contact_phone} onChange={e => updateField('emergency_contact_phone', e.target.value)} />
                                    </div>
                                    <div className="hr-form-group">
                                        <label>ความสัมพันธ์</label>
                                        <input type="text" value={formData.emergency_contact_relation} onChange={e => updateField('emergency_contact_relation', e.target.value)} placeholder="เช่น บิดา, มารดา, คู่สมรส" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="hr-modal-footer">
                            <button className="hr-btn-cancel" onClick={closeModal}>ยกเลิก</button>
                            <button className="hr-btn hr-btn-save" onClick={handleSave} disabled={saving}>
                                {saving ? 'กำลังบันทึก...' : modalMode === 'add' ? 'เพิ่มพนักงาน' : 'บันทึกการแก้ไข'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* Modal: View Employee Detail                              */}
            {/* ══════════════════════════════════════════════════════════ */}
            {modalMode === 'view' && selectedEmployee && (
                <div className="hr-modal-overlay" onClick={closeModal}>
                    <div className="hr-modal" onClick={e => e.stopPropagation()}>
                        <div className="hr-modal-header">
                            <h2><Eye size={18} /> รายละเอียดพนักงาน</h2>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="hr-modal-close" onClick={() => window.print()} title="พิมพ์ข้อมูลพนักงาน">
                                    <Printer size={18} />
                                </button>
                                <button className="hr-modal-close" onClick={closeModal} title="ปิด">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="hr-modal-body">
                            {/* Header */}
                            <div className="hr-detail-header">
                                <div className="hr-detail-avatar">{getAvatar(selectedEmployee)}</div>
                                <div className="hr-detail-name">
                                    <h3>{selectedEmployee.prefix}{selectedEmployee.first_name} {selectedEmployee.last_name} {selectedEmployee.nickname ? `(${selectedEmployee.nickname})` : ''}</h3>
                                    <p>{selectedEmployee.employee_code} · {selectedEmployee.position || '—'} · {selectedEmployee.department_name || selectedEmployee.department_code || '—'} · {selectedEmployee.CompanyName || 'ไม่มีระบุบริษัท'}</p>
                                </div>
                                <span className={`badge ${getStatusClass(selectedEmployee.status)}`} style={{ fontSize: '12px', padding: '4px 12px' }}>
                                    {selectedEmployee.status}
                                </span>
                            </div>

                            {/* ข้อมูลส่วนตัว */}
                            <div className="hr-form-section">
                                <div className="hr-form-section-title"><User size={14} /> ข้อมูลส่วนตัว</div>
                                <div className="hr-detail-grid">
                                    <DetailItem label="เพศ" value={selectedEmployee.gender} />
                                    <DetailItem label="วันเกิด" value={fmtDate(selectedEmployee.date_of_birth)} />
                                    <DetailItem label="เลขบัตรประชาชน" value={selectedEmployee.national_id} />
                                    <DetailItem label="เบอร์โทร" value={selectedEmployee.phone} />
                                    <DetailItem label="อีเมล" value={selectedEmployee.email} />
                                    <DetailItem label="ที่อยู่" value={selectedEmployee.address} />
                                </div>
                            </div>

                            {/* ข้อมูลการจ้างงาน */}
                            <div className="hr-form-section">
                                <div className="hr-form-section-title"><Briefcase size={14} /> ข้อมูลการจ้างงาน</div>
                                <div className="hr-detail-grid">
                                    <DetailItem label="บริษัท" value={selectedEmployee.CompanyName} />
                                    <DetailItem label="ประเภทพนักงาน" value={selectedEmployee.employment_type} />
                                    <DetailItem label="วันเริ่มงาน" value={fmtDate(selectedEmployee.start_date)} />
                                    <DetailItem label="วันสิ้นสุดสัญญา" value={fmtDate(selectedEmployee.end_date)} />
                                    <DetailItem label="วันสิ้นสุดทดลองงาน" value={fmtDate(selectedEmployee.probation_end_date)} />
                                    <DetailItem label="เงินเดือน" value={selectedEmployee.salary ? `${Number(selectedEmployee.salary).toLocaleString()} บาท` : null} />
                                </div>
                            </div>

                            {/* วุฒิการศึกษา */}
                            <div className="hr-form-section">
                                <div className="hr-form-section-title"><GraduationCap size={14} /> วุฒิการศึกษา</div>
                                <div className="hr-detail-grid">
                                    <DetailItem label="ระดับการศึกษา" value={selectedEmployee.education_level} />
                                    <DetailItem label="สถาบันการศึกษา" value={selectedEmployee.education_institute} />
                                    <DetailItem label="สาขาวิชา" value={selectedEmployee.education_major} />
                                </div>
                            </div>

                            {/* บัญชีธนาคาร */}
                            <div className="hr-form-section">
                                <div className="hr-form-section-title"><CreditCard size={14} /> บัญชีธนาคาร</div>
                                <div className="hr-detail-grid">
                                    <DetailItem label="ธนาคาร" value={selectedEmployee.bank_name} />
                                    <DetailItem label="เลขบัญชี" value={selectedEmployee.bank_account_number} />
                                    <DetailItem label="ชื่อบัญชี" value={selectedEmployee.bank_account_name} />
                                </div>
                            </div>

                            {/* ประกันสังคม */}
                            <div className="hr-form-section">
                                <div className="hr-form-section-title"><ShieldCheck size={14} /> ประกันสังคม / ภาษี</div>
                                <div className="hr-detail-grid">
                                    <DetailItem label="เลขประกันสังคม" value={selectedEmployee.social_security_id} />
                                    <DetailItem label="เลขผู้เสียภาษี" value={selectedEmployee.tax_id} />
                                </div>
                            </div>

                            {/* ผู้ติดต่อฉุกเฉิน */}
                            <div className="hr-form-section">
                                <div className="hr-form-section-title"><Phone size={14} /> ผู้ติดต่อฉุกเฉิน</div>
                                <div className="hr-detail-grid">
                                    <DetailItem label="ชื่อผู้ติดต่อ" value={selectedEmployee.emergency_contact_name} />
                                    <DetailItem label="เบอร์โทร" value={selectedEmployee.emergency_contact_phone} />
                                    <DetailItem label="ความสัมพันธ์" value={selectedEmployee.emergency_contact_relation} />
                                </div>
                            </div>
                        </div>

                        <div className="hr-modal-footer">
                            <button className="hr-btn-cancel" onClick={closeModal}>ปิด</button>
                            <button className="hr-btn hr-btn-save" onClick={() => { closeModal(); setTimeout(() => openEditModal(selectedEmployee), 100); }}>
                                <Pencil size={14} /> แก้ไข
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Detail Item Component ──
function DetailItem({ label, value }) {
    return (
        <div className="hr-detail-item">
            <span className="hr-detail-label">{label}</span>
            <span className={`hr-detail-value ${!value || value === '—' ? 'empty' : ''}`}>
                {value || '— ไม่ระบุ —'}
            </span>
        </div>
    );
}


// =============================================================================
// AttendanceTab Component — เวลาเข้า-ออกงาน (Database จริง)
// =============================================================================
function AttendanceTab({ hasSectionPermission }) {
    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [formData, setFormData] = useState({
        employee_id: '', date: new Date().toISOString().split('T')[0],
        check_in: '08:30', check_out: '17:30', status: 'ปกติ', ot_hours: 0, note: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Leave modal
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [leaveForm, setLeaveForm] = useState({
        employee_id: '', leave_type: 'ลาป่วย', start_date: '', end_date: '', total_days: 1, reason: ''
    });
    const [leaveRecords, setLeaveRecords] = useState([]);
    const [leaveBalances, setLeaveBalances] = useState([]);
    const [selectedLeaveEmp, setSelectedLeaveEmp] = useState('');

    const ATTENDANCE_STATUSES = ['ปกติ', 'สาย', 'ขาด', 'ลา', 'OT'];
    const LEAVE_TYPES = ['ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'ลาคลอด', 'อื่นๆ'];

    // ── Fetch data ──
    const fetchAttendance = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (dateFrom) params.set('startDate', dateFrom);
            if (dateTo) params.set('endDate', dateTo);
            if (filterDept) params.set('department', filterDept);
            if (filterStatus) params.set('status', filterStatus);
            if (searchQuery) params.set('search', searchQuery);
            const res = await fetch(`${API_BASE}/attendance?${params}`);
            if (res.ok) setRecords(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [dateFrom, dateTo, filterDept, filterStatus, searchQuery]);

    const fetchSummary = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/attendance/summary?date=${dateTo}`);
            if (res.ok) setSummary(await res.json());
        } catch (err) { console.error(err); }
    }, [dateTo]);

    const fetchEmployees = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/employees`);
            if (res.ok) setEmployees(await res.json());
        } catch (err) { console.error(err); }
    }, []);

    const fetchDepartments = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/departments`);
            if (res.ok) setDepartments(await res.json());
        } catch (err) { console.error(err); }
    }, []);

    const fetchLeaveRequests = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/leave-requests`);
            if (res.ok) setLeaveRecords(await res.json());
        } catch (err) { console.error(err); }
    }, []);

    const fetchLeaveBalance = useCallback(async (empId) => {
        if (!empId) { setLeaveBalances([]); return; }
        try {
            const res = await fetch(`${API_BASE}/leave-requests/balance/${empId}`);
            if (res.ok) {
                const data = await res.json();
                setLeaveBalances(data.balances || []);
            }
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        fetchEmployees();
        fetchDepartments();
        fetchLeaveRequests();
    }, [fetchEmployees, fetchDepartments, fetchLeaveRequests]);

    useEffect(() => {
        fetchAttendance();
        fetchSummary();
    }, [fetchAttendance, fetchSummary]);

    // ── Modal handlers ──
    const openAddModal = () => {
        setEditRecord(null);
        setFormData({
            employee_id: '', date: new Date().toISOString().split('T')[0],
            check_in: '08:30', check_out: '17:30', status: 'ปกติ', ot_hours: 0, note: ''
        });
        setError('');
        setModalOpen(true);
    };

    const openEditModal = (rec) => {
        setEditRecord(rec);
        setFormData({
            employee_id: rec.employee_id,
            date: rec.date ? new Date(rec.date).toISOString().split('T')[0] : '',
            check_in: rec.check_in ? rec.check_in.substring(0, 5) : '',
            check_out: rec.check_out ? rec.check_out.substring(0, 5) : '',
            status: rec.status, ot_hours: rec.ot_hours || 0, note: rec.note || ''
        });
        setError('');
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.employee_id || !formData.date) {
            setError('กรุณาเลือกพนักงานและวันที่'); return;
        }
        setSaving(true); setError('');
        try {
            const url = editRecord ? `${API_BASE}/attendance/${editRecord.attendance_id}` : `${API_BASE}/attendance`;
            const method = editRecord ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (res.ok) {
                setModalOpen(false);
                fetchAttendance();
                fetchSummary();
            } else {
                setError(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (err) { setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (rec) => {
        if (!window.confirm(`ลบบันทึกเวลาของ ${rec.first_name} วันที่ ${fmtDate(rec.date)}?`)) return;
        try {
            const res = await fetch(`${API_BASE}/attendance/${rec.attendance_id}`, { method: 'DELETE' });
            if (res.ok) { fetchAttendance(); fetchSummary(); }
            else { const d = await res.json(); alert(d.message); }
        } catch (err) { alert('เกิดข้อผิดพลาด'); }
    };

    // ── Leave Modal handlers ──
    const openLeaveModal = () => {
        setLeaveForm({ employee_id: '', leave_type: 'ลาป่วย', start_date: '', end_date: '', total_days: 1, reason: '' });
        setLeaveBalances([]);
        setSelectedLeaveEmp('');
        setError('');
        setLeaveModalOpen(true);
    };

    const handleLeaveEmpChange = (empId) => {
        setLeaveForm(prev => ({ ...prev, employee_id: empId }));
        setSelectedLeaveEmp(empId);
        fetchLeaveBalance(empId);
    };

    const handleLeaveSave = async () => {
        if (!leaveForm.employee_id || !leaveForm.start_date || !leaveForm.end_date) {
            setError('กรุณากรอกข้อมูลให้ครบ'); return;
        }
        setSaving(true); setError('');
        try {
            const res = await fetch(`${API_BASE}/leave-requests`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leaveForm),
            });
            const data = await res.json();
            if (res.ok) {
                setLeaveModalOpen(false);
                fetchLeaveRequests();
                fetchAttendance();
                fetchSummary();
            } else {
                setError(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (err) { setError('ไม่สามารถเชื่อมต่อ'); }
        finally { setSaving(false); }
    };

    const handleLeaveApprove = async (leave, newStatus) => {
        try {
            const res = await fetch(`${API_BASE}/leave-requests/${leave.leave_id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, approved_by: 'admin' }),
            });
            if (res.ok) { fetchLeaveRequests(); fetchAttendance(); fetchSummary(); }
        } catch (err) { alert('เกิดข้อผิดพลาด'); }
    };

    // ── Helpers ──
    const getAttBadgeClass = (st) => {
        switch (st) {
            case 'ปกติ': return 'att-badge-normal';
            case 'สาย': return 'att-badge-late';
            case 'ขาด': return 'att-badge-absent';
            case 'ลา': return 'att-badge-leave';
            case 'OT': return 'att-badge-ot';
            default: return '';
        }
    };

    const getLeaveBadgeClass = (st) => {
        switch (st) {
            case 'รออนุมัติ': return 'badge-warning';
            case 'อนุมัติ': return 'badge-success';
            case 'ไม่อนุมัติ': return 'badge-danger';
            default: return 'badge-neutral';
        }
    };

    const fmtTime = (t) => {
        if (!t) return '—';
        return t.substring(0, 5);
    };

    return (
        <div className="subpage-content" key="hr_attendance">

            {/* ── Toolbar ── */}
            {hasSectionPermission('hr_attendance_search') && (
                <div className="att-toolbar">
                    <div className="att-toolbar-row">
                        <div className="att-filter-group">
                            <label>จาก</label>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        </div>
                        <div className="att-filter-group">
                            <label>ถึง</label>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>
                        <div className="att-filter-group">
                            <label>แผนก</label>
                            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                                <option value="">ทั้งหมด</option>
                                {departments.map(d => (
                                    <option key={d.dept_code} value={d.dept_code}>{d.dept_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="att-filter-group">
                            <label>สถานะ</label>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="">ทั้งหมด</option>
                                {ATTENDANCE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="att-filter-group att-search-group">
                            <label>ค้นหา</label>
                            <div className="search-box" style={{ margin: 0 }}>
                                <Search size={14} />
                                <input type="text" placeholder="ชื่อ, รหัส..." value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="att-toolbar-actions">
                        {/* ปุ่มบันทึกเวลาซ่อนไว้ก่อน — จะใช้ข้อมูลจากเครื่องสแกนนิ้วมือแทน */}
                        <button className="att-btn-leave" onClick={openLeaveModal}>
                            <CalendarDays size={14} /> ขอลา
                        </button>
                    </div>
                </div>
            )}

            {/* ── Attendance Table ── */}
            {hasSectionPermission('hr_attendance_table') && (
                <div className="table-card card">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>กำลังโหลดข้อมูล...</div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>วันที่</th>
                                    <th>รหัส</th>
                                    <th>ชื่อ-สกุล</th>
                                    <th>แผนก</th>
                                    <th>เวลาเข้า</th>
                                    <th>เวลาออก</th>
                                    <th>สถานะ</th>
                                    <th>สาย (นาที)</th>
                                    <th>OT (ชม.)</th>
                                    <th>หมายเหตุ</th>
                                    <th style={{ textAlign: 'center' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.length === 0 ? (
                                    <tr><td colSpan={11} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>ไม่พบข้อมูล</td></tr>
                                ) : records.map(rec => (
                                    <tr key={rec.attendance_id}>
                                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(rec.date)}</td>
                                        <td>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#6366f1', fontSize: '12px', background: '#eef2ff', padding: '2px 8px', borderRadius: '4px' }}>
                                                {rec.employee_code}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{rec.prefix}{rec.first_name} {rec.last_name}</td>
                                        <td>{rec.department_name || rec.department_code || '—'}</td>
                                        <td style={{ color: rec.status === 'สาย' ? '#dc2626' : '#1e293b', fontWeight: rec.status === 'สาย' ? 700 : 400 }}>
                                            {fmtTime(rec.check_in)}
                                        </td>
                                        <td>{fmtTime(rec.check_out)}</td>
                                        <td><span className={`att-badge ${getAttBadgeClass(rec.status)}`}>{rec.status}</span></td>
                                        <td style={{ color: rec.late_minutes > 0 ? '#dc2626' : '#94a3b8' }}>
                                            {rec.late_minutes > 0 ? rec.late_minutes : '—'}
                                        </td>
                                        <td style={{ color: rec.ot_hours > 0 ? '#7c3aed' : '#94a3b8' }}>
                                            {rec.ot_hours > 0 ? rec.ot_hours : '—'}
                                        </td>
                                        <td style={{ color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {rec.note || '—'}
                                        </td>
                                        <td>
                                            <div className="hr-actions">
                                                <button className="hr-action-btn edit" title="แก้ไข" onClick={() => openEditModal(rec)}>
                                                    <Pencil size={14} />
                                                </button>
                                                <button className="hr-action-btn delete" title="ลบ" onClick={() => handleDelete(rec)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ── Leave Requests Section ── */}
            {hasSectionPermission('hr_attendance_table') && leaveRecords.length > 0 && (
                <div className="table-card card" style={{ marginTop: '20px' }}>
                    <div style={{ padding: '16px 20px 8px', fontWeight: 700, fontSize: '14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarDays size={16} /> รายการขอลา
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>พนักงาน</th>
                                <th>ประเภทลา</th>
                                <th>วันที่เริ่ม</th>
                                <th>วันที่สิ้นสุด</th>
                                <th>จำนวนวัน</th>
                                <th>เหตุผล</th>
                                <th>สถานะ</th>
                                <th style={{ textAlign: 'center' }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaveRecords.map(lr => (
                                <tr key={lr.leave_id}>
                                    <td style={{ fontWeight: 600 }}>{lr.prefix}{lr.first_name} {lr.last_name}</td>
                                    <td>{lr.leave_type}</td>
                                    <td>{fmtDate(lr.start_date)}</td>
                                    <td>{fmtDate(lr.end_date)}</td>
                                    <td>{lr.total_days}</td>
                                    <td style={{ color: '#64748b' }}>{lr.reason || '—'}</td>
                                    <td><span className={`badge ${getLeaveBadgeClass(lr.status)}`}>{lr.status}</span></td>
                                    <td>
                                        {lr.status === 'รออนุมัติ' && (
                                            <div className="hr-actions">
                                                <button className="hr-action-btn view" title="อนุมัติ" onClick={() => handleLeaveApprove(lr, 'อนุมัติ')}>
                                                    <CheckCircle2 size={14} />
                                                </button>
                                                <button className="hr-action-btn delete" title="ไม่อนุมัติ" onClick={() => handleLeaveApprove(lr, 'ไม่อนุมัติ')}>
                                                    <XCircle size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ══════  Modal: บันทึก/แก้ไขเวลา ══════ */}
            {modalOpen && (
                <div className="hr-modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="hr-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
                        <div className="hr-modal-header">
                            <h2><Clock size={18} /> {editRecord ? 'แก้ไขเวลาทำงาน' : 'บันทึกเวลาทำงาน'}</h2>
                            <button className="hr-modal-close" onClick={() => setModalOpen(false)}><X size={18} /></button>
                        </div>
                        <div className="hr-modal-body">
                            {error && <div className="hr-error">{error}</div>}
                            <div className="hr-form-grid hr-form-grid-2">
                                {!editRecord && (
                                    <div className="hr-form-group full-width">
                                        <label>พนักงาน *</label>
                                        <select value={formData.employee_id} onChange={e => setFormData(p => ({ ...p, employee_id: e.target.value }))}>
                                            <option value="">เลือกพนักงาน</option>
                                            {employees.map(emp => (
                                                <option key={emp.employee_id} value={emp.employee_id}>
                                                    {emp.employee_code} — {emp.prefix}{emp.first_name} {emp.last_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="hr-form-group">
                                    <label>วันที่ *</label>
                                    <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} disabled={!!editRecord} />
                                </div>
                                <div className="hr-form-group">
                                    <label>สถานะ</label>
                                    <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                                        {ATTENDANCE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="hr-form-group">
                                    <label>เวลาเข้า</label>
                                    <input type="time" value={formData.check_in} onChange={e => setFormData(p => ({ ...p, check_in: e.target.value }))}
                                        disabled={formData.status === 'ขาด' || formData.status === 'ลา'} />
                                </div>
                                <div className="hr-form-group">
                                    <label>เวลาออก</label>
                                    <input type="time" value={formData.check_out} onChange={e => setFormData(p => ({ ...p, check_out: e.target.value }))}
                                        disabled={formData.status === 'ขาด' || formData.status === 'ลา'} />
                                </div>
                                {formData.status === 'OT' && (
                                    <div className="hr-form-group">
                                        <label>ชั่วโมง OT</label>
                                        <input type="number" step="0.5" min="0" value={formData.ot_hours}
                                            onChange={e => setFormData(p => ({ ...p, ot_hours: parseFloat(e.target.value) || 0 }))} />
                                    </div>
                                )}
                                <div className="hr-form-group full-width">
                                    <label>หมายเหตุ</label>
                                    <textarea value={formData.note} onChange={e => setFormData(p => ({ ...p, note: e.target.value }))} placeholder="หมายเหตุ (ถ้ามี)" />
                                </div>
                            </div>
                        </div>
                        <div className="hr-modal-footer">
                            <button className="hr-btn-cancel" onClick={() => setModalOpen(false)}>ยกเลิก</button>
                            <button className="hr-btn hr-btn-save" onClick={handleSave} disabled={saving}>
                                {saving ? 'กำลังบันทึก...' : editRecord ? 'บันทึกการแก้ไข' : 'บันทึกเวลา'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════  Modal: ขอลา ══════ */}
            {leaveModalOpen && (
                <div className="hr-modal-overlay" onClick={() => setLeaveModalOpen(false)}>
                    <div className="hr-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                        <div className="hr-modal-header">
                            <h2><CalendarDays size={18} /> ขอลางาน</h2>
                            <button className="hr-modal-close" onClick={() => setLeaveModalOpen(false)}><X size={18} /></button>
                        </div>
                        <div className="hr-modal-body">
                            {error && <div className="hr-error">{error}</div>}

                            <div className="hr-form-group" style={{ marginBottom: '16px' }}>
                                <label>พนักงาน *</label>
                                <select value={leaveForm.employee_id} onChange={e => { handleLeaveEmpChange(e.target.value); }}>
                                    <option value="">เลือกพนักงาน</option>
                                    {employees.map(emp => (
                                        <option key={emp.employee_id} value={emp.employee_id}>
                                            {emp.employee_code} — {emp.prefix}{emp.first_name} {emp.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Leave Balance Display */}
                            {leaveBalances.length > 0 && (
                                <div className="att-leave-balance-row">
                                    {leaveBalances.map(b => (
                                        <div key={b.leave_type} className="att-leave-balance-chip">
                                            <span className="att-lb-type">{b.leave_type}</span>
                                            <span className="att-lb-nums">
                                                <strong>{b.remaining_days}</strong>/{b.total_days} วัน
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="hr-form-grid hr-form-grid-2">
                                <div className="hr-form-group">
                                    <label>ประเภทลา *</label>
                                    <select value={leaveForm.leave_type} onChange={e => setLeaveForm(p => ({ ...p, leave_type: e.target.value }))}>
                                        {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="hr-form-group">
                                    <label>จำนวนวัน</label>
                                    <input type="number" step="0.5" min="0.5" value={leaveForm.total_days}
                                        onChange={e => setLeaveForm(p => ({ ...p, total_days: parseFloat(e.target.value) || 1 }))} />
                                </div>
                                <div className="hr-form-group">
                                    <label>วันเริ่มลา *</label>
                                    <input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm(p => ({ ...p, start_date: e.target.value }))} />
                                </div>
                                <div className="hr-form-group">
                                    <label>วันสิ้นสุดลา *</label>
                                    <input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm(p => ({ ...p, end_date: e.target.value }))} />
                                </div>
                                <div className="hr-form-group full-width">
                                    <label>เหตุผล</label>
                                    <textarea value={leaveForm.reason} onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))} placeholder="ระบุเหตุผลการลา" />
                                </div>
                            </div>
                        </div>
                        <div className="hr-modal-footer">
                            <button className="hr-btn-cancel" onClick={() => setLeaveModalOpen(false)}>ยกเลิก</button>
                            <button className="hr-btn hr-btn-save" onClick={handleLeaveSave} disabled={saving}>
                                {saving ? 'กำลังบันทึก...' : 'ส่งใบลา'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


// =============================================================================
// HRDashboardTab Component — ภาพรวมฝ่ายบุคคล (Database จริง)
// =============================================================================
function HRDashboardTab() {
    const [employees, setEmployees] = useState([]);
    const [summary, setSummary] = useState(null);
    const [leaveRecords, setLeaveRecords] = useState([]);
    const [recentAttendance, setRecentAttendance] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [empRes, sumRes, leaveRes, attRes] = await Promise.all([
                    fetch(`${API_BASE}/employees?all=true`),
                    fetch(`${API_BASE}/attendance/summary`),
                    fetch(`${API_BASE}/leave-requests`),
                    fetch(`${API_BASE}/attendance?startDate=${new Date().toISOString().split('T')[0]}&endDate=${new Date().toISOString().split('T')[0]}`),
                ]);
                if (empRes.ok) setEmployees(await empRes.json());
                if (sumRes.ok) setSummary(await sumRes.json());
                if (leaveRes.ok) setLeaveRecords(await leaveRes.json());
                if (attRes.ok) setRecentAttendance(await attRes.json());
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    // ── Derived Stats ──
    const activeEmps = employees.filter(e => e.is_active);
    const totalActive = activeEmps.length;
    const totalInactive = employees.length - totalActive;
    const onProbation = activeEmps.filter(e => e.employment_type === 'ทดลองงาน').length;
    const fullTime = activeEmps.filter(e => e.employment_type === 'พนักงานประจำ').length;
    const contract = activeEmps.filter(e => e.employment_type === 'สัญญาจ้าง').length;
    const partTime = activeEmps.filter(e => e.employment_type === 'Part-time').length;

    // New hires this month
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const newHires = activeEmps.filter(e => e.start_date && e.start_date.substring(0, 7) === thisMonth).length;

    // Department breakdown
    const deptMap = {};
    activeEmps.forEach(e => {
        const dept = e.department_name || e.department_code || 'ไม่ระบุ';
        deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const deptEntries = Object.entries(deptMap).sort((a, b) => b[1] - a[1]);
    const maxDeptCount = deptEntries.length > 0 ? deptEntries[0][1] : 1;

    // Gender stats
    const maleCount = activeEmps.filter(e => e.gender === 'ชาย').length;
    const femaleCount = activeEmps.filter(e => e.gender === 'หญิง').length;

    // Pending leaves
    const pendingLeaves = leaveRecords.filter(l => l.status === 'รออนุมัติ');

    // Upcoming birthdays (within 30 days)
    const upcomingBirthdays = activeEmps
        .filter(e => {
            if (!e.date_of_birth) return false;
            const bday = new Date(e.date_of_birth);
            const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
            const diff = (thisYear - now) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 30;
        })
        .map(e => {
            const bday = new Date(e.date_of_birth);
            const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
            const daysLeft = Math.ceil((thisYear - now) / (1000 * 60 * 60 * 24));
            return { ...e, daysLeft };
        })
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5);

    // Probation ending soon (within 30 days)
    const probationEnding = activeEmps
        .filter(e => {
            if (!e.probation_end_date) return false;
            const pEnd = new Date(e.probation_end_date);
            const diff = (pEnd - now) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 30;
        })
        .map(e => {
            const pEnd = new Date(e.probation_end_date);
            const daysLeft = Math.ceil((pEnd - now) / (1000 * 60 * 60 * 24));
            return { ...e, daysLeft };
        })
        .sort((a, b) => a.daysLeft - b.daysLeft);

    if (loading) {
        return <div className="subpage-content"><div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>กำลังโหลด Dashboard...</div></div>;
    }

    return (
        <div className="subpage-content" key="hr_dashboard">
            {/* ── Row 1: Top Stats Cards ── */}
            <div className="dash-stats-row">
                <div className="dash-stat-card dash-stat-primary">
                    <div className="dash-stat-icon"><Users size={24} /></div>
                    <div className="dash-stat-info">
                        <span className="dash-stat-num">{totalActive}</span>
                        <span className="dash-stat-label">พนักงานทั้งหมด</span>
                    </div>
                    <div className="dash-stat-sub">{totalInactive > 0 && <span style={{color:'#94a3b8',fontSize:11}}>ลาออก/พักงาน {totalInactive}</span>}</div>
                </div>
                <div className="dash-stat-card dash-stat-green">
                    <div className="dash-stat-icon"><CheckCircle2 size={24} /></div>
                    <div className="dash-stat-info">
                        <span className="dash-stat-num">{summary?.present || 0}</span>
                        <span className="dash-stat-label">มาทำงานวันนี้ ({summary?.presentPercent || 0}%)</span>
                    </div>
                </div>
                <div className="dash-stat-card dash-stat-amber">
                    <div className="dash-stat-icon"><AlertTriangle size={24} /></div>
                    <div className="dash-stat-info">
                        <span className="dash-stat-num">{summary?.late || 0}</span>
                        <span className="dash-stat-label">มาสายวันนี้</span>
                    </div>
                </div>
                <div className="dash-stat-card dash-stat-blue">
                    <div className="dash-stat-icon"><CalendarDays size={24} /></div>
                    <div className="dash-stat-info">
                        <span className="dash-stat-num">{summary?.leave || 0}</span>
                        <span className="dash-stat-label">ลางานวันนี้</span>
                    </div>
                </div>
                <div className="dash-stat-card dash-stat-violet">
                    <div className="dash-stat-icon"><UserPlus size={24} /></div>
                    <div className="dash-stat-info">
                        <span className="dash-stat-num">{newHires}</span>
                        <span className="dash-stat-label">พนักงานใหม่เดือนนี้</span>
                    </div>
                </div>
            </div>

            {/* ── Row 2: Department + Employment Types ── */}
            <div className="dash-grid-2">
                {/* Department Breakdown */}
                <div className="dash-panel card">
                    <div className="dash-panel-header">
                        <h3><Building2 size={16} /> พนักงานแยกตามแผนก</h3>
                    </div>
                    <div className="dash-panel-body">
                        {deptEntries.length === 0 ? (
                            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>ไม่มีข้อมูล</div>
                        ) : deptEntries.map(([dept, count]) => (
                            <div key={dept} className="dash-bar-item">
                                <div className="dash-bar-label">
                                    <span>{dept}</span>
                                    <span className="dash-bar-count">{count} คน</span>
                                </div>
                                <div className="dash-bar-track">
                                    <div className="dash-bar-fill" style={{ width: `${(count / maxDeptCount) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Employment Types + Gender */}
                <div className="dash-panel card">
                    <div className="dash-panel-header">
                        <h3><Briefcase size={16} /> ประเภทการจ้างงาน</h3>
                    </div>
                    <div className="dash-panel-body">
                        <div className="dash-type-grid">
                            <div className="dash-type-chip">
                                <div className="dash-type-dot" style={{ background: '#6366f1' }} />
                                <span>พนักงานประจำ</span>
                                <strong>{fullTime}</strong>
                            </div>
                            <div className="dash-type-chip">
                                <div className="dash-type-dot" style={{ background: '#f59e0b' }} />
                                <span>สัญญาจ้าง</span>
                                <strong>{contract}</strong>
                            </div>
                            <div className="dash-type-chip">
                                <div className="dash-type-dot" style={{ background: '#10b981' }} />
                                <span>ทดลองงาน</span>
                                <strong>{onProbation}</strong>
                            </div>
                            <div className="dash-type-chip">
                                <div className="dash-type-dot" style={{ background: '#8b5cf6' }} />
                                <span>Part-time</span>
                                <strong>{partTime}</strong>
                            </div>
                        </div>

                        <div className="dash-divider" />

                        <div className="dash-panel-header" style={{ marginTop: '4px' }}>
                            <h3><User size={16} /> สัดส่วนเพศ</h3>
                        </div>
                        <div className="dash-gender-row">
                            <div className="dash-gender-bar">
                                <div className="dash-gender-male" style={{ width: totalActive > 0 ? `${(maleCount / totalActive) * 100}%` : '50%' }} />
                                <div className="dash-gender-female" style={{ width: totalActive > 0 ? `${(femaleCount / totalActive) * 100}%` : '50%' }} />
                            </div>
                            <div className="dash-gender-labels">
                                <span>🙋‍♂️ ชาย {maleCount} ({totalActive > 0 ? Math.round(maleCount/totalActive*100) : 0}%)</span>
                                <span>🙋‍♀️ หญิง {femaleCount} ({totalActive > 0 ? Math.round(femaleCount/totalActive*100) : 0}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Row 3: Pending Leaves + Upcoming Events ── */}
            <div className="dash-grid-2">
                {/* Pending Leave Requests */}
                <div className="dash-panel card">
                    <div className="dash-panel-header">
                        <h3><Clock size={16} /> ใบลารออนุมัติ</h3>
                        {pendingLeaves.length > 0 && <span className="dash-badge-count">{pendingLeaves.length}</span>}
                    </div>
                    <div className="dash-panel-body">
                        {pendingLeaves.length === 0 ? (
                            <div className="dash-empty">
                                <CheckCircle2 size={32} style={{ color: '#a3e635' }} />
                                <span>ไม่มีใบลารออนุมัติ</span>
                            </div>
                        ) : (
                            <div className="dash-list">
                                {pendingLeaves.slice(0, 5).map(lr => (
                                    <div key={lr.leave_id} className="dash-list-item">
                                        <div className="dash-list-avatar">{(lr.first_name?.[0] || '') + (lr.last_name?.[0] || '')}</div>
                                        <div className="dash-list-info">
                                            <span className="dash-list-name">{lr.prefix}{lr.first_name} {lr.last_name}</span>
                                            <span className="dash-list-sub">{lr.leave_type} • {lr.total_days} วัน • {fmtDate(lr.start_date)}</span>
                                        </div>
                                        <span className="badge badge-warning">รออนุมัติ</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Upcoming Events */}
                <div className="dash-panel card">
                    <div className="dash-panel-header">
                        <h3><CalendarDays size={16} /> กิจกรรมที่กำลังจะมาถึง</h3>
                    </div>
                    <div className="dash-panel-body">
                        {/* Probation Ending */}
                        {probationEnding.length > 0 && (
                            <>
                                <div className="dash-event-title">⚠️ ครบกำหนดทดลองงาน</div>
                                {probationEnding.map(e => (
                                    <div key={e.employee_id} className="dash-list-item">
                                        <div className="dash-list-avatar" style={{ background: '#fef3c7', color: '#b45309' }}>
                                            {(e.first_name?.[0] || '') + (e.last_name?.[0] || '')}
                                        </div>
                                        <div className="dash-list-info">
                                            <span className="dash-list-name">{e.prefix}{e.first_name} {e.last_name}</span>
                                            <span className="dash-list-sub">{e.position} • อีก {e.daysLeft} วัน ({fmtDate(e.probation_end_date)})</span>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Birthdays */}
                        {upcomingBirthdays.length > 0 && (
                            <>
                                <div className="dash-event-title" style={{ marginTop: probationEnding.length > 0 ? '12px' : 0 }}>🎂 วันเกิดที่กำลังจะมาถึง</div>
                                {upcomingBirthdays.map(e => (
                                    <div key={e.employee_id} className="dash-list-item">
                                        <div className="dash-list-avatar" style={{ background: '#fce7f3', color: '#db2777' }}>
                                            {(e.first_name?.[0] || '') + (e.last_name?.[0] || '')}
                                        </div>
                                        <div className="dash-list-info">
                                            <span className="dash-list-name">{e.prefix}{e.first_name} {e.last_name}</span>
                                            <span className="dash-list-sub">{e.daysLeft === 0 ? '🎉 วันนี้!' : `อีก ${e.daysLeft} วัน`} • {fmtDate(e.date_of_birth)}</span>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {probationEnding.length === 0 && upcomingBirthdays.length === 0 && (
                            <div className="dash-empty">
                                <CalendarDays size={32} style={{ color: '#cbd5e1' }} />
                                <span>ไม่มีกิจกรรมใน 30 วันข้างหน้า</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Row 4: Today's Attendance List ── */}
            <div className="dash-panel card" style={{ marginTop: '0' }}>
                <div className="dash-panel-header">
                    <h3><Clock size={16} /> สรุปเวลาทำงานวันนี้</h3>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{fmtDate(new Date())}</span>
                </div>
                <div className="dash-panel-body" style={{ padding: 0 }}>
                    {recentAttendance.length === 0 ? (
                        <div className="dash-empty" style={{ padding: '30px' }}>
                            <Clock size={32} style={{ color: '#cbd5e1' }} />
                            <span>ยังไม่มีข้อมูลเวลาทำงานวันนี้</span>
                        </div>
                    ) : (
                        <table className="data-table" style={{ marginBottom: 0 }}>
                            <thead>
                                <tr>
                                    <th>รหัส</th>
                                    <th>ชื่อ-สกุล</th>
                                    <th>แผนก</th>
                                    <th>เข้า</th>
                                    <th>ออก</th>
                                    <th>สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentAttendance.slice(0, 10).map(rec => (
                                    <tr key={rec.attendance_id}>
                                        <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#6366f1', fontSize: 12, background: '#eef2ff', padding: '2px 8px', borderRadius: 4 }}>{rec.employee_code}</span></td>
                                        <td style={{ fontWeight: 600 }}>{rec.prefix}{rec.first_name} {rec.last_name}</td>
                                        <td>{rec.department_name || '—'}</td>
                                        <td>{rec.check_in || '—'}</td>
                                        <td>{rec.check_out || '—'}</td>
                                        <td>
                                            <span className={`att-badge ${rec.status === 'ปกติ' ? 'att-badge-normal' : rec.status === 'สาย' ? 'att-badge-late' : rec.status === 'ลา' ? 'att-badge-leave' : rec.status === 'ขาด' ? 'att-badge-absent' : 'att-badge-ot'}`}>
                                                {rec.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}


// =============================================================================
// Main HR Component
// =============================================================================
export default function HR() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('hr');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'hr_dashboard';

    return (
        <div className="page-content">
            <div className="page-title">
                <h1>บุคลากร (Human Resources)</h1>
                <p>จัดการข้อมูลพนักงานและการมาทำงาน</p>
            </div>

            {/* ── Tab: HR Dashboard (Database จริง!) ── */}
            {(activeTab === 'hr_dashboard' && hasSubPermission('hr_dashboard')) && (
                <HRDashboardTab />
            )}

            {/* ── Tab: Attendance & Work History (Database จริง!) ── */}
            {(activeTab === 'hr_attendance' && hasSubPermission('hr_attendance')) && (
                <AttendanceTab hasSectionPermission={hasSectionPermission} />
            )}

            {/* ── Tab: Employee Profile (Database จริง!) ── */}
            {(activeTab === 'hr_profile' && hasSubPermission('hr_profile')) && (
                <EmployeeProfileTab hasSectionPermission={hasSectionPermission} />
            )}
        </div>
    );
}


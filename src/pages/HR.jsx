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
import { MOCK_ATTENDANCE } from '../data/mockData';
import {
    Users, UserPlus, Search, Eye, Pencil, Trash2, X,
    User, Briefcase, GraduationCap, CreditCard, Phone, ShieldCheck, Building2
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
    status: 'ปฏิบัติงาน',
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

    useEffect(() => {
        fetchEmployees();
        fetchDepartments();
    }, [fetchEmployees, fetchDepartments]);

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
            emp.department_code?.toLowerCase().includes(q)
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
            ['date_of_birth', 'start_date', 'end_date', 'probation_end_date'].forEach(k => {
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
                                    <th>ตำแหน่ง</th>
                                    <th>แผนก</th>
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
                                        <td>{emp.position || '—'}</td>
                                        <td>{emp.department_name || emp.department_code || '—'}</td>
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
                            <button className="hr-modal-close" onClick={closeModal}><X size={18} /></button>
                        </div>

                        <div className="hr-modal-body">
                            {/* Header */}
                            <div className="hr-detail-header">
                                <div className="hr-detail-avatar">{getAvatar(selectedEmployee)}</div>
                                <div className="hr-detail-name">
                                    <h3>{selectedEmployee.prefix}{selectedEmployee.first_name} {selectedEmployee.last_name} {selectedEmployee.nickname ? `(${selectedEmployee.nickname})` : ''}</h3>
                                    <p>{selectedEmployee.employee_code} · {selectedEmployee.position || '—'} · {selectedEmployee.department_name || selectedEmployee.department_code || '—'}</p>
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
// Main HR Component
// =============================================================================
export default function HR() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('hr');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'hr_dashboard';

    // ── State for legacy tabs ──
    const [attendanceSearch, setAttendanceSearch] = useState('');

    // ── MOCK Attendance (ยังเก็บไว้รอ phase ถัดไป) ──
    const filteredAttendance = MOCK_ATTENDANCE.filter((record) =>
        record.empName.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
        record.status.toLowerCase().includes(attendanceSearch.toLowerCase())
    );

    const getAttendanceStatusClass = (status) => {
        switch (status) {
            case 'ปกติ': return 'badge-success';
            case 'สาย': return 'badge-warning';
            case 'ลา': return 'badge-info';
            case 'ขาด': return 'badge-danger';
            default: return 'badge-neutral';
        }
    };

    return (
        <div className="page-content">
            <div className="page-title">
                <h1>บุคลากร (Human Resources)</h1>
                <p>จัดการข้อมูลพนักงานและการมาทำงาน</p>
            </div>

            {/* ── Tab: HR Dashboard (ยัง mock) ── */}
            {(activeTab === 'hr_dashboard' && hasSubPermission('hr_dashboard')) && (
                <div className="subpage-content" key="hr_dashboard">
                    <div className="summary-row">
                        {hasSectionPermission('hr_dashboard_total') && (
                            <div className="summary-card card">
                                <div className="summary-icon">👥</div>
                                <div>
                                    <span className="summary-label">พนักงานทั้งหมด</span>
                                    <span className="summary-value">—</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('hr_dashboard_attendance') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#2d9e5a' }}>✓</div>
                                <div>
                                    <span className="summary-label">มาทำงาน (วันนี้)</span>
                                    <span className="summary-value" style={{ color: '#2d9e5a' }}>—</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('hr_dashboard_leave') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#0066cc' }}>🏖️</div>
                                <div>
                                    <span className="summary-label">ลาพักร้อน/ลาป่วย</span>
                                    <span className="summary-value" style={{ color: '#0066cc' }}>—</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab: Attendance (ยัง mock) ── */}
            {(activeTab === 'hr_attendance' && hasSubPermission('hr_attendance')) && (
                <div className="subpage-content" key="hr_attendance">
                    {hasSectionPermission('hr_attendance_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์ชื่อพนักงาน หรือสถานะ..."
                                    value={attendanceSearch}
                                    onChange={(e) => setAttendanceSearch(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">ส่งออกรายงาน</button>
                        </div>
                    )}

                    {hasSectionPermission('hr_attendance_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>วันที่</th>
                                        <th>ชื่อ-สกุล</th>
                                        <th>เวลาเข้า</th>
                                        <th>เวลาออก</th>
                                        <th>หมายเหตุ</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAttendance.map((record) => (
                                        <tr key={record.id}>
                                            <td>{record.date}</td>
                                            <td className="text-bold">{record.empName}</td>
                                            <td>{record.checkIn}</td>
                                            <td>{record.checkOut}</td>
                                            <td className="text-muted">{record.note}</td>
                                            <td>
                                                <span className={`badge ${getAttendanceStatusClass(record.status)}`}>
                                                    {record.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Employee Profile (ใช้ Database จริง!) ── */}
            {(activeTab === 'hr_profile' && hasSubPermission('hr_profile')) && (
                <EmployeeProfileTab hasSectionPermission={hasSectionPermission} />
            )}
        </div>
    );
}

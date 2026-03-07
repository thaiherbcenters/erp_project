/**
 * =============================================================================
 * HR.jsx — หน้าบุคลากร (Human Resources)
 * =============================================================================
 *
 * แสดงข้อมูลบุคลากร:
 *   - Tab hr_dashboard  : HR Dashboard Показатели สรุป (จำนวนพนักงาน, วันมาทำงาน, วันลา)
 *   - Tab hr_attendance : Attendance & Work History (ตารางเวลาทำงาน)
 *   - Tab hr_profile    : Employee Profile (ตารางประวัติพนักงาน)
 *
 * =============================================================================
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOCK_EMPLOYEES, MOCK_ATTENDANCE } from '../data/mockData';
import './PageCommon.css';

export default function HR() {
    const { hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('hr');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'hr_dashboard';

    // ── State: ค้นหา ──
    const [attendanceSearch, setAttendanceSearch] = useState('');
    const [profileSearch, setProfileSearch] = useState('');

    // ── สถิติสำหรับ Dashboard ──
    const totalEmployees = MOCK_EMPLOYEES.length;
    const todayPresent = MOCK_ATTENDANCE.filter(a => a.status === 'ปกติ' || a.status === 'สาย').length;
    const todayLeave = MOCK_ATTENDANCE.filter(a => a.status === 'ลา').length;

    // ── กรองข้อมูลแต่ละ Tab ──
    const filteredAttendance = MOCK_ATTENDANCE.filter((record) =>
        record.empName.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
        record.status.toLowerCase().includes(attendanceSearch.toLowerCase())
    );

    const filteredProfiles = MOCK_EMPLOYEES.filter((emp) =>
        emp.name.toLowerCase().includes(profileSearch.toLowerCase()) ||
        emp.department.toLowerCase().includes(profileSearch.toLowerCase()) ||
        emp.position.toLowerCase().includes(profileSearch.toLowerCase())
    );

    // ── Badge class helpers ──
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

            {/* ── Tab: HR Dashboard ── */}
            {(activeTab === 'hr_dashboard' && hasSubPermission('hr_dashboard')) && (
                <div className="subpage-content" key="hr_dashboard">
                    <div className="summary-row">
                        {hasSectionPermission('hr_dashboard_total') && (
                            <div className="summary-card card">
                                <div className="summary-icon">👥</div>
                                <div>
                                    <span className="summary-label">พนักงานทั้งหมด</span>
                                    <span className="summary-value">{totalEmployees}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('hr_dashboard_attendance') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#2d9e5a' }}>✓</div>
                                <div>
                                    <span className="summary-label">มาทำงาน (วันนี้)</span>
                                    <span className="summary-value" style={{ color: '#2d9e5a' }}>{todayPresent}</span>
                                </div>
                            </div>
                        )}
                        {hasSectionPermission('hr_dashboard_leave') && (
                            <div className="summary-card card">
                                <div className="summary-icon" style={{ color: '#0066cc' }}>🏖️</div>
                                <div>
                                    <span className="summary-label">ลาพักร้อน/ลาป่วย</span>
                                    <span className="summary-value" style={{ color: '#0066cc' }}>{todayLeave}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab: Attendance & Work History ── */}
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

            {/* ── Tab: Employee Profile ── */}
            {(activeTab === 'hr_profile' && hasSubPermission('hr_profile')) && (
                <div className="subpage-content" key="hr_profile">
                    {hasSectionPermission('hr_profile_search') && (
                        <div className="toolbar">
                            <div className="search-box">
                                <span>ค้นหา</span>
                                <input
                                    type="text"
                                    placeholder="พิมพ์ชื่อ, ตำแหน่ง หรือแผนก..."
                                    value={profileSearch}
                                    onChange={(e) => setProfileSearch(e.target.value)}
                                />
                            </div>
                            <button className="btn-primary">+ เพิ่มพนักงาน</button>
                        </div>
                    )}

                    {hasSectionPermission('hr_profile_table') && (
                        <div className="table-card card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รหัส</th>
                                        <th>ชื่อ-สกุล</th>
                                        <th>ตำแหน่ง</th>
                                        <th>แผนก</th>
                                        <th>เงินเดือน (บาท)</th>
                                        <th>เริ่มงาน</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProfiles.map((emp) => (
                                        <tr key={emp.id}>
                                            <td>{emp.id}</td>
                                            <td className="text-bold">{emp.name}</td>
                                            <td>{emp.position}</td>
                                            <td>{emp.department}</td>
                                            <td>{emp.salary.toLocaleString()}</td>
                                            <td>{emp.joinDate}</td>
                                            <td>
                                                <span className={`badge ${emp.status === 'ปฏิบัติงาน' ? 'badge-success' : 'badge-warning'}`}>
                                                    {emp.status}
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
        </div>
    );
}

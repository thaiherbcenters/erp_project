/**
 * =============================================================================
 * Settings.jsx — หน้าตั้งค่า (Settings)
 * =============================================================================
 *
 * แสดงการตั้งค่าระบบ:
 *   - Tab settings_user         : ข้อมูลผู้ใช้ (ชื่อ, username, role)
 *   - Tab settings_display      : การแสดงผล (ธีม, ภาษา, ขนาดตัวอักษร)
 *   - Tab settings_notification : การแจ้งเตือน (อีเมล, พุช, SMS)
 *   - Tab settings_security     : ความปลอดภัย (2FA, session timeout)
 *
 * =============================================================================
 */

import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PageCommon.css';

// ── Mapping role → ชื่อที่แสดง (ใช้ร่วมกับ Settings เท่านั้น) ──
const ROLE_DISPLAY = {
    admin: 'ผู้ดูแลระบบ',
    executive: 'ผู้บริหาร',
    qc: 'เจ้าหน้าที่ QC',
    sales: 'ฝ่ายขาย',
    accountant: 'ฝ่ายบัญชี',
    procurement: 'ฝ่ายจัดซื้อ',
    hr: 'ฝ่ายบุคคล',
    stock: 'พนักงานคลังสินค้า',
};

export default function Settings() {
    const { currentUser, hasSubPermission, hasSectionPermission, getVisibleSubPages } = useAuth();
    const visibleSubPages = getVisibleSubPages('settings');
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || visibleSubPages[0]?.id || 'settings_user';

    return (
        <div className="page-content">
            <div className="page-title">
                <h1>ตั้งค่า</h1>
                <p>การตั้งค่าระบบ</p>
            </div>

            <div className="settings-grid">
                {/* ── Tab: ข้อมูลผู้ใช้ ── */}
                {(activeTab === 'settings_user' && hasSubPermission('settings_user')) && (
                    <div className="subpage-content" key="settings_user">
                        {hasSectionPermission('settings_user_info') && (
                            <div className="settings-card">
                                <h3>ข้อมูลผู้ใช้</h3>
                                <div className="settings-item">
                                    <span className="settings-label">ชื่อที่แสดง</span>
                                    <span className="settings-value">{currentUser?.displayName}</span>
                                </div>
                                <div className="settings-item">
                                    <span className="settings-label">ชื่อผู้ใช้</span>
                                    <span className="settings-value">{currentUser?.username}</span>
                                </div>
                                <div className="settings-item">
                                    <span className="settings-label">บทบาท</span>
                                    <span className="settings-value">
                                        {ROLE_DISPLAY[currentUser?.role] || 'ผู้ใช้งาน'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: การแสดงผล ── */}
                {(activeTab === 'settings_display' && hasSubPermission('settings_display')) && (
                    <div className="subpage-content" key="settings_display">
                        {hasSectionPermission('settings_display_theme') && (
                            <div className="settings-card">
                                <h3>การแสดงผล</h3>
                                <div className="settings-item">
                                    <span className="settings-label">ธีม</span>
                                    <span className="settings-value">มาตรฐาน</span>
                                </div>
                                <div className="settings-item">
                                    <span className="settings-label">ภาษา</span>
                                    <span className="settings-value">ไทย</span>
                                </div>
                                <div className="settings-item">
                                    <span className="settings-label">ขนาดตัวอักษร</span>
                                    <span className="settings-value">ปานกลาง</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: การแจ้งเตือน ── */}
                {(activeTab === 'settings_notification' && hasSubPermission('settings_notification')) && (
                    <div className="subpage-content" key="settings_notification">
                        {hasSectionPermission('settings_notification_config') && (
                            <div className="settings-card">
                                <h3>การแจ้งเตือน</h3>
                                <div className="settings-item">
                                    <span className="settings-label">แจ้งเตือนอีเมล</span>
                                    <span className="settings-value toggle-on">เปิด</span>
                                </div>
                                <div className="settings-item">
                                    <span className="settings-label">การแจ้งเตือนแบบพุช</span>
                                    <span className="settings-value toggle-off">ปิด</span>
                                </div>
                                <div className="settings-item">
                                    <span className="settings-label">แจ้งเตือน SMS</span>
                                    <span className="settings-value toggle-off">ปิด</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: ความปลอดภัย ── */}
                {(activeTab === 'settings_security' && hasSubPermission('settings_security')) && (
                    <div className="subpage-content" key="settings_security">
                        {hasSectionPermission('settings_security_config') && (
                            <div className="settings-card">
                                <h3>ความปลอดภัย</h3>
                                <div className="settings-item">
                                    <span className="settings-label">ยืนยันตัวตนสองขั้นตอน</span>
                                    <span className="settings-value toggle-off">ปิด</span>
                                </div>
                                <div className="settings-item">
                                    <span className="settings-label">หมดเวลาเซสชัน</span>
                                    <span className="settings-value">30 นาที</span>
                                </div>
                                <div className="settings-item">
                                    <span className="settings-label">เข้าสู่ระบบล่าสุด</span>
                                    <span className="settings-value">วันนี้</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

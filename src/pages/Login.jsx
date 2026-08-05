/**
 * =============================================================================
 * Login.jsx — หน้าเข้าสู่ระบบ (Login Page)
 * =============================================================================
 *
 * หน้า Login แบบ split-card (Professional / Formal):
 *   - ด้านซ้าย: ฟอร์มเข้าสู่ระบบ (username + password)
 *   - ด้านขวา: Branding panel แสดงโลโก้และชื่อระบบ
 *
 * ฟีเจอร์:
 *   - แสดง/ซ่อนรหัสผ่าน (Eye icon)
 *   - Loading spinner ขณะล็อกอิน
 *   - แสดง error message เมื่อล็อกอินผิดพลาด
 *   - ป้องกัน Chrome autofill/save password แบบเด็ดขาด
 *     (ใช้ type="text" + CSS text-security แทน type="password"
 *      เพื่อไม่ให้ Chrome ตรวจพบว่าเป็น login form)
 *
 * =============================================================================
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ShieldCheck, Lock, User } from 'lucide-react';
import logoUrl from '../assets/logo.png';
import './Login.css';

export default function Login() {
    // ── State สำหรับ form ──
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const formRef = useRef(null);

    // ── Handle submit ──
    // ใช้ formRef.reset() ก่อน navigate เพื่อล้างค่าใน DOM
    // ป้องกัน Chrome จับค่าไปบันทึก
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        await new Promise((r) => setTimeout(r, 800));

        const result = await login(username, password);
        if (result.success) {
            // ล้าง state + DOM ก่อน navigate เพื่อไม่ให้ Chrome จับค่าไปบันทึก
            setUsername('');
            setPassword('');
            if (formRef.current) formRef.current.reset();
            navigate(result.redirectPath);
        } else {
            setError(result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            setIsLoading(false);
        }
    };

    // Style สำหรับ mask password ด้วย CSS แทน type="password"
    // วิธีนี้ Chrome จะไม่เห็นว่ามี password field → ไม่ถาม "บันทึกรหัสผ่าน?"
    const maskedStyle = !showPassword ? {
        WebkitTextSecurity: 'disc',
        textSecurity: 'disc',
    } : {};

    return (
        <div className="login-page">
            <div className="login-split-card">

                {/* ============================================ */}
                {/* ด้านซ้าย: ฟอร์มเข้าสู่ระบบ                    */}
                {/* ============================================ */}
                <div className="login-form-side">
                    {/* โลโก้ */}
                    <div className="login-brand">
                        <img
                            src={logoUrl}
                            alt="Thai Herb Centers"
                            className="login-brand-logo"
                        />
                    </div>

                    {/* ข้อความต้อนรับ */}
                    <div className="login-header-text">
                        <h1>เข้าสู่ระบบ</h1>
                        <p>กรุณากรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งานระบบ</p>
                    </div>

                    {/* ฟอร์ม Login — ไม่ใช้ <form> tag เพื่อป้องกัน Chrome ตรวจจับ */}
                    <div
                        ref={formRef}
                        className="login-form"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                    >
                        {/* Error message */}
                        {error && (
                            <div className="login-error">
                                <span className="login-error-icon">!</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Username — ใช้ name แปลก ๆ ไม่ให้ Chrome จำ */}
                        <div className="form-group">
                            <label>ชื่อผู้ใช้งาน</label>
                            <div className="input-wrapper">
                                <User size={18} className="input-icon" />
                                <input
                                    type="text"
                                    name="erp_xfield_u"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="กรอกชื่อผู้ใช้งาน"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Password — ใช้ type="text" + CSS mask แทน type="password" */}
                        {/* วิธีนี้ Chrome ไม่เห็น password field → ไม่ถาม save password เด็ดขาด */}
                        <div className="form-group">
                            <label>รหัสผ่าน</label>
                            <div className="input-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type="text"
                                    name="erp_xfield_p"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="กรอกรหัสผ่าน"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    style={maskedStyle}
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit button */}
                        <button
                            type="button"
                            className={`btn-login ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading || !username || !password}
                            onClick={handleSubmit}
                        >
                            {isLoading ? <span className="spinner"></span> : 'เข้าสู่ระบบ'}
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="login-footer">
                        <span>© 2025 Thai Herb Centers. สงวนลิขสิทธิ์.</span>
                    </div>
                </div>

                {/* ============================================ */}
                {/* ด้านขวา: Branding Panel                       */}
                {/* ============================================ */}
                <div className="login-info-side">
                    <div className="branding-panel">
                        <div className="branding-content">
                            <div className="branding-icon">
                                <ShieldCheck size={48} strokeWidth={1.5} />
                            </div>
                            <h2 className="branding-title">
                                ระบบจัดการทรัพยากรองค์กร
                            </h2>
                            <p className="branding-subtitle">
                                Enterprise Resource Planning System
                            </p>
                            <div className="branding-divider"></div>
                            <p className="branding-desc">
                                ระบบบริหารจัดการเอกสาร ควบคุมคุณภาพ
                                <br />
                                และทรัพยากรองค์กรอย่างครบวงจร
                            </p>
                        </div>
                        <div className="branding-footer-text">
                            Thai Herb Centers
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

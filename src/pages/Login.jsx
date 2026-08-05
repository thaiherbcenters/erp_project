/**
 * =============================================================================
 * Login.jsx — หน้าเข้าสู่ระบบ (Login Page)
 * =============================================================================
 *
 * ป้องกัน Chrome autofill/save password แบบเด็ดขาด:
 *   - ไม่ใช้ type="password" → Chrome ไม่เห็นว่าเป็น login form
 *   - ไม่ใช้ <form> tag → Chrome ไม่ตรวจจับ form submission
 *   - ใช้ CSS class "masked-input" ซ่อนรหัสผ่าน
 *   - ใช้ custom placeholder (span) แทน native placeholder
 *     เพื่อป้องกัน -webkit-text-security กินตัวอักษร Thai
 *
 * =============================================================================
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ShieldCheck, Lock, User } from 'lucide-react';
import logoUrl from '../assets/logo.png';
import './Login.css';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const userRef = useRef(null);
    const passRef = useRef(null);

    // ล้างค่าที่ Chrome อาจ autofill ก่อน React mount
    useEffect(() => {
        const t = setTimeout(() => {
            if (userRef.current) userRef.current.value = '';
            if (passRef.current) passRef.current.value = '';
            setUsername('');
            setPassword('');
        }, 50);
        return () => clearTimeout(t);
    }, []);

    const handleSubmit = async () => {
        if (!username || !password) return;
        setError('');
        setIsLoading(true);

        await new Promise((r) => setTimeout(r, 800));

        const result = await login(username, password);
        if (result.success) {
            setUsername('');
            setPassword('');
            navigate(result.redirectPath);
        } else {
            setError(result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSubmit();
    };

    return (
        <div className="login-page">
            <div className="login-split-card">

                {/* ด้านซ้าย: ฟอร์มเข้าสู่ระบบ */}
                <div className="login-form-side">
                    <div className="login-brand">
                        <img src={logoUrl} alt="Thai Herb Centers" className="login-brand-logo" />
                    </div>

                    <div className="login-header-text">
                        <h1>เข้าสู่ระบบ</h1>
                        <p>กรุณากรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งานระบบ</p>
                    </div>

                    {/* ไม่ใช้ <form> เพื่อไม่ให้ Chrome ตรวจจับ */}
                    <div className="login-form">
                        {error && (
                            <div className="login-error">
                                <span className="login-error-icon">!</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Username */}
                        <div className="form-group">
                            <label>ชื่อผู้ใช้งาน</label>
                            <div className="input-wrapper">
                                <User size={18} className="input-icon" />
                                <input
                                    ref={userRef}
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoComplete="off"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                />
                                {/* Custom placeholder — ไม่ใช้ native placeholder เพราะ Thai font bug */}
                                {!username && (
                                    <span className="custom-placeholder">กรอกชื่อผู้ใช้งาน</span>
                                )}
                            </div>
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label>รหัสผ่าน</label>
                            <div className="input-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    ref={passRef}
                                    type="text"
                                    className={!showPassword && password ? 'masked-input' : ''}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoComplete="off"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                />
                                {/* Custom placeholder */}
                                {!password && (
                                    <span className="custom-placeholder">กรอกรหัสผ่าน</span>
                                )}
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

                        {/* Submit */}
                        <button
                            type="button"
                            className={`btn-login ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading || !username || !password}
                            onClick={handleSubmit}
                        >
                            {isLoading ? <span className="spinner"></span> : 'เข้าสู่ระบบ'}
                        </button>
                    </div>

                    <div className="login-footer">
                        <span>© 2025 Thai Herb Centers. สงวนลิขสิทธิ์.</span>
                    </div>
                </div>

                {/* ด้านขวา: Branding Panel */}
                <div className="login-info-side">
                    <div className="branding-panel">
                        <div className="branding-content">
                            <div className="branding-icon">
                                <ShieldCheck size={48} strokeWidth={1.5} />
                            </div>
                            <h2 className="branding-title">ระบบจัดการทรัพยากรองค์กร</h2>
                            <p className="branding-subtitle">Enterprise Resource Planning System</p>
                            <div className="branding-divider"></div>
                            <p className="branding-desc">
                                ระบบบริหารจัดการเอกสาร ควบคุมคุณภาพ
                                <br />
                                และทรัพยากรองค์กรอย่างครบวงจร
                            </p>
                        </div>
                        <div className="branding-footer-text">Thai Herb Centers</div>
                    </div>
                </div>

            </div>
        </div>
    );
}

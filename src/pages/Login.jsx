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
 *
 * =============================================================================
 */

import { useState } from 'react';
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

    // ── Handle submit ──
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        await new Promise((r) => setTimeout(r, 800));

        const result = await login(username, password);
        if (result.success) {
            navigate(result.redirectPath);
        } else {
            setError(result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            setIsLoading(false);
        }
    };

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
                        <h1>เข้าสู่ระบบ (Got)</h1>
                        <p>กรุณากรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งานระบบ</p>
                    </div>

                    {/* ฟอร์ม Login */}
                    <form onSubmit={handleSubmit} className="login-form">
                        {/* Error message */}
                        {error && (
                            <div className="login-error">
                                <span className="login-error-icon">!</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Username */}
                        <div className="form-group">
                            <label htmlFor="username">ชื่อผู้ใช้งาน</label>
                            <div className="input-wrapper">
                                <User size={18} className="input-icon" />
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="กรอกชื่อผู้ใช้งาน"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Password + toggle visibility */}
                        <div className="form-group">
                            <label htmlFor="password">รหัสผ่าน</label>
                            <div className="input-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="กรอกรหัสผ่าน"
                                    required
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
                            type="submit"
                            className={`btn-login ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? <span className="spinner"></span> : 'เข้าสู่ระบบ'}
                        </button>
                    </form>

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

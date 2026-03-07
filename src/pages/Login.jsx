/**
 * =============================================================================
 * Login.jsx — หน้าเข้าสู่ระบบ (Login Page)
 * =============================================================================
 *
 * หน้า Login แบบ split-card:
 *   - ด้านซ้าย: ฟอร์มเข้าสู่ระบบ (username + password)
 *   - ด้านขวา: Showcase แสดง dashboard mockup (decorative)
 *
 * ฟีเจอร์:
 *   - แสดง/ซ่อนรหัสผ่าน (Eye icon)
 *   - Loading spinner ขณะล็อกอิน
 *   - แสดง error message เมื่อล็อกอินผิดพลาด
 *   - Simulate network delay 800ms (จำลอง API call)
 *
 * =============================================================================
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
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

    // ── Handle submit: จำลอง network delay → login → redirect ──
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // จำลองเวลาตอบสนองจาก server
        await new Promise((r) => setTimeout(r, 800));

        const result = login(username, password);
        if (result.success) {
            navigate(result.redirectPath);
        } else {
            setError('Login failed. Please try again.');
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
                    <div className="login-brand" style={{ marginBottom: '2rem' }}>
                        <img
                            src={logoUrl}
                            alt="Thai Herb Centers"
                            style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
                        />
                    </div>

                    {/* ข้อความต้อนรับ */}
                    <div className="login-header-text">
                        <h1>Welcome to ERP System</h1>
                        <p>Please enter your credentials to access the enterprise portal.</p>
                    </div>

                    {/* ฟอร์ม Login */}
                    <form onSubmit={handleSubmit} className="login-form">
                        {/* Error message */}
                        {error && (
                            <div className="login-error">
                                <span>!</span> {error}
                            </div>
                        )}

                        {/* Username */}
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                                autoFocus
                            />
                        </div>

                        {/* Password + toggle visibility */}
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember me + Forgot password */}
                        <div className="form-actions-row">
                            <label className="remember-me">
                                <input type="checkbox" />
                                <span>Remember Me</span>
                            </label>
                            <a href="#" className="forgot-password">Forgot Your Password?</a>
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            className={`btn-login ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? <span className="spinner"></span> : 'Log In'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="login-footer">
                        <span>Copyright © 2025 Thai Herb Centers.</span>
                        <a href="#">Privacy Policy</a>
                    </div>
                </div>

                {/* ============================================ */}
                {/* ด้านขวา: Showcase (decorative)                */}
                {/* ============================================ */}
                <div className="login-info-side">
                    <div className="showcase-container">
                        <div className="showcase-inner">
                            {/* Floating decorative elements */}
                            <div className="float-element fe-plus fe-1">+</div>
                            <div className="float-element fe-plus fe-2">+</div>
                            <div className="float-element fe-plus fe-3">+</div>
                            <div className="float-element fe-dot fe-4"></div>
                            <div className="float-element fe-dot fe-5"></div>

                            {/* Mock dashboard card */}
                            <div className="showcase-dashboard">
                                <div className="dash-topbar">
                                    <span className="dot-red"></span>
                                    <span className="dot-yellow"></span>
                                    <span className="dot-green"></span>
                                    <div className="dash-url-bar">
                                        <span className="search-icon">🔍</span>
                                    </div>
                                </div>
                                <div className="dash-content">
                                    <div className="mini-bars">
                                        <div className="mini-bar mb-1"></div>
                                        <div className="mini-bar mb-2"></div>
                                        <div className="mini-bar mb-3"></div>
                                        <div className="mini-bar mb-4"></div>
                                        <div className="mini-bar mb-5"></div>
                                    </div>
                                    <svg className="mini-line-chart" viewBox="0 0 120 50">
                                        <polyline points="0,40 20,35 40,25 60,30 80,15 100,20 120,5" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <circle cx="40" cy="25" r="3" fill="#3b82f6" />
                                        <circle cx="80" cy="15" r="3" fill="#3b82f6" />
                                        <circle cx="120" cy="5" r="3" fill="#f59e0b" />
                                    </svg>
                                </div>
                            </div>

                            {/* Floating checklist */}
                            <div className="showcase-checklist">
                                <div className="check-item"><span className="check-box">✓</span><div className="check-line"></div></div>
                                <div className="check-item"><span className="check-box">✓</span><div className="check-line short"></div></div>
                                <div className="check-item"><span className="check-box">✓</span><div className="check-line"></div></div>
                            </div>

                            {/* Floating pie chart */}
                            <div className="showcase-pie">
                                <svg viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="60 40" strokeDashoffset="25" />
                                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="25 75" strokeDashoffset="85" />
                                </svg>
                            </div>

                            {/* Floating lightbulb */}
                            <div className="showcase-bulb">💡</div>

                            {/* Floating search bar */}
                            <div className="showcase-search">
                                <span>🔍</span>
                                <div className="search-line"></div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

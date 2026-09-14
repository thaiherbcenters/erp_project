/**
 * =============================================================================
 * CompanySelector.jsx — หน้าเลือกพื้นที่ทำงาน (Compact Enterprise Workspace Selector)
 * ออกแบบกะทัดรัด สวยงาม เลือกง่าย สบายตา ไม่ต้องเลื่อนจอ (Zero Scroll)
 * =============================================================================
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    Building2, 
    Leaf, 
    Diamond, 
    Shield, 
    Sprout, 
    LogOut, 
    ChevronRight, 
    Sparkles, 
    Factory, 
    Gem, 
    ShieldCheck, 
    CheckCircle2 
} from 'lucide-react';
import './CompanySelector.css';

// Fallback logo mapping
const COMPANY_LOGOS = {
    1: '/images/logos/logo-thc.png',
    2: '/images/logos/logo-elite.png',
    3: '/images/logos/logo-riv.png',
    4: '/images/logos/logo-psf.png',
    THC: '/images/logos/logo-thc.png',
    ELITE: '/images/logos/logo-elite.png',
    RIVERVIEW: '/images/logos/logo-riv.png',
    PSF: '/images/logos/logo-psf.png',
};

// Metadata สำหรับป้ายกำกับและธีมสี
const COMPANY_META = {
    1: {
        badge: 'ERP โรงงานหลัก',
        badgeType: 'production',
        BadgeIcon: Factory,
        color: '#4f46e5',
        glowColor: 'rgba(79, 70, 229, 0.2)',
    },
    2: {
        badge: 'Company Portal',
        badgeType: 'trading',
        BadgeIcon: Gem,
        color: '#2563eb',
        glowColor: 'rgba(37, 99, 235, 0.2)',
    },
    3: {
        badge: 'Company Portal',
        badgeType: 'services',
        BadgeIcon: ShieldCheck,
        color: '#7c3aed',
        glowColor: 'rgba(124, 58, 237, 0.2)',
    },
    4: {
        badge: 'Company Portal',
        badgeType: 'farm',
        BadgeIcon: Sprout,
        color: '#ea580c',
        glowColor: 'rgba(234, 88, 12, 0.2)',
    },
    THC: {
        badge: 'ERP โรงงานหลัก',
        badgeType: 'production',
        BadgeIcon: Factory,
        color: '#4f46e5',
        glowColor: 'rgba(79, 70, 229, 0.2)',
    },
    ELITE: {
        badge: 'Company Portal',
        badgeType: 'trading',
        BadgeIcon: Gem,
        color: '#2563eb',
        glowColor: 'rgba(37, 99, 235, 0.2)',
    },
    RIVERVIEW: {
        badge: 'Company Portal',
        badgeType: 'services',
        BadgeIcon: ShieldCheck,
        color: '#7c3aed',
        glowColor: 'rgba(124, 58, 237, 0.2)',
    },
    PSF: {
        badge: 'Company Portal',
        badgeType: 'farm',
        BadgeIcon: Sprout,
        color: '#ea580c',
        glowColor: 'rgba(234, 88, 12, 0.2)',
    }
};

// Map fallback icon name → Lucide component
const ICON_MAP = {
    leaf: Leaf,
    diamond: Diamond,
    shield: Shield,
    sprout: Sprout,
};

export default function CompanySelector() {
    const { currentUser, availableCompanies, selectCompany, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(null); // companyId being selected

    const handleSelect = async (company) => {
        setLoading(company.CompanyID);
        try {
            const result = await selectCompany(company.CompanyID);
            if (result.success) {
                navigate(result.redirectPath || '/home');
            }
        } catch (err) {
            console.error('Select company error:', err);
        } finally {
            setLoading(null);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="cs-page">
            {/* Ambient Background Glows */}
            <div className="cs-ambient-glow glow-1" />
            <div className="cs-ambient-glow glow-2" />
            <div className="cs-ambient-glow glow-3" />

            <div className="cs-container">
                {/* ── Top Header ── */}
                <header className="cs-header">
                    <div className="cs-badge-top">
                        <Sparkles size={13} className="cs-badge-sparkle" />
                        <span>THAIHERB GROUP ENTERPRISE ERP</span>
                    </div>
                    <h1 className="cs-title">
                        เลือกพื้นที่ทำงาน <span>(Workspace)</span>
                    </h1>
                    <p className="cs-subtitle">
                        กรุณาเลือกบริษัทเพื่อเข้าสู่ระบบงาน
                    </p>
                </header>

                {/* ── Compact 2x2 Grid ── */}
                <div className="cs-grid">
                    {availableCompanies?.map((company) => {
                        const meta = COMPANY_META[company.CompanyID] || COMPANY_META[company.ShortName] || {
                            badge: 'Company Portal',
                            badgeType: 'portal',
                            BadgeIcon: Building2,
                            color: company.CompanyColor || '#4f46e5',
                            glowColor: 'rgba(79, 70, 229, 0.2)'
                        };

                        const IconComponent = ICON_MAP[company.CompanyIcon] || meta.BadgeIcon || Building2;
                        const BadgeIcon = meta.BadgeIcon || Building2;
                        const isLoading = loading === company.CompanyID;
                        const logoSrc = company.CompanyLogo || COMPANY_LOGOS[company.CompanyID] || COMPANY_LOGOS[company.ShortName];
                        const companyColor = company.CompanyColor || meta.color || '#4f46e5';

                        return (
                            <div
                                key={company.CompanyID}
                                className={`cs-card-wrapper ${isLoading ? 'is-loading' : ''}`}
                                style={{
                                    '--company-color': companyColor,
                                    '--company-glow': meta.glowColor || 'rgba(0,0,0,0.12)',
                                }}
                            >
                                <button
                                    type="button"
                                    className="cs-compact-card"
                                    onClick={() => handleSelect(company)}
                                    disabled={loading !== null}
                                >
                                    {/* Left: Logo */}
                                    <div className="cs-card-logo-box">
                                        {logoSrc ? (
                                            <img 
                                                src={logoSrc} 
                                                alt={company.ShortName || company.CompanyName} 
                                                className="cs-card-logo-img"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const fallback = e.currentTarget.parentElement.querySelector('.cs-card-fallback-icon');
                                                    if (fallback) fallback.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div 
                                            className="cs-card-fallback-icon"
                                            style={{ display: logoSrc ? 'none' : 'flex' }}
                                        >
                                            <IconComponent size={24} strokeWidth={1.75} />
                                        </div>
                                    </div>

                                    {/* Center: Info */}
                                    <div className="cs-card-info">
                                        <div className="cs-card-title-row">
                                            <span className="cs-card-short-name">{company.ShortName}</span>
                                            <span className={`cs-card-badge cs-badge-${meta.badgeType}`}>
                                                <BadgeIcon size={12} className="cs-badge-icon" />
                                                <span>{meta.badge}</span>
                                            </span>
                                        </div>
                                        <div className="cs-card-full-name" title={company.CompanyNameTH || company.CompanyName}>
                                            {company.CompanyNameTH || company.CompanyName}
                                        </div>
                                    </div>

                                    {/* Right: Action Arrow or Spinner */}
                                    <div className="cs-card-arrow-wrap">
                                        {isLoading ? (
                                            <span className="cs-spinner" />
                                        ) : (
                                            <div className="cs-arrow-circle">
                                                <ChevronRight size={18} className="cs-arrow-icon" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* ── Compact Footer Bar (User Info & Logout) ── */}
                <footer className="cs-footer">
                    <div className="cs-user-pill">
                        <div className="cs-user-avatar-wrap">
                            <span className="cs-user-avatar">
                                {currentUser?.avatar || 'IT'}
                            </span>
                            <span className="cs-online-dot" />
                        </div>
                        <div className="cs-user-details">
                            <div className="cs-user-name">
                                {currentUser?.name || currentUser?.username || 'ผู้ใช้งาน'}
                            </div>
                            <div className="cs-user-meta">
                                <span className="cs-role-badge">
                                    {currentUser?.role || 'ผู้ดูแลระบบ'}
                                </span>
                                <span className="cs-company-count">
                                    <CheckCircle2 size={12} color="#16a34a" />
                                    <span>{availableCompanies?.length || 0} บริษัท</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <button 
                        type="button" 
                        className="cs-logout-btn" 
                        onClick={handleLogout}
                        title="ออกจากระบบ"
                    >
                        <LogOut size={15} />
                        <span>ออกจากระบบ</span>
                    </button>
                </footer>
            </div>
        </div>
    );
}

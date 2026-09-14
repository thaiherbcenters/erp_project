/**
 * =============================================================================
 * CompanySelector.jsx — หน้าเลือกบริษัทสำหรับผู้บริหาร/admin
 * =============================================================================
 * 
 * แสดงหลัง Login สำเร็จ เมื่อ user มีสิทธิ์เข้าถึงหลายบริษัท
 * user เลือกบริษัท → ระบบ set active company → redirect ไป Dashboard
 *
 * =============================================================================
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Leaf, Diamond, Shield, Sprout, LogOut, ChevronRight } from 'lucide-react';
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

// Map icon name → Lucide component
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
            <div className="cs-container">
                {/* Header */}
                <div className="cs-header">
                    <div className="cs-header-icon">
                        <Building2 size={32} strokeWidth={1.5} />
                    </div>
                    <h1 className="cs-title">เลือกบริษัทที่ต้องการเข้าใช้งาน</h1>
                    <p className="cs-subtitle">กรุณาเลือกบริษัทเพื่อเข้าสู่ระบบ ERP</p>
                </div>

                {/* Company Cards */}
                <div className="cs-grid">
                    {availableCompanies?.map((company) => {
                        const IconComponent = ICON_MAP[company.CompanyIcon] || Building2;
                        const isLoading = loading === company.CompanyID;
                        const logoSrc = company.CompanyLogo || COMPANY_LOGOS[company.CompanyID] || COMPANY_LOGOS[company.ShortName];

                        return (
                            <button
                                key={company.CompanyID}
                                className={`cs-card ${isLoading ? 'cs-card-loading' : ''}`}
                                onClick={() => handleSelect(company)}
                                disabled={loading !== null}
                                style={{ '--company-color': company.CompanyColor || '#4f46e5' }}
                            >
                                <div className="cs-card-icon">
                                    {logoSrc ? (
                                        <img 
                                            src={logoSrc} 
                                            alt={company.ShortName || company.CompanyName} 
                                            className="cs-card-img"
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
                                        <IconComponent size={26} strokeWidth={1.5} />
                                    </div>
                                </div>
                                <div className="cs-card-info">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="cs-card-short">{company.ShortName}</span>
                                        {company.ShortName === 'THC' ? (
                                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#15803d' }}>ERP โรงงาน</span>
                                        ) : (
                                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1' }}>Company Portal</span>
                                        )}
                                    </div>
                                    <span className="cs-card-name">{company.CompanyNameTH || company.CompanyName}</span>
                                </div>
                                <div className="cs-card-arrow">
                                    {isLoading ? (
                                        <span className="cs-spinner"></span>
                                    ) : (
                                        <ChevronRight size={20} />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="cs-footer">
                    <div className="cs-user-info">
                        <span className="cs-user-avatar">{currentUser?.avatar}</span>
                        <span className="cs-user-name">
                            {currentUser?.name || currentUser?.username}
                        </span>
                    </div>
                    <button className="cs-logout-btn" onClick={handleLogout}>
                        <LogOut size={16} />
                        <span>ออกจากระบบ</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

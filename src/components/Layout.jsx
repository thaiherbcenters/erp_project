/**
 * =============================================================================
 * Layout.jsx — โครงสร้างหลักของ App (Sidebar + Top Navbar + Content)
 * =============================================================================
 *
 * Component นี้ประกอบด้วย:
 *   1. Sidebar (เมนูด้านซ้าย)
 *      - โลโก้บริษัท
 *      - เมนูหลัก (home, stock, sales, reports, qc)
 *      - เมนูบุคลากร (hr)
 *      - เมนูระบบ (settings, permissions)
 *      - ข้อมูลผู้ใช้ + ปุ่ม Logout
 *   2. Top Navbar (แถบด้านบน)
 *      - Breadcrumb แสดงหน้าปัจจุบัน
 *      - ช่องค้นหา + ปุ่มแจ้งเตือน
 *   3. Main Content (เนื้อหาหลักจาก <Outlet />)
 *
 * Responsive:
 *   - Desktop: sidebar แบบ collapsible (ย่อ/ขยาย)
 *   - Mobile (<= 768px): sidebar แบบ overlay + mobile header
 *
 * =============================================================================
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    CreditCard,
    Package,
    ShoppingCart,
    FileBarChart,
    Users,
    Settings,
    ShieldCheck,
    LogOut,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ClipboardCheck,
    Calculator,
    ShoppingBag,
    Search,
    Bell,
    MessageSquare,
    Home,
    CalendarDays,
    Wrench,
    FlaskConical,
    PackageOpen,
    FileText,
    Menu,
    Truck,
    Building2,
    ChevronsUpDown,
    ExternalLink,
} from 'lucide-react';
import logoUrl from '../assets/logo.png';
import logoSmallUrl from '../assets/logo-small.png';
import './Layout.css';

// =============================================================================
// Helper: เลือก icon ตาม pageId
// =============================================================================
const PAGE_ICONS = {
    home: <LayoutDashboard size={20} />,
    stock: <Package size={20} />,
    sales: <ShoppingCart size={20} />,
    accounts: <Calculator size={20} />,
    procurement: <ShoppingBag size={20} />,
    reports: <FileBarChart size={20} />,
    hr: <Users size={20} />,
    qc: <ClipboardCheck size={20} />,
    settings: <Settings size={20} />,
    permissions: <ShieldCheck size={20} />,
    planning: <CalendarDays size={20} />,
    operator: <Wrench size={20} />,
    rnd: <FlaskConical size={20} />,
    packaging: <PackageOpen size={20} />,
    fulfillment: <Truck size={20} />,
    document: <FileText size={20} />,
    customer: <Users size={20} />,
    elite: <CreditCard size={20} />,
    elite_documents: <FileText size={20} />,
};

const getPageIcon = (pageId) => {
    return PAGE_ICONS[pageId] || <span className="nav-icon">–</span>;
};

// =============================================================================
// Helper: แปลง role เป็นชื่อที่แสดง
// =============================================================================
const ROLE_LABELS = {
    admin: 'ผู้ดูแลระบบ',
    executive: 'ผู้บริหาร',
    qc: 'เจ้าหน้าที่ QC',
    sales: 'ฝ่ายขาย',
    accountant: 'ฝ่ายบัญชี',
    procurement: 'ฝ่ายจัดซื้อ',
    hr: 'ฝ่ายบุคคล',
    stock: 'พนักงานคลังสินค้า',
    planner: 'เผู้วางแผนการผลิต',
    operator: 'พนักงานฝ่ายผลิต',
    rnd: 'นักวิจัยและพัฒนา',
    packaging: 'พนักงานบรรจุภัณฑ์',
    document_control: 'เจ้าหน้าที่ควบคุมเอกสาร',
};

/** แปลง role code เป็นชื่อภาษาไทย (default: ผู้ใช้งาน) */
const getRoleLabel = (role) => ROLE_LABELS[role] || 'ผู้ใช้งาน';

// =============================================================================
// Company Theme Color Palettes (Multi-Company ERP)
// =============================================================================
const COMPANY_THEMES = {
    1: { primary: '#4f46e5', dark: '#3730a3', light: '#818cf8', bg: '#eef2f6', accent: '#4338ca' },
    THC: { primary: '#4f46e5', dark: '#3730a3', light: '#818cf8', bg: '#eef2f6', accent: '#4338ca' },
    2: { primary: '#2563eb', dark: '#1d4ed8', light: '#3b82f6', bg: '#eff6ff', accent: '#1d4ed8' },
    ELITE: { primary: '#2563eb', dark: '#1d4ed8', light: '#3b82f6', bg: '#eff6ff', accent: '#1d4ed8' },
    3: { primary: '#7c3aed', dark: '#6d28d9', light: '#8b5cf6', bg: '#faf5ff', accent: '#6d28d9' },
    RIVERVIEW: { primary: '#7c3aed', dark: '#6d28d9', light: '#8b5cf6', bg: '#faf5ff', accent: '#6d28d9' },
    4: { primary: '#ea580c', dark: '#c2410c', light: '#f97316', bg: '#fff7ed', accent: '#c2410c' },
    PSF: { primary: '#ea580c', dark: '#c2410c', light: '#f97316', bg: '#fff7ed', accent: '#c2410c' },
};

// =============================================================================
// กำหนดว่า page ใดอยู่ในกลุ่มเมนูไหน
// =============================================================================
const CORE_MENU_IDS = ['home', 'customer', 'stock', 'sales', 'accounts', 'procurement', 'reports', 'qc'];
const NON_MANUFACTURING_CORE_IDS = ['home', 'elite', 'customer', 'sales', 'accounts', 'reports'];
const LOGISTICS_MENU_IDS = ['fulfillment'];
const PRODUCT_MENU_IDS = ['planning', 'operator', 'rnd', 'packaging'];
const DOC_MENU_IDS = ['document'];
const HR_MENU_IDS = ['hr'];
const SYSTEM_MENU_IDS = ['settings'];
const ELITE_MENU_IDS = ['elite', 'elite_documents'];

// =============================================================================
// Layout Component
// =============================================================================
export default function Layout() {
    const { currentUser, logout, getVisiblePages, getVisibleSubPages, permissions, activeCompany, availableCompanies, switchCompany } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // ── Data & Menu Visibility ──
    const visiblePages = getVisiblePages();

    // ── Sidebar state ──
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [companySwitcherOpen, setCompanySwitcherOpen] = useState(false);
    const companySwitcherRef = useRef(null);

    // ── ตรวจสอบประเภทบริษัท ──
    const isTHC = !activeCompany || activeCompany.CompanyID === 1 || (activeCompany.ShortName || '').toUpperCase() === 'THC';
    const isElite = activeCompany?.CompanyID === 2 || (activeCompany?.ShortName || '').toUpperCase() === 'ELITE';

    // ── Dynamic Theme: ปรับสีหลักตามบริษัทที่เลือก (THC ใช้สีเดิมแท้ 100% ไม่ยุ่ง) ──
    useEffect(() => {
        if (!activeCompany || activeCompany.CompanyID === 1 || activeCompany.ShortName === 'THC') {
            // THC: ลบ inline style เพื่อใช้สีเดิมแท้จาก index.css 100%
            document.documentElement.style.removeProperty('--primary');
            document.documentElement.style.removeProperty('--primary-dark');
            document.documentElement.style.removeProperty('--primary-light');
            document.documentElement.style.removeProperty('--primary-bg');
            document.documentElement.style.removeProperty('--accent');
        } else {
            const theme = COMPANY_THEMES[activeCompany.CompanyID] || COMPANY_THEMES[activeCompany.ShortName] || {
                primary: activeCompany.CompanyColor || '#2563eb',
                dark: '#1d4ed8',
                light: '#3b82f6',
                bg: '#eff6ff',
                accent: '#1d4ed8'
            };
            document.documentElement.style.setProperty('--primary', theme.primary);
            document.documentElement.style.setProperty('--primary-dark', theme.dark);
            document.documentElement.style.setProperty('--primary-light', theme.light);
            document.documentElement.style.setProperty('--primary-bg', theme.bg);
            document.documentElement.style.setProperty('--accent', theme.accent);
        }
    }, [activeCompany]);

    // ── ปิด Company Switcher เมื่อคลิกข้างนอก ──
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (companySwitcherRef.current && !companySwitcherRef.current.contains(e.target)) {
                setCompanySwitcherOpen(false);
            }
        };
        if (companySwitcherOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [companySwitcherOpen]);

    // ── Company Switcher handler ──
    const handleSwitchCompany = async (companyId) => {
        setCompanySwitcherOpen(false);
        const result = await switchCompany(companyId);
        if (result?.success) {
            navigate(result.redirectPath || '/home');
        }
    };

    const sortedVisiblePages = useMemo(() => {
        return [...visiblePages].sort((a, b) => b.path.length - a.path.length);
    }, [visiblePages]);

    // เปิด Auto-expand group อัตโนมัติเมื่อ URL ปัจจุบันตรง
    useEffect(() => {
        const matchedPage = sortedVisiblePages.find((p) => location.pathname.startsWith(p.path));
        if (matchedPage) {
            setExpandedGroups((prev) => {
                if (prev[matchedPage.id]) return prev;
                return { ...prev, [matchedPage.id]: true };
            });
        }
    }, [location.pathname, sortedVisiblePages]);

    // ── ปรับ sidebar ตามขนาดหน้าจอ ──
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            setSidebarOpen(!mobile); // desktop = เปิด, mobile = ปิด
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── Mobile: ปิด sidebar เมื่อเปลี่ยนหน้า ──
    useEffect(() => {
        if (isMobile) setSidebarOpen(false);
    }, [location.pathname, isMobile]);

    // ── Logout: ล้าง user แล้ว redirect ไป Login ──
    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // =================================================================
    // Sub-component: toggle เปิด/ปิด sub-menu ของแต่ละกลุ่ม
    // =================================================================
    const toggleGroup = (pageId) => {
        setExpandedGroups((prev) => ({ ...prev, [pageId]: !prev[pageId] }));
    };

    // =================================================================
    // Sub-component: แสดงเมนูและ sub-navigation
    // =================================================================
    const renderNavGroup = (page) => {
        const subPages = page.id !== 'permissions' ? getVisibleSubPages(page.id) : null;
        const hasSubPages = subPages && subPages.length > 0;
        const activePage = sortedVisiblePages.find((p) => location.pathname.startsWith(p.path));
        const isActive = activePage && activePage.id === page.id;
        const isExpanded = expandedGroups[page.id];
        const pageLabel = page.name;
        const pageIcon = getPageIcon(page.id);

        const handleClick = (e) => {
            if (hasSubPages && isActive) {
                // ถ้าอยู่ในหน้านี้อยู่แล้ว → toggle ซ่อน/แสดง sub-menu
                e.preventDefault();
                toggleGroup(page.id);
            } else if (hasSubPages) {
                // ถ้ากดจากหน้าอื่น → เปิด sub-menu
                setExpandedGroups((prev) => ({ ...prev, [page.id]: true }));
            }
        };

        return (
            <div key={page.id} className="nav-group">
                {/* เมนูหลัก */}
                <NavLink
                    to={page.path}
                    end
                    className={() => `nav-item ${isActive ? 'active' : ''}`}
                    title={!sidebarOpen ? pageLabel : ''}
                    onClick={handleClick}
                >
                    <span className="nav-icon-wrapper">{pageIcon}</span>
                    <span className="nav-label">{pageLabel}</span>
                    {hasSubPages && sidebarOpen && (
                        <span className={`nav-chevron ${isExpanded ? 'expanded' : ''}`}>
                            <ChevronDown size={16} />
                        </span>
                    )}
                </NavLink>

                {/* Sub-navigation: แสดงเมื่อ sidebar เปิด + group ถูก expand */}
                {sidebarOpen && isExpanded && hasSubPages && (
                    <div className="sub-nav-list">
                        {subPages.map((sub) => (
                            <NavLink
                                key={sub.id}
                                to={sub.path || `${page.path}?tab=${sub.id}`}
                                className={() => {
                                    const currentTab = new URLSearchParams(location.search).get('tab')
                                        || getVisibleSubPages(page.id)[0]?.id;
                                    // If sub has an explicit path, match exactly. Otherwise, it's a tab so we must be exactly on the parent page path.
                                    const isActiveRoute = sub.path 
                                        ? location.pathname === sub.path 
                                        : (location.pathname === page.path && currentTab === sub.id);
                                    return `sub-nav-item ${isActiveRoute ? 'active' : ''}`;
                                }}
                            >
                                <span className="nav-label">{sub.name}</span>
                            </NavLink>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // =================================================================
    // Sub-component: แสดงกลุ่มเมนู (section title + items)
    // =================================================================
    const renderMenuSection = (title, pageIds, extraStyle = {}) => {
        const filteredPages = visiblePages.filter((p) => pageIds.includes(p.id));
        if (filteredPages.length === 0) return null;

        return (
            <>
                <div className="nav-section-title" style={extraStyle}>
                    {sidebarOpen ? title : '·'}
                </div>
                {filteredPages.map(renderNavGroup)}
            </>
        );
    };

    // =================================================================
    // Render
    // =================================================================
    return (
        <div className={`layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>

            {/* ── Mobile: overlay เมื่อ sidebar เปิด ── */}
            {isMobile && sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── Mobile: header bar ด้านบน ── */}
            {isMobile && (
                <header className="mobile-header">
                    <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <Menu size={22} />
                    </button>
                    <span className="mobile-title">{activeCompany?.ShortName || 'THAI HERB'}</span>
                    <span className="mobile-user">{currentUser?.avatar}</span>
                </header>
            )}

            {/* ============================================================ */}
            {/* Sidebar                                                      */}
            {/* ============================================================ */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>

                {/* ── Sidebar Header: โลโก้ + ปุ่มย่อ/ขยาย ── */}
                {!isMobile && (
                    <div className="sidebar-header">
                        <div
                            className="sidebar-logo"
                            onClick={() => !sidebarOpen && setSidebarOpen(true)}
                            style={{ cursor: !sidebarOpen ? 'pointer' : 'default' }}
                        >
                            <img
                                src={activeCompany?.CompanyLogo || (isElite ? '/images/logos/logo-elite.png' : (sidebarOpen ? logoUrl : logoSmallUrl))}
                                alt={activeCompany?.CompanyName || 'Thai Herb Centers'}
                                style={{
                                    height: sidebarOpen ? '36px' : '36px',
                                    maxWidth: sidebarOpen ? '150px' : '40px',
                                    width: 'auto',
                                    objectFit: 'contain',
                                    transition: 'all 0.3s ease',
                                }}
                            />
                        </div>
                        <button 
                            className="sidebar-toggle" 
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            title={sidebarOpen ? 'ย่อแถบเมนู' : 'ขยายแถบเมนู'}
                            aria-label={sidebarOpen ? 'ย่อแถบเมนู' : 'ขยายแถบเมนู'}
                        >
                            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                        </button>
                    </div>
                )}

                {/* ── Mobile: Sidebar Header ── */}
                {isMobile && (
                    <div className="sidebar-header">
                        <div className="sidebar-logo">
                            <img 
                                src={activeCompany?.CompanyLogo || (isElite ? '/images/logos/logo-elite.png' : logoUrl)} 
                                alt={activeCompany?.CompanyName || 'Thai Herb Centers'} 
                                style={{ height: '32px', width: 'auto', objectFit: 'contain' }} 
                            />
                        </div>
                        <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)}>
                            ✕
                        </button>
                    </div>
                )}

                {/* ── Navigation Menu ── */}
                <nav className="sidebar-nav">
                    {/* เมนูสำหรับโรงงาน THC (ERP เต็มรูปแบบ) */}
                    {isTHC && (
                        <>
                            {renderMenuSection('เมนูหลัก', CORE_MENU_IDS)}
                            {renderMenuSection('การผลิต', PRODUCT_MENU_IDS, { marginTop: '16px' })}
                            {renderMenuSection('จัดส่ง', LOGISTICS_MENU_IDS, { marginTop: '16px' })}
                            {renderMenuSection('ระบบเอกสาร', DOC_MENU_IDS, { marginTop: '16px' })}
                            {renderMenuSection('บุคลากร', HR_MENU_IDS, { marginTop: '16px' })}
                            {renderMenuSection('ระบบ', SYSTEM_MENU_IDS, { marginTop: '16px' })}
                        </>
                    )}

                    {/* เมนูสำหรับ ELITE (ระบบเช็คและการเงิน) */}
                    {isElite && (
                        <>
                            {renderMenuSection('เมนูหลัก', ELITE_MENU_IDS)}
                        </>
                    )}
                </nav>

                {/* ── Sidebar Footer: ข้อมูล user + Logout ── */}
                <div className="sidebar-footer">
                    <div className="user-info card-style">
                        <span className="user-avatar">{currentUser?.avatar}</span>
                        <div className="user-details">
                        <span className="user-name">{currentUser?.name || currentUser?.displayName || currentUser?.username}</span>
                            <span className="user-role">{getRoleLabel(currentUser?.role)}</span>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout} title="ออกจากระบบ">
                        <LogOut size={16} />
                        <span className="logout-text">ออกจากระบบ</span>
                    </button>
                </div>
            </aside>

            {/* ============================================================ */}
            {/* Main Content Area                                            */}
            {/* ============================================================ */}
            <main className="main-content">

                {/* ── Top Navbar: Breadcrumb + Search + Notifications ── */}
                <div className="top-navbar">
                    <div className="breadcrumb">
                        <Home size={16} />
                        <span>/</span>
                        <span className="current-page">
                            {(() => {
                                const matchedPage = sortedVisiblePages.find((p) => location.pathname.startsWith(p.path));
                                if (!matchedPage) return 'Dashboard';

                                const subPages = getVisibleSubPages(matchedPage.id);
                                const currentTab = new URLSearchParams(location.search).get('tab');
                                // match active sub page based on path or tab
                                const activeSub = subPages?.find((s) => s.path ? location.pathname === s.path : s.id === currentTab) || subPages?.[0];

                                return (
                                    <>
                                        {matchedPage.name}
                                        {activeSub && (
                                            <>
                                                <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>/</span>
                                                <span 
                                                    style={{ color: 'var(--primary)', cursor: 'pointer', borderBottom: '1px solid var(--primary)', paddingBottom: '1px' }}
                                                    onClick={() => window.dispatchEvent(new CustomEvent('reset-tab-state', { detail: activeSub.id }))}
                                                    title={`กลับสู่หน้ารายการ ${activeSub.name}`}
                                                >
                                                    {activeSub.name}
                                                </span>
                                            </>
                                        )}
                                    </>
                                );
                            })()}
                        </span>
                    </div>

                    <div className="top-nav-actions">
                        {/* แสดงป้ายสลับบริษัทเฉพาะเมื่อมีสิทธิ์เข้าถึงมากกว่า 1 บริษัท (เช่น ผู้บริหาร, Admin) — user ปกติที่มีบริษัทเดียวจะไม่แสดงป้ายนี้ */}
                        {activeCompany && availableCompanies && availableCompanies.length > 1 && (
                            <div className="top-company-switcher" ref={companySwitcherRef}>
                                <button
                                    className={`top-company-btn ${companySwitcherOpen ? 'active' : ''}`}
                                    onClick={() => setCompanySwitcherOpen(!companySwitcherOpen)}
                                    title="คลิกเพื่อสลับบริษัท"
                                >
                                    <div className="top-company-logo-box">
                                        {activeCompany.CompanyLogo ? (
                                            <img 
                                                src={activeCompany.CompanyLogo} 
                                                alt={activeCompany.ShortName} 
                                                className="top-company-logo"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <span 
                                                className="top-company-dot"
                                                style={{ background: activeCompany.CompanyColor || '#16a34a' }} 
                                            />
                                        )}
                                    </div>

                                    <div className="top-company-info">
                                        <div className="top-company-title-row">
                                            <span className="top-company-code">{activeCompany.ShortName || activeCompany.CompanyName}</span>
                                            {activeCompany.ShortName === 'THC' ? (
                                                <span className="top-badge top-badge-erp">โรงงาน ERP</span>
                                            ) : (
                                                <span className="top-badge top-badge-portal">Portal</span>
                                            )}
                                        </div>
                                        <span className="top-company-name">{activeCompany.CompanyNameTH || activeCompany.CompanyName}</span>
                                    </div>

                                    {availableCompanies.length > 1 && (
                                        <div className={`top-company-arrow ${companySwitcherOpen ? 'open' : ''}`}>
                                            <ChevronsUpDown size={15} />
                                        </div>
                                    )}
                                </button>

                                {/* Dropdown Menu */}
                                {companySwitcherOpen && availableCompanies.length > 1 && (
                                    <div className="top-company-dropdown">
                                        <div className="top-dropdown-header">
                                            <span>สลับบริษัทที่เข้าใช้งาน</span>
                                        </div>

                                        <div className="top-dropdown-list">
                                            {availableCompanies.filter(c => c.CompanyID !== activeCompany.CompanyID).map(company => (
                                                <button
                                                    key={company.CompanyID}
                                                    className="top-dropdown-item"
                                                    onClick={() => handleSwitchCompany(company.CompanyID)}
                                                >
                                                    <div className="top-dropdown-logo-box">
                                                        {company.CompanyLogo ? (
                                                            <img 
                                                                src={company.CompanyLogo} 
                                                                alt={company.ShortName} 
                                                                className="top-dropdown-logo"
                                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <span 
                                                                className="top-company-dot"
                                                                style={{ background: company.CompanyColor || '#4f46e5' }} 
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="top-dropdown-info">
                                                        <span className="top-dropdown-code">{company.ShortName || company.CompanyName}</span>
                                                        <span className="top-dropdown-name">{company.CompanyNameTH || company.CompanyName}</span>
                                                    </div>
                                                    {company.ShortName === 'THC' ? (
                                                        <span className="top-badge top-badge-erp">ERP</span>
                                                    ) : (
                                                        <span className="top-badge top-badge-portal">Portal</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="top-dropdown-footer">
                                            <button 
                                                className="top-dropdown-all-btn"
                                                onClick={() => {
                                                    setCompanySwitcherOpen(false);
                                                    navigate('/select-company');
                                                }}
                                            >
                                                <ExternalLink size={13} />
                                                <span>หน้าเลือกบริษัททั้งหมด</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Page Content (Outlet จาก Router) ── */}
                <div className="page-wrapper">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

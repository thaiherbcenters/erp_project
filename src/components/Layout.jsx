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

import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
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
    document: <FileText size={20} />,
    customer: <Users size={20} />,
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
// กำหนดว่า page ใดอยู่ในกลุ่มเมนูไหน
// =============================================================================
const CORE_MENU_IDS = ['home', 'customer', 'stock', 'sales', 'accounts', 'procurement', 'reports', 'qc'];
const PRODUCT_MENU_IDS = ['planning', 'operator', 'rnd', 'packaging'];
const DOC_MENU_IDS = ['document'];
const HR_MENU_IDS = ['hr'];
const SYSTEM_MENU_IDS = ['settings'];

// =============================================================================
// Layout Component
// =============================================================================
export default function Layout() {
    const { currentUser, logout, getVisiblePages, getVisibleSubPages } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // ── Sidebar state ──
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [expandedGroups, setExpandedGroups] = useState({});

    // ── Pages ที่ user มีสิทธิ์เห็น ──
    const visiblePages = getVisiblePages();

    // ── Auto-expand group ที่ตรงกับ URL ปัจจุบัน ──
    useEffect(() => {
        const matchedPage = visiblePages.find((p) => location.pathname.startsWith(p.path));
        if (matchedPage) {
            setExpandedGroups((prev) => ({ ...prev, [matchedPage.id]: true }));
        }
    }, [location.pathname]);

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
        const isActive = location.pathname.startsWith(page.path);
        const isExpanded = expandedGroups[page.id];

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
                    title={!sidebarOpen ? page.name : ''}
                    onClick={handleClick}
                >
                    <span className="nav-icon-wrapper">{getPageIcon(page.id)}</span>
                    <span className="nav-label">{page.name}</span>
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
                                to={`${page.path}?tab=${sub.id}`}
                                className={() => {
                                    const currentTab = new URLSearchParams(location.search).get('tab')
                                        || getVisibleSubPages(page.id)[0]?.id;
                                    return `sub-nav-item ${isActive && currentTab === sub.id ? 'active' : ''}`;
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
                    <span className="mobile-title">THAI HERB</span>
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
                                src={sidebarOpen ? logoUrl : logoSmallUrl}
                                alt="Thai Herb Centers"
                                style={{
                                    height: sidebarOpen ? '32px' : '40px',
                                    width: 'auto',
                                    objectFit: 'contain',
                                    transition: 'all 0.3s ease',
                                }}
                            />
                        </div>
                        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                        </button>
                    </div>
                )}

                {/* ── Mobile: Sidebar Header ── */}
                {isMobile && (
                    <div className="sidebar-header">
                        <div className="sidebar-logo">
                            <img src={logoUrl} alt="Thai Herb Centers" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
                        </div>
                        <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)}>
                            ✕
                        </button>
                    </div>
                )}

                {/* ── Navigation Menu ── */}
                <nav className="sidebar-nav">
                    {renderMenuSection('เมนูหลัก', CORE_MENU_IDS)}
                    {renderMenuSection('การผลิต', PRODUCT_MENU_IDS, { marginTop: '16px' })}
                    {renderMenuSection('ระบบเอกสาร', DOC_MENU_IDS, { marginTop: '16px' })}
                    {renderMenuSection('บุคลากร', HR_MENU_IDS, { marginTop: '16px' })}
                    {renderMenuSection('ระบบ', SYSTEM_MENU_IDS, { marginTop: '16px' })}
                </nav>

                {/* ── Sidebar Footer: ข้อมูล user + Logout ── */}
                <div className="sidebar-footer">
                    <div className="user-info card-style">
                        <span className="user-avatar">{currentUser?.avatar}</span>
                        <div className="user-details">
                            <span className="user-name">{currentUser?.displayName}</span>
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
                                const matchedPage = visiblePages.find((p) => location.pathname.startsWith(p.path));
                                if (!matchedPage) return 'Dashboard';

                                const subPages = getVisibleSubPages(matchedPage.id);
                                const currentTab = new URLSearchParams(location.search).get('tab');
                                const activeSub = subPages?.find((s) => s.id === currentTab) || subPages?.[0];

                                return (
                                    <>
                                        {matchedPage.name}
                                        {activeSub && (
                                            <>
                                                <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>/</span>
                                                <span style={{ color: 'var(--primary)' }}>{activeSub.name}</span>
                                            </>
                                        )}
                                    </>
                                );
                            })()}
                        </span>
                    </div>

                    <div className="top-nav-actions">
                        <div className="top-search-box">
                            <Search size={16} />
                            <input type="text" placeholder="Search..." />
                        </div>
                        <button className="icon-btn">
                            <MessageSquare size={20} />
                            <span className="notif-dot"></span>
                        </button>
                        <button className="icon-btn">
                            <Bell size={20} />
                            <span className="notif-dot"></span>
                        </button>
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

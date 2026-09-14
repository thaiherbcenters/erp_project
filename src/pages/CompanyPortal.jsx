/**
 * =============================================================================
 * CompanyPortal.jsx — หน้า Company Portal แยกเฉพาะสำหรับแต่ละบริษัท
 * =============================================================================
 * 
 * ใช้สำหรับบริษัทที่ไม่ใช่ THC เช่น:
 *   - PSF (บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด)
 *   - ELITE (บริษัท อิลิท เทรดดิ้ง 2020 จำกัด)
 *   - RIVERVIEW (บริษัท ริเว่อร์วิว โพรเทคท์ แอนด์ คลีนนิ่ง จำกัด)
 *
 * ประกอบด้วย:
 *   1. โลโก้ ข้อมูลบริษัท (TaxID, ที่อยู่) และสถานะระบบ
 *   2. ระบบเอกสารซื้อ-ขาย (ใบเสนอราคา, ใบวางบิล/ใบแจ้งหนี้, ใบเสร็จรับเงิน)
 *   3. พื้นที่เตรียมความพร้อมสำหรับให้ผู้ใช้งานกำหนดฟังก์ชันโมดูลในอนาคต
 *   4. ปุ่มสลับบริษัท / กลับไปหน้าเลือกบริษัท
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';
import { 
    Building2, FileText, Receipt, FileCheck, ArrowLeft, 
    LogOut, ChevronsUpDown, Sparkles, Plus, Clock, 
    ExternalLink, Layers, ShieldCheck, CheckCircle2, ChevronRight,
    MapPin, Hash, Briefcase, BarChart3, ShoppingBag, Users2
} from 'lucide-react';
import QuotationForm from '../components/QuotationForm';
import BillingInvoiceForm from '../components/BillingInvoiceForm';
import ReceiptForm from '../components/ReceiptForm';
import './CompanyPortal.css';

// แมปข้อมูลสำรองของแต่ละบริษัท
const COMPANY_CONFIGS = {
    elite: {
        id: 2,
        short: 'ELITE',
        nameTH: 'บริษัท อิลิท เทรดดิ้ง 2020 จำกัด',
        nameEN: 'Elite Trading 2020 Co., Ltd.',
        taxId: '0105550000000',
        address: 'นนทบุรี ประเทศไทย',
        color: '#2563eb',
        logo: '/images/logos/logo-elite.png',
        docPrefix: 'ELT',
        category: 'การค้าและการจำหน่ายสินค้า (Trading)'
    },
    riverview: {
        id: 3,
        short: 'RIVERVIEW',
        nameTH: 'บริษัท ริเว่อร์วิว โพรเทคท์ แอนด์ คลีนนิ่ง จำกัด',
        nameEN: 'Riverview Protect & Cleaning Co., Ltd.',
        taxId: '0105540000000',
        address: 'ปทุมธานี ประเทศไทย',
        color: '#7c3aed',
        logo: '/images/logos/logo-riv.png',
        docPrefix: 'RIV',
        category: 'บริการทำความสะอาดและคุ้มครอง (Services)'
    },
    psf: {
        id: 4,
        short: 'PSF',
        nameTH: 'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด',
        nameEN: 'Premier Smart Farm Co., Ltd.',
        taxId: '0105560000000',
        address: 'กรุงเทพฯ ประเทศไทย',
        color: '#ea580c',
        logo: '/images/logos/logo-psf.png',
        docPrefix: 'PSF',
        category: 'ฟาร์มอัจฉริยะและวัตถุดิบสมุนไพร (Smart Farming)'
    }
};

export default function CompanyPortal() {
    const { companyCode } = useParams();
    const navigate = useNavigate();
    const { currentUser, activeCompany, availableCompanies, switchCompany, logout } = useAuth();
    const { showAlert } = useAlert();

    const normalizedCode = (companyCode || '').toLowerCase();
    const matchedConfig = COMPANY_CONFIGS[normalizedCode] || null;

    // ค้นหาข้อมูลบริษัทจาก activeCompany หรือ availableCompanies
    const currentCompany = availableCompanies?.find(c => 
        (c.ShortName || '').toLowerCase() === normalizedCode ||
        c.CompanyID === matchedConfig?.id
    ) || activeCompany || matchedConfig;

    // State สำหรับการเปิด Modal เอกสาร
    const [activeDocModal, setActiveDocModal] = useState(null); // 'quotation' | 'billing' | 'receipt'
    const [switcherOpen, setSwitcherOpen] = useState(false);

    // ตรวจสอบและซิงค์ activeCompany ให้ตรงกับ URL
    useEffect(() => {
        if (currentCompany && activeCompany?.CompanyID !== currentCompany.CompanyID) {
            switchCompany(currentCompany.CompanyID);
        }
    }, [normalizedCode]);

    const handleSwitch = async (companyId) => {
        setSwitcherOpen(false);
        const result = await switchCompany(companyId);
        if (result?.success) {
            navigate(result.redirectPath || '/home');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const companyColor = currentCompany?.CompanyColor || matchedConfig?.color || '#2563eb';
    const companyLogo = currentCompany?.CompanyLogo || matchedConfig?.logo || '/images/logos/logo-thc.png';
    const companyShort = currentCompany?.ShortName || matchedConfig?.short || normalizedCode.toUpperCase();
    const companyNameTH = currentCompany?.CompanyNameTH || currentCompany?.CompanyName || matchedConfig?.nameTH;
    const companyNameEN = currentCompany?.CompanyNameEN || matchedConfig?.nameEN;
    const taxId = currentCompany?.TaxID || matchedConfig?.taxId || '-';
    const address = currentCompany?.Address || matchedConfig?.address || '-';
    const category = matchedConfig?.category || 'ธุรกิจในเครือ';

    return (
        <div className="cp-container" style={{ '--cp-theme': companyColor }}>
            {/* ── Top Navigation Bar ── */}
            <header className="cp-navbar">
                <div className="cp-nav-brand">
                    <img 
                        src={companyLogo} 
                        alt={companyShort} 
                        className="cp-nav-logo"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="cp-nav-title-group">
                        <span className="cp-nav-badge" style={{ background: companyColor }}>{companyShort} PORTAL</span>
                        <span className="cp-nav-company-name">{companyNameTH}</span>
                    </div>
                </div>

                <div className="cp-nav-actions">
                    {/* ปุ่มสลับบริษัท (แสดงเฉพาะผู้ใช้ที่มีสิทธิ์เข้าถึงมากกว่า 1 บริษัท) */}
                    {availableCompanies && availableCompanies.length > 1 && (
                        <div className="cp-switcher-wrapper">
                            <button 
                                className="cp-switcher-btn"
                                onClick={() => setSwitcherOpen(!switcherOpen)}
                            >
                                <span className="cp-switcher-dot" style={{ background: companyColor }} />
                                <span>{companyShort}</span>
                                <ChevronsUpDown size={14} className="cp-switcher-icon" />
                            </button>

                            {switcherOpen && (
                                <div className="cp-switcher-menu">
                                    <div className="cp-switcher-header">สลับบริษัทที่เข้าใช้งาน</div>
                                    {availableCompanies?.map(c => (
                                        <button
                                            key={c.CompanyID}
                                            className={`cp-switcher-item ${c.CompanyID === currentCompany?.CompanyID ? 'active' : ''}`}
                                            onClick={() => handleSwitch(c.CompanyID)}
                                        >
                                            <img 
                                                src={c.CompanyLogo} 
                                                alt={c.ShortName} 
                                                className="cp-switcher-item-logo"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                            <div className="cp-switcher-item-info">
                                                <strong>{c.ShortName}</strong>
                                                <small>{c.CompanyNameTH || c.CompanyName}</small>
                                            </div>
                                            {c.ShortName === 'THC' && <span className="cp-pill">ERP โรงงาน</span>}
                                        </button>
                                    ))}
                                    <div className="cp-switcher-footer">
                                        <button onClick={() => navigate('/select-company')} className="cp-switcher-back-all">
                                            <ExternalLink size={13} /> หน้าเลือกบริษัททั้งหมด
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ผู้ใช้งาน */}
                    <div className="cp-user-tag">
                        <span className="cp-user-avatar">{currentUser?.avatar || '👤'}</span>
                        <span className="cp-user-name">{currentUser?.name || currentUser?.username}</span>
                    </div>

                    <button className="cp-logout-btn" onClick={handleLogout} title="ออกจากระบบ">
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            {/* ── Main Content ── */}
            <main className="cp-main">
                {/* ── Hero Profile Card ── */}
                <section className="cp-hero-card">
                    <div className="cp-hero-left">
                        <div className="cp-hero-logo-box">
                            <img 
                                src={companyLogo} 
                                alt={companyShort} 
                                className="cp-hero-logo" 
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        </div>
                        <div className="cp-hero-info">
                            <div className="cp-hero-badges">
                                <span className="cp-tag-category">{category}</span>
                                <span className="cp-tag-status">
                                    <CheckCircle2 size={13} /> ระบบพร้อมใช้งาน
                                </span>
                            </div>
                            <h1 className="cp-hero-title">{companyNameTH}</h1>
                            {companyNameEN && <h2 className="cp-hero-subtitle">{companyNameEN}</h2>}
                            
                            <div className="cp-hero-meta">
                                <div className="cp-meta-item">
                                    <Hash size={14} />
                                    <span>เลขประจำตัวผู้เสียภาษี: <strong>{taxId}</strong></span>
                                </div>
                                <div className="cp-meta-item">
                                    <MapPin size={14} />
                                    <span>ที่อยู่: <strong>{address}</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="cp-hero-right">
                        <button 
                            className="cp-btn-erp-thc"
                            onClick={() => {
                                const thc = availableCompanies?.find(c => (c.ShortName || '').toUpperCase() === 'THC');
                                if (thc) handleSwitch(thc.CompanyID);
                                else navigate('/home');
                            }}
                        >
                            <Building2 size={16} />
                            <span>สลับไป ERP โรงงาน (THC)</span>
                        </button>
                    </div>
                </section>

                {/* ── Section: ระบบเอกสารซื้อ-ขาย ── */}
                <section className="cp-section">
                    <div className="cp-section-header">
                        <div>
                            <h3 className="cp-section-title">
                                <FileText size={20} className="cp-section-icon" /> ระบบเอกสารซื้อ-ขายประจำบริษัท
                            </h3>
                            <p className="cp-section-desc">
                                สร้างและจัดการเอกสารทางการค้าในนาม <strong>{companyNameTH}</strong>
                            </p>
                        </div>
                    </div>

                    <div className="cp-doc-grid">
                        {/* 1. ใบเสนอราคา */}
                        <div className="cp-doc-card">
                            <div className="cp-doc-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                                <FileText size={28} />
                            </div>
                            <div className="cp-doc-card-body">
                                <h4>ใบเสนอราคา (Quotation)</h4>
                                <p>ออกใบเสนอราคาสินค้าหรือบริการในนาม {companyShort} พร้อมคำนวณภาษีและเงื่อนไขการค้า</p>
                            </div>
                            <div className="cp-doc-card-actions">
                                <button 
                                    className="cp-btn-primary"
                                    onClick={() => setActiveDocModal('quotation')}
                                >
                                    <Plus size={15} /> สร้างใบเสนอราคา
                                </button>
                                <button 
                                    className="cp-btn-secondary"
                                    onClick={() => navigate('/sales?tab=sales_quotation')}
                                >
                                    ดูประวัติเอกสาร
                                </button>
                            </div>
                        </div>

                        {/* 2. ใบวางบิล / ใบแจ้งหนี้ */}
                        <div className="cp-doc-card">
                            <div className="cp-doc-card-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                                <Receipt size={28} />
                            </div>
                            <div className="cp-doc-card-body">
                                <h4>ใบวางบิล / ใบแจ้งหนี้ (Billing / Invoice)</h4>
                                <p>ออกใบวางบิลและใบแจ้งหนี้เพื่อเรียกเก็บเงินลูกค้าตามรอบบิลของ {companyShort}</p>
                            </div>
                            <div className="cp-doc-card-actions">
                                <button 
                                    className="cp-btn-primary"
                                    onClick={() => setActiveDocModal('billing')}
                                >
                                    <Plus size={15} /> สร้างใบแจ้งหนี้
                                </button>
                                <button 
                                    className="cp-btn-secondary"
                                    onClick={() => navigate('/sales?tab=sales_billing')}
                                >
                                    ดูประวัติเอกสาร
                                </button>
                            </div>
                        </div>

                        {/* 3. ใบเสร็จรับเงิน / ใบกำกับภาษี */}
                        <div className="cp-doc-card">
                            <div className="cp-doc-card-icon" style={{ background: '#ecfdf5', color: '#16a34a' }}>
                                <FileCheck size={28} />
                            </div>
                            <div className="cp-doc-card-body">
                                <h4>ใบเสร็จรับเงิน / ใบกำกับภาษี (Receipt)</h4>
                                <p>ออกใบเสร็จรับเงินเมื่อได้รับการชำระเงินเรียบร้อยแล้ว ถูกต้องตามหลักสรรพากร</p>
                            </div>
                            <div className="cp-doc-card-actions">
                                <button 
                                    className="cp-btn-primary"
                                    onClick={() => setActiveDocModal('receipt')}
                                >
                                    <Plus size={15} /> สร้างใบเสร็จรับเงิน
                                </button>
                                <button 
                                    className="cp-btn-secondary"
                                    onClick={() => navigate('/sales?tab=sales_receipt')}
                                >
                                    ดูประวัติเอกสาร
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Section: พื้นที่เตรียมพร้อมสำหรับโมดูลเฉพาะทาง ── */}
                <section className="cp-section">
                    <div className="cp-section-header">
                        <div>
                            <h3 className="cp-section-title">
                                <Sparkles size={20} className="cp-section-icon" /> พื้นที่พัฒนาฟังก์ชันเฉพาะสำหรับ {companyShort}
                            </h3>
                            <p className="cp-section-desc">
                                พื้นที่นี้จัดเตรียมไว้รองรับฟังก์ชันและโมดูลการทำงานเฉพาะที่คุณต้องการกำหนดเพิ่มเติมให้กับ <strong>{companyNameTH}</strong>
                            </p>
                        </div>
                    </div>

                    <div className="cp-modules-grid">
                        <div className="cp-module-card">
                            <div className="cp-module-header">
                                <ShoppingBag size={22} className="cp-module-icon" />
                                <span className="cp-module-badge">เตรียมพร้อมพัฒนา</span>
                            </div>
                            <h5>ระบบสต็อกและสินค้าเฉพาะ</h5>
                            <p>สำหรับจัดการแคตตาล็อกสินค้า วัตถุดิบ และสต็อกสินค้าที่จำหน่ายเฉพาะในนาม {companyShort}</p>
                        </div>

                        <div className="cp-module-card">
                            <div className="cp-module-header">
                                <BarChart3 size={22} className="cp-module-icon" />
                                <span className="cp-module-badge">เตรียมพร้อมพัฒนา</span>
                            </div>
                            <h5>การเงินและรายงานสรุปยอด</h5>
                            <p>แดชบอร์ดสรุปรายรับ-รายจ่าย ยอดขายสุทธิ และงบการเงินประจำบริษัท {companyShort}</p>
                        </div>

                        <div className="cp-module-card">
                            <div className="cp-module-header">
                                <Users2 size={22} className="cp-module-icon" />
                                <span className="cp-module-badge">เตรียมพร้อมพัฒนา</span>
                            </div>
                            <h5>ฐานข้อมูลลูกค้าและคู่ค้า</h5>
                            <p>บันทึกประวัติลูกค้า พาร์ทเนอร์ และสัญญาทางการค้าของบริษัท {companyShort}</p>
                        </div>

                        <div className="cp-module-card cp-module-card-request">
                            <div className="cp-module-header">
                                <Briefcase size={22} className="cp-module-icon" />
                                <span className="cp-module-badge-custom">กำหนดฟังก์ชัน</span>
                            </div>
                            <h5>ต้องการเพิ่มระบบหรือฟังก์ชันใด?</h5>
                            <p>แจ้งฟังก์ชันที่คุณต้องการให้ระบบจัดทำให้สำหรับ {companyNameTH} ได้ทันที</p>
                            <button 
                                className="cp-btn-request"
                                onClick={() => showAlert('กำหนดฟังก์ชันเฉพาะ', `ระบบได้เตรียมโครงสร้างพร้อมรับการพัฒนาโมดูลเฉพาะสำหรับ ${companyNameTH} เรียบร้อยแล้ว แจ้งฟังก์ชันที่คุณต้องการต่อได้เลยครับ`, 'info')}
                            >
                                <Sparkles size={14} /> แจ้งความต้องการ
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            {/* ── Modal แบบฟอร์มเอกสาร ── */}
            {activeDocModal && (
                <div className="cp-modal-overlay">
                    <div className="cp-modal-container">
                        <div className="cp-modal-topbar">
                            <div className="cp-modal-title">
                                {activeDocModal === 'quotation' && '📄 สร้างใบเสนอราคา'}
                                {activeDocModal === 'billing' && '📑 สร้างใบวางบิล / ใบแจ้งหนี้'}
                                {activeDocModal === 'receipt' && '🧾 สร้างใบเสร็จรับเงิน'}
                                <span className="cp-modal-company-tag">({companyNameTH})</span>
                            </div>
                            <button 
                                className="cp-modal-close-btn"
                                onClick={() => setActiveDocModal(null)}
                            >
                                ✕ ปิดหน้าต่าง
                            </button>
                        </div>
                        <div className="cp-modal-content">
                            {activeDocModal === 'quotation' && (
                                <QuotationForm 
                                    onBack={() => setActiveDocModal(null)}
                                    onSave={() => {
                                        showAlert('สำเร็จ', 'บันทึกใบเสนอราคาเรียบร้อยแล้ว', 'success');
                                        setActiveDocModal(null);
                                    }}
                                />
                            )}
                            {activeDocModal === 'billing' && (
                                <BillingInvoiceForm 
                                    onBack={() => setActiveDocModal(null)}
                                    onSave={() => {
                                        showAlert('สำเร็จ', 'บันทึกใบแจ้งหนี้เรียบร้อยแล้ว', 'success');
                                        setActiveDocModal(null);
                                    }}
                                />
                            )}
                            {activeDocModal === 'receipt' && (
                                <ReceiptForm 
                                    onBack={() => setActiveDocModal(null)}
                                    onSave={() => {
                                        showAlert('สำเร็จ', 'บันทึกใบเสร็จรับเงินเรียบร้อยแล้ว', 'success');
                                        setActiveDocModal(null);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
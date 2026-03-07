/**
 * =============================================================================
 * PermissionManager.jsx — หน้าจัดการสิทธิ์การเข้าถึง (Admin Only)
 * =============================================================================
 *
 * เฉพาะ admin เท่านั้นที่เข้าถึงได้ (ProtectedRoute adminOnly)
 *
 * ฟีเจอร์:
 *   1. แสดงรายชื่อ user ที่ไม่ใช่ admin
 *   2. เปิด/ปิดสิทธิ์ 3 ระดับ: page → subPage → section
 *   3. ขยาย/ยุบเพื่อดูระดับย่อย
 *   4. สรุปสิทธิ์ปัจจุบันด้านล่าง
 *
 * =============================================================================
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MOCK_USERS, ALL_PAGES } from '../data/mockData';
import './PermissionManager.css';

export default function PermissionManager() {
    const { updatePermissions, updateSubPermission, updateSectionPermission, getUserPermissions } = useAuth();

    // ── State: ติดตามว่า page/subPage ใดถูกขยาย (expand) ──
    const [expandedPages, setExpandedPages] = useState({});
    const [expandedSubPages, setExpandedSubPages] = useState({});

    // ── แสดงเฉพาะ user ที่ไม่ใช่ admin (admin มีสิทธิ์ทุกอย่างอยู่แล้ว) ──
    const nonAdminUsers = MOCK_USERS.filter((u) => u.role !== 'admin');

    // =================================================================
    // Toggle handlers — ขยาย/ยุบรายการ
    // =================================================================

    /** สลับ expand/collapse ของ page */
    const toggleExpand = (userId, pageId) => {
        const key = `${userId}_${pageId}`;
        setExpandedPages((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    /** สลับ expand/collapse ของ subPage */
    const toggleSubExpand = (userId, subId) => {
        const key = `${userId}_${subId}`;
        setExpandedSubPages((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // =================================================================
    // Permission toggle handlers — เปิด/ปิดสิทธิ์
    // =================================================================

    /** เปิด/ปิดสิทธิ์ระดับ page (cascade ไป subPages + sections) */
    const handlePageToggle = (userId, pageId) => {
        const userPerms = getUserPermissions(userId);
        const isEnabled = userPerms.includes(pageId);
        updatePermissions(userId, pageId, !isEnabled);
    };

    /** เปิด/ปิดสิทธิ์ระดับ subPage (cascade ไป sections) */
    const handleSubToggle = (userId, pageId, subId) => {
        const userPerms = getUserPermissions(userId);
        const isEnabled = userPerms.includes(subId);
        updateSubPermission(userId, pageId, subId, !isEnabled);
    };

    /** เปิด/ปิดสิทธิ์ระดับ section */
    const handleSectionToggle = (userId, pageId, subId, sectionId) => {
        const userPerms = getUserPermissions(userId);
        const isEnabled = userPerms.includes(sectionId);
        updateSectionPermission(userId, pageId, subId, sectionId, !isEnabled);
    };

    // =================================================================
    // Counter helpers — นับจำนวนสิทธิ์ที่เปิดอยู่
    // =================================================================

    /** นับจำนวน subPages ที่เปิดสิทธิ์ใน page */
    const getSubCount = (userPerms, page) => {
        if (!page.subPages) return { enabled: 0, total: 0 };
        const total = page.subPages.length;
        const enabled = page.subPages.filter((s) => userPerms.includes(s.id)).length;
        return { enabled, total };
    };

    /** นับจำนวน sections ที่เปิดสิทธิ์ใน subPage */
    const getSectionCount = (userPerms, subPage) => {
        if (!subPage.sections) return { enabled: 0, total: 0 };
        const total = subPage.sections.length;
        const enabled = subPage.sections.filter((s) => userPerms.includes(s.id)).length;
        return { enabled, total };
    };

    // =================================================================
    // Render
    // =================================================================
    return (
        <div className="page-content">
            <div className="page-title">
                <h1>จัดการสิทธิ์การเข้าถึง</h1>
                <p>กำหนดสิทธิ์การเข้าถึง หน้าหลัก → หน้าย่อย → หัวข้อย่อย ของแต่ละผู้ใช้งาน</p>
            </div>

            {/* ── คำแนะนำการใช้งาน ── */}
            <div className="perm-info card">
                <div>
                    <strong>คำแนะนำ:</strong> กดปุ่ม ▶ เพื่อขยายดูหน้าย่อย และกดอีกครั้งเพื่อดูหัวข้อย่อยในแต่ละหน้า
                    สามารถเปิด/ปิดสิทธิ์ได้ทั้ง 3 ระดับ: <strong>หน้าหลัก</strong> → <strong>หน้าย่อย</strong> → <strong>หัวข้อย่อย</strong>
                </div>
            </div>

            {/* ── รายการ user + สิทธิ์ ── */}
            <div className="perm-users-grid">
                {nonAdminUsers.map((user) => {
                    const userPerms = getUserPermissions(user.id);
                    return (
                        <div className="perm-user-card card" key={user.id}>
                            {/* Header: ข้อมูล user */}
                            <div className="perm-card-header">
                                <span className="perm-avatar">{user.avatar}</span>
                                <div className="perm-card-user-info">
                                    <span className="perm-user-name">{user.displayName}</span>
                                    <span className="perm-user-id">@{user.username}</span>
                                </div>
                                <span className="perm-access-count">
                                    {ALL_PAGES.filter((p) => userPerms.includes(p.id)).length}/{ALL_PAGES.length} หน้า
                                </span>
                            </div>

                            {/* รายการ Pages (ระดับ 1) */}
                            <div className="perm-pages-list">
                                {ALL_PAGES.map((page) => {
                                    const isPageEnabled = userPerms.includes(page.id);
                                    const expandKey = `${user.id}_${page.id}`;
                                    const isExpanded = expandedPages[expandKey];
                                    const { enabled: subEnabled, total: subTotal } = getSubCount(userPerms, page);

                                    return (
                                        <div className={`perm-page-item ${isPageEnabled ? 'enabled' : ''}`} key={page.id}>
                                            <div className="perm-page-row">
                                                {/* ปุ่มขยาย */}
                                                {page.subPages && page.subPages.length > 0 && (
                                                    <button
                                                        className={`perm-expand-btn ${isExpanded ? 'expanded' : ''}`}
                                                        onClick={() => toggleExpand(user.id, page.id)}
                                                        title="ดูหน้าย่อย"
                                                    >
                                                        ▶
                                                    </button>
                                                )}

                                                {/* Toggle สิทธิ์ page */}
                                                <label className="perm-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={isPageEnabled}
                                                        onChange={() => handlePageToggle(user.id, page.id)}
                                                    />
                                                    <span className="perm-slider"></span>
                                                </label>

                                                <span className="perm-page-name">{page.name}</span>

                                                {/* Badge จำนวน subPage ที่เปิด */}
                                                {page.subPages && page.subPages.length > 0 && isPageEnabled && (
                                                    <span className="perm-sub-badge">
                                                        {subEnabled}/{subTotal} หน้าย่อย
                                                    </span>
                                                )}
                                            </div>

                                            {/* Sub-pages (ระดับ 2) */}
                                            {isExpanded && page.subPages && (
                                                <div className="perm-sub-list">
                                                    {page.subPages.map((sub) => {
                                                        const isSubEnabled = userPerms.includes(sub.id);
                                                        const subExpandKey = `${user.id}_${sub.id}`;
                                                        const isSubExpanded = expandedSubPages[subExpandKey];
                                                        const { enabled: secEnabled, total: secTotal } = getSectionCount(userPerms, sub);

                                                        return (
                                                            <div className={`perm-subpage-group ${isSubEnabled ? 'sub-enabled' : ''}`} key={sub.id}>
                                                                <div className="perm-sub-item">
                                                                    {/* ปุ่มขยาย sections */}
                                                                    {sub.sections && sub.sections.length > 0 && (
                                                                        <button
                                                                            className={`perm-expand-btn perm-expand-btn-sm ${isSubExpanded ? 'expanded' : ''}`}
                                                                            onClick={() => toggleSubExpand(user.id, sub.id)}
                                                                            title="ดูหัวข้อย่อย"
                                                                        >
                                                                            ▶
                                                                        </button>
                                                                    )}
                                                                    <label className="perm-checkbox">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSubEnabled}
                                                                            onChange={() => handleSubToggle(user.id, page.id, sub.id)}
                                                                        />
                                                                        <span className="perm-checkmark"></span>
                                                                    </label>
                                                                    <span className="perm-sub-name">{sub.name}</span>
                                                                    {sub.sections && sub.sections.length > 0 && isSubEnabled && (
                                                                        <span className="perm-sec-badge">
                                                                            {secEnabled}/{secTotal}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Sections (ระดับ 3) */}
                                                                {isSubExpanded && sub.sections && (
                                                                    <div className="perm-section-list">
                                                                        {sub.sections.map((sec) => {
                                                                            const isSecEnabled = userPerms.includes(sec.id);
                                                                            return (
                                                                                <div className="perm-section-item" key={sec.id}>
                                                                                    <label className="perm-checkbox perm-checkbox-sm">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={isSecEnabled}
                                                                                            onChange={() => handleSectionToggle(user.id, page.id, sub.id, sec.id)}
                                                                                        />
                                                                                        <span className="perm-checkmark perm-checkmark-sm"></span>
                                                                                    </label>
                                                                                    <span className="perm-section-name">{sec.name}</span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── สรุปสิทธิ์ปัจจุบัน ── */}
            <div className="perm-summary">
                <h2>สรุปสิทธิ์ปัจจุบัน</h2>
                <div className="perm-summary-grid">
                    {nonAdminUsers.map((user) => {
                        const userPerms = getUserPermissions(user.id);
                        const visiblePages = ALL_PAGES.filter((p) => userPerms.includes(p.id));
                        return (
                            <div className="perm-summary-card card" key={user.id}>
                                <div className="perm-summary-header">
                                    <span className="perm-avatar">{user.avatar}</span>
                                    <span className="perm-user-name">{user.displayName}</span>
                                </div>
                                <div className="perm-summary-pages">
                                    {visiblePages.length > 0 ? (
                                        visiblePages.map((page) => {
                                            const subs = page.subPages?.filter((s) => userPerms.includes(s.id)) || [];
                                            return (
                                                <div className="perm-summary-page-group" key={page.id}>
                                                    <span className="perm-tag perm-tag-page">{page.name}</span>
                                                    {subs.length > 0 && subs.length < (page.subPages?.length || 0) && (
                                                        <div className="perm-summary-subs">
                                                            {subs.map((s) => {
                                                                const secs = s.sections?.filter((sec) => userPerms.includes(sec.id)) || [];
                                                                return (
                                                                    <div className="perm-summary-sub-group" key={s.id}>
                                                                        <span className="perm-tag perm-tag-sub">{s.name}</span>
                                                                        {secs.length > 0 && secs.length < (s.sections?.length || 0) && (
                                                                            <div className="perm-summary-sections">
                                                                                {secs.map((sec) => (
                                                                                    <span className="perm-tag perm-tag-sec" key={sec.id}>{sec.name}</span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <span className="perm-no-access">ไม่มีสิทธิ์เข้าถึงหน้าใดๆ</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

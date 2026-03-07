/**
 * =============================================================================
 * AuthContext.jsx — ระบบยืนยันตัวตนและจัดการสิทธิ์ (Authentication & Authorization)
 * =============================================================================
 *
 * Context นี้จัดการ:
 *   1. การ Login / Logout
 *   2. เก็บ user ปัจจุบันใน localStorage
 *   3. ระบบสิทธิ์ 3 ระดับ (page → subPage → section)
 *   4. ตรวจสอบสิทธิ์การเข้าถึง (hasPermission, hasSubPermission, hasSectionPermission)
 *   5. ดึงหน้าที่ user มีสิทธิ์เห็น (getVisiblePages, getVisibleSubPages)
 *
 * การใช้งาน:
 *   - ครอบ <AuthProvider> ไว้ที่ root ของ App
 *   - เรียกใช้ useAuth() ใน component ที่ต้องการ
 *
 * =============================================================================
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_USERS, ALL_PAGES, getDefaultPermissions } from '../data/mockData';

const AuthContext = createContext(null);

// =============================================================================
// AuthProvider — ครอบ App ทั้งหมด
// =============================================================================
export function AuthProvider({ children }) {
    // ──────────────────────────────────────────────────────
    // State: ผู้ใช้ปัจจุบัน (เก็บใน localStorage เพื่อ persist)
    // ──────────────────────────────────────────────────────
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('erp_current_user');
        return saved ? JSON.parse(saved) : null;
    });

    // ──────────────────────────────────────────────────────
    // State: สิทธิ์ของ user ทุกคน { userId: [permissionIds] }
    // ──────────────────────────────────────────────────────
    const [permissions, setPermissions] = useState(() => {
        const saved = localStorage.getItem('erp_permissions');
        const defaults = getDefaultPermissions();
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge to ensure new users (like plan1, op1) get defaults even if saved exists
                return { ...defaults, ...parsed };
            } catch (e) {
                return defaults;
            }
        }
        return defaults;
    });

    // ──────────────────────────────────────────────────────
    // Sync state กับ localStorage
    // ──────────────────────────────────────────────────────
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('erp_current_user', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('erp_current_user');
        }
    }, [currentUser]);

    useEffect(() => {
        localStorage.setItem('erp_permissions', JSON.stringify(permissions));
    }, [permissions]);

    // =================================================================
    // Authentication — Login / Logout
    // =================================================================

    /** ตรวจสอบ username + password แล้ว set user ปัจจุบัน */
    const login = (username, password) => {
        const user = MOCK_USERS.find(
            (u) => u.username === username && u.password === password
        );
        if (user) {
            setCurrentUser(user);

            // หาหน้าแรกที่ user มีสิทธิ์เข้าถึงเพื่อใช้ Redirect
            let firstPageId = 'home'; // default
            if (user.role !== 'admin') {
                const userPerms = permissions[user.id] || [];
                const firstAllowedPage = ALL_PAGES.find(p => userPerms.includes(p.id));
                if (firstAllowedPage) {
                    firstPageId = firstAllowedPage.id;
                }
            }

            return { success: true, user, redirectPath: `/${firstPageId}` };
        }
        return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
    };

    /** ล้าง user ปัจจุบัน (Logout) */
    const logout = () => {
        setCurrentUser(null);
    };

    // =================================================================
    // Permission Helpers — ฟังก์ชันช่วยจัดการ IDs ของ children
    // =================================================================

    /** ดึง IDs ของ subPages + sections ทั้งหมดภายใน page */
    const getPageChildIds = (page) => {
        const ids = [];
        page?.subPages?.forEach((sub) => {
            ids.push(sub.id);
            sub.sections?.forEach((sec) => ids.push(sec.id));
        });
        return ids;
    };

    /** ดึง IDs ของ sections ทั้งหมดภายใน subPage */
    const getSubPageChildIds = (subPage) => {
        return subPage?.sections?.map((sec) => sec.id) || [];
    };

    // =================================================================
    // Permission Updates — เปลี่ยนสิทธิ์ (ใช้ในหน้า PermissionManager)
    // =================================================================

    /**
     * เปิด/ปิดสิทธิ์ระดับ page (cascade ไปยัง subPages + sections ทั้งหมด)
     * เมื่อปิด → ลบ page + subPages + sections ทั้งหมด
     * เมื่อเปิด → เพิ่ม page + subPages + sections ทั้งหมด
     */
    const updatePermissions = (userId, pageId, enabled) => {
        setPermissions((prev) => {
            const userPerms = prev[userId] || [];
            const page = ALL_PAGES.find((p) => p.id === pageId);
            const childIds = getPageChildIds(page);

            let newPerms;
            if (enabled) {
                // เพิ่ม page + children ทั้งหมด (ไม่ซ้ำ)
                newPerms = [...new Set([...userPerms, pageId, ...childIds])];
            } else {
                // ลบ page + children ทั้งหมด
                const removeSet = new Set([pageId, ...childIds]);
                newPerms = userPerms.filter((p) => !removeSet.has(p));
            }
            return { ...prev, [userId]: newPerms };
        });
    };

    /**
     * เปิด/ปิดสิทธิ์ระดับ subPage (cascade ไปยัง sections)
     * เมื่อปิด subPage สุดท้าย → ลบ page ออกด้วย
     */
    const updateSubPermission = (userId, pageId, subId, enabled) => {
        setPermissions((prev) => {
            const userPerms = prev[userId] || [];
            const page = ALL_PAGES.find((p) => p.id === pageId);
            const subPage = page?.subPages?.find((s) => s.id === subId);
            const sectionIds = getSubPageChildIds(subPage);

            let newPerms;
            if (enabled) {
                // เพิ่ม subPage + sections + page (เผื่อยังไม่มี)
                newPerms = [...new Set([...userPerms, pageId, subId, ...sectionIds])];
            } else {
                // ลบ subPage + sections
                const removeSet = new Set([subId, ...sectionIds]);
                newPerms = userPerms.filter((p) => !removeSet.has(p));

                // ถ้าไม่เหลือ subPage อื่น → ลบ page ออกด้วย
                const subIds = page?.subPages?.map((s) => s.id) || [];
                const hasAnySub = subIds.some((sid) => sid !== subId && newPerms.includes(sid));
                if (!hasAnySub) {
                    newPerms = newPerms.filter((p) => p !== pageId);
                }
            }
            return { ...prev, [userId]: newPerms };
        });
    };

    /**
     * เปิด/ปิดสิทธิ์ระดับ section (ระดับย่อยที่สุด)
     * เมื่อปิด section สุดท้ายใน subPage → ลบ subPage
     * เมื่อปิด subPage สุดท้ายใน page → ลบ page
     */
    const updateSectionPermission = (userId, pageId, subId, sectionId, enabled) => {
        setPermissions((prev) => {
            const userPerms = prev[userId] || [];
            let newPerms;

            if (enabled) {
                // เพิ่ม section + parent (subPage + page) เผื่อยังไม่มี
                newPerms = [...new Set([...userPerms, pageId, subId, sectionId])];
            } else {
                // ลบเฉพาะ section
                newPerms = userPerms.filter((p) => p !== sectionId);

                // ตรวจว่ายังมี section อื่นใน subPage นี้ไหม
                const page = ALL_PAGES.find((p) => p.id === pageId);
                const subPage = page?.subPages?.find((s) => s.id === subId);
                const secIds = subPage?.sections?.map((s) => s.id) || [];
                const hasAnySec = secIds.some((sid) => sid !== sectionId && newPerms.includes(sid));

                if (!hasAnySec) {
                    // ไม่เหลือ section → ลบ subPage
                    newPerms = newPerms.filter((p) => p !== subId);

                    // ตรวจว่ายังมี subPage อื่นใน page นี้ไหม
                    const subIds = page?.subPages?.map((s) => s.id) || [];
                    const hasAnySub = subIds.some((sid) => sid !== subId && newPerms.includes(sid));
                    if (!hasAnySub) {
                        // ไม่เหลือ subPage → ลบ page
                        newPerms = newPerms.filter((p) => p !== pageId);
                    }
                }
            }
            return { ...prev, [userId]: newPerms };
        });
    };

    // =================================================================
    // Permission Checks — ตรวจสอบสิทธิ์ของ user ปัจจุบัน
    // =================================================================

    /** ตรวจสิทธิ์ระดับ page — admin มีสิทธิ์ทุก page */
    const hasPermission = (pageId) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        const userPerms = permissions[currentUser.id] || [];
        return userPerms.includes(pageId);
    };

    /** ตรวจสิทธิ์ระดับ subPage */
    const hasSubPermission = (subId) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        const userPerms = permissions[currentUser.id] || [];
        return userPerms.includes(subId);
    };

    /** ตรวจสิทธิ์ระดับ section */
    const hasSectionPermission = (sectionId) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        const userPerms = permissions[currentUser.id] || [];
        return userPerms.includes(sectionId);
    };

    // =================================================================
    // Visible Pages — ดึงหน้าที่ user ปัจจุบันมีสิทธิ์เห็น
    // =================================================================

    /** ดึง subPages ที่ user มีสิทธิ์เห็นภายใน page ที่ระบุ */
    const getVisibleSubPages = (pageId) => {
        const page = ALL_PAGES.find((p) => p.id === pageId);
        if (!page || !page.subPages) return [];
        if (!currentUser) return [];
        if (currentUser.role === 'admin') return page.subPages;

        const userPerms = permissions[currentUser.id] || [];
        return page.subPages.filter((sub) => userPerms.includes(sub.id));
    };

    /** ดึง permissions array ของ user ที่ระบุ (ใช้ใน PermissionManager) */
    const getUserPermissions = (userId) => {
        return permissions[userId] || [];
    };

    /**
     * ดึงรายการ pages ทั้งหมดที่ user ปัจจุบันมีสิทธิ์เห็น
     * admin จะเห็นทุก page + หน้า "จัดการสิทธิ์" เพิ่ม
     */
    const getVisiblePages = () => {
        if (!currentUser) return [];
        if (currentUser.role === 'admin') {
            return [...ALL_PAGES, { id: 'permissions', name: 'จัดการสิทธิ์', path: '/permissions' }];
        }
        const userPerms = permissions[currentUser.id] || [];
        return ALL_PAGES.filter((page) => userPerms.includes(page.id));
    };

    // =================================================================
    // Provider — ส่งค่าทั้งหมดให้ children
    // =================================================================
    return (
        <AuthContext.Provider
            value={{
                // State
                currentUser,
                permissions,

                // Auth
                login,
                logout,

                // Permission Updates (สำหรับ PermissionManager)
                updatePermissions,
                updateSubPermission,
                updateSectionPermission,

                // Permission Checks (สำหรับ ProtectedRoute + pages)
                hasPermission,
                hasSubPermission,
                hasSectionPermission,

                // Visible Pages (สำหรับ Layout sidebar)
                getVisibleSubPages,
                getUserPermissions,
                getVisiblePages,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// =============================================================================
// useAuth Hook — ใช้เข้าถึง AuthContext จาก component ลูก
// =============================================================================
// ใช้ได้เฉพาะภายใน <AuthProvider> เท่านั้น
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

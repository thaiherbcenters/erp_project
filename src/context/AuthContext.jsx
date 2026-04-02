/**
 * =============================================================================
 * AuthContext.jsx — ระบบยืนยันตัวตนและจัดการสิทธิ์ (Authentication & Authorization)
 * =============================================================================
 *
 * Context นี้จัดการ:
 *   1. การ Login / Logout
 *   2. เก็บ user ปัจจุบันใน localStorage
 *   3. ระบบสิทธิ์ 3 ระดับ (page → subPage → section) — อ่าน/เขียนผ่าน API
 *   4. ตรวจสอบสิทธิ์การเข้าถึง (hasPermission, hasSubPermission, hasSectionPermission)
 *   5. ดึงหน้าที่ user มีสิทธิ์เห็น (getVisiblePages, getVisibleSubPages)
 *
 * =============================================================================
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ALL_PAGES } from '../data/mockData';
import API_BASE from '../config';

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
    // — ข้อมูลจริงอยู่ใน DB, state นี้ใช้เป็น cache เท่านั้น
    // ──────────────────────────────────────────────────────
    const [permissions, setPermissions] = useState({});

    // ──────────────────────────────────────────────────────
    // Sync currentUser กับ localStorage
    // ──────────────────────────────────────────────────────
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('erp_current_user', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('erp_current_user');
        }
    }, [currentUser]);

    // =================================================================
    // API helpers — อ่าน/เขียนสิทธิ์ผ่าน Backend
    // =================================================================

    /** ดึงสิทธิ์ของ user จาก Backend API */
    const fetchPermissionsFromAPI = useCallback(async (userId) => {
        try {
            const res = await fetch(`${API_BASE}/permissions/${userId}`);
            if (res.ok) {
                const data = await res.json();
                const perms = data.permissions || [];
                setPermissions(prev => ({ ...prev, [userId]: perms }));
                return perms;
            }
        } catch (err) {
            console.error('Error fetching permissions:', err);
        }
        return [];
    }, []);

    /** บันทึกสิทธิ์ของ user ลง Backend API */
    const savePermissionsToAPI = useCallback(async (userId, perms) => {
        try {
            await fetch(`${API_BASE}/permissions/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permissions: perms }),
            });
        } catch (err) {
            console.error('Error saving permissions:', err);
        }
    }, []);

    // =================================================================
    // Authentication — Login / Logout
    // =================================================================

    /** ตรวจสอบ username + password ผ่าน Backend API แล้ว set user ปัจจุบัน */
    const login = async (username, password) => {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (response.ok && data.user) {
                const user = data.user;
                setCurrentUser(user);
                localStorage.setItem('erp_token', data.token);

                // ดึงสิทธิ์จริงจาก DB (ไม่ใช่จาก token)
                const apiPerms = await fetchPermissionsFromAPI(user.id);

                // Map to handle legacy vs new format { page_id, data_scope }
                const perms = apiPerms.map(p => typeof p === 'string' ? { page_id: p, data_scope: 'all' } : p);

                // Update permissions in state
                setPermissions(prev => ({
                    ...prev,
                    [user.id]: perms
                }));

                // หาหน้าแรกที่ user มีสิทธิ์เข้าถึงเพื่อใช้ Redirect
                let firstPageId = 'home'; // default
                if (user.role !== 'admin') {
                    const firstAllowedPage = ALL_PAGES.find(p => perms.some(userPerm => userPerm.page_id === p.id));
                    if (firstAllowedPage) {
                        firstPageId = firstAllowedPage.id;
                    }
                }

                return { success: true, user, redirectPath: `/${firstPageId}` };
            } else {
                return { success: false, message: data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
            }
        } catch (error) {
            console.error('Login Error:', error);
            return { success: false, message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' };
        }
    };

    /** ล้าง user ปัจจุบัน (Logout) */
    const logout = () => {
        setCurrentUser(null);
        setPermissions({});
        localStorage.removeItem('erp_token');
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
    // Permission Updates — เปลี่ยนสิทธิ์ + บันทึกลง DB ทันที
    // =================================================================

    /**
     * เปิด/ปิดสิทธิ์ระดับ page (cascade ไปยัง subPages + sections ทั้งหมด)
     */
    const updatePermissions = (userId, pageId, enabled, dataScope = 'all') => {
        setPermissions((prev) => {
            const userPerms = prev[userId] || [];
            const page = ALL_PAGES.find((p) => p.id === pageId);
            const childIds = getPageChildIds(page);

            let newPerms = [...userPerms];
            if (enabled) {
                // Remove existing to replace
                newPerms = newPerms.filter(p => p.page_id !== pageId && !childIds.includes(p.page_id));
                newPerms.push({ page_id: pageId, data_scope: dataScope });
                childIds.forEach(id => newPerms.push({ page_id: id, data_scope: dataScope }));
            } else {
                newPerms = newPerms.filter(p => p.page_id !== pageId && !childIds.includes(p.page_id));
            }

            // บันทึกลง DB ทันที
            savePermissionsToAPI(userId, newPerms);

            return { ...prev, [userId]: newPerms };
        });
    };

    /**
     * เปิด/ปิดสิทธิ์ระดับ subPage (cascade ไปยัง sections)
     */
    const updateSubPermission = (userId, pageId, subId, enabled, dataScope = 'all') => {
        setPermissions((prev) => {
            const userPerms = prev[userId] || [];
            const page = ALL_PAGES.find((p) => p.id === pageId);
            const subPage = page?.subPages?.find((s) => s.id === subId);
            const sectionIds = getSubPageChildIds(subPage);

            let newPerms = [...userPerms];
            if (enabled) {
                // Ensure page is enabled
                if (!newPerms.some(p => p.page_id === pageId)) {
                    newPerms.push({ page_id: pageId, data_scope: dataScope });
                }
                // Add subpage and sections
                newPerms = newPerms.filter(p => p.page_id !== subId && !sectionIds.includes(p.page_id));
                newPerms.push({ page_id: subId, data_scope: dataScope });
                sectionIds.forEach(id => newPerms.push({ page_id: id, data_scope: dataScope }));
            } else {
                // Remove subpage and sections
                newPerms = newPerms.filter((p) => p.page_id !== subId && !sectionIds.includes(p.page_id));

                // If no subpages left, remove main page
                const subIds = page?.subPages?.map((s) => s.id) || [];
                const hasAnySub = subIds.some((sid) => sid !== subId && newPerms.some(p => p.page_id === sid));
                if (!hasAnySub) {
                    newPerms = newPerms.filter((p) => p.page_id !== pageId);
                }
            }

            // บันทึกลง DB ทันที
            savePermissionsToAPI(userId, newPerms);

            return { ...prev, [userId]: newPerms };
        });
    };

    /**
     * เปิด/ปิดสิทธิ์ระดับ section (ระดับย่อยที่สุด)
     */
    const updateSectionPermission = (userId, pageId, subId, sectionId, enabled) => {
        setPermissions((prev) => {
            const userPerms = prev[userId] || [];
            let newPerms = [...userPerms];

            if (enabled) {
                const dataScope = 'all'; // Default for section when enabled separately
                if (!newPerms.some(p => p.page_id === pageId)) newPerms.push({ page_id: pageId, data_scope: dataScope });
                if (!newPerms.some(p => p.page_id === subId)) newPerms.push({ page_id: subId, data_scope: dataScope });
                newPerms = newPerms.filter(p => p.page_id !== sectionId);
                newPerms.push({ page_id: sectionId, data_scope: dataScope });
            } else {
                newPerms = newPerms.filter((p) => p.page_id !== sectionId);

                const page = ALL_PAGES.find((p) => p.id === pageId);
                const subPage = page?.subPages?.find((s) => s.id === subId);
                const secIds = subPage?.sections?.map((s) => s.id) || [];
                const hasAnySec = secIds.some((sid) => sid !== sectionId && newPerms.some(p => p.page_id === sid));

                if (!hasAnySec) {
                    newPerms = newPerms.filter((p) => p.page_id !== subId);

                    const subIds = page?.subPages?.map((s) => s.id) || [];
                    const hasAnySub = subIds.some((sid) => sid !== subId && newPerms.some(p => p.page_id === sid));
                    if (!hasAnySub) {
                        newPerms = newPerms.filter((p) => p.page_id !== pageId);
                    }
                }
            }

            // บันทึกลง DB ทันที
            savePermissionsToAPI(userId, newPerms);

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
        return userPerms.some(p => p.page_id === pageId);
    };

    /** ตรวจสิทธิ์ระดับ subPage */
    const hasSubPermission = (subId) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        const userPerms = permissions[currentUser.id] || [];
        return userPerms.some(p => p.page_id === subId);
    };

    /** ตรวจสิทธิ์ระดับ section */
    const hasSectionPermission = (sectionId) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        const userPerms = permissions[currentUser.id] || [];
        return userPerms.some(p => p.page_id === sectionId);
    };

    // =================================================================
    // Visible Pages — ดึงหน้าที่ user ปัจจุบันมีสิทธิ์เห็น
    // =================================================================

    /** ดึง subPages ที่ user มีสิทธิ์เห็นภายใน page ที่ระบุ */
    const getVisibleSubPages = (pageId) => {
        const page = ALL_PAGES.find((p) => p.id === pageId);
        if (!page || !page.subPages) return [];
        if (!currentUser) return [];

        let subPages = [...page.subPages];
        
        // Inject จัดการสิทธิ์ as a sub-page of Settings for admin
        if (currentUser.role === 'admin' && pageId === 'settings') {
            subPages.push({ id: 'permissions', name: 'จัดการสิทธิ์' });
        }

        if (currentUser.role === 'admin') return subPages;

        const userPerms = permissions[currentUser.id] || [];
        return subPages.filter((sub) => userPerms.some(p => p.page_id === sub.id));
    };

    /** ดึง permissions array ของ user ที่ระบุ (ใช้ใน PermissionManager) */
    const getUserPermissions = (userId) => {
        return permissions[userId] || [];
    };

    /** ดึงสิทธิ์ของ user จาก API (ใช้ใน PermissionManager เมื่อเลือก user) */
    const loadUserPermissions = async (userId) => {
        return await fetchPermissionsFromAPI(userId);
    };

    /**
     * ดึงรายการ pages ทั้งหมดที่ user ปัจจุบันมีสิทธิ์เห็น
     * admin จะเห็นทุก page + หน้า "จัดการสิทธิ์" เพิ่ม
     */
    const getVisiblePages = () => {
        if (!currentUser) return [];
        if (currentUser.role === 'admin') {
            return [...ALL_PAGES]; // permissions is now inside settings
        }
        const userPerms = permissions[currentUser.id] || [];
        return ALL_PAGES.filter((page) => userPerms.some(p => p.page_id === page.id));
    };

    // =================================================================
    // โหลดสิทธิ์ของ currentUser เมื่อ app เริ่มต้น (กรณี refresh หน้า)
    // =================================================================
    useEffect(() => {
        if (currentUser && currentUser.id) {
            fetchPermissionsFromAPI(currentUser.id);
        }
    }, [currentUser, fetchPermissionsFromAPI]);

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

                // API helpers (สำหรับ PermissionManager)
                loadUserPermissions,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// =============================================================================
// useAuth Hook — ใช้เข้าถึง AuthContext จาก component ลูก
// =============================================================================
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

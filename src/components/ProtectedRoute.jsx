/**
 * =============================================================================
 * ProtectedRoute.jsx — ตรวจสอบสิทธิ์ก่อนแสดงหน้า
 * =============================================================================
 *
 * ใช้ครอบ Route element เพื่อ:
 *   1. ตรวจว่า user ล็อกอินแล้วหรือยัง → ถ้ายัง redirect ไป Login
 *   2. ตรวจว่าหน้านี้เป็น adminOnly หรือไม่ → ถ้า user ไม่ใช่ admin redirect ไป /home
 *   3. ตรวจสิทธิ์ระดับ page → ถ้าไม่มีสิทธิ์แสดงข้อความ "ไม่มีสิทธิ์เข้าถึง"
 *
 * Props:
 *   - pageId    : string | null  — ID ของ page ที่ต้องตรวจสิทธิ์ (null = ไม่ตรวจ)
 *   - adminOnly : boolean        — ถ้า true เฉพาะ admin เท่านั้นเข้าได้
 *   - children  : ReactNode      — component ที่จะแสดงถ้าผ่านการตรวจสอบ
 *
 * =============================================================================
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ALL_PAGES } from '../data/mockData';

export default function ProtectedRoute({ pageId, children, adminOnly = false }) {
    const { currentUser, hasPermission, activeCompany, permissions } = useAuth();

    // ยังไม่ได้ล็อกอิน → redirect ไปหน้า Login
    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    // ── ตรวจสอบความปลอดภัยข้ามบริษัท ──
    // หากพยายามเข้าหน้าที่เป็นของบริษัทอื่น ให้ redirect ไปยังหน้าหลักของบริษัทที่เลือกอยู่ทันที
    const activeCompanyId = activeCompany?.CompanyID || 1;
    let targetPage = pageId ? ALL_PAGES.find(p => p.id === pageId) : null;
    if (!targetPage && pageId) {
        targetPage = ALL_PAGES.find(p => 
            p.subPages?.some(s => s.id === pageId || s.sections?.some(sec => sec.id === pageId))
        );
    }

    if (targetPage && (targetPage.companyId || 1) !== activeCompanyId) {
        const isElite = activeCompanyId === 2;
        const isRiv = activeCompanyId === 3;
        const isPsf = activeCompanyId === 4;
        const target = isElite ? '/elite' : (isRiv ? '/riverview' : (isPsf ? '/psf' : '/home'));
        return <Navigate to={target} replace />;
    }

    // หน้า admin only แต่ user ไม่ใช่ admin → แสดงหน้าไม่มีสิทธิ์
    if (adminOnly && currentUser.role !== 'admin') {
        return (
            <div className="no-access">
                <div className="no-access-card">
                    <span className="no-access-icon">✕</span>
                    <h2>ไม่มีสิทธิ์เข้าถึง</h2>
                    <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบ (สำหรับผู้ดูแลระบบเท่านั้น)</p>
                </div>
            </div>
        );
    }

    // ตรวจสิทธิ์ระดับ page — ถ้าไม่มีสิทธิ์แสดงข้อความแจ้ง
    if (pageId && !hasPermission(pageId)) {
        // กรณี user ไม่มีสิทธิ์หน้า home (เช่น พนักงานฝ่ายขายที่ไม่มีสิทธิ์ดู Dashboard หน้าหลัก)
        // ให้ redirect อัตโนมัติไปยังหน้าแรกที่ user มีสิทธิ์ในบริษัทปัจจุบัน
        if (pageId === 'home') {
            const companyPages = ALL_PAGES.filter(p => (p.companyId || 1) === activeCompanyId);
            const userPerms = permissions[currentUser.id] || [];
            const isPermAllowed = (pid) => userPerms.some(up => (typeof up === 'string' ? up : up?.page_id) === pid);
            const firstAllowed = companyPages.find(p => isPermAllowed(p.id));
            if (firstAllowed) {
                return <Navigate to={firstAllowed.path || `/${firstAllowed.id}`} replace />;
            }
        }

        return (
            <div className="no-access">
                <div className="no-access-card">
                    <span className="no-access-icon">✕</span>
                    <h2>ไม่มีสิทธิ์เข้าถึง</h2>
                    <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบ</p>
                </div>
            </div>
        );
    }

    // ผ่านการตรวจสอบ → แสดง children
    return children;
}

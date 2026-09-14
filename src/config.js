/**
 * =============================================================================
 * config.js — ศูนย์กลางการตั้งค่า API URL แบบ Dynamic
 * =============================================================================
 *
 * ไฟล์นี้จะตรวจสอบว่าเว็บถูกเปิดจากเครื่องไหน แล้วสร้าง API URL ให้อัตโนมัติ
 *
 * - เปิดจาก localhost:5173       → API = http://localhost:5000/api
 * - เปิดจาก 61.7.209.84:5173    → API = http://61.7.209.84:5000/api
 * - เปิดจาก domain.com:5173     → API = http://domain.com:5000/api
 *
 * ไม่ต้อง Hardcode IP, ไม่ต้องมี .env.production, ใช้ได้ทุกเครื่องอัตโนมัติ
 *
 * =============================================================================
 */

const API_BASE = '/api';

/**
 * =============================================================================
 * Global Fetch Interceptor (Security Patch)
 * =============================================================================
 * ดักจับทุกๆ การใช้ fetch() เพื่อแอบแนบ JWT Token ไปกับ Request Headers โดยอัตโนมัติ
 * ทำให้ไม่ต้องไปไล่แก้โค้ด fetch ทั้ง 130+ จุดในแอปพลิเคชัน
 */
const originalFetch = window.fetch;
window.fetch = async (resource, config = {}) => {
    // อ่าน Token และ Active Company ปัจจุบันจาก localStorage
    const token = localStorage.getItem('erp_token');
    let activeCompanyId = '1';
    try {
        const comp = localStorage.getItem('erp_active_company');
        if (comp) {
            const parsed = JSON.parse(comp);
            if (parsed && parsed.CompanyID) {
                activeCompanyId = String(parsed.CompanyID);
            }
        }
    } catch (e) {}
    
    // ตรวจสอบว่าเป็นการยิง API
    if (typeof resource === 'string' && resource.includes('/api')) {
        // จัดการกรณี config.headers เป็น Header object หรือ Object ธรรมดา
        if (config.headers instanceof Headers) {
            if (token) config.headers.set('Authorization', `Bearer ${token}`);
            config.headers.set('x-company-id', activeCompanyId);
        } else {
            config.headers = {
                ...config.headers,
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                'x-company-id': activeCompanyId
            };
        }
    }
    
    // ส่งต่อให้ fetch เดิมทำงานตามปกติ
    return originalFetch(resource, config);
};

export default API_BASE;

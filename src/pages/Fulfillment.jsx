import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import './PageCommon.css';

export default function Fulfillment() {
    const { getVisibleSubPages, hasSectionPermission } = useAuth();
    const location = useLocation();
    const visibleSubPages = getVisibleSubPages('fulfillment');
    const currentTab = new URLSearchParams(location.search).get('tab') || visibleSubPages[0]?.id;
    const [viewType, setViewType] = useState('retail'); // 'retail' | 'oem'

    if (visibleSubPages.length === 0) {
        return <div className="page-container"><p className="no-permission">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;
    }

    const renderDashboard = () => (
        <div className="fulfillment-dashboard">
            <div className="page-title">
                <h1>🚚 Dashboard การจัดส่งพัสดุ</h1>
                <p>ภาพรวมและสถานะการแพ็คสินค้าเพื่อจัดส่งให้ลูกค้า</p>
            </div>
            {hasSectionPermission('fulfillment_dashboard_stats') && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}><Clock /></div>
                        <div className="stat-info"><h3>รอแพ็คจัดส่ง</h3><p className="stat-value">12 <span style={{ fontSize: 14 }}>ออเดอร์</span></p></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><CheckCircle /></div>
                        <div className="stat-info"><h3>แพ็คเสร็จแล้ววันนี้</h3><p className="stat-value">45 <span style={{ fontSize: 14 }}>ออเดอร์</span></p></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Truck /></div>
                        <div className="stat-info"><h3>กำลังนำส่งขนส่ง</h3><p className="stat-value">2 <span style={{ fontSize: 14 }}>เที่ยว</span></p></div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderOrders = () => (
        <div className="fulfillment-orders">
            <div className="page-title" style={{ marginBottom: 20 }}>
                <h1>📦 คิวจัดส่งสินค้า (Dispatch Queue)</h1>
                <p>จัดการการแพ็คสินค้าและส่งมอบให้ผู้ให้บริการขนส่ง (Online & OEM)</p>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #e5e7eb', paddingBottom: 16 }}>
                <button 
                    className={`btn-sm ${viewType === 'retail' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 16px', borderRadius: 20 }}
                    onClick={() => setViewType('retail')}
                >
                    📦 พัสดุรายย่อย (Online & หน้าร้าน)
                </button>
                <button 
                    className={`btn-sm ${viewType === 'oem' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 16px', borderRadius: 20 }}
                    onClick={() => setViewType('oem')}
                >
                    🏭 ล็อตใหญ่ (ผลิต OEM)
                </button>
            </div>

            {hasSectionPermission('fulfillment_orders_table') && viewType === 'retail' && (
                <div className="card table-card animate-fade-in">
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: '#fafaf9' }}>
                        <h3 style={{ margin: 0, color: '#3f3f46', fontSize: 16 }}>ตารางคิวพัสดุรายย่อย</h3>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#71717a' }}>ออเดอร์สำหรับจัดส่งผ่านผู้ให้บริการพัสดุขนาดเล็ก (Courier)</p>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>รหัสออเดอร์</th>
                                <th>ช่องทางสั่งซื้อ</th>
                                <th>ชื่อลูกค้า</th>
                                <th>รายการสินค้า</th>
                                <th>ขนส่ง</th>
                                <th>สถานะ</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ fontWeight: 600 }}>SO-2604001</td>
                                <td><span className="badge" style={{ background: '#000', color: '#fff' }}>TikTok Shop</span></td>
                                <td>คุณสมชาย ใจดี</td>
                                <td>ยาดมสูตรเย็น (10), ครีมสมุนไพร (2)</td>
                                <td><span className="badge" style={{ background: '#fef08a', color: '#a16207' }}>Flash Express</span></td>
                                <td><span className="badge badge-warning">รอแพ็ค</span></td>
                                <td><button className="btn-sm btn-primary">พิมพ์ใบปะหน้า & แพ็ค</button></td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 600 }}>SO-2604003</td>
                                <td><span className="badge" style={{ background: '#ffeadf', color: '#ee4d2d' }}>Shopee</span></td>
                                <td>คุณวรีรัตน์ สุขใจ</td>
                                <td>เซรั่มหน้าใส (1)</td>
                                <td><span className="badge" style={{ background: '#fed7aa', color: '#c2410c' }}>Kerry</span></td>
                                <td><span className="badge badge-success">แพ็คเสร็จแล้ว</span></td>
                                <td><button className="btn-sm btn-secondary">ส่งมอบแล้ว</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {hasSectionPermission('fulfillment_orders_table') && viewType === 'oem' && (
                <div className="card table-card animate-fade-in">
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: '#f0fdfa' }}>
                        <h3 style={{ margin: 0, color: '#0f766e', fontSize: 16 }}>ตารางคิวจัดส่งผลิตล็อตใหญ่ (OEM)</h3>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#0d9488' }}>รอส่งมอบงานที่ผลิตและบรรจุเสร็จจากโรงงาน (Cross-docking)</p>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>รหัสใบสั่งผลิต</th>
                                <th>ลูกค้าองค์กร</th>
                                <th>ปริมาณที่ต้องส่ง</th>
                                <th>ประเภทยานพาหนะ</th>
                                <th>กำหนดส่งมอบ</th>
                                <th>สถานะคลัง/ผลิต</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ fontWeight: 600 }}>JOB-OEM-012</td>
                                <td>บจก. สยามเฮิร์บ แคร์พาร์ทเนอร์</td>
                                <td><span style={{ fontWeight: 700 }}>50 ลัง</span> (5,000 ชิ้น)</td>
                                <td>รถกระบะตู้ทึบ</td>
                                <td>15 เม.ย. 2026</td>
                                <td><span className="badge badge-success">ของพร้อมส่ง</span></td>
                                <td><button className="btn-sm btn-primary" style={{ background: '#0d9488', borderColor: '#0d9488' }}>ออกใบส่งมอบ (DO)</button></td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 600 }}>JOB-OEM-015</td>
                                <td>โรงพยาบาลภูมิรักษ์</td>
                                <td><span style={{ fontWeight: 700 }}>2 พาเลท</span> (10,000 ชิ้น)</td>
                                <td>รถหกล้อ</td>
                                <td>20 เม.ย. 2026</td>
                                <td><span className="badge badge-warning">รอกระบวนการแพ็ค (80%)</span></td>
                                <td><button className="btn-sm btn-secondary" disabled>รอกระบวนการ</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    return (
        <div className="page-container page-enter">
            {currentTab === 'fulfillment_dashboard' && renderDashboard()}
            {currentTab === 'fulfillment_orders' && renderOrders()}
        </div>
    );
}

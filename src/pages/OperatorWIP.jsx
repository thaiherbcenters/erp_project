import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Warehouse, Save, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../components/CustomAlert';

const API_BASE = 'http://localhost:5000/api';

const OperatorWIP = () => {
    const { user, canCreate } = useAuth();
    const { showAlert } = useAlert();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        formulaName: 'ยาหม่อง',
        expectedQty: '',
        unit: 'กรัม',
        tankNo: ''
    });

    useEffect(() => {
        // Pre-fill from query params if navigated from Operator shortage
        const params = new URLSearchParams(location.search);
        const formula = params.get('formula');
        const qty = params.get('qty');
        
        if (formula) {
            setFormData(prev => ({ ...prev, formulaName: formula }));
        }
        if (qty) {
            setFormData(prev => ({ ...prev, expectedQty: qty }));
        }
    }, [location]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.expectedQty || parseFloat(formData.expectedQty) <= 0) {
            showAlert('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนที่ต้องการผลิต', 'warning');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/production/tasks/wip`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    formulaName: formData.formulaName,
                    expectedQty: parseFloat(formData.expectedQty),
                    unit: formData.unit,
                    tankNo: formData.tankNo
                })
            });

            if (res.ok) {
                showAlert('สำเร็จ', 'เปิดบิลสั่งผลิต WIP เรียบร้อยแล้ว', 'success');
                setTimeout(() => {
                    navigate('/operator?tab=operator_dashboard');
                }, 1500);
            } else {
                const data = await res.json();
                showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเปิดบิลได้: ' + (data.message || 'Unknown error'), 'error');
            }
        } catch (err) {
            console.error('Submit error:', err);
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อระบบได้', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!canCreate('operator_wip')) {
        return (
            <div className="page-container" style={{ padding: 24, display: 'flex', justifyContent: 'center', marginTop: 40 }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <ShieldCheck size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                    <h4>ไม่มีสิทธิ์เข้าถึงหน้านี้</h4>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ padding: '32px 40px', width: '100%', fontFamily: 'Inter, "Noto Sans Thai", sans-serif', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
                <button 
                    onClick={() => navigate('/operator?tab=operator_dashboard')}
                    style={{ 
                        background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 16px', 
                        borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, 
                        color: '#64748b', fontSize: 14, fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.color = '#1e293b'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                    <ArrowLeft size={16} /> กลับหน้างานของฉัน
                </button>
                <h2 style={{ margin: 0, fontSize: 24, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700 }}>
                    <div style={{ padding: 8, background: '#e0f2fe', borderRadius: 8, color: '#0284c7', display: 'flex' }}>
                        <Warehouse size={24} />
                    </div>
                    สร้างใบสั่งผลิตสินค้ากึ่งสำเร็จรูป (WIP)
                </h2>
            </div>

            <div style={{ background: '#fff', borderRadius: 16, padding: 40, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <label style={{ fontWeight: 600, color: '#1e293b', fontSize: 15 }}>สูตรที่ต้องการผลิต <span style={{color: '#ef4444'}}>*</span></label>
                        <select 
                            name="formulaName" 
                            value={formData.formulaName} 
                            onChange={handleChange}
                            style={{ 
                                padding: '14px 16px', borderRadius: 8, border: '1px solid #cbd5e1', 
                                fontSize: 15, color: '#334155', outline: 'none', transition: 'border-color 0.2s',
                                backgroundColor: '#f8fafc', appearance: 'none', cursor: 'pointer'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                            required
                        >
                            <option value="ยาหม่อง">สูตรยาหม่อง (Bulk)</option>
                            <option value="พิมเสนน้ำ">สูตรพิมเสนน้ำ (Bulk)</option>
                            <option value="ยาหม่องน้ำ">สูตรยาหม่องน้ำ (Bulk)</option>
                        </select>
                        <span style={{ fontSize: 13, color: '#64748b' }}>เลือกสูตรตั้งต้นสำหรับการผสมสินค้ากึ่งสำเร็จรูป ระบบจะดึงอัตราส่วนจากฐานข้อมูลอัตโนมัติ</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <label style={{ fontWeight: 600, color: '#1e293b', fontSize: 15 }}>จำนวนที่ต้องการผลิต <span style={{color: '#ef4444'}}>*</span></label>
                            <input 
                                type="number" 
                                name="expectedQty"
                                value={formData.expectedQty} 
                                onChange={handleChange}
                                placeholder="ระบุตัวเลข เช่น 1000"
                                step="0.01"
                                min="1"
                                style={{ 
                                    padding: '14px 16px', borderRadius: 8, border: '1px solid #cbd5e1', 
                                    fontSize: 15, color: '#334155', outline: 'none', transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                required
                            />
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <label style={{ fontWeight: 600, color: '#1e293b', fontSize: 15 }}>หน่วย</label>
                            <select 
                                name="unit" 
                                value={formData.unit} 
                                onChange={handleChange}
                                style={{ 
                                    padding: '14px 16px', borderRadius: 8, border: '1px solid #cbd5e1', 
                                    fontSize: 15, color: '#334155', outline: 'none', transition: 'border-color 0.2s',
                                    backgroundColor: '#f8fafc', appearance: 'none', cursor: 'pointer'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                            >
                                <option value="กรัม">กรัม (g)</option>
                                <option value="กิโลกรัม">กิโลกรัม (kg)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <label style={{ fontWeight: 600, color: '#1e293b', fontSize: 15 }}>หมายเลขถัง/ภาชนะที่ใช้บรรจุ (Optional)</label>
                        <input 
                            type="text" 
                            name="tankNo"
                            value={formData.tankNo} 
                            onChange={handleChange}
                            placeholder="เช่น ถังสแตนเลสเบอร์ 1, ถังพลาสติก A"
                            style={{ 
                                padding: '14px 16px', borderRadius: 8, border: '1px solid #cbd5e1', 
                                fontSize: 15, color: '#334155', outline: 'none', transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        />
                        <span style={{ fontSize: 13, color: '#64748b' }}>ระบุถังที่ใช้หมัก/ผสม เพื่อความง่ายในการติดตาม Lot สินค้า</span>
                    </div>

                    <div style={{ background: '#f0f9ff', padding: 24, borderRadius: 12, border: '1px solid #bae6fd', display: 'flex', gap: 16 }}>
                        <div style={{ color: '#0284c7', paddingTop: 2 }}>
                            <Warehouse size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#0369a1', fontWeight: 700 }}>ข้อมูลการทำงาน</h4>
                            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#0c4a6e', display: 'flex', flexDirection: 'column', gap: 10, lineHeight: 1.5 }}>
                                <li>เมื่อสร้างบิลเสร็จสิ้น งานจะปรากฏในแท็บ <strong>"งานของฉัน"</strong> ของฝ่ายผลิตโดยอัตโนมัติ</li>
                                <li>ผู้ปฏิบัติงานต้องทำการ <strong>เตรียมวัตถุดิบ</strong> และ <strong>ผสม</strong> ตามสูตร</li>
                                <li>หลังจากผสมเสร็จ จะต้องส่งตัวอย่างเพื่อตรวจสอบ <strong>QC (In-Process)</strong></li>
                                <li>หากผ่าน QC ระบบจะบันทึกเพิ่มยอดเข้า <strong>คลังสินค้า (WIP)</strong> ให้อัตโนมัติ</li>
                            </ul>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 24, borderTop: '1px solid #f1f5f9' }}>
                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{ 
                                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
                                color: '#ffffff', border: 'none', padding: '14px 32px', 
                                borderRadius: 8, fontSize: 16, fontWeight: 600, 
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 10, 
                                opacity: loading ? 0.8 : 1,
                                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => { if(!loading) e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(37, 99, 235, 0.4)'; }}
                            onMouseOut={(e) => { if(!loading) e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(37, 99, 235, 0.3)'; }}
                        >
                            <Save size={20} /> {loading ? 'กำลังดำเนินการ...' : 'สร้างใบสั่งผลิต WIP'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default OperatorWIP;

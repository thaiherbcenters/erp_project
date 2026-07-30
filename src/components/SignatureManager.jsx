import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, X, Upload } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SignatureManager = ({ onSignaturesChange, currentSignatures, isInline = false }) => {
    const [isOpen, setIsOpen] = useState(isInline);
    const [signatures, setSignatures] = useState(currentSignatures || []);
    const [loading, setLoading] = useState(false);
    
    // New signature form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newImage, setNewImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    const fetchSignatures = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/signatures`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setSignatures(data.data);
                if (onSignaturesChange) onSignaturesChange(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch signatures:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen || isInline) {
            fetchSignatures();
        }
    }, [isOpen, isInline]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleAdd = async () => {
        if (!newName || !newImage) {
            alert('กรุณากรอกชื่อและเลือกไฟล์รูปลายเซ็น (Please provide name and image)');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('fullName', newName);
            formData.append('signatureImage', newImage);

            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/signatures`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                setNewName('');
                setNewImage(null);
                setPreviewUrl('');
                setShowAddForm(false);
                fetchSignatures(); // refresh list
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Failed to upload signature:', error);
            alert('Failed to upload signature');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('คุณต้องการลบลายเซ็นนี้ใช่หรือไม่?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/signatures/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                fetchSignatures(); // refresh list
            }
        } catch (error) {
            console.error('Failed to delete signature:', error);
        }
    };

    const content = (
        <div style={{ padding: isInline ? '0' : '24px', overflowY: 'auto', flex: 1, backgroundColor: isInline ? 'transparent' : '#f8fafc' }}>
            
            {!showAddForm ? (
                <button 
                    onClick={() => setShowAddForm(true)}
                    style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px', fontWeight: 'bold' }}
                >
                    <Plus size={18} /> เพิ่มลายเซ็นใหม่ (Add New)
                </button>
            ) : (
                                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                    <h4 style={{ margin: '0 0 16px 0' }}>เพิ่มลายเซ็นใหม่</h4>
                                    
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#475569' }}>ชื่อผู้ลงนาม (Name)</label>
                                        <input 
                                            type="text" 
                                            value={newName} 
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="เช่น ธวัช จรุงพิรวงศ์"
                                            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                        />
                                    </div>
                                    
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#475569' }}>รูปลายเซ็น (พื้นหลังโปร่งใส แนะนำ PNG ขนาดแนวยาว)</label>
                                        <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '20px', textAlign: 'center', background: '#f8fafc', cursor: 'pointer', position: 'relative' }}>
                                            <input 
                                                type="file" 
                                                accept="image/png, image/jpeg, image/webp" 
                                                onChange={handleFileChange}
                                                style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                                            />
                                            {previewUrl ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <img src={previewUrl} alt="Preview" style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }} />
                                                    <span style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>คลิกเพื่อเปลี่ยนรูป</span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b' }}>
                                                    <Upload size={32} style={{ marginBottom: '8px' }} color="#94a3b8" />
                                                    <span style={{ fontWeight: '500' }}>คลิกเพื่อเลือกไฟล์รูปลายเซ็น</span>
                                                    <span style={{ fontSize: '12px' }}>รองรับ PNG, JPG</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button 
                                            onClick={handleAdd}
                                            style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            บันทึก (Save)
                                        </button>
                                        <button 
                                            onClick={() => { setShowAddForm(false); setNewImage(null); setPreviewUrl(''); setNewName(''); }}
                                            style={{ flex: 1, padding: '10px', background: '#fff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                                        >
                                            ยกเลิก (Cancel)
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#334155' }}>รายชื่อผู้มีอำนาจลงนามในระบบ</h4>
                                {loading && signatures.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>กำลังโหลด...</p>
                                ) : signatures.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#64748b', padding: '20px', background: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>ยังไม่มีข้อมูลลายเซ็น</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {signatures.map((sig) => (
                                            <div key={sig.SignatureID} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    <div style={{ width: '80px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <img src={sig.ImagePath.startsWith('/api') ? `http://localhost:5000${sig.ImagePath}` : sig.ImagePath} alt="signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                                                            onError={(e) => { e.target.onerror = null; e.target.src = 'http://localhost:5173' + sig.ImagePath; }} 
                                                        />
                                                    </div>
                                                    <span style={{ fontWeight: '500', color: '#1e293b' }}>{sig.FullName}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleDelete(sig.SignatureID)}
                                                    style={{ background: '#fee2e2', color: '#ef4444', border: 'none', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
        );

    if (isInline) {
        return content;
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                title="จัดการลายเซ็น"
                style={{
                    background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px',
                    padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    gap: '6px', color: '#475569', fontSize: '14px', whiteSpace: 'nowrap'
                }}
            >
                <Settings size={16} /> จัดการ
            </button>

            {isOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '600px',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
                    }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Settings size={20} color="#3b82f6" /> ตั้งค่าลายเซ็น (Signatures)
                            </h3>
                            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
                        </div>
                        {content}
                    </div>
                </div>
            )}
        </>
    );
};

export default SignatureManager;

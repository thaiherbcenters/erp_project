import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Plus, Trash2, Search, X, Loader2 } from 'lucide-react';
import { useAlert } from '../components/CustomAlert';
import API_BASE from '../config';
import '../pages/PageCommon.css';

const PRODUCT_CATALOG = {
    "ยาดมสมุนไพร": { price: 79 },
    "ยาดมสมุนไพร จัมโบ้": { price: 490 },
    "ยาหม่อง": { price: 59 },
    "ยาน้ำมัน ขนาด 10 มล.": { price: 129 },
    "ยาน้ำมัน ขนาด 5 มล.": { price: 69 },
    "ยาน้ำมันสมุนไพร สูตรเย็น": { price: 199 },
    "ยาน้ำมันสมุนไพร สูตรร้อน": { price: 199 },
    "ยาสเปรย์ผสมกระดูกไก่ดำ": { price: 199 },
    "แคปซูลขมิ้นชัน": { price: 129 },
    "แคปซูลฟ้าทะลายโจร": { price: 159 },
    "แคปซูลขิง": { price: 129 },
    "แคปซูลมะขามแขก": { price: 129 },
    "แคปซูลรางจืด": { price: 129 },
    "แคปซูลมะระขี้นก": { price: 129 },
    "แคปซูลตรีผลา": { price: 129 },
    "แคปซูลเพชรสังฆาต": { price: 129 },
    "แคปซูลประสะเจตพังคี": { price: 129 },
    "แคปซูลสหัศธารา": { price: 129 },
    "แคปซูลประสะมะแว้ง": { price: 129 },
    "แคปซูลปราบชมพูทวีป": { price: 129 },
    "ลูกประคบ": { price: 159 },
    "ชาอัสสัม กล่อง": { price: '' },
    "ชาอัสสัม ซอง": { price: 95 },
    "ชากัญชาโสมขาว": { price: 95 },
    "ชากัญชา": { price: 95 },
    "น้ำผึ้ง": { price: '' },
    "เทียนหอม Aromatic กลิ่น Rose": { price: 290 },
    "เทียนหอม Aromatic กลิ่น Morning": { price: 290 },
    "เทียนหอม Aromatic กลิ่น Thai": { price: 290 },
    "น้ำมันหอมระเหย กลิ่น Rose": { price: 490 },
    "น้ำมันหอมระเหย กลิ่น Morning": { price: 490 },
    "น้ำมันหอมระเหย กลิ่น Thai": { price: 490 }
};

export default function SalesOrderForm({ editId, onBack, onSave, viewOnly }) {
    const { showConfirm, showAlert } = useAlert();
    const [saving, setSaving] = useState(false);
    const [approvedQTs, setApprovedQTs] = useState([]);
    const [selectedQT, setSelectedQT] = useState('');
    const [qtSearchText, setQtSearchText] = useState('');
    const [showQtDropdown, setShowQtDropdown] = useState(false);
    const [isFetchingQT, setIsFetchingQT] = useState(false);

    const filteredQTs = approvedQTs.filter(q => 
        (q.QuotationNo || '').toLowerCase().includes(qtSearchText.toLowerCase()) || 
        (q.CustomerName || '').toLowerCase().includes(qtSearchText.toLowerCase())
    );

    const handleClearQT = () => {
        setSelectedQT('');
        setQtSearchText('');
        setFormData(prev => ({
            ...prev,
            customerName: '',
            address: '',
            phone: '',
            taxId: '',
            discountPercent: 0,
            vatRate: 0,
            shippingCost: 0,
            notes: '',
        }));
        setItems([
            { id: 1, name: '', qty: '', unit: 'ชิ้น', price: '' }
        ]);
    };
    const [formData, setFormData] = useState({
        docType: 'quotation_thc',
        customerName: '',
        address: '',
        phone: '',
        taxId: '',
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        discountPercent: 0,
        vatRate: 0,
        shippingCost: 0,
        customerPONumber: '',
        notes: '',
    });

    const [items, setItems] = useState([
        { id: 1, name: '', qty: '', unit: 'ชิ้น', price: '' }
    ]);

    // Fetch approved quotations for dropdown
    useEffect(() => {
        const fetchApproved = async () => {
            try {
                const res = await fetch(`${API_BASE}/quotations/status/approved`);
                const json = await res.json();
                if (json.success) setApprovedQTs(json.data);
            } catch (err) { console.error('Error fetching approved QTs:', err); }
        };
        fetchApproved();
    }, []);

    // Fetch existing SO for editing
    useEffect(() => {
        if (editId) {
            const fetchSO = async () => {
                try {
                    const res = await fetch(`${API_BASE}/sales-orders/${editId}`);
                    const json = await res.json();
                    if (json.success) {
                        const d = json.data;
                        setFormData({
                            docType: d.DocType || 'quotation_thc',
                            customerName: d.CustomerName || '',
                            address: d.Address || '',
                            phone: d.Phone || '',
                            taxId: d.TaxID || '',
                            orderDate: d.OrderDate ? d.OrderDate.split('T')[0] : '',
                            deliveryDate: d.DeliveryDate ? d.DeliveryDate.split('T')[0] : '',
                            discountPercent: d.DiscountPercent || 0,
                            vatRate: d.VatRate || 0,
                            shippingCost: d.ShippingCost || 0,
                            customerPONumber: d.CustomerPONumber || '',
                            notes: d.Notes || '',
                        });
                        if (d.QuotationNo) setSelectedQT(d.QuotationNo);
                        if (d.items?.length > 0) {
                            setItems(d.items.map(it => ({
                                id: it.ItemID, name: it.ItemName, qty: it.Qty,
                                unit: it.Unit || 'ชิ้น', price: it.Price,
                            })));
                        }
                    }
                } catch (err) { console.error('Error fetching SO:', err); }
            };
            fetchSO();
        }
    }, [editId]);

    // Auto-fill from Quotation
    const handleSelectQT = async (qtId) => {
        if (!qtId) { handleClearQT(); return; }
        setIsFetchingQT(true);
        try {
            const res = await fetch(`${API_BASE}/sales-orders/from-quotation/${qtId}`);
            const json = await res.json();
            if (json.success) {
                const d = json.data;
                setSelectedQT(d.QuotationNo);
                setFormData(prev => ({
                    ...prev,
                    docType: d.DocType || prev.docType,
                    customerName: d.CustomerName || '',
                    address: d.Address || '',
                    phone: d.Phone || '',
                    taxId: d.TaxID || '',
                    discountPercent: d.DiscountPercent || 0,
                    vatRate: d.VatRate || 0,
                    shippingCost: d.ShippingCost || 0,
                    notes: '',
                }));
                if (d.items?.length > 0) {
                    setItems(d.items.map((it, i) => ({
                        id: Date.now() + i, name: it.ItemName,
                        qty: it.Qty, unit: 'ชิ้น', price: it.Price,
                    })));
                }
            }
        } catch (err) { console.error('Error loading QT data:', err); }
        finally { setIsFetchingQT(false); }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addItem = () => setItems(prev => [...prev, { id: Date.now(), name: '', qty: '', unit: 'ชิ้น', price: '' }]);
    const removeItem = (id) => { if (items.length > 1) setItems(prev => prev.filter(i => i.id !== id)); };
    const handleItemChange = (id, field, value) => {
        setItems(prev => prev.map(i => {
            if (i.id === id) {
                const updated = { ...i, [field]: value };
                if (field === 'name' && PRODUCT_CATALOG[value] && PRODUCT_CATALOG[value].price !== '') {
                    updated.price = PRODUCT_CATALOG[value].price;
                }
                return updated;
            }
            return i;
        }));
    };

    // Calculations
    const subTotal = items.reduce((sum, i) => sum + ((parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0)), 0);
    const discountAmount = subTotal * (parseFloat(formData.discountPercent) || 0) / 100;
    const afterDiscount = subTotal - discountAmount;
    const vatAmount = afterDiscount * (parseFloat(formData.vatRate) || 0) / 100;
    const shipping = parseFloat(formData.shippingCost) || 0;
    const grandTotal = afterDiscount + vatAmount + shipping;

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.customerName) return showAlert('แจ้งเตือน', 'กรุณาระบุชื่อลูกค้า', 'warning');
        if (!formData.deliveryDate) return showAlert('แจ้งเตือน', 'กรุณาระบุวันที่ต้องการส่ง', 'warning');
        if (!items.some(i => i.name)) return showAlert('แจ้งเตือน', 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ', 'warning');

        const ok = await showConfirm('ยืนยันบันทึก', 'ต้องการบันทึก Sales Order นี้ใช่หรือไม่?', 'info');
        if (!ok) return;

        setSaving(true);
        const qtObj = approvedQTs.find(q => q.QuotationNo === selectedQT);
        const payload = {
            quotationId: qtObj?.QuotationID || null,
            quotationNo: selectedQT || null,
            docType: formData.docType,
            customerName: formData.customerName,
            address: formData.address,
            phone: formData.phone,
            taxId: formData.taxId,
            orderDate: formData.orderDate,
            deliveryDate: formData.deliveryDate || null,
            subTotal, discountPercent: formData.discountPercent,
            discountAmount, afterDiscount, vatRate: formData.vatRate,
            vatAmount, shippingCost: shipping, grandTotal,
            customerPONumber: formData.customerPONumber,
            notes: formData.notes,
            createdBy: '',
            items: items.filter(i => i.name).map(i => ({
                name: i.name, qty: i.qty, unit: i.unit,
                price: i.price, amount: (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0),
            })),
        };

        try {
            const url = editId ? `${API_BASE}/sales-orders/${editId}` : `${API_BASE}/sales-orders`;
            const method = editId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const json = await res.json();
            setSaving(false);
            if (json.success) {
                await showAlert('สำเร็จ', editId ? 'แก้ไข Sales Order สำเร็จ' : `สร้าง Sales Order สำเร็จ (${json.salesOrderNo})`, 'success');
                onSave?.();
            } else {
                showAlert('ข้อผิดพลาด', json.message || 'ไม่สามารถบันทึกได้', 'error');
            }
        } catch (err) {
            setSaving(false);
            console.error('Error saving SO:', err);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    };

    const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border, #e2e8f0)', fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-white, #fff)', color: 'var(--text, #1e293b)' };
    const sectionStyle = { background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, padding: 20, marginBottom: 16 };

    if (viewOnly) {
        return (
            <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', marginBottom: 16, border: '1px solid var(--primary-light, #818cf8)', borderRadius: 6, background: '#fff', color: 'var(--primary, #4f46e5)', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                    <ArrowLeft size={16} /> กลับไปหน้ารายการ
                </button>

                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>📄 รายละเอียด Sales Order</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>ดูข้อมูลคำสั่งซื้อทั้งหมด</p>
                </div>

                <div style={sectionStyle}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 14px' }}>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>ชื่อลูกค้า</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{formData.customerName || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>เลข PO ลูกค้า</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{formData.customerPONumber || '-'}</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>ที่อยู่</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{formData.address || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>โทรศัพท์</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{formData.phone || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>เลขผู้เสียภาษี</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{formData.taxId || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>วันที่สั่งซื้อ</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{formData.orderDate ? new Date(formData.orderDate).toLocaleDateString('th-TH') : '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>วันที่ต้องการส่ง</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{formData.deliveryDate ? new Date(formData.deliveryDate).toLocaleDateString('th-TH') : '-'}</div>
                        </div>
                    </div>
                </div>

                <div style={sectionStyle}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 16px 0', borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>📦 รายการสินค้า</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '8px 0', width: 40 }}>ลำดับ</th>
                                <th style={{ padding: '8px 0' }}>ชื่อสินค้า</th>
                                <th style={{ padding: '8px 0', textAlign: 'right' }}>จำนวน</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>หน่วย</th>
                                <th style={{ padding: '8px 0', textAlign: 'right' }}>ราคา/หน่วย</th>
                                <th style={{ padding: '8px 0', textAlign: 'right' }}>รวม (บาท)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '12px 0', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                    <td style={{ padding: '12px 0', fontWeight: 500 }}>{item.name}</td>
                                    <td style={{ padding: '12px 0', textAlign: 'right' }}>{parseFloat(item.qty || 0).toLocaleString()}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'left' }}>{item.unit}</td>
                                    <td style={{ padding: '12px 0', textAlign: 'right' }}>{parseFloat(item.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                                        {((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ ...sectionStyle, marginBottom: 0 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>หมายเหตุ</h3>
                        <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', background: 'var(--bg)', padding: 12, borderRadius: 6, minHeight: 80 }}>
                            {formData.notes || '-'}
                        </div>
                    </div>
                    <div style={{ ...sectionStyle, marginBottom: 0 }}>
                        {[
                            { label: 'ยอดรวมก่อนส่วนลด', value: subTotal },
                            formData.discountPercent > 0 && { label: `ส่วนลด (${formData.discountPercent}%)`, value: -discountAmount },
                            formData.vatRate > 0 && { label: `VAT (${formData.vatRate}%)`, value: vatAmount },
                            shipping > 0 && { label: 'ค่าจัดส่ง', value: shipping },
                        ].filter(Boolean).map((row, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{row.label}</span>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>฿{row.value.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>ยอดรวมสุทธิ</span>
                            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ animation: 'slideUp 0.3s ease-out' }}>
            <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', marginBottom: 16, border: '1px solid var(--primary-light, #818cf8)', borderRadius: 6, background: '#fff', color: 'var(--primary, #4f46e5)', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                <ArrowLeft size={16} /> กลับ
            </button>

            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>
                    {viewOnly ? '📄 รายละเอียด Sales Order' : editId ? '✏️ แก้ไข Sales Order' : '📦 สร้าง Sales Order ใหม่'}
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                    {viewOnly ? 'ดูรายละเอียดคำสั่งซื้อ' : editId ? 'แก้ไขข้อมูลคำสั่งซื้อ' : 'สร้างคำสั่งซื้อใหม่จากใบเสนอราคาหรือกรอกข้อมูลเอง'}
                </p>
            </div>

            {/* ── อ้างอิง Quotation ── */}
            {!editId && (
                <div style={sectionStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-light, #f1f5f9)' }}>
                        <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#16a34a' }}>📋</div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>อ้างอิงใบเสนอราคา</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>เลือกจากใบเสนอราคาที่อนุมัติแล้ว หรือปล่อยว่างเพื่อสร้าง Manual</div>
                        </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <div style={{ 
                            display: 'flex', alignItems: 'center', 
                            border: selectedQT ? '1px solid #22c55e' : '1px solid var(--border)', 
                            borderRadius: 6, 
                            background: selectedQT ? '#f0fdf4' : '#fff', 
                            padding: '0 12px' 
                        }}>
                            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                            {isFetchingQT ? (
                                <Loader2 size={16} color="#16a34a" style={{ animation: 'spin 1s linear infinite' }} />
                            ) : selectedQT ? (
                                <span style={{ color: '#16a34a', fontSize: 14 }}>✅</span>
                            ) : (
                                <Search size={16} color="#94a3b8" />
                            )}
                            <input 
                                type="text" 
                                placeholder="พิมพ์เลขที่ QT หรือชื่อลูกค้าเพื่อค้นหา (หรือปล่อยว่างเพื่อสร้าง Manual)" 
                                value={isFetchingQT ? 'กำลังดึงข้อมูล...' : selectedQT ? `อ้างอิงจาก ${selectedQT} เรียบร้อย` : qtSearchText} 
                                onChange={e => { setQtSearchText(e.target.value); setShowQtDropdown(true); }}
                                onFocus={() => { if (!selectedQT) setShowQtDropdown(true); }}
                                readOnly={!!selectedQT || isFetchingQT}
                                style={{ 
                                    width: '100%', border: 'none', padding: '10px', outline: 'none', fontSize: 13, 
                                    background: 'transparent', 
                                    color: selectedQT || isFetchingQT ? '#15803d' : 'var(--text)',
                                    fontWeight: selectedQT ? 600 : 400
                                }}
                            />
                            {selectedQT && !isFetchingQT ? (
                                <button onClick={handleClearQT} style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', padding: 4, borderRadius: '50%', color: '#ef4444', display: 'flex' }} title="ยกเลิกการอ้างอิง">
                                    <X size={14} />
                                </button>
                            ) : qtSearchText && !selectedQT && !isFetchingQT ? (
                                <button onClick={() => { setQtSearchText(''); setShowQtDropdown(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', display: 'flex' }}>
                                    <X size={14} />
                                </button>
                            ) : null}
                        </div>
                        
                        {!selectedQT && showQtDropdown && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setShowQtDropdown(false)} />
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, marginTop: 4, maxHeight: 250, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                        {filteredQTs.length === 0 ? (
                                            <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                                                ไม่พบใบเสนอราคาที่ค้นหา
                                            </div>
                                        ) : (
                                            filteredQTs.map(q => (
                                                <div 
                                                    key={q.QuotationID} 
                                                    onClick={() => { handleSelectQT(q.QuotationID); setShowQtDropdown(false); setQtSearchText(''); }}
                                                    style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                        <strong style={{ color: 'var(--text)', fontSize: 13 }}>{q.QuotationNo}</strong>
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>฿{(q.GrandTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{q.CustomerName}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                </div>
            )}

            {/* ── ข้อมูลลูกค้า ── */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-light, #f1f5f9)' }}>
                    <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--primary)' }}>👤</div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>ข้อมูลลูกค้า</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ข้อมูลลูกค้าและรายละเอียดการสั่งซื้อ</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>ชื่อลูกค้า <span style={{ color: '#ef4444' }}>*</span></label>
                        <input style={inputStyle} name="customerName" value={formData.customerName} onChange={handleFormChange} placeholder="ชื่อบริษัท/ลูกค้า" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>เลข PO ลูกค้า (ถ้ามี)</label>
                        <input style={inputStyle} name="customerPONumber" value={formData.customerPONumber} onChange={handleFormChange} placeholder="PO-XXXX ของลูกค้า" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>ที่อยู่</label>
                        <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} name="address" value={formData.address} onChange={handleFormChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>โทรศัพท์</label>
                        <input style={inputStyle} name="phone" value={formData.phone} onChange={handleFormChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>เลขผู้เสียภาษี</label>
                        <input style={inputStyle} name="taxId" value={formData.taxId} onChange={handleFormChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>วันที่สั่งซื้อ</label>
                        <input style={inputStyle} type="date" name="orderDate" value={formData.orderDate} onChange={handleFormChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>วันที่ต้องการส่ง <span style={{ color: '#ef4444' }}>*</span></label>
                        <input style={inputStyle} type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleFormChange} />
                    </div>
                </div>
            </div>

            {/* ── รายการสินค้า ── */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-light, #f1f5f9)' }}>
                    <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, color: '#2563eb' }}>📦</div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>รายการสินค้า</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>สินค้าที่ลูกค้าสั่งซื้อ</div>
                    </div>
                </div>

                {items.map((item, idx) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 14, border: '1px solid var(--border)', borderRadius: 6, marginBottom: 10, background: 'var(--bg-white)' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 24, paddingTop: 10 }}>{idx + 1}.</span>
                        <div style={{ flex: 3, minWidth: 200 }}>
                            <input 
                                style={inputStyle} 
                                value={item.name} 
                                onChange={e => handleItemChange(item.id, 'name', e.target.value)} 
                                placeholder="ชื่อสินค้า" 
                                list={`products_list_${item.id}`}
                            />
                            <datalist id={`products_list_${item.id}`}>
                                {Object.keys(PRODUCT_CATALOG).map(pName => <option key={pName} value={pName} />)}
                            </datalist>
                        </div>
                        <div style={{ flex: 1, minWidth: 80 }}>
                            <input style={{ ...inputStyle, textAlign: 'right' }} type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', e.target.value)} placeholder="จำนวน" />
                        </div>
                        <div style={{ flex: 1, minWidth: 70 }}>
                            <input style={inputStyle} value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} placeholder="หน่วย" />
                        </div>
                        <div style={{ flex: 1, minWidth: 100 }}>
                            <input style={{ ...inputStyle, textAlign: 'right' }} type="number" value={item.price} onChange={e => handleItemChange(item.id, 'price', e.target.value)} placeholder="ราคา/หน่วย" />
                        </div>
                        <div style={{ flex: 1, minWidth: 90, textAlign: 'right', fontWeight: 600, color: 'var(--primary)', paddingTop: 10, fontSize: 13 }}>
                            ฿{((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </div>
                        {items.length > 1 && (
                            <button onClick={() => removeItem(item.id)} style={{ width: 30, height: 30, border: 'none', background: '#fef2f2', color: '#ef4444', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                ))}

                <button onClick={addItem} style={{ width: '100%', padding: 8, background: 'transparent', color: 'var(--primary)', border: '1px dashed var(--primary-light, #818cf8)', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                    <Plus size={14} /> เพิ่มรายการ
                </button>
            </div>

            {/* ── สรุปยอด ── */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-light, #f1f5f9)' }}>
                    <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, color: '#d97706' }}>💰</div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>สรุปยอดเงิน</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>ส่วนลด (%)</label>
                        <input style={inputStyle} type="number" name="discountPercent" value={formData.discountPercent} onChange={handleFormChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>VAT (%)</label>
                        <input style={inputStyle} type="number" name="vatRate" value={formData.vatRate} onChange={handleFormChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>ค่าจัดส่ง (บาท)</label>
                        <input style={inputStyle} type="number" name="shippingCost" value={formData.shippingCost} onChange={handleFormChange} />
                    </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                    {[
                        { label: 'ยอดรวมก่อนส่วนลด', value: subTotal },
                        formData.discountPercent > 0 && { label: `ส่วนลด (${formData.discountPercent}%)`, value: -discountAmount },
                        formData.vatRate > 0 && { label: `VAT (${formData.vatRate}%)`, value: vatAmount },
                        shipping > 0 && { label: 'ค่าจัดส่ง', value: shipping },
                    ].filter(Boolean).map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light, #f1f5f9)' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{row.label}</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>฿{row.value.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>ยอดรวมสุทธิ</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* ── หมายเหตุ ── */}
            <div style={sectionStyle}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>หมายเหตุ</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} name="notes" value={formData.notes} onChange={handleFormChange} placeholder="หมายเหตุเพิ่มเติม..." />
            </div>

            {/* ── ปุ่ม ── */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={onBack} style={{ flex: 1, padding: '10px 16px', background: 'var(--bg-white)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                    ยกเลิก
                </button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px 16px', background: 'var(--primary, #4f46e5)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1 }}>
                    <Save size={16} /> {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'สร้าง Sales Order'}
                </button>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { PRODUCT_LIST, PRODUCT_PRICES, PRODUCT_IMAGES, DOC_TYPES, BANK_ACCOUNTS, UNIT_OPTIONS } from '../data/billingData';
import BillingPrintContainer from './BillingPrintContainer';
import './BillingForm.css';
import { Save, Printer, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import API_BASE from '../config';

const BillingForm = ({ onBack }) => {
    const [formData, setFormData] = useState({
        docType: 'billing_thc',
        billNo: '',
        billDate: new Date().toISOString().split('T')[0],
        customerName: '',
        address: '',
        phone: '',
        taxId: '',
        notes: '',
        depositCondition: '0',
        customDepositAmount: 0,
        subTotal: 0,
        discountPercent: 0,
        discount: 0,
        vatType: '0',
        vatAmount: 0,
        shippingCost: 0,
        designFee: 0,
        totalAmount: 0,
        showDiscountInPrint: false,
        showVatInPrint: false,
        showDepositInPrint: false,
        showShippingInPrint: true,
        showDesignFeeInPrint: false,
        paymentMethod: 'transfer',
        customerBank: '',
        customerBranch: '',
        chequeNo: '',
        chequeDate: '',
        deliverTo: '',
        contactPerson: '',
        purchaseNo: '',
        termOfPayment: '',
        dueDate: '',
        salesperson: '',
        customerOrder: '',
        fdaServiceRegister: true,
        fdaServiceRegisterPrice: 30000,
        fdaServiceTrademark: false,
        fdaServiceTrademarkPrice: 5000,
        products: []
    });

    const [isPrinting, setIsPrinting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState(null);

    const calculateTotals = (currentProducts, data = formData) => {
        let subTotal = 0;
        const updatedProducts = currentProducts.map(p => {
            const amt = (parseFloat(p.quantity) || 0) * (parseFloat(p.unitPrice) || 0);
            subTotal += amt;
            return { ...p, amount: amt };
        });

        const discountAmt = data.discountPercent > 0 ? subTotal * (data.discountPercent / 100) : (parseFloat(data.discount) || 0);
        let balance = subTotal - discountAmt;
        if (balance < 0) balance = 0;

        const vatRate = parseFloat(data.vatType) || 0;
        const vatAmt = balance * (vatRate / 100);

        const shippingAmt = parseFloat(data.shippingCost) || 0;
        const designAmt = parseFloat(data.designFee) || 0;

        const totalAmount = balance + vatAmt + shippingAmt + designAmt;

        setFormData(prev => ({
            ...prev,
            products: updatedProducts,
            subTotal,
            discount: discountAmt,
            vatAmount: vatAmt,
            totalAmount
        }));
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        
        setFormData(prev => {
            const newData = { ...prev, [name]: val };
            if (['discountPercent', 'discount', 'vatType', 'shippingCost', 'designFee'].includes(name)) {
                setTimeout(() => calculateTotals(newData.products, newData), 0);
            }
            return newData;
        });
    };

    const addProduct = () => {
        const newProducts = [...formData.products, { id: Date.now(), name: '', quantity: 1, unit: 'ชิ้น', unitPrice: 0, amount: 0, pic: '' }];
        setFormData(prev => ({ ...prev, products: newProducts }));
        calculateTotals(newProducts);
    };

    const removeProduct = (id) => {
        const newProducts = formData.products.filter(p => p.id !== id);
        setFormData(prev => ({ ...prev, products: newProducts }));
        calculateTotals(newProducts);
    };

    const handleProductChange = (id, field, value) => {
        const newProducts = formData.products.map(p => {
            if (p.id === id) {
                const updated = { ...p, [field]: value };
                if (field === 'name' && PRODUCT_PRICES[value]) {
                    updated.unitPrice = PRODUCT_PRICES[value];
                    if (PRODUCT_IMAGES[value]) updated.pic = PRODUCT_IMAGES[value];
                }
                return updated;
            }
            return p;
        });
        setFormData(prev => ({ ...prev, products: newProducts }));
        if (['quantity', 'unitPrice', 'name'].includes(field)) {
            calculateTotals(newProducts);
        }
    };

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 500);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage(null);
        try {
            // Transform data for Quotation API or Custom API
            const payload = {
                QuotationNo: formData.billNo || 'BILL-AUTO',
                DocType: formData.docType,
                CustomerName: formData.customerName,
                Address: formData.address,
                Phone: formData.phone,
                TaxID: formData.taxId,
                BillDate: formData.billDate,
                SubTotal: formData.subTotal,
                DiscountPercent: formData.discountPercent,
                DiscountAmount: formData.discount,
                VatRate: formData.vatType,
                VatAmount: formData.vatAmount,
                ShippingCost: formData.shippingCost,
                GrandTotal: formData.totalAmount,
                Notes: formData.notes,
                Status: 'ร่าง',
                Items: formData.products.map((p, i) => ({
                    ItemOrder: i + 1,
                    ItemName: p.name,
                    Qty: p.quantity,
                    Price: p.unitPrice,
                    Amount: p.amount,
                    ImageURL: p.pic
                }))
            };

            const res = await fetch(`${API_BASE}/quotations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.success) {
                setSaveMessage({ type: 'success', text: 'บันทึกบิลสำเร็จ!' });
                if(!formData.billNo) setFormData(prev => ({...prev, billNo: json.data?.QuotationNo || ''}));
            } else {
                setSaveMessage({ type: 'error', text: 'บันทึกไม่สำเร็จ: ' + json.message });
            }
        } catch (err) {
            setSaveMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
        } finally {
            setIsSaving(false);
        }
    };

    // Initialize with 1 empty product row
    useEffect(() => {
        if (formData.products.length === 0) {
            addProduct();
        }
    }, []);

    const isFDA = formData.docType.includes('quotation_fda');
    const isSleek = !formData.docType.includes('full_tax_invoice') && (formData.docType.includes('receipt') || formData.docType.includes('tax_invoice'));

    return (
        <div className="billing-form-wrapper" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: '#d35400' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ArrowLeft /></button>
                    ฟอร์มออกบิล / เอกสารฝ่ายขาย
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleSave} disabled={isSaving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Save size={16} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึกลงระบบ'}
                    </button>
                    <button onClick={handlePrint} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#27ae60' }}>
                        <Printer size={16} /> พิมพ์เอกสาร
                    </button>
                </div>
            </div>

            {saveMessage && (
                <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '8px', background: saveMessage.type === 'success' ? '#d4edda' : '#f8d7da', color: saveMessage.type === 'success' ? '#155724' : '#721c24' }}>
                    {saveMessage.text}
                </div>
            )}

            <div className="form-group">
                <label>ประเภทเอกสาร</label>
                <select name="docType" value={formData.docType} onChange={handleChange} className="form-control">
                    {DOC_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                    <label>เลขที่เอกสาร</label>
                    <input type="text" name="billNo" value={formData.billNo} onChange={handleChange} placeholder="ปล่อยว่างเพื่อสร้างอัตโนมัติ" className="form-control" />
                </div>
                <div className="form-group">
                    <label>วันที่</label>
                    <input type="date" name="billDate" value={formData.billDate} onChange={handleChange} className="form-control" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>ชื่อลูกค้า / บริษัท <span style={{color: 'red'}}>*</span></label>
                    <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} required className="form-control" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>ที่อยู่</label>
                    <textarea name="address" value={formData.address} onChange={handleChange} className="form-control" rows="2"></textarea>
                </div>
                <div className="form-group">
                    <label>เบอร์โทรศัพท์</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="form-control" />
                </div>
                <div className="form-group">
                    <label>เลขประจำตัวผู้เสียภาษี</label>
                    <input type="text" name="taxId" value={formData.taxId} onChange={handleChange} className="form-control" />
                </div>
            </div>

            {isSleek && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div className="form-group">
                        <label>สถานที่จัดส่ง</label>
                        <input type="text" name="deliverTo" value={formData.deliverTo} onChange={handleChange} className="form-control" />
                    </div>
                    <div className="form-group">
                        <label>ผู้ติดต่อ</label>
                        <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="form-control" />
                    </div>
                    <div className="form-group">
                        <label>เลขที่ใบสั่งซื้อ (P/O)</label>
                        <input type="text" name="purchaseNo" value={formData.purchaseNo} onChange={handleChange} className="form-control" />
                    </div>
                    <div className="form-group">
                        <label>เงื่อนไขการชำระเงิน</label>
                        <input type="text" name="termOfPayment" value={formData.termOfPayment} onChange={handleChange} className="form-control" />
                    </div>
                    <div className="form-group">
                        <label>วันครบกำหนดชำระ</label>
                        <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="form-control" />
                    </div>
                    <div className="form-group">
                        <label>พนักงานขาย</label>
                        <input type="text" name="salesperson" value={formData.salesperson} onChange={handleChange} className="form-control" />
                    </div>
                </div>
            )}

            <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#333', borderBottom: '2px solid #f37335', display: 'inline-block' }}>รายการสินค้า</h3>
            
            {formData.products.map((product, index) => (
                <div key={product.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #e0e0e0' }}>
                    <span style={{ fontWeight: 'bold', width: '20px' }}>{index + 1}.</span>
                    <div style={{ flex: 1 }}>
                        <input type="text" value={product.name} onChange={(e) => handleProductChange(product.id, 'name', e.target.value)} placeholder="พิมพ์ชื่อสินค้า..." list="product-suggestions" className="form-control" />
                        <datalist id="product-suggestions">
                            {PRODUCT_LIST.map(p => <option key={p} value={p} />)}
                        </datalist>
                    </div>
                    <div style={{ width: '80px' }}>
                        <input type="number" value={product.quantity} onChange={(e) => handleProductChange(product.id, 'quantity', e.target.value)} className="form-control" placeholder="จำนวน" />
                    </div>
                    <div style={{ width: '80px' }}>
                        <select value={product.unit} onChange={(e) => handleProductChange(product.id, 'unit', e.target.value)} className="form-control">
                            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    <div style={{ width: '120px' }}>
                        <input type="number" value={product.unitPrice} onChange={(e) => handleProductChange(product.id, 'unitPrice', e.target.value)} className="form-control" placeholder="ราคา/หน่วย" />
                    </div>
                    <div style={{ width: '120px', textAlign: 'right', fontWeight: 'bold' }}>
                        ฿{product.amount.toLocaleString('th-TH', {minimumFractionDigits: 2})}
                    </div>
                    <button onClick={() => removeProduct(product.id)} style={{ background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}

            <button onClick={addProduct} style={{ width: '100%', padding: '12px', background: 'transparent', border: '2px dashed #f37335', color: '#f37335', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', fontWeight: 'bold', marginBottom: '30px' }}>
                <Plus size={18} /> เพิ่มรายการสินค้า
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                    <div className="form-group">
                        <label>หมายเหตุ / เงื่อนไข</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} className="form-control" rows="4" placeholder="ระบุหมายเหตุ เช่น โอนเงินเข้าบัญชี..."></textarea>
                    </div>
                    <div className="form-group" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                            <input type="checkbox" name="showDiscountInPrint" checked={formData.showDiscountInPrint} onChange={handleChange} /> แสดงส่วนลดในบิล
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                            <input type="checkbox" name="showVatInPrint" checked={formData.showVatInPrint} onChange={handleChange} /> แสดง VAT ในบิล
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                            <input type="checkbox" name="showShippingInPrint" checked={formData.showShippingInPrint} onChange={handleChange} /> แสดงค่าจัดส่ง
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                            <input type="checkbox" name="showDesignFeeInPrint" checked={formData.showDesignFeeInPrint} onChange={handleChange} /> แสดงค่าออกแบบ
                        </label>
                    </div>
                </div>

                <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span>มูลค่าสินค้ารวม:</span>
                        <strong>฿{formData.subTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span>ส่วนลด (บาท):</span>
                        <input type="number" name="discount" value={formData.discount} onChange={handleChange} className="form-control" style={{ width: '120px', textAlign: 'right' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span>VAT:</span>
                        <select name="vatType" value={formData.vatType} onChange={handleChange} className="form-control" style={{ width: '120px' }}>
                            <option value="0">ไม่มี VAT</option>
                            <option value="7">VAT 7%</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span>ค่าจัดส่ง:</span>
                        <input type="number" name="shippingCost" value={formData.shippingCost} onChange={handleChange} className="form-control" style={{ width: '120px', textAlign: 'right' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px dashed #f37335', paddingBottom: '15px' }}>
                        <span>ค่าออกแบบ/อื่นๆ:</span>
                        <input type="number" name="designFee" value={formData.designFee} onChange={handleChange} className="form-control" style={{ width: '120px', textAlign: 'right' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '18px', color: '#d35400' }}>
                        <strong>ยอดรวมสุทธิ:</strong>
                        <strong>฿{formData.totalAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</strong>
                    </div>
                </div>
            </div>

            {isPrinting && <BillingPrintContainer formData={formData} />}
        </div>
    );
};

export default BillingForm;

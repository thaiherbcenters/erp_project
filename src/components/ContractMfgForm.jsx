import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './PowerOfAttorneyForm.css';

const safeJSONParse = (str, fallback = {}) => {
    try {
        if (!str) return fallback;
        if (typeof str === 'object') return str;
        if (str.startsWith('{')) return JSON.parse(str);
        return { ...fallback, raw: str };
    } catch (e) {
        return { ...fallback, raw: str };
    }
};

const NameInputWithTitle = ({ value, onChange, placeholder }) => {
    const titles = ['นาย', 'นางสาว', 'นาง'];
    
    const getParsed = (val) => {
        if (!val) return { title: '', name: '' };
        for (let t of titles) {
            if (val.startsWith(t)) {
                return { title: t, name: val.substring(t.length).trim() };
            }
        }
        return { title: '', name: val };
    };

    const parsed = getParsed(value);

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        onChange(newTitle + parsed.name);
    };

    const handleNameChange = (e) => {
        onChange(parsed.title + e.target.value);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', fontSize: '14px', color: '#334155' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'normal', margin: 0 }}>
                    <input type="radio" value="นาย" checked={parsed.title === 'นาย'} onChange={handleTitleChange} /> นาย
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'normal', margin: 0 }}>
                    <input type="radio" value="นาง" checked={parsed.title === 'นาง'} onChange={handleTitleChange} /> นาง
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'normal', margin: 0 }}>
                    <input type="radio" value="นางสาว" checked={parsed.title === 'นางสาว'} onChange={handleTitleChange} /> นางสาว
                </label>
            </div>
            <input 
                type="text" 
                value={parsed.name} 
                onChange={handleNameChange} 
                placeholder={placeholder} 
                style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
        </div>
    );
};

const ContractMfgForm = forwardRef(({ customerData, contractData, initialData = null, sharedData = {} }, ref) => {
    const [formData, setFormData] = useState({
        ContractNo: 'TEST-001/2567',
        WrittenAt: 'บริษัท ไทยเฮิร์บ จำกัด',
        DocumentDate: new Date().toISOString().split('T')[0],
        EmployerName: 'บจก. ลูกค้าทดสอบ',
        EmployerID: '0105555555555',
        EmployerRep: 'นายสมชาย รักษาดี',
        EmployerRepID: '1100000000000',
        EmployerAddress: initialData?.EmployerAddress ? safeJSONParse(initialData.EmployerAddress, { no: '123', moo: '1', soi: 'สุขุมวิท 1', road: 'สุขุมวิท', subDistrict: 'คลองเตย', district: 'คลองเตย', province: 'กรุงเทพมหานคร', zip: '10110' }) : { no: '123', moo: '1', soi: 'สุขุมวิท 1', road: 'สุขุมวิท', subDistrict: 'คลองเตย', district: 'คลองเตย', province: 'กรุงเทพมหานคร', zip: '10110' },
        EmployerRepAddress: initialData?.EmployerRepAddress ? safeJSONParse(initialData.EmployerRepAddress, { no: '99', moo: '9', soi: 'ลาดพร้าว 99', road: 'ลาดพร้าว', subDistrict: 'จอมพล', district: 'จตุจักร', province: 'กรุงเทพมหานคร', zip: '10900' }) : { no: '99', moo: '9', soi: 'ลาดพร้าว 99', road: 'ลาดพร้าว', subDistrict: 'จอมพล', district: 'จตุจักร', province: 'กรุงเทพมหานคร', zip: '10900' },
        ContractorName: 'นายธวัช จรุงพิรวงศ์',
        ContractorID: '3259900200422',
        ContractorRep: '',
        ContractorRepOf: 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์',
        ContractorLicense: 'HB 12-1-67-1',
        ContractorAddress: initialData?.ContractorAddress ? safeJSONParse(initialData.ContractorAddress, { no: '6/10', moo: '2', subDistrict: 'ไทรม้า', district: 'เมืองนนทบุรี', province: 'นนทบุรี', zip: '11000' }) : { no: '6/10', moo: '2', subDistrict: 'ไทรม้า', district: 'เมืองนนทบุรี', province: 'นนทบุรี', zip: '11000' },
        Witness1: 'นางสาวทดสอบ พยานที่หนึ่ง',
        Witness2: 'นางสาวขวัญอารักษ์ อนุภัทรเหมรัตน์',
        ProductsData: [
            { id: Date.now(), regNo: '10-1-6500012345', brandName: 'เฮิร์บไทย', productName: 'ยาดมสมุนไพร' },
            { id: Date.now() + 1, regNo: '10-1-6500054321', brandName: 'เฮิร์บไทย', productName: 'ยาหม่องสมุนไพร' }
        ],
        ...initialData
    });

    useEffect(() => {
        if (sharedData.writtenAt && !formData.WrittenAt) {
            handleChange('WrittenAt', sharedData.writtenAt);
        }
        if (sharedData.documentDate && !formData.DocumentDate) {
            handleChange('DocumentDate', sharedData.documentDate);
        }
    }, [sharedData.writtenAt, sharedData.documentDate]);

    useEffect(() => {
        if (!initialData) {
            if (customerData) {
                const customerAddress = customerData.Address || '';
                const customerTaxId = customerData.TaxID || customerData.IDCard || '';
                const customerName = customerData.CustomerName || '';
                
                setFormData(prev => ({
                    ...prev,
                    EmployerName: customerName,
                    EmployerID: customerTaxId,
                    EmployerAddress: { no: '', moo: '', soi: '', road: '', subDistrict: '', district: '', province: '', zip: '', raw: customerAddress },
                }));
            }
        }
    }, [customerData, initialData]);

    useImperativeHandle(ref, () => ({
        getFormData: () => {
            const dataToSave = { ...formData };
            dataToSave.EmployerAddress = typeof dataToSave.EmployerAddress === 'object' ? JSON.stringify(dataToSave.EmployerAddress) : dataToSave.EmployerAddress;
            dataToSave.ContractorAddress = typeof dataToSave.ContractorAddress === 'object' ? JSON.stringify(dataToSave.ContractorAddress) : dataToSave.ContractorAddress;
            dataToSave.EmployerRepAddress = typeof dataToSave.EmployerRepAddress === 'object' ? JSON.stringify(dataToSave.EmployerRepAddress) : dataToSave.EmployerRepAddress;
            return {
                type: 'contract_mfg',
                data: dataToSave
            };
        },
        setFormData: (newData) => {
            setFormData(prev => ({ ...prev, ...newData }));
        }
    }));

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNestedChange = (parentField, childField, value) => {
        setFormData(prev => ({
            ...prev,
            [parentField]: {
                ...prev[parentField],
                [childField]: value
            }
        }));
    };

    const handleProductChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            ProductsData: prev.ProductsData.map(p => p.id === id ? { ...p, [field]: value } : p)
        }));
    };

    const addProductRow = () => {
        if (formData.ProductsData.length >= 4) return;
        setFormData(prev => ({
            ...prev,
            ProductsData: [...prev.ProductsData, { id: Date.now(), regNo: '', brandName: '', productName: '' }]
        }));
    };

    const removeProductRow = (id) => {
        setFormData(prev => ({
            ...prev,
            ProductsData: prev.ProductsData.length > 1 ? prev.ProductsData.filter(p => p.id !== id) : prev.ProductsData
        }));
    };

    return (
        <div className={!initialData ? "poa-form-wrapper" : ""} style={!initialData ? { boxShadow: 'none' } : {}}>
            <h3 className="poa-section-title" style={{ marginTop: 0 }}>แบบฟอร์มสัญญาจ้างผลิตสินค้า</h3>
            
            <div className="poa-info-box gray" style={{ marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ marginTop: 0 }}>ข้อมูลเอกสาร</div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>เลขที่สัญญา</label>
                        <input
                            type="text"
                            value={formData.ContractNo || ''}
                            onChange={(e) => handleChange('ContractNo', e.target.value)}
                            placeholder="เช่น 001/2567"
                        />
                    </div>

                    <div className="poa-field medium">
                        <label>วันที่ทำสัญญา</label>
                        <input
                            type="date"
                            value={formData.DocumentDate ? formData.DocumentDate.split('T')[0] : ''}
                            onChange={(e) => handleChange('DocumentDate', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="poa-info-box" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ color: '#15803d', marginTop: 0 }}>ผู้รับจ้าง (Contractor)</div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>ชื่อผู้รับจ้าง</label>
                        <NameInputWithTitle
                            value={formData.ContractorName || ''}
                            onChange={(val) => handleChange('ContractorName', val)}
                            placeholder="ชื่อ-นามสกุล..."
                        />
                    </div>
                    <div className="poa-field">
                        <label>เลขประจำตัวประชาชน / นิติบุคคล</label>
                        <input
                            type="text"
                            value={formData.ContractorID || ''}
                            onChange={(e) => handleChange('ContractorID', e.target.value)}
                        />
                    </div>
                </div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>เป็นตัวแทน (ชื่อบุคคล/นิติบุคคล)</label>
                        <input
                            type="text"
                            value={formData.ContractorRepOf || ''}
                            onChange={(e) => handleChange('ContractorRepOf', e.target.value)}
                        />
                    </div>
                </div>
                <div className="poa-row">
                    <div className="poa-field full">
                        <label>ที่อยู่ผู้รับจ้าง</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            <input type="text" placeholder="สถานที่ เลขที่..." value={formData.ContractorAddress?.no || ''} onChange={(e) => handleNestedChange('ContractorAddress', 'no', e.target.value)} />
                            <input type="text" placeholder="หมู่ที่..." value={formData.ContractorAddress?.moo || ''} onChange={(e) => handleNestedChange('ContractorAddress', 'moo', e.target.value)} />
                            <input type="text" placeholder="ตำบล..." value={formData.ContractorAddress?.subDistrict || ''} onChange={(e) => handleNestedChange('ContractorAddress', 'subDistrict', e.target.value)} />
                            <input type="text" placeholder="อำเภอ..." value={formData.ContractorAddress?.district || ''} onChange={(e) => handleNestedChange('ContractorAddress', 'district', e.target.value)} />
                            <input type="text" placeholder="จังหวัด..." value={formData.ContractorAddress?.province || ''} onChange={(e) => handleNestedChange('ContractorAddress', 'province', e.target.value)} />
                            <input type="text" placeholder="รหัสไปรษณีย์..." value={formData.ContractorAddress?.zip || ''} onChange={(e) => handleNestedChange('ContractorAddress', 'zip', e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="poa-row">
                    <div className="poa-field full">
                        <label>เลขที่ใบอนุญาตผลิต</label>
                        <input
                            type="text"
                            value={formData.ContractorLicense || ''}
                            onChange={(e) => handleChange('ContractorLicense', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="poa-info-box" style={{ background: '#f0f9ff', borderColor: '#bae6fd', marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ color: '#0369a1', marginTop: 0 }}>ผู้ว่าจ้าง (Employer)</div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>ชื่อบุคคล / นิติบุคคล</label>
                        <input
                            type="text"
                            value={formData.EmployerName || ''}
                            onChange={(e) => handleChange('EmployerName', e.target.value)}
                        />
                    </div>
                    <div className="poa-field">
                        <label>เลขประจำตัวประชาชน / นิติบุคคล</label>
                        <input
                            type="text"
                            value={formData.EmployerID || ''}
                            onChange={(e) => handleChange('EmployerID', e.target.value)}
                        />
                    </div>
                </div>
                <div className="poa-row">
                    <div className="poa-field full">
                        <label>ที่อยู่ผู้ว่าจ้าง</label>
                        {formData.EmployerAddress?.raw ? (
                            <div style={{ marginBottom: '8px', fontSize: '13px', color: '#64748b' }}>ข้อมูลเดิม: {formData.EmployerAddress.raw}</div>
                        ) : null}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                            <input type="text" placeholder="สถานที่ เลขที่..." value={formData.EmployerAddress?.no || ''} onChange={(e) => handleNestedChange('EmployerAddress', 'no', e.target.value)} />
                            <input type="text" placeholder="หมู่ที่..." value={formData.EmployerAddress?.moo || ''} onChange={(e) => handleNestedChange('EmployerAddress', 'moo', e.target.value)} />
                            <input type="text" placeholder="ซอย..." value={formData.EmployerAddress?.soi || ''} onChange={(e) => handleNestedChange('EmployerAddress', 'soi', e.target.value)} />
                            <input type="text" placeholder="ถนน..." value={formData.EmployerAddress?.road || ''} onChange={(e) => handleNestedChange('EmployerAddress', 'road', e.target.value)} />
                            <input type="text" placeholder="แขวง/ตำบล..." value={formData.EmployerAddress?.subDistrict || ''} onChange={(e) => handleNestedChange('EmployerAddress', 'subDistrict', e.target.value)} />
                            <input type="text" placeholder="เขต/อำเภอ..." value={formData.EmployerAddress?.district || ''} onChange={(e) => handleNestedChange('EmployerAddress', 'district', e.target.value)} />
                            <input type="text" placeholder="จังหวัด..." value={formData.EmployerAddress?.province || ''} onChange={(e) => handleNestedChange('EmployerAddress', 'province', e.target.value)} />
                            <input type="text" placeholder="รหัสไปรษณีย์..." value={formData.EmployerAddress?.zip || ''} onChange={(e) => handleNestedChange('EmployerAddress', 'zip', e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>ตัวแทนผู้มีอำนาจลงนาม (ถ้ามี)</label>
                        <NameInputWithTitle
                            value={formData.EmployerRep || ''}
                            onChange={(val) => handleChange('EmployerRep', val)}
                            placeholder="ชื่อ-นามสกุล..."
                        />
                    </div>
                    <div className="poa-field">
                        <label>เลขบัตรประชาชนตัวแทน</label>
                        <input
                            type="text"
                            value={formData.EmployerRepID || ''}
                            onChange={(e) => handleChange('EmployerRepID', e.target.value)}
                        />
                    </div>
                </div>
                <div className="poa-row">
                    <div className="poa-field full">
                        <label>ที่อยู่ ตัวแทนผู้มีอำนาจลงนาม (ผู้ว่าจ้าง)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                            <input type="text" placeholder="สถานที่ เลขที่..." value={formData.EmployerRepAddress?.no || ''} onChange={(e) => handleNestedChange('EmployerRepAddress', 'no', e.target.value)} />
                            <input type="text" placeholder="หมู่ที่..." value={formData.EmployerRepAddress?.moo || ''} onChange={(e) => handleNestedChange('EmployerRepAddress', 'moo', e.target.value)} />
                            <input type="text" placeholder="ซอย..." value={formData.EmployerRepAddress?.soi || ''} onChange={(e) => handleNestedChange('EmployerRepAddress', 'soi', e.target.value)} />
                            <input type="text" placeholder="ถนน..." value={formData.EmployerRepAddress?.road || ''} onChange={(e) => handleNestedChange('EmployerRepAddress', 'road', e.target.value)} />
                            <input type="text" placeholder="แขวง/ตำบล..." value={formData.EmployerRepAddress?.subDistrict || ''} onChange={(e) => handleNestedChange('EmployerRepAddress', 'subDistrict', e.target.value)} />
                            <input type="text" placeholder="เขต/อำเภอ..." value={formData.EmployerRepAddress?.district || ''} onChange={(e) => handleNestedChange('EmployerRepAddress', 'district', e.target.value)} />
                            <input type="text" placeholder="จังหวัด..." value={formData.EmployerRepAddress?.province || ''} onChange={(e) => handleNestedChange('EmployerRepAddress', 'province', e.target.value)} />
                            <input type="text" placeholder="รหัสไปรษณีย์..." value={formData.EmployerRepAddress?.zip || ''} onChange={(e) => handleNestedChange('EmployerRepAddress', 'zip', e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* รายการสินค้าที่จ้างผลิต */}
            <div className="poa-info-box" style={{ background: '#fff', borderColor: '#e2e8f0', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div className="poa-section-subtitle" style={{ color: '#0f172a', margin: 0 }}>รายการสินค้าที่จ้างผลิต</div>
                    {formData.ProductsData && formData.ProductsData.length < 4 && (
                        <button 
                            type="button" 
                            onClick={addProductRow}
                            style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            + เพิ่มรายการ
                        </button>
                    )}
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '10px', textAlign: 'center', width: '60px', border: '1px solid #e2e8f0' }}>ลำดับ</th>
                                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0' }}>เลขที่ใบรับ / ใบจดแจ้ง</th>
                                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0' }}>ชื่อการค้า/ตราสินค้า</th>
                                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0' }}>ชื่อผลิตภัณฑ์</th>
                                <th style={{ padding: '10px', textAlign: 'center', width: '50px', border: '1px solid #e2e8f0' }}>ลบ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {formData.ProductsData && formData.ProductsData.map((item, index) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>{index + 1}</td>
                                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                                        <input 
                                            type="text" 
                                            value={item.regNo} 
                                            onChange={(e) => handleProductChange(item.id, 'regNo', e.target.value)}
                                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                                        <input 
                                            type="text" 
                                            value={item.brandName} 
                                            onChange={(e) => handleProductChange(item.id, 'brandName', e.target.value)}
                                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                                        <input 
                                            type="text" 
                                            value={item.productName} 
                                            onChange={(e) => handleProductChange(item.id, 'productName', e.target.value)}
                                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                        <button 
                                            type="button" 
                                            onClick={() => removeProductRow(item.id)}
                                            disabled={formData.ProductsData.length <= 1}
                                            style={{ padding: '4px', background: formData.ProductsData.length <= 1 ? '#e2e8f0' : '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: formData.ProductsData.length <= 1 ? 'not-allowed' : 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* การลงนาม */}
            <div className="poa-info-box gray" style={{ marginBottom: '20px' }}>
                <div className="poa-section-subtitle" style={{ marginTop: 0 }}>การลงนาม (ท้ายสัญญา)</div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>ลงชื่อ (ผู้ว่าจ้าง - ซ้ายบน)</label>
                        <input
                            type="text"
                            value={formData.EmployerRep || ''}
                            onChange={(e) => handleChange('EmployerRep', e.target.value)}
                            placeholder="ชื่อ-นามสกุล..."
                        />
                    </div>
                    <div className="poa-field">
                        <label>ลงชื่อ (ผู้รับจ้าง - ขวาบน)</label>
                        <input
                            type="text"
                            value={formData.ContractorName || ''}
                            onChange={(e) => handleChange('ContractorName', e.target.value)}
                            placeholder="ชื่อ-นามสกุล..."
                        />
                    </div>
                </div>
                <div className="poa-row">
                    <div className="poa-field">
                        <label>ลงชื่อ (ผู้ว่าจ้าง/พยาน - ซ้ายล่าง)</label>
                        <input
                            type="text"
                            value={formData.Witness1 || ''}
                            onChange={(e) => handleChange('Witness1', e.target.value)}
                            placeholder="ชื่อ-นามสกุล..."
                        />
                    </div>
                    <div className="poa-field">
                        <label>ลงชื่อ (พยาน - ขวาล่าง)</label>
                        <input
                            type="text"
                            value={formData.Witness2 || ''}
                            onChange={(e) => handleChange('Witness2', e.target.value)}
                            placeholder="ชื่อ-นามสกุล..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ContractMfgForm;

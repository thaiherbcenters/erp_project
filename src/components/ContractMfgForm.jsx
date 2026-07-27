import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import API_BASE from '../config';
import './PowerOfAttorneyForm.css';
import './PowerOfAttorneyForm.css';
import IdCardInput from './IdCardInput';
import CustomDatePicker from './CustomDatePicker';

const safeJSONParse = (str, fallback = {}) => {
    try {
        if (!str) return fallback;
        if (typeof str === 'object') return str;
        if (str.startsWith('{')) return JSON.parse(str);
        
        let no = '', moo = '', soi = '', road = '', subDistrict = '', district = '', province = '', zip = '';
        
        const zipMatch = str.match(/\d{5}/);
        if (zipMatch) zip = zipMatch[0];
        
        const provMatch = str.match(/(?:จ\.|จังหวัด)\s*([ก-๙]+)/);
        if (provMatch) province = provMatch[1];
        
        const distMatch = str.match(/(?:อ\.|เขต|อำเภอ)\s*([ก-๙]+)/);
        if (distMatch) district = distMatch[1];
        
        const subDistMatch = str.match(/(?:ต\.|แขวง|ตำบล)\s*([ก-๙]+)/);
        if (subDistMatch) subDistrict = subDistMatch[1];
        
        const roadMatch = str.match(/(?:ถ\.|ถนน)\s*([ก-๙0-9\-]+)/);
        if (roadMatch) road = roadMatch[1] === '-' ? '' : roadMatch[1];
        
        const soiMatch = str.match(/(?:ซ\.|ซอย)\s*([ก-๙0-9\-]+)/);
        if (soiMatch) soi = soiMatch[1] === '-' ? '' : soiMatch[1];
        
        const mooMatch = str.match(/(?:ม\.|หมู่|หมู่ที่)\s*([0-9\-]+)/);
        if (mooMatch) moo = mooMatch[1] === '-' ? '-' : mooMatch[1];
        
        const noMatch = str.match(/^([\d\/]+)/);
        if (noMatch) no = noMatch[1];
        
        if (no || subDistrict || province || district || zip) {
            return { 
                no: no || '-', 
                moo: moo || '-', 
                soi: soi || '-', 
                road: road || '-', 
                subDistrict: subDistrict || '-', 
                district: district || '-', 
                province: province || '-', 
                zip: zip || '-', 
                raw: str 
            };
        }
        
        return { ...fallback, raw: str };
    } catch (e) {
        return { ...fallback, raw: str };
    }
};

import NameInputWithTitle from './NameInputWithTitle';


const ContractMfgForm = forwardRef(({ documentId, customerData, contractData, initialData = null, sharedFormData = {}, onSharedDataChange }, ref) => {
    const [currentDocId, setCurrentDocId] = useState(documentId || null);
    const [formData, setFormData] = useState({
        ContractNo: '',
        WrittenAt: '',
        DocumentDate: new Date().toISOString().split('T')[0],
        EmployerName: '',
        EmployerID: '',
        EmployerRep: '',
        EmployerRepID: '',
        EmployerAddress: initialData?.EmployerAddress ? safeJSONParse(initialData.EmployerAddress, { no: '', moo: '', soi: '', road: '', subDistrict: '', district: '', province: '', zip: '' }) : { no: '', moo: '', soi: '', road: '', subDistrict: '', district: '', province: '', zip: '' },
        EmployerRepAddress: initialData?.EmployerRepAddress ? safeJSONParse(initialData.EmployerRepAddress, { no: '', moo: '9', soi: '', road: '', subDistrict: '', district: '', province: '', zip: '' }) : { no: '', moo: '', soi: '', road: '', subDistrict: '', district: '', province: '', zip: '' },
        ContractorName: 'นายธวัช จรุงพิรวงศ์',
        ContractorID: '3259900200422',
        ContractorRep: '',
        ContractorRepOf: 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์',
        ContractorLicense: 'HB 12-1-67-1',
        ContractorAddress: initialData?.ContractorAddress ? safeJSONParse(initialData.ContractorAddress, { no: '6/10', moo: '2', subDistrict: 'ไทรม้า', district: 'เมืองนนทบุรี', province: 'นนทบุรี', zip: '11000' }) : { no: '6/10', moo: '2', subDistrict: 'ไทรม้า', district: 'เมืองนนทบุรี', province: 'นนทบุรี', zip: '11000' },
        Witness1: '',
        Witness2: 'นางสาวขวัญอารักษ์ อนุภัทรเหมรัตน์',
        ProductsData: [
            { id: Date.now(), regNo: '', brandName: '', productName: '' }
        ],
        ...initialData
    });

    // Fetch saved data when editing
    useEffect(() => {
        if (!documentId) return;
        setCurrentDocId(documentId);
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_BASE}/contract-mfg-documents/${documentId}`);
                const json = await res.json();
                if (json.success && json.data) {
                    const d = json.data;
                    setFormData(prev => ({
                        ...prev,
                        ContractNo: d.ContractNo || prev.ContractNo,
                        WrittenAt: d.WrittenAt || prev.WrittenAt,
                        DocumentDate: d.DocumentDate ? new Date(d.DocumentDate).toISOString().split('T')[0] : prev.DocumentDate,
                        EmployerName: d.EmployerName || prev.EmployerName,
                        EmployerID: d.EmployerID || prev.EmployerID,
                        EmployerRep: d.EmployerRep || prev.EmployerRep,
                        EmployerRepID: d.EmployerRepID || prev.EmployerRepID,
                        EmployerAddress: d.EmployerAddress ? safeJSONParse(d.EmployerAddress, prev.EmployerAddress) : prev.EmployerAddress,
                        EmployerRepAddress: d.EmployerRepAddress ? safeJSONParse(d.EmployerRepAddress, prev.EmployerRepAddress) : prev.EmployerRepAddress,
                        ContractorName: d.ContractorName || prev.ContractorName,
                        ContractorID: d.ContractorID || prev.ContractorID,
                        ContractorRep: d.ContractorRep || prev.ContractorRep,
                        ContractorRepOf: d.ContractorRepOf || prev.ContractorRepOf,
                        ContractorLicense: d.ContractorLicense || prev.ContractorLicense,
                        ContractorAddress: d.ContractorAddress ? safeJSONParse(d.ContractorAddress, prev.ContractorAddress) : prev.ContractorAddress,
                        Witness1: d.Witness1 || prev.Witness1,
                        Witness2: d.Witness2 || prev.Witness2,
                        ProductsData: d.ProductsData ? (typeof d.ProductsData === 'string' ? JSON.parse(d.ProductsData) : d.ProductsData) : prev.ProductsData,
                    }));
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };
        fetchData();
    }, [documentId]);

    useEffect(() => {
        if (sharedFormData.writtenAt && !formData.WrittenAt) {
            handleChange('WrittenAt', sharedFormData.writtenAt);
        }
        if (sharedFormData.documentDate && !formData.DocumentDate) {
            handleChange('DocumentDate', sharedFormData.documentDate);
        }
    }, [sharedFormData.writtenAt, sharedFormData.documentDate]);

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
                    EmployerAddress: safeJSONParse(customerAddress, { no: '', moo: '', soi: '', road: '', subDistrict: '', district: '', province: '', zip: '', raw: customerAddress }),
                }));
            }
        }
    }, [customerData, initialData]);

    useImperativeHandle(ref, () => ({
        getFormData: () => {
            const dataToSave = { ...formData };
            if (currentDocId) dataToSave.documentId = currentDocId;
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
        setFormData(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'EmployerRep') {
                next.Witness1 = value;
            }
            return next;
        });
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
        setFormData(prev => {
            const newProducts = prev.ProductsData.map(p => p.id === id ? { ...p, [field]: value } : p);
            
            // Sync product name to shared form data if it's the first product and onSharedDataChange is provided
            if (field === 'productName' && newProducts.length > 0 && newProducts[0].id === id && onSharedDataChange) {
                onSharedDataChange({ productName: value });
            }
            
            return {
                ...prev,
                ProductsData: newProducts
            };
        });
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
        <div className="poa-form-wrapper" style={!initialData ? { boxShadow: 'none' } : {}}>
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
                        <CustomDatePicker
                            name="DocumentDate"
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
                        <IdCardInput
                            value={formData.ContractorID || ''}
                            onChange={(val) => handleChange('ContractorID', val)}
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
                        <IdCardInput
                            value={formData.EmployerID || ''}
                            onChange={(val) => handleChange('EmployerID', val)}
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
                        <IdCardInput
                            value={formData.EmployerRepID || ''}
                            onChange={(val) => handleChange('EmployerRepID', val)}
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
                            value={formData.EmployerName || ''}
                            onChange={(e) => handleChange('EmployerName', e.target.value)}
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



/**
 * =============================================================================
 * ThaiAddressInputGroup.jsx — คอมโพเนนต์กลุ่มช่องกรอก ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์
 * พร้อมระบบ Autocomplete ภาษาไทยอัจฉริยะ (Smart Thai Address Autocomplete)
 * =============================================================================
 */

import React, { useState } from 'react';
import { searchThaiAddress } from '../utils/thaiAddress';

export default function ThaiAddressInputGroup({
    formData,
    setFormData,
    onChange,
    fieldNames = {
        subDistrict: 'addr_subdistrict',
        district: 'addr_district',
        province: 'addr_province',
        zipCode: 'addr_zip'
    },
    required = true,
    rowMarginBottom = '14px'
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [activeField, setActiveField] = useState(null);

    const subDistrictName = fieldNames.subDistrict || 'addr_subdistrict';
    const districtName = fieldNames.district || 'addr_district';
    const provinceName = fieldNames.province || 'addr_province';
    const zipCodeName = fieldNames.zipCode || 'addr_zip';

    const handleInputChange = (fieldName, searchType, val) => {
        if (onChange) {
            onChange({ target: { name: fieldName, value: val } });
        } else if (setFormData) {
            setFormData(prev => ({ ...prev, [fieldName]: val }));
        }

        if (val && val.trim().length >= 2) {
            const res = searchThaiAddress(searchType, val, 40);
            setSuggestions(res);
            setActiveField(searchType);
        } else {
            setSuggestions([]);
            setActiveField(null);
        }
    };

    const handleSelect = (item) => {
        if (setFormData) {
            setFormData(prev => ({
                ...prev,
                [subDistrictName]: item.district || '',
                [districtName]: item.amphoe || '',
                [provinceName]: item.province || '',
                [zipCodeName]: item.zipcode || ''
            }));
        } else if (onChange) {
            onChange({ target: { name: subDistrictName, value: item.district || '' } });
            onChange({ target: { name: districtName, value: item.amphoe || '' } });
            onChange({ target: { name: provinceName, value: item.province || '' } });
            onChange({ target: { name: zipCodeName, value: item.zipcode || '' } });
        }
        setSuggestions([]);
        setActiveField(null);
    };

    const renderDropdown = (currentSearchType, currentVal) => {
        if (activeField !== currentSearchType) return null;
        if (!currentVal || currentVal.trim().length < 2) return null;

        return (
            <ul
                onMouseDown={(e) => e.preventDefault()}
                style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    width: '100%',
                    minWidth: '280px',
                    maxHeight: '240px',
                    overflowY: 'auto',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    zIndex: 1000,
                    margin: 0,
                    padding: '4px',
                    listStyle: 'none',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                }}
            >
                {suggestions.length > 0 ? (
                    suggestions.map((item, i) => (
                        <li
                            key={i}
                            onClick={() => handleSelect(item)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                marginBottom: '2px',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>
                                ต.{item.district} อ.{item.amphoe}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>จ.{item.province}</span>
                                <span style={{
                                    background: '#e2e8f0',
                                    color: '#334155',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 500,
                                    fontSize: '11px'
                                }}>
                                    {item.zipcode}
                                </span>
                            </div>
                        </li>
                    ))
                ) : (
                    <li style={{ padding: '12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                        ไม่พบที่อยู่ที่ตรงกับ "{currentVal}"
                    </li>
                )}
            </ul>
        );
    };

    return (
        <>
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: rowMarginBottom }}>
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>ตำบล/แขวง</div>
                    <input
                        type="text"
                        name={subDistrictName}
                        placeholder="พิมพ์ตำบล หรือแขวง"
                        value={formData[subDistrictName] || ''}
                        onChange={(e) => handleInputChange(subDistrictName, 'subDistrict', e.target.value)}
                        onFocus={() => {
                            if (formData[subDistrictName]?.trim().length >= 2) {
                                handleInputChange(subDistrictName, 'subDistrict', formData[subDistrictName]);
                            }
                        }}
                        onBlur={() => setTimeout(() => setActiveField(null), 250)}
                        required={required}
                    />
                    {renderDropdown('subDistrict', formData[subDistrictName])}
                </div>
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>อำเภอ/เขต</div>
                    <input
                        type="text"
                        name={districtName}
                        placeholder="พิมพ์อำเภอ หรือเขต"
                        value={formData[districtName] || ''}
                        onChange={(e) => handleInputChange(districtName, 'district', e.target.value)}
                        onFocus={() => {
                            if (formData[districtName]?.trim().length >= 2) {
                                handleInputChange(districtName, 'district', formData[districtName]);
                            }
                        }}
                        onBlur={() => setTimeout(() => setActiveField(null), 250)}
                        required={required}
                    />
                    {renderDropdown('district', formData[districtName])}
                </div>
            </div>

            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>จังหวัด</div>
                    <input
                        type="text"
                        name={provinceName}
                        placeholder="พิมพ์จังหวัด"
                        value={formData[provinceName] || ''}
                        onChange={(e) => handleInputChange(provinceName, 'province', e.target.value)}
                        onFocus={() => {
                            if (formData[provinceName]?.trim().length >= 2) {
                                handleInputChange(provinceName, 'province', formData[provinceName]);
                            }
                        }}
                        onBlur={() => setTimeout(() => setActiveField(null), 250)}
                        required={required}
                    />
                    {renderDropdown('province', formData[provinceName])}
                </div>
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>รหัสไปรษณีย์</div>
                    <input
                        type="text"
                        name={zipCodeName}
                        placeholder="เช่น 10110, 47110"
                        maxLength={5}
                        value={formData[zipCodeName] || ''}
                        onChange={(e) => handleInputChange(zipCodeName, 'zipCode', e.target.value)}
                        onFocus={() => {
                            if (formData[zipCodeName]?.trim().length >= 2) {
                                handleInputChange(zipCodeName, 'zipCode', formData[zipCodeName]);
                            }
                        }}
                        onBlur={() => setTimeout(() => setActiveField(null), 250)}
                        required={required}
                    />
                    {renderDropdown('zipCode', formData[zipCodeName])}
                </div>
            </div>
        </>
    );
}

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const DEFAULT_OPTIONS = [
    'ชำระเต็มจำนวน',
    'มัดจำ 50%',
    'มัดจำ 50% ส่วนที่เหลือวันรับสินค้า',
    'เครดิต 30 วัน',
    'เครดิต 15 วัน',
    'เครดิต 7 วัน',
    'เงินสด'
];

export default function CreditTermsInput({
    value = '',
    onChange,
    name = 'fdaCreditTerms',
    placeholder = 'ชำระเต็มจำนวน',
    disabled = false,
    style = {}
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectOption = (opt) => {
        if (onChange) {
            onChange({ target: { name, value: opt } });
        }
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                    type="text"
                    name={name}
                    value={value}
                    placeholder={placeholder}
                    disabled={disabled}
                    onChange={onChange}
                    style={{
                        width: '100%',
                        padding: '9px 36px 9px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: disabled ? '#f1f5f9' : '#ffffff',
                        color: '#1e293b',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = '#3b82f6';
                        e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.15)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = '#cbd5e1';
                        e.target.style.boxShadow = 'none';
                    }}
                />
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsOpen(prev => !prev)}
                    title="เลือกเงื่อนไขการชำระเงิน"
                    style={{
                        position: 'absolute',
                        right: '4px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        borderRadius: '6px',
                        transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (!disabled) e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </button>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    zIndex: 50,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '4px 0'
                }}>
                    <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>
                        เลือกเงื่อนไข หรือพิมพ์เองในช่องได้ทันที:
                    </div>
                    {DEFAULT_OPTIONS.map((opt) => {
                        const isSelected = value === opt;
                        return (
                            <div
                                key={opt}
                                onClick={() => handleSelectOption(opt)}
                                style={{
                                    padding: '8px 12px',
                                    fontSize: '13.5px',
                                    color: isSelected ? '#1d4ed8' : '#334155',
                                    backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                    fontWeight: isSelected ? '600' : 'normal',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'background-color 0.15s'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <span>{opt}</span>
                                {isSelected && <Check size={16} color="#2563eb" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

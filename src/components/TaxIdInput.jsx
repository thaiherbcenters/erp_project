import React, { useRef, useState, useEffect } from 'react';

const TaxIdInput = ({ value = '', onChange, name = 'taxId' }) => {
    const [digits, setDigits] = useState(Array(13).fill(''));
    const inputRefs = useRef([]);

    useEffect(() => {
        const valStr = (value || '').replace(/\D/g, '').substring(0, 13);
        const newDigits = Array(13).fill('');
        for (let i = 0; i < valStr.length; i++) {
            newDigits[i] = valStr[i];
        }
        setDigits(newDigits);
    }, [value]);

    const triggerChange = (newDigits) => {
        const joined = newDigits.join('');
        if (onChange) {
            onChange({
                target: {
                    name,
                    value: joined
                }
            });
        }
    };

    const handleChange = (index, e) => {
        const val = e.target.value.replace(/\D/g, '');
        if (val) {
            if (val.length > 1) {
                const chars = val.split('').slice(0, 13 - index);
                const newDigits = [...digits];
                for (let i = 0; i < chars.length; i++) {
                    newDigits[index + i] = chars[i];
                }
                setDigits(newDigits);
                triggerChange(newDigits);
                const nextIndex = Math.min(12, index + chars.length);
                inputRefs.current[nextIndex]?.focus();
                return;
            }
            
            const newDigits = [...digits];
            newDigits[index] = val.charAt(val.length - 1);
            setDigits(newDigits);
            triggerChange(newDigits);
            
            if (index < 12) {
                inputRefs.current[index + 1]?.focus();
            }
        } else {
            const newDigits = [...digits];
            newDigits[index] = '';
            setDigits(newDigits);
            triggerChange(newDigits);
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 12) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 13);
        if (pasted) {
            const newDigits = Array(13).fill('');
            for (let i = 0; i < pasted.length; i++) {
                newDigits[i] = pasted[i];
            }
            setDigits(newDigits);
            triggerChange(newDigits);
            const focusIndex = Math.min(12, pasted.length);
            inputRefs.current[focusIndex]?.focus();
        }
    };

    const inputStyle = {
        width: '26px',
        height: '34px',
        textAlign: 'center',
        padding: '0',
        borderRadius: '6px',
        border: '1px solid #cbd5e1',
        fontSize: '14px',
        fontFamily: 'inherit',
        background: '#f8fafc',
        transition: 'all 0.2s',
        color: '#1e293b'
    };

    const dashStyle = {
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        padding: '0 2px'
    };

    const renderInput = (index) => (
        <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            value={digits[index]}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            style={inputStyle}
            onFocus={(e) => e.target.select()}
            className="taxid-box"
        />
    );

    return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {renderInput(0)}
            <span style={dashStyle}>-</span>
            {renderInput(1)}{renderInput(2)}{renderInput(3)}{renderInput(4)}
            <span style={dashStyle}>-</span>
            {renderInput(5)}{renderInput(6)}{renderInput(7)}{renderInput(8)}{renderInput(9)}
            <span style={dashStyle}>-</span>
            {renderInput(10)}{renderInput(11)}
            <span style={dashStyle}>-</span>
            {renderInput(12)}
            <style>{`
                .taxid-box:focus {
                    outline: none;
                    border-color: #4f46e5 !important;
                    background: #ffffff !important;
                    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1) !important;
                }
            `}</style>
        </div>
    );
};

export default TaxIdInput;

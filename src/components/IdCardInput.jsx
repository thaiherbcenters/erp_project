import React, { useRef } from 'react';

const IdCardInput = ({ value = '', onChange, disabled = false }) => {
    const inputRefs = useRef([]);
    
    // Ensure value is only digits and up to 13 characters
    const digitsOnly = (value || '').replace(/\D/g, '').slice(0, 13);
    
    // Create an array of 13 characters (padded with empty strings)
    const chars = digitsOnly.padEnd(13, ' ').split('').map(c => c === ' ' ? '' : c);

    const handleChange = (index, e) => {
        const val = e.target.value.replace(/\D/g, '');
        if (!val) {
            // Deleting
            const newChars = [...chars];
            newChars[index] = '';
            onChange(newChars.join(''));
            return;
        }

        // Typing a character
        const char = val[val.length - 1]; // take the last typed char
        const newChars = [...chars];
        newChars[index] = char;
        onChange(newChars.join(''));

        // Move to next input if not the last one
        if (index < 12) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !chars[index] && index > 0) {
            // If current is empty and we press backspace, focus the previous one
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 12) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 13);
        if (pastedData) {
            // If pasted data is less than 13, it will just replace the prefix
            // Better to just set the whole string
            onChange(pastedData);
            // Focus the next empty box or the last box
            const nextFocusIndex = Math.min(pastedData.length, 12);
            setTimeout(() => {
                inputRefs.current[nextFocusIndex]?.focus();
            }, 0);
        }
    };

    // Format: X - XXXX - XXXXX - XX - X
    // Indices:
    // Group 1: 0
    // Group 2: 1, 2, 3, 4
    // Group 3: 5, 6, 7, 8, 9
    // Group 4: 10, 11
    // Group 5: 12

    const renderBox = (index) => (
        <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            value={chars[index] || ''}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={disabled}
            maxLength={2} // Allow 2 so we can catch the newly typed char when one is already there
            style={{
                width: '24px',
                height: '32px',
                textAlign: 'center',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                background: disabled ? '#f8fafc' : '#ffffff',
                color: '#334155',
                padding: '0'
            }}
            onFocus={(e) => e.target.select()}
        />
    );

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap', width: '100%' }}>
            {renderBox(0)}
            <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>-</span>
            <div style={{ display: 'flex', gap: '2px' }}>
                {[1, 2, 3, 4].map(renderBox)}
            </div>
            <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>-</span>
            <div style={{ display: 'flex', gap: '2px' }}>
                {[5, 6, 7, 8, 9].map(renderBox)}
            </div>
            <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>-</span>
            <div style={{ display: 'flex', gap: '2px' }}>
                {[10, 11].map(renderBox)}
            </div>
            <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>-</span>
            {renderBox(12)}
        </div>
    );
};

export default IdCardInput;

import React, { useState, useRef, useEffect, Children } from 'react';

const CustomSelect = ({ value, onChange, name, className, style = {}, children, disabled, required }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Extract options from children (<option> tags)
    // If a child is an array or fragment, Children.toArray flattens it
    const options = Children.toArray(children)
        .filter(child => child.type === 'option')
        .map(child => ({
            value: child.props.value,
            label: child.props.children,
            disabled: child.props.disabled
        }));

    // Find the currently selected option, or default to the first one, or a placeholder
    const selectedOption = options.find(opt => String(opt.value) === String(value)) || options[0] || { label: 'Select...' };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (optionValue) => {
        if (onChange) {
            onChange({ target: { name, value: optionValue } });
        }
        setIsOpen(false);
    };

    // Extract layout styles for the container, and visual styles for the trigger
    const { width, flex, margin, marginTop, marginBottom, marginLeft, marginRight, display, ...visualStyles } = style || {};
    const containerStyle = { position: 'relative', width: width || (flex ? 'auto' : '100%'), flex, margin, marginTop, marginBottom, marginLeft, marginRight, display: display || 'inline-block' };
    
    // Check if visualStyles is empty to apply default padding/border, otherwise use provided styles
    const hasVisualStyles = Object.keys(visualStyles).length > 0 && (visualStyles.padding || visualStyles.border || visualStyles.background);

    return (
        <div ref={containerRef} className={`custom-select-container ${className || ''}`} style={containerStyle}>
            <div 
                className={`custom-select-trigger ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: hasVisualStyles && visualStyles.padding ? visualStyles.padding : '8px 12px',
                    border: hasVisualStyles && visualStyles.border ? visualStyles.border : '1px solid #cbd5e1',
                    borderRadius: hasVisualStyles && visualStyles.borderRadius ? visualStyles.borderRadius : '8px',
                    background: disabled ? '#f1f5f9' : (hasVisualStyles && visualStyles.background ? visualStyles.background : '#fff'),
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    minHeight: '38px',
                    fontSize: hasVisualStyles && visualStyles.fontSize ? visualStyles.fontSize : '14px',
                    color: hasVisualStyles && visualStyles.color ? visualStyles.color : '#334155',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s',
                    ...visualStyles
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '10px' }}>
                    {selectedOption.label}
                </span>
                <span style={{ 
                    fontSize: '10px', 
                    color: '#94a3b8', 
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                    transition: 'transform 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    ▼
                </span>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '6px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 9999,
                    maxHeight: '250px',
                    overflowY: 'auto',
                    padding: '4px',
                    minWidth: '150px' // Ensure dropdown doesn't get too narrow for small selects
                }}>
                    {options.map((opt, idx) => (
                        <div
                            key={idx}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                if (!opt.disabled) handleSelect(opt.value);
                            }}
                            onMouseEnter={(e) => {
                                if (!opt.disabled) {
                                    e.currentTarget.style.backgroundColor = '#f8fafc';
                                    e.currentTarget.style.color = '#4f46e5';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!opt.disabled) {
                                    e.currentTarget.style.backgroundColor = String(opt.value) === String(value) ? '#e0e7ff' : '#fff';
                                    e.currentTarget.style.color = String(opt.value) === String(value) ? '#4338ca' : '#475569';
                                }
                            }}
                            style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                cursor: opt.disabled ? 'not-allowed' : 'pointer',
                                borderRadius: '6px',
                                color: String(opt.value) === String(value) ? '#4338ca' : (opt.disabled ? '#94a3b8' : '#475569'),
                                backgroundColor: String(opt.value) === String(value) ? '#e0e7ff' : '#fff',
                                fontWeight: String(opt.value) === String(value) ? '600' : '400',
                                transition: 'all 0.15s ease',
                                marginBottom: '2px',
                                opacity: opt.disabled ? 0.6 : 1
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
            
            {/* Hidden select for form submission/validation compatibility */}
            <select
                name={name}
                value={value}
                onChange={() => {}}
                disabled={disabled}
                style={{ opacity: 0, position: 'absolute', width: 0, height: 0, zIndex: -1 }}
                required={required}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
};

export default CustomSelect;

import React, { useState, useRef, useEffect, Children } from 'react';
import { createPortal } from 'react-dom';

const CustomSelect = ({ 
    value, 
    onChange, 
    name, 
    className, 
    style = {}, 
    children, 
    disabled, 
    required, 
    usePortal = false,
    typeable = false,
    searchable = false,
    clearable = false,
    placeholder = 'เลือก...'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [portalStyle, setPortalStyle] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef(null);
    const portalRef = useRef(null);
    const inputRef = useRef(null);

    // Extract options from children (<option> tags)
    const options = Children.toArray(children)
        .filter(child => child && child.type === 'option')
        .map(child => ({
            value: child.props.value !== undefined ? child.props.value : child.props.children,
            label: child.props.children,
            disabled: child.props.disabled
        }));

    // Find the currently selected option, or custom typed value, or default to first one / placeholder
    const selectedOption = options.find(opt => String(opt.value) === String(value)) || 
        (typeable && value ? { value, label: value } : (options.find(opt => opt.value === '' || opt.value === undefined) || options[0] || { label: placeholder, value: '' }));

    // Reset highlighted index when search query or open state changes
    useEffect(() => {
        setHighlightedIndex(0);
    }, [searchQuery, isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                if (portalRef.current && portalRef.current.contains(event.target)) {
                    return;
                }
                setIsOpen(false);
                setIsFocused(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            if (usePortal && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const neededHeight = Math.min(options.length * 36 + 10, 220);
                const openUpwards = spaceBelow < neededHeight && rect.top > neededHeight;
                const dropdownWidth = Math.max(rect.width, 120);
                const maxLeft = Math.max(10, window.innerWidth - dropdownWidth - 16);
                const left = Math.min(Math.max(10, rect.left), maxLeft);
                
                setPortalStyle({
                    top: openUpwards ? 'auto' : (rect.bottom + 4) + 'px',
                    bottom: openUpwards ? (window.innerHeight - rect.top + 4) + 'px' : 'auto',
                    left: left + 'px',
                    width: dropdownWidth + 'px'
                });
            }
            document.addEventListener('mousedown', handleClickOutside);
            
            // Optional: Close on scroll when using portal to prevent floating
            const handleScroll = (e) => {
                if (usePortal) {
                    if (portalRef.current && (portalRef.current === e.target || portalRef.current.contains(e.target))) {
                        return;
                    }
                    setIsOpen(false);
                    setIsFocused(false);
                    setSearchQuery('');
                }
            };
            if (usePortal) window.addEventListener('scroll', handleScroll, true);
            
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                if (usePortal) window.removeEventListener('scroll', handleScroll, true);
            };
        }
    }, [isOpen, usePortal, options.length]);

    const handleSelect = (optionValue) => {
        setSearchQuery('');
        setIsFocused(false);
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

    // Filter options when typeable or searchable and user is typing
    const displayedOptions = (typeable || searchable) && searchQuery.trim()
        ? options.filter(opt => String(opt.label || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))
        : options;

    const isClearable = (clearable || searchable) && Boolean(value) && String(value) !== '';

    return (
        <div ref={containerRef} className={`custom-select-container ${className || ''}`} style={containerStyle}>
            <div 
                className={`custom-select-trigger ${disabled ? 'disabled' : ''}`}
                onClick={() => {
                    if (disabled) return;
                    if ((typeable || searchable) && inputRef.current) {
                        inputRef.current.focus();
                    }
                    if (!typeable && !searchable) {
                        setIsOpen(!isOpen);
                    }
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: hasVisualStyles && visualStyles.padding ? visualStyles.padding : '8px 12px',
                    border: hasVisualStyles && visualStyles.border ? visualStyles.border : '1px solid #cbd5e1',
                    borderRadius: hasVisualStyles && visualStyles.borderRadius ? visualStyles.borderRadius : '8px',
                    background: disabled ? '#f1f5f9' : (hasVisualStyles && visualStyles.background ? visualStyles.background : '#fff'),
                    cursor: disabled ? 'not-allowed' : (searchable ? 'text' : typeable ? 'text' : 'pointer'),
                    minHeight: '38px',
                    fontSize: hasVisualStyles && visualStyles.fontSize ? visualStyles.fontSize : '14px',
                    color: hasVisualStyles && visualStyles.color ? visualStyles.color : '#334155',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s',
                    ...visualStyles
                }}
            >
                {searchable ? (
                    <input
                        ref={inputRef}
                        type="text"
                        disabled={disabled}
                        placeholder={selectedOption && selectedOption.value !== '' ? selectedOption.label : placeholder}
                        value={isFocused ? searchQuery : (selectedOption ? selectedOption.label : '')}
                        onFocus={() => {
                            if (!disabled) {
                                setIsFocused(true);
                                setIsOpen(true);
                                setSearchQuery('');
                                setHighlightedIndex(0);
                            }
                        }}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSearchQuery(val);
                            setHighlightedIndex(0);
                            if (!isOpen) setIsOpen(true);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                if (!isOpen) {
                                    setIsOpen(true);
                                } else {
                                    setHighlightedIndex(prev => (prev < displayedOptions.length - 1 ? prev + 1 : 0));
                                }
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (isOpen) {
                                    setHighlightedIndex(prev => (prev > 0 ? prev - 1 : displayedOptions.length - 1));
                                }
                            } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (isOpen && displayedOptions.length > 0) {
                                    const chosen = displayedOptions[highlightedIndex] || displayedOptions[0];
                                    if (chosen && !chosen.disabled) {
                                        handleSelect(chosen.value);
                                    }
                                } else {
                                    setIsOpen(true);
                                }
                            } else if (e.key === 'Escape') {
                                setIsOpen(false);
                                setIsFocused(false);
                                setSearchQuery('');
                                if (inputRef.current) inputRef.current.blur();
                            }
                        }}
                        style={{
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            width: '100%',
                            minWidth: 0,
                            padding: 0,
                            fontSize: 'inherit',
                            color: 'inherit',
                            fontFamily: 'inherit',
                            cursor: disabled ? 'not-allowed' : 'text',
                            textOverflow: 'ellipsis'
                        }}
                    />
                ) : typeable ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={isFocused ? searchQuery : (value || '')}
                        placeholder={placeholder}
                        disabled={disabled}
                        onFocus={() => {
                            if (!disabled) {
                                setIsFocused(true);
                                setSearchQuery(value || '');
                                setIsOpen(true);
                            }
                        }}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSearchQuery(val);
                            if (!isOpen) setIsOpen(true);
                            if (onChange) onChange({ target: { name, value: val } });
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setIsOpen(false);
                                setIsFocused(false);
                            }
                        }}
                        style={{
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            width: '100%',
                            minWidth: 0,
                            padding: 0,
                            fontSize: 'inherit',
                            color: 'inherit',
                            fontFamily: 'inherit',
                            cursor: disabled ? 'not-allowed' : 'text'
                        }}
                    />
                ) : (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '10px' }}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '6px' }}>
                    {isClearable && !disabled && (
                        <span
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSelect('');
                            }}
                            title="ล้างค่าที่เลือก"
                            style={{
                                fontSize: '11px',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '2px 5px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                lineHeight: 1,
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ef4444';
                                e.currentTarget.style.backgroundColor = '#fee2e2';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#94a3b8';
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            ✕
                        </span>
                    )}
                    <span 
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!disabled) {
                                if (isOpen) {
                                    setIsOpen(false);
                                    setIsFocused(false);
                                    setSearchQuery('');
                                    if (inputRef.current) inputRef.current.blur();
                                } else {
                                    setIsOpen(true);
                                    if ((typeable || searchable) && inputRef.current) {
                                        inputRef.current.focus();
                                    }
                                }
                            }
                        }}
                        style={{ 
                            fontSize: '10px', 
                            color: '#94a3b8', 
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                            transition: 'transform 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            padding: '2px 4px'
                        }}
                    >
                        ▼
                    </span>
                </div>
            </div>

            {isOpen && (usePortal ? createPortal(
                <div 
                    ref={portalRef}
                    style={{
                    position: 'fixed',
                    top: portalStyle.top,
                    bottom: portalStyle.bottom,
                    left: portalStyle.left,
                    width: portalStyle.width,
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 999999,
                    maxHeight: '240px',
                    overflowY: 'auto',
                    padding: '4px',
                    minWidth: '120px'
                }}
                onMouseDown={(e) => e.stopPropagation()}
                >
                    {displayedOptions.length > 0 ? (
                        displayedOptions.map((opt, idx) => {
                            const isSelected = String(opt.value) === String(value);
                            const isHighlighted = idx === highlightedIndex;
                            return (
                                <div
                                    key={idx}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!opt.disabled) handleSelect(opt.value);
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!opt.disabled) {
                                            setHighlightedIndex(idx);
                                        }
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: '13px',
                                        cursor: opt.disabled ? 'not-allowed' : 'pointer',
                                        borderRadius: '6px',
                                        color: isSelected ? '#15803d' : (opt.disabled ? '#94a3b8' : isHighlighted ? '#15803d' : '#475569'),
                                        backgroundColor: isSelected ? '#dcfce7' : (isHighlighted ? '#f8fafc' : '#fff'),
                                        fontWeight: isSelected ? '600' : '400',
                                        transition: 'all 0.15s ease',
                                        marginBottom: '2px',
                                        opacity: opt.disabled ? 0.6 : 1
                                    }}
                                >
                                    {opt.label}
                                </div>
                            );
                        })
                    ) : (
                        typeable ? (
                            <div 
                                style={{ 
                                    padding: '8px 12px', 
                                    fontSize: '13px', 
                                    color: '#16a34a',
                                    cursor: 'pointer',
                                    borderRadius: '6px',
                                    backgroundColor: '#f0fdf4',
                                    fontWeight: 500
                                }}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelect(searchQuery);
                                }}
                            >
                                ✓ ใช้หน่วย "{searchQuery}"
                            </div>
                        ) : (
                            <div 
                                style={{ 
                                    padding: '12px 14px', 
                                    fontSize: '13px', 
                                    color: '#94a3b8', 
                                    textAlign: 'center' 
                                }}
                            >
                                ไม่พบข้อมูล {searchQuery ? `"${searchQuery}"` : ''}
                            </div>
                        )
                    )}
                </div>, document.body) : (
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
                    minWidth: '150px'
                }}>
                    {displayedOptions.length > 0 ? (
                        displayedOptions.map((opt, idx) => {
                            const isSelected = String(opt.value) === String(value);
                            const isHighlighted = idx === highlightedIndex;
                            return (
                                <div
                                    key={idx}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!opt.disabled) handleSelect(opt.value);
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!opt.disabled) {
                                            setHighlightedIndex(idx);
                                        }
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: '13px',
                                        cursor: opt.disabled ? 'not-allowed' : 'pointer',
                                        borderRadius: '6px',
                                        color: isSelected ? '#15803d' : (opt.disabled ? '#94a3b8' : isHighlighted ? '#15803d' : '#475569'),
                                        backgroundColor: isSelected ? '#dcfce7' : (isHighlighted ? '#f8fafc' : '#fff'),
                                        fontWeight: isSelected ? '600' : '400',
                                        transition: 'all 0.15s ease',
                                        marginBottom: '2px',
                                        opacity: opt.disabled ? 0.6 : 1
                                    }}
                                >
                                    {opt.label}
                                </div>
                            );
                        })
                    ) : (
                        typeable ? (
                            <div 
                                style={{ 
                                    padding: '8px 12px', 
                                    fontSize: '13px', 
                                    color: '#16a34a',
                                    cursor: 'pointer',
                                    borderRadius: '6px',
                                    backgroundColor: '#f0fdf4',
                                    fontWeight: 500
                                }}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelect(searchQuery);
                                }}
                            >
                                ✓ ใช้หน่วย "{searchQuery}"
                            </div>
                        ) : (
                            <div 
                                style={{ 
                                    padding: '12px 14px', 
                                    fontSize: '13px', 
                                    color: '#94a3b8', 
                                    textAlign: 'center' 
                                }}
                            >
                                ไม่พบข้อมูล {searchQuery ? `"${searchQuery}"` : ''}
                            </div>
                        )
                    )}
                </div>
            ))}
            
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
                {!options.some(opt => String(opt.value) === String(value)) && value && (
                    <option value={value}>{value}</option>
                )}
            </select>
        </div>
    );
};

export default CustomSelect;

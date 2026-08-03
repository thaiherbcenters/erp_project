import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar as CalendarIcon } from 'lucide-react';

const CustomDatePicker = ({
    value,
    onChange,
    name,
    required,
    disabled,
    className = '',
    style = {},
    placeholderText = '',
    dateFormat = "dd/MM/yyyy",
    ...props
}) => {
    // Separate layout style (for container div) and input style (for input)
    const {
        width, flex, margin, marginTop, marginBottom, marginLeft, marginRight, display, gridColumn,
        ...visualStyles
    } = style || {};

    const containerStyle = {
        position: 'relative',
        width: width || '100%',
        flex,
        margin,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        display: display || 'block',
        gridColumn
    };

    const defaultInputStyle = {
        width: '100%',
        height: '38px',
        padding: '8px 36px 8px 12px',
        borderRadius: '8px',
        border: '1.5px solid var(--border, #cbd5e1)',
        fontSize: '12px',
        background: disabled ? '#f1f5f9' : '#fff',
        color: '#1e293b',
        boxSizing: 'border-box',
        outline: 'none',
        transition: 'all 0.2s',
        ...visualStyles
    };

    return (
        <div style={containerStyle}>
            <DatePicker
                selected={value ? new Date(value) : null}
                onChange={(date) => {
                    if (date) {
                        const offset = date.getTimezoneOffset();
                        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
                        const dateString = localDate.toISOString().split('T')[0];
                        if (onChange) {
                            onChange({ target: { name: name || '', value: dateString } });
                        }
                    } else {
                        if (onChange) {
                            onChange({ target: { name: name || '', value: '' } });
                        }
                    }
                }}
                dateFormat={dateFormat}
                required={required}
                disabled={disabled}
                className={className}
                placeholderText={placeholderText}
                customInput={<input style={defaultInputStyle} />}
                {...props}
            />
            <CalendarIcon
                size={16}
                color="#94a3b8"
                style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                }}
            />
        </div>
    );
};

export default CustomDatePicker;

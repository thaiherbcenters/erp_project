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
    ...props
}) => {
    return (
        <div style={{ position: 'relative', width: '100%', ...style }}>
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
                dateFormat="MM/dd/yyyy"
                required={required}
                disabled={disabled}
                className={className}
                placeholderText={placeholderText}
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

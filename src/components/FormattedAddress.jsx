import React from 'react';
import { getAddressParts } from '../utils/formatters';

export default function FormattedAddress({ data, isEn = false, className = '', style = {} }) {
    const parts = getAddressParts(data, isEn);
    if (!parts || parts.length === 0) return <span className={className} style={style}>-</span>;

    return (
        <span className={`formatted-address ${className}`.trim()} style={{ display: 'inline', ...style }}>
            {parts.map((part, idx) => (
                <span
                    key={idx}
                    className="address-part"
                    style={{
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                        marginRight: idx < parts.length - 1 ? '5px' : '0'
                    }}
                >
                    {part}
                </span>
            ))}
        </span>
    );
}

import React, { useState, useRef } from 'react';
import DatePicker, { CalendarContainer } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const THAI_MONTHS_DATA = [
    { short: 'ม.ค.', full: 'มกราคม' },
    { short: 'ก.พ.', full: 'กุมภาพันธ์' },
    { short: 'มี.ค.', full: 'มีนาคม' },
    { short: 'เม.ย.', full: 'เมษายน' },
    { short: 'พ.ค.', full: 'พฤษภาคม' },
    { short: 'มิ.ย.', full: 'มิถุนายน' },
    { short: 'ก.ค.', full: 'กรกฎาคม' },
    { short: 'ส.ค.', full: 'สิงหาคม' },
    { short: 'ก.ย.', full: 'กันยายน' },
    { short: 'ต.ค.', full: 'ตุลาคม' },
    { short: 'พ.ย.', full: 'พฤศจิกายน' },
    { short: 'ธ.ค.', full: 'ธันวาคม' }
];

const parseDateSafely = (val) => {
    if (!val) return null;
    if (val instanceof Date) {
        return isNaN(val.getTime()) ? null : val;
    }
    if (typeof val === 'object' && val.target?.value !== undefined) {
        val = val.target.value;
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        // If pure YYYY-MM-DD, parse components as local date to prevent any timezone shifts
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            const parts = trimmed.split('-');
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                const dt = new Date(y, m, d);
                return isNaN(dt.getTime()) ? null : dt;
            }
        }
        // If contains time or other format (e.g. ISO UTC string 2026-09-23T17:00:00.000Z),
        // new Date() correctly adjusts for the client's local timezone (e.g. Bangkok +7 -> 2026-09-24)
        const dt = new Date(trimmed);
        return isNaN(dt.getTime()) ? null : dt;
    }
    return null;
};

const CustomDatePicker = ({
    value,
    onChange,
    selectsRange = false,
    startDate,
    endDate,
    name,
    required,
    disabled,
    className = '',
    style = {},
    placeholderText = '',
    dateFormat = "dd/MM/yyyy",
    showMonthYearSelect = true,
    ...props
}) => {
    const [viewMode, setViewMode] = useState('days'); // 'days' | 'months' | 'years'
    const headerPropsRef = useRef(null);

    const parsedStart = parseDateSafely(startDate);
    const parsedEnd = parseDateSafely(endDate);
    const parsedValue = parseDateSafely(value);

    const initialDate = parsedStart || parsedValue || new Date();
    const [overlayYear, setOverlayYear] = useState(() => initialDate.getFullYear());
    const [decadeStart, setDecadeStart] = useState(() => Math.floor(initialDate.getFullYear() / 12) * 12);

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

    // Header in Day View
    const customHeaderRenderer = (headerProps) => {
        headerPropsRef.current = headerProps;
        const {
            date,
            decreaseMonth,
            increaseMonth,
            prevMonthButtonDisabled,
            nextMonthButtonDisabled
        } = headerProps;

        const safeDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
        const m = safeDate.getMonth();
        const y = safeDate.getFullYear();

        return (
            <div style={{ padding: '6px 8px 8px 8px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '4px'
                }}>
                    <button
                        type="button"
                        onClick={decreaseMonth}
                        disabled={prevMonthButtonDisabled}
                        style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: prevMonthButtonDisabled ? 'not-allowed' : 'pointer',
                            color: prevMonthButtonDisabled ? '#cbd5e1' : '#475569',
                            padding: 0
                        }}
                        title="เดือนก่อนหน้า"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOverlayYear(y);
                                setViewMode('months');
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#0f172a',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#ecfdf5';
                                e.currentTarget.style.borderColor = '#10b981';
                                e.currentTarget.style.color = '#059669';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.color = '#0f172a';
                            }}
                            title="คลิกเพื่อสลับเป็นปฏิทินเดือน"
                        >
                            <span>{THAI_MONTHS_DATA[m]?.full || ''}</span>
                            <ChevronDown size={14} color="#64748b" />
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOverlayYear(y);
                                setDecadeStart(Math.floor(y / 12) * 12);
                                setViewMode('years');
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#0f172a',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#ecfdf5';
                                e.currentTarget.style.borderColor = '#10b981';
                                e.currentTarget.style.color = '#059669';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.color = '#0f172a';
                            }}
                            title="คลิกเพื่อสลับเป็นปฏิทินปี"
                        >
                            <span>พ.ศ. {y + 543}</span>
                            <ChevronDown size={14} color="#64748b" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={increaseMonth}
                        disabled={nextMonthButtonDisabled}
                        style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: nextMonthButtonDisabled ? 'not-allowed' : 'pointer',
                            color: nextMonthButtonDisabled ? '#cbd5e1' : '#475569',
                            padding: 0
                        }}
                        title="เดือนถัดไป"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        );
    };

    // Calendar container with Month & Year overlays
    const CustomContainer = ({ className, children }) => {
        const currentDate = headerPropsRef.current?.date || initialDate;
        const currentYear = overlayYear || currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        return (
            <CalendarContainer className={className} style={{ position: 'relative', overflow: 'hidden', minWidth: '290px', minHeight: '320px' }}>
                {children}

                {/* ── Month Calendar Overlay (ปฏิทินเดือน) ── */}
                {viewMode === 'months' && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: '#ffffff',
                        zIndex: 99,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '10px 12px',
                        borderRadius: '12px'
                    }}>
                        {/* Header for Month View */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #f1f5f9',
                            paddingBottom: '8px',
                            marginBottom: '10px'
                        }}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const prevYear = currentYear - 1;
                                    setOverlayYear(prevYear);
                                    headerPropsRef.current?.changeYear(prevYear);
                                }}
                                style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#475569',
                                    padding: 0
                                }}
                                title="ปีก่อนหน้า"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDecadeStart(Math.floor(currentYear / 12) * 12);
                                    setViewMode('years');
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    padding: '4px 10px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    cursor: 'pointer'
                                }}
                                title="คลิกเพื่อเลือกปี"
                            >
                                <span>พ.ศ. {currentYear + 543} ({currentYear})</span>
                                <ChevronDown size={13} color="#64748b" />
                            </button>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const nextYear = currentYear + 1;
                                    setOverlayYear(nextYear);
                                    headerPropsRef.current?.changeYear(nextYear);
                                }}
                                style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#475569',
                                    padding: 0
                                }}
                                title="ปีถัดไป"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* 12 Months Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '6px',
                            flex: 1
                        }}>
                            {THAI_MONTHS_DATA.map((m, idx) => {
                                const isCurrent = currentMonth === idx && (currentDate.getFullYear() === currentYear);
                                return (
                                    <button
                                        type="button"
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            headerPropsRef.current?.changeYear(currentYear);
                                            headerPropsRef.current?.changeMonth(idx);
                                            if (selectsRange) {
                                                const pad = (n) => String(n).padStart(2, '0');
                                                const firstDay = `${currentYear}-${pad(idx + 1)}-01`;
                                                const lastDate = new Date(currentYear, idx + 1, 0).getDate();
                                                const lastDay = `${currentYear}-${pad(idx + 1)}-${pad(lastDate)}`;
                                                if (onChange) onChange([firstDay, lastDay]);
                                            }
                                            setViewMode('days');
                                        }}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '8px 2px',
                                            borderRadius: '8px',
                                            border: isCurrent ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                                            background: isCurrent ? '#10b981' : '#ffffff',
                                            color: isCurrent ? '#ffffff' : '#1e293b',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isCurrent) {
                                                e.currentTarget.style.background = '#ecfdf5';
                                                e.currentTarget.style.borderColor = '#10b981';
                                                e.currentTarget.style.color = '#059669';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isCurrent) {
                                                e.currentTarget.style.background = '#ffffff';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                                e.currentTarget.style.color = '#1e293b';
                                            }
                                        }}
                                        title={`เลือกเดือน ${m.full}`}
                                    >
                                        <span style={{ fontSize: '13px', fontWeight: 700 }}>{m.full}</span>
                                        <span style={{ fontSize: '10px', opacity: isCurrent ? 0.9 : 0.6 }}>({m.short})</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer return button */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginTop: '8px',
                            paddingTop: '6px',
                            borderTop: '1px solid #f1f5f9'
                        }}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setViewMode('days');
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '2px 8px'
                                }}
                            >
                                ‹ กลับไปดูรายวัน
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Year Calendar Overlay (ปฏิทินปี) ── */}
                {viewMode === 'years' && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: '#ffffff',
                        zIndex: 99,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '10px 12px',
                        borderRadius: '12px'
                    }}>
                        {/* Header for Year View */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #f1f5f9',
                            paddingBottom: '8px',
                            marginBottom: '10px'
                        }}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDecadeStart(d => d - 12);
                                }}
                                style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#475569',
                                    padding: 0
                                }}
                                title="12 ปีก่อนหน้า"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                พ.ศ. {decadeStart + 543} - {decadeStart + 11 + 543}
                            </span>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDecadeStart(d => d + 12);
                                }}
                                style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#475569',
                                    padding: 0
                                }}
                                title="12 ปีถัดไป"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* 12 Years Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '6px',
                            flex: 1
                        }}>
                            {Array.from({ length: 12 }, (_, i) => decadeStart + i).map(yr => {
                                const isCurrent = currentYear === yr;
                                return (
                                    <button
                                        type="button"
                                        key={yr}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOverlayYear(yr);
                                            headerPropsRef.current?.changeYear(yr);
                                            setViewMode('months');
                                        }}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '8px 2px',
                                            borderRadius: '8px',
                                            border: isCurrent ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                                            background: isCurrent ? '#10b981' : '#ffffff',
                                            color: isCurrent ? '#ffffff' : '#1e293b',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isCurrent) {
                                                e.currentTarget.style.background = '#ecfdf5';
                                                e.currentTarget.style.borderColor = '#10b981';
                                                e.currentTarget.style.color = '#059669';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isCurrent) {
                                                e.currentTarget.style.background = '#ffffff';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                                e.currentTarget.style.color = '#1e293b';
                                            }
                                        }}
                                        title={`เลือกปี พ.ศ. ${yr + 543}`}
                                    >
                                        <span style={{ fontSize: '13px', fontWeight: 700 }}>พ.ศ. {yr + 543}</span>
                                        <span style={{ fontSize: '10px', opacity: isCurrent ? 0.9 : 0.6 }}>({yr})</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer return buttons */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '8px',
                            paddingTop: '6px',
                            borderTop: '1px solid #f1f5f9'
                        }}>
                            {selectsRange && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const firstDay = `${currentYear}-01-01`;
                                        const lastDay = `${currentYear}-12-31`;
                                        if (onChange) onChange([firstDay, lastDay]);
                                        setViewMode('days');
                                    }}
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: '#0284c7',
                                        background: '#f0f9ff',
                                        border: '1px solid #bae6fd',
                                        borderRadius: '4px',
                                        padding: '2px 8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    เลือกทั้งปี พ.ศ. {currentYear + 543}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setViewMode('days');
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '2px 8px',
                                    marginLeft: 'auto'
                                }}
                            >
                                ‹ กลับไปดูรายวัน
                            </button>
                        </div>
                    </div>
                )}
            </CalendarContainer>
        );
    };

    return (
        <div style={containerStyle}>
            <DatePicker
                selected={selectsRange ? parsedStart : parsedValue}
                startDate={selectsRange ? parsedStart : undefined}
                endDate={selectsRange ? parsedEnd : undefined}
                selectsRange={selectsRange}
                onChange={(dateOrRange) => {
                    if (selectsRange) {
                        const [start, end] = Array.isArray(dateOrRange) ? dateOrRange : [null, null];
                        const formatD = (d) => {
                            if (!d || isNaN(d.getTime())) return '';
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            return `${y}-${m}-${day}`;
                        };
                        const startStr = formatD(start);
                        const endStr = formatD(end);
                        if (onChange) {
                            onChange([startStr, endStr]);
                        }
                    } else {
                        const date = dateOrRange;
                        if (date && !isNaN(date.getTime())) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const dateString = `${year}-${month}-${day}`;
                            if (onChange) {
                                const syntheticEvent = {
                                    target: { name: name || '', value: dateString },
                                    value: dateString,
                                    toString: () => dateString
                                };
                                onChange(syntheticEvent);
                            }
                        } else {
                            if (onChange) {
                                const syntheticEvent = {
                                    target: { name: name || '', value: '' },
                                    value: '',
                                    toString: () => ''
                                };
                                onChange(syntheticEvent);
                            }
                        }
                    }
                }}
                renderCustomHeader={showMonthYearSelect ? customHeaderRenderer : undefined}
                calendarContainer={showMonthYearSelect ? CustomContainer : undefined}
                onCalendarClose={() => setViewMode('days')}
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

import React from 'react';
import { Filter, X, Calendar } from 'lucide-react';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';

export const FilterToggleButton = ({ isOpen, onClick, activeCount = 0 }) => {
    return (
        <button
            type="button"
            className="filter-toggle-btn"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '38px',
                padding: '0 14px',
                borderRadius: '8px',
                border: isOpen || activeCount > 0 ? '1.5px solid #6366f1' : '1px solid #cbd5e1',
                background: isOpen || activeCount > 0 ? '#eef2ff' : '#ffffff',
                color: isOpen || activeCount > 0 ? '#4338ca' : '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out'
            }}
            onClick={onClick}
            title="กรองข้อมูลเอกสาร"
        >
            <Filter size={16} color={isOpen || activeCount > 0 ? '#4f46e5' : '#64748b'} />
            <span>ตัวกรอง</span>
            {activeCount > 0 && (
                <span style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    minWidth: '18px',
                    height: '18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {activeCount}
                </span>
            )}
        </button>
    );
};

export const SalesDocFilterDrawer = ({
    isOpen,
    onClose,
    filter = {},
    onFilterChange,
    onReset,
    onQuickDate,
    usersList = [],
    docTypeLabel = 'เอกสาร',
    subTypeOptions = null,
    statusOptions = ['ร่าง', 'พร้อมใช้', 'ส่งแล้ว', 'อนุมัติ', 'สร้าง SO แล้ว', 'ปฏิเสธ']
}) => {
    if (!isOpen) return null;

    const hasAnyFilter = Boolean(
        filter.subType ||
        filter.createdBy ||
        filter.status ||
        filter.dateFrom ||
        filter.dateTo
    );

    const activeCount = [
        Boolean(filter.subType),
        Boolean(filter.createdBy),
        Boolean(filter.status),
        Boolean(filter.dateFrom || filter.dateTo)
    ].filter(Boolean).length;

    return (
        <div className="filter-drawer card" style={{
            padding: '16px 20px',
            marginBottom: '18px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05)',
            animation: 'fadeIn 0.2s ease-in-out'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #edf2f7', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    <Filter size={16} color="#4f46e5" />
                    <span>ตัวกรองขั้นสูง</span>
                    {activeCount > 0 && (
                        <span style={{
                            background: '#e0e7ff',
                            color: '#4338ca',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px'
                        }}>
                            เลือกอยู่ {activeCount} เงื่อนไข
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {hasAnyFilter && (
                        <button
                            type="button"
                            onClick={onReset}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '6px'
                            }}
                        >
                            ล้างตัวกรองทั้งหมด
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            width: '26px',
                            height: '26px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b',
                            cursor: 'pointer'
                        }}
                        title="ปิดแผงตัวกรอง"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {/* ประเภทเอกสาร */}
                {subTypeOptions !== false && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>ประเภทเอกสาร</label>
                        <CustomSelect
                            value={filter.subType || ''}
                            onChange={(e) => onFilterChange('subType', e.target.value)}
                            usePortal={true}
                            style={{
                                width: '100%',
                                minHeight: '38px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1'
                            }}
                        >
                            {Array.isArray(subTypeOptions) ? (
                                subTypeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))
                            ) : (
                                <>
                                    <option value="">ประเภททั้งหมด</option>
                                    <option value="normal">{docTypeLabel}ปกติ</option>
                                    <option value="fda">{docTypeLabel} อย.</option>
                                </>
                            )}
                        </CustomSelect>
                    </div>
                )}

                {/* ผู้สร้าง */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>ผู้สร้างเอกสาร</label>
                    <CustomSelect
                        value={filter.createdBy || ''}
                        onChange={(e) => onFilterChange('createdBy', e.target.value)}
                        usePortal={true}
                        style={{
                            width: '100%',
                            minHeight: '38px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1'
                        }}
                    >
                        <option value="">ผู้สร้างทั้งหมด</option>
                        {usersList.map((u) => (
                            <option key={u.id || u.user_id} value={String(u.id || u.user_id)}>
                                {u.displayName || u.display_name || u.username}
                            </option>
                        ))}
                    </CustomSelect>
                </div>

                {/* สถานะ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>สถานะ</label>
                    <CustomSelect
                        value={filter.status || ''}
                        onChange={(e) => onFilterChange('status', e.target.value)}
                        usePortal={true}
                        style={{
                            width: '100%',
                            minHeight: '38px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1'
                        }}
                    >
                        <option value="">ทุกสถานะ</option>
                        {statusOptions.map((opt) => {
                            const val = typeof opt === 'string' ? opt : opt.value;
                            const label = typeof opt === 'string' ? opt : opt.label;
                            return <option key={val} value={val}>{label}</option>;
                        })}
                    </CustomSelect>
                </div>

                {/* ช่วงวันที่ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} color="#64748b" />
                        <span>ช่วงวันที่ (จาก - ถึง)</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CustomDatePicker
                            value={filter.dateFrom || ''}
                            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                            placeholderText="จากวันที่"
                            style={{ width: '100%', flex: 1 }}
                        />
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>
                        <CustomDatePicker
                            value={filter.dateTo || ''}
                            onChange={(e) => onFilterChange('dateTo', e.target.value)}
                            placeholderText="ถึงวันที่"
                            style={{ width: '100%', flex: 1 }}
                        />
                    </div>
                </div>
            </div>

            {/* ปุ่มลัดช่วงวันที่ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #edf2f7', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>ลัดเลือกวันที่:</span>
                <button
                    type="button"
                    style={{
                        height: '28px',
                        padding: '0 10px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#334155'
                    }}
                    onClick={() => onQuickDate('today')}
                >
                    วันนี้
                </button>
                <button
                    type="button"
                    style={{
                        height: '28px',
                        padding: '0 10px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#334155'
                    }}
                    onClick={() => onQuickDate('7days')}
                >
                    7 วันล่าสุด
                </button>
                <button
                    type="button"
                    style={{
                        height: '28px',
                        padding: '0 10px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#334155'
                    }}
                    onClick={() => onQuickDate('thisMonth')}
                >
                    เดือนนี้
                </button>
                {(filter.dateFrom || filter.dateTo) && (
                    <button
                        type="button"
                        style={{
                            height: '28px',
                            padding: '0 8px',
                            fontSize: '11px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444'
                        }}
                        onClick={() => {
                            onFilterChange('dateFrom', '');
                            onFilterChange('dateTo', '');
                        }}
                    >
                        ล้างวันที่
                    </button>
                )}
            </div>
        </div>
    );
};

export default SalesDocFilterDrawer;

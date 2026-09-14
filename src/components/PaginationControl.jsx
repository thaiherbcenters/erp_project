import React from 'react';
import CustomSelect from './CustomSelect';

/**
 * =============================================================================
 * PaginationControl.jsx — คอมโพเนนต์แถบควบคุมแบ่งหน้ามาตรฐานของระบบ ERP
 * =============================================================================
 * Props:
 * - currentPage: หมายเลขหน้าปัจจุบัน (1-indexed)
 * - totalPages: จำนวนหน้าทั้งหมด
 * - totalItems: จำนวนรายการทั้งหมด (filtered length)
 * - pageSize: จำนวนรายการต่อหน้า (default: 10)
 * - onPageChange: Callback เมื่อเปลี่ยนหน้า (newPage) => void
 * - onPageSizeChange: Callback เมื่อเปลี่ยนขนาดหน้า (newSize) => void (ถ้าไม่ส่งมาจะไม่แสดง Dropdown เลือกขนาดหน้า)
 * - pageSizeOptions: ตัวเลือกจำนวนต่อหน้า (default: [10, 20, 50])
 * - itemLabel: คำเรียกหน่วย เช่น 'รายการ', 'ฉบับ', 'คน' (default: 'รายการ')
 */
export default function PaginationControl({
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    pageSize = 10,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50],
    itemLabel = 'รายการ',
    style = {}
}) {
    if (!totalItems || totalItems === 0) return null;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const safeTotalPages = Math.max(totalPages, 1);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderTop: '1px solid var(--border, #e2e8f0)',
            flexWrap: 'wrap',
            gap: '12px',
            background: '#fafafa',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            ...style
        }}>
            {/* สรุปจำนวนรายการ & ตัวเลือกหน้าละ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                <span>
                    แสดง <strong>{totalItems > 0 ? startIndex + 1 : 0} - {endIndex}</strong> จากทั้งหมด <strong>{totalItems}</strong> {itemLabel}
                </span>
                {onPageSizeChange && (
                    <>
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>แสดงหน้าละ:</span>
                            <div style={{ width: '75px' }}>
                                <CustomSelect 
                                    value={pageSize} 
                                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                                    usePortal={true}
                                    style={{ 
                                        width: '75px',
                                        minHeight: '32px', 
                                        padding: '4px 8px', 
                                        fontSize: '13px',
                                        borderRadius: '8px'
                                    }}
                                >
                                    {pageSizeOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </CustomSelect>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ปุ่มเปลี่ยนหน้า: ก่อนหน้า / หน้า X / Y / ถัดไป */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                    type="button"
                    className="btn-secondary" 
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange && onPageChange(Math.max(currentPage - 1, 1))}
                    style={{ 
                        padding: '6px 14px', 
                        fontSize: '13px', 
                        opacity: currentPage <= 1 ? 0.4 : 1, 
                        cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' 
                    }}
                >
                    ก่อนหน้า
                </button>
                
                <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 8px', color: 'var(--text-main, #0f172a)' }}>
                    หน้า {currentPage} / {safeTotalPages}
                </span>

                <button 
                    type="button"
                    className="btn-secondary" 
                    disabled={currentPage >= safeTotalPages}
                    onClick={() => onPageChange && onPageChange(Math.min(currentPage + 1, safeTotalPages))}
                    style={{ 
                        padding: '6px 14px', 
                        fontSize: '13px', 
                        opacity: currentPage >= safeTotalPages ? 0.4 : 1, 
                        cursor: currentPage >= safeTotalPages ? 'not-allowed' : 'pointer' 
                    }}
                >
                    ถัดไป
                </button>
            </div>
        </div>
    );
}

/**
 * =============================================================================
 * CustomAlert.jsx — Custom Alert & Confirm Modal (แทน window.alert / confirm)
 * =============================================================================
 * ใช้งาน:
 *   import { useAlert } from '../components/CustomAlert';
 *   const { showAlert, showConfirm } = useAlert();
 *
 *   // แทน alert()
 *   showAlert('สำเร็จ!', 'สร้างใบสั่งผลิตเรียบร้อย', 'success');
 *
 *   // แทน confirm()
 *   const ok = await showConfirm('ยืนยัน', 'คุณต้องการลบข้อมูลนี้?', 'warning');
 *   if (ok) { ... }
 * =============================================================================
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import './CustomAlert.css';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
    const [modal, setModal] = useState(null);

    const showAlert = useCallback((title, message, type = 'info') => {
        return new Promise((resolve) => {
            setModal({ title, message, type, mode: 'alert', resolve });
        });
    }, []);

    const showConfirm = useCallback((title, message, type = 'warning') => {
        return new Promise((resolve) => {
            setModal({ title, message, type, mode: 'confirm', resolve });
        });
    }, []);

    const handleClose = (result) => {
        if (modal?.resolve) modal.resolve(result);
        setModal(null);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={28} />;
            case 'warning': return <AlertTriangle size={28} />;
            case 'error': return <XCircle size={28} />;
            case 'info': default: return <Info size={28} />;
        }
    };

    return (
        <AlertContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            {modal && (
                <div className="custom-alert-overlay" onClick={() => handleClose(false)}>
                    <div className={`custom-alert-modal custom-alert-${modal.type}`} onClick={(e) => e.stopPropagation()}>
                        {/* Close button */}
                        <button className="custom-alert-close" onClick={() => handleClose(false)}>
                            <X size={18} />
                        </button>

                        {/* Icon */}
                        <div className={`custom-alert-icon custom-alert-icon-${modal.type}`}>
                            {getIcon(modal.type)}
                        </div>

                        {/* Content */}
                        <div className="custom-alert-content">
                            <h3 className="custom-alert-title">{modal.title}</h3>
                            <p className="custom-alert-message">{modal.message}</p>
                        </div>

                        {/* Buttons */}
                        <div className="custom-alert-actions">
                            {modal.mode === 'confirm' && (
                                <button className="custom-alert-btn custom-alert-btn-cancel" onClick={() => handleClose(false)}>
                                    ยกเลิก
                                </button>
                            )}
                            <button
                                className={`custom-alert-btn custom-alert-btn-${modal.type}`}
                                onClick={() => handleClose(true)}
                                autoFocus
                            >
                                {modal.mode === 'confirm' ? 'ยืนยัน' : 'ตกลง'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AlertContext.Provider>
    );
}

export function useAlert() {
    const ctx = useContext(AlertContext);
    if (!ctx) throw new Error('useAlert must be used within AlertProvider');
    return ctx;
}

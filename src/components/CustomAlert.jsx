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
import { CheckCircle, AlertTriangle, XCircle, Info, X, Loader2 } from 'lucide-react';
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

    const showPrompt = useCallback((title, message, defaultValue = '', type = 'info') => {
        return new Promise((resolve) => {
            setModal({ title, message, type, mode: 'prompt', resolve, defaultValue });
        });
    }, []);

    const showLoading = useCallback((title = 'กำลังโหลด...', message = 'กรุณารอสักครู่') => {
        setModal({ title, message, type: 'info', mode: 'loading' });
    }, []);

    const hideLoading = useCallback(() => {
        setModal((prev) => (prev?.mode === 'loading' ? null : prev));
    }, []);

    const handleClose = (result) => {
        if (modal?.resolve) modal.resolve(result);
        setModal(null);
    };

    const getIcon = (type, mode) => {
        if (mode === 'loading') return <Loader2 size={28} className="animate-spin" />;
        switch (type) {
            case 'success': return <CheckCircle size={28} />;
            case 'warning': return <AlertTriangle size={28} />;
            case 'error': return <XCircle size={28} />;
            case 'info': default: return <Info size={28} />;
        }
    };

    return (
        <AlertContext.Provider value={{ showAlert, showConfirm, showPrompt, showLoading, hideLoading }}>
            {children}
            {modal && (
                <div className="custom-alert-overlay" onClick={() => modal.mode !== 'loading' && handleClose(modal.mode === 'prompt' ? null : false)}>
                    <div className={`custom-alert-modal custom-alert-${modal.type}`} onClick={(e) => e.stopPropagation()}>
                        {/* Close button - Hide if loading */}
                        {modal.mode !== 'loading' && (
                            <button className="custom-alert-close" onClick={() => handleClose(modal.mode === 'prompt' ? null : false)}>
                                <X size={18} />
                            </button>
                        )}

                        {/* Icon */}
                        <div className={`custom-alert-icon custom-alert-icon-${modal.type}`}>
                            {getIcon(modal.type, modal.mode)}
                        </div>

                        {/* Content */}
                        <div className="custom-alert-content">
                            <h3 className="custom-alert-title">{modal.title}</h3>
                            <p className="custom-alert-message">{modal.message}</p>
                            {modal.mode === 'prompt' && (
                                <input
                                    type="text"
                                    id="custom-prompt-input"
                                    defaultValue={modal.defaultValue}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleClose(e.target.value);
                                        if (e.key === 'Escape') handleClose(null);
                                    }}
                                    autoFocus
                                    style={{ marginTop: '12px', width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                                />
                            )}
                        </div>

                        {/* Buttons - Hide if loading */}
                        {modal.mode !== 'loading' && (
                            <div className="custom-alert-actions">
                                {(modal.mode === 'confirm' || modal.mode === 'prompt') && (
                                    <button className="custom-alert-btn custom-alert-btn-cancel" onClick={() => handleClose(modal.mode === 'prompt' ? null : false)}>
                                        ยกเลิก
                                    </button>
                                )}
                                <button
                                    className={`custom-alert-btn custom-alert-btn-${modal.type}`}
                                    onClick={() => {
                                        if (modal.mode === 'prompt') {
                                            const val = document.getElementById('custom-prompt-input')?.value;
                                            handleClose(val !== undefined ? val : null);
                                        } else {
                                            handleClose(true);
                                        }
                                    }}
                                    autoFocus={modal.mode !== 'prompt'}
                                >
                                    {modal.mode === 'confirm' ? 'ยืนยัน' : 'ตกลง'}
                                </button>
                            </div>
                        )}
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

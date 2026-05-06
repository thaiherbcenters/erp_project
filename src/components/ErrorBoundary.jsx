import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // อัปเดต state เพื่อให้เรนเดอร์ Fallback UI ในรอบถัดไป
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // สามารถเก็บ log error ไปที่ระบบภายนอกได้ที่นี่ (เช่น Sentry)
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={styles.container}>
                    <div style={styles.card}>
                        <div style={styles.icon}>⚠️</div>
                        <h2 style={styles.title}>ขออภัย ระบบเกิดข้อขัดข้อง</h2>
                        <p style={styles.message}>
                            เราพบข้อผิดพลาดบางอย่างในการแสดงผลหน้าจอนี้ <br />
                            กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบหากปัญหายังคงอยู่
                        </p>
                        <button style={styles.button} onClick={this.handleReload}>
                            ↻ รีเฟรชหน้าเว็บ
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8f9fa',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    card: {
        textAlign: 'center',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        maxWidth: '500px',
        width: '90%'
    },
    icon: {
        fontSize: '64px',
        marginBottom: '16px'
    },
    title: {
        color: '#dc3545',
        margin: '0 0 16px 0',
        fontSize: '24px'
    },
    message: {
        color: '#6c757d',
        lineHeight: '1.6',
        marginBottom: '24px'
    },
    button: {
        backgroundColor: '#0d6efd',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '6px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    }
};

export default ErrorBoundary;

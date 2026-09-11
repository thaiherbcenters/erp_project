import { useState, useEffect, useMemo } from 'react';
import API_BASE from '../config';
import { useAuth } from '../context/AuthContext';

export function useSignatures() {
    const [signatures, setSignatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchSignatures = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE}/signatures`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await res.json();
                if (data.success) {
                    setSignatures(data.data.filter(s => s.IsActive !== false)); // only active signatures
                } else {
                    throw new Error(data.message || 'Failed to fetch signatures');
                }
            } catch (err) {
                console.error('Failed to load signatures:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSignatures();
    }, []);

    const getSignatureUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('/api')) {
            const baseUrl = API_BASE.replace(/\/api$/, '');
            return `${baseUrl}${path}`;
        }
        return path;
    };

    // ลายเซ็นของ user ที่ล็อกอินอยู่เท่านั้น (สำหรับ dropdown เลือกลายเซ็น)
    // admin เห็นทั้งหมด, user ทั่วไปเห็นเฉพาะที่ผูกกับตัวเอง
    const userSignatures = useMemo(() => {
        if (!currentUser || signatures.length === 0) return [];
        if (currentUser.role === 'admin') return signatures;
        return signatures.filter(s => s.user_id == currentUser.id);
    }, [currentUser, signatures]);

    // ลายเซ็นผู้มีอำนาจลงนาม / เจ้านาย (ธวัช จรุงพิรวงศ์ หรือที่ไม่มี user_id ผูก)
    const bossSignatures = useMemo(() => {
        if (signatures.length === 0) return [];
        return signatures.filter(s => s.KeyName === 'thawat' || (s.FullName && s.FullName.includes('ธวัช')) || !s.user_id);
    }, [signatures]);

    const defaultSignerKey = useMemo(() => {
        if (!currentUser || signatures.length === 0) return null;
        const userSig = signatures.find(s => s.user_id == currentUser.id);
        return userSig ? userSig.KeyName : null;
    }, [currentUser, signatures]);

    return { signatures, userSignatures, bossSignatures, loading, error, getSignatureUrl, defaultSignerKey };
}

import { useState, useEffect } from 'react';
import API_BASE from '../config';

export function useSignatures() {
    const [signatures, setSignatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    return { signatures, loading, error, getSignatureUrl };
}

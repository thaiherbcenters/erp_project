import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API_BASE from '../config';

const PlannerContext = createContext();

export function PlannerProvider({ children }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/planner`);
            if (res.ok) {
                const data = await res.json();
                setJobs(data);
            }
        } catch (err) {
            console.error('Failed to fetch planner jobs:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const updateJobStatus = useCallback(async (jobId, status) => {
        try {
            const res = await fetch(`${API_BASE}/planner/${jobId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchJobs();
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to update job status:', err);
            return false;
        }
    }, [fetchJobs]);

    const createJob = useCallback(async (jobData) => {
        try {
            const res = await fetch(`${API_BASE}/planner`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobData)
            });
            if (res.ok) {
                fetchJobs();
                return { success: true };
            }
            return { success: false, message: 'Failed to create job' };
        } catch (err) {
            console.error('Failed to create job:', err);
            return { success: false, message: 'Server error' };
        }
    }, [fetchJobs]);

    const releaseJobOrder = useCallback(async (jobId) => {
        try {
            const res = await fetch(`${API_BASE}/planner/${jobId}/release`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                fetchJobs(); // Refresh jobs to update status in UI
                return { success: true };
            }
            const data = await res.json();
            return { success: false, message: data.message || 'Failed to release job' };
        } catch (err) {
            console.error('Failed to release job:', err);
            return { success: false, message: 'Server error' };
        }
    }, [fetchJobs]);

    const value = {
        jobs,
        loading,
        fetchJobs,
        updateJobStatus,
        createJob,
        releaseJobOrder
    };

    return (
        <PlannerContext.Provider value={value}>
            {children}
        </PlannerContext.Provider>
    );
}

export function usePlanner() {
    const context = useContext(PlannerContext);
    if (!context) {
        throw new Error('usePlanner must be used within a PlannerProvider');
    }
    return context;
}

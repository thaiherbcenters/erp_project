import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API_BASE from '../config';

const RnDContext = createContext();

export function RnDProvider({ children }) {
    const [formulas, setFormulas] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [projects, setProjects] = useState([]);
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFormulas = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/rnd/formulas`);
            if (res.ok) setFormulas(await res.json());
        } catch (err) {
            console.error('Failed to fetch formulas:', err);
        }
    }, []);

    const fetchMaterials = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/rnd/materials`);
            if (res.ok) setMaterials(await res.json());
        } catch (err) {
            console.error('Failed to fetch materials:', err);
        }
    }, []);

    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/rnd/projects`);
            if (res.ok) setProjects(await res.json());
        } catch (err) {
            console.error('Failed to fetch projects:', err);
        }
    }, []);

    const fetchExperiments = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/rnd/experiments`);
            if (res.ok) setExperiments(await res.json());
        } catch (err) {
            console.error('Failed to fetch experiments:', err);
        }
    }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchFormulas(), fetchMaterials(), fetchProjects(), fetchExperiments()]);
        setLoading(false);
    }, [fetchFormulas, fetchMaterials, fetchProjects, fetchExperiments]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const createFormula = useCallback(async (formulaData) => {
        try {
            const res = await fetch(`${API_BASE}/rnd/formulas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formulaData),
            });
            if (res.ok) {
                fetchFormulas();
                return { success: true };
            }
            return { success: false, message: 'Failed to create formula' };
        } catch (err) {
            console.error('Failed to create formula:', err);
            return { success: false, message: 'Server error' };
        }
    }, [fetchFormulas]);

    const updateFormula = useCallback(async (id, data) => {
        try {
            const res = await fetch(`${API_BASE}/rnd/formulas/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
            });
            if (res.ok) { fetchFormulas(); return { success: true }; }
            return { success: false, message: 'Failed' };
        } catch (err) { return { success: false, message: 'Server error' }; }
    }, [fetchFormulas]);

    const updateFormulaStatus = useCallback(async (id, status, approvedBy) => {
        try {
            const res = await fetch(`${API_BASE}/rnd/formulas/${id}/status`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, approvedBy }),
            });
            if (res.ok) { fetchFormulas(); return { success: true }; }
            return { success: false, message: 'Failed' };
        } catch (err) { return { success: false, message: 'Server error' }; }
    }, [fetchFormulas]);

    const deleteFormula = useCallback(async (id) => {
        try {
            const res = await fetch(`${API_BASE}/rnd/formulas/${id}`, { method: 'DELETE' });
            if (res.ok) { fetchFormulas(); return { success: true }; }
            return { success: false, message: 'Failed' };
        } catch (err) { return { success: false, message: 'Server error' }; }
    }, [fetchFormulas]);

    const createMaterial = useCallback(async (data) => {
        try {
            const res = await fetch(`${API_BASE}/rnd/materials`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
            });
            if (res.ok) { fetchMaterials(); return { success: true }; }
            return { success: false, message: 'Failed' };
        } catch (err) { return { success: false, message: 'Server error' }; }
    }, [fetchMaterials]);

    const updateMaterial = useCallback(async (id, data) => {
        try {
            const res = await fetch(`${API_BASE}/rnd/materials/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
            });
            if (res.ok) { fetchMaterials(); return { success: true }; }
            return { success: false, message: 'Failed' };
        } catch (err) { return { success: false, message: 'Server error' }; }
    }, [fetchMaterials]);

    const deleteMaterial = useCallback(async (id) => {
        try {
            const res = await fetch(`${API_BASE}/rnd/materials/${id}`, { method: 'DELETE' });
            if (res.ok) { fetchMaterials(); return { success: true }; }
            return { success: false, message: 'Failed' };
        } catch (err) { return { success: false, message: 'Server error' }; }
    }, [fetchMaterials]);

    const createProject = useCallback(async (data) => {
        try {
            const res = await fetch(`${API_BASE}/rnd/projects`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
            });
            if (res.ok) { fetchProjects(); return { success: true }; }
            return { success: false, message: 'Failed' };
        } catch (err) { return { success: false, message: 'Server error' }; }
    }, [fetchProjects]);

    const createExperiment = useCallback(async (data) => {
        try {
            const res = await fetch(`${API_BASE}/rnd/experiments`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
            });
            if (res.ok) { fetchExperiments(); return { success: true }; }
            return { success: false, message: 'Failed' };
        } catch (err) { return { success: false, message: 'Server error' }; }
    }, [fetchExperiments]);

    const fetchFormulaTests = useCallback(async (formulaId) => {
        try {
            const url = formulaId ? `${API_BASE}/rnd/formula-tests/${formulaId}` : `${API_BASE}/rnd/formula-tests`;
            const res = await fetch(url);
            if (res.ok) return await res.json();
            return [];
        } catch (err) { return []; }
    }, []);

    const submitFormulaTest = useCallback(async (data) => {
        try {
            const res = await fetch(`${API_BASE}/rnd/formula-tests`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
            });
            if (res.ok) { fetchFormulas(); return { success: true }; }
            return { success: false };
        } catch (err) { return { success: false }; }
    }, [fetchFormulas]);

    const pharmApprove = useCallback(async (formulaId, approvedBy, approved) => {
        try {
            const res = await fetch(`${API_BASE}/rnd/formulas/${formulaId}/pharm-approve`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approvedBy, approved }),
            });
            if (res.ok) { fetchFormulas(); return { success: true }; }
            return { success: false };
        } catch (err) { return { success: false }; }
    }, [fetchFormulas]);

    const value = {
        formulas, materials, projects, experiments, loading,
        fetchFormulas, fetchMaterials, fetchProjects, fetchExperiments, fetchAll,
        createFormula, updateFormula, updateFormulaStatus, deleteFormula,
        createMaterial, updateMaterial, deleteMaterial,
        createProject, createExperiment,
        fetchFormulaTests, submitFormulaTest, pharmApprove,
    };

    return (
        <RnDContext.Provider value={value}>
            {children}
        </RnDContext.Provider>
    );
}

export function useRnD() {
    const context = useContext(RnDContext);
    if (!context) {
        throw new Error('useRnD must be used within a RnDProvider');
    }
    return context;
}

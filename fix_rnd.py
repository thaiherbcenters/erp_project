import re

file_path = 'src/pages/RnD.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports
content = content.replace(
    "import { useState } from 'react';",
    "import React, { useState, Fragment } from 'react';"
)

content = content.replace(
    "Edit, Trash2, ArrowRight, DollarSign, Shield, Copy, Send, FileText\n} from 'lucide-react';",
    "Edit, Trash2, ArrowRight, DollarSign, Shield, Copy, Send, FileText, ChevronDown, ChevronRight\n} from 'lucide-react';"
)

# 2. Add expandedProjects state
content = content.replace(
    "const [saving, setSaving] = useState(false);",
    "const [saving, setSaving] = useState(false);\n    const [expandedProjects, setExpandedProjects] = useState([]);"
)

# 3. Update handleCreateFormula
content = content.replace(
    "const payload = { ...formulaForm, createdBy: user?.name || user?.username || 'R&D Staff' };",
    "const payload = { \n            ...formulaForm, \n            status: isPromoting ? 'อนุมัติ' : 'ร่าง',\n            createdBy: (isPromoting && formulaForm._researcher) ? formulaForm._researcher : (user?.displayName || user?.name || user?.username || 'R&D Staff') \n        };"
)

# 4. Update handlePromoteToFormula
old_promote = """    const handlePromoteToFormula = (exp) => {
        let parsedRecipe = [];
        try {
            const arr = JSON.parse(exp.trialRecipe);
            if (Array.isArray(arr)) parsedRecipe = arr;
        } catch(e) {}

        const newIngredients = parsedRecipe.length > 0 ? parsedRecipe.map(i => ({
            materialId: '', name: i.name, qty: i.qty, unit: i.unit, type: 'active', engName: '', latinName: '', partUsed: ''
        })) : [{ materialId: '', name: '', qty: 0, unit: '', type: 'active', engName: '', latinName: '', partUsed: '' }];

        setFormulaForm({
            ...emptyFormulaForm,
            name: exp.name,
            description: `พัฒนามาจากการทดลอง ${exp.code || exp.id} (โครงการ ${exp.projectCode || exp.projectId})`,
            ingredients: newIngredients
        });
        setIsPromoting(true);
        setShowCreateFormula(true);
    };"""

new_promote = """    const handlePromoteToFormula = (exp) => {
        let parsedRecipe = [];
        try {
            const arr = JSON.parse(exp.trialRecipe);
            if (Array.isArray(arr)) parsedRecipe = arr;
        } catch(e) {}

        let totalBatchSize = 0;
        let batchUnit = 'กรัม';
        const newIngredients = parsedRecipe.length > 0 ? parsedRecipe.map(i => {
            if (i.qty) totalBatchSize += parseFloat(i.qty) || 0;
            if (i.unit && batchUnit === 'กรัม') batchUnit = i.unit;
            return { materialId: '', name: i.name, qty: i.qty, unit: i.unit, type: 'active', engName: '', latinName: '', partUsed: '' };
        }) : [{ materialId: '', name: '', qty: 0, unit: '', type: 'active', engName: '', latinName: '', partUsed: '' }];

        const proj = projects.find(p => p.code === (exp.projectCode || exp.projectId));
        const researcherName = proj?.researcher || '';

        setFormulaForm({
            ...emptyFormulaForm,
            name: exp.name,
            batchSize: totalBatchSize,
            unit: batchUnit,
            _researcher: researcherName,
            description: `พัฒนามาจากการทดลอง ${exp.code || exp.id} (โครงการ ${exp.projectCode || exp.projectId})`,
            ingredients: newIngredients
        });
        setIsPromoting(true);
        setShowCreateFormula(true);
    };"""
content = content.replace(old_promote, new_promote)

# 5. Hide draft action button for experiment-derived formulas
old_btn = """                                            {formula.status === 'ร่าง' && (
                                                <button className="btn-sm" style={{ color: '#f59e0b' }} onClick={() => handleStatusChange(formula, 'รอทดสอบ')} title="ส่งให้ QC ทดสอบ"><ArrowRight size={14} /></button>
                                            )}"""
new_btn = """                                            {formula.status === 'ร่าง' && (!formula.description || !formula.description.includes('พัฒนามาจากการทดลอง')) && (
                                                <button className="btn-sm" style={{ color: '#f59e0b' }} onClick={() => handleStatusChange(formula, 'รอทดสอบ')} title="ส่งให้ QC ทดสอบ"><ArrowRight size={14} /></button>
                                            )}"""
content = content.replace(old_btn, new_btn)


# 6. Redesign renderProjects UI
old_render_projects = """    const renderProjects = () => {
        const filtered = projects.filter(p =>
            p.name.includes(searchTerm) || p.code.includes(searchTerm) || p.category.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="rnd-projects">

                <div className="toolbar">
                    <div className="toolbar-left">
                        {hasSectionPermission('rnd_projects_search') && (
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input type="text" placeholder="ค้นหาโครงการ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                                <button className="search-btn">ค้นหา</button>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {canCreate('rnd_projects') && (
                            <button className="btn-primary" onClick={() => setShowCreateProject(true)}><Plus size={16} /> สร้างโครงการใหม่</button>
                        )}
                    </div>
                </div>

                {hasSectionPermission('rnd_projects_table') && (
                    <div className="card table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>รหัส</th><th>ชื่อโครงการ</th><th>หมวดหมู่</th><th>นักวิจัย</th>
                                    <th>เริ่มต้น</th><th>เป้าหมาย</th><th>เฟส</th><th>Progress</th>
                                    <th>สูตรอ้างอิง</th><th>สถานะ</th><th style={{ textAlign: 'right' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(project => (
                                    <tr key={project.id}>
                                        <td className="text-bold">{project.code}</td>
                                        <td>{project.name}</td>
                                        <td><span className="badge badge-info">{project.category}</span></td>
                                        <td>{project.researcher}</td>
                                        <td>{project.startDate}</td>
                                        <td>{project.targetDate}</td>
                                        <td><span className="badge badge-neutral">{project.phase}</span></td>
                                        <td>
                                            <div className="progress-container">
                                                <div className="progress-bar" style={{ width: `${project.progress}%`, backgroundColor: project.progress === 100 ? 'var(--success, #43a047)' : 'var(--primary, #7b7bf5)' }}></div>
                                                <span className="progress-text">{project.progress}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            {project.formulaRef ? (
                                                <button className="rnd-formula-link" onClick={() => {
                                                    const fm = formulas.find(f => f.id === project.formulaRef);
                                                    if (fm) setSelectedFormula(fm);
                                                }}>
                                                    {project.formulaRef}
                                                </button>
                                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                        <td><span className={`badge ${getStatusColor(project.status)}`}>{project.status}</span></td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                                <button className="doc-action-btn" style={{ color: '#4f46e5' }} title="บันทึกผลทดลอง" onClick={() => handleOpenCreateExperiment(project)}>
                                                    <Beaker size={16} />
                                                </button>
                                                {canDelete('rnd_projects') && (
                                                    <button className="doc-action-btn doc-action-btn-danger" style={{ color: '#ef4444' }} title="ลบ" onClick={() => handleDeleteProject(project.code)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ตารางผลทดลอง */}
                <div className="card table-card" style={{ marginTop: 16 }}>
                    <h3 className="card-title"><Beaker size={16} style={{ color: '#7b7bf5' }} /> ผลการทดลองทั้งหมด ({experiments.length})</h3>
                    <table className="data-table">
                        <thead>
                            <tr><th>รหัส</th><th>โครงการ</th><th>ชื่อการทดลอง</th><th>อ้างอิงสูตร</th><th>สูตร/สัดส่วนที่ทดลอง</th><th>วันที่</th><th>ผลลัพธ์</th><th>หมายเหตุ</th><th style={{ textAlign: 'right' }}>จัดการ</th></tr>
                        </thead>
                        <tbody>
                            {experiments.map(exp => (
                                <tr key={exp.id}>
                                    <td className="text-bold">{exp.code}</td>
                                    <td>{exp.projectCode}</td>
                                    <td>{exp.name}</td>
                                    <td>{exp.formulaRef ? <span className="badge badge-info">{exp.formulaRef}</span> : '-'}</td>
                                    <td>
                                        <div style={{ maxWidth: 250, fontSize: 12 }}>
                                            {(() => {
                                                try {
                                                    const arr = JSON.parse(exp.trialRecipe);
                                                    if (Array.isArray(arr)) {
                                                        return <ul style={{ margin: 0, paddingLeft: 16 }}>{arr.map((item, i) => <li key={i}>{item.name}: {item.qty} {item.unit}</li>)}</ul>;
                                                    }
                                                } catch(e) {}
                                                return exp.trialRecipe || '-';
                                            })()}
                                        </div>
                                    </td>
                                    <td>{exp.date}</td>
                                    <td><span className={`badge ${getResultColor(exp.result)}`}>{exp.result}</span></td>
                                    <td>{exp.note}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, flexWrap: 'wrap' }}>
                                            {(exp.result === 'รอผล' || exp.result === 'รอประเมิน') && (
                                                <button className="doc-action-btn" style={{ color: '#6b7280' }} title="แก้ไข" onClick={() => handleEditExperiment(exp)}>
                                                    <Edit size={16} />
                                                </button>
                                            )}
                                            
                                            {exp.result === 'รอผล' && (
                                                <button className="doc-action-btn" style={{ color: '#3b82f6' }} title="ส่งให้เภสัชกร" onClick={() => handleUpdateExperimentStatus(exp, 'รอประเมิน')} disabled={saving}>
                                                    <Send size={16} />
                                                </button>
                                            )}
                                            

                                            {exp.result === 'ผ่าน' && (
                                                <>
                                                    <button className="doc-action-btn" style={{ color: '#10b981' }} title="พิมพ์ใบรับรองความปลอดภัย" onClick={() => {
                                                        let ingredients = [];
                                                        try { ingredients = JSON.parse(exp.trialRecipe) || []; } catch(e) {}
                                                        let defaultUnitSize = 5;
                                                        if (exp.formulaRef) {
                                                            const refFormula = formulas.find(f => f.id === exp.formulaRef);
                                                            if (refFormula && refFormula.unitSize) defaultUnitSize = refFormula.unitSize;
                                                        }
                                                        handlePrintExperimentCertificate(exp, ingredients, { targetUnits: 1000, unitSize: defaultUnitSize, totalWeightGrams: 1000 * defaultUnitSize });
                                                    }}>
                                                        <FileText size={16} />
                                                    </button>
                                                    
                                                    {canUpdate('rnd_projects') && !formulas.some(f => f.description && f.description.includes(exp.code || exp.id)) && (
                                                        <button className="doc-action-btn" style={{ color: '#8b5cf6' }} title="ขึ้นสูตรหลัก" onClick={() => handlePromoteToFormula(exp)}>
                                                            <ArrowRight size={16} />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };"""

new_render_projects = """    const toggleProjectExpand = (code) => {
        setExpandedProjects(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
    };

    const renderProjects = () => {
        const filtered = projects.filter(p =>
            p.name.includes(searchTerm) || p.code.includes(searchTerm) || p.category.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="rnd-projects">

                <div className="toolbar">
                    <div className="toolbar-left">
                        {hasSectionPermission('rnd_projects_search') && (
                            <div className="search-group">
                                <div className="search-input-wrap">
                                    <Search size={16} />
                                    <input type="text" placeholder="ค้นหาโครงการ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                                <button className="search-btn">ค้นหา</button>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {canCreate('rnd_projects') && (
                            <button className="btn-primary" onClick={() => setShowCreateProject(true)}><Plus size={16} /> สร้างโครงการใหม่</button>
                        )}
                    </div>
                </div>

                {hasSectionPermission('rnd_projects_table') && (
                    <div className="card table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40, textAlign: 'center' }}></th>
                                    <th>รหัส</th><th>ชื่อโครงการ</th><th>หมวดหมู่</th><th>นักวิจัย</th>
                                    <th>เริ่มต้น</th><th>เป้าหมาย</th><th>เฟส</th><th>Progress</th>
                                    <th>สูตรอ้างอิง</th><th>สถานะ</th><th style={{ textAlign: 'right' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(project => {
                                    const isExpanded = expandedProjects.includes(project.code);
                                    const projectExps = experiments.filter(e => e.projectCode === project.code);

                                    return (
                                        <Fragment key={project.id}>
                                            <tr style={{ cursor: 'pointer', backgroundColor: isExpanded ? '#f8fafc' : 'transparent' }} onClick={() => toggleProjectExpand(project.code)}>
                                                <td style={{ textAlign: 'center' }}>
                                                    {isExpanded ? <ChevronDown size={18} style={{ color: '#4f46e5' }} /> : <ChevronRight size={18} style={{ color: '#94a3b8' }} />}
                                                </td>
                                                <td className="text-bold">{project.code}</td>
                                                <td>{project.name}</td>
                                                <td><span className="badge badge-info">{project.category}</span></td>
                                                <td>{project.researcher}</td>
                                                <td>{project.startDate}</td>
                                                <td>{project.targetDate}</td>
                                                <td><span className="badge badge-neutral">{project.phase}</span></td>
                                                <td>
                                                    <div className="progress-container">
                                                        <div className="progress-bar" style={{ width: `${project.progress}%`, backgroundColor: project.progress === 100 ? 'var(--success, #43a047)' : 'var(--primary, #7b7bf5)' }}></div>
                                                        <span className="progress-text">{project.progress}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {project.formulaRef ? (
                                                        <button className="rnd-formula-link" onClick={(e) => {
                                                            e.stopPropagation();
                                                            const fm = formulas.find(f => f.id === project.formulaRef);
                                                            if (fm) setSelectedFormula(fm);
                                                        }}>
                                                            {project.formulaRef}
                                                        </button>
                                                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                </td>
                                                <td><span className={`badge ${getStatusColor(project.status)}`}>{project.status}</span></td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                                        <button className="doc-action-btn" style={{ color: '#4f46e5' }} title="บันทึกผลทดลอง" onClick={(e) => { e.stopPropagation(); handleOpenCreateExperiment(project); }}>
                                                            <Beaker size={16} />
                                                        </button>
                                                        {canDelete('rnd_projects') && (
                                                            <button className="doc-action-btn doc-action-btn-danger" style={{ color: '#ef4444' }} title="ลบ" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.code); }}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            {isExpanded && (
                                                <tr className="nested-row">
                                                    <td colSpan="12" style={{ padding: 0, backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                                                        <div style={{ padding: '16px 24px 24px 56px' }}>
                                                            <h4 style={{ margin: '0 0 12px 0', color: '#4b5563', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <Beaker size={16} style={{ color: '#7b7bf5' }} /> ผลการทดลองในโครงการนี้ ({projectExps.length})
                                                            </h4>
                                                            {projectExps.length > 0 ? (
                                                                <table className="data-table" style={{ background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderRadius: 8, overflow: 'hidden' }}>
                                                                    <thead style={{ background: '#f1f5f9' }}>
                                                                        <tr>
                                                                            <th style={{ padding: '8px 12px' }}>รหัส</th>
                                                                            <th style={{ padding: '8px 12px' }}>ชื่อการทดลอง</th>
                                                                            <th style={{ padding: '8px 12px' }}>อ้างอิงสูตร</th>
                                                                            <th style={{ padding: '8px 12px' }}>สูตร/สัดส่วนที่ทดลอง</th>
                                                                            <th style={{ padding: '8px 12px' }}>วันที่</th>
                                                                            <th style={{ padding: '8px 12px' }}>ผลลัพธ์</th>
                                                                            <th style={{ padding: '8px 12px' }}>หมายเหตุ</th>
                                                                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>จัดการ</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {projectExps.map(exp => (
                                                                            <tr key={exp.id}>
                                                                                <td className="text-bold" style={{ padding: '8px 12px' }}>{exp.code}</td>
                                                                                <td style={{ padding: '8px 12px' }}>{exp.name}</td>
                                                                                <td style={{ padding: '8px 12px' }}>{exp.formulaRef ? <span className="badge badge-info">{exp.formulaRef}</span> : '-'}</td>
                                                                                <td style={{ padding: '8px 12px' }}>
                                                                                    <div style={{ maxWidth: 250, fontSize: 12 }}>
                                                                                        {(() => {
                                                                                            try {
                                                                                                const arr = JSON.parse(exp.trialRecipe);
                                                                                                if (Array.isArray(arr)) {
                                                                                                    return <ul style={{ margin: 0, paddingLeft: 16 }}>{arr.map((item, i) => <li key={i}>{item.name}: {item.qty} {item.unit}</li>)}</ul>;
                                                                                                }
                                                                                            } catch(e) {}
                                                                                            return exp.trialRecipe || '-';
                                                                                        })()}
                                                                                    </div>
                                                                                </td>
                                                                                <td style={{ padding: '8px 12px' }}>{exp.date}</td>
                                                                                <td style={{ padding: '8px 12px' }}><span className={`badge ${getResultColor(exp.result)}`}>{exp.result}</span></td>
                                                                                <td style={{ padding: '8px 12px' }}>{exp.note}</td>
                                                                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, flexWrap: 'wrap' }}>
                                                                                        {(exp.result === 'รอผล' || exp.result === 'รอประเมิน') && (
                                                                                            <button className="doc-action-btn" style={{ color: '#6b7280' }} title="แก้ไข" onClick={(e) => { e.stopPropagation(); handleEditExperiment(exp); }}>
                                                                                                <Edit size={16} />
                                                                                            </button>
                                                                                        )}
                                                                                        
                                                                                        {exp.result === 'รอผล' && (
                                                                                            <button className="doc-action-btn" style={{ color: '#3b82f6' }} title="ส่งให้เภสัชกร" onClick={(e) => { e.stopPropagation(); handleUpdateExperimentStatus(exp, 'รอประเมิน'); }} disabled={saving}>
                                                                                                <Send size={16} />
                                                                                            </button>
                                                                                        )}
                                                                                        
                                                                                        {exp.result === 'ผ่าน' && (
                                                                                            <>
                                                                                                <button className="doc-action-btn" style={{ color: '#10b981' }} title="พิมพ์ใบรับรองความปลอดภัย" onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    let ingredients = [];
                                                                                                    try { ingredients = JSON.parse(exp.trialRecipe) || []; } catch(err) {}
                                                                                                    let defaultUnitSize = 5;
                                                                                                    if (exp.formulaRef) {
                                                                                                        const refFormula = formulas.find(f => f.id === exp.formulaRef);
                                                                                                        if (refFormula && refFormula.unitSize) defaultUnitSize = refFormula.unitSize;
                                                                                                    }
                                                                                                    handlePrintExperimentCertificate(exp, ingredients, { targetUnits: 1000, unitSize: defaultUnitSize, totalWeightGrams: 1000 * defaultUnitSize });
                                                                                                }}>
                                                                                                    <FileText size={16} />
                                                                                                </button>
                                                                                                
                                                                                                {canUpdate('rnd_projects') && !formulas.some(f => (f.description && f.description.includes(exp.code || exp.id)) || f.name === exp.name + ' (จากผลทดลอง)') && (
                                                                                                    <button className="doc-action-btn" style={{ color: '#8b5cf6' }} title="ขึ้นสูตรหลัก" onClick={(e) => { e.stopPropagation(); handlePromoteToFormula(exp); }}>
                                                                                                        <ArrowRight size={16} />
                                                                                                    </button>
                                                                                                )}
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            ) : (
                                                                <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                                                                    ยังไม่มีผลการทดลองในโครงการนี้
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };"""

if old_render_projects in content:
    content = content.replace(old_render_projects, new_render_projects)
else:
    print("Could not find old_render_projects in content!")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement successful")

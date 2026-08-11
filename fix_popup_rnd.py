import os
import re

file_path = r'C:\Users\thaih\OneDrive\เอกสาร\GitHub\erp_project\src\pages\RnD.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace state
content = content.replace(
    "const [expandedProjects, setExpandedProjects] = useState([]);",
    "const [selectedProjectForView, setSelectedProjectForView] = useState(null);"
)

new_render_projects = """    const renderProjectDetailsModal = () => {
        if (!selectedProjectForView) return null;
        
        const project = selectedProjectForView;
        const projectExps = experiments.filter(e => e.projectCode === project.code);

        return (
            <div className="modal-overlay" onClick={() => setSelectedProjectForView(null)}>
                <div className="modal-content" style={{ width: 1000, maxWidth: '95%' }} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3><Beaker size={18} style={{ color: '#4f46e5', marginRight: 8 }}/> ผลการทดลอง: โครงการ {project.code} ({project.name})</h3>
                        <button className="btn-close" onClick={() => setSelectedProjectForView(null)}><XCircle size={20} /></button>
                    </div>
                    <div className="modal-body" style={{ background: '#f8fafc', padding: 20 }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h4 style={{ margin: 0, color: '#1e293b' }}>รายการทดลองทั้งหมด ({projectExps.length})</h4>
                            <button className="btn-primary btn-sm" onClick={() => { setSelectedProjectForView(null); setShowCreateExperiment(true); }}>
                                <Beaker size={14} style={{ marginRight: 4 }}/> บันทึกผลทดลองใหม่
                            </button>
                        </div>
                        
                        {projectExps.length > 0 ? (
                            <table className="data-table" style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: 8 }}>
                                <thead style={{ background: '#f1f5f9' }}>
                                    <tr>
                                        <th style={{ padding: '12px' }}>รหัส</th>
                                        <th style={{ padding: '12px' }}>ชื่อการทดลอง</th>
                                        <th style={{ padding: '12px' }}>อ้างอิงสูตร</th>
                                        <th style={{ padding: '12px' }}>สูตร/สัดส่วนที่ทดลอง</th>
                                        <th style={{ padding: '12px' }}>วันที่</th>
                                        <th style={{ padding: '12px' }}>ผลลัพธ์</th>
                                        <th style={{ padding: '12px' }}>หมายเหตุ</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectExps.map(exp => (
                                        <tr key={exp.id}>
                                            <td className="text-bold" style={{ padding: '12px' }}>{exp.code}</td>
                                            <td style={{ padding: '12px' }}>{exp.name}</td>
                                            <td style={{ padding: '12px' }}>{exp.formulaRef ? <span className="badge badge-info">{exp.formulaRef}</span> : '-'}</td>
                                            <td style={{ padding: '12px' }}>
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
                                            <td style={{ padding: '12px' }}>{exp.date}</td>
                                            <td style={{ padding: '12px' }}><span className={`badge ${getResultColor(exp.result)}`}>{exp.result}</span></td>
                                            <td style={{ padding: '12px' }}>{exp.note}</td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, flexWrap: 'wrap' }}>
                                                    {(exp.result === 'รอผล' || exp.result === 'รอประเมิน') && (
                                                        <button className="doc-action-btn" style={{ color: '#6b7280' }} title="แก้ไข" onClick={() => { setSelectedProjectForView(null); handleEditExperiment(exp); }}>
                                                            <Edit size={16} />
                                                        </button>
                                                    )}
                                                    
                                                    {exp.result === 'รอผล' && (
                                                        <button className="doc-action-btn" style={{ color: '#3b82f6' }} title="ส่งให้เภสัชกร" onClick={() => { setSelectedProjectForView(null); handleUpdateExperimentStatus(exp, 'รอประเมิน'); }} disabled={saving}>
                                                            <Send size={16} />
                                                        </button>
                                                    )}

                                                    {exp.result === 'ผ่าน' && (
                                                        <>
                                                            <button className="doc-action-btn" style={{ color: '#10b981' }} title="พิมพ์ใบรับรองความปลอดภัย" onClick={() => {
                                                                // Print Logic To Be Implemented Later
                                                            }}>
                                                                <FileText size={16} />
                                                            </button>
                                                            
                                                            {canUpdate('rnd_projects') && !formulas.some(f => (f.description && f.description.includes(exp.code || exp.id)) || f.name === exp.name + ' (จากผลทดลอง)') && (
                                                                <button className="doc-action-btn" style={{ color: '#8b5cf6' }} title="ขึ้นสูตรหลัก" onClick={() => { setSelectedProjectForView(null); handlePromoteToFormula(exp); }}>
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
                            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                                <FlaskConical size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                                <div>ยังไม่มีผลการทดลองในโครงการนี้</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
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
                                                <button className="doc-action-btn" style={{ color: '#4f46e5' }} title="ดูผลการทดลอง" onClick={() => setSelectedProjectForView(project)}>
                                                    <Eye size={16} />
                                                </button>
                                                <button className="doc-action-btn" style={{ color: '#10b981' }} title="บันทึกผลทดลอง" onClick={() => setShowCreateExperiment(true)}>
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
            </div>
        );
    };"""

pattern = re.compile(r'    const toggleProjectExpand = \(code\) => \{.*?(?=    // ══════════════════════════════════════════════════════════════════\n    // Formula Detail)', re.DOTALL)

if pattern.search(content):
    content = pattern.sub(new_render_projects + '\n\n', content)
    
    # Check if {selectedProjectForView && renderProjectDetailsModal()} needs to be added to the main render
    # It should be placed around where showCreateExperiment is
    if "{selectedProjectForView && renderProjectDetailsModal()}" not in content:
        content = content.replace(
            "{showCreateExperiment && renderCreateExperimentModal()}",
            "{showCreateExperiment && renderCreateExperimentModal()}\n            {selectedProjectForView && renderProjectDetailsModal()}"
        )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced renderProjects successfully.")
else:
    print("Could not find the target section to replace.")

import os
import re

file_path = r'C:\Users\thaih\OneDrive\เอกสาร\GitHub\erp_project\src\pages\RnD.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

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
                                                        <button className="doc-action-btn" style={{ color: '#4f46e5' }} title="บันทึกผลทดลอง" onClick={(e) => { e.stopPropagation(); setShowCreateExperiment(true); }}>
                                                            <Beaker size={16} />
                                                        </button>
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

# Use regex to find and replace the old renderProjects function
pattern = re.compile(r'    const renderProjects = \(\) => \{.*?(?=    // ══════════════════════════════════════════════════════════════════\n    // Formula Detail)', re.DOTALL)

if pattern.search(content):
    content = pattern.sub(new_render_projects + '\n\n', content)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced renderProjects successfully.")
else:
    print("Could not find the target section to replace.")

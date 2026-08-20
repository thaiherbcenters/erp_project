const fs = require('fs');
const file = 'src/pages/Operator.jsx';
let content = fs.readFileSync(file, 'utf8');

const startIdx = content.indexOf('{/* QC History for this task */}');
const endMarker = '</div>\n                        )}';
const nextMarker = '{/* RIGHT PANEL */}';
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const oldBlock = content.substring(startIdx, endIdx + endMarker.length);
    const newBlock = `{/* Unified Work History (Only visible in Production History for completed/rejected tasks) */}
                        {(task.status === 'เสร็จสิ้น' || task.status === 'คัดทิ้ง') && (
                            <div className="op-qc-history">
                                <h4 style={{ margin: '16px 0 12px', fontSize: 14, fontWeight: 700, color: '#334155' }}>📋 ประวัติการทำงานและเอกสาร</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {taskTimeline.map((ev, i) => (
                                        <div key={i} className={\`op-qc-history-item \${ev.status === 'ไม่ผ่าน' ? 'failed' : ev.status === 'รอดำเนินการ' ? 'pending' : 'passed'}\`} style={{ borderLeftColor: ev.status === 'ไม่ผ่าน' ? '#ef4444' : ev.status === 'รอดำเนินการ' ? '#f59e0b' : '#10b981' }}>
                                            <div className="op-qc-history-top" style={{ flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span className="op-qc-history-type" style={{ fontSize: 13 }}>{ev.title}</span>
                                                </div>
                                                {ev.status && <span className={\`badge \${['เสร็จสิ้น', 'ผ่าน', 'อนุมัติจ่ายของแล้ว'].includes(ev.status) ? 'badge-success' : ev.status === 'ไม่ผ่าน' ? 'badge-danger' : 'badge-warning'}\`}>{ev.status}</span>}
                                            </div>
                                            <div className="op-qc-history-meta" style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b', marginTop: 8, flexWrap: 'wrap' }}>
                                                <span>📅 {ev.time && !isNaN(new Date(ev.time)) ? new Date(ev.time).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : 'ไม่ระบุเวลา'}</span>
                                                {ev.by && ev.by !== '-' && <span>👤 โดย: {ev.by}</span>}
                                            </div>
                                            {ev.notes && <div className="op-qc-history-note" style={{ marginTop: 8, fontSize: 12 }}>📝 หมายเหตุ: {ev.notes}</div>}
                                            {ev.docType && (
                                                <div style={{ marginTop: 10 }}>
                                                    <button 
                                                        className="btn-secondary" 
                                                        style={{ fontSize: 12, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #bae6fd', color: '#0284c7', background: '#fff' }}
                                                        onClick={() => handleViewPdf(ev.docType, ev.taskId)}
                                                    >
                                                        <FileText size={14} /> 
                                                        {ev.docType === 'rm_req' ? 'ดูใบเบิกวัตถุดิบ (PDF)' : ev.docType === 'pkg_req' ? 'ดูใบเบิกบรรจุภัณฑ์ (PDF)' : 'ดูใบตรวจ QC (PDF)'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {taskTimeline.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8' }}>ยังไม่มีประวัติการทำงาน</div>}
                                </div>
                            </div>
                        )}`;
    
    content = content.replace(oldBlock, newBlock);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Successfully replaced block!");
} else {
    console.log("Failed to find boundaries");
}

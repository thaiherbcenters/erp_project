const fs = require('fs');
const file = 'src/pages/Operator.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
if (!content.includes('FileText')) {
    content = content.replace('import { ', 'import { FileText, ');
}

// 2. State
const stateMarker = 'const [selectedTask, setSelectedTask] = useState(null);';
if (content.includes(stateMarker) && !content.includes('const [taskTimeline, setTaskTimeline]')) {
    content = content.replace(stateMarker, stateMarker + '\n    const [taskTimeline, setTaskTimeline] = useState([]);');
}

// 3. fetchTimeline logic
const fetchEffect = `    useEffect(() => {
        const fetchTimeline = async () => {
            if (!selectedTask) {
                setTaskTimeline([]);
                return;
            }
            try {
                const res = await fetch(\`\${API_BASE}/production/tasks/\${selectedTask.id}/timeline\`);
                if (res.ok) {
                    const data = await res.json();
                    setTaskTimeline(data);
                }
            } catch (err) {
                console.error("Failed to fetch timeline", err);
            }
        };
        fetchTimeline();
    }, [selectedTask]);`;

if (!content.includes('fetchTimeline = async')) {
    const effectMarker = 'useEffect(() => {'; // First useEffect
    content = content.replace(effectMarker, fetchEffect + '\n\n    ' + effectMarker);
}

// 4. View PDF logic
const viewPdfFn = `    const handleViewPdf = async (type, id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(\`\${API_BASE}/print/\${type === 'rm_req' ? 'stock/requisition' : type === 'pkg_req' ? 'packaging/requisition' : 'qc/request'}/\${id}\`, {
                headers: { 'Authorization': \`Bearer \${token}\` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else {
                alert('ไม่สามารถเปิดเอกสารได้ หรือเอกสารไม่มีอยู่จริง');
            }
        } catch (err) {
            console.error('Error opening PDF:', err);
        }
    };`;

if (!content.includes('const handleViewPdf')) {
    content = content.replace('const handleCompleteTask', viewPdfFn + '\n\n    const handleCompleteTask');
}

// 5. Replace the QC history block with unified history
const oldBlockStart = '{/* QC History for this task */}';
const oldBlockEnd = '</div>\n                        )}';
const oldBlockRegex = /\{\/\* QC History for this task \*\/\}[\s\S]*?<\/div>\n\s*\)\}/;

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

if (content.match(oldBlockRegex)) {
    content = content.replace(oldBlockRegex, newBlock);
} else {
    console.log("Could not find the old QC block!");
}

fs.writeFileSync(file, content, 'utf8');
console.log("Successfully rebuilt Operator.jsx logic!");

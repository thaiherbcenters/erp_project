const fs = require('fs');
let content = fs.readFileSync('src/pages/Operator.jsx', 'utf8');

// 1. Add taskTimeline state
const stateBlock = `
    const [taskTimeline, setTaskTimeline] = useState([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
`;
content = content.replace('const [qtyModal, setQtyModal] = useState({ open: false, targetTask: null, currentProduced: 0, currentDefect: 0 });', 'const [qtyModal, setQtyModal] = useState({ open: false, targetTask: null, currentProduced: 0, currentDefect: 0 });' + stateBlock);

// 2. Add useEffect for timeline
const effectBlock = `
    useEffect(() => {
        if (!selectedTask || (selectedTask.status !== 'เสร็จสิ้น' && selectedTask.status !== 'คัดทิ้ง')) {
            setTaskTimeline([]);
            return;
        }
        const fetchTimeline = async () => {
            setLoadingTimeline(true);
            try {
                const res = await fetch(\`\${API_BASE}/production/tasks/\${selectedTask.id}/timeline\`, {
                    headers: { 'Authorization': \`Bearer \${localStorage.getItem('token')}\` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTaskTimeline(data);
                }
            } catch (err) {
                console.error('Error fetching timeline:', err);
            } finally {
                setLoadingTimeline(false);
            }
        };
        fetchTimeline();
    }, [selectedTask]);

    const handleViewPdf = async (url) => {
        try {
            const res = await fetch(url, { headers: { 'Authorization': \`Bearer \${localStorage.getItem('token')}\` } });
            if (!res.ok) throw new Error('Failed to load PDF');
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
        } catch (err) {
            console.error(err);
            showAlert('ผิดพลาด', 'ไม่สามารถโหลดเอกสาร PDF ได้', 'error');
        }
    };
`;
content = content.replace('const handleAdvanceStep = (taskId, extraPayload = {}) => {', effectBlock + '\\n    const handleAdvanceStep = (taskId, extraPayload = {}) => {');

// 3. Replace QC history block
const oldQcBlock = `                        {/* QC History for this task */}
                        {qcReqForTask.length > 0 && (
                            <div className="op-qc-history">
                                <h4 style={{ margin: '16px 0 12px', fontSize: 14, fontWeight: 700, color: '#334155' }}>📋 ประวัติ QC ของงานนี้</h4>
                                {qcReqForTask.map(r => (
                                    <div key={r.id} className={\`op-qc-history-item \${r.status === 'ผ่าน' ? 'passed' : r.status === 'ไม่ผ่าน' ? 'failed' : 'pending'}\`}>
                                        <div className="op-qc-history-top">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span className="op-qc-history-type">{r.typeLabel}</span>
                                                <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{r.id}</span>
                                            </div>
                                            <span className={\`badge \${r.status === 'ผ่าน' ? 'badge-success' : r.status === 'ไม่ผ่าน' ? 'badge-danger' : 'badge-warning'}\`}>{r.status}</span>
                                        </div>
                                        <div className="op-qc-history-meta">
                                            <span>📅 ส่ง: {r.requestedAt}</span>
                                            {r.inspectedAt && <span>✅ ตรวจ: {r.inspectedAt}</span>}
                                            {r.inspector && <span>👤 โดย: {r.inspector}</span>}
                                        </div>
                                        {r.notes && <div className="op-qc-history-note">💬 {r.notes}</div>}
                                    </div>
                                ))}
                            </div>
                        )}`;

const newQcBlock = `                        {/* Unified Work History (Only visible in Production History for completed/rejected tasks) */}
                        {(task.status === 'เสร็จสิ้น' || task.status === 'คัดทิ้ง') && (
                            <div className="op-qc-history">
                                <h4 style={{ margin: '16px 0 12px', fontSize: 14, fontWeight: 700, color: '#334155' }}>📋 ประวัติการทำงานและเอกสาร</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {taskTimeline.map((ev, i) => (
                                        <div key={i} className={\`op-qc-history-item \${ev.status === 'ไม่ผ่าน' ? 'failed' : ev.status === 'รอดำเนินการ' ? 'pending' : 'passed'}\`} style={{ borderLeftColor: ev.status === 'ไม่ผ่าน' ? '#ef4444' : ev.status === 'รอดำเนินการ' ? '#f59e0b' : '#10b981' }}>
                                            <div className="op-qc-history-top" style={{ flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span className="op-qc-history-type" style={{ fontSize: 13 }}>{ev.title}</span>
                                                    <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{ev.refId}</span>
                                                </div>
                                                {ev.status && <span className={\`badge \${ev.status === 'ไม่ผ่าน' ? 'badge-danger' : ev.status === 'รอดำเนินการ' ? 'badge-warning' : 'badge-success'}\`}>{ev.status}</span>}
                                            </div>
                                            <div className="op-qc-history-meta">
                                                <span>📅 {ev.timestamp}</span>
                                                {ev.actor && <span>👤 โดย: {ev.actor}</span>}
                                                {ev.documentUrl && (
                                                    <button onClick={() => handleViewPdf(ev.documentUrl)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 12, textDecoration: 'underline', padding: 0, marginLeft: 8 }}>
                                                        ดูเอกสาร (PDF)
                                                    </button>
                                                )}
                                            </div>
                                            {ev.details && <div className="op-qc-history-note" style={{ marginTop: 6, fontSize: 12 }}>💬 {ev.details}</div>}
                                        </div>
                                    ))}
                                    {loadingTimeline && <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: 8 }}>กำลังโหลดประวัติ...</div>}
                                </div>
                            </div>
                        )}`;

content = content.replace(oldQcBlock, newQcBlock);
fs.writeFileSync('src/pages/Operator.jsx', content, 'utf8');
console.log('Restored taskTimeline');

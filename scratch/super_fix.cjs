const fs = require('fs');

function applyFixes() {
    let content = fs.readFileSync('src/pages/Operator.jsx', 'utf8');

    // 1. Fix useAuth
    content = content.replace('const { user,', 'const { currentUser: user,');

    // 2. Timeline states
    const stateRegex = /const \[checklist, setChecklist\] = useState\(\{ wip: null, raw: false, pkg: false \}\);/;
    const timelineStates = `const [checklist, setChecklist] = useState({ wip: null, raw: false, pkg: false });
    const [taskTimeline, setTaskTimeline] = useState([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);`;
    content = content.replace(stateRegex, timelineStates);

    // 3. Timeline useEffect
    const useEffectRegex = /const handleAdvanceStep = \(taskId, extraPayload = \{\}\) => \{/;
    const timelineEffect = `useEffect(() => {
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

    const handleAdvanceStep = (taskId, extraPayload = {}) => {`;
    content = content.replace(useEffectRegex, timelineEffect);

    // 4. History Block
    const oldQcRegex = /\{\/\* QC History for this task \*\/\}.*?<\/div>[\s\n]*\)/s;
    const newQcBlock = `{/* Unified Work History (Only visible in Production History for completed/rejected tasks) */}
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
    content = content.replace(oldQcRegex, newQcBlock);

    // 5. WipChecklist Requisition function
    const wipRegex = /const handleSendWipCard = async \(\) => \{/;
    const handleRequisition = `const handleSendRequisition = async () => {
        const confirmed = await showConfirm(
            'ยืนยันการขอเบิกวัตถุดิบ (WIP)', 
            \`คุณต้องการส่งใบเบิก "\${wipData.name}" จำนวน \${wipData.requiredQty.toLocaleString()} \${wipData.unit} จากคลังสินค้าใช่หรือไม่?\`, 
            'info'
        );
        if (!confirmed) return;

        setIsSending(true);
        try {
            const res = await fetch(\`\${API_BASE}/production/tasks/\${task.id}/requisition\`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
                },
                body: JSON.stringify({
                    requisitionItems: [{
                        id: wipData.id,
                        name: wipData.name,
                        deductQty: wipData.requiredQty,
                        unit: wipData.unit
                    }],
                    requesterName: user?.name || user?.username || 'ผู้ปฏิบัติงาน'
                })
            });

            if (res.ok) {
                showAlert('สำเร็จ', 'ส่งใบเบิกสินค้ากึ่งสำเร็จรูปไปยังคลังสินค้าเรียบร้อยแล้ว', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                const data = await res.json();
                showAlert('ผิดพลาด', data.message || 'ไม่สามารถส่งใบเบิกได้', 'error');
            }
        } catch (err) {
            console.error(err);
            showAlert('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleSendWipCard = async () => {`;
    content = content.replace(wipRegex, handleRequisition);

    // 6. WipChecklist bottom button
    const bottomBtnRegex = /<div style=\{\{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 \}\}>[\s\S]*?<ChevronRight size=\{16\} \/> ไปขั้นตอนถัดไป: รอเบิกจ่าย[\s\S]*?<\/div>/;
    const newBottomBtn = `<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button 
                    className="op-btn op-btn-start" 
                    disabled={!isEnough || isSending}
                    style={{ opacity: (!isEnough || isSending) ? 0.5 : 1, padding: '10px 24px', fontSize: 15, background: '#1d4ed8', borderColor: '#1e40af' }}
                    onClick={handleSendRequisition}
                >
                    <ChevronRight size={16} /> บันทึกและส่งใบเบิกวัตถุดิบ (WIP)
                </button>
            </div>`;
    content = content.replace(bottomBtnRegex, newBottomBtn);

    fs.writeFileSync('src/pages/Operator.jsx', content, 'utf8');
}
applyFixes();
console.log('All fixes applied perfectly.');

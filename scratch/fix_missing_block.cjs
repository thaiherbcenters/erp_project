const fs = require('fs');
let content = fs.readFileSync('src/pages/Operator.jsx', 'utf8');

const missingBlock = `    const [selectedTaskLogs, setSelectedTaskLogs] = useState([]);
    const [logForm, setLogForm] = useState({ producedQty: '', defectQty: '', notes: '' });
    const [isSubmittingLog, setIsSubmittingLog] = useState(false);

    // ── Production Qty Modal (ถามยอดผลิตก่อนกดผ่านขั้นตอน) ──
    const [qtyModal, setQtyModal] = useState({ open: false, taskId: null, taskName: '', expectedQty: 0, currentProduced: 0 });
    const [qtyForm, setQtyForm] = useState({ producedQty: '', defectQty: '0', notes: '' });
    const [checklist, setChecklist] = useState({ wip: null, raw: false, pkg: false });
    const [taskTimeline, setTaskTimeline] = useState([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    useEffect(() => {
        if (selectedTask) {
            fetch(\`\${API_BASE}/production/tasks/\${selectedTask.id}/logs\`)
                .then(res => res.json())`;

content = content.replace(`    const [selectedTaskLogs, setSelectedTaskLogs] = useState([]);
                .then(data => setSelectedTaskLogs(data))`, missingBlock + `\n                .then(data => setSelectedTaskLogs(data))`);

fs.writeFileSync('src/pages/Operator.jsx', content, 'utf8');
console.log('Fixed missing block');

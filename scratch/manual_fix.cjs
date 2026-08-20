const fs = require('fs');
let content = fs.readFileSync('src/pages/Operator.jsx', 'utf8');

const sendWipFn = `
    const handleSendRequisition = async () => {
        const confirmed = await showConfirm(
            'ยืนยันการขอเบิกวัตถุดิบ', 
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
                showAlert('สำเร็จ', 'ส่งใบเบิกไปยังคลังสินค้าเรียบร้อยแล้ว', 'success');
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
`;

content = content.replace('const handleSendWipCard = async () => {', sendWipFn + '\\n    const handleSendWipCard = async () => {');

// The bottom button is currently:
// <Play size={16} /> เริ่มดำเนินการบรรจุ
// We want to replace it with handleSendRequisition
content = content.replace('<Play size={16} /> เริ่มดำเนินการบรรจุ', '<ChevronRight size={16} /> บันทึกและส่งใบเบิกวัตถุดิบ');
content = content.replace('onClick={() => onComplete({ usedWip: wipData })}', 'onClick={handleSendRequisition}');

// Make sure to disable it while sending
content = content.replace('disabled={!isEnough}', 'disabled={!isEnough || isSending}');
content = content.replace('opacity: isEnough ? 1 : 0.5', 'opacity: (!isEnough || isSending) ? 0.5 : 1');

// Change style for blue button
content = content.replace(
    'padding: \\'10px 24px\\', fontSize: 15', 
    'padding: \\'10px 24px\\', fontSize: 15, background: \\'#1d4ed8\\', borderColor: \\'#1e40af\\''
);

fs.writeFileSync('src/pages/Operator.jsx', content, 'utf8');
console.log('Fixed button manually');

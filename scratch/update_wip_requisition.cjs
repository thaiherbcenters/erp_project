const fs = require('fs');
let content = fs.readFileSync('src/pages/Operator.jsx', 'utf8');

const sendWipFn = `
    const handleSendRequisition = async () => {
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
`;

content = content.replace('const handleSendWipCard = async () => {', sendWipFn + '\n    const handleSendWipCard = async () => {');

const oldButtonBlock = `            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button 
                    className="op-btn op-btn-start" 
                    disabled={!isEnough}
                    style={{ opacity: isEnough ? 1 : 0.5, padding: '10px 24px', fontSize: 15 }}
                    onClick={() => onComplete({ usedWip: wipData })}
                >
                    <ChevronRight size={16} /> ไปขั้นตอนถัดไป: รอเบิกจ่าย
                </button>
            </div>`;

const newButtonBlock = `            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button 
                    className="op-btn op-btn-start" 
                    disabled={!isEnough || isSending}
                    style={{ opacity: (!isEnough || isSending) ? 0.5 : 1, padding: '10px 24px', fontSize: 15, background: '#1d4ed8', borderColor: '#1e40af' }}
                    onClick={handleSendRequisition}
                >
                    <ChevronRight size={16} /> ยืนยันทำใบเบิก WIP และไปขั้นตอนถัดไป
                </button>
            </div>`;

content = content.replace(oldButtonBlock, newButtonBlock);

fs.writeFileSync('src/pages/Operator.jsx', content, 'utf8');
console.log('Done!');

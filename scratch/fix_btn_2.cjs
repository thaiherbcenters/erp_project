const fs = require('fs');
let content = fs.readFileSync('src/pages/Operator.jsx', 'utf8');

const oldBtn = `<ChevronRight size={16} /> ไปขั้นตอนถัดไป: รอเบิกจ่าย`;
const newBtn = `<ChevronRight size={16} /> บันทึกและส่งใบเบิกวัตถุดิบ`;

content = content.replace(oldBtn, newBtn);
content = content.replace('onClick={() => onComplete({ usedWip: wipData })}', 'onClick={handleSendRequisition}');
content = content.replace('disabled={!isEnough}', 'disabled={!isEnough || isSending}');
content = content.replace('style={{ opacity: isEnough ? 1 : 0.5, padding: \\'10px 24px\\', fontSize: 15 }}', 'style={{ opacity: (!isEnough || isSending) ? 0.5 : 1, padding: \\'10px 24px\\', fontSize: 15, background: \\'#1d4ed8\\', borderColor: \\'#1e40af\\' }}');

fs.writeFileSync('src/pages/Operator.jsx', content, 'utf8');
console.log('Fixed button');

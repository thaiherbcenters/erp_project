const fs = require('fs');
let content = fs.readFileSync('src/pages/Operator.jsx', 'utf8');
content = content.replace('<Play size={16} /> เริ่มดำเนินการบรรจุ', '<ChevronRight size={16} /> ไปขั้นตอนถัดไป: รอเบิกจ่าย');
fs.writeFileSync('src/pages/Operator.jsx', content, 'utf8');
console.log('Fixed button text in Operator.jsx');

const fs = require('fs');
const content = fs.readFileSync('C:\\project\\googlefrom-main\\bill.html', 'utf8');

const lines = content.split('\n');
let block = [];

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('ข้อมูลเพิ่มเติมเฉพาะใบกำกับภาษี')) {
        let start = Math.max(0, i - 10);
        for(let j=start; j < i + 50; j++) {
            if(lines[j]) block.push(lines[j]);
        }
        break;
    }
}

console.log(block.join('\n'));

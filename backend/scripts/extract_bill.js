const fs = require('fs');
const content = fs.readFileSync('C:\\project\\googlefrom-main\\bill.html', 'utf8');

const lines = content.split('\n');
let inSection = false;
let block = [];

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('ข้อมูลเพิ่มเติมเฉพาะใบกำกับภาษี')) {
        inSection = true;
        // Start a few lines before to catch the container
        let start = Math.max(0, i - 2);
        for(let j=start; j < i + 40; j++) {
            if(lines[j]) block.push(lines[j]);
        }
        break;
    }
}

console.log(block.join('\n'));

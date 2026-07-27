const fs = require('fs');
const content = fs.readFileSync('C:\\project\\googlefrom-main\\bill.html', 'utf8');

const lines = content.split('\n');
let block = [];
let foundHTML = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('id="customerOrderGroup"') || lines[i].includes('receiptExtraFieldsTitle')) {
        let start = Math.max(0, i - 20);
        for(let j=start; j < i + 80; j++) {
            if(lines[j]) block.push(lines[j]);
        }
        foundHTML = true;
        break;
    }
}

console.log(block.join('\n'));

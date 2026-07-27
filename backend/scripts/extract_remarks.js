const fs = require('fs');
const content = fs.readFileSync('C:/project/googlefrom-main/bill.html', 'utf8');

const regex = /const DEFAULT_NOTE_.*`([\s\S]*?)`;/g;
let match;
while ((match = regex.exec(content)) !== null) {
    console.log(`\nFound: ${match[0]}`);
}

const fs = require('fs');
const file = 'src/pages/Operator.jsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('{/* Work History for this task */}'));
const endIdx = lines.findIndex((l, idx) => idx > startIdx && l.includes(')}'));

if (startIdx !== -1 && endIdx !== -1) {
    console.log("Removing from line", startIdx, "to", endIdx);
    lines.splice(startIdx, endIdx - startIdx + 1);
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log("Success");
} else {
    console.log("Not found");
}

const fs = require('fs');
const file = 'src/pages/Planning.jsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const targetLineIndex = lines.findIndex(l => l.includes('<span>{job.formulaName}</span>') && lines[l.indexOf('<span>{job.formulaName}</span>') - 1] === undefined); // wait, that's not right.

let replaced = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<label>ผลิตภัณฑ์</label>')) {
        if (lines[i+1].includes('<span>{job.formulaName}</span>')) {
            lines[i+1] = lines[i+1].replace('<span>{job.formulaName}</span>', '<span>{job.productName || job.formulaName}</span>');
            replaced = true;
        }
    }
    if (lines[i].includes('<label>สูตรอ้างอิง (R&D)</label>')) {
        if (lines[i+1].includes('<span style={{ color: \'#2563eb\' }}>{job.formulaId}</span>')) {
            lines[i+1] = lines[i+1].replace('{job.formulaId}', '{job.formulaName} ({job.formulaId})');
            replaced = true;
        }
    }
}

if (replaced) {
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log('Successfully replaced modal fields in Planning.jsx');
} else {
    console.log('Could not find the lines to replace.');
}

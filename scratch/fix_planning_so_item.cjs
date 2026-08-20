const fs = require('fs');
const file = 'src/pages/Planning.jsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const createSOItemIndex = lines.findIndex(l => l.includes('const jobData = {'));
if (createSOItemIndex !== -1) {
    // Look for formulaName inside this object
    const formulaNameIndex = lines.findIndex((l, i) => i > createSOItemIndex && i < createSOItemIndex + 20 && l.includes('formulaName: formula.name,'));
    if (formulaNameIndex !== -1) {
        lines.splice(formulaNameIndex + 1, 0, '            productName: item.ItemName,');
        fs.writeFileSync(file, lines.join('\n'), 'utf8');
        console.log('Successfully added productName to SO item creation.');
    } else {
        console.log('Could not find formulaName line in object.');
    }
} else {
    console.log('Could not find jobData object.');
}

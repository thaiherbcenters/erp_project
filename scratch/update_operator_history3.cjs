const fs = require('fs');
const file = 'c:\\Users\\thaih\\OneDrive\\เอกสาร\\GitHub\\erp_project\\src\\pages\\Operator.jsx';
const content = fs.readFileSync(file, 'utf8');

const match = content.match(/\{historyEvents\.length === 0.*?<\/div>\n\s*<\/div>\n\s*<\/div>/);
if (match) {
    console.log("MATCHED:\n", match[0]);
    const replaced = content.replace(match[0], match[0] + '\n                        )}');
    fs.writeFileSync(file, replaced, 'utf8');
    console.log("Replaced successfully!");
} else {
    console.log("NO MATCH");
}

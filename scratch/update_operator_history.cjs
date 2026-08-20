const fs = require('fs');

const file = 'c:\\Users\\thaih\\OneDrive\\เอกสาร\\GitHub\\erp_project\\src\\pages\\Operator.jsx';
let content = fs.readFileSync(file, 'utf8');

const regexStart = /(<div className="op-qc-history">)/g;
content = content.replace(regexStart, "{task.currentStep !== 'pending' && (\n                            $1");

const regexEnd = /(<div style=\{\{ fontSize: 13, color: '#94a3b8' \}\}>.*?<\/div>\n\s*<\/div>\n\s*<\/div>)/g;
content = content.replace(regexEnd, "$1\n                        )}");

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated Operator.jsx using regex');

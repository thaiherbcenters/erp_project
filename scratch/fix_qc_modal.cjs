const fs = require('fs');
const file = 'src/pages/QC.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('{inspectingRequest.jobOrderId} — {inspectingRequest.formulaName}', '{inspectingRequest.jobOrderId} — {inspectingRequest.productName || inspectingRequest.formulaName}');
content = content.replace('{rejectDialog.request?.batchNo} — {rejectDialog.request?.formulaName}', '{rejectDialog.request?.batchNo} — {rejectDialog.request?.productName || rejectDialog.request?.formulaName}');
content = content.replace('{r.batchNo} — {r.formulaName} ({r.typeLabel})', '{r.batchNo} — {r.productName || r.formulaName} ({r.typeLabel})');
content = content.replace('<td>{t.formulaName}</td>', '<td>{t.productName || t.formulaName}</td>');

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully replaced modal fields in QC.jsx');

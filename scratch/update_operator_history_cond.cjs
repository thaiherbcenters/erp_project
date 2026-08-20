const fs = require('fs');
const file = 'src/pages/Operator.jsx';
let content = fs.readFileSync(file, 'utf8');

// Find the line with task.currentStep !== 'pending'
const oldStr = "{task.currentStep !== 'pending' && (";
const newStr = "{(task.status === 'เสร็จสิ้น' || task.status === 'คัดทิ้ง') && (";

if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Successfully replaced condition!");
} else {
    console.log("String not found");
}

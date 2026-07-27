const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../src/components/TaxInvoiceForm.jsx');
let content = fs.readFileSync(file, 'utf8');

const replacement = `const DEFAULT_NORMAL_NOTES = \`<div style="font-weight:bold; font-size: 9pt;">เงื่อนไข & ข้อตกลง :</div>
<div style="font-size: 8.5pt; margin-left: 10px; line-height: 1.5;">
    1. สินค้าที่ผลิตไม่สามารถเปลี่ยนแปลง ยกเลิก หรือคืนในกรณีการสั่งผลิตสินค้า ยกเว้นสินค้ามีปัญหาจากกระบวนการผลิต<br>
    2. การตรวจรับสินค้าให้ตรวจสอบหลังรับสินค้า ต้องรายงานภายในวันเท่านั้น มิฉะนั้นถือว่ายอมรับสินค้าที่ส่งมอบ<br>
    3. สินค้าที่มอบแล้วจะไม่สามารถเปลี่ยนแปลงใดๆ ขอสงวนสิทธิ์เรียกชำระเงินตามมูลค่าสินค้าที่ส่งมอบ
</div>\`;

const DEFAULT_FDA_NOTES = DEFAULT_NORMAL_NOTES;`;

// Replace everything between const DEFAULT_NORMAL_NOTES = ... and the end of DEFAULT_FDA_NOTES string.
// Since it's multiline, we can use a regex that matches until the next function or variable.
content = content.replace(/const DEFAULT_NORMAL_NOTES[\s\S]*?const DEFAULT_FDA_NOTES[\s\S]*?<\/div>`;/m, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated notes in TaxInvoiceForm.jsx');

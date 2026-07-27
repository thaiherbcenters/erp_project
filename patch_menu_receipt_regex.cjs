const fs = require('fs');
const path = 'src/data/mockData.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /(\{\s*id:\s*'sales_delivery_order',\s*name:\s*'Delivery Order',\s*sections:\s*\[\s*\{\s*id:\s*'sales_delivery_order_search',\s*name:\s*'ค้นหาใบส่งสินค้า'\s*\},\s*\{\s*id:\s*'sales_delivery_order_table',\s*name:\s*'ตารางใบส่งสินค้า'\s*\}\s*,\s*\]\s*,\s*\})/;

const insertStr = `
      {
        id: 'sales_receipt', name: 'Receipt',
        sections: [
          { id: 'sales_receipt_search', name: 'ค้นหาใบเสร็จรับเงิน' },
          { id: 'sales_receipt_table', name: 'ตารางใบเสร็จรับเงิน' },
        ],
      },`;

if (regex.test(content)) {
    content = content.replace(regex, `$1${insertStr}`);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Patched mockData.js with Regex!");
} else {
    console.log("Regex not found in mockData.js");
}

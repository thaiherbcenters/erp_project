const fs = require('fs');
let content = fs.readFileSync('src/data/mockData.js', 'utf8');

const targetStr = `      {
        id: 'sales_delivery_order', name: 'Delivery Order',
        sections: [
          { id: 'sales_delivery_order_search', name: 'ค้นหาใบส่งสินค้า' },
          { id: 'sales_delivery_order_table', name: 'ตารางใบส่งสินค้า' },
        ],
      },`;

const insertStr = `      {
        id: 'sales_delivery_order', name: 'Delivery Order',
        sections: [
          { id: 'sales_delivery_order_search', name: 'ค้นหาใบส่งสินค้า' },
          { id: 'sales_delivery_order_table', name: 'ตารางใบส่งสินค้า' },
        ],
      },
      {
        id: 'sales_receipt', name: 'Receipt',
        sections: [
          { id: 'sales_receipt_search', name: 'ค้นหาใบเสร็จรับเงิน' },
          { id: 'sales_receipt_table', name: 'ตารางใบเสร็จรับเงิน' },
        ],
      },`;

// Handle LF vs CRLF
const targetCRLF = targetStr;
const targetLF = targetStr.replace(/\r\n/g, '\n');
const insertLF = insertStr.replace(/\r\n/g, '\n');

if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, insertStr);
    console.log("Patched mockData.js (CRLF)");
} else if (content.includes(targetLF)) {
    content = content.replace(targetLF, insertLF);
    console.log("Patched mockData.js (LF)");
} else {
    console.log("Target not found in mockData.js");
}

fs.writeFileSync('src/data/mockData.js', content, 'utf8');

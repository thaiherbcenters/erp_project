const fs = require('fs');

let content = fs.readFileSync('src/components/DeliveryOrderForm.jsx', 'utf8');

// Replace standard terms
content = content.replace(/DeliveryOrder/g, 'Receipt')
                 .replace(/deliveryOrder/g, 'receipt')
                 .replace(/delivery-orders/g, 'receipts')
                 .replace(/Delivery Order/g, 'Receipt')
                 .replace(/ใบแจ้งหนี้\/ใบส่งสินค้า/g, 'ใบเสร็จรับเงิน (ต้นฉบับ)')
                 .replace(/DELIVERY ORDER/g, 'RECEIPT (ORIGINAL)')
                 .replace(/ใบส่งสินค้า/g, 'ใบเสร็จรับเงิน'); // Just in case

fs.writeFileSync('src/components/ReceiptForm.jsx', content, 'utf8');
console.log('ReceiptForm.jsx created successfully.');

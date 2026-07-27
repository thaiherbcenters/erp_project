const fs = require('fs');

const doContent = fs.readFileSync('routes/deliveryOrders.js', 'utf8');

let receiptContent = doContent
    .replace(/DeliveryOrder/g, 'Receipt')
    .replace(/deliveryOrder/g, 'receipt')
    .replace(/delivery-order/g, 'receipt')
    .replace(/Delivery Order/g, 'Receipt')
    .replace(/delivery-orders/g, 'receipts');

fs.writeFileSync('routes/receipts.js', receiptContent, 'utf8');
console.log('receipts.js created successfully.');

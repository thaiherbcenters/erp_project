const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, '../../src/components/BillingInvoiceForm.jsx');
const destFile = path.join(__dirname, '../../src/components/TaxInvoiceForm.jsx');

let content = fs.readFileSync(srcFile, 'utf8');

// Replace standard variables and class names
content = content.replace(/billingInvoices/g, 'taxInvoices');
content = content.replace(/billingInvoice/g, 'taxInvoice');
content = content.replace(/BillingInvoice/g, 'TaxInvoice');
content = content.replace(/billing-invoices/g, 'tax-invoices');
// Change specific texts
content = content.replace(/ใบวางบิล\/ใบแจ้งหนี้/g, 'ใบแจ้งหนี้/ใบส่งสินค้า');
content = content.replace(/Billing Note\/Invoice/g, 'Invoice/Delivery Order');
// We will manually fix other parts later (like the print layout)

fs.writeFileSync(destFile, content, 'utf8');
console.log('Successfully generated TaxInvoiceForm.jsx');

const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, '../routes/billingInvoices.js');
const destFile = path.join(__dirname, '../routes/taxInvoices.js');

let content = fs.readFileSync(srcFile, 'utf8');

// Replacements
content = content.replace(/billingInvoices/g, 'taxInvoices');
content = content.replace(/billingInvoice/g, 'taxInvoice');
content = content.replace(/BillingInvoice/g, 'TaxInvoice');
content = content.replace(/createBillingInvoiceSchema/g, 'createTaxInvoiceSchema');

fs.writeFileSync(destFile, content, 'utf8');
console.log('Successfully generated taxInvoices.js');

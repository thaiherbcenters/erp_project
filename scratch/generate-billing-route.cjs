const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../backend/routes/quotations.js');
const outputPath = path.join(__dirname, '../backend/routes/billingInvoices.js');

let content = fs.readFileSync(inputPath, 'utf8');

// Replacements (order matters)
content = content.replace(/QuotationItemHistory/g, 'BillingInvoiceItemHistory');
content = content.replace(/QuotationHistory/g, 'BillingInvoiceHistory');
content = content.replace(/QuotationItem/g, 'BillingInvoiceItem');
content = content.replace(/QuotationID/g, 'BillingInvoiceID');
content = content.replace(/QuotationNo/g, 'BillingInvoiceNo');
content = content.replace(/Quotation/g, 'BillingInvoice');
content = content.replace(/createQuotationSchema/g, 'createBillingInvoiceSchema');
content = content.replace(/validators\/quotations/g, 'validators/billingInvoices');
content = content.replace(/quotationNo/g, 'billingInvoiceNo');
content = content.replace(/quotations/g, 'billing-invoices');
content = content.replace(/quotation/g, 'billingInvoice');
content = content.replace(/QT-/g, 'BI-');
content = content.replace(/category === 'billingInvoice'/g, "category === 'quotation'"); // fix potential over-replacement
content = content.replace(/DocType LIKE 'billingInvoice_%'/g, "1=1"); // Remove category filtering
content = content.replace(/DocType NOT LIKE 'billingInvoice_%'/g, "1=0"); // Remove category filtering

fs.writeFileSync(outputPath, content, 'utf8');
console.log('Created backend/routes/billingInvoices.js');

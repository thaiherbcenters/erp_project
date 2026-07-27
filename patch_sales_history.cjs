const fs = require('fs');
let content = fs.readFileSync('src/pages/Sales.jsx', 'utf-8');

const oldBlock = `            let endpoint = \`\${API_BASE}/quotations/\${id}/history\`;
            if (docType === 'BillingInvoice') endpoint = \`\${API_BASE}/billing-invoices/\${id}/history\`;
            if (docType === 'TaxInvoice') endpoint = \`\${API_BASE}/tax-invoices/\${id}/history\`;`;

const newBlock = `            let endpoint = \`\${API_BASE}/quotations/\${id}/history\`;
            if (docType === 'BillingInvoice') endpoint = \`\${API_BASE}/billing-invoices/\${id}/history\`;
            if (docType === 'TaxInvoice') endpoint = \`\${API_BASE}/tax-invoices/\${id}/history\`;
            if (docType === 'DeliveryOrder') endpoint = \`\${API_BASE}/delivery-orders/\${id}/history\`;`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync('src/pages/Sales.jsx', content, 'utf-8');
console.log('Fixed handleViewHistory for Delivery Order!');

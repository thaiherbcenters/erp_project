const fs = require('fs');
let content = fs.readFileSync('src/pages/Sales.jsx', 'utf-8');

const targetStr = "if (docType === 'TaxInvoice') endpoint = `${API_BASE}/tax-invoices/${id}/history`;";
const insertStr = "\n            if (docType === 'DeliveryOrder') endpoint = `${API_BASE}/delivery-orders/${id}/history`;";

const index = content.indexOf(targetStr);
if (index !== -1) {
    const splitIndex = index + targetStr.length;
    content = content.substring(0, splitIndex) + insertStr + content.substring(splitIndex);
    fs.writeFileSync('src/pages/Sales.jsx', content, 'utf-8');
    console.log("Successfully injected DeliveryOrder history endpoint!");
} else {
    console.log("Could not find the target string.");
}

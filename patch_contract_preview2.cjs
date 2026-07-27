const fs = require('fs');
const path = 'src/pages/Sales.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetString = "setPreviewDocModal({ type: 'SalesOrder', id: docId });";
const replacementString = `setPreviewDocModal({ type: 'SalesOrder', id: docId });
                        } else if (docType === 'Delivery Order' || docType === 'DeliveryOrder' || docType === 'ใบส่งสินค้า') {
                            setPreviewDocModal({ type: 'DeliveryOrder', id: docId });`;

// Use simple replacement
if (content.includes(targetString)) {
    // Only replace the FIRST occurrence in the file or find the one in the specific context
    // Actually there are multiple setPreviewDocModal({ type: 'SalesOrder', id: docId });
    // Let's replace only the one that comes after `docType === 'Sales Order'`
    const regex = /(} else if \(docType === 'Sales Order' \|\| docType === 'ใบสั่งขาย' \|\| docType === 'ใบสั่งซื้อ'\) \{\s*setPreviewDocModal\(\{ type: 'SalesOrder', id: docId \}\);)/;
    if (regex.test(content)) {
        content = content.replace(regex, `$1\n                        } else if (docType === 'Delivery Order' || docType === 'DeliveryOrder' || docType === 'ใบส่งสินค้า') {\n                            setPreviewDocModal({ type: 'DeliveryOrder', id: docId });`);
        fs.writeFileSync(path, content, 'utf8');
        console.log("Successfully replaced via Regex!");
    } else {
        console.log("Regex didn't match.");
    }
} else {
    console.log("Target not found at all.");
}

const fs = require('fs');
const path = 'src/pages/Sales.jsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /(} else if \(docType === 'Delivery Order' \|\| docType === 'DeliveryOrder' \|\| docType === 'ใบส่งสินค้า'\) \{\s*setPreviewDocModal\(\{ type: 'DeliveryOrder', id: docId \}\);)/;
if (regex.test(content)) {
    content = content.replace(regex, `$1\n                        } else if (docType === 'Receipt' || docType === 'ใบเสร็จรับเงิน') {\n                            setPreviewDocModal({ type: 'Receipt', id: docId });`);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully replaced via Regex!");
} else {
    console.log("Regex didn't match.");
}

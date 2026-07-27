const fs = require('fs');
const path = 'src/pages/Sales.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetString = `} else if (docType === 'Sales Order' || docType === 'ใบสั่งขาย' || docType === 'ใบสั่งซื้อ') {
                            setPreviewDocModal({ type: 'SalesOrder', id: docId });`;

const replacementString = `} else if (docType === 'Sales Order' || docType === 'ใบสั่งขาย' || docType === 'ใบสั่งซื้อ') {
                            setPreviewDocModal({ type: 'SalesOrder', id: docId });
                        } else if (docType === 'Delivery Order' || docType === 'DeliveryOrder' || docType === 'ใบส่งสินค้า') {
                            setPreviewDocModal({ type: 'DeliveryOrder', id: docId });`;

// Try CRLF first
let idx = content.indexOf(targetString);
if (idx !== -1) {
    content = content.substring(0, idx) + replacementString + content.substring(idx + targetString.length);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully replaced (CRLF/Original Match)");
} else {
    // Try LF
    const targetStringLF = targetString.replace(/\r\n/g, '\n');
    idx = content.indexOf(targetStringLF);
    if (idx !== -1) {
        const replacementStringLF = replacementString.replace(/\r\n/g, '\n');
        content = content.substring(0, idx) + replacementStringLF + content.substring(idx + targetStringLF.length);
        fs.writeFileSync(path, content, 'utf8');
        console.log("Successfully replaced (LF Match)");
    } else {
        console.log("Could not find the target string in Sales.jsx");
    }
}

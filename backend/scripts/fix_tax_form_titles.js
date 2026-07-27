const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../src/components/TaxInvoiceForm.jsx');
let content = fs.readFileSync(file, 'utf8');

// For FDA (Thai only)
content = content.replace(
    /ใบแจ้งหนี้\/ใบส่งสินค้า\n\s*<\/td>/g,
    `{formData.docType.includes('delivery_order') ? 'ใบส่งสินค้า' : 'ใบแจ้งหนี้/ใบส่งสินค้า'}
                                    </td>`
);

// For Normal Thai
content = content.replace(
    /<div style={{ fontSize: '14pt', fontWeight: 'bold' }}>\{isEn \? 'Invoice\/Delivery Order' : 'ใบแจ้งหนี้\/ใบส่งสินค้า'\}<\/div>/g,
    `<div style={{ fontSize: '14pt', fontWeight: 'bold' }}>
                                                    {isEn ? 
                                                        (formData.docType.includes('delivery_order') ? 'Delivery Order' : 'Invoice/Delivery Order') : 
                                                        (formData.docType.includes('delivery_order') ? 'ใบส่งสินค้า' : 'ใบแจ้งหนี้/ใบส่งสินค้า')}
                                                </div>`
);

// Normal header
content = content.replace(
    /<div style={{ fontSize: '11pt', fontWeight: 'bold' }}>ใบแจ้งหนี้\/ใบส่งสินค้า<\/div>/g,
    `<div style={{ fontSize: '11pt', fontWeight: 'bold' }}>{formData.docType.includes('delivery_order') ? 'ใบส่งสินค้า' : 'ใบแจ้งหนี้/ใบส่งสินค้า'}</div>`
);
content = content.replace(
    /<div style={{ fontSize: '10pt', fontWeight: 'bold' }}>Invoice\/Delivery Order<\/div>/g,
    `<div style={{ fontSize: '10pt', fontWeight: 'bold' }}>{formData.docType.includes('delivery_order') ? 'Delivery Order' : 'Invoice/Delivery Order'}</div>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully fixed title logic in TaxInvoiceForm.jsx');

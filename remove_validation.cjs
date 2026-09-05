const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'BillingInvoiceForm.jsx',
    'DeliveryOrderForm.jsx',
    'QuotationForm.jsx',
    'ReceiptForm.jsx',
    'TaxInvoiceForm.jsx'
];

filesToUpdate.forEach(fileName => {
    const filePath = path.join(__dirname, 'src', 'components', fileName);
    let content = fs.readFileSync(filePath, 'utf8');

    // Pattern to match the validation block:
    // if (!formData.customerTypeId) {
    //     showAlert('ข้อผิดพลาด', 'กรุณาระบุประเภทลูกค้าก่อนบันทึก', 'warning');
    //     return;
    // }
    
    // Using regex to replace it
    const regex = /[ \t]*if\s*\(\!formData\.customerTypeId\)\s*\{\s*showAlert\(['"]ข้อผิดพลาด['"],\s*['"]กรุณาระบุประเภทลูกค้าก่อนบันทึก['"],\s*['"]warning['"]\);\s*return;\s*\}/g;
    
    const newContent = content.replace(regex, '');
    
    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ Removed customerTypeId validation in ${fileName}`);
    } else {
        console.log(`⚠️ Pattern not found in ${fileName}`);
    }
});

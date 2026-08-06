const fs = require('fs');
const file = 'backend/pdf_templates/contract_mfg/page0_config.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const tableFields = [
    'Auto Field 42', 'Auto Field 42_copy', 'Auto Field 42_copy_copy', 'Auto Field 42_copy_copy_copy', // row numbers
    'Auto Field 46', 'Auto Field 46_copy', 'Auto Field 46_copy_copy', 'Auto Field 46_copy_copy_copy', // regNo
    'Auto Field 50', 'Auto Field 50_copy', 'Auto Field 50_copy_copy', 'Auto Field 50_copy_copy_copy', // brandName
    'Auto Field 54', 'Auto Field 54_copy', 'Auto Field 54_copy_copy', 'Auto Field 54_copy_copy_copy'  // productName
];

data.fields.forEach(f => {
    if (f.pageIndex === 4 && tableFields.includes(f.name)) {
        f.align = 'center';
        f.valign = 'middle';
    }
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Updated JSON mapping for table alignment.');

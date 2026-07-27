const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../src/components/TaxInvoiceForm.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Change default value
content = content.replace(
    /docType: 'billing_invoice_thc', \/\/ billing_invoice_thc, billing_invoice_psf, billing_invoice_elt/g,
    "docType: 'tax_invoice_thc', // tax_invoice_thc, tax_invoice_psf, tax_invoice_elt, delivery_order_thc"
);
content = content.replace(
    /docType: data.DocType \|\| 'billing_invoice_thc'/g,
    "docType: data.DocType || 'tax_invoice_thc'"
);

// 2. Change prefix for auto-generate number
content = content.replace(
    "const prefix = formData.docType.includes('psf') ? 'BI-PSF' : 'BI';",
    "const prefix = formData.docType.includes('psf') ? 'IV-PSF' : formData.docType.includes('elt') ? 'IV-ELT' : 'IV';"
);

// 3. Change dropdown options
const optionsRegex = /<CustomSelect name="docType" value=\{formData\.docType\} onChange=\{handleFormChange\} required>[\s\S]*?<\/CustomSelect>/;
const newOptions = `<CustomSelect name="docType" value={formData.docType} onChange={handleFormChange} required>
                                    <option value="tax_invoice_thc">ใบแจ้งหนี้/ใบส่งสินค้า (Invoice/Delivery Order) - THC</option>
                                    <option value="delivery_order_thc">ใบส่งสินค้า (Delivery Order) - THC</option>
                                    <option value="tax_invoice_psf">ใบแจ้งหนี้/ใบส่งสินค้า (Invoice/Delivery Order) - PSF</option>
                                    <option value="delivery_order_psf">ใบส่งสินค้า (Delivery Order) - PSF</option>
                                    <option value="tax_invoice_elt">ใบแจ้งหนี้/ใบส่งสินค้า (Invoice/Delivery Order) - ELT</option>
                                    <option value="delivery_order_elt">ใบส่งสินค้า (Delivery Order) - ELT</option>
                                </CustomSelect>`;
content = content.replace(optionsRegex, newOptions);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully fixed docType options in TaxInvoiceForm.jsx');

const fs = require('fs');

const filePath = 'src/pages/Sales.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

const taxBlockStart = "{/* ── Tab: Invoice/Delivery Order (ใบแจ้งหนี้/ใบส่งสินค้า) ── */}";
const salesOrderStart = "{/* History Modal (Global for Quotation, BillingInvoice, TaxInvoice) */}";

if (!content.includes('sales_delivery_order')) {
    const startIdx = content.indexOf(taxBlockStart);
    const endIdx = content.indexOf(salesOrderStart);

    if (startIdx !== -1 && endIdx !== -1) {
        let taxBlock = content.slice(startIdx, endIdx);
        let doBlock = taxBlock.replace(/sales_tax_invoice/g, 'sales_delivery_order');
        doBlock = doBlock.replace(/TaxInvoiceForm/g, 'DeliveryOrderForm');
        doBlock = doBlock.replace(/TaxInvoice/g, 'DeliveryOrder');
        doBlock = doBlock.replace(/taxInvoice/g, 'deliveryOrder');
        doBlock = doBlock.replace(/ใบแจ้งหนี้\/ใบส่งสินค้า \(Invoice\/Delivery Order\)/g, 'ใบส่งสินค้า DELIVERY ORDER');
        doBlock = doBlock.replace(/ใบแจ้งหนี้\/ใบส่งสินค้า/g, 'ใบส่งสินค้า');
        
        const newContent = content.slice(0, endIdx) + doBlock + "\n            " + content.slice(endIdx);
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log('Patched Sales.jsx with UI block');
    } else {
        console.log('Could not find start or end index for UI block');
    }
} else {
    console.log('sales_delivery_order already exists in Sales.jsx');
}

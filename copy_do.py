import os
import re

with open('src/components/TaxInvoiceForm.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('taxInvoice', 'deliveryOrder')
content = content.replace('TaxInvoice', 'DeliveryOrder')
content = content.replace('tax-invoices', 'delivery-orders')
content = content.replace('Tax Invoice', 'Delivery Order')
content = content.replace('IV-', 'DO-')
content = content.replace('ใบแจ้งหนี้/ใบส่งสินค้า', 'ใบส่งสินค้า DELIVERY ORDER')
content = content.replace('ใบแจ้งหนี้', 'ใบส่งสินค้า')
content = content.replace('TaxInvoiceForm', 'DeliveryOrderForm')
content = content.replace('DeliveryOrderForm_recovery_test', 'DeliveryOrderForm')

with open('src/components/DeliveryOrderForm.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')

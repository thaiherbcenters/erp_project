import os

file_path = 'src/components/DeliveryOrderForm.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('INVOICE/DELIVERY ORDER', 'DELIVERY ORDER')
content = content.replace('tax_invoice_', 'delivery_order_')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced INVOICE/DELIVERY ORDER and tax_invoice_ options")

import os
import sys

def patch_file(file_path, type_name, id_name):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add CustomerID to INSERT INTO columns
    search1 = f"INSERT INTO {type_name} (\n                {id_name}, ContractID"
    replace1 = f"INSERT INTO {type_name} (\n                CustomerID, {id_name}, ContractID"
    content = content.replace(search1, replace1)

    # 2. Add CustomerID to UPDATE SET
    search2 = f"UPDATE {type_name} SET\n                {id_name} = @{id_name.lower()}"
    if type_name == 'BillingInvoice':
        search2 = f"UPDATE {type_name} SET\n                {id_name} = @billingInvoiceNo"
    
    replace2 = f"UPDATE {type_name} SET\n                CustomerID = @customerId, {id_name} = @{id_name.lower()}"
    if type_name == 'BillingInvoice':
        replace2 = f"UPDATE {type_name} SET\n                CustomerID = @customerId, {id_name} = @billingInvoiceNo"

    content = content.replace(search2, replace2)

    # 3. Add request.input('customerId', ...) for PUT route (and maybe POST if missing)
    # The simplest way is to find request.input(id_name.lower()) and insert customerId before it.
    
    # We should only replace the ones that are part of the header input, not random things.
    # Actually, in POST we ALREADY added @customerId to VALUES. And customerId is mapped in req.body.
    # We just need to make sure request.input('customerId') exists.
    # I'll just use regex or simple string replacement.
    
    search3_q = f"request.input('{id_name.lower()}', sql.NVarChar"
    if type_name == 'BillingInvoice':
        search3_q = f"request.input('billingInvoiceNo', sql.NVarChar"
        
    replace3_q = f"request.input('customerId', sql.Int, customerId || null);\n        {search3_q}"
    
    if "request.input('customerId', sql.Int, customerId || null);" not in content:
        content = content.replace(search3_q, replace3_q)
    else:
        # What if it's in POST but not in PUT?
        parts = content.split('// 4. Update existing')
        if len(parts) == 2:
            if "request.input('customerId'" not in parts[1]:
                parts[1] = parts[1].replace(search3_q, replace3_q)
                content = '// 4. Update existing'.join(parts)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Patched {file_path}")

patch_file('c:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/backend/routes/quotations.js', 'Quotation', 'QuotationNo')
patch_file('c:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/backend/routes/billingInvoices.js', 'BillingInvoice', 'BillingInvoiceNo')

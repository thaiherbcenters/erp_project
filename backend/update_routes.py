import os
import re

def update_file(filepath, table_name, history_table):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Update GET routes to ensure CustomerID is selected. (Usually SELECT * or specific)
    # If it is specific, we might need to add CustomerID.
    # Actually, GET /:id does SELECT * FROM TaxInvoice, so it will automatically include CustomerID!
    # But for GET /, it does SELECT TaxInvoiceID, TaxInvoiceNo... Let's add CustomerID there.
    content = re.sub(rf'(SELECT\s+)(\b{table_name}ID\b)', r'\1CustomerID, \2', content)

    # 2. Add customerId to destructured req.body
    content = re.sub(r'(const\s+{\s*)(\n\s*)(\w+No,\s*docType)', r'\1\2customerId, \3', content)

    # 3. Add customerId to request.input in POST
    # Find the line request.input('docType'
    content = re.sub(r"(\s+request\.input\('docType',)", r"\n        request.input('customerId', sql.Int, customerId || null);\1", content)

    # 4. Add CustomerID to INSERT INTO (POST)
    # INSERT INTO TableName (
    content = re.sub(rf"(INSERT INTO {table_name} \(\n\s*)([A-Za-z0-9_]+No,)", r"\1CustomerID, \2", content)
    # VALUES (
    content = re.sub(r"(VALUES \(\n\s*)(@[A-Za-z0-9_]+No,)", r"\1@customerId, \2", content)

    # 5. Add CustomerID to backup history INSERT INTO
    content = re.sub(rf"(SELECT \n\s*)({table_name}ID,)", r"\1CustomerID, \2", content)
    content = re.sub(rf"(SELECT \n\s*)(@[a-z]+Id,\s*)({table_name}ID,)", r"\1\2CustomerID, \3", content)
    # wait, the backup query in PUT is: SELECT TaxInvoiceID, Revision... FROM TaxInvoice
    # wait, it inserts into TaxInvoiceHistory (HistoryID, TaxInvoiceID, ...) but uses default output or similar?
    # Let's check how the backup query is written. It uses OUTPUT INSERTED.HistoryID SELECT ... FROM TableName.
    # We should add CustomerID there too.
    content = re.sub(rf"(SELECT\s+\n\s*)({table_name}ID,\s*Revision,)", r"\1CustomerID, \2", content)
    content = re.sub(rf"(INSERT INTO {history_table} \(\n\s*)({table_name}ID,\s*Revision,)", r"\1CustomerID, \2", content)

    # 6. Add CustomerID to UPDATE in PUT
    content = re.sub(rf"(UPDATE {table_name} SET\n\s*)([A-Za-z0-9_]+No = @[A-Za-z0-9_]+No,)", r"\1CustomerID = @customerId, \2", content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

update_file('c:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/backend/routes/taxInvoices.js', 'TaxInvoice', 'TaxInvoiceHistory')
update_file('c:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/backend/routes/billingInvoices.js', 'BillingInvoice', 'BillingInvoiceHistory')
update_file('c:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/backend/routes/quotations.js', 'Quotation', 'QuotationHistory')

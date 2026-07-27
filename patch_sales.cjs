const fs = require('fs');
let content = fs.readFileSync('src/pages/Sales.jsx', 'utf8');

content = content.replace(
    /onClick=\{\(\) => \{\s*setEditingQuotationId\(q\.QuotationID \|\| q\.id\);\s*setIsViewOnly\(true\);\s*setIsHistoryView\(false\);\s*setShowQuotationForm\(true\);\s*\}\}/g,
    "onClick={() => setPreviewDocModal({ type: 'Quotation', id: q.QuotationID || q.id })}"
);

content = content.replace(
    /onClick=\{\(\) => \{\s*setEditingBillingInvoiceId\(q\.BillingInvoiceID \|\| q\.id\);\s*setIsViewOnly\(true\);\s*setIsHistoryView\(false\);\s*setShowBillingInvoiceForm\(true\);\s*\}\}/g,
    "onClick={() => setPreviewDocModal({ type: 'BillingInvoice', id: q.BillingInvoiceID || q.id })}"
);

content = content.replace(
    /if \(historyType === 'billing_invoice'\) \{\s*setEditingBillingInvoiceId\(`history-\$\{h\.HistoryID\}`\);\s*setIsViewOnly\(true\);\s*setIsHistoryView\(true\);\s*setShowBillingInvoiceForm\(true\);\s*\} else \{\s*setEditingQuotationId\(`history-\$\{h\.HistoryID\}`\);\s*setIsViewOnly\(true\);\s*setIsHistoryView\(true\);\s*setShowQuotationForm\(true\);\s*\}/g,
    "if (historyType === 'billing_invoice') { setPreviewDocModal({ type: 'BillingInvoice', id: `history-${h.HistoryID}` }); } else { setPreviewDocModal({ type: 'Quotation', id: `history-${h.HistoryID}` }); }"
);

fs.writeFileSync('src/pages/Sales.jsx', content);

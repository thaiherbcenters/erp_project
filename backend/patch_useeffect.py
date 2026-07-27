import os

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    search_str = """    useEffect(() => {
        if (editId && customerList.length > 0 && !formData.customerId && formData.customerName) {
            const matched = customerList.find(c => c.CustomerName?.trim() === formData.customerName?.trim());
            if (matched) {
                setFormData(prev => ({ 
                    ...prev, 
                    customerId: matched.CustomerID,
                    customerTypeId: prev.customerTypeId || matched.CustomerTypeID || ''
                }));
            }
        }
    }, [editId, customerList, formData.customerName, formData.customerId]);"""

    replace_str = """    useEffect(() => {
        if (editId && customerList.length > 0) {
            if (formData.customerId && !formData.customerTypeId) {
                const matched = customerList.find(c => String(c.CustomerID) === String(formData.customerId));
                if (matched) {
                    setFormData(prev => ({ ...prev, customerTypeId: matched.CustomerTypeID || '' }));
                }
            } else if (!formData.customerId && formData.customerName) {
                const matched = customerList.find(c => c.CustomerName?.trim() === formData.customerName?.trim());
                if (matched) {
                    setFormData(prev => ({ 
                        ...prev, 
                        customerId: matched.CustomerID,
                        customerTypeId: prev.customerTypeId || matched.CustomerTypeID || ''
                    }));
                }
            }
        }
    }, [editId, customerList, formData.customerName, formData.customerId, formData.customerTypeId]);"""

    if search_str in content:
        content = content.replace(search_str, replace_str)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {filepath}")
    else:
        print(f"Could not find search string in {filepath}")

patch_file('c:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/src/components/TaxInvoiceForm.jsx')
patch_file('c:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/src/components/BillingInvoiceForm.jsx')
patch_file('c:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/src/components/QuotationForm.jsx')

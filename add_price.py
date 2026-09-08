import os

files_to_modify = [
    'src/components/QuotationForm.jsx',
    'src/components/BillingInvoiceForm.jsx',
    'src/components/DeliveryOrderForm.jsx',
    'src/components/ReceiptForm.jsx',
    'src/components/TaxInvoiceForm.jsx'
]

for filepath in files_to_modify:
    if not os.path.exists(filepath):
        print(f"File {filepath} not found")
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update initial state
    content = content.replace(
        "const [addProductModal, setAddProductModal] = useState({ visible: false, targetItemId: null, name: '', image: null });",
        "const [addProductModal, setAddProductModal] = useState({ visible: false, targetItemId: null, name: '', image: null, price: '' });"
    )

    # 2. Update setAddProductModal calls when opening modal
    content = content.replace(
        "setAddProductModal({ visible: true, targetItemId: item.id, name: '', image: null });",
        "setAddProductModal({ visible: true, targetItemId: item.id, name: '', image: null, price: '' });"
    )

    # 3. Update modal UI: add Price input
    old_ui = '''                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>ชื่อสินค้า <span className="required">*</span></label>
                                <input
                                    type="text"
                                    value={addProductModal.name}
                                    onChange={(e) => setAddProductModal({ ...addProductModal, name: e.target.value })}
                                    autoFocus
                                    placeholder="ระบุชื่อสินค้า..."
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                                />
                            </div>'''
                            
    new_ui = '''                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>ชื่อสินค้า <span className="required">*</span></label>
                                <input
                                    type="text"
                                    value={addProductModal.name}
                                    onChange={(e) => setAddProductModal({ ...addProductModal, name: e.target.value })}
                                    autoFocus
                                    placeholder="ระบุชื่อสินค้า..."
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                                />
                            </div>
                            
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>ราคาตั้งต้น (บาท)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={addProductModal.price}
                                    onChange={(e) => setAddProductModal({ ...addProductModal, price: e.target.value })}
                                    placeholder="ระบุราคา..."
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                                />
                            </div>'''
                            
    content = content.replace(old_ui, new_ui)

    # 4. Update the logic block when "OK" is clicked
    old_logic = '''                                        const newProduct = { name: val, image: addProductModal.image };
                                        const newCustom = [...customProducts, newProduct];
                                        setCustomProducts(newCustom);
                                        localStorage.setItem('customProducts', JSON.stringify(newCustom));
                                        if (addProductModal.targetItemId) {
                                            handleItemChange(addProductModal.targetItemId, 'name', val);
                                        }
                                        setAddProductModal({ visible: false, targetItemId: null, name: '', image: null });'''
                                        
    new_logic = '''                                        const newProduct = { name: val, image: addProductModal.image, price: addProductModal.price ? Number(addProductModal.price) : 0 };
                                        const newCustom = [...customProducts, newProduct];
                                        setCustomProducts(newCustom);
                                        localStorage.setItem('customProducts', JSON.stringify(newCustom));
                                        if (addProductModal.targetItemId) {
                                            handleItemChange(addProductModal.targetItemId, 'name', val);
                                            if (addProductModal.price) {
                                                handleItemChange(addProductModal.targetItemId, 'price', Number(addProductModal.price));
                                            }
                                        }
                                        setAddProductModal({ visible: false, targetItemId: null, name: '', image: null, price: '' });'''
                                        
    content = content.replace(old_logic, new_logic)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Updated {filepath}")

const fs = require('fs');
let content = fs.readFileSync('src/pages/Sales.jsx', 'utf8');

// 1. Add Import
if (!content.includes('import ReceiptForm')) {
    content = content.replace(
        "import DeliveryOrderForm from '../components/DeliveryOrderForm';",
        "import DeliveryOrderForm from '../components/DeliveryOrderForm';\nimport ReceiptForm from '../components/ReceiptForm';"
    );
}

// 2. Add States
if (!content.includes('const [receiptPagination')) {
    content = content.replace(
        "const [deliveryOrderPagination, setDeliveryOrderPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalRecords: 0 });",
        "const [deliveryOrderPagination, setDeliveryOrderPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalRecords: 0 });\n    const [receiptPagination, setReceiptPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalRecords: 0 });"
    );
    content = content.replace(
        "const [deliveryOrderSearch, setDeliveryOrderSearch] = useState('');",
        "const [deliveryOrderSearch, setDeliveryOrderSearch] = useState('');\n    const [receiptSearch, setReceiptSearch] = useState('');"
    );
    content = content.replace(
        "const [appliedDeliveryOrderSearch, setAppliedDeliveryOrderSearch] = useState('');",
        "const [appliedDeliveryOrderSearch, setAppliedDeliveryOrderSearch] = useState('');\n    const [appliedReceiptSearch, setAppliedReceiptSearch] = useState('');"
    );
    content = content.replace(
        "const [showDeliveryOrderForm, setShowDeliveryOrderForm] = useState(false);",
        "const [showDeliveryOrderForm, setShowDeliveryOrderForm] = useState(false);\n    const [showReceiptForm, setShowReceiptForm] = useState(false);"
    );
}

// 3. Add to API states & useEffect
if (!content.includes('const [receipts, setReceipts] = useState([]);')) {
    content = content.replace(
        "const [deliveryOrders, setDeliveryOrders] = useState([]);",
        "const [deliveryOrders, setDeliveryOrders] = useState([]);\n    const [receipts, setReceipts] = useState([]);"
    );
    
    const fetchBlock = `} else if (activeTab === 'sales_delivery_order') {
                const res = await fetch(\`\${API_BASE}/delivery-orders?page=\${deliveryOrderPagination.page}&limit=\${deliveryOrderPagination.limit}&search=\${encodeURIComponent(appliedDeliveryOrderSearch)}\`);
                const json = await res.json();
                if (json.success) {
                    setDeliveryOrders(json.data);
                    if (json.pagination) setDeliveryOrderPagination(prev => ({ ...prev, totalPages: json.pagination.totalPages }));
                }
            }`;
    const newFetchBlock = `} else if (activeTab === 'sales_delivery_order') {
                const res = await fetch(\`\${API_BASE}/delivery-orders?page=\${deliveryOrderPagination.page}&limit=\${deliveryOrderPagination.limit}&search=\${encodeURIComponent(appliedDeliveryOrderSearch)}\`);
                const json = await res.json();
                if (json.success) {
                    setDeliveryOrders(json.data);
                    if (json.pagination) setDeliveryOrderPagination(prev => ({ ...prev, totalPages: json.pagination.totalPages }));
                }
            } else if (activeTab === 'sales_receipt') {
                const res = await fetch(\`\${API_BASE}/receipts?page=\${receiptPagination.page}&limit=\${receiptPagination.limit}&search=\${encodeURIComponent(appliedReceiptSearch)}\`);
                const json = await res.json();
                if (json.success) {
                    setReceipts(json.data);
                    if (json.pagination) setReceiptPagination(prev => ({ ...prev, totalPages: json.pagination.totalPages }));
                }
            }`;
    content = content.replace(fetchBlock, newFetchBlock);
    
    content = content.replace(
        "    }, [activeTab, deliveryOrderPagination.page, appliedDeliveryOrderSearch, showDeliveryOrderForm]);",
        "    }, [activeTab, deliveryOrderPagination.page, appliedDeliveryOrderSearch, showDeliveryOrderForm, receiptPagination.page, appliedReceiptSearch, showReceiptForm]);"
    );
}

// 4. handleDelete
if (!content.includes("if (docType === 'Receipt') endpoint = `${API_BASE}/receipts/${id}`;")) {
    content = content.replace(
        "if (docType === 'DeliveryOrder') endpoint = `${API_BASE}/delivery-orders/${id}`;",
        "if (docType === 'DeliveryOrder') endpoint = `${API_BASE}/delivery-orders/${id}`;\n            if (docType === 'Receipt') endpoint = `${API_BASE}/receipts/${id}`;"
    );
}

// 5. handleViewHistory
if (!content.includes("if (docType === 'Receipt') endpoint = `${API_BASE}/receipts/${id}/history`;")) {
    content = content.replace(
        "if (docType === 'DeliveryOrder') endpoint = `${API_BASE}/delivery-orders/${id}/history`;",
        "if (docType === 'DeliveryOrder') endpoint = `${API_BASE}/delivery-orders/${id}/history`;\n            if (docType === 'Receipt') endpoint = `${API_BASE}/receipts/${id}/history`;"
    );
}

// 6. Sidebar tabs
if (!content.includes("{ id: 'sales_receipt', label: 'ใบเสร็จรับเงิน (ต้นฉบับ)', icon: FileText }")) {
    content = content.replace(
        "{ id: 'sales_delivery_order', label: 'Delivery Order', icon: FileText },",
        "{ id: 'sales_delivery_order', label: 'Delivery Order', icon: FileText },\n                        { id: 'sales_receipt', label: 'ใบเสร็จรับเงิน (ต้นฉบับ)', icon: FileText },"
    );
}

// 7. Preview Modal
if (!content.includes("previewDocModal.type === 'Receipt' ? 'พรีวิวใบเสร็จรับเงิน' :")) {
    content = content.replace(
        "previewDocModal.type === 'DeliveryOrder' ? 'พรีวิวใบส่งสินค้า' :",
        "previewDocModal.type === 'DeliveryOrder' ? 'พรีวิวใบส่งสินค้า' :\n                                 previewDocModal.type === 'Receipt' ? 'พรีวิวใบเสร็จรับเงิน' :"
    );
}
if (!content.includes("<ReceiptForm")) {
    const previewFormInsert = `                            )}
                            {previewDocModal.type === 'Receipt' && (
                                <ReceiptForm
                                    editId={previewDocModal.id}
                                    viewOnly={true}
                                    isHistory={previewDocModal.isHistory || false}
                                    onBack={() => setPreviewDocModal(null)}
                                    onSave={() => setPreviewDocModal(null)}
                                />
                            )}
                        </div>`;
    content = content.replace("                            )}\r\n                        </div>", previewFormInsert);
    content = content.replace("                            )}\n                        </div>", previewFormInsert);
}

// 8. Tab Content (huge block)
if (!content.includes("activeTab === 'sales_receipt'")) {
    const receiptTabBlock = `
            {/* ── Tab: ใบเสร็จรับเงิน ── */}
            {(activeTab === 'sales_receipt' && hasSubPermission('sales_receipt')) && (
                <div className="subpage-content" key="sales_receipt">
                    {showReceiptForm ? (
                        <ReceiptForm
                            editId={editDocId}
                            onBack={() => {
                                setShowReceiptForm(false);
                                setEditDocId(null);
                            }}
                            onSave={() => {
                                setShowReceiptForm(false);
                                setEditDocId(null);
                            }}
                        />
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText style={{ color: 'var(--primary)' }} />
                                    ใบเสร็จรับเงิน (ต้นฉบับ)
                                </h2>
                                <button
                                    onClick={() => {
                                        setEditDocId(null);
                                        setShowReceiptForm(true);
                                    }}
                                    className="btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Plus size={18} />
                                    สร้างใบเสร็จรับเงิน
                                </button>
                            </div>
                            <div className="table-card">
                                <div className="table-toolbar">
                                    <div className="search-box">
                                        <Search size={18} />
                                        <input
                                            type="text"
                                            placeholder="ค้นหาใบเสร็จรับเงิน..."
                                            value={receiptSearch}
                                            onChange={(e) => setReceiptSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setAppliedReceiptSearch(receiptSearch);
                                                    setReceiptPagination(prev => ({ ...prev, page: 1 }));
                                                }
                                            }}
                                        />
                                    </div>
                                    <button 
                                        className="btn-secondary" 
                                        style={{ height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                        onClick={() => {
                                            setAppliedReceiptSearch(receiptSearch);
                                            setReceiptPagination(prev => ({ ...prev, page: 1 }));
                                        }}
                                    >
                                        ค้นหา
                                    </button>
                                </div>
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>เลขที่</th>
                                                <th>เวอร์ชัน</th>
                                                <th>ลูกค้า</th>
                                                <th>ยอดเงินรวม</th>
                                                <th>วันที่</th>
                                                <th style={{ textAlign: 'center' }}>สถานะ</th>
                                                <th style={{ textAlign: 'right' }}>จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {receipts.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)' }}>
                                                        ไม่มีข้อมูลใบเสร็จรับเงิน
                                                    </td>
                                                </tr>
                                            ) : (
                                                receipts.map(q => (
                                                    <tr key={q.ReceiptID}>
                                                        <td style={{ fontWeight: '500' }}>{q.ReceiptNo || '-'}</td>
                                                        <td style={{ color: 'var(--text-light)', fontSize: '13px' }}>
                                                            v.{q.Revision || 0}
                                                        </td>
                                                        <td>{q.CustomerName}</td>
                                                        <td>{Number(q.GrandTotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                        <td>{q.BillDate ? new Date(q.BillDate).toLocaleDateString('th-TH') : '-'}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className="status-badge status-approved">
                                                                {q.Status || 'Active'}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                <button
                                                                    onClick={() => handleViewHistory(q.ReceiptID, 'Receipt')}
                                                                    className="btn-icon"
                                                                    title="ประวัติการแก้ไข"
                                                                    style={{ color: 'var(--primary)', background: '#e0e7ff' }}
                                                                >
                                                                    <History size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setPreviewDocModal({ type: 'Receipt', id: q.ReceiptID })}
                                                                    className="btn-icon"
                                                                    title="พรีวิวเอกสาร"
                                                                    style={{ color: '#0ea5e9', background: '#e0f2fe' }}
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditDocId(q.ReceiptID);
                                                                        setShowReceiptForm(true);
                                                                    }}
                                                                    className="btn-icon btn-edit"
                                                                    title="แก้ไข"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(q.ReceiptID, 'Receipt')}
                                                                    className="btn-icon btn-delete"
                                                                    title="ลบ"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {receiptPagination.totalPages > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px', borderTop: '1px solid var(--border)', gap: '12px', alignItems: 'center' }}>
                                        <button 
                                            className="btn-secondary" 
                                            disabled={receiptPagination.page === 1}
                                            onClick={() => setReceiptPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                            style={{ padding: '6px 12px' }}
                                        >
                                            ก่อนหน้า
                                        </button>
                                        <span style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                                            หน้า {receiptPagination.page} จาก {receiptPagination.totalPages}
                                        </span>
                                        <button 
                                            className="btn-secondary" 
                                            disabled={receiptPagination.page === receiptPagination.totalPages}
                                            onClick={() => setReceiptPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                            style={{ padding: '6px 12px' }}
                                        >
                                            ถัดไป
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
`;
    // Insert before {showDocHistoryModal &&
    const insertPos = content.indexOf("{/* Doc History Modal */}");
    content = content.substring(0, insertPos) + receiptTabBlock + "\n            " + content.substring(insertPos);
}

fs.writeFileSync('src/pages/Sales.jsx', content, 'utf8');
console.log('Sales.jsx patched successfully.');

const fs = require('fs');
let content = fs.readFileSync('src/pages/Sales.jsx', 'utf-8');

const fetchEffect = `
    // ── Fetch ข้อมูล Delivery Order ──
    useEffect(() => {
        const fetchDeliveryOrders = async () => {
            if (activeTab !== 'sales_delivery_order') return;
            try {
                const res = await fetch(\`\${API_BASE}/delivery-orders?page=\${deliveryOrderPagination.page}&limit=\${deliveryOrderPagination.limit}&search=\${encodeURIComponent(appliedDeliveryOrderSearch)}\`);
                const json = await res.json();
                if (json.success) {
                    setLocalDeliveryOrders(json.data || []);
                    if (json.pagination) setDeliveryOrderPagination(prev => ({ ...prev, totalPages: json.pagination.totalPages }));
                }
            } catch (err) { console.error('Error fetching delivery orders:', err); }
        };
        fetchDeliveryOrders();
    }, [activeTab, deliveryOrderPagination.page, appliedDeliveryOrderSearch, showDeliveryOrderForm]);
`;

if (!content.includes('Fetch ข้อมูล Delivery Order')) {
    content = content.replace("    // ── Fetch ข้อมูล POA ──", fetchEffect + "\n    // ── Fetch ข้อมูล POA ──");
}

const deleteFunc = `
    const handleDeleteDeliveryOrder = async (id) => {
        if (!window.confirm('คุณต้องการลบใบส่งสินค้านี้ใช่หรือไม่?')) return;
        try {
            const res = await fetch(\`\${API_BASE}/delivery-orders/\${id}\`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                setLocalDeliveryOrders(prev => prev.filter(d => (d.DeliveryOrderID || d.id) !== id));
            }
        } catch (err) {
            console.error('Error deleting delivery order:', err);
        }
    };
`;

if (!content.includes('handleDeleteDeliveryOrder')) {
    content = content.replace("    const handleDeleteTaxInvoice = async (id) => {", deleteFunc + "\n    const handleDeleteTaxInvoice = async (id) => {");
}

fs.writeFileSync('src/pages/Sales.jsx', content, 'utf-8');
console.log('Successfully injected fetch and delete for Delivery Order!');

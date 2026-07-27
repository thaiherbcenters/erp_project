const fs = require('fs');

let content = fs.readFileSync('src/pages/Sales.jsx', 'utf-8');

const stateVars = `    const [localTaxInvoices, setLocalTaxInvoices] = useState([]);
    const [showDeliveryOrderForm, setShowDeliveryOrderForm] = useState(false);
    const [editingDeliveryOrderId, setEditingDeliveryOrderId] = useState(null);
    const [localDeliveryOrders, setLocalDeliveryOrders] = useState([]);
    const [deliveryOrderSearch, setDeliveryOrderSearch] = useState('');
    const [appliedDeliveryOrderSearch, setAppliedDeliveryOrderSearch] = useState('');
    const [deliveryOrderPagination, setDeliveryOrderPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalRecords: 0 });`;

if (!content.includes('localDeliveryOrders')) {
    content = content.replace("    const [localTaxInvoices, setLocalTaxInvoices] = useState([]);", stateVars);
}

const fetchEffect = `
    // Fetch Delivery Orders
    useEffect(() => {
        if (activeTab !== 'sales_delivery_order') return;
        if (!hasSubPermission('sales_delivery_order')) return;
        
        const fetchDO = async () => {
            try {
                const query = new URLSearchParams({
                    page: deliveryOrderPagination.page,
                    limit: deliveryOrderPagination.limit
                });
                if (appliedDeliveryOrderSearch) query.append('search', appliedDeliveryOrderSearch);

                const res = await api.get(\`/api/delivery-orders?\${query.toString()}\`);
                if (res.data.success) {
                    setLocalDeliveryOrders(res.data.data);
                    setDeliveryOrderPagination(prev => ({
                        ...prev,
                        totalPages: res.data.pagination.totalPages,
                        totalRecords: res.data.pagination.totalRecords
                    }));
                }
            } catch (err) {
                console.error('Error fetching delivery orders:', err);
            }
        };
        fetchDO();
    }, [activeTab, deliveryOrderPagination.page, deliveryOrderPagination.limit, appliedDeliveryOrderSearch]);
`;

if (!content.includes('Fetch Delivery Orders')) {
    content = content.replace("    // Fetch Tax Invoices", fetchEffect + "\n    // Fetch Tax Invoices");
}

const deleteFunc = `
    const handleDeleteDeliveryOrder = async (id) => {
        if (!window.confirm('คุณต้องการลบใบส่งสินค้านี้ใช่หรือไม่?')) return;
        try {
            const res = await api.delete(\`/api/delivery-orders/\${id}\`);
            if (res.data.success) {
                setLocalDeliveryOrders(prev => prev.filter(d => (d.DeliveryOrderID || d.id) !== id));
            }
        } catch (err) {
            console.error('Error deleting delivery order:', err);
        }
    };
`;

if (!content.includes('handleDeleteDeliveryOrder')) {
    content = content.replace("    const handleDeleteTaxInvoice", deleteFunc + "\n    const handleDeleteTaxInvoice");
}

fs.writeFileSync('src/pages/Sales.jsx', content, 'utf-8');
console.log('Fixed Sales.jsx logic hooks.');

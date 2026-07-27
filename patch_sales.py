import os
import re

file_path = 'src/pages/Sales.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if 'DeliveryOrderForm' not in content:
    content = content.replace("import TaxInvoiceForm from '../components/TaxInvoiceForm';", 
                              "import TaxInvoiceForm from '../components/TaxInvoiceForm';\nimport DeliveryOrderForm from '../components/DeliveryOrderForm';")

# 2. Add state variables
state_vars = """    const [localTaxInvoices, setLocalTaxInvoices] = useState([]);
    const [showDeliveryOrderForm, setShowDeliveryOrderForm] = useState(false);
    const [editingDeliveryOrderId, setEditingDeliveryOrderId] = useState(null);
    const [localDeliveryOrders, setLocalDeliveryOrders] = useState([]);
    const [deliveryOrderSearch, setDeliveryOrderSearch] = useState('');
    const [appliedDeliveryOrderSearch, setAppliedDeliveryOrderSearch] = useState('');
    const [deliveryOrderPagination, setDeliveryOrderPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalRecords: 0 });"""
if 'localDeliveryOrders' not in content:
    content = content.replace("    const [localTaxInvoices, setLocalTaxInvoices] = useState([]);", state_vars)

# 3. Add fetch effect
fetch_effect = """
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

                const res = await api.get(`/api/delivery-orders?${query.toString()}`);
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
                toast.error('ไม่สามารถโหลดข้อมูลใบส่งสินค้าได้');
            }
        };
        fetchDO();
    }, [activeTab, deliveryOrderPagination.page, deliveryOrderPagination.limit, appliedDeliveryOrderSearch]);
"""
if 'Fetch Delivery Orders' not in content:
    # Insert before "// Fetch Tax Invoices"
    content = content.replace("    // Fetch Tax Invoices", fetch_effect + "\n    // Fetch Tax Invoices")

# 4. Handle deletion
delete_func = """
    const handleDeleteDeliveryOrder = async (id) => {
        if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารใบนี้?')) return;
        try {
            const res = await api.delete(`/api/delivery-orders/${id}`);
            if (res.data.success) {
                toast.success('ลบข้อมูลสำเร็จ');
                setLocalDeliveryOrders(prev => prev.filter(d => d.DeliveryOrderID !== id));
            }
        } catch (err) {
            console.error('Error deleting delivery order:', err);
            toast.error('ลบข้อมูลไม่สำเร็จ: ' + (err.response?.data?.message || err.message));
        }
    };
"""
if 'handleDeleteDeliveryOrder' not in content:
    content = content.replace("    const handleDeleteTaxInvoice", delete_func + "\n    const handleDeleteTaxInvoice")

# 5. Add UI block
# We extract the whole TaxInvoice UI block and replace it
tax_block_start = "{/* ── Tab: Invoice/Delivery Order (ใบแจ้งหนี้/ใบส่งสินค้า) ── */}"
sales_order_start = "{/* ── Tab: Sales Order (ใบสั่งซื้อ) ── */}"

if 'sales_delivery_order' not in content:
    start_idx = content.find(tax_block_start)
    end_idx = content.find(sales_order_start)
    if start_idx != -1 and end_idx != -1:
        tax_block = content[start_idx:end_idx]
        do_block = tax_block.replace('sales_tax_invoice', 'sales_delivery_order')
        do_block = do_block.replace('TaxInvoiceForm', 'DeliveryOrderForm')
        do_block = do_block.replace('TaxInvoice', 'DeliveryOrder')
        do_block = do_block.replace('taxInvoice', 'deliveryOrder')
        do_block = do_block.replace('ใบแจ้งหนี้/ใบส่งสินค้า (Invoice/Delivery Order)', 'ใบส่งสินค้า DELIVERY ORDER')
        do_block = do_block.replace('ใบแจ้งหนี้/ใบส่งสินค้า', 'ใบส่งสินค้า')
        
        content = content[:end_idx] + do_block + "\n            " + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched Sales.jsx")

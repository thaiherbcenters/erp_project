const fs = require('fs');
let content = fs.readFileSync('src/pages/Sales.jsx', 'utf-8');

const oldBlock = `    const handleDeleteDeliveryOrder = async (id) => {
        if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารใบนี้?')) return;
        try {
            const res = await api.delete(\`/api/delivery-orders/\${id}\`);
            if (res.data.success) {
                toast.success('ลบข้อมูลสำเร็จ');
                setLocalDeliveryOrders(prev => prev.filter(d => d.DeliveryOrderID !== id));
            }
        } catch (err) {
            console.error('Error deleting delivery order:', err);
            toast.error('ลบข้อมูลไม่สำเร็จ: ' + (err.response?.data?.message || err.message));
        }
    };`;

const newBlock = `    const handleDeleteDeliveryOrder = async (id) => {
        const ok = await showConfirm('ยืนยันการลบ', 'คุณต้องการลบใบส่งสินค้านี้ใช่หรือไม่?', 'warning');
        if (!ok) return;
        try {
            const res = await fetch(\`\${API_BASE}/delivery-orders/\${id}\`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                setLocalDeliveryOrders(prev => prev.filter(d => (d.DeliveryOrderID || d.id) !== id));
            } else { alert('ลบไม่สำเร็จ: ' + json.message); }
        } catch (err) { console.error('Error deleting delivery order:', err); alert('เกิดข้อผิดพลาดในการลบ'); }
    };`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync('src/pages/Sales.jsx', content, 'utf-8');
console.log('Fixed handleDeleteDeliveryOrder!');

const fs = require('fs');
let content = fs.readFileSync('src/pages/Sales.jsx', 'utf-8');

const startStr = "    const handleDeleteDeliveryOrder = async (id) => {";
const endStr = "    const handleDeleteTaxInvoice = async (id) => {";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    const newBlock = `    const handleDeleteDeliveryOrder = async (id) => {
        const ok = await showConfirm('ยืนยันการลบ', 'คุณต้องการลบใบส่งสินค้านี้ใช่หรือไม่?', 'warning');
        if (!ok) return;
        try {
            const res = await fetch(\`\${API_BASE}/delivery-orders/\${id}\`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                setLocalDeliveryOrders(prev => prev.filter(d => (d.DeliveryOrderID || d.id) !== id));
                showAlert('สำเร็จ', 'ลบข้อมูลสำเร็จ', 'success');
            } else { 
                showAlert('ลบไม่สำเร็จ', json.message, 'error');
            }
        } catch (err) { 
            console.error('Error deleting delivery order:', err); 
            showAlert('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบ', 'error');
        }
    };

`;

    content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
    fs.writeFileSync('src/pages/Sales.jsx', content, 'utf-8');
    console.log("Successfully replaced the delete block!");
} else {
    console.log("Could not find the start or end string.");
}

const fs = require('fs');
let content = fs.readFileSync('src/pages/Sales.jsx', 'utf8');

if (!content.includes('const [receipts, setReceipts] = useState([]);')) {
    content = content.replace(
        "const [deliveryOrders, setDeliveryOrders] = useState([]);",
        "const [deliveryOrders, setDeliveryOrders] = useState([]);\n    const [receipts, setReceipts] = useState([]);"
    );
    fs.writeFileSync('src/pages/Sales.jsx', content, 'utf8');
    console.log('Added receipts state.');
} else {
    console.log('receipts state already exists.');
}

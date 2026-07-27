const fs = require('fs');
let content = fs.readFileSync('src/pages/Sales.jsx', 'utf-8');

content = content.replace(/await fetch\(`\$\{API_BASE\}\/delivery-orders\?page=\$\{deliveryOrderPagination\.page\}&limit=\$\{deliveryOrderPagination\.limit\}&search=\$\{encodeURIComponent\(appliedDeliveryOrderSearch\)\}`\);/g, 
  "await api.get(`/api/delivery-orders?page=${deliveryOrderPagination.page}&limit=${deliveryOrderPagination.limit}&search=${encodeURIComponent(appliedDeliveryOrderSearch)}`);");

content = content.replace(/await fetch\(`\$\{API_BASE\}\/delivery-orders\/\$\{id\}`\, \{ method: 'DELETE' \}\);/g,
  "await api.delete(`/api/delivery-orders/${id}`);");

fs.writeFileSync('src/pages/Sales.jsx', content, 'utf-8');
console.log('Fixed fetch to api.get in Sales.jsx!');

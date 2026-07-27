const fs = require('fs');
let content = fs.readFileSync('src/pages/Sales.jsx', 'utf-8');

const oldGet = `            try {
                const res = await api.get(\`/api/delivery-orders?page=\${deliveryOrderPagination.page}&limit=\${deliveryOrderPagination.limit}&search=\${encodeURIComponent(appliedDeliveryOrderSearch)}\`);
                const json = res.data;
                if (json.success) {
                    setLocalDeliveryOrders(json.data || []);
                    if (json.pagination) setDeliveryOrderPagination(prev => ({ ...prev, totalPages: json.pagination.totalPages }));
                }
            } catch (err) { console.error('Error fetching delivery orders:', err); }`;

const newGet = `            try {
                const res = await fetch(\`\${API_BASE}/delivery-orders?page=\${deliveryOrderPagination.page}&limit=\${deliveryOrderPagination.limit}&search=\${encodeURIComponent(appliedDeliveryOrderSearch)}\`);
                const json = await res.json();
                if (json.success) {
                    setLocalDeliveryOrders(json.data || []);
                    if (json.pagination) setDeliveryOrderPagination(prev => ({ ...prev, totalPages: json.pagination.totalPages }));
                }
            } catch (err) { console.error('Error fetching delivery orders:', err); }`;

content = content.replace(oldGet, newGet);

const oldDelete = `        try {
            const res = await api.delete(\`/api/delivery-orders/\${id}\`);
            const json = res.data;
            if (json.success) {`;

const newDelete = `        try {
            const res = await fetch(\`\${API_BASE}/delivery-orders/\${id}\`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {`;

content = content.replace(oldDelete, newDelete);

fs.writeFileSync('src/pages/Sales.jsx', content, 'utf-8');
console.log('Restored fetch logic!');

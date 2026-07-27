const fs = require('fs');
let content = fs.readFileSync('src/pages/Sales.jsx', 'utf-8');

const oldCode = `            const res = await fetch(endpoint);
            const json = await res.json();`;

const newCode = `            const res = await api.get(endpoint);
            const json = res.data;`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('src/pages/Sales.jsx', content, 'utf-8');
console.log('Fixed fetch in handleViewHistory!');

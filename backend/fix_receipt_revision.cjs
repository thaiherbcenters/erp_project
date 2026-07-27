const fs = require('fs');
let content = fs.readFileSync('backend/create_receipt_tables.js', 'utf8');
content = content.replace('Revision int DEFAULT 1', 'Revision int DEFAULT 0');
fs.writeFileSync('backend/create_receipt_tables.js', content, 'utf8');
console.log('Fixed DEFAULT to 0');

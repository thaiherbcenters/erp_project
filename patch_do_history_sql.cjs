const fs = require('fs');
let content = fs.readFileSync('backend/routes/deliveryOrders.js', 'utf-8');

const oldQuery = `                SELECT HistoryID, Revision, Status, ArchivedAt, GrandTotal
                FROM DeliveryOrderHistory`;

const newQuery = `                SELECT HistoryID, Revision, Status, BackupAt as ArchivedAt, GrandTotal
                FROM DeliveryOrderHistory`;

content = content.replace(oldQuery, newQuery);
fs.writeFileSync('backend/routes/deliveryOrders.js', content, 'utf-8');
console.log('Fixed ArchivedAt to BackupAt as ArchivedAt!');

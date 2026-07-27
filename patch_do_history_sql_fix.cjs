const fs = require('fs');
let content = fs.readFileSync('backend/routes/deliveryOrders.js', 'utf-8');

const targetStr = "SELECT HistoryID, Revision, Status, ArchivedAt, GrandTotal";
const insertStr = "SELECT HistoryID, Revision, Status, BackupAt as ArchivedAt, GrandTotal";

const index = content.indexOf(targetStr);
if (index !== -1) {
    content = content.substring(0, index) + insertStr + content.substring(index + targetStr.length);
    fs.writeFileSync('backend/routes/deliveryOrders.js', content, 'utf-8');
    console.log("Successfully replaced ArchivedAt!");
} else {
    console.log("Could not find the target string.");
}

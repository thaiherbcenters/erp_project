const fs = require('fs');
const filePath = 'backend/routes/stock.js';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = \const requisitions = result.recordset.map(row => {
            const parsed = row.RequisitionJSON ? JSON.parse(row.RequisitionJSON) : [];
            const items = Array.isArray(parsed) ? parsed : (parsed.items || []);
            return {
                id: row.TaskID,
                jobOrderId: row.JobOrderID,
                batchNo: row.BatchNo,
                formulaName: row.FormulaName,
                expectedQty: row.ExpectedQty,
                unit: row.JobUnit,
                status: row.Status,
                createdAt: row.CreatedAt,
                items: items,
                requesterName: parsed.requesterName || 'ไม่ระบุ'
            };
        });\;

const repStr = \const stockRes = await pool.request().query('SELECT ItemID, Quantity, Unit FROM Stock_Items');
        const stockDict = {};
        stockRes.recordset.forEach(s => {
            stockDict[String(s.ItemID).trim()] = { qty: s.Quantity, unit: s.Unit };
        });

        const requisitions = result.recordset.map(row => {
            const parsed = row.RequisitionJSON ? JSON.parse(row.RequisitionJSON) : [];
            let items = Array.isArray(parsed) ? parsed : (parsed.items || []);
            
            items = items.map(it => {
                const sItem = stockDict[String(it.id).trim()];
                const currentQty = sItem ? sItem.qty : 0;
                return {
                    ...it,
                    currentStock: currentQty,
                    isSufficient: currentQty >= (it.deductQty || 0)
                };
            });
            
            return {
                id: row.TaskID,
                jobOrderId: row.JobOrderID,
                batchNo: row.BatchNo,
                formulaName: row.FormulaName,
                expectedQty: row.ExpectedQty,
                unit: row.JobUnit,
                status: row.Status,
                createdAt: row.CreatedAt,
                items: items,
                requesterName: parsed.requesterName || 'ไม่ระบุ'
            };
        });\;

let oldContent = content;
content = content.replace(targetStr, repStr);
content = content.replace(targetStr, repStr); // Do it twice for both routes

if(content !== oldContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Success');
} else {
    console.log('Failed to match');
}

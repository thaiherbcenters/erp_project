require('dotenv').config({path: './backend/.env'});
const { poolPromise } = require('./backend/config/db.js');

async function run() {
    const pool = await poolPromise;
    const tables = ['Production_Tasks', 'Shipping_Orders']; // Packaging doesn't use REQ for now
    
    for (let table of tables) {
        let idCol = table === 'Shipping_Orders' ? 'ShipmentID' : 'TaskID';
        const res = await pool.request().query(`SELECT ${idCol}, RequisitionJSON FROM ${table} WHERE RequisitionJSON LIKE '%reqId%'`);
        for (let row of res.recordset) {
            try {
                let parsed = JSON.parse(row.RequisitionJSON);
                if (Array.isArray(parsed)) {
                    parsed = parsed.map(r => { delete r.reqId; return r; });
                } else if (parsed.reqId) {
                    delete parsed.reqId;
                }
                await pool.request()
                    .input('id', row[idCol])
                    .input('json', JSON.stringify(parsed))
                    .query(`UPDATE ${table} SET RequisitionJSON = @json WHERE ${idCol} = @id`);
            } catch(e) { console.error(e); }
        }
    }
    console.log('Cleaned DB REQ');
    process.exit(0);
}
run();

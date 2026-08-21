require('dotenv').config({path: './backend/.env'});
const { poolPromise } = require('./backend/config/db.js');
const { generateSequence, getDatePrefix } = require('./backend/utils/sequence.js');

async function run() {
    const pool = await poolPromise;
    const tables = [
        { table: 'Shipping_Orders', idCol: 'ShipmentID' },
        { table: 'Packaging_Tasks', idCol: 'TaskID' },
        { table: 'Production_Tasks', idCol: 'TaskID' }
    ];

    for (let t of tables) {
        const res = await pool.request().query(\`SELECT \${t.idCol}, RequisitionJSON FROM \${t.table} WHERE RequisitionJSON IS NOT NULL\`);
        for (let row of res.recordset) {
            let jsonStr = row.RequisitionJSON;
            if (!jsonStr) continue;
            try {
                let parsed = JSON.parse(jsonStr);
                let changed = false;
                
                if (Array.isArray(parsed)) {
                    for (let i = 0; i < parsed.length; i++) {
                        if (!parsed[i].reqId) {
                            parsed[i].reqId = await generateSequence(pool, 'Requisitions', 'ReqID', \`REQ-\${getDatePrefix()}\`, 3);
                            changed = true;
                        }
                    }
                } else if (parsed && parsed.items) {
                    if (!parsed.reqId) {
                        parsed.reqId = await generateSequence(pool, 'Requisitions', 'ReqID', \`REQ-\${getDatePrefix()}\`, 3);
                        parsed = [parsed];
                        changed = true;
                    }
                }

                if (changed) {
                    await pool.request()
                        .input('json', JSON.stringify(parsed))
                        .input('id', row[t.idCol])
                        .query(\`UPDATE \${t.table} SET RequisitionJSON = @json WHERE \${t.idCol} = @id\`);
                    console.log(\`Updated \${t.table} - \${row[t.idCol]}\`);
                }
            } catch (e) {
                console.error(e);
            }
        }
    }
    console.log('Backfill complete');
    process.exit(0);
}
run();

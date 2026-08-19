require('dotenv').config({ path: './backend/.env' });
const { sql, poolPromise } = require('./backend/config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`SELECT RequestID, Type FROM QC_Production`);
        let qcIpCounter = 1;
        let qcFCodeCounter = 1;

        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // e.g. 20260817

        for (const row of result.recordset) {
            let newId = row.RequestID;
            if (row.Type === 'qc_inprocess') {
                newId = 'QCIP-' + datePrefix + '-' + String(qcIpCounter).padStart(3, '0');
                qcIpCounter++;
            } else if (row.Type === 'qc_final') {
                newId = 'QCF-' + datePrefix + '-' + String(qcFCodeCounter).padStart(3, '0');
                qcFCodeCounter++;
            }

            await pool.request()
                .input('OldID', sql.VarChar, row.RequestID)
                .input('NewID', sql.VarChar, newId)
                .query(`
                    UPDATE QC_Production SET RequestID = @NewID WHERE RequestID = @OldID;
                    UPDATE QC_Results SET ReferenceID = @NewID WHERE ReferenceID = @OldID;
                `);
            console.log(`Updated ${row.RequestID} to ${newId}`);
        }
        
        console.log('Done cleaning up QC request IDs');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();

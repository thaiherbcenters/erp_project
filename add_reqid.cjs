require('dotenv').config({ path: './backend/.env' });
const { sql, poolPromise } = require('./backend/config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');

        // 1. Add RequestID to QC_Incoming
        console.log('Adding RequestID to QC_Incoming...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('QC_Incoming') AND name='RequestID')
            BEGIN
                ALTER TABLE QC_Incoming ADD RequestID VARCHAR(50) NULL;
            END
        `);

        // Update existing QC_Incoming
        const incomingRes = await pool.request().query('SELECT IncomingID FROM QC_Incoming WHERE RequestID IS NULL ORDER BY IncomingID ASC');
        let icCounter = 1;
        for (const row of incomingRes.recordset) {
            const reqId = 'QCIC-' + datePrefix + '-' + String(icCounter).padStart(3, '0');
            await pool.request()
                .input('ReqID', sql.VarChar, reqId)
                .input('IncomingID', sql.Int, row.IncomingID)
                .query('UPDATE QC_Incoming SET RequestID = @ReqID WHERE IncomingID = @IncomingID');
            icCounter++;
        }

        // 2. Add RequestID to RnD_Formula_Tests
        console.log('Adding RequestID to RnD_Formula_Tests...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('RnD_Formula_Tests') AND name='RequestID')
            BEGIN
                ALTER TABLE RnD_Formula_Tests ADD RequestID VARCHAR(50) NULL;
            END
        `);

        // Update existing RnD_Formula_Tests
        const labRes = await pool.request().query('SELECT TestID FROM RnD_Formula_Tests WHERE RequestID IS NULL ORDER BY TestID ASC');
        let labCounter = 1;
        for (const row of labRes.recordset) {
            const reqId = 'QCL-' + datePrefix + '-' + String(labCounter).padStart(3, '0');
            await pool.request()
                .input('ReqID', sql.VarChar, reqId)
                .input('TestID', sql.Int, row.TestID)
                .query('UPDATE RnD_Formula_Tests SET RequestID = @ReqID WHERE TestID = @TestID');
            labCounter++;
        }

        console.log('Successfully updated QC_Incoming and RnD_Formula_Tests schema and data.');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();

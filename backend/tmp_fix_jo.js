require('dotenv').config();
const { poolPromise } = require('./config/db');

async function fixJobOrderIDs() {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            UPDATE Packaging_Tasks
            SET JobOrderID = REPLACE(BatchNo, 'B260', 'JO-20260')
            WHERE (JobOrderID IS NULL OR JobOrderID = '') AND BatchNo LIKE 'B260%';
            
            UPDATE Packaging_Tasks
            SET JobOrderID = BatchNo
            WHERE JobOrderID IS NULL OR JobOrderID = '';
        `);
        console.log('Done updating JobOrderIDs in Packaging_Tasks');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
fixJobOrderIDs();

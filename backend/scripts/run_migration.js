const { poolPromise } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const pool = await poolPromise;
        const sqlPath = path.join(__dirname, '../migrations/create-tax-invoices.sql');
        const sqlScript = fs.readFileSync(sqlPath, 'utf8');
        
        // Split batches by 'GO'
        const batches = sqlScript.split(/^\s*GO\s*$/im);
        
        for (const batch of batches) {
            if (batch.trim()) {
                await pool.request().query(batch);
                console.log('Executed batch successfully.');
            }
        }
        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

runMigration();

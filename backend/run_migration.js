const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./config/db');

async function runMigration() {
    try {
        const sqlQuery = fs.readFileSync(path.join(__dirname, 'migrations', 'add_version_columns.sql'), 'utf8');
        const pool = await poolPromise;
        await pool.request().query(sqlQuery);
        console.log('Migration executed successfully.');
    } catch (error) {
        console.error('Error executing migration:', error);
    } finally {
        process.exit();
    }
}

runMigration();

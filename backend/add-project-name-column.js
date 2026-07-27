const { poolPromise } = require('./config/db');

async function addProjectNameColumn() {
    try {
        const pool = await poolPromise;
        
        // Check if column already exists
        const check = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Customer' AND COLUMN_NAME = 'ProjectName'
        `);
        
        if (check.recordset.length > 0) {
            console.log('✅ Column ProjectName already exists!');
        } else {
            await pool.request().query(`
                ALTER TABLE Customer ADD ProjectName NVARCHAR(255) NULL
            `);
            console.log('✅ Column ProjectName added to Customer table!');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

addProjectNameColumn();

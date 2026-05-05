const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        
        // Add ContactPerson column if not exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Customer' AND COLUMN_NAME='ContactPerson')
            ALTER TABLE Customer ADD ContactPerson NVARCHAR(200) NULL
        `);
        console.log('✅ ContactPerson column added');

        // Add Source column (manual, sales_order, online) if not exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Customer' AND COLUMN_NAME='Source')
            ALTER TABLE Customer ADD Source NVARCHAR(50) NULL DEFAULT 'manual'
        `);
        console.log('✅ Source column added');

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();

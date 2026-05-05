const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        
        // Drop the computed column
        await pool.request().query(`
            ALTER TABLE Customer DROP COLUMN CustomerCode;
        `);
        console.log('✅ Dropped computed CustomerCode');

        // Add it back as a normal column
        await pool.request().query(`
            ALTER TABLE Customer ADD CustomerCode NVARCHAR(50) NULL;
        `);
        console.log('✅ Added regular CustomerCode column');

        // Update existing records to have the old code format so it's not null
        await pool.request().query(`
            UPDATE Customer SET CustomerCode = 'THC' + CONVERT(varchar(20), CustomerID);
        `);
        console.log('✅ Restored old customer codes for existing records');

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();

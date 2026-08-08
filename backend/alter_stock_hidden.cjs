require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE Name = N'IsHidden' AND Object_ID = Object_ID(N'Stock_Items')
            )
            BEGIN
                ALTER TABLE Stock_Items ADD IsHidden BIT DEFAULT 0;
            END
        `);
        console.log('✅ Added IsHidden column to Stock_Items');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
})();

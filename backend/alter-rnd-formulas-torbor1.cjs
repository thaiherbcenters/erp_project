require('dotenv').config();
const { poolPromise } = require('./config/db');

async function alterDb() {
    try {
        const pool = await poolPromise;
        console.log('Adding TorBor1FormatJSON to RnD_Formulas...');
        
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID('RnD_Formulas') 
                AND name = 'TorBor1FormatJSON'
            )
            BEGIN
                ALTER TABLE RnD_Formulas
                ADD TorBor1FormatJSON NVARCHAR(MAX);
                PRINT 'Added TorBor1FormatJSON column';
            END
            ELSE
            BEGIN
                PRINT 'Column already exists';
            END
        `);
        
        console.log('Done!');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

alterDb();

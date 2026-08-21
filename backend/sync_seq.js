require('dotenv').config({ path: 'C:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/backend/.env' });
const { poolPromise } = require('C:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/backend/config/db');

(async () => {
    try {
        const pool = await poolPromise;
        const prefixes = ['RM-', 'PM-', 'FG-', 'WIP-', 'SP-', 'STK-'];
        
        for (const prefix of prefixes) {
            await pool.request().query(`
                IF EXISTS (SELECT 1 FROM Sequences WHERE Prefix = '${prefix}')
                BEGIN
                    UPDATE Sequences SET LastNumber = 100, UpdatedAt = GETDATE() WHERE Prefix = '${prefix}'
                END
                ELSE
                BEGIN
                    INSERT INTO Sequences (Prefix, LastNumber, UpdatedAt) VALUES ('${prefix}', 100, GETDATE())
                END
            `);
        }
        console.log('Successfully synced Sequences table to LastNumber = 100 to avoid mock data collision.');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();

import { sql, poolPromise } from './config/db.js';

async function alterTable() {
    try {
        const pool = await poolPromise;
        console.log('Adding TaxBranch and BranchNo to Customer table...');
        
        await pool.request().query(`
            IF COL_LENGTH('Customer', 'TaxBranch') IS NULL
            BEGIN
                ALTER TABLE Customer ADD TaxBranch NVARCHAR(50) DEFAULT 'head_office';
                PRINT 'Added TaxBranch column.';
            END

            IF COL_LENGTH('Customer', 'BranchNo') IS NULL
            BEGIN
                ALTER TABLE Customer ADD BranchNo NVARCHAR(50);
                PRINT 'Added BranchNo column.';
            END
            
            IF COL_LENGTH('Customer', 'ContactPerson') IS NULL
            BEGIN
                ALTER TABLE Customer ADD ContactPerson NVARCHAR(100);
                PRINT 'Added ContactPerson column.';
            END
        `);
        console.log('Done altering table.');
        process.exit(0);
    } catch (err) {
        console.error('Error altering table:', err);
        process.exit(1);
    }
}

alterTable();

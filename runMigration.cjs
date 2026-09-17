const { sql, poolPromise } = require('./backend/config/db');

async function runMigration() {
    try {
        console.log('Connecting to database...');
        const pool = await poolPromise;
        
        console.log('Running step 1: Adding Revision column to Cheques table...');
        try {
            await pool.request().query(`
                IF COL_LENGTH('Cheques', 'Revision') IS NULL
                BEGIN
                    ALTER TABLE Cheques ADD Revision INT NOT NULL DEFAULT 1;
                END
            `);
            console.log('Step 1 successful or column already exists.');
        } catch (err) {
            console.error('Error in step 1:', err.message);
        }

        console.log('Running step 2: Creating ChequesHistory table...');
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ChequesHistory' AND xtype='U')
                BEGIN
                    CREATE TABLE ChequesHistory (
                        HistoryID INT IDENTITY(1,1) PRIMARY KEY,
                        ChequeID INT NOT NULL,
                        Revision INT NOT NULL,
                        ChequeNo NVARCHAR(50),
                        ChequeType NVARCHAR(20),
                        BankName NVARCHAR(100),
                        BankBranch NVARCHAR(100),
                        AccountNo NVARCHAR(50),
                        PayeeOrPayer NVARCHAR(200),
                        Amount DECIMAL(18,2),
                        IssueDate DATE,
                        DueDate DATE,
                        DepositDate DATE,
                        ClearedDate DATE,
                        Status NVARCHAR(50),
                        RefDocNo NVARCHAR(100),
                        Notes NVARCHAR(MAX),
                        CompanyID INT,
                        CreatedBy INT,
                        CreatedAt DATETIME,
                        UpdatedAt DATETIME,
                        ArchivedAt DATETIME DEFAULT GETDATE()
                    );
                END
            `);
            console.log('Step 2 successful or table already exists.');
        } catch (err) {
            console.error('Error in step 2:', err.message);
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Failed to run migration:', err);
        process.exit(1);
    }
}

runMigration();

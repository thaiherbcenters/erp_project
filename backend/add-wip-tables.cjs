const { poolPromise } = require('./config/db');

async function migrate() {
    try {
        console.log('--- Starting Database Migration for WIP & Traceability ---');
        const pool = await poolPromise;

        // 1. Production_Material_Usage
        console.log('[1/2] Creating Production_Material_Usage table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Production_Material_Usage')
            BEGIN
                CREATE TABLE Production_Material_Usage (
                    UsageID         INT IDENTITY(1,1) PRIMARY KEY,
                    TaskID          VARCHAR(50) NOT NULL,
                    BatchNo         VARCHAR(50),
                    ItemID          VARCHAR(50),
                    ItemName        NVARCHAR(200),
                    ItemCategory    NVARCHAR(50),
                    LotNo           VARCHAR(100),
                    QtyUsed         DECIMAL(18,4),
                    Unit            NVARCHAR(50),
                    UsedBy          NVARCHAR(100),
                    UsedAt          DATETIME DEFAULT GETDATE()
                );
                PRINT 'Production_Material_Usage created.';
            END
            ELSE BEGIN
                PRINT 'Production_Material_Usage already exists.';
            END
        `);
        console.log('✅ Production_Material_Usage ready.');

        // 2. WIP_Lots
        console.log('[2/2] Creating WIP_Lots table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WIP_Lots')
            BEGIN
                CREATE TABLE WIP_Lots (
                    LotID           INT IDENTITY(1,1) PRIMARY KEY,
                    LotNo           VARCHAR(100) NOT NULL UNIQUE,
                    ItemID          VARCHAR(50),
                    ItemName        NVARCHAR(200),
                    Quantity        DECIMAL(18,4),
                    RemainingQty    DECIMAL(18,4),
                    Unit            NVARCHAR(50),
                    ProductionDate  DATE,
                    ExpiryDate      DATE,
                    TaskID          VARCHAR(50),
                    Status          NVARCHAR(50) DEFAULT 'พร้อมใช้',
                    Notes           NVARCHAR(500),
                    CreatedBy       NVARCHAR(100),
                    CreatedAt       DATETIME DEFAULT GETDATE()
                );
                PRINT 'WIP_Lots created.';
            END
            ELSE BEGIN
                PRINT 'WIP_Lots already exists.';
            END
        `);
        console.log('✅ WIP_Lots ready.');

        console.log('--- Migration completed successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();

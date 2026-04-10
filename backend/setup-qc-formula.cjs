require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    const pool = await poolPromise;

    // 1. Create RnD_Formula_Tests table
    console.log('Creating RnD_Formula_Tests...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RnD_Formula_Tests' AND xtype='U')
        CREATE TABLE RnD_Formula_Tests (
            TestID INT IDENTITY(1,1) PRIMARY KEY,
            FormulaID VARCHAR(50) NOT NULL,
            TestDate DATE,
            TestedBy NVARCHAR(100),
            pH NVARCHAR(50),
            Viscosity NVARCHAR(50),
            Color NVARCHAR(100),
            Smell NVARCHAR(100),
            Stability NVARCHAR(100),
            Microbial NVARCHAR(100),
            OverallResult NVARCHAR(50),
            Notes NVARCHAR(MAX),
            CreatedAt DATETIME DEFAULT GETDATE()
        )
    `);

    // 2. Add approval columns to RnD_Formulas
    console.log('Adding approval columns...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('RnD_Formulas') AND name='QcApprovedBy')
        BEGIN
            ALTER TABLE RnD_Formulas ADD
                QcApprovedBy NVARCHAR(100) NULL,
                QcApprovedDate DATE NULL,
                PharmApprovedBy NVARCHAR(100) NULL,
                PharmApprovedDate DATE NULL
        END
    `);

    console.log('Done!');
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

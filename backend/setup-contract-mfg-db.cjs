const sql = require('mssql');
require('dotenv').config({ path: './.env' });

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        trustServerCertificate: true,
        encrypt: false,
    },
};

async function setup() {
    try {
        const pool = await sql.connect(config);
        
        // Create ContractMfgDocuments Table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ContractMfgDocuments' AND xtype='U')
            BEGIN
                CREATE TABLE ContractMfgDocuments (
                    documentId INT IDENTITY(1,1) PRIMARY KEY,
                    contractId INT NULL,
                    customerId INT NULL,
                    ContractNo NVARCHAR(100) NULL,
                    WrittenAt NVARCHAR(255) NULL,
                    DocumentDate DATE NULL,
                    
                    EmployerName NVARCHAR(255) NULL,
                    EmployerID NVARCHAR(50) NULL,
                    EmployerRep NVARCHAR(255) NULL,
                    EmployerRepID NVARCHAR(50) NULL,
                    EmployerAddress NVARCHAR(MAX) NULL,
                    
                    ContractorName NVARCHAR(255) NULL,
                    ContractorID NVARCHAR(50) NULL,
                    ContractorRep NVARCHAR(255) NULL,
                    ContractorLicense NVARCHAR(100) NULL,
                    ContractorAddress NVARCHAR(MAX) NULL,
                    
                    Status NVARCHAR(50) DEFAULT N'ร่าง',
                    Version INT DEFAULT 1,
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    UpdatedAt DATETIME DEFAULT GETDATE()
                )
                PRINT 'ContractMfgDocuments table created successfully.'
            END
            ELSE
            BEGIN
                PRINT 'ContractMfgDocuments table already exists.'
            END
        `);

        console.log('Setup Contract Mfg DB finished.');
        process.exit(0);
    } catch (err) {
        console.error('Database setup failed:', err);
        process.exit(1);
    }
}

setup();

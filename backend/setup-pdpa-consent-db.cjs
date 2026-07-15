const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function setup() {
    try {
        const pool = await sql.connect(config);
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PdpaConsentDocuments' AND xtype='U')
            BEGIN
                CREATE TABLE PdpaConsentDocuments (
                    documentId INT IDENTITY(1,1) PRIMARY KEY,
                    contractId INT NULL,
                    customerId INT NULL,
                    WrittenAt NVARCHAR(255) NULL,
                    DocumentDate DATE NULL,
                    
                    ActName NVARCHAR(255) NULL,
                    PersonPrefix NVARCHAR(50) NULL,
                    PersonPrefixOther NVARCHAR(100) NULL,
                    PersonName NVARCHAR(255) NULL,
                    JuristicName NVARCHAR(255) NULL,
                    
                    PublicHealthProvince NVARCHAR(100) NULL,
                    ActName2 NVARCHAR(255) NULL,
                    ActName3 NVARCHAR(255) NULL,
                    KeepYears INT NULL,
                    IsConsent BIT NULL,
                    
                    Status NVARCHAR(50) DEFAULT N'ร่าง',
                    Version INT DEFAULT 1,
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    UpdatedAt DATETIME DEFAULT GETDATE()
                );
                PRINT 'Table PdpaConsentDocuments created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table PdpaConsentDocuments already exists.';
            END
        `);
        
    } catch (err) {
        console.error('Error setting up PdpaConsentDocuments DB:', err);
    } finally {
        sql.close();
    }
}

setup();

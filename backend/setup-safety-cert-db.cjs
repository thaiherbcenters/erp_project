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

async function setupDatabase() {
    try {
        const pool = await sql.connect(config);
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SafetyCertDocuments' AND xtype='U')
            BEGIN
                CREATE TABLE SafetyCertDocuments (
                    documentId INT IDENTITY(1,1) PRIMARY KEY,
                    contractId INT NULL,
                    customerId INT NULL,
                    WrittenAt NVARCHAR(255) NULL,
                    DocumentDate DATE NULL,
                    OwnerPrefix NVARCHAR(50) NULL,
                    OwnerName NVARCHAR(255) NULL,
                    ReqTypeRegistration BIT DEFAULT 0,
                    ReqTypeDetailNotification BIT DEFAULT 0,
                    ReqTypeNotification BIT DEFAULT 0,
                    ProductName NVARCHAR(500) NULL,
                    ReceiptNo NVARCHAR(100) NULL,
                    Status NVARCHAR(50) DEFAULT N'ร่าง',
                    Version INT DEFAULT 1,
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    UpdatedAt DATETIME DEFAULT GETDATE()
                );
                PRINT 'Table SafetyCertDocuments created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table SafetyCertDocuments already exists.';
            END
        `);
        
        console.log('✅ Setup completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error setting up database:', err);
        process.exit(1);
    }
}

setupDatabase();

const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: { trustServerCertificate: true, encrypt: true },
};

async function setupContracts() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server');

        // Create Contracts Table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Contracts')
            BEGIN
                CREATE TABLE Contracts (
                    ContractID INT IDENTITY(1,1) PRIMARY KEY,
                    ContractNo NVARCHAR(100) NOT NULL,
                    ContractName NVARCHAR(300) NOT NULL,
                    CustomerID INT NULL,
                    StartDate DATE NULL,
                    EndDate DATE NULL,
                    ContractValue DECIMAL(18,2) NULL,
                    Status NVARCHAR(50) NOT NULL DEFAULT N'กำลังดำเนินการ',
                    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT 'Created table: Contracts';
            END
            ELSE PRINT 'Table Contracts already exists';
        `);

        // Alter LegalDocuments Table
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'LegalDocuments' AND COLUMN_NAME = 'ContractID'
            )
            BEGIN
                ALTER TABLE LegalDocuments ADD ContractID INT NULL;
                PRINT 'Added ContractID to LegalDocuments';
            END
            ELSE PRINT 'ContractID already exists in LegalDocuments';
        `);

        console.log('✅ Setup complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

setupContracts();

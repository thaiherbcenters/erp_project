const { poolPromise, sql } = require('../config/db');

async function run() {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EliteTaxInvoices' AND xtype='U')
            BEGIN
                CREATE TABLE EliteTaxInvoices (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    DocNo VARCHAR(50) NOT NULL UNIQUE,
                    DocDate DATE NOT NULL,
                    CustomerName NVARCHAR(200) NOT NULL,
                    CustomerAddress NVARCHAR(MAX),
                    CustomerPhone VARCHAR(50),
                    CustomerTaxId VARCHAR(50),
                    ItemsJSON NVARCHAR(MAX),
                    Subtotal DECIMAL(18,2) DEFAULT 0,
                    Discount DECIMAL(18,2) DEFAULT 0,
                    Vat DECIMAL(18,2) DEFAULT 0,
                    GrandTotal DECIMAL(18,2) DEFAULT 0,
                    Status NVARCHAR(50) DEFAULT N'พร้อมใช้',
                    Revision INT DEFAULT 0,
                    Remarks NVARCHAR(MAX),
                    Signer VARCHAR(50),
                    BankAccount VARCHAR(50),
                    IncludeVat BIT DEFAULT 0,
                    CreatedBy INT,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Created EliteTaxInvoices table successfully';
            END
            ELSE
            BEGIN
                PRINT 'EliteTaxInvoices already exists';
            END
        `);
        console.log('Done migration for EliteTaxInvoices');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

run();

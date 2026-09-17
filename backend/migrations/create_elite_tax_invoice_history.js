const { poolPromise } = require('../config/db');

async function run() {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EliteTaxInvoiceHistory' AND xtype='U')
            BEGIN
                CREATE TABLE EliteTaxInvoiceHistory (
                    HistoryID INT IDENTITY(1,1) PRIMARY KEY,
                    InvoiceID INT NOT NULL,
                    DocNo VARCHAR(50) NOT NULL,
                    DocDate DATE NOT NULL,
                    CustomerName NVARCHAR(200) NOT NULL,
                    CustomerAddress NVARCHAR(MAX),
                    CustomerPhone VARCHAR(50),
                    CustomerTaxId VARCHAR(50),
                    ItemsJSON NVARCHAR(MAX),
                    Subtotal DECIMAL(18,2) DEFAULT 0,
                    Discount DECIMAL(18,2) DEFAULT 0,
                    DiscountPercent DECIMAL(18,2) DEFAULT 0,
                    Vat DECIMAL(18,2) DEFAULT 0,
                    GrandTotal DECIMAL(18,2) DEFAULT 0,
                    DepositPercent DECIMAL(18,2) DEFAULT 0,
                    DepositAmount DECIMAL(18,2) DEFAULT 0,
                    RemainingBalance DECIMAL(18,2) DEFAULT 0,
                    Status NVARCHAR(50) DEFAULT N'พร้อมใช้',
                    Revision INT DEFAULT 0,
                    Remarks NVARCHAR(MAX),
                    Signer VARCHAR(50),
                    BankAccount VARCHAR(50),
                    IncludeVat BIT DEFAULT 0,
                    PaymentTerm NVARCHAR(100),
                    ContactPerson NVARCHAR(100),
                    Reference NVARCHAR(100),
                    ArchivedAt DATETIME DEFAULT GETDATE(),
                    ArchivedBy INT
                );
                PRINT 'Created EliteTaxInvoiceHistory table successfully';
            END
            ELSE
            BEGIN
                PRINT 'EliteTaxInvoiceHistory already exists';
            END
        `);
        console.log('Migration for EliteTaxInvoiceHistory completed.');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

run();

const { poolPromise } = require('../config/db');

async function run() {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EliteReceipts' AND xtype='U')
            BEGIN
                CREATE TABLE EliteReceipts (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    DocNo VARCHAR(50) NOT NULL UNIQUE,
                    BookNo VARCHAR(50),
                    DocDate DATE NOT NULL,
                    DocType VARCHAR(50) DEFAULT 'receipt',
                    CustomerName NVARCHAR(200) NOT NULL,
                    CustomerAddress NVARCHAR(MAX),
                    CustomerPhone VARCHAR(50),
                    CustomerTaxId VARCHAR(50),
                    ItemsJSON NVARCHAR(MAX),
                    ItemsDesc NVARCHAR(MAX),
                    Subtotal DECIMAL(18,2) DEFAULT 0,
                    Discount DECIMAL(18,2) DEFAULT 0,
                    DiscountPercent DECIMAL(18,2) DEFAULT 0,
                    Vat DECIMAL(18,2) DEFAULT 0,
                    GrandTotal DECIMAL(18,2) DEFAULT 0,
                    IncludeVat BIT DEFAULT 0,
                    PaymentMethod VARCHAR(50) DEFAULT 'transfer',
                    BankName NVARCHAR(100),
                    BankBranch NVARCHAR(100),
                    CheckNo VARCHAR(50),
                    CheckDate DATE,
                    Remarks NVARCHAR(MAX),
                    Signer VARCHAR(50),
                    Status NVARCHAR(50) DEFAULT N'พร้อมใช้',
                    Revision INT DEFAULT 0,
                    InvoiceID INT,
                    CreatedBy INT,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Created EliteReceipts table successfully';
            END
            ELSE
            BEGIN
                PRINT 'EliteReceipts table already exists';
            END

            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EliteReceiptHistory' AND xtype='U')
            BEGIN
                CREATE TABLE EliteReceiptHistory (
                    HistoryID INT IDENTITY(1,1) PRIMARY KEY,
                    ReceiptID INT NOT NULL,
                    DocNo VARCHAR(50) NOT NULL,
                    BookNo VARCHAR(50),
                    DocDate DATE NOT NULL,
                    DocType VARCHAR(50),
                    CustomerName NVARCHAR(200) NOT NULL,
                    CustomerAddress NVARCHAR(MAX),
                    CustomerPhone VARCHAR(50),
                    CustomerTaxId VARCHAR(50),
                    ItemsJSON NVARCHAR(MAX),
                    ItemsDesc NVARCHAR(MAX),
                    Subtotal DECIMAL(18,2) DEFAULT 0,
                    Discount DECIMAL(18,2) DEFAULT 0,
                    DiscountPercent DECIMAL(18,2) DEFAULT 0,
                    Vat DECIMAL(18,2) DEFAULT 0,
                    GrandTotal DECIMAL(18,2) DEFAULT 0,
                    IncludeVat BIT DEFAULT 0,
                    PaymentMethod VARCHAR(50),
                    BankName NVARCHAR(100),
                    BankBranch NVARCHAR(100),
                    CheckNo VARCHAR(50),
                    CheckDate DATE,
                    Remarks NVARCHAR(MAX),
                    Signer VARCHAR(50),
                    Status NVARCHAR(50),
                    Revision INT DEFAULT 0,
                    ArchivedAt DATETIME DEFAULT GETDATE(),
                    ArchivedBy INT
                );
                PRINT 'Created EliteReceiptHistory table successfully';
            END
            ELSE
            BEGIN
                PRINT 'EliteReceiptHistory table already exists';
            END
        `);
        console.log('Migration for Elite Receipts completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

run();

const { poolPromise, sql } = require('../config/db');

async function run() {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EliteBookingOrders' AND xtype='U')
            BEGIN
                CREATE TABLE EliteBookingOrders (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    DocNo VARCHAR(50) NOT NULL UNIQUE,
                    DocDate DATE NOT NULL,
                    CustomerName NVARCHAR(200) NOT NULL,
                    CustomerAddress NVARCHAR(MAX),
                    CustomerPhone VARCHAR(50),
                    CustomerTaxId VARCHAR(50),
                    DeliverTo NVARCHAR(255),
                    ContactPerson NVARCHAR(255),
                    Reference NVARCHAR(255),
                    ItemsJSON NVARCHAR(MAX),
                    Subtotal DECIMAL(18,2) DEFAULT 0,
                    Discount DECIMAL(18,2) DEFAULT 0,
                    DiscountPercent DECIMAL(18,2) DEFAULT 0,
                    IncludeVat BIT DEFAULT 0,
                    Vat DECIMAL(18,2) DEFAULT 0,
                    GrandTotal DECIMAL(18,2) DEFAULT 0,
                    DepositPercent DECIMAL(18,2) DEFAULT 0,
                    DepositAmount DECIMAL(18,2) DEFAULT 0,
                    RemainingBalance DECIMAL(18,2) DEFAULT 0,
                    BankAccount VARCHAR(50) DEFAULT 'kbank_elite_2020',
                    Remarks NVARCHAR(MAX),
                    Signer VARCHAR(50) DEFAULT 'none',
                    Status NVARCHAR(50) DEFAULT N'พร้อมใช้',
                    Revision INT DEFAULT 0,
                    CreatedBy INT,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Created EliteBookingOrders table successfully';
            END
            ELSE
            BEGIN
                PRINT 'EliteBookingOrders table already exists';
            END

            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EliteBookingOrderHistory' AND xtype='U')
            BEGIN
                CREATE TABLE EliteBookingOrderHistory (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    BookingOrderId INT NOT NULL,
                    Revision INT NOT NULL,
                    DocNo VARCHAR(50) NOT NULL,
                    DocDate DATE NOT NULL,
                    CustomerName NVARCHAR(200) NOT NULL,
                    CustomerAddress NVARCHAR(MAX),
                    CustomerPhone VARCHAR(50),
                    CustomerTaxId VARCHAR(50),
                    DeliverTo NVARCHAR(255),
                    ContactPerson NVARCHAR(255),
                    Reference NVARCHAR(255),
                    ItemsJSON NVARCHAR(MAX),
                    Subtotal DECIMAL(18,2) DEFAULT 0,
                    Discount DECIMAL(18,2) DEFAULT 0,
                    DiscountPercent DECIMAL(18,2) DEFAULT 0,
                    IncludeVat BIT DEFAULT 0,
                    Vat DECIMAL(18,2) DEFAULT 0,
                    GrandTotal DECIMAL(18,2) DEFAULT 0,
                    DepositPercent DECIMAL(18,2) DEFAULT 0,
                    DepositAmount DECIMAL(18,2) DEFAULT 0,
                    RemainingBalance DECIMAL(18,2) DEFAULT 0,
                    BankAccount VARCHAR(50),
                    Remarks NVARCHAR(MAX),
                    Signer VARCHAR(50),
                    Status NVARCHAR(50),
                    CreatedBy INT,
                    created_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Created EliteBookingOrderHistory table successfully';
            END
            ELSE
            BEGIN
                PRINT 'EliteBookingOrderHistory table already exists';
            END
        `);
        console.log('✅ Done migration for EliteBookingOrders and EliteBookingOrderHistory');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration error:', err);
        process.exit(1);
    }
}

run();

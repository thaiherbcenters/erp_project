const { poolPromise, sql } = require('./config/db');

async function initSOHistoryTables() {
    try {
        const pool = await poolPromise;
        console.log('⏳ Initializing Sales Order History tables...');

        // 1. Ensure Revision column exists in SalesOrder
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID('SalesOrder') AND name = 'Revision'
            )
            BEGIN
                ALTER TABLE SalesOrder ADD Revision INT DEFAULT 0;
            END
        `);

        // 2. Create SalesOrderHistory table if not exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SalesOrderHistory')
            BEGIN
                CREATE TABLE SalesOrderHistory (
                    HistoryID INT IDENTITY(1,1) PRIMARY KEY,
                    SalesOrderID INT,
                    Revision INT DEFAULT 0,
                    SalesOrderNo NVARCHAR(50),
                    QuotationID INT,
                    QuotationNo NVARCHAR(50),
                    ContractID INT,
                    DocType NVARCHAR(50),
                    CustomerName NVARCHAR(255),
                    Address NVARCHAR(MAX),
                    Phone NVARCHAR(50),
                    TaxID NVARCHAR(50),
                    OrderDate DATE,
                    DeliveryDate DATE,
                    SubTotal DECIMAL(18,2),
                    DiscountPercent INT,
                    DiscountAmount DECIMAL(18,2),
                    AfterDiscount DECIMAL(18,2),
                    VatRate INT,
                    VatAmount DECIMAL(18,2),
                    ShippingCost DECIMAL(18,2),
                    GrandTotal DECIMAL(18,2),
                    DepositPercent NVARCHAR(50),
                    DepositAmount DECIMAL(18,2),
                    DesignFee DECIMAL(18,2),
                    ShowDiscountInPrint BIT,
                    ShowVatInPrint BIT,
                    ShowShippingInPrint BIT,
                    ShowDesignFeeInPrint BIT,
                    ShowDepositInPrint BIT,
                    CustomerPONumber NVARCHAR(100),
                    Notes NVARCHAR(MAX),
                    Status NVARCHAR(50),
                    PreparedBy NVARCHAR(100),
                    SalesManager NVARCHAR(100),
                    ProductionManager NVARCHAR(100),
                    ArchivedAt DATETIME DEFAULT GETDATE()
                );
            END
        `);

        // 3. Create SalesOrderItemHistory table if not exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SalesOrderItemHistory')
            BEGIN
                CREATE TABLE SalesOrderItemHistory (
                    ItemHistoryID INT IDENTITY(1,1) PRIMARY KEY,
                    HistoryID INT,
                    ItemOrder INT,
                    ItemName NVARCHAR(255),
                    Qty DECIMAL(18,2),
                    Unit NVARCHAR(50),
                    Price DECIMAL(18,2),
                    Amount DECIMAL(18,2),
                    IsPromo BIT DEFAULT 0,
                    PromoType NVARCHAR(50),
                    PromoMultiplier DECIMAL(18,2),
                    BasePromoName NVARCHAR(255)
                );
            END
        `);

        console.log('✅ Sales Order History tables initialized successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error initializing SO History tables:', err);
        process.exit(1);
    }
}

initSOHistoryTables();

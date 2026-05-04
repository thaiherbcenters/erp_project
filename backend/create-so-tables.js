// Quick script to create SalesOrder tables
require('dotenv').config();
const { sql, poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        
        // Create SalesOrder table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SalesOrder')
            BEGIN
                CREATE TABLE SalesOrder (
                    SalesOrderID    INT IDENTITY(1,1) PRIMARY KEY,
                    SalesOrderNo    NVARCHAR(50)  NOT NULL,
                    QuotationID     INT           NULL,
                    QuotationNo     NVARCHAR(50)  NULL,
                    DocType         NVARCHAR(50)  NULL,
                    CustomerName    NVARCHAR(200) NOT NULL,
                    Address         NVARCHAR(500) NULL,
                    Phone           NVARCHAR(50)  NULL,
                    TaxID           NVARCHAR(50)  NULL,
                    OrderDate       DATE          NOT NULL,
                    DeliveryDate    DATE          NULL,
                    SubTotal        DECIMAL(18,2) DEFAULT 0,
                    DiscountPercent INT           DEFAULT 0,
                    DiscountAmount  DECIMAL(18,2) DEFAULT 0,
                    AfterDiscount   DECIMAL(18,2) DEFAULT 0,
                    VatRate         INT           DEFAULT 0,
                    VatAmount       DECIMAL(18,2) DEFAULT 0,
                    ShippingCost    DECIMAL(18,2) DEFAULT 0,
                    GrandTotal      DECIMAL(18,2) DEFAULT 0,
                    CustomerPONumber NVARCHAR(100) NULL,
                    Notes           NVARCHAR(MAX) NULL,
                    Status          NVARCHAR(50)  DEFAULT N'สร้างแล้ว',
                    CreatedBy       NVARCHAR(50)  NULL,
                    CreatedAt       DATETIME      DEFAULT GETDATE()
                )
            END
        `);
        console.log('✅ SalesOrder table ready');

        // Create SalesOrderItem table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SalesOrderItem')
            BEGIN
                CREATE TABLE SalesOrderItem (
                    ItemID          INT IDENTITY(1,1) PRIMARY KEY,
                    SalesOrderID    INT           NOT NULL,
                    ItemOrder       INT           DEFAULT 1,
                    ItemName        NVARCHAR(200) NOT NULL,
                    Qty             DECIMAL(18,2) DEFAULT 0,
                    Unit            NVARCHAR(50)  NULL,
                    Price           DECIMAL(18,2) DEFAULT 0,
                    Amount          DECIMAL(18,2) DEFAULT 0,
                    CONSTRAINT FK_SOItem_SO FOREIGN KEY (SalesOrderID) REFERENCES SalesOrder(SalesOrderID) ON DELETE CASCADE
                )
            END
        `);
        console.log('✅ SalesOrderItem table ready');

        console.log('🎉 All tables created successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();

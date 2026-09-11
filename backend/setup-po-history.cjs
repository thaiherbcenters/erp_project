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

async function setupPOHistory() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server for PO Revision Setup');

        // 1. Add Revision column to PurchaseOrder if not exists
        await pool.request().query(`
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'Revision' AND Object_ID = Object_ID(N'PurchaseOrder'))
            BEGIN
                ALTER TABLE PurchaseOrder ADD Revision INT NOT NULL DEFAULT 0;
                PRINT 'Added Revision column to PurchaseOrder';
            END
            ELSE
            BEGIN
                PRINT 'Revision column already exists in PurchaseOrder';
            END
        `);

        await pool.request().query(`
            UPDATE PurchaseOrder SET Revision = 0 WHERE Revision IS NULL;
        `);

        // 2. Create PurchaseOrderHistory table if not exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseOrderHistory')
            BEGIN
                CREATE TABLE PurchaseOrderHistory (
                    HistoryID               INT IDENTITY(1,1) PRIMARY KEY,
                    PurchaseOrderID         INT NOT NULL,
                    Revision                INT NOT NULL DEFAULT 0,
                    PONumber                NVARCHAR(50)  NOT NULL,
                    PODate                  DATE          NOT NULL,
                    RefNumber               NVARCHAR(100) NULL,
                    PRNumber                NVARCHAR(100) NULL,
                    DocType                 NVARCHAR(50)  DEFAULT 'po_thc',
                    BuyerName               NVARCHAR(200) NOT NULL,
                    BuyerAddress            NVARCHAR(500) NULL,
                    BuyerPhone              NVARCHAR(50)  NULL,
                    BuyerEmail              NVARCHAR(100) NULL,
                    BuyerTaxID              NVARCHAR(50)  NULL,
                    SupplierID              INT           NULL,
                    SupplierName            NVARCHAR(200) NOT NULL,
                    SupplierAddress         NVARCHAR(500) NULL,
                    SupplierPhone           NVARCHAR(50)  NULL,
                    SupplierEmail           NVARCHAR(100) NULL,
                    SupplierTaxID           NVARCHAR(50)  NULL,
                    SubTotal                DECIMAL(18,2) DEFAULT 0,
                    DiscountPercent         DECIMAL(5,2)  DEFAULT 0,
                    DiscountAmount          DECIMAL(18,2) DEFAULT 0,
                    VatRate                 DECIMAL(5,2)  DEFAULT 7,
                    VatAmount               DECIMAL(18,2) DEFAULT 0,
                    GrandTotal              DECIMAL(18,2) DEFAULT 0,
                    WithholdingTaxRate      DECIMAL(5,2)  DEFAULT 0,
                    WithholdingTaxAmount    DECIMAL(18,2) DEFAULT 0,
                    TotalPayable            DECIMAL(18,2) DEFAULT 0,
                    Notes                   NVARCHAR(MAX) NULL,
                    PreparedBy              NVARCHAR(100) NULL,
                    ApprovedBy              NVARCHAR(100) NULL,
                    SupplierRecipient       NVARCHAR(100) NULL,
                    Status                  NVARCHAR(50)  DEFAULT N'รออนุมัติ',
                    CreatedBy               INT           NULL,
                    ArchivedAt              DATETIME      DEFAULT GETDATE(),
                    CONSTRAINT FK_POHistory_PO FOREIGN KEY (PurchaseOrderID) REFERENCES PurchaseOrder(PurchaseOrderID) ON DELETE CASCADE
                );
                PRINT 'Created table: PurchaseOrderHistory';
            END
            ELSE
            BEGIN
                PRINT 'PurchaseOrderHistory table already exists';
            END
        `);

        // 3. Create PurchaseOrderItemHistory table if not exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseOrderItemHistory')
            BEGIN
                CREATE TABLE PurchaseOrderItemHistory (
                    ItemHistoryID           INT IDENTITY(1,1) PRIMARY KEY,
                    HistoryID               INT NOT NULL,
                    ItemOrder               INT DEFAULT 1,
                    ItemName                NVARCHAR(255) NOT NULL,
                    ItemCode                NVARCHAR(100) NULL,
                    Qty                     DECIMAL(18,4) DEFAULT 1,
                    Unit                    NVARCHAR(50)  DEFAULT N'ชิ้น',
                    UnitPrice               DECIMAL(18,2) DEFAULT 0,
                    VatRate                 DECIMAL(5,2)  DEFAULT 7,
                    VatAmount               DECIMAL(18,2) DEFAULT 0,
                    LineTotal               DECIMAL(18,2) DEFAULT 0,
                    WhtRate                 DECIMAL(5,2)  DEFAULT 0,
                    WhtAmount               DECIMAL(18,2) DEFAULT 0,
                    CONSTRAINT FK_POItemHistory_History FOREIGN KEY (HistoryID) REFERENCES PurchaseOrderHistory(HistoryID) ON DELETE CASCADE
                );
                PRINT 'Created table: PurchaseOrderItemHistory';
            END
            ELSE
            BEGIN
                PRINT 'PurchaseOrderItemHistory table already exists';
            END
        `);

        console.log('✅ PurchaseOrder Revision & History setup complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Setup error:', err);
        process.exit(1);
    } finally {
        if (pool) await pool.close();
    }
}

setupPOHistory();

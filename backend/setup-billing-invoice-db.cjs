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

async function setup() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server');

        // 1. BillingInvoice
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BillingInvoice')
            BEGIN
                CREATE TABLE BillingInvoice (
                    BillingInvoiceID     INT IDENTITY(1,1) PRIMARY KEY,
                    BillingInvoiceNo     NVARCHAR(50) NOT NULL,
                    ContractID      INT NULL,
                    DocType         NVARCHAR(50) NOT NULL DEFAULT 'billing_invoice_thc',
                    BankAccount     NVARCHAR(20) NOT NULL DEFAULT 'ktb',
                    CustomerName    NVARCHAR(200) NOT NULL,
                    Address         NVARCHAR(500) NULL,
                    Phone           NVARCHAR(50) NULL,
                    TaxID           NVARCHAR(20) NULL,
                    BillDate        DATE NOT NULL,
                    ValidUntil      DATE NULL,
                    SubTotal        DECIMAL(18,2) NOT NULL DEFAULT 0,
                    DiscountPercent INT NOT NULL DEFAULT 0,
                    DiscountAmount  DECIMAL(18,2) NOT NULL DEFAULT 0,
                    AfterDiscount   DECIMAL(18,2) NOT NULL DEFAULT 0,
                    VatRate         INT NOT NULL DEFAULT 0,
                    VatAmount       DECIMAL(18,2) NOT NULL DEFAULT 0,
                    ShippingCost    DECIMAL(18,2) NOT NULL DEFAULT 0,
                    GrandTotal      DECIMAL(18,2) NOT NULL DEFAULT 0,
                    DepositPercent  NVARCHAR(10) NOT NULL DEFAULT '0',
                    DepositAmount   DECIMAL(18,2) NOT NULL DEFAULT 0,
                    RemainingAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
                    Signer          NVARCHAR(100) NULL,
                    Notes           NVARCHAR(MAX) NULL,
                    ShowDiscountInPrint BIT NOT NULL DEFAULT 0,
                    ShowVatInPrint     BIT NOT NULL DEFAULT 0,
                    ShowDepositInPrint BIT NOT NULL DEFAULT 0,
                    ShowShippingInPrint BIT NOT NULL DEFAULT 1,
                    DesignFee       DECIMAL(18,2) NOT NULL DEFAULT 0,
                    ShowDesignFeeInPrint BIT NOT NULL DEFAULT 0,
                    Status          NVARCHAR(20) NOT NULL DEFAULT N'ร่าง',
                    Revision        INT NOT NULL DEFAULT 0,
                    IsLatest        BIT NOT NULL DEFAULT 1,
                    FdaCustomerCode NVARCHAR(50) NULL,
                    FdaEmail        NVARCHAR(100) NULL,
                    FdaProjectName  NVARCHAR(200) NULL,
                    FdaCreditTerms  NVARCHAR(50) NULL,
                    FdaServiceRegister BIT NOT NULL DEFAULT 0,
                    FdaServiceRegisterPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
                    FdaServiceTrademark BIT NOT NULL DEFAULT 0,
                    FdaServiceTrademarkPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
                    CreatedAt       DATETIME NOT NULL DEFAULT GETDATE(),
                    UpdatedAt       DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT 'Created table: BillingInvoice';
            END
        `);

        // 2. BillingInvoiceItem
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BillingInvoiceItem')
            BEGIN
                CREATE TABLE BillingInvoiceItem (
                    ItemID          INT IDENTITY(1,1) PRIMARY KEY,
                    BillingInvoiceID     INT NOT NULL,
                    ItemOrder       INT NOT NULL DEFAULT 0,
                    ItemName        NVARCHAR(300) NOT NULL,
                    Qty             DECIMAL(18,2) NOT NULL DEFAULT 0,
                    Price           DECIMAL(18,2) NOT NULL DEFAULT 0,
                    Amount          DECIMAL(18,2) NOT NULL DEFAULT 0,
                    IsPromo         BIT NOT NULL DEFAULT 0,
                    PromoMultiplier INT NOT NULL DEFAULT 1,
                    ImageURL        NVARCHAR(MAX) NULL,
                    CONSTRAINT FK_BillingInvoiceItem_BillingInvoice FOREIGN KEY (BillingInvoiceID) REFERENCES BillingInvoice(BillingInvoiceID) ON DELETE CASCADE
                );
                PRINT 'Created table: BillingInvoiceItem';
            END
        `);

        // 3. BillingInvoiceHistory
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BillingInvoiceHistory')
            BEGIN
                CREATE TABLE BillingInvoiceHistory (
                    HistoryID       INT IDENTITY(1,1) PRIMARY KEY,
                    BillingInvoiceID     INT NOT NULL,
                    Revision        INT NOT NULL,
                    BillingInvoiceNo     NVARCHAR(50) NOT NULL,
                    ContractID      INT NULL,
                    DocType         NVARCHAR(50) NOT NULL,
                    BankAccount     NVARCHAR(20) NOT NULL,
                    CustomerName    NVARCHAR(200) NOT NULL,
                    Address         NVARCHAR(500) NULL,
                    Phone           NVARCHAR(50) NULL,
                    TaxID           NVARCHAR(20) NULL,
                    BillDate        DATE NOT NULL,
                    ValidUntil      DATE NULL,
                    SubTotal        DECIMAL(18,2) NOT NULL DEFAULT 0,
                    DiscountPercent INT NOT NULL DEFAULT 0,
                    DiscountAmount  DECIMAL(18,2) NOT NULL DEFAULT 0,
                    AfterDiscount   DECIMAL(18,2) NOT NULL DEFAULT 0,
                    VatRate         INT NOT NULL DEFAULT 0,
                    VatAmount       DECIMAL(18,2) NOT NULL DEFAULT 0,
                    ShippingCost    DECIMAL(18,2) NOT NULL DEFAULT 0,
                    GrandTotal      DECIMAL(18,2) NOT NULL DEFAULT 0,
                    DepositPercent  NVARCHAR(10) NOT NULL DEFAULT '0',
                    DepositAmount   DECIMAL(18,2) NOT NULL DEFAULT 0,
                    RemainingAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
                    Signer          NVARCHAR(100) NULL,
                    Notes           NVARCHAR(MAX) NULL,
                    ShowDiscountInPrint BIT NOT NULL DEFAULT 0,
                    ShowVatInPrint     BIT NOT NULL DEFAULT 0,
                    ShowDepositInPrint BIT NOT NULL DEFAULT 0,
                    ShowShippingInPrint BIT NOT NULL DEFAULT 1,
                    DesignFee       DECIMAL(18,2) NOT NULL DEFAULT 0,
                    ShowDesignFeeInPrint BIT NOT NULL DEFAULT 0,
                    Status          NVARCHAR(20) NOT NULL DEFAULT N'ร่าง',
                    FdaCustomerCode NVARCHAR(50) NULL,
                    FdaEmail        NVARCHAR(100) NULL,
                    FdaProjectName  NVARCHAR(200) NULL,
                    FdaCreditTerms  NVARCHAR(50) NULL,
                    FdaServiceRegister BIT NOT NULL DEFAULT 0,
                    FdaServiceRegisterPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
                    FdaServiceTrademark BIT NOT NULL DEFAULT 0,
                    FdaServiceTrademarkPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
                    CreatedAt       DATETIME NOT NULL,
                    ArchivedAt      DATETIME NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT FK_BillingInvoiceHistory_BillingInvoice FOREIGN KEY (BillingInvoiceID) REFERENCES BillingInvoice(BillingInvoiceID) ON DELETE CASCADE
                );
                PRINT 'Created table: BillingInvoiceHistory';
            END
        `);

        // 4. BillingInvoiceItemHistory
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BillingInvoiceItemHistory')
            BEGIN
                CREATE TABLE BillingInvoiceItemHistory (
                    ItemHistoryID   INT IDENTITY(1,1) PRIMARY KEY,
                    HistoryID       INT NOT NULL,
                    ItemOrder       INT NOT NULL DEFAULT 0,
                    ItemName        NVARCHAR(300) NOT NULL,
                    Qty             DECIMAL(18,2) NOT NULL DEFAULT 0,
                    Price           DECIMAL(18,2) NOT NULL DEFAULT 0,
                    Amount          DECIMAL(18,2) NOT NULL DEFAULT 0,
                    IsPromo         BIT NOT NULL DEFAULT 0,
                    PromoMultiplier INT NOT NULL DEFAULT 1,
                    ImageURL        NVARCHAR(MAX) NULL,
                    CONSTRAINT FK_BillingInvoiceItemHistory_BillingInvoiceHistory FOREIGN KEY (HistoryID) REFERENCES BillingInvoiceHistory(HistoryID) ON DELETE CASCADE
                );
                PRINT 'Created table: BillingInvoiceItemHistory';
            END
        `);

        console.log('✅ Setup complete!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

setup();

/**
 * setup-quotation-db.cjs
 * สร้างตาราง Quotation + QuotationItem ใน SQL Server
 */
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

        // ── 1. Quotation (Header) ──
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Quotation')
            BEGIN
                CREATE TABLE Quotation (
                    QuotationID     INT IDENTITY(1,1) PRIMARY KEY,
                    QuotationNo     NVARCHAR(50) NOT NULL,
                    DocType         NVARCHAR(50) NOT NULL DEFAULT 'quotation_thc',
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
                    Status          NVARCHAR(20) NOT NULL DEFAULT N'ร่าง',
                    Revision        INT NOT NULL DEFAULT 0,
                    CreatedAt       DATETIME NOT NULL DEFAULT GETDATE(),
                    UpdatedAt       DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT 'Created table: Quotation';
            END
            ELSE PRINT 'Table Quotation already exists';
        `);

        // ── 2. QuotationItem (Line Items) ──
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'QuotationItem')
            BEGIN
                CREATE TABLE QuotationItem (
                    ItemID          INT IDENTITY(1,1) PRIMARY KEY,
                    QuotationID     INT NOT NULL,
                    ItemOrder       INT NOT NULL DEFAULT 0,
                    ItemName        NVARCHAR(300) NOT NULL,
                    Qty             DECIMAL(18,2) NOT NULL DEFAULT 0,
                    Price           DECIMAL(18,2) NOT NULL DEFAULT 0,
                    Amount          DECIMAL(18,2) NOT NULL DEFAULT 0,
                    IsPromo         BIT NOT NULL DEFAULT 0,
                    PromoMultiplier INT NOT NULL DEFAULT 1,
                    ImageURL        NVARCHAR(MAX) NULL,
                    CONSTRAINT FK_QuotationItem_Quotation FOREIGN KEY (QuotationID) REFERENCES Quotation(QuotationID) ON DELETE CASCADE
                );
                PRINT 'Created table: QuotationItem';
            END
            ELSE PRINT 'Table QuotationItem already exists';
        `);

        console.log('✅ Setup complete!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

setup();

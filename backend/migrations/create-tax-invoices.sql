-- =============================================================================
-- TaxInvoice / Delivery Order Tables
-- =============================================================================

-- 1. Header
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TaxInvoice')
BEGIN
    CREATE TABLE TaxInvoice (
        TaxInvoiceID    INT IDENTITY(1,1) PRIMARY KEY,
        TaxInvoiceNo    NVARCHAR(50)  NOT NULL,
        ContractID      INT           NULL,       -- FK → Contract (NULL = Manual)
        DocType         NVARCHAR(50)  NOT NULL,   -- e.g., tax_invoice_thc, delivery_order_thc
        BankAccount     NVARCHAR(20)  NOT NULL,
        CustomerName    NVARCHAR(200) NOT NULL,
        Address         NVARCHAR(500) NULL,
        Phone           NVARCHAR(50)  NULL,
        TaxID           NVARCHAR(20)  NULL,
        BillDate        DATE          NOT NULL,
        ValidUntil      DATE          NULL,
        SubTotal        DECIMAL(18,2) DEFAULT 0,
        DiscountPercent INT           DEFAULT 0,
        DiscountAmount  DECIMAL(18,2) DEFAULT 0,
        AfterDiscount   DECIMAL(18,2) DEFAULT 0,
        VatRate         INT           DEFAULT 0,
        VatAmount       DECIMAL(18,2) DEFAULT 0,
        ShippingCost    DECIMAL(18,2) DEFAULT 0,
        DesignFee       DECIMAL(18,2) DEFAULT 0,
        GrandTotal      DECIMAL(18,2) DEFAULT 0,
        DepositPercent  NVARCHAR(10)  DEFAULT '0',
        DepositAmount   DECIMAL(18,2) DEFAULT 0,
        RemainingAmount DECIMAL(18,2) DEFAULT 0,
        Signer          NVARCHAR(100) NULL,
        Notes           NVARCHAR(MAX) NULL,
        
        -- Print Options
        ShowDiscountInPrint  BIT DEFAULT 0,
        ShowVatInPrint       BIT DEFAULT 0,
        ShowDepositInPrint   BIT DEFAULT 0,
        ShowShippingInPrint  BIT DEFAULT 1,
        ShowDesignFeeInPrint BIT DEFAULT 0,

        -- FDA Specific
        FdaCustomerCode      NVARCHAR(50)  NULL,
        FdaEmail             NVARCHAR(100) NULL,
        FdaProjectName       NVARCHAR(200) NULL,
        FdaCreditTerms       NVARCHAR(50)  NULL,
        FdaServiceRegister   BIT DEFAULT 0,
        FdaServiceRegisterPrice DECIMAL(18,2) DEFAULT 0,
        FdaServiceTrademark  BIT DEFAULT 0,
        FdaServiceTrademarkPrice DECIMAL(18,2) DEFAULT 0,

        Status          NVARCHAR(20)  DEFAULT N'ร่าง',
        CreatedAt       DATETIME      DEFAULT GETDATE(),
        CreatedBy       NVARCHAR(50)  NULL
    );
    PRINT 'Created table: TaxInvoice';
END
GO

-- 2. Items
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TaxInvoiceItem')
BEGIN
    CREATE TABLE TaxInvoiceItem (
        ItemID          INT IDENTITY(1,1) PRIMARY KEY,
        TaxInvoiceID    INT           NOT NULL,
        ItemOrder       INT           DEFAULT 0,
        ItemName        NVARCHAR(300) NOT NULL,
        Qty             DECIMAL(18,2) DEFAULT 0,
        Unit            NVARCHAR(50)  NULL,
        Price           DECIMAL(18,2) DEFAULT 0,
        Amount          DECIMAL(18,2) DEFAULT 0,
        IsPromo         BIT           DEFAULT 0,
        PromoMultiplier INT           DEFAULT 1,
        ImageURL        NVARCHAR(MAX) NULL,
        CONSTRAINT FK_TaxInvoiceItem_TI FOREIGN KEY (TaxInvoiceID) REFERENCES TaxInvoice(TaxInvoiceID) ON DELETE CASCADE
    );
    PRINT 'Created table: TaxInvoiceItem';
END
GO

-- 3. History
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TaxInvoiceHistory')
BEGIN
    CREATE TABLE TaxInvoiceHistory (
        HistoryID       INT IDENTITY(1,1) PRIMARY KEY,
        TaxInvoiceID    INT           NOT NULL,
        Revision        INT           NOT NULL,
        TaxInvoiceNo    NVARCHAR(50)  NOT NULL,
        ContractID      INT           NULL,
        DocType         NVARCHAR(50)  NOT NULL,
        BankAccount     NVARCHAR(20)  NOT NULL,
        CustomerName    NVARCHAR(200) NOT NULL,
        Address         NVARCHAR(500) NULL,
        Phone           NVARCHAR(50)  NULL,
        TaxID           NVARCHAR(20)  NULL,
        BillDate        DATE          NOT NULL,
        ValidUntil      DATE          NULL,
        SubTotal        DECIMAL(18,2) DEFAULT 0,
        DiscountPercent INT           DEFAULT 0,
        DiscountAmount  DECIMAL(18,2) DEFAULT 0,
        AfterDiscount   DECIMAL(18,2) DEFAULT 0,
        VatRate         INT           DEFAULT 0,
        VatAmount       DECIMAL(18,2) DEFAULT 0,
        ShippingCost    DECIMAL(18,2) DEFAULT 0,
        DesignFee       DECIMAL(18,2) DEFAULT 0,
        GrandTotal      DECIMAL(18,2) DEFAULT 0,
        DepositPercent  NVARCHAR(10)  DEFAULT '0',
        DepositAmount   DECIMAL(18,2) DEFAULT 0,
        RemainingAmount DECIMAL(18,2) DEFAULT 0,
        Signer          NVARCHAR(100) NULL,
        Notes           NVARCHAR(MAX) NULL,
        
        -- Print Options
        ShowDiscountInPrint  BIT DEFAULT 0,
        ShowVatInPrint       BIT DEFAULT 0,
        ShowDepositInPrint   BIT DEFAULT 0,
        ShowShippingInPrint  BIT DEFAULT 1,
        ShowDesignFeeInPrint BIT DEFAULT 0,

        -- FDA Specific
        FdaCustomerCode      NVARCHAR(50)  NULL,
        FdaEmail             NVARCHAR(100) NULL,
        FdaProjectName       NVARCHAR(200) NULL,
        FdaCreditTerms       NVARCHAR(50)  NULL,
        FdaServiceRegister   BIT DEFAULT 0,
        FdaServiceRegisterPrice DECIMAL(18,2) DEFAULT 0,
        FdaServiceTrademark  BIT DEFAULT 0,
        FdaServiceTrademarkPrice DECIMAL(18,2) DEFAULT 0,

        Status          NVARCHAR(20)  DEFAULT N'ร่าง',
        CreatedAt       DATETIME      NOT NULL,
        ArchivedAt      DATETIME      DEFAULT GETDATE(),
        CONSTRAINT FK_TaxInvoiceHistory_TI FOREIGN KEY (TaxInvoiceID) REFERENCES TaxInvoice(TaxInvoiceID) ON DELETE CASCADE
    );
    PRINT 'Created table: TaxInvoiceHistory';
END
GO

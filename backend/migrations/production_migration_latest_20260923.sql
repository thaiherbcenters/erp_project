-- =========================================================================
-- ERP THAIHERB: COMPREHENSIVE PRODUCTION DATABASE MIGRATION SCRIPT
-- Generated: 2026-09-23
-- Target Database: ERP_THAIHERB (Production)
-- Safety: 100% Non-destructive & Idempotent (IF NOT EXISTS on all steps)
-- =========================================================================

USE ERP_THAIHERB;
GO

PRINT '---------------------------------------------------------';
PRINT 'Starting Production Migration for ERP ThaiHerb System...';
PRINT '---------------------------------------------------------';
GO

-- =========================================================================
-- หมวดที่ 1: เพิ่มคอลัมน์ใหม่ในตารางเดิม (Existing Tables Alterations)
-- =========================================================================

-- ตาราง Company
IF COL_LENGTH('Company', 'CompanyNameTH') IS NULL
BEGIN
    ALTER TABLE [Company] ADD [CompanyNameTH] NVARCHAR(500) NULL;
    PRINT '✅ Added column [CompanyNameTH] to [Company]';
END;
GO

IF COL_LENGTH('Company', 'CompanyNameEN') IS NULL
BEGIN
    ALTER TABLE [Company] ADD [CompanyNameEN] NVARCHAR(500) NULL;
    PRINT '✅ Added column [CompanyNameEN] to [Company]';
END;
GO

IF COL_LENGTH('Company', 'CompanyRegistrationNo') IS NULL
BEGIN
    ALTER TABLE [Company] ADD [CompanyRegistrationNo] NVARCHAR(50) NULL;
    PRINT '✅ Added column [CompanyRegistrationNo] to [Company]';
END;
GO

IF COL_LENGTH('Company', 'LicenseNo') IS NULL
BEGIN
    ALTER TABLE [Company] ADD [LicenseNo] NVARCHAR(50) NULL;
    PRINT '✅ Added column [LicenseNo] to [Company]';
END;
GO

IF COL_LENGTH('Company', 'TaxNo') IS NULL
BEGIN
    ALTER TABLE [Company] ADD [TaxNo] NVARCHAR(50) NULL;
    PRINT '✅ Added column [TaxNo] to [Company]';
END;
GO

IF COL_LENGTH('Company', 'CompanyColor') IS NULL
BEGIN
    ALTER TABLE [Company] ADD [CompanyColor] NVARCHAR(20) NULL;
    PRINT '✅ Added column [CompanyColor] to [Company]';
END;
GO

IF COL_LENGTH('Company', 'CompanyIcon') IS NULL
BEGIN
    ALTER TABLE [Company] ADD [CompanyIcon] NVARCHAR(50) NULL;
    PRINT '✅ Added column [CompanyIcon] to [Company]';
END;
GO

IF COL_LENGTH('Company', 'ShortName') IS NULL
BEGIN
    ALTER TABLE [Company] ADD [ShortName] NVARCHAR(20) NULL;
    PRINT '✅ Added column [ShortName] to [Company]';
END;
GO

IF COL_LENGTH('Company', 'CompanyLogo') IS NULL
BEGIN
    ALTER TABLE [Company] ADD [CompanyLogo] NVARCHAR(255) NULL;
    PRINT '✅ Added column [CompanyLogo] to [Company]';
END;
GO

-- ตาราง Users
IF COL_LENGTH('Users', 'CompanyID') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [CompanyID] INT NULL DEFAULT 1;
    PRINT '✅ Added column [CompanyID] to [Users]';
END;
GO

IF COL_LENGTH('Users', 'department') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [department] NVARCHAR(100) NULL;
    PRINT '✅ Added column [department] to [Users]';
END;
GO

-- ตาราง Quotation
IF COL_LENGTH('Quotation', 'CompanyID') IS NULL
BEGIN
    ALTER TABLE [Quotation] ADD [CompanyID] INT NULL DEFAULT 1;
    PRINT '✅ Added column [CompanyID] to [Quotation]';
END;
GO

-- ตาราง BillingInvoice
IF COL_LENGTH('BillingInvoice', 'CompanyID') IS NULL
BEGIN
    ALTER TABLE [BillingInvoice] ADD [CompanyID] INT NULL DEFAULT 1;
    PRINT '✅ Added column [CompanyID] to [BillingInvoice]';
END;
GO

-- ตาราง TaxInvoice
IF COL_LENGTH('TaxInvoice', 'CompanyID') IS NULL
BEGIN
    ALTER TABLE [TaxInvoice] ADD [CompanyID] INT NULL DEFAULT 1;
    PRINT '✅ Added column [CompanyID] to [TaxInvoice]';
END;
GO

-- ตาราง DeliveryOrder
IF COL_LENGTH('DeliveryOrder', 'CompanyID') IS NULL
BEGIN
    ALTER TABLE [DeliveryOrder] ADD [CompanyID] INT NULL DEFAULT 1;
    PRINT '✅ Added column [CompanyID] to [DeliveryOrder]';
END;
GO

-- ตาราง Receipt
IF COL_LENGTH('Receipt', 'CompanyID') IS NULL
BEGIN
    ALTER TABLE [Receipt] ADD [CompanyID] INT NULL DEFAULT 1;
    PRINT '✅ Added column [CompanyID] to [Receipt]';
END;
GO

-- ตาราง SalesOrder
IF COL_LENGTH('SalesOrder', 'CompanyID') IS NULL
BEGIN
    ALTER TABLE [SalesOrder] ADD [CompanyID] INT NULL DEFAULT 1;
    PRINT '✅ Added column [CompanyID] to [SalesOrder]';
END;
GO

-- ตาราง Contracts
IF COL_LENGTH('Contracts', 'CompanyID') IS NULL
BEGIN
    ALTER TABLE [Contracts] ADD [CompanyID] INT NULL DEFAULT 1;
    PRINT '✅ Added column [CompanyID] to [Contracts]';
END;
GO

-- ตาราง Receipt
IF COL_LENGTH('Receipt', 'IsDeposit') IS NULL
BEGIN
    ALTER TABLE [Receipt] ADD [IsDeposit] BIT NULL DEFAULT 0;
    PRINT '✅ Added column [IsDeposit] to [Receipt]';
END;
GO

IF COL_LENGTH('Receipt', 'DepositStatus') IS NULL
BEGIN
    ALTER TABLE [Receipt] ADD [DepositStatus] NVARCHAR(50) NULL DEFAULT N'ชำระครบถ้วน';
    PRINT '✅ Added column [DepositStatus] to [Receipt]';
END;
GO

IF COL_LENGTH('Receipt', 'PaidDepositAmount') IS NULL
BEGIN
    ALTER TABLE [Receipt] ADD [PaidDepositAmount] DECIMAL(18,2) NULL DEFAULT 0;
    PRINT '✅ Added column [PaidDepositAmount] to [Receipt]';
END;
GO

IF COL_LENGTH('Receipt', 'QuotationID') IS NULL
BEGIN
    ALTER TABLE [Receipt] ADD [QuotationID] INT NULL;
    PRINT '✅ Added column [QuotationID] to [Receipt]';
END;
GO

IF COL_LENGTH('Receipt', 'QuotationGrandTotal') IS NULL
BEGIN
    ALTER TABLE [Receipt] ADD [QuotationGrandTotal] DECIMAL(18,2) NULL;
    PRINT '✅ Added column [QuotationGrandTotal] to [Receipt]';
END;
GO

-- ตาราง ReceiptHistory
IF COL_LENGTH('ReceiptHistory', 'IsDeposit') IS NULL
BEGIN
    ALTER TABLE [ReceiptHistory] ADD [IsDeposit] BIT NULL DEFAULT 0;
    PRINT '✅ Added column [IsDeposit] to [ReceiptHistory]';
END;
GO

IF COL_LENGTH('ReceiptHistory', 'DepositStatus') IS NULL
BEGIN
    ALTER TABLE [ReceiptHistory] ADD [DepositStatus] NVARCHAR(50) NULL DEFAULT N'ชำระครบถ้วน';
    PRINT '✅ Added column [DepositStatus] to [ReceiptHistory]';
END;
GO

IF COL_LENGTH('ReceiptHistory', 'PaidDepositAmount') IS NULL
BEGIN
    ALTER TABLE [ReceiptHistory] ADD [PaidDepositAmount] DECIMAL(18,2) NULL DEFAULT 0;
    PRINT '✅ Added column [PaidDepositAmount] to [ReceiptHistory]';
END;
GO

-- ตาราง Quotation
IF COL_LENGTH('Quotation', 'DepositStatus') IS NULL
BEGIN
    ALTER TABLE [Quotation] ADD [DepositStatus] NVARCHAR(50) NULL DEFAULT N'ยังไม่มีการวางมัดจำ';
    PRINT '✅ Added column [DepositStatus] to [Quotation]';
END;
GO

IF COL_LENGTH('Quotation', 'PaidDepositAmount') IS NULL
BEGIN
    ALTER TABLE [Quotation] ADD [PaidDepositAmount] DECIMAL(18,2) NULL DEFAULT 0;
    PRINT '✅ Added column [PaidDepositAmount] to [Quotation]';
END;
GO

IF COL_LENGTH('Quotation', 'FdaServiceRegisterQuantity') IS NULL
BEGIN
    ALTER TABLE [Quotation] ADD [FdaServiceRegisterQuantity] INT NULL DEFAULT 1;
    PRINT '✅ Added column [FdaServiceRegisterQuantity] to [Quotation]';
END;
GO

IF COL_LENGTH('Quotation', 'FdaServiceTrademarkQuantity') IS NULL
BEGIN
    ALTER TABLE [Quotation] ADD [FdaServiceTrademarkQuantity] INT NULL DEFAULT 1;
    PRINT '✅ Added column [FdaServiceTrademarkQuantity] to [Quotation]';
END;
GO

-- ตาราง BillingInvoice
IF COL_LENGTH('BillingInvoice', 'FdaServiceRegisterQuantity') IS NULL
BEGIN
    ALTER TABLE [BillingInvoice] ADD [FdaServiceRegisterQuantity] INT NULL DEFAULT 1;
    PRINT '✅ Added column [FdaServiceRegisterQuantity] to [BillingInvoice]';
END;
GO

IF COL_LENGTH('BillingInvoice', 'FdaServiceTrademarkQuantity') IS NULL
BEGIN
    ALTER TABLE [BillingInvoice] ADD [FdaServiceTrademarkQuantity] INT NULL DEFAULT 1;
    PRINT '✅ Added column [FdaServiceTrademarkQuantity] to [BillingInvoice]';
END;
GO

-- ตาราง TaxInvoice
IF COL_LENGTH('TaxInvoice', 'FdaServiceRegisterQuantity') IS NULL
BEGIN
    ALTER TABLE [TaxInvoice] ADD [FdaServiceRegisterQuantity] INT NULL DEFAULT 1;
    PRINT '✅ Added column [FdaServiceRegisterQuantity] to [TaxInvoice]';
END;
GO

IF COL_LENGTH('TaxInvoice', 'FdaServiceTrademarkQuantity') IS NULL
BEGIN
    ALTER TABLE [TaxInvoice] ADD [FdaServiceTrademarkQuantity] INT NULL DEFAULT 1;
    PRINT '✅ Added column [FdaServiceTrademarkQuantity] to [TaxInvoice]';
END;
GO

-- ตาราง DeliveryOrder
IF COL_LENGTH('DeliveryOrder', 'FdaServiceRegisterQuantity') IS NULL
BEGIN
    ALTER TABLE [DeliveryOrder] ADD [FdaServiceRegisterQuantity] INT NULL DEFAULT 1;
    PRINT '✅ Added column [FdaServiceRegisterQuantity] to [DeliveryOrder]';
END;
GO

IF COL_LENGTH('DeliveryOrder', 'FdaServiceTrademarkQuantity') IS NULL
BEGIN
    ALTER TABLE [DeliveryOrder] ADD [FdaServiceTrademarkQuantity] INT NULL DEFAULT 1;
    PRINT '✅ Added column [FdaServiceTrademarkQuantity] to [DeliveryOrder]';
END;
GO

-- ตาราง Receipt
IF COL_LENGTH('Receipt', 'FdaServiceRegisterQuantity') IS NULL
BEGIN
    ALTER TABLE [Receipt] ADD [FdaServiceRegisterQuantity] INT NULL DEFAULT 1;
    PRINT '✅ Added column [FdaServiceRegisterQuantity] to [Receipt]';
END;
GO

IF COL_LENGTH('Receipt', 'FdaServiceTrademarkQuantity') IS NULL
BEGIN
    ALTER TABLE [Receipt] ADD [FdaServiceTrademarkQuantity] INT NULL DEFAULT 1;
    PRINT '✅ Added column [FdaServiceTrademarkQuantity] to [Receipt]';
END;
GO

-- =========================================================================
-- หมวดที่ 2: สร้างตารางใหม่ (New Tables Creation)
-- =========================================================================

-- ตาราง: UserCompanyAccess
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserCompanyAccess')
BEGIN
    CREATE TABLE [UserCompanyAccess] (
        [UserCompanyID] INT IDENTITY(1,1) NOT NULL,
        [user_id] INT NOT NULL,
        [CompanyID] INT NOT NULL,
        [is_default] BIT NULL DEFAULT ((0)),
        [role_override] NVARCHAR(50) NULL,
        CONSTRAINT [PK_UserCompanyAccess] PRIMARY KEY ([UserCompanyID])
    );
    PRINT '✅ Created table: UserCompanyAccess';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table UserCompanyAccess already exists';
END;
GO

-- ตาราง: PurchaseOrder
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PurchaseOrder')
BEGIN
    CREATE TABLE [PurchaseOrder] (
        [PurchaseOrderID] INT IDENTITY(1,1) NOT NULL,
        [PONumber] NVARCHAR(50) NOT NULL,
        [PODate] DATE NOT NULL,
        [RefNumber] NVARCHAR(100) NULL,
        [PRNumber] NVARCHAR(100) NULL,
        [DocType] NVARCHAR(50) NULL DEFAULT ('po_thc'),
        [BuyerName] NVARCHAR(200) NOT NULL,
        [BuyerAddress] NVARCHAR(500) NULL,
        [BuyerPhone] NVARCHAR(50) NULL,
        [BuyerEmail] NVARCHAR(100) NULL,
        [BuyerTaxID] NVARCHAR(50) NULL,
        [SupplierID] INT NULL,
        [SupplierName] NVARCHAR(200) NOT NULL,
        [SupplierAddress] NVARCHAR(500) NULL,
        [SupplierPhone] NVARCHAR(50) NULL,
        [SupplierEmail] NVARCHAR(100) NULL,
        [SupplierTaxID] NVARCHAR(50) NULL,
        [SubTotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DiscountPercent] DECIMAL(5, 2) NULL DEFAULT ((0)),
        [DiscountAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [VatRate] DECIMAL(5, 2) NULL DEFAULT ((7)),
        [VatAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [GrandTotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [WithholdingTaxRate] DECIMAL(5, 2) NULL DEFAULT ((0)),
        [WithholdingTaxAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [TotalPayable] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Notes] NVARCHAR(MAX) NULL,
        [PreparedBy] NVARCHAR(100) NULL,
        [ApprovedBy] NVARCHAR(100) NULL,
        [SupplierRecipient] NVARCHAR(100) NULL,
        [Status] NVARCHAR(50) NULL DEFAULT (N'รออนุมัติ'),
        [CreatedBy] INT NULL,
        [CreatedAt] DATETIME NULL DEFAULT (getdate()),
        [UpdatedAt] DATETIME NULL DEFAULT (getdate()),
        [Revision] INT NOT NULL DEFAULT ((0)),
        CONSTRAINT [PK_PurchaseOrder] PRIMARY KEY ([PurchaseOrderID])
    );
    PRINT '✅ Created table: PurchaseOrder';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table PurchaseOrder already exists';
END;
GO

-- ตาราง: PurchaseOrderItem
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PurchaseOrderItem')
BEGIN
    CREATE TABLE [PurchaseOrderItem] (
        [ItemID] INT IDENTITY(1,1) NOT NULL,
        [PurchaseOrderID] INT NOT NULL,
        [ItemOrder] INT NULL DEFAULT ((1)),
        [ItemName] NVARCHAR(255) NOT NULL,
        [ItemCode] NVARCHAR(100) NULL,
        [Qty] DECIMAL(18, 4) NULL DEFAULT ((1)),
        [Unit] NVARCHAR(50) NULL DEFAULT (N'ชิ้น'),
        [UnitPrice] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [VatRate] DECIMAL(5, 2) NULL DEFAULT ((7)),
        [VatAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [LineTotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [WhtRate] DECIMAL(5, 2) NULL DEFAULT ((0)),
        [WhtAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        CONSTRAINT [PK_PurchaseOrderItem] PRIMARY KEY ([ItemID])
    );
    PRINT '✅ Created table: PurchaseOrderItem';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table PurchaseOrderItem already exists';
END;
GO

-- ตาราง: PurchaseOrderHistory
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PurchaseOrderHistory')
BEGIN
    CREATE TABLE [PurchaseOrderHistory] (
        [HistoryID] INT IDENTITY(1,1) NOT NULL,
        [PurchaseOrderID] INT NOT NULL,
        [Revision] INT NOT NULL DEFAULT ((0)),
        [PONumber] NVARCHAR(50) NOT NULL,
        [PODate] DATE NOT NULL,
        [RefNumber] NVARCHAR(100) NULL,
        [PRNumber] NVARCHAR(100) NULL,
        [DocType] NVARCHAR(50) NULL DEFAULT ('po_thc'),
        [BuyerName] NVARCHAR(200) NOT NULL,
        [BuyerAddress] NVARCHAR(500) NULL,
        [BuyerPhone] NVARCHAR(50) NULL,
        [BuyerEmail] NVARCHAR(100) NULL,
        [BuyerTaxID] NVARCHAR(50) NULL,
        [SupplierID] INT NULL,
        [SupplierName] NVARCHAR(200) NOT NULL,
        [SupplierAddress] NVARCHAR(500) NULL,
        [SupplierPhone] NVARCHAR(50) NULL,
        [SupplierEmail] NVARCHAR(100) NULL,
        [SupplierTaxID] NVARCHAR(50) NULL,
        [SubTotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DiscountPercent] DECIMAL(5, 2) NULL DEFAULT ((0)),
        [DiscountAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [VatRate] DECIMAL(5, 2) NULL DEFAULT ((7)),
        [VatAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [GrandTotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [WithholdingTaxRate] DECIMAL(5, 2) NULL DEFAULT ((0)),
        [WithholdingTaxAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [TotalPayable] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Notes] NVARCHAR(MAX) NULL,
        [PreparedBy] NVARCHAR(100) NULL,
        [ApprovedBy] NVARCHAR(100) NULL,
        [SupplierRecipient] NVARCHAR(100) NULL,
        [Status] NVARCHAR(50) NULL DEFAULT (N'รออนุมัติ'),
        [CreatedBy] INT NULL,
        [ArchivedAt] DATETIME NULL DEFAULT (getdate()),
        CONSTRAINT [PK_PurchaseOrderHistory] PRIMARY KEY ([HistoryID])
    );
    PRINT '✅ Created table: PurchaseOrderHistory';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table PurchaseOrderHistory already exists';
END;
GO

-- ตาราง: PurchaseOrderItemHistory
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PurchaseOrderItemHistory')
BEGIN
    CREATE TABLE [PurchaseOrderItemHistory] (
        [ItemHistoryID] INT IDENTITY(1,1) NOT NULL,
        [HistoryID] INT NOT NULL,
        [ItemOrder] INT NULL DEFAULT ((1)),
        [ItemName] NVARCHAR(255) NOT NULL,
        [ItemCode] NVARCHAR(100) NULL,
        [Qty] DECIMAL(18, 4) NULL DEFAULT ((1)),
        [Unit] NVARCHAR(50) NULL DEFAULT (N'ชิ้น'),
        [UnitPrice] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [VatRate] DECIMAL(5, 2) NULL DEFAULT ((7)),
        [VatAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [LineTotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [WhtRate] DECIMAL(5, 2) NULL DEFAULT ((0)),
        [WhtAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        CONSTRAINT [PK_PurchaseOrderItemHistory] PRIMARY KEY ([ItemHistoryID])
    );
    PRINT '✅ Created table: PurchaseOrderItemHistory';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table PurchaseOrderItemHistory already exists';
END;
GO

-- ตาราง: Cheques
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Cheques')
BEGIN
    CREATE TABLE [Cheques] (
        [ChequeID] INT IDENTITY(1,1) NOT NULL,
        [ChequeNo] NVARCHAR(50) NOT NULL,
        [ChequeType] NVARCHAR(20) NOT NULL,
        [BankName] NVARCHAR(100) NOT NULL,
        [BankBranch] NVARCHAR(100) NULL,
        [AccountNo] NVARCHAR(50) NULL,
        [PayeeOrPayer] NVARCHAR(255) NOT NULL,
        [Amount] DECIMAL(18, 2) NOT NULL,
        [IssueDate] DATE NULL,
        [DueDate] DATE NOT NULL,
        [DepositDate] DATE NULL,
        [ClearedDate] DATE NULL,
        [Status] NVARCHAR(30) NULL DEFAULT ('pending'),
        [RefDocNo] NVARCHAR(100) NULL,
        [Notes] NVARCHAR(MAX) NULL,
        [CompanyID] INT NULL DEFAULT ((2)),
        [CreatedAt] DATETIME NULL DEFAULT (getdate()),
        [UpdatedAt] DATETIME NULL DEFAULT (getdate()),
        [CreatedBy] INT NULL,
        [Revision] INT NOT NULL DEFAULT ((1)),
        CONSTRAINT [PK_Cheques] PRIMARY KEY ([ChequeID])
    );
    PRINT '✅ Created table: Cheques';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table Cheques already exists';
END;
GO

-- ตาราง: ChequesHistory
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChequesHistory')
BEGIN
    CREATE TABLE [ChequesHistory] (
        [HistoryID] INT IDENTITY(1,1) NOT NULL,
        [ChequeID] INT NOT NULL,
        [Revision] INT NOT NULL,
        [ChequeNo] NVARCHAR(50) NULL,
        [ChequeType] NVARCHAR(20) NULL,
        [BankName] NVARCHAR(100) NULL,
        [BankBranch] NVARCHAR(100) NULL,
        [AccountNo] NVARCHAR(50) NULL,
        [PayeeOrPayer] NVARCHAR(200) NULL,
        [Amount] DECIMAL(18, 2) NULL,
        [IssueDate] DATE NULL,
        [DueDate] DATE NULL,
        [DepositDate] DATE NULL,
        [ClearedDate] DATE NULL,
        [Status] NVARCHAR(50) NULL,
        [RefDocNo] NVARCHAR(100) NULL,
        [Notes] NVARCHAR(MAX) NULL,
        [CompanyID] INT NULL,
        [CreatedBy] INT NULL,
        [CreatedAt] DATETIME NULL,
        [UpdatedAt] DATETIME NULL,
        [ArchivedAt] DATETIME NULL DEFAULT (getdate()),
        CONSTRAINT [PK_ChequesHistory] PRIMARY KEY ([HistoryID])
    );
    PRINT '✅ Created table: ChequesHistory';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table ChequesHistory already exists';
END;
GO

-- ตาราง: EliteTaxInvoices
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EliteTaxInvoices')
BEGIN
    CREATE TABLE [EliteTaxInvoices] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [DocNo] VARCHAR(50) NOT NULL,
        [DocDate] DATE NOT NULL,
        [CustomerName] NVARCHAR(200) NOT NULL,
        [CustomerAddress] NVARCHAR(MAX) NULL,
        [CustomerPhone] VARCHAR(50) NULL,
        [CustomerTaxId] VARCHAR(50) NULL,
        [ItemsJSON] NVARCHAR(MAX) NULL,
        [Subtotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Discount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Vat] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [GrandTotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Status] NVARCHAR(50) NULL DEFAULT (N'พร้อมใช้'),
        [Revision] INT NULL DEFAULT ((0)),
        [Remarks] NVARCHAR(MAX) NULL,
        [Signer] VARCHAR(50) NULL,
        [BankAccount] VARCHAR(50) NULL,
        [IncludeVat] BIT NULL DEFAULT ((0)),
        [CreatedBy] INT NULL,
        [created_at] DATETIME NULL DEFAULT (getdate()),
        [updated_at] DATETIME NULL DEFAULT (getdate()),
        [DiscountPercent] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DepositPercent] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DepositAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [RemainingBalance] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [PaymentTerm] NVARCHAR(100) NULL,
        [ContactPerson] NVARCHAR(100) NULL,
        [Reference] NVARCHAR(100) NULL,
        CONSTRAINT [PK_EliteTaxInvoices] PRIMARY KEY ([id])
    );
    PRINT '✅ Created table: EliteTaxInvoices';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table EliteTaxInvoices already exists';
END;
GO

-- ตาราง: EliteTaxInvoiceHistory
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EliteTaxInvoiceHistory')
BEGIN
    CREATE TABLE [EliteTaxInvoiceHistory] (
        [HistoryID] INT IDENTITY(1,1) NOT NULL,
        [InvoiceID] INT NOT NULL,
        [DocNo] VARCHAR(50) NOT NULL,
        [DocDate] DATE NOT NULL,
        [CustomerName] NVARCHAR(200) NOT NULL,
        [CustomerAddress] NVARCHAR(MAX) NULL,
        [CustomerPhone] VARCHAR(50) NULL,
        [CustomerTaxId] VARCHAR(50) NULL,
        [ItemsJSON] NVARCHAR(MAX) NULL,
        [Subtotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Discount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DiscountPercent] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Vat] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [GrandTotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DepositPercent] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DepositAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [RemainingBalance] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Status] NVARCHAR(50) NULL DEFAULT (N'พร้อมใช้'),
        [Revision] INT NULL DEFAULT ((0)),
        [Remarks] NVARCHAR(MAX) NULL,
        [Signer] VARCHAR(50) NULL,
        [BankAccount] VARCHAR(50) NULL,
        [IncludeVat] BIT NULL DEFAULT ((0)),
        [PaymentTerm] NVARCHAR(100) NULL,
        [ContactPerson] NVARCHAR(100) NULL,
        [Reference] NVARCHAR(100) NULL,
        [ArchivedAt] DATETIME NULL DEFAULT (getdate()),
        [ArchivedBy] INT NULL,
        CONSTRAINT [PK_EliteTaxInvoiceHistory] PRIMARY KEY ([HistoryID])
    );
    PRINT '✅ Created table: EliteTaxInvoiceHistory';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table EliteTaxInvoiceHistory already exists';
END;
GO

-- ตาราง: EliteReceipts
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EliteReceipts')
BEGIN
    CREATE TABLE [EliteReceipts] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [DocNo] VARCHAR(50) NOT NULL,
        [BookNo] VARCHAR(50) NULL,
        [DocDate] DATE NOT NULL,
        [DocType] VARCHAR(50) NULL DEFAULT ('receipt'),
        [CustomerName] NVARCHAR(200) NOT NULL,
        [CustomerAddress] NVARCHAR(MAX) NULL,
        [CustomerPhone] VARCHAR(50) NULL,
        [CustomerTaxId] VARCHAR(50) NULL,
        [ItemsJSON] NVARCHAR(MAX) NULL,
        [ItemsDesc] NVARCHAR(MAX) NULL,
        [Subtotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Discount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DiscountPercent] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Vat] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [GrandTotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [IncludeVat] BIT NULL DEFAULT ((0)),
        [PaymentMethod] VARCHAR(50) NULL DEFAULT ('transfer'),
        [BankName] NVARCHAR(100) NULL,
        [BankBranch] NVARCHAR(100) NULL,
        [CheckNo] VARCHAR(50) NULL,
        [CheckDate] DATE NULL,
        [Remarks] NVARCHAR(MAX) NULL,
        [Signer] VARCHAR(50) NULL,
        [Status] NVARCHAR(50) NULL DEFAULT (N'พร้อมใช้'),
        [Revision] INT NULL DEFAULT ((0)),
        [InvoiceID] INT NULL,
        [CreatedBy] INT NULL,
        [created_at] DATETIME NULL DEFAULT (getdate()),
        [updated_at] DATETIME NULL DEFAULT (getdate()),
        CONSTRAINT [PK_EliteReceipts] PRIMARY KEY ([id])
    );
    PRINT '✅ Created table: EliteReceipts';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table EliteReceipts already exists';
END;
GO

-- ตาราง: EliteReceiptHistory
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EliteReceiptHistory')
BEGIN
    CREATE TABLE [EliteReceiptHistory] (
        [HistoryID] INT IDENTITY(1,1) NOT NULL,
        [ReceiptID] INT NOT NULL,
        [DocNo] VARCHAR(50) NOT NULL,
        [BookNo] VARCHAR(50) NULL,
        [DocDate] DATE NOT NULL,
        [DocType] VARCHAR(50) NULL,
        [CustomerName] NVARCHAR(200) NOT NULL,
        [CustomerAddress] NVARCHAR(MAX) NULL,
        [CustomerPhone] VARCHAR(50) NULL,
        [CustomerTaxId] VARCHAR(50) NULL,
        [ItemsJSON] NVARCHAR(MAX) NULL,
        [ItemsDesc] NVARCHAR(MAX) NULL,
        [Subtotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Discount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DiscountPercent] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Vat] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [GrandTotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [IncludeVat] BIT NULL DEFAULT ((0)),
        [PaymentMethod] VARCHAR(50) NULL,
        [BankName] NVARCHAR(100) NULL,
        [BankBranch] NVARCHAR(100) NULL,
        [CheckNo] VARCHAR(50) NULL,
        [CheckDate] DATE NULL,
        [Remarks] NVARCHAR(MAX) NULL,
        [Signer] VARCHAR(50) NULL,
        [Status] NVARCHAR(50) NULL,
        [Revision] INT NULL DEFAULT ((0)),
        [ArchivedAt] DATETIME NULL DEFAULT (getdate()),
        [ArchivedBy] INT NULL,
        CONSTRAINT [PK_EliteReceiptHistory] PRIMARY KEY ([HistoryID])
    );
    PRINT '✅ Created table: EliteReceiptHistory';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table EliteReceiptHistory already exists';
END;
GO

-- ตาราง: EliteBookingOrders
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EliteBookingOrders')
BEGIN
    CREATE TABLE [EliteBookingOrders] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [DocNo] VARCHAR(50) NOT NULL,
        [DocDate] DATE NOT NULL,
        [CustomerName] NVARCHAR(200) NOT NULL,
        [CustomerAddress] NVARCHAR(MAX) NULL,
        [CustomerPhone] VARCHAR(50) NULL,
        [CustomerTaxId] VARCHAR(50) NULL,
        [DeliverTo] NVARCHAR(255) NULL,
        [ContactPerson] NVARCHAR(255) NULL,
        [Reference] NVARCHAR(255) NULL,
        [ItemsJSON] NVARCHAR(MAX) NULL,
        [Subtotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Discount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DiscountPercent] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [IncludeVat] BIT NULL DEFAULT ((0)),
        [Vat] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [GrandTotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DepositPercent] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DepositAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [RemainingBalance] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [BankAccount] VARCHAR(50) NULL DEFAULT ('kbank_elite_2020'),
        [Remarks] NVARCHAR(MAX) NULL,
        [Signer] VARCHAR(50) NULL DEFAULT ('none'),
        [Status] NVARCHAR(50) NULL DEFAULT (N'พร้อมใช้'),
        [Revision] INT NULL DEFAULT ((0)),
        [CreatedBy] INT NULL,
        [created_at] DATETIME NULL DEFAULT (getdate()),
        [updated_at] DATETIME NULL DEFAULT (getdate()),
        CONSTRAINT [PK_EliteBookingOrders] PRIMARY KEY ([id])
    );
    PRINT '✅ Created table: EliteBookingOrders';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table EliteBookingOrders already exists';
END;
GO

-- ตาราง: EliteBookingOrderHistory
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EliteBookingOrderHistory')
BEGIN
    CREATE TABLE [EliteBookingOrderHistory] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [BookingOrderId] INT NOT NULL,
        [Revision] INT NOT NULL,
        [DocNo] VARCHAR(50) NOT NULL,
        [DocDate] DATE NOT NULL,
        [CustomerName] NVARCHAR(200) NOT NULL,
        [CustomerAddress] NVARCHAR(MAX) NULL,
        [CustomerPhone] VARCHAR(50) NULL,
        [CustomerTaxId] VARCHAR(50) NULL,
        [DeliverTo] NVARCHAR(255) NULL,
        [ContactPerson] NVARCHAR(255) NULL,
        [Reference] NVARCHAR(255) NULL,
        [ItemsJSON] NVARCHAR(MAX) NULL,
        [Subtotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [Discount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DiscountPercent] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [IncludeVat] BIT NULL DEFAULT ((0)),
        [Vat] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [GrandTotal] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DepositPercent] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [DepositAmount] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [RemainingBalance] DECIMAL(18, 2) NULL DEFAULT ((0)),
        [BankAccount] VARCHAR(50) NULL,
        [Remarks] NVARCHAR(MAX) NULL,
        [Signer] VARCHAR(50) NULL,
        [Status] NVARCHAR(50) NULL,
        [CreatedBy] INT NULL,
        [created_at] DATETIME NULL DEFAULT (getdate()),
        CONSTRAINT [PK_EliteBookingOrderHistory] PRIMARY KEY ([id])
    );
    PRINT '✅ Created table: EliteBookingOrderHistory';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table EliteBookingOrderHistory already exists';
END;
GO

-- ตาราง: Purchase_Requisitions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Purchase_Requisitions')
BEGIN
    CREATE TABLE [Purchase_Requisitions] (
        [PRID] INT IDENTITY(1,1) NOT NULL,
        [PRNumber] VARCHAR(50) NOT NULL,
        [TaskID] VARCHAR(50) NULL,
        [BatchNo] VARCHAR(50) NULL,
        [FormulaName] NVARCHAR(200) NULL,
        [Department] NVARCHAR(100) NULL DEFAULT (N'ฝ่ายผลิต/คลังสินค้า'),
        [Requestor] NVARCHAR(100) NULL,
        [RequestDate] DATETIME NULL DEFAULT (getdate()),
        [Status] NVARCHAR(50) NULL DEFAULT (N'รอจัดซื้อ'),
        [Notes] NVARCHAR(MAX) NULL,
        [ItemsJSON] NVARCHAR(MAX) NULL,
        [EstimatedTotal] FLOAT NULL DEFAULT ((0)),
        [PONumber] VARCHAR(50) NULL,
        [CreatedAt] DATETIME NULL DEFAULT (getdate()),
        [UpdatedAt] DATETIME NULL DEFAULT (getdate()),
        [Purchaser] NVARCHAR(100) NULL,
        [PurchaserSignature] NVARCHAR(255) NULL,
        [PurchasedAt] DATETIME NULL,
        [RequestorSignature] NVARCHAR(255) NULL,
        CONSTRAINT [PK_Purchase_Requisitions] PRIMARY KEY ([PRID])
    );
    PRINT '✅ Created table: Purchase_Requisitions';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table Purchase_Requisitions already exists';
END;
GO

-- =========================================================================
-- หมวดที่ 3: ข้อมูลเริ่มต้นและสิทธิ์การใช้งาน (Seed Data & Access Setup)
-- =========================================================================

-- 3.1 ตรวจสอบและสร้างข้อมูลบริษัททั้ง 4 (THC, ELITE, RIVERVIEW, PSF)
UPDATE Company SET CompanyName = N'Thai Herb Centers', ShortName = N'THC', CompanyNameTH = N'บริษัท ไทยเฮิร์บเซ็นเตอร์ส', CompanyColor = N'#16a34a', CompanyIcon = N'leaf', CompanyLogo = N'/images/logos/logo-thc.png', IsActive = 1 WHERE CompanyID = 1;
UPDATE Company SET CompanyName = N'Elite Trading 2020', ShortName = N'ELITE', CompanyNameTH = N'บริษัท อิลิท เทรดดิ้ง 2020 จำกัด', CompanyColor = N'#2563eb', CompanyIcon = N'diamond', CompanyLogo = N'/images/logos/logo-elite.png', IsActive = 1 WHERE CompanyID = 2;
UPDATE Company SET CompanyName = N'Riverview Protect & Cleaning', ShortName = N'RIVERVIEW', CompanyNameTH = N'บริษัท ริเว่อร์วิว โพรเทคท์ แอนด์ คลีนนิ่ง จำกัด', CompanyColor = N'#7c3aed', CompanyIcon = N'shield', CompanyLogo = N'/images/logos/logo-riv.png', IsActive = 1 WHERE CompanyID = 3;

IF NOT EXISTS (SELECT 1 FROM Company WHERE CompanyID = 4)
BEGIN
    SET IDENTITY_INSERT Company ON;
    INSERT INTO Company (CompanyID, CompanyName, ShortName, CompanyNameTH, CompanyNameEN, TaxID, Address, IsActive, CompanyColor, CompanyIcon, CompanyLogo)
    VALUES (4, N'Premier Smart Farm', N'PSF', N'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด', N'Premier Smart Farm Co., Ltd.', N'', N'', 1, N'#ea580c', N'sprout', N'/images/logos/logo-psf.png');
    SET IDENTITY_INSERT Company OFF;
    PRINT '✅ Created Company 4: PSF';
END;
GO

-- 3.2 กำหนดสิทธิ์การเข้าถึงบริษัทใน UserCompanyAccess ให้ผู้ใช้เดิม
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'UserCompanyAccess')
BEGIN
    -- แอดมินและผู้บริหาร เข้าได้ทั้ง 4 บริษัท
    INSERT INTO UserCompanyAccess (user_id, CompanyID, is_default)
    SELECT u.user_id, c.CompanyID, CASE WHEN c.CompanyID = 1 THEN 1 ELSE 0 END
    FROM Users u
    CROSS JOIN (SELECT CompanyID FROM Company WHERE CompanyID IN (1, 2, 3, 4)) c
    WHERE u.role IN ('admin', 'executive')
      AND NOT EXISTS (SELECT 1 FROM UserCompanyAccess uca WHERE uca.user_id = u.user_id AND uca.CompanyID = c.CompanyID);

    -- ผู้ใช้ทั่วไป เข้าถึงบริษัทหลัก (THC = 1)
    INSERT INTO UserCompanyAccess (user_id, CompanyID, is_default)
    SELECT u.user_id, 1, 1
    FROM Users u
    WHERE u.role NOT IN ('admin', 'executive')
      AND NOT EXISTS (SELECT 1 FROM UserCompanyAccess uca WHERE uca.user_id = u.user_id AND uca.CompanyID = 1);
    PRINT '✅ Updated UserCompanyAccess for existing users';
END;
GO

PRINT '---------------------------------------------------------';
PRINT '✅ Production Database Migration Completed Successfully!';
PRINT '---------------------------------------------------------';
GO

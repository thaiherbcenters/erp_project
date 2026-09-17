-- =========================================================================
-- ERP ThaiHerb: Production Database Migration
-- Date: 17 September 2026
-- Target Database: ERP_THAIHERB (Production)
-- Safety: 100% Non-destructive & Idempotent (IF NOT EXISTS on all steps)
-- =========================================================================

USE ERP_THAIHERB;
GO

PRINT 'Starting migration on ERP_THAIHERB...';
GO

-- =========================================================================
-- 1. CHEQUE MANAGEMENT SYSTEM (ระบบจ่ายเช็คและประวัติการแก้ไข)
-- =========================================================================

-- 1.1 เพิ่มคอลัมน์ Revision ในตาราง Cheques (สำหรับรองรับเวอร์ชันประวัติ)
IF COL_LENGTH('Cheques', 'Revision') IS NULL
BEGIN
    ALTER TABLE Cheques ADD Revision INT NOT NULL CONSTRAINT DF_Cheques_Revision DEFAULT 1;
    PRINT '✅ 1.1 Added Revision column to Cheques';
END
ELSE
BEGIN
    PRINT 'ℹ️ 1.1 Revision column already exists in Cheques';
END
GO

-- 1.2 สร้างตาราง ChequesHistory (ประวัติการแก้ไขและพิมพ์ซ้ำ)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChequesHistory')
BEGIN
    CREATE TABLE ChequesHistory (
        HistoryID INT IDENTITY(1,1) PRIMARY KEY,
        ChequeID INT NOT NULL,
        Revision INT NOT NULL,
        ChequeNo NVARCHAR(50) NULL,
        ChequeType NVARCHAR(20) NULL,
        BankName NVARCHAR(100) NULL,
        BankBranch NVARCHAR(100) NULL,
        AccountNo NVARCHAR(50) NULL,
        PayeeOrPayer NVARCHAR(200) NULL,
        Amount DECIMAL(18,2) NULL,
        IssueDate DATE NULL,
        DueDate DATE NULL,
        DepositDate DATE NULL,
        ClearedDate DATE NULL,
        Status NVARCHAR(50) NULL,
        RefDocNo NVARCHAR(100) NULL,
        Notes NVARCHAR(MAX) NULL,
        CompanyID INT NULL,
        CreatedBy INT NULL,
        CreatedAt DATETIME NULL,
        UpdatedAt DATETIME NULL,
        ArchivedAt DATETIME DEFAULT GETDATE()
    );
    PRINT '✅ 1.2 Created table: ChequesHistory';
END
ELSE
BEGIN
    PRINT 'ℹ️ 1.2 Table ChequesHistory already exists';
END
GO

-- =========================================================================
-- 2. ELITE MODULE: TAX INVOICES (ใบกำกับภาษี ELITE)
-- =========================================================================

-- 2.1 ตารางใบกำกับภาษี EliteTaxInvoices
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EliteTaxInvoices')
BEGIN
    CREATE TABLE EliteTaxInvoices (
        id INT IDENTITY(1,1) PRIMARY KEY,
        DocNo VARCHAR(50) NOT NULL UNIQUE,
        DocDate DATE NOT NULL,
        CustomerName NVARCHAR(200) NOT NULL,
        CustomerAddress NVARCHAR(MAX) NULL,
        CustomerPhone VARCHAR(50) NULL,
        CustomerTaxId VARCHAR(50) NULL,
        ItemsJSON NVARCHAR(MAX) NULL,
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
        Remarks NVARCHAR(MAX) NULL,
        Signer VARCHAR(50) NULL,
        BankAccount VARCHAR(50) NULL,
        IncludeVat BIT DEFAULT 0,
        PaymentTerm NVARCHAR(100) NULL,
        ContactPerson NVARCHAR(100) NULL,
        Reference NVARCHAR(100) NULL,
        CreatedBy INT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    PRINT '✅ 2.1 Created table: EliteTaxInvoices';
END
ELSE
BEGIN
    PRINT 'ℹ️ 2.1 Table EliteTaxInvoices already exists';
END
GO

-- 2.2 ตารางประวัติใบกำกับภาษี EliteTaxInvoiceHistory
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EliteTaxInvoiceHistory')
BEGIN
    CREATE TABLE EliteTaxInvoiceHistory (
        HistoryID INT IDENTITY(1,1) PRIMARY KEY,
        InvoiceID INT NOT NULL,
        DocNo VARCHAR(50) NOT NULL,
        DocDate DATE NOT NULL,
        CustomerName NVARCHAR(200) NOT NULL,
        CustomerAddress NVARCHAR(MAX) NULL,
        CustomerPhone VARCHAR(50) NULL,
        CustomerTaxId VARCHAR(50) NULL,
        ItemsJSON NVARCHAR(MAX) NULL,
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
        Remarks NVARCHAR(MAX) NULL,
        Signer VARCHAR(50) NULL,
        BankAccount VARCHAR(50) NULL,
        IncludeVat BIT DEFAULT 0,
        PaymentTerm NVARCHAR(100) NULL,
        ContactPerson NVARCHAR(100) NULL,
        Reference NVARCHAR(100) NULL,
        ArchivedAt DATETIME DEFAULT GETDATE(),
        ArchivedBy INT NULL
    );
    PRINT '✅ 2.2 Created table: EliteTaxInvoiceHistory';
END
ELSE
BEGIN
    PRINT 'ℹ️ 2.2 Table EliteTaxInvoiceHistory already exists';
END
GO

-- =========================================================================
-- 3. ELITE MODULE: RECEIPTS (ใบเสร็จรับเงิน ELITE)
-- =========================================================================

-- 3.1 ตารางใบเสร็จรับเงิน EliteReceipts
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EliteReceipts')
BEGIN
    CREATE TABLE EliteReceipts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        DocNo VARCHAR(50) NOT NULL UNIQUE,
        BookNo VARCHAR(50) NULL,
        DocDate DATE NOT NULL,
        DocType VARCHAR(50) DEFAULT 'receipt',
        CustomerName NVARCHAR(200) NOT NULL,
        CustomerAddress NVARCHAR(MAX) NULL,
        CustomerPhone VARCHAR(50) NULL,
        CustomerTaxId VARCHAR(50) NULL,
        ItemsJSON NVARCHAR(MAX) NULL,
        ItemsDesc NVARCHAR(MAX) NULL,
        Subtotal DECIMAL(18,2) DEFAULT 0,
        Discount DECIMAL(18,2) DEFAULT 0,
        DiscountPercent DECIMAL(18,2) DEFAULT 0,
        Vat DECIMAL(18,2) DEFAULT 0,
        GrandTotal DECIMAL(18,2) DEFAULT 0,
        IncludeVat BIT DEFAULT 0,
        PaymentMethod VARCHAR(50) DEFAULT 'transfer',
        BankName NVARCHAR(100) NULL,
        BankBranch NVARCHAR(100) NULL,
        CheckNo VARCHAR(50) NULL,
        CheckDate DATE NULL,
        Remarks NVARCHAR(MAX) NULL,
        Signer VARCHAR(50) NULL,
        Status NVARCHAR(50) DEFAULT N'พร้อมใช้',
        Revision INT DEFAULT 0,
        InvoiceID INT NULL,
        CreatedBy INT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    PRINT '✅ 3.1 Created table: EliteReceipts';
END
ELSE
BEGIN
    PRINT 'ℹ️ 3.1 Table EliteReceipts already exists';
END
GO

-- 3.2 ตารางประวัติใบเสร็จรับเงิน EliteReceiptHistory
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EliteReceiptHistory')
BEGIN
    CREATE TABLE EliteReceiptHistory (
        HistoryID INT IDENTITY(1,1) PRIMARY KEY,
        ReceiptID INT NOT NULL,
        DocNo VARCHAR(50) NOT NULL,
        BookNo VARCHAR(50) NULL,
        DocDate DATE NOT NULL,
        DocType VARCHAR(50) NULL,
        CustomerName NVARCHAR(200) NOT NULL,
        CustomerAddress NVARCHAR(MAX) NULL,
        CustomerPhone VARCHAR(50) NULL,
        CustomerTaxId VARCHAR(50) NULL,
        ItemsJSON NVARCHAR(MAX) NULL,
        ItemsDesc NVARCHAR(MAX) NULL,
        Subtotal DECIMAL(18,2) DEFAULT 0,
        Discount DECIMAL(18,2) DEFAULT 0,
        DiscountPercent DECIMAL(18,2) DEFAULT 0,
        Vat DECIMAL(18,2) DEFAULT 0,
        GrandTotal DECIMAL(18,2) DEFAULT 0,
        IncludeVat BIT DEFAULT 0,
        PaymentMethod VARCHAR(50) NULL,
        BankName NVARCHAR(100) NULL,
        BankBranch NVARCHAR(100) NULL,
        CheckNo VARCHAR(50) NULL,
        CheckDate DATE NULL,
        Remarks NVARCHAR(MAX) NULL,
        Signer VARCHAR(50) NULL,
        Status NVARCHAR(50) NULL,
        Revision INT DEFAULT 0,
        ArchivedAt DATETIME DEFAULT GETDATE(),
        ArchivedBy INT NULL
    );
    PRINT '✅ 3.2 Created table: EliteReceiptHistory';
END
ELSE
BEGIN
    PRINT 'ℹ️ 3.2 Table EliteReceiptHistory already exists';
END
GO

PRINT '=========================================================';
PRINT '✅ Migration to ERP_THAIHERB completed safely and successfully!';
PRINT '=========================================================';
GO

-- =========================================================================
-- ERP THAIHERB: PRODUCTION DATABASE DELTA MIGRATION (23 September 2026)
-- Target Database: ERP_THAIHERB (ฐานข้อมูลหลัก Production)
-- Source: ERP_THAIHERB_DEV (ผลการเปรียบเทียบโครงสร้างตารางและฟิลด์จริง)
-- Safety: 100% Non-destructive & Idempotent (ไม่ลบข้อมูล ไม่แก้ไขข้อมูลเดิม)
-- =========================================================================

USE ERP_THAIHERB;
GO

PRINT '-------------------------------------------------------------------------';
PRINT '🚀 กำลังเริ่มอัปเดตโครงสร้างฐานข้อมูลหลัก (ERP_THAIHERB)...';
PRINT '-------------------------------------------------------------------------';
GO

-- =========================================================================
-- หมวดที่ 1: เพิ่มคอลัมน์ในตาราง Receipt (รองรับเงินมัดจำและการเชื่อมโยงใบเสนอราคา)
-- =========================================================================

-- 1.1 คอลัมน์ IsDeposit (ระบุว่าเป็นบิลมัดจำหรือไม่)
IF COL_LENGTH('Receipt', 'IsDeposit') IS NULL
BEGIN
    ALTER TABLE [Receipt] ADD [IsDeposit] BIT NULL CONSTRAINT DF_Receipt_IsDeposit DEFAULT 0;
    PRINT '✅ 1.1 เพิ่มคอลัมน์ [IsDeposit] ในตาราง [Receipt] เรียบร้อย';
END
ELSE
BEGIN
    PRINT 'ℹ️ 1.1 คอลัมน์ [IsDeposit] มีอยู่แล้วใน [Receipt]';
END;
GO

-- 1.2 คอลัมน์ DepositStatus (สถานะมัดจำ เช่น ชำระครบถ้วน, รอรับเงินมัดจำ)
IF COL_LENGTH('Receipt', 'DepositStatus') IS NULL
BEGIN
    ALTER TABLE [Receipt] ADD [DepositStatus] NVARCHAR(50) NULL CONSTRAINT DF_Receipt_DepositStatus DEFAULT N'ชำระครบถ้วน';
    PRINT '✅ 1.2 เพิ่มคอลัมน์ [DepositStatus] ในตาราง [Receipt] เรียบร้อย';
END
ELSE
BEGIN
    PRINT 'ℹ️ 1.2 คอลัมน์ [DepositStatus] มีอยู่แล้วใน [Receipt]';
END;
GO

-- 1.3 คอลัมน์ PaidDepositAmount (ยอดเงินมัดจำที่ชำระแล้ว)
IF COL_LENGTH('Receipt', 'PaidDepositAmount') IS NULL
BEGIN
    ALTER TABLE [Receipt] ADD [PaidDepositAmount] DECIMAL(18,2) NULL CONSTRAINT DF_Receipt_PaidDepositAmount DEFAULT 0;
    PRINT '✅ 1.3 เพิ่มคอลัมน์ [PaidDepositAmount] ในตาราง [Receipt] เรียบร้อย';
END
ELSE
BEGIN
    PRINT 'ℹ️ 1.3 คอลัมน์ [PaidDepositAmount] มีอยู่แล้วใน [Receipt]';
END;
GO

-- 1.4 คอลัมน์ QuotationID (เชื่อมโยงไปยังใบเสนอราคาต้นทาง)
IF COL_LENGTH('Receipt', 'QuotationID') IS NULL
BEGIN
    ALTER TABLE [Receipt] ADD [QuotationID] INT NULL;
    PRINT '✅ 1.4 เพิ่มคอลัมน์ [QuotationID] ในตาราง [Receipt] เรียบร้อย';
END
ELSE
BEGIN
    PRINT 'ℹ️ 1.4 คอลัมน์ [QuotationID] มีอยู่แล้วใน [Receipt]';
END;
GO

-- 1.5 คอลัมน์ QuotationGrandTotal (บันทึกยอดรวมเต็มของใบเสนอราคาสำหรับคำนวณยอดปิดบิล)
IF COL_LENGTH('Receipt', 'QuotationGrandTotal') IS NULL
BEGIN
    ALTER TABLE [Receipt] ADD [QuotationGrandTotal] DECIMAL(18,2) NULL;
    PRINT '✅ 1.5 เพิ่มคอลัมน์ [QuotationGrandTotal] ในตาราง [Receipt] เรียบร้อย';
END
ELSE
BEGIN
    PRINT 'ℹ️ 1.5 คอลัมน์ [QuotationGrandTotal] มีอยู่แล้วใน [Receipt]';
END;
GO

-- =========================================================================
-- หมวดที่ 2: เพิ่มคอลัมน์ในตาราง ReceiptHistory (ประวัติการแก้ไขใบเสร็จ)
-- =========================================================================

-- 2.1 คอลัมน์ IsDeposit
IF COL_LENGTH('ReceiptHistory', 'IsDeposit') IS NULL
BEGIN
    ALTER TABLE [ReceiptHistory] ADD [IsDeposit] BIT NULL CONSTRAINT DF_ReceiptHistory_IsDeposit DEFAULT 0;
    PRINT '✅ 2.1 เพิ่มคอลัมน์ [IsDeposit] ในตาราง [ReceiptHistory] เรียบร้อย';
END
ELSE
BEGIN
    PRINT 'ℹ️ 2.1 คอลัมน์ [IsDeposit] มีอยู่แล้วใน [ReceiptHistory]';
END;
GO

-- 2.2 คอลัมน์ DepositStatus
IF COL_LENGTH('ReceiptHistory', 'DepositStatus') IS NULL
BEGIN
    ALTER TABLE [ReceiptHistory] ADD [DepositStatus] NVARCHAR(50) NULL CONSTRAINT DF_ReceiptHistory_DepositStatus DEFAULT N'ชำระครบถ้วน';
    PRINT '✅ 2.2 เพิ่มคอลัมน์ [DepositStatus] ในตาราง [ReceiptHistory] เรียบร้อย';
END
ELSE
BEGIN
    PRINT 'ℹ️ 2.2 คอลัมน์ [DepositStatus] มีอยู่แล้วใน [ReceiptHistory]';
END;
GO

-- 2.3 คอลัมน์ PaidDepositAmount
IF COL_LENGTH('ReceiptHistory', 'PaidDepositAmount') IS NULL
BEGIN
    ALTER TABLE [ReceiptHistory] ADD [PaidDepositAmount] DECIMAL(18,2) NULL CONSTRAINT DF_ReceiptHistory_PaidDepositAmount DEFAULT 0;
    PRINT '✅ 2.3 เพิ่มคอลัมน์ [PaidDepositAmount] ในตาราง [ReceiptHistory] เรียบร้อย';
END
ELSE
BEGIN
    PRINT 'ℹ️ 2.3 คอลัมน์ [PaidDepositAmount] มีอยู่แล้วใน [ReceiptHistory]';
END;
GO

-- =========================================================================
-- หมวดที่ 3: สร้างตาราง EliteBookingOrders (ระบบสั่งจองสินค้าเครือ Elite)
-- =========================================================================

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
    PRINT '✅ 3.1 สร้างตาราง [EliteBookingOrders] เรียบร้อย';
END
ELSE
BEGIN
    PRINT 'ℹ️ 3.1 ตาราง [EliteBookingOrders] มีอยู่แล้ว';
END;
GO

-- =========================================================================
-- หมวดที่ 4: สร้างตาราง EliteBookingOrderHistory (ประวัติการแก้ไขใบสั่งจอง Elite)
-- =========================================================================

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
    PRINT '✅ 4.1 สร้างตาราง [EliteBookingOrderHistory] เรียบร้อย';
END
ELSE
BEGIN
    PRINT 'ℹ️ 4.1 ตาราง [EliteBookingOrderHistory] มีอยู่แล้ว';
END;
GO

-- =========================================================================
-- หมวดที่ 5: สร้างตาราง Purchase_Requisitions (ระบบใบขอซื้อวัตถุดิบ PR)
-- =========================================================================

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
        [Purchaser] NVARCHAR(100) NULL,
        [PurchaserSignature] NVARCHAR(255) NULL,
        [PurchasedAt] DATETIME NULL,
        [RequestorSignature] NVARCHAR(255) NULL,
        [CreatedAt] DATETIME NULL DEFAULT (getdate()),
        [UpdatedAt] DATETIME NULL DEFAULT (getdate()),
        CONSTRAINT [PK_Purchase_Requisitions] PRIMARY KEY ([PRID])
    );
    PRINT '✅ 5.1 สร้างตาราง [Purchase_Requisitions] เรียบร้อย';
END
ELSE
BEGIN
    PRINT 'ℹ️ 5.1 ตาราง [Purchase_Requisitions] มีอยู่แล้ว';
END;
GO

PRINT '-------------------------------------------------------------------------';
PRINT '🎉 การอัปเดตฐานข้อมูลหลัก (ERP_THAIHERB) เสร็จสิ้นสมบูรณ์และปลอดภัย 100%!';
PRINT '-------------------------------------------------------------------------';
GO

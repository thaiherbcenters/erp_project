-- =============================================================================
-- Purchase Order (PO) Tables Migration
-- =============================================================================

-- 1. Header: PurchaseOrder
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseOrder')
BEGIN
    CREATE TABLE PurchaseOrder (
        PurchaseOrderID     INT IDENTITY(1,1) PRIMARY KEY,
        PONumber            NVARCHAR(50)  NOT NULL UNIQUE,
        PODate              DATE          NOT NULL,
        RefNumber           NVARCHAR(100) NULL,       -- เลขที่ใบเสนอราคาผู้ขาย (QT...) หรือเอกสารอ้างอิง
        PRNumber            NVARCHAR(100) NULL,       -- อ้างอิง PR (ถ้ามี)
        DocType             NVARCHAR(50)  DEFAULT 'po_thc', -- po_thc / po_psf / po_elt
        
        -- ข้อมูลผู้ซื้อ (Buyer Info)
        BuyerName           NVARCHAR(200) NOT NULL,
        BuyerAddress        NVARCHAR(500) NULL,
        BuyerPhone          NVARCHAR(50)  NULL,
        BuyerEmail          NVARCHAR(100) NULL,
        BuyerTaxID          NVARCHAR(50)  NULL,
        
        -- ข้อมูลผู้ขาย / ซัพพลายเออร์ (Supplier Info)
        SupplierID          INT           NULL,       -- FK -> Supplier(SupplierID)
        SupplierName        NVARCHAR(200) NOT NULL,
        SupplierAddress     NVARCHAR(500) NULL,
        SupplierPhone       NVARCHAR(50)  NULL,
        SupplierEmail       NVARCHAR(100) NULL,
        SupplierTaxID       NVARCHAR(50)  NULL,
        
        -- สรุปยอดเงิน (Financial Summary)
        SubTotal            DECIMAL(18,2) DEFAULT 0,  -- มูลค่าก่อนคำนวณภาษี
        DiscountPercent     DECIMAL(5,2)  DEFAULT 0,
        DiscountAmount      DECIMAL(18,2) DEFAULT 0,
        VatRate             DECIMAL(5,2)  DEFAULT 7,  -- ภาษีมูลค่าเพิ่ม 7% หรือ 0%
        VatAmount           DECIMAL(18,2) DEFAULT 0,
        GrandTotal          DECIMAL(18,2) DEFAULT 0,  -- ยอดรวมทั้งสิ้น
        WithholdingTaxRate  DECIMAL(5,2)  DEFAULT 0,  -- หัก ณ ที่จ่าย 0%, 1%, 2%, 3%
        WithholdingTaxAmount DECIMAL(18,2) DEFAULT 0, -- จำนวนเงินที่ถูกหัก ณ ที่จ่าย
        TotalPayable        DECIMAL(18,2) DEFAULT 0,  -- จำนวนเงินที่ชำระจริง (GrandTotal - Wht)
        
        -- ข้อมูลประกอบ & ลายเซ็น
        Notes               NVARCHAR(MAX) NULL,       -- หมายเหตุ
        PreparedBy          NVARCHAR(100) NULL,       -- ผู้ออกเอกสาร (ผู้ซื้อ)
        ApprovedBy          NVARCHAR(100) NULL,       -- ผู้อนุมัติเอกสาร (ผู้ซื้อ)
        SupplierRecipient   NVARCHAR(100) NULL,       -- ผู้รับเอกสาร (ผู้ขาย)
        
        Status              NVARCHAR(50)  DEFAULT N'รออนุมัติ', -- รออนุมัติ / อนุมัติแล้ว / สั่งซื้อแล้ว / รับสินค้าแล้ว / ยกเลิก
        CreatedBy           INT           NULL,       -- FK -> Users(user_id)
        CreatedAt           DATETIME      DEFAULT GETDATE(),
        UpdatedAt           DATETIME      DEFAULT GETDATE(),

        CONSTRAINT FK_PO_Supplier FOREIGN KEY (SupplierID) REFERENCES Supplier(SupplierID) ON DELETE SET NULL,
        CONSTRAINT FK_PO_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id)
    );
    PRINT 'Created table: PurchaseOrder';
END
GO

-- 2. Items: PurchaseOrderItem
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseOrderItem')
BEGIN
    CREATE TABLE PurchaseOrderItem (
        ItemID              INT IDENTITY(1,1) PRIMARY KEY,
        PurchaseOrderID     INT           NOT NULL,
        ItemOrder           INT           DEFAULT 1,
        ItemName            NVARCHAR(255) NOT NULL,
        ItemCode            NVARCHAR(100) NULL,
        Qty                 DECIMAL(18,4) DEFAULT 1,
        Unit                NVARCHAR(50)  DEFAULT N'ชิ้น',
        UnitPrice           DECIMAL(18,2) DEFAULT 0,
        VatRate             DECIMAL(5,2)  DEFAULT 7,
        VatAmount           DECIMAL(18,2) DEFAULT 0,
        LineTotal           DECIMAL(18,2) DEFAULT 0,
        WhtRate             DECIMAL(5,2)  DEFAULT 0,
        WhtAmount           DECIMAL(18,2) DEFAULT 0,
        CONSTRAINT FK_POItem_PO FOREIGN KEY (PurchaseOrderID) REFERENCES PurchaseOrder(PurchaseOrderID) ON DELETE CASCADE
    );
    PRINT 'Created table: PurchaseOrderItem';
END
GO

-- =========================================================================
-- บันทึกการอัปเดตโครงสร้าง Database ทั้งหมด (นำไปรันใน SSMS ทีเดียวได้เลย)
-- ไฟล์นี้รวบรวมตารางใหม่และคอลัมน์ใหม่ทั้งหมดที่พัฒนาขึ้นใน Dev Database
-- ข้อควรระวัง: คำสั่งทั้งหมดใช้ IF NOT EXISTS เพื่อให้สามารถรันซ้ำได้อย่างปลอดภัย 100%
-- =========================================================================

-- =========================================================================
-- หมวดที่ 1: ตารางระบบสร้างรหัสเอกสารอัตโนมัติ (Sequences Table)
-- =========================================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Sequences')
BEGIN
    CREATE TABLE Sequences (
        Prefix      NVARCHAR(50) PRIMARY KEY,
        LastNumber  INT NOT NULL DEFAULT 0,
        UpdatedAt   DATETIME DEFAULT GETDATE()
    );
    PRINT 'Created table: Sequences';
END;
GO

-- =========================================================================
-- หมวดที่ 2: ระบบลายเซ็น (ผูกลายเซ็นกับผู้ใช้งาน)
-- =========================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Signatures') AND name = 'user_id')
BEGIN
    ALTER TABLE Signatures ADD user_id INT NULL;
    ALTER TABLE Signatures ADD CONSTRAINT FK_Signatures_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL;
    PRINT 'Added column: Signatures.user_id';
END;
GO

-- =========================================================================
-- หมวดที่ 3: ระบบบันทึกผู้สร้างเอกสารฝ่ายขาย (CreatedBy)
-- =========================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Quotation') AND name = 'CreatedBy')
BEGIN
    ALTER TABLE Quotation ADD CreatedBy INT NULL;
    ALTER TABLE Quotation ADD CONSTRAINT FK_Quotation_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id);
    PRINT 'Added column: Quotation.CreatedBy';
END;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'BillingInvoice') AND name = 'CreatedBy')
BEGIN
    ALTER TABLE BillingInvoice ADD CreatedBy INT NULL;
    ALTER TABLE BillingInvoice ADD CONSTRAINT FK_BillingInvoice_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id);
    PRINT 'Added column: BillingInvoice.CreatedBy';
END;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'DeliveryOrder') AND name = 'CreatedBy')
BEGIN
    ALTER TABLE DeliveryOrder ADD CreatedBy INT NULL;
    ALTER TABLE DeliveryOrder ADD CONSTRAINT FK_DeliveryOrder_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id);
    PRINT 'Added column: DeliveryOrder.CreatedBy';
END;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TaxInvoice') AND name = 'CreatedBy')
BEGIN
    ALTER TABLE TaxInvoice ADD CreatedBy INT NULL;
    ALTER TABLE TaxInvoice ADD CONSTRAINT FK_TaxInvoice_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id);
    PRINT 'Added column: TaxInvoice.CreatedBy';
END;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Receipt') AND name = 'CreatedBy')
BEGIN
    ALTER TABLE Receipt ADD CreatedBy INT NULL;
    ALTER TABLE Receipt ADD CONSTRAINT FK_Receipt_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id);
    PRINT 'Added column: Receipt.CreatedBy';
END;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'SalesOrder') AND name = 'CreatedBy')
BEGIN
    ALTER TABLE SalesOrder ADD CreatedBy INT NULL;
    ALTER TABLE SalesOrder ADD CONSTRAINT FK_SalesOrder_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id);
    PRINT 'Added column: SalesOrder.CreatedBy';
END;
GO

-- =========================================================================
-- หมวดที่ 4: ระบบติดตามเงินมัดจำในฝ่ายขาย / ลูกหนี้การค้า (Accounts AR)
-- =========================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Quotation') AND name = 'DepositStatus')
BEGIN
    ALTER TABLE Quotation ADD DepositStatus NVARCHAR(50) NULL; -- 'รอมัดจำ', 'ชำระมัดจำแล้ว', 'ชำระครบถ้วน'
    PRINT 'Added column: Quotation.DepositStatus';
END;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Quotation') AND name = 'PaidDepositAmount')
BEGIN
    ALTER TABLE Quotation ADD PaidDepositAmount DECIMAL(18,2) NULL DEFAULT 0;
    PRINT 'Added column: Quotation.PaidDepositAmount';
END;
GO

-- =========================================================================
-- หมวดที่ 4.1: ระบบเวอร์ชั่นเอกสาร (Revision) และค่าออกแบบ (DesignFee)
-- =========================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Quotation') AND name = 'Revision')
    ALTER TABLE Quotation ADD Revision INT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Quotation') AND name = 'DesignFee')
    ALTER TABLE Quotation ADD DesignFee DECIMAL(18,2) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Quotation') AND name = 'ShowDesignFeeInPrint')
    ALTER TABLE Quotation ADD ShowDesignFeeInPrint BIT NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Quotation') AND name = 'ContractID')
    ALTER TABLE Quotation ADD ContractID INT NULL;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'BillingInvoice') AND name = 'Revision')
    ALTER TABLE BillingInvoice ADD Revision INT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'BillingInvoice') AND name = 'DesignFee')
    ALTER TABLE BillingInvoice ADD DesignFee DECIMAL(18,2) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'BillingInvoice') AND name = 'ShowDesignFeeInPrint')
    ALTER TABLE BillingInvoice ADD ShowDesignFeeInPrint BIT NULL;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'DeliveryOrder') AND name = 'Revision')
    ALTER TABLE DeliveryOrder ADD Revision INT NOT NULL DEFAULT 0;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TaxInvoice') AND name = 'Revision')
    ALTER TABLE TaxInvoice ADD Revision INT NOT NULL DEFAULT 0;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Receipt') AND name = 'Revision')
    ALTER TABLE Receipt ADD Revision INT NOT NULL DEFAULT 0;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'SalesOrder') AND name = 'Revision')
    ALTER TABLE SalesOrder ADD Revision INT NOT NULL DEFAULT 0;
GO

-- =========================================================================
-- หมวดที่ 5: ฟิลด์จำนวนบริการ อย. (Quantity) ในเอกสารฝ่ายขายและประวัติ
-- =========================================================================
DECLARE @fdaTables TABLE (TableName NVARCHAR(100));
INSERT INTO @fdaTables (TableName) VALUES 
('Quotation'), ('QuotationHistory'),
('BillingInvoice'), ('BillingInvoiceHistory'),
('DeliveryOrder'), ('DeliveryOrderHistory'),
('TaxInvoice'), ('TaxInvoiceHistory'),
('Receipt'), ('ReceiptHistory');

DECLARE @fTbl NVARCHAR(100);
DECLARE fda_cursor CURSOR FOR SELECT TableName FROM @fdaTables;
OPEN fda_cursor;
FETCH NEXT FROM fda_cursor INTO @fTbl;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(@fTbl) AND name = 'FdaServiceRegisterQuantity')
    BEGIN
        EXEC('ALTER TABLE ' + @fTbl + ' ADD FdaServiceRegisterQuantity INT NULL;');
        PRINT 'Added FdaServiceRegisterQuantity to ' + @fTbl;
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(@fTbl) AND name = 'FdaServiceTrademarkQuantity')
    BEGIN
        EXEC('ALTER TABLE ' + @fTbl + ' ADD FdaServiceTrademarkQuantity INT NULL;');
        PRINT 'Added FdaServiceTrademarkQuantity to ' + @fTbl;
    END;

    FETCH NEXT FROM fda_cursor INTO @fTbl;
END;

CLOSE fda_cursor;
DEALLOCATE fda_cursor;
GO

-- =========================================================================
-- หมวดที่ 6: ฟิลด์ CustomerID ในเอกสารขาย
-- =========================================================================
DECLARE @custTables TABLE (TableName NVARCHAR(100));
INSERT INTO @custTables (TableName) VALUES 
('Quotation'), ('QuotationHistory'),
('BillingInvoice'), ('BillingInvoiceHistory'),
('DeliveryOrder'), ('DeliveryOrderHistory'),
('TaxInvoice'), ('TaxInvoiceHistory'),
('Receipt'), ('ReceiptHistory');

DECLARE @cTbl NVARCHAR(100);
DECLARE cust_cursor CURSOR FOR SELECT TableName FROM @custTables;
OPEN cust_cursor;
FETCH NEXT FROM cust_cursor INTO @cTbl;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(@cTbl) AND name = 'CustomerID')
    BEGIN
        EXEC('ALTER TABLE ' + @cTbl + ' ADD CustomerID INT NULL;');
        PRINT 'Added CustomerID to ' + @cTbl;
    END;
    FETCH NEXT FROM cust_cursor INTO @cTbl;
END;

CLOSE cust_cursor;
DEALLOCATE cust_cursor;
GO

-- =========================================================================
-- หมวดที่ 7: ฟิลด์ประวัติการชำระเงินและเช็คในใบเสร็จรับเงิน (Receipt & ReceiptHistory)
-- =========================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Receipt') AND name = 'DeliverTo')
    ALTER TABLE Receipt ADD DeliverTo NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Receipt') AND name = 'DueDate')
    ALTER TABLE Receipt ADD DueDate DATE NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Receipt') AND name = 'PaymentMethod')
    ALTER TABLE Receipt ADD PaymentMethod NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Receipt') AND name = 'CustomerBank')
    ALTER TABLE Receipt ADD CustomerBank NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Receipt') AND name = 'CustomerBranch')
    ALTER TABLE Receipt ADD CustomerBranch NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Receipt') AND name = 'ChequeNo')
    ALTER TABLE Receipt ADD ChequeNo NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Receipt') AND name = 'ChequeDate')
    ALTER TABLE Receipt ADD ChequeDate DATE NULL;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'ReceiptHistory') AND name = 'DeliverTo')
    ALTER TABLE ReceiptHistory ADD DeliverTo NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'ReceiptHistory') AND name = 'DueDate')
    ALTER TABLE ReceiptHistory ADD DueDate DATE NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'ReceiptHistory') AND name = 'PaymentMethod')
    ALTER TABLE ReceiptHistory ADD PaymentMethod NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'ReceiptHistory') AND name = 'CustomerBank')
    ALTER TABLE ReceiptHistory ADD CustomerBank NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'ReceiptHistory') AND name = 'CustomerBranch')
    ALTER TABLE ReceiptHistory ADD CustomerBranch NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'ReceiptHistory') AND name = 'ChequeNo')
    ALTER TABLE ReceiptHistory ADD ChequeNo NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'ReceiptHistory') AND name = 'ChequeDate')
    ALTER TABLE ReceiptHistory ADD ChequeDate DATE NULL;
GO

-- =========================================================================
-- หมวดที่ 8: ฟิลด์ข้อมูลอ้างอิงและผู้ขายใน TaxInvoice และ TaxInvoiceHistory
-- =========================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TaxInvoice') AND name = 'CustomerOrder')
    ALTER TABLE TaxInvoice ADD CustomerOrder NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TaxInvoice') AND name = 'PurchaseNo')
    ALTER TABLE TaxInvoice ADD PurchaseNo NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TaxInvoice') AND name = 'Salesperson')
    ALTER TABLE TaxInvoice ADD Salesperson NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TaxInvoice') AND name = 'TermOfPayment')
    ALTER TABLE TaxInvoice ADD TermOfPayment NVARCHAR(100) NULL;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TaxInvoiceHistory') AND name = 'CustomerOrder')
    ALTER TABLE TaxInvoiceHistory ADD CustomerOrder NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TaxInvoiceHistory') AND name = 'PurchaseNo')
    ALTER TABLE TaxInvoiceHistory ADD PurchaseNo NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TaxInvoiceHistory') AND name = 'Salesperson')
    ALTER TABLE TaxInvoiceHistory ADD Salesperson NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TaxInvoiceHistory') AND name = 'TermOfPayment')
    ALTER TABLE TaxInvoiceHistory ADD TermOfPayment NVARCHAR(100) NULL;
GO

-- =========================================================================
-- หมวดที่ 9: ตารางฝ่ายจัดซื้อ (Procurement: Purchase Order & History)
-- =========================================================================

-- 1. PurchaseOrder (หัวเอกสารใบสั่งซื้อ PO)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseOrder')
BEGIN
    CREATE TABLE PurchaseOrder (
        PurchaseOrderID      INT IDENTITY(1,1) PRIMARY KEY,
        PONumber             NVARCHAR(50)  NOT NULL UNIQUE,
        PODate               DATE          NOT NULL,
        RefNumber            NVARCHAR(100) NULL,
        PRNumber             NVARCHAR(100) NULL,
        DocType              NVARCHAR(50)  DEFAULT 'po_thc',
        
        BuyerName            NVARCHAR(200) NOT NULL,
        BuyerAddress         NVARCHAR(500) NULL,
        BuyerPhone           NVARCHAR(50)  NULL,
        BuyerEmail           NVARCHAR(100) NULL,
        BuyerTaxID           NVARCHAR(50)  NULL,
        
        SupplierID           INT           NULL,
        SupplierName         NVARCHAR(200) NOT NULL,
        SupplierAddress      NVARCHAR(500) NULL,
        SupplierPhone        NVARCHAR(50)  NULL,
        SupplierEmail        NVARCHAR(100) NULL,
        SupplierTaxID        NVARCHAR(50)  NULL,
        
        SubTotal             DECIMAL(18,2) DEFAULT 0,
        DiscountPercent      DECIMAL(5,2)  DEFAULT 0,
        DiscountAmount       DECIMAL(18,2) DEFAULT 0,
        VatRate              DECIMAL(5,2)  DEFAULT 7,
        VatAmount            DECIMAL(18,2) DEFAULT 0,
        GrandTotal           DECIMAL(18,2) DEFAULT 0,
        WithholdingTaxRate   DECIMAL(5,2)  DEFAULT 0,
        WithholdingTaxAmount DECIMAL(18,2) DEFAULT 0,
        TotalPayable         DECIMAL(18,2) DEFAULT 0,
        
        Notes                NVARCHAR(MAX) NULL,
        PreparedBy           NVARCHAR(100) NULL,
        ApprovedBy           NVARCHAR(100) NULL,
        SupplierRecipient    NVARCHAR(100) NULL,
        
        Status               NVARCHAR(50)  DEFAULT N'รออนุมัติ',
        CreatedBy            INT           NULL,
        CreatedAt            DATETIME      DEFAULT GETDATE(),
        UpdatedAt            DATETIME      DEFAULT GETDATE(),
        Revision             INT           NOT NULL DEFAULT 0,

        CONSTRAINT FK_PO_Supplier FOREIGN KEY (SupplierID) REFERENCES Supplier(SupplierID) ON DELETE SET NULL,
        CONSTRAINT FK_PO_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id)
    );
    PRINT 'Created table: PurchaseOrder';
END;
GO

-- 2. PurchaseOrderItem (รายการสินค้าในใบสั่งซื้อ PO)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseOrderItem')
BEGIN
    CREATE TABLE PurchaseOrderItem (
        ItemID               INT IDENTITY(1,1) PRIMARY KEY,
        PurchaseOrderID      INT           NOT NULL,
        ItemOrder            INT           DEFAULT 1,
        ItemName             NVARCHAR(255) NOT NULL,
        ItemCode             NVARCHAR(100) NULL,
        Qty                  DECIMAL(18,4) DEFAULT 1,
        Unit                 NVARCHAR(50)  DEFAULT N'ชิ้น',
        UnitPrice            DECIMAL(18,2) DEFAULT 0,
        VatRate              DECIMAL(5,2)  DEFAULT 7,
        VatAmount            DECIMAL(18,2) DEFAULT 0,
        LineTotal            DECIMAL(18,2) DEFAULT 0,
        WhtRate              DECIMAL(5,2)  DEFAULT 0,
        WhtAmount            DECIMAL(18,2) DEFAULT 0,
        CONSTRAINT FK_POItem_PO FOREIGN KEY (PurchaseOrderID) REFERENCES PurchaseOrder(PurchaseOrderID) ON DELETE CASCADE
    );
    PRINT 'Created table: PurchaseOrderItem';
END;
GO

-- 3. PurchaseOrderHistory (ประวัติการแก้ไขเวอร์ชั่น PO)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseOrderHistory')
BEGIN
    CREATE TABLE PurchaseOrderHistory (
        HistoryID            INT IDENTITY(1,1) PRIMARY KEY,
        PurchaseOrderID      INT           NOT NULL,
        Revision             INT           NOT NULL,
        PONumber             NVARCHAR(50)  NOT NULL,
        PODate               DATE          NOT NULL,
        RefNumber            NVARCHAR(100) NULL,
        PRNumber             NVARCHAR(100) NULL,
        DocType              NVARCHAR(50)  NULL,
        BuyerName            NVARCHAR(200) NOT NULL,
        BuyerAddress         NVARCHAR(500) NULL,
        BuyerPhone           NVARCHAR(50)  NULL,
        BuyerEmail           NVARCHAR(100) NULL,
        BuyerTaxID           NVARCHAR(50)  NULL,
        SupplierID           INT           NULL,
        SupplierName         NVARCHAR(200) NOT NULL,
        SupplierAddress      NVARCHAR(500) NULL,
        SupplierPhone        NVARCHAR(50)  NULL,
        SupplierEmail        NVARCHAR(100) NULL,
        SupplierTaxID        NVARCHAR(50)  NULL,
        SubTotal             DECIMAL(18,2) NULL,
        DiscountPercent      DECIMAL(5,2)  NULL,
        DiscountAmount       DECIMAL(18,2) NULL,
        VatRate              DECIMAL(5,2)  NULL,
        VatAmount            DECIMAL(18,2) NULL,
        GrandTotal           DECIMAL(18,2) NULL,
        WithholdingTaxRate   DECIMAL(5,2)  NULL,
        WithholdingTaxAmount DECIMAL(18,2) NULL,
        TotalPayable         DECIMAL(18,2) NULL,
        Notes                NVARCHAR(MAX) NULL,
        PreparedBy           NVARCHAR(100) NULL,
        ApprovedBy           NVARCHAR(100) NULL,
        SupplierRecipient    NVARCHAR(100) NULL,
        Status               NVARCHAR(50)  NULL,
        CreatedBy            INT           NULL,
        ArchivedAt           DATETIME      DEFAULT GETDATE()
    );
    PRINT 'Created table: PurchaseOrderHistory';
END;
GO

-- 4. PurchaseOrderItemHistory (ประวัติรายการสินค้าในแต่ละเวอร์ชั่นของ PO)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseOrderItemHistory')
BEGIN
    CREATE TABLE PurchaseOrderItemHistory (
        ItemHistoryID        INT IDENTITY(1,1) PRIMARY KEY,
        HistoryID            INT           NOT NULL,
        ItemOrder            INT           NULL,
        ItemName             NVARCHAR(255) NOT NULL,
        ItemCode             NVARCHAR(100) NULL,
        Qty                  DECIMAL(18,4) NULL,
        Unit                 NVARCHAR(50)  NULL,
        UnitPrice            DECIMAL(18,2) NULL,
        VatRate              DECIMAL(5,2)  NULL,
        VatAmount            DECIMAL(18,2) NULL,
        LineTotal            DECIMAL(18,2) NULL,
        WhtRate              DECIMAL(5,2)  NULL,
        WhtAmount            DECIMAL(18,2) NULL,
        CONSTRAINT FK_POItemHist_POHist FOREIGN KEY (HistoryID) REFERENCES PurchaseOrderHistory(HistoryID) ON DELETE CASCADE
    );
    PRINT 'Created table: PurchaseOrderItemHistory';
END;
GO

-- =========================================================================
-- หมวดที่ 10: ข้อมูลเพิ่มเติมในตารางผู้ขาย (Supplier Columns)
-- =========================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Supplier') AND name = 'Supplier_Code')
    ALTER TABLE Supplier ADD Supplier_Code VARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Supplier') AND name = 'Supplier_Name_TH')
    ALTER TABLE Supplier ADD Supplier_Name_TH NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Supplier') AND name = 'Supplier_Name_EN')
    ALTER TABLE Supplier ADD Supplier_Name_EN NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Supplier') AND name = 'Supplier_Type')
    ALTER TABLE Supplier ADD Supplier_Type NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Supplier') AND name = 'Contact_Person')
    ALTER TABLE Supplier ADD Contact_Person NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Supplier') AND name = 'Email')
    ALTER TABLE Supplier ADD Email VARCHAR(255) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Supplier') AND name = 'Payment_Terms')
    ALTER TABLE Supplier ADD Payment_Terms NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Supplier') AND name = 'Credit_Limit_THB')
    ALTER TABLE Supplier ADD Credit_Limit_THB DECIMAL(18,2) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Supplier') AND name = 'Certification')
    ALTER TABLE Supplier ADD Certification NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Supplier') AND name = 'Lead_Time_Days')
    ALTER TABLE Supplier ADD Lead_Time_Days INT NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Supplier') AND name = 'Active_Status')
    ALTER TABLE Supplier ADD Active_Status VARCHAR(20) DEFAULT 'Active';
GO

-- =========================================================================
-- หมวดที่ 11: ตารางไฟล์แนบเอกสารกฎหมาย (LegalDocumentAttachments)
-- =========================================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'LegalDocumentAttachments')
BEGIN
    CREATE TABLE LegalDocumentAttachments (
        AttachmentID    INT IDENTITY(1,1) PRIMARY KEY,
        DocumentNo      NVARCHAR(50)  NOT NULL,
        FileName        NVARCHAR(255) NOT NULL,
        FilePath        NVARCHAR(MAX) NOT NULL,
        ReceivedDate    DATE          NULL,
        ReceiverName    NVARCHAR(100) NULL,
        Remarks         NVARCHAR(MAX) NULL,
        UploadedAt      DATETIME      DEFAULT GETDATE()
    );
    PRINT 'Created table: LegalDocumentAttachments';
END;
GO

-- =========================================================================
-- หมวดที่ 12: คอลัมน์ Version และ DocumentNo ในเอกสารกฎหมาย
-- =========================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'PdpaConsentDocuments') AND name = 'Version')
    ALTER TABLE PdpaConsentDocuments ADD Version INT NOT NULL DEFAULT 1;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'PdpaConsentDocuments') AND name = 'RefDocumentID')
    ALTER TABLE PdpaConsentDocuments ADD RefDocumentID INT NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'PdpaConsentDocuments') AND name = 'DocumentNo')
    ALTER TABLE PdpaConsentDocuments ADD DocumentNo NVARCHAR(50) NULL;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'CorpRepDocuments') AND name = 'Version')
    ALTER TABLE CorpRepDocuments ADD Version INT NOT NULL DEFAULT 1;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'CorpRepDocuments') AND name = 'RefDocumentID')
    ALTER TABLE CorpRepDocuments ADD RefDocumentID INT NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'CorpRepDocuments') AND name = 'DocumentNo')
    ALTER TABLE CorpRepDocuments ADD DocumentNo NVARCHAR(50) NULL;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'SafetyCertDocuments') AND name = 'Version')
    ALTER TABLE SafetyCertDocuments ADD Version INT NOT NULL DEFAULT 1;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'SafetyCertDocuments') AND name = 'RefDocumentID')
    ALTER TABLE SafetyCertDocuments ADD RefDocumentID INT NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'SafetyCertDocuments') AND name = 'DocumentNo')
    ALTER TABLE SafetyCertDocuments ADD DocumentNo NVARCHAR(50) NULL;
GO

PRINT '=========================================================';
PRINT 'All Database Updates applied successfully!';
PRINT '=========================================================';



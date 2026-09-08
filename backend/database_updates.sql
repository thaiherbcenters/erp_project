-- =========================================================================
-- บันทึกการอัปเดตโครงสร้าง Database (นำไปรันใน SSMS ทีเดียวได้เลย)
-- ไฟล์นี้ถูกสร้างขึ้นเพื่อเก็บประวัติการแก้ไข Table ทั้งหมด จะได้ซิงค์กับ Server ง่ายๆ
-- ข้อควรระวัง: คำสั่งทั้งหมดจะใช้ IF NOT EXISTS เพื่อให้สามารถรันซ้ำได้โดยไม่พัง
-- =========================================================================

-- -------------------------------------------------------------------------
-- อัปเดตเมื่อ: 2026-09-05 (เพิ่มระบบผูกบัญชีกับลายเซ็น)
-- -------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Signatures') AND name = 'user_id')
BEGIN
    ALTER TABLE Signatures ADD user_id INT NULL;
    ALTER TABLE Signatures ADD CONSTRAINT FK_Signatures_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL;
END;
GO

-- -------------------------------------------------------------------------
-- อัปเดตเมื่อ: 2026-09-05 (เพิ่มระบบบันทึกผู้สร้างเอกสารในฝ่ายขาย)
-- -------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Quotation') AND name = 'CreatedBy')
BEGIN
    ALTER TABLE Quotation ADD CreatedBy INT NULL;
    ALTER TABLE Quotation ADD CONSTRAINT FK_Quotation_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'BillingInvoice') AND name = 'CreatedBy')
BEGIN
    ALTER TABLE BillingInvoice ADD CreatedBy INT NULL;
    ALTER TABLE BillingInvoice ADD CONSTRAINT FK_BillingInvoice_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'DeliveryOrder') AND name = 'CreatedBy')
BEGIN
    ALTER TABLE DeliveryOrder ADD CreatedBy INT NULL;
    ALTER TABLE DeliveryOrder ADD CONSTRAINT FK_DeliveryOrder_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TaxInvoice') AND name = 'CreatedBy')
BEGIN
    ALTER TABLE TaxInvoice ADD CreatedBy INT NULL;
    ALTER TABLE TaxInvoice ADD CONSTRAINT FK_TaxInvoice_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Receipt') AND name = 'CreatedBy')
BEGIN
    ALTER TABLE Receipt ADD CreatedBy INT NULL;
    ALTER TABLE Receipt ADD CONSTRAINT FK_Receipt_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'SalesOrder') AND name = 'CreatedBy')
BEGIN
    ALTER TABLE SalesOrder ADD CreatedBy INT NULL;
    ALTER TABLE SalesOrder ADD CONSTRAINT FK_SalesOrder_Users FOREIGN KEY (CreatedBy) REFERENCES Users(user_id);
END;
GO

-- -------------------------------------------------------------------------
-- อัปเดตเมื่อ: 2026-09-08 (เพิ่มฟิลด์จำนวนบริการ อย. FdaServiceRegisterQuantity และ FdaServiceTrademarkQuantity)
-- -------------------------------------------------------------------------
DECLARE @tables TABLE (TableName NVARCHAR(100));
INSERT INTO @tables (TableName) VALUES 
('Quotation'), ('QuotationHistory'),
('BillingInvoice'), ('BillingInvoiceHistory'),
('DeliveryOrder'), ('DeliveryOrderHistory'),
('TaxInvoice'), ('TaxInvoiceHistory'),
('Receipt'), ('ReceiptHistory');

DECLARE @tbl NVARCHAR(100);
DECLARE tbl_cursor CURSOR FOR SELECT TableName FROM @tables;
OPEN tbl_cursor;
FETCH NEXT FROM tbl_cursor INTO @tbl;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- เพิ่ม FdaServiceRegisterQuantity
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(@tbl) AND name = 'FdaServiceRegisterQuantity')
    BEGIN
        EXEC('ALTER TABLE ' + @tbl + ' ADD FdaServiceRegisterQuantity INT NULL;');
    END;

    -- เพิ่ม FdaServiceTrademarkQuantity
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(@tbl) AND name = 'FdaServiceTrademarkQuantity')
    BEGIN
        EXEC('ALTER TABLE ' + @tbl + ' ADD FdaServiceTrademarkQuantity INT NULL;');
    END;

    FETCH NEXT FROM tbl_cursor INTO @tbl;
END;

CLOSE tbl_cursor;
DEALLOCATE tbl_cursor;
GO


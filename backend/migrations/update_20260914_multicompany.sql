-- =========================================================================
-- ERP ThaiHerb: Multi-Company Architecture Database Migration (14 Sep 2026)
-- สำหรับนำไปรันบน Server Database หลัก (Production)
-- ปลอดภัย 100% (มี IF NOT EXISTS ทุกจุด สามารถรันซ้ำได้โดยข้อมูลเดิมไม่หาย)
-- =========================================================================

-- 1. เพิ่มคอลัมน์ใหม่ในตาราง Company
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Company') AND name = 'CompanyNameTH')
    ALTER TABLE Company ADD CompanyNameTH NVARCHAR(500) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Company') AND name = 'CompanyNameEN')
    ALTER TABLE Company ADD CompanyNameEN NVARCHAR(500) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Company') AND name = 'CompanyColor')
    ALTER TABLE Company ADD CompanyColor NVARCHAR(20) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Company') AND name = 'CompanyIcon')
    ALTER TABLE Company ADD CompanyIcon NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Company') AND name = 'ShortName')
    ALTER TABLE Company ADD ShortName NVARCHAR(20) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Company') AND name = 'CompanyLogo')
    ALTER TABLE Company ADD CompanyLogo NVARCHAR(255) NULL;
GO

-- 2. อัปเดตข้อมูลและสร้างบริษัททั้ง 4 บริษัท
-- 2.1 THC (ไทยเฮิร์บ เซ็นเตอร์) - CompanyID 1
UPDATE Company SET 
    CompanyName = N'Thai Herb Centers',
    ShortName = N'THC',
    CompanyNameTH = N'บริษัท ไทยเฮิร์บเซ็นเตอร์ส',
    CompanyNameEN = N'Thai Herb Centers',
    CompanyColor = N'#16a34a',
    CompanyIcon = N'leaf',
    CompanyLogo = N'/images/logos/logo-thc.png',
    IsActive = 1
WHERE CompanyID = 1;

-- 2.2 ELITE (อีลิท บิสซิเนส) - CompanyID 2
UPDATE Company SET 
    CompanyName = N'Elite Trading 2020',
    ShortName = N'ELITE',
    CompanyNameTH = N'บริษัท อิลิท เทรดดิ้ง 2020 จำกัด',
    CompanyNameEN = N'Elite Trading 2020 Co., Ltd.',
    CompanyColor = N'#2563eb',
    CompanyIcon = N'diamond',
    CompanyLogo = N'/images/logos/logo-elite.png',
    IsActive = 1
WHERE CompanyID = 2;

-- 2.3 RIVERVIEW (ริเวอร์วิว) - CompanyID 3
UPDATE Company SET 
    CompanyName = N'Riverview Protect & Cleaning',
    ShortName = N'RIVERVIEW',
    CompanyNameTH = N'บริษัท ริเว่อร์วิว โพรเทคท์ แอนด์ คลีนนิ่ง จำกัด',
    CompanyNameEN = N'Riverview Protect & Cleaning Co., Ltd.',
    CompanyColor = N'#7c3aed',
    CompanyIcon = N'shield',
    CompanyLogo = N'/images/logos/logo-riv.png',
    IsActive = 1
WHERE CompanyID = 3;

-- 2.4 PSF (เพ็ท ซาฟารี / พรีเมียร์ สมาร์ท ฟาร์ม) - CompanyID 4
IF NOT EXISTS (SELECT 1 FROM Company WHERE CompanyID = 4)
BEGIN
    SET IDENTITY_INSERT Company ON;
    INSERT INTO Company (CompanyID, CompanyName, ShortName, CompanyNameTH, CompanyNameEN, TaxID, Address, IsActive, CompanyColor, CompanyIcon, CompanyLogo)
    VALUES (4, N'Premier Smart Farm', N'PSF', N'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด', N'Premier Smart Farm Co., Ltd.', N'', N'', 1, N'#ea580c', N'sprout', N'/images/logos/logo-psf.png');
    SET IDENTITY_INSERT Company OFF;
    PRINT 'Created Company 4: PSF';
END
ELSE
BEGIN
    UPDATE Company SET 
        CompanyName = N'Premier Smart Farm',
        ShortName = N'PSF',
        CompanyNameTH = N'บริษัท พรีเมียร์ สมาร์ท ฟาร์ม จำกัด',
        CompanyNameEN = N'Premier Smart Farm Co., Ltd.',
        CompanyColor = N'#ea580c',
        CompanyIcon = N'sprout',
        CompanyLogo = N'/images/logos/logo-psf.png',
        IsActive = 1
    WHERE CompanyID = 4;
    PRINT 'Updated Company 4: PSF';
END;
GO

-- 3. ตารางสิทธิ์เข้าถึงบริษัทรายบุคคล (UserCompanyAccess)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UserCompanyAccess')
BEGIN
    CREATE TABLE UserCompanyAccess (
        UserCompanyID INT IDENTITY(1,1) PRIMARY KEY,
        user_id       INT NOT NULL,
        CompanyID     INT NOT NULL,
        is_default    BIT DEFAULT 0,
        role_override NVARCHAR(50) NULL,
        CONSTRAINT UQ_UserCompany UNIQUE (user_id, CompanyID),
        CONSTRAINT FK_UCA_User FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
        CONSTRAINT FK_UCA_Company FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID)
    );
    PRINT 'Created table: UserCompanyAccess';
END;
GO

-- 4. กำหนดสิทธิ์เริ่มต้นให้ผู้ใช้เดิม
-- 4.1 แอดมิน (admin) และ ผู้บริหาร (executive) -> ให้เข้าถึงครบทั้ง 4 บริษัท
INSERT INTO UserCompanyAccess (user_id, CompanyID, is_default)
SELECT u.user_id, c.CompanyID, CASE WHEN c.CompanyID = 1 THEN 1 ELSE 0 END
FROM Users u
CROSS JOIN (SELECT CompanyID FROM Company WHERE CompanyID IN (1, 2, 3, 4)) c
WHERE u.role IN ('admin', 'executive')
  AND NOT EXISTS (
      SELECT 1 FROM UserCompanyAccess uca 
      WHERE uca.user_id = u.user_id AND uca.CompanyID = c.CompanyID
  );

-- 4.2 พนักงานทั่วไป -> ให้เข้าถึงเฉพาะ THC (CompanyID = 1) เป็นค่าเริ่มต้น
INSERT INTO UserCompanyAccess (user_id, CompanyID, is_default)
SELECT u.user_id, 1, 1
FROM Users u
WHERE u.role NOT IN ('admin', 'executive')
  AND NOT EXISTS (
      SELECT 1 FROM UserCompanyAccess uca 
      WHERE uca.user_id = u.user_id AND uca.CompanyID = 1
  );
GO

PRINT '=========================================================';
PRINT 'Multi-Company Database Migration completed successfully!';
PRINT '=========================================================';

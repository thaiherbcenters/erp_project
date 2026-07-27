-- Migration: Add Version and RefDocumentID columns to document tables that are missing them
-- Tables: PdpaConsentDocuments, CorpRepDocuments, SafetyCertDocuments

-- 1. PdpaConsentDocuments
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PdpaConsentDocuments' AND COLUMN_NAME = 'Version')
BEGIN
    ALTER TABLE PdpaConsentDocuments ADD Version INT NOT NULL DEFAULT 1;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PdpaConsentDocuments' AND COLUMN_NAME = 'RefDocumentID')
BEGIN
    ALTER TABLE PdpaConsentDocuments ADD RefDocumentID INT NULL;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PdpaConsentDocuments' AND COLUMN_NAME = 'DocumentNo')
BEGIN
    ALTER TABLE PdpaConsentDocuments ADD DocumentNo NVARCHAR(50) NULL;
END

-- 2. CorpRepDocuments
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CorpRepDocuments' AND COLUMN_NAME = 'Version')
BEGIN
    ALTER TABLE CorpRepDocuments ADD Version INT NOT NULL DEFAULT 1;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CorpRepDocuments' AND COLUMN_NAME = 'RefDocumentID')
BEGIN
    ALTER TABLE CorpRepDocuments ADD RefDocumentID INT NULL;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CorpRepDocuments' AND COLUMN_NAME = 'DocumentNo')
BEGIN
    ALTER TABLE CorpRepDocuments ADD DocumentNo NVARCHAR(50) NULL;
END

-- 3. SafetyCertDocuments
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SafetyCertDocuments' AND COLUMN_NAME = 'Version')
BEGIN
    ALTER TABLE SafetyCertDocuments ADD Version INT NOT NULL DEFAULT 1;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SafetyCertDocuments' AND COLUMN_NAME = 'RefDocumentID')
BEGIN
    ALTER TABLE SafetyCertDocuments ADD RefDocumentID INT NULL;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SafetyCertDocuments' AND COLUMN_NAME = 'DocumentNo')
BEGIN
    ALTER TABLE SafetyCertDocuments ADD DocumentNo NVARCHAR(50) NULL;
END

PRINT 'Migration complete: Version, RefDocumentID, and DocumentNo columns added to PdpaConsentDocuments, CorpRepDocuments, SafetyCertDocuments';

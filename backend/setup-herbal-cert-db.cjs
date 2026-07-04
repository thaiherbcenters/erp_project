/**
 * setup-herbal-cert-db.cjs
 * สร้างตาราง HerbalCertDocuments ใน SQL Server
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

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'HerbalCertDocuments')
            BEGIN
                CREATE TABLE HerbalCertDocuments (
                    DocumentID INT IDENTITY(1,1) PRIMARY KEY,
                    DocumentNo NVARCHAR(50) NULL,
                    WrittenAt NVARCHAR(200) NULL,
                    DocumentDate DATE NULL,
                    DocumentType NVARCHAR(50) NULL,
                    ContractID INT NULL,
                    
                    ApplicantType NVARCHAR(50) NULL,
                    ApplicantName NVARCHAR(200) NULL,
                    ApplicantCitizenID NVARCHAR(20) NULL,
                    ApplicantCitizenIDExpiryDate DATE NULL,
                    ApplicantJuristicID NVARCHAR(20) NULL,
                    LicenseNo NVARCHAR(100) NULL,
                    JuristicIDExpiryDate DATE NULL,
                    
                    OperatorPrefix NVARCHAR(50) NULL,
                    OperatorName NVARCHAR(200) NULL,
                    OperatorCitizenID NVARCHAR(20) NULL,
                    OperatorIDExpiryDate DATE NULL,
                    
                    EstablishmentName NVARCHAR(200) NULL,
                    EstAddressNo NVARCHAR(100) NULL,
                    EstBuilding NVARCHAR(200) NULL,
                    EstMoo NVARCHAR(50) NULL,
                    EstSoi NVARCHAR(100) NULL,
                    EstRoad NVARCHAR(100) NULL,
                    EstSubDistrict NVARCHAR(100) NULL,
                    EstDistrict NVARCHAR(100) NULL,
                    EstProvince NVARCHAR(100) NULL,
                    EstPostcode NVARCHAR(20) NULL,
                    EstPhone NVARCHAR(50) NULL,
                    EstFax NVARCHAR(50) NULL,
                    EstEmail NVARCHAR(100) NULL,
                    
                    IsProducer BIT NOT NULL DEFAULT 0,
                    IsImporter BIT NOT NULL DEFAULT 0,
                    ProdTypeHerbalMedicine BIT NOT NULL DEFAULT 0,
                    ProdTypeTraditionalMed BIT NOT NULL DEFAULT 0,
                    ProdTypeDevMed BIT NOT NULL DEFAULT 0,
                    ProdTypeHealthProduct BIT NOT NULL DEFAULT 0,
                    ProdTypeCosmetic BIT NOT NULL DEFAULT 0,
                    ProdTypeDetail NVARCHAR(MAX) NULL,
                    
                    RequestType NVARCHAR(50) NULL,
                    ReqTypeRegister BIT NOT NULL DEFAULT 0,
                    ReqTypeNotifyDetail BIT NOT NULL DEFAULT 0,
                    ReqTypeNotify BIT NOT NULL DEFAULT 0,
                    ReqTypeRenew BIT NOT NULL DEFAULT 0,
                    
                    SubmitterIsIn BIT NOT NULL DEFAULT 0,
                    SubmitFormType NVARCHAR(50) NULL,
                    SubmitFormTypeAmend BIT NOT NULL DEFAULT 0,
                    SubmitFormTypeReplace BIT NOT NULL DEFAULT 0,
                    SubmitFormTypeOtherCheck BIT NOT NULL DEFAULT 0,
                    SubmitFormOther NVARCHAR(200) NULL,
                    
                    ProductName NVARCHAR(300) NULL,
                    ProductReceiveNo NVARCHAR(100) NULL,
                    SubmitterIsOr BIT NOT NULL DEFAULT 0,
                    ProductNameAlt NVARCHAR(300) NULL,
                    HasRegNo BIT NOT NULL DEFAULT 0,
                    RegNo NVARCHAR(100) NULL,
                    HasRegDetail BIT NOT NULL DEFAULT 0,
                    RegDetailNo NVARCHAR(100) NULL,
                    HasNoticeNo BIT NOT NULL DEFAULT 0,
                    RegNoticeNo NVARCHAR(100) NULL,
                    
                    AttachLicenseCopy BIT NOT NULL DEFAULT 0,
                    
                    Status NVARCHAR(50) NOT NULL DEFAULT N'ร่าง',
                    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT 'Created table: HerbalCertDocuments';
            END
            ELSE PRINT 'Table HerbalCertDocuments already exists';
        `);

        console.log('✅ Setup complete!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

setup();

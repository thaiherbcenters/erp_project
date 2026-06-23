/**
 * setup-legal-documents-db.cjs
 * สร้างตาราง LegalDocuments ใน SQL Server (สำหรับหนังสือมอบอำนาจ / แต่งตั้งผู้แทน)
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
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'LegalDocuments')
            BEGIN
                CREATE TABLE LegalDocuments (
                    DocumentID INT IDENTITY(1,1) PRIMARY KEY,
                    DocumentNo NVARCHAR(50) NULL,
                    WrittenAt NVARCHAR(200) NULL,
                    DocumentDate DATE NULL,
                    DocumentType NVARCHAR(50) NULL,
                    
                    GrantorType NVARCHAR(50) NULL,
                    GrantorName NVARCHAR(200) NULL,
                    GrantorCitizenID NVARCHAR(20) NULL,
                    GrantorJuristicID NVARCHAR(20) NULL,
                    
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
                    ProdTypeHerbalFood BIT NOT NULL DEFAULT 0,
                    ProdTypeTraditionalMed BIT NOT NULL DEFAULT 0,
                    ProdTypeDevMed BIT NOT NULL DEFAULT 0,
                    ProdTypeHealthProduct BIT NOT NULL DEFAULT 0,
                    ProdTypeCosmetic BIT NOT NULL DEFAULT 0,
                    ProdTypeDetail NVARCHAR(MAX) NULL,
                    
                    RequestType NVARCHAR(50) NULL,
                    SubmitterIsIn BIT NOT NULL DEFAULT 0,
                    SubmitFormType NVARCHAR(50) NULL,
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
                    
                    GranteePrefix NVARCHAR(50) NULL,
                    GranteeName NVARCHAR(200) NULL,
                    GranteeAge INT NULL,
                    GranteeCitizenID NVARCHAR(20) NULL,
                    GranteeIDExpiryDate DATE NULL,
                    GranteeAddressNo NVARCHAR(100) NULL,
                    GranteeMoo NVARCHAR(50) NULL,
                    GranteeSoi NVARCHAR(100) NULL,
                    GranteeRoad NVARCHAR(100) NULL,
                    GranteeSubDistrict NVARCHAR(100) NULL,
                    GranteeDistrict NVARCHAR(100) NULL,
                    GranteeProvince NVARCHAR(100) NULL,
                    GranteePhone NVARCHAR(50) NULL,
                    GranteeEmail NVARCHAR(100) NULL,
                    
                    ScopeSubmit BIT NOT NULL DEFAULT 0,
                    ScopeAmend BIT NOT NULL DEFAULT 0,
                    ScopeAll BIT NOT NULL DEFAULT 0,
                    ScopeStartDate DATE NULL,
                    
                    AttachLicenseCopy BIT NOT NULL DEFAULT 0,
                    
                    Status NVARCHAR(50) NOT NULL DEFAULT N'ร่าง',
                    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT 'Created table: LegalDocuments';
            END
            ELSE PRINT 'Table LegalDocuments already exists';
        `);

        console.log('✅ Setup complete!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

setup();

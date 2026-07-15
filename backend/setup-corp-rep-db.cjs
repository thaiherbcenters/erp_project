const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function setup() {
    try {
        const pool = await sql.connect(config);
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CorpRepDocuments' AND xtype='U')
            BEGIN
                CREATE TABLE CorpRepDocuments (
                    documentId INT IDENTITY(1,1) PRIMARY KEY,
                    contractId INT NULL,
                    customerId INT NULL,
                    WrittenAt NVARCHAR(255) NULL,
                    DocumentDate DATE NULL,
                    
                    -- ข้อ 1: ข้อมูลนิติบุคคล
                    JuristicName NVARCHAR(255) NULL,
                    JuristicRegNo NVARCHAR(50) NULL,
                    JuristicRegDate DATE NULL,
                    
                    -- ที่อยู่สำนักงานใหญ่
                    OfficeAddrNo NVARCHAR(50) NULL,
                    OfficeBuilding NVARCHAR(100) NULL,
                    OfficeMoo NVARCHAR(20) NULL,
                    OfficeSoi NVARCHAR(100) NULL,
                    OfficeRoad NVARCHAR(100) NULL,
                    OfficeSubDistrict NVARCHAR(100) NULL,
                    OfficeDistrict NVARCHAR(100) NULL,
                    OfficeProvince NVARCHAR(100) NULL,
                    OfficeZip NVARCHAR(10) NULL,
                    OfficePhone NVARCHAR(50) NULL,
                    OfficeFax NVARCHAR(50) NULL,
                    OfficeEmail NVARCHAR(100) NULL,
                    
                    -- ผู้มีอำนาจลงชื่อ (สูงสุด 3 คน)
                    SignatoryCount INT DEFAULT 1,
                    Signatory1Name NVARCHAR(255) NULL,
                    Signatory1IdCard NVARCHAR(20) NULL,
                    Signatory1CardExpiry DATE NULL,
                    Signatory2Name NVARCHAR(255) NULL,
                    Signatory2IdCard NVARCHAR(20) NULL,
                    Signatory2CardExpiry DATE NULL,
                    Signatory3Name NVARCHAR(255) NULL,
                    Signatory3IdCard NVARCHAR(20) NULL,
                    Signatory3CardExpiry DATE NULL,
                    
                    -- ข้อ 2: ประเภทคำขอ
                    ReqTypeTorBor1 BIT DEFAULT 0,
                    ReqTypeJorRor1 BIT DEFAULT 0,
                    ReqTypeJorJor1 BIT DEFAULT 0,
                    ReqTypeTorOr BIT DEFAULT 0,
                    ProductName NVARCHAR(500) NULL,
                    ReceiptNo NVARCHAR(100) NULL,
                    
                    -- ข้อ 3: ผู้แทนนิติบุคคลที่แต่งตั้ง
                    RepName NVARCHAR(255) NULL,
                    RepIdCard NVARCHAR(20) NULL,
                    RepCardExpiry DATE NULL,
                    RepAddrNo NVARCHAR(50) NULL,
                    RepBuilding NVARCHAR(100) NULL,
                    RepMoo NVARCHAR(20) NULL,
                    RepSoi NVARCHAR(100) NULL,
                    RepRoad NVARCHAR(100) NULL,
                    RepSubDistrict NVARCHAR(100) NULL,
                    RepDistrict NVARCHAR(100) NULL,
                    RepProvince NVARCHAR(100) NULL,
                    RepZip NVARCHAR(10) NULL,
                    RepPhone NVARCHAR(50) NULL,
                    RepEmail NVARCHAR(100) NULL,
                    
                    -- System
                    Status NVARCHAR(50) DEFAULT N'ร่าง',
                    Version INT DEFAULT 1,
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    UpdatedAt DATETIME DEFAULT GETDATE()
                );
                PRINT 'Table CorpRepDocuments created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table CorpRepDocuments already exists.';
            END
        `);
        
        console.log('✅ Setup completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

setup();

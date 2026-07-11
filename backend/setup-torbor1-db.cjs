/**
 * setup-torbor1-db.cjs
 * สร้างตาราง TorBor1Documents ใน SQL Server
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
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TorBor1Documents')
            BEGIN
                CREATE TABLE TorBor1Documents (
                    DocumentID INT IDENTITY(1,1) PRIMARY KEY,
                    DocumentNo NVARCHAR(50) NULL,
                    DocumentDate DATE NULL,
                    DocumentType NVARCHAR(50) NULL,
                    ContractID INT NULL,
                    Version INT NOT NULL DEFAULT 1,
                    RefDocumentID INT NULL,
                    
                    -- คำขออนุญาต ชนิด
                    ReqMedicineFromHerb BIT NOT NULL DEFAULT 0,
                    ReqMedType NVARCHAR(100) NULL,
                    ReqHealthProduct BIT NOT NULL DEFAULT 0,
                    
                    -- ประเภท
                    TypeProduce BIT NOT NULL DEFAULT 0,
                    TypeImport BIT NOT NULL DEFAULT 0,
                    TypeExportOnly BIT NOT NULL DEFAULT 0,
                    
                    -- ๑. ชื่อของผลิตภัณฑ์
                    ProductNameThai NVARCHAR(300) NULL,
                    ProductNameEng NVARCHAR(300) NULL,
                    
                    -- ๒. ข้อมูลผู้ขอขึ้นทะเบียนตำรับผลิตภัณฑ์สมุนไพร
                    ApplicantType NVARCHAR(50) NULL, -- 'บุคคลธรรมดา', 'นิติบุคคล', 'ต่างด้าว'
                    
                    AppNaturalName NVARCHAR(200) NULL,
                    AppNaturalAge INT NULL,
                    AppNaturalNationality NVARCHAR(50) NULL,
                    AppNaturalCitizenID NVARCHAR(50) NULL,
                    AppNaturalAddressNo NVARCHAR(100) NULL,
                    AppNaturalBuilding NVARCHAR(200) NULL,
                    AppNaturalMoo NVARCHAR(50) NULL,
                    AppNaturalSoi NVARCHAR(100) NULL,
                    AppNaturalRoad NVARCHAR(100) NULL,
                    AppNaturalSubDistrict NVARCHAR(100) NULL,
                    AppNaturalDistrict NVARCHAR(100) NULL,
                    AppNaturalProvince NVARCHAR(100) NULL,
                    AppNaturalPostcode NVARCHAR(20) NULL,
                    AppNaturalFax NVARCHAR(50) NULL,
                    AppNaturalPhone NVARCHAR(50) NULL,
                    AppNaturalEmail NVARCHAR(100) NULL,
                    
                    AppJuristicName NVARCHAR(200) NULL,
                    AppJuristicID NVARCHAR(50) NULL,
                    AppJuristicAddressNo NVARCHAR(100) NULL,
                    AppJuristicBuilding NVARCHAR(200) NULL,
                    AppJuristicMoo NVARCHAR(50) NULL,
                    AppJuristicSoi NVARCHAR(100) NULL,
                    AppJuristicRoad NVARCHAR(100) NULL,
                    AppJuristicSubDistrict NVARCHAR(100) NULL,
                    AppJuristicDistrict NVARCHAR(100) NULL,
                    AppJuristicProvince NVARCHAR(100) NULL,
                    AppJuristicPostcode NVARCHAR(20) NULL,
                    AppJuristicFax NVARCHAR(50) NULL,
                    AppJuristicPhone NVARCHAR(50) NULL,
                    AppJuristicEmail NVARCHAR(100) NULL,
                    AppJuristicRepName NVARCHAR(200) NULL,
                    AppJuristicRepAge INT NULL,
                    AppJuristicRepNationality NVARCHAR(50) NULL,
                    AppJuristicRepCitizenID NVARCHAR(50) NULL,
                    
                    AppForeignPassportNo NVARCHAR(100) NULL,
                    AppForeignPassportExpiry DATE NULL,
                    AppForeignResCertNo NVARCHAR(100) NULL,
                    AppForeignResCertDate DATE NULL,
                    AppForeignWorkPermitNo NVARCHAR(100) NULL,
                    AppForeignWorkPermitExpiry DATE NULL,

                    -- ๓. ข้อมูลสถานที่ผลิต หรือนำเข้า
                    ProductionType NVARCHAR(50) NULL,
                    
                    ProdLicenseeName NVARCHAR(200) NULL,
                    ProdLicenseNo NVARCHAR(100) NULL,
                    ProdOperatorName NVARCHAR(200) NULL,
                    ProdPlaceName NVARCHAR(200) NULL,
                    ProdAddressNo NVARCHAR(100) NULL,
                    ProdSoi NVARCHAR(100) NULL,
                    ProdRoad NVARCHAR(100) NULL,
                    ProdMoo NVARCHAR(50) NULL,
                    ProdSubDistrict NVARCHAR(100) NULL,
                    ProdDistrict NVARCHAR(100) NULL,
                    ProdProvince NVARCHAR(100) NULL,
                    ProdPostcode NVARCHAR(20) NULL,
                    ProdPhone NVARCHAR(50) NULL,
                    
                    RepackRegNo NVARCHAR(100) NULL,
                    
                    ImportLicenseeName NVARCHAR(200) NULL,
                    ImportLicenseNo NVARCHAR(100) NULL,
                    ImportOperatorName NVARCHAR(200) NULL,
                    ImportPlaceName NVARCHAR(200) NULL,
                    ImportAddressNo NVARCHAR(100) NULL,
                    ImportSoi NVARCHAR(100) NULL,
                    ImportRoad NVARCHAR(100) NULL,
                    ImportMoo NVARCHAR(50) NULL,
                    ImportSubDistrict NVARCHAR(100) NULL,
                    ImportDistrict NVARCHAR(100) NULL,
                    ImportProvince NVARCHAR(100) NULL,
                    ImportPostcode NVARCHAR(20) NULL,
                    ImportPhone NVARCHAR(50) NULL,
                    ImportForeignMfgName NVARCHAR(200) NULL,
                    ImportForeignMfgAddress NVARCHAR(500) NULL,

                    -- ๔. รายละเอียดผู้ผลิตอื่นที่เกี่ยวข้อง (Stored as JSON string)
                    RelatedManufacturers NVARCHAR(MAX) NULL,
                    
                    Status NVARCHAR(50) NOT NULL DEFAULT N'ร่าง',
                    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT 'Created table: TorBor1Documents';
            END
            ELSE PRINT 'Table TorBor1Documents already exists';
        `);

        console.log('✅ Setup complete!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

setup();

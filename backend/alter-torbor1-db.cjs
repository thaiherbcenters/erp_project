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

async function alter() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server');
        
        const alterQuery = `
            ALTER TABLE TorBor1Documents ADD 
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

                RelatedManufacturers NVARCHAR(MAX) NULL
        `;

        await pool.request().query(alterQuery);
        console.log('✅ Altered table TorBor1Documents successfully.');
    } catch (err) {
        if (err.message.includes('already has a column')) {
            console.log('Column already exists, ignoring.');
        } else {
            console.error('❌ Error altering table:', err);
        }
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

alter();

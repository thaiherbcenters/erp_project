/**
 * alter-legal-docs-version.cjs
 * เพิ่มคอลัมน์ Version และ RefDocumentID เพื่อรองรับระบบเอกสารเวอร์ชัน
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

        // Alter LegalDocuments
        const legalCheck = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'LegalDocuments' AND COLUMN_NAME = 'Version'
        `);
        
        if (legalCheck.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE LegalDocuments ADD Version INT NOT NULL DEFAULT 1;
                ALTER TABLE LegalDocuments ADD RefDocumentID INT NULL;
            `);
            console.log('✅ Added Version and RefDocumentID to LegalDocuments');
        } else {
            console.log('ℹ️ Version column already exists in LegalDocuments');
        }

        // Alter HerbalCertDocuments
        const herbalCheck = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'HerbalCertDocuments' AND COLUMN_NAME = 'Version'
        `);
        
        if (herbalCheck.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE HerbalCertDocuments ADD Version INT NOT NULL DEFAULT 1;
                ALTER TABLE HerbalCertDocuments ADD RefDocumentID INT NULL;
            `);
            console.log('✅ Added Version and RefDocumentID to HerbalCertDocuments');
        } else {
            console.log('ℹ️ Version column already exists in HerbalCertDocuments');
        }

        console.log('✅ Versioning setup complete!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

setup();

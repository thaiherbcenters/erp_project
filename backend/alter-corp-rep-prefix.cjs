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
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CorpRepDocuments' AND COLUMN_NAME = 'Signatory1Prefix')
                ALTER TABLE CorpRepDocuments ADD Signatory1Prefix NVARCHAR(20) NULL;
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CorpRepDocuments' AND COLUMN_NAME = 'Signatory2Prefix')
                ALTER TABLE CorpRepDocuments ADD Signatory2Prefix NVARCHAR(20) NULL;
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CorpRepDocuments' AND COLUMN_NAME = 'Signatory3Prefix')
                ALTER TABLE CorpRepDocuments ADD Signatory3Prefix NVARCHAR(20) NULL;
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CorpRepDocuments' AND COLUMN_NAME = 'RepPrefix')
                ALTER TABLE CorpRepDocuments ADD RepPrefix NVARCHAR(20) NULL;
        `);
        
        console.log('✅ Prefix columns added successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

setup();

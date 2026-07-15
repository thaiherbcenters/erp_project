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
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CorpRepDocuments' AND COLUMN_NAME = 'EffectiveDate')
            BEGIN
                ALTER TABLE CorpRepDocuments ADD EffectiveDate DATE NULL;
                PRINT 'Added EffectiveDate column.';
            END
            ELSE
            BEGIN
                PRINT 'EffectiveDate column already exists.';
            END
        `);
        
        console.log('✅ Alter completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

setup();

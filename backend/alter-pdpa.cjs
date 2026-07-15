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

async function alterTable() {
    try {
        const pool = await sql.connect(config);
        
        await pool.request().query(`
            IF COL_LENGTH('PdpaConsentDocuments', 'ContactGroup') IS NULL
            BEGIN
                ALTER TABLE PdpaConsentDocuments ADD ContactGroup NVARCHAR(255) NULL;
                PRINT 'Added ContactGroup column.';
            END
        `);
        
    } catch (err) {
        console.error('Error altering PdpaConsentDocuments DB:', err);
    } finally {
        sql.close();
    }
}

alterTable();

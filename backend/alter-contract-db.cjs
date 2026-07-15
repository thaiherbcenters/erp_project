const sql = require('mssql');
require('dotenv').config({ path: './.env' });

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        trustServerCertificate: true,
        encrypt: false,
    },
};

async function setup() {
    try {
        const pool = await sql.connect(config);
        
        await pool.request().query(`
            ALTER TABLE ContractMfgDocuments ADD EmployerRepAddress NVARCHAR(MAX) NULL;
            ALTER TABLE ContractMfgDocuments ADD ContractorRepOf NVARCHAR(255) NULL;
        `);
        console.log('Columns added successfully.');
    } catch (err) {
        console.error('Database setup failed:', err);
    } finally {
        sql.close();
    }
}

setup();

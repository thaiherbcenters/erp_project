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

async function alterTables() {
    try {
        const pool = await sql.connect(config);
        
        console.log('Adding ContractID to QuotationHistory...');
        try {
            await pool.request().query(`ALTER TABLE QuotationHistory ADD ContractID INT NULL`);
            console.log('Success: QuotationHistory');
        } catch(e) {
            console.log('QuotationHistory: ', e.message);
        }

        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
alterTables();

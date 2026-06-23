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
        
        console.log('Adding ContractID to Quotation...');
        try {
            await pool.request().query(`ALTER TABLE Quotation ADD ContractID INT NULL`);
            console.log('Success: Quotation');
        } catch(e) {
            console.log('Quotation: ', e.message);
        }

        console.log('Adding ContractID to SalesOrder...');
        try {
            await pool.request().query(`ALTER TABLE SalesOrder ADD ContractID INT NULL`);
            console.log('Success: SalesOrder');
        } catch(e) {
            console.log('SalesOrder: ', e.message);
        }

        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
alterTables();

const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function main() {
    try {
        let pool = await sql.connect(config);
        await pool.request().query('ALTER TABLE TaxInvoice ADD Revision INT NOT NULL DEFAULT 0, UpdatedAt DATETIME NULL');
        console.log("Success adding Revision and UpdatedAt to TaxInvoice");
        
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();

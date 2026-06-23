const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 30000,
        requestTimeout: 30000
    }
};

(async () => {
    try {
        console.log('Connecting to database...');
        let pool = await sql.connect(config);
        console.log('Connected! Executing ALTER queries...');
        
        // Add LicenseNo if missing
        try {
            await pool.request().query("ALTER TABLE LegalDocuments ADD LicenseNo NVARCHAR(255);");
            console.log('Added LicenseNo');
        } catch(e) { console.log('LicenseNo might already exist or error:', e.message); }

        try {
            await pool.request().query("ALTER TABLE LegalDocuments ADD JuristicIDExpiryDate DATE;");
            console.log('Added JuristicIDExpiryDate');
        } catch(e) { console.log('JuristicIDExpiryDate might already exist or error:', e.message); }

        try {
            await pool.request().query("ALTER TABLE LegalDocuments ADD GrantorSignName NVARCHAR(255);");
            console.log('Added GrantorSignName');
        } catch(e) { console.log('GrantorSignName might already exist or error:', e.message); }

        try {
            await pool.request().query("ALTER TABLE LegalDocuments ADD GranteeSignName NVARCHAR(255);");
            console.log('Added GranteeSignName');
        } catch(e) { console.log('GranteeSignName might already exist or error:', e.message); }

        try {
            await pool.request().query("ALTER TABLE LegalDocuments ADD Witness1Name NVARCHAR(255);");
            console.log('Added Witness1Name');
        } catch(e) { console.log('Witness1Name might already exist or error:', e.message); }

        try {
            await pool.request().query("ALTER TABLE LegalDocuments ADD Witness2Name NVARCHAR(255);");
            console.log('Added Witness2Name');
        } catch(e) { console.log('Witness2Name might already exist or error:', e.message); }

        console.log('All queries finished');
        process.exit(0);
    } catch (err) {
        console.error('Connection Error:', err);
        process.exit(1);
    }
})();

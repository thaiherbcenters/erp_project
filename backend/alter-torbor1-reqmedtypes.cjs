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
                ReqMedTypeThai BIT NULL DEFAULT 0,
                ReqMedTypeAlternative BIT NULL DEFAULT 0,
                ReqMedTypeDeveloped BIT NULL DEFAULT 0
        `;

        await pool.request().query(alterQuery);
        console.log('✅ Added 3 separated boolean fields successfully.');
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

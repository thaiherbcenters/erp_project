const sql = require('mssql');
require('dotenv').config({ path: './.env' });
const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { trustServerCertificate: true, encrypt: false }
};

async function check() {
    try {
        const pool = await sql.connect(config);
        const resFolders = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DocumentLibraryFolders'");
        console.log('Folders Schema:', resFolders.recordset.map(r => r.COLUMN_NAME));
        
        const resFiles = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DocumentLibrary'");
        console.log('Files Schema:', resFiles.recordset.map(r => r.COLUMN_NAME));
        
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
check();

const sql = require('mssql');
require('dotenv').config({ path: './.env' });
const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { trustServerCertificate: true, encrypt: false }
};

async function fix() {
    try {
        const pool = await sql.connect(config);
        
        // Rename folder_id to id in DocumentLibraryFolders
        await pool.request().query("EXEC sp_rename 'DocumentLibraryFolders.folder_id', 'id', 'COLUMN';");
        console.log('Renamed folder_id -> id in DocumentLibraryFolders');

        // Rename document_id to id in DocumentLibrary
        await pool.request().query("EXEC sp_rename 'DocumentLibrary.document_id', 'id', 'COLUMN';");
        console.log('Renamed document_id -> id in DocumentLibrary');
        
        process.exit(0);
    } catch (e) {
        // Ignore errors if already renamed
        console.log(e.message);
        process.exit(0);
    }
}
fix();

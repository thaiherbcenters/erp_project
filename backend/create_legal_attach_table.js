require('dotenv').config({ path: __dirname + '/.env' });
const { poolPromise } = require('./config/db');

async function createTable() {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LegalDocumentAttachments' and xtype='U')
            CREATE TABLE LegalDocumentAttachments (
                AttachmentID INT IDENTITY(1,1) PRIMARY KEY,
                DocumentNo NVARCHAR(50) NOT NULL,
                FileName NVARCHAR(255) NOT NULL,
                FilePath NVARCHAR(MAX) NOT NULL,
                ReceivedDate DATE,
                ReceiverName NVARCHAR(100),
                Remarks NVARCHAR(MAX),
                UploadedAt DATETIME DEFAULT GETDATE()
            )
        `);
        console.log("Table LegalDocumentAttachments created successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
}
createTable();

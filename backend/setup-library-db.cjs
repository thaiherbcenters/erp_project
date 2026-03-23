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

async function setupLibraryDB() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        console.log('Connected!');

        // =====================================================================
        // 1. Create DocumentLibraryFolders table
        // =====================================================================
        console.log('Creating DocumentLibraryFolders table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DocumentLibraryFolders' AND xtype='U')
            BEGIN
                CREATE TABLE DocumentLibraryFolders (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    folder_name NVARCHAR(255) NOT NULL,
                    parent_id INT NULL,
                    created_by NVARCHAR(100),
                    created_date DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_Folder_Parent FOREIGN KEY (parent_id) REFERENCES DocumentLibraryFolders(id)
                );
                PRINT 'Table DocumentLibraryFolders created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table DocumentLibraryFolders already exists.';
            END
        `);

        // =====================================================================
        // 2. Create DocumentLibrary table
        // =====================================================================
        console.log('Creating DocumentLibrary table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DocumentLibrary' AND xtype='U')
            BEGIN
                CREATE TABLE DocumentLibrary (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    original_name NVARCHAR(255) NOT NULL,
                    stored_name NVARCHAR(255) NOT NULL,
                    file_path NVARCHAR(MAX) NOT NULL,
                    description NVARCHAR(MAX),
                    uploaded_by NVARCHAR(100),
                    upload_date DATETIME DEFAULT GETDATE(),
                    file_size BIGINT,
                    folder_id INT NULL,
                    CONSTRAINT FK_Doc_Folder FOREIGN KEY (folder_id) REFERENCES DocumentLibraryFolders(id)
                );
                PRINT 'Table DocumentLibrary created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table DocumentLibrary already exists.';
                
                -- Add file_size column if it doesn't exist
                IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'file_size' AND Object_ID = Object_ID(N'DocumentLibrary'))
                BEGIN
                    ALTER TABLE DocumentLibrary ADD file_size BIGINT;
                    PRINT 'Added file_size column.';
                END

                -- Add folder_id column if it doesn't exist
                IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'folder_id' AND Object_ID = Object_ID(N'DocumentLibrary'))
                BEGIN
                    ALTER TABLE DocumentLibrary ADD folder_id INT NULL
                        CONSTRAINT FK_Doc_Folder FOREIGN KEY REFERENCES DocumentLibraryFolders(id);
                    PRINT 'Added folder_id column.';
                END
            END
        `);

        // =====================================================================
        // 3. Create DocumentLibraryLogs table
        // =====================================================================
        console.log('Creating DocumentLibraryLogs table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DocumentLibraryLogs' AND xtype='U')
            BEGIN
                CREATE TABLE DocumentLibraryLogs (
                    log_id INT IDENTITY(1,1) PRIMARY KEY,
                    action_type NVARCHAR(50) NOT NULL,
                    doc_original_name NVARCHAR(255) NOT NULL,
                    action_by NVARCHAR(100),
                    action_date DATETIME DEFAULT GETDATE(),
                    details NVARCHAR(MAX)
                );
                PRINT 'Table DocumentLibraryLogs created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table DocumentLibraryLogs already exists.';
            END
        `);

        console.log('Database setup complete!');
        process.exit(0);
    } catch (err) {
        console.error('Database setup error:', err);
        process.exit(1);
    }
}

setupLibraryDB();

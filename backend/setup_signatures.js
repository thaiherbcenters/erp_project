const { sql, poolPromise } = require('./config/db');

async function setupSignatures() {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Signatures' AND xtype='U')
            BEGIN
                CREATE TABLE Signatures (
                    SignatureID INT IDENTITY(1,1) PRIMARY KEY,
                    KeyName NVARCHAR(50) NOT NULL UNIQUE,
                    FullName NVARCHAR(100) NOT NULL,
                    ImagePath NVARCHAR(255) NOT NULL,
                    IsActive BIT DEFAULT 1,
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    UpdatedAt DATETIME DEFAULT GETDATE()
                );
                
                INSERT INTO Signatures (KeyName, FullName, ImagePath) VALUES 
                ('thawat', N'ธวัช จรุงพิรวงศ์', '/images/signatures/sign-authorized.png'),
                ('jutharat', N'จุฑารัตน์ วงค์คำเหลา', '/images/signatures/sign-watcharapong.png');
                
                PRINT 'Table Signatures created and seeded.';
            END
            ELSE
            BEGIN
                PRINT 'Table Signatures already exists.';
            END
        `);
        console.log('Setup complete.');
    } catch (err) {
        console.error('Setup error:', err);
    } finally {
        process.exit(0);
    }
}

setupSignatures();

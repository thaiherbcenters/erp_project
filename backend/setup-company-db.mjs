import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'ERP_THAIHERB',
    user: process.env.DB_USER || 'erp_admin',
    password: process.env.DB_PASSWORD || 'Erp@2026!',
    options: {
        trustServerCertificate: true,
        encrypt: false,
    },
};

const SEED_COMPANIES = [
    { id: 1, name: 'Thai Herb', tax: '0105560000000', address: 'Bangkok, TH', active: 1 },
    { id: 2, name: 'Elite', tax: '0105550000000', address: 'Nonthaburi, TH', active: 1 },
    { id: 3, name: 'REMIER', tax: '0105540000000', address: 'Pathum Thani, TH', active: 1 },
];

async function setupCompany() {
    let pool;
    try {
        console.log('Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Connected!');

        console.log('===================================================');
        console.log(' STEP 1: Creating Company Table');
        console.log('===================================================');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Company' AND xtype='U')
            BEGIN
                CREATE TABLE Company (
                    CompanyID INT IDENTITY(1,1) PRIMARY KEY,
                    CompanyName NVARCHAR(255) NOT NULL,
                    TaxID NVARCHAR(50),
                    Address NVARCHAR(MAX),
                    IsActive BIT DEFAULT 1
                );
                PRINT 'Table Company created.';

                -- Enable IDENTITY_INSERT so we can force IDs 1, 2, 3
                SET IDENTITY_INSERT Company ON;
            END
            ELSE PRINT 'Table Company already exists.';
        `);

        // Seed companies
        for (const c of SEED_COMPANIES) {
            const exists = await pool.request()
                .input('name', sql.NVarChar, c.name)
                .query('SELECT CompanyID FROM Company WHERE CompanyName = @name');

            if (exists.recordset.length === 0) {
                // If the table was just created, we use IDENTITY_INSERT. If it existed but was empty, this might fail unless SET IDENTITY_INSERT is on within this batch.
                // To be safe, we wrap each insert with SET IDENTITY_INSERT ON
                await pool.request()
                    .input('id', sql.Int, c.id)
                    .input('name', sql.NVarChar, c.name)
                    .input('tax', sql.NVarChar, c.tax)
                    .input('address', sql.NVarChar, c.address)
                    .input('active', sql.Bit, c.active)
                    .query(`
                        SET IDENTITY_INSERT Company ON;
                        INSERT INTO Company (CompanyID, CompanyName, TaxID, Address, IsActive)
                        VALUES (@id, @name, @tax, @address, @active);
                        SET IDENTITY_INSERT Company OFF;
                    `);
                console.log(`✅ Seeded Company: ${c.name}`);
            }
        }

        console.log('\n===================================================');
        console.log(' STEP 2: Adding CompanyID and FK to Customer Table');
        console.log('===================================================');
        
        // Ensure CompanyID column exists
        const colExists = await pool.request().query(`
            SELECT * FROM sys.columns 
            WHERE Name = N'CompanyID' 
            AND Object_ID = Object_ID(N'Customer')
        `);

        if (colExists.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE Customer ADD CompanyID INT NULL;
                PRINT 'Added CompanyID column to Customer table.';
            `);
            console.log('✅ Added CompanyID column.');
        }

        // Check if FK exists
        const fkExists = await pool.request().query(`
            SELECT * FROM sys.foreign_keys 
            WHERE name = 'FK_Customer_Company' 
            AND parent_object_id = OBJECT_ID('Customer')
        `);

        if (fkExists.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE Customer 
                ADD CONSTRAINT FK_Customer_Company FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID);
                PRINT 'Added Foreign Key FK_Customer_Company to Customer table.';
            `);
            console.log('✅ Added FK to Customer.');
        } else {
            console.log('⏭️ FK already exists.');
        }

        console.log('\n🎉 Company DB setup complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Database setup error:', err);
        process.exit(1);
    }
}

setupCompany();

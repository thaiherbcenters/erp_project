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

async function setup() {
    let pool;
    try {
        console.log('Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Connected!');

        // Check if CompanyID exists in Employees
        const colExists = await pool.request().query(`
            SELECT * FROM sys.columns 
            WHERE Name = N'CompanyID' 
            AND Object_ID = Object_ID(N'Employees')
        `);

        if (colExists.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE Employees ADD CompanyID INT NULL;
                PRINT 'Added CompanyID column to Employees table.';
            `);
            console.log('✅ Added CompanyID column to Employees.');
        } else {
            console.log('⏭️ CompanyID column already exists in Employees.');
        }

        // Check if FK exists
        const fkExists = await pool.request().query(`
            SELECT * FROM sys.foreign_keys 
            WHERE name = 'FK_Employee_Company' 
            AND parent_object_id = OBJECT_ID('Employees')
        `);

        if (fkExists.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE Employees 
                ADD CONSTRAINT FK_Employee_Company FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID);
                PRINT 'Added Foreign Key FK_Employee_Company to Employees table.';
            `);
            console.log('✅ Added FK FK_Employee_Company to Employees.');
        } else {
            console.log('⏭️ FK FK_Employee_Company already exists.');
        }

        console.log('\n🎉 setup complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Database setup error:', err);
        process.exit(1);
    }
}

setup();

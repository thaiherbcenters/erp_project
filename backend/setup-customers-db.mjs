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

const SEED_TYPES = [
    { id: 1, name: 'Retail (ขายปลีก)' },
    { id: 2, name: 'OEM (รับจ้างผลิต)' },
    { id: 3, name: 'Distributor (ตัวแทนจำหน่าย)' },
    { id: 4, name: 'Government (หน่วยงานราชการ)' }
];

const SEED_STATUSES = [
    { id: 1, name: 'ใช้งาน' },
    { id: 2, name: 'ระงับ' },
    { id: 3, name: 'ไม่ใช้งาน' }
];

const SEED_CUSTOMERS = [
    { code: 'CUST-0001', name: 'บริษัท ABC จำกัด', phone: '02-111-1111', email: 'abc@company.com', type_id: 2, status_id: 1, address: '123 ถ.สุขุมวิท กทม', tax: '0105555555555' },
    { code: 'CUST-0002', name: 'ร้าน XYZ สมุนไพร', phone: '02-222-2222', email: 'xyz@shop.com', type_id: 3, status_id: 1, address: '456 ถ.สีลม กทม', tax: '0104444444444' },
    { code: 'CUST-0003', name: 'นาย สมชาย ใจดี', phone: '081-999-9999', email: 'somchai@gmail.com', type_id: 1, status_id: 1, address: '789 ถ.ลาดพร้าว กทม', tax: '3101111111111' },
    { code: 'CUST-0004', name: 'กระทรวงสาธารณสุข', phone: '02-590-1000', email: 'contact@moph.go.th', type_id: 4, status_id: 1, address: 'ถ.ติวานนท์ นนทบุรี', tax: '099400015XXXX' },
];

async function setup() {
    let pool;
    try {
        console.log('Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Connected!');

        console.log('===================================================');
        console.log(' STEP 1: Creating CustomerType Table');
        console.log('===================================================');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CustomerType' AND xtype='U')
            BEGIN
                CREATE TABLE CustomerType (
                    CustomerTypeID INT PRIMARY KEY,
                    CustomerTypeName NVARCHAR(50) NOT NULL
                );
                PRINT 'Table CustomerType created.';
            END
            ELSE PRINT 'Table CustomerType already exists.';
        `);

        for (const t of SEED_TYPES) {
            await pool.request()
                .input('id', sql.Int, t.id)
                .input('name', sql.NVarChar, t.name)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM CustomerType WHERE CustomerTypeID = @id)
                    BEGIN
                        INSERT INTO CustomerType (CustomerTypeID, CustomerTypeName) VALUES (@id, @name);
                    END
                `);
        }
        console.log('✅ Seeded CustomerType.');

        console.log('\n===================================================');
        console.log(' STEP 2: Creating CustomerStatus Table');
        console.log('===================================================');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CustomerStatus' AND xtype='U')
            BEGIN
                CREATE TABLE CustomerStatus (
                    CustomerStatusID INT PRIMARY KEY,
                    StatusName NVARCHAR(50) NOT NULL
                );
                PRINT 'Table CustomerStatus created.';
            END
            ELSE PRINT 'Table CustomerStatus already exists.';
        `);

        for (const s of SEED_STATUSES) {
            await pool.request()
                .input('id', sql.Int, s.id)
                .input('name', sql.NVarChar, s.name)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM CustomerStatus WHERE CustomerStatusID = @id)
                    BEGIN
                        INSERT INTO CustomerStatus (CustomerStatusID, StatusName) VALUES (@id, @name);
                    END
                `);
        }
        console.log('✅ Seeded CustomerStatus.');

        console.log('\n===================================================');
        console.log(' STEP 3: Creating Customer Table');
        console.log('===================================================');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Customer' AND xtype='U')
            BEGIN
                CREATE TABLE Customer (
                    CustomerID INT IDENTITY(1,1) PRIMARY KEY,
                    CompanyID INT NULL,  -- Reserved for future Multi-company feature
                    CustomerTypeID INT NOT NULL,
                    CustomerStatusID INT NOT NULL,
                    CustomerCode NVARCHAR(50) NOT NULL,
                    CustomerName NVARCHAR(255) NOT NULL,
                    Phone NVARCHAR(50),
                    Email NVARCHAR(100),
                    Address NVARCHAR(MAX),
                    TaxID NVARCHAR(50),
                    CreatedDate DATETIME DEFAULT GETDATE(),

                    CONSTRAINT FK_Customer_Type FOREIGN KEY (CustomerTypeID) REFERENCES CustomerType(CustomerTypeID),
                    CONSTRAINT FK_Customer_Status FOREIGN KEY (CustomerStatusID) REFERENCES CustomerStatus(CustomerStatusID)
                );
                PRINT 'Table Customer created.';
            END
            ELSE PRINT 'Table Customer already exists.';
        `);

        for (const c of SEED_CUSTOMERS) {
            const exists = await pool.request()
                .input('code', sql.NVarChar, c.code)
                .query('SELECT CustomerID FROM Customer WHERE CustomerCode = @code');
            
            if (exists.recordset.length === 0) {
                await pool.request()
                    .input('tid', sql.Int, c.type_id)
                    .input('sid', sql.Int, c.status_id)
                    .input('code', sql.NVarChar, c.code)
                    .input('name', sql.NVarChar, c.name)
                    .input('phone', sql.NVarChar, c.phone)
                    .input('email', sql.NVarChar, c.email)
                    .input('address', sql.NVarChar, c.address)
                    .input('tax', sql.NVarChar, c.tax)
                    .query(`
                        INSERT INTO Customer (CustomerTypeID, CustomerStatusID, CustomerCode, CustomerName, Phone, Email, Address, TaxID)
                        VALUES (@tid, @sid, @code, @name, @phone, @email, @address, @tax)
                    `);
                console.log(`✅ Seeded Customer: ${c.code} - ${c.name}`);
            }
        }

        console.log('\n🎉 Database setup complete!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Database setup error:', err);
        process.exit(1);
    }
}

setup();

import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

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
    { id: 1, name: 'ทั่วไป' },
    { id: 2, name: 'OEM นิติบุคคล' },
    { id: 3, name: 'OEM บุคคลธรรมดา' },
    { id: 4, name: 'ลูกค้าขึ้นทะเบียน' }
];

async function updateCustomerTypes() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        console.log('✅ Connected!');

        for (const t of SEED_TYPES) {
            await pool.request()
                .input('id', sql.Int, t.id)
                .input('name', sql.NVarChar, t.name)
                .query(`
                    UPDATE CustomerType SET CustomerTypeName = @name WHERE CustomerTypeID = @id;
                    IF @@ROWCOUNT = 0
                    BEGIN
                        SET IDENTITY_INSERT CustomerType ON;
                        INSERT INTO CustomerType (CustomerTypeID, CustomerTypeName) VALUES (@id, @name);
                        SET IDENTITY_INSERT CustomerType OFF;
                    END
                `);
            console.log(`Updated ID ${t.id} to '${t.name}'`);
        }
        
        console.log('✅ Customer types updated successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Database connection failed!', err);
        process.exit(1);
    }
}

updateCustomerTypes();

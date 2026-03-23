import sql from 'mssql';

const config = {
    server: 'localhost',
    database: 'ERP_THAIHERB',
    user: 'erp_admin',
    password: 'Erp@2026!',
    options: { trustServerCertificate: true, encrypt: false },
};

async function runMigration() {
    console.log('===========================================');
    console.log(' Migrating Database for Data Scope...');
    console.log('===========================================\n');

    const pool = await sql.connect(config);

    try {
        // 1. เพิ่ม column 'department' ในตาราง Users
        console.log('[1/3] Updating Users table...');
        await pool.request().query(`
            IF COL_LENGTH('Users', 'department') IS NULL
            BEGIN
                ALTER TABLE Users ADD department NVARCHAR(50) NULL;
                PRINT 'Added department column to Users.';
            END
            ELSE PRINT 'Users table already has department column.';
        `);
        
        // อัปเดตข้อมูลเก่าให้มี department ตาม role (แยก batch)
        await pool.request().query(`
            UPDATE Users SET department = 'Management' WHERE role IN ('admin', 'executive');
            UPDATE Users SET department = 'QC' WHERE role = 'qc';
            UPDATE Users SET department = 'Sales' WHERE role = 'sales';
            UPDATE Users SET department = 'Accounting' WHERE role = 'accountant';
            UPDATE Users SET department = 'Procurement' WHERE role = 'procurement';
            UPDATE Users SET department = 'HR' WHERE role = 'hr';
            UPDATE Users SET department = 'Warehouse' WHERE role = 'stock';
            UPDATE Users SET department = 'Production' WHERE role IN ('planner', 'operator', 'rnd', 'packaging');
            UPDATE Users SET department = 'Document Control' WHERE role = 'document_control';
            PRINT 'Updated Users department data.';
        `);

        // 2. เพิ่ม column 'data_scope' ในตาราง UserPermissions
        console.log('[2/3] Updating UserPermissions table...');
        await pool.request().query(`
            IF COL_LENGTH('UserPermissions', 'data_scope') IS NULL
            BEGIN
                ALTER TABLE UserPermissions ADD data_scope NVARCHAR(20) NOT NULL DEFAULT 'all';
                PRINT 'Added data_scope column to UserPermissions.';
            END
            ELSE PRINT 'UserPermissions table already has data_scope column.';
        `);

        // 3. เพิ่ม column 'department' และ 'created_by' ในตาราง Documents
        console.log('[3/3] Updating Documents table...');
        await pool.request().query(`
            IF COL_LENGTH('Documents', 'department') IS NULL
            BEGIN
                ALTER TABLE Documents ADD department NVARCHAR(50) NULL;
                ALTER TABLE Documents ADD created_by INT NULL;
                
                -- สร้าง Foreign Key กลับไปยัง Users
                ALTER TABLE Documents ADD CONSTRAINT FK_Documents_Users FOREIGN KEY (created_by) REFERENCES Users(user_id);
                
                PRINT 'Added department and created_by columns to Documents.';
            END
            ELSE PRINT 'Documents table already has department or created_by column.';
        `);
        
        // อัปเดตข้อมูลเก่า (แยก batch)
        await pool.request().query(`
            DECLARE @adminId INT;
            SELECT TOP 1 @adminId = user_id FROM Users WHERE role = 'admin';
            IF @adminId IS NOT NULL 
            BEGIN
                UPDATE Documents SET created_by = @adminId, department = 'Management' WHERE created_by IS NULL;
                PRINT 'Updated Documents legacy data with admin as creator.';
            END
        `);

        console.log('\n✅ Database migration completed successfully.');

    } catch (err) {
        console.error('❌ Migration Error:', err.message);
    } finally {
        await pool.close();
    }
}

runMigration();

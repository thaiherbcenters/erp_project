/**
 * create-roles.mjs
 * 
 * สร้างตาราง Roles + เติมค่าตำแหน่งเริ่มต้นพร้อมผูกกับแผนก
 * 
 * รัน: node backend/create-roles.mjs
 */

import sql from 'mssql';

const config = {
    server: 'localhost',
    database: 'ERP_THAIHERB',
    user: 'erp_admin',
    password: 'Erp@2026!',
    options: { trustServerCertificate: true, encrypt: false },
};

// ตำแหน่งเริ่มต้น: role_code, role_name, dept_code (อาจมีหลายแผนก)
const SEED_ROLES = [
    { code: 'admin',            name: 'ผู้ดูแลระบบ',                    depts: ['IT', 'MGT'] },
    { code: 'executive',        name: 'ผู้บริหาร',                       depts: ['MGT'] },
    { code: 'document_control', name: 'เจ้าหน้าที่ควบคุมเอกสาร',       depts: ['DC'] },
    { code: 'qc',               name: 'เจ้าหน้าที่ QC',                 depts: ['QA', 'QC'] },
    { code: 'hr',               name: 'ฝ่ายบุคคล',                      depts: ['HR'] },
    { code: 'sales',            name: 'ฝ่ายขาย',                        depts: ['SL'] },
    { code: 'accountant',       name: 'ฝ่ายบัญชี',                      depts: ['AC'] },
    { code: 'procurement',      name: 'ฝ่ายจัดซื้อ',                    depts: ['PU'] },
    { code: 'stock',            name: 'พนักงานคลังสินค้า',              depts: ['WH'] },
    { code: 'planner',          name: 'ผู้วางแผนการผลิต',               depts: ['PR'] },
    { code: 'operator',         name: 'พนักงานฝ่ายผลิต',               depts: ['PR', 'EN'] },
    { code: 'packaging',        name: 'พนักงานบรรจุภัณฑ์',              depts: ['PR'] },
    { code: 'rnd',              name: 'นักวิจัยและพัฒนา',               depts: ['RND'] },
];

async function run() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ เชื่อมต่อ DB สำเร็จ\n');

        // ====================================================
        // STEP 1: สร้างตาราง Roles
        // ====================================================
        console.log('═══════════════════════════════════════');
        console.log(' STEP 1: สร้างตาราง Roles');
        console.log('═══════════════════════════════════════');

        await pool.request().query(`
            IF OBJECT_ID('dbo.Roles', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.Roles (
                    role_id    INT IDENTITY(1,1) PRIMARY KEY,
                    role_code  NVARCHAR(50)  NOT NULL UNIQUE,
                    role_name  NVARCHAR(100) NOT NULL,
                    is_active  BIT DEFAULT 1,
                    created_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Created Roles table.';
            END
            ELSE PRINT 'Roles table already exists.';
        `);

        // ====================================================
        // STEP 2: สร้างตาราง RoleDepartments (junction)
        // ====================================================
        console.log('\n═══════════════════════════════════════');
        console.log(' STEP 2: สร้างตาราง RoleDepartments');
        console.log('═══════════════════════════════════════');

        await pool.request().query(`
            IF OBJECT_ID('dbo.RoleDepartments', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.RoleDepartments (
                    id        INT IDENTITY(1,1) PRIMARY KEY,
                    role_code NVARCHAR(50) NOT NULL,
                    dept_code NVARCHAR(20) NOT NULL,
                    UNIQUE(role_code, dept_code)
                );
                PRINT 'Created RoleDepartments table.';
            END
            ELSE PRINT 'RoleDepartments table already exists.';
        `);

        // ====================================================
        // STEP 3: เพิ่มข้อมูลตำแหน่ง
        // ====================================================
        console.log('\n═══════════════════════════════════════');
        console.log(' STEP 3: เพิ่มข้อมูลตำแหน่ง');
        console.log('═══════════════════════════════════════');

        for (const role of SEED_ROLES) {
            // Insert role if not exists
            const exists = await pool.request()
                .input('code', sql.NVarChar, role.code)
                .query('SELECT role_id FROM Roles WHERE role_code = @code');

            if (exists.recordset.length === 0) {
                await pool.request()
                    .input('code', sql.NVarChar, role.code)
                    .input('name', sql.NVarChar, role.name)
                    .query('INSERT INTO Roles (role_code, role_name) VALUES (@code, @name)');
                console.log(`   ✅ เพิ่มตำแหน่ง: ${role.code} — ${role.name}`);
            } else {
                console.log(`   ⏭️  มีอยู่แล้ว: ${role.code}`);
            }

            // Insert dept mappings
            for (const deptCode of role.depts) {
                const linkExists = await pool.request()
                    .input('role_code', sql.NVarChar, role.code)
                    .input('dept_code', sql.NVarChar, deptCode)
                    .query('SELECT id FROM RoleDepartments WHERE role_code = @role_code AND dept_code = @dept_code');

                if (linkExists.recordset.length === 0) {
                    await pool.request()
                        .input('role_code', sql.NVarChar, role.code)
                        .input('dept_code', sql.NVarChar, deptCode)
                        .query('INSERT INTO RoleDepartments (role_code, dept_code) VALUES (@role_code, @dept_code)');
                    console.log(`      🔗 ผูก ${role.code} → ${deptCode}`);
                }
            }
        }

        // ====================================================
        // STEP 4: สรุปผล
        // ====================================================
        console.log('\n═══════════════════════════════════════');
        console.log(' สรุปผล');
        console.log('═══════════════════════════════════════');

        const roleList = await pool.request().query(`
            SELECT r.role_code, r.role_name,
                   STRING_AGG(rd.dept_code, ', ') as departments
            FROM Roles r
            LEFT JOIN RoleDepartments rd ON r.role_code = rd.role_code
            WHERE r.is_active = 1
            GROUP BY r.role_code, r.role_name
            ORDER BY r.role_id
        `);

        console.log(`\n   📋 ตำแหน่งทั้งหมด (${roleList.recordset.length} ตำแหน่ง):`);
        for (const r of roleList.recordset) {
            console.log(`      ${r.role_code} — ${r.role_name} [${r.departments || '-'}]`);
        }

        console.log('\n✅ เสร็จสิ้นทั้งหมด!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

run();

/**
 * create-departments.mjs
 * 
 * สร้างตาราง Departments + เติมค่า department ให้เอกสารเก่า
 * 
 * รัน: node backend/create-departments.mjs
 */

import sql from 'mssql';

const config = {
    server: 'localhost',
    database: 'ERP_THAIHERB',
    user: 'erp_admin',
    password: 'Erp@2026!',
    options: { trustServerCertificate: true, encrypt: false },
};

// แผนกทั้งหมดที่จะสร้าง
const DEPARTMENTS = [
    { code: 'MGT',  name: 'Management (ผู้บริหาร)' },
    { code: 'DC',   name: 'Document Control (ควบคุมเอกสาร)' },
    { code: 'QA',   name: 'Quality Assurance (ประกันคุณภาพ)' },
    { code: 'QC',   name: 'Quality Control (ควบคุมคุณภาพ)' },
    { code: 'HR',   name: 'Human Resource (ฝ่ายบุคคล)' },
    { code: 'EN',   name: 'Engineering & Environment (วิศวกรรม)' },
    { code: 'PU',   name: 'Purchasing (จัดซื้อ)' },
    { code: 'WH',   name: 'Warehouse (คลังสินค้า)' },
    { code: 'IT',   name: 'IT (สารสนเทศ)' },
    { code: 'PR',   name: 'Production (ฝ่ายผลิต)' },
    { code: 'SL',   name: 'Sales (ฝ่ายขาย)' },
    { code: 'AC',   name: 'Accounting (บัญชี)' },
    { code: 'RND',  name: 'R&D (วิจัยและพัฒนา)' },
];

// Mapping: document category → dept_code
const CATEGORY_TO_DEPT = {
    'SMF_QM': 'MGT',
    'DC':     'DC',
    'QA':     'QA',
    'HR':     'HR',
    'QC':     'QC',
    'EN_EM':  'EN',
    'PU':     'PU',
    'WH':     'WH',
    'IT':     'IT',
    'PR_PKG': 'PR',
    'HYG':    'PR',
    'HM':     'PR',
    'TEA':    'PR',
    'ICS':    'MGT',
    'PU_FA':  'PU',
};

// Mapping: Users.department เดิม → dept_code ใหม่
const OLD_DEPT_TO_CODE = {
    'Management':       'MGT',
    'Document Control':  'DC',
    'QC':               'QC',
    'HR':               'HR',
    'Sales':            'SL',
    'Accounting':       'AC',
    'Warehouse':        'WH',
    'Production':       'PR',
};

async function run() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ เชื่อมต่อ DB สำเร็จ\n');

        // ====================================================
        // STEP 1: สร้างตาราง Departments
        // ====================================================
        console.log('═══════════════════════════════════════');
        console.log(' STEP 1: สร้างตาราง Departments');
        console.log('═══════════════════════════════════════');

        await pool.request().query(`
            IF OBJECT_ID('dbo.Departments', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.Departments (
                    dept_id   INT IDENTITY(1,1) PRIMARY KEY,
                    dept_code NVARCHAR(20)  NOT NULL UNIQUE,
                    dept_name NVARCHAR(100) NOT NULL,
                    is_active BIT DEFAULT 1,
                    created_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Created Departments table.';
            END
            ELSE PRINT 'Departments table already exists.';
        `);

        // ====================================================
        // STEP 2: เพิ่มข้อมูลแผนก
        // ====================================================
        console.log('\n═══════════════════════════════════════');
        console.log(' STEP 2: เพิ่มข้อมูลแผนก');
        console.log('═══════════════════════════════════════');

        for (const dept of DEPARTMENTS) {
            const exists = await pool.request()
                .input('code', sql.NVarChar, dept.code)
                .query(`SELECT dept_id FROM Departments WHERE dept_code = @code`);

            if (exists.recordset.length === 0) {
                await pool.request()
                    .input('code', sql.NVarChar, dept.code)
                    .input('name', sql.NVarChar, dept.name)
                    .query(`INSERT INTO Departments (dept_code, dept_name) VALUES (@code, @name)`);
                console.log(`   ✅ เพิ่มแผนก: ${dept.code} — ${dept.name}`);
            } else {
                console.log(`   ⏭️  มีอยู่แล้ว: ${dept.code}`);
            }
        }

        // ====================================================
        // STEP 3: Backfill Documents.department จาก category
        // ====================================================
        console.log('\n═══════════════════════════════════════');
        console.log(' STEP 3: Backfill เอกสาร → แผนก');
        console.log('═══════════════════════════════════════');

        // ดูสถานะก่อน
        const before = await pool.request().query(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN department IS NULL OR department = '' OR department = 'Management' THEN 1 ELSE 0 END) as needs_fix
            FROM Documents
        `);
        console.log(`   📊 เอกสารทั้งหมด: ${before.recordset[0].total} | ต้อง backfill: ${before.recordset[0].needs_fix}\n`);

        let updatedCount = 0;
        for (const [category, deptCode] of Object.entries(CATEGORY_TO_DEPT)) {
            // หาชื่อแผนกจาก code
            const deptRow = await pool.request()
                .input('code', sql.NVarChar, deptCode)
                .query(`SELECT dept_name FROM Departments WHERE dept_code = @code`);
            
            const deptName = deptRow.recordset.length > 0 ? deptRow.recordset[0].dept_name : deptCode;

            const result = await pool.request()
                .input('category', sql.NVarChar, category)
                .input('department', sql.NVarChar, deptCode)
                .query(`
                    UPDATE Documents 
                    SET department = @department 
                    WHERE category = @category
                `);
            if (result.rowsAffected[0] > 0) {
                console.log(`   ✏️  category "${category}" → แผนก "${deptCode}" (${deptName}): ${result.rowsAffected[0]} เอกสาร`);
                updatedCount += result.rowsAffected[0];
            }
        }
        console.log(`\n   ✅ อัปเดตเอกสาร ${updatedCount} รายการ`);

        // ====================================================
        // STEP 4: อัปเดต Users.department → dept_code
        // ====================================================
        console.log('\n═══════════════════════════════════════');
        console.log(' STEP 4: อัปเดต Users.department');
        console.log('═══════════════════════════════════════');

        for (const [oldDept, newCode] of Object.entries(OLD_DEPT_TO_CODE)) {
            const result = await pool.request()
                .input('oldDept', sql.NVarChar, oldDept)
                .input('newCode', sql.NVarChar, newCode)
                .query(`UPDATE Users SET department = @newCode WHERE department = @oldDept`);
            if (result.rowsAffected[0] > 0) {
                console.log(`   ✏️  "${oldDept}" → "${newCode}": ${result.rowsAffected[0]} คน`);
            }
        }

        // ====================================================
        // STEP 5: สรุปผล
        // ====================================================
        console.log('\n═══════════════════════════════════════');
        console.log(' สรุปผล');
        console.log('═══════════════════════════════════════');

        const deptList = await pool.request().query(`
            SELECT dept_code, dept_name FROM Departments WHERE is_active = 1 ORDER BY dept_id
        `);
        console.log(`\n   📋 แผนกทั้งหมด (${deptList.recordset.length} แผนก):`);
        for (const d of deptList.recordset) {
            console.log(`      ${d.dept_code} — ${d.dept_name}`);
        }

        const docSummary = await pool.request().query(`
            SELECT d.department, dp.dept_name, COUNT(*) as cnt
            FROM Documents d
            LEFT JOIN Departments dp ON d.department = dp.dept_code
            GROUP BY d.department, dp.dept_name
            ORDER BY cnt DESC
        `);
        console.log(`\n   📄 เอกสารแต่ละแผนก:`);
        for (const row of docSummary.recordset) {
            console.log(`      ${row.department || 'NULL'} (${row.dept_name || '-'}): ${row.cnt} เอกสาร`);
        }

        const userSummary = await pool.request().query(`
            SELECT u.department, dp.dept_name, COUNT(*) as cnt
            FROM Users u
            LEFT JOIN Departments dp ON u.department = dp.dept_code
            GROUP BY u.department, dp.dept_name
            ORDER BY cnt DESC
        `);
        console.log(`\n   👤 ผู้ใช้แต่ละแผนก:`);
        for (const row of userSummary.recordset) {
            console.log(`      ${row.department || 'NULL'} (${row.dept_name || '-'}): ${row.cnt} คน`);
        }

        console.log('\n✅ เสร็จสิ้นทั้งหมด!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

run();

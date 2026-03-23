/**
 * backfill-department.mjs
 * 
 * สคริปต์เติมค่า department ให้กับเอกสารเก่าที่ยังเป็น NULL
 * โดย mapping จาก category → department
 * 
 * วิธีรัน: node backend/backfill-department.mjs
 */

import sql from 'mssql';

const config = {
    server: 'localhost',
    database: 'ERP_THAIHERB',
    user: 'erp_admin',
    password: 'Erp@2026!',
    options: { trustServerCertificate: true, encrypt: false },
};

// Mapping: category → department
const CATEGORY_TO_DEPARTMENT = {
    'SMF_QM': 'Management',
    'DC':     'Document Control',
    'QA':     'QC',
    'HR':     'HR',
    'QC':     'QC',
    'EN_EM':  'Production',
    'PU':     'Warehouse',
    'WH':     'Warehouse',
    'IT':     'Management',
    'PR_PKG': 'Production',
    'HYG':    'Production',
    'HM':     'Production',
    'TEA':    'Production',
    'ICS':    'Management',
    'PU_FA':  'Warehouse',
};

async function run() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ เชื่อมต่อ DB สำเร็จ');

        // 1. ดูสถานะก่อน backfill
        const before = await pool.request().query(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN department IS NULL THEN 1 ELSE 0 END) as null_dept,
                   SUM(CASE WHEN department IS NOT NULL THEN 1 ELSE 0 END) as has_dept
            FROM Documents
        `);
        const stats = before.recordset[0];
        console.log(`📊 ก่อน Backfill: ทั้งหมด ${stats.total} รายการ | NULL: ${stats.null_dept} | มีค่า: ${stats.has_dept}`);

        // 2. Backfill department จาก category
        let updatedCount = 0;
        for (const [category, department] of Object.entries(CATEGORY_TO_DEPARTMENT)) {
            const result = await pool.request()
                .input('category', sql.NVarChar, category)
                .input('department', sql.NVarChar, department)
                .query(`
                    UPDATE Documents 
                    SET department = @department 
                    WHERE category = @category 
                      AND (department IS NULL OR department = '')
                `);
            if (result.rowsAffected[0] > 0) {
                console.log(`   ✏️  ${category} → ${department}: ${result.rowsAffected[0]} รายการ`);
                updatedCount += result.rowsAffected[0];
            }
        }

        // 3. ดูสถานะหลัง backfill
        const after = await pool.request().query(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN department IS NULL THEN 1 ELSE 0 END) as null_dept,
                   SUM(CASE WHEN department IS NOT NULL THEN 1 ELSE 0 END) as has_dept
            FROM Documents
        `);
        const statsAfter = after.recordset[0];
        console.log('');
        console.log(`✅ Backfill เสร็จ! อัปเดต ${updatedCount} รายการ`);
        console.log(`📊 หลัง Backfill: ทั้งหมด ${statsAfter.total} รายการ | NULL: ${statsAfter.null_dept} | มีค่า: ${statsAfter.has_dept}`);

        // 4. แสดงสรุปจำนวนเอกสารแต่ละแผนก
        const summary = await pool.request().query(`
            SELECT department, COUNT(*) as doc_count 
            FROM Documents 
            WHERE department IS NOT NULL 
            GROUP BY department 
            ORDER BY doc_count DESC
        `);
        console.log('');
        console.log('📋 สรุปจำนวนเอกสารแต่ละแผนก:');
        for (const row of summary.recordset) {
            console.log(`   ${row.department}: ${row.doc_count} เอกสาร`);
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

run();

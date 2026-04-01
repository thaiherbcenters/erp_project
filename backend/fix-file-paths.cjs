/**
 * แก้ไข file_path ใน Documents table ให้เป็น .pdf ทั้งหมด
 */
const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: { trustServerCertificate: true, encrypt: true },
};

async function fix() {
    const pool = await sql.connect(config);
    console.log('✅ Connected!\n');

    // ดูสถานะก่อนแก้
    const before = await pool.request().query(`
        SELECT doc_code, file_path FROM Documents WHERE file_path NOT LIKE '%.pdf' OR file_path LIKE '%_dummy%'
    `);
    console.log(`พบ ${before.recordset.length} ไฟล์ที่ต้องแก้:\n`);
    before.recordset.forEach(r => console.log(`  ${r.doc_code}: ${r.file_path}`));

    // แก้ทั้งหมดให้เป็น .pdf (ลบ _dummy ออกด้วย)
    const result = await pool.request().query(`
        UPDATE Documents 
        SET file_path = 'E:\\Documents\\' + doc_code + '.pdf'
        WHERE file_path IS NOT NULL
    `);
    console.log(`\n🔧 แก้ไขแล้ว ${result.rowsAffected[0]} รายการ`);

    // ตรวจสอบหลังแก้
    const after = await pool.request().query(`
        SELECT TOP 5 doc_code, file_path FROM Documents ORDER BY doc_id
    `);
    console.log('\n📋 ตัวอย่างหลังแก้:');
    after.recordset.forEach(r => console.log(`  ${r.doc_code} → ${r.file_path}`));

    console.log('\n✅ เสร็จเรียบร้อย! ทุกเอกสารเป็น .pdf แล้ว');
    process.exit(0);
}

fix().catch(err => { console.error('❌', err.message); process.exit(1); });

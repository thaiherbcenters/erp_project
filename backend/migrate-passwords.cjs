/**
 * migrate-passwords.cjs — แปลง plain-text passwords เป็น bcrypt hash
 * 
 * ใช้ครั้งเดียว: node migrate-passwords.cjs
 * 
 * ตรวจสอบ password_hash ทุก row ใน Users table:
 *   - ถ้าขึ้นต้นด้วย $2a$ หรือ $2b$ → เป็น bcrypt อยู่แล้ว → ข้าม
 *   - ถ้าไม่ใช่ → เป็น plain text → hash แล้ว UPDATE
 */
const sql = require('mssql');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: { trustServerCertificate: true, encrypt: true },
};

async function migratePasswords() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database');

        // ดึง users ทั้งหมด
        const result = await pool.request().query('SELECT user_id, username, password_hash FROM Users');
        const users = result.recordset;

        console.log(`\n📋 พบ ${users.length} users ทั้งหมด\n`);

        let updated = 0;
        let skipped = 0;

        for (const user of users) {
            const hash = user.password_hash || '';

            // ตรวจว่าเป็น bcrypt hash แล้วหรือยัง
            if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
                console.log(`  ⏭️  ${user.username} — เป็น bcrypt อยู่แล้ว (ข้าม)`);
                skipped++;
                continue;
            }

            // Hash plain-text password
            const hashedPassword = await bcrypt.hash(hash, 10);
            
            await pool.request()
                .input('userId', sql.Int, user.user_id)
                .input('newHash', sql.NVarChar, hashedPassword)
                .query('UPDATE Users SET password_hash = @newHash WHERE user_id = @userId');

            console.log(`  ✅ ${user.username} — แปลง plain-text → bcrypt สำเร็จ`);
            updated++;
        }

        console.log(`\n========================================`);
        console.log(`📊 ผลลัพธ์:`);
        console.log(`   แปลงสำเร็จ: ${updated} users`);
        console.log(`   ข้ามไป:     ${skipped} users (bcrypt อยู่แล้ว)`);
        console.log(`========================================\n`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
        process.exit(0);
    }
}

migratePasswords();

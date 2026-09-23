/**
 * run_production_migration_latest_20260923.js
 * สคริปต์สั่งรัน Migration ล่าสุดเข้าสู่ฐานข้อมูลหลัก (ERP_THAIHERB) โดยอัตโนมัติ
 * รองรับทั้งการรันผ่าน Node.js และเปิดไฟล์ .sql รันผ่าน SSMS
 */
const path = require('path');
const fs = require('fs');
const sql = require('mssql');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const config = {
    server: process.env.DB_SERVER || '10.0.0.10',
    database: process.env.DB_DATABASE || 'ERP_THAIHERB',
    user: process.env.DB_USER || 'THAIHERB',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        trustServerCertificate: true,
        encrypt: false,
        useUTC: false,
    },
    connectionTimeout: 20000,
    requestTimeout: 60000
};

async function runProdMigration() {
    console.log('---------------------------------------------------------');
    console.log('🚀 Starting Migration to PRODUCTION DB:', config.database);
    console.log('Server:', config.server);
    console.log('---------------------------------------------------------');

    let pool;
    try {
        pool = await sql.connect(config);
        console.log(`✅ Connected to [${config.database}] successfully`);

        const sqlFile = path.resolve(__dirname, 'production_migration_exact_diff_20260923.sql');
        const sqlText = fs.readFileSync(sqlFile, 'utf8');

        // แยก batches ด้วย GO
        const batches = sqlText
            .split(/^\s*GO\s*$/im)
            .map(b => b.trim())
            .filter(b => b.length > 0 && !b.toUpperCase().startsWith('USE '));

        console.log(`Executing ${batches.length} migration batches...`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            const request = pool.request();
            request.on('info', msg => console.log('   [SQL]', msg.message));
            await request.query(batch);
        }

        console.log('---------------------------------------------------------');
        console.log('🎉 Latest Production Migration Completed Successfully!');
        console.log('---------------------------------------------------------');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Error:', err);
        process.exit(1);
    } finally {
        if (pool) await pool.close();
    }
}

runProdMigration();

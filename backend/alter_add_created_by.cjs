/**
 * Migration: เพิ่มคอลัมน์ CreatedBy ใน 6 ตารางเอกสารฝ่ายขาย
 * รัน: node backend/alter_add_created_by.cjs
 */
require('dotenv').config({ path: __dirname + '/.env' });
const { sql, poolPromise } = require('./config/db');

async function migrate() {
    try {
        const pool = await poolPromise;

        const tables = [
            'Quotation',
            'BillingInvoice',
            'DeliveryOrder',
            'TaxInvoice',
            'Receipt',
            'SalesOrder'
        ];

        for (const table of tables) {
            // Check if column already exists
            const check = await pool.request().query(
                `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = 'CreatedBy'`
            );

            if (check.recordset.length > 0) {
                console.log(`✅ ${table}.CreatedBy already exists — skipping`);
                continue;
            }

            await pool.request().query(
                `ALTER TABLE ${table} ADD CreatedBy INT NULL`
            );
            console.log(`✅ Added CreatedBy to ${table}`);

            // Add foreign key (optional, won't fail if Users table doesn't exist)
            try {
                await pool.request().query(
                    `ALTER TABLE ${table} ADD CONSTRAINT FK_${table}_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(user_id)`
                );
                console.log(`   🔗 FK constraint added for ${table}`);
            } catch (fkErr) {
                console.log(`   ⚠️  FK constraint skipped for ${table}: ${fkErr.message}`);
            }
        }

        console.log('\n🎉 Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    }
    process.exit(0);
}

migrate();

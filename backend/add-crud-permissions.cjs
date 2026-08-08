/**
 * add-crud-permissions.cjs
 * Migration script: เพิ่มคอลัมน์ CRUD (can_create, can_read, can_update, can_delete)
 * ลงในตาราง UserPermissions
 * 
 * วิธีรัน: node backend/add-crud-permissions.cjs
 */
const { poolPromise } = require('./config/db');

async function migrate() {
    console.log('🔄 Starting CRUD permissions migration...');
    const pool = await poolPromise;

    const columns = [
        { name: 'can_create', type: 'BIT', default: 1 },
        { name: 'can_read',   type: 'BIT', default: 1 },
        { name: 'can_update', type: 'BIT', default: 1 },
        { name: 'can_delete', type: 'BIT', default: 1 },
    ];

    for (const col of columns) {
        try {
            // Check if column already exists
            const check = await pool.request().query(`
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'UserPermissions' AND COLUMN_NAME = '${col.name}'
            `);

            if (check.recordset.length > 0) {
                console.log(`  ✅ Column '${col.name}' already exists — skipping.`);
                continue;
            }

            // Add the column
            await pool.request().query(`
                ALTER TABLE UserPermissions 
                ADD ${col.name} ${col.type} NOT NULL DEFAULT ${col.default}
            `);
            console.log(`  ✅ Added column '${col.name}' (default: ${col.default})`);
        } catch (err) {
            console.error(`  ❌ Error adding column '${col.name}':`, err.message);
        }
    }

    console.log('✅ CRUD permissions migration completed!');
    process.exit(0);
}

migrate();

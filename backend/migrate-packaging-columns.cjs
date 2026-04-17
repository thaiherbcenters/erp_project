/**
 * =============================================================================
 * migrate-packaging-columns.cjs
 * =============================================================================
 * Migration script: เพิ่มคอลัมน์เชื่อมต่อ Production → Packaging
 *   - ProductionTaskID  (อ้างอิงกลับไป Production_Tasks.TaskID)
 *   - JobOrderID        (อ้างอิงใบสั่งผลิต)
 *   - PackedQty DEFAULT 0 (แก้ปัญหา NULL crash)
 * =============================================================================
 */
require('dotenv').config();
const { poolPromise } = require('./config/db');

async function migrate() {
    try {
        const pool = await poolPromise;
        console.log('🔧 Starting Packaging_Tasks migration...\n');

        // 1. Add ProductionTaskID column if not exists
        console.log('[1/4] Adding ProductionTaskID column...');
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'Packaging_Tasks' AND COLUMN_NAME = 'ProductionTaskID'
            )
            BEGIN
                ALTER TABLE Packaging_Tasks ADD ProductionTaskID VARCHAR(50) NULL;
                PRINT 'Column ProductionTaskID added.';
            END
            ELSE
            BEGIN
                PRINT 'Column ProductionTaskID already exists.';
            END
        `);
        console.log('   ✅ ProductionTaskID done');

        // 2. Add JobOrderID column if not exists
        console.log('[2/4] Adding JobOrderID column...');
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'Packaging_Tasks' AND COLUMN_NAME = 'JobOrderID'
            )
            BEGIN
                ALTER TABLE Packaging_Tasks ADD JobOrderID VARCHAR(50) NULL;
                PRINT 'Column JobOrderID added.';
            END
            ELSE
            BEGIN
                PRINT 'Column JobOrderID already exists.';
            END
        `);
        console.log('   ✅ JobOrderID done');

        // 3. Set DEFAULT 0 for PackedQty
        console.log('[3/4] Setting PackedQty DEFAULT 0...');
        await pool.request().query(`
            -- Add default constraint if not exists
            IF NOT EXISTS (
                SELECT 1 FROM sys.default_constraints dc
                JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
                WHERE c.name = 'PackedQty' AND OBJECT_NAME(c.object_id) = 'Packaging_Tasks'
            )
            BEGIN
                ALTER TABLE Packaging_Tasks ADD CONSTRAINT DF_PackedQty DEFAULT 0 FOR PackedQty;
                PRINT 'Default constraint added for PackedQty.';
            END
            ELSE
            BEGIN
                PRINT 'Default constraint for PackedQty already exists.';
            END

            -- Update existing NULL values to 0
            UPDATE Packaging_Tasks SET PackedQty = 0 WHERE PackedQty IS NULL;
        `);
        console.log('   ✅ PackedQty default done');

        // 4. Backfill: สร้าง Packaging_Tasks สำหรับ Production_Tasks ที่อยู่ขั้นตอน 'packaging' แล้ว
        console.log('[4/4] Backfilling packaging tasks from existing production tasks...');
        const result = await pool.request().query(`
            SELECT pt.TaskID, pt.JobOrderID, pt.BatchNo, pt.FormulaName, pt.Line, pt.ExpectedQty, pt.ProducedQty
            FROM Production_Tasks pt
            WHERE pt.CurrentStep IN ('packaging', 'qc_final', 'stock')
            AND NOT EXISTS (
                SELECT 1 FROM Packaging_Tasks pkg WHERE pkg.BatchNo = pt.BatchNo
            )
            AND NOT EXISTS (
                SELECT 1 FROM Packaging_Tasks pkg WHERE pkg.ProductionTaskID = pt.TaskID
            )
        `);

        if (result.recordset.length > 0) {
            console.log(`   Found ${result.recordset.length} production task(s) to backfill...`);
            for (const task of result.recordset) {
                const pkgId = `PKG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
                await pool.request()
                    .input('TaskID', require('./config/db').sql.VarChar, pkgId)
                    .input('Product', require('./config/db').sql.NVarChar, task.FormulaName)
                    .input('BatchNo', require('./config/db').sql.VarChar, task.BatchNo)
                    .input('Qty', require('./config/db').sql.Int, task.ExpectedQty || task.ProducedQty || 0)
                    .input('PackedQty', require('./config/db').sql.Int, 0)
                    .input('Status', require('./config/db').sql.NVarChar, 'รอบรรจุ')
                    .input('Destination', require('./config/db').sql.NVarChar, 'คลัง')
                    .input('Line', require('./config/db').sql.VarChar, task.Line)
                    .input('ProductionTaskID', require('./config/db').sql.VarChar, task.TaskID)
                    .input('JobOrderID', require('./config/db').sql.VarChar, task.JobOrderID)
                    .query(`
                        INSERT INTO Packaging_Tasks 
                        (TaskID, Product, BatchNo, Qty, PackedQty, Status, Destination, Line, ProductionTaskID, JobOrderID)
                        VALUES (@TaskID, @Product, @BatchNo, @Qty, @PackedQty, @Status, @Destination, @Line, @ProductionTaskID, @JobOrderID)
                    `);
                console.log(`   ✅ Created PKG task ${pkgId} for production ${task.TaskID} (Batch: ${task.BatchNo})`);
                // Small delay to avoid duplicate timestamps
                await new Promise(r => setTimeout(r, 10));
            }
        } else {
            console.log('   ℹ️  No production tasks need backfilling.');
        }

        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();

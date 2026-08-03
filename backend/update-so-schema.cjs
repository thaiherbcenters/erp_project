require('dotenv').config();
const { sql, poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;

        const soCols = [
            { name: 'ShowDiscountInPrint', type: 'BIT DEFAULT 0' },
            { name: 'ShowVatInPrint', type: 'BIT DEFAULT 0' },
            { name: 'ShowShippingInPrint', type: 'BIT DEFAULT 0' },
            { name: 'DesignFee', type: 'DECIMAL(18,2) DEFAULT 0' },
            { name: 'ShowDesignFeeInPrint', type: 'BIT DEFAULT 0' },
            { name: 'DepositPercent', type: "NVARCHAR(50) DEFAULT '0'" },
            { name: 'DepositAmount', type: 'DECIMAL(18,2) DEFAULT 0' },
            { name: 'ShowDepositInPrint', type: 'BIT DEFAULT 0' },
            { name: 'PreparedBy', type: 'NVARCHAR(100) NULL' },
            { name: 'SalesManager', type: 'NVARCHAR(100) NULL' },
            { name: 'ProductionManager', type: 'NVARCHAR(100) NULL' }
        ];

        for (const col of soCols) {
            await pool.request().query(`
                IF NOT EXISTS (
                    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'SalesOrder' AND COLUMN_NAME = '${col.name}'
                )
                BEGIN
                    ALTER TABLE SalesOrder ADD ${col.name} ${col.type};
                    PRINT 'Added column SalesOrder.${col.name}';
                END
            `);
        }

        const itemCols = [
            { name: 'IsPromo', type: 'BIT DEFAULT 0' },
            { name: 'PromoType', type: 'NVARCHAR(50) NULL' },
            { name: 'PromoMultiplier', type: 'INT DEFAULT 1' },
            { name: 'BasePromoName', type: 'NVARCHAR(200) NULL' }
        ];

        for (const col of itemCols) {
            await pool.request().query(`
                IF NOT EXISTS (
                    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'SalesOrderItem' AND COLUMN_NAME = '${col.name}'
                )
                BEGIN
                    ALTER TABLE SalesOrderItem ADD ${col.name} ${col.type};
                    PRINT 'Added column SalesOrderItem.${col.name}';
                END
            `);
        }

        await pool.request().query(`
            UPDATE SalesOrder 
            SET 
                SalesManager = ISNULL(SalesManager, 'jutharat'),
                ProductionManager = ISNULL(ProductionManager, 'thawat'),
                PreparedBy = ISNULL(PreparedBy, 'jutharat')
            WHERE SalesManager IS NULL OR ProductionManager IS NULL OR PreparedBy IS NULL
        `);
        console.log('✅ Updated existing NULL signature fields in SalesOrder');

        console.log('✅ SalesOrder schema updated successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Error:', err.message);
        process.exit(1);
    }
})();

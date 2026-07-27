const { sql, poolPromise } = require('../config/db');

async function dumpSchema() {
    try {
        const pool = await poolPromise;
        const tables = ['BillingInvoice', 'BillingInvoiceItem', 'BillingInvoiceHistory'];
        
        for (const table of tables) {
            console.log(`\n--- Schema for ${table} ---`);
            const result = await pool.request()
                .input('tableName', sql.NVarChar, table)
                .query(`
                    SELECT 
                        COLUMN_NAME, 
                        DATA_TYPE, 
                        CHARACTER_MAXIMUM_LENGTH,
                        IS_NULLABLE,
                        COLUMN_DEFAULT
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = @tableName
                    ORDER BY ORDINAL_POSITION
                `);
            
            console.table(result.recordset);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

dumpSchema();

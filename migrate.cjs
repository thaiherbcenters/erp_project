const { poolPromise, sql } = require('./backend/config/db');

async function migrate() {
    try {
        const pool = await poolPromise;
        // 1. Add FormulaType
        try {
            await pool.request().query('ALTER TABLE RnD_Formulas ADD FormulaType NVarChar(50)');
            console.log('Added FormulaType column successfully.');
        } catch (err) {
            console.log('FormulaType column might already exist:', err.message);
        }
        
        // 2. Add UnitSize
        try {
            await pool.request().query('ALTER TABLE RnD_Formulas ADD UnitSize Decimal(18,4)');
            console.log('Added UnitSize column successfully.');
        } catch (err) {
            console.log('UnitSize column might already exist:', err.message);
        }

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();

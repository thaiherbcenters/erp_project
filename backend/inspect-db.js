const { poolPromise } = require('./config/db');
poolPromise.then(async pool => {
    // List all tables
    const tables = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
    console.log('=== ALL TABLES ===');
    tables.recordset.forEach(t => console.log(t.TABLE_NAME));
    
    // Get columns for production/stock related tables
    const importantTables = ['Stock_Items', 'Stock_Logs', 'Production_Tasks', 'Planner', 'RnD_Formulas', 'RnD_FormulaIngredients', 'RnD_Materials', 'Packaging_Tasks'];
    for (const tbl of importantTables) {
        try {
            const cols = await pool.request().query(`SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${tbl}' ORDER BY ORDINAL_POSITION`);
            if (cols.recordset.length > 0) {
                console.log(`\n=== ${tbl} ===`);
                cols.recordset.forEach(c => console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE}${c.CHARACTER_MAXIMUM_LENGTH ? '('+c.CHARACTER_MAXIMUM_LENGTH+')' : ''}) ${c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`));
            }
        } catch(e) {}
    }
    process.exit();
}).catch(console.error);

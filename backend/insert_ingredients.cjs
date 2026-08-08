const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const formulaId = 'FM-012';

const ingredients = [
    { name: 'เกล็ดสะระแหน่', engName: 'Menthol', qty: 30.47, unit: 'กรัม', type: 'active' },
    { name: 'น้ำมันระกำ', engName: 'Methyl salicylate', qty: 15.69, unit: 'กรัม', type: 'active' },
    { name: 'น้ำมันไพล', engName: '', qty: 15.38, unit: 'กรัม', type: 'active' },
    { name: 'พิมเสน', engName: 'Borneol', qty: 7.69, unit: 'กรัม', type: 'active' },
    { name: 'White soft paraffin', engName: 'White soft paraffin', qty: 9693.6, unit: 'กรัม', type: 'excipient' },
    { name: 'Hard paraffin', engName: 'Hard paraffin', qty: 3229.8, unit: 'กรัม', type: 'excipient' }
];

async function run() {
    try {
        let pool = await sql.connect(config);
        
        // Update batch size
        await pool.request()
            .query("UPDATE RnD_Formulas SET BatchSize = 12992.63, Unit = N'กรัม' WHERE FormulaId = 'FM-012'");
            
        // Delete existing if any
        await pool.request()
            .query("DELETE FROM RnD_Formula_Ingredients WHERE FormulaID = 'FM-012'");
            
        // Insert ingredients
        for (let ing of ingredients) {
            await pool.request()
                .input('FormulaID', sql.VarChar, formulaId)
                .input('MaterialName', sql.NVarChar, ing.name)
                .input('Qty', sql.Decimal(18, 4), ing.qty)
                .input('Unit', sql.NVarChar, ing.unit)
                .input('IngredientType', sql.NVarChar, ing.type)
                .input('EngName', sql.NVarChar, ing.engName)
                .query(`
                    INSERT INTO RnD_Formula_Ingredients 
                    (FormulaID, MaterialName, Qty, Unit, IngredientType, EngName)
                    VALUES (@FormulaID, @MaterialName, @Qty, @Unit, @IngredientType, @EngName)
                `);
        }
        
        console.log("Successfully inserted ingredients for FM-012!");

    } catch (err) {
        console.error(err);
    } finally {
        sql.close();
    }
}
run();

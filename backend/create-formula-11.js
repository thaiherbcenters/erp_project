const { poolPromise } = require('./config/db');
const sql = require('mssql');

async function createFormula() {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const newId = 'FM-011';
            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, newId)
            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, newId)
                .query('DELETE FROM RnD_Formula_Ingredients WHERE FormulaID = @FormulaID;');

            const ingredients = [
                { 
                    name: '<p>น้ำมันไพล</p><p>เตรียมจาก</p><p>ไพล 2,229.72 กรัม</p><p>น้ำมันมะพร้าว 1,114.86 กรัม</p><p>ดอกกานพลู 5.57 กรัม</p>', 
                    eng: '<p>Plai Oil</p><p><br></p><p><br></p><p>Coconut Oil</p><p><br></p>', 
                    lat: '<p><br></p><p><br></p><p>Zingiber montanum (J. Konig) Link ex A. Dietr.</p><p><br></p><p><br></p>', 
                    part: '<p><br></p><p><br></p><p>เหง้า</p><p><br></p><p><br></p>', 
                    qty: 825 
                },
                { name: 'เกล็ดสะระแหน่', eng: 'Menthol', lat: '', part: '', qty: 825 },
                { name: 'น้ำมันสะระแหน่', eng: 'Peppermint Oil', lat: '', part: '', qty: 462 },
                { name: 'พิมเสน', eng: 'Borneol', lat: '', part: '', qty: 363 }
            ];

            for (const ing of ingredients) {
                await new sql.Request(transaction)
                    .input('FormulaID', sql.VarChar, newId)
                    .input('MaterialID', sql.VarChar, null)
                    .input('MaterialName', sql.NVarChar, ing.name)
                    .input('Qty', sql.Decimal(10, 2), ing.qty)
                    .input('Unit', sql.NVarChar, 'กรัม')
                    .input('IngredientType', sql.NVarChar, 'active')
                    .input('EngName', sql.NVarChar, ing.eng)
                    .input('LatinName', sql.NVarChar, ing.lat)
                    .input('PartUsed', sql.NVarChar, ing.part)
                    .query(`
                        INSERT INTO RnD_Formula_Ingredients (FormulaID, MaterialID, MaterialName, Qty, Unit, IngredientType, EngName, LatinName, PartUsed)
                        VALUES (@FormulaID, @MaterialID, @MaterialName, @Qty, @Unit, @IngredientType, @EngName, @LatinName, @PartUsed)
                    `);
            }

            await transaction.commit();
            console.log('Formula FM-011 created successfully!');
            process.exit(0);
        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createFormula();

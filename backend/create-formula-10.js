const { poolPromise } = require('./config/db');
const sql = require('mssql');

async function createFormula() {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const newId = 'FM-010';
            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, newId)
                .query('DELETE FROM RnD_Formula_Ingredients WHERE FormulaID = @FormulaID; DELETE FROM RnD_Formulas WHERE FormulaID = @FormulaID;');

            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, newId)
                .input('Name', sql.NVarChar, 'ยาน้ำมันสมุนไพร สูตร๑ ตรา ผลไพร')
                .input('Category', sql.NVarChar, 'ยาน้ำมัน')
                .input('Version', sql.VarChar, 'v1.0')
                .input('Status', sql.VarChar, 'อนุมัติ')
                .input('BatchSize', sql.Int, 700)
                .input('Unit', sql.NVarChar, 'กรัม')
                .input('ShelfLife', sql.NVarChar, '24 เดือน')
                .input('Description', sql.NVarChar, 'สูตรยาน้ำมันสมุนไพร')
                .input('InstructionsJSON', sql.NVarChar, '[]')
                .input('CreatedBy', sql.VarChar, 'system')
                .query(`
                    INSERT INTO RnD_Formulas (FormulaID, Name, Category, Version, Status, BatchSize, Unit, ShelfLife, Description, InstructionsJSON, CreatedBy, CreatedDate)
                    VALUES (@FormulaID, @Name, @Category, @Version, @Status, @BatchSize, @Unit, @ShelfLife, @Description, @InstructionsJSON, @CreatedBy, GETDATE())
                `);

            const ingredients = [
                { name: 'เกล็ดสะระแหน่', eng: 'Menthol', lat: '', part: '', qty: 200 },
                { name: 'พิมเสน', eng: 'Borneol', lat: '', part: '', qty: 150 },
                { name: 'น้ำมันสะระแหน่', eng: 'Peppermint Oil', lat: '', part: '', qty: 150 },
                { name: '<p>น้ำมันไพล</p><p>เตรียมจาก</p><p>กานพลู 1.01 กรัม</p><p>ไพล 405.40 กรัม</p><p>น้ำมันมะพร้าว 202.70 กรัม</p>', eng: '<p><br></p><p><br></p><p><br></p><p><br></p><p>Cocounut Oil</p>', lat: '<p><br></p><p><br></p><p><br></p><p><br></p><p>Zingiber montanum (J. Konig) Link ex A. Dietr.</p>', part: '<p><br></p><p><br></p><p><br></p><p><br></p><p>เหง้า</p>', qty: 150 },
                { name: 'น้ำมันยูคาลิปตัส', eng: 'Eucalyptus Oil', lat: '', part: '', qty: 50 }
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
            console.log('Formula FM-010 created successfully!');
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

const { poolPromise } = require('./config/db');
const sql = require('mssql');

async function createFormula() {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const newId = 'FM-009'; // Ensure this doesn't exist or we just delete it first
            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, newId)
                .query('DELETE FROM RnD_Formula_Ingredients WHERE FormulaID = @FormulaID; DELETE FROM RnD_Formulas WHERE FormulaID = @FormulaID;');

            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, newId)
                .input('Name', sql.NVarChar, 'ยาดมสมุนไพร ตรา เอส ที เฮิร์บ เฮมพ์')
                .input('Category', sql.NVarChar, 'ยาดม')
                .input('Version', sql.VarChar, 'v1.0')
                .input('Status', sql.VarChar, 'อนุมัติ')
                .input('BatchSize', sql.Int, 40000)
                .input('Unit', sql.NVarChar, 'กรัม')
                .input('ShelfLife', sql.NVarChar, '24 เดือน')
                .input('Description', sql.NVarChar, 'สูตรยาดมตาม ท.บ.๑')
                .input('InstructionsJSON', sql.NVarChar, '[]')
                .input('CreatedBy', sql.VarChar, 'system')
                .query(`
                    INSERT INTO RnD_Formulas (FormulaID, Name, Category, Version, Status, BatchSize, Unit, ShelfLife, Description, InstructionsJSON, CreatedBy, CreatedDate)
                    VALUES (@FormulaID, @Name, @Category, @Version, @Status, @BatchSize, @Unit, @ShelfLife, @Description, @InstructionsJSON, @CreatedBy, GETDATE())
                `);

            const ingredients = [
                { name: 'เกล็ดสะระแหน่', eng: 'Menthol', lat: '', part: '', qty: 10528 },
                { name: 'พิมเสน', eng: 'Borneol', lat: '', part: '', qty: 6316 },
                { name: 'น้ำมันสะระแหน่', eng: 'Peppermint Oil', lat: '', part: '', qty: 4212 },
                { name: 'น้ำมันยูคาลิปตัส', eng: 'Eucalyptus Oil', lat: '', part: '', qty: 3788 },
                { name: 'กระวาน', eng: '', lat: 'Wurfbainia vera (Blackw.)Skornick & A.D. Poulsen', part: 'ผล', qty: 3788 },
                { name: 'กานพลู', eng: '', lat: 'Syzygium aromaticum (L.) Merr. & L.M.Perry', part: 'ดอกตูมก่อนบาน', qty: 3788 },
                { name: 'ดอกจันทน์', eng: '', lat: 'Myristica fragrans Houtt.', part: 'เยื่อหุ้มเมล็ด', qty: 3788 },
                { name: 'มะกรูด', eng: '', lat: 'Citrus hystrix DC.', part: 'ผิว', qty: 2104 },
                { name: 'พริกไทยดำ', eng: '', lat: 'Piper nigrum L.', part: 'ผลแก่', qty: 1684 }
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
            console.log('Formula created successfully!');
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

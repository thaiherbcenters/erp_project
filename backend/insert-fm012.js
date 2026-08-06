const sql = require('mssql');
const { poolPromise } = require('./config/db');

async function insertFormula() {
    try {
        const pool = await poolPromise;
        
        const formulaData = {
            FormulaID: 'FM-012',
            Name: 'ยาหม่อง BALM BRAND',
            Category: 'Balm',
            Version: '1.0',
            Status: 'Approved',
            Description: 'เพิ่มสูตรใหม่ตามคำขอของลูกค้า',
            TorBor1FormatJSON: JSON.stringify({
                RecipeFormat: 'ขี้ผึ้ง',
                ProductNameThai: 'ยาหม่อง',
                ProductNameEng: 'BALM BRAND',
                RecipeQuantity: '',
                RecipeActiveIngredients: [
                    {
                        thaiName: '<p>1. เกล็ดสะระแหน่</p>',
                        engName: '<p>Menthol</p>',
                        latinName: '<p></p>',
                        partUsed: '<p></p>',
                        quantity: '<p>30.47 กรัม</p>'
                    },
                    {
                        thaiName: '<p>2. น้ำมันระกำ</p>',
                        engName: '<p>Methyl salicylate</p>',
                        latinName: '<p></p>',
                        partUsed: '<p></p>',
                        quantity: '<p>15.69 กรัม</p>'
                    },
                    {
                        thaiName: '<p>3. น้ำมันไพล</p><p><span style="font-size: 10px;">เตรียมจาก</span></p><p><span style="font-size: 10px;">กานพลู 1.01 กรัม</span></p><p><span style="font-size: 10px;">ไพล 405.40 กรัม</span></p><p><span style="font-size: 10px;">น้ำมันมะพร้าว 202.70 กรัม</span></p>',
                        engName: '<p></p><p></p><p></p><p></p><p>Coconut Oil</p>',
                        latinName: '<p></p><p></p><p><em>Syzygium aromaticum</em> (L.) Merr.& L.M.Perry</p><p><em>Zingiber montanum</em> (J. Konig) Link ex A. Dietr.</p><p></p>',
                        partUsed: '<p></p>',
                        quantity: '<p></p><p></p><p>15.38 กรัม</p><p></p><p></p>'
                    },
                    {
                        thaiName: '<p>4. พิมเสน</p>',
                        engName: '<p>Borneol</p>',
                        latinName: '<p></p>',
                        partUsed: '<p></p>',
                        quantity: '<p>7.69 กรัม</p>'
                    }
                ]
            })
        };

        const result = await pool.request()
            .input('FormulaID', sql.VarChar, formulaData.FormulaID)
            .input('Name', sql.NVarChar, formulaData.Name)
            .input('Category', sql.NVarChar, formulaData.Category)
            .input('Version', sql.VarChar, formulaData.Version)
            .input('Status', sql.VarChar, formulaData.Status)
            .input('Description', sql.NVarChar, formulaData.Description)
            .input('TorBor1FormatJSON', sql.NVarChar, formulaData.TorBor1FormatJSON)
            .query(`
                INSERT INTO RnD_Formulas (
                    FormulaID, Name, Category, Version, Status, Description,
                    TorBor1FormatJSON, CreatedDate
                ) VALUES (
                    @FormulaID, @Name, @Category, @Version, @Status, @Description,
                    @TorBor1FormatJSON, GETDATE()
                )
            `);

        console.log('Successfully inserted FM-012:', result.rowsAffected);
    } catch (err) {
        console.error('Error inserting formula:', err);
    } finally {
        process.exit(0);
    }
}

insertFormula();

const { poolPromise } = require('./config/db');
const sql = require('mssql');

async function updateFormula() {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const instructionsObj = {
                ProductAppearance: 'ชิ้นส่วนสมุนไพร บดหยาบสีน้ำตาล ในผ้าตาข่ายสีขาว',
                ProductPackSize: 'บรรจุในผ้าตาข่าย ห่อละ ขนาด 5, 8, 10, 15, 20, 25, 30, 40, 50 กรัม แล้วบรรจุขวดพลาสติกชนิด PP,PE และฝาพลาสติกชนิด PP,PE ขวดละ 1 ห่อ',
                ProductMfgProcess: `1.นำสมุนไพร มาทำความสะอาดตามความเหมาะสม
2.แล้วนำไปอบแห้งด้วยตู้อบที่ อุณหภูมิ 55-60 องศาเซลเซียส เป็นเวลา 6-8 ชั่วโมง หรือจนกว่าจะแห้ง(แยกกันทีละชนิด)
3.นำตัวยาลำดับที่ 5-9 มาชั่งตามสูตรที่กำหนด แล้วนำไปบดพอหยาบ
4.นำตัวยาลำดับที่ 1-4 มาชั่งตามสูตรที่กำหนด จากนั้นเทผสมรวมในหม้อสแตนเลส คนให้ส่วนผสมทั้งหมดละลายเป็นของเหลว
5.นำส่วนผสมทั้ง ข้อ 3 และ 4 มาผสมให้เข้ากัน หมักตัวยาในภาชนะที่มีฝาปิดสนิท ทิ้งไว้ 3-7 วัน
6.ชั่งน้ำหนักตามขนาดบรรจุโดยห่อด้วยผ้าตาข่าย
7.นำไปบรรจุใส่ขวด หรือ ภาชนะที่ได้รับอนุญาต แล้วปิดฝาให้สนิท`,
                ProductIndication: 'แก้วิงเวียน, Relieve dizziness',
                ProductDosage: 'ใช้สูดดมเมื่อมีอาการ, Inhale as needed',
                ProductPreparation: '-',
                ProductCondition: '-',
                ProductStorage: 'เก็บที่อุณหภูมิห้อง/3 ปี นับจากวันที่ผลิต',
                ProductContraindication: '-',
                ProductWarning: '-',
                ProductPrecaution: '-',
                ProductAdverseReaction: '-',
                SalesChannel: 'ผลิตภัณฑ์สมุนไพรขายทั่วไป',
                ProductSummary: ''
            };

            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, 'FM-009')
                .input('InstructionsJSON', sql.NVarChar, JSON.stringify(instructionsObj))
                .query(`
                    UPDATE RnD_Formulas
                    SET InstructionsJSON = @InstructionsJSON
                    WHERE FormulaID = @FormulaID
                `);

            await transaction.commit();
            console.log('Formula FM-009 updated successfully!');
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

updateFormula();
